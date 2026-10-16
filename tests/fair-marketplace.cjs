// Real PostgreSQL transactions in a disposable schema; no provider or social calls.
require('ts-node').register({ project: 'backend/tsconfig.json', transpileOnly: true });
require('reflect-metadata');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { randomUUID } = require('node:crypto');
const { DataSource } = require('typeorm');
const fair = require('../backend/src/placements/fair-marketplace');
const {
  FairMarketplace1792400000000,
} = require('../backend/src/database/migrations/1792400000000-FairMarketplace');
const { PlacementsService } = require('../backend/src/placements/placements.service');
const {
  identityStatus,
  UnconfiguredIdentityProvider,
} = require('../backend/src/placements/identity-provider');
const e = process.env.DB_PASSWORD
  ? process.env
  : JSON.parse(fs.readFileSync('.local/static-pilot/backend-env.json'));
const schema = 'fair_' + randomUUID().replaceAll('-', '');
const config = {
  type: 'postgres',
  host: e.DB_HOST || '127.0.0.1',
  port: Number(e.DB_PORT || 5432),
  username: e.DB_USERNAME,
  password: e.DB_PASSWORD,
  database: e.DB_NAME,
};
const db = new DataSource({ ...config, extra: { options: `-c search_path=${schema}` } }),
  admin = new DataSource(config);
const ids = Array.from({ length: 5 }, () => randomUUID());
const [member, second, sponsor, other, operator] = ids.map((id, i) => ({
  id,
  userRole: i < 2 ? 'member' : i === 4 ? 'admin' : 'advertiser',
}));
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('Worked: ' + name);
}
const tx = fn => db.transaction(fn);
const reject = (fn, status) => assert.rejects(fn, x => x.getStatus?.() === status);
(async () => {
  await admin.initialize();
  await admin.query(`CREATE SCHEMA ${schema}`);
  await db.initialize();
  try {
    await db.query(`CREATE TABLE users(id uuid PRIMARY KEY);CREATE TABLE placement_destinations(id uuid PRIMARY KEY,user_id uuid,username text,encrypted_grant text);
CREATE TABLE placement_campaigns(id uuid PRIMARY KEY,sponsor_id uuid,terms jsonb,budget int,reserved int DEFAULT 0,spent int DEFAULT 0,status text DEFAULT 'active',notification_preferences jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE placements(id uuid PRIMARY KEY,user_id uuid,campaign_id uuid,destination_id uuid,command_key uuid,state text,record jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE placement_events(placement_id uuid,at_ms bigint,type text,detail jsonb);`);
    await new FairMarketplace1792400000000().up({ query: (...a) => db.query(...a) });
    for (const id of ids) await db.query('INSERT INTO users VALUES($1)', [id]);
    const dest = randomUUID(),
      dest2 = randomUUID(),
      c = randomUUID(),
      c2 = randomUUID();
    await db.query(
      "INSERT INTO placement_destinations VALUES($1,$2,'member','encrypted'),($3,$4,'second','encrypted')",
      [dest, member.id, dest2, second.id]
    );
    const terms = {
      capacity: 1,
      reward: 100,
      durationSeconds: 30,
      windowEnd: Date.now() + 86400000,
    };
    for (const [id, owner] of [
      [c, sponsor.id],
      [c2, other.id],
    ])
      await db.query(
        'INSERT INTO placement_campaigns(id,sponsor_id,terms,budget) VALUES($1,$2,$3,100)',
        [id, owner, terms]
      );
    const campaign = () =>
      db.query('SELECT * FROM placement_campaigns WHERE id=$1', [c]).then(x => x[0]);
    const hold = (u = member, cid = c, d = dest, key = randomUUID()) =>
      tx(m => fair.hold(m, u, cid, { destinationId: d, commandKey: key }));
    const service = new PlacementsService(db);
    service.origin = 'https://aihangout.ai';
    service.decrypt = () => '';
    service.remote = async () => ({ normal: { key: 'original' } });
    let h;
    await check('60-second hold reserves final slot under concurrent demand', async () => {
      const r = await Promise.allSettled([hold(), hold(second, c, dest2)]);
      assert.equal(r.filter(x => x.status === 'fulfilled').length, 1);
      const win = r.find(x => x.status === 'fulfilled').value;
      assert.equal(Number(win.expires_at_ms) - Number(win.created_at_ms), 60000);
      await db.query("UPDATE placement_holds SET state='cancelled'");
      h = await hold();
    });
    await check('retry does not extend hold and another user cannot release it', async () => {
      const repeated = await hold(member, c, dest, h.command_key);
      assert.equal(repeated.expires_at_ms, h.expires_at_ms);
      await reject(() => service.releaseHold(second, h.id), 404);
      await service.releaseHold(member, h.id);
    });
    await check('expired hold cannot confirm and creates no breach', async () => {
      h = await hold();
      await db.query('UPDATE placement_holds SET expires_at_ms=$2 WHERE id=$1', [
        h.id,
        Date.now() - 1,
      ]);
      await reject(
        () =>
          service.join(member, c, {
            holdId: h.id,
            destinationId: dest,
            commandKey: randomUUID(),
            termsVersion: 1,
            consent: 'static-test-v1',
          }),
        409
      );
      assert.equal((await db.query('SELECT * FROM placement_breaches')).length, 0);
    });
    await check(
      'advertiser excludes a group only from its own offers, including an existing hold',
      async () => {
        h = await hold();
        await tx(m =>
          fair.exclusions(m, sponsor, {
            userIds: [member.id, second.id],
            groupName: 'Test group',
            reason: 'Brand eligibility review',
            blocked: true,
          })
        );
        await reject(() => hold(), 403);
        await reject(
          () =>
            service.join(member, c, {
              holdId: h.id,
              destinationId: dest,
              commandKey: randomUUID(),
              termsVersion: 1,
              consent: 'static-test-v1',
            }),
          403
        );
        await tx(async m =>
          fair.eligible(
            m,
            member.id,
            (await m.query('SELECT * FROM placement_campaigns WHERE id=$1', [c2]))[0]
          )
        );
        await reject(
          () =>
            tx(m =>
              fair.exclusions(m, member, {
                userIds: [second.id],
                reason: 'not authorized',
                blocked: true,
              })
            ),
          403
        );
        await tx(m =>
          fair.exclusions(m, sponsor, {
            userIds: [member.id, second.id],
            reason: 'Exclusion removed after review',
            blocked: false,
          })
        );
      }
    );
    await check('held offer confirms once, preserving idempotency', async () => {
      const body = {
        holdId: h.id,
        destinationId: dest,
        commandKey: randomUUID(),
        termsVersion: 1,
        consent: 'static-test-v1',
      };
      const p = await service.join(member, c, body);
      assert.equal((await service.join(member, c, body)).id, p.id);
      assert.equal(
        (await db.query('SELECT state FROM placement_holds WHERE id=$1', [h.id]))[0].state,
        'confirmed'
      );
      await db.query(
        "INSERT INTO placement_breaches VALUES($1,$2,$3,'user_override','confirmed')",
        [p.id, member.id, Date.now()]
      );
    });
    await check(
      'confirmed breach threshold denies; appeal overturn removes mark without rewriting agreement',
      async () => {
        await db.query('UPDATE placement_campaigns SET max_breaches=1 WHERE id=$1', [c]);
        await reject(() => tx(async m => fair.eligible(m, member.id, await campaign())), 403);
        const p = (await db.query('SELECT id FROM placements'))[0];
        const a = await tx(m =>
          fair.appeal(m, member, { placementId: p.id, reason: 'Please review this test evidence' })
        );
        await reject(
          () => tx(m => fair.appeal(m, second, { placementId: p.id, reason: 'Not my placement' })),
          404
        );
        await reject(
          () =>
            tx(m =>
              fair.reviewAppeal(m, sponsor, a.id, {
                decision: 'overturned',
                reason: 'Cannot review as advertiser',
              })
            ),
          403
        );
        await tx(m =>
          fair.reviewAppeal(m, operator, a.id, {
            decision: 'overturned',
            reason: 'Independent evidence review',
          })
        );
        await tx(async m => fair.eligible(m, member.id, await campaign()));
      }
    );
    await check(
      'platform ban requires admin; suspension remains appealable and reversible',
      async () => {
        await reject(
          () =>
            tx(m =>
              fair.decideAccess(m, sponsor, member.id, { banned: true, reason: 'Unauthorized ban' })
            ),
          403
        );
        await tx(m =>
          fair.decideAccess(m, operator, member.id, {
            banned: true,
            reason: 'Reviewed repeated misconduct',
          })
        );
        await reject(() => tx(async m => fair.eligible(m, member.id, await campaign())), 403);
        const a = await tx(m => fair.appeal(m, member, { reason: 'Request independent review' }));
        await tx(m =>
          fair.reviewAppeal(m, operator, a.id, {
            decision: 'overturned',
            reason: 'Review restored participation',
          })
        );
        await tx(async m => fair.eligible(m, member.id, await campaign()));
      }
    );
    await check(
      'four notification modes persist; unauthorized and malformed updates rejected',
      async () => {
        for (const broken of [false, true])
          for (const completed of [false, true])
            assert.deepEqual(
              (await service.notifications(sponsor, c, { broken, completed }))
                .notification_preferences,
              { broken, completed }
            );
        await reject(
          () => service.notifications(member, c, { broken: true, completed: true }),
          404
        );
        await reject(
          () => service.notifications(sponsor, c, { broken: 'true', completed: true }),
          400
        );
      }
    );
    await check('analytics packages enforce ownership and omit unselected data', async () => {
      const x = await tx(m => fair.analytics(m, sponsor, c, { package: 'demand' }));
      assert.ok(x.demand);
      assert.equal(x.delivery, undefined);
      assert.equal(x.realChargesEnabled, false);
      await reject(() => tx(m => fair.analytics(m, other, c, { package: 'all' })), 404);
    });
    await check(
      'unconfigured identity rejects forged callbacks and real payouts stay disabled; payee subject unique',
      async () => {
        assert.equal(identityStatus.realPayoutsEnabled, false);
        const p = new UnconfiguredIdentityProvider();
        await reject(() => p.createHostedVerification(member.id), 503);
        await reject(() => p.verifyCallback(Buffer.from('{}'), 'forged'), 503);
        await db.query(
          "INSERT INTO verified_payees VALUES($1,'fixture','same-subject','verified',$2)",
          [member.id, Date.now()]
        );
        await assert.rejects(
          () =>
            db.query(
              "INSERT INTO verified_payees VALUES($1,'fixture','same-subject','verified',$2)",
              [second.id, Date.now()]
            ),
          x => x.code === '23505'
        );
      }
    );
    console.log(
      JSON.stringify({
        outcome: 'Worked',
        scenarios: passed,
        storage: 'real PostgreSQL',
        remote: 'stubbed connection readback for join only',
      })
    );
  } finally {
    await db.destroy();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.destroy();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});

// Full migrations and actual services, using an asserted disposable PostgreSQL schema.
const built = process.env.FAIR_BUILT === 'true';
if (!built) require('ts-node').register({ project: 'backend/tsconfig.json', transpileOnly: true });
require('reflect-metadata');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  { randomUUID, createHash } = require('node:crypto');
const { DataSource } = require('typeorm'),
  { JwtService } = require('@nestjs/jwt'),
  { ConfigService } = require('@nestjs/config');
const source = path.join(process.cwd(), built ? 'backend/dist/src' : 'backend/src');
const { User } = require(source + '/users/entities/user.entity'),
  { RefreshToken } = require(source + '/auth/entities/refresh-token.entity');
const { Campaign } = require(source + '/campaigns/entities/campaign.entity'),
  { CampaignParticipation } = require(source + '/campaigns/entities/campaign-participation.entity');
const { AuthService } = require(source + '/auth/auth.service'),
  { UsersService } = require(source + '/users/users.service'),
  { JwtStrategy } = require(source + '/auth/strategies/jwt.strategy');
const { PlacementsService } = require(source + '/placements/placements.service');
const { sessionRequest } = require(source + '/auth/session-http');
const env = process.env.DB_PASSWORD
  ? process.env
  : JSON.parse(fs.readFileSync('.local/static-pilot/backend-env.json'));
const schema = 'security_' + randomUUID().replaceAll('-', '');
const config = {
  type: 'postgres',
  host: env.DB_HOST,
  port: +env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
};
const owner = new DataSource(config),
  db = new DataSource({
    ...config,
    schema,
    entities: [User, RefreshToken, Campaign, CampaignParticipation],
    migrations: [source + '/database/migrations/*.' + (built ? 'js' : 'ts')],
    extra: { options: `-c search_path=${schema},public` },
  });
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('Worked: ' + name);
}
const denied = (fn, status = 401) => assert.rejects(fn, e => e.getStatus?.() === status);
(async () => {
  await owner.initialize();
  await owner.query(`CREATE SCHEMA ${schema}`);
  try {
    await db.initialize();
    assert.equal((await db.query('SELECT current_schema() name'))[0].name, schema);
    await db.runMigrations();
    const jwt = new JwtService(),
      cfg = new ConfigService({ JWT_SECRET: randomUUID() + randomUUID() });
    const auth = new AuthService(
        db.getRepository(User),
        db.getRepository(RefreshToken),
        jwt,
        cfg,
        db
      ),
      users = new UsersService(db.getRepository(User)),
      strategy = new JwtStrategy(cfg, users, db),
      placements = new PlacementsService(db);
    placements.origin = 'https://aihangout.ai';
    const base = {
      email: 'session@example.invalid',
      password: 'FixtureOnly1!',
      firstName: 'Session',
      lastName: 'Fixture',
      userRole: 'member',
    };
    let login = await auth.signup(base, '127.0.0.1', 'fixture');
    const fresh = () =>
      auth.login({ email: base.email, password: base.password }, '127.0.0.1', 'fixture');
    const valid = token => strategy.validate(jwt.verify(token, { secret: cfg.get('JWT_SECRET') }));
    await check(
      'refresh credentials are hashed and access tokens bind a server session',
      async () => {
        const rows = await db.query('SELECT token,session_id FROM refresh_tokens');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].token, createHash('sha256').update(login.refreshToken).digest('hex'));
        assert.notEqual(rows[0].token, login.refreshToken);
        assert.ok(rows[0].session_id);
        await valid(login.accessToken);
      }
    );
    await check(
      'logout revokes refresh and existing access; another device stays signed in',
      async () => {
        const other = await fresh();
        await auth.logout(login.refreshToken);
        await denied(() => auth.refreshAccessToken(login.refreshToken, '127.0.0.1', 'fixture'));
        await denied(() => valid(login.accessToken));
        await valid(other.accessToken);
        login = other;
      }
    );
    await check('rotated-token reuse revokes descendants and access', async () => {
      const next = await auth.refreshAccessToken(login.refreshToken, '127.0.0.1', 'fixture');
      await denied(() => auth.refreshAccessToken(login.refreshToken, '127.0.0.1', 'fixture'));
      await denied(() => auth.refreshAccessToken(next.refreshToken, '127.0.0.1', 'fixture'));
      await denied(() => valid(next.accessToken));
    });
    await check('concurrent refresh cannot issue two usable token families', async () => {
      const start = await fresh();
      const outcomes = await Promise.allSettled([
        auth.refreshAccessToken(start.refreshToken, '127.0.0.1', 'fixture'),
        auth.refreshAccessToken(start.refreshToken, '127.0.0.1', 'fixture'),
      ]);
      assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
      await denied(() => valid(outcomes.find(x => x.status === 'fulfilled').value.accessToken));
    });
    await check('logout races rotation without leaving a usable descendant', async () => {
      const start = await fresh();
      const result = await Promise.allSettled([
        auth.refreshAccessToken(start.refreshToken, '127.0.0.1', 'fixture'),
        auth.logout(start.refreshToken),
      ]);
      await denied(() => valid(start.accessToken));
      if (result[0].status === 'fulfilled') await denied(() => valid(result[0].value.accessToken));
    });
    await check('password credential change invalidates access and refresh', async () => {
      const start = await fresh(),
        u = await users.findById(start.user.id);
      await db.query('UPDATE users SET password_hash=$2 WHERE id=$1', [
        u.id,
        'changed-fixture-hash',
      ]);
      await denied(() => valid(start.accessToken));
      await denied(() => auth.refreshAccessToken(start.refreshToken, '127.0.0.1', 'fixture'));
      await db.query('UPDATE users SET password_hash=$2 WHERE id=$1', [u.id, u.passwordHash]);
      await denied(() => valid(start.accessToken));
    });
    await check(
      'participation suspension preserves sign-in, refresh, receipts and appeal; blocks new offers',
      async () => {
        const member = { id: login.user.id, userRole: 'member' },
          operator = await auth.signup(
            { ...base, email: 'operator@example.invalid' },
            '127.0.0.1',
            'fixture'
          );
        await placements.accessDecision({ id: operator.user.id, userRole: 'admin' }, member.id, {
          banned: true,
          reason: 'Isolated participation suspension',
        });
        const start = await fresh();
        await valid(start.accessToken);
        const renewed = await auth.refreshAccessToken(start.refreshToken, '127.0.0.1', 'fixture');
        await valid(renewed.accessToken);
        const fair = require(source + '/placements/fair-marketplace');
        await denied(
          () =>
            db.transaction(m =>
              fair.eligible(m, member.id, { sponsor_id: operator.user.id, max_breaches: null })
            ),
          403
        );
        const appeal = await placements.appeal(member, {
          reason: 'Please review isolated suspension',
        });
        assert.equal(appeal.status, 'pending');
        const standing = await fair.standing(db.manager, member);
        assert.equal(standing.appeals.length, 1);
      }
    );
    await check('security deactivation revokes sessions and prevents login/refresh', async () => {
      const start = await fresh();
      await users.deactivateUser(start.user.id);
      await denied(() => valid(start.accessToken));
      await denied(() => auth.refreshAccessToken(start.refreshToken, '127.0.0.1', 'fixture'));
      await denied(fresh);
    });
    await check('company completion updates only the advertiser account', async () => {
      const a = await auth.signup(
        {
          ...base,
          email: 'company@example.invalid',
          userRole: 'advertiser',
          companyName: 'Initial fixture',
        },
        '127.0.0.1',
        'fixture'
      );
      await db.query('UPDATE users SET company_name=NULL WHERE id=$1', [a.user.id]);
      await denied(() => placements.create({ id: a.user.id, userRole: 'advertiser' }, {}), 400);
      const saved = await users.updateProfile(a.user.id, { companyName: 'Owner-entered Company' });
      assert.equal(saved.companyName, 'Owner-entered Company');
    });
    await check('cookie endpoints reject missing request header and foreign origins', async () => {
      assert.throws(
        () => sessionRequest({ headers: {} }),
        e => e.getStatus() === 403
      );
      assert.throws(
        () =>
          sessionRequest({
            headers: { 'x-profilepays-request': '1', origin: 'https://evil.example' },
          }),
        e => e.getStatus() === 403
      );
      sessionRequest({ headers: { 'x-profilepays-request': '1' } });
    });
    console.log(
      JSON.stringify({
        outcome: 'Worked',
        scenarios: passed,
        artifact: built ? 'compiled modules' : 'source',
        database: 'isolated PostgreSQL schema',
      })
    );
  } finally {
    if (db.isInitialized) await db.destroy();
    await owner.query(`DROP SCHEMA ${schema} CASCADE`);
    await owner.destroy();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});

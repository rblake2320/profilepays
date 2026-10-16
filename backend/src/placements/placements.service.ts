import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
const { PNG } = require('pngjs');
import * as fair from './fair-marketplace';
import { identityStatus, UnconfiguredIdentityProvider } from './identity-provider';

const terminal = new Set(['ended', 'failed', 'cancelled']);
const requireUuid = (v: any) => {
  if (
    typeof v !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v)
  )
    throw new BadRequestException('UUID required');
  return v;
};
function exact(b: any, keys: string[]) {
  if (
    !b ||
    typeof b !== 'object' ||
    Array.isArray(b) ||
    Object.keys(b).some(k => !keys.includes(k))
  )
    throw new BadRequestException('Invalid fields');
}
const clean = (v: any, max: number) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max || /[<>\u0000-\u001f]/.test(v))
    throw new BadRequestException('Invalid text');
  return v.trim();
};

@Injectable()
export class PlacementsService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval>;
  private busy = false;
  private origin: string;
  private key: Buffer;
  constructor(private db: DataSource) {}
  onModuleInit() {
    if (process.env.PROFILEPAYS_TEST_ENABLED !== 'true') return;
    const url = new URL(process.env.AIHANGOUT_ORIGIN || 'https://aihangout.ai');
    if (url.origin !== 'https://aihangout.ai' && !['127.0.0.1', 'localhost'].includes(url.hostname))
      throw Error('Unsupported connector origin');
    this.origin = url.origin;
    this.key = Buffer.from(process.env.PLACEMENT_KEY || '', 'hex');
    if (this.key.length !== 32) throw Error('PLACEMENT_KEY must be a private 32-byte hex key');
    this.timer = setInterval(() => void this.tick(), 500);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  private enabled() {
    if (!this.origin) throw new ServiceUnavailableException('Test-credit placements are disabled');
  }
  private encrypt(value: string) {
    const iv = randomBytes(12),
      c = createCipheriv('aes-256-gcm', this.key, iv);
    const bytes = Buffer.concat([c.update(value, 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), bytes]).toString('base64');
  }
  private decrypt(value: string) {
    const b = Buffer.from(value, 'base64'),
      c = createDecipheriv('aes-256-gcm', this.key, b.subarray(0, 12));
    c.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([c.update(b.subarray(28)), c.final()]).toString('utf8');
  }
  private async remote(path: string, grant?: string, method = 'GET', body?: any) {
    const response = await fetch(this.origin + path, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(4000),
      headers: {
        'Content-Type': 'application/json',
        ...(grant ? { 'X-ProfilePays-Grant': grant } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const e: any = new Error(`Connector returned ${response.status}`);
      e.status = response.status;
      throw e;
    }
    return response.json();
  }
  async identityStart(user: any, b: any) {
    fair.strict(b, []);
    return new UnconfiguredIdentityProvider().createHostedVerification(user.id);
  }
  async exclusions(user: any, b: any) {
    this.enabled();
    return this.db.transaction(m => fair.exclusions(m, user, b));
  }
  async analytics(user: any, id: string, b: any) {
    this.enabled();
    return this.db.transaction(m => fair.analytics(m, user, id, b));
  }
  async connect(user: any, b: any) {
    this.enabled();
    exact(b, ['code']);
    if (typeof b.code !== 'string' || !/^[a-f0-9]{64}$/.test(b.code))
      throw new BadRequestException('A valid AIHangout connection code is required');
    let info: any;
    try {
      info = await this.remote('/api/profilepays/connection', b.code);
    } catch {
      throw new BadRequestException('AIHangout rejected this connection code');
    }
    return this.db.transaction(async m => {
      const [existing] = await m.query(
        'SELECT * FROM placement_destinations WHERE subject=$1 FOR UPDATE',
        [info.subject]
      );
      if (existing && existing.user_id !== user.id)
        throw new ConflictException('Destination already linked to another participant');
      if (existing) {
        const [lease] = await m.query(
          "SELECT id FROM placements WHERE destination_id=$1 AND state NOT IN ('ended','failed','cancelled')",
          [existing.id]
        );
        if (lease) throw new ConflictException('Finish the current placement before reconnecting');
      }
      const id = existing?.id || randomUUID();
      const [linked] = await m.query(
        `INSERT INTO placement_destinations(id,user_id,subject,username,encrypted_grant) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(subject) DO UPDATE SET encrypted_grant=excluded.encrypted_grant,username=excluded.username WHERE placement_destinations.user_id=excluded.user_id RETURNING id`,
        [id, user.id, info.subject, info.normal.username, this.encrypt(b.code)]
      );
      if (!linked) throw new ConflictException('Destination already linked to another participant');
      return { id: linked.id, username: info.normal.username, normal: info.normal };
    });
  }
  async dashboard(user: any) {
    this.enabled();
    return {
      testCreditsOnly: true,
      identity: identityStatus,
      exclusions: await this.db.query(
        'SELECT user_id,group_name,reason,created_at_ms FROM advertiser_exclusions WHERE sponsor_id=$1',
        [user.id]
      ),
      serverNow: Date.now(),
      origin: this.origin,
      minDurationSeconds: process.env.PROFILEPAYS_SHORT_TESTS === 'true' ? 10 : 3600,
      campaigns: await this.db.query(
        `SELECT c.id,c.sponsor_id,c.terms,c.budget,c.reserved,c.spent,c.status,c.notification_preferences,c.max_breaches,
        (SELECT png_base64 FROM placement_creatives a WHERE a.sponsor_id=c.sponsor_id AND a.asset_key=c.terms->>'assetKey') AS png_base64,
        ((SELECT count(*) FROM placements p WHERE p.campaign_id=c.id)+(SELECT count(*) FROM placement_holds h WHERE h.campaign_id=c.id AND h.state='held' AND h.expires_at_ms>$1))::integer AS participants
        FROM placement_campaigns c ORDER BY c.created_at DESC`,
        [Date.now()]
      ),
      creatives: await this.db.query(
        'SELECT id,name,asset_key,png_base64 FROM placement_creatives WHERE sponsor_id=$1 ORDER BY created_at DESC',
        [user.id]
      ),
      favorites: (
        await this.db.query('SELECT campaign_id FROM placement_favorites WHERE user_id=$1', [
          user.id,
        ])
      ).map(r => r.campaign_id),
      destinations: await this.db.query(
        'SELECT id,username FROM placement_destinations WHERE user_id=$1',
        [user.id]
      ),
      holds: await this.db.query(
        "SELECT * FROM placement_holds WHERE user_id=$1 AND state='held' AND expires_at_ms>$2",
        [user.id, Date.now()]
      ),
      standing: await fair.standing(this.db.manager, user),
      placements: await this.db.query(
        'SELECT p.id,p.user_id,p.campaign_id,p.state,p.record,d.username FROM placements p JOIN placement_destinations d ON d.id=p.destination_id JOIN placement_campaigns c ON c.id=p.campaign_id WHERE p.user_id=$1 OR c.sponsor_id=$1 OR $2=true ORDER BY p.created_at DESC',
        [user.id, user.userRole === 'admin']
      ),
      balance: Number(
        (
          await this.db.query(
            'SELECT COALESCE(SUM(amount),0) AS balance FROM test_credit_ledger WHERE account=$1',
            ['participant:' + user.id]
          )
        )[0].balance
      ),
    };
  }
  async adminOverview(user: any, search: string) {
    this.enabled();
    if (user.userRole !== 'admin') throw new ForbiddenException('Administrator access required');
    if (typeof search !== 'string' || search.length > 100)
      throw new BadRequestException('Search must be at most 100 characters');
    const query = '%' + search.trim().replace(/[\\%_]/g, '\\$&') + '%';
    return {
      testCreditsOnly: true,
      serverNow: Date.now(),
      held: await this.db
        .query(`SELECT p.id,p.user_id,p.campaign_id,p.record,d.username,c.sponsor_id
        FROM placements p JOIN placement_destinations d ON d.id=p.destination_id
        JOIN placement_campaigns c ON c.id=p.campaign_id
        WHERE p.record->>'settlement'='review_hold' ORDER BY p.created_at`),
      participants: await this.db.query(
        `SELECT u.id,u.first_name,u.last_name,
        ARRAY(SELECT d.username FROM placement_destinations d WHERE d.user_id=u.id) AS profiles,
        COALESCE(a.banned,false) AS banned,a.reason,a.decided_at_ms,
        (SELECT count(*)::int FROM placement_breaches b WHERE b.user_id=u.id AND b.status='confirmed') AS breaches
        FROM users u LEFT JOIN participant_access a ON a.user_id=u.id
        WHERE u.user_role='member' AND (u.id::text ILIKE $1 OR (u.first_name||' '||u.last_name) ILIKE $1
          OR EXISTS(SELECT 1 FROM placement_destinations d WHERE d.user_id=u.id AND d.username ILIKE $1))
        ORDER BY u.first_name,u.id LIMIT 100`,
        [query]
      ),
      standing: await fair.standing(this.db.manager, user),
      audit: await this.db.query(`SELECT id,actor_id,user_id,kind,reason,at_ms FROM conduct_audit
        ORDER BY at_ms DESC LIMIT 100`),
    };
  }
  async create(user: any, b: any) {
    this.enabled();
    if (!['advertiser', 'admin'].includes(user.userRole))
      throw new ForbiddenException('Sponsor account required');
    exact(b, [
      'commandKey',
      'title',
      'assetKey',
      'durationSeconds',
      'reward',
      'budget',
      'capacity',
      'brand',
      'description',
      'category',
      'notifications',
      'maxBreaches',
    ]);
    requireUuid(b.commandKey);
    const preferences = b.notifications ?? { broken: true, completed: true };
    this.validateNotifications(preferences);
    const maxBreaches = b.maxBreaches ?? null;
    if (
      maxBreaches !== null &&
      (!Number.isInteger(maxBreaches) || maxBreaches < 1 || maxBreaches > 1000)
    )
      throw new BadRequestException('Breach limit must be 1–1000 or no limit');
    const title = clean(b.title, 80),
      short = process.env.PROFILEPAYS_SHORT_TESTS === 'true';
    for (const k of ['durationSeconds', 'reward', 'budget', 'capacity'])
      if (!Number.isSafeInteger(b[k]) || b[k] <= 0)
        throw new BadRequestException('Positive whole numbers required');
    let creative;
    if (!['blue', 'green'].includes(b.assetKey)) {
      [creative] = await this.db.query(
        'SELECT * FROM placement_creatives WHERE sponsor_id=$1 AND asset_key=$2',
        [user.id, b.assetKey]
      );
      if (!creative) throw new BadRequestException('Choose a creative from your library');
    }
    if (
      b.durationSeconds < (short ? 10 : 3600) ||
      b.durationSeconds > 86400 ||
      b.reward > 10000 ||
      b.budget > 1000000 ||
      b.capacity > 100 ||
      b.budget < b.reward
    )
      throw new BadRequestException('Campaign is outside test limits');
    const sampleMs = short ? 2000 : 60000;
    const terms = {
      version: 1,
      title,
      brand: b.brand === undefined ? 'Test sponsor' : clean(b.brand, 60),
      description:
        b.description === undefined
          ? 'A temporary sponsored profile image.'
          : clean(b.description, 500),
      category: b.category === undefined ? 'Community' : clean(b.category, 40),
      ...(creative ? { imageSha256: creative.asset_key.slice(7) } : {}),
      assetKey: b.assetKey,
      durationSeconds: b.durationSeconds,
      reward: b.reward,
      capacity: b.capacity,
      sampleMs,
      maxGapMs: sampleMs + 10000,
      coverageRequired: 0.98,
      currency: 'TEST_CREDIT',
      consentVersion: 'static-test-v1',
      cancelPolicy: 'participant_zero_sponsor_prorated',
      windowEnd: Date.now() + 7 * 86400000,
    };
    const existing = (
      await this.db.query(
        'SELECT * FROM placement_campaigns WHERE sponsor_id=$1 AND command_key=$2',
        [user.id, b.commandKey]
      )
    )[0];
    if (existing) {
      for (const k of [
        'title',
        'assetKey',
        'durationSeconds',
        'reward',
        'capacity',
        'brand',
        'description',
        'category',
      ])
        if (
          (existing.terms[k] ??
            (
              {
                brand: 'Test sponsor',
                description: 'A temporary sponsored profile image.',
                category: 'Community',
              } as any
            )[k]) !== terms[k]
        )
          throw new ConflictException('Idempotency key reused with different campaign');
      if (existing.budget !== b.budget) throw new ConflictException('Budget conflict');
      return existing;
    }
    try {
      return (
        await this.db.query(
          'INSERT INTO placement_campaigns(id,sponsor_id,command_key,terms,budget,notification_preferences,max_breaches) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
          [randomUUID(), user.id, b.commandKey, terms, b.budget, preferences, maxBreaches]
        )
      )[0];
    } catch (e) {
      if (e.code === '23505') return this.create(user, b);
      throw e;
    }
  }
  private validateNotifications(b: any) {
    exact(b, ['broken', 'completed']);
    if (typeof b.broken !== 'boolean' || typeof b.completed !== 'boolean')
      throw new BadRequestException('Choose broken and completed notification preferences');
  }
  async notifications(user: any, id: string, b: any) {
    this.enabled();
    requireUuid(id);
    this.validateNotifications(b);
    const [c] = await this.db.query(
      'WITH updated AS (UPDATE placement_campaigns SET notification_preferences=$3 WHERE id=$1 AND sponsor_id=$2 RETURNING id,notification_preferences) SELECT * FROM updated',
      [id, user.id, b]
    );
    if (!c) throw new NotFoundException('Campaign missing');
    return c;
  }
  async join(user: any, id: string, b: any) {
    this.enabled();
    requireUuid(id);
    exact(b, ['commandKey', 'destinationId', 'termsVersion', 'consent', 'holdId']);
    requireUuid(b.holdId);
    requireUuid(b.commandKey);
    requireUuid(b.destinationId);
    if (b.termsVersion !== 1 || b.consent !== 'static-test-v1')
      throw new BadRequestException('Accept the exact test-credit terms');
    const [dest] = await this.db.query(
      'SELECT * FROM placement_destinations WHERE id=$1 AND user_id=$2',
      [b.destinationId, user.id]
    );
    if (!dest) throw new NotFoundException('Destination not linked');
    let info: any;
    try {
      info = await this.remote('/api/profilepays/connection', this.decrypt(dest.encrypted_grant));
    } catch {
      throw new BadRequestException('Destination permission unavailable');
    }
    return this.db.transaction(async m => {
      const [c] = await m.query('SELECT * FROM placement_campaigns WHERE id=$1 FOR UPDATE', [id]);
      if (!c) throw new NotFoundException('Campaign missing');
      const [prior] = await m.query(
        'SELECT * FROM placements WHERE user_id=$1 AND command_key=$2',
        [user.id, b.commandKey]
      );
      if (prior) {
        if (prior.campaign_id !== id || prior.destination_id !== dest.id)
          throw new ConflictException('Idempotency key conflict');
        return prior;
      }
      if (c.sponsor_id === user.id) throw new ForbiddenException('Cannot join your own campaign');
      await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      await fair.eligible(m, user.id, c);
      const [held] = await m.query(
        "SELECT * FROM placement_holds WHERE id=$1 AND campaign_id=$2 AND user_id=$3 AND destination_id=$4 AND state='held' AND expires_at_ms>$5 FOR UPDATE",
        [b.holdId, id, user.id, dest.id, Date.now()]
      );
      if (!held)
        throw new ConflictException(
          'Your 60-second hold expired or was released. Hold the offer again.'
        );
      const [{ count }] = await m.query(
        'SELECT count(*)::integer AS count FROM placements WHERE campaign_id=$1',
        [id]
      );
      if (
        c.status !== 'active' ||
        count >= c.terms.capacity ||
        c.reserved + c.spent + c.terms.reward > c.budget ||
        Date.now() + c.terms.durationSeconds * 1000 + 30000 > c.terms.windowEnd
      )
        throw new ConflictException('Campaign capacity, time or budget unavailable');
      const record = {
        terms: c.terms,
        original: info.normal,
        consentedAt: Date.now(),
        consent: 'static-test-v1',
        startsAt: null,
        endsAt: null,
        award: 0,
        assessment: 'pending',
        restoration: 'pending',
        nextCheck: 0,
        lastError: null,
        stopReason: null,
      };
      try {
        const [p] = await m.query(
          "INSERT INTO placements(id,campaign_id,user_id,destination_id,command_key,state,record) VALUES($1,$2,$3,$4,$5,'reserved',$6) RETURNING *",
          [randomUUID(), id, user.id, dest.id, b.commandKey, record]
        );
        await m.query('UPDATE placement_campaigns SET reserved=reserved+$2 WHERE id=$1', [
          id,
          c.terms.reward,
        ]);
        await m.query("UPDATE placement_holds SET state='confirmed' WHERE id=$1", [held.id]);
        await this.event(m, p.id, 'reserved', {
          consent: 'static-test-v1',
          original: info.normal,
          terms: c.terms,
        });
        return p;
      } catch (e) {
        if (e.code === '23505') throw new ConflictException('Already joined or surface occupied');
        throw e;
      }
    });
  }
  async uploadCreative(user: any, b: any) {
    this.enabled();
    if (!['advertiser', 'admin'].includes(user.userRole))
      throw new ForbiddenException('Sponsor account required');
    exact(b, ['name', 'png']);
    const name = clean(b.name, 80);
    if (typeof b.png !== 'string' || b.png.length > 95000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b.png))
      throw new BadRequestException('Use a PNG image up to 70 KB');
    let bytes: Buffer;
    try {
      const input = Buffer.from(b.png, 'base64');
      if (
        input.length < 33 ||
        input.length > 70000 ||
        input.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        input.readUInt32BE(16) !== 128 ||
        input.readUInt32BE(20) !== 128
      )
        throw Error();
      const decoded = PNG.sync.read(input, { checkCRC: true });
      bytes = PNG.sync.write(decoded, { colorType: 6 });
    } catch {
      throw new BadRequestException('Image must be a valid 128 x 128 PNG');
    }
    const key = 'sha256-' + createHash('sha256').update(bytes).digest('hex');
    return this.db.transaction(async m => {
      await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      const [prior] = await m.query(
        'SELECT id,name,asset_key,png_base64 FROM placement_creatives WHERE sponsor_id=$1 AND asset_key=$2',
        [user.id, key]
      );
      if (prior) return prior;
      const [{ count }] = await m.query(
        'SELECT count(*)::integer AS count FROM placement_creatives WHERE sponsor_id=$1',
        [user.id]
      );
      if (count >= 100) throw new ConflictException('Creative library limit reached');
      return (
        await m.query(
          'INSERT INTO placement_creatives(id,sponsor_id,name,asset_key,png_base64) VALUES($1,$2,$3,$4,$5) RETURNING id,name,asset_key,png_base64',
          [randomUUID(), user.id, name, key, bytes.toString('base64')]
        )
      )[0];
    });
  }
  async favorite(user: any, id: string, b: any) {
    this.enabled();
    requireUuid(id);
    exact(b, ['saved']);
    if (typeof b.saved !== 'boolean') throw new BadRequestException('Saved must be true or false');
    if (!(await this.db.query('SELECT id FROM placement_campaigns WHERE id=$1', [id])).length)
      throw new NotFoundException('Campaign missing');
    if (b.saved)
      await this.db.query(
        'INSERT INTO placement_favorites(user_id,campaign_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [user.id, id]
      );
    else
      await this.db.query('DELETE FROM placement_favorites WHERE user_id=$1 AND campaign_id=$2', [
        user.id,
        id,
      ]);
    return { saved: b.saved };
  }
  async campaignStatus(user: any, id: string, b: any) {
    this.enabled();
    requireUuid(id);
    exact(b, ['status']);
    if (!['active', 'paused'].includes(b.status))
      throw new BadRequestException('Invalid campaign status');
    const rows = await this.db.query(
      'WITH updated AS (UPDATE placement_campaigns SET status=$3 WHERE id=$1 AND sponsor_id=$2 RETURNING id,status) SELECT * FROM updated',
      [id, user.id, b.status]
    );
    if (!rows.length) throw new NotFoundException('Campaign missing');
    return rows[0];
  }
  async stop(user: any, id: string) {
    this.enabled();
    requireUuid(id);
    return this.db.transaction(async m => {
      const [p] = await m.query(
        'SELECT p.*,c.sponsor_id FROM placements p JOIN placement_campaigns c ON c.id=p.campaign_id WHERE p.id=$1 FOR UPDATE OF p',
        [id]
      );
      if (!p || ![p.user_id, p.sponsor_id].includes(user.id))
        throw new NotFoundException('Placement missing');
      if (!terminal.has(p.state) && !p.record.stopReason) {
        if (p.record.endsAt && Date.now() >= p.record.endsAt) {
          // A late cancellation cannot turn completed service into a prorated award.
          p.record.nextCheck = 0;
          await this.save(m, p);
          return { id, state: p.state };
        }
        p.record.stopReason = user.id === p.user_id ? 'participant' : 'sponsor';
        p.record.stoppedAt = Date.now();
        p.record.nextCheck = 0;
        p.state = 'restoring';
        await this.save(m, p);
        await this.event(m, id, 'stop_requested', { reason: p.record.stopReason });
      }
      return { id, state: p.state };
    });
  }
  async receipt(user: any, id: string) {
    requireUuid(id);
    const [p] = await this.db.query(
      'SELECT p.*,c.sponsor_id FROM placements p JOIN placement_campaigns c ON c.id=p.campaign_id WHERE p.id=$1',
      [id]
    );
    if (!p || (user.userRole !== 'admin' && ![p.user_id, p.sponsor_id].includes(user.id)))
      throw new NotFoundException('Placement missing');
    return {
      placement: p,
      observations: await this.db.query(
        'SELECT * FROM placement_observations WHERE placement_id=$1 ORDER BY id',
        [id]
      ),
      events: await this.db.query(
        'SELECT * FROM placement_events WHERE placement_id=$1 ORDER BY id',
        [id]
      ),
      ledger: await this.db.query('SELECT * FROM test_credit_ledger WHERE placement_id=$1', [id]),
    };
  }
  private event(m: EntityManager, id: string, type: string, detail: any) {
    return m.query(
      'INSERT INTO placement_events(placement_id,at_ms,type,detail) VALUES($1,$2,$3,$4)',
      [id, Date.now(), type, detail]
    );
  }
  private save(m: EntityManager, p: any) {
    return m.query('UPDATE placements SET state=$2,record=$3 WHERE id=$1', [
      p.id,
      p.state,
      p.record,
    ]);
  }
  private observe(m: EntityManager, p: any, kind: string, evidence: any, at = Date.now()) {
    return m.query(
      'INSERT INTO placement_observations(placement_id,at_ms,kind,evidence) VALUES($1,$2,$3,$4)',
      [p.id, at, kind, evidence]
    );
  }
  async tick() {
    if (this.busy || !this.origin) return;
    this.busy = true;
    try {
      await this.db.transaction(async m => {
        const [{ locked }] = await m.query('SELECT pg_try_advisory_xact_lock(7728184) AS locked');
        if (!locked) return;
        const rows = await m.query(
          "SELECT p.*,d.username,d.encrypted_grant FROM placements p JOIN placement_destinations d ON d.id=p.destination_id WHERE p.state NOT IN ('ended','failed','cancelled') ORDER BY p.created_at FOR UPDATE OF p SKIP LOCKED"
        );
        for (const p of rows) {
          if (p.record.nextCheck > Date.now()) continue;
          try {
            await this.advance(m, p);
            p.record.lastError = null;
          } catch (e) {
            p.record.lastError = e.message;
            p.record.nextCheck = Date.now() + 3000;
            await this.observe(m, p, 'unknown', { error: e.message });
            if ((e.status === 401 || e.status === 409) && !p.record.stopReason) {
              p.record.stopReason = e.status === 401 ? 'permission_revoked' : 'delivery_failure';
              p.record.stoppedAt = Date.now();
              p.state = 'restoring';
            }
          }
          await this.save(m, p);
        }
      });
    } catch (e) {
      console.error('Placement reconciliation failed:', e.message);
    } finally {
      this.busy = false;
    }
  }
  private async publicState(username: string) {
    return this.remote('/api/users/by-username/' + encodeURIComponent(username) + '/placement');
  }
  private async verifyImage(visible: any, expectedHash?: string) {
    const hashes = {
      blue: 'f48d0daf2cd83a1eabf0baf0a59af8f3c7f1551871b06e92e453f99e9d0d7706',
      green: 'aa403a155df82e5deb669e44fca78852d2dc3530dd0275315e110b573c5425d1',
    };
    const key = visible.placement.assetKey;
    const custom = /^sha256-[a-f0-9]{64}$/.test(key);
    const expected = custom ? expectedHash : hashes[key];
    if (!expected || (custom && key !== 'sha256-' + expected)) throw Error('Unapproved image');
    const response = await fetch(
      this.origin + (custom ? '/api/profilepays/assets/' + key : '/profilepays/' + key + '.png'),
      {
        redirect: 'error',
        signal: AbortSignal.timeout(4000),
        headers: { 'Cache-Control': 'no-cache' },
      }
    );
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png'))
      throw Error('Approved image unavailable');
    const digest = createHash('sha256')
      .update(Buffer.from(await response.arrayBuffer()))
      .digest('hex');
    if (digest !== expected) throw Error('Approved image bytes changed');
    visible.imageSha256 = digest;
  }
  private async recordBreach(m: EntityManager, p: any, remote: any) {
    const r = p.record;
    if (
      remote.id !== p.id ||
      remote.startsAt !== r.startsAt ||
      remote.endsAt !== r.endsAt ||
      remote.stopped !== true ||
      !Number.isFinite(remote.breachedAt) ||
      remote.breachedAt < r.startsAt ||
      remote.breachedAt >= r.endsAt ||
      !['user_override', 'placement_removed'].includes(remote.breachReason)
    )
      return false;
    r.breach = { at: remote.breachedAt, reason: remote.breachReason, source: 'AIHangout' };
    r.stopReason = 'user_override';
    r.stoppedAt = remote.breachedAt;
    p.state = 'restoring';
    await this.observe(m, p, 'breach', remote, remote.breachedAt);
    return true;
  }
  private async confirmExpiry(m: EntityManager, p: any, g: string, path: string, receipt?: any) {
    const r = p.record;
    const remote = receipt ?? (await this.remote(path, g));
    // The destination owns the deadline. Local clock skew and requests crossing expiry
    // must not turn a normal disappearance or rejected renewal into early removal.
    if (
      remote.id !== p.id ||
      remote.startsAt !== r.startsAt ||
      remote.endsAt !== r.endsAt ||
      !Number.isFinite(remote.observedAt) ||
      remote.observedAt < r.endsAt ||
      remote.stopped !== false ||
      remote.breachedAt != null ||
      remote.originalMatches !== true ||
      remote.leaseUntil < r.endsAt ||
      !Number.isFinite(remote.leaseUntil)
    )
      return false;
    await this.observe(m, p, 'valid_expiry', remote, r.endsAt);
    r.stopReason = 'deadline';
    r.stoppedAt = r.endsAt;
    p.state = 'restoring';
    return true;
  }
  private async advance(m: EntityManager, p: any) {
    const r = p.record,
      t = r.terms,
      g = this.decrypt(p.encrypted_grant),
      path = '/api/profilepays/assignments/' + p.id;
    if (!r.startsAt && !r.stopReason) {
      if (
        Date.now() + t.durationSeconds * 1000 > t.windowEnd ||
        Date.now() - new Date(p.created_at).getTime() > 30000
      ) {
        r.stopReason = 'activation_failed';
        p.state = 'restoring';
      } else {
        let png;
        if (t.imageSha256) {
          const [creative] = await m.query(
            'SELECT png_base64 FROM placement_creatives WHERE asset_key=$1 LIMIT 1',
            [t.assetKey]
          );
          if (!creative) throw Error('Creative unavailable');
          png = creative.png_base64;
        }
        const result: any = await this.remote(path, g, 'PUT', {
          assetKey: t.assetKey,
          durationSeconds: t.durationSeconds,
          originalKey: r.original.key,
          ...(png ? { png } : {}),
        });
        if (result.state === 'ended') {
          r.stopReason = 'activation_failed';
          p.state = 'restoring';
        } else {
          const visible: any = await this.publicState(p.username);
          if (visible.placement?.id !== p.id || visible.placement?.assetKey !== t.assetKey)
            throw Error('Destination readback did not confirm assignment');
          await this.verifyImage(visible, t.imageSha256);
          const confirmed: any = await this.remote(path + '/renew', g, 'POST');
          r.startsAt = confirmed.startsAt;
          r.endsAt = confirmed.endsAt;
          p.state = 'active';
          r.nextCheck = 0;
          await this.event(m, p.id, 'active', {
            startsAt: r.startsAt,
            endsAt: r.endsAt,
            independentReadback: visible,
          });
          await this.observe(m, p, 'valid', visible, r.startsAt);
        }
      }
    }
    if (r.startsAt && !r.stopReason && Date.now() < r.endsAt) {
      const visible: any = await this.publicState(p.username);
      if (visible.placement?.id !== p.id || visible.placement?.assetKey !== t.assetKey) {
        const remote = await this.remote(path, g);
        const breached = await this.recordBreach(m, p, remote);
        const expired =
          !breached &&
          (visible.observedAt >= r.endsAt || Date.now() >= r.endsAt) &&
          (await this.confirmExpiry(m, p, g, path, remote));
        if (!expired && !breached) {
          await this.observe(m, p, 'mismatch', visible);
          r.stopReason =
            visible.normal?.key !== r.original.key ? 'user_override' : 'delivery_failure';
          r.stoppedAt = Date.now();
          p.state = 'restoring';
        }
      } else {
        await this.verifyImage(visible, t.imageSha256);
        try {
          await this.remote(path + '/renew', g, 'POST');
        } catch (e) {
          if (e.status !== 409) throw e;
          const remote = await this.remote(path, g);
          if (
            !(await this.recordBreach(m, p, remote)) &&
            !(await this.confirmExpiry(m, p, g, path, remote))
          )
            throw e;
        }
        if (!r.stopReason) {
          await this.observe(m, p, 'valid', visible);
          r.coveredMs = (await this.coverage(m, p)).covered;
          p.state = 'active';
          r.nextCheck = Math.min(Date.now() + t.sampleMs, r.endsAt);
          return;
        }
      }
    }
    if (r.endsAt && Date.now() >= r.endsAt && !r.stopReason) {
      const remote: any = await this.remote(path, g);
      const breached = await this.recordBreach(m, p, remote);
      if (!breached && Number.isFinite(remote.observedAt) && remote.observedAt < r.endsAt) {
        r.nextCheck = Date.now() + t.sampleMs;
        return;
      }
      // A server expiry receipt closes the last sampled interval; it is not a viewer impression.
      if (!breached) {
        if (!(await this.confirmExpiry(m, p, g, path, remote)))
          await this.observe(m, p, 'mismatch', remote);
        r.stopReason = 'deadline';
        r.stoppedAt = r.endsAt;
        p.state = 'restoring';
      }
    }
    if (p.state === 'restoring' || r.stopReason) {
      if (r.startsAt && !r.breach) {
        try {
          await this.recordBreach(m, p, await this.remote(path, g));
        } catch (e) {
          if (e.status !== 401) throw e;
        }
      }
      try {
        await this.remote(path, g, 'DELETE');
      } catch (e) {
        if (e.status !== 401) throw e;
      }
      const visible: any = await this.publicState(p.username);
      if (visible.placement?.id === p.id) {
        p.state = 'restore_blocked';
        throw Error('Destination still displays assignment');
      }
      r.restoration = visible.normal?.key === r.original.key ? 'restored' : 'preserved_user_change';
      await this.event(m, p.id, 'restoration_confirmed', {
        outcome: r.restoration,
        readback: visible,
      });
      const { covered, mismatch, maxGap } = await this.coverage(m, p);
      const duration = t.durationSeconds * 1000;
      let award = 0;
      r.assessment = 'ineligible';
      if (
        r.stopReason === 'deadline' &&
        !mismatch &&
        covered >= duration * t.coverageRequired &&
        maxGap <= t.maxGapMs
      ) {
        award = t.reward;
        r.assessment = 'eligible';
      } else if (r.stopReason === 'sponsor') {
        award = Math.floor((t.reward * Math.min(covered, duration)) / duration);
        r.assessment = 'prorated';
      } else if (!['participant', 'user_override', 'activation_failed'].includes(r.stopReason)) {
        r.assessment = 'needs_review';
      }
      r.coveredMs = covered;
      r.requiredMs = duration;
      r.maxObservedGapMs = maxGap;
      r.award = award;
      if (['participant', 'user_override'].includes(r.stopReason) && r.startsAt) {
        r.notification = {
          type: 'agreement_broken',
          title: 'Agreement broken',
          occurredAt: r.breach?.at ?? r.stoppedAt,
          recordedAt: Date.now(),
          source: r.breach?.source ?? 'ProfilePays',
          campaign: t.title,
          message:
            'The placement was removed before the agreed end time. Replacing it does not restore this agreement. No payout will be released.',
          withheld: t.reward,
          currency: 'TEST_CREDIT',
          placementId: p.id,
        };
        await this.event(m, p.id, 'agreement_broken', r.notification);
        await m.query(
          'INSERT INTO placement_breaches(placement_id,user_id,occurred_at_ms,reason) VALUES($1,$2,$3,$4) ON CONFLICT(placement_id) DO NOTHING',
          [p.id, p.user_id, r.notification.occurredAt, r.stopReason]
        );
      }
      if (r.assessment === 'needs_review') {
        // Keep liability reserved for operator review; never label ambiguous evidence as earned.
        r.settlement = 'review_hold';
      } else {
        await this.settle(m, p, award);
      }
      if (r.assessment === 'eligible') {
        r.notification = {
          type: 'agreement_completed',
          title: 'Agreement completed',
          occurredAt: r.endsAt,
          recordedAt: Date.now(),
          campaign: t.title,
          message: 'The agreed placement period was completed and verified.',
          award,
          currency: 'TEST_CREDIT',
          placementId: p.id,
        };
        await this.event(m, p.id, 'agreement_completed', r.notification);
      }
      p.state = 'ended';
      await this.event(m, p.id, 'assessment', {
        decision: r.assessment,
        coveredMs: covered,
        award,
        settlement: r.settlement,
      });
    }
  }
  private async coverage(m: EntityManager, p: any) {
    const obs = await m.query(
      'SELECT at_ms,kind FROM placement_observations WHERE placement_id=$1 ORDER BY at_ms,id',
      [p.id]
    );
    const r = p.record;
    let covered = 0,
      previous: number | null = null,
      mismatch = false,
      maxGap = 0;
    for (const o of obs) {
      const at = Number(o.at_ms);
      if (o.kind === 'mismatch') mismatch = true;
      if (o.kind === 'valid' || o.kind === 'valid_expiry') {
        if (previous !== null) {
          const gap = at - previous;
          maxGap = Math.max(maxGap, gap);
          if (gap <= r.terms.maxGapMs)
            covered += Math.max(0, Math.min(at, r.endsAt) - Math.max(previous, r.startsAt));
        }
        previous = at;
      } else previous = null;
    }
    return { covered, mismatch, maxGap };
  }
  private async settle(m: EntityManager, p: any, award: number) {
    if (p.record.breach && award !== 0) throw Error('A breached placement cannot release a payout');
    const [{ count }] = await m.query(
      'SELECT count(*)::integer AS count FROM test_credit_ledger WHERE placement_id=$1',
      [p.id]
    );
    if (count) throw Error('Unexpected prior settlement');
    await m.query(
      'UPDATE placement_campaigns SET reserved=reserved-$2,spent=spent+$3 WHERE id=$1',
      [p.campaign_id, p.record.terms.reward, award]
    );
    await m.query(
      "INSERT INTO test_credit_ledger(placement_id,account,amount,currency) VALUES($1,$2,$3,'TEST_CREDIT'),($1,$4,$5,'TEST_CREDIT')",
      [p.id, 'campaign:' + p.campaign_id, -award, 'participant:' + p.user_id, award]
    );
    p.record.settlement = award ? 'credited_test_only' : 'released';
  }
  async hold(user: any, id: string, b: any) {
    this.enabled();
    return this.db.transaction(m => fair.hold(m, user, id, b));
  }
  async releaseHold(user: any, id: string) {
    this.enabled();
    requireUuid(id);
    const [h] = await this.db.query(
      "WITH changed AS (UPDATE placement_holds SET state='cancelled' WHERE id=$1 AND user_id=$2 AND state='held' AND expires_at_ms>$3 RETURNING *) SELECT * FROM changed",
      [id, user.id, Date.now()]
    );
    if (!h) throw new NotFoundException('Active hold missing');
    return { released: true };
  }
  async appeal(user: any, b: any) {
    this.enabled();
    return this.db.transaction(m => fair.appeal(m, user, b));
  }
  async reviewAppeal(user: any, id: string, b: any) {
    this.enabled();
    return this.db.transaction(m => fair.reviewAppeal(m, user, id, b));
  }
  async accessDecision(user: any, id: string, b: any) {
    this.enabled();
    return this.db.transaction(m => fair.decideAccess(m, user, id, b));
  }
  async resolve(user: any, id: string, b: any) {
    this.enabled();
    requireUuid(id);
    exact(b, ['award', 'reason']);
    const reason = clean(b.reason, 300);
    if (user.userRole !== 'admin')
      throw new ForbiddenException('Independent operator review required');
    return this.db.transaction(async m => {
      const [p] = await m.query(
        'SELECT p.*,c.sponsor_id FROM placements p JOIN placement_campaigns c ON c.id=p.campaign_id WHERE p.id=$1 FOR UPDATE OF p',
        [id]
      );
      if (!p || p.record.settlement !== 'review_hold')
        throw new ConflictException('No pending review');
      if ([p.user_id, p.sponsor_id].includes(user.id))
        throw new ForbiddenException('A separate reviewer must resolve this placement');
      if (!Number.isInteger(b.award) || b.award < 0 || b.award > p.record.terms.reward)
        throw new BadRequestException('Invalid award');
      if (p.record.breach && b.award !== 0)
        throw new BadRequestException('A confirmed breach cannot receive an award');
      await this.settle(m, p, b.award);
      p.record.award = b.award;
      p.record.assessment = 'operator_reviewed';
      const at = Date.now();
      p.record.review = { actor: user.id, reason, award: b.award, at };
      p.record.notification = {
        type: 'agreement_reviewed',
        title: 'Agreement reviewed',
        occurredAt: at,
        recordedAt: at,
        campaign: p.record.terms.title,
        message: `An administrator reviewed this agreement: ${reason}`,
        award: b.award,
        currency: 'TEST_CREDIT',
        placementId: id,
      };
      await this.event(m, id, 'review_resolved', { actor: user.id, reason, award: b.award });
      await this.save(m, p);
      return p;
    });
  }
}

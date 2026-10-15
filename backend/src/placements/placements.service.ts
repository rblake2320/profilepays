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
      origin: this.origin,
      minDurationSeconds: process.env.PROFILEPAYS_SHORT_TESTS === 'true' ? 10 : 3600,
      campaigns: await this.db.query(
        'SELECT id,sponsor_id,terms,budget,reserved,spent,status FROM placement_campaigns ORDER BY created_at DESC'
      ),
      destinations: await this.db.query(
        'SELECT id,username FROM placement_destinations WHERE user_id=$1',
        [user.id]
      ),
      placements: await this.db.query(
        'SELECT p.id,p.campaign_id,p.state,p.record,d.username FROM placements p JOIN placement_destinations d ON d.id=p.destination_id JOIN placement_campaigns c ON c.id=p.campaign_id WHERE p.user_id=$1 OR c.sponsor_id=$1 ORDER BY p.created_at DESC',
        [user.id]
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
    ]);
    requireUuid(b.commandKey);
    const title = clean(b.title, 80),
      short = process.env.PROFILEPAYS_SHORT_TESTS === 'true';
    for (const k of ['durationSeconds', 'reward', 'budget', 'capacity'])
      if (!Number.isSafeInteger(b[k]) || b[k] <= 0)
        throw new BadRequestException('Positive whole numbers required');
    if (
      !['blue', 'green'].includes(b.assetKey) ||
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
      for (const k of ['title', 'assetKey', 'durationSeconds', 'reward', 'capacity'])
        if (existing.terms[k] !== terms[k])
          throw new ConflictException('Idempotency key reused with different campaign');
      if (existing.budget !== b.budget) throw new ConflictException('Budget conflict');
      return existing;
    }
    try {
      return (
        await this.db.query(
          'INSERT INTO placement_campaigns(id,sponsor_id,command_key,terms,budget) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [randomUUID(), user.id, b.commandKey, terms, b.budget]
        )
      )[0];
    } catch (e) {
      if (e.code === '23505') return this.create(user, b);
      throw e;
    }
  }
  async join(user: any, id: string, b: any) {
    this.enabled();
    requireUuid(id);
    exact(b, ['commandKey', 'destinationId', 'termsVersion', 'consent']);
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
    if (!p || ![p.user_id, p.sponsor_id].includes(user.id))
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
  private async verifyImage(visible: any) {
    const hashes = {
      blue: 'f48d0daf2cd83a1eabf0baf0a59af8f3c7f1551871b06e92e453f99e9d0d7706',
      green: 'aa403a155df82e5deb669e44fca78852d2dc3530dd0275315e110b573c5425d1',
    };
    const key = visible.placement.assetKey;
    if (!hashes[key]) throw Error('Unapproved image');
    const response = await fetch(this.origin + '/profilepays/' + key + '.png', {
      redirect: 'error',
      signal: AbortSignal.timeout(4000),
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png'))
      throw Error('Approved image unavailable');
    const digest = createHash('sha256')
      .update(Buffer.from(await response.arrayBuffer()))
      .digest('hex');
    if (digest !== hashes[key]) throw Error('Approved image bytes changed');
    visible.imageSha256 = digest;
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
        const result: any = await this.remote(path, g, 'PUT', {
          assetKey: t.assetKey,
          durationSeconds: t.durationSeconds,
          originalKey: r.original.key,
        });
        if (result.state === 'ended') {
          r.stopReason = 'activation_failed';
          p.state = 'restoring';
        } else {
          const visible: any = await this.publicState(p.username);
          if (visible.placement?.id !== p.id || visible.placement?.assetKey !== t.assetKey)
            throw Error('Destination readback did not confirm assignment');
          await this.verifyImage(visible);
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
        await this.observe(m, p, 'mismatch', visible);
        r.stopReason =
          visible.normal?.key !== r.original.key ? 'user_override' : 'delivery_failure';
        r.stoppedAt = Date.now();
        p.state = 'restoring';
      } else {
        await this.verifyImage(visible);
        await this.remote(path + '/renew', g, 'POST');
        await this.observe(m, p, 'valid', visible);
        p.state = 'active';
        r.nextCheck = Math.min(Date.now() + t.sampleMs, r.endsAt);
        return;
      }
    }
    if (r.endsAt && Date.now() >= r.endsAt && !r.stopReason) {
      const remote: any = await this.remote(path, g);
      // A server expiry receipt closes the last sampled interval; it is not a viewer impression.
      if (
        !remote.stopped &&
        remote.originalMatches &&
        remote.endsAt === r.endsAt &&
        remote.leaseUntil >= r.endsAt
      )
        await this.observe(m, p, 'valid_expiry', remote, r.endsAt);
      else await this.observe(m, p, 'mismatch', remote);
      r.stopReason = 'deadline';
      r.stoppedAt = r.endsAt;
      p.state = 'restoring';
    }
    if (p.state === 'restoring' || r.stopReason) {
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
      const obs = await m.query(
        'SELECT at_ms,kind FROM placement_observations WHERE placement_id=$1 ORDER BY at_ms,id',
        [p.id]
      );
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
            if (gap <= t.maxGapMs)
              covered += Math.max(0, Math.min(at, r.endsAt) - Math.max(previous, r.startsAt));
          }
          previous = at;
        } else previous = null;
      }
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
      if (r.assessment === 'needs_review') {
        // Keep liability reserved for operator review; never label ambiguous evidence as earned.
        r.settlement = 'review_hold';
      } else {
        await this.settle(m, p, award);
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
  private async settle(m: EntityManager, p: any, award: number) {
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
  async resolve(user: any, id: string, b: any) {
    this.enabled();
    requireUuid(id);
    exact(b, ['award', 'reason']);
    const reason = clean(b.reason, 300);
    if (user.userRole !== 'admin')
      throw new ForbiddenException('Independent operator review required');
    return this.db.transaction(async m => {
      const [p] = await m.query('SELECT * FROM placements WHERE id=$1 FOR UPDATE', [id]);
      if (!p || p.record.settlement !== 'review_hold')
        throw new ConflictException('No pending review');
      if (!Number.isInteger(b.award) || b.award < 0 || b.award > p.record.terms.reward)
        throw new BadRequestException('Invalid award');
      await this.settle(m, p, b.award);
      p.record.award = b.award;
      p.record.assessment = 'operator_reviewed';
      await this.event(m, id, 'review_resolved', { actor: user.id, reason, award: b.award });
      await this.save(m, p);
      return p;
    });
  }
}

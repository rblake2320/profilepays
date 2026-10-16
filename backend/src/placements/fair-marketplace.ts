import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
export const strict = (b: any, keys: string[]) => {
  if (
    !b ||
    typeof b !== 'object' ||
    Array.isArray(b) ||
    Object.keys(b).some(k => !keys.includes(k))
  )
    throw new BadRequestException('Invalid fields');
};
export const uuid = (id: any) => {
  if (
    typeof id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
  )
    throw new BadRequestException('UUID required');
  return id;
};
const reason = (s: any) => {
  if (
    typeof s !== 'string' ||
    s.trim().length < 5 ||
    s.length > 1000 ||
    /[<>\u0000-\u001f]/.test(s)
  )
    throw new BadRequestException('Give a reason of 5–1000 characters');
  return s.trim();
};
export async function eligible(m: EntityManager, userId: string, c: any) {
  await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
  const [excluded] = await m.query(
    'SELECT 1 FROM advertiser_exclusions WHERE sponsor_id=$1 AND user_id=$2',
    [c.sponsor_id, userId]
  );
  if (excluded)
    throw new ForbiddenException(
      'This advertiser is not accepting your participation. Other advertisers have their own eligibility rules.'
    );
  const [access] = await m.query('SELECT * FROM participant_access WHERE user_id=$1', [userId]);
  if (access?.banned)
    throw new ForbiddenException('Offer access is suspended. You can appeal from Your standing.');
  const [{ count }] = await m.query(
    "SELECT count(*)::integer AS count FROM placement_breaches WHERE user_id=$1 AND status='confirmed'",
    [userId]
  );
  if (c.max_breaches !== null && c.max_breaches !== undefined && count >= c.max_breaches)
    throw new ForbiddenException(
      `This offer requires fewer than ${c.max_breaches} confirmed breaches. You have ${count}.`
    );
}
export async function hold(m: EntityManager, user: any, id: string, b: any) {
  uuid(id);
  strict(b, ['destinationId', 'commandKey']);
  uuid(b.destinationId);
  uuid(b.commandKey);
  const [c] = await m.query('SELECT * FROM placement_campaigns WHERE id=$1 FOR UPDATE', [id]);
  if (!c) throw new NotFoundException('Campaign missing');
  const [prior] = await m.query(
    'SELECT * FROM placement_holds WHERE user_id=$1 AND command_key=$2',
    [user.id, b.commandKey]
  );
  if (prior) {
    if (prior.campaign_id !== id || prior.destination_id !== b.destinationId)
      throw new ConflictException('Hold key conflict');
    return prior;
  }
  if (c.sponsor_id === user.id) throw new ForbiddenException('Cannot hold your own offer');
  await eligible(m, user.id, c);
  const [dest] = await m.query('SELECT id FROM placement_destinations WHERE id=$1 AND user_id=$2', [
    b.destinationId,
    user.id,
  ]);
  if (!dest) throw new NotFoundException('Destination not linked');
  await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
  const [occupied] = await m.query(
    "SELECT id FROM placements WHERE user_id=$1 AND (campaign_id=$2 OR (destination_id=$3 AND state NOT IN ('ended','failed','cancelled')))",
    [user.id, id, b.destinationId]
  );
  if (occupied)
    throw new ConflictException(
      'You already joined this offer or this profile has an active placement'
    );
  const now = Date.now();
  const [existing] = await m.query(
    "SELECT * FROM placement_holds WHERE user_id=$1 AND state='held' AND expires_at_ms>$2",
    [user.id, now]
  );
  if (existing)
    throw new ConflictException('You already have a hold. Confirm or release it first.');
  const [{ count }] = await m.query(
    "SELECT (SELECT count(*) FROM placements WHERE campaign_id=$1)+(SELECT count(*) FROM placement_holds WHERE campaign_id=$1 AND state='held' AND expires_at_ms>$2) AS count",
    [id, now]
  );
  const [{ holds }] = await m.query(
    "SELECT count(*)::integer AS holds FROM placement_holds WHERE campaign_id=$1 AND state='held' AND expires_at_ms>$2",
    [id, now]
  );
  if (
    c.status !== 'active' ||
    Number(count) >= c.terms.capacity ||
    c.reserved + c.spent + (holds + 1) * c.terms.reward > c.budget ||
    now + 60000 + c.terms.durationSeconds * 1000 + 30000 > c.terms.windowEnd
  )
    throw new ConflictException('No offer capacity available');
  const [h] = await m.query(
    "INSERT INTO placement_holds(id,campaign_id,user_id,destination_id,command_key,created_at_ms,expires_at_ms,state) VALUES($1,$2,$3,$4,$5,$6,$7,'held') RETURNING *",
    [randomUUID(), id, user.id, b.destinationId, b.commandKey, now, now + 60000]
  );
  return h;
}
export async function standing(m: EntityManager, user: any) {
  const admin = user.userRole === 'admin';
  return {
    breaches: await m.query(
      `SELECT b.*,p.record->'terms'->>'title' AS campaign,d.username FROM placement_breaches b JOIN placements p ON p.id=b.placement_id JOIN placement_destinations d ON d.id=p.destination_id WHERE b.user_id=$1 OR $2 ORDER BY occurred_at_ms DESC`,
      [user.id, admin]
    ),
    access: await m.query('SELECT * FROM participant_access WHERE user_id=$1 OR $2', [
      user.id,
      admin,
    ]),
    appeals: await m.query(
      'SELECT * FROM conduct_appeals WHERE user_id=$1 OR $2 ORDER BY created_at_ms DESC',
      [user.id, admin]
    ),
  };
}
export async function appeal(m: EntityManager, user: any, b: any) {
  strict(b, ['placementId', 'reason']);
  const why = reason(b.reason);
  let placementId = null,
    decision = null;
  if (b.placementId) {
    uuid(b.placementId);
    const [breach] = await m.query(
      "SELECT * FROM placement_breaches WHERE placement_id=$1 AND user_id=$2 AND status='confirmed' FOR UPDATE",
      [b.placementId, user.id]
    );
    if (!breach) throw new NotFoundException('Confirmed breach missing');
    placementId = b.placementId;
  } else {
    const [access] = await m.query(
      'SELECT * FROM participant_access WHERE user_id=$1 AND banned=true FOR UPDATE',
      [user.id]
    );
    if (!access) throw new NotFoundException('Suspension missing');
    decision = access.decided_at_ms;
  }
  try {
    const [a] = await m.query(
      'INSERT INTO conduct_appeals(id,user_id,placement_id,access_decision_ms,reason,created_at_ms) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [randomUUID(), user.id, placementId, decision, why, Date.now()]
    );
    return a;
  } catch (e) {
    if (e.code === '23505') throw new ConflictException('An appeal is already pending');
    throw e;
  }
}
export async function decideAccess(m: EntityManager, user: any, id: string, b: any) {
  if (user.userRole !== 'admin') throw new ForbiddenException('Administrator review required');
  uuid(id);
  strict(b, ['banned', 'reason']);
  const why = reason(b.reason);
  if (typeof b.banned !== 'boolean' || id === user.id)
    throw new BadRequestException('Independent reviewer and access decision required');
  const [target] = await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [id]);
  if (!target) throw new NotFoundException('Participant missing');
  const at = Date.now();
  await m.query(
    'INSERT INTO participant_access(user_id,banned,reason,decided_by,decided_at_ms) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET banned=EXCLUDED.banned,reason=EXCLUDED.reason,decided_by=EXCLUDED.decided_by,decided_at_ms=EXCLUDED.decided_at_ms',
    [id, b.banned, why, user.id, at]
  );
  await m.query(
    'INSERT INTO conduct_audit(id,actor_id,user_id,kind,reason,at_ms) VALUES($1,$2,$3,$4,$5,$6)',
    [randomUUID(), user.id, id, b.banned ? 'suspended' : 'restored', why, at]
  );
  return { banned: b.banned, reason: why, at };
}
export async function reviewAppeal(m: EntityManager, user: any, id: string, b: any) {
  if (user.userRole !== 'admin') throw new ForbiddenException('Administrator review required');
  uuid(id);
  strict(b, ['decision', 'reason']);
  const why = reason(b.reason);
  if (!['upheld', 'overturned'].includes(b.decision))
    throw new BadRequestException('Choose uphold or overturn');
  const [a] = await m.query(
    "SELECT * FROM conduct_appeals WHERE id=$1 AND status='pending' FOR UPDATE",
    [id]
  );
  if (!a) throw new ConflictException('No pending appeal');
  const [conflict] = a.placement_id
    ? await m.query(
        'SELECT 1 FROM placements p JOIN placement_campaigns c ON c.id=p.campaign_id WHERE p.id=$1 AND c.sponsor_id=$2',
        [a.placement_id, user.id]
      )
    : [];
  if (conflict || a.user_id === user.id)
    throw new ForbiddenException('Independent reviewer required');
  if (b.decision === 'overturned') {
    if (a.placement_id)
      await m.query("UPDATE placement_breaches SET status='overturned' WHERE placement_id=$1", [
        a.placement_id,
      ]);
    else {
      const [access] = await m.query(
        'SELECT * FROM participant_access WHERE user_id=$1 FOR UPDATE',
        [a.user_id]
      );
      if (String(access?.decided_at_ms) !== String(a.access_decision_ms))
        throw new ConflictException('A newer access decision needs separate review');
      await decideAccess(m, user, a.user_id, { banned: false, reason: why });
    }
  }
  const at = Date.now();
  await m.query(
    'UPDATE conduct_appeals SET status=$2,decision_reason=$3,decided_by=$4,decided_at_ms=$5 WHERE id=$1',
    [id, b.decision, why, user.id, at]
  );
  await m.query(
    'INSERT INTO conduct_audit(id,actor_id,user_id,kind,reason,at_ms) VALUES($1,$2,$3,$4,$5,$6)',
    [randomUUID(), user.id, a.user_id, 'appeal_' + b.decision, why, at]
  );
  return { decision: b.decision, at };
}

export async function exclusions(m: EntityManager, user: any, b: any) {
  if (!['advertiser', 'admin'].includes(user.userRole))
    throw new ForbiddenException('Advertiser account required');
  strict(b, ['userIds', 'blocked', 'groupName', 'reason']);
  if (
    !Array.isArray(b.userIds) ||
    !b.userIds.length ||
    b.userIds.length > 100 ||
    typeof b.blocked !== 'boolean'
  )
    throw new BadRequestException('Choose 1�100 participants and an exclusion decision');
  const ids = [...new Set<string>(b.userIds.map(uuid))].sort(),
    why = reason(b.reason);
  const group = b.groupName === undefined ? '' : b.groupName;
  if (typeof group !== 'string' || group.length > 80 || /[<>\u0000-\u001f]/.test(group))
    throw new BadRequestException('Invalid group name');
  for (const id of ids) {
    if (id === user.id) throw new BadRequestException('Cannot exclude yourself');
    const [target] = await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [id]);
    if (!target) throw new NotFoundException('Participant missing');
    if (b.blocked)
      await m.query(
        'INSERT INTO advertiser_exclusions(sponsor_id,user_id,group_name,reason,created_at_ms) VALUES($1,$2,$3,$4,$5) ON CONFLICT(sponsor_id,user_id) DO UPDATE SET group_name=EXCLUDED.group_name,reason=EXCLUDED.reason,created_at_ms=EXCLUDED.created_at_ms',
        [user.id, id, group.trim(), why, Date.now()]
      );
    else
      await m.query('DELETE FROM advertiser_exclusions WHERE sponsor_id=$1 AND user_id=$2', [
        user.id,
        id,
      ]);
    await m.query(
      'INSERT INTO conduct_audit(id,actor_id,user_id,kind,reason,at_ms) VALUES($1,$2,$3,$4,$5,$6)',
      [
        randomUUID(),
        user.id,
        id,
        b.blocked ? 'advertiser_excluded' : 'advertiser_restored',
        why,
        Date.now(),
      ]
    );
  }
  return { count: ids.length, blocked: b.blocked };
}
export async function analytics(m: EntityManager, user: any, id: string, b: any) {
  uuid(id);
  strict(b, ['package']);
  if (!['demand', 'delivery', 'all'].includes(b.package))
    throw new BadRequestException('Choose demand, delivery or all');
  const [c] = await m.query('SELECT * FROM placement_campaigns WHERE id=$1 AND sponsor_id=$2', [
    id,
    user.id,
  ]);
  if (!c) throw new NotFoundException('Campaign missing');
  await m.query(
    'INSERT INTO analytics_access(campaign_id,sponsor_id,package,enabled_at_ms) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
    [id, user.id, b.package, Date.now()]
  );
  const result: any = {
    campaign: c.terms.title,
    package: b.package,
    mode: 'free_test_preview',
    realChargesEnabled: false,
    generatedAt: Date.now(),
  };
  if (b.package !== 'delivery') {
    const [holds] = await m.query(
      "SELECT count(*)::int AS total,count(*) FILTER(WHERE state='confirmed')::int AS confirmed,count(*) FILTER(WHERE state='cancelled')::int AS cancelled,count(*) FILTER(WHERE state='held' AND expires_at_ms<=$2)::int AS expired FROM placement_holds WHERE campaign_id=$1",
      [id, Date.now()]
    );
    const [fill] = await m.query(
      'SELECT count(*)::int AS participants,max(created_at) AS last_join FROM placements WHERE campaign_id=$1',
      [id]
    );
    result.demand = {
      ...holds,
      participants: fill.participants,
      capacity: c.terms.capacity,
      timeToFillMs:
        fill.participants >= c.terms.capacity
          ? new Date(fill.last_join).getTime() - new Date(c.created_at).getTime()
          : null,
    };
  }
  if (b.package !== 'demand')
    result.delivery = (
      await m.query(
        "SELECT count(*)::int AS placements,count(*) FILTER(WHERE record->'notification'->>'type'='agreement_completed')::int AS completed,count(*) FILTER(WHERE record->'notification'->>'type'='agreement_broken')::int AS broken,COALESCE(sum((record->>'coveredMs')::bigint),0) AS verifiedMs,COALESCE(sum((record->>'award')::int),0)::int AS testCredits FROM placements WHERE campaign_id=$1",
        [id]
      )
    )[0];
  return result;
}

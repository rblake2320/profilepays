require('ts-node').register({ project: 'backend/tsconfig.json', transpileOnly: true });
require('reflect-metadata');
const assert = require('node:assert/strict');
const { PlacementsService } = require('../backend/src/placements/placements.service');
const realNow = Date.now;
async function scenario(name, options = {}) {
  const end = 301000,
    now = end + (options.localOffset ?? -5);
  Date.now = () => now;
  const service = new PlacementsService({});
  const p = {
    id: 'placement',
    username: 'test',
    state: 'active',
    record: {
      startsAt: 1000,
      endsAt: end,
      original: { key: 'original' },
      terms: {
        assetKey: 'blue',
        durationSeconds: 300,
        reward: 100,
        coverageRequired: 0.98,
        maxGapMs: 12000,
        sampleMs: 2000,
      },
    },
  };
  const observations = [];
  for (let at = 1000; at <= end - 2000; at += 2000) observations.push({ at_ms: at, kind: 'valid' });
  const receipt = {
    id: p.id,
    startsAt: 1000,
    endsAt: end,
    leaseUntil: end,
    stopped: false,
    originalMatches: true,
    observedAt: end + 98,
    ...options.receipt,
  };
  service.decrypt = () => 'test-grant';
  let deleted = false;
  service.publicState = async () => ({
    normal: { key: 'original' },
    observedAt: options.visibleAt ?? end + 98,
    placement: !deleted && options.renewRace ? { id: p.id, assetKey: 'blue' } : null,
  });
  service.remote = async (path, grant, method = 'GET') => {
    if (method === 'DELETE') {
      deleted = true;
      return {};
    }
    if (path.endsWith('/renew')) {
      const error = new Error('expired');
      error.status = 409;
      throw error;
    }
    return receipt;
  };
  service.verifyImage = async () => {};
  service.observe = async (m, p, kind, evidence, at = Date.now()) =>
    observations.push({ at_ms: at, kind, evidence });
  service.event = async () => {};
  service.settle = async (m, p, award) => {
    p.record.settlement = award ? 'credited_test_only' : 'released';
  };
  await service.advance({ query: async () => observations }, p);
  if (options.breach) {
    assert.equal(p.state, 'ended', name);
    assert.equal(p.record.award, 0, name);
    assert.equal(p.record.assessment, 'ineligible', name);
    assert.equal(p.record.settlement, 'released', name);
    assert.equal(p.record.notification.type, 'agreement_broken', name);
    assert.equal(p.record.notification.occurredAt, receipt.breachedAt, name);
    assert.equal(p.record.notification.withheld, 100, name);
    assert.equal(p.record.breach.at, receipt.breachedAt, name);
    await assert.rejects(
      () => PlacementsService.prototype.settle.call(service, {}, p, 100),
      /cannot release/
    );
  } else if (options.pending) {
    assert.equal(p.state, 'active', name);
    assert.equal(p.record.stopReason, undefined, name);
  } else if (options.rejected) {
    assert.notEqual(p.record.award, 100, name);
    assert.ok(
      observations.some(o => o.kind === 'mismatch'),
      name
    );
  } else {
    assert.equal(p.state, 'ended', name);
    assert.equal(p.record.stopReason, 'deadline', name);
    assert.equal(p.record.award, 100, name);
    assert.equal(p.record.coveredMs, 300000, name);
    assert.equal(p.record.restoration, 'restored', name);
    assert.ok(!observations.some(o => o.kind === 'mismatch'), name);
  }
  console.log('Worked:', name);
}
(async () => {
  try {
    await scenario('origin expiry 5ms before local clock reaches deadline');
    for (const localOffset of [-5, 20])
      await scenario('remove and replace stays breached at local offset ' + localOffset, {
        localOffset,
        breach: true,
        receipt: { stopped: true, breachedAt: 150000, breachReason: 'user_override' },
      });
    await scenario('removal during renewal remains breached', {
      renewRace: true,
      breach: true,
      receipt: { stopped: true, breachedAt: 300900, breachReason: 'placement_removed' },
    });
    await scenario('public request crosses deadline', { localOffset: 20 });
    await scenario('renewal crosses deadline', { renewRace: true, visibleAt: 300999 });
    await scenario('genuine early disappearance', {
      visibleAt: 300900,
      localOffset: -100,
      rejected: true,
    });
    await scenario('explicit remote stop is not expiry', {
      receipt: { stopped: true },
      rejected: true,
    });
    await scenario('lease gap is not expiry', { receipt: { leaseUntil: 300999 }, rejected: true });
    await scenario('different assignment is not expiry', {
      receipt: { id: 'other' },
      rejected: true,
    });
    await scenario('different start is not expiry', { receipt: { startsAt: 999 }, rejected: true });
    await scenario('original changed is not expiry', {
      receipt: { originalMatches: false },
      rejected: true,
    });
    await scenario('local clock ahead waits for origin deadline', {
      localOffset: 10,
      receipt: { observedAt: 300900 },
      pending: true,
    });
  } finally {
    Date.now = realNow;
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});

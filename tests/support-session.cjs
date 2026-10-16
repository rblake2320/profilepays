require('ts-node').register({ project: 'backend/tsconfig.json', transpileOnly: true });
require('reflect-metadata');
const assert = require('node:assert/strict');
const { SupportService } = require('../backend/src/support/support.module');
// Broken baseline: wrong-role reads/writes succeed, old frames remain visible, or stop/expiry can be bypassed.
// Positive control: correct writer publishes and correct viewer receives exactly the submitted bytes.
const service = new SupportService();
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
let checks = 0;
function denied(fn, status) { assert.throws(fn, e => e.getStatus() === status); checks++; }
function check(fn) { fn(); checks++; }
const bearer = token => `Bearer ${token}`;
try {
  denied(() => service.create(''), 401);
  const pair = service.create('owner');
  check(() => assert.notEqual(pair.publishToken, pair.viewToken));
  const replaced = service.create('another-owner');
  service.create('another-owner');
  denied(() => service.read(replaced.id, bearer(replaced.viewToken)), 401);
  denied(() => service.read(pair.id, ''), 401);
  denied(() => service.read(pair.id, bearer(pair.publishToken)), 401);
  denied(() => service.publish(pair.id, bearer(pair.viewToken), { frame: '/9j/2Q==' }), 401);
  denied(() => service.stopOwned(pair.id, 'stranger'), 401);
  check(() => assert.equal(service.read(pair.id, bearer(pair.viewToken)).status, 'waiting'));
  for (const body of [null, {}, { frame: '<svg onload=alert(1)>' }, { frame: 'A'.repeat(85_001) }, { frame: '/9j/2Q==', unexpected: true }, { frame: 'YWJjZA==' }, { frame: 3 }]) {
    denied(() => service.publish(pair.id, bearer(pair.publishToken), body), 400);
  }
  const frame = '/9j/2Q=='; // JPEG boundary fixture; live test uses a decodable image.
  check(() => assert.equal(service.publish(pair.id, bearer(pair.publishToken), { frame }).capturedAt, now));
  denied(() => service.publish(pair.id, bearer(pair.publishToken), { frame }), 429);
  now += 1_000;
  check(() => assert.equal(service.read(pair.id, bearer(pair.viewToken)).frame, frame));
  denied(() => service.read(pair.id, bearer(pair.viewToken)), 429);
  now += 6_000;
  check(() => { const state = service.read(pair.id, bearer(pair.viewToken)); assert.equal(state.frame, null); assert.equal(state.status, 'paused'); });
  service.publish(pair.id, bearer(pair.publishToken), { frame });
  check(() => assert.equal(service.stop(pair.id, bearer(pair.viewToken)).stopped, true));
  denied(() => service.read(pair.id, bearer(pair.viewToken)), 401);
  denied(() => service.publish(pair.id, bearer(pair.publishToken), { frame }), 401);
  const expired = service.create('owner');
  now += 15 * 60_000;
  denied(() => service.publish(expired.id, bearer(expired.publishToken), { frame }), 401);
  denied(() => service.read(expired.id, bearer(expired.viewToken)), 401);
  const other = service.create('owner');
  service.onModuleDestroy();
  denied(() => service.read(other.id, bearer(other.viewToken)), 401);
  console.log(JSON.stringify({ outcome: 'Worked', checks, scenarios: ['role separation', 'invalid input', 'rate limits', 'frame expiry', 'stop', 'session expiry', 'restart loses grants'] }));
} finally { Date.now = realNow; service.onModuleDestroy(); }

const assert = require('node:assert/strict');
const saved = new Map([
  ['user', JSON.stringify({ userType: 'admin' })],
  ['accessToken', 'legacy-access'],
  ['refreshToken', 'legacy-refresh'],
]);
global.localStorage = {
  getItem: k => saved.get(k) || null,
  setItem: (k, v) => saved.set(k, v),
  removeItem: k => saved.delete(k),
};
global.BroadcastChannel = undefined;
require('ts-node').register({ project: 'backend/tsconfig.json', transpileOnly: true });
const axios = require('axios');
const client = require('../frontend/src/api/client');
const auth = require('../frontend/src/store/authSlice');
const { configureStore } = require('@reduxjs/toolkit');
const store = configureStore({ reducer: { auth: auth.default } });
const member = {
  id: 'fixture-member',
  email: 'session-test@example.invalid',
  userRole: 'member',
  firstName: 'Fixture',
};
let failLogout = false,
  refreshCalls = 0,
  requests = [];
const adapter = async config => {
  requests.push(config);
  if (config.url.endsWith('/logout') && failLogout) throw new Error('Offline fixture');
  let data = {};
  if (config.url.endsWith('/login')) data = { accessToken: 'memory-only-access', user: member };
  if (config.url.endsWith('/me')) data = member;
  if (config.url.endsWith('/refresh')) {
    refreshCalls++;
    await new Promise(r => setTimeout(r, 10));
    data = { accessToken: 'rotated-memory-access' };
  }
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
axios.defaults.adapter = adapter;
client.apiClient.defaults.adapter = adapter;
(async () => {
  assert.equal(saved.size, 0);
  assert.equal(store.getState().auth.user, null);
  assert.equal(store.getState().auth.ready, false);
  console.log(
    'Worked: forged cached administrator and legacy credentials discarded before session restoration'
  );
  await store.dispatch(auth.fetchCurrentUser());
  assert.equal(store.getState().auth.user.userType, 'member');
  await store.dispatch(auth.loginUser({ email: member.email, password: 'fixture-only' }));
  await client.apiClient.get('/users/me');
  assert.equal(requests.at(-1).headers.Authorization, 'Bearer memory-only-access');
  assert.equal(saved.size, 0);
  console.log(
    'Worked: server role controls identity; access credential stays in memory and no credentials enter storage'
  );
  const refreshed = await Promise.all([client.refreshSession(), client.refreshSession()]);
  assert.equal(refreshCalls, 1);
  assert.deepEqual(refreshed, ['rotated-memory-access', 'rotated-memory-access']);
  console.log('Worked: simultaneous refreshes coalesce into one cookie-backed request');
  failLogout = true;
  const failed = await store.dispatch(auth.logout());
  assert.ok(auth.logout.rejected.match(failed));
  assert.equal(store.getState().auth.user.userType, 'member');
  assert.match(store.getState().auth.error, /could not be confirmed/);
  console.log('Worked: failed server logout stays visibly signed in and supplies actionable error');
  failLogout = false;
  const done = await store.dispatch(auth.logout());
  assert.ok(auth.logout.fulfilled.match(done));
  assert.equal(store.getState().auth.user, null);
  const logoutRequest = requests.findLast(r => r.url.endsWith('/logout'));
  assert.equal(logoutRequest.withCredentials, true);
  assert.equal(logoutRequest.headers['X-ProfilePays-Request'], '1');
  await client.apiClient.get('/users/me');
  assert.equal(requests.at(-1).headers.Authorization, undefined);
  assert.equal(saved.size, 0);
  console.log('Worked: confirmed logout clears memory only after server acknowledgment');
  const pending = client.refreshSession();
  const outcome = pending.then(
    () => false,
    () => true
  );
  await client.endSession();
  assert.equal(await outcome, true);
  await client.apiClient.get('/users/me');
  assert.equal(requests.at(-1).headers.Authorization, undefined);
  console.log('Worked: refresh completing during logout cannot resurrect the session');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});

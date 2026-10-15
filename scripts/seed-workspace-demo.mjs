// Populate only the isolated localhost test-credit runtime with labeled demo offers.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const { PNG } = createRequire(import.meta.url)('pngjs');
const base = 'http://127.0.0.1:8931/api',
  accounts = JSON.parse(readFileSync('.local/static-pilot/accounts.json'));
const sponsor = accounts.sponsor;
async function request(path, method = 'GET', body) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(sponsor.token ? { Authorization: 'Bearer ' + sponsor.token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  if (!r.ok) throw Error(path + ' ' + r.status);
  return d;
}
sponsor.token = (
  await request('/auth/login', 'POST', { email: sponsor.email, password: sponsor.password })
).accessToken;
const dashboard = await request('/placements');
for (const c of dashboard.campaigns.filter(
  c =>
    c.sponsor_id === sponsor.id &&
    /^(Browser static pilot|Creative browser pilot|Custom creative lifecycle)/.test(c.terms.title)
)) {
  await request(`/placements/campaigns/${c.id}/status`, 'POST', { status: 'paused' });
}
const demos = [
  {
    title: 'Make space for a new idea',
    brand: 'Launch Studio · demo',
    category: 'Launches',
    description:
      'A fictional creator launch. Try a temporary profile image and follow every step through restoration.',
    reward: 250,
    durationSeconds: 3600,
    colors: [
      [37, 73, 65],
      [215, 229, 143],
    ],
  },
  {
    title: 'A weekend worth sharing',
    brand: 'Gather Together · demo',
    category: 'Events',
    description:
      'A fictional community event. A two-minute placement makes the full process easy to try.',
    reward: 100,
    durationSeconds: 120,
    colors: [
      [176, 78, 53],
      [255, 216, 175],
    ],
  },
  {
    title: 'Learn something new',
    brand: 'Open Notebook · demo',
    category: 'Courses',
    description:
      'A fictional course campaign. Preview the image, approve the terms, and keep control of your profile.',
    reward: 180,
    durationSeconds: 1800,
    colors: [
      [52, 71, 110],
      [184, 205, 232],
    ],
  },
];
for (let k = 0; k < demos.length; k++) {
  const d = demos[k];
  if (dashboard.campaigns.some(c => c.sponsor_id === sponsor.id && c.terms.title === d.title))
    continue;
  const image = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const radius = Math.hypot(x - 64, y - 64);
      const on =
        k === 0
          ? Math.abs(x - 64) < 9 || Math.abs(y - 64) < 9
          : k === 1
            ? radius > 25 && radius < 43
            : (x > 30 && x < 51 && y > 29 && y < 99) || (x > 61 && x < 99 && y > 29 && y < 99);
      image.data.set([...(on ? d.colors[1] : d.colors[0]), 255], (y * 128 + x) * 4);
    }
  const png = PNG.sync.write(image),
    creative = await request('/placements/creatives', 'POST', {
      name: d.brand,
      png: png.toString('base64'),
    });
  const { colors, ...terms } = d;
  await request('/placements/campaigns', 'POST', {
    ...terms,
    commandKey: randomUUID(),
    assetKey: creative.asset_key,
    budget: d.reward * 10,
    capacity: 10,
  });
}
writeFileSync('.local/static-pilot/accounts.json', JSON.stringify(accounts));
console.log('Three labeled demo offers ready.');

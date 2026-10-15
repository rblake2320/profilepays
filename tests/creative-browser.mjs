import { chromium, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const dir = '.local/static-pilot',
  out = dir + '/creative-browser';
mkdirSync(out, { recursive: true });
const accounts = JSON.parse(readFileSync(dir + '/accounts.json')),
  { member, sponsor } = accounts;
const pp = 'http://127.0.0.1:8930',
  ai = 'http://127.0.0.1:8932';
const results = [],
  errors = [];
let browser, phoneBrowser;
async function api(origin, path, token, method = 'GET', body) {
  const r = await fetch(origin + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  if (path === '/problems' && r.status === 409 && d.problemId) return d;
  assert.ok(r.ok, `${path}: ${r.status} ${JSON.stringify(d)}`);
  return d;
}
async function login(page, who) {
  await page.goto(pp + '/login');
  await page.getByLabel('Email address').fill(who.email);
  await page.getByLabel('Password', { exact: true }).fill(who.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('nav').getByRole('link', { name: 'Connections', exact: true }).waitFor();
  await page.goto(pp + (who === sponsor ? '/advertisers' : '/marketplace'));
  await page.waitForFunction(() => !!localStorage.getItem('accessToken'));
  who.token = await page.evaluate(() => localStorage.getItem('accessToken'));
}
async function waitFor(fn, pred, timeout = 65000) {
  const deadline = Date.now() + timeout;
  let d;
  do {
    d = await fn();
    if (pred(d)) return d;
    await new Promise(r => setTimeout(r, 400));
  } while (Date.now() < deadline);
  throw Error('Timed out: ' + JSON.stringify(d));
}
function worked(scenario, measurement) {
  results.push({ outcome: 'Worked', scenario, measurement });
  console.log('Worked:', scenario);
}
try {
  browser = await chromium.launch({ headless: true });
  const sponsorPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  sponsorPage.on('pageerror', e => errors.push(e.message));
  await login(sponsorPage, sponsor);
  const title = 'Creative browser pilot ' + Date.now();
  await sponsorPage.getByLabel('Upload creative').setInputFiles(dir + '/custom-creative.png');
  await sponsorPage.getByText('Creative saved. Check the square crop before publishing.').waitFor();
  await sponsorPage.getByLabel('Campaign title').fill(title);
  await sponsorPage.getByLabel('Brand name').fill('Browser test sponsor');
  await sponsorPage
    .getByLabel('Offer description')
    .fill('Local acceptance fixture for the updated workspace.');
  await sponsorPage.getByLabel('Duration in seconds').fill('35');
  await sponsorPage.getByLabel('Test budget', { exact: true }).fill('100');
  await sponsorPage.getByLabel('Participant limit').fill('1');
  await sponsorPage.getByRole('button', { name: 'Review campaign' }).click();
  await sponsorPage.getByRole('button', { name: 'Publish test campaign' }).click();
  const c = await waitFor(
    () => api(pp, '/placements', sponsor.token),
    d => d.campaigns.some(c => c.terms.title === title)
  );
  const campaign = c.campaigns.find(c => c.terms.title === title);
  const aiOwner = await browser.newPage();
  await aiOwner.goto(ai + '/login');
  await aiOwner.getByLabel('Email address').fill(member.email.replace(/^member\./, 'ai.member.'));
  await aiOwner.getByLabel('Password', { exact: true }).fill(member.password);
  await aiOwner.getByRole('button', { name: 'Sign in', exact: true }).click();
  await aiOwner.waitForURL(ai + '/');
  await aiOwner.goto(ai + '/settings');
  await aiOwner.getByRole('button', { name: 'Create connection code' }).click();
  const field = aiOwner.getByLabel('Private connection code');
  await field.waitFor();
  const grant = await field.inputValue();
  assert.match(grant, /^[a-f0-9]{64}$/);
  const participant = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  participant.on('pageerror', e => errors.push(e.message));
  await login(participant, member);
  for (let round = 0; round < 2; round++) {
    const previousRefresh = await participant.evaluate(() => localStorage.getItem('refreshToken'));
    await participant.evaluate(() =>
      localStorage.setItem('accessToken', 'expired-local-test-token')
    );
    await participant.waitForFunction(
      previous =>
        !!localStorage.getItem('refreshToken') && localStorage.getItem('refreshToken') !== previous,
      previousRefresh
    );
    assert.ok(
      await participant
        .getByRole('heading', { name: 'Make room for something you like.' })
        .isVisible()
    );
  }
  member.token = await participant.evaluate(() => localStorage.getItem('accessToken'));
  worked('Repeated session refresh preserves access through token rotation', { rotations: 2 });
  await participant.getByLabel('Search offers').fill(title);
  await participant.getByRole('button', { name: 'Save ' + title, exact: true }).click();
  await participant.reload();
  await participant.getByRole('button', { name: /Saved offers/ }).click();
  await participant.getByRole('heading', { name: title, exact: true }).waitFor();
  await participant.screenshot({ path: out + '/saved-marketplace.png', fullPage: true });
  worked('Creative upload, campaign review and persistent saved marketplace offer', {
    campaignId: campaign.id,
  });
  await participant.goto(pp + '/connections');
  await participant.getByLabel('AIHangout connection code').fill(grant);
  await participant.getByRole('button', { name: 'Connect profile', exact: true }).click();
  await participant.getByText('@' + member.ai.username, { exact: true }).waitFor();
  // Synthetic fixtures in the isolated local D1 database, created BEFORE enrollment.
  if (!accounts.fixturePostId) {
    const post = await api(ai, '/problems', member.ai.token, 'POST', {
      title: 'Local static placement acceptance fixture',
      description:
        'Synthetic local test post used to verify profile restoration. This is not a production post.',
      category: 'Technology',
      difficulty: 'medium',
    });
    accounts.fixturePostId = post.problemId;
    await api(ai, `/problems/${post.problemId}/solutions`, member.ai.token, 'POST', {
      solutionText:
        'Synthetic local response: keep the original profile visible after the timed placement ends.',
    });
  }
  const postId = accounts.fixturePostId;
  const fixture = await api(ai, `/problems/${postId}`);
  assert.equal(fixture.problem.username, member.ai.username);
  assert.ok(fixture.solutions.some(s => s.username === member.ai.username));
  const viewer = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    older = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await viewer.goto(ai + '/profile/' + member.ai.username);
  await viewer.locator(`[data-normal-profile="${member.ai.username}"]`).first().waitFor();
  await viewer.screenshot({ path: out + '/profile-before.png' });
  await older.goto(ai + '/problem/' + postId);
  await older.locator(`[data-normal-profile="${member.ai.username}"]`).first().waitFor();
  await older.screenshot({ path: out + '/old-post-before.png' });
  phoneBrowser = await webkit.launch({ headless: true });
  const phoneContext = await phoneBrowser.newContext({
    ...devices['iPhone 13'],
    timezoneId: 'America/Chicago',
  });
  const phone = await phoneContext.newPage();
  await login(phone, member);
  await phone.getByLabel('Search offers').fill(title);
  await phone.screenshot({ path: out + '/iphone-marketplace.png', fullPage: true });
  assert.ok(
    await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Phone marketplace does not overflow'
  );
  await phone.goto(ai + '/profile/' + member.ai.username);
  await participant.goto(pp + '/confirmation?campaign=' + campaign.id);
  await participant.getByLabel('Destination profile').selectOption({ label: member.ai.username });
  assert.equal(
    await participant.getByRole('button', { name: 'Reserve placement' }).isDisabled(),
    true
  );
  await participant
    .getByLabel('I approve this temporary image and accept the test-credit terms.')
    .check();
  await participant.getByRole('button', { name: 'Reserve placement' }).click();
  const d = await waitFor(
    () => api(pp, '/placements', member.token),
    d => d.placements.some(p => p.campaign_id === campaign.id && p.state === 'active')
  );
  const placement = d.placements.find(p => p.campaign_id === campaign.id),
    selector = `[data-static-placement="${placement.id}"]`;
  for (const page of [viewer, older, phone]) {
    await page.locator(selector).first().waitFor();
    assert.ok(
      await page
        .locator(selector)
        .first()
        .evaluate(img => img.complete && img.naturalWidth === 128)
    );
  }
  const rects = await older.locator(selector).evaluateAll(images =>
    images.map(img => {
      const r = img.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { width: r.width, height: r.height, uncovered: top === img };
    })
  );
  assert.ok(
    rects.every(r => r.width >= 24 && r.height >= 24 && r.uncovered),
    'Old post avatars must occupy visible uncovered space: ' + JSON.stringify(rects)
  );
  const oldCount = await older.locator(selector).count();
  assert.ok(oldCount >= 2, 'Both preexisting post and response avatars changed');
  await viewer.screenshot({ path: out + '/profile-active.png' });
  await older.screenshot({ path: out + '/old-post-active.png' });
  await phone.screenshot({ path: out + '/iphone-active.png' });
  assert.ok(
    await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Phone profile has no horizontal overflow'
  );
  const brokenImage = await browser.newPage();
  await brokenImage.route('**/api/profilepays/assets/*', route => route.abort());
  await brokenImage.goto(ai + '/profile/' + member.ai.username);
  await brokenImage.locator(`[data-normal-profile="${member.ai.username}"]`).first().waitFor();
  await brokenImage.waitForTimeout(1000);
  assert.equal(await brokenImage.locator(selector).count(), 0);
  worked('A failed image request falls back to the normal profile', { placementId: placement.id });
  await participant.screenshot({ path: out + '/participant-active.png', fullPage: true });
  const desktopSession = await viewer.context().newCDPSession(viewer);
  await desktopSession.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Tokyo' });
  await viewer.clock.setSystemTime(new Date(Date.now() + 24 * 3600000));
  assert.equal(await viewer.locator(selector).count(), 1);
  await viewer.waitForTimeout(3500);
  assert.equal(await viewer.locator(selector).count(), 1);
  const tokyo = await phoneBrowser.newContext({
    ...devices['iPhone 13'],
    timezoneId: 'Asia/Tokyo',
  });
  const phoneTokyo = await tokyo.newPage();
  await phoneTokyo.goto(ai + '/profile/' + member.ai.username);
  await phoneTokyo.locator(selector).first().waitFor();
  worked('Browser signup prerequisites, sponsor creation, private connection, explicit opt-in', {
    campaignId: campaign.id,
    placementId: placement.id,
  });
  worked('Static PNG renders on profile plus older post and response', {
    oldAvatars: oldCount,
    assetPixels: 128,
    publicViewer: true,
  });
  worked('Mobile WebKit in Chicago and Tokyo plus desktop time-zone and +24h clock changes', {
    iphoneEmulation: true,
    physicalPhone: false,
    placementId: placement.id,
  });
  const final = await waitFor(
    () => api(pp, `/placements/${placement.id}/receipt`, member.token),
    r => r.placement.state === 'ended'
  );
  assert.equal(final.placement.record.award, 100);
  assert.equal(final.placement.record.restoration, 'restored');
  for (const page of [viewer, older, phone, phoneTokyo]) {
    await page.waitForFunction(s => document.querySelectorAll(s).length === 0, selector);
    await page.locator(`[data-normal-profile="${member.ai.username}"]`).first().waitFor();
  }
  await viewer.screenshot({ path: out + '/profile-restored.png' });
  await older.screenshot({ path: out + '/old-post-restored.png' });
  await phone.screenshot({ path: out + '/iphone-restored.png' });
  await participant
    .getByTestId('placement-' + placement.id)
    .getByText('ended', { exact: true })
    .waitFor();
  await participant
    .getByTestId('placement-' + placement.id)
    .getByRole('button', { name: 'View receipt' })
    .click();
  await participant.getByText('Placement receipt', { exact: true }).waitFor();
  await participant.screenshot({ path: out + '/receipt.png', fullPage: true });
  writeFileSync(out + '/receipt.json', JSON.stringify(final, null, 2));
  writeFileSync(
    out + '/fixture.json',
    JSON.stringify({
      profileUrl: ai + '/profile/' + member.ai.username,
      postUrl: ai + '/problem/' + postId,
      placementId: placement.id,
    })
  );
  worked('Automatic visible restoration and test settlement after actual 35-second interval', {
    coveredMs: final.placement.record.coveredMs,
    award: 100,
    ledger: final.ledger.length,
  });
  assert.deepEqual(errors, []);
} catch (e) {
  results.push({ outcome: 'Failed', error: e.message });
  console.error(e.message);
  process.exitCode = 1;
} finally {
  writeFileSync(dir + '/accounts.json', JSON.stringify(accounts), { mode: 0o600 });
  writeFileSync(
    out + '/results.json',
    JSON.stringify({ at: new Date().toISOString(), results, errors }, null, 2)
  );
  await browser?.close();
  await phoneBrowser?.close();
}

import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import api from '../api/client';
import bluePreview from '../assets/blue.png';
import greenPreview from '../assets/green.png';
import AgreementReport from '../components/AgreementReport';
import { useAppSelector } from '../hooks/redux';
const ended = (p: any) => ['ended', 'failed', 'cancelled'].includes(p.state);
const duration = (n: number) =>
  n < 60 ? `${n}s` : n < 3600 ? `${Math.round(n / 60)} min` : `${+(n / 3600).toFixed(1)} hr`;
const date = (n: any) => (n ? new Date(n).toLocaleString() : 'Awaiting confirmation');
const stampedDate = (n: number) => new Date(n).toLocaleString(undefined, { timeZoneName: 'short' });
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="pp-field">
    <span>{label}</span>
    {children}
  </label>
);
const Metric = ({ label, value }: { label: string; value: any }) => (
  <div className="pp-metric">
    <small>{label}</small>
    <strong>{value}</strong>
  </div>
);
function download(name: string, content: string) {
  const u = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export default function PlacementsPage() {
  const { user } = useAppSelector(s => s.auth);
  const location = useLocation(),
    navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState<any>(),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('All'),
    [sort, setSort] = useState('new'),
    [saved, setSaved] = useState(false),
    [filter, setFilter] = useState('all');
  const [destination, setDestination] = useState(''),
    [consent, setConsent] = useState(false),
    [code, setCode] = useState(''),
    [receipt, setReceipt] = useState<any>(),
    [stop, setStop] = useState<any>();
  const [review, setReview] = useState(false),
    [form, setForm] = useState({
      title: '',
      brand: '',
      description: '',
      category: 'Community',
      assetKey: 'green',
      durationSeconds: 3600,
      reward: 100,
      budget: 1000,
      capacity: 10,
      notifications: { broken: true, completed: true },
    });
  const [showReport, setShowReport] = useState(false);
  const clock = useRef({ server: Date.now(), mono: performance.now() });
  const [now, setNow] = useState(Date.now());
  const selected = params.get('campaign') || '';
  const campaignKey = useMemo(() => crypto.randomUUID(), [form]);
  const joinKey = useMemo(() => crypto.randomUUID(), [selected, destination]);
  async function load() {
    try {
      const r = await api.get('/placements');
      setData(r.data);
      clock.current = { server: r.data.serverNow || Date.now(), mono: performance.now() };
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not load your workspace.');
    }
  }
  useEffect(() => {
    if (!user) return;
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [user?.id]);
  useEffect(() => {
    const t = setInterval(
      () => setNow(clock.current.server + performance.now() - clock.current.mono),
      500
    );
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setConsent(false);
    setNotice('');
    setError('');
  }, [location.pathname, selected]);
  async function action(fn: () => Promise<any>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  const source = (c: any) =>
    c?.png_base64
      ? `data:image/png;base64,${c.png_base64}`
      : (c?.terms?.assetKey || c?.asset_key) === 'blue'
        ? bluePreview
        : greenPreview;
  const change = (key: string, value: any) => {
    setReview(false);
    setForm(f => ({ ...f, [key]: value }));
  };
  async function upload(file?: File) {
    if (!file) return;
    await action(async () => {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5000000)
        throw Error('Choose a PNG, JPEG or WebP smaller than 5 MB.');
      const image = await createImageBitmap(file);
      try {
        if (image.width > 12000 || image.height > 12000)
          throw Error('Image dimensions are too large.');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        const size = Math.min(image.width, image.height);
        ctx.drawImage(
          image,
          (image.width - size) / 2,
          (image.height - size) / 2,
          size,
          size,
          0,
          0,
          128,
          128
        );
        const r = await api.post('/placements/creatives', {
          name: file.name.slice(0, 80),
          png: canvas.toDataURL('image/png').split(',')[1],
        });
        change('assetKey', r.data.asset_key);
        setNotice('Creative saved. Check the square crop before publishing.');
      } finally {
        image.close();
      }
    });
  }
  const campaigns = data?.campaigns || [],
    placements = data?.placements || [];
  const active = placements.filter((p: any) => !ended(p));
  const chosen = campaigns.find((c: any) => c.id === selected);
  const available = (c: any) =>
    c.status === 'active' &&
    c.participants < c.terms.capacity &&
    c.budget - c.reserved - c.spent >= c.terms.reward &&
    (!c.terms.windowEnd || c.terms.windowEnd > now + c.terms.durationSeconds * 1000);
  const offers = campaigns.filter(
    (c: any) =>
      c.sponsor_id !== user?.id &&
      available(c) &&
      !placements.some((p: any) => p.campaign_id === c.id && p.user_id === user?.id)
  );
  const filtered = offers
    .filter(
      (c: any) =>
        (category === 'All' || c.terms.category === category) &&
        (!saved || data.favorites.includes(c.id)) &&
        `${c.terms.title} ${c.terms.brand || ''} ${c.terms.description || ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
    )
    .sort((a: any, b: any) =>
      sort === 'reward'
        ? b.terms.reward - a.terms.reward
        : sort === 'duration'
          ? a.terms.durationSeconds - b.terms.durationSeconds
          : 0
    );
  const own = campaigns.filter((c: any) => c.sponsor_id === user?.id);
  const preview =
    form.assetKey === 'blue' || form.assetKey === 'green'
      ? { terms: form }
      : data?.creatives.find((c: any) => c.asset_key === form.assetKey);
  const balance = <span data-testid="test-balance">{data?.balance}</span>;
  if (!user)
    return (
      <>
        <section className="pp-hero">
          <div>
            <p className="pp-eyebrow">A LITTLE SPACE. A CLEAR AGREEMENT.</p>
            <h1>
              Your profile.
              <br />
              On your terms.
            </h1>
            <p>
              Choose a brand image, give it a little time, and earn test credits when your placement
              is verified. Your normal profile returns at the end.
            </p>
            <div className="pp-actions">
              <Link className="pp-button" to="/register">
                Find your first offer ↗
              </Link>
              <Link to="/register?type=advertiser">I'm an advertiser →</Link>
            </div>
            <small>Starting with static images on AIHangout.</small>
          </div>
          <div className="pp-poster">
            <span>PROFILEPAYS / THE ORIGINAL IDEA, REBUILT</span>
            <strong>
              YOUR
              <br />
              TIME HAS
              <br />
              <em>VALUE.</em>
            </strong>
            <span>OPT IN. HOST. RESTORE.</span>
          </div>
        </section>
        <div className="pp-steps">
          {[
            [
              '01 / Choose an offer',
              'Compare campaigns, placement durations and test-credit rewards. Choose the terms that suit you.',
            ],
            [
              '02 / Preview and approve',
              'Preview the image on your connected profile, then approve the temporary placement and its terms.',
            ],
            [
              '03 / Verify, restore, earn',
              'We check the placement, restore your original profile and record eligible test credits in your receipt.',
            ],
          ].map(([s, description]) => (
            <article key={s}>
              <h3>{s}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </>
    );
  if (!data)
    return (
      <section className="pp-panel">
        <h1>Your workspace</h1>
        <p>{error || 'Loading your campaigns and placements…'}</p>
        {error && <button onClick={load}>Try again</button>}
      </section>
    );
  const path =
    location.pathname === '/'
      ? user.userType === 'advertiser'
        ? '/advertisers'
        : '/marketplace'
      : location.pathname;
  return (
    <>
      {error && (
        <div role="alert" className="pp-alert">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="pp-notice">
          {notice}
        </div>
      )}
      {data.placements
        .filter((p: any) => {
          const n = p.record.notification;
          if (!n) return false;
          if (user.userType !== 'advertiser') return true;
          const c = data.campaigns.find((c: any) => c.id === p.campaign_id);
          return (
            c?.notification_preferences?.[
              n.type === 'agreement_broken' ? 'broken' : 'completed'
            ] !== false
          );
        })
        .map((p: any) => (
          <section role="alert" className="pp-alert" key={p.id} data-testid={`breach-${p.id}`}>
            <strong>
              {p.record.notification.title} — {p.record.notification.campaign}
            </strong>
            <p>{p.record.notification.message}</p>
            <p>
              {p.record.notification.type === 'agreement_broken' ? 'Removed' : 'Completed'}:{' '}
              <time dateTime={new Date(p.record.notification.occurredAt).toISOString()}>
                {stampedDate(p.record.notification.occurredAt)}
              </time>{' '}
              · {new Date(p.record.notification.occurredAt).toISOString()} (UTC)
            </p>
            <p>
              {p.record.notification.type === 'agreement_broken'
                ? `${p.record.notification.withheld} test credits withheld`
                : `${p.record.notification.award} test credits awarded`}{' '}
              · Placement {p.id}
            </p>
          </section>
        ))}
      {user.userType === 'advertiser' && (
        <section className="pp-panel">
          <h2>Agreement reports and notifications</h2>
          <p>
            Choose alerts per campaign below. Turn both off for report only. Every outcome remains
            in your report.
          </p>
          <button onClick={() => setShowReport(true)}>Preview and print all agreements</button>
        </section>
      )}
      {path === '/marketplace' && (
        <>
          <section className="pp-discover">
            <div>
              <p className="pp-eyebrow">THE MARKETPLACE</p>
              <h1>
                Make room for
                <br />
                something you like.
              </h1>
              <p>
                A small change to your profile. A clear beginning and end.
                <br />
                Choose an offer that feels right for you.
              </p>
              <span className="pp-tag">AIHANGOUT · STATIC PLACEMENTS</span>
            </div>
            <div className="pp-mini-poster">
              <span>
                YOUR PROFILE IS
                <br />
                YOURS TO CHOOSE.
              </span>
              <strong>
                pp<span>↗</span>
              </strong>
              <small>Always opt-in. Always temporary.</small>
            </div>
          </section>
          {active.length > 0 && (
            <Link className="pp-active-banner" to="/placements">
              {active.length} placement{active.length === 1 ? '' : 's'} in progress — see
              verification & remaining time →
            </Link>
          )}
          <div className="pp-section-heading">
            <div>
              <p className="pp-eyebrow">FIND YOUR FIT</p>
              <h2>
                Available offers <small>({filtered.length})</small>
              </h2>
            </div>
            <span>{balance} test credits earned</span>
          </div>
          <div className="pp-filters">
            <input
              aria-label="Search offers"
              placeholder="Search brands or offers…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <select
              aria-label="Category"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {['All', 'Community', 'Courses', 'Events', 'Launches'].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select aria-label="Sort offers" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="new">Newest first</option>
              <option value="reward">Highest reward</option>
              <option value="duration">Shortest duration</option>
            </select>
            <button aria-pressed={saved} onClick={() => setSaved(!saved)}>
              {saved ? '★ Saved offers' : '☆ Saved offers'}
            </button>
          </div>
          <div className="pp-grid">
            {filtered.map((c: any) => (
              <article className="pp-offer" key={c.id}>
                <div className="pp-offer-art">
                  <img src={source(c)} alt={c.terms.title} />
                  <span className="pp-tag">{c.terms.category || 'Community'}</span>
                  <button
                    className="pp-save"
                    aria-label={`Save ${c.terms.title}`}
                    aria-pressed={data.favorites.includes(c.id)}
                    disabled={busy}
                    onClick={() =>
                      action(() =>
                        api.post(`/placements/campaigns/${c.id}/favorite`, {
                          saved: !data.favorites.includes(c.id),
                        })
                      )
                    }
                  >
                    {data.favorites.includes(c.id) ? '★' : '☆'}
                  </button>
                </div>
                <div className="pp-offer-body">
                  <p className="pp-eyebrow">{c.terms.brand || 'TEST SPONSOR'}</p>
                  <h3>{c.terms.title}</h3>
                  <p>{c.terms.description || 'A temporary profile placement on AIHangout.'}</p>
                  <div className="pp-offer-terms">
                    <strong>
                      {c.terms.reward}
                      <small>test credits</small>
                    </strong>
                    <strong>
                      {duration(c.terms.durationSeconds)}
                      <small>on your profile</small>
                    </strong>
                  </div>
                  <Link className="pp-button pp-outline" to={`/confirmation?campaign=${c.id}`}>
                    Preview offer <span>↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="pp-empty">
              <h3>No matching offers right now.</h3>
              <p>Try another filter, or return when an advertiser publishes a new campaign.</p>
            </div>
          )}
        </>
      )}
      {path === '/connections' && (
        <>
          <p className="pp-eyebrow">YOUR DESTINATIONS</p>
          <h1>Connect with control.</h1>
          <div className="pp-columns">
            <section className="pp-panel">
              <h2>AIHangout</h2>
              <p>
                In{' '}
                <a href={`${data.origin}/settings`} target="_blank" rel="noreferrer">
                  AIHangout settings ↗
                </a>
                , create a private connection code and paste it here. You can revoke the connection
                there at any time.
              </p>
              <Field label="AIHangout connection code">
                <input
                  type="password"
                  autoComplete="off"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
              </Field>
              <button
                className="pp-button"
                disabled={busy || !code}
                onClick={() =>
                  action(async () => {
                    await api.post('/placements/destinations', { code });
                    setCode('');
                    setNotice('Your profile is connected.');
                  })
                }
              >
                Connect profile
              </button>
            </section>
            <section className="pp-panel">
              <h2>Connected profiles</h2>
              {data.destinations.length ? (
                data.destinations.map((d: any) => (
                  <div className="pp-row" key={d.id}>
                    <strong>@{d.username}</strong>
                    <a
                      href={`${data.origin}/profile/${encodeURIComponent(d.username)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View profile ↗
                    </a>
                  </div>
                ))
              ) : (
                <p>No profiles connected yet.</p>
              )}
              <p className="pp-muted">
                Linking a profile does not start an advertisement. You approve each placement
                separately.
              </p>
            </section>
          </div>
        </>
      )}
      {path === '/confirmation' &&
        (!chosen ? (
          <div className="pp-empty">
            <h1>Offer not found</h1>
            <Link to="/marketplace">Return to marketplace</Link>
          </div>
        ) : (
          <>
            <Link to="/marketplace">← Back to offers</Link>
            <p className="pp-eyebrow">PREVIEW BEFORE YOU COMMIT</p>
            <h1>A little time. Your choice.</h1>
            <div className="pp-columns">
              <section className="pp-profile-preview">
                <span className="pp-tag">PROFILE PREVIEW</span>
                <img src={source(chosen)} alt="Approved sponsored test image" />
                <span className="pp-tag">Ad · test</span>
                <h2>
                  {data.destinations.find((d: any) => d.id === destination)?.username ||
                    'Your AIHangout profile'}
                </h2>
                <p>
                  Your name stays yours. This image appears on your profile and earlier posts for
                  the agreed time.
                </p>
                <div className="pp-row">
                  <img
                    className="pp-small-avatar"
                    src={source(chosen)}
                    alt="Earlier post preview"
                  />
                  <div>
                    <strong>Your earlier post</strong>
                    <p>Same post. Temporary sponsored image.</p>
                  </div>
                </div>
              </section>
              <section className="pp-panel">
                <p className="pp-eyebrow">{chosen.terms.brand || 'TEST SPONSOR'}</p>
                <h2>{chosen.terms.title}</h2>
                <p>{chosen.terms.description}</p>
                <div className="pp-metrics">
                  <Metric label="Test credits" value={chosen.terms.reward} />
                  <Metric label="Duration" value={duration(chosen.terms.durationSeconds)} />
                </div>
                <Field label="Destination profile">
                  <select
                    value={destination}
                    onChange={e => {
                      setDestination(e.target.value);
                      setConsent(false);
                    }}
                  >
                    <option value="">Choose your profile</option>
                    {data.destinations.map((d: any) => (
                      <option value={d.id} key={d.id}>
                        {d.username}
                      </option>
                    ))}
                  </select>
                </Field>
                {!data.destinations.length && (
                  <Link to="/connections">Connect an AIHangout profile first →</Link>
                )}
                <div className="pp-terms">
                  <p>
                    Keep the image in place for the entire agreed duration. Removing it even briefly
                    breaks this agreement permanently; putting it back does not restore eligibility.
                    The clock starts after placement is confirmed. Checks measure placement
                    availability, not audience views.
                  </p>
                  <p>
                    Stopping early earns zero. Sponsor cancellation is prorated. Evidence gaps go to
                    review. Your normal profile setting is preserved and restored at the end.
                  </p>
                </div>
                <label className="pp-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                  />
                  <span>I approve this temporary image and accept the test-credit terms.</span>
                </label>
                <button
                  className="pp-button"
                  disabled={busy || !consent || !destination || !available(chosen)}
                  onClick={() =>
                    action(async () => {
                      await api.post(`/placements/campaigns/${selected}/join`, {
                        commandKey: joinKey,
                        destinationId: destination,
                        termsVersion: 1,
                        consent: 'static-test-v1',
                      });
                      navigate('/placements');
                    })
                  }
                >
                  Reserve placement ↗
                </button>
                {!available(chosen) && <p role="status">This offer is no longer available.</p>}
              </section>
            </div>
          </>
        ))}
      {path === '/advertisers' && (
        <>
          <p className="pp-eyebrow">ADVERTISER WORKSPACE</p>
          {user.companyName && (
            <p>
              Campaigns for <strong>{user.companyName}</strong>
            </p>
          )}
          <h1>
            Your next campaign
            <br />
            starts with a picture.
          </h1>
          <div className="pp-metrics">
            <Metric label="Campaigns" value={own.length} />
            <Metric
              label="Credits reserved"
              value={own.reduce((n: number, c: any) => n + Number(c.reserved), 0)}
            />
            <Metric
              label="Credits settled"
              value={own.reduce((n: number, c: any) => n + Number(c.spent), 0)}
            />
          </div>
          <div className="pp-columns">
            <section className="pp-panel">
              <h2>01 / Creative library</h2>
              <p>
                Upload an image to make it yours. We create a square 128 × 128 crop; check how it
                looks before publishing.
              </p>
              <Field label="Upload creative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={e => void upload(e.target.files?.[0])}
                />
              </Field>
              <div className="pp-library">
                {[
                  { asset_key: 'blue', name: 'Blue test image' },
                  { asset_key: 'green', name: 'Green test image' },
                  ...data.creatives,
                ].map((c: any) => (
                  <button
                    key={c.asset_key}
                    aria-label={`Use ${c.name}`}
                    aria-pressed={form.assetKey === c.asset_key}
                    onClick={() => change('assetKey', c.asset_key)}
                  >
                    <img src={source(c)} alt={c.name} />
                    <small>{c.name}</small>
                  </button>
                ))}
              </div>
            </section>
            <section className="pp-panel">
              <h2>{review ? '03 / Review your offer' : '02 / Build your offer'}</h2>
              {review ? (
                <>
                  <img
                    className="pp-review-image"
                    src={source(preview)}
                    alt="Campaign image preview"
                  />
                  <h3>{form.title}</h3>
                  <p>
                    {form.brand} · {form.category}
                  </p>
                  <p>{form.description}</p>
                  <div className="pp-metrics">
                    <Metric label="Per participant" value={`${form.reward} credits`} />
                    <Metric label="Duration" value={duration(form.durationSeconds)} />
                    <Metric label="Maximum participants" value={form.capacity} />
                  </div>
                  <p>
                    Total test budget: {form.budget}. Participants must explicitly approve the
                    image. Published terms cannot be edited.
                  </p>
                  <p>
                    Notify me: {form.notifications.broken ? 'broken agreements ' : ''}
                    {form.notifications.completed ? 'completed agreements' : ''}
                    {!form.notifications.broken && !form.notifications.completed
                      ? 'report only'
                      : ''}
                    .
                  </p>
                  <div className="pp-actions">
                    <button onClick={() => setReview(false)}>Back to edit</button>
                    <button
                      className="pp-button"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          await api.post('/placements/campaigns', {
                            ...form,
                            commandKey: campaignKey,
                          });
                          setReview(false);
                          change('title', '');
                          setNotice('Your campaign is published in the marketplace.');
                        })
                      }
                    >
                      Publish test campaign
                    </button>
                  </div>
                </>
              ) : (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    setReview(true);
                  }}
                >
                  <fieldset>
                    <legend>In-app notifications</legend>
                    {(['broken', 'completed'] as const).map(k => (
                      <label className="pp-consent" key={k}>
                        <input
                          type="checkbox"
                          checked={form.notifications[k]}
                          onChange={e =>
                            change('notifications', {
                              ...form.notifications,
                              [k]: e.target.checked,
                            })
                          }
                        />
                        Notify me when an agreement is {k}
                      </label>
                    ))}
                    <p>Turn both off for report only. Printable reports are always available.</p>
                  </fieldset>
                  {(['title', 'brand', 'description'] as const).map(k => (
                    <Field
                      label={
                        k === 'title'
                          ? 'Campaign title'
                          : k === 'brand'
                            ? 'Brand name'
                            : 'Offer description'
                      }
                      key={k}
                    >
                      <input
                        required
                        maxLength={k === 'description' ? 300 : k === 'brand' ? 60 : 80}
                        value={form[k]}
                        onChange={e => change(k, e.target.value)}
                      />
                    </Field>
                  ))}
                  <Field label="Campaign category">
                    <select
                      value={form.category}
                      onChange={e => change('category', e.target.value)}
                    >
                      {['Community', 'Courses', 'Events', 'Launches'].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="pp-form-grid">
                    {(
                      [
                        ['durationSeconds', 'Duration in seconds'],
                        ['reward', 'Reward in test credits'],
                        ['budget', 'Test budget'],
                        ['capacity', 'Participant limit'],
                      ] as const
                    ).map(([k, label]) => (
                      <Field label={label} key={k}>
                        <input
                          required
                          type="number"
                          min={k === 'durationSeconds' ? data.minDurationSeconds : 1}
                          max={k === 'durationSeconds' ? 86400 : undefined}
                          step="1"
                          value={form[k]}
                          onChange={e => change(k, Number(e.target.value))}
                        />
                      </Field>
                    ))}
                  </div>
                  <button className="pp-button" disabled={busy}>
                    Review campaign →
                  </button>
                </form>
              )}
            </section>
          </div>
          <h2>Your campaigns</h2>
          {own.map((c: any) => (
            <article className="pp-row pp-panel" key={c.id}>
              <div>
                <strong>{c.terms.title}</strong>
                <p>
                  {c.status} · {c.participants}/{c.terms.capacity} participants · {c.spent} test
                  credits settled
                </p>
                <fieldset>
                  <legend>Notify me for {c.terms.title}</legend>
                  {(['broken', 'completed'] as const).map(k => (
                    <label className="pp-consent" key={k}>
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={c.notification_preferences?.[k] !== false}
                        onChange={e =>
                          action(() =>
                            api.post(`/placements/campaigns/${c.id}/notifications`, {
                              ...c.notification_preferences,
                              [k]: e.target.checked,
                            })
                          )
                        }
                      />
                      {k === 'broken' ? 'Broken agreements' : 'Completed agreements'}
                    </label>
                  ))}
                  {c.notification_preferences?.broken === false &&
                    c.notification_preferences?.completed === false && (
                      <p>Report only — notifications off.</p>
                    )}
                </fieldset>
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  action(() =>
                    api.post(`/placements/campaigns/${c.id}/status`, {
                      status: c.status === 'active' ? 'paused' : 'active',
                    })
                  )
                }
              >
                {c.status === 'active' ? 'Pause enrollment' : 'Resume enrollment'}
              </button>
            </article>
          ))}
          <p className="pp-muted">
            Pausing enrollment leaves existing placements running under their approved terms.
          </p>
        </>
      )}
      {(path === '/placements' || path === '/earnings') && (
        <>
          <p className="pp-eyebrow">YOUR PLACEMENT RECORD</p>
          <h1>{path === '/earnings' ? 'Every credit has a story.' : 'Know where things stand.'}</h1>
          {path === '/earnings' && (
            <div className="pp-metrics">
              <Metric label="Test-credit balance" value={balance} />
              <Metric label="Placements in progress" value={active.length} />
              <Metric
                label="Completed placements"
                value={placements.filter((p: any) => p.state === 'ended').length}
              />
            </div>
          )}
          <div className="pp-section-heading">
            <p>Test credits have no cash value. Joining alone earns nothing.</p>
            <select
              aria-label="Filter placement history"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="all">All placements</option>
              <option value="active">In progress</option>
              <option value="ended">Finished</option>
              <option value="review">Needs review</option>
            </select>
          </div>
          {placements
            .filter(
              (p: any) =>
                filter === 'all' ||
                (filter === 'active'
                  ? !ended(p)
                  : filter === 'ended'
                    ? ended(p)
                    : p.record.assessment === 'needs_review')
            )
            .map((p: any) => (
              <article
                className="pp-panel pp-placement"
                key={p.id}
                data-testid={`placement-${p.id}`}
              >
                <div className="pp-section-heading">
                  <div>
                    <p className="pp-eyebrow">@{p.username}</p>
                    <h3>{p.record.terms.title}</h3>
                  </div>
                  <span className="pp-tag">{p.state}</span>
                </div>
                {!ended(p) && p.record.endsAt && (
                  <div className="pp-countdown">
                    <strong>
                      {duration(Math.max(0, Math.ceil((p.record.endsAt - now) / 1000)))}
                    </strong>
                    <span> remaining · time zone changes do not change the duration</span>
                    <progress
                      max={p.record.terms.durationSeconds * 1000}
                      value={Math.max(0, now - p.record.startsAt)}
                    />
                  </div>
                )}
                <p>
                  Start: {date(p.record.startsAt)} · End: {date(p.record.endsAt)}
                </p>
                <div className="pp-metrics">
                  <Metric label="Verification" value={p.record.assessment} />
                  <Metric
                    label="Verified time"
                    value={duration(Math.floor((p.record.coveredMs || 0) / 1000))}
                  />
                  <Metric label="Restoration" value={p.record.restoration} />
                  <Metric label="Test award" value={p.record.award} />
                </div>
                <p>{p.record.settlement || 'Reserved, not earned'}</p>
                {p.record.lastError && (
                  <p role="alert">{p.record.lastError}. Reconciliation will retry.</p>
                )}
                <div className="pp-actions">
                  <a
                    href={`${data.origin}/profile/${encodeURIComponent(p.username)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View profile ↗
                  </a>
                  <button
                    onClick={() =>
                      action(async () =>
                        setReceipt((await api.get(`/placements/${p.id}/receipt`)).data)
                      )
                    }
                  >
                    View receipt
                  </button>
                  {!ended(p) && (
                    <button disabled={busy} onClick={() => setStop(p)}>
                      Stop and restore
                    </button>
                  )}
                </div>
              </article>
            ))}
          {!placements.length && (
            <div className="pp-empty">
              <h2>Your first placement starts here.</h2>
              <Link className="pp-button" to="/marketplace">
                Explore offers ↗
              </Link>
            </div>
          )}
        </>
      )}
      <Dialog open={showReport} onClose={() => setShowReport(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Agreement report</DialogTitle>
        <DialogContent>
          <AgreementReport placements={data.placements} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReport(false)}>Close</Button>
          <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        </DialogActions>
        <style>{`@media print {body * {visibility:hidden} .pp-contract-report,.pp-contract-report * {visibility:visible} .MuiDialog-root {position:absolute!important;inset:0!important} .MuiDialog-container {display:block!important;height:auto!important} .MuiDialog-paper {max-width:none!important;max-height:none!important;margin:0!important;overflow:visible!important;box-shadow:none!important} .MuiDialogContent-root {overflow:visible!important} .pp-contract-report td {padding:8px;border-bottom:1px solid #ccc;overflow-wrap:anywhere} .pp-contract-report tr {break-inside:avoid}}`}</style>
      </Dialog>
      <Dialog open={!!stop} onClose={() => !busy && setStop(null)}>
        <DialogTitle>Stop this placement?</DialogTitle>
        <DialogContent>
          <p>
            Your normal profile will be restored.{' '}
            {stop?.user_id === user.id
              ? 'Stopping early earns zero test credits.'
              : 'Sponsor cancellation uses prorated test credits under the campaign terms.'}
          </p>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setStop(null)}>
            Keep running
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              action(async () => {
                await api.post(`/placements/${stop.id}/stop`);
                setStop(null);
              })
            }
          >
            Confirm stop and restore
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!receipt} onClose={() => setReceipt(null)} fullWidth maxWidth="sm">
        <DialogTitle>Placement receipt</DialogTitle>
        <DialogContent>
          {receipt && (
            <>
              <p>
                {receipt.observations.length} observations · {receipt.events.length} lifecycle
                events · {receipt.ledger.length} test ledger entries
              </p>
              <p>
                Observations check the assigned image and placement. They are not audience
                impressions.
              </p>
              <ol className="pp-timeline">
                {receipt.events.map((e: any, i: number) => (
                  <li key={i}>
                    <strong>
                      {String(e.kind || e.type || e.event_type || 'Recorded event').replace(
                        /_/g,
                        ' '
                      )}
                    </strong>
                    <small>{date(Number(e.at_ms) || e.at || e.created_at)}</small>
                  </li>
                ))}
              </ol>
              <details>
                <summary>Technical evidence</summary>
                <pre className="pp-json">{JSON.stringify(receipt, null, 2)}</pre>
              </details>
              <button
                onClick={() =>
                  download('profilepays-receipt.json', JSON.stringify(receipt, null, 2))
                }
              >
                Download receipt JSON
              </button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceipt(null)}>Close receipt</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

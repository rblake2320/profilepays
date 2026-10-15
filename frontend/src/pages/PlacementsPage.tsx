import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../api/client';
import { useAppSelector } from '../hooks/redux';

export default function PlacementsPage() {
  const { user } = useAppSelector(s => s.auth);
  const [data, setData] = useState<any>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState('');
  const [title, setTitle] = useState('Static placement test'),
    [asset, setAsset] = useState('blue'),
    [duration, setDuration] = useState(3600);
  const [reward, setReward] = useState(100),
    [budget, setBudget] = useState(200),
    [capacity, setCapacity] = useState(2);
  const [selected, setSelected] = useState(''),
    [destination, setDestination] = useState(''),
    [consent, setConsent] = useState(false),
    [receipt, setReceipt] = useState<any>();
  const campaignCommand = useMemo(
    () => crypto.randomUUID(),
    [title, asset, duration, reward, budget, capacity]
  );
  const joinCommand = useMemo(() => crypto.randomUUID(), [selected, destination]);
  async function load() {
    try {
      const r = await api.get('/placements');
      setData(r.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not load placements');
    }
  }
  useEffect(() => {
    if (!user) return;
    void load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [user?.id]);
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
  const campaign = data?.campaigns?.find((c: any) => c.id === selected);
  if (!user)
    return (
      <Stack spacing={3}>
        <Typography variant="h3" fontWeight={800}>
          Your profile. Your choice.
        </Typography>
        <Typography>
          Try a timed sponsored image on AIHangout, follow the placement checks, and see your normal
          profile return.
        </Typography>
        <Alert severity="info">
          ProfilePays pilot — test credits only. No deposits, withdrawals, or cash value.
        </Alert>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" component={RouterLink} to="/login">
            Sign in
          </Button>
          <Button component={RouterLink} to="/register">
            Create a test account
          </Button>
        </Stack>
      </Stack>
    );
  return (
    <Stack spacing={3} sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box>
        <Typography variant="overline" color="success.main">
          PROFILEPAYS / STATIC PILOT
        </Typography>
        <Typography variant="h3" fontWeight={800}>
          A placement with a clear ending.
        </Typography>
        <Typography color="text.secondary">
          Choose a campaign, approve the temporary image, and keep your normal profile.
        </Typography>
      </Box>
      <Alert severity="info">
        Test credits have no cash value. Balance:{' '}
        <strong data-testid="test-balance">{data?.balance || 0}</strong>. Enrollment alone earns
        nothing.
      </Alert>
      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      {['advertiser', 'admin'].includes(user.userType) && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Create a test campaign</Typography>
              <TextField
                label="Campaign title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Approved image"
                  value={asset}
                  onChange={e => setAsset(e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="blue">Blue test image</MenuItem>
                  <MenuItem value="green">Green test image</MenuItem>
                </TextField>
                <TextField
                  label="Duration in seconds"
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  helperText={`Minimum ${data?.minDurationSeconds || 3600}; maximum 86400`}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Reward in test credits"
                  type="number"
                  value={reward}
                  onChange={e => setReward(Number(e.target.value))}
                />
                <TextField
                  label="Test budget"
                  type="number"
                  value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                />
                <TextField
                  label="Participant limit"
                  type="number"
                  value={capacity}
                  onChange={e => setCapacity(Number(e.target.value))}
                />
              </Stack>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() =>
                  action(() =>
                    api.post('/placements/campaigns', {
                      commandKey: campaignCommand,
                      title,
                      assetKey: asset,
                      durationSeconds: duration,
                      reward,
                      budget,
                      capacity,
                    })
                  )
                }
              >
                Publish test campaign
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Connect your AIHangout profile</Typography>
            <Typography>
              In{' '}
              <a
                href={`${data?.origin || 'https://aihangout.ai'}/settings`}
                target="_blank"
                rel="noreferrer"
              >
                AIHangout settings
              </a>
              , select “Create connection code.” Paste the private code here. You can revoke it
              there at any time.
            </Typography>
            <TextField
              label="AIHangout connection code"
              type="password"
              value={code}
              onChange={e => setCode(e.target.value)}
              autoComplete="off"
            />
            <Button
              variant="outlined"
              disabled={busy || !code}
              onClick={() =>
                action(async () => {
                  await api.post('/placements/destinations', { code });
                  setCode('');
                })
              }
            >
              Connect profile
            </Button>
            {data?.destinations?.map((d: any) => (
              <Chip key={d.id} label={`Connected: ${d.username}`} sx={{ alignSelf: 'start' }} />
            ))}
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Choose and review</Typography>
            <TextField
              select
              label="Campaign"
              value={selected}
              onChange={e => {
                setSelected(e.target.value);
                setConsent(false);
              }}
            >
              <MenuItem value="">Choose a campaign</MenuItem>
              {data?.campaigns
                ?.filter((c: any) => c.sponsor_id !== user.id)
                .map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.terms.title} — {c.terms.reward} test credits
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label="Destination profile"
              value={destination}
              onChange={e => {
                setDestination(e.target.value);
                setConsent(false);
              }}
            >
              <MenuItem value="">Choose your profile</MenuItem>
              {data?.destinations?.map((d: any) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.username}
                </MenuItem>
              ))}
            </TextField>
            {campaign && (
              <>
                <Stack direction="row" spacing={2} alignItems="center">
                  <img
                    src={`${data.origin}/profilepays/${campaign.terms.assetKey}.png`}
                    alt="Approved sponsored test image"
                    width="96"
                    height="96"
                    style={{ borderRadius: '50%' }}
                  />
                  <Typography>
                    {campaign.terms.durationSeconds} seconds after confirmed placement. Reward:{' '}
                    {campaign.terms.reward} test credits. Available budget:{' '}
                    {campaign.budget - campaign.reserved - campaign.spent}.
                  </Typography>
                </Stack>
                <Typography variant="body2">
                  Your selected profile and earlier posts show this image with an Ad · test label.
                  Your normal setting is preserved. Checks run every{' '}
                  {campaign.terms.sampleMs / 1000} seconds; at least 98% sampled coverage is
                  required. This measures placement availability, not views. Stopping early earns
                  zero; sponsor cancellation is prorated. Evidence gaps go to review.
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox checked={consent} onChange={e => setConsent(e.target.checked)} />
                  }
                  label="I approve this temporary image and accept the test-credit terms."
                />
              </>
            )}
            <Button
              variant="contained"
              disabled={busy || !consent || !selected || !destination}
              onClick={() =>
                action(async () => {
                  await api.post(`/placements/campaigns/${selected}/join`, {
                    commandKey: joinCommand,
                    destinationId: destination,
                    termsVersion: 1,
                    consent: 'static-test-v1',
                  });
                  setConsent(false);
                })
              }
            >
              Reserve placement
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Typography variant="h5">Placement history</Typography>
      {data?.placements?.length === 0 && (
        <Typography color="text.secondary">
          Your placements and receipts will appear here.
        </Typography>
      )}
      {data?.placements?.map((p: any) => (
        <Card key={p.id} data-testid={`placement-${p.id}`}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={700}>
                  {p.record.terms.title} · {p.username}
                </Typography>
                <Chip label={p.state} />
              </Stack>
              <Typography>
                Start:{' '}
                {p.record.startsAt
                  ? new Date(p.record.startsAt).toLocaleString()
                  : 'Awaiting destination confirmation'}{' '}
                · End:{' '}
                {p.record.endsAt ? new Date(p.record.endsAt).toLocaleString() : 'Not started'}
              </Typography>
              <Typography>
                Verification: {p.record.assessment} · Restoration: {p.record.restoration} · Test
                award: {p.record.award} · {p.record.settlement || 'Reserved, not earned'}
              </Typography>
              {p.record.lastError && (
                <Alert severity="warning">{p.record.lastError}. Reconciliation will retry.</Alert>
              )}
              <Stack direction="row" spacing={2}>
                <Button
                  href={`${data.origin}/profile/${encodeURIComponent(p.username)}`}
                  target="_blank"
                >
                  View profile
                </Button>
                <Button
                  onClick={() =>
                    action(async () =>
                      setReceipt((await api.get(`/placements/${p.id}/receipt`)).data)
                    )
                  }
                >
                  View receipt
                </Button>
                {!['ended', 'failed', 'cancelled'].includes(p.state) && (
                  <Button
                    color="error"
                    onClick={() => action(() => api.post(`/placements/${p.id}/stop`))}
                  >
                    Stop and restore
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
      {receipt && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Placement receipt</Typography>
              <Typography>
                {receipt.observations.length} observations · {receipt.events.length} lifecycle
                events · {receipt.ledger.length} test ledger entries
              </Typography>
              <Box
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  fontSize: 12,
                  maxHeight: 450,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(receipt, null, 2)}
              </Box>
              <Button onClick={() => setReceipt(null)}>Close receipt</Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

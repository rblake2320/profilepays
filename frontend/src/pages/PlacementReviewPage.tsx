import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import api from '../api/client';
import { useAppSelector } from '../hooks/redux';
const stamp = (v: any) =>
  v
    ? `${new Date(Number(v)).toLocaleString(undefined, { timeZoneName: 'short' })} · ${new Date(Number(v)).toISOString()}`
    : '—';
export default function PlacementReviewPage() {
  const { user } = useAppSelector(s => s.auth);
  const [data, setData] = useState<any>(),
    [tab, setTab] = useState('credits'),
    [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(),
    [receipt, setReceipt] = useState<any>(),
    [participant, setParticipant] = useState(''),
    [appeal, setAppeal] = useState<any>();
  const [award, setAward] = useState(0),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [confirm, setConfirm] = useState<any>();
  async function load(q = search) {
    try {
      setData((await api.get('/placements/admin', { params: { search: q } })).data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Unable to load administrator console');
    }
  }
  useEffect(() => {
    void load('');
  }, []);
  const change = (next: string) => {
    setTab(next);
    setReason('');
    setError('');
    setNotice('');
    void load();
  };
  async function inspect(p: any) {
    setBusy(true);
    setError('');
    try {
      const r = await api.get(`/placements/${p.id}/receipt`);
      setSelected(p);
      setReceipt(r.data);
      setAward(0);
      setReason('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not load evidence');
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api.post(confirm.path, confirm.body);
      setNotice(confirm.success);
      setConfirm(null);
      setSelected(null);
      setReceipt(null);
      setAppeal(null);
      setReason('');
      await load();
    } catch (e: any) {
      setConfirm(null);
      setError(e.response?.data?.message || 'Decision was not saved. Refresh before retrying.');
    } finally {
      setBusy(false);
    }
  }
  const target = data?.participants.find((p: any) => p.id === participant);
  const pending = data?.standing.appeals.filter((a: any) => a.status === 'pending') || [];
  const canReason = reason.trim().length >= 5 && reason.length <= 300;
  return (
    <>
      <p className="pp-eyebrow">ADMINISTRATOR · TEST CREDIT EDITION</p>
      <h1>Review with a clear record.</h1>
      <p>
        Real payouts are disabled. Review evidence, record your reason, and confirm each decision.
        Suspensions block new offers while preserving sign-in, receipts and appeals; existing
        agreements keep their terms.
      </p>
      {error && (
        <p className="pp-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="pp-notice" role="status">
          {notice}
        </p>
      )}
      <nav className="pp-actions" aria-label="Administrator sections">
        {[
          ['credits', `Held credits (${data?.held.length ?? 0})`],
          ['participants', 'Participants'],
          ['appeals', `Appeals (${pending.length})`],
          ['history', 'Decision history'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => change(id)}>
            {label}
          </button>
        ))}
        <button disabled={busy} onClick={() => load()}>
          Refresh queue
        </button>
      </nav>
      {!data ? (
        <p>Loading administrator records…</p>
      ) : (
        <>
          {tab === 'credits' && (
            <div className="pp-columns">
              <section className="pp-panel">
                <h2>Held test credits</h2>
                <p>A hold is an unresolved evidence question, not a confirmed breach.</p>
                {data.held.map((p: any) => (
                  <article className="pp-admin-record" key={p.id}>
                    <h3>{p.record.terms.title}</h3>
                    <p>
                      @{p.username} · {p.record.terms.reward} test credits held
                    </p>
                    <p>{stamp(p.record.endsAt)}</p>
                    <button
                      disabled={busy || [p.user_id, p.sponsor_id].includes(user?.id)}
                      onClick={() => inspect(p)}
                    >
                      Inspect evidence
                    </button>
                    {[p.user_id, p.sponsor_id].includes(user?.id) && (
                      <p>A separate administrator must review your own agreement.</p>
                    )}
                  </article>
                ))}
                {!data.held.length && <p>No held credits awaiting review.</p>}
              </section>
              <section className="pp-panel pp-trust">
                {selected && receipt ? (
                  <>
                    <h2>{selected.record.terms.title}</h2>
                    <p>Participant: @{selected.username}</p>
                    <dl>
                      <dt>Agreed time</dt>
                      <dd>{selected.record.terms.durationSeconds} seconds</dd>
                      <dt>Verified time</dt>
                      <dd>{((selected.record.coveredMs || 0) / 1000).toFixed(3)} seconds</dd>
                      <dt>Original profile</dt>
                      <dd>{selected.record.restoration}</dd>
                      <dt>Breach</dt>
                      <dd>
                        {selected.record.breach
                          ? stamp(selected.record.breach.at)
                          : 'No recorded breach'}
                      </dd>
                    </dl>
                    <p>
                      {receipt.observations.length} observations · {receipt.events.length} events ·{' '}
                      {receipt.ledger.length} ledger entries
                    </p>
                    <details>
                      <summary>Read timestamped observations and events</summary>
                      <pre className="pp-json">
                        {JSON.stringify(
                          { observations: receipt.observations, events: receipt.events },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                    <label className="pp-field">
                      Award in test credits
                      <input
                        type="number"
                        min="0"
                        max={selected.record.breach ? 0 : selected.record.terms.reward}
                        step="1"
                        value={award}
                        onChange={e => setAward(Number(e.target.value))}
                      />
                    </label>
                    <label className="pp-field">
                      Credit review reason
                      <textarea
                        minLength={5}
                        maxLength={300}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                      />
                    </label>
                    <button
                      className="pp-button"
                      disabled={
                        busy ||
                        !canReason ||
                        !Number.isInteger(award) ||
                        award < 0 ||
                        award > (selected.record.breach ? 0 : selected.record.terms.reward)
                      }
                      onClick={() =>
                        setConfirm({
                          title: 'Confirm credit decision',
                          summary: `Award ${award} test credits to @${selected.username} for ${selected.record.terms.title}. This settles the held agreement once.`,
                          path: `/placements/${selected.id}/review`,
                          body: { award, reason },
                          success: 'Credit review recorded. The test ledger is settled.',
                        })
                      }
                    >
                      Review credit decision
                    </button>
                  </>
                ) : (
                  <p>Select a held agreement to inspect its evidence.</p>
                )}
              </section>
            </div>
          )}
          {tab === 'participants' && (
            <section className="pp-panel pp-trust">
              <h2>Participant access</h2>
              <form
                className="pp-actions"
                onSubmit={e => {
                  e.preventDefault();
                  void load();
                }}
              >
                <label className="pp-field">
                  Search participant name, profile or ID
                  <input maxLength={100} value={search} onChange={e => setSearch(e.target.value)} />
                </label>
                <button>Search participants</button>
              </form>
              <p>
                Up to 100 matching participants. Select the test profile before making a decision.
              </p>
              <label className="pp-field">
                Participant
                <select
                  value={participant}
                  onChange={e => {
                    setParticipant(e.target.value);
                    setReason('');
                  }}
                >
                  <option value="">Choose a participant</option>
                  {data.participants.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.profiles.length
                        ? '@' + p.profiles.join(', @')
                        : `${p.first_name} ${p.last_name}`}{' '}
                      · {p.banned ? 'Suspended' : 'Allowed'}
                    </option>
                  ))}
                </select>
              </label>
              {target && (
                <>
                  <h3>
                    {target.first_name} {target.last_name}
                  </h3>
                  <p>Account ID: {target.id}</p>
                  <p>
                    {target.breaches} confirmed breaches ·{' '}
                    {target.banned ? 'Offer access suspended' : 'Offer access allowed'}
                  </p>
                  {target.reason && (
                    <p>
                      Last decision: {target.reason}
                      <br />
                      {stamp(target.decided_at_ms)}
                    </p>
                  )}
                  <label className="pp-field">
                    Access decision reason
                    <textarea
                      minLength={5}
                      maxLength={300}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    className="pp-button"
                    disabled={busy || !canReason || target.id === user?.id}
                    onClick={() =>
                      setConfirm({
                        title: target.banned
                          ? 'Confirm restored access'
                          : 'Confirm participant suspension',
                        summary: `${target.banned ? 'Restore' : 'Suspend'} offer access for ${target.profiles.map((p: string) => '@' + p).join(', ') || target.first_name}. ${target.banned ? 'They can request offers again, subject to campaign eligibility.' : 'They can still sign in and submit an appeal.'}`,
                        path: `/placements/participants/${target.id}/access`,
                        body: { banned: !target.banned, reason },
                        success: target.banned
                          ? 'Offer access restored.'
                          : 'Participant suspended from new offers. They can appeal.',
                      })
                    }
                  >
                    {target.banned ? 'Review restored access' : 'Review suspension'}
                  </button>
                </>
              )}
            </section>
          )}
          {tab === 'appeals' && (
            <div className="pp-columns">
              <section className="pp-panel">
                <h2>Pending appeals</h2>
                {pending.map((a: any) => (
                  <article className="pp-admin-record" key={a.id}>
                    <h3>{a.placement_id ? 'Agreement breach appeal' : 'Suspension appeal'}</h3>
                    <p>Participant: {a.user_id}</p>
                    <p>{stamp(a.created_at_ms)}</p>
                    <p>{a.reason}</p>
                    <button
                      onClick={() => {
                        setAppeal(a);
                        setReason('');
                      }}
                    >
                      Review appeal
                    </button>
                  </article>
                ))}
                {!pending.length && <p>No pending appeals.</p>}
              </section>
              <section className="pp-panel pp-trust">
                {appeal ? (
                  <>
                    <h2>Review the appeal</h2>
                    <p>Participant statement: {appeal.reason}</p>
                    <p>{stamp(appeal.created_at_ms)}</p>
                    {appeal.placement_id ? (
                      <p>
                        Agreement: {appeal.placement_id}. Overturning the mark does not alter its
                        payout ledger.
                      </p>
                    ) : (
                      <p>
                        Original access decision: {stamp(appeal.access_decision_ms)}
                        <br />
                        Current reason:{' '}
                        {
                          data.standing.access.find((a: any) => a.user_id === appeal.user_id)
                            ?.reason
                        }
                      </p>
                    )}
                    <label className="pp-field">
                      Appeal decision reason
                      <textarea
                        minLength={5}
                        maxLength={300}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                      />
                    </label>
                    <div className="pp-actions">
                      {['upheld', 'overturned'].map(decision => (
                        <button
                          key={decision}
                          disabled={busy || !canReason || appeal.user_id === user?.id}
                          onClick={() =>
                            setConfirm({
                              title:
                                decision === 'upheld'
                                  ? 'Confirm upheld decision'
                                  : 'Confirm overturned decision',
                              summary:
                                decision === 'upheld'
                                  ? 'Keep the original decision and record the reason.'
                                  : appeal.placement_id
                                    ? 'Remove this confirmed breach mark. The agreement ledger stays unchanged.'
                                    : 'Restore offer access if this is still the current suspension.',
                              path: `/placements/appeals/${appeal.id}/review`,
                              body: { decision, reason },
                              success:
                                decision === 'upheld'
                                  ? 'Appeal reviewed; original decision upheld.'
                                  : 'Appeal overturned; participation standing updated.',
                            })
                          }
                        >
                          {decision === 'upheld' ? 'Uphold decision' : 'Overturn decision'}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p>Select an appeal to review its statement and original decision.</p>
                )}
              </section>
            </div>
          )}
          {tab === 'history' && (
            <section className="pp-panel">
              <h2>Recent access and appeal decisions</h2>
              <p>
                The latest 100 decisions, including advertiser exclusions. Credit decisions stay in
                each agreement receipt.
              </p>
              {data.audit.map((a: any) => (
                <article className="pp-admin-record" key={a.id}>
                  <h3>{a.kind.replaceAll('_', ' ')}</h3>
                  <p>{a.reason}</p>
                  <p>{stamp(a.at_ms)}</p>
                  <p>
                    Participant: {a.user_id}
                    <br />
                    Reviewer: {a.actor_id}
                  </p>
                </article>
              ))}
              {!data.audit.length && <p>No decisions recorded.</p>}
            </section>
          )}
        </>
      )}
      <Dialog open={!!confirm} onClose={() => !busy && setConfirm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <p>{confirm?.summary}</p>
          <p>
            <strong>Your reason:</strong> {confirm?.body.reason}
          </p>
          <p>
            Test credits only. This action will be recorded with your account and the server
            timestamp.
          </p>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setConfirm(null)}>
            Back
          </Button>
          <Button disabled={busy} onClick={submit}>
            Confirm decision
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

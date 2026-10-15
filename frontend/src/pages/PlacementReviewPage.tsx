import { useEffect, useState } from 'react';
import api from '../api/client';
export default function PlacementReviewPage() {
  const [items, setItems] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(),
    [receipt, setReceipt] = useState<any>();
  const [award, setAward] = useState(0),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function load() {
    try {
      const r = await api.get('/placements');
      setItems(r.data.placements.filter((p: any) => p.record.settlement === 'review_hold'));
    } catch (e: any) {
      setError(e.response?.data?.message || 'Unable to load review queue');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function inspect(p: any) {
    setError('');
    setBusy(true);
    try {
      const r = await api.get(`/placements/${p.id}/receipt`);
      setSelected(p);
      setReceipt(r.data);
      setAward(0);
      setReason('');
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="pp-eyebrow">INDEPENDENT OPERATOR</p>
      <h1>
        Give every exception
        <br />a clear resolution.
      </h1>
      <p>
        Review the observed evidence and record a reason. Awards are test credits only. Participants
        and sponsors cannot review their own placements.
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
      <div className="pp-columns">
        <section className="pp-panel">
          <h2>Pending reviews ({items.length})</h2>
          {items.map(p => (
            <div className="pp-row" key={p.id}>
              <div>
                <h3>{p.record.terms.title}</h3>
                <p>
                  @{p.username} · {p.record.restoration}
                </p>
              </div>
              <button disabled={busy} onClick={() => inspect(p)}>
                Inspect evidence
              </button>
            </div>
          ))}
          {!items.length && <p>No unresolved evidence gaps.</p>}
        </section>
        <section className="pp-panel">
          {selected && receipt ? (
            <>
              <h2>{selected.record.terms.title}</h2>
              <p>
                Verified coverage: {(selected.record.coveredMs / 1000).toFixed(1)} seconds of{' '}
                {selected.record.terms.durationSeconds}. Restoration: {selected.record.restoration}.
              </p>
              <p>
                {receipt.observations.length} observations · {receipt.events.length} lifecycle
                events
              </p>
              <details>
                <summary>Read observations and events</summary>
                <pre className="pp-json">
                  {JSON.stringify(
                    { observations: receipt.observations, events: receipt.events },
                    null,
                    2
                  )}
                </pre>
              </details>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  setBusy(true);
                  setError('');
                  try {
                    await api.post(`/placements/${selected.id}/review`, { award, reason });
                    setNotice('Review recorded. The test ledger has been settled.');
                    setSelected(null);
                    setReceipt(null);
                    await load();
                  } catch (e: any) {
                    setError(e.response?.data?.message || e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="pp-field">
                  Test-credit award
                  <input
                    type="number"
                    min="0"
                    max={selected.record.terms.reward}
                    step="1"
                    required
                    value={award}
                    onChange={e => setAward(Number(e.target.value))}
                  />
                </label>
                <label className="pp-field">
                  Review reason
                  <input
                    required
                    minLength={5}
                    maxLength={300}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </label>
                <p>
                  This records a final decision. Check the evidence and amount before submitting.
                </p>
                <button className="pp-button" disabled={busy}>
                  Record review decision
                </button>
              </form>
            </>
          ) : (
            <p>Select a placement to inspect its receipt before deciding.</p>
          )}
        </section>
      </div>
    </>
  );
}

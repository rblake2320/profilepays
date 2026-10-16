import { useState } from 'react';
import api from '../api/client';
export default function TrustPanel({ data, user, action }: any) {
  const [reason, setReason] = useState(''),
    [ids, setIds] = useState(''),
    [group, setGroup] = useState(''),
    [report, setReport] = useState<any>();
  const standing = data.standing || { breaches: [], access: [], appeals: [] };
  const advertiser = ['advertiser', 'admin'].includes(user.userRole);
  const time = (v: any) => new Date(Number(v)).toLocaleString(undefined, { timeZoneName: 'short' });
  return (
    <section className="pp-panel">
      <h2>Identity and participation</h2>
      <p>{data.identity?.message}</p>
      <p>
        <strong>Identity: not verified · Real payouts: disabled</strong>
      </p>
      <p>
        Connected social profiles prove account control, not a unique legal identity. Verification
        will use a connected provider; advertisers will not receive tax documents.
      </p>
      <details>
        <summary>Your standing and appeals</summary>
        <p>
          Confirmed breaches:{' '}
          {
            standing.breaches.filter((b: any) => b.user_id === user.id && b.status === 'confirmed')
              .length
          }
          . An upheld agreement breach cannot be erased by putting the image back.
        </p>
        <label className="pp-field">
          Reason for your appeal
          <input
            minLength={5}
            maxLength={1000}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </label>
        {standing.breaches
          .filter((b: any) => b.user_id === user.id)
          .map((b: any) => (
            <div className="pp-row" key={b.placement_id}>
              <span>
                {b.campaign} · {time(b.occurred_at_ms)} · {b.status}
              </span>
              {b.status === 'confirmed' && (
                <button
                  disabled={
                    reason.trim().length < 5 ||
                    standing.appeals.some(
                      (a: any) => a.placement_id === b.placement_id && a.status === 'pending'
                    )
                  }
                  onClick={() =>
                    action(() =>
                      api.post('/placements/appeals', { placementId: b.placement_id, reason })
                    )
                  }
                >
                  Appeal breach
                </button>
              )}
            </div>
          ))}
        {standing.access
          .filter((a: any) => a.user_id === user.id && a.banned)
          .map((a: any) => (
            <div key={a.user_id}>
              <p>
                Offer access suspended: {a.reason} · {time(a.decided_at_ms)}
              </p>
              <button
                disabled={reason.trim().length < 5}
                onClick={() => action(() => api.post('/placements/appeals', { reason }))}
              >
                Appeal suspension
              </button>
            </div>
          ))}
        {standing.appeals
          .filter((a: any) => a.user_id === user.id)
          .map((a: any) => (
            <p key={a.id}>
              Appeal submitted {time(a.created_at_ms)}: {a.status}
              {a.decision_reason && ` — ${a.decision_reason}`}
            </p>
          ))}
      </details>
      {advertiser && (
        <details>
          <summary>Advertiser exclusions and groups</summary>
          <p>
            Exclude participants from your future offers individually or as a named list. Existing
            agreements retain their original terms. This does not ban anyone from other advertisers.
          </p>
          <label className="pp-field">
            Participant IDs (comma separated)
            <textarea value={ids} onChange={e => setIds(e.target.value)} />
          </label>
          <label className="pp-field">
            Group name (optional)
            <input maxLength={80} value={group} onChange={e => setGroup(e.target.value)} />
          </label>
          <label className="pp-field">
            Private reason
            <input
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </label>
          <button
            disabled={!ids.trim() || reason.trim().length < 5}
            onClick={() =>
              action(() =>
                api.post('/placements/exclusions', {
                  userIds: ids.split(',').map(x => x.trim()),
                  groupName: group,
                  reason,
                  blocked: true,
                })
              )
            }
          >
            Exclude selected participants
          </button>
          <details>
            <summary>Participants in your campaigns</summary>
            {[...new Map(data.placements.map((p: any) => [p.user_id, p])).values()].map(
              (p: any) => (
                <p key={p.user_id}>
                  @{p.username} · {p.user_id}{' '}
                  <button onClick={() => setIds(p.user_id)}>Select participant</button>
                </p>
              )
            )}
          </details>
          {data.exclusions.map((x: any) => (
            <div className="pp-row" key={x.user_id}>
              <span>
                {x.group_name || 'Individual'} · {x.user_id}
                <br />
                {x.reason}
              </span>
              <button
                onClick={() =>
                  action(() =>
                    api.post('/placements/exclusions', {
                      userIds: [x.user_id],
                      blocked: false,
                      reason: 'Advertiser removed exclusion',
                    })
                  )
                }
              >
                Remove exclusion
              </button>
            </div>
          ))}
        </details>
      )}
      {advertiser && (
        <details>
          <summary>Campaign analytics packages</summary>
          <p>
            Free test preview: demand, delivery, or both. Paid packages are disabled until billing
            and pricing are configured. Agreement receipts are always available. These metrics
            measure offers and verification, not audience views.
          </p>
          {data.campaigns
            .filter((c: any) => c.sponsor_id === user.id)
            .map((c: any) => (
              <div key={c.id}>
                <h3>{c.terms.title}</h3>
                {['demand', 'delivery', 'all'].map(pkg => (
                  <button
                    key={pkg}
                    onClick={() =>
                      action(async () =>
                        setReport(
                          (
                            await api.post(`/placements/campaigns/${c.id}/analytics`, {
                              package: pkg,
                            })
                          ).data
                        )
                      )
                    }
                  >
                    Preview {pkg}
                  </button>
                ))}
              </div>
            ))}
          {report && (
            <>
              <pre className="pp-json">{JSON.stringify(report, null, 2)}</pre>
              <button
                onClick={() => {
                  const a = document.createElement('a'),
                    url = URL.createObjectURL(
                      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                    );
                  a.href = url;
                  a.download = 'campaign-analytics.json';
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Download analytics
              </button>
            </>
          )}
        </details>
      )}
      {user.userRole === 'admin' && (
        <details>
          <summary>Administrator review</summary>
          <p>
            Review evidence before restricting access. A participant can appeal. Breach appeals do
            not automatically change the payout ledger.
          </p>
          <label className="pp-field">
            Participant ID
            <input value={ids} onChange={e => setIds(e.target.value)} />
          </label>
          <label className="pp-field">
            Decision reason
            <input value={reason} onChange={e => setReason(e.target.value)} />
          </label>
          {[true, false].map(banned => (
            <button
              key={String(banned)}
              disabled={reason.trim().length < 5 || !ids}
              onClick={() =>
                action(() => api.post(`/placements/participants/${ids}/access`, { banned, reason }))
              }
            >
              {banned ? 'Suspend offer access' : 'Restore offer access'}
            </button>
          ))}
          {standing.appeals
            .filter((a: any) => a.status === 'pending')
            .map((a: any) => (
              <div key={a.id}>
                <p>
                  {a.user_id} · {a.reason} · {time(a.created_at_ms)}
                </p>
                {['upheld', 'overturned'].map(decision => (
                  <button
                    key={decision}
                    disabled={reason.trim().length < 5}
                    onClick={() =>
                      action(() =>
                        api.post(`/placements/appeals/${a.id}/review`, { decision, reason })
                      )
                    }
                  >
                    {decision === 'upheld' ? 'Uphold' : 'Overturn'}
                  </button>
                ))}
              </div>
            ))}
        </details>
      )}
    </section>
  );
}

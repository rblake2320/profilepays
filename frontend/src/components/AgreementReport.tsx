export default function AgreementReport({ placements }: { placements: any[] }) {
  const time = (n: number) => (n ? new Date(n).toISOString() : '—');
  return (
    <section className="pp-contract-report">
      <h1>ProfilePays agreement report</h1>
      <p>
        Generated {new Date().toISOString()} · All timestamps UTC · Test credits have no cash value.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {[
              'Campaign / participant',
              'Outcome',
              'Start / agreed end',
              'Breach time',
              'Verified duration',
              'Award / withheld',
              'Restoration',
            ].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {placements.map(p => (
            <tr key={p.id}>
              <td>
                {p.record.terms.title}
                <br />@{p.username}
                <br />
                {p.id}
              </td>
              <td>
                {p.record.notification?.title ?? p.record.assessment}
                <br />
                {p.record.settlement ?? p.state}
              </td>
              <td>
                {time(p.record.startsAt)}
                <br />
                {time(p.record.endsAt)}
              </td>
              <td>
                {p.record.notification?.type === 'agreement_broken'
                  ? time(p.record.notification.occurredAt)
                  : '—'}
              </td>
              <td>
                {((p.record.coveredMs || 0) / 1000).toFixed(3)} / {p.record.terms.durationSeconds}{' '}
                seconds
              </td>
              <td>
                {p.record.award || 0} awarded
                <br />
                {p.record.notification?.withheld || 0} withheld
              </td>
              <td>{p.record.restoration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!placements.length && <p>No agreements yet.</p>}
    </section>
  );
}

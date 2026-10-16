import { useState } from 'react';
import api from '../api/client';
import { useAppDispatch } from '../hooks/redux';
import { fetchCurrentUser } from '../store/authSlice';
export default function CompanyCompletion() {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <section className="pp-panel pp-trust">
      <h2>Complete your business details</h2>
      <p>
        Your account is missing a company name. Enter the business name you want to use before
        creating an offer.
      </p>
      <form
        onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api.put('/users/me', { companyName: name.trim() });
            await dispatch(fetchCurrentUser());
          } catch {
            setError(
              'Could not save your company name. Use 1–200 characters without markup and try again.'
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="pp-field">
          Company name
          <input
            required
            minLength={1}
            maxLength={200}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="pp-button" disabled={busy || !name.trim()}>
          Save company name
        </button>
      </form>
    </section>
  );
}

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchCurrentUser, sessionEnded } from '../store/authSlice';
let boot: Promise<unknown> | undefined;
export default function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch(),
    ready = useAppSelector(s => s.auth.ready);
  useEffect(() => {
    if (!boot) boot = dispatch(fetchCurrentUser());
    const ended = () => dispatch(sessionEnded());
    window.addEventListener('profilepays-session-ended', ended);
    const channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('profilepays-session') : null;
    if (channel)
      channel.onmessage = e => {
        if (e.data === 'signed-out') ended();
      };
    return () => {
      window.removeEventListener('profilepays-session-ended', ended);
      channel?.close();
    };
  }, [dispatch]);
  return ready ? (
    <>{children}</>
  ) : (
    <main className="pp-main">
      <p role="status">Checking your session…</p>
    </main>
  );
}

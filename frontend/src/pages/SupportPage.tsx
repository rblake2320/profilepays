import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import './support.css';

type Pair = { id: string; publishToken: string; viewToken: string; expiresAt: number };
type Frame = { frame: string | null; capturedAt: number | null; expiresAt: number; status: string };
const message = (error: any) => error?.response?.data?.message || error?.message || 'Connection interrupted. Please try again.';
function capability(hash: string) {
  const parts = new URLSearchParams(hash.slice(1));
  return { id: parts.get('session') || '', token: parts.get('key') || '' };
}
async function relay(id: string, token: string, method: string, frame?: string) {
  const response = await fetch(`/api/support/sessions/${encodeURIComponent(id)}${method === 'DELETE' ? '' : '/frame'}`, {
    method, credentials: 'omit', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, ...(frame ? { 'Content-Type': 'application/json' } : {}) },
    body: frame ? JSON.stringify({ frame }) : undefined, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Screen connection returned ${response.status}.`);
  }
  return response.json();
}

export default function SupportPage({ mode = 'setup' }: { mode?: 'setup' | 'share' | 'view' }) {
  const [pair, setPair] = useState<Pair | null>(null);
  const location = useLocation();
  const key = useMemo(() => capability(location.hash), [location.hash]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready');
  const [busy, setBusy] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [now, setNow] = useState(Date.now());
  const [deadline, setDeadline] = useState<number | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const killTimer = useRef<ReturnType<typeof setTimeout>>();
  const supported = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  const usable = /^[a-f0-9-]{36}$/.test(key.id) && /^[A-Za-z0-9_-]{43}$/.test(key.token);

  function haltCapture() {
    running.current = false;
    clearTimeout(timer.current); clearTimeout(killTimer.current);
    stream.current?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  async function stop() {
    haltCapture(); setFrame(null); setBusy(true);
    try {
      if (mode === 'setup' && pair) await apiClient.delete(`/support/sessions/${pair.id}/owned`);
      else await relay(key.id, key.token, 'DELETE');
      setStatus('Stopped'); setPair(null); setDeadline(null); setError('');
    } catch (e) { setStatus('Capture stopped'); setError(`${message(e)} Any last frame disappears from the relay within six seconds.`); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    return () => { clearInterval(clock); haltCapture(); };
  }, []);

  useEffect(() => {
    // A different fragment is a different grant, even without a document reload.
    haltCapture(); setFrame(null); setDeadline(null); setError(''); setStatus('Ready');
  }, [key, mode]);

  useEffect(() => {
    if (mode !== 'view' || !usable || status === 'Stopped') return;
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout>;
    async function read() {
      try {
        const value = await relay(key.id, key.token, 'GET');
        if (!cancelled) { setFrame(value); setDeadline(value.expiresAt); setStatus(value.status); setError(''); }
      } catch (e) { if (!cancelled) { setFrame(null); setError(message(e)); setStatus('Disconnected'); } }
      if (!cancelled) poll = setTimeout(read, 1_000);
    }
    read();
    return () => { cancelled = true; clearTimeout(poll); };
  }, [mode, usable, key, status === 'Stopped']);

  async function share() {
    setBusy(true); setError('');
    try {
      // Called directly from the tap: Safari requires transient user activation.
      const captured = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      stream.current = captured; running.current = true;
      for (const track of captured.getVideoTracks()) track.onended = () => {
        // Capture ending (for example on app switching) is not an explicit grant revocation.
        haltCapture(); setStatus('Capture paused');
        setError('Safari ended screen capture. Return to this page and tap Share screen to resume with this link. Continuous sharing across iPhone apps requires a native screen-sharing app.');
      };
      if (!video.current) throw new Error('Screen preview is unavailable.');
      video.current.srcObject = captured;
      await video.current.play();
      setStatus('Sharing');
      // Independent of upload success: never leave capture running indefinitely.
      killTimer.current = setTimeout(() => { void stop(); }, 15 * 60_000);
      const canvas = document.createElement('canvas');
      const send = async () => {
        if (!running.current || !video.current) return;
        try {
          const source = video.current;
          if (!source.videoWidth) { timer.current = setTimeout(send, 1_000); return; }
          const scale = Math.min(1, 960 / Math.max(source.videoWidth, source.videoHeight));
          canvas.width = Math.max(1, Math.round(source.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(source.videoHeight * scale));
          canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
          let encoded = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          if (encoded.length > 85_000) encoded = canvas.toDataURL('image/jpeg', 0.3).split(',')[1];
          if (encoded.length > 85_000) throw new Error('Screen is too detailed to share. Stop and try a simpler screen.');
          const result = await relay(key.id, key.token, 'POST', encoded);
          if (!running.current) return;
          setDeadline(result.expiresAt);
          clearTimeout(killTimer.current);
          killTimer.current = setTimeout(() => { void stop(); }, Math.max(0, result.expiresAt - Date.now()));
          timer.current = setTimeout(send, 1_000);
        } catch (e) { haltCapture(); setStatus('Capture stopped'); setError(message(e)); }
      };
      await send();
    } catch (e) { haltCapture(); setStatus('Ready'); setError(message(e)); }
    finally { setBusy(false); }
  }

  const link = (kind: 'share' | 'view') => `${window.location.origin}/support/${kind}#session=${pair!.id}&key=${kind === 'share' ? pair!.publishToken : pair!.viewToken}`;
  const fresh = frame?.frame && frame.capturedAt && now - frame.capturedAt < 6_000;
  return <main className="pp-support">
    <Link className="support-brand" to="/">profile<span>pays</span></Link>
    <p className="support-eyebrow">PRIVATE SCREEN ASSISTANCE</p>
    <h1>{mode === 'share' ? 'Share your screen' : mode === 'view' ? 'Phone screen viewer' : 'Connect your phone'}</h1>
    <p>{mode === 'view' ? 'The phone owner decides when to share. This connection provides viewing only.' : 'Share a view of your screen with your helper for up to 15 minutes. You stay in control of every tap.'}</p>
    <div className="support-notice">Only share these private links with your helper. Shared screens can show notifications and personal information. Audio is off. Only the latest image is held in server memory; it is hidden after six seconds without an update and removed within eight seconds. This service does not record a video.</div>
    {error && <p className="support-error" role="alert">{error}</p>}
    {mode === 'setup' && <>
      <p>Creating a new connection ends any previous screen session for this account.</p>
      {!pair ? <button disabled={busy} onClick={async () => {
        setBusy(true); setError('');
        try { const { data } = await apiClient.post('/support/sessions'); setPair(data); setDeadline(data.expiresAt); setStatus('Waiting for phone'); }
        catch (e) { setError(message(e)); } finally { setBusy(false); }
      }}>Create private connection</button> : <>
        <label>Open this link on your phone<input aria-label="Phone sharing link" readOnly value={link('share')} onFocus={e => e.target.select()} /></label>
        <button onClick={async () => { try { await navigator.clipboard.writeText(link('share')); setStatus('Phone link copied'); } catch { setError('Select the phone link above and copy it.'); } }}>Copy phone link</button>
        <a className="support-button" href={link('view')} target="_blank" rel="noreferrer">Open viewer</a>
        <button className="support-stop" onClick={stop} disabled={busy}>End connection</button>
      </>}
    </>}
    {mode !== 'setup' && !usable && <p role="alert">This link is incomplete. Ask your helper for a new private connection link.</p>}
    {mode === 'share' && usable && <>
      {!supported && <p role="alert">This browser does not provide screen capture. Open this link directly in Safari. If Safari still shows this message, browser screen sharing is unavailable on this device.</p>}
      <p>Tap Share screen, then approve Safari’s sharing prompt. Switching tabs or apps may stop this browser connection’s capture. To resume, return here and tap Share screen again. Continuous sharing across iPhone apps requires a native screen-sharing app.</p>
      <button disabled={!supported || busy || status === 'Sharing' || status === 'Stopped'} onClick={share}>Share screen</button>
      <button className="support-stop" disabled={busy || status === 'Stopped'} onClick={stop}>Stop sharing</button>
      <video ref={video} autoPlay muted playsInline hidden={status !== 'Sharing'} className="support-preview" aria-label="Your shared screen preview" />
    </>}
    {mode === 'view' && usable && <>
      <button className="support-stop" onClick={stop} disabled={busy || status === 'Stopped'}>End connection</button>
      <section className="support-screen" aria-label="Shared phone screen">
        {fresh ? <img src={`data:image/jpeg;base64,${frame!.frame}`} alt="Live shared phone screen" /> : <p>{status === 'Stopped' ? 'Connection ended.' : frame?.capturedAt ? 'Screen paused. No fresh image is available.' : 'Waiting for the phone to share its screen…'}</p>}
      </section>
    </>}
    <p role="status">{status}{deadline ? ` · ${Math.max(0, Math.ceil((deadline - now) / 60_000))} minutes remaining` : ''}</p>
    {mode !== 'view' && <p className="support-footnote">Your helper can see the shared screen but cannot tap buttons or change iPhone Settings through this connection.</p>}
  </main>;
}

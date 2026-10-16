import axios, { AxiosError } from 'axios';
declare const __API_URL__: string;
const BASE_URL = typeof __API_URL__ !== 'undefined' ? __API_URL__ : '/api';
let accessToken: string | null = null;
let pendingRefresh: Promise<string> | null = null;
let ending = false;
let generation = 0;
export function clearLegacySession() {
  if (typeof localStorage !== 'undefined')
    for (const key of ['user', 'accessToken', 'refreshToken']) localStorage.removeItem(key);
}
clearLegacySession();
export function setAccessToken(value: string | null) {
  accessToken = value;
}
export function clearSession() {
  generation++;
  accessToken = null;
  clearLegacySession();
}
async function sessionLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined;
  return locks ? locks.request('profilepays-session', fn) : fn();
}
const sessionHeaders = { 'Content-Type': 'application/json', 'X-ProfilePays-Request': '1' };
export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: sessionHeaders,
  timeout: 15000,
});
apiClient.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
export async function refreshSession() {
  if (ending) throw new Error('Sign-out in progress');
  if (!pendingRefresh) {
    const start = generation;
    pendingRefresh = sessionLock(async () => {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true, headers: sessionHeaders, timeout: 15000 }
      );
      if (start !== generation || ending) throw new Error('Session changed');
      accessToken = data.accessToken;
      return data.accessToken as string;
    }).finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}
export async function endSession() {
  ending = true;
  generation++;
  try {
    if (pendingRefresh) await pendingRefresh.catch(() => {});
    await sessionLock(() =>
      axios.post(
        `${BASE_URL}/auth/logout`,
        {},
        { withCredentials: true, headers: sessionHeaders, timeout: 15000 }
      )
    );
    clearSession();
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('profilepays-session');
      channel.postMessage('signed-out');
      channel.close();
    }
  } finally {
    ending = false;
  }
}
apiClient.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const request = error.config as any;
    if (
      error.response?.status === 401 &&
      request &&
      !request._retry &&
      !request.url?.includes('/auth/') &&
      !ending
    ) {
      request._retry = true;
      try {
        const token = await refreshSession();
        request.headers.Authorization = `Bearer ${token}`;
        return apiClient(request);
      } catch {
        clearSession();
        if (typeof window !== 'undefined')
          window.dispatchEvent(new Event('profilepays-session-ended'));
      }
    }
    return Promise.reject(error);
  }
);
export default apiClient;

export function authError(err: any, fallback: string) {
  const body = err.response?.data;
  const fieldErrors = body?.fieldErrors && typeof body.fieldErrors === 'object' ? body.fieldErrors : {};
  const detail = Object.values(fieldErrors).filter(v => typeof v === 'string').join(' ');
  const raw = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
  const message = err.response?.status === 429 ? 'Too many attempts. Please wait a minute and try again; your entries are still here.' : detail || (typeof raw === 'string' && raw !== 'Bad Request' ? raw :
    err.response?.status === 400 ? 'Some account details were not accepted. Check your email, names and password requirements, then try again.' :
    !err.response ? 'We could not reach ProfilePays. Check your connection and try again; your entries are still here.' : fallback);
  return { message, fieldErrors };
}

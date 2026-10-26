const storageKey = 'open-yuanbaotong.session';
let token = sessionStorage.getItem(storageKey) || '';
export function hasSession() { return !!token; }
export function clearSession() { token = ''; sessionStorage.removeItem(storageKey); }
export class ApiError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}
async function request(service, path, params = {}, authenticated = true) {
  const url = new URL(`/api/${service}${path}`, location.origin);
  for (const [key, value] of Object.entries(params)) if (value !== '' && value != null) url.searchParams.set(key, String(value));
  const headers = { 'app-id': 'ybt-family' };
  if (authenticated && token) headers.token = token;
  let response;
  try { response = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(25000) }); }
  catch (error) { throw new ApiError(error.name === 'TimeoutError' ? '请求超时，请稍后重试' : '网络连接失败，请稍后重试'); }
  let body;
  try { body = await response.json(); } catch { throw new ApiError(`服务暂不可用（${response.status}），请稍后重试`); }
  if (response.status === 401 || body.code === 401 || body.code === 403) {
    if (authenticated) { clearSession(); window.dispatchEvent(new Event('session-expired')); }
    throw new ApiError('登录已过期，请重新登录', body.code);
  }
  if (!response.ok || body.success !== true) throw new ApiError(body.message || `请求失败（${response.status}）`, body.code);
  return body.content;
}
export const sendCode = mobile => request('account', '/api/client/auth/sendVcode', { mobile, type: 1 }, false);
export async function login(mobile, code) {
  const data = await request('account', '/api/client/auth/getTokenByVcode', { mobile, code }, false);
  const value = typeof data === 'string' ? data : data?.token || data?.accessToken;
  if (!value || typeof value !== 'string') throw new ApiError('登录接口未返回有效登录凭据，请重试');
  token = value; sessionStorage.setItem(storageKey, token);
}
export const userInfo = () => request('account', '/api/client/user/info');
export function timeline(circle, child, page, type) {
  const path = circle === 'family' ? '/api/client/home/timeline/page' : '/api/client/class/timeline/parent/page';
  return request('timeline', path, { studId: child.id, schoolId: child.schoolId, classId: child.classId, pageIndex: page, pageSize: 20, type });
}

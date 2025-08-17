// client/src/utils.js
// 공용 함수 모음 파일 - 중복과 유지보수를 위해
const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

/** 공통 API 호출 (간단판) */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', headers = {}, body, signal } = options;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const t = await res.text(); if (t) msg += `: ${t}`; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/** 챗봇 메시지 전송 */
export function sendChatMessage(messages, options = {}) {
  return apiFetch('/api/chat', { method: 'POST', body: { messages }, ...options });
}

/** 값이 빈 문자열이면 null로 */
export function n(v) { return v === '' ? null : v; }

/** 값이 빈 문자열/ null 이면 null, 숫자면 Number로 */
export function nNum(v) {
  if (v === '' || v == null) return null;
  const num = Number(v);
  return Number.isNaN(num) ? null : num;
}

/** 화면 상단에 잠깐 뜨는 토스트 알림 */
export function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = 'toast ' + (err ? 'toast-err' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 1800);
}
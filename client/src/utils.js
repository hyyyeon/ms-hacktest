// client/src/utils.js

const BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

/* 공통 fetch 유틸 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API 요청 실패: ${res.status}`);
  }

  return res.json();
}

/* ✅ Chat API: 올바른 형식으로 데이터 전송 */
export function sendChatMessage({ username, sessionId, message }, options = {}) {
  return apiFetch("/api/chat", {
    method: "POST",
    body: { username, sessionId, message },
    ...options,
  });
}

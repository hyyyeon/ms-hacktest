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

/* ========= 정책카드 파서 ========= */

/** ```policy { ... } ``` 또는 ~policy { ... } 블록에서 JSON만 추출 */
export function extractPolicyFromText(text = "") {
  if (!text) return null;
  try {
    // ```policy { ... }``` / ```json ~policy { ... }``` / ~policy { ... } 모두 대응
    const fence =
      text.match(/```(?:json)?\s*~?\s*policy\s*({[\s\S]*?})\s*```/i) ||
      text.match(/~?\s*policy\s*({[\s\S]*?})/i);

    if (!fence) return null;

    const jsonStr = fence[1]
      .replace(/[,]\s*}$/m, "}") // 꼬리 콤마 방지
      .trim();

    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("[extractPolicyFromText] parse fail:", e);
    return null;
  }
}

/** 사용자 질문에 섞여 들어간 템플릿/코드펜스 제거(화면 표시용) */
export function stripUserTemplate(text = "") {
  if (!text) return "";
  let out = text;

  // 1) ```policy ...``` 코드블록 제거
  out = out.replace(/```(?:json)?\s*~?\s*policy[\s\S]*?```/gi, "");

  // 2) "~policy { ... }" 단독 블록 제거
  out = out.replace(/~?\s*policy\s*{[\s\S]*?}\s*/gi, "");

  // 3) 안내문(“아래 JSON 포맷…”)부터 끝까지 제거
  out = out.replace(/아래\s*JSON\s*포맷[\s\S]*$/gi, "");

  return out.trim();
}

/** 어시스턴트 텍스트에서 policy 블록만 제거(카드로 뽑고 남는 설명 표시용) */
export function removePolicyBlock(text = "") {
  if (!text) return "";
  return text
    .replace(/```(?:json)?\s*~?\s*policy[\s\S]*?```/gi, "")
    .replace(/~?\s*policy\s*{[\s\S]*?}\s*/gi, "")
    .trim();
}

/** 히스토리 → 실시간 렌더와 동일하게 정규화 */
export function normalizeMessages(raw = []) {
  return raw.map((m) => {
    if (m.role === "assistant") {
      const policy = m.policy || extractPolicyFromText(m.text || "");
      const cleanText = policy ? removePolicyBlock(m.text || "") : (m.text || "");
      return { ...m, policy, text: cleanText };
    }
    // user
    return { ...m, text: stripUserTemplate(m.text || "") };
  });
}
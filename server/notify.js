// server/notify.js
const { sendMail } = require("./mailer");

/** 알림 메일 HTML 템플릿 */
function renderD7Html({ title, deadline, link }) {
  const safeTitle = title ?? "정책";
  const safeDeadline = deadline ?? "마감일 미정";
  const button = link
    ? `<a href="${link}" target="_blank" style="background:#2c7be5;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">신청하러 가기</a>`
    : `<span style="color:#999;">신청 링크 정보 없음</span>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#333;">
    <h2 style="color:#2c7be5;">📢 신청 마감 7일 전 알림</h2>
    <p><strong>${safeTitle}</strong>의 신청 마감일이 <strong>${safeDeadline}</strong>로 일주일 남았습니다.</p>
    <p>아래 버튼을 눌러 상세 내용을 확인하시고, 기한 내 신청을 완료하세요.</p>
    <p style="margin:24px 0;">${button}</p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
    <small style="color:#777;">
      본 메일은 복지랑 알림 서비스에 의해 자동 발송되었습니다.<br/>
      알림을 원치 않으시면 [즐겨찾기]에서 알림을 해제하세요.
    </small>
  </div>`.trim();
}

/** D-7 대상 조회 → 발송 → 중복표시 */
async function runD7Notifications(app) {
  const pool = app.get("db");
  const [rows] = await pool.query(`
    SELECT b.id, b.title, b.link,
           DATE_FORMAT(b.deadline, '%Y-%m-%d') AS deadline,
           u.email
    FROM bookmarks b
    JOIN users u ON u.id = b.user_id
    WHERE b.notification_enabled = 1
      AND b.deadline IS NOT NULL
      AND DATEDIFF(b.deadline, CURDATE()) = 7
      AND IFNULL(b.notified_d7, 0) = 0
      AND u.email IS NOT NULL AND u.email <> ''
  `);

  if (!rows.length) {
    console.log("[notify] 대상 없음");
    return { sent: 0 };
  }

  let sent = 0;
  for (const r of rows) {
    const subject = `신청 마감 7일 전: ${r.title}`;
    const html = renderD7Html({ title: r.title, deadline: r.deadline, link: r.link });

    try {
      await sendMail(r.email, subject, undefined, html);
      await pool.query("UPDATE bookmarks SET notified_d7 = 1 WHERE id = ?", [r.id]);
      sent++;
    } catch (e) {
      console.error("[notify] send failed:", r.id, e.message);
      // 실패 건은 플래그 그대로 두고 다음 주기에 재시도
    }
  }
  console.log(`[notify] sent ${sent}/${rows.length}`);
  return { sent };
}

module.exports = { runD7Notifications, renderD7Html };

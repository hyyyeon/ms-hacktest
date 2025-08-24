// server/routes/user.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { sendMail } = require("../mailer");

/* ───────── 공용: DB 풀 가져오기 ───────── */
function db(req) {
  const pool = req.app.get("db");
  if (!pool) throw new Error("MySQL pool not set");
  return pool;
}

/* ───────── SMTP 연결 점검 ─────────
 * GET /api/users/test-email/verify
 * - Gmail 앱 비밀번호 / 호스트 / 포트 설정이 맞는지 확인
 */
router.get("/test-email/verify", async (_req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,              // e.g. smtp.gmail.com
      port: Number(process.env.EMAIL_PORT || 587),
      secure: false,                             // 465면 true, 587이면 false
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const ok = await transporter.verify();       // SMTP 핸드셰이크 확인
    res.json({ ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ───────── 테스트 메일 발송 ─────────
 * POST /api/users/test-email
 * body: { to?, subject?, text?, html? }
 */
router.post("/test-email", async (req, res) => {
  try {
    const {
      to = process.env.EMAIL_USER,
      subject = "테스트 메일",
      text = "본문 텍스트",
html = `<div style="font-family:Arial,Helvetica,sans-serif; line-height:1.6; color:#333;">
   <h2 style="color:#2c7be5;">📢 신청 마감 7일 전 알림</h2>
   <p><strong>[정책명]</strong>의 신청 마감일이 <strong>[마감일]</strong>로 일주일 남았습니다.</p>
   <p>아래 버튼을 눌러 상세 내용을 확인하시고, 기한 내 신청을 완료하세요.</p>
   <p style="margin:24px 0;">
     <a href="[신청링크]" target="_blank"
        style="background:#2c7be5; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none;">
        신청하러 가기
     </a>
   </p>
   <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
   <small style="color:#777;">본 메일은 복지랑 알림 서비스에 의해 자동 발송되었습니다.<br/>
   알림을 원치 않으시면 [즐겨찾기]에서 알림을 해제하세요.</small>
 </div>`,    } = req.body || {};

    await sendMail(to, subject, text, html);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ───────── 회원가입 ─────────
 * POST /api/users/register
 * body: { username, email, password }
 *  - 현재는 빠른 연결을 위해 평문 저장 (실서비스는 bcrypt 권장)
 */
router.post("/register", async (req, res) => {
  try {
    const pool = db(req);
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ message: "모든 필드를 입력하세요." });
    }

    // 중복 검사
    const [dups] = await pool.query(
      "SELECT id FROM users WHERE username=? OR email=?",
      [username, email]
    );
    if (dups.length > 0) {
      return res
        .status(409)
        .json({ message: "이미 존재하는 아이디/이메일입니다." });
    }

    // 사용자 저장
    const [r] = await pool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );

    // (선택) 프로필 기본 행 생성
    await pool.query("INSERT INTO user_profiles (user_id) VALUES (?)", [
      r.insertId,
    ]);

    res.status(201).json({ id: r.insertId, username, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "register_failed", detail: e.message });
  }
});

/* ───────── 로그인 ─────────
 * POST /api/users/login
 * body: { usernameOrEmail, password }
 *  - 덤프가 평문 비밀번호라 우선 평문 비교 (실서비스는 bcrypt 비교 권장)
 */
router.post("/login", async (req, res) => {
  try {
    const pool = db(req);
    const { usernameOrEmail, password } = req.body || {};
    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({ message: "아이디/이메일과 비밀번호를 입력하세요." });
    }

    const [rows] = await pool.query(
      "SELECT id, username, email FROM users WHERE (username=? OR email=?) AND password=?",
      [usernameOrEmail, usernameOrEmail, password]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "로그인 실패(계정 없음 또는 비밀번호 불일치)" });
    }

    const user = rows[0];
    // 간단 버전: 토큰 없이 사용자 정보만 반환 → 프론트에서 localStorage 보관
    res.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "login_failed", detail: e.message });
  }
});

module.exports = router;

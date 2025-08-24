// server/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,         // smtp.gmail.com
  port: Number(process.env.EMAIL_PORT), // 587 -> 숫자로!
  secure: false,                        // 587은 STARTTLS니까 false
  auth: { user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS },
});

async function verifySMTP() {
  return transporter.verify();
}

async function sendMail(to, subject, text, html) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.EMAIL_USER,
    to, subject, text, html,
  });
  console.log("메일 발송 완료:", info.messageId);
  return info;
}

module.exports = { sendMail, verifySMTP };

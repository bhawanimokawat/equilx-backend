const crypto = require("node:crypto");
const nodemailer = require("nodemailer");

const env = require("../../../config/env");

const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashOtp(otp) {
  return crypto
    .createHmac("sha256", env.OTP_HASH_SECRET)
    .update(otp)
    .digest("hex");
}

function createMailTransport() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error("Email service is not configured");
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

async function sendVerificationOtp(email, otp) {
  const transporter = createMailTransport();

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: email,
    subject: "Verify your Equilx IELTS email",
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your Equilx IELTS verification code is:</p>
           <h2>${otp}</h2>
           <p>This code expires in 5 minutes. Do not share it with anyone.</p>`,
  });
}


async function sendPasswordResetEmail(email, token) {
  const transporter = createMailTransport();
  const resetUrl =
    `${env.FRONTEND_URL.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: email,
    subject: "Reset your Equilx IELTS password",
    text: `Use this link to reset your password: ${resetUrl}\nThis link expires in 15 minutes. If you did not request a reset, ignore this email.`,
    html: `
      <p>We received a request to reset your Equilx IELTS password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 15 minutes. If you did not request a reset, ignore this email.</p>
    `,
  });
}


module.exports = {
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  sendVerificationOtp,
  sendPasswordResetEmail
};


const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const { prisma } = require("../../../config/database");
const env = require("../../../config/env");

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function createTransport() {
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

// Create signed unsubscribe token.
function createUnsubscribeToken(userId) {
  const payload = `${userId}.${Date.now() + 365 * 24 * 60 * 60 * 1000}`;

  const signature = crypto
    .createHmac("sha256", env.OTP_HASH_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

// Verify unsubscribe token.
function verifyUnsubscribeToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");

    if (parts.length !== 3) return null;

    const [userId, expiresAt, receivedSignature] = parts;

    if (!userId || !expiresAt || !receivedSignature) return null;
    if (Number(expiresAt) < Date.now()) return null;

    const payload = `${userId}.${expiresAt}`;

    const expectedSignature = crypto
      .createHmac("sha256", env.OTP_HASH_SECRET)
      .update(payload)
      .digest("hex");

    const received = Buffer.from(receivedSignature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

// Update marketing email consent.
async function updateMarketingConsent(userId, enabled) {
  const now = new Date();

  return prisma.notificationPreference.upsert({
    where: { userId },

    create: {
      userId,
      marketingEmailEnabled: enabled,
      marketingEmailConsentAt: enabled ? now : null,
      marketingEmailUnsubscribedAt: enabled ? null : now,
    },

    update: {
      marketingEmailEnabled: enabled,
      marketingEmailConsentAt: enabled ? now : undefined,
      marketingEmailUnsubscribedAt: enabled ? null : now,
      lastMarketingEmailAt: enabled ? null : undefined,
    },

    select: {
      marketingEmailEnabled: true,
      marketingEmailConsentAt: true,
      marketingEmailUnsubscribedAt: true,
      lastMarketingEmailAt: true,
    },
  });
}

// Unsubscribe from marketing emails.
async function unsubscribeFromMarketing(token) {
  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    const error = new Error("Invalid or expired unsubscribe link.");
    error.statusCode = 400;
    error.code = "INVALID_UNSUBSCRIBE_TOKEN";
    throw error;
  }

  await prisma.notificationPreference.upsert({
    where: { userId },

    create: {
      userId,
      marketingEmailEnabled: false,
      marketingEmailUnsubscribedAt: new Date(),
    },

    update: {
      marketingEmailEnabled: false,
      marketingEmailUnsubscribedAt: new Date(),
    },
  });

  return true;
}

// Send promotional email.
async function sendPromotionalEmail(user) {
  const token = createUnsubscribeToken(user.id);

  const apiBaseUrl = (
    process.env.API_PUBLIC_URL || `http://localhost:${env.PORT}`
  ).replace(/\/+$/, "");

  const unsubscribeUrl =
    `${apiBaseUrl}/api/v1/marketing/unsubscribe?token=${encodeURIComponent(token)}`;

  // Correct frontend pricing URL.
  const frontendUrl = (env.FRONTEND_URL || "").replace(/\/+$/, "");
  const pricingUrl = `${frontendUrl}/pricing`;

  const transporter = createTransport();

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: user.email,

    subject: "Upgrade your IELTS preparation with Equilx Student Pro",

    text: [
      "Keep improving your IELTS preparation with Equilx Student Pro.",
      "Explore premium mock tests, practice and learning features.",
      `Explore Student Pro: ${pricingUrl}`,
      `Unsubscribe from promotional emails: ${unsubscribeUrl}`,
    ].join("\n\n"),

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#222">

        <h2>Take your IELTS preparation further!</h2>

        <p>Hello ${escapeHtml(user.profile?.name || "Student")},</p>

        <p>You're currently using the Equilx free plan.</p>

        <p>
          Upgrade to <strong>Student Pro</strong> to explore more
          IELTS preparation features.
        </p>

        <p>
          <a
            href="${escapeHtml(pricingUrl)}"
            style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px"
          >
            Explore Student Pro
          </a>
        </p>

        <hr />

        <p style="font-size:12px;color:#666">
          You received this email because you opted in to
          Equilx promotional emails.

          <a href="${escapeHtml(unsubscribeUrl)}">
            Unsubscribe
          </a>
        </p>

      </div>
    `,

    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
    },
  });
}

// Escape HTML values.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

// Process eligible promotional emails.
async function processPromotionalEmails() {
  const now = new Date();

  const sevenDaysAgo = new Date(
    now.getTime() - SEVEN_DAYS_MS
  );

  const preferences = await prisma.notificationPreference.findMany({
    where: {
      marketingEmailEnabled: true,
      marketingEmailUnsubscribedAt: null,

      OR: [
        {
          lastMarketingEmailAt: null,
          marketingEmailConsentAt: {
            lte: sevenDaysAgo,
          },
        },
        {
          lastMarketingEmailAt: {
            lte: sevenDaysAgo,
          },
        },
      ],

      user: {
        isActive: true,
        emailVerifiedAt: {
          not: null,
        },
      },
    },

    include: {
      user: {
        include: {
          profile: true,

          subscriptions: {
            where: {
              status: "ACTIVE",
              plan: {
                code: "STUDENT_PRO",
              },

              OR: [
                { startsAt: null },
                { startsAt: { lte: now } },
              ],

              AND: [
                {
                  OR: [
                    { endsAt: null },
                    { endsAt: { gt: now } },
                  ],
                },
              ],
            },

            select: {
              id: true,
            },
          },
        },
      },
    },

    take: 100,
  });

  let sent = 0;
  let failed = 0;

  for (const preference of preferences) {
    const user = preference.user;

    // Skip missing users.
    if (!user) {
  console.log("[Marketing] Skipped: User not found");
  continue;
}

console.log("[Marketing] User ID:", user.id);
console.log("[Marketing] Student Pro subscriptions:", user.subscriptions);

if (user.subscriptions.length > 0) {
  console.log("[Marketing] Skipped: Student Pro is active");
  continue;
}

    try {
      // Send promotional email.
      await sendPromotionalEmail(user);

      // Update last email timestamp after successful delivery.
      await prisma.notificationPreference.update({
        where: {
          userId: user.id,
        },

        data: {
          lastMarketingEmailAt: new Date(),
        },
      });

      sent += 1;

    } catch (error) {
      failed += 1;

      console.error(
        `Promotional email failed for user ${user.id}:`,
        error.stack
      );
    }
  }

  return {
    checked: preferences.length,
    sent,
    failed,
  };
}

module.exports = {
  updateMarketingConsent,
  unsubscribeFromMarketing,
  processPromotionalEmails,
};

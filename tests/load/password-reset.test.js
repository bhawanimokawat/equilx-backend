import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";
const MAILPIT_URL = __ENV.MAILPIT_URL || "http://localhost:8025";

http.setResponseCallback(http.expectedStatuses(200, 201, 401));




export const options = {
    scenarios: {
        password_reset_baseline: {
            executor: "per-vu-iterations",
            vus: 1,
            iterations: 1,
            maxDuration: "2m",
        },
    },
    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<3000"],
        checks: ["rate>0.99"],
    },
};

export default function () {
    const uniqueId = `${Date.now()}-${__VU}-${__ITER}`;
    const email = `reset-${uniqueId}@equilx.local`;
    const oldPassword = "EquilxLoadTest@2026";
    const newPassword = "EquilxResetTest@2026";

    const headers = {
        headers: { "Content-Type": "application/json" },
    };

    // 1. Register a fresh user.
    const register = http.post(
        `${BASE_URL}/api/v1/auth/register`,
        JSON.stringify({
            name: `Reset Test ${uniqueId}`,
            email,
            password: oldPassword,
        }),
        headers
    );

    check(register, {
        "registration returns 201": r => r.status === 201,
    });

    if (register.status !== 201) return;

    // 2. Retrieve email verification OTP.
    const inbox = http.get(`${MAILPIT_URL}/api/v1/messages`);

    if (inbox.status !== 200) return;

    const messages = inbox.json("messages") || [];
    const verificationMail = messages.find(msg =>
        msg.To?.some(to => to.Address?.toLowerCase() === email.toLowerCase())
    );

    check(null, {
        "verification email found": () => Boolean(verificationMail),
    });

    if (!verificationMail) return;

    const otpMatch = verificationMail.Snippet?.match(/\b\d{6}\b/);
    const otp = otpMatch ? otpMatch[0] : null;

    check(null, {
        "verification OTP extracted": () => Boolean(otp),
    });

    if (!otp) return;

    // 3. Verify email.
    const verify = http.post(
        `${BASE_URL}/api/v1/auth/verify-email`,
        JSON.stringify({ email, otp }),
        headers
    );

    check(verify, {
        "email verification succeeds": r => r.status === 200,
    });

    if (verify.status !== 200) return;

    // 4. Request password reset.
    const forgot = http.post(
        `${BASE_URL}/api/v1/auth/forgot-password`,
        JSON.stringify({ email }),
        headers
    );

    check(forgot, {
        "forgot password returns 200": r => r.status === 200,
        "forgot password succeeds": r => r.json("success") === true,
    });

    if (forgot.status !== 200) return;

    // 5. Find password reset email.
    const resetInbox = http.get(`${MAILPIT_URL}/api/v1/messages`);

    if (resetInbox.status !== 200) return;

    const resetMessages = resetInbox.json("messages") || [];

    const resetMail = resetMessages.find(msg =>
        msg.To?.some(to => to.Address?.toLowerCase() === email.toLowerCase()) &&
        msg.Subject === "Reset your Equilx IELTS password"
    );

    check(null, {
        "password reset email found": () => Boolean(resetMail),
    });

    if (!resetMail) return;

    // Fetch full email content because the message list snippet may be truncated.
    const detail = http.get(
        `${MAILPIT_URL}/api/v1/message/${resetMail.ID}`
    );

    check(detail, {
        "Mailpit message details return 200": r => r.status === 200,
    });

    if (detail.status !== 200) return;

    const emailText =
        detail.json("Text") ||
        detail.json("text") ||
        detail.json("Snippet") ||
        "";

    const tokenMatch = emailText.match(/[?&]token=([^\s&"'<>]+)/);
    const resetToken = tokenMatch
        ? decodeURIComponent(tokenMatch[1])
        : null;

    check(null, {
        "password reset token extracted": () => Boolean(resetToken),
    });

    if (!resetToken) {
        console.error("Password reset token not found in email.");
        return;
    }

    // 6. Reset password.
    const reset = http.post(
        `${BASE_URL}/api/v1/auth/reset-password`,
        JSON.stringify({
            token: resetToken,
            newPassword,
        }),
        headers
    );

    check(reset, {
        "password reset returns 200": r => r.status === 200,
        "password reset succeeds": r => r.json("success") === true,
    });

    if (reset.status !== 200) return;

    // 7. Confirm new password works.
    const login = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({
            email,
            password: newPassword,
        }),
        headers
    );

    check(login, {
        "login with new password returns 200": r => r.status === 200,
        "new password login succeeds": r => r.json("success") === true,
        "access token issued": r => Boolean(r.json("data.accessToken")),
    });

    // 8. Confirm old password no longer works.
    const oldLogin = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({
            email,
            password: oldPassword,
        }),
        headers
    );

    check(oldLogin, {
        "old password is rejected": r => r.status === 401,
    });
}

export function handleSummary(data) {
    return {
        "tests/load/results/password-reset-summary.json":
            JSON.stringify(data, null, 2),
    };
}

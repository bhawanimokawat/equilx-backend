
import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";
const MAILPIT_URL = __ENV.MAILPIT_URL || "http://localhost:8025";

http.setResponseCallback(http.expectedStatuses(200, 202, 400, 429));

export const options = {
    scenarios: {
        staff_2fa_baseline: {
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
    const email = __ENV.STAFF_EMAIL;
    const password = __ENV.STAFF_PASSWORD;

    if (!email || !password) {
        throw new Error("STAFF_EMAIL or STAFF_PASSWORD is missing.");
    }

    // 1. Staff password login
    const loginResponse = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password }),
        { headers: { "Content-Type": "application/json" } }
    );

    check(loginResponse, {
        "staff login returns 202": r => r.status === 202,
        "2FA is required": r => r.json("data.twoFactorRequired") === true,
        "challenge ID received": r => Boolean(r.json("data.challengeId")),
        "access token not issued before OTP": r =>
            !r.json("data.accessToken"),
    });

    if (loginResponse.status !== 202) {
        console.error(`Staff login failed: HTTP ${loginResponse.status}`);
         console.error(`API error: ${loginResponse.body}`);
        return;
    }

    
    const challengeId = loginResponse.json("data.challengeId");

    // 2. Retrieve the staff login OTP from Mailpit
    const inboxResponse = http.get(`${MAILPIT_URL}/api/v1/messages`);

    check(inboxResponse, {
        "Mailpit inbox returns 200": r => r.status === 200,
    });

    if (inboxResponse.status !== 200) return;

    const messages = inboxResponse.json("messages") || [];

    const message = messages.find(msg =>
        msg.To?.some(recipient =>
            recipient.Address?.toLowerCase() === email.toLowerCase()
        ) &&
        msg.Subject === "Equilx IELTS login verification code"
    );

    check(null, {
        "staff login OTP email found": () => Boolean(message),
    });

    if (!message) {
        console.error("Staff login OTP email not found.");
        return;
    }

    const otpMatch = message.Snippet?.match(/\b\d{6}\b/);
    const otp = otpMatch ? otpMatch[0] : null;

    check(null, {
        "six-digit staff OTP extracted": () => Boolean(otp),
    });

    if (!otp) {
        console.error("Could not extract staff OTP.");
        return;
    }

    // 3. Verify staff OTP
    const verifyResponse = http.post(
        `${BASE_URL}/api/v1/auth/verify-login-otp`,
        JSON.stringify({ challengeId, otp }),
        { headers: { "Content-Type": "application/json" } }
    );

    check(verifyResponse, {
        "staff OTP verification returns 200": r => r.status === 200,
        "staff login succeeds": r => r.json("success") === true,
        "access token issued after OTP": r =>
            Boolean(r.json("data.accessToken")),
        "refresh cookie issued after OTP": r =>
            String(r.headers["Set-Cookie"] || "")
                .includes("equilx_refresh="),
    });

    if (verifyResponse.status !== 200) {
        console.error(`Staff OTP verification failed: HTTP ${verifyResponse.status}`);
        return;
    }

    // 4. Verify authenticated staff session
    const accessToken = verifyResponse.json("data.accessToken");

    const meResponse = http.get(
        `${BASE_URL}/api/v1/auth/me`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    check(meResponse, {
        "authenticated staff profile returns 200": r => r.status === 200,
        "authenticated profile succeeds": r => r.json("success") === true,
    });
}

export function handleSummary(data) {
    return {
        "tests/load/results/staff-2fa-summary.json":
            JSON.stringify(data, null, 2),
    };
}

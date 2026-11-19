
import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";
const MAILPIT_URL = __ENV.MAILPIT_URL || "http://localhost:8025";

export const options = {
    scenarios: {
        email_otp_verification: {
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
    const email = `otp-${uniqueId}@equilx.local`;

    // 1. Register a fresh user.
    const registerResponse = http.post(
        `${BASE_URL}/api/v1/auth/register`,
        JSON.stringify({
            name: `OTP Test User ${uniqueId}`,
            email,
            password: "EquilxLoadTest@2026",
        }),
        {
            headers: { "Content-Type": "application/json" },
        }
    );

    check(registerResponse, {
        "registration returns 201": r => r.status === 201,
        "registration succeeds": r => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
    });

    console.log("Generated test email:", email);
    console.log("Registration status:", registerResponse.status);
    console.log("Registration response:", registerResponse.body);
    if (registerResponse.status !== 201) {
        console.error(`Registration failed: ${registerResponse.status}`);
        return;
    }

    // 2. Retrieve the email from Mailpit.
    const inboxResponse = http.get(`${MAILPIT_URL}/api/v1/messages`);

    check(inboxResponse, {
        "Mailpit inbox returns 200": r => r.status === 200,
    });

    if (inboxResponse.status !== 200) {
        return;
    }

    const messages = inboxResponse.json("messages") || [];

    const message = messages.find(msg =>
        msg.To?.some(recipient => recipient.Address === email)
    );

    check(null, {
        "verification email found": () => Boolean(message),
    });

    if (!message) {
        console.error(`Verification email not found for ${email}`);
        return;
    }

    // 3. Extract the six-digit OTP from the email snippet.
    const otpMatch = message.Snippet.match(/\b\d{6}\b/);
    const otp = otpMatch ? otpMatch[0] : null;

    check(null, {
        "six-digit OTP extracted": () => Boolean(otp),
    });

    if (!otp) {
        console.error("OTP could not be extracted.");
        return;
    }

    // 4. Verify the email.
    const verifyResponse = http.post(
        `${BASE_URL}/api/v1/auth/verify-email`,
        JSON.stringify({ email, otp }),
        {
            headers: { "Content-Type": "application/json" },
        }
    );

    check(verifyResponse, {
        "email verification returns 200": r => r.status === 200,
        "email verification succeeds": r => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
    });

    if (verifyResponse.status !== 200) {
        console.error(`OTP verification failed: ${verifyResponse.status} ${verifyResponse.body}`);
    }
}

export function handleSummary(data) {
    return {
        "tests/load/results/email-otp-summary.json":
            JSON.stringify(data, null, 2),
    };
}

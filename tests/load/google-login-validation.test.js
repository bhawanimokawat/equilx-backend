import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";

http.setResponseCallback(http.expectedStatuses(200, 400, 401));

export const options = {
    scenarios: {
        google_login_validation: {
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
    const url = `${BASE_URL}/api/v1/auth/google`;
    const headers = { "Content-Type": "application/json" };

    // 1. Missing ID token
    const missingToken = http.post(
        url,
        JSON.stringify({}),
        { headers }
    );

    check(missingToken, {
        "missing token returns 400": r => r.status === 400,
    });

    // 2. Empty ID token
    const emptyToken = http.post(
        url,
        JSON.stringify({ idToken: "" }),
        { headers }
    );

    check(emptyToken, {
        "empty token returns 400": r => r.status === 400,
    });

    // 3. Invalid Google ID token
    const invalidToken = http.post(
        url,
        JSON.stringify({ idToken: "invalid.google.id.token" }),
        { headers }
    );

    check(invalidToken, {
        "invalid Google token returns 401": r => r.status === 401,
    });

    // 4. Oversized ID token
    const oversizedToken = http.post(
        url,
        JSON.stringify({ idToken: "a".repeat(10001) }),
        { headers }
    );

    check(oversizedToken, {
        "oversized token returns 400": r => r.status === 400,
    });
}

export function handleSummary(data) {
    return {
        "tests/load/results/google-login-validation-summary.json":
            JSON.stringify(data, null, 2),
    };
}


import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";

http.setResponseCallback(http.expectedStatuses(200, 401));

export const options = {
    scenarios: {
        logout_baseline: {
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
    const email = __ENV.TEST_EMAIL;
    const password = __ENV.TEST_PASSWORD;

    if (!email || !password) {
        throw new Error("TEST_EMAIL and TEST_PASSWORD are required.");
    }

    // 1. Login and receive refresh cookie.
    const loginResponse = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password }),
        { headers: { "Content-Type": "application/json" } }
    );

    check(loginResponse, {
        "login returns 200": r => r.status === 200,
        "login succeeds": r => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
        "refresh cookie received": r =>
            String(r.headers["Set-Cookie"] || "")
                .includes("equilx_refresh="),
    });

    if (loginResponse.status !== 200) {
        console.error(`Login failed: ${loginResponse.status}`);
        return;
    }

    // 2. Logout and revoke refresh token.
    const logoutResponse = http.post(
        `${BASE_URL}/api/v1/auth/logout`,
        null
    );

    check(logoutResponse, {
        "logout returns 200": r => r.status === 200,
        "logout succeeds": r => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
        "refresh cookie cleared": r =>
            String(r.headers["Set-Cookie"] || "")
                .includes("equilx_refresh="),
    });

    if (logoutResponse.status !== 200) {
        console.error(`Logout failed: ${logoutResponse.status}`);
        return;
    }

    // 3. Refresh after logout must fail.
    const refreshResponse = http.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        null
    );

    check(refreshResponse, {
        "refresh after logout is rejected": r => r.status === 401,
    });

    if (refreshResponse.status !== 401) {
        console.error(
            `Unexpected refresh-after-logout status: ${refreshResponse.status}`
        );
    }
}

export function handleSummary(data) {
    return {
        "tests/load/results/logout-summary.json":
            JSON.stringify(data, null, 2),
    };
}

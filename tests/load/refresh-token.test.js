
import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";

export const options = {
    scenarios: {
        refresh_token_baseline: {
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

    // 1. Login and receive the refresh cookie.
    const loginResponse = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password }),
        {
            headers: { "Content-Type": "application/json" },
        }
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
        "access token received": r => {
            try {
                return Boolean(r.json("data.accessToken"));
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
    console.error(`API error: ${loginResponse.body}`);
    return;
}
    // k6 automatically retains the login cookie in this VU's cookie jar.

    // 2. Refresh the access token.
    const refreshResponse = http.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        null
    );

    check(refreshResponse, {
        "refresh returns 200": r => r.status === 200,
        "refresh succeeds": r => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
        "new access token received": r => {
            try {
                return Boolean(r.json("data.accessToken"));
            } catch {
                return false;
            }
        },
        "new refresh cookie received": r =>
            String(r.headers["Set-Cookie"] || "")
                .includes("equilx_refresh="),
    });

    if (refreshResponse.status !== 200) {
        console.error(`Refresh failed: ${refreshResponse.status}`);
        return;
    }

    // 3. Refresh again using the rotated cookie.
    const secondRefreshResponse = http.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        null
    );

    check(secondRefreshResponse, {
        "rotated refresh token works": r => r.status === 200,
        "second access token received": r => {
            try {
                return Boolean(r.json("data.accessToken"));
            } catch {
                return false;
            }
        },
    });

    if (secondRefreshResponse.status !== 200) {
        console.error(
            `Second refresh failed: ${secondRefreshResponse.status}`
        );
    }
}

export function handleSummary(data) {
    return {
        "tests/load/results/refresh-token-summary.json":
            JSON.stringify(data, null, 2),
    };
}

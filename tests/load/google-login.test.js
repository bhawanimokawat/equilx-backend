import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";

http.setResponseCallback(http.expectedStatuses(200, 401, 429));

export const options = {
    scenarios: {
        google_login_baseline: {
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
    const idToken = __ENV.GOOGLE_ID_TOKEN;

    if (!idToken) {
        throw new Error("GOOGLE_ID_TOKEN environment variable is required.");
    }

    const response = http.post(
        `${BASE_URL}/api/v1/auth/google`,
        JSON.stringify({ idToken }),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    check(response, {
        "Google login returns 200": r => r.status === 200,
        "Google login succeeds": r => {
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
        "Google user status returned": r => {
            try {
                return typeof r.json("data.isNewUser") === "boolean";
            } catch {
                return false;
            }
        },
        "user email returned": r => {
            try {
                return Boolean(r.json("data.user.email"));
            } catch {
                return false;
            }
        },
        "refresh cookie received": r =>
            String(r.headers["Set-Cookie"] || "").includes("equilx_refresh="),
    });
}

export function handleSummary(data) {
    return {
        "tests/load/results/google-login-summary.json":
            JSON.stringify(data, null, 2),
    };
}

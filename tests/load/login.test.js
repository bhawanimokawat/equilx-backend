import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const EMAIL = __ENV.TEST_EMAIL;
const PASSWORD = __ENV.TEST_PASSWORD;

export const options = {
    scenarios: {
        login_baseline: {
            executor: "per-vu-iterations",
            vus: 1,
            iterations: 3,
            maxDuration: "2m",
        },
    },

    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<2000"],
        checks: ["rate>0.99"],
    },
};

export default function () {
    if (!EMAIL || !PASSWORD) {
        throw new Error("TEST_EMAIL or TEST_PASSWORD environment variable is missing.");
    }

    const payload = JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
    });

    const response = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        payload,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    check(response, {
        "login returns 200": (r) => r.status === 200,
        "success is true": (r) => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
        "access token exists": (r) => {
            try {
                return Boolean(r.json("data.accessToken"));
            } catch {
                return false;
            }
        },
    });

    if (response.status !== 200) {
        console.error(`LOGIN FAILED: status=${response.status}`);
    }

    sleep(2);
}

export function handleSummary(data) {
    return {
        "tests/load/results/login-summary.json": JSON.stringify(data, null, 2),
    };
}

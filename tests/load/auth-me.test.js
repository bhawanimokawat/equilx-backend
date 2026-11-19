
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN;

export const options = {
    scenarios: {
        auth_me_baseline: {
            executor: "constant-vus",
            vus: 5,
            duration: "30s",
        },
    },

    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<500"],
        checks: ["rate>0.99"],
    },
};

export default function () {
    if (!ACCESS_TOKEN) {
        throw new Error("ACCESS_TOKEN environment variable is missing.");
    }

    const response = http.get(`${BASE_URL}/api/v1/auth/me`, {
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
    });

    check(response, {
        "status is 200": (r) => r.status === 200,
        "success is true": (r) => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
        "user data exists": (r) => {
            try {
                return Boolean(r.json("data"));
            } catch {
                return false;
            }
        },
    });

    if (response.status !== 200) {
        console.error(`FAILED REQUEST: status=${response.status}`);
    }

    sleep(3);
}

export function handleSummary(data) {
    return {
        "tests/load/results/auth-me-summary.json": JSON.stringify(data, null, 2),
    };
}

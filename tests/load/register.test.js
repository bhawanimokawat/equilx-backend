
import http from "k6/http";
import { check } from "k6";
import exec from "k6/execution";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";

export const options = {
    scenarios: {
        registration_baseline: {
            executor: "per-vu-iterations",
            vus: 5,
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
    const uniqueId = `${Date.now()}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`;

    const payload = JSON.stringify({
        name: `Load Test User ${uniqueId}`,
        email: `load-${uniqueId}@equilx.local`,
        password: "EquilxLoadTest@2026",
    });

    const response = http.post(
        `${BASE_URL}/api/v1/auth/register`,
        payload,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    check(response, {
        "registration returns 201": (r) => r.status === 201,

        "success is true": (r) => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },

        "created user exists": (r) => {
            try {
                return Boolean(r.json("data.user.id"));
            } catch {
                return false;
            }
        },

        "email verification is required": (r) => {
            try {
                return r.json("data.verificationRequired") === true;
            } catch {
                return false;
            }
        },

        "password hash is not exposed": (r) => {
            try {
                return !r.json("data.user.passwordHash");
            } catch {
                return false;
            }
        },
    });

    if (response.status !== 201) {
        console.error(
            `Registration failed: ${response.status} ${response.body}`
        );
    }
}

export function handleSummary(data) {
    return {
        "tests/load/results/register-summary.json":
            JSON.stringify(data, null, 2),
    };
}

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

export const options = {
    scenarios: {
        baseline: {
            executor: "constant-vus",
            vus: 10,
            duration: "1m",
        },
    },

    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<500"],
        checks: ["rate>0.99"],
    },
};

export default function () {
    const response = http.get(`${BASE_URL}/api/v1/health`);

    check(response, {
        "status is 200": (r) => r.status === 200,
        "success is true": (r) => {
            try {
                return r.json("success") === true;
            } catch {
                return false;
            }
        },
    });

    if (response.status !== 200) {
    console.error(
        `FAILED REQUEST: status=${response.status}, body=${response.body}`
    );
}

    sleep(3);
}

export function handleSummary(data) {
    return {
        "tests/load/results/baseline-summary.json": JSON.stringify(data, null, 2),
    };
}
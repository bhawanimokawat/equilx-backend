
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

http.setResponseCallback(http.expectedStatuses(200, 400));

export const options = {
    scenarios: {
    registration_validation: {
        executor: "per-vu-iterations",
        vus: 1,
        iterations: 5,
        maxDuration: "2m",
    },
},
    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<500"],
        checks: ["rate>0.99"],
        
    },
};

export default function () {
    const payload = JSON.stringify({
        name: "",
        email: "invalid-email",
        password: "short",
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
        "invalid registration returns 400": (r) => r.status === 400,
        "success is false": (r) => {
            try {
                return r.json("success") === false;
            } catch {
                return false;
            }
        },
        "validation error is returned": (r) => {
            try {
                return r.json("code") === "VALIDATION_ERROR";
            } catch {
                return false;
            }
        },
    });

    console.log(`Registration response: ${response.status}`);

    sleep(1);
}



export function handleSummary(data) {
    return {
        "tests/load/results/register-validation-summary.json":
            JSON.stringify(data, null, 2),
    };
}

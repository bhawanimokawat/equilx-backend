import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

export const options = {
    vus: 1,
    iterations: 10,
    thresholds: {
        http_req_failed: ["rate==0"],
        http_req_duration: ["p(95)<1000"],
        checks: ["rate==1"],
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
        "health message is correct": (r) => {
            try {
                return r.json("message") === "Equilx IELTS API is running";
            } catch {
                return false;
            }
        },
    });

    sleep(1);
}

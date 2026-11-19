import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5001";

http.setResponseCallback(http.expectedStatuses(200, 401));

export const options = {
    scenarios: {
        change_password_baseline: {
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
    const oldPassword = __ENV.TEST_PASSWORD;
    const newPassword = "EquilxChangedPass3@2026";

    if (!email || !oldPassword) {
        throw new Error("Set TEST_EMAIL and TEST_PASSWORD before running.");
    }

    const headers = {
        headers: { "Content-Type": "application/json" },
    };

    // 1. Login with the current password.
    const login = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password: oldPassword }),
        headers
    );

    check(login, {
        "login succeeds": r => r.status === 200,
        "access token is issued": r => Boolean(r.json("data.accessToken")),
    });

    console.log("Login status:", login.status);

    if (login.status !== 200) return;

    const accessToken = login.json("data.accessToken");

   const jwtPayload = JSON.parse(
    encoding.b64decode(accessToken.split(".")[1], "rawurl", "s")
);

console.log("JWT tokenVersion:", jwtPayload.tokenVersion);
    const authenticatedHeaders = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    };

    // 2. Change password.
    const change = http.patch(
        `${BASE_URL}/api/v1/auth/change-password`,
        JSON.stringify({
            currentPassword: oldPassword,
            newPassword,
        }),
        authenticatedHeaders
    );

    check(change, {
        "change password returns 200": r => r.status === 200,
        "change password succeeds": r => r.json("success") === true,
    });

    console.log("Change password status:", change.status);
    console.log("Change password response:", change.body);
    if (change.status !== 200) return;

    // 3. Old password must be rejected.
    const oldLogin = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password: oldPassword }),
        headers
    );

    check(oldLogin, {
        "old password is rejected": r => r.status === 401,
    });

    // 4. New password must work.
    const newLogin = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password: newPassword }),
        headers
    );

    check(newLogin, {
        "new password login succeeds": r => r.status === 200,
        "new access token is issued": r => Boolean(r.json("data.accessToken")),
    });

    // 5. Existing access token should no longer authorize requests
    // if change-password revokes existing sessions/tokens.
    const oldSession = http.get(
        `${BASE_URL}/api/v1/auth/me`,
        authenticatedHeaders
    );

    check(oldSession, {
        "old access token is rejected after password change": r =>
            r.status === 401,
    });
}

export function handleSummary(data) {
    return {
        "tests/load/results/change-password-summary.json":
            JSON.stringify(data, null, 2),
    };
}

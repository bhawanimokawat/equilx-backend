
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { randomUUID } = require("node:crypto");

// --------------------------------------------------
// 1. Load and verify TEST environment before imports
// --------------------------------------------------

const testEnvPath = path.resolve(__dirname, "../../.env.test");

if (!fs.existsSync(testEnvPath)) {
    throw new Error(".env.test was not found. Auth API tests stopped.");
}

const testEnv = dotenv.parse(fs.readFileSync(testEnvPath));

Object.assign(process.env, testEnv);
process.env.NODE_ENV = "test";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from .env.test");
}

const databaseName = decodeURIComponent(
    new URL(process.env.DATABASE_URL).pathname.replace(/^\/+/, "")
);

if (databaseName !== "equilx_ielts_test") {
    throw new Error(
        `Unsafe test database: "${databaseName}". Expected "equilx_ielts_test".`
    );
}

// --------------------------------------------------
// 2. Mock Nodemailer before importing the application
// --------------------------------------------------

const sentEmails = [];

const originalCreateTransport = nodemailer.createTransport;

nodemailer.createTransport = () => ({
    sendMail: async (mail) => {
        sentEmails.push(mail);

        return {
            messageId: "test-message-id",
            accepted: [mail.to],
            rejected: [],
        };
    },
});



// --------------------------------------------------
// 3. Mock Google OAuth verification
// --------------------------------------------------

const { OAuth2Client } = require("google-auth-library");

let googleTokenPayload = null;
let googleVerificationError = null;

const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;

OAuth2Client.prototype.verifyIdToken = async () => {
    if (googleVerificationError) {
        throw googleVerificationError;
    }

    return {
        getPayload: () => googleTokenPayload,
    };
};
 

test("New Google user can register and log in successfully", async () => {
    const email = createTestEmail("google-new");

    const idToken = createGoogleToken({
        sub: `google-${Date.now()}`,
        email: email.toUpperCase(),
        email_verified: true,
        name: "Google Test User",
        picture: "https://example.com/google-avatar.jpg",
    });

    const response = await post("/api/v1/auth/google", {
        idToken,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.isNewUser, true);
    assert.ok(response.body.data.accessToken);

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            email: true,
            emailVerifiedAt: true,
            passwordHash: true,
            profile: {
                select: {
                    name: true,
                    avatarUrl: true,
                },
            },
        },
    });

    assert.ok(user);
    assert.ok(user.emailVerifiedAt);
    assert.equal(user.passwordHash, null);
    assert.equal(user.profile.name, "Google Test User");
    assert.equal(
        user.profile.avatarUrl,
        "https://example.com/google-avatar.jpg"
    );

        const identity = await prisma.authIdentity.findFirst({
        where: {
            provider: "GOOGLE",
            user: {
                email,
            },
        },
    });

    assert.ok(identity);
});


// --------------------------------------------------
// 3. Import application and Prisma after test setup
// --------------------------------------------------

const request = require("supertest");
const app = require("../../src/app");
const { prisma } = require("../../src/config/database");

const createdEmails = [];
const runId = randomUUID().replace(/-/g, "");

let requestCounter = 0;

// Isolate rate-limit requests during this API test suite.
app.set("trust proxy", 1);

function nextRequest() {
    requestCounter += 1;

    return request(app);
}

function post(url, body) {
    return nextRequest()
        .post(url)
        .set("X-Forwarded-For", `198.51.100.${requestCounter}`)
        .send(body);
}

function get(url, accessToken) {
    let req = nextRequest()
        .get(url)
        .set("X-Forwarded-For", `198.51.100.${requestCounter}`);

    if (accessToken) {
        req = req.set("Authorization", `Bearer ${accessToken}`);
    }

    return req;
}

function patch(url, accessToken, body) {
    return nextRequest()
        .patch(url)
        .set("X-Forwarded-For", `198.51.100.${requestCounter}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(body);
}


function createGoogleToken(profile) {
    googleTokenPayload = profile;
    googleVerificationError = null;

    return "mock-google-id-token";
}
// --------------------------------------------------
// 4. Test helpers
// --------------------------------------------------



function createTestEmail(label) {
    const email = `${label}-${runId}@example.com`;
    createdEmails.push(email);
    return email;
}

function getMail(email, subject) {
    return [...sentEmails]
        .reverse()
        .find(
            (mail) =>
                mail.to === email &&
                mail.subject === subject
        );
}

function extractOtp(email, subject) {
    const mail = getMail(email, subject);

    assert.ok(mail, `Expected email "${subject}" was not captured`);

    const match = mail.text.match(/\b(\d{6})\b/);

    assert.ok(match, "OTP was not found in captured email");

    return match[1];
}

function extractResetToken(email) {
    const mail = getMail(
        email,
        "Reset your Equilx IELTS password"
    );

    assert.ok(mail, "Password reset email was not captured");

    const match = mail.text.match(/[?&]token=([^\s&]+)/);

    assert.ok(match, "Password reset token was not found");

    return decodeURIComponent(match[1]);
}

function getAccessToken(response) {
    const payload = response.body.data || response.body;

    assert.ok(
        payload.accessToken,
        "Access token was missing from response"
    );

    return payload.accessToken;
}

function getRefreshCookie(response) {
    const cookies = response.headers["set-cookie"] || [];

    const refreshCookie = cookies.find((cookie) =>
        cookie.startsWith("equilx_refresh=")
    );

    assert.ok(refreshCookie, "Refresh cookie was not returned");

    return refreshCookie.split(";")[0];
}

async function registerUser(email, password = "StrongPass123!") {
    const response = await post("/api/v1/auth/register", {
        name: "Auth API Test User",
        email,
        password,
    });

    assert.equal(response.status, 201);

    return response;
}

async function registerAndVerify(email) {
    await registerUser(email);

    const otp = extractOtp(
        email,
        "Verify your Equilx IELTS email"
    );

    const verificationResponse = await post(
        "/api/v1/auth/verify-email",
        { email, otp }
    );

    assert.equal(verificationResponse.status, 200);

    return email;
}

async function loginUser(email, password = "StrongPass123!") {
    return post("/api/v1/auth/login", {
        email,
        password,
    });
}

// --------------------------------------------------
// 5. Registration and email verification
// --------------------------------------------------

test("Registration creates user and verification token", async () => {
    const email = createTestEmail("register");

    const response = await registerUser(email);

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            emailVerificationTokens: true,
        },
    });

    assert.ok(user);
    assert.equal(user.emailVerifiedAt, null);
    assert.equal(user.emailVerificationTokens.length, 1);

    const otp = extractOtp(
        email,
        "Verify your Equilx IELTS email"
    );

    const verificationResponse = await post(
        "/api/v1/auth/verify-email",
        { email, otp }
    );

    assert.equal(verificationResponse.status, 200);

    const updatedUser = await prisma.user.findUnique({
        where: { email },
    });

    assert.ok(updatedUser.emailVerifiedAt);
});

test("Duplicate registration is rejected", async () => {
    const email = createTestEmail("duplicate");

    await registerAndVerify(email);

    const response = await post("/api/v1/auth/register", {
        name: "Duplicate User",
        email,
        password: "StrongPass123!",
    });

    assert.equal(response.status, 409);
});

// --------------------------------------------------
// 6. Login
// --------------------------------------------------

test("Unverified user cannot log in", async () => {
    const email = createTestEmail("unverified");

    await registerUser(email);

    const response = await loginUser(email);

    assert.equal(response.status, 403);
});

test("Login rejects incorrect password", async () => {
    const email = createTestEmail("wrongpassword");

    await registerAndVerify(email);

    const response = await loginUser(
        email,
        "IncorrectPass123!"
    );

    assert.equal(response.status, 401);
});

test("Verified user can log in and access /me", async () => {
    const email = createTestEmail("login");

    await registerAndVerify(email);

    const response = await loginUser(email);

    assert.equal(response.status, 200);

    const accessToken = getAccessToken(response);

    assert.ok(getRefreshCookie(response));

    const meResponse = await get(
        "/api/v1/auth/me",
        accessToken
    );

    assert.equal(meResponse.status, 200);

    const payload = meResponse.body.data || meResponse.body;
    const user = payload.user || payload;

    assert.equal(user.email, email);
});

// --------------------------------------------------
// 7. Refresh-token rotation
// --------------------------------------------------

test("Refresh rotates the refresh token", async () => {
    const email = createTestEmail("refresh");

    await registerAndVerify(email);

    const loginResponse = await loginUser(email);

    assert.equal(loginResponse.status, 200);

    const oldCookie = getRefreshCookie(loginResponse);

    const refreshResponse = await nextRequest()
        .post("/api/v1/auth/refresh")
        .set("Cookie", oldCookie);

    assert.equal(refreshResponse.status, 200);

    getAccessToken(refreshResponse);

    const newCookie = getRefreshCookie(refreshResponse);

    assert.notEqual(newCookie, oldCookie);

    // Reusing the old refresh token must fail.
    const reuseResponse = await nextRequest()
        .post("/api/v1/auth/refresh")
        .set("Cookie", oldCookie);

    assert.equal(reuseResponse.status, 401);
});

// --------------------------------------------------
// 8. Logout
// --------------------------------------------------

test("Logout revokes the refresh-token session", async () => {
    const email = createTestEmail("logout");

    await registerAndVerify(email);

    const loginResponse = await loginUser(email);

    assert.equal(loginResponse.status, 200);

    const cookie = getRefreshCookie(loginResponse);

    const logoutResponse = await nextRequest()
        .post("/api/v1/auth/logout")
        .set("Cookie", cookie);

    assert.equal(logoutResponse.status, 200);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    const sessions = await prisma.refreshToken.findMany({
        where: { userId: user.id },
    });

    assert.ok(sessions.length > 0);

    assert.ok(
        sessions.every((session) => session.revokedAt !== null),
        "All refresh-token sessions should be revoked"
    );
});

// --------------------------------------------------
// 9. Password reset
// --------------------------------------------------

test("Password reset changes password and revokes sessions", async () => {
    const email = createTestEmail("reset");

    await registerAndVerify(email);

    const loginResponse = await loginUser(email);

    assert.equal(loginResponse.status, 200);

    const resetRequestResponse = await post(
        "/api/v1/auth/forgot-password",
        { email }
    );

    assert.equal(resetRequestResponse.status, 200);

    const resetToken = extractResetToken(email);

    const newPassword = "NewStrongPass456!";

    const resetResponse = await post(
        "/api/v1/auth/reset-password",
        {
            token: resetToken,
            newPassword,
        }
    );

    assert.equal(resetResponse.status, 200);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    const sessions = await prisma.refreshToken.findMany({
        where: { userId: user.id },
    });

    assert.ok(
        sessions.every((session) => session.revokedAt !== null),
        "Password reset should revoke existing sessions"
    );

    const oldPasswordResponse = await loginUser(email);

    assert.equal(oldPasswordResponse.status, 401);

    const newPasswordResponse = await loginUser(
        email,
        newPassword
    );

    assert.equal(newPasswordResponse.status, 200);
});

// --------------------------------------------------
// 10. Change password
// --------------------------------------------------

test("Authenticated user can change password", async () => {
    const email = createTestEmail("change");

    await registerAndVerify(email);

    const loginResponse = await loginUser(email);

    assert.equal(loginResponse.status, 200);

    const accessToken = getAccessToken(loginResponse);

    const newPassword = "ChangedStrong789!";

    const changeResponse = await patch(
        "/api/v1/auth/change-password",
        accessToken,
        {
            currentPassword: "StrongPass123!",
            newPassword,
        }
    );

    assert.equal(changeResponse.status, 200);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    const sessions = await prisma.refreshToken.findMany({
        where: { userId: user.id },
    });

    assert.ok(
        sessions.every((session) => session.revokedAt !== null),
        "Changing password should revoke existing sessions"
    );

    const oldPasswordResponse = await loginUser(email);

    assert.equal(oldPasswordResponse.status, 401);

    const newPasswordResponse = await loginUser(
        email,
        newPassword
    );

    assert.equal(newPasswordResponse.status, 200);
});

// --------------------------------------------------
// 11. Authentication protection
// --------------------------------------------------

test("GET /me rejects requests without access token", async () => {
    const response = await get("/api/v1/auth/me");

    assert.equal(response.status, 401);
});

test("Change password rejects unauthenticated requests", async () => {
    const response = await nextRequest()
        .patch("/api/v1/auth/change-password")
        .send({
            currentPassword: "StrongPass123!",
            newPassword: "ChangedStrong789!",
        });

    assert.equal(response.status, 401);
});



// --------------------------------------------------
// 12. Email OTP security
// --------------------------------------------------

test("Expired email verification OTP is rejected", async () => {
    const email = createTestEmail("expiredotp");

    await registerUser(email);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id },
        data: {
            expiresAt: new Date(Date.now() - 60_000),
        },
    });

    const otp = extractOtp(
        email,
        "Verify your Equilx IELTS email"
    );

    const response = await post(
        "/api/v1/auth/verify-email",
        { email, otp }
    );

    assert.equal(response.status, 400);
});

test("Email verification OTP cannot be reused", async () => {
    const email = createTestEmail("reuseotp");

    await registerUser(email);

    const otp = extractOtp(
        email,
        "Verify your Equilx IELTS email"
    );

    const firstResponse = await post(
        "/api/v1/auth/verify-email",
        { email, otp }
    );

    assert.equal(firstResponse.status, 200);

    const secondResponse = await post(
        "/api/v1/auth/verify-email",
        { email, otp }
    );

    assert.ok(
        [400, 409].includes(secondResponse.status),
        `Reused OTP should be rejected, received ${secondResponse.status}`
    );
});

test("Resend OTP sends a new verification code", async () => {
    const email = createTestEmail("resendotp");

    await registerUser(email);

    const firstOtp = extractOtp(
        email,
        "Verify your Equilx IELTS email"
    );

    const resendResponse = await post(
        "/api/v1/auth/resend-otp",
        { email }
    );

    assert.equal(resendResponse.status, 200);

    const secondOtp = extractOtp(
        email,
        "Verify your Equilx IELTS email"
    );

    assert.notEqual(secondOtp, firstOtp);

    const verificationResponse = await post(
        "/api/v1/auth/verify-email",
        {
            email,
            otp: secondOtp,
        }
    );

    assert.equal(verificationResponse.status, 200);
});

// --------------------------------------------------
// 13. Password-reset token security
// --------------------------------------------------

test("Invalid password-reset token is rejected", async () => {
    const email = createTestEmail("invalidreset");

    await registerAndVerify(email);

    const response = await post(
        "/api/v1/auth/reset-password",
        {
            token: "invalid-reset-token",
            newPassword: "NewStrongPass456!",
        }
    );

    assert.equal(response.status, 400);
});

test("Expired password-reset token is rejected", async () => {
    const email = createTestEmail("expiredreset");

    await registerAndVerify(email);

    const forgotResponse = await post(
        "/api/v1/auth/forgot-password",
        { email }
    );

    assert.equal(forgotResponse.status, 200);

    const resetToken = extractResetToken(email);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    await prisma.passwordResetToken.updateMany({
        where: { userId: user.id },
        data: {
            expiresAt: new Date(Date.now() - 60_000),
        },
    });

    const resetResponse = await post(
        "/api/v1/auth/reset-password",
        {
            token: resetToken,
            newPassword: "NewStrongPass456!",
        }
    );

    assert.equal(resetResponse.status, 400);
});

// --------------------------------------------------
// 14. Change-password security
// --------------------------------------------------

test("Change password rejects an incorrect current password", async () => {
    const email = createTestEmail("wrongcurrent");

    await registerAndVerify(email);

    const loginResponse = await loginUser(email);

    assert.equal(loginResponse.status, 200);

    const accessToken = getAccessToken(loginResponse);

    const response = await patch(
        "/api/v1/auth/change-password",
        accessToken,
        {
            currentPassword: "WrongCurrentPass123!",
            newPassword: "NewStrongPass456!",
        }
    );

    assert.ok(
        [400, 401].includes(response.status),
        `Incorrect current password should be rejected, received ${response.status}`
    );

    // Confirm the original password still works.
    const originalPasswordResponse = await loginUser(email);

    assert.equal(originalPasswordResponse.status, 200);
});


// --------------------------------------------------
// Google OAuth API tests
// --------------------------------------------------

test("Google login rejects an invalid ID token", async () => {
    googleTokenPayload = null;
    googleVerificationError = new Error("Invalid Google ID token");

    const response = await post("/api/v1/auth/google", {
        idToken: "invalid-google-token",
    });

    assert.equal(response.status, 401);
});


test("Google login rejects an account with an unverified email", async () => {
    const idToken = createGoogleToken({
        sub: `google-unverified-${Date.now()}`,
        email: createTestEmail("google-unverified"),
        email_verified: false,
        name: "Unverified Google User",
    });

    const response = await post("/api/v1/auth/google", {
        idToken,
    });

    assert.equal(response.status, 401);
    assert.equal(
        response.body.error.message,
        "Google account must have a verified email address."
    );
});


test("Existing Google user can log in without creating a duplicate account", async () => {
    const email = createTestEmail("google-existing");
    const googleId = `google-existing-${Date.now()}`;

    const idToken = createGoogleToken({
        sub: googleId,
        email,
        email_verified: true,
        name: "Existing Google User",
        picture: "https://example.com/avatar.jpg",
    });

    // First login creates the Google account.
    const firstResponse = await post("/api/v1/auth/google", { idToken });

    assert.equal(firstResponse.status, 200);
    assert.equal(firstResponse.body.data.isNewUser, true);

    const userBefore = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    assert.ok(userBefore);

    // Second login must reuse the existing Google account.
    const secondResponse = await post("/api/v1/auth/google", { idToken });

    assert.equal(secondResponse.status, 200);
    assert.equal(secondResponse.body.success, true);
    assert.equal(secondResponse.body.data.isNewUser, false);
    assert.ok(secondResponse.body.data.accessToken);

    const userAfter = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    assert.equal(userAfter.id, userBefore.id);

    const identityCount = await prisma.authIdentity.count({
        where: {
            provider: "GOOGLE",
            providerSubject: googleId,
        },
    });

    assert.equal(identityCount, 1);
});

test("Google login rejects an existing password account without linking it automatically", async () => {
    const email = createTestEmail("google-email-collision");

    await registerAndVerify(email);

    const idToken = createGoogleToken({
        sub: `google-collision-${Date.now()}`,
        email,
        email_verified: true,
        name: "Google Collision User",
    });

    const response = await post("/api/v1/auth/google", {
        idToken,
    });

    assert.equal(response.status, 409);
    assert.equal(
        response.body.error.code,
        "GOOGLE_ACCOUNT_LINK_REQUIRED"
    );

    const identity = await prisma.authIdentity.findFirst({
        where: {
            provider: "GOOGLE",
            user: { email },
        },
    });

    assert.equal(identity, null);
});


test("SUPER_ADMIN must complete 2FA before receiving an access token", async () => {
    const email = createTestEmail("super-admin-2fa");

    await registerAndVerify(email);

    await prisma.user.update({
        where: { email },
        data: { platformRole: "SUPER_ADMIN" },
    });

    // First step: password login should return an OTP challenge.
    const loginResponse = await loginUser(email);

    assert.equal(loginResponse.status, 202);
    assert.equal(loginResponse.body.success, true);
    assert.equal(loginResponse.body.data.twoFactorRequired, true);

    const challengeId = loginResponse.body.data.challengeId;

    assert.ok(challengeId);
    assert.equal(loginResponse.body.data.accessToken, undefined);

    // Extract the login OTP from the mocked email.
    const otp = extractOtp(
        email,
        "Equilx IELTS login verification code"
    );

    // Second step: verify the OTP.
    const verificationResponse = await post(
        "/api/v1/auth/verify-login-otp",
        { challengeId, otp }
    );

    assert.equal(verificationResponse.status, 200);
    assert.equal(verificationResponse.body.success, true);

    const accessToken = getAccessToken(verificationResponse);

    assert.ok(getRefreshCookie(verificationResponse));

    // Confirm the issued access token works.
    const meResponse = await get("/api/v1/auth/me", accessToken);

    assert.equal(meResponse.status, 200);
});

test("Login 2FA rejects incorrect OTP and limits repeated attempts", async () => {
    const email = createTestEmail("2fa-wrong-otp");

    await registerAndVerify(email);

    await prisma.user.update({
        where: { email },
        data: { platformRole: "SUPER_ADMIN" },
    });

    const loginResponse = await loginUser(email);

    assert.equal(loginResponse.status, 202);

    const challengeId = loginResponse.body.data.challengeId;

    // Five incorrect attempts should be rejected.
    for (let attempt = 1; attempt <= 5; attempt++) {
        const response = await post(
            "/api/v1/auth/verify-login-otp",
            {
                challengeId,
                otp: "000000",
            }
        );

        assert.equal(
            response.status,
            400,
            `Incorrect OTP attempt ${attempt} should return 400`
        );
    }

    // Further attempts should be rate-limited.
    const blockedResponse = await post(
        "/api/v1/auth/verify-login-otp",
        {
            challengeId,
            otp: "000000",
        }
    );

    assert.equal(blockedResponse.status, 429);
});

// --------------------------------------------------
// 12. Safe cleanup
// --------------------------------------------------

after(async () => {
    try {
        if (createdEmails.length > 0) {
            await prisma.user.deleteMany({
                where: {
                    email: {
                        in: createdEmails,
                    },
                },
            });
        }
    } finally {
        nodemailer.createTransport = originalCreateTransport;
         OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
        await prisma.$disconnect();
    }
});

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../../src/app");

const jwt = require("jsonwebtoken");
const { prisma } = require("../../src/config/database");
const env = require("../../src/config/env");
const userService = require("../../src/modules/users/services/user.service");

function createAccessToken() {
  return jwt.sign(
    { sub: "00000000-0000-4000-8000-000000000001" },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "5m",
      issuer: "equilx-ielts-api",
      audience: "equilx-ielts-client",
      algorithm: "HS256",
    }
  );
}

async function withMockedUser(platformRole, runTest) {
  const originalFindUnique = prisma.user.findUnique;

  prisma.user.findUnique = async () => ({
    id: "00000000-0000-4000-8000-000000000001",
    email: "api-test@example.com",
    platformRole,
    emailVerifiedAt: new Date(),
    isActive: true,
    createdAt: new Date(),
    profile: null,
  });

  try {
    await runTest(createAccessToken());
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }
}

test("GET /users denies an authenticated ordinary user", async () => {
  await withMockedUser("STUDENT", async (token) => {
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "FORBIDDEN");
  });
});

test("PATCH /users/:id/status denies an authenticated ordinary user", async () => {
  await withMockedUser("STUDENT", async (token) => {
    const response = await request(app)
      .patch(
        "/api/v1/users/00000000-0000-4000-8000-000000000002/status"
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: false });

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "FORBIDDEN");
  });
});

test("GET /users rejects an invalid access token", async () => {
  const response = await request(app)
    .get("/api/v1/users")
    .set("Authorization", "Bearer invalid-token");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "INVALID_ACCESS_TOKEN");
});


test("GET /users/me requires authentication", async () => {
  const response = await request(app).get("/api/v1/users/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("PATCH /users/me requires authentication", async () => {
  const response = await request(app)
    .patch("/api/v1/users/me")
    .send({ name: "Test User" });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("GET /users/me/security requires authentication", async () => {
  const response = await request(app).get("/api/v1/users/me/security");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("GET /users requires authentication", async () => {
  const response = await request(app).get("/api/v1/users");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("PATCH /users/:id/status requires authentication", async () => {
  const response = await request(app)
    .patch("/api/v1/users/00000000-0000-4000-8000-000000000001/status")
    .send({ isActive: false });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});


test("GET /users/me returns the authenticated user's safe profile", async () => {
  await withMockedUser("STUDENT", async (token) => {
    const response = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.email, "api-test@example.com");
    assert.equal(response.body.data.user.platformRole, "STUDENT");
    assert.equal(response.body.data.user.emailVerified, true);

    assert.equal("password" in response.body.data.user, false);
    assert.equal("passwordHash" in response.body.data.user, false);
  });
});

test("PATCH /users/me rejects protected fields", async () => {
  await withMockedUser("STUDENT", async (token) => {
    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ platformRole: "SUPER_ADMIN" });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });
});

test("PATCH /users/me rejects an empty update", async () => {
  await withMockedUser("STUDENT", async (token) => {
    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });
});

test("GET /users rejects an out-of-range page size", async () => {
  await withMockedUser("SUPER_ADMIN", async (token) => {
    const response = await request(app)
      .get("/api/v1/users?limit=101")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });
});

test("PATCH /users/:id/status rejects a non-boolean status", async () => {
  await withMockedUser("SUPER_ADMIN", async (token) => {
    const response = await request(app)
      .patch(
        "/api/v1/users/00000000-0000-4000-8000-000000000002/status"
      )
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: "false" });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });
});




test("PATCH /users/me accepts a valid profile update", async () => {
  const originalUpdate = userService.updateMyProfile;

  userService.updateMyProfile = async (userId, profileData) => ({
    id: userId,
    email: "api-test@example.com",
    platformRole: "STUDENT",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    profile: {
      name: profileData.name,
      phone: null,
      avatarUrl: null,
    },
  });

  try {
    await withMockedUser("STUDENT", async (token) => {
      const response = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Test Student" });

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(
        response.body.data.user.profile.name,
        "Test Student"
      );
    });
  } finally {
    userService.updateMyProfile = originalUpdate;
  }
});

test("GET /users/me/security returns security information", async () => {
  const originalGetSecurity = userService.getMySecurity;

  userService.getMySecurity = async () => ({
    accountActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    activeRefreshSessions: 2,
  });

  try {
    await withMockedUser("STUDENT", async (token) => {
      const response = await request(app)
        .get("/api/v1/users/me/security")
        .set("Authorization", `Bearer ${token}`);

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.security.accountActive, true);
      assert.equal(
        response.body.data.security.activeRefreshSessions,
        2
      );
    });
  } finally {
    userService.getMySecurity = originalGetSecurity;
  }
});

test("GET /users allows Super Admin access", async () => {
  const originalListUsers = userService.listUsers;

  userService.listUsers = async (filters) => ({
    users: [],
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: 0,
    },
  });

  try {
    await withMockedUser("SUPER_ADMIN", async (token) => {
      const response = await request(app)
        .get("/api/v1/users?page=1&limit=10")
        .set("Authorization", `Bearer ${token}`);

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.deepEqual(response.body.data.users, []);
    });
  } finally {
    userService.listUsers = originalListUsers;
  }
});

test("PATCH /users/:id/status allows Super Admin access", async () => {
  const originalUpdateStatus = userService.updateUserStatus;

  userService.updateUserStatus = async ({
    targetUserId,
    actorUserId,
    isActive,
  }) => ({
    id: targetUserId,
    email: "target@example.com",
    platformRole: "STUDENT",
    isActive,
    emailVerified: true,
  });

  try {
    await withMockedUser("SUPER_ADMIN", async (token) => {
      const response = await request(app)
        .patch(
          "/api/v1/users/00000000-0000-4000-8000-000000000002/status"
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ isActive: false });

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.user.isActive, false);
    });
  } finally {
    userService.updateUserStatus = originalUpdateStatus;
  }
});


test("PATCH /users/:id/status rejects a malformed user ID", async () => {
  await withMockedUser("SUPER_ADMIN", async (token) => {
    const response = await request(app)
      .patch("/api/v1/users/not-a-valid-uuid/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: false });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });
});


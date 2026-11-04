
const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../../src/config/database");
const userService = require("../../src/modules/users/services/user.service");

test("getMyProfile queries only safe profile fields", async () => {
  const original = prisma.user.findUnique;
  const expected = {
    id: "user-1",
    email: "user@example.com",
    platformRole: "USER",
    profile: { name: "Test User", phone: null, avatarUrl: null },
  };

  let receivedArgs;
  prisma.user.findUnique = async (args) => {
    receivedArgs = args;
    return expected;
  };

  try {
    const result = await userService.getMyProfile("user-1");

    assert.deepEqual(result, expected);
    assert.deepEqual(receivedArgs.where, { id: "user-1" });
    assert.equal(receivedArgs.select.passwordHash, undefined);
  } finally {
    prisma.user.findUnique = original;
  }
});

test("updateMyProfile upserts profile and returns the updated user", async () => {
  const original = prisma.$transaction;
  let upsertArgs;
  let findArgs;

  const expected = {
    id: "user-1",
    email: "user@example.com",
    profile: { name: "Updated Name", phone: null, avatarUrl: null },
  };

  prisma.$transaction = async (callback) =>
    callback({
      userProfile: {
        upsert: async (args) => {
          upsertArgs = args;
          return {};
        },
      },
      user: {
        findUnique: async (args) => {
          findArgs = args;
          return expected;
        },
      },
    });

  try {
    const result = await userService.updateMyProfile("user-1", {
      name: "Updated Name",
    });

    assert.deepEqual(result, expected);
    assert.deepEqual(upsertArgs.where, { userId: "user-1" });
    assert.deepEqual(upsertArgs.create, {
      userId: "user-1",
      name: "Updated Name",
    });
    assert.deepEqual(upsertArgs.update, { name: "Updated Name" });
    assert.deepEqual(findArgs.where, { id: "user-1" });
  } finally {
    prisma.$transaction = original;
  }
});

test("getMySecurity counts only unrevoked, unexpired sessions", async () => {
  const originalFind = prisma.user.findUnique;
  const originalGroupBy = prisma.refreshToken.groupBy;

  const createdAt = new Date("2026-01-01T00:00:00Z");
  let groupArgs;

  prisma.user.findUnique = async () => ({
    isActive: true,
    emailVerifiedAt: createdAt,
    createdAt,
  });

  prisma.refreshToken.groupBy = async (args) => {
    groupArgs = args;
    return [
      { revokedAt: null, _count: { _all: 2 } },
      { revokedAt: createdAt, _count: { _all: 3 } },
    ];
  };

  try {
    const result = await userService.getMySecurity("user-1");

    assert.equal(result.accountActive, true);
    assert.equal(result.emailVerified, true);
    assert.equal(result.activeRefreshSessions, 2);
    assert.equal(groupArgs.where.userId, "user-1");
    assert.ok(groupArgs.where.expiresAt.gt instanceof Date);
  } finally {
    prisma.user.findUnique = originalFind;
    prisma.refreshToken.groupBy = originalGroupBy;
  }
});

test("getMySecurity returns null when user does not exist", async () => {
  const originalFind = prisma.user.findUnique;
  const originalGroupBy = prisma.refreshToken.groupBy;

  prisma.user.findUnique = async () => null;
  prisma.refreshToken.groupBy = async () => [];

  try {
    assert.equal(await userService.getMySecurity("missing-user"), null);
  } finally {
    prisma.user.findUnique = originalFind;
    prisma.refreshToken.groupBy = originalGroupBy;
  }
});

test("listUsers applies pagination and returns verification status", async () => {
  const originalTransaction = prisma.$transaction;
  let receivedQueries;

  const createdAt = new Date("2026-01-01T00:00:00Z");

  prisma.$transaction = async (queries) => {
    receivedQueries = queries;
    return [
      [{
        id: "user-1",
        email: "user@example.com",
        platformRole: "USER",
        emailVerifiedAt: createdAt,
        isActive: true,
        createdAt,
        profile: { name: "Test User", phone: null, avatarUrl: null },
      }],
      21,
    ];
  };

  try {
    const result = await userService.listUsers({
      page: 2,
      limit: 10,
      search: "test",
      status: "ACTIVE",
    });

    assert.equal(receivedQueries.length, 2);
    assert.equal(result.users.length, 1);
    assert.equal(result.users[0].emailVerified, true);
    assert.equal(result.users[0].emailVerifiedAt, undefined);
    assert.deepEqual(result.pagination, {
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("updateUserStatus rejects self-deactivation", async () => {
  await assert.rejects(
    userService.updateUserStatus({
      targetUserId: "user-1",
      actorUserId: "user-1",
      isActive: false,
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "SELF_DEACTIVATION_NOT_ALLOWED");
      return true;
    }
  );
});

test("updateUserStatus returns null for a missing user", async () => {
  const original = prisma.$transaction;

  prisma.$transaction = async (callback) =>
    callback({
      user: {
        findUnique: async () => null,
      },
    });

  try {
    const result = await userService.updateUserStatus({
      targetUserId: "missing-user",
      actorUserId: "admin-1",
      isActive: false,
    });

    assert.equal(result, null);
  } finally {
    prisma.$transaction = original;
  }
});

test("deactivation revokes refresh tokens and creates an audit log", async () => {
  const original = prisma.$transaction;
  const calls = {};

  const createdAt = new Date("2026-01-01T00:00:00Z");

  prisma.$transaction = async (callback) =>
    callback({
      user: {
        findUnique: async () => ({
          id: "user-1",
          isActive: true,
        }),
        update: async (args) => {
          calls.userUpdate = args;
          return {
            id: "user-1",
            email: "user@example.com",
            platformRole: "USER",
            isActive: false,
            emailVerifiedAt: createdAt,
            updatedAt: createdAt,
          };
        },
      },
      refreshToken: {
        updateMany: async (args) => {
          calls.tokenUpdate = args;
          return { count: 2 };
        },
      },
      auditLog: {
        create: async (args) => {
          calls.auditLog = args;
          return {};
        },
      },
    });

  try {
    const result = await userService.updateUserStatus({
      targetUserId: "user-1",
      actorUserId: "admin-1",
      isActive: false,
    });

    assert.equal(result.isActive, false);
    assert.equal(result.emailVerified, true);
    assert.deepEqual(calls.tokenUpdate.where, {
      userId: "user-1",
      revokedAt: null,
    });
    assert.ok(calls.tokenUpdate.data.revokedAt instanceof Date);
    assert.equal(calls.auditLog.data.actorId, "admin-1");
    assert.equal(calls.auditLog.data.action, "USER_DEACTIVATED");
    assert.equal(calls.auditLog.data.resourceId, "user-1");
  } finally {
    prisma.$transaction = original;
  }
});

test("activation records an audit log without revoking sessions", async () => {
  const original = prisma.$transaction;
  const calls = {};

  prisma.$transaction = async (callback) =>
    callback({
      user: {
        findUnique: async () => ({
          id: "user-1",
          isActive: false,
        }),
        update: async () => ({
          id: "user-1",
          email: "user@example.com",
          platformRole: "USER",
          isActive: true,
          emailVerifiedAt: null,
          updatedAt: new Date(),
        }),
      },
      refreshToken: {
        updateMany: async () => {
          calls.tokensRevoked = true;
        },
      },
      auditLog: {
        create: async (args) => {
          calls.auditLog = args;
          return {};
        },
      },
    });

  try {
    const result = await userService.updateUserStatus({
      targetUserId: "user-1",
      actorUserId: "admin-1",
      isActive: true,
    });

    assert.equal(result.isActive, true);
    assert.equal(result.emailVerified, false);
    assert.equal(calls.tokensRevoked, undefined);
    assert.equal(calls.auditLog.data.action, "USER_ACTIVATED");
  } finally {
    prisma.$transaction = original;
  }
});

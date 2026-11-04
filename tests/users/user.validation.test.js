const test = require("node:test");
const assert = require("node:assert/strict");

const {
  updateProfileSchema,
} = require("../../src/modules/users/validation/user.validation");

const {
  listUsersSchema,
  updateUserStatusSchema,
} = require("../../src/modules/users/validation/admin-user.validation");

test("Profile update accepts a valid name", () => {
  const result = updateProfileSchema.safeParse({
    name: "Test User",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.name, "Test User");
});

test("Profile update trims the name", () => {
  const result = updateProfileSchema.safeParse({
    name: "  Test User  ",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.name, "Test User");
});

test("Profile update rejects an empty object", () => {
  assert.equal(updateProfileSchema.safeParse({}).success, false);
});

test("Profile update rejects a short name", () => {
  assert.equal(
    updateProfileSchema.safeParse({ name: "A" }).success,
    false
  );
});

test("Profile update rejects protected fields", () => {
  const result = updateProfileSchema.safeParse({
    name: "Test User",
    platformRole: "SUPER_ADMIN",
    isActive: true,
  });

  assert.equal(result.success, false);
});

test("Profile update accepts a null phone number", () => {
  assert.equal(
    updateProfileSchema.safeParse({ phone: null }).success,
    true
  );
});

test("Profile update rejects an invalid phone number", () => {
  assert.equal(
    updateProfileSchema.safeParse({ phone: "abc123" }).success,
    false
  );
});

test("Profile update rejects an invalid avatar URL", () => {
  assert.equal(
    updateProfileSchema.safeParse({ avatarUrl: "not-a-url" }).success,
    false
  );
});

test("User listing applies pagination defaults", () => {
  const result = listUsersSchema.safeParse({});

  assert.equal(result.success, true);
  assert.equal(result.data.page, 1);
  assert.equal(result.data.limit, 20);
});

test("User listing accepts query-string pagination", () => {
  const result = listUsersSchema.safeParse({
    page: "2",
    limit: "50",
    search: "test@example.com",
    status: "ACTIVE",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.page, 2);
  assert.equal(result.data.limit, 50);
});

test("User listing rejects a limit above 100", () => {
  assert.equal(
    listUsersSchema.safeParse({ limit: "101" }).success,
    false
  );
});

test("User listing rejects an invalid status", () => {
  assert.equal(
    listUsersSchema.safeParse({ status: "DELETED" }).success,
    false
  );
});

test("User listing rejects unknown query fields", () => {
  assert.equal(
    listUsersSchema.safeParse({ isAdmin: "true" }).success,
    false
  );
});

test("User status update accepts a boolean", () => {
  assert.equal(
    updateUserStatusSchema.safeParse({ isActive: false }).success,
    true
  );
});

test("User status update rejects a string instead of a boolean", () => {
  assert.equal(
    updateUserStatusSchema.safeParse({ isActive: "false" }).success,
    false
  );
});

test("User status update rejects extra fields", () => {
  assert.equal(
    updateUserStatusSchema.safeParse({
      isActive: false,
      platformRole: "SUPER_ADMIN",
    }).success,
    false
  );
});

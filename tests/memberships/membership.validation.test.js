const test = require("node:test");
const assert = require("node:assert/strict");

const { membershipIdParamSchema, createMembershipSchema, updateMembershipSchema, listMembershipsQuerySchema,} = require("../../src/modules/memberships/validation/membership.validation");

test("Membership validation", async (t) => {
  await t.test("accepts a valid membership ID", () => {
    assert.equal(
      membershipIdParamSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
      true
    );
  });

  await t.test("rejects an invalid membership ID", () => {
    assert.equal(
      membershipIdParamSchema.safeParse({ id: "invalid" }).success,
      false
    );
  });

await t.test("accepts a valid membership payload", () => {
  assert.equal(
    createMembershipSchema.safeParse({
      userId: "650e8400-e29b-41d4-a716-446655440000",
      role: "INSTITUTE_STUDENT",
    }).success,
    true
  );
});

 await t.test("rejects an invalid membership role", () => {
  assert.equal(
    createMembershipSchema.safeParse({
      userId: "650e8400-e29b-41d4-a716-446655440000",
      role: "SUPER_ADMIN",
    }).success,
    false
  );
});

  await t.test("rejects unexpected create fields", () => {
    assert.equal(
      createMembershipSchema.safeParse({
        instituteId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "650e8400-e29b-41d4-a716-446655440000",
        role: "INSTITUTE_STUDENT",
        status: "ACTIVE",
      }).success,
      false
    );
  });

  await t.test("rejects an empty update payload", () => {
    assert.equal(updateMembershipSchema.safeParse({}).success, false);
  });

  await t.test("rejects an invalid membership status", () => {
    assert.equal(
      updateMembershipSchema.safeParse({ status: "DELETED" }).success,
      false
    );
  });

  await t.test("applies default pagination", () => {
    assert.deepEqual(
      listMembershipsQuerySchema.parse({}),
      { page: 1, limit: 20 }
    );
  });

  await t.test("rejects a limit above 100", () => {
    assert.equal(
      listMembershipsQuerySchema.safeParse({ limit: "101" }).success,
      false
    );
  });
});

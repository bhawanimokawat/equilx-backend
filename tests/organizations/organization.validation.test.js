const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdParamSchema,
  listOrganizationsQuerySchema,
} = require("../../src/modules/organizations/validation/organization.validation");

test("Organization validation", async (t) => {
  await t.test("accepts valid organization data", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Demo Institute",
      slug: "demo-institute",
    });

    assert.equal(result.success, true);
  });

  await t.test("trims the organization name", () => {
    const result = createOrganizationSchema.safeParse({
      name: "  Demo Institute  ",
      slug: "demo-institute",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.name, "Demo Institute");
  });

  await t.test("rejects a missing name", () => {
    const result = createOrganizationSchema.safeParse({
      slug: "demo-institute",
    });

    assert.equal(result.success, false);
  });

  await t.test("rejects a name shorter than two characters", () => {
    assert.equal(
      createOrganizationSchema.safeParse({
        name: "A",
        slug: "demo-institute",
      }).success,
      false
    );
  });

  await t.test("rejects an invalid slug format", () => {
    for (const slug of [
      "Demo-Institute",
      "demo institute",
      "-demo",
      "demo-",
      "demo--institute",
    ]) {
      assert.equal(
        createOrganizationSchema.safeParse({
          name: "Demo Institute",
          slug,
        }).success,
        false,
        `Expected slug "${slug}" to be rejected`
      );
    }
  });

  await t.test("rejects unexpected create fields", () => {
    assert.equal(
      createOrganizationSchema.safeParse({
        name: "Demo Institute",
        slug: "demo-institute",
        createdById: "unexpected",
      }).success,
      false
    );
  });

  await t.test("accepts a valid partial update", () => {
    assert.equal(
      updateOrganizationSchema.safeParse({
        name: "Updated Institute",
      }).success,
      true
    );
  });

  await t.test("rejects an empty update", () => {
    assert.equal(updateOrganizationSchema.safeParse({}).success, false);
  });

  await t.test("rejects unexpected update fields", () => {
    assert.equal(
      updateOrganizationSchema.safeParse({
        status: "SUSPENDED",
      }).success,
      false
    );
  });

  await t.test("accepts a valid UUID parameter", () => {
    assert.equal(
      organizationIdParamSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
      true
    );
  });

  await t.test("rejects an invalid UUID parameter", () => {
    assert.equal(
      organizationIdParamSchema.safeParse({
        id: "not-a-uuid",
      }).success,
      false
    );
  });

  await t.test("applies default pagination", () => {
    const result = listOrganizationsQuerySchema.safeParse({});

    assert.equal(result.success, true);
    assert.equal(result.data.page, 1);
    assert.equal(result.data.limit, 20);
  });

  await t.test("accepts valid pagination and search", () => {
    const result = listOrganizationsQuerySchema.safeParse({
      page: "2",
      limit: "50",
      search: "Demo",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.page, 2);
    assert.equal(result.data.limit, 50);
  });

  await t.test("rejects a limit greater than 100", () => {
    assert.equal(
      listOrganizationsQuerySchema.safeParse({
        limit: "101",
      }).success,
      false
    );
  });

  await t.test("rejects unexpected query parameters", () => {
    assert.equal(
      listOrganizationsQuerySchema.safeParse({
        page: "1",
        status: "ACTIVE",
      }).success,
      false
    );
  });
});

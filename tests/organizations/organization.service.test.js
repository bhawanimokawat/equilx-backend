
const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../../src/config/database");

const {
  createOrganization,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  listOrganizationMembers,
} = require("../../src/modules/organizations/services/organization.service");

test("Organization service", async (t) => {
  const original = {
    create: prisma.institute.create,
    findMany: prisma.institute.findMany,
    findUnique: prisma.institute.findUnique,
    update: prisma.institute.update,
    count: prisma.institute.count,
    membershipFindMany: prisma.instituteMembership.findMany,
    membershipCount: prisma.instituteMembership.count,
    transaction: prisma.$transaction,
  };

  const restore = () => {
    prisma.institute.create = original.create;
    prisma.institute.findMany = original.findMany;
    prisma.institute.findUnique = original.findUnique;
    prisma.institute.update = original.update;
    prisma.institute.count = original.count;
    prisma.instituteMembership.findMany = original.membershipFindMany;
    prisma.instituteMembership.count = original.membershipCount;
    prisma.$transaction = original.transaction;
  };

  t.after(restore);

  await t.test("creates an organization with the supplied creator", async () => {
    const expected = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Demo Institute",
      slug: "demo-institute",
    };

    prisma.institute.create = async ({ data, select }) => {
      assert.deepEqual(data, {
        name: "Demo Institute",
        slug: "demo-institute",
        createdById: "creator-id",
      });
      assert.equal(select.passwordHash, undefined);
      return expected;
    };

    const result = await createOrganization({
      name: "Demo Institute",
      slug: "demo-institute",
      createdById: "creator-id",
    });

    assert.deepEqual(result, expected);
  });

  await t.test("lists organizations with pagination and search", async () => {
    prisma.institute.findMany = async (args) => {
      assert.equal(args.where.name.contains, "Demo");
      assert.equal(args.skip, 10);
      assert.equal(args.take, 5);
      return [{ id: "org-1", name: "Demo Institute" }];
    };

    prisma.institute.count = async ({ where }) => {
      assert.equal(where.name.contains, "Demo");
      return 11;
    };

    prisma.$transaction = async (operations) => Promise.all(operations);

    const result = await listOrganizations({
      page: 3,
      limit: 5,
      search: "Demo",
    });

    assert.equal(result.data.length, 1);
    assert.deepEqual(result.pagination, {
      page: 3,
      limit: 5,
      total: 11,
      totalPages: 3,
    });
  });

  await t.test("lists organizations without a search filter", async () => {
    prisma.institute.findMany = async ({ where }) => {
      assert.deepEqual(where, {});
      return [];
    };

    prisma.institute.count = async ({ where }) => {
      assert.deepEqual(where, {});
      return 0;
    };

    prisma.$transaction = async (operations) => Promise.all(operations);

    const result = await listOrganizations({});

    assert.deepEqual(result.data, []);
    assert.equal(result.pagination.page, 1);
    assert.equal(result.pagination.limit, 20);
    assert.equal(result.pagination.totalPages, 0);
  });

  await t.test("gets an organization by ID", async () => {
    prisma.institute.findUnique = async ({ where, select }) => {
      assert.deepEqual(where, { id: "org-1" });
      assert.ok(select._count.select.memberships);
      return { id: "org-1", name: "Demo Institute" };
    };

    const result = await getOrganizationById("org-1");

    assert.equal(result.id, "org-1");
  });

  await t.test("returns null when an organization does not exist", async () => {
    prisma.institute.findUnique = async () => null;

    const result = await getOrganizationById("missing-org");

    assert.equal(result, null);
  });

  await t.test("updates an organization", async () => {
    prisma.institute.update = async ({ where, data }) => {
      assert.deepEqual(where, { id: "org-1" });
      assert.deepEqual(data, { name: "Updated Institute" });
      return { id: "org-1", name: "Updated Institute" };
    };

    const result = await updateOrganization("org-1", {
      name: "Updated Institute",
    });

    assert.equal(result.name, "Updated Institute");
  });

  await t.test("lists members scoped to the requested institute", async () => {
    prisma.instituteMembership.findMany = async ({ where, skip, take }) => {
      assert.deepEqual(where, { instituteId: "org-1" });
      assert.equal(skip, 0);
      assert.equal(take, 10);
      return [{ id: "membership-1", role: "STUDENT" }];
    };

    prisma.instituteMembership.count = async ({ where }) => {
      assert.deepEqual(where, { instituteId: "org-1" });
      return 1;
    };

    prisma.$transaction = async (operations) => Promise.all(operations);

    const result = await listOrganizationMembers("org-1", {
      page: 1,
      limit: 10,
    });

    assert.equal(result.data.length, 1);
    assert.equal(result.pagination.total, 1);
  });

  await t.test("propagates database errors", async () => {
    const databaseError = new Error("Database unavailable");

    prisma.institute.create = async () => {
      throw databaseError;
    };

    await assert.rejects(
      createOrganization({
        name: "Demo Institute",
        slug: "demo-institute",
        createdById: "creator-id",
      }),
      (error) => error === databaseError
    );
  });
});

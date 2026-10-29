const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../../src/app");
const env = require("../../src/config/env");
const { prisma } = require("../../src/config/database");
const organizationService = require("../../src/modules/organizations/services/organization.service");

const original = {
  findUnique: prisma.user.findUnique,
  createOrganization: organizationService.createOrganization,
  listOrganizations: organizationService.listOrganizations,
  getOrganizationById: organizationService.getOrganizationById,
  updateOrganization: organizationService.updateOrganization,
  listOrganizationMembers: organizationService.listOrganizationMembers,
};

const testUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "admin@example.com",
  platformRole: "SUPER_ADMIN",
  emailVerifiedAt: new Date(),
  isActive: true,
  createdAt: new Date(),
  profile: null,
};

function makeToken(platformRole = "SUPER_ADMIN") {
  const userId =
    platformRole === "SUPER_ADMIN"
      ? testUser.id
      : "650e8400-e29b-41d4-a716-446655440001";

  return jwt.sign(
    {
      sub: userId,
      jti: `test-${platformRole}`,
    },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "5m",
      issuer: "equilx-ielts-api",
      audience: "equilx-ielts-client",
    }
  );
}

function authHeader(role = "SUPER_ADMIN") {
  return `Bearer ${makeToken(role)}`;
}

test("Organizations API", async (t) => {
  t.after(() => {
    prisma.user.findUnique = original.findUnique;
    organizationService.createOrganization = original.createOrganization;
    organizationService.listOrganizations = original.listOrganizations;
    organizationService.getOrganizationById = original.getOrganizationById;
    organizationService.updateOrganization = original.updateOrganization;
    organizationService.listOrganizationMembers =
      original.listOrganizationMembers;
  });

  prisma.user.findUnique = async ({ where }) => {
  if (where.id === testUser.id) {
    return testUser;
  }

  return {
    ...testUser,
    id: where.id,
    platformRole: "USER",
  };
};

  await t.test("rejects requests without authentication", async () => {
    const response = await request(app).get("/api/v1/organizations");

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects non-super-admin users", async () => {
    const response = await request(app)
      .get("/api/v1/organizations")
      .set("Authorization", authHeader("USER"));

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects invalid create payloads", async () => {
    const response = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", authHeader())
      .send({
        name: "A",
        slug: "INVALID SLUG",
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("creates an organization", async () => {
    organizationService.createOrganization = async (data) => {
      assert.equal(data.name, "Demo Institute");
      assert.equal(data.slug, "demo-institute");
      assert.equal(data.createdById, testUser.id);

      return {
        id: "650e8400-e29b-41d4-a716-446655440000",
        name: data.name,
        slug: data.slug,
        status: "ACTIVE",
      };
    };

    const response = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", authHeader())
      .send({
        name: "Demo Institute",
        slug: "demo-institute",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.slug, "demo-institute");
  });

  await t.test("lists organizations", async () => {
    organizationService.listOrganizations = async (query) => {
      assert.equal(query.page, 1);
      assert.equal(query.limit, 20);

      return {
        data: [{ id: "org-1", name: "Demo Institute" }],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };
    };

    const response = await request(app)
      .get("/api/v1/organizations")
      .set("Authorization", authHeader());

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
  });

  await t.test("returns an organization by ID", async () => {
    organizationService.getOrganizationById = async (id) => ({
      id,
      name: "Demo Institute",
      slug: "demo-institute",
    });

    const response = await request(app)
      .get("/api/v1/organizations/650e8400-e29b-41d4-a716-446655440000")
      .set("Authorization", authHeader());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.name, "Demo Institute");
  });

  await t.test("rejects malformed organization IDs", async () => {
    const response = await request(app)
      .get("/api/v1/organizations/not-a-uuid")
      .set("Authorization", authHeader());

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("returns 404 when an organization is missing", async () => {
    organizationService.getOrganizationById = async () => null;

    const response = await request(app)
      .get("/api/v1/organizations/650e8400-e29b-41d4-a716-446655440000")
      .set("Authorization", authHeader());

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "ORGANIZATION_NOT_FOUND");
  });

  await t.test("updates an organization", async () => {
    organizationService.updateOrganization = async (id, data) => ({
      id,
      name: data.name,
      slug: "demo-institute",
    });

    const response = await request(app)
      .patch("/api/v1/organizations/650e8400-e29b-41d4-a716-446655440000")
      .set("Authorization", authHeader())
      .send({ name: "Updated Institute" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.name, "Updated Institute");
  });

  await t.test("lists organization members", async () => {
    organizationService.getOrganizationById = async (id) => ({ id });
    organizationService.listOrganizationMembers = async (id, query) => {
      assert.equal(query.page, 1);
      assert.equal(query.limit, 20);

      return {
        data: [{ id: "membership-1", role: "STUDENT" }],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };
    };

    const response = await request(app)
      .get(
        "/api/v1/organizations/650e8400-e29b-41d4-a716-446655440000/members"
      )
      .set("Authorization", authHeader());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
  });

  await t.test("maps duplicate slug errors to 409", async () => {
    organizationService.createOrganization = async () => {
      const error = new Error("Unique constraint failed");
      error.code = "P2002";
      throw error;
    };

    const response = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", authHeader())
      .send({
        name: "Demo Institute",
        slug: "demo-institute",
      });

    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "ORGANIZATION_CONFLICT");
  });
});

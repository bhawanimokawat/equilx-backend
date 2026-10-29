const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../../src/app");
const env = require("../../src/config/env");
const { prisma } = require("../../src/config/database");
const crmService = require("../../src/modules/crm/services/crm.service");

const INSTITUTE_ID = "650e8400-e29b-41d4-a716-446655440000";
const LEAD_ID = "750e8400-e29b-41d4-a716-446655440000";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

const original = {
  findUnique: prisma.user.findUnique,
  createLead: crmService.createLead,
  listLeads: crmService.listLeads,
  getLeadById: crmService.getLeadById,
  updateLead: crmService.updateLead,
  softDeleteLead: crmService.softDeleteLead,
};

const testUser = {
  id: USER_ID,
  email: "admin@example.com",
  platformRole: "SUPER_ADMIN",
  emailVerifiedAt: new Date(),
  isActive: true,
  createdAt: new Date(),
  profile: null,
};

function makeToken(userId = USER_ID) {
  return jwt.sign(
    { sub: userId, jti: `crm-test-${userId}` },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "5m",
      issuer: "equilx-ielts-api",
      audience: "equilx-ielts-client",
    }
  );
}

function authHeader() {
  return `Bearer ${makeToken()}`;
}

function instituteUrl(path = "/leads") {
  return `/api/v1/institutes/${INSTITUTE_ID}/crm${path}`;
}

test("CRM Leads API", async (t) => {
  t.after(() => {
    prisma.user.findUnique = original.findUnique;
    crmService.createLead = original.createLead;
    crmService.listLeads = original.listLeads;
    crmService.getLeadById = original.getLeadById;
    crmService.updateLead = original.updateLead;
    crmService.softDeleteLead = original.softDeleteLead;
  });

  prisma.user.findUnique = async ({ where }) => ({
    ...testUser,
    id: where.id,
    platformRole: where.id === USER_ID ? "SUPER_ADMIN" : "USER",
  });

  await t.test("rejects unauthenticated requests", async () => {
    const response = await request(app).get(instituteUrl());

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  await t.test("rejects malformed institute IDs", async () => {
    const response = await request(app)
      .get("/api/v1/institutes/not-a-uuid/crm/leads")
      .set("Authorization", authHeader());

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "INVALID_INSTITUTE_ID");
  });

  await t.test("rejects invalid lead payloads", async () => {
    const response = await request(app)
      .post(instituteUrl())
      .set("Authorization", authHeader())
      .send({ name: "" });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  });

  await t.test("creates a lead", async () => {
    crmService.createLead = async (scope, data) => {
      assert.equal(scope.instituteId, INSTITUTE_ID);
      assert.equal(scope.role, "SUPER_ADMIN");
      assert.equal(scope.userId, USER_ID);
      assert.equal(data.name, "Demo Lead");

      return {
        id: LEAD_ID,
        instituteId: INSTITUTE_ID,
        name: data.name,
        email: data.email,
        status: "NEW",
      };
    };

    const response = await request(app)
      .post(instituteUrl())
      .set("Authorization", authHeader())
      .send({
        name: "Demo Lead",
        email: "lead@example.com",
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, LEAD_ID);
  });

  await t.test("lists leads", async () => {
    crmService.listLeads = async (scope, options) => {
      assert.equal(scope.instituteId, INSTITUTE_ID);
      assert.equal(options.page, 1);
      assert.equal(options.limit, 20);

      return {
        data: [{ id: LEAD_ID, name: "Demo Lead" }],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };
    };

    const response = await request(app)
      .get(instituteUrl())
      .set("Authorization", authHeader());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
  });

  await t.test("returns a lead by ID", async () => {
    crmService.getLeadById = async (scope, leadId) => ({
      id: leadId,
      instituteId: scope.instituteId,
      name: "Demo Lead",
    });

    const response = await request(app)
      .get(instituteUrl(`/leads/${LEAD_ID}`))
      .set("Authorization", authHeader());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, LEAD_ID);
  });

  await t.test("returns 404 for a missing lead", async () => {
    crmService.getLeadById = async () => null;

    const response = await request(app)
      .get(instituteUrl(`/leads/${LEAD_ID}`))
      .set("Authorization", authHeader());

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "LEAD_NOT_FOUND");
  });

  await t.test("updates a lead", async () => {
    crmService.updateLead = async (scope, leadId, data) => ({
      id: leadId,
      instituteId: scope.instituteId,
      name: data.name,
    });

    const response = await request(app)
      .patch(instituteUrl(`/leads/${LEAD_ID}`))
      .set("Authorization", authHeader())
      .send({ name: "Updated Lead" });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.name, "Updated Lead");
  });

  await t.test("soft-deletes a lead", async () => {
    crmService.softDeleteLead = async (scope, leadId) => {
      assert.equal(scope.instituteId, INSTITUTE_ID);
      assert.equal(leadId, LEAD_ID);
      return true;
    };

    const response = await request(app)
      .delete(instituteUrl(`/leads/${LEAD_ID}`))
      .set("Authorization", authHeader());

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
  });
});

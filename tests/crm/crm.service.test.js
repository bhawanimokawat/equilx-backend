
const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../../src/config/database");
const crmService = require("../../src/modules/crm/services/crm.service");

const INSTITUTE_ID = "650e8400-e29b-41d4-a716-446655440000";
const LEAD_ID = "750e8400-e29b-41d4-a716-446655440000";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const OWNER_ID = "850e8400-e29b-41d4-a716-446655440000";

const adminScope = {
  instituteId: INSTITUTE_ID,
  userId: USER_ID,
  role: "INSTITUTE_ADMIN",
};

const trainerScope = {
  instituteId: INSTITUTE_ID,
  userId: USER_ID,
  role: "TRAINER",
};

const original = {
  transaction: prisma.$transaction,
  leadCreate: prisma.lead.create,
  leadFindMany: prisma.lead.findMany,
  leadCount: prisma.lead.count,
  leadFindFirst: prisma.lead.findFirst,
  leadUpdate: prisma.lead.update,
  leadUpdateMany: prisma.lead.updateMany,
  membershipFindFirst: prisma.instituteMembership.findFirst,
  sourceFindFirst: prisma.leadSource.findFirst,
  historyCreate: prisma.leadStatusHistory.create,
  assignmentCreate: prisma.leadAssignment.create,
  assignmentUpdateMany: prisma.leadAssignment.updateMany,
};

test("CRM service unit tests", async (t) => {
  t.after(() => {
    prisma.$transaction = original.transaction;
    prisma.lead.create = original.leadCreate;
    prisma.lead.findMany = original.leadFindMany;
    prisma.lead.count = original.leadCount;
    prisma.lead.findFirst = original.leadFindFirst;
    prisma.lead.update = original.leadUpdate;
    prisma.lead.updateMany = original.leadUpdateMany;
    prisma.instituteMembership.findFirst = original.membershipFindFirst;
    prisma.leadSource.findFirst = original.sourceFindFirst;
    prisma.leadStatusHistory.create = original.historyCreate;
    prisma.leadAssignment.create = original.assignmentCreate;
    prisma.leadAssignment.updateMany = original.assignmentUpdateMany;
  });

  await t.test("requires institute scope when listing leads", async () => {
    await assert.rejects(
      crmService.listLeads({}, {}),
      (error) => error.code === "INSTITUTE_SCOPE_REQUIRED"
    );
  });

  await t.test("requires an authenticated user when creating a lead", async () => {
    await assert.rejects(
      crmService.createLead(
        { instituteId: INSTITUTE_ID, role: "INSTITUTE_ADMIN" },
        { name: "Test Lead", email: "lead@example.com" }
      ),
      (error) => error.code === "AUTHENTICATION_REQUIRED"
    );
  });

  await t.test("prevents trainers from assigning leads to another user", async () => {
    let transactionCalled = false;

    prisma.$transaction = async () => {
      transactionCalled = true;
    };

    await assert.rejects(
      crmService.createLead(trainerScope, {
        name: "Test Lead",
        email: "lead@example.com",
        ownerId: OWNER_ID,
      }),
      (error) => error.code === "LEAD_ASSIGNMENT_FORBIDDEN"
    );

    assert.equal(transactionCalled, false);
  });

  await t.test("creates a lead and records its initial status", async () => {
    const calls = [];

    const fakeLead = {
      id: LEAD_ID,
      instituteId: INSTITUTE_ID,
      createdById: USER_ID,
      name: "Test Lead",
      email: "lead@example.com",
      status: "NEW",
    };

    const tx = {
      instituteMembership: {
        findFirst: async () => null,
      },
      leadSource: {
        findFirst: async () => null,
      },
      lead: {
        create: async ({ data }) => {
          calls.push({ type: "lead", data });
          return fakeLead;
        },
      },
      leadStatusHistory: {
        create: async ({ data }) => {
          calls.push({ type: "history", data });
          return {};
        },
      },
      leadAssignment: {
        create: async ({ data }) => {
          calls.push({ type: "assignment", data });
          return {};
        },
      },
    };

    prisma.$transaction = async (callback) => callback(tx);

    const result = await crmService.createLead(adminScope, {
      name: "Test Lead",
      email: "lead@example.com",
    });

    assert.equal(result.id, LEAD_ID);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].type, "lead");
    assert.equal(calls[0].data.instituteId, INSTITUTE_ID);
    assert.equal(calls[0].data.createdById, USER_ID);
    assert.equal(calls[1].type, "history");
    assert.equal(calls[1].data.newStatus, "NEW");
    assert.equal(calls[1].data.previousStatus, null);
  });

  await t.test("rejects an invalid lead owner", async () => {
    const tx = {
      instituteMembership: {
        findFirst: async () => null,
      },
      leadSource: {
        findFirst: async () => null,
      },
    };

    prisma.$transaction = async (callback) => callback(tx);

    await assert.rejects(
      crmService.createLead(adminScope, {
        name: "Test Lead",
        email: "lead@example.com",
        ownerId: OWNER_ID,
      }),
      (error) => error.code === "INVALID_LEAD_OWNER"
    );
  });

  await t.test("rejects a lead source belonging to another institute or inactive", async () => {
    const tx = {
      instituteMembership: {
        findFirst: async () => null,
      },
      leadSource: {
        findFirst: async () => null,
      },
    };

    prisma.$transaction = async (callback) => callback(tx);

    await assert.rejects(
      crmService.createLead(adminScope, {
        name: "Test Lead",
        email: "lead@example.com",
        sourceId: OWNER_ID,
      }),
      (error) => error.code === "INVALID_LEAD_SOURCE"
    );
  });

  await t.test("scopes trainer lead listings to their own institute and ownership", async () => {
    let capturedWhere;

    prisma.lead.findMany = async ({ where }) => {
      capturedWhere = where;
      return [{ id: LEAD_ID }];
    };

    prisma.lead.count = async ({ where }) => {
      assert.deepEqual(where, capturedWhere);
      return 1;
    };

    prisma.$transaction = async (operations) => Promise.all(operations);

    const result = await crmService.listLeads(trainerScope, {
      page: 1,
      limit: 20,
    });

    assert.equal(result.data.length, 1);
    assert.equal(result.pagination.total, 1);
    assert.equal(capturedWhere.instituteId, INSTITUTE_ID);
    assert.equal(capturedWhere.deletedAt, null);
    assert.equal(capturedWhere.ownerId, USER_ID);
  });

  await t.test("rejects updates that remove both email and phone", async () => {
    const tx = {
      lead: {
        findFirst: async () => ({
          id: LEAD_ID,
          status: "NEW",
          email: null,
          phone: "1234567890",
          ownerId: null,
        }),
      },
    };

    prisma.$transaction = async (callback) => callback(tx);

    await assert.rejects(
      crmService.updateLead(adminScope, LEAD_ID, { phone: null }),
      (error) => error.code === "LEAD_CONTACT_REQUIRED"
    );
  });

  await t.test("requires the dedicated workflow to convert a lead", async () => {
    const tx = {
      lead: {
        findFirst: async () => ({
          id: LEAD_ID,
          status: "NEW",
          email: "lead@example.com",
          phone: null,
          ownerId: null,
        }),
      },
    };

    prisma.$transaction = async (callback) => callback(tx);

    await assert.rejects(
      crmService.updateLead(adminScope, LEAD_ID, {
        status: "CONVERTED",
      }),
      (error) => error.code === "LEAD_CONVERSION_REQUIRED"
    );
  });

  await t.test("prevents trainers from deleting leads", async () => {
    let updateManyCalled = false;

    prisma.lead.updateMany = async () => {
      updateManyCalled = true;
      return { count: 1 };
    };

    await assert.rejects(
      crmService.softDeleteLead(trainerScope, LEAD_ID),
      (error) => error.code === "LEAD_DELETE_FORBIDDEN"
    );

    assert.equal(updateManyCalled, false);
  });

  await t.test("soft-deletes leads within the requested institute", async () => {
    let capturedWhere;
    let capturedData;

    prisma.lead.updateMany = async ({ where, data }) => {
      capturedWhere = where;
      capturedData = data;
      return { count: 1 };
    };

    const result = await crmService.softDeleteLead(adminScope, LEAD_ID);

    assert.equal(result, true);
    assert.equal(capturedWhere.id, LEAD_ID);
    assert.equal(capturedWhere.instituteId, INSTITUTE_ID);
    assert.equal(capturedWhere.deletedAt, null);
    assert.ok(capturedData.deletedAt instanceof Date);
  });
});

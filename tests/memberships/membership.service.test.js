const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../../src/config/database");
const membershipService = require("../../src/modules/memberships/services/membership.service");

const instituteId = "550e8400-e29b-41d4-a716-446655440000";
const membershipId = "650e8400-e29b-41d4-a716-446655440000";
const userId = "750e8400-e29b-41d4-a716-446655440000";

const original = {
    create: prisma.instituteMembership.create,
    findMany: prisma.instituteMembership.findMany,
    findFirst: prisma.instituteMembership.findFirst,
    updateMany: prisma.instituteMembership.updateMany,
    count: prisma.instituteMembership.count,
    transaction: prisma.$transaction,
};

test("Membership service", async (t) => {
    t.after(() => {
        prisma.instituteMembership.create = original.create;
        prisma.instituteMembership.findMany = original.findMany;
        prisma.instituteMembership.findFirst = original.findFirst;
        prisma.instituteMembership.updateMany = original.updateMany;
        prisma.instituteMembership.count = original.count;
        prisma.$transaction = original.transaction;
    });

    await t.test("creates a membership with the requested institute and role", async () => {
        prisma.instituteMembership.create = async ({ data }) => {
            assert.deepEqual(data, {
                instituteId,
                userId,
                role: "INSTITUTE_STUDENT",
            });

            return { id: membershipId, ...data };
        };

        const result = await membershipService.createMembership({
            instituteId,
            userId,
            role: "INSTITUTE_STUDENT",
        });

        assert.equal(result.instituteId, instituteId);
        assert.equal(result.role, "INSTITUTE_STUDENT");
    });

    await t.test("lists memberships within the requested institute", async () => {
        prisma.instituteMembership.findMany = async ({ where, skip, take }) => {
            assert.equal(where.instituteId, instituteId);
            assert.equal(skip, 20);
            assert.equal(take, 10);
            return [{ id: membershipId, instituteId }];
        };

        prisma.instituteMembership.count = async ({ where }) => {
            assert.equal(where.instituteId, instituteId);
            return 1;
        };

        prisma.$transaction = async (operations) => Promise.all(operations);

        const result = await membershipService.listMemberships({
            instituteId,
            page: 3,
            limit: 10,
        });

        assert.equal(result.data.length, 1);
        assert.equal(result.pagination.page, 3);
        assert.equal(result.pagination.total, 1);
    });

    await t.test("rejects listing without an institute scope", async () => {
        await assert.rejects(
            membershipService.listMemberships({}),
            /institute scope is required/
        );
    });

    await t.test("retrieves a membership scoped to its institute", async () => {
        prisma.instituteMembership.findFirst = async ({ where }) => {
            assert.deepEqual(where, { id: membershipId, instituteId });
            return { id: membershipId, instituteId };
        };

        const result = await membershipService.getMembershipById(
            membershipId,
            instituteId
        );

        assert.equal(result.id, membershipId);
    });

    await t.test("returns null when the scoped membership is missing", async () => {
        prisma.instituteMembership.findFirst = async () => null;

        const result = await membershipService.getMembershipById(
            membershipId,
            instituteId
        );

        assert.equal(result, null);
    });

    await t.test("rejects retrieving without an institute scope", async () => {
        await assert.rejects(
            membershipService.getMembershipById(membershipId),
            /institute scope is required/
        );
    });

    await t.test("updates only a membership in the requested institute", async () => {
        prisma.instituteMembership.updateMany = async ({ where, data }) => {
            assert.deepEqual(where, { id: membershipId, instituteId });
            assert.deepEqual(data, { status: "SUSPENDED" });
            return { count: 1 };
        };

        prisma.instituteMembership.findFirst = async ({ where }) => ({
            id: where.id,
            instituteId: where.instituteId,
            status: "SUSPENDED",
        });

        const result = await membershipService.updateMembership(
            membershipId,
            instituteId,
            { status: "SUSPENDED" }
        );

        assert.equal(result.status, "SUSPENDED");
    });

    await t.test("returns null when no scoped membership is updated", async () => {
        prisma.instituteMembership.updateMany = async () => ({ count: 0 });

        const result = await membershipService.updateMembership(
            membershipId,
            instituteId,
            { status: "REVOKED" }
        );

        assert.equal(result, null);
    });

    await t.test("rejects updating without an institute scope", async () => {
        await assert.rejects(
            membershipService.updateMembership(membershipId, null, {
                status: "SUSPENDED",
            }),
            /institute scope is required/
        );
    });
});

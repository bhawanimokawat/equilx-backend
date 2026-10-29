const test = require("node:test");
const assert = require("node:assert/strict");

const validation = require("../../src/modules/crm/validation/crm.validation");

const INSTITUTE_ID = "650e8400-e29b-41d4-a716-446655440000";
const LEAD_ID = "750e8400-e29b-41d4-a716-446655440000";
const ACTIVITY_ID = "850e8400-e29b-41d4-a716-446655440000";
const OWNER_ID = "950e8400-e29b-41d4-a716-446655440000";

test("CRM validation schemas", async (t) => {
  await t.test("accepts valid UUIDs and rejects invalid UUIDs", () => {
    assert.equal(validation.uuidSchema.safeParse(LEAD_ID).success, true);
    assert.equal(validation.uuidSchema.safeParse("not-a-uuid").success, false);
  });

  await t.test("validates lead statuses", () => {
    for (const status of [
      "NEW",
      "CONTACTED",
      "DEMO_BOOKED",
      "NEGOTIATION",
      "ENROLLED",
      "LOST",
    ]) {
      assert.equal(
        validation.leadStatusSchema.safeParse(status).success,
        true,
        `Expected ${status} to be valid`
      );
    }

    for (const status of [
      "FOLLOW_UP",
      "INTERESTED",
      "QUALIFIED",
      "CONVERTED",
      "INVALID",
    ]) {
      assert.equal(
        validation.leadStatusSchema.safeParse(status).success,
        false,
        `Expected ${status} to be invalid`
      );
    }
  });

  await t.test("validates lead activity types", () => {
    for (const type of ["CALL", "EMAIL", "MEETING", "NOTE", "FOLLOW_UP", "OTHER"]) {
      assert.equal(
        validation.leadActivityTypeSchema.safeParse(type).success,
        true
      );
    }

    assert.equal(
      validation.leadActivityTypeSchema.safeParse("SMS_UNKNOWN").success,
      false
    );
  });

  await t.test("validates consent types and statuses", () => {
    assert.equal(
      validation.leadConsentTypeSchema.safeParse("MARKETING_EMAIL").success,
      true
    );
    assert.equal(
      validation.leadConsentTypeSchema.safeParse("INVALID").success,
      false
    );
    assert.equal(
      validation.leadConsentStatusSchema.safeParse("GRANTED").success,
      true
    );
    assert.equal(
      validation.leadConsentStatusSchema.safeParse("WITHDRAWN").success,
      true
    );
    assert.equal(
      validation.leadConsentStatusSchema.safeParse("PENDING").success,
      false
    );
  });

  await t.test("validates institute ID parameters", () => {
    assert.equal(
      validation.instituteIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
      }).success,
      true
    );

    assert.equal(
      validation.instituteIdParamSchema.safeParse({
        instituteId: "invalid",
      }).success,
      false
    );

    assert.equal(
      validation.instituteIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
        extra: true,
      }).success,
      false
    );
  });

  await t.test("validates lead ID parameters", () => {
    assert.equal(
      validation.leadIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
        leadId: LEAD_ID,
      }).success,
      true
    );

    assert.equal(
      validation.leadIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
        leadId: "invalid",
      }).success,
      false
    );
  });

  await t.test("validates activity ID parameters", () => {
    assert.equal(
      validation.activityIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
        leadId: LEAD_ID,
        activityId: ACTIVITY_ID,
      }).success,
      true
    );

    assert.equal(
      validation.activityIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
        leadId: LEAD_ID,
        activityId: "invalid",
      }).success,
      false
    );
  });

  await t.test("validates lead source ID parameters", () => {
    assert.equal(
      validation.sourceIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
        sourceId: OWNER_ID,
      }).success,
      true
    );

    assert.equal(
      validation.sourceIdParamSchema.safeParse({
        instituteId: INSTITUTE_ID,
        sourceId: "invalid",
      }).success,
      false
    );
  });

  await t.test("applies pagination defaults and validates limits", () => {
    const result = validation.paginationSchema.safeParse({});

    assert.equal(result.success, true);
    assert.equal(result.data.page, 1);
    assert.equal(result.data.limit, 20);

    assert.equal(
      validation.paginationSchema.safeParse({
        page: "2",
        limit: "50",
        status: "NEW",
        ownerId: OWNER_ID,
        search: "  IELTS  ",
        dueFollowUps: "true",
      }).success,
      true
    );

    assert.equal(
      validation.paginationSchema.safeParse({ page: 0 }).success,
      false
    );
    assert.equal(
      validation.paginationSchema.safeParse({ limit: 101 }).success,
      false
    );
    assert.equal(
      validation.paginationSchema.safeParse({ dueFollowUps: "yes" }).success,
      false
    );
    assert.equal(
      validation.paginationSchema.safeParse({ unknown: "value" }).success,
      false
    );
  });

  await t.test("validates lead creation and contact requirements", () => {
    assert.equal(
      validation.createLeadSchema.safeParse({
        name: "Demo Lead",
        email: "lead@example.com",
      }).success,
      true
    );

    assert.equal(
      validation.createLeadSchema.safeParse({
        name: "Demo Lead",
        phone: "9876543210",
      }).success,
      true
    );

    assert.equal(
      validation.createLeadSchema.safeParse({
        name: "Demo Lead",
      }).success,
      false
    );

    assert.equal(
      validation.createLeadSchema.safeParse({
        name: "",
        email: "lead@example.com",
      }).success,
      false
    );

    assert.equal(
      validation.createLeadSchema.safeParse({
        name: "Demo Lead",
        email: "invalid-email",
      }).success,
      false
    );

    assert.equal(
      validation.createLeadSchema.safeParse({
        name: "Demo Lead",
        email: "lead@example.com",
        unknown: true,
      }).success,
      false
    );
  });

  await t.test("validates optional lead update fields", () => {
    assert.equal(
      validation.updateLeadSchema.safeParse({ name: "Updated Lead" }).success,
      true
    );

    assert.equal(
      validation.updateLeadSchema.safeParse({ email: null }).success,
      true
    );

    assert.equal(
      validation.updateLeadSchema.safeParse({ phone: null }).success,
      true
    );

    // New CRM fields
    assert.equal(
      validation.updateLeadSchema.safeParse({ targetBand: 8 }).success,
      true
    );

    assert.equal(
      validation.updateLeadSchema.safeParse({
        examDate: "2027-04-20T00:00:00.000Z",
      }).success,
      true
    );

    assert.equal(
      validation.updateLeadSchema.safeParse({
        tags: ["IELTS", "High Priority"],
      }).success,
      true
    );

    // Invalid values
    assert.equal(
      validation.updateLeadSchema.safeParse({ targetBand: 10 }).success,
      false
    );

    assert.equal(
      validation.updateLeadSchema.safeParse({ tags: [""] }).success,
      false
    );

    // Existing checks
    assert.equal(
      validation.updateLeadSchema.safeParse({}).success,
      false
    );

    assert.equal(
      validation.updateLeadSchema.safeParse({ unknown: true }).success,
      false
    );

    assert.equal(
      validation.updateLeadSchema.safeParse({ status: "INVALID" }).success,
      false
    );
  });

  await t.test("validates activity creation", () => {
    assert.equal(
      validation.createActivitySchema.safeParse({
        type: "CALL",
        subject: "Initial call",
        description: "Discussed course requirements",
      }).success,
      true
    );

    assert.equal(
      validation.createActivitySchema.safeParse({
        type: "INVALID",
      }).success,
      false
    );

    assert.equal(
      validation.createActivitySchema.safeParse({
        type: "EMAIL",
        unknown: true,
      }).success,
      false
    );
  });

  await t.test("validates lead assignment", () => {
    assert.equal(
      validation.assignLeadSchema.safeParse({
        assignedToId: OWNER_ID,
        note: "Assigned to trainer",
      }).success,
      true
    );

    assert.equal(
      validation.assignLeadSchema.safeParse({
        assignedToId: "invalid",
      }).success,
      false
    );

    assert.equal(
      validation.assignLeadSchema.safeParse({}).success,
      false
    );
  });

  await t.test("validates lead source creation", () => {
    assert.equal(
      validation.createLeadSourceSchema.safeParse({
        name: "Website",
      }).success,
      true
    );

    assert.equal(
      validation.createLeadSourceSchema.safeParse({
        name: "   ",
      }).success,
      false
    );

    assert.equal(
      validation.createLeadSourceSchema.safeParse({
        name: "Website",
        extra: true,
      }).success,
      false
    );
  });

  await t.test("validates lead source updates", () => {
    assert.equal(
      validation.updateLeadSourceSchema.safeParse({
        name: "Referral",
      }).success,
      true
    );

    assert.equal(
      validation.updateLeadSourceSchema.safeParse({
        isActive: false,
      }).success,
      true
    );

    assert.equal(
      validation.updateLeadSourceSchema.safeParse({}).success,
      false
    );

    assert.equal(
      validation.updateLeadSourceSchema.safeParse({
        isActive: "false",
      }).success,
      false
    );
  });

  await t.test("validates consent records", () => {
    assert.equal(
      validation.createConsentSchema.safeParse({
        type: "MARKETING_EMAIL",
        status: "GRANTED",
        evidenceRef: "consent-record-001",
      }).success,
      true
    );

    assert.equal(
      validation.createConsentSchema.safeParse({
        type: "MARKETING_EMAIL",
        status: "INVALID",
      }).success,
      false
    );

    assert.equal(
      validation.createConsentSchema.safeParse({
        type: "MARKETING_EMAIL",
      }).success,
      false
    );
  });

  await t.test("validates lead status changes", () => {
    assert.equal(
      validation.updateLeadStatusSchema.safeParse({
        status: "CONTACTED",
        reason: "Called the lead",
      }).success,
      true
    );

    assert.equal(
      validation.updateLeadStatusSchema.safeParse({
        status: "INVALID",
      }).success,
      false
    );

    assert.equal(
      validation.updateLeadStatusSchema.safeParse({}).success,
      false
    );
  });
});

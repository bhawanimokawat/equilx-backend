
const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../../src/config/database");

// Test-only billing configuration.
process.env.BILLING_SELLER_LEGAL_NAME = "Equilx Test";
process.env.BILLING_SELLER_ADDRESS = "Test Address";
process.env.BILLING_SELLER_COUNTRY = "IN";

const {
  activateSuccessfulPayment,
} = require("../../src/modules/payments/services/payment-activation.service");

const PAYMENT_ID = "650e8400-e29b-41d4-a716-446655440000";
const SUBSCRIPTION_ID = "750e8400-e29b-41d4-a716-446655440000";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const INSTITUTE_ID = "850e8400-e29b-41d4-a716-446655440000";
const PLAN_ID = "950e8400-e29b-41d4-a716-446655440000";

const originalTransaction = prisma.$transaction;

const createMockTransaction = ({
  owner = "student",
  planCode = "STUDENT_PRO",
  paymentStatus = "PENDING",
  subscriptionStatus = "PENDING_PAYMENT",
} = {}) => {
  const calls = {
    preference: [],
    paymentUpdate: [],
    paymentUpdateWhere: [],
    subscriptionUpdate: [],
    subscriptionUpdateWhere: [],
    history: [],
    invoice: [],
  };

  const subscription = {
    id: SUBSCRIPTION_ID,
    userId: owner === "student" ? USER_ID : null,
    instituteId: owner === "institute" ? INSTITUTE_ID : null,
    status: subscriptionStatus,
    durationMonths: 1,
    startsAt: null,
    endsAt: null,
    renewalOfSubscriptionId: null,
    plan: {
      id: PLAN_ID,
      code: planCode,
    },
  };

  const payment = {
    id: PAYMENT_ID,
    subscriptionId: SUBSCRIPTION_ID,
    amountInclGst: 1180,
    currency: "INR",
    status: paymentStatus,
    providerPaymentId:
      paymentStatus === "SUCCEEDED"
        ? "provider-payment-123"
        : null,
    subscription: {
      ...subscription,
      user:
        owner === "student"
          ? {
              email: "student@example.com",
              profile: null,
            }
          : null,
      institute:
        owner === "institute"
          ? {
              id: INSTITUTE_ID,
              name: "Test Institute",
              billingEmail: "institute@example.com",
              billingLegalName: "Test Institute",
              billingGstin: null,
              gstin: null,
              billingAddress: "Test Address",
              billingCity: "Jaipur",
              billingState: "Rajasthan",
              billingStateCode: "08",
              billingPostalCode: "302001",
              billingCountry: "IN",
            }
          : null,
    },
  };

  const tx = {
    payment: {
      findUnique: async () => payment,

      updateMany: async ({ where, data }) => {
        calls.paymentUpdate.push(data);
        calls.paymentUpdateWhere.push(where);

        payment.status = data.status;
        payment.providerPaymentId = data.providerPaymentId;

        return { count: 1 };
      },
    },

    subscription: {
      updateMany: async ({ where, data }) => {
        calls.subscriptionUpdate.push(data);
        calls.subscriptionUpdateWhere.push(where);

        subscription.status = data.status;
        subscription.startsAt = data.startsAt;
        subscription.endsAt = data.endsAt;

        return { count: 1 };
      },
    },

    notificationPreference: {
      updateMany: async (args) => {
        calls.preference.push(args);
        return { count: 1 };
      },
    },

    subscriptionChange: {
      create: async ({ data }) => {
        calls.history.push(data);
        return { id: "history-123" };
      },
    },

    invoice: {
      findUnique: async () => null,

      create: async ({ data }) => {
        calls.invoice.push(data);

        return {
          id: "invoice-123",
          invoiceNumber: "EQX-TEST-123",
        };
      },
    },
  };

  return {
    tx,
    calls,
    payment,
    subscription,
  };
};

test("Payment activation tests", async (t) => {
  t.after(() => {
    prisma.$transaction = originalTransaction;
  });

  await t.test(
    "disables marketing emails for Student Pro activation",
    async () => {
      const { tx, calls } = createMockTransaction();

      prisma.$transaction = async (callback) => callback(tx);

      const result = await activateSuccessfulPayment({
        paymentId: PAYMENT_ID,
        providerPaymentId: "provider-payment-123",
      });

      assert.equal(result.paymentStatus, "SUCCEEDED");
      assert.equal(result.subscriptionStatus, "ACTIVE");
      assert.equal(calls.preference.length, 1);

      assert.deepEqual(calls.preference[0], {
        where: {
          userId: USER_ID,
          marketingEmailEnabled: true,
        },
        data: {
          marketingEmailEnabled: false,
        },
      });

      assert.equal(calls.invoice.length, 1);
    }
  );

  await t.test(
    "does not disable preferences for institute subscriptions",
    async () => {
      const { tx, calls } = createMockTransaction({
        owner: "institute",
        planCode: "INSTITUTE_12_MONTH",
      });

      prisma.$transaction = async (callback) => callback(tx);

      const result = await activateSuccessfulPayment({
        paymentId: PAYMENT_ID,
        providerPaymentId: "provider-payment-123",
      });

      assert.equal(result.subscriptionStatus, "ACTIVE");
      assert.equal(calls.preference.length, 0);
      assert.equal(calls.invoice.length, 1);
    }
  );

  await t.test(
    "does not disable preferences for non-Student Pro plans",
    async () => {
      const { tx, calls } = createMockTransaction({
        planCode: "FREE",
      });

      prisma.$transaction = async (callback) => callback(tx);

      await activateSuccessfulPayment({
        paymentId: PAYMENT_ID,
        providerPaymentId: "provider-payment-123",
      });

      assert.equal(calls.preference.length, 0);
    }
  );

  await t.test(
    "does not reactivate or create another invoice for duplicate activation",
    async () => {
      const { tx, calls } = createMockTransaction({
        paymentStatus: "SUCCEEDED",
        subscriptionStatus: "ACTIVE",
      });

      tx.invoice.findUnique = async () => ({
        id: "invoice-123",
        invoiceNumber: "EQX-TEST-123",
      });

      prisma.$transaction = async (callback) => callback(tx);

      const result = await activateSuccessfulPayment({
        paymentId: PAYMENT_ID,
        providerPaymentId: "provider-payment-123",
      });

      assert.equal(result.alreadyActivated, true);
      assert.equal(calls.preference.length, 0);
      assert.equal(calls.invoice.length, 0);
      assert.equal(calls.paymentUpdate.length, 0);
    }
  );

  await t.test(
    "recovers an expired payment when recovery is explicitly allowed",
    async () => {
      const { tx, calls } = createMockTransaction({
        paymentStatus: "EXPIRED",
        subscriptionStatus: "EXPIRED",
      });

      prisma.$transaction = async (callback) => callback(tx);

      const result = await activateSuccessfulPayment({
        paymentId: PAYMENT_ID,
        providerPaymentId: "provider-payment-late-123",
        allowExpiredRecovery: true,
      });

      assert.equal(result.paymentStatus, "SUCCEEDED");
      assert.equal(result.subscriptionStatus, "ACTIVE");
      assert.equal(result.recoveredFromExpired, true);
      assert.equal(result.alreadyActivated, false);

      assert.equal(calls.paymentUpdate.length, 1);
      assert.equal(calls.subscriptionUpdate.length, 1);
      assert.equal(calls.invoice.length, 1);

      assert.equal(
        calls.paymentUpdateWhere[0].status,
        "EXPIRED"
      );

      assert.equal(
        calls.subscriptionUpdateWhere[0].status,
        "EXPIRED"
      );
    }
  );

  await t.test(
    "rejects expired payment when recovery is not explicitly allowed",
    async () => {
      const { tx, calls } = createMockTransaction({
        paymentStatus: "EXPIRED",
        subscriptionStatus: "EXPIRED",
      });

      prisma.$transaction = async (callback) => callback(tx);

      await assert.rejects(
        () =>
          activateSuccessfulPayment({
            paymentId: PAYMENT_ID,
            providerPaymentId: "provider-payment-late-123",
          }),
        (error) => {
          assert.equal(
            error.code,
            "INVALID_PAYMENT_STATE"
          );

          return true;
        }
      );

      assert.equal(calls.paymentUpdate.length, 0);
      assert.equal(calls.subscriptionUpdate.length, 0);
      assert.equal(calls.invoice.length, 0);
    }
  );

  await t.test(
    "records EXPIRED as previous subscription status during recovery",
    async () => {
      const { tx, calls } = createMockTransaction({
        paymentStatus: "EXPIRED",
        subscriptionStatus: "EXPIRED",
      });

      prisma.$transaction = async (callback) => callback(tx);

      await activateSuccessfulPayment({
        paymentId: PAYMENT_ID,
        providerPaymentId: "provider-payment-late-123",
        allowExpiredRecovery: true,
      });

      assert.equal(calls.history.length, 1);

      assert.equal(
        calls.history[0].previousStatus,
        "EXPIRED"
      );

      assert.equal(
        calls.history[0].newStatus,
        "ACTIVE"
      );

      assert.equal(
        calls.history[0].details.recoveredFromExpired,
        true
      );
    }
  );
});


const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../../src/config/database");

const {
  PaymentStatus,
  PaymentProvider,
  Prisma,
} = require("@prisma/client");

// Test-only billing configuration.
process.env.BILLING_SELLER_LEGAL_NAME = "Equilx Test";
process.env.BILLING_SELLER_ADDRESS = "Test Address";
process.env.BILLING_SELLER_COUNTRY = "IN";

const paymentWebhookService =
  require("../../src/modules/payments/services/payment-webhook.service");

const PAYMENT_ID = "650e8400-e29b-41d4-a716-446655440000";
const SUBSCRIPTION_ID = "750e8400-e29b-41d4-a716-446655440000";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const PLAN_ID = "950e8400-e29b-41d4-a716-446655440000";

const originalMethods = {};

const saveOriginalMethods = () => {
  originalMethods.transaction = prisma.$transaction;
  originalMethods.paymentFindFirst = prisma.payment.findFirst;
  originalMethods.paymentUpdateMany = prisma.payment.updateMany;

  originalMethods.webhookCreate =
    prisma.paymentWebhookEvent.create;
  originalMethods.webhookFindUnique =
    prisma.paymentWebhookEvent.findUnique;
  originalMethods.webhookUpdate =
    prisma.paymentWebhookEvent.update;
};

const restoreMethods = () => {
  prisma.$transaction = originalMethods.transaction;
  prisma.payment.findFirst = originalMethods.paymentFindFirst;
  prisma.payment.updateMany = originalMethods.paymentUpdateMany;

  prisma.paymentWebhookEvent.create =
    originalMethods.webhookCreate;
  prisma.paymentWebhookEvent.findUnique =
    originalMethods.webhookFindUnique;
  prisma.paymentWebhookEvent.update =
    originalMethods.webhookUpdate;
};

const createRawBody = () =>
  Buffer.from(JSON.stringify({ test: "payment-webhook" }));

const createCapturedEvent = () => ({
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "provider-payment-123",
        order_id: "razorpay-order-123",
        status: "captured",
        currency: "INR",
        amount: 118000,
      },
    },
  },
});

const createWebhookRecord = (overrides = {}) => ({
  id: "webhook-123",
  eventType: "payment.captured",
  payloadHash: paymentWebhookService.hashPayload(createRawBody()),
  processedAt: null,
  ...overrides,
});

const createPayment = ({
  paymentStatus = PaymentStatus.PENDING,
  subscriptionStatus = "PENDING_PAYMENT",
} = {}) => {
  const subscription = {
    id: SUBSCRIPTION_ID,
    userId: USER_ID,
    instituteId: null,
    status: subscriptionStatus,
    durationMonths: 1,
    startsAt: null,
    endsAt: null,
    renewalOfSubscriptionId: null,
    plan: {
      id: PLAN_ID,
      code: "STUDENT_PRO",
    },
    user: {
      email: "student@example.com",
      profile: null,
    },
    institute: null,
  };

  return {
    id: PAYMENT_ID,
    subscriptionId: SUBSCRIPTION_ID,
    provider: PaymentProvider.RAZORPAY,
    providerOrderId: "razorpay-order-123",
    currency: "INR",

    // Prisma Decimal supports both webhook calculation
    // and invoice monetary calculations.
    amountInclGst: new Prisma.Decimal("1180.00"),

    status: paymentStatus,
    providerPaymentId: null,
    subscription,
  };
};

const createMockTransaction = ({
  paymentStatus = PaymentStatus.PENDING,
  subscriptionStatus = "PENDING_PAYMENT",
} = {}) => {
  const calls = {
    paymentUpdate: [],
    paymentUpdateWhere: [],
    subscriptionUpdate: [],
    subscriptionUpdateWhere: [],
    history: [],
    invoice: [],
    preference: [],
  };

  const payment = createPayment({
    paymentStatus,
    subscriptionStatus,
  });

  const subscription = payment.subscription;

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

test("Payment webhook service", async (t) => {
  t.after(() => {
    restoreMethods();
  });

  saveOriginalMethods();

  await t.test("should reject invalid webhook input", async () => {
    await assert.rejects(
      paymentWebhookService.handleWebhookEvent({
        eventId: null,
        event: null,
        rawBody: null,
      }),
      { code: "INVALID_WEBHOOK_INPUT" }
    );
  });

  await t.test("should generate SHA256 payload hash", () => {
    const hash = paymentWebhookService.hashPayload(createRawBody());

    assert.equal(typeof hash, "string");
    assert.equal(hash.length, 64);
  });

  await t.test(
    "should reject captured payment with mismatched amount",
    async () => {
      prisma.payment.findFirst = async () => createPayment();

      prisma.paymentWebhookEvent.create =
        async () => createWebhookRecord();

      prisma.paymentWebhookEvent.update = async () => ({});

      const event = createCapturedEvent();
      event.payload.payment.entity.amount = 100;

      await assert.rejects(
        paymentWebhookService.handleWebhookEvent({
          eventId: "event-mismatch-123",
          event,
          rawBody: createRawBody(),
        }),
        { code: "WEBHOOK_PAYMENT_MISMATCH" }
      );
    }
  );

  await t.test(
    "should reject captured event when payment is not captured",
    async () => {
      prisma.payment.findFirst = async () => createPayment();

      prisma.paymentWebhookEvent.create =
        async () => createWebhookRecord();

      prisma.paymentWebhookEvent.update = async () => ({});

      const event = createCapturedEvent();
      event.payload.payment.entity.status = "authorized";

      await assert.rejects(
        paymentWebhookService.handleWebhookEvent({
          eventId: "event-not-captured-123",
          event,
          rawBody: createRawBody(),
        }),
        { code: "WEBHOOK_PAYMENT_NOT_CAPTURED" }
      );
    }
  );

  await t.test("should ignore unsupported webhook events", async () => {
    let markedProcessed = false;

    prisma.paymentWebhookEvent.create =
      async () =>
        createWebhookRecord({
          eventType: "some.unsupported.event",
        });

    prisma.paymentWebhookEvent.update = async () => {
      markedProcessed = true;
      return {};
    };

    const result =
      await paymentWebhookService.handleWebhookEvent({
        eventId: "event-unsupported-123",
        event: {
          event: "some.unsupported.event",
          payload: {},
        },
        rawBody: createRawBody(),
      });

    assert.equal(result.processed, true);
    assert.equal(result.ignored, true);
    assert.equal(markedProcessed, true);
  });

  await t.test(
    "should return duplicate for an already processed webhook",
    async () => {
      const webhookRecord = createWebhookRecord({
        processedAt: new Date(),
      });

      prisma.paymentWebhookEvent.create = async () => {
        const error = new Error("Unique constraint failed");
        error.code = "P2002";
        throw error;
      };

      prisma.paymentWebhookEvent.findUnique =
        async () => webhookRecord;

      const result =
        await paymentWebhookService.handleWebhookEvent({
          eventId: "event-duplicate-123",
          event: createCapturedEvent(),
          rawBody: createRawBody(),
        });

      assert.equal(result.processed, true);
      assert.equal(result.duplicate, true);
    }
  );

  await t.test(
    "should reject duplicate event ID with a different payload",
    async () => {
      prisma.paymentWebhookEvent.create = async () => {
        const error = new Error("Unique constraint failed");
        error.code = "P2002";
        throw error;
      };

      prisma.paymentWebhookEvent.findUnique =
        async () =>
          createWebhookRecord({
            payloadHash: "different-payload-hash",
          });

      await assert.rejects(
        paymentWebhookService.handleWebhookEvent({
          eventId: "event-conflict-123",
          event: createCapturedEvent(),
          rawBody: createRawBody(),
        }),
        { code: "WEBHOOK_PAYLOAD_CONFLICT" }
      );
    }
  );

  await t.test("should mark pending payment as failed", async () => {
    let updateManyCalled = false;
    let markedProcessed = false;

    prisma.payment.findFirst = async () => createPayment();

    prisma.paymentWebhookEvent.create =
      async () =>
        createWebhookRecord({
          eventType: "payment.failed",
        });

    prisma.paymentWebhookEvent.update = async () => {
      markedProcessed = true;
      return {};
    };

    prisma.payment.updateMany = async (args) => {
      updateManyCalled = true;

      assert.equal(args.data.status, PaymentStatus.FAILED);

      assert.deepEqual(args.where.status.in, [
        PaymentStatus.CREATED,
        PaymentStatus.PENDING,
      ]);

      return { count: 1 };
    };

    const event = createCapturedEvent();
    event.event = "payment.failed";
    event.payload.payment.entity.status = "failed";
    event.payload.payment.entity.error_code = "PAYMENT_ERROR";

    const result =
      await paymentWebhookService.handleWebhookEvent({
        eventId: "event-failed-123",
        event,
        rawBody: createRawBody(),
      });

    assert.equal(updateManyCalled, true);
    assert.equal(markedProcessed, true);
    assert.equal(result.processed, true);
    assert.equal(result.paymentMarkedFailed, true);
  });

  await t.test(
    "should activate subscription and create invoice for captured payment",
    async () => {
      const { tx, calls, payment, subscription } =
        createMockTransaction();

      let webhookUpdateCount = 0;
      let markedProcessed = false;

      prisma.payment.findFirst = async () => payment;

      prisma.paymentWebhookEvent.create =
        async () => createWebhookRecord();

      prisma.paymentWebhookEvent.update = async ({ data }) => {
        webhookUpdateCount++;

        if (data.processedAt) {
          markedProcessed = true;
        }

        return {};
      };

      prisma.$transaction = async (callback) => callback(tx);

      const result =
        await paymentWebhookService.handleWebhookEvent({
          eventId: "event-success-123",
          event: createCapturedEvent(),
          rawBody: createRawBody(),
        });

      assert.equal(result.processed, true);
      assert.equal(result.paymentStatus, PaymentStatus.SUCCEEDED);
      assert.equal(result.subscriptionStatus, "ACTIVE");
      assert.equal(result.invoiceId, "invoice-123");
      assert.equal(result.alreadyActivated, false);

      assert.equal(payment.status, PaymentStatus.SUCCEEDED);
      assert.equal(subscription.status, "ACTIVE");

      assert.equal(calls.paymentUpdate.length, 1);
      assert.equal(calls.subscriptionUpdate.length, 1);
      assert.equal(calls.history.length, 1);
      assert.equal(calls.invoice.length, 1);

      assert.equal(webhookUpdateCount, 2);
      assert.equal(markedProcessed, true);
    }
  );

  await t.test(
    "should recover expired payment through captured webhook",
    async () => {
      const { tx, calls, payment, subscription } =
        createMockTransaction({
          paymentStatus: PaymentStatus.EXPIRED,
          subscriptionStatus: "EXPIRED",
        });

      let markedProcessed = false;

      prisma.payment.findFirst = async () => payment;

      prisma.paymentWebhookEvent.create =
        async () => createWebhookRecord();

      prisma.paymentWebhookEvent.update = async ({ data }) => {
        if (data.processedAt) {
          markedProcessed = true;
        }

        return {};
      };

      prisma.$transaction = async (callback) => callback(tx);

      const event = createCapturedEvent();

      event.payload.payment.entity.id =
        "provider-payment-late-123";

      const result =
        await paymentWebhookService.handleWebhookEvent({
          eventId: "event-expired-recovery-123",
          event,
          rawBody: createRawBody(),
        });

      assert.equal(result.processed, true);
      assert.equal(result.paymentStatus, PaymentStatus.SUCCEEDED);
      assert.equal(result.subscriptionStatus, "ACTIVE");
      assert.equal(result.recoveredFromExpired, true);
      assert.equal(result.alreadyActivated, false);

      assert.equal(payment.status, PaymentStatus.SUCCEEDED);
      assert.equal(subscription.status, "ACTIVE");

      assert.equal(calls.paymentUpdate.length, 1);
      assert.equal(calls.subscriptionUpdate.length, 1);
      assert.equal(calls.invoice.length, 1);

      assert.equal(calls.history.length, 1);
      assert.equal(calls.history[0].previousStatus, "EXPIRED");
      assert.equal(calls.history[0].newStatus, "ACTIVE");

      assert.equal(
        calls.history[0].details.recoveredFromExpired,
        true
      );

      assert.equal(markedProcessed, true);
    }
  );
});

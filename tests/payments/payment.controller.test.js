const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const servicePath = require.resolve(
  "../../src/modules/payments/services/payment.service"
);

const envPath = require.resolve("../../src/config/env");

const controllerPath = require.resolve(
  "../../src/modules/payments/controllers/payment.controller"
);

const originalService = require.cache[servicePath];
const originalEnv = require.cache[envPath];
const originalController = require.cache[controllerPath];

const SECRET = "test_webhook_secret";

const calls = [];

const mockPaymentService = {
  handleWebhookEvent: async (data) => {
    calls.push(data);

    return {
      processed: true,
      message: "Webhook processed",
    };
  },
};

const mockEnv = {
  RAZORPAY_WEBHOOK_SECRET: SECRET,
};

require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: mockPaymentService,
};

require.cache[envPath] = {
  id: envPath,
  filename: envPath,
  loaded: true,
  exports: mockEnv,
};

delete require.cache[controllerPath];

const { handleWebhook } = require(controllerPath);

function createSignature(body, secret = SECRET) {
  return crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
}

function createRequest({
  body = Buffer.from(
    JSON.stringify({ event: "payment.captured" })
  ),
  signature,
  eventId = "evt_test_123",
} = {}) {
  return {
    body,
    headers: {
      "x-razorpay-signature":
        signature || createSignature(body),
      "x-razorpay-event-id": eventId,
    },
  };
}

function createResponse() {
  return {
    statusCode: null,
    responseBody: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.responseBody = data;
      return this;
    },
  };
}

test("Payment controller webhook signature tests", async (t) => {
  t.after(() => {
    if (originalService) {
      require.cache[servicePath] = originalService;
    } else {
      delete require.cache[servicePath];
    }

    if (originalEnv) {
      require.cache[envPath] = originalEnv;
    } else {
      delete require.cache[envPath];
    }

    if (originalController) {
      require.cache[controllerPath] = originalController;
    } else {
      delete require.cache[controllerPath];
    }
  });

  t.beforeEach(() => {
    calls.length = 0;
    mockEnv.RAZORPAY_WEBHOOK_SECRET = SECRET;
  });

  await t.test("accepts a valid Razorpay signature", async () => {
    const body = Buffer.from(
      JSON.stringify({ event: "payment.captured" })
    );

    const req = createRequest({ body });
    const res = createResponse();
    let nextCalled = false;

    await handleWebhook(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.responseBody.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].eventId, "evt_test_123");
    assert.equal(calls[0].event.event, "payment.captured");
    assert.ok(Buffer.isBuffer(calls[0].rawBody));
    assert.equal(nextCalled, false);
  });

  await t.test("rejects an invalid signature", async () => {
    const body = Buffer.from(
      JSON.stringify({ event: "payment.captured" })
    );

    const req = createRequest({
      body,
      signature: "a".repeat(64),
    });

    const res = createResponse();

    await handleWebhook(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.responseBody.code,
      "INVALID_WEBHOOK_SIGNATURE"
    );
    assert.equal(calls.length, 0);
  });

  await t.test("rejects a missing signature", async () => {
    const req = createRequest();

    delete req.headers["x-razorpay-signature"];

    const res = createResponse();

    await handleWebhook(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.responseBody.code,
      "INVALID_WEBHOOK_HEADERS"
    );
    assert.equal(calls.length, 0);
  });

  await t.test("rejects an invalid signature format", async () => {
    const req = createRequest({
      signature: "invalid-signature",
    });

    const res = createResponse();

    await handleWebhook(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.responseBody.code,
      "INVALID_WEBHOOK_HEADERS"
    );
    assert.equal(calls.length, 0);
  });

  await t.test("rejects a missing event ID", async () => {
    const req = createRequest();

    delete req.headers["x-razorpay-event-id"];

    const res = createResponse();

    await handleWebhook(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.responseBody.code,
      "INVALID_WEBHOOK_HEADERS"
    );
    assert.equal(calls.length, 0);
  });

  await t.test("rejects a non-Buffer request body", async () => {
  const req = createRequest({
    body: { event: "payment.captured" },
    signature: "a".repeat(64),
  });

  const res = createResponse();

  await handleWebhook(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(
    res.responseBody.code,
    "INVALID_WEBHOOK_BODY"
  );
  assert.equal(calls.length, 0);
});


  await t.test("returns 503 when webhook secret is missing", async () => {
    mockEnv.RAZORPAY_WEBHOOK_SECRET = "";

    const req = createRequest();
    const res = createResponse();

    await handleWebhook(req, res, () => {});

    assert.equal(res.statusCode, 503);
    assert.equal(
      res.responseBody.code,
      "WEBHOOK_NOT_CONFIGURED"
    );
    assert.equal(calls.length, 0);
  });

  await t.test("rejects invalid JSON after signature verification", async () => {
    const body = Buffer.from("{invalid-json");

    const req = createRequest({
      body,
      signature: createSignature(body),
    });

    const res = createResponse();

    await handleWebhook(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.responseBody.code,
      "INVALID_WEBHOOK_JSON"
    );
    assert.equal(calls.length, 0);
  });

  await t.test("rejects payload without event name", async () => {
    const body = Buffer.from(
      JSON.stringify({ payload: {} })
    );

    const req = createRequest({
      body,
      signature: createSignature(body),
    });

    const res = createResponse();

    await handleWebhook(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.responseBody.code,
      "INVALID_WEBHOOK_EVENT"
    );
    assert.equal(calls.length, 0);
  });
});
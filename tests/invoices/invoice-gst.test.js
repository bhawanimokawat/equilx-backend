
const { test } = require("node:test");
const assert = require("node:assert/strict");

// Test configuration — set before importing billing config.
process.env.BILLING_GST_ENABLED = "true";
process.env.BILLING_SELLER_LEGAL_NAME = "Equilx Corporation";
process.env.BILLING_SELLER_ADDRESS = "Jaipur, Rajasthan";
process.env.BILLING_SELLER_STATE = "Rajasthan";
process.env.BILLING_SELLER_STATE_CODE = "08";
process.env.BILLING_SELLER_GSTIN = "08ABCDE1234F1Z5";
process.env.BILLING_SELLER_COUNTRY = "IN";

const { createInvoice } = require(
  "../../src/modules/invoices/services/invoice-creation.service"
);

const createMockTransaction = (buyerStateCode) => {
  let createdInvoice;

  const tx = {
    invoice: {
      findUnique: async () => null,
      create: async ({ data }) => {
        createdInvoice = {
          id: "test-invoice-id",
          ...data,
        };
        return createdInvoice;
      },
    },

    payment: {
      findUnique: async () => ({
        id: "test-payment-id",
        subscriptionId: "test-subscription-id",
        status: "SUCCEEDED",
        amountInclGst: "1180.00",
        currency: "INR",

        subscription: {
          id: "test-subscription-id",
          userId: "test-user-id",
          instituteId: null,
          gstRate: "18",

          user: {
            email: "student@example.com",
            profile: {
              name: "Test Student",
              billingState: "Test State",
              billingStateCode: buyerStateCode,
              billingCountry: "IN",
            },
          },

          institute: null,
        },
      }),
    },
  };

  return {
    tx,
    getCreatedInvoice: () => createdInvoice,
  };
};

test("Same-state transaction calculates CGST and SGST", async () => {
  const { tx, getCreatedInvoice } = createMockTransaction("08");

  await createInvoice({
    tx,
    paymentId: "test-payment-id",
    subscriptionId: "test-subscription-id",
  });

  const invoice = getCreatedInvoice();

  assert.equal(invoice.subtotal, "1000.00");
  assert.equal(invoice.gstRate, "18.00");
  assert.equal(invoice.cgstAmount, "90.00");
  assert.equal(invoice.sgstAmount, "90.00");
  assert.equal(invoice.igstAmount, "0.00");
  assert.equal(invoice.totalAmount, "1180.00");
  assert.equal(invoice.documentType, "GST_TAX_INVOICE");
});

test("Interstate transaction calculates IGST", async () => {
  const { tx, getCreatedInvoice } = createMockTransaction("09");

  await createInvoice({
    tx,
    paymentId: "test-payment-id",
    subscriptionId: "test-subscription-id",
  });

  const invoice = getCreatedInvoice();

  assert.equal(invoice.subtotal, "1000.00");
  assert.equal(invoice.gstRate, "18.00");
  assert.equal(invoice.cgstAmount, "0.00");
  assert.equal(invoice.sgstAmount, "0.00");
  assert.equal(invoice.igstAmount, "180.00");
  assert.equal(invoice.totalAmount, "1180.00");
  assert.equal(invoice.documentType, "GST_TAX_INVOICE");
});



test("GST disabled creates a commercial invoice with zero tax", async () => {
  process.env.BILLING_GST_ENABLED = "false";

  // Reload config and service so the disabled setting is applied.
  const configPath = require.resolve(
    "../../src/config/billing.config"
  );
  const servicePath = require.resolve(
    "../../src/modules/invoices/services/invoice-creation.service"
  );

  delete require.cache[servicePath];
  delete require.cache[configPath];

  const { createInvoice: createInvoiceWithoutGST } = require(
    "../../src/modules/invoices/services/invoice-creation.service"
  );

  const { tx, getCreatedInvoice } = createMockTransaction("08");

  await createInvoiceWithoutGST({
    tx,
    paymentId: "test-payment-id",
    subscriptionId: "test-subscription-id",
  });

  const invoice = getCreatedInvoice();

  assert.equal(invoice.subtotal, "1180.00");
  assert.equal(invoice.gstRate, "0.00");
  assert.equal(invoice.cgstAmount, "0.00");
  assert.equal(invoice.sgstAmount, "0.00");
  assert.equal(invoice.igstAmount, "0.00");
  assert.equal(invoice.totalAmount, "1180.00");
  assert.equal(invoice.documentType, "COMMERCIAL");
});

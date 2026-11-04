const getEnv = (key, fallback = "") =>
  process.env[key]?.trim() || fallback;

const isEnabled = (value) => value === "true";

const billingConfig = Object.freeze({
  seller: Object.freeze({
    legalName: getEnv("BILLING_SELLER_LEGAL_NAME"),
    tradeName: getEnv("BILLING_SELLER_TRADE_NAME"),
    gstin: getEnv("BILLING_SELLER_GSTIN"),

    email: getEnv("BILLING_SELLER_EMAIL"),
    phone: getEnv("BILLING_SELLER_PHONE"),

    address: getEnv("BILLING_SELLER_ADDRESS"),
    city: getEnv("BILLING_SELLER_CITY"),
    state: getEnv("BILLING_SELLER_STATE"),
    stateCode: getEnv("BILLING_SELLER_STATE_CODE"),
    postalCode: getEnv("BILLING_SELLER_POSTAL_CODE"),
    country: getEnv("BILLING_SELLER_COUNTRY", "India"),
  }),

  tax: Object.freeze({
    gstEnabled: isEnabled(process.env.BILLING_GST_ENABLED),
    gstRate: 18,

    // Configure these using verified business/tax information.
    sacCode: getEnv("BILLING_SAC_CODE"),
    serviceDescription: getEnv(
      "BILLING_SERVICE_DESCRIPTION",
      "IELTS learning platform subscription"
    ),
  }),

  invoice: Object.freeze({
    prefix: getEnv("BILLING_INVOICE_PREFIX", "EQX"),
    currency: "INR",
  }),
});

module.exports = billingConfig;

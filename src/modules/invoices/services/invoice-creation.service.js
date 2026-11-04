
const crypto = require("crypto");
const { Prisma } = require("@prisma/client");
const billingConfig = require("../../../config/billing.config");

const createError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const toDecimal = (value) => {
  try {
    return new Prisma.Decimal(value);
  } catch {
    throw createError("Invalid monetary value.", 400, "INVALID_MONETARY_VALUE");
  }
};

const toMoney = (value) => value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

const getBuyerDetails = async (tx, subscription) => {
  const hasUser = Boolean(subscription.userId);
  const hasInstitute = Boolean(subscription.instituteId);

  if (hasUser === hasInstitute) {
    throw createError(
      "Subscription must have exactly one owner.",
      409,
      "INVALID_SUBSCRIPTION_OWNER"
    );
  }

  if (hasUser) {
    const user = subscription.user;

    if (!user) {
      throw createError("Subscription owner was not found.", 404, "USER_NOT_FOUND");
    }

    const profile = user.profile;

    return {
      buyerName: profile?.billingName || profile?.name || user.email,
      buyerEmail: profile?.billingEmail || user.email,
      buyerGstin: profile?.gstin || null,
      buyerAddress: profile?.billingAddress || null,
      buyerCity: profile?.billingCity || null,
      buyerState: profile?.billingState || null,
      buyerStateCode: profile?.billingStateCode || null,
      buyerPostalCode: profile?.billingPostalCode || null,
      buyerCountry: profile?.billingCountry || "IN",
    };
  }

  const institute = subscription.institute;

  if (!institute) {
    throw createError("Institute was not found.", 404, "INSTITUTE_NOT_FOUND");
  }

  let billingEmail = institute.billingEmail;

  // Temporary contact fallback if the institute has not supplied a billing email.
  if (!billingEmail) {
    const creator = await tx.user.findUnique({
      where: { id: institute.createdById },
      select: { email: true },
    });

    billingEmail = creator?.email || null;
  }

  if (!billingEmail) {
    throw createError(
      "Institute billing email is missing.",
      400,
      "BUYER_BILLING_EMAIL_REQUIRED"
    );
  }

  return {
    buyerName: institute.billingLegalName || institute.name,
    buyerEmail: billingEmail,
    buyerGstin: institute.gstin || null,
    buyerAddress: institute.billingAddress || null,
    buyerCity: institute.billingCity || null,
    buyerState: institute.billingState || null,
    buyerStateCode: institute.billingStateCode || null,
    buyerPostalCode: institute.billingPostalCode || null,
    buyerCountry: institute.billingCountry || "IN",
  };
};

const generateInvoiceNumber = () => {
  const prefix = billingConfig.invoice.prefix;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(8).toString("hex").toUpperCase();

  return `${prefix}-${date}-${randomPart}`;
};

const createInvoice = async ({ tx, paymentId, subscriptionId }) => {
  if (!tx || !paymentId || !subscriptionId) {
    throw createError(
      "Transaction, payment ID and subscription ID are required.",
      400,
      "INVOICE_INPUT_REQUIRED"
    );
  }

  // A unique paymentId prevents more than one invoice per payment.
  const existingInvoice = await tx.invoice.findUnique({
    where: { paymentId },
  });

  if (existingInvoice) {
    if (existingInvoice.subscriptionId !== subscriptionId) {
      throw createError(
        "Payment is already associated with another subscription invoice.",
        409,
        "INVOICE_PAYMENT_CONFLICT"
      );
    }

    return existingInvoice;
  }

  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: {
      subscription: {
        include: {
          user: {
            include: { profile: true },
          },
          institute: true,
        },
      },
    },
  });

  if (!payment || payment.subscriptionId !== subscriptionId) {
    throw createError(
      "Payment or subscription not found.",
      404,
      "PAYMENT_OR_SUBSCRIPTION_NOT_FOUND"
    );
  }

  if (payment.status !== "SUCCEEDED") {
    throw createError(
      "An invoice can only be created for a successful payment.",
      409,
      "PAYMENT_NOT_SUCCESSFUL"
    );
  }

  const subscription = payment.subscription;

  if (!subscription) {
    throw createError(
      "Subscription was not found.",
      404,
      "SUBSCRIPTION_NOT_FOUND"
    );
  }

  const seller = billingConfig.seller;
  const taxConfig = billingConfig.tax;

  const sellerCountry = seller.country || "IN";

if (!/^[A-Z]{2}$/.test(sellerCountry)) {
  throw createError(
    "Seller country must be a valid two-letter country code.",
    500,
    "INVALID_SELLER_COUNTRY"
  );
}

  if (!seller.legalName || !seller.address) {
    throw createError(
      "Equilx seller legal name and address must be configured.",
      503,
      "SELLER_BILLING_CONFIGURATION_INCOMPLETE"
    );
  }

  const buyer = await getBuyerDetails(tx, subscription);

  const totalAmount = toDecimal(payment.amountInclGst);

  if (!totalAmount.isFinite() || totalAmount.lte(0)) {
    throw createError(
      "Payment amount is invalid.",
      400,
      "INVALID_PAYMENT_AMOUNT"
    );
  }

  let subtotal = totalAmount;
  let gstRate = new Prisma.Decimal(0);
  let cgstAmount = new Prisma.Decimal(0);
  let sgstAmount = new Prisma.Decimal(0);
  let igstAmount = new Prisma.Decimal(0);

  let documentType = "COMMERCIAL";

  if (taxConfig.gstEnabled) {
    const sellerStateCode = seller.stateCode;
    const buyerStateCode = buyer.buyerStateCode;

    if (
      !seller.gstin ||
      !/^\d{2}[A-Z0-9]{13}$/.test(seller.gstin) ||
      !/^\d{2}$/.test(sellerStateCode || "") ||
      !/^\d{2}$/.test(buyerStateCode || "")
    ) {
      throw createError(
        "Valid seller GSTIN and buyer/seller state codes are required.",
        400,
        "GST_CONFIGURATION_INCOMPLETE"
      );
    }

    if (!seller.state) {
      throw createError(
        "Seller state is required for a GST invoice.",
        400,
        "SELLER_STATE_REQUIRED"
      );
    }

    const configuredRate = toDecimal(subscription.gstRate);


    if (
      !configuredRate.isFinite() ||
      configuredRate.lte(0) ||
      configuredRate.gt(100)
    ) {
      throw createError(
        "Configured GST rate is invalid.",
        500,
        "INVALID_GST_RATE"
      );
    }

    gstRate = configuredRate;

    // Payment amount is GST-inclusive.
    const divisor = new Prisma.Decimal(1).plus(
      gstRate.dividedBy(100)
    );

    subtotal = toMoney(totalAmount.dividedBy(divisor));

    const totalGst = toMoney(totalAmount.minus(subtotal));

    if (buyerStateCode === sellerStateCode) {
      cgstAmount = toMoney(totalGst.dividedBy(2));

      // Assign the rounding remainder to SGST so the total always reconciles.
      sgstAmount = toMoney(totalGst.minus(cgstAmount));
    } else {
      igstAmount = totalGst;
    }

    documentType = "GST_TAX_INVOICE";
  }

  const invoiceNumber = generateInvoiceNumber();

  return tx.invoice.create({
    data: {
      subscriptionId,
      paymentId,
      invoiceNumber,
      documentType,
      status: "ISSUED",

      currency: payment.currency,

      subtotal: subtotal.toFixed(2),
      gstRate: gstRate.toFixed(2),
      cgstAmount: cgstAmount.toFixed(2),
      sgstAmount: sgstAmount.toFixed(2),
      igstAmount: igstAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),

      buyerName: buyer.buyerName,
      buyerEmail: buyer.buyerEmail,
      buyerGstin: buyer.buyerGstin,
      placeOfSupply: buyer.buyerState || null,

      buyerAddress: buyer.buyerAddress,
      buyerCity: buyer.buyerCity,
      buyerState: buyer.buyerState,
      buyerStateCode: buyer.buyerStateCode,
      buyerPostalCode: buyer.buyerPostalCode,
      buyerCountry: buyer.buyerCountry,

      sellerLegalName: seller.legalName,
      sellerGstin: taxConfig.gstEnabled ? seller.gstin : null,
      sellerAddress: seller.address,
      sellerState: seller.state || null,
      sellerStateCode: seller.stateCode || null,
      sellerCountry: sellerCountry,

      sacCode: taxConfig.gstEnabled ? taxConfig.sacCode || null : null,
      description: taxConfig.serviceDescription,
    },
  });
};

module.exports = { createInvoice };

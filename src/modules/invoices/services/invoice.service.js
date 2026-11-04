
const { prisma } = require("../../../config/database");

const PAGE_SIZE = 20;

const getAuthorizedInstituteIds = async (userId) => {
  const memberships = await prisma.instituteMembership.findMany({
    where: {
      userId,
      role: "INSTITUTE_ADMIN",
      status: "ACTIVE",
    },
    select: {
      instituteId: true,
    },
  });

  return memberships.map((membership) => membership.instituteId);
};

const buildInvoiceAccessFilter = (userId, instituteIds) => {
  const accessConditions = [
    {
      subscription: {
        is: {
          userId,
          instituteId: null,
        },
      },
    },
  ];

  if (instituteIds.length > 0) {
    accessConditions.push({
      subscription: {
        is: {
          instituteId: {
            in: instituteIds,
          },
          userId: null,
        },
      },
    });
  }

  return {
    OR: accessConditions,
  };
};

const listInvoices = async ({
  userId,
  page = 1,
} = {}) => {
  if (!userId) {
    const error = new Error("User ID is required.");
    error.statusCode = 400;
    error.code = "USER_ID_REQUIRED";
    throw error;
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const instituteIds = await getAuthorizedInstituteIds(userId);

  const where = buildInvoiceAccessFilter(userId, instituteIds);

  const [invoices, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      orderBy: {
        issuedAt: "desc",
      },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        currency: true,
        subtotal: true,
        gstRate: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        totalAmount: true,
        issuedAt: true,
        buyerName: true,
        buyerEmail: true,
      },
    }),

    prisma.invoice.count({
      where,
    }),
  ]);

  return {
    invoices,
    pagination: {
      currentPage,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
};

const getInvoiceById = async ({
  invoiceId,
  userId,
} = {}) => {
  if (!invoiceId || !userId) {
    const error = new Error("Invoice ID and user ID are required.");
    error.statusCode = 400;
    error.code = "REQUIRED_FIELDS_MISSING";
    throw error;
  }

  const instituteIds = await getAuthorizedInstituteIds(userId);

  const accessFilter = buildInvoiceAccessFilter(
    userId,
    instituteIds
  );

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      ...accessFilter,
    },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      gstRate: true,
      cgstAmount: true,
      sgstAmount: true,
      igstAmount: true,
      totalAmount: true,
      buyerName: true,
      buyerEmail: true,
      buyerGstin: true,
      placeOfSupply: true,
      issuedAt: true,
      createdAt: true,

      subscription: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          plan: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },

      payment: {
        select: {
          id: true,
          status: true,
          provider: true,
          providerPaymentId: true,
          paidAt: true,
        },
      },
    },
  });

  if (!invoice) {
    return null;
  }

  return invoice;
};

module.exports = {
  listInvoices,
  getInvoiceById,
};

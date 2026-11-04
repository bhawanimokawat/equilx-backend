const invoiceService = require("../services/invoice.service");
const { listInvoicesSchema, invoiceIdSchema,} = require("../validation/invoice.validation");
const invoicePdfService = require("../services/invoice-pdf.service");

const listInvoices = async (req, res, next) => {
  try {
    const validation = listInvoicesSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid invoice filters.",
          details: validation.error.issues,
        },
      });
    }

    const result = await invoiceService.listInvoices({
      userId: req.user.id,
      page: validation.data.page,
    });

    return res.status(200).json({
      success: true,
      message: "Invoices retrieved successfully.",
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const validation = invoiceIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid invoice ID.",
          details: validation.error.issues,
        },
      });
    }

    const invoice = await invoiceService.getInvoiceById({
      invoiceId: validation.data.invoiceId,
      userId: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          code: "INVOICE_NOT_FOUND",
          message: "Invoice not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice retrieved successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};


const downloadInvoice = async (req, res, next) => {
  try {
    const validation = invoiceIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid invoice ID.",
          details: validation.error.issues,
        },
      });
    }

    const invoice = await invoiceService.getInvoiceById({
      invoiceId: validation.data.invoiceId,
      userId:req.user.id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: {
          code: "INVOICE_NOT_FOUND",
          message: "Invoice not found.",
        },
      });
    }

    invoicePdfService.generateInvoicePdf(invoice, res);
  } catch (error) {
    if (res.headersSent) {
      return res.destroy(error);
    }

    next(error);
  }
};


module.exports = {
  listInvoices,
  getInvoiceById,
  downloadInvoice,
};

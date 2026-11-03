const express = require("express");
const invoiceController = require("../controllers/invoice.controller");
const { requireAuth } = require("../../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", invoiceController.listInvoices);

router.get("/:invoiceId/download", invoiceController.downloadInvoice);

router.get("/:invoiceId", invoiceController.getInvoiceById);

module.exports = router;

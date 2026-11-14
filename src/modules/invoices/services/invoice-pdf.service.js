
const PDFDocument = require("pdfkit");

const formatAmount = (amount) =>
  Number(amount || 0).toFixed(2);

const generateInvoicePdf = (invoice, res) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
  });

  const filename = `${invoice.invoiceNumber}.pdf`;

  const isGstInvoice =
    invoice.documentType === "GST_TAX_INVOICE";

  res.setHeader("Content-Type", "application/pdf");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  doc.pipe(res);

  // Header
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("EQUILX IELTS");

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      isGstInvoice ? "GST Tax Invoice" : "Commercial Invoice"
    );

  doc.moveDown();

  // Invoice information
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Invoice Details");

  doc.font("Helvetica").fontSize(10);

  doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
  doc.text(`Status: ${invoice.status}`);

  doc.text(
    `Issue Date: ${new Date(invoice.issuedAt).toLocaleDateString("en-IN")}`
  );

  doc.moveDown();

  // Buyer information
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Bill To");

  doc.font("Helvetica").fontSize(10);

  doc.text(invoice.buyerName);
  doc.text(invoice.buyerEmail);

  if (invoice.buyerAddress) {
    doc.text(invoice.buyerAddress);
  }

  if (invoice.buyerCity) {
    doc.text(invoice.buyerCity);
  }

  if (invoice.buyerState) {
    doc.text(`State: ${invoice.buyerState}`);
  }

  if (invoice.buyerGstin) {
    doc.text(`GSTIN: ${invoice.buyerGstin}`);
  }

  if (invoice.placeOfSupply) {
    doc.text(`Place of Supply: ${invoice.placeOfSupply}`);
  }

  doc.moveDown();

  // Subscription information
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Subscription");

  doc.font("Helvetica").fontSize(10);

  doc.text(`Plan: ${invoice.subscription.plan.name}`);
  doc.text(`Plan Code: ${invoice.subscription.plan.code}`);

  doc.moveDown();

  // Amount breakdown
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Amount Details");

  doc.moveDown(0.5);

  doc.font("Helvetica").fontSize(10);

  doc.text(
    `Subtotal: ${invoice.currency} ${formatAmount(invoice.subtotal)}`
  );

  if (isGstInvoice) {
    doc.text(
      `GST Rate: ${formatAmount(invoice.gstRate)}%`
    );

    if (Number(invoice.cgstAmount) > 0) {
      doc.text(
        `CGST: ${invoice.currency} ${formatAmount(invoice.cgstAmount)}`
      );
    }

    if (Number(invoice.sgstAmount) > 0) {
      doc.text(
        `SGST: ${invoice.currency} ${formatAmount(invoice.sgstAmount)}`
      );
    }

    if (Number(invoice.igstAmount) > 0) {
      doc.text(
        `IGST: ${invoice.currency} ${formatAmount(invoice.igstAmount)}`
      );
    }
  }

  doc.moveDown();

  // Total amount
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(
      `Total Amount: ${invoice.currency} ${formatAmount(invoice.totalAmount)}`
    );

  // Void invoice indicator
  if (invoice.status === "VOID") {
    doc.moveDown();

    doc
      .fontSize(12)
      .fillColor("red")
      .text("VOID INVOICE", { align: "center" });
  }

  doc.end();

  return doc;
};

module.exports = {
  generateInvoicePdf,
};


const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("stream");
const fs = require("node:fs");
const path = require("node:path");

const {
  generateInvoicePdf,
} = require("../../src/modules/invoices/services/invoice-pdf.service");

// Create test invoice for intra-state, inter-state and commercial cases.
const createInvoice = (documentType, taxType = "INTRA_STATE") => {
  const isGst = documentType === "GST_TAX_INVOICE";
  const isInterState = isGst && taxType === "INTER_STATE";

  return {
    invoiceNumber: "EQX-TEST-001",
    status: "ISSUED",
    issuedAt: new Date("2026-11-11T10:00:00Z"),

    documentType,
    currency: "INR",

    subtotal: "1000.00",
    gstRate: isGst ? "18.00" : "0.00",

    cgstAmount: isGst && !isInterState ? "90.00" : "0.00",
    sgstAmount: isGst && !isInterState ? "90.00" : "0.00",
    igstAmount: isInterState ? "180.00" : "0.00",

    totalAmount: isGst ? "1180.00" : "1000.00",

    buyerName: "Test Student",
    buyerEmail: "student@example.com",
    buyerAddress: isInterState ? "Ahmedabad" : "Jaipur",
    buyerCity: isInterState ? "Ahmedabad" : "Jaipur",
    buyerState: isInterState ? "Gujarat" : "Rajasthan",
    buyerGstin: null,
    placeOfSupply: isInterState ? "Gujarat" : "Rajasthan",

    subscription: {
      plan: {
        name: "Student Pro",
        code: "STUDENT_PRO",
      },
    },
  };
};

// Generate PDF buffer.
const generatePdfBuffer = async (invoice) => {
  const response = new PassThrough();
  const chunks = [];

  response.setHeader = (name, value) => {
    response.headers = response.headers || {};
    response.headers[name] = value;
  };

  response.on("data", (chunk) => chunks.push(chunk));

  const completed = new Promise((resolve, reject) => {
    response.on("end", resolve);
    response.on("error", reject);
  });

  generateInvoicePdf(invoice, response);

  await completed;

  return {
    buffer: Buffer.concat(chunks),
    headers: response.headers,
  };
};

// Extract actual text from generated PDF using PDF.js.
const extractPdfText = async (buffer) => {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    text += content.items
      .map((item) => item.str)
      .join(" ");
  }

  return text;
};

// Save generated test PDF files.
const saveTestPdf = (filename, buffer) => {
  const outputDirectory = path.join(__dirname, "generated");

  fs.mkdirSync(outputDirectory, { recursive: true });

  const filePath = path.join(outputDirectory, filename);

  fs.writeFileSync(filePath, buffer);

  return filePath;
};

// Verify common PDF response.
const verifyPdfResponse = (result) => {
  assert.equal(
    result.headers["Content-Type"],
    "application/pdf"
  );

  assert.match(
    result.headers["Content-Disposition"],
    /EQX-TEST-001\.pdf/
  );

  assert.ok(result.buffer.length > 0);

  assert.equal(
    result.buffer.subarray(0, 5).toString(),
    "%PDF-"
  );
};

// Test 1: Intra-state GST - CGST + SGST.
test("Intra-state GST invoice PDF contains CGST and SGST details", async () => {
  const result = await generatePdfBuffer(
    createInvoice("GST_TAX_INVOICE", "INTRA_STATE")
  );

  verifyPdfResponse(result);

  const pdfPath = saveTestPdf(
    "gst-intra-state-test.pdf",
    result.buffer
  );

  console.log("Intra-state GST PDF saved:", pdfPath);

  const text = await extractPdfText(result.buffer);

  assert.match(text, /GST Tax Invoice/i);
  assert.match(text, /18\.00\s*%/);
  assert.match(text, /Rajasthan/i);
  assert.match(text, /CGST/i);
  assert.match(text, /SGST/i);
  assert.match(text, /90\.00/);
  assert.match(text, /1180\.00/);

  assert.doesNotMatch(text, /IGST/i);
});

// Test 2: Inter-state GST - IGST.
test("Inter-state GST invoice PDF contains IGST details", async () => {
  const result = await generatePdfBuffer(
    createInvoice("GST_TAX_INVOICE", "INTER_STATE")
  );

  verifyPdfResponse(result);

  const pdfPath = saveTestPdf(
    "gst-inter-state-test.pdf",
    result.buffer
  );

  console.log("Inter-state GST PDF saved:", pdfPath);

  const text = await extractPdfText(result.buffer);

  assert.match(text, /GST Tax Invoice/i);
  assert.match(text, /18\.00\s*%/);
  assert.match(text, /Gujarat/i);
  assert.match(text, /IGST/i);
  assert.match(text, /180\.00/);
  assert.match(text, /1180\.00/);

  assert.doesNotMatch(text, /CGST/i);
  assert.doesNotMatch(text, /SGST/i);
});

// Test 3: Commercial invoice - no GST.
test("Commercial invoice PDF does not contain GST tax details", async () => {
  const result = await generatePdfBuffer(
    createInvoice("COMMERCIAL")
  );

  verifyPdfResponse(result);

  const pdfPath = saveTestPdf(
    "commercial-test-invoice.pdf",
    result.buffer
  );

  console.log("Commercial PDF saved:", pdfPath);

  const text = await extractPdfText(result.buffer);

  assert.match(text, /Commercial Invoice/i);
  assert.match(text, /1000\.00/);

  assert.doesNotMatch(text, /CGST/i);
  assert.doesNotMatch(text, /SGST/i);
  assert.doesNotMatch(text, /IGST/i);
});

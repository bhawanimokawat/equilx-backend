/**
 * @swagger
 * /invoices/:
 *   get:
 *     summary: Get all invoices
 *     description: Returns paginated invoices belonging to the authenticated user.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully.
 *       401:
 *         description: Authentication is required.
 */

/**
 * @swagger
 * /invoices/{invoiceId}:
 *   get:
 *     summary: Get invoice details
 *     description: Returns details of a specific invoice accessible to the authenticated user.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice details retrieved successfully.
 *       400:
 *         description: Invalid invoice ID.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Invoice not found.
 */

/**
 * @swagger
 * /invoices/{invoiceId}/download:
 *   get:
 *     summary: Download invoice
 *     description: Downloads the invoice file for the specified invoice.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice file downloaded successfully.
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid invoice ID.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Invoice or invoice file not found.
 */
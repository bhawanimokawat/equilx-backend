/**
 * @swagger
 * /payments/orders:
 *   post:
 *     summary: Create a payment order
 *     description: Creates a Razorpay order and the associated pending payment and subscription records for the authenticated individual user.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         description: Unique key used to prevent duplicate order creation.
 *         schema:
 *           type: string
 *           minLength: 16
 *           maxLength: 128
 *         example: equilx-test-student-pro-001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planVersionId
 *             properties:
 *               planVersionId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the selected plan version.
 *                 example: 06e1f45a-3d60-4b54-b1f3-9c27ffd3262a
 *     responses:
 *       201:
 *         description: Payment order created successfully.
 *       400:
 *         description: Invalid request body or Idempotency-Key.
 *       401:
 *         description: Authentication is required.
 *       409:
 *         description: Conflicting or duplicate payment order request.
 *       500:
 *         description: Internal server error.
 */
/**
 * @swagger
 * /payments/verify:
 *   post:
 *     summary: Verify a Razorpay payment
 *     description: Verifies the Razorpay payment signature, confirms payment details with Razorpay, and activates the subscription only after successful payment capture.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               paymentId:
 *                 type: string
 *                 format: uuid
 *                 description: Internal Equilx payment ID.
 *                 example: b96bb178-1352-4031-9b6a-9dcef9806ff1
 *               razorpay_order_id:
 *                 type: string
 *                 description: Razorpay order ID.
 *                 example: order_Tvb3TZQl2hjPUx
 *               razorpay_payment_id:
 *                 type: string
 *                 description: Genuine Razorpay payment ID.
 *                 example: pay_example123
 *               razorpay_signature:
 *                 type: string
 *                 description: Genuine 64-character hexadecimal Razorpay signature.
 *                 example: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
 *     responses:
 *       200:
 *         description: Payment verification completed successfully.
 *       400:
 *         description: Invalid request, payment signature, or payment details.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Payment record not found.
 *       409:
 *         description: Payment failed or has not been captured.
 *       503:
 *         description: Payment provider is unavailable.
 */
/**
 * @swagger
 * /payments/history:
 *   get:
 *     summary: Get payment history
 *     description: Retrieves the authenticated user's payment history with associated subscription and plan information.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment history retrieved successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           paymentId:
 *                             type: string
 *                             format: uuid
 *                           subscriptionId:
 *                             type: string
 *                             format: uuid
 *                           orderId:
 *                             type: string
 *                           amount:
 *                             type: string
 *                             example: "1500"
 *                           currency:
 *                             type: string
 *                             example: INR
 *                           paymentStatus:
 *                             type: string
 *                             example: CREATED
 *                           paidAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           subscription:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                                 example: PENDING_PAYMENT
 *                               plan:
 *                                 type: object
 *                                 properties:
 *                                   code:
 *                                     type: string
 *                                     example: STUDENT_PRO
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *       401:
 *         description: Authentication is required.
 */

/**
 * @swagger
 * /payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     description: Retrieves payment details and associated subscription information belonging to the authenticated user.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         description: Unique payment ID.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Payment not found or not accessible to the authenticated user.
 */

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Handle Razorpay webhook events
 *     description: Receives Razorpay payment events, verifies the webhook signature using the raw request body, and processes payment updates securely.
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: x-razorpay-signature
 *         required: true
 *         description: HMAC signature generated by Razorpay.
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-razorpay-event-id
 *         required: false
 *         description: Unique Razorpay webhook event ID used for duplicate-event protection.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Razorpay webhook event payload.
 *     responses:
 *       200:
 *         description: Webhook event received or processed successfully.
 *       400:
 *         description: Invalid webhook signature or malformed payload.
 *       409:
 *         description: Conflicting duplicate webhook event.
 *       500:
 *         description: Webhook processing failed.
 */
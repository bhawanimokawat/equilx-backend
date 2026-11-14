
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
 *     description: Verifies the Razorpay payment signature and confirms payment details with Razorpay. This endpoint does not activate the subscription. Subscription activation happens only after a verified Razorpay payment.captured or order.paid webhook is successfully processed.
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
 *                 description: Genuine 64-character hexadecimal Razorpay payment signature.
 *                 example: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
 *     responses:
 *       200:
 *         description: Payment verified successfully. Subscription activation is pending webhook confirmation.
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
 *                   example: Payment verification completed.
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                       format: uuid
 *                     orderId:
 *                       type: string
 *                       example: order_Tvb3TZQl2hjPUx
 *                     providerPaymentId:
 *                       type: string
 *                       example: pay_example123
 *                     paymentStatus:
 *                       type: string
 *                       example: CREATED
 *                     providerPaymentStatus:
 *                       type: string
 *                       example: captured
 *                     activationPending:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Payment verified. Subscription activation is pending webhook confirmation.
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
 * /payments/{paymentId}/refund:
 *   post:
 *     summary: Initiate a full or partial payment refund
 *     description: Allows an authenticated Super Admin to initiate a full or partial refund for a successfully captured payment. The refund is initially PENDING. Idempotency-Key prevents duplicate refund requests. Final refund status is confirmed through verified Razorpay webhook events. The initiation is recorded in AuditLog.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         description: Internal Equilx payment ID.
 *         schema:
 *           type: string
 *           format: uuid
 *         example: b96bb178-1352-4031-9b6a-9dcef9806ff1
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         description: Unique key used to prevent duplicate refund requests. Reuse the same key when retrying the same request.
 *         schema:
 *           type: string
 *           minLength: 16
 *           maxLength: 128
 *         example: equilx-refund-test-001
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 description: Refund amount in INR. Omit to request the remaining refundable amount. Maximum two decimal places are allowed.
 *                 example: 500
 *               reason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Optional reason for the refund.
 *                 example: Customer requested a partial refund.
 *     responses:
 *       202:
 *         description: Refund request submitted successfully. Final status is pending Razorpay webhook confirmation.
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
 *                   example: Refund request submitted successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     refundId:
 *                       type: string
 *                       format: uuid
 *                     paymentId:
 *                       type: string
 *                       format: uuid
 *                     providerRefundId:
 *                       type: string
 *                       nullable: true
 *                     amount:
 *                       type: string
 *                       example: "500.00"
 *                     currency:
 *                       type: string
 *                       example: INR
 *                     status:
 *                       type: string
 *                       example: PENDING
 *                     message:
 *                       type: string
 *                       example: Refund submitted. Final status will be confirmed by Razorpay webhook.
 *       400:
 *         description: Validation error, invalid refund amount, or refund amount exceeds remaining refundable balance.
 *       401:
 *         description: Authentication required or access token invalid.
 *       403:
 *         description: Only Super Admin can initiate refunds.
 *       404:
 *         description: Payment record not found.
 *       409:
 *         description: Payment is not refundable, provider payment ID is missing, or idempotency key conflict.
 *       503:
 *         description: Refund submission could not be confirmed. The request remains pending. Do not retry using a new idempotency key.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Handle Razorpay payment and refund webhook events
 *     description: Receives Razorpay webhook events and verifies the HMAC-SHA256 signature using the original raw request body before parsing JSON. Payment activation and refund status updates are handled through verified webhook processing. Duplicate events are protected using the Razorpay event ID.
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: x-razorpay-signature
 *         required: true
 *         description: 64-character hexadecimal HMAC-SHA256 signature generated by Razorpay.
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{64}$'
 *         example: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
 *       - in: header
 *         name: x-razorpay-event-id
 *         required: true
 *         description: Unique Razorpay webhook event ID used for duplicate-event protection.
 *         schema:
 *           type: string
 *         example: evt_test_123
 *     requestBody:
 *       required: true
 *       description: Original Razorpay webhook JSON payload. The server verifies the signature against the raw request body before parsing JSON.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               event:
 *                 type: string
 *                 description: Razorpay webhook event name.
 *                 enum:
 *                   - payment.captured
 *                   - order.paid
 *                   - payment.failed
 *                   - refund.created
 *                   - refund.processed
 *                   - refund.failed
 *                 example: refund.processed
 *               payload:
 *                 type: object
 *                 description: Razorpay event payload containing the relevant payment or refund entity.
 *     responses:
 *       200:
 *         description: Webhook received or processed successfully. Already processed duplicate events are handled idempotently.
 *       400:
 *         description: Invalid raw body, missing or invalid headers, invalid signature, or malformed JSON payload.
 *       409:
 *         description: Conflicting duplicate webhook event.
 *       503:
 *         description: Webhook processing is unavailable because the webhook secret is not configured.
 *       500:
 *         description: Webhook processing failed.
 */

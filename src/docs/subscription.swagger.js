/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Manage individual student subscriptions, subscription history, cancellation and renewal.
 */

/**
 * @swagger
 * /api/v1/subscriptions/me:
 *   get:
 *     summary: Get current user's active personal subscription
 *     description: Returns the authenticated user's currently active personal subscription. Returns null if no active personal subscription exists.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   nullable: true
 *                   type: object
 *                   description: Active personal subscription details, or null when no active subscription exists.
 *       401:
 *         description: Authentication required or invalid access token.
 */

/**
 * @swagger
 * /api/v1/subscriptions/history:
 *   get:
 *     summary: Get current user's subscription history
 *     description: Returns paginated history of the authenticated user's personal subscriptions.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of records per page.
 *     responses:
 *       200:
 *         description: Subscription history retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Subscription record with associated plan and plan version.
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
 *         description: Authentication required or invalid access token.
 *       400:
 *         description: Invalid pagination parameters.
 */

/**
 * @swagger
 * /api/v1/subscriptions/{subscriptionId}:
 *   get:
 *     summary: Get subscription details
 *     description: Retrieves a personal subscription belonging to the authenticated user, including its plan, plan version, payments and invoices.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription ID.
 *     responses:
 *       200:
 *         description: Subscription details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Subscription details, associated plan, plan version, payment records and invoices.
 *       400:
 *         description: Invalid subscription ID.
 *       401:
 *         description: Authentication required or invalid access token.
 *       404:
 *         description: Subscription not found or does not belong to the authenticated user.
 */

/**
 * @swagger
 * /api/v1/subscriptions/{subscriptionId}/cancel:
 *   post:
 *     summary: Cancel personal subscription
 *     description: Schedules cancellation of an active personal subscription. Access continues until the subscription expiry date. The subscription status remains ACTIVE until expiry.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription ID.
 *     responses:
 *       200:
 *         description: Subscription cancellation scheduled successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Subscription cancellation scheduled. Your access will continue until the expiry date.
 *               data:
 *                 id: d0254c32-36db-4429-9421-6f3047109c9e
 *                 status: ACTIVE
 *                 cancelledAt: "2026-11-03T09:40:37.784Z"
 *                 endsAt: "2027-01-03T00:00:00.000Z"
 *       400:
 *         description: Subscription cannot be cancelled.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: SUBSCRIPTION_NOT_CANCELLABLE
 *                 message: Only active subscriptions can be cancelled.
 *       401:
 *         description: Authentication required or invalid access token.
 *       404:
 *         description: Subscription not found or does not belong to the authenticated user.
 */

/**
 * @swagger
 * /api/v1/subscriptions/{subscriptionId}/renew:
 *   post:
 *     summary: Create subscription renewal payment order
 *     description: Creates a Razorpay payment order for renewing an eligible personal subscription. Renewal is confirmed only after successful payment verification.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription ID to renew.
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 8
 *           maxLength: 128
 *         description: Unique key identifying this renewal request.
 *     responses:
 *       200:
 *         description: Renewal payment order created successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Renewal payment order created. Complete payment to confirm renewal.
 *               data:
 *                 paymentId: b96bb178-1352-4031-9b6a-9dcef9806ff1
 *                 subscriptionId: d0254c32-36db-4429-9421-6f3047109c9e
 *                 orderId: order_Tvb3TZQl2hjPUx
 *                 amount: "1500"
 *                 currency: INR
 *                 status: CREATED
 *                 keyId: rzp_test_TvCk7ldILeCH8Z
 *                 renewalOfSubscriptionId: d0254c32-36db-4429-9421-6f3047109c9e
 *                 scheduledStartAt: "2027-01-03T00:00:00.000Z"
 *       400:
 *         description: Invalid renewal request or subscription is not eligible for renewal.
 *       401:
 *         description: Authentication required or invalid access token.
 *       404:
 *         description: Subscription not found or does not belong to the authenticated user.
 *       409:
 *         description: Conflicting pending renewal request.
 */
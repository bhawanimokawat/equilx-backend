/**
 * @swagger
 * tags:
 *   name: Results
 *   description: Student attempt results and score history
 */

/**
 * @swagger
 * /api/v1/results:
 *   get:
 *     summary: Get my results
 *     description: >
 *       Retrieves the authenticated user's submitted Full Mock and Practice
 *       results. Supports pagination and optional filtering by usage type.
 *       Only the authenticated user's results are returned.
 *     tags: [Results]
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
 *         description: Number of results per page.
 *       - in: query
 *         name: usageType
 *         schema:
 *           type: string
 *           enum: [FULL_MOCK, PRACTICE]
 *         description: Filter results by attempt type.
 *     responses:
 *       200:
 *         description: Results retrieved successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/v1/results/{attemptId}:
 *   get:
 *     summary: Get result by attempt ID
 *     description: >
 *       Retrieves the result of a submitted attempt belonging to the
 *       authenticated user. Returns pending result information when
 *       scoring has not yet been completed.
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique attempt ID.
 *     responses:
 *       200:
 *         description: Attempt result retrieved successfully.
 *       400:
 *         description: Invalid attempt ID.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Result or submitted attempt not found.
 *       500:
 *         description: Internal server error.
 */
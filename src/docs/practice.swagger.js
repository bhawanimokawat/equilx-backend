/**
 * @swagger
 * /practice/tests:
 *   get:
 *     summary: Get all published practice tests
 *     description: Returns a paginated list of published IELTS practice tests. Supports filtering by test category.
 *     tags: [Practice]
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
 *         description: Number of tests per page.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [ACADEMIC, GENERAL_TRAINING]
 *         description: Filter tests by IELTS category.
 *     responses:
 *       200:
 *         description: Practice tests retrieved successfully.
 *       400:
 *         description: Invalid query parameters.
 */

/**
 * @swagger
 * /practice/tests/{testId}:
 *   get:
 *     summary: Get practice test details
 *     description: Returns the details and content hierarchy of a published practice test, including its versions, modules, parts, question groups, and questions. Answer keys are not included.
 *     tags: [Practice]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique ID of the test.
 *     responses:
 *       200:
 *         description: Practice test details retrieved successfully.
 *       400:
 *         description: Invalid test ID.
 *       404:
 *         description: Practice test not found.
 */


/**
 * @swagger
 * /practice/tests/{testVersionId}/start:
 *   post:
 *     summary: Start a practice attempt
 *     description: Creates a new practice attempt for the authenticated user. The user must select exactly one module or one part. Practice attempts do not have an automatic deadline.
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testVersionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique ID of the published test version.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moduleId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the module to practise.
 *               partId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the part to practise.
 *             example:
 *               moduleId: "092492fb-5c44-42f1-b764-6e3af5fe0118"
 *     responses:
 *       201:
 *         description: Practice attempt started successfully.
 *       400:
 *         description: Invalid request body or module/part selection.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Published test version or selected module/part not found.
 */

/**
 * @swagger
 * /practice/history:
 *   get:
 *     summary: Get practice history
 *     description: Returns the practice attempts belonging to the authenticated user, ordered newest first, with pagination.
 *     tags: [Practice]
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
 *         description: Practice history retrieved successfully.
 *       400:
 *         description: Invalid pagination parameters.
 *       401:
 *         description: Authentication is required.
 */

/**
 * @swagger
 * /practice/history/{attemptId}:
 *   get:
 *     summary: Get practice history details
 *     description: Returns detailed information about a specific practice attempt belonging to the authenticated user, including its status, selected module or part, saved answers, and available practice result.
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique ID of the practice attempt.
 *     responses:
 *       200:
 *         description: Practice history details retrieved successfully.
 *       400:
 *         description: Invalid attempt ID.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Practice attempt not found.
 */
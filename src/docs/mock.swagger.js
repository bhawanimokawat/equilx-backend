/**
 * @swagger
 * /mock/tests:
 *   get:
 *     tags:
 *       - Mock Tests
 *     summary: List published mock tests
 *     description: Returns a paginated list of published mock tests.
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum:
 *             - ACADEMIC
 *             - GENERAL_TRAINING
 *         description: Optional IELTS test category.
 *     responses:
 *       '200':
 *         description: Published mock tests retrieved successfully.
 *       '400':
 *         description: Invalid query parameters.
 *       '429':
 *         description: Too many requests.
 */
router.get("/tests", mockController.listMockTests);

/**
 * @swagger
 * /mock/tests/{testId}:
 *   get:
 *     tags:
 *       - Mock Tests
 *     summary: Get mock test details
 *     description: Returns published test details, modules, parts, question groups, and questions. Answer keys are excluded.
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Test ID.
 *     responses:
 *       '200':
 *         description: Mock test details retrieved successfully.
 *       '400':
 *         description: Invalid test ID.
 *       '404':
 *         description: Published mock test not found.
 *       '429':
 *         description: Too many requests.
 */
router.get("/tests/:testId", mockController.getMockTestDetails);

/**
 * @swagger
 * /mock/tests/{testVersionId}/start:
 *   post:
 *     tags:
 *       - Mock Tests
 *     summary: Start a full mock attempt
 *     description: Creates a full mock attempt for the authenticated user, containing all four IELTS modules.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testVersionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Published test version ID.
 *     responses:
 *       '201':
 *         description: Mock attempt started successfully.
 *       '400':
 *         description: Invalid test version ID or invalid mock configuration.
 *       '401':
 *         description: Authentication required.
 *       '404':
 *         description: Published test version not found.
 *       '409':
 *         description: Business rule conflict.
 *       '429':
 *         description: Too many requests.
 */
router.post(
  "/tests/:testVersionId/start",
  requireAuth,
  mockController.startMockAttempt
);

/**
 * @swagger
 * /mock/history:
 *   get:
 *     tags:
 *       - Mock Tests
 *     summary: Get user's mock history
 *     description: Returns paginated full mock attempts belonging to the authenticated user.
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
 *       '200':
 *         description: Mock history retrieved successfully.
 *       '400':
 *         description: Invalid pagination parameters.
 *       '401':
 *         description: Authentication required.
 *       '429':
 *         description: Too many requests.
 */
router.get("/history", requireAuth, mockController.getMockHistory);


/**
 * @swagger
 * /mock/history/{attemptId}:
 *   get:
 *     tags:
 *       - Mock Tests
 *     summary: Get mock history item
 *     description: Returns details of a full mock attempt belonging to the authenticated user, including modules, saved answers, and available score information.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Mock attempt ID.
 *     responses:
 *       '200':
 *         description: Mock history item retrieved successfully.
 *       '400':
 *         description: Invalid attempt ID.
 *       '401':
 *         description: Authentication required.
 *       '404':
 *         description: Mock attempt not found.
 *       '429':
 *         description: Too many requests.
 */
router.get(
  "/history/:attemptId",
  requireAuth,
  mockController.getMockHistoryItem
);

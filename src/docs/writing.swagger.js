
/**
 * @swagger
 * /api/v1/writing/attempts/{attemptId}/submissions:
 *   post:
 *     summary: Submit an IELTS Writing response
 *     description: Submits a Writing Task 1 or Task 2 response. Creates a pending AI evaluation and queues the evaluation job for background processing.
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the active practice or mock attempt.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskNumber
 *               - responseText
 *             properties:
 *               taskNumber:
 *                 type: integer
 *                 enum: [1, 2]
 *                 example: 2
 *               responseText:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 30000
 *                 example: Some people believe that public transport should be free in large cities.
 *     responses:
 *       200:
 *         description: Writing response submitted successfully and AI evaluation queued.
 *       400:
 *         description: Invalid request data or invalid attempt scope.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Attempt or requested Writing task not found.
 *       409:
 *         description: Attempt is not active, deadline expired, or response already submitted.
 *       503:
 *         description: Writing was saved but AI evaluation could not be queued.
 */



/**
 * @swagger
 * /api/v1/writing/submissions:
 *   get:
 *     summary: Get my Writing submissions
 *     description: Retrieves the authenticated user's Writing submissions with pagination and optional task number and evaluation status filters.
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: taskNumber
 *         schema:
 *           type: integer
 *           enum: [1, 2]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, NEEDS_REVIEW]
 *     responses:
 *       200:
 *         description: Writing submissions retrieved successfully.
 *       401:
 *         description: Authentication is required.
 */


/**
 * @swagger
 * /api/v1/writing/submissions/{submissionId}:
 *   get:
 *     summary: Get Writing submission by ID
 *     description: Retrieves a specific Writing submission belonging to the authenticated user, including its evaluation details and feedback.
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the Writing submission.
 *     responses:
 *       200:
 *         description: Writing submission retrieved successfully.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Writing submission not found.
 */

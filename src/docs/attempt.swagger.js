/**
 * @swagger
 * /attempts:
 *   post:
 *     summary: Start a new IELTS attempt
 *     description: Starts a FULL_MOCK attempt containing all four IELTS modules or a PRACTICE attempt scoped to exactly one module or part.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testVersionId
 *               - usageType
 *             properties:
 *               testVersionId:
 *                 type: string
 *                 format: uuid
 *                 example: 471a3e1d-1101-44ba-ac79-6cbd5ed154c5
 *               usageType:
 *                 type: string
 *                 enum: [FULL_MOCK, PRACTICE]
 *                 example: FULL_MOCK
 *               moduleId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               partId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *           examples:
 *             fullMock:
 *               summary: Start full mock
 *               value:
 *                 testVersionId: 471a3e1d-1101-44ba-ac79-6cbd5ed154c5
 *                 usageType: FULL_MOCK
 *             practice:
 *               summary: Start module practice
 *               value:
 *                 testVersionId: 471a3e1d-1101-44ba-ac79-6cbd5ed154c5
 *                 usageType: PRACTICE
 *                 moduleId: 092492fb-5c44-42f1-b764-6e3af5fe0118
 *     responses:
 *       201:
 *         description: Attempt started successfully.
 *       400:
 *         description: Invalid attempt details, scope, unavailable test, incomplete modules or invalid module duration.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Test version not found.
 */


/**
 * @swagger
 * /attempts:
 *   get:
 *     summary: Get all attempts of authenticated user
 *     description: Returns the attempts belonging to the currently authenticated user, ordered newest first.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attempts retrieved successfully.
 *       401:
 *         description: Authentication is required.
 */

/**
 * @swagger
 * /attempts/{attemptId}:
 *   get:
 *     summary: Get attempt details
 *     description: Returns details of a specific attempt belonging to the authenticated user, including saved answers.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attempt retrieved successfully.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Attempt not found.
 */


/**
 * @swagger
 * /attempts/{attemptId}/questions:
 *   get:
 *     summary: Get questions for an attempt
 *     description: Returns questions available to the attempt, including question group, part and module information. Correct answers and AnswerKey data are never exposed.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attempt questions retrieved successfully.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Attempt not found.
 */


/**
 * @swagger
 * /attempts/{attemptId}/answers/{questionId}:
 *   put:
 *     summary: Save or update an answer
 *     description: Saves or updates the authenticated user's answer for a question belonging to the specified attempt.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answer
 *             properties:
 *               answer:
 *                 description: User's submitted answer. Its structure depends on the question type.
 *                 example: Canberra
 *     responses:
 *       200:
 *         description: Answer saved successfully.
 *       400:
 *         description: Invalid answer or question does not belong to the attempt.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Attempt or question not found.
 */

/**
 * @swagger
 * /attempts/{attemptId}/answers:
 *   get:
 *     summary: Get saved answers of an attempt
 *     description: Returns all answers saved by the authenticated user for the specified attempt.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Saved answers retrieved successfully.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Attempt not found.
 */

/**
 * @swagger
 * /attempts/{attemptId}/submit:
 *   post:
 *     summary: Submit an attempt
 *     description: Submits an in-progress attempt. Full mock objective scoring and practice evaluation follow their respective evaluation workflows.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attempt submitted successfully.
 *       400:
 *         description: Attempt cannot be submitted.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Attempt not found.
 */

/**
 * @swagger
 * /attempts/{attemptId}/result:
 *   get:
 *     summary: Get attempt result
 *     description: Returns the evaluated result of a submitted mock or practice attempt. Results remain unavailable while evaluation is pending.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attempt result retrieved successfully.
 *       400:
 *         description: Attempt has not been submitted.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: Attempt not found.
 *       409:
 *         description: Result is not available yet. Evaluation may still be pending.
 */
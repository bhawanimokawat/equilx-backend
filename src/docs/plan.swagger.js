/**
 * @swagger
 * /plans:
 *   get:
 *     summary: List available plans
 *     description: Retrieves all available subscription plans on the Equilx IELTS platform.
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: Plans retrieved successfully.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /plans/{code}:
 *   get:
 *     summary: Get plan by code
 *     description: Retrieves the details of a subscription plan using its unique plan code.
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Unique subscription plan code.
 *         schema:
 *           type: string
 *         example: STUDENT_PRO
 *     responses:
 *       200:
 *         description: Plan retrieved successfully.
 *       400:
 *         description: Invalid plan code.
 *       404:
 *         description: Plan not found.
 *       500:
 *         description: Internal server error.
 */
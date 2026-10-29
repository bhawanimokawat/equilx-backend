
/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Creates an account and requires email verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: bhawani
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: ExamplePassword@123
 *     responses:
 *       '201':
 *         description: Account created successfully.
 *       '400':
 *         description: Invalid registration data.
 *       '409':
 *         description: Email already registered.
 *       '429':
 *         description: Too many requests.
 */



/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verify a user's email address
 *     description: Verifies the user's email using the OTP sent during registration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: Email verified successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Email verified successfully.
 *               data:
 *                 emailVerified: true
 *       '400':
 *         description: Invalid or expired verification code.
 *       '429':
 *         description: Too many verification attempts.
 */

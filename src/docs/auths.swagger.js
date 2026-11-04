
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
 *                 example: Test Student
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
 *       '400':
 *         description: Invalid or expired verification code.
 *       '429':
 *         description: Too many verification attempts.
 */

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Resend email verification OTP
 *     description: Sends a new verification OTP to the registered email address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *     responses:
 *       '200':
 *         description: OTP resend request processed successfully.
 *       '400':
 *         description: Invalid email address.
 *       '429':
 *         description: Too many OTP requests.
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     description: Authenticates a user and generates an access token and refresh cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: ExamplePassword@123
 *     responses:
 *       '200':
 *         description: Login successful.
 *       '400':
 *         description: Invalid login data.
 *       '401':
 *         description: Invalid email or password.
 *       '429':
 *         description: Too many login attempts.
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access token
 *     description: Generates a new access token using a valid refresh token stored in the cookie.
 *     responses:
 *       '200':
 *         description: Access token refreshed successfully.
 *       '401':
 *         description: Invalid, expired, or revoked refresh token.
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout user
 *     description: Revokes the refresh session and clears the refresh token cookie.
 *     responses:
 *       '200':
 *         description: Logout successful.
 *       '401':
 *         description: Invalid refresh token.
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Forgot password
 *     description: Initiates the password reset process for the supplied email address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *     responses:
 *       '200':
 *         description: Password reset instructions request processed.
 *       '400':
 *         description: Invalid email address.
 *       '429':
 *         description: Too many password reset requests.
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset password
 *     description: Resets the user's password using a valid password reset token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: password-reset-token
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewPassword@123
 *     responses:
 *       '200':
 *         description: Password reset successfully.
 *       '400':
 *         description: Invalid password reset details.
 *       '401':
 *         description: Invalid or expired reset token.
 */

/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     tags:
 *       - Auth
 *     summary: Change user password
 *     description: Allows an authenticated user to change their current password.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: CurrentPassword@123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewPassword@123
 *     responses:
 *       '200':
 *         description: Password changed successfully.
 *       '400':
 *         description: Invalid password details.
 *       '401':
 *         description: Authentication failed or current password is incorrect.
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current authenticated user
 *     description: Returns the profile information of the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User details retrieved successfully.
 *       '401':
 *         description: Missing, invalid, or expired access token.
 */

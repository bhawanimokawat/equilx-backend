
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
 *  
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
 *                 example: teststudent01@example.com
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

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Resend email verification OTP
 *     description: Resends an email verification code when the account requires verification. Returns a generic response to prevent account enumeration.
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
 *                 example: teststudent01@example.com
 *     responses:
 *       '200':
 *         description: Generic response returned whether or not a verification code is sent.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: If the account requires verification, a code will be sent.
 *       '400':
 *         description: Invalid request data.
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
 *     description: Authenticates a registered and email-verified user and returns an access token.
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
 *                 example: teststudent01@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: TestStudent@12345
 *     responses:
 *       '200':
 *         description: Login successful.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Login successful.
 *               data:
 *                 accessToken: "your-access-token"
 *                 tokenType: Bearer
 *                 expiresIn: 900
 *                 user:
 *                   id: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                   email: teststudent01@example.com
 *                   platformRole: USER
 *                   emailVerifiedAt: "2026-10-30T06:46:38.532Z"
 *                   createdAt: "2026-10-30T06:43:20.166Z"
 *                   profile:
 *                     name: Test Student
 *                     phone: null
 *                     avatarUrl: null
 *       '400':
 *         description: Invalid login request.
 *       '401':
 *         description: Invalid credentials or email not verified.
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
 *     description: Validates the refresh token stored in an HTTP cookie, revokes the old refresh token, and issues a new access token and rotated refresh token.
 *     parameters:
 *       - in: cookie
 *         name: equilx_refresh
 *         required: true
 *         schema:
 *           type: string
 *         description: Refresh token stored in an HTTP-only cookie.
 *     responses:
 *       '200':
 *         description: Access token refreshed successfully.
 *         headers:
 *           Set-Cookie:
 *             description: Contains the rotated refresh token cookie.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Access token refreshed.
 *               data:
 *                 accessToken: "your-new-access-token"
 *                 tokenType: Bearer
 *                 expiresIn: 900
 *                 user:
 *                   id: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                   email: teststudent01@example.com
 *                   platformRole: USER
 *                   emailVerifiedAt: "2026-10-30T06:46:38.532Z"
 *                   isActive: true
 *                   createdAt: "2026-10-30T06:43:20.166Z"
 *                   profile:
 *                     name: Test Student
 *                     phone: null
 *                     avatarUrl: null
 *       '401':
 *         description: Missing, invalid, expired, or revoked refresh token.
 *       '500':
 *         description: Internal server error.
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout user
 *     description: Revokes the refresh-token session and clears the refresh-token cookie.
 *     parameters:
 *       - in: cookie
 *         name: equilx_refresh
 *         required: false
 *         schema:
 *           type: string
 *         description: Refresh token stored in an HTTP-only cookie.
 *     responses:
 *       '200':
 *         description: Logout successful.
 *         headers:
 *           Set-Cookie:
 *             description: Clears the refresh-token cookie.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Logout successful.
 *       '500':
 *         description: Internal server error.
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request password reset
 *     description: Sends password-reset instructions to an eligible registered account. Returns a generic response to prevent account enumeration.
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
 *                 example: teststudent01@example.com
 *     responses:
 *       '200':
 *         description: Password-reset instructions will be sent if an eligible account exists.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: If an eligible account exists, password-reset instructions will be sent.
 *       '400':
 *         description: Invalid request data.
 *       '429':
 *         description: Too many password-reset requests.
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset user password
 *     description: Resets the user's password using a valid password-reset token and requires the user to log in again.
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
 *                 description: Password-reset token received through email.
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewSecurePassword@123
 *     responses:
 *       '200':
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Password reset successfully. Please log in again.
 *       '400':
 *         description: Invalid, expired, or already-used reset token.
 *       '429':
 *         description: Too many password-reset attempts.
 */
/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     tags:
 *       - Auth
 *     summary: Change user password
 *     description: Changes the authenticated user's password after validating the current password. Clears the refresh-token cookie and requires the user to log in again.
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
 *                 example: NewSecurePassword@123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: AnotherSecurePassword@456
 *     responses:
 *       '200':
 *         description: Password changed successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Password changed successfully. Please log in again.
 *       '400':
 *         description: Invalid password details or current password.
 *       '401':
 *         description: Authentication required or invalid access token.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: AUTHENTICATION_REQUIRED
 *                 message: Please log in to continue.
 *       '429':
 *         description: Too many requests.
 *       '500':
 *         description: Internal server error.
 */

/**
 * {
  "success": true,
  "data": {
    "user": {
      "id": "198fd5e2-d2a8-480f-9f9f-b44a890fafbf",
      "email": "teststudent01@example.com",
      "platformRole": "USER",
      "emailVerified": true,
      "createdAt": "2026-10-30T06:43:20.166Z",
      "profile": {
        "name": "Test Student",
        "phone": null,
        "avatarUrl": null
      }
    }
  }
}
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the profile and account details of the currently authenticated user.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details retrieved successfully.
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           example: teststudent01@example.com
 *                         platformRole:
 *                           type: string
 *                           example: USER
 *                         emailVerified:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         profile:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             name:
 *                               type: string
 *                               nullable: true
 *                               example: Test Student
 *                             phone:
 *                               type: string
 *                               nullable: true
 *                             avatarUrl:
 *                               type: string
 *                               nullable: true
 *       401:
 *         description: Authentication is required or the access token is invalid or expired.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: AUTHENTICATION_REQUIRED
 *                     message:
 *                       type: string
 *                       example: Please log in to continue.
 */
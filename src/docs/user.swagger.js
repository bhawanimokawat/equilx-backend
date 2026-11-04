/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get my profile
 *     description: Returns the profile and account details of the currently authenticated user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully.
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
 */
/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update my profile
 *     description: Updates the authenticated user's profile. Users cannot change their role, email, or account status through this endpoint.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             additionalProperties: false
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Updated Test Student
 *               phone:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 20
 *                 nullable: true
 *                 example: "+919876543210"
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 2048
 *                 nullable: true
 *                 example: https://example.com/avatar.png
 *           examples:
 *             updateProfile:
 *               summary: Update name and phone
 *               value:
 *                 name: Updated Test Student
 *                 phone: "+919876543210"
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Profile updated successfully.
 *               data:
 *                 user:
 *                   id: 198fd5e2-d2a8-480f-9f9f-b44a890fafbf
 *                   email: teststudent01@example.com
 *                   platformRole: USER
 *                   emailVerified: true
 *                   createdAt: "2026-10-30T06:43:20.166Z"
 *                   profile:
 *                     name: Updated Test Student
 *                     phone: "+919876543210"
 *                     avatarUrl: null
 *       400:
 *         description: Validation failed, no fields supplied, or an unsupported field was provided.
 *       401:
 *         description: Authentication is required or the access token is invalid or expired.
 *       404:
 *         description: User account not found.
 */


/**
 * @swagger
 * /users/me/security:
 *   get:
 *     summary: Get my account security information
 *     description: Returns security-related metadata for the currently authenticated user, including account status, email verification status, account creation date, and active refresh-token session count.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account security information retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 security:
 *                   accountActive: true
 *                   emailVerified: true
 *                   createdAt: "2026-10-30T06:43:20.166Z"
 *                   activeRefreshSessions: 2
 *       401:
 *         description: Authentication is required or the access token is invalid or expired.
 *       404:
 *         description: User account not found.
 */


/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users
 *     description: Retrieves a paginated list of users. Accessible only to authenticated Super Admin users. Supports searching by email or profile name and filtering by account status.
 *     tags: [Users]
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
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search users by email address or profile name.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter users by account status.
 *     responses:
 *       200:
 *         description: Users retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 users:
 *                   - id: d1b3e959-41f3-4195-b012-a6559d288d9c
 *                     email: bhawanimokawat18@gmail.com
 *                     platformRole: SUPER_ADMIN
 *                     isActive: true
 *                     createdAt: "2026-10-30T08:56:47.139Z"
 *                     profile: null
 *                     emailVerified: true
 *                   - id: 198fd5e2-d2a8-480f-9f9f-b44a890fafbf
 *                     email: teststudent01@example.com
 *                     platformRole: USER
 *                     isActive: true
 *                     createdAt: "2026-10-30T06:43:20.166Z"
 *                     profile:
 *                       name: Updated Test Student
 *                       phone: "+919876543210"
 *                       avatarUrl: null
 *                     emailVerified: true
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                   total: 3
 *                   totalPages: 1
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Authentication is required or the access token is invalid or expired.
 *       403:
 *         description: Access denied. Super Admin privileges are required.
 */


/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a user account
 *     description: |
 *       Allows a Super Admin to activate or deactivate a user account.
 *       Deactivating an account revokes its active refresh tokens.
 *       A Super Admin cannot deactivate their own account.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user account to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Set true to activate or false to deactivate the account.
 *           example:
 *             isActive: false
 *     responses:
 *       200:
 *         description: User account status updated successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User account status updated successfully.
 *               data:
 *                 user:
 *                   id: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                   email: "teststudent01@example.com"
 *                   platformRole: USER
 *                   isActive: false
 *                   updatedAt: "2026-10-30T09:28:32.490Z"
 *                   emailVerified: true
 *       400:
 *         description: Invalid user ID, invalid request body, or self-deactivation attempt.
 *         content:
 *           application/json:
 *             examples:
 *               invalidUserId:
 *                 summary: Invalid user ID
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Please provide a valid user ID.
 *               selfDeactivation:
 *                 summary: Self-deactivation not allowed
 *                 value:
 *                   success: false
 *                   error:
 *                     code: SELF_DEACTIVATION_NOT_ALLOWED
 *                     message: You cannot deactivate your own account.
 *               invalidStatus:
 *                 summary: Invalid account status
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Provide a valid account status.
 *       401:
 *         description: Authentication required or access token invalid.
 *       403:
 *         description: Super Admin access required.
 *       404:
 *         description: User account not found.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: USER_NOT_FOUND
 *                 message: User account not found.
 */

/**
 * @swagger
 * /api/v1/organizations/{id}/members:
 *   get:
 *     summary: List organization members
 *     description: Returns a paginated list of members belonging to an organization. Only Super Admin users can access this endpoint.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of members per page
 *     responses:
 *       200:
 *         description: Organization members retrieved successfully
 *       400:
 *         description: Invalid organization ID or pagination parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Super Admin access required
 *       404:
 *         description: Organization not found
 */
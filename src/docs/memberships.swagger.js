/**
 * @swagger
 * /api/v1/institutes/{instituteId}/memberships:
 *   post:
 *     summary: Create an institute membership
 *     description: Adds an existing user to an institute with a specified membership role. Super Admins can assign any supported membership role. Institute Admins cannot assign the Institute Admin role.
 *     tags: [Memberships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Institute ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             additionalProperties: false
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of an existing Equilx user
 *               role:
 *                 type: string
 *                 enum:
 *                   - INSTITUTE_STUDENT
 *                   - TRAINER
 *                   - INSTITUTE_ADMIN
 *                 description: Membership role assigned to the user
 *           example:
 *             userId: 198fd5e2-d2a8-480f-9f9f-b44a890fafbf
 *             role: INSTITUTE_STUDENT
 *     responses:
 *       201:
 *         description: Membership created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 780509ac-d01d-4be2-be5b-ddef443e9a0f
 *                 instituteId: a6d50839-9967-4c93-a61f-e3f7fc646a20
 *                 userId: 198fd5e2-d2a8-480f-9f9f-b44a890fafbf
 *                 role: INSTITUTE_STUDENT
 *                 status: PENDING_APPROVAL
 *                 joinedAt: null
 *                 createdAt: "2026-10-30T10:59:57.074Z"
 *                 updatedAt: "2026-10-30T10:59:57.074Z"
 *       400:
 *         description: Invalid institute ID, validation error, or invalid user/institute reference
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Institute access denied or role assignment not permitted
 *       409:
 *         description: User already has a membership in this institute
 */

/**
 * @swagger
 * /institutes/{instituteId}/memberships:
 *   get:
 *     summary: List institute memberships
 *     description: |
 *       Retrieves paginated memberships for a specific institute.
 *       Supports filtering by membership role and status.
 *       Super Admins can access any institute. Institute Admins can
 *       access memberships only within their own active institute.
 *     tags: [Memberships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Institute ID
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of memberships per page
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - INSTITUTE_STUDENT
 *             - TRAINER
 *             - INSTITUTE_ADMIN
 *         description: Filter memberships by role
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING_APPROVAL
 *             - ACTIVE
 *             - SUSPENDED
 *             - REVOKED
 *         description: Filter memberships by status
 *     responses:
 *       200:
 *         description: Membership list retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "780509ac-d01d-4be2-be5b-ddef443e9a0f"
 *                   instituteId: "a6d50839-9967-4c93-a61f-e3f7fc646a20"
 *                   userId: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                   role: TRAINER
 *                   status: ACTIVE
 *                   joinedAt: null
 *                   createdAt: "2026-10-30T10:59:57.074Z"
 *                   updatedAt: "2026-10-30T11:22:51.665Z"
 *                   user:
 *                     id: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                     email: "teststudent01@example.com"
 *                     isActive: true
 *                     profile:
 *                       name: "Updated Test Student"
 *                       avatarUrl: null
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 1
 *                 totalPages: 1
 *       400:
 *         description: Invalid institute ID or query parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not have permission to manage memberships for this institute
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: INSTITUTE_ACCESS_DENIED
 *                 message: You cannot manage memberships for this institute.
 */

/**
 * @swagger
 * /api/v1/institutes/{instituteId}/memberships/{id}:
 *   get:
 *     summary: Get an institute membership by ID
 *     description: Retrieves a specific membership belonging to the specified institute, including basic user details. Access is restricted to the institute's authorized admin or a Super Admin.
 *     tags: [Memberships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Institute ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Membership ID
 *     responses:
 *       200:
 *         description: Membership retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "780509ac-d01d-4be2-be5b-ddef443e9a0f"
 *                 instituteId: "a6d50839-9967-4c93-a61f-e3f7fc646a20"
 *                 userId: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                 role: INSTITUTE_STUDENT
 *                 status: PENDING_APPROVAL
 *                 joinedAt: null
 *                 createdAt: "2026-10-30T10:59:57.074Z"
 *                 updatedAt: "2026-10-30T10:59:57.074Z"
 *                 user:
 *                   id: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                   email: "teststudent01@example.com"
 *                   isActive: true
 *                   profile:
 *                     name: "Updated Test Student"
 *                     avatarUrl: null
 *       400:
 *         description: Invalid institute ID or membership ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Institute access denied
 *       404:
 *         description: Membership not found in the specified institute
 */


/**
 * @swagger
 * /institutes/{instituteId}/memberships/{id}:
 *   patch:
 *     summary: Update institute membership
 *     description: |
 *       Updates the role or status of an existing institute membership.
 *       Institute Admins can manage memberships within their own institute.
 *       Only Super Admins can assign the INSTITUTE_ADMIN role.
 *     tags: [Memberships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Institute ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Membership ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             additionalProperties: false
 *             properties:
 *               role:
 *                 type: string
 *                 enum:
 *                   - INSTITUTE_STUDENT
 *                   - TRAINER
 *                   - INSTITUTE_ADMIN
 *               status:
 *                 type: string
 *                 enum:
 *                   - PENDING_APPROVAL
 *                   - ACTIVE
 *                   - SUSPENDED
 *                   - REVOKED
 *           examples:
 *             updateStatus:
 *               summary: Update membership status
 *               value:
 *                 status: ACTIVE
 *             updateRole:
 *               summary: Update membership role
 *               value:
 *                 role: TRAINER
 *     responses:
 *       200:
 *         description: Membership updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "780509ac-d01d-4be2-be5b-ddef443e9a0f"
 *                 instituteId: "a6d50839-9967-4c93-a61f-e3f7fc646a20"
 *                 userId: "198fd5e2-d2a8-480f-9f9f-b44a890fafbf"
 *                 role: TRAINER
 *                 status: ACTIVE
 *                 joinedAt: null
 *                 createdAt: "2026-10-30T10:59:57.074Z"
 *                 updatedAt: "2026-10-30T11:22:51.665Z"
 *       400:
 *         description: Invalid UUID, invalid role/status, empty body or unexpected fields
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Institute access denied or Institute Admin role assignment forbidden
 *         content:
 *           application/json:
 *             examples:
 *               instituteAccessDenied:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INSTITUTE_ACCESS_DENIED
 *                     message: You cannot manage memberships for this institute.
 *               roleAssignmentDenied:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: ROLE_ASSIGNMENT_DENIED
 *                     message: Only a Super Admin can assign the Institute Admin role.
 *       404:
 *         description: Membership not found within the specified institute
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: MEMBERSHIP_NOT_FOUND
 *                 message: The requested membership was not found.
 */

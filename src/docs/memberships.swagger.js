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
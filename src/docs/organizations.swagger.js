/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     description: Creates an institute organization. Only authenticated Super Admin users can access this endpoint.
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *               slug:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
 *           example:
 *             name: Equilx Demo Institute
 *             slug: equilx-demo-institute
 *     responses:
 *       201:
 *         description: Organization created successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "a6d50839-9967-4c93-a61f-e3f7fc646a20"
 *                 name: Equilx Demo Institute
 *                 slug: equilx-demo-institute
 *                 status: ACTIVE
 *                 createdById: "d1b3e959-41f3-4195-b012-a6559d288d9c"
 *                 createdAt: "2026-10-30T09:53:33.449Z"
 *                 updatedAt: "2026-10-30T09:53:33.449Z"
 *       400:
 *         description: Invalid organization details.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Please check the submitted data.
 *       401:
 *         description: Authentication required or access token invalid.
 *       403:
 *         description: Super Admin access required.
 *       409:
 *         description: An organization with this slug already exists.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: ORGANIZATION_CONFLICT
 *                 message: An organization with this slug already exists.
 */


/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: List organizations
 *     description: |
 *       Returns a paginated list of organizations.
 *       Supports searching organizations by name.
 *       Only authenticated Super Admin users can access this endpoint.
 *     tags: [Organizations]
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
 *         description: Number of organizations per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search organizations by name (case-insensitive).
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "a6d50839-9967-4c93-a61f-e3f7fc646a20"
 *                   name: Equilx Demo Institute
 *                   slug: equilx-demo-institute
 *                   status: ACTIVE
 *                   createdById: "d1b3e959-41f3-4195-b012-a6559d288d9c"
 *                   createdAt: "2026-10-30T09:53:33.449Z"
 *                   updatedAt: "2026-10-30T09:53:33.449Z"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 1
 *                 totalPages: 1
 *       400:
 *         description: Invalid query parameters.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Please check the submitted data.
 *                 details:
 *                   - field: page
 *                     message: "Too small: expected number to be >=1"
 *       401:
 *         description: Authentication required or access token invalid.
 *       403:
 *         description: Super Admin access required.
 */


/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     summary: Get organization details
 *     description: Retrieves organization details along with membership, batch and subscription counts. Only authenticated Super Admin users can access this endpoint.
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
 *         description: Organization ID.
 *     responses:
 *       200:
 *         description: Organization retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "a6d50839-9967-4c93-a61f-e3f7fc646a20"
 *                 name: Equilx Demo Institute
 *                 slug: equilx-demo-institute
 *                 status: ACTIVE
 *                 createdById: "d1b3e959-41f3-4195-b012-a6559d288d9c"
 *                 createdAt: "2026-10-30T09:53:33.449Z"
 *                 updatedAt: "2026-10-30T09:53:33.449Z"
 *                 _count:
 *                   memberships: 0
 *                   batches: 0
 *                   subscriptions: 0
 *       400:
 *         description: Invalid organization UUID.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Please check the submitted data.
 *                 details:
 *                   - field: id
 *                     message: Invalid UUID
 *       401:
 *         description: Authentication required or access token invalid.
 *       403:
 *         description: Super Admin access required.
 *       404:
 *         description: Organization not found.
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error:
 *                 code: ORGANIZATION_NOT_FOUND
 *                 message: The requested organization was not found.
 */

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   patch:
 *     summary: Update an organization
 *     description: Updates an organization's name or slug. Only Super Admin users can access this endpoint.
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
 *                 maxLength: 150
 *               slug:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
 *           example:
 *             name: Equilx Demo Institute Updated
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       400:
 *         description: Invalid organization ID or validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Super Admin access required
 *       404:
 *         description: Organization not found
 *       409:
 *         description: Organization slug already exists
 */

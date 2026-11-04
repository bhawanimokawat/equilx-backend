/**
 * @swagger
 * tags:
 *   - name: CRM - Leads
 *     description: Institute CRM lead management APIs
 *   - name: CRM - Follow-ups
 *     description: Lead follow-up management APIs
 *   - name: CRM - Activities
 *     description: Lead activity management APIs
 *   - name: CRM - Lead Sources
 *     description: Lead source management APIs
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [CRM - Leads]
 *     description: Creates a new lead for the specified institute. A new lead is created with NEW status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rahul Sharma
 *               email:
 *                 type: string
 *                 format: email
 *                 example: rahul.sharma@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               interestedIn:
 *                 type: string
 *                 example: IELTS Academic + Speaking Course
 *               sourceId:
 *                 type: string
 *                 format: uuid
 *               ownerId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *                 example: Student wants to achieve band 8.
 *               nextFollowUpAt:
 *                 type: string
 *                 format: date-time
 *               targetBand:
 *                 type: number
 *                 example: 8
 *               examDate:
 *                 type: string
 *                 format: date
 *                 example: "2027-02-15"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [IELTS, Academic, New Lead]
 *           example:
 *             name: Rahul Sharma
 *             email: rahul.sharma@example.com
 *             phone: "9876543210"
 *             interestedIn: IELTS Academic + Speaking Course
 *             notes: Student wants to achieve band 8.
 *             targetBand: 8
 *             examDate: "2027-02-15"
 *             tags: [IELTS, Academic, New Lead]
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error or invalid lead details
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads:
 *   get:
 *     summary: Get all leads
 *     tags: [CRM - Leads]
 *     description: Returns institute leads with pagination and optional filters.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW, CONTACTED, DEMO_BOOKED, NEGOTIATION, ENROLLED, LOST]
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: Rahul
 *       - in: query
 *         name: dueFollowUps
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [CRM - Leads]
 *     description: Retrieves details of a specific lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lead retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}:
 *   patch:
 *     summary: Update lead
 *     tags: [CRM - Leads]
 *     description: Updates the provided fields of an existing lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               interestedIn:
 *                 type: string
 *               notes:
 *                 type: string
 *               targetBand:
 *                 type: number
 *               examDate:
 *                 type: string
 *                 format: date
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             name: Rahul Sharma
 *             interestedIn: IELTS Academic
 *             notes: Interested in speaking practice.
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *       400:
 *         description: Invalid update data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Operation not permitted
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}:
 *   delete:
 *     summary: Delete lead
 *     tags: [CRM - Leads]
 *     description: Soft deletes a lead by setting its deletedAt field. The record is not permanently removed from the database.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lead deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Lead deleted successfully.
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}/status:
 *   patch:
 *     summary: Update lead status
 *     tags: [CRM - Leads]
 *     description: Changes the status of a lead and records the status history.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [NEW, CONTACTED, DEMO_BOOKED, NEGOTIATION, ENROLLED, LOST]
 *           example:
 *             status: CONTACTED
 *     responses:
 *       200:
 *         description: Lead status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Operation not permitted
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}/status-history:
 *   get:
 *     summary: Get lead status history
 *     tags: [CRM - Leads]
 *     description: Retrieves the status change history of a lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lead status history retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}/assignment:
 *   patch:
 *     summary: Assign lead
 *     tags: [CRM - Leads]
 *     description: Assigns a lead to an institute member.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
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
 *               - ownerId
 *             properties:
 *               ownerId:
 *                 type: string
 *                 format: uuid
 *           example:
 *             ownerId: ae8c0c35-cdda-46d5-9a63-799aa2f0b834
 *     responses:
 *       200:
 *         description: Lead assigned successfully
 *       400:
 *         description: Invalid assignment
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Assignment not permitted
 *       404:
 *         description: Lead or member not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}/assignment-history:
 *   get:
 *     summary: Get lead assignment history
 *     tags: [CRM - Leads]
 *     description: Retrieves the assignment history of a lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Assignment history retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/assignable-users:
 *   get:
 *     summary: Get assignable users
 *     tags: [CRM - Leads]
 *     description: Returns institute members who can be assigned leads.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Assignable users retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}/follow-ups:
 *   post:
 *     summary: Create lead follow-up
 *     tags: [CRM - Follow-ups]
 *     description: Creates a follow-up task for a specific lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
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
 *               - title
 *               - dueAt
 *             properties:
 *               title:
 *                 type: string
 *                 example: Call Rahul Sharma
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *               assignedToId:
 *                 type: string
 *                 format: uuid
 *           example:
 *             title: Call Rahul Sharma
 *             dueAt: "2026-11-02T10:00:00.000Z"
 *             notes: Discuss IELTS course details.
 *     responses:
 *       201:
 *         description: Follow-up created successfully
 *       400:
 *         description: Invalid follow-up data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Follow-up assignment not permitted
 *       404:
 *         description: Lead or assigned user not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/follow-ups:
 *   get:
 *     summary: Get all follow-ups
 *     tags: [CRM - Follow-ups]
 *     description: Retrieves follow-ups with pagination and optional filters.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: PENDING
 *       - in: query
 *         name: assignedToId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: due
 *         schema:
 *           type: string
 *           enum: [overdue, today, upcoming]
 *     responses:
 *       200:
 *         description: Follow-ups retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/follow-ups/{followUpId}/complete:
 *   patch:
 *     summary: Complete follow-up
 *     tags: [CRM - Follow-ups]
 *     description: Marks a pending follow-up as COMPLETED.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: followUpId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Follow-up completed successfully
 *       400:
 *         description: Follow-up cannot be completed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Follow-up update not permitted
 *       404:
 *         description: Follow-up not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/follow-ups/{followUpId}/cancel:
 *   patch:
 *     summary: Cancel follow-up
 *     tags: [CRM - Follow-ups]
 *     description: Marks a pending follow-up as CANCELLED.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: followUpId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Follow-up cancelled successfully
 *       400:
 *         description: Follow-up cannot be cancelled
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Follow-up update not permitted
 *       404:
 *         description: Follow-up not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}/activities:
 *   post:
 *     summary: Create lead activity
 *     tags: [CRM - Activities]
 *     description: Adds an activity record to a lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
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
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 example: CALL
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *               outcome:
 *                 type: string
 *               followUpAt:
 *                 type: string
 *                 format: date-time
 *           example:
 *             type: CALL
 *             subject: Called Rahul Sharma
 *             description: Discussed IELTS Academic and Speaking course details.
 *             outcome: Rahul is interested in the IELTS course.
 *     responses:
 *       201:
 *         description: Activity created successfully
 *       400:
 *         description: Invalid activity data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/{leadId}/activities:
 *   get:
 *     summary: Get lead activities
 *     tags: [CRM - Activities]
 *     description: Retrieves activity records associated with a lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 *       404:
 *         description: Lead not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/lead-sources:
 *   post:
 *     summary: Create lead source
 *     tags: [CRM - Lead Sources]
 *     description: Creates a new lead source for the institute.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: Website Campaign
 *           example:
 *             name: Website Campaign
 *     responses:
 *       201:
 *         description: Lead source created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/lead-sources:
 *   get:
 *     summary: Get lead sources
 *     tags: [CRM - Lead Sources]
 *     description: Retrieves lead sources configured for the institute.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lead sources retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/lead-sources/{sourceId}:
 *   patch:
 *     summary: Update lead source
 *     tags: [CRM - Lead Sources]
 *     description: Updates the name or active status of a lead source. At least one field must be provided.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: sourceId
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               isActive:
 *                 type: boolean
 *           example:
 *             name: Website Campaign Updated
 *             isActive: true
 *     responses:
 *       200:
 *         description: Lead source updated successfully
 *       400:
 *         description: Validation error or empty update
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 *       404:
 *         description: Lead source not found
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/export:
 *   get:
 *     summary: Export leads as CSV
 *     tags: [CRM - Leads]
 *     description: Exports institute leads in CSV format.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Leads exported successfully as CSV
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *             example: |
 *               name,email,phone,interestedIn
 *               Rahul Sharma,rahul.sharma@example.com,9876543210,IELTS Academic
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */

/**
 * @swagger
 * /institutes/{instituteId}/crm/leads/import:
 *   post:
 *     summary: Import leads from CSV
 *     tags: [CRM - Leads]
 *     description: Imports leads from CSV text. The import supports up to 500 rows. The CSV must contain name and at least email or phone.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
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
 *               - csv
 *             properties:
 *               csv:
 *                 type: string
 *                 description: CSV content as a string
 *           example:
 *             csv: |
 *               name,email,phone,interestedIn
 *               Rahul Sharma,rahul.sharma@example.com,9876543210,IELTS Academic
 *     responses:
 *       200:
 *         description: CSV import completed
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalRows: 1
 *                 imported: 1
 *                 rejected: 0
 *                 results:
 *                   - row: 2
 *                     status: IMPORTED
 *                     leadId: 796e8870-a195-42bc-abcc-8aebc98a965d
 *       400:
 *         description: Invalid CSV data or import limit exceeded
 *       401:
 *         description: Authentication required
 *       403:
 *         description: CRM access denied
 */
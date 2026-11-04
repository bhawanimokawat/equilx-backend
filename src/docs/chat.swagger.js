

/**
 * @swagger
 * /api/v1/{instituteId}/conversations/direct:
 *   post:
 *     summary: Create a direct conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
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
 *               - recipientUserId
 *             properties:
 *               recipientUserId:
 *                 type: string
 *                 format: uuid
 *                 example: 198fd5e2-d2a8-480f-9f9f-b44a890fafbf
 *     responses:
 *       '201':
 *         description: Direct conversation created successfully.
 *       '400':
 *         description: Invalid request or participant.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Institute access or conversation permission denied.
 */

/**
 * @swagger
 * /api/v1/{instituteId}/conversations:
 *   get:
 *     summary: List conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Conversations retrieved successfully.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Institute access denied.
 */

/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}:
 *   get:
 *     summary: Get conversation details
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Conversation details retrieved successfully.
 *       '401':
 *         description: Authentication required.
 *       '404':
 *         description: Conversation not found or access denied.
 */

/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}:
 *   patch:
 *     summary: Update conversation details
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
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
 *               title:
 *                 type: string
 *                 example: Equilx IELTS Team Discussion
 *     responses:
 *       '200':
 *         description: Conversation updated successfully.
 *       '403':
 *         description: Only group administrators can update this conversation.
 *       '404':
 *         description: Conversation not found.
 */

/**
 * @swagger
 * /{instituteId}/conversations/groups:
 *   post:
 *     summary: Create an institute or batch group conversation
 *     tags: [Chat]
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
 *               - title
 *               - participantIds
 *             properties:
 *               title:
 *                 type: string
 *                 example: IELTS Reading Group
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example:
 *                   - "431623f3-bc18-412e-b8e3-3faa9a508944"
 *               batchId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Optional batch ID for a batch-based group
 *     responses:
 *       201:
 *         description: Group conversation created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not authorized to create this conversation
 *       404:
 *         description: Institute or participant not found
 */

 

/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/participants:
 *   post:
 *     summary: Add participants to a group conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       '200':
 *         description: Participants processed successfully.
 *       '400':
 *         description: Invalid participant IDs.
 *       '403':
 *         description: Only group administrators can add participants.
 *       '404':
 *         description: Conversation not found.
 */

/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/participants/{userId}:
 *   delete:
 *     summary: Remove a participant from a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Participant removed successfully.
 *       '403':
 *         description: Permission denied.
 *       '404':
 *         description: Participant not found.
 */

/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/archive:
 *   post:
 *     summary: Archive a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Conversation archived successfully.
 *       '403':
 *         description: Permission denied.
 *       '404':
 *         description: Conversation not found.
 */



/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
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
 *               - content
 *               - clientMessageId
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: Hello! Welcome to Equilx IELTS.
 *               clientMessageId:
 *                 type: string
 *                 format: uuid
 *                 example: a7e8b5d2-6c91-4f30-9a42-8d6b1e5c3f70
 *     responses:
 *       '201':
 *         description: Message sent successfully.
 *       '400':
 *         description: Invalid message content.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Conversation access denied.
 *       '409':
 *         description: Duplicate client message ID conflict.
 */


/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/messages:
 *   get:
 *     summary: List conversation messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 30
 *       - in: query
 *         name: beforeId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Messages retrieved successfully with cursor pagination.
 *       '400':
 *         description: Invalid message cursor or query.
 *       '401':
 *         description: Authentication required.
 *       '404':
 *         description: Conversation not found or access denied.
 */



/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/messages/{messageId}:
 *   patch:
 *     summary: Edit an existing message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Updated message content.
 *     responses:
 *       '200':
 *         description: Message updated successfully.
 *       '403':
 *         description: Only the sender can edit their message.
 *       '404':
 *         description: Message not found.
 */



/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     description: Soft-deletes the message. The database record is retained.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Message deleted successfully.
 *       '403':
 *         description: Only the sender can delete their message.
 *       '404':
 *         description: Message not found.
 */



/**
 * @swagger
 * /api/v1/{instituteId}/conversations/{conversationId}/read:
 *   post:
 *     summary: Mark conversation messages as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instituteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: conversationId
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
 *               lastMessageId:
 *                 type: string
 *                 format: uuid
 *                 example: b25aeb87-1a82-45fa-8d76-be3ce0070e91
 *     responses:
 *       '200':
 *         description: Conversation marked as read.
 *       '400':
 *         description: Invalid request.
 *       '403':
 *         description: Conversation access denied.
 *       '404':
 *         description: Message not found in this conversation.
 */

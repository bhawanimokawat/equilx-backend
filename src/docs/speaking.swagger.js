
/**
 * @swagger
 * /api/v1/speaking/attempts/{attemptId}/submissions:
 *   post:
 *     summary: Create a Speaking submission
 *     description: Creates a Speaking submission for an active IELTS attempt and a selected Speaking part.
 *     tags:
 *       - Speaking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the Speaking attempt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partNumber
 *               - consentStatus
 *             properties:
 *               partNumber:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 example: 1
 *               consentStatus:
 *                 type: string
 *                 enum: [GRANTED]
 *                 example: GRANTED
 *     responses:
 *       201:
 *         description: Speaking submission created successfully
 *       400:
 *         description: Invalid request or Speaking attempt cannot be used
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Speaking attempt not found
 *       409:
 *         description: Submission already exists for this Speaking part
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /api/v1/speaking/submissions/{submissionId}/recordings:
 *   post:
 *     summary: Upload Speaking audio recording
 *     description: Uploads an audio recording for a Speaking submission. Supports idempotent uploads of the same audio file.
 *     tags:
 *       - Speaking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Speaking submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - recording
 *             properties:
 *               recording:
 *                 type: string
 *                 format: binary
 *                 description: Audio file to upload
 *               durationSeconds:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 900
 *                 example: 111
 *     responses:
 *       201:
 *         description: New recording uploaded successfully
 *       200:
 *         description: Identical recording already exists; existing recording returned
 *       400:
 *         description: Invalid audio format or request
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Speaking submission not found
 *       409:
 *         description: A different active recording already exists
 *       413:
 *         description: Audio file exceeds the maximum allowed size
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /api/v1/speaking/submissions/{submissionId}/complete:
 *   post:
 *     summary: Complete Speaking submission
 *     description: Completes the Speaking submission and queues an audio transcription job for background processing.
 *     tags:
 *       - Speaking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Speaking submission ID
 *     responses:
 *       200:
 *         description: Speaking transcription successfully queued
 *       400:
 *         description: Recording missing, invalid submission state, or submission cannot be completed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Speaking submission or recording not found
 *       409:
 *         description: Transcription job already exists or submission already processed
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /api/v1/speaking/submissions/{submissionId}/withdraw-consent:
 *   post:
 *     summary: Withdraw Speaking recording consent
 *     description: Withdraws recording consent, prevents further processing, and initiates deletion of associated audio recordings.
 *     tags:
 *       - Speaking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Speaking submission ID
 *     responses:
 *       200:
 *         description: Recording consent successfully withdrawn
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Speaking submission not found
 *       500:
 *         description: Internal server error
 */

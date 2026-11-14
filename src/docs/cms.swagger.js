/**
 * @swagger
 * tags:
 *   - name: CMS
 *     description: Super Admin CMS APIs for IELTS content management.
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     BookInput:
 *       type: object
 *       required: [title]
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *           minLength: 2
 *           maxLength: 200
 *           example: IELTS Academic Book 1
 *         bookNumber:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *         publisher:
 *           type: string
 *           example: Cambridge University Press
 *         category:
 *           type: string
 *           nullable: true
 *           enum: [ACADEMIC, GENERAL_TRAINING]
 *         isActive:
 *           type: boolean
 *           example: true
 *
 *     BookUpdate:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *         bookNumber:
 *           type: integer
 *         publisher:
 *           type: string
 *         category:
 *           type: string
 *           nullable: true
 *           enum: [ACADEMIC, GENERAL_TRAINING]
 *         isActive:
 *           type: boolean
 *
 *     TestInput:
 *       type: object
 *       required: [title, testNumber, category]
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *           example: IELTS Academic Mock Test 1
 *         testNumber:
 *           type: integer
 *           example: 1
 *         category:
 *           type: string
 *           enum: [ACADEMIC, GENERAL_TRAINING]
 *
 *     TestUpdate:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *         testNumber:
 *           type: integer
 *         category:
 *           type: string
 *           enum: [ACADEMIC, GENERAL_TRAINING]
 *
 *     TestVersionInput:
 *       type: object
 *       required: [testId]
 *       additionalProperties: false
 *       properties:
 *         testId:
 *           type: string
 *           format: uuid
 *
 *     TestVersionUpdate:
 *       type: object
 *       required: [status]
 *       additionalProperties: false
 *       properties:
 *         status:
 *           type: string
 *           enum: [DRAFT, IN_REVIEW]
 *
 *     TestModuleInput:
 *       type: object
 *       required: [testVersionId, section, position, durationSeconds]
 *       additionalProperties: false
 *       properties:
 *         testVersionId:
 *           type: string
 *           format: uuid
 *         section:
 *           type: string
 *           enum: [LISTENING, READING, WRITING, SPEAKING]
 *         position:
 *           type: integer
 *           minimum: 1
 *         durationSeconds:
 *           type: integer
 *           minimum: 1
 *         instructions:
 *           type: object
 *           additionalProperties: true
 *
 *     TestModuleUpdate:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         position:
 *           type: integer
 *         durationSeconds:
 *           type: integer
 *         instructions:
 *           type: object
 *           additionalProperties: true
 *
 *     TestPartInput:
 *       type: object
 *       required: [testModuleId, title, position]
 *       additionalProperties: false
 *       properties:
 *         testModuleId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         position:
 *           type: integer
 *         instructions:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         audioAssetKey:
 *           type: string
 *           nullable: true
 *
 *     TestPartUpdate:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *         position:
 *           type: integer
 *         instructions:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         audioAssetKey:
 *           type: string
 *           nullable: true
 *
 *     QuestionGroupInput:
 *       type: object
 *       required: [testPartId, position]
 *       additionalProperties: false
 *       properties:
 *         testPartId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *           nullable: true
 *         position:
 *           type: integer
 *         instructions:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         passage:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *
 *     QuestionGroupUpdate:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         title:
 *           type: string
 *           nullable: true
 *         position:
 *           type: integer
 *         instructions:
 *           type: object
 *           nullable: true
 *         passage:
 *           type: object
 *           nullable: true
 *
 *     QuestionInput:
 *       type: object
 *       required:
 *         - testPartId
 *         - questionNumber
 *         - questionType
 *         - content
 *         - position
 *       additionalProperties: false
 *       properties:
 *         testPartId:
 *           type: string
 *           format: uuid
 *         questionGroupId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         questionNumber:
 *           type: integer
 *         questionType:
 *           type: string
 *           enum:
 *             - MULTIPLE_CHOICE
 *             - MULTIPLE_SELECT
 *             - TRUE_FALSE_NOT_GIVEN
 *             - YES_NO_NOT_GIVEN
 *             - SHORT_ANSWER
 *             - SENTENCE_COMPLETION
 *             - SUMMARY_COMPLETION
 *             - NOTE_COMPLETION
 *             - FORM_COMPLETION
 *             - TABLE_COMPLETION
 *             - MATCHING
 *             - MATCHING_HEADINGS
 *             - MATCHING_INFORMATION
 *             - MATCHING_FEATURES
 *             - MAP_LABELING
 *             - DIAGRAM_LABELING
 *             - FLOW_CHART_COMPLETION
 *             - GAP_FILL
 *             - ESSAY
 *             - LETTER
 *             - REPORT
 *             - SPEAKING_RESPONSE
 *         content:
 *           type: object
 *           additionalProperties: true
 *         marks:
 *           type: number
 *         position:
 *           type: integer
 *
 *     QuestionUpdate:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         questionNumber:
 *           type: integer
 *         questionType:
 *           type: string
 *         content:
 *           type: object
 *           additionalProperties: true
 *         marks:
 *           type: number
 *         position:
 *           type: integer
 *
 *     AnswerKeyInput:
 *       type: object
 *       required: [questionId, acceptedAnswers]
 *       additionalProperties: false
 *       properties:
 *         questionId:
 *           type: string
 *           format: uuid
 *         acceptedAnswers:
 *           description: Accepted answer value or structure.
 *         explanation:
 *           type: object
 *           nullable: true
 *         markingRules:
 *           type: object
 *           nullable: true
 *
 *     AnswerKeyUpdate:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         acceptedAnswers: {}
 *         explanation:
 *           type: object
 *           nullable: true
 *         markingRules:
 *           type: object
 *           nullable: true
 *
 *     BandConversionInput:
 *       type: object
 *       required: [testVersionId, section, version, conversionTable]
 *       additionalProperties: false
 *       properties:
 *         testVersionId:
 *           type: string
 *           format: uuid
 *         section:
 *           type: string
 *           enum: [LISTENING, READING, WRITING, SPEAKING]
 *         version:
 *           type: integer
 *         conversionTable:
 *           type: object
 *           additionalProperties: true
 *
 *     BulkImportInput:
 *       type: object
 *       description: Nested import payload. Follow the backend bulkImportTestSchema for exact nested fields.
 *       required: [testVersionId, modules]
 *       properties:
 *         testVersionId:
 *           type: string
 *           format: uuid
 *         modules:
 *           type: array
 *           items:
 *             type: object
 *             additionalProperties: true
 */

/**
 * @swagger
 * /api/v1/cms/books:
 *   post:
 *     summary: Create Book
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookInput'
 *     responses:
 *       '201':
 *         description: Book created successfully.
 *       '400':
 *         description: Validation error.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Super Admin access required.
 *   get:
 *     summary: Get All Books
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Books retrieved successfully.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Super Admin access required.
 */

/**
 * @swagger
 * /api/v1/cms/books/{bookId}:
 *   get:
 *     summary: Get Book By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Book retrieved successfully.
 *       '404':
 *         description: Book not found.
 *   patch:
 *     summary: Update Book
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookUpdate'
 *     responses:
 *       '200':
 *         description: Book updated successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Book not found.
 */

/**
 * @swagger
 * /api/v1/cms/books/{bookId}/tests:
 *   post:
 *     summary: Create Test In Book
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestInput'
 *     responses:
 *       '201':
 *         description: Test created successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Book not found.
 *   get:
 *     summary: Get Tests By Book
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Tests retrieved successfully.
 *       '404':
 *         description: Book not found.
 */

/**
 * @swagger
 * /api/v1/cms/tests/{testId}:
 *   get:
 *     summary: Get Test By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Test retrieved successfully.
 *       '404':
 *         description: Test not found.
 *   patch:
 *     summary: Update Test
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestUpdate'
 *     responses:
 *       '200':
 *         description: Test updated successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Test not found.
 */

/**
 * @swagger
 * /api/v1/cms/tests/{testId}/archive:
 *   patch:
 *     summary: Archive Test
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Test archived successfully.
 *       '404':
 *         description: Test not found.
 */

/**
 * @swagger
 * /api/v1/cms/tests/{testId}/versions:
 *   post:
 *     summary: Create Test Version
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestVersionInput'
 *     responses:
 *       '201':
 *         description: Test version created successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Test not found.
 */

/**
 * @swagger
 * /api/v1/cms/test-versions/{versionId}:
 *   get:
 *     summary: Get Test Version By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Test version retrieved successfully.
 *       '404':
 *         description: Version not found.
 *   patch:
 *     summary: Update Test Version
 *     description: Status can be DRAFT or IN_REVIEW according to the validation schema.
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestVersionUpdate'
 *     responses:
 *       '200':
 *         description: Test version updated successfully.
 *       '400':
 *         description: Validation error or version not editable.
 *       '404':
 *         description: Version not found.
 */

/**
 * @swagger
 * /api/v1/cms/test-modules:
 *   post:
 *     summary: Create Test Module
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestModuleInput'
 *     responses:
 *       '201':
 *         description: Module created successfully.
 *       '400':
 *         description: Validation error or version not editable.
 *       '404':
 *         description: Version not found.
 */

/**
 * @swagger
 * /api/v1/cms/test-modules/{moduleId}:
 *   get:
 *     summary: Get Test Module By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Module retrieved successfully.
 *       '404':
 *         description: Module not found.
 *   patch:
 *     summary: Update Test Module
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestModuleUpdate'
 *     responses:
 *       '200':
 *         description: Module updated successfully.
 *       '400':
 *         description: Validation error or version not editable.
 *       '404':
 *         description: Module not found.
 */

/**
 * @swagger
 * /api/v1/cms/test-parts:
 *   post:
 *     summary: Create Test Part
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestPartInput'
 *     responses:
 *       '201':
 *         description: Part created successfully.
 *       '400':
 *         description: Validation error or version not editable.
 *       '404':
 *         description: Module not found.
 */

/**
 * @swagger
 * /api/v1/cms/test-parts/{partId}:
 *   get:
 *     summary: Get Test Part By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Part retrieved successfully.
 *       '404':
 *         description: Part not found.
 *   patch:
 *     summary: Update Test Part
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestPartUpdate'
 *     responses:
 *       '200':
 *         description: Part updated successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Part not found.
 */

/**
 * @swagger
 * /api/v1/cms/question-groups:
 *   post:
 *     summary: Create Question Group
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestionGroupInput'
 *     responses:
 *       '201':
 *         description: Question group created successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Part not found.
 */

/**
 * @swagger
 * /api/v1/cms/question-groups/{groupId}:
 *   get:
 *     summary: Get Question Group By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Question group retrieved successfully.
 *       '404':
 *         description: Question group not found.
 *   patch:
 *     summary: Update Question Group
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestionGroupUpdate'
 *     responses:
 *       '200':
 *         description: Question group updated successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Question group not found.
 */

/**
 * @swagger
 * /api/v1/cms/questions:
 *   post:
 *     summary: Create Question
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestionInput'
 *     responses:
 *       '201':
 *         description: Question created successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Part or group not found.
 */

/**
 * @swagger
 * /api/v1/cms/questions/{questionId}:
 *   get:
 *     summary: Get Question By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Question retrieved successfully.
 *       '404':
 *         description: Question not found.
 *   patch:
 *     summary: Update Question
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestionUpdate'
 *     responses:
 *       '200':
 *         description: Question updated successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Question not found.
 */

/**
 * @swagger
 * /api/v1/cms/answer-keys:
 *   post:
 *     summary: Create Answer Key
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnswerKeyInput'
 *     responses:
 *       '201':
 *         description: Answer key created successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Question not found.
 */

/**
 * @swagger
 * /api/v1/cms/answer-keys/{answerKeyId}:
 *   get:
 *     summary: Get Answer Key By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: answerKeyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Answer key retrieved successfully.
 *       '404':
 *         description: Answer key not found.
 *   patch:
 *     summary: Update Answer Key
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: answerKeyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnswerKeyUpdate'
 *     responses:
 *       '200':
 *         description: Answer key updated successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Answer key not found.
 */

/**
 * @swagger
 * /api/v1/cms/band-conversions:
 *   post:
 *     summary: Create Band Conversion
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BandConversionInput'
 *     responses:
 *       '201':
 *         description: Band conversion created successfully.
 *       '400':
 *         description: Validation error.
 *       '404':
 *         description: Test version not found.
 */

/**
 * @swagger
 * /api/v1/cms/band-conversions/{conversionId}:
 *   get:
 *     summary: Get Band Conversion By ID
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Band conversion retrieved successfully.
 *       '404':
 *         description: Band conversion not found.
 */

/**
 * @swagger
 * /api/v1/cms/bulk-import:
 *   post:
 *     summary: Bulk Import Test Content
 *     description: Imports nested test content. Exact nested payload must follow bulkImportTestSchema in the backend.
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkImportInput'
 *     responses:
 *       '200':
 *         description: Bulk import completed successfully.
 *       '201':
 *         description: Bulk import completed successfully.
 *       '400':
 *         description: Import validation failed.
 *       '404':
 *         description: Test version not found.
 */

/**
 * @swagger
 * /api/v1/cms/test-versions/{versionId}/validate:
 *   post:
 *     summary: Validate Test Version
 *     description: Checks required sections, parts, questions and band conversions before publishing. A 200 response can still contain valid=false.
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Validation completed. Check data.valid, data.errors and data.warnings.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 testVersionId: 082583a6-9461-4812-b793-93989bfc906e
 *                 testTitle: IELTS Academic Mock Test 1
 *                 testNumber: 1
 *                 status: DRAFT
 *                 valid: true
 *                 summary:
 *                   modules: 4
 *                   questions: 4
 *                   errors: 0
 *                   warnings: 1
 *                 errors: []
 *                 warnings:
 *                   - code: MISSING_AUDIO_ASSET_KEY
 *                     message: One or more Listening parts have no audio asset key.
 *       '404':
 *         description: Test version not found.
 */

/**
 * @swagger
 * /api/v1/cms/test-versions/{versionId}/publish:
 *   post:
 *     summary: Publish Test Version
 *     description: Publishes a valid test version and changes its status to PUBLISHED.
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Test version published successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Test version published successfully.
 *               data:
 *                 id: 082583a6-9461-4812-b793-93989bfc906e
 *                 testId: ed86e87b-754f-43c5-9222-1a7794d9f921
 *                 version: 1
 *                 status: PUBLISHED
 *                 publishedAt: '2026-10-31T06:47:42.734Z'
 *                 contentChecksum: null
 *       '400':
 *         description: Version is invalid or cannot be published.
 *       '404':
 *         description: Test version not found.
 */
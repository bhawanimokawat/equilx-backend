const { z } = require("zod");

const testCategorySchema = z.enum([
  "ACADEMIC",
  "GENERAL_TRAINING",
]);

const createBookSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    bookNumber: z.number().int().positive().optional(),
    publisher: z.string().trim().min(1).max(150).optional(),
    category: testCategorySchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateBookSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    bookNumber: z.number().int().positive().nullable().optional(),
    publisher: z.string().trim().min(1).max(150).nullable().optional(),
    category: testCategorySchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

const bookIdParamSchema = z
  .object({
    bookId: z.string().uuid(),
  })
  .strict();

const listBooksQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    category: testCategorySchema.optional(),
    isActive: z.enum(["true", "false"]).optional(),
  })
  .strict();


  const createTestSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    testNumber: z.number().int().positive(),
    category: testCategorySchema,
  })
  .strict();

const updateTestSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    testNumber: z.number().int().positive().optional(),
    category: testCategorySchema.optional(),
    status: z.enum([
      "DRAFT",
      "IN_REVIEW",
      "PUBLISHED",
      "ARCHIVED",
    ]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

const testIdParamSchema = z
  .object({
    testId: z.string().uuid(),
  })
  .strict();

const listTestsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: testCategorySchema.optional(),
    status: z.enum([
      "DRAFT",
      "IN_REVIEW",
      "PUBLISHED",
      "ARCHIVED",
    ]).optional(),
  })
  .strict();


  const createTestVersionSchema = z.object({
  testId: z.string().uuid(),
}).strict();

const testVersionIdParamSchema = z.object({
  versionId: z.string().uuid(),
}).strict();

const updateTestVersionSchema = z.object({
  status: z.enum([
    "DRAFT",
    "IN_REVIEW",
  ]),
}).strict();



const createTestModuleSchema = z.object({
  testVersionId: z.string().uuid(),
  section: z.enum([
    "LISTENING",
    "READING",
    "WRITING",
    "SPEAKING",
  ]),
  position: z.number().int().positive(),
  durationSeconds: z.number().int().positive(),
  instructions: z.record(z.string(), z.unknown()).optional(),
}).strict();

const updateTestModuleSchema = z.object({
  position: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  instructions: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

const moduleIdParamSchema = z.object({
  moduleId: z.string().uuid(),
}).strict();





const createTestPartSchema = z.object({
  testModuleId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  position: z.number().int().positive(),
  instructions: z.record(z.string(), z.unknown()).nullable().optional(),
  audioAssetKey: z.string().trim().min(1).max(500).nullable().optional(),
}).strict();

const testPartIdParamSchema = z.object({
  partId: z.string().uuid(),
}).strict();

const updateTestPartSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  position: z.number().int().positive().optional(),
  instructions: z.record(z.string(), z.unknown()).nullable().optional(),
  audioAssetKey: z.string().trim().min(1).max(500).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);


const createQuestionGroupSchema = z.object({
  testPartId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).nullable().optional(),
  instructions: z.record(z.string(), z.unknown()).nullable().optional(),
  passage: z.record(z.string(), z.unknown()).nullable().optional(),
  position: z.number().int().positive(),
}).strict();

const questionGroupIdParamSchema = z.object({
  groupId: z.string().uuid(),
}).strict();

const updateQuestionGroupSchema = z.object({
  title: z.string().trim().min(1).max(200).nullable().optional(),
  instructions: z.record(z.string(), z.unknown()).nullable().optional(),
  passage: z.record(z.string(), z.unknown()).nullable().optional(),
  position: z.number().int().positive().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);



const createQuestionSchema = z.object({
  testPartId: z.string().uuid(),
  questionGroupId: z.string().uuid().nullable().optional(),
  questionNumber: z.number().int().positive(),
  questionType: z.enum([
    "MULTIPLE_CHOICE",
    "MULTIPLE_SELECT",
    "TRUE_FALSE_NOT_GIVEN",
    "YES_NO_NOT_GIVEN",
    "SHORT_ANSWER",
    "SENTENCE_COMPLETION",
    "SUMMARY_COMPLETION",
    "NOTE_COMPLETION",
    "FORM_COMPLETION",
    "TABLE_COMPLETION",
    "MATCHING",
    "MATCHING_HEADINGS",
    "MATCHING_INFORMATION",
    "MATCHING_FEATURES",
    "MAP_LABELING",
    "DIAGRAM_LABELING",
    "FLOW_CHART_COMPLETION",
    "GAP_FILL",
    "ESSAY",
    "LETTER",
    "REPORT",
    "SPEAKING_RESPONSE",
  ]),
  content: z.record(z.string(), z.unknown()),
  marks: z.number().positive().max(999.99).optional(),
  position: z.number().int().positive(),
}).strict();

const questionIdParamSchema = z.object({
  questionId: z.string().uuid(),
}).strict();

const updateQuestionSchema = z.object({
  questionGroupId: z.string().uuid().nullable().optional(),
  questionNumber: z.number().int().positive().optional(),
  questionType: z.enum([
    "MULTIPLE_CHOICE",
    "MULTIPLE_SELECT",
    "TRUE_FALSE_NOT_GIVEN",
    "YES_NO_NOT_GIVEN",
    "SHORT_ANSWER",
    "SENTENCE_COMPLETION",
    "SUMMARY_COMPLETION",
    "NOTE_COMPLETION",
    "FORM_COMPLETION",
    "TABLE_COMPLETION",
    "MATCHING",
    "MATCHING_HEADINGS",
    "MATCHING_INFORMATION",
    "MATCHING_FEATURES",
    "MAP_LABELING",
    "DIAGRAM_LABELING",
    "FLOW_CHART_COMPLETION",
    "GAP_FILL",
    "ESSAY",
    "LETTER",
    "REPORT",
    "SPEAKING_RESPONSE",
  ]).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  marks: z.number().positive().max(999.99).optional(),
  position: z.number().int().positive().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);




const createAnswerKeySchema = z.object({
  questionId: z.string().uuid(),
  acceptedAnswers: z.unknown(),
  explanation: z.record(z.string(), z.unknown()).nullable().optional(),
  markingRules: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict().refine(
  (data) => data.acceptedAnswers !== undefined,
  {
    message: "Accepted answers are required.",
    path: ["acceptedAnswers"],
  }
);


const answerKeyIdParamSchema = z.object({
  answerKeyId: z.string().uuid(),
}).strict();




const updateAnswerKeySchema = z.object({
  acceptedAnswers: z.unknown().optional(),
  explanation: z.record(z.string(), z.unknown()).nullable().optional(),
  markingRules: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided.",
  }
);



const createBandConversionSchema = z.object({
  testVersionId: z.string().uuid(),
  section: z.enum([
    "LISTENING",
    "READING",
    "WRITING",
    "SPEAKING",
  ]),
  version: z.number().int().positive(),
  conversionTable: z.record(z.string(), z.unknown()),
}).strict();

const bandConversionIdParamSchema = z.object({
  conversionId: z.string().uuid(),
}).strict();



const bulkImportTestSchema = z.object({
  testVersionId: z.string().uuid(),
  modules: z.array(
    z.object({
      section: z.enum([
        "LISTENING",
        "READING",
        "WRITING",
        "SPEAKING",
      ]),
      position: z.number().int().positive(),
      durationSeconds: z.number().int().positive(),
      instructions: z.record(z.string(), z.unknown()).nullable().optional(),
      parts: z.array(
        z.object({
          title: z.string().trim().min(1).max(200),
          position: z.number().int().positive(),
          instructions: z.record(z.string(), z.unknown()).nullable().optional(),
          audioAssetKey: z.string().trim().min(1).max(500).nullable().optional(),
          groups: z.array(
            z.object({
              title: z.string().trim().min(1).max(200).nullable().optional(),
              position: z.number().int().positive(),
              instructions: z.record(z.string(), z.unknown()).nullable().optional(),
              passage: z.record(z.string(), z.unknown()).nullable().optional(),
              questions: z.array(
                z.object({
                  questionNumber: z.number().int().positive(),
                  questionType: z.enum([
                    "MULTIPLE_CHOICE",
                    "MULTIPLE_SELECT",
                    "TRUE_FALSE_NOT_GIVEN",
                    "YES_NO_NOT_GIVEN",
                    "SHORT_ANSWER",
                    "SENTENCE_COMPLETION",
                    "SUMMARY_COMPLETION",
                    "NOTE_COMPLETION",
                    "FORM_COMPLETION",
                    "TABLE_COMPLETION",
                    "MATCHING",
                    "MATCHING_HEADINGS",
                    "MATCHING_INFORMATION",
                    "MATCHING_FEATURES",
                    "MAP_LABELING",
                    "DIAGRAM_LABELING",
                    "FLOW_CHART_COMPLETION",
                    "GAP_FILL",
                    "ESSAY",
                    "LETTER",
                    "REPORT",
                    "SPEAKING_RESPONSE",
                  ]),
                  content: z.record(z.string(), z.unknown()),
                  marks: z.number().positive().max(999.99).optional(),
                  position: z.number().int().positive(),
                  answerKey: z.object({
                    acceptedAnswers: z.unknown(),
                    explanation: z.record(z.string(), z.unknown()).nullable().optional(),
                    markingRules: z.record(z.string(), z.unknown()).nullable().optional(),
                  }).strict(),
                }).strict()
              ).min(1).max(200),
            }).strict()
          ).max(50),
        }).strict()
      ).min(1).max(50),
    }).strict()
  ).min(1).max(4),
}).strict();



module.exports = {
  testCategorySchema,
  createBookSchema,
  updateBookSchema,
  bookIdParamSchema,
  listBooksQuerySchema,
  createTestSchema,
  updateTestSchema,
  testIdParamSchema,
  listTestsQuerySchema,
  createTestVersionSchema,
  testVersionIdParamSchema,
  updateTestVersionSchema,
  createTestModuleSchema,
  updateTestModuleSchema,
  moduleIdParamSchema,
  createTestPartSchema,
  testPartIdParamSchema,
  updateTestPartSchema,
  createQuestionGroupSchema,
  questionGroupIdParamSchema,
  updateQuestionGroupSchema,
  createQuestionSchema,
  questionIdParamSchema,
  updateQuestionSchema,
  createAnswerKeySchema,
  answerKeyIdParamSchema,
  updateAnswerKeySchema,
  createBandConversionSchema,
  bandConversionIdParamSchema,
  bulkImportTestSchema,

};


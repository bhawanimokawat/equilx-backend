const { objectUtil } = require("zod/v3");
const { prisma } = require("../../../config/database");

async function createBook(data) {
  return prisma.book.create({
    data: {
      title: data.title,
      bookNumber: data.bookNumber,
      publisher: data.publisher,
      category: data.category,
      isActive: data.isActive ?? true,
    },
  });
}

async function listBooks({ page, limit, search, category, isActive }) {
  const where = {
    ...(search && {
      title: {
        contains: search,
        mode: "insensitive",
      },
    }),
    ...(category && { category }),
    ...(isActive !== undefined && {
      isActive: isActive === "true",
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.book.findMany({
      where,
      orderBy: [{ bookNumber: "asc" }, { title: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.book.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getBookById(bookId) {
  return prisma.book.findUnique({
    where: { id: bookId },
    include: {
      tests: {
        orderBy: { testNumber: "asc" },
      },
    },
  });
}

async function updateBook(bookId, data) {
  return prisma.book.update({
    where: { id: bookId },
    data,
  });
}



async function createTest(bookId, data) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!book) {
    const error = new Error("The requested book was not found.");
    error.code = "BOOK_NOT_FOUND";
    throw error;
  }

  if (!book.isActive) {
    const error = new Error(
      "Cannot create a test under an inactive book."
    );
    error.code = "BOOK_INACTIVE";
    throw error;
  }

  return prisma.test.create({
    data: {
      bookId,
      title: data.title,
      testNumber: data.testNumber,
      category: data.category,
    },
  });
}
async function listTests(bookId, { page, limit, category, status }) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true },
  });

  if (!book) {
    const error = new Error("The requested book was not found.");
    error.code = "BOOK_NOT_FOUND";
    throw error;
  }

  const where = {
    bookId,
    ...(category && { category }),
    ...(status && { status }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.test.findMany({
      where,
      orderBy: [{ testNumber: "asc" }, { title: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { versions: true } },
      },
    }),
    prisma.test.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getTestById(testId) {
  return prisma.test.findUnique({
    where: { id: testId },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          bookNumber: true,
          category: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          status: true,
          publishedAt: true,
          contentChecksum: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

async function createTestVersion(testId) {
  return prisma.$transaction(async (tx) => {
    const test = await tx.test.findUnique({
      where: { id: testId },
      select: { id: true },
    });

    if (!test) {
      const error = new Error("The requested test was not found.");
      error.code = "TEST_NOT_FOUND";
      throw error;
    }

    const latestVersion = await tx.testVersion.findFirst({
      where: { testId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    return tx.testVersion.create({
      data: {
        testId,
        version: nextVersion,
        status: "DRAFT",
      },
    });
  });
}

async function updateTest(testId, data) {
  return prisma.test.update({
    where: { id: testId },
    data,
  });
}

async function archiveTest(testId) {
  return prisma.test.update({
    where: { id: testId },
    data: {
      status: "ARCHIVED",
    },
  });
}
async function getTestVersionById(versionId) {
  return prisma.testVersion.findUnique({
    where: { id: versionId },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          testNumber: true,
          category: true,
          bookId: true,
        },
      },
    },
  });
}


async function updateTestVersion(versionId, data) {
  const version = await prisma.testVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!version) {
    const error = new Error("The requested test version was not found.");
    error.code = "TEST_VERSION_NOT_FOUND";
    throw error;
  }

  const allowedTransitions = {
    DRAFT: ["DRAFT", "IN_REVIEW"],
    IN_REVIEW: ["DRAFT", "IN_REVIEW"],
    PUBLISHED: [],
    ARCHIVED: [],
  };

  if (!allowedTransitions[version.status]?.includes(data.status)) {
    const error = new Error(
      "This test version cannot transition to the requested status."
    );
    error.code = "TEST_VERSION_INVALID_TRANSITION";
    throw error;
  }

  return prisma.testVersion.update({
    where: { id: versionId },
    data: {
      status: data.status,
    },
  });
}



async function createTestModule(data) {
  const version = await prisma.testVersion.findUnique({
    where: { id: data.testVersionId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!version) {
    const error = new Error("The requested test version was not found.");
    error.code = "TEST_VERSION_NOT_FOUND";
    throw error;
  }

  if (version.status !== "DRAFT") {
    const error = new Error(
      "Modules can only be added to draft test versions."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.testModule.create({
    data: {
      testVersionId: data.testVersionId,
      section: data.section,
      position: data.position,
      durationSeconds: data.durationSeconds,
      instructions: data.instructions,
    },
  });
}


async function getTestModuleById(moduleId) {
  return prisma.testModule.findUnique({
    where: { id: moduleId },
    include: {
      testVersion: {
        select: {
          id: true,
          version: true,
          status: true,
          testId: true,
        },
      },
      parts: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          instructions: true,
          audioAssetKey: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}


async function createTestPart(data) {
  const module = await prisma.testModule.findUnique({
    where: { id: data.testModuleId },
    select: {
      id: true,
      testVersion: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!module) {
    const error = new Error("The requested test module was not found.");
    error.code = "TEST_MODULE_NOT_FOUND";
    throw error;
  }

  if (module.testVersion.status !== "DRAFT") {
    const error = new Error(
      "Parts can only be added to modules in draft test versions."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.testPart.create({
    data: {
      testModuleId: data.testModuleId,
      title: data.title,
      position: data.position,
      instructions: data.instructions,
      audioAssetKey: data.audioAssetKey,
    },
  });
}


async function getTestPartById(partId) {
  return prisma.testPart.findUnique({
    where: { id: partId },
    include: {
      testModule: {
        select: {
          id: true,
          section: true,
          testVersionId: true,
          testVersion: {
            select: {
              status: true,
              version: true,
            },
          },
        },
      },
      groups: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          instructions: true,
        },
      },
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          questionNumber: true,
          questionType: true,
          position: true,
          marks: true,
          questionGroupId: true,
        },
      },
    },
  });
}


async function updateTestPart(partId, data) {
  const part = await prisma.testPart.findUnique({
    where: { id: partId },
    select: {
      id: true,
      testModule: {
        select: {
          testVersion: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  if (!part) {
    const error = new Error("The requested test part was not found.");
    error.code = "TEST_PART_NOT_FOUND";
    throw error;
  }

  if (part.testModule.testVersion.status !== "DRAFT") {
    const error = new Error(
      "Only parts in draft test versions can be updated."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.testPart.update({
    where: { id: partId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.instructions !== undefined && {
        instructions: data.instructions,
      }),
      ...(data.audioAssetKey !== undefined && {
        audioAssetKey: data.audioAssetKey,
      }),
    },
  });
}


async function createQuestionGroup(data) {
  const part = await prisma.testPart.findUnique({
    where: { id: data.testPartId },
    select: {
      id: true,
      testModule: {
        select: {
          testVersion: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  if (!part) {
    const error = new Error("The requested test part was not found.");
    error.code = "TEST_PART_NOT_FOUND";
    throw error;
  }

  if (part.testModule.testVersion.status !== "DRAFT") {
    const error = new Error(
      "Question groups can only be added to draft test versions."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.questionGroup.create({
    data: {
      testPartId: data.testPartId,
      title: data.title,
      instructions: data.instructions,
      passage: data.passage,
      position: data.position,
    },
  });
}


async function getQuestionGroupById(groupId) {
  return prisma.questionGroup.findUnique({
    where: { id: groupId },
    include: {
      testPart: {
        select: {
          id: true,
          title: true,
          testModule: {
            select: {
              section: true,
              testVersion: {
                select: {
                  id: true,
                  version: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          questionNumber: true,
          questionType: true,
          position: true,
          marks: true,
        },
      },
    },
  });
}



async function updateQuestionGroup(groupId, data) {
  const group = await prisma.questionGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      testPart: {
        select: {
          testModule: {
            select: {
              testVersion: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!group) {
    const error = new Error("The requested question group was not found.");
    error.code = "QUESTION_GROUP_NOT_FOUND";
    throw error;
  }

  if (group.testPart.testModule.testVersion.status !== "DRAFT") {
    const error = new Error(
      "Only question groups in draft test versions can be updated."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.questionGroup.update({
    where: { id: groupId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.instructions !== undefined && {
        instructions: data.instructions,
      }),
      ...(data.passage !== undefined && { passage: data.passage }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });
}



async function createQuestion(data) {
  const part = await prisma.testPart.findUnique({
    where: { id: data.testPartId },
    select: {
      id: true,
      testModule: {
        select: {
          testVersion: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  if (!part) {
    const error = new Error("The requested test part was not found.");
    error.code = "TEST_PART_NOT_FOUND";
    throw error;
  }

  if (part.testModule.testVersion.status !== "DRAFT") {
    const error = new Error(
      "Questions can only be added to draft test versions."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  if (data.questionGroupId) {
    const group = await prisma.questionGroup.findUnique({
      where: { id: data.questionGroupId },
      select: { testPartId: true },
    });

    if (!group) {
      const error = new Error("The requested question group was not found.");
      error.code = "QUESTION_GROUP_NOT_FOUND";
      throw error;
    }

    if (group.testPartId !== data.testPartId) {
      const error = new Error(
        "The question group must belong to the same test part."
      );
      error.code = "QUESTION_GROUP_PART_MISMATCH";
      throw error;
    }
  }

  return prisma.question.create({
    data: {
      testPartId: data.testPartId,
      questionGroupId: data.questionGroupId ?? null,
      questionNumber: data.questionNumber,
      questionType: data.questionType,
      content: data.content,
      marks: data.marks ?? 1,
      position: data.position,
    },
  });
}



async function getQuestionById(questionId) {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      testPartId: true,
      questionGroupId: true,
      questionNumber: true,
      questionType: true,
      content: true,
      marks: true,
      position: true,
      createdAt: true,
      updatedAt: true,
      testPart: {
        select: {
          id: true,
          title: true,
          testModule: {
            select: {
              section: true,
              testVersion: {
                select: {
                  id: true,
                  version: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      questionGroup: {
        select: {
          id: true,
          title: true,
          position: true,
        },
      },
    },
  });
}



async function updateQuestion(questionId, data) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      testPartId: true,
      testPart: {
        select: {
          testModule: {
            select: {
              testVersion: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!question) {
    const error = new Error("The requested question was not found.");
    error.code = "QUESTION_NOT_FOUND";
    throw error;
  }

  if (question.testPart.testModule.testVersion.status !== "DRAFT") {
    const error = new Error(
      "Only questions in draft test versions can be updated."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  if (data.questionGroupId) {
    const group = await prisma.questionGroup.findUnique({
      where: { id: data.questionGroupId },
      select: { testPartId: true },
    });

    if (!group) {
      const error = new Error("The requested question group was not found.");
      error.code = "QUESTION_GROUP_NOT_FOUND";
      throw error;
    }

    if (group.testPartId !== question.testPartId) {
      const error = new Error(
        "The question group must belong to the same test part."
      );
      error.code = "QUESTION_GROUP_PART_MISMATCH";
      throw error;
    }
  }

  return prisma.question.update({
    where: { id: questionId },
    data: {
      ...(data.questionGroupId !== undefined && {
        questionGroupId: data.questionGroupId,
      }),
      ...(data.questionNumber !== undefined && {
        questionNumber: data.questionNumber,
      }),
      ...(data.questionType !== undefined && {
        questionType: data.questionType,
      }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.marks !== undefined && { marks: data.marks }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });
}


async function createAnswerKey(data) {
  const question = await prisma.question.findUnique({
    where: { id: data.questionId },
    select: {
      id: true,
      testPart: {
        select: {
          testModule: {
            select: {
              testVersion: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!question) {
    const error = new Error("The requested question was not found.");
    error.code = "QUESTION_NOT_FOUND";
    throw error;
  }

  const versionStatus =
    question.testPart.testModule.testVersion.status;

  if (versionStatus !== "DRAFT") {
    const error = new Error(
      "Answer keys can only be created for draft test versions."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.answerKey.create({
    data: {
      questionId: data.questionId,
      acceptedAnswers: data.acceptedAnswers,
      ...(data.explanation !== undefined && {
        explanation: data.explanation,
      }),
      ...(data.markingRules !== undefined && {
        markingRules: data.markingRules,
      }),
    },
  });
}


async function getAnswerKeyById(answerKeyId) {
  return prisma.answerKey.findUnique({
    where: { id: answerKeyId },
    include: {
      question: {
        select: {
          id: true,
          questionNumber: true,
          questionType: true,
          testPartId: true,
        },
      },
    },
  });
}




async function updateAnswerKey(answerKeyId, data) {
  const answerKey = await prisma.answerKey.findUnique({
    where: { id: answerKeyId },
    select: {
      id: true,
      question: {
        select: {
          testPart: {
            select: {
              testModule: {
                select: {
                  testVersion: {
                    select: {
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!answerKey) {
    const error = new Error("The requested answer key was not found.");
    error.code = "ANSWER_KEY_NOT_FOUND";
    throw error;
  }

  const status =
    answerKey.question.testPart.testModule.testVersion.status;

  if (status !== "DRAFT") {
    const error = new Error(
      "Only answer keys in draft test versions can be updated."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.answerKey.update({
    where: { id: answerKeyId },
    data: {
      ...(data.acceptedAnswers !== undefined && {
        acceptedAnswers: data.acceptedAnswers,
      }),
      ...(data.explanation !== undefined && {
        explanation: data.explanation,
      }),
      ...(data.markingRules !== undefined && {
        markingRules: data.markingRules,
      }),
    },
  });
}


async function createBandConversion(data) {
  const testVersion = await prisma.testVersion.findUnique({
    where: { id: data.testVersionId },
    select: { id: true, status: true },
  });

  if (!testVersion) {
    const error = new Error("The requested test version was not found.");
    error.code = "TEST_VERSION_NOT_FOUND";
    throw error;
  }

  if (testVersion.status !== "DRAFT") {
    const error = new Error(
      "Band conversions can only be added to draft test versions."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.bandConversionVersion.create({
    data: {
      testVersionId: data.testVersionId,
      section: data.section,
      version: data.version,
      conversionTable: data.conversionTable,
    },
  });
}



async function getBandConversionById(conversionId) {
  return prisma.bandConversionVersion.findUnique({
    where: { id: conversionId },
    include: {
      testVersion: {
        select: {
          id: true,
          version: true,
          status: true,
          test: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
      },
    },
  });
}



async function updateTestModule(moduleId, data) {
  const testModule = await prisma.testModule.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      testVersion: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!testModule) {
    const error = new Error("The requested test module was not found.");
    error.code = "TEST_MODULE_NOT_FOUND";
    throw error;
  }

  if (testModule.testVersion.status !== "DRAFT") {
    const error = new Error(
      "Only modules in draft test versions can be updated."
    );
    error.code = "TEST_VERSION_NOT_EDITABLE";
    throw error;
  }

  return prisma.testModule.update({
    where: { id: moduleId },
    data: {
      ...(data.position !== undefined && {
        position: data.position,
      }),
      ...(data.durationSeconds !== undefined && {
        durationSeconds: data.durationSeconds,
      }),
      ...(data.instructions !== undefined && {
        instructions: data.instructions,
      }),
    },
  });
}

async function bulkImportTest(data) {
  return prisma.$transaction(
    async (tx) => {
      const testVersion = await tx.testVersion.findUnique({
        where: { id: data.testVersionId },
        select: { id: true, status: true },
      });

      if (!testVersion) {
        const error = new Error("The requested test version was not found.");
        error.code = "TEST_VERSION_NOT_FOUND";
        throw error;
      }

      if (testVersion.status !== "DRAFT") {
        const error = new Error(
          "Content can only be imported into draft test versions."
        );
        error.code = "TEST_VERSION_NOT_EDITABLE";
        throw error;
      }

      let importedQuestions = 0;

      for (const moduleData of data.modules) {
        const testModule = await tx.testModule.create({
          data: {
            testVersionId: testVersion.id,
            section: moduleData.section,
            position: moduleData.position,
            durationSeconds: moduleData.durationSeconds,
            ...(moduleData.instructions != null && {
              instructions: moduleData.instructions,
            }),
          },
        });

        for (const partData of moduleData.parts) {
          const testPart = await tx.testPart.create({
            data: {
              testModuleId: testModule.id,
              title: partData.title,
              position: partData.position,
              ...(partData.instructions != null && {
                instructions: partData.instructions,
              }),
              ...(partData.audioAssetKey != null && {
                audioAssetKey: partData.audioAssetKey,
              }),
            },
          });

          for (const groupData of partData.groups) {
            const questionGroup = await tx.questionGroup.create({
              data: {
                testPartId: testPart.id,
                title: groupData.title ?? null,
                position: groupData.position,
                ...(groupData.instructions != null && {
                  instructions: groupData.instructions,
                }),
                ...(groupData.passage != null && {
                  passage: groupData.passage,
                }),
              },
            });

            for (const questionData of groupData.questions) {
              await tx.question.create({
                data: {
                  testPartId: testPart.id,
                  questionGroupId: questionGroup.id,
                  questionNumber: questionData.questionNumber,
                  questionType: questionData.questionType,
                  content: questionData.content,
                  marks: questionData.marks ?? 1,
                  position: questionData.position,
                  answerKey: {
                    create: {
                      acceptedAnswers:
                        questionData.answerKey.acceptedAnswers,
                      ...(questionData.answerKey.explanation != null && {
                        explanation: questionData.answerKey.explanation,
                      }),
                      ...(questionData.answerKey.markingRules != null && {
                        markingRules: questionData.answerKey.markingRules,
                      }),
                    },
                  },
                },
              });

              importedQuestions += 1;
            }
          }
        }
      }

      return {
        testVersionId: testVersion.id,
        importedModules: data.modules.length,
        importedQuestions,
      };
    },
    {
      maxWait: 5000,
      timeout: 20000,
    }
  );
}



async function validateTestVersion(versionId) {
  const version = await prisma.testVersion.findUnique({
    where: { id: versionId },
    include: {
      test: {
        select: {
          id: true,
          title: true,
          category: true,
          testNumber: true,
        },
      },
      modules: {
        include: {
          parts: {
            include: {
              groups: {
                include: {
                  questions: {
                    include: {
                      answerKey: true,
                    },
                  },
                },
              },
              questions: {
                include: {
                  answerKey: true,
                },
              },
            },
          },
        },
      },
      bandConversions: true,
    },
  });

  if (!version) {
    const error = new Error("The requested test version was not found.");
    error.code = "TEST_VERSION_NOT_FOUND";
    throw error;
  }

  const errors = [];
  const warnings = [];

  if (!["DRAFT", "IN_REVIEW"].includes(version.status)) {
    errors.push({
      code: "TEST_VERSION_NOT_VALIDATABLE",
      message: "Only draft or in-review versions can be validated.",
    });
  }

  const requiredSections = [
    "LISTENING",
    "READING",
    "WRITING",
    "SPEAKING",
  ];

  const moduleSections = version.modules.map(
    (module) => module.section
  );

  for (const section of requiredSections) {
    if (!moduleSections.includes(section)) {
      errors.push({
        code: "MISSING_SECTION",
        message: `The ${section} section is missing.`,
      });
    }
  }

  const objectivelyScoredTypes = new Set([
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
  ]);

  let questionCount = 0;

  for (const module of version.modules) {
    if (module.parts.length === 0) {
      errors.push({
        code: "MODULE_WITHOUT_PARTS",
        message: `${module.section} has no parts.`,
      });
    }

    if (
      !Number.isInteger(module.durationSeconds) ||
      module.durationSeconds <= 0
    ) {
      errors.push({
        code: "INVALID_MODULE_DURATION",
        message: `${module.section} has an invalid duration.`,
      });
    }

    if (
      module.section === "LISTENING" &&
      module.parts.some((part) => !part.audioAssetKey)
    ) {
      warnings.push({
        code: "MISSING_AUDIO_ASSET_KEY",
        message: "One or more Listening parts have no audio asset key.",
      });
    }

    for (const part of module.parts) {
      if (part.groups.length === 0 && part.questions.length === 0) {
        errors.push({
          code: "EMPTY_TEST_PART",
          message: `Part "${part.title}" has no questions or question groups.`,
        });
      }

      if (
        module.section === "READING" &&
        part.groups.some(
          (group) =>
            !group.passage ||
            Object.keys(group.passage).length === 0
        )
      ) {
        errors.push({
          code: "MISSING_READING_PASSAGE",
          message: `Part "${part.title}" has a group without passage content.`,
        });
      }

      const questions = [
        ...part.questions,
        ...part.groups.flatMap((group) => group.questions),
      ];

      for (const question of questions) {
        questionCount += 1;

        if (
          !question.content ||
          Object.keys(question.content).length === 0
        ) {
          errors.push({
            code: "EMPTY_QUESTION_CONTENT",
            message: `Question ${question.questionNumber} has empty content.`,
          });
        }

        if (
          objectivelyScoredTypes.has(question.questionType) &&
          !question.answerKey
        ) {
          errors.push({
            code: "MISSING_ANSWER_KEY",
            message: `Question ${question.questionNumber} requires an answer key.`,
          });
        }
      }
    }
  }

  if (questionCount === 0) {
    errors.push({
      code: "NO_QUESTIONS",
      message: "The test version contains no questions.",
    });
  }

  for (const section of ["LISTENING", "READING"]) {
    if (
      !version.bandConversions.some(
        (conversion) => conversion.section === section
      )
    ) {
      errors.push({
        code: "MISSING_BAND_CONVERSION",
        message: `No band conversion is configured for ${section}.`,
      });
    }
  }

  return {
    testVersionId: version.id,
    testTitle: version.test.title,
    testNumber: version.test.testNumber,
    status: version.status,
    valid: errors.length === 0,
    summary: {
      modules: version.modules.length,
      questions: questionCount,
      errors: errors.length,
      warnings: warnings.length,
    },
    errors,
    warnings,
  };
}


async function publishTestVersion(versionId) {
  return prisma.$transaction(
    async (tx) => {
      const version = await tx.testVersion.findUnique({
        where: { id: versionId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!version) {
        const error = new Error(
          "The requested test version was not found."
        );
        error.code = "TEST_VERSION_NOT_FOUND";
        throw error;
      }

      if (
        version.status !== "DRAFT" &&
        version.status !== "IN_REVIEW"
      ) {
        const error = new Error(
          "Only draft or in-review versions can be published."
        );
        error.code = "TEST_VERSION_NOT_EDITABLE";
        throw error;
      }

      const validation = await validateTestVersion(versionId, tx);

      if (!validation.valid) {
        const error = new Error(
          "The test version failed publication validation."
        );
        error.code = "TEST_VERSION_VALIDATION_FAILED";
        error.details = validation;
        throw error;
      }

      return tx.testVersion.update({
        where: { id: versionId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    },
    {
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 20000,
    }
  );
}




module.exports = {
  createBook,
  listBooks,
  getBookById,
  updateBook,
  createTest,
  listTests,
  getTestById,
  updateTest,
  archiveTest,
  createTestVersion,
  getTestVersionById,
  updateTestVersion,
  createTestModule,
  getTestModuleById,
  createTestPart,
  getTestPartById,
  updateTestPart,
  createQuestionGroup,
  getQuestionGroupById,
  updateQuestionGroup,
  createQuestion,
  getQuestionById,
  updateQuestion,
  createAnswerKey,
  getAnswerKeyById,
  updateAnswerKey,
  createBandConversion,
  getBandConversionById,
  updateTestModule,
  bulkImportTest,
  validateTestVersion,
  publishTestVersion,
};

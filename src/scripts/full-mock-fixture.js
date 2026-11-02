/**
 * Equilx IELTS - Full Mock Test Fixture
 *
 * Creates:
 * - TestVersion 2 (DRAFT)
 * - 4 IELTS modules
 * - 7 test parts
 * - 7 question groups
 * - 20 questions
 * - 10 objective answer keys
 * - 2 test-only band conversion tables
 *
 * Run from project root:
 * node prisma/seeds/full-mock-fixture.js
 *
 * IMPORTANT:
 * The band conversion values are artificial test values.
 * They are NOT official IELTS conversion tables.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TEST_ID = "9b263d18-9693-41fc-a129-7d9be7293d95";
const VERSION_NUMBER = 2;

const EXACT_MATCH_RULES = {
  type: "EXACT_MATCH",
  caseSensitive: false,
  trimWhitespace: true,
  marks: 1,
};

const conversionTable = (section) => ({
  type: "IELTS_RAW_TO_BAND",
  section,
  totalQuestions: 5,
  rawScoreToBand: [
    { min: 0, max: 0, band: 0 },
    { min: 1, max: 1, band: 4 },
    { min: 2, max: 2, band: 5 },
    { min: 3, max: 3, band: 6 },
    { min: 4, max: 4, band: 7 },
    { min: 5, max: 5, band: 9 },
  ],
});

const modules = [
  {
    section: "LISTENING",
    position: 1,
    durationSeconds: 1800,
    parts: [
      {
        title: "Listening Part 1",
        position: 1,
        audioAssetKey: null,
        instructions: {
          text: "Answer questions 1–5.",
        },
        group: {
          title: "Questions 1–5",
          position: 1,
          instructions: {
            text: "Listen to the conversation and answer the questions.",
          },
          passage: {
            type: "FIXTURE_TRANSCRIPT",
            text: "A caller books a room at Greenfield Guest House for two nights, arriving on 14 June. The room costs 80 pounds per night. Breakfast is included. The caller's surname is Taylor.",
          },
          questions: [
            {
              number: 1,
              type: "MULTIPLE_CHOICE",
              content: {
                text: "What is the name of the guest house?",
                options: [
                  "Greenfield Guest House",
                  "Riverside Hotel",
                  "Central House",
                  "Park View Inn",
                ],
              },
              answers: ["Greenfield Guest House"],
            },
            {
              number: 2,
              type: "SHORT_ANSWER",
              content: {
                text: "How many nights will the caller stay?",
              },
              answers: ["2", "two"],
            },
            {
              number: 3,
              type: "SHORT_ANSWER",
              content: {
                text: "On what date will the caller arrive?",
              },
              answers: ["14 June", "June 14"],
            },
            {
              number: 4,
              type: "MULTIPLE_CHOICE",
              content: {
                text: "What is the price per night?",
                options: [
                  "60 pounds",
                  "70 pounds",
                  "80 pounds",
                  "90 pounds",
                ],
              },
              answers: ["80 pounds"],
            },
            {
              number: 5,
              type: "SHORT_ANSWER",
              content: {
                text: "What is the caller's surname?",
              },
              answers: ["Taylor"],
            },
          ],
        },
      },
    ],
  },

  {
    section: "READING",
    position: 2,
    durationSeconds: 3600,
    parts: [
      {
        title: "Reading Part 1",
        position: 1,
        audioAssetKey: null,
        instructions: {
          text: "Read the passage and answer questions 6–10.",
        },
        group: {
          title: "Questions 6–10",
          position: 1,
          instructions: {
            text: "Use the passage to answer each question.",
          },
          passage: {
            type: "READING_PASSAGE",
            title: "Urban Community Gardens",
            text: "Community gardens have become increasingly common in cities. Residents share small plots of land to grow vegetables, herbs and flowers. These spaces provide fresh produce, encourage physical activity and create opportunities for neighbours to meet. Some local councils provide land, while volunteers organise maintenance. A successful garden usually needs access to water, suitable soil and a clear agreement about shared responsibilities. Although gardens rarely supply all the food a household needs, they can improve access to seasonal produce and strengthen local relationships.",
          },
          questions: [
            {
              number: 6,
              type: "MULTIPLE_CHOICE",
              content: {
                text: "What do residents commonly grow in community gardens?",
                options: [
                  "Only fruit trees",
                  "Vegetables, herbs and flowers",
                  "Commercial crops",
                  "Indoor plants only",
                ],
              },
              answers: ["Vegetables, herbs and flowers"],
            },
            {
              number: 7,
              type: "TRUE_FALSE_NOT_GIVEN",
              content: {
                text: "Community gardens can create opportunities for neighbours to meet.",
                options: ["TRUE", "FALSE", "NOT GIVEN"],
              },
              answers: ["TRUE"],
            },
            {
              number: 8,
              type: "TRUE_FALSE_NOT_GIVEN",
              content: {
                text: "Every community garden receives financial support from its local council.",
                options: ["TRUE", "FALSE", "NOT GIVEN"],
              },
              answers: ["NOT GIVEN"],
            },
            {
              number: 9,
              type: "MULTIPLE_CHOICE",
              content: {
                text: "Which resource is mentioned as necessary for a successful garden?",
                options: [
                  "A greenhouse",
                  "Access to water",
                  "A paid manager",
                  "Heavy machinery",
                ],
              },
              answers: ["Access to water"],
            },
            {
              number: 10,
              type: "SHORT_ANSWER",
              content: {
                text: "Do community gardens usually provide all the food a household needs? Answer YES or NO.",
              },
              answers: ["NO"],
            },
          ],
        },
      },
    ],
  },

  {
    section: "WRITING",
    position: 3,
    durationSeconds: 3600,
    parts: [
      {
        title: "Writing Task 1",
        position: 1,
        audioAssetKey: null,
        instructions: {
          text: "Write at least 150 words.",
        },
        group: {
          title: "Writing Task 1 Prompt",
          position: 1,
          instructions: {
            text: "Summarise the information and make comparisons where relevant.",
          },
          passage: null,
          questions: [
            {
              number: 11,
              type: "REPORT",
              content: {
                task: "The table below shows the percentage of commuters using four forms of transport in a city in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
                minimumWords: 150,
              },
              answers: null,
            },
          ],
        },
      },
      {
        title: "Writing Task 2",
        position: 2,
        audioAssetKey: null,
        instructions: {
          text: "Write at least 250 words.",
        },
        group: {
          title: "Writing Task 2 Prompt",
          position: 1,
          instructions: {
            text: "Give reasons for your answer and include relevant examples.",
          },
          passage: null,
          questions: [
            {
              number: 12,
              type: "ESSAY",
              content: {
                task: "Some people believe that public transport should be free in large cities. To what extent do you agree or disagree?",
                minimumWords: 250,
              },
              answers: null,
            },
          ],
        },
      },
    ],
  },

  {
    section: "SPEAKING",
    position: 4,
    durationSeconds: 900,
    parts: [
      {
        title: "Speaking Part 1",
        position: 1,
        audioAssetKey: null,
        instructions: {
          text: "Answer the questions about familiar topics.",
        },
        group: {
          title: "Part 1 - Introduction and Interview",
          position: 1,
          instructions: {
            text: "Give short, natural answers.",
          },
          passage: null,
          questions: [
            {
              number: 13,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "Do you work or are you a student?",
              },
            },
            {
              number: 14,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "What do you enjoy most about your hometown?",
              },
            },
            {
              number: 15,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "How often do you use public transport?",
              },
            },
          ],
        },
      },
      {
        title: "Speaking Part 2",
        position: 2,
        audioAssetKey: null,
        instructions: {
          text: "Prepare for one minute, then speak for up to two minutes.",
        },
        group: {
          title: "Part 2 - Long Turn",
          position: 1,
          instructions: {
            text: "Use the bullet points to organise your answer.",
          },
          passage: null,
          questions: [
            {
              number: 16,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "Describe a useful skill you learned. Say what the skill is, when you learned it, how you learned it, and explain why it is useful to you.",
              },
            },
            {
              number: 17,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "Describe a place in your city that you like visiting. Explain where it is, what you do there, and why you enjoy going there.",
              },
            },
          ],
        },
      },
      {
        title: "Speaking Part 3",
        position: 3,
        audioAssetKey: null,
        instructions: {
          text: "Discuss the topics in greater depth and support your opinions.",
        },
        group: {
          title: "Part 3 - Discussion",
          position: 1,
          instructions: {
            text: "Develop your answers with reasons and examples.",
          },
          passage: null,
          questions: [
            {
              number: 18,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "Why do some people prefer learning practical skills outside formal education?",
              },
            },
            {
              number: 19,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "How can cities encourage people to use public transport?",
              },
            },
            {
              number: 20,
              type: "SPEAKING_RESPONSE",
              content: {
                prompt: "Do you think technology will change the way people learn in the future? Why?",
              },
            },
          ],
        },
      },
    ],
  },
];

async function createQuestion(tx, partId, groupId, questionData) {
  const question = await tx.question.create({
    data: {
      testPartId: partId,
      questionGroupId: groupId,
      questionNumber: questionData.number,
      questionType: questionData.type,
      content: questionData.content,
      marks: questionData.answers ? 1 : 0,
      position: questionData.number,
    },
  });

  if (questionData.answers) {
    await tx.answerKey.create({
      data: {
        questionId: question.id,
        acceptedAnswers: questionData.answers,
        explanation: null,
        markingRules: EXACT_MATCH_RULES,
      },
    });
  }
}

async function main() {
  const test = await prisma.test.findUnique({
    where: { id: TEST_ID },
    select: { id: true, title: true },
  });

  if (!test) {
    throw new Error(`Test not found: ${TEST_ID}`);
  }

  const existingVersion = await prisma.testVersion.findUnique({
    where: {
      testId_version: {
        testId: TEST_ID,
        version: VERSION_NUMBER,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingVersion) {
    throw new Error(
      `Version ${VERSION_NUMBER} already exists. ` +
      `ID: ${existingVersion.id}, status: ${existingVersion.status}. ` +
      "Stopping to prevent duplicate records."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const version = await tx.testVersion.create({
      data: {
        testId: TEST_ID,
        version: VERSION_NUMBER,
        status: "DRAFT",
        publishedAt: null,
        contentChecksum: null,
      },
    });

    let questionCount = 0;
    let answerKeyCount = 0;
    let partCount = 0;

    for (const moduleData of modules) {
      const module = await tx.testModule.create({
        data: {
          testVersionId: version.id,
          section: moduleData.section,
          position: moduleData.position,
          durationSeconds: moduleData.durationSeconds,
        },
      });

      for (const partData of moduleData.parts) {
        const part = await tx.testPart.create({
          data: {
            testModuleId: module.id,
            title: partData.title,
            position: partData.position,
            instructions: partData.instructions,
            audioAssetKey: partData.audioAssetKey,
          },
        });

        partCount += 1;

        const group = await tx.questionGroup.create({
          data: {
            testPartId: part.id,
            title: partData.group.title,
            position: partData.group.position,
            instructions: partData.group.instructions,
            passage: partData.group.passage,
          },
        });

        for (const questionData of partData.group.questions) {
          await createQuestion(tx, part.id, group.id, questionData);

          questionCount += 1;

          if (questionData.answers) {
            answerKeyCount += 1;
          }
        }
      }
    }

    for (const section of ["LISTENING", "READING"]) {
      await tx.bandConversionVersion.create({
        data: {
          testVersionId: version.id,
          section,
          version: 1,
          conversionTable: conversionTable(section),
        },
      });
    }

    return {
      testVersionId: version.id,
      testVersion: version.version,
      status: version.status,
      moduleCount: modules.length,
      partCount,
      questionCount,
      answerKeyCount,
      bandConversionCount: 2,
    };
  });

  console.log("\nFull Mock fixture created successfully:\n");
  console.log(JSON.stringify(result, null, 2));

  console.log(
    "\nWARNING: Band conversion values are synthetic test values, not official IELTS tables."
  );
}

main()
  .catch((error) => {
    console.error("\nFixture creation failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
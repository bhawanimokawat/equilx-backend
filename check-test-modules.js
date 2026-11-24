const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const modules = await prisma.testModule.findMany({
    include: {
      testVersion: {
        include: {
          test: {
            include: { book: true },
          },
        },
      },
      parts: true,
    },
    orderBy: [
      { testVersionId: "asc" },
      { position: "asc" },
    ],
  });

  console.log(
    JSON.stringify(
      modules.map((m) => ({
        id: m.id,
        section: m.section,
        position: m.position,
        testVersionId: m.testVersionId,
        testTitle: m.testVersion.test.title,
        bookTitle: m.testVersion.test.book.title,
        version: m.testVersion.version,
        status: m.testVersion.status,
        partsCount: m.parts.length,
      })),
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


require("dotenv").config();

const bcrypt = require("bcryptjs");
const {
  prisma,
  disconnectDatabase,
} = require("../config/database");

async function seedInstituteAdmin() {
  const email = process.env.INSTITUTE_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INSTITUTE_ADMIN_INITIAL_PASSWORD;
  const instituteId = process.env.INSTITUTE_ADMIN_INSTITUTE_ID;

  if (!email || !password || !instituteId) {
    throw new Error(
      "INSTITUTE_ADMIN_EMAIL, INSTITUTE_ADMIN_INITIAL_PASSWORD and INSTITUTE_ADMIN_INSTITUTE_ID are required."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "The initial Institute Admin password must be at least 12 characters."
    );
  }

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!institute) {
    throw new Error("Institute not found. No changes made.");
  }

  if (institute.status !== "ACTIVE") {
    throw new Error("Institute is not active. No changes made.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error(
      "This email already belongs to an account. No changes made."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const admin = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        platformRole: "USER",
        isActive: true,
        emailVerifiedAt: now,
      },
      select: {
        id: true,
        email: true,
        platformRole: true,
      },
    });

    const membership = await tx.instituteMembership.create({
      data: {
        instituteId: institute.id,
        userId: user.id,
        role: "INSTITUTE_ADMIN",
        status: "ACTIVE",
        joinedAt: now,
      },
      select: {
        id: true,
        instituteId: true,
        userId: true,
        role: true,
        status: true,
        joinedAt: true,
      },
    });

    return { user, membership };
  });

  console.log("Institute Admin created successfully:");
  console.log({
    institute: institute.name,
    ...admin,
  });
}

seedInstituteAdmin()
  .catch((error) => {
    console.error("Institute Admin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });

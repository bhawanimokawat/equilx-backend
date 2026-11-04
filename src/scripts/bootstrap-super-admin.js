require("dotenv").config();

const bcrypt = require("bcryptjs");
const {  prisma,  disconnectDatabase,} = require("../config/database");

async function bootstrapSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL and SUPER_ADMIN_INITIAL_PASSWORD are required."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "The initial Super Admin password must be at least 12 characters."
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { platformRole: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });

  if (existingAdmin) {
    throw new Error(
      `A Super Admin already exists (${existingAdmin.email}). No changes made.`
    );
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

 const admin = await prisma.user.create({
  data: {
    email,
    passwordHash,
    platformRole: "SUPER_ADMIN",
    isActive: true,
    emailVerifiedAt: new Date(),
  },
  select: {
    id: true,
    email: true,
    platformRole: true,
  },
});

  console.log("Super Admin created successfully:", admin);
}

bootstrapSuperAdmin()
  .catch((error) => {
    console.error("Super Admin bootstrap failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });

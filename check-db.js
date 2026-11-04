const { prisma: db } = require("./src/config/database");

console.log("Database exports:", Object.keys(db));
console.log("User model available:", typeof db.user);

db.user
  .findUnique({
    where: { email: "test@example.com" },
    select: { id: true },
  })
  .then((result) => {
    console.log("Database query succeeded:", Boolean(result));
  })
  .catch((error) => {
    console.error("DATABASE ERROR:", error.code || error.name);
    console.error(error.message);
  });


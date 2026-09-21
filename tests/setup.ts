// Point Prisma at the test database before anything imports lib/db.
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required (run tests via ./dx npm test)");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

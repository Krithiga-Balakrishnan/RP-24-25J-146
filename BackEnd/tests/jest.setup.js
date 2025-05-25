const db = require('./setup');

// connect once before all tests
beforeAll(async () => {
  await db.connect();
});

// clear data after each test
afterEach(async () => {
  await db.clearDatabase();
});

// close db when all tests complete
afterAll(async () => {
  await db.closeDatabase();
});

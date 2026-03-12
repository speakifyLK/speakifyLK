import { config } from "dotenv";
config();

import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  // Check if the ai_quiz tables exist
  const result = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'ai_quiz%'
  `);
  console.log("AI Quiz tables:", result.rows);

  if (result.rows.length === 0) {
    console.log("\n⚠️  AI Quiz tables do NOT exist in the database!");
    console.log("You need to run: npx drizzle-kit push");
  } else {
    console.log("\n✅ Tables exist. Checking enums...");
    const enumResult = await client.query(`
      SELECT typname, enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE typname IN ('quiz_difficulty', 'quiz_question_type')
      ORDER BY typname, enumsortorder
    `);
    console.log("Enums:", enumResult.rows);
  }
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  await client.end();
}

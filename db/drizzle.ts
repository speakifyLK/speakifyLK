import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Fallback prevents build-time crash when DATABASE_URL is empty/unset.
// No actual DB connection is made during `next build`.
// Uses || (not ??) so an empty string from CI secrets also falls back.
const sql = neon(
  process.env.DATABASE_URL || "postgresql://localhost/dummy"
);
const db = drizzle(sql, { schema });

export default db;

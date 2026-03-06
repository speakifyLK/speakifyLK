import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

// Lazily initialize the db connection so neon() is only called on the first
// real request, not during `next build` page data collection.
let _db: DB | null = null;

function getDb(): DB {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

const db = new Proxy({} as DB, {
  get(_target, prop) {
    return getDb()[prop as keyof DB];
  },
});

export default db;

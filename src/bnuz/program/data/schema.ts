import type { Schema } from '../../../core/ports';

export const programSchema: Schema = {
  tables: [
    `CREATE TABLE IF NOT EXISTS program_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester TEXT NOT NULL,
      course_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      credits REAL NOT NULL,
      category TEXT NOT NULL,
      assessment TEXT NOT NULL,
      hours REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS program_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module TEXT NOT NULL,
      course_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      credits REAL NOT NULL,
      hours REAL NOT NULL,
      term TEXT NOT NULL,
      score TEXT,
      selected INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS program_sync (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_synced_at TEXT NOT NULL
    )`,
  ],
};

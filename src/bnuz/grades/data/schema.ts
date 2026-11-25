import type { Schema } from '../../../core/ports';

export const gradesSchema: Schema = {
  tables: [
    `CREATE TABLE IF NOT EXISTS grades_records (
      semester TEXT NOT NULL,
      course_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      credits REAL NOT NULL,
      earned_credits REAL,
      category TEXT NOT NULL,
      nature TEXT NOT NULL,
      assessment TEXT NOT NULL,
      status TEXT NOT NULL,
      form TEXT NOT NULL,
      score TEXT NOT NULL,
      grade_point REAL,
      minor INTEGER NOT NULL,
      note TEXT,
      components TEXT,
      PRIMARY KEY (semester, course_code, status)
    )`,
    `CREATE TABLE IF NOT EXISTS grades_sync (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_synced_at TEXT NOT NULL,
      summary TEXT
    )`,
  ],
};

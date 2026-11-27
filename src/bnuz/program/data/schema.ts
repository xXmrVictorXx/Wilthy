import type { Schema } from '../../../core/ports';

const requirementTables = [
  `CREATE TABLE IF NOT EXISTS program_requirements (
    category TEXT PRIMARY KEY,
    credits REAL NOT NULL,
    note TEXT,
    filled_by TEXT NOT NULL CHECK (filled_by IN ('user', 'agent'))
  )`,
  `CREATE TABLE IF NOT EXISTS program_total (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    credits REAL NOT NULL,
    filled_by TEXT NOT NULL CHECK (filled_by IN ('user', 'agent'))
  )`,
];

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
    ...requirementTables,
  ],
  migrations: {
    // 开发期的旧结构没有发布过：直接换成按类别填写、记下由谁填写的新表。
    '20261128-credit-requirements': (db) => {
      db.exec('DROP TABLE IF EXISTS program_requirements');
      db.exec('DROP TABLE IF EXISTS program_requirements_source');
      for (const table of requirementTables) db.exec(table);
    },
  },
};

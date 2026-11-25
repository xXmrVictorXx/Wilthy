// 已经装过的库不会再执行 tables，新加的表必须靠迁移补上。
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { timetableSchema } from '../schema';

it('已有课表数据的库经迁移补上 timetable_profile', () => {
  const db = new Database(':memory:');
  for (const statement of timetableSchema.tables)
    if (!statement.includes('timetable_profile')) db.exec(statement);
  for (const run of Object.values(timetableSchema.migrations ?? {})) run(db);
  expect(
    db.prepare("SELECT name FROM sqlite_master WHERE name = 'timetable_profile'").get(),
  ).toBeTruthy();
});

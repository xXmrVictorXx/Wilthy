import Database from 'better-sqlite3';
import { beforeEach, expect, it, vi } from 'vitest';
import { provideTestHostPorts } from '../../../../core/test/host-mock';
import { gradesSchema } from '../../data/schema';

vi.mock('../../../campus', () => ({
  CampusAuthError: class CampusAuthError extends Error {},
  flushCampusSession: vi.fn(),
  jwxtRequest: vi.fn(),
  jwxtToken: vi.fn(async () => 'token'),
}));

const { jwxtRequest } = await import('../../../campus');
const { syncGrades, getGradesState } = await import('../api');

beforeEach(() => {
  vi.clearAllMocks();
  const db = new Database(':memory:');
  for (const table of gradesSchema.tables) db.exec(table);
  provideTestHostPorts({ database: () => db });
});

it('还没有任何成绩的新生可以同步，不去请求原始成绩', async () => {
  vi.mocked(jwxtRequest).mockResolvedValueOnce(
    '<table><tr><td>学年学期</td><td>课程/环节</td></tr></table><div>没有检索到记录!</div>',
  );
  await expect(syncGrades()).resolves.toEqual({ ok: true });
  expect(jwxtRequest).toHaveBeenCalledTimes(1);
  expect(getGradesState().lastSyncedAt).not.toBeNull();
});

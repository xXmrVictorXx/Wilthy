import { describe, expect, it, vi } from 'vitest';
import { syncTimetable } from '../api';
import { CampusAuthError, jwxtRequest } from '../../../campus';
import { provideTestHostPorts } from '../../../../core/test/host-mock';

vi.mock('electron', () => ({
  BrowserWindow: {},
  ipcMain: {},
  session: {},
  net: { request: vi.fn() },
}));
vi.mock('../../../campus', () => ({
  CampusAuthError: class CampusAuthError extends Error {},
  jwxtRequest: vi.fn(),
  flushCampusSession: vi.fn(),
  openJwxtLoginWindow: vi.fn(),
  toJwxtTerm: () => ({ xn: '2026', xn1: '2027', xq: '0' }),
}));

describe('syncTimetable', () => {
  it('课表页面无法识别时保留原有课表', async () => {
    const database = vi.fn();
    provideTestHostPorts({ database });
    vi.mocked(jwxtRequest).mockResolvedValue('<html><body>系统繁忙</body></html>');

    await expect(syncTimetable('2026-2027-1')).resolves.toMatchObject({
      ok: false,
      error: '课表返回了无法识别的页面',
    });
    expect(database).not.toHaveBeenCalled();
  });

  it('登录失效时提示重新登录', async () => {
    provideTestHostPorts({ database: vi.fn() });
    vi.mocked(jwxtRequest).mockRejectedValue(new CampusAuthError('数字京师·珠海登录已失效'));

    await expect(syncTimetable('2026-2027-1')).resolves.toMatchObject({
      ok: false,
      reason: 'auth',
    });
  });
});

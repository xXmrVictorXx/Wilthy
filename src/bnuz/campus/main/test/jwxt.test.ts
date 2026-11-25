// 教务系统会话过期时返回 200 加 405 错误页，或者跳回 CAS 登录页；二者都必须识别为登录失效。
import { describe, expect, it, vi } from 'vitest';

vi.mock('../session', () => ({
  CampusAuthError: class extends Error {},
  campusRequest: vi.fn(),
  flushCampusSession: vi.fn(),
  getCampusSession: vi.fn(),
  hiddenCampusLogin: vi.fn(),
  openCampusLoginWindow: vi.fn(),
}));

const { isJwxtLoginPage, toJwxtTerm, fromJwxtTerm } = await import('../jwxt');

describe('isJwxtLoginPage', () => {
  it('把 405 错误页识别为登录失效', () => {
    expect(
      isJwxtLoginPage(
        '<html><head><title>错误:无效访问请求</title></head><body>非常抱歉，当前访问为受限制或者无效的页面访问请求</body></html>',
      ),
    ).toBe(true);
  });

  it('把 CAS 登录页识别为登录失效', () => {
    expect(
      isJwxtLoginPage(
        '<form id="fm1" action="https://cas.bnuzh.edu.cn/cas/login?service=x"><title>数字京师·珠海</title></form>',
      ),
    ).toBe(true);
  });

  it('普通数据页不是登录页', () => {
    expect(
      isJwxtLoginPage('<table><tr><td>[GEN09007]形势与政策7</td><td>李老师</td></tr></table>'),
    ).toBe(false);
  });
});

describe('学期换算', () => {
  it('内部学期换成教务参数', () => {
    expect(toJwxtTerm('2026-2027-1')).toEqual({ xn: '2026', xn1: '2027', xq: '0' });
    expect(toJwxtTerm('2025-2026-2')).toEqual({ xn: '2025', xn1: '2026', xq: '1' });
    expect(toJwxtTerm('2025-2026-3')).toEqual({ xn: '2025', xn1: '2026', xq: '2' });
  });

  it('教务参数换回内部学期', () => {
    expect(fromJwxtTerm('2026', '0')).toBe('2026-2027-1');
    expect(fromJwxtTerm('2025', '1')).toBe('2025-2026-2');
  });
});

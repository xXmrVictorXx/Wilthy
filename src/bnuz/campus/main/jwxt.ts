// 青果教务系统：经 CAS 单点登录取得会话；请求必须带同源 Referer，过期时先静默续登一次。
import type { WebContents } from 'electron';
import { z } from 'zod';
import {
  CampusAuthError,
  campusRequest,
  flushCampusSession,
  getCampusSession,
  hiddenCampusLogin,
  openCampusLoginWindow,
} from './session';

export const JWXT_ORIGIN = 'https://jwxt.bnuzh.edu.cn';
export const CAS_LOGIN_URL =
  'https://cas.bnuzh.edu.cn/cas/login?service=https%3A%2F%2Fjwxt.bnuzh.edu.cn%2Fcaslogin';
const LOGIN_ERROR = '数字京师·珠海登录已失效，请重新登录';

export function isJwxtLoginPage(html: string): boolean {
  return html.includes('无效访问请求') || html.includes('cas.bnuzh.edu.cn/cas/login');
}

export function toJwxtTerm(semester: string): { xn: string; xn1: string; xq: string } {
  const match = /^(\d{4})-(\d{4})-([123])$/.exec(semester);
  if (!match) throw new Error('学期格式无效');
  return { xn: match[1]!, xn1: match[2]!, xq: String(Number(match[3]) - 1) };
}

export function fromJwxtTerm(xn: string, xq: string): string {
  return `${xn}-${Number(xn) + 1}-${Number(xq) + 1}`;
}

interface JwxtRequestInit {
  readonly method?: 'GET' | 'POST';
  readonly form?: Record<string, string>;
}

async function send(path: string, init: JwxtRequestInit = {}): Promise<string> {
  const body = init.form ? new URLSearchParams(init.form).toString() : undefined;
  const text = await campusRequest(await getCampusSession(), `${JWXT_ORIGIN}${path}`, {
    service: '教务系统',
    loginError: LOGIN_ERROR,
    method: init.method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      Referer: `${JWXT_ORIGIN}/frame/homes.html`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }),
    },
    body,
  });
  if (isJwxtLoginPage(text)) throw new CampusAuthError(LOGIN_ERROR);
  return text;
}

export async function jwxtRequest(path: string, init?: JwxtRequestInit): Promise<string> {
  try {
    return await send(path, init);
  } catch (error) {
    if (!(error instanceof CampusAuthError)) throw error;
    try {
      await hiddenCampusLogin(CAS_LOGIN_URL, async () => {
        await send('/jw/common/showYearTerm.action', { method: 'POST' });
      });
    } catch {
      throw new CampusAuthError(LOGIN_ERROR);
    }
    return send(path, init);
  }
}

/** 部分报表按页面文件名（不是菜单码）发放口令，缺口令时只返回「没有检索到记录」。 */
export async function jwxtToken(page: string): Promise<string> {
  const text = await jwxtRequest('/frame/menus/js/SetTokenkey.jsp', { form: { menucode: page } });
  return text.replace(/\s+/g, '');
}

const yearTermSchema = z
  .object({
    xn: z.string().regex(/^\d{4}$/),
    xqM: z.string().regex(/^[012]$/),
    userCode: z.string().min(1),
  })
  .passthrough();

export async function currentTerm(): Promise<{ semester: string; studentId: string }> {
  const text = await jwxtRequest('/jw/common/showYearTerm.action', { method: 'POST' });
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('教务系统没有返回当前学期，请重新登录后再试');
  }
  const parsed = yearTermSchema.safeParse(payload);
  if (!parsed.success) throw new Error('教务系统返回了无法识别的学期');
  return {
    semester: fromJwxtTerm(parsed.data.xn, parsed.data.xqM),
    studentId: parsed.data.userCode,
  };
}

export function openJwxtLoginWindow(sender: WebContents) {
  return openCampusLoginWindow({
    sender,
    title: '登录数字京师·珠海',
    url: CAS_LOGIN_URL,
    reached: (url) => url.startsWith(`${JWXT_ORIGIN}/frame/`),
    probe: async () => {
      await currentTerm();
      await flushCampusSession();
    },
  });
}

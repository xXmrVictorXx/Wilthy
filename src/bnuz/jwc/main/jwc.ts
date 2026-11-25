import { load } from 'cheerio';
import { hostPorts } from '../../../core/ports';
import {
  insertNotificationIfAbsent,
  saveNotificationRefresh,
  storedNotice,
  systemNotifyItem,
  type NoticeSource,
} from '../../../modules/notifications';
import type { JwcNotice } from '../contract';

const origin = 'https://jwb.bnuzh.edu.cn';
const listUrl = `${origin}/tzgg/index.htm`;
const syncKey = 'jwc-sync';
const accountKey = 'students';
let nextCheckAt = 0;
const notices = new Map<string, JwcNotice>();

interface JwcListItem {
  id: string;
  source: 'jwc';
  title: string;
  body: string;
  createdAt: string;
  href: { kind: 'jwc'; url: string };
}

interface JwcSync {
  seen: string[];
  etag: string | null;
  modified: string | null;
  checkedAt: number;
}

export function parseJwcList(html: string, pageUrl: string) {
  const $ = load(html);
  const items: JwcListItem[] = [];
  $('li.line').each((_, element) => {
    const row = $(element);
    const link = row.children('a[href]').first();
    const url = new URL(link.attr('href')!, pageUrl);
    const articleId = url.pathname.match(/\/([0-9a-f]{32})\.htm$/)?.[1];
    const title = link.attr('title')?.replace(/\s+/g, ' ').trim();
    const date = row.children('span').last().text().trim();
    if (!articleId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new Error('教务部通知列表内容不完整');
    items.push({
      id: `jwc:${articleId}`,
      source: 'jwc',
      title,
      body: link.text().match(/【([^】]+)】/)?.[1] ?? '',
      createdAt: new Date(`${date}T00:00:00+08:00`).toISOString(),
      href: { kind: 'jwc', url: url.href },
    });
  });
  if (!items.length) throw new Error('未能读取教务部通知列表');
  const next = $('a')
    .filter((_, element) => $(element).text().trim() === '下一页')
    .attr('href');
  return { items, next: next ? new URL(next, pageUrl).href : null };
}

export async function refreshJwc(force = false): Promise<void> {
  const db = hostPorts().database();
  const saved = db.prepare('SELECT value FROM workspace_settings WHERE key = ?').get(syncKey) as
    { value: string } | undefined;
  const previous: JwcSync | null = saved ? JSON.parse(saved.value) : null;
  const initialSync = !previous;
  if (
    !force &&
    !initialSync &&
    Date.now() < Math.max(nextCheckAt, (previous?.checkedAt ?? 0) + 20 * 60_000)
  )
    return;
  nextCheckAt = Date.now() + 20 * 60_000;
  try {
    const headers: Record<string, string> = {};
    if (previous?.etag) headers['If-None-Match'] = previous.etag;
    if (previous?.modified) headers['If-Modified-Since'] = previous.modified;
    const response = await fetch(listUrl, { headers, signal: AbortSignal.timeout(20_000) });
    const sync: JwcSync = previous ?? {
      seen: [],
      etag: null,
      modified: null,
      checkedAt: 0,
    };
    const added: JwcListItem[] = [];
    if (response.status !== 304) {
      if (!response.ok) throw new Error(`教务部请求失败（${response.status}）`);
      let page = parseJwcList(await response.text(), listUrl);
      const candidates = [...page.items];
      let cutoff: Date | null = null;
      if (initialSync) {
        const shanghaiOffset = 8 * 60 * 60_000;
        cutoff = new Date(Date.now() + shanghaiOffset);
        cutoff.setUTCMonth(cutoff.getUTCMonth() - 2);
        cutoff.setUTCHours(0, 0, 0, 0);
        cutoff.setTime(cutoff.getTime() - shanghaiOffset);
        while (
          page.next &&
          page.items.every((item) => Date.parse(item.createdAt) >= cutoff!.getTime())
        ) {
          const pageUrl = page.next;
          if (new URL(pageUrl).origin !== origin) throw new Error('教务部分页地址无效');
          const older = await fetch(pageUrl, { signal: AbortSignal.timeout(20_000) });
          if (!older.ok) throw new Error(`教务部历史通知请求失败（${older.status}）`);
          page = parseJwcList(await older.text(), pageUrl);
          candidates.push(...page.items);
        }
      }
      const seen = new Set(sync.seen);
      for (const item of candidates) {
        if (!seen.has(item.id) && (!cutoff || Date.parse(item.createdAt) >= cutoff.getTime()))
          added.push(item);
        seen.add(item.id);
      }
      sync.seen = [...seen];
      sync.etag = response.headers.get('etag');
      sync.modified = response.headers.get('last-modified');
    }
    sync.checkedAt = Date.now();
    db.transaction(() => {
      for (const item of added)
        insertNotificationIfAbsent(
          'jwc',
          accountKey,
          item.id,
          item.title,
          item.body,
          item.createdAt,
          item.href,
        );
      db.prepare('INSERT OR REPLACE INTO workspace_settings (key, value) VALUES (?, ?)').run(
        syncKey,
        JSON.stringify(sync),
      );
      saveNotificationRefresh('jwc', accountKey, null);
    })();
    if (!initialSync) for (const item of added) systemNotifyItem(item);
  } catch (error) {
    saveNotificationRefresh(
      'jwc',
      accountKey,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getJwcNotice(id: string): Promise<JwcNotice> {
  const cached = notices.get(id);
  if (cached) return cached;
  const row = storedNotice('jwc', id);
  if (!row) throw new Error('通知不存在');
  const { url } = row.href as { url: string };
  if (new URL(url).origin !== origin) throw new Error('此通知发布在外部网站，请查看原文');
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`教务部正文请求失败（${response.status}）`);
  const $ = load(await response.text());
  const content = $('.contenttxt');
  if (!content.length) throw new Error('未能读取通知正文，请查看原文');
  const attachments: JwcNotice['attachments'] = [];
  content.find('a[href]').each((_, element) => {
    const link = $(element);
    const target = new URL(link.attr('href')!, url);
    if (target.origin !== origin || !/\.(pdf|docx?|xlsx?|pptx?|zip|rar)$/i.test(target.pathname))
      return;
    const fileId = target.pathname.split('/').at(-1)!;
    if (attachments.some((attachment) => attachment.id === fileId)) return;
    attachments.push({ id: fileId, name: link.text().trim() || '附件', url: target.href });
  });
  const notice = {
    id,
    title: row.title,
    publishedAt: row.createdAt,
    url,
    html: content.html()!,
    attachments,
  };
  notices.set(id, notice);
  return notice;
}

export const jwcNoticeSource: NoticeSource = {
  id: 'jwc',
  account: () => accountKey,
  refresh: (_account, force) => refreshJwc(force),
  // 教务部网站的通知在应用内阅读，转载到外部网站的交给浏览器。
  link: ({ url }, id) =>
    typeof url === 'string'
      ? { target: new URL(url).origin === origin ? { page: 'jwc', noticeId: id } : { url } }
      : null,
};

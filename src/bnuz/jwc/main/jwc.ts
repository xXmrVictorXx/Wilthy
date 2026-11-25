import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';
import { hostPorts } from '../../../core/ports';
import type { DocumentContent } from '../../../core/protocol/workbench';
import { previewFileResponse, type WorkspaceSource } from '../../../modules/workspace';
import {
  insertNotificationIfAbsent,
  saveNotificationRefresh,
  storedNotice,
  systemNotifyItem,
  type NoticeSource,
} from '../../../modules/notifications';
import { JWC_FILE_PREFIX, JWC_NOTICE_PREFIX, type JwcNotice } from '../contract';

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
    // 部分通知转到信息门户（one.bnuzh.edu.cn），没有文章 ID，改用链接派生的稳定 ID。
    const articleId =
      url.origin === origin
        ? url.pathname.match(/\/([0-9a-f]{32})\.htm$/)?.[1]
        : `url-${createHash('sha256').update(url.href).digest('hex').slice(0, 32)}`;
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
  const documents: JwcNotice['documents'] = [];
  content.find('iframe[data-src]').each((_, element) => {
    const sourceId = jwcFileSource(new URL($(element).attr('data-src')!, url), `${row.title}.pdf`);
    if (sourceId) documents.push({ name: row.title, sourceId });
  });
  content.find('iframe').remove();
  const attachments: JwcNotice['attachments'] = [];
  $('.contenttxt a[href], .post-attatch a[href]').each((_, element) => {
    const link = $(element);
    const target = new URL(link.attr('href')!, url);
    if (target.origin !== origin || !/\.(pdf|docx?|xlsx?|pptx?|zip|rar)$/i.test(target.pathname))
      return;
    const fileId = target.pathname.split('/').at(-1)!;
    if (attachments.some((attachment) => attachment.id === fileId)) return;
    const name = link.text().trim() || '附件';
    attachments.push({ id: fileId, name, url: target.href, sourceId: jwcFileSource(target, name) });
  });
  const notice = {
    id,
    title: row.title,
    publishedAt: row.createdAt,
    url,
    html: content.html()!,
    documents,
    attachments,
  };
  notices.set(id, notice);
  return notice;
}

/**
 * 教务部网站上的 PDF 对应的资料 ID：路径里重复的斜杠统一折叠，# 后是显示用的文件名。
 * 同一份文件可以有不同名字（正文与附件），缓存只按路径区分。
 */
function jwcFileSource(target: URL, name: string): string | null {
  const path = target.pathname.replace(/\/{2,}/g, '/');
  return target.origin === origin && /^\/docs\/[\w/-]+\.pdf$/i.test(path)
    ? `${JWC_FILE_PREFIX}${path}#${encodeURIComponent(name)}`
    : null;
}

function jwcFilePath(sourceId: string): string {
  const match = /^jwc-file:(\/docs\/[\w/-]+\.pdf)(#.*)?$/i.exec(sourceId);
  if (!match) throw new Error('教务部文件地址无效');
  return match[1]!;
}

function jwcFileName(sourceId: string): string {
  const fragment = sourceId.split('#')[1];
  return fragment ? decodeURIComponent(fragment) : sourceId.split('/').at(-1)!;
}

/** PDF 阅读器按需分段读取，文件先缓存到本机，再经 wilthy-resource://jwc/ 提供。 */
async function cachedJwcFile(sourceId: string): Promise<string> {
  const filePath = jwcFilePath(sourceId);
  const directory = join(hostPorts().paths.userData(), 'jwc-files');
  const path = join(
    directory,
    `${createHash('sha256').update(filePath).digest('hex').slice(0, 32)}.pdf`,
  );
  if (existsSync(path)) return path;
  const response = await fetch(`${origin}${filePath}`, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`教务部文件请求失败（${response.status}）`);
  await mkdir(directory, { recursive: true });
  await writeFile(`${path}.tmp`, new Uint8Array(await response.arrayBuffer()));
  await rename(`${path}.tmp`, path);
  return path;
}

function pdfContent(sourceId: string, title: string): DocumentContent {
  return {
    title,
    format: 'pdf',
    previewUrl: `wilthy-resource://jwc/${encodeURIComponent(sourceId)}`,
    url: `${origin}${jwcFilePath(sourceId)}`,
  };
}

export async function readJwcFile(sourceId: string): Promise<DocumentContent> {
  await cachedJwcFile(sourceId);
  return pdfContent(sourceId, jwcFileName(sourceId));
}

export async function handleJwcPreviewRequest(request: Request, url: URL): Promise<Response> {
  const path = await cachedJwcFile(decodeURIComponent(url.pathname.slice(1)));
  return previewFileResponse(path, request);
}

export const jwcWorkspaceSource: WorkspaceSource = {
  prefix: JWC_FILE_PREFIX,
  validate: jwcFilePath,
  preview: readJwcFile,
  read: async (sourceId) => ({
    title: jwcFileName(sourceId),
    format: 'file',
    url: `${origin}${jwcFilePath(sourceId)}`,
  }),
};

function noticeIdOf(sourceId: string): string {
  const match = /^jwc-notice:([0-9a-f]{32})$/.exec(sourceId);
  if (!match) throw new Error('通知地址无效');
  return `jwc:${match[1]}`;
}

/** 打开通知即预览：正文内嵌 PDF 时直接显示这份 PDF，否则显示网页正文。 */
export async function readJwcNotice(sourceId: string): Promise<DocumentContent> {
  const notice = await getJwcNotice(noticeIdOf(sourceId));
  const document = notice.documents[0];
  if (!document) return { title: notice.title, format: 'html', text: notice.html, url: notice.url };
  await cachedJwcFile(document.sourceId);
  return { ...pdfContent(document.sourceId, notice.title), url: notice.url };
}

export const jwcNoticeWorkspaceSource: WorkspaceSource = {
  prefix: JWC_NOTICE_PREFIX,
  validate: noticeIdOf,
  preview: readJwcNotice,
  read: async (sourceId) => {
    const notice = await getJwcNotice(noticeIdOf(sourceId));
    return { title: notice.title, format: 'html', text: notice.html, url: notice.url };
  },
};

export const jwcNoticeSource: NoticeSource = {
  id: 'jwc',
  account: () => accountKey,
  refresh: (_account, force) => refreshJwc(force),
  // 教务部网站的通知在预览标签里阅读，转到信息门户等外部网站的交给浏览器。
  link: ({ url }, id) =>
    typeof url === 'string'
      ? {
          target:
            new URL(url).origin === origin
              ? { page: 'sources', sourceId: `${JWC_NOTICE_PREFIX}${id.slice(4)}` }
              : { url },
        }
      : null,
};

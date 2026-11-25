import Database from 'better-sqlite3';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { provideTestHostPorts } from '../../../../core/test/host-mock';

vi.mock('electron', () => ({ app: { isPackaged: true } }));
vi.mock('../../../../modules/todo', () => ({
  getTodoState: () => ({ items: [], sources: [], syncing: false }),
  todoSyncedAt: () => null,
  todoSyncError: () => null,
  todoNotifications: () => [],
  onTaskNotice: vi.fn(),
  onTodoChange: vi.fn(),
  markTodoRead: vi.fn(),
}));
vi.mock('../../../../modules/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../modules/notifications')>()),
  systemNotifyItem: vi.fn(),
}));

import { app } from 'electron';
import { notificationsModule, systemNotifyItem } from '../../../../modules/notifications';
import { parseJwcList, refreshJwc, getJwcNotice, readJwcNotice } from '../jwc';

let db: Database.Database;
const request = vi.fn<typeof fetch>();
const origin = 'https://jwb.bnuzh.edu.cn';
const hex = (id: number) => id.toString(16).padStart(32, '0');
const row = (id: number, date = '2026-10-28', path = '') =>
  `<li class="line"><a href="${path}${hex(id)}.htm" title="通知 ${id}" target="_self"><span>【教务学务】通知 ${id}…</span></a><span class="fr text-muted">${date}</span></li>`;
const list = (rows: string, next = '') =>
  `<ul class="list">${rows}</ul><div class="pagenav-btn fr">${next ? `<a href="${next}">下一页</a>` : ''}</div>`;
const page = (html: string) => new Response(html, { headers: { ETag: '"v1"' } });
const listUrl = `${origin}/tzgg/index.htm`;

beforeEach(() => {
  vi.clearAllMocks();
  request.mockReset();
  vi.stubGlobal('fetch', request);
  vi.stubEnv('WILTHY_DEV_URL', '');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-02T04:00:00Z'));
  Object.defineProperty(app, 'isPackaged', { value: true, configurable: true });
  db = new Database(':memory:');
  db.exec('CREATE TABLE workspace_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  for (const table of notificationsModule.schema!.tables) db.exec(table);
  provideTestHostPorts({ database: () => db });
});
afterEach(() => {
  db.close();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('标题取完整 title，跨栏目链接解析为绝对地址，并找到下一页', () => {
  const result = parseJwcList(
    list(row(1) + row(2, '2026-10-27', '../sjjx/xkjs/'), 'index1.htm'),
    listUrl,
  );
  expect(result.items.map((item) => item.id)).toEqual([`jwc:${hex(1)}`, `jwc:${hex(2)}`]);
  expect(result.items[0]).toMatchObject({
    title: '通知 1',
    body: '教务学务',
    createdAt: '2026-10-27T16:00:00.000Z',
    href: { kind: 'jwc', url: `${origin}/tzgg/${hex(1)}.htm` },
  });
  expect(result.items[1]!.href.url).toBe(`${origin}/sjjx/xkjs/${hex(2)}.htm`);
  expect(result.next).toBe(`${origin}/tzgg/index1.htm`);
  expect(() => parseJwcList('<html>维护中</html>', listUrl)).toThrow('未能读取');
});

it('转到信息门户的通知用链接派生稳定 ID，不阻断整页', () => {
  const portal = 'https://one.bnuzh.edu.cn/up/view?m=pim#act=up/pim/showpim&id=34780173750120448';
  const html = list(
    row(1) +
      `<li class="line"><a href="${portal.replace('&', '&amp;')}" title="期末考试安排" target="_self"><span>【教务学务】期末考试安排</span></a><span class="fr text-muted">2026-10-14</span></li>`,
  );
  const items = parseJwcList(html, listUrl).items;
  expect(items).toHaveLength(2);
  expect(items[1]!.id).toMatch(/^jwc:url-[0-9a-f]{32}$/);
  expect(items[1]!.href.url).toBe(portal);
  expect(parseJwcList(html, listUrl).items[1]!.id).toBe(items[1]!.id);
});

it('首次导入历史不提醒，此后同日新增文章仅收集一次，304 不清除数据', async () => {
  request.mockResolvedValueOnce(page(list(row(1))));
  await refreshJwc(true);
  expect(db.prepare('SELECT * FROM notifications').all()).toHaveLength(1);
  expect(systemNotifyItem).not.toHaveBeenCalled();
  request.mockResolvedValueOnce(page(list(row(2) + row(1))));
  await refreshJwc(true);
  expect(db.prepare('SELECT id FROM notifications ORDER BY id').all()).toEqual([
    { id: `jwc:${hex(1)}` },
    { id: `jwc:${hex(2)}` },
  ]);
  expect(systemNotifyItem).toHaveBeenCalledTimes(1);
  request.mockResolvedValueOnce(new Response(null, { status: 304 }));
  await refreshJwc(true);
  expect(request.mock.calls[2]![1]!.headers).toMatchObject({ 'If-None-Match': '"v1"' });
  expect(db.prepare('SELECT id FROM notifications').all()).toHaveLength(2);
  await refreshJwc();
  expect(request).toHaveBeenCalledTimes(3);
});

it.each([true, false])('首次导入近两个月通知且不提醒（正式版：%s）', async (isPackaged) => {
  Object.defineProperty(app, 'isPackaged', { value: isPackaged });
  vi.stubEnv('WILTHY_DEV_URL', isPackaged ? '' : 'http://127.0.0.1:5173');
  request
    .mockResolvedValueOnce(page(list(row(10), 'index1.htm')))
    .mockResolvedValueOnce(page(list(row(9, '2026-09-02') + row(8, '2026-09-01'), 'index2.htm')));
  await refreshJwc(true);
  expect(db.prepare('SELECT id FROM notifications ORDER BY id').all()).toEqual([
    { id: `jwc:${hex(9)}` },
    { id: `jwc:${hex(10)}` },
  ]);
  expect(request).toHaveBeenCalledTimes(2);
  expect(systemNotifyItem).not.toHaveBeenCalled();
  request.mockResolvedValueOnce(new Response(null, { status: 304 }));
  await refreshJwc(true);
  expect(request).toHaveBeenCalledTimes(3);
});

it('北京时间刚跨日时按当地日期保留两个月前当天的通知', async () => {
  vi.setSystemTime(new Date('2026-11-01T16:30:00Z'));
  request.mockResolvedValueOnce(page(list(row(9, '2026-09-02') + row(8, '2026-09-01'))));
  await refreshJwc(true);
  expect(db.prepare('SELECT id FROM notifications').all()).toEqual([{ id: `jwc:${hex(9)}` }]);
  expect(systemNotifyItem).not.toHaveBeenCalled();
});

it('列表读取失败不推进基线，下次成功仍可发现新增', async () => {
  request.mockResolvedValueOnce(page(list(row(1))));
  await refreshJwc(true);
  const before = db.prepare('SELECT value FROM workspace_settings').get();
  request.mockResolvedValueOnce(page('<h1>服务不可用</h1>'));
  await refreshJwc(true);
  expect(db.prepare('SELECT value FROM workspace_settings').get()).toEqual(before);
  expect(db.prepare('SELECT error FROM notification_refreshes').get()).toMatchObject({
    error: '未能读取教务部通知列表',
  });
});

it('保留正文表格图片；内嵌的 PDF 正文与附件列表都可在应用内打开', async () => {
  const id = `jwc:${hex(991)}`;
  db.prepare(
    'INSERT INTO notifications (id, source, account_key, title, created_at, href) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    id,
    'jwc',
    'students',
    '通知',
    '2026-10-28',
    JSON.stringify({ kind: 'jwc', url: `${origin}/sjjx/xkjs/${hex(991)}.htm` }),
  );
  request.mockResolvedValueOnce(
    page(
      '<div class="contenttxt"><table><tr><td>考试</td></tr></table><img src="/image.png"><iframe src="../../pdf_view/viewer.html" data-src="../../docs/2026-11/f5d.pdf"></iframe><a href="https://example.com/x">外链</a></div>' +
        '<div class="post-attatch"><ul><li><a href="../../docs//2026-11/7da.pdf"><span>说明.pdf</span></a></li><li><a href="../../docs//2026-11/b57.docx">表格.docx</a></li></ul></div>',
    ),
  );
  const notice = await getJwcNotice(id);
  expect(notice.html).toContain('<table>');
  expect(notice.html).toContain('/image.png');
  expect(notice.documents).toEqual([
    { name: '通知', sourceId: 'jwc-file:/docs/2026-11/f5d.pdf#%E9%80%9A%E7%9F%A5.pdf' },
  ]);
  expect(notice.attachments).toEqual([
    {
      id: '7da.pdf',
      name: '说明.pdf',
      url: `${origin}/docs//2026-11/7da.pdf`,
      sourceId: 'jwc-file:/docs/2026-11/7da.pdf#%E8%AF%B4%E6%98%8E.pdf',
    },
    { id: 'b57.docx', name: '表格.docx', url: `${origin}/docs//2026-11/b57.docx`, sourceId: null },
  ]);
});

it('点开通知即预览正文 PDF；没有 PDF 的通知按网页显示', async () => {
  const insert = db.prepare(
    'INSERT INTO notifications (id, source, account_key, title, created_at, href) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const [id, title] of [
    [992, 'PDF 通知'],
    [993, '文字通知'],
  ] as const)
    insert.run(
      `jwc:${hex(id)}`,
      'jwc',
      'students',
      title,
      '2026-10-28',
      JSON.stringify({ kind: 'jwc', url: `${origin}/tzgg/${hex(id)}.htm` }),
    );
  request
    .mockResolvedValueOnce(
      page('<div class="contenttxt"><iframe data-src="../docs/2026-11/f5d.pdf"></iframe></div>'),
    )
    .mockResolvedValueOnce(new Response(new Uint8Array([37, 80, 68, 70])))
    .mockResolvedValueOnce(page('<div class="contenttxt"><p>正文</p></div>'));

  await expect(readJwcNotice(`jwc-notice:${hex(992)}`)).resolves.toMatchObject({
    title: 'PDF 通知',
    format: 'pdf',
    previewUrl: `wilthy-resource://jwc/${encodeURIComponent('jwc-file:/docs/2026-11/f5d.pdf#PDF%20%E9%80%9A%E7%9F%A5.pdf')}`,
  });
  await expect(readJwcNotice(`jwc-notice:${hex(993)}`)).resolves.toMatchObject({
    title: '文字通知',
    format: 'html',
    text: '<p>正文</p>',
  });
});

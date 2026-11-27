import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  root: '',
  disabled: false,
  sessions: [] as { file: string }[],
}));
state.root = mkdtempSync(join(tmpdir(), 'wilthy-media-'));
vi.mock('electron', () => ({
  app: { getPath: () => state.root },
  nativeImage: {},
  dialog: {},
}));
vi.mock('../../capabilities/tools', () => ({
  readDisabledTools: () => new Set(state.disabled ? ['read_document'] : []),
}));
vi.mock('../../capabilities/documents', () => ({ hasDocumentToken: () => false }));
import { provideTestHostPorts } from '../../test/host-mock';
import { gcChatMedia, readChatAttachment, releaseChatAttachments, stageChatMedia } from '../media';

beforeEach(() => {
  provideTestHostPorts({
    paths: { userData: () => state.root },
    database: () => ({ prepare: () => ({ all: () => state.sessions }) }) as never,
  });
  state.disabled = false;
  state.sessions = [];
});
afterAll(() => rmSync(state.root, { recursive: true, force: true }));

it('stages documents as files, retains sent files referenced by sessions, and collects orphan files', () => {
  const bytes = Buffer.from([37, 80, 68, 70, 45, 255, 0]);
  const view = stageChatMedia('PRP结项汇报_v3(1).pdf.pdf', bytes);
  const attachment = readChatAttachment(view.id);
  expect('path' in attachment).toBe(true);
  if (!('path' in attachment)) throw new Error('document was decoded as text');
  expect(readFileSync(attachment.path).equals(bytes)).toBe(true);
  releaseChatAttachments([view.id]);
  expect(existsSync(attachment.path)).toBe(true);
  const session = join(state.root, 'session.jsonl');
  writeFileSync(session, JSON.stringify({ attachments: [{ id: view.id, name: view.name }] }));
  state.sessions = [{ file: session }];
  gcChatMedia();
  expect(existsSync(attachment.path)).toBe(true);
  state.sessions = [];
  gcChatMedia();
  expect(existsSync(attachment.path)).toBe(false);
});

it('keeps text attachments in memory and refuses documents while read_document is off', () => {
  const view = stageChatMedia('notes.txt', Buffer.from('正文'));
  expect(readChatAttachment(view.id)).toEqual({ name: 'notes.txt', bytes: Buffer.from('正文') });
  releaseChatAttachments([view.id]);
  expect(() => readChatAttachment(view.id)).toThrow('不存在');
  state.disabled = true;
  expect(() => stageChatMedia('file.pdf', Buffer.from('%PDF-1.7'))).toThrow('读取文档已关闭');
});

it('accepts PDFs without a MinerU token but refuses Office files', () => {
  const view = stageChatMedia('plan.pdf', Buffer.from('%PDF-1.7'));
  expect(view.kind).toBe('attachment');
  releaseChatAttachments([view.id]);
  expect(() => stageChatMedia('file.pptx', Buffer.from('PK'))).toThrow('MinerU Token');
});

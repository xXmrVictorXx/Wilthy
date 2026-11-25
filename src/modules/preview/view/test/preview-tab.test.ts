// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { previewBranchOf } from '../PreviewTab';
import { parsePreviewTabId, type PreviewTabTarget } from '../tab-id';

describe('parsePreviewTabId', () => {
  it('工作区条目：preview:{entryId}', () => {
    expect(
      parsePreviewTabId('preview:00000000-0000-4000-8000-000000000002'),
    ).toEqual<PreviewTabTarget>({ entryId: '00000000-0000-4000-8000-000000000002' });
  });

  it('@ 引用型资料：preview:source:{原 documentKey} 保留原 key 全文', () => {
    expect(parsePreviewTabId('preview:source:file:123')).toEqual<PreviewTabTarget>({
      sourceId: 'file:123',
    });
    expect(parsePreviewTabId('preview:source:shuiyuan-topic:456')).toEqual<PreviewTabTarget>({
      sourceId: 'shuiyuan-topic:456',
    });
  });

  it('空载荷返回 null', () => {
    expect(parsePreviewTabId('preview:')).toBeNull();
    expect(parsePreviewTabId('preview:source:')).toBeNull();
  });

  it('其他标签 kind 返回 null', () => {
    expect(parsePreviewTabId('note:00000000-0000-4000-8000-000000000002')).toBeNull();
    expect(parsePreviewTabId('chat:abc')).toBeNull();
    expect(parsePreviewTabId('review:abc')).toBeNull();
  });
});

describe('previewBranchOf', () => {
  const pdf = { title: '通知', format: 'pdf' as const, previewUrl: 'wilthy-resource://x/1' };

  it('只提供页眉的资料仍按内容格式预览', () => {
    expect(previewBranchOf({ content: pdf, source: { id: 'x', header: () => null } })).toBe('pdf');
  });

  it('提供整篇正文组件的资料由模块自己渲染', () => {
    expect(previewBranchOf({ content: pdf, source: { id: 'x', document: () => null } })).toBe(
      'source',
    );
  });
});

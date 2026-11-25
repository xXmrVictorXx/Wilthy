import { z } from 'zod';
import { defineContract } from '../../core/protocol/contract';

export interface JwcNotice {
  id: string;
  title: string;
  publishedAt: string;
  url: string;
  html: string;
  attachments: { id: string; name: string; url: string }[];
}

const noticeId = z.string().regex(/^jwc:[0-9a-f]{32}$/);

export const jwcContract = defineContract('jwc', {
  notice: { input: noticeId, output: z.custom<JwcNotice>() },
});

declare module '../../app/module' {
  interface NavTargets {
    jwc: { noticeId: string };
  }
}

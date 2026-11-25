// 教务部通知：抓取教务部网站的通知列表；正文与附件里的 PDF 登记为资料，在应用内预览。
import { defineModule } from '../../app/module';
import { implement } from '../../core/protocol/contract';
import { registerNoticeSource } from '../../modules/notifications';
import { registerPreviewHost, registerWorkspaceSource } from '../../modules/workspace';
import { jwcContract } from './contract';
import {
  getJwcNotice,
  handleJwcPreviewRequest,
  jwcNoticeSource,
  jwcWorkspaceSource,
} from './main/jwc';

export const jwcModule = defineModule({
  id: 'jwc',
  ipc: implement(jwcContract, {
    notice: getJwcNotice,
  }),
  register() {
    registerNoticeSource(jwcNoticeSource);
    registerWorkspaceSource(jwcWorkspaceSource);
    registerPreviewHost('jwc', handleJwcPreviewRequest);
  },
});

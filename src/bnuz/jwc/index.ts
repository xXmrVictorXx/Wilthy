// 教务部通知：抓取教务部网站的通知列表，附件是公开链接，交给浏览器打开。
import { defineModule } from '../../app/module';
import { implement } from '../../core/protocol/contract';
import { registerNoticeSource } from '../../modules/notifications';
import { jwcContract } from './contract';
import { getJwcNotice, jwcNoticeSource } from './main/jwc';

export const jwcModule = defineModule({
  id: 'jwc',
  ipc: implement(jwcContract, {
    notice: getJwcNotice,
  }),
  register() {
    registerNoticeSource(jwcNoticeSource);
  },
});

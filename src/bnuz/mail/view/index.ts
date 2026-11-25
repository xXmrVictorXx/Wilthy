// 北师邮箱由网易企业邮托管：需先在网页邮箱设置里开启 IMAP/SMTP 并生成客户端授权码。
import { defineView } from '../../../app/module';
import { registerMailPreset } from '../../../modules/mail/view';

export const bnuzMailView = defineView({
  pages: {},
  start() {
    registerMailPreset({
      label: '北师邮箱',
      domain: 'mail.bnu.edu.cn',
      server: {
        imapHost: 'imaphz.qiye.163.com',
        imapPort: 993,
        smtpHost: 'smtphz.qiye.163.com',
        smtpPort: 465,
      },
      passwordHint: '客户端授权码（在网页邮箱设置里生成）',
      userHint: '学号',
    });
  },
});

import wilthyAuthorAvatar from '../../../../assets/credits/xxmrvictorxx/avatar.png';
import changyoAvatar from '../../../../assets/credits/changyo/avatar.jpg';
import aizyeeeAvatar from '../../../../assets/credits/aizyeee/avatar.png';
import aaalpsssAvatar from '../../../../assets/credits/aaalpsss/avatar.png';
import huangtongAvatar from '../../../../assets/credits/huangtong601-ops/avatar.jpg';
import jinjiAvatar from '../../../../assets/credits/jinji-2005/avatar.jpg';
import cophqAvatar from '../../../../assets/credits/cophq/avatar.jpg';
import sbsjkmAvatar from '../../../../assets/credits/sbsjkm/avatar.jpg';
import slayerwaltAvatar from '../../../../assets/credits/slayerwalt/avatar.jpg';
import aletheiarAvatar from '../../../../assets/credits/aletheiar/avatar.png';
import yixuanwang4Avatar from '../../../../assets/credits/yixuanwang4/avatar.png';

export type SocialLinkKind = 'github' | 'blog' | 'website' | 'bilibili';

export interface SocialLink {
  kind: SocialLinkKind;
  url: string;
  label?: string;
}

export interface CreditPerson {
  name: string;
  avatar?: string;
  links?: SocialLink[];
}

export interface CreditSection {
  title: string;
  people: CreditPerson[];
}

// Wilthy 的作者在前；Wilthy 基于 Dela 修改，其后致谢上游项目的作者与贡献者
// （名单取自 Chang-Yo/Dela 仓库）。头像随源码入库。
export const creditSections: CreditSection[] = [
  {
    title: 'Wilthy 作者',
    people: [
      {
        name: 'xXmrVictorXx',
        avatar: wilthyAuthorAvatar,
        links: [{ kind: 'github', url: 'https://github.com/xXmrVictorXx' }],
      },
    ],
  },
  {
    title: 'Dela 作者和贡献者',
    people: [
      {
        name: 'ChangYo',
        avatar: changyoAvatar,
        links: [
          { kind: 'github', url: 'https://github.com/Chang-Yo' },
          { kind: 'blog', url: 'https://changyo.pages.dev' },
        ],
      },
      {
        name: 'aizyeee',
        avatar: aizyeeeAvatar,
        links: [
          { kind: 'github', url: 'https://github.com/aizyeee' },
          { kind: 'website', url: 'https://aizyeee.com' },
        ],
      },
      {
        name: 'AAAlpsss',
        avatar: aaalpsssAvatar,
        links: [{ kind: 'github', url: 'https://github.com/AAAlpsss' }],
      },
      {
        name: 'huangtong601-ops',
        avatar: huangtongAvatar,
        links: [{ kind: 'bilibili', url: 'https://space.bilibili.com/355707853' }],
      },
      {
        name: 'jinji-2005',
        avatar: jinjiAvatar,
        links: [{ kind: 'github', url: 'https://github.com/jinji-2005' }],
      },
      {
        name: 'cophQ',
        avatar: cophqAvatar,
        links: [{ kind: 'github', url: 'https://github.com/cophQ' }],
      },
      {
        name: 'SBSJKM',
        avatar: sbsjkmAvatar,
        links: [{ kind: 'github', url: 'https://github.com/SBSJKM' }],
      },
      {
        name: 'slayerwalt',
        avatar: slayerwaltAvatar,
        links: [{ kind: 'github', url: 'https://github.com/slayerwalt' }],
      },
      {
        name: 'Aletheiar',
        avatar: aletheiarAvatar,
        links: [{ kind: 'github', url: 'https://github.com/Aletheiar' }],
      },
      {
        name: 'YixuanWang4',
        avatar: yixuanwang4Avatar,
      },
    ],
  },
];

import { Feather, Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../../ui/button';
import { WilthyBrand } from './wilthy-brand';
import {
  creditSections,
  type CreditPerson,
  type CreditSection,
  type SocialLink,
  type SocialLinkKind,
} from './credits';
import { SectionHeader } from './SectionHeader';

// lucide 不再提供品牌图标，GitHub/B 站标记内联自 simple-icons。
function GithubMark() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function BilibiliMark() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z" />
    </svg>
  );
}

const socialLinkMeta: Record<SocialLinkKind, { icon: ReactNode; label: string }> = {
  bilibili: { icon: <BilibiliMark />, label: '哔哩哔哩' },
  blog: { icon: <Feather />, label: '个人博客' },
  github: { icon: <GithubMark />, label: 'GitHub 主页' },
  website: { icon: <Globe />, label: '官网' },
};

function PersonLinks({ links }: { links: SocialLink[] }) {
  return (
    <>
      {links.map(({ kind, label, url }) => {
        const meta = socialLinkMeta[kind];
        return (
          <Button asChild aria-label={label ?? meta.label} key={url} size="icon-sm" variant="ghost">
            <a href={url} rel="noreferrer" target="_blank">
              {meta.icon}
            </a>
          </Button>
        );
      })}
    </>
  );
}

function PersonIdentity({ person }: { person: CreditPerson }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        alt=""
        aria-hidden="true"
        className="size-6 rounded-full object-cover"
        src={person.avatar}
      />
      <span className="text-sm font-medium text-ink">{person.name}</span>
    </div>
  );
}

function PersonActions({ person }: { person: CreditPerson }) {
  return (
    <div className="flex items-center gap-1.5">
      {person.links ? <PersonLinks links={person.links} /> : null}
    </div>
  );
}

function CreditSectionBlock({ section }: { section: CreditSection }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-base font-semibold">{section.title}</h2>
      {section.people.map((person) => (
        <div className="flex items-center justify-between gap-3 py-1" key={person.name}>
          <PersonIdentity person={person} />
          <PersonActions person={person} />
        </div>
      ))}
    </section>
  );
}

export function AboutSection() {
  return (
    <div className="grid gap-10" data-setting-id="about">
      <SectionHeader title="关于" />
      <section className="grid justify-items-center gap-1.5 px-6 pb-10 pt-6 text-center">
        <WilthyBrand className="h-48 w-48" />
        <h2 className="text-4xl font-script tracking-tight">Wilthy</h2>
        <p className="text-sm text-ink-3">为北师大珠海校区同学打造的个人 Agent</p>
        <p className="mt-5 text-xs text-ink-3">版本 {window.wilthy?.version ?? '浏览器预览'}</p>
        <p className="text-xs text-ink-3">
          基于 Dela 修改，以 GNU GPL-3.0-or-later 发布，自 2026-11-25 起独立维护
        </p>
      </section>
      {creditSections.map((section) => (
        <CreditSectionBlock key={section.title} section={section} />
      ))}
    </div>
  );
}

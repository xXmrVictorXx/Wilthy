import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListChecks, LogIn, RefreshCw } from 'lucide-react';
import { errorMessage } from '../../../core/protocol/contract';
import { Alert } from '../../../ui/alert';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Collapsible } from '../../../ui/collapsible';
import { ConnectCard } from '../../../ui/connect-card';
import { DesktopOnlyNotice } from '../../../ui/desktop-only-notice';
import { SegmentedControl } from '../../../ui/segmented-control';
import { cn } from '../../../ui/lib/cn';
import { showToast } from '../../../ui/toast';
import {
  isPassingScore,
  summarizeModules,
  type ModuleCourse,
  type PlannedCourse,
} from '../contract';
import { syncProgram, useProgram } from './use-program';

const views = ['module', 'semester'] as const;
const viewLabels = { module: '按模块', semester: '按学期' } as const;
const TERM_NAMES: Record<string, string> = { '1': '秋季学期', '2': '春季学期', '3': '夏季学期' };

export function ProgramView() {
  if (!window.wilthy) {
    return (
      <DesktopOnlyNotice
        description="数字京师·珠海的登录会话和本地培养方案缓存不会暴露给浏览器。"
        title="培养方案仅在 Wilthy 桌面端可用"
      />
    );
  }
  return <DesktopProgramView />;
}

function DesktopProgramView() {
  const queryClient = useQueryClient();
  const { state, plan, progress } = useProgram();
  const [view, setView] = useState<(typeof views)[number]>('module');
  const [busy, setBusy] = useState(false);

  const sync = async () => {
    setBusy(true);
    try {
      const failure = await syncProgram();
      if (failure) showToast({ variant: 'error', title: '同步培养方案失败', description: failure });
      await queryClient.invalidateQueries({ queryKey: ['program'] });
    } finally {
      setBusy(false);
    }
  };

  const loadError = state.error ?? plan.error ?? progress.error;
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-lg font-semibold tracking-tight">培养方案</h1>
        <p className="text-xs text-ink-3">教务系统没有给出各模块应修学分，这里只统计已获学分</p>
        <div className="ml-auto flex items-center gap-2">
          <SegmentedControl
            aria-label="查看方式"
            labels={viewLabels}
            onValueChange={setView}
            options={views}
            value={view}
          />
          <Button
            aria-label="同步培养方案"
            disabled={busy}
            onClick={() => void sync()}
            size="icon-sm"
            variant="ghost"
          >
            <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} />
          </Button>
        </div>
      </header>
      {loadError ? (
        <Alert className="mx-4 mt-3" role="alert">
          {errorMessage(loadError)}
        </Alert>
      ) : null}
      {state.data && !state.data.lastSyncedAt ? (
        <div className="flex min-h-0 flex-1 overflow-y-auto p-6">
          <ConnectCard
            className="m-auto"
            description="登录后读取培养方案的计划课程，以及各课程模块的修读情况。登录在独立窗口完成。"
            icon={ListChecks}
            title="同步培养方案"
          >
            <Button disabled={busy} onClick={() => void sync()}>
              <LogIn className="size-4" />
              {busy ? '正在同步…' : '登录并同步'}
            </Button>
          </ConnectCard>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {view === 'module' ? (
            <ModuleList courses={progress.data ?? []} />
          ) : (
            <SemesterList courses={plan.data ?? []} />
          )}
        </div>
      )}
    </div>
  );
}

function ModuleList({ courses }: { courses: readonly ModuleCourse[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const byModule = Map.groupBy(courses, (course) => course.module);
  return summarizeModules(courses).map((summary) => (
    <section key={summary.module} className="border-b border-line py-2 last:border-b-0">
      <button
        aria-expanded={open === summary.module}
        className="flex w-full items-center gap-3 rounded-control px-2 py-1.5 text-left text-sm outline-none hover:bg-inset focus-visible:outline-2 focus-visible:outline-accent"
        onClick={() => setOpen(open === summary.module ? null : summary.module)}
        type="button"
      >
        <span className="min-w-0 flex-1 font-medium">{summary.module}</span>
        <span className="text-xs text-ink-3 tabular-nums">
          已获 {summary.earnedCredits} 学分 · 通过 {summary.passed}/{summary.total} 门
        </span>
      </button>
      <Collapsible open={open === summary.module}>
        <ul className="px-2 pb-1">
          {(byModule.get(summary.module) ?? []).map((course) => (
            <li key={course.courseCode} className="flex items-center gap-3 py-1 text-sm">
              <span className="min-w-0 flex-1">
                {course.courseName}
                <span className="ml-1.5 text-xs text-ink-3">{course.courseCode}</span>
              </span>
              <span className="text-xs text-ink-3 tabular-nums">{course.credits} 学分</span>
              <CourseStatus score={course.score} />
            </li>
          ))}
        </ul>
      </Collapsible>
    </section>
  ));
}

function CourseStatus({ score }: { score: string | null }) {
  if (!score) return <Badge size="2xs">未修</Badge>;
  return isPassingScore(score) ? (
    <Badge size="2xs" tone="success">
      {score}
    </Badge>
  ) : (
    <Badge size="2xs" tone="danger">
      {score}
    </Badge>
  );
}

function SemesterList({ courses }: { courses: readonly PlannedCourse[] }) {
  return [...Map.groupBy(courses, (course) => course.semester)].map(([semester, items]) => {
    const [start, end, term] = semester.split('-');
    return (
      <section key={semester} className="mb-5">
        <h2 className="mb-1 text-sm font-medium text-ink-2">
          {start}-{end} {TERM_NAMES[term!]}
        </h2>
        <ul>
          {items.map((course) => (
            <li key={course.courseCode} className="flex items-center gap-3 py-1 text-sm">
              <span className="min-w-0 flex-1">
                {course.courseName}
                <span className="ml-1.5 text-xs text-ink-3">{course.courseCode}</span>
              </span>
              <span className="text-xs text-ink-3">{course.category}</span>
              <span className="w-14 text-right text-xs text-ink-3 tabular-nums">
                {course.credits} 学分
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  });
}

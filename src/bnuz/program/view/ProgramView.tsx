import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListChecks, RefreshCw } from 'lucide-react';
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
import { Input } from '../../../ui/input';
import {
  type CategoryCourse,
  type FilledBy,
  type PlannedCourse,
  type ProgramOverview,
} from '../contract';
import { programClient, syncProgram, useProgram } from './use-program';

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
  const { state, plan, overview } = useProgram();
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

  const loadError = state.error ?? plan.error ?? overview.error;
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-lg font-semibold tracking-tight">培养方案</h1>
        <p className="text-xs text-ink-3">
          {overview.data?.categories.some((item) => item.requirement)
            ? '已获学分按成绩统计，在修学分来自本学期课表'
            : '教务系统不给各类别要求学分：在右侧自己填写，或把学校发的培养方案文件发给 Agent 自动填写'}
        </p>
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
            description="读取培养方案的计划课程，以及各课程模块的修读情况。登录失效时会打开数字京师·珠海登录窗口。"
            icon={ListChecks}
            title="同步培养方案"
          >
            <Button disabled={busy} onClick={() => void sync()}>
              <RefreshCw className="size-4" />
              {busy ? '正在同步…' : '立即同步'}
            </Button>
          </ConnectCard>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {view === 'module' ? (
            overview.data && <CategoryList overview={overview.data} />
          ) : (
            <SemesterList courses={plan.data ?? []} />
          )}
        </div>
      )}
    </div>
  );
}

const formatCredits = (value: number) => String(Number(value.toFixed(2)));

function CategoryList({ overview }: { overview: ProgramOverview }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const save = async (operation: () => Promise<ProgramOverview>) => {
    try {
      queryClient.setQueryData(['program', 'overview'], await operation());
    } catch (cause) {
      showToast({ variant: 'error', title: '保存要求学分失败', description: errorMessage(cause) });
    }
  };
  return (
    <>
      <div className="mb-2 flex items-center gap-3 border-b border-line px-2 pb-3 text-sm">
        <span className="min-w-0 flex-1 font-medium">毕业总学分</span>
        <CreditProgress
          earned={overview.earnedCredits}
          filledBy={overview.total?.filledBy ?? null}
          label="毕业总学分"
          ongoing={overview.ongoingCredits}
          onSave={(credits) => save(() => programClient.setTotal(credits))}
          required={overview.total?.credits ?? null}
        />
      </div>
      {overview.categories.map((item) => (
        <section key={item.category} className="border-b border-line py-1 last:border-b-0">
          <div className="flex items-center gap-3 px-2 py-1 text-sm">
            <button
              aria-expanded={open === item.category}
              className="min-w-0 flex-1 rounded-control py-0.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => setOpen(open === item.category ? null : item.category)}
              type="button"
            >
              <span className="font-medium">{item.category}</span>
              {item.requirement?.note ? (
                <span className="block text-xs text-ink-3">{item.requirement.note}</span>
              ) : null}
            </button>
            <CreditProgress
              earned={item.earnedCredits}
              filledBy={item.requirement?.filledBy ?? null}
              label={`${item.category} 要求学分`}
              ongoing={item.ongoingCredits}
              onSave={(credits) =>
                save(() => programClient.setRequirement({ category: item.category, credits }))
              }
              required={item.requirement?.credits ?? null}
            />
          </div>
          <Collapsible open={open === item.category}>
            <ul className="px-2 pb-1">
              {item.courses.map((course) => (
                <li key={course.courseCode} className="flex items-center gap-3 py-1 text-sm">
                  <span className="min-w-0 flex-1">
                    {course.courseName}
                    <span className="ml-1.5 text-xs text-ink-3">{course.courseCode}</span>
                  </span>
                  <span className="text-xs text-ink-3 tabular-nums">
                    {formatCredits(course.credits)} 学分
                  </span>
                  <CourseStatus course={course} />
                </li>
              ))}
            </ul>
          </Collapsible>
        </section>
      ))}
    </>
  );
}

/** 要求学分可以直接改：失焦或回车保存，清空即删除这一项要求。 */
function CreditProgress({
  label,
  earned,
  ongoing,
  required,
  filledBy,
  onSave,
}: {
  label: string;
  earned: number;
  ongoing: number;
  required: number | null;
  filledBy: FilledBy | null;
  onSave: (credits: number | null) => Promise<void>;
}) {
  const [edited, setEdited] = useState<string | null>(null);
  const commit = () => {
    if (edited === null) return;
    setEdited(null);
    const credits = edited.trim() === '' ? null : Number(edited);
    if (credits === required || (credits !== null && !(credits >= 0))) return;
    void onSave(credits);
  };
  const gap = required === null ? null : required - earned - ongoing;
  return (
    <>
      <span className="text-xs text-ink-3 tabular-nums">
        已获 {formatCredits(earned)}
        {ongoing > 0 ? ` · 在修 ${formatCredits(ongoing)}` : ''} /
      </span>
      <Input
        aria-label={label}
        className="w-16 shrink-0"
        min="0"
        onBlur={commit}
        onChange={(event) => setEdited(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        placeholder="要求"
        step="0.5"
        title={filledBy === 'agent' ? '由 Agent 从培养方案文件读出，可以直接修改' : undefined}
        type="number"
        value={edited ?? (required === null ? '' : String(required))}
      />
      <span className="w-20 shrink-0 text-right">
        {required === null || gap === null ? null : earned >= required ? (
          <Badge size="2xs" tone="success">
            达标
          </Badge>
        ) : gap <= 0 ? (
          <Badge size="2xs" tone="accent">
            在修可达标
          </Badge>
        ) : (
          <Badge size="2xs">差 {formatCredits(gap)}</Badge>
        )}
      </span>
    </>
  );
}

function CourseStatus({ course }: { course: CategoryCourse }) {
  if (course.status === 'ongoing')
    return (
      <Badge size="2xs" tone="accent">
        在修
      </Badge>
    );
  if (course.status === 'planned') return <Badge size="2xs">未修</Badge>;
  return (
    <Badge size="2xs" tone={course.status === 'passed' ? 'success' : 'danger'}>
      {course.score}
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

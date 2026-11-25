import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { errorMessage } from '../../../core/protocol/contract';
import { Alert } from '../../../ui/alert';
import { Button } from '../../../ui/button';
import { ConnectCard } from '../../../ui/connect-card';
import { DesktopOnlyNotice } from '../../../ui/desktop-only-notice';
import { SegmentedControl } from '../../../ui/segmented-control';
import { cn } from '../../../ui/lib/cn';
import { showToast } from '../../../ui/toast';
import type { GradeRecord } from '../contract';
import { semesterName, syncGrades, useGrades } from './use-grades';

const views = ['valid', 'raw'] as const;
const viewLabels = { valid: '有效', raw: '原始' } as const;
const cell = 'px-3 py-2 text-left';

export function GradesView() {
  if (!window.wilthy) {
    return (
      <DesktopOnlyNotice
        description="数字京师·珠海的登录会话和本地成绩缓存不会暴露给浏览器。"
        title="成绩仅在 Wilthy 桌面端可用"
      />
    );
  }
  return <DesktopGradesView />;
}

function DesktopGradesView() {
  const queryClient = useQueryClient();
  const { state, records } = useGrades();
  const [view, setView] = useState<(typeof views)[number]>('valid');
  const [busy, setBusy] = useState(false);

  const sync = async () => {
    setBusy(true);
    try {
      const failure = await syncGrades();
      if (failure) showToast({ variant: 'error', title: '同步成绩失败', description: failure });
      await queryClient.invalidateQueries({ queryKey: ['grades'] });
    } finally {
      setBusy(false);
    }
  };

  const summary = state.data?.summary;
  const groups = Map.groupBy(records.data ?? [], (record) => record.semester);
  const loadError = state.error ?? records.error;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-lg font-semibold tracking-tight">成绩</h1>
        {summary && (
          <p className="text-xs text-ink-3">
            修读 {summary.attemptedCredits} 学分 · 获得 {summary.earnedCredits} 学分 · 平均学分绩{' '}
            <span className="font-medium text-ink">{summary.gpa.toFixed(2)}</span>
            （学校口径，计入 {summary.gpaCredits} 学分）
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <SegmentedControl
            aria-label="成绩口径"
            labels={viewLabels}
            onValueChange={setView}
            options={views}
            value={view}
          />
          <Button
            aria-label="同步成绩"
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
            description="读取有效成绩、平时与期末分项，以及学校给出的学分与绩点。登录失效时会打开数字京师·珠海登录窗口。"
            icon={GraduationCap}
            title="同步成绩"
          >
            <Button disabled={busy} onClick={() => void sync()}>
              <RefreshCw className="size-4" />
              {busy ? '正在同步…' : '立即同步'}
            </Button>
          </ConnectCard>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {[...groups].map(([semester, items]) => (
            <section key={semester} className="mb-6">
              <h2 className="mb-2 text-sm font-medium text-ink-2">{semesterName(semester)}</h2>
              <GradeTable records={items} view={view} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function GradeTable({
  records,
  view,
}: {
  records: readonly GradeRecord[];
  view: (typeof views)[number];
}) {
  const headers =
    view === 'valid'
      ? ['课程', '学分', '性质', '修读', '成绩', '绩点']
      : ['课程', '学分', '过程', '技能', '期中', '期末', '综合'];
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-xs text-ink-3">
          {headers.map((header) => (
            <th key={header} className={cn(cell, 'font-normal')} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={`${record.courseCode}-${record.status}`}
            className="border-b border-line last:border-b-0"
          >
            <td className={cell}>
              {record.courseName}
              <span className="ml-1.5 text-xs text-ink-3">{record.courseCode}</span>
            </td>
            <td className={cn(cell, 'tabular-nums')}>{record.credits}</td>
            {view === 'valid' ? (
              <>
                <td className={cell}>{record.nature}</td>
                <td className={cell}>{record.status}</td>
                <td className={cn(cell, 'font-medium tabular-nums')}>{record.score}</td>
                <td className={cn(cell, 'tabular-nums')}>{record.gradePoint ?? '—'}</td>
              </>
            ) : (
              <>
                {(['process', 'skill', 'midterm', 'final'] as const).map((key) => (
                  <td key={key} className={cn(cell, 'tabular-nums')}>
                    {record.components?.[key] ?? '—'}
                  </td>
                ))}
                <td className={cn(cell, 'font-medium tabular-nums')}>{record.score}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

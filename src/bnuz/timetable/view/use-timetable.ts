import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query';
import { createClient } from '../../../core/protocol/contract';
import { gradesContract } from '../../grades/contract';
import { programContract } from '../../program/contract';
import { timetableContract } from '../contract';

export const timetableClient = createClient(timetableContract, window.wilthy?.bridge);
const gradesClient = createClient(gradesContract, window.wilthy?.bridge);
const programClient = createClient(programContract, window.wilthy?.bridge);

/** 不传学期时由主进程取当前学期。 */
export function useTimetableState(semester?: string) {
  return useQuery({
    queryKey: semester ? ['timetable', 'state', semester] : ['timetable', 'state'],
    queryFn: () => timetableClient.state(semester),
    placeholderData: keepPreviousData,
  });
}

/** 一次登录同步课表、成绩与培养方案；后两项失败不影响结果，对应页面会再提示同步。 */
export async function connectAndSyncCampus(
  queryClient: QueryClient,
  semester?: string,
): Promise<string | null> {
  const connected = await timetableClient.connect();
  if (!connected.ok) return connected.error ?? '未完成登录';
  const result = await timetableClient.sync(semester);
  await Promise.allSettled([gradesClient.sync(), programClient.sync()]);
  await Promise.all(
    ['timetable', 'grades', 'program'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
  return result.ok ? null : (result.error ?? '同步失败');
}

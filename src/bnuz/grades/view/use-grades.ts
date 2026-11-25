import { useQuery } from '@tanstack/react-query';
import { createClient } from '../../../core/protocol/contract';
import { gradesContract } from '../contract';

export const gradesClient = createClient(gradesContract, window.wilthy?.bridge);

export function useGrades() {
  const state = useQuery({ queryKey: ['grades', 'state'], queryFn: () => gradesClient.state() });
  const records = useQuery({ queryKey: ['grades', 'list'], queryFn: () => gradesClient.list() });
  return { state, records };
}

/** 同步失败且是登录失效时，转入登录窗口后再同步一次。 */
export async function syncGrades(): Promise<string | null> {
  const result = await gradesClient.sync();
  if (result.ok) return null;
  if (result.reason !== 'auth') return result.error ?? '同步失败';
  const connected = await gradesClient.connect();
  if (!connected.ok) return connected.error ?? '未完成登录';
  const retried = await gradesClient.sync();
  return retried.ok ? null : (retried.error ?? '同步失败');
}

const TERM_NAMES: Record<string, string> = { '1': '秋季学期', '2': '春季学期', '3': '夏季学期' };

export function semesterName(semester: string): string {
  const [start, end, term] = semester.split('-');
  return `${start}-${end} ${TERM_NAMES[term!] ?? ''}`;
}

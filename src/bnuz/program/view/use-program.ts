import { useQuery } from '@tanstack/react-query';
import { createClient } from '../../../core/protocol/contract';
import { programContract } from '../contract';

export const programClient = createClient(programContract, window.wilthy?.bridge);

export function useProgram() {
  const state = useQuery({ queryKey: ['program', 'state'], queryFn: () => programClient.state() });
  const plan = useQuery({ queryKey: ['program', 'plan'], queryFn: () => programClient.plan() });
  const overview = useQuery({
    queryKey: ['program', 'overview'],
    queryFn: () => programClient.overview(),
  });
  return { state, plan, overview };
}

/** 同步失败且是登录失效时，转入登录窗口后再同步一次。 */
export async function syncProgram(): Promise<string | null> {
  const result = await programClient.sync();
  if (result.ok) return null;
  if (result.reason !== 'auth') return result.error ?? '同步失败';
  const connected = await programClient.connect();
  if (!connected.ok) return connected.error ?? '未完成登录';
  const retried = await programClient.sync();
  return retried.ok ? null : (retried.error ?? '同步失败');
}

// 只有界面用、主进程不读的偏好：一个持久化 store，写入只发生在 action 里。
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import { useResizableWidth } from '../../../ui/resizable';

export type ProjectNavPreference = { pinned?: boolean; section?: string };

const defaults = {
  shellSidebarCollapsed: false,
  projectOpenTarget: 'vscode' as 'vscode' | 'explorer',
  workspaceSidebarWidth: 300,
  workspaceSidebarCollapsed: false,
  hiddenNavEntries: [] as string[],
  projectNav: {} as Record<string, ProjectNavPreference>,
  remoteLastDirectory: {} as Record<string, string>,
};

type PreferenceValues = typeof defaults;

type PreferencesStore = PreferenceValues & {
  setPreference: <K extends keyof PreferenceValues>(key: K, value: PreferenceValues[K]) => void;
  setNavEntryVisible: (id: string, visible: boolean) => void;
  patchProjectNav: (id: string, patch: ProjectNavPreference) => void;
};

const storageKey = 'wilthy.preferences';

const legacyNavEntries = z.object({ state: z.object({ hidden: z.array(z.string()) }) });
const legacyProjectNav = z.object({
  state: z.object({
    projects: z.record(
      z.string(),
      z.object({ pinned: z.boolean().optional(), section: z.string().optional() }),
    ),
  }),
});
const legacyRemoteDirectories = z.record(z.string(), z.string());

function readLegacyJson<T>(key: string, schema: z.ZodType<T>): T | undefined {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function legacyWidth(key: string, accept: (value: number) => boolean, fallback: number): number {
  const stored = Number(localStorage.getItem(key));
  return Number.isFinite(stored) && accept(stored) ? stored : fallback;
}

const legacyKeys = [
  'wilthy.shell.sidebar-collapsed',
  'wilthy.project.open-target',
  'wilthy.mail.folders-collapsed',
  'wilthy.todo.show-completed',
  'wilthy.classroom.sidebarWidth',
  'wilthy.classroom.sidebarCollapsed',
  'wilthy.workspace.sidebarWidth',
  'wilthy.workspace.collapsed',
  'wilthy.nav-entries',
  'wilthy.project-nav',
  'wilthy.remote.lastDirectory',
];

function migrateLegacyPreferences(): string {
  const state: PreferenceValues = {
    shellSidebarCollapsed: localStorage.getItem('wilthy.shell.sidebar-collapsed') === 'true',
    projectOpenTarget:
      localStorage.getItem('wilthy.project.open-target') === 'explorer' ? 'explorer' : 'vscode',
    workspaceSidebarWidth: legacyWidth(
      'wilthy.workspace.sidebarWidth',
      (value) => value > 0,
      defaults.workspaceSidebarWidth,
    ),
    workspaceSidebarCollapsed: localStorage.getItem('wilthy.workspace.collapsed') === 'true',
    hiddenNavEntries:
      readLegacyJson('wilthy.nav-entries', legacyNavEntries)?.state.hidden ??
      defaults.hiddenNavEntries,
    projectNav:
      readLegacyJson('wilthy.project-nav', legacyProjectNav)?.state.projects ?? defaults.projectNav,
    remoteLastDirectory:
      readLegacyJson('wilthy.remote.lastDirectory', legacyRemoteDirectories) ??
      defaults.remoteLastDirectory,
  };
  const serialized = JSON.stringify({ state, version: 1 });
  localStorage.setItem(storageKey, serialized);
  for (const key of legacyKeys) localStorage.removeItem(key);
  return serialized;
}

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...defaults,
      setPreference: (key, value) => set({ [key]: value }),
      setNavEntryVisible: (id, visible) =>
        set((state) => ({
          hiddenNavEntries: visible
            ? state.hiddenNavEntries.filter((item) => item !== id)
            : [...new Set([...state.hiddenNavEntries, id])],
        })),
      patchProjectNav: (id, patch) =>
        set((state) => ({
          projectNav: { ...state.projectNav, [id]: { ...state.projectNav[id], ...patch } },
        })),
    }),
    {
      name: storageKey,
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name) ?? migrateLegacyPreferences(),
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      })),
    },
  ),
);

export function usePreferenceWidth(key: 'workspaceSidebarWidth') {
  const stored = usePreferences((state) => state[key]);
  const setPreference = usePreferences((state) => state.setPreference);
  return useResizableWidth(stored, (width) => setPreference(key, width));
}

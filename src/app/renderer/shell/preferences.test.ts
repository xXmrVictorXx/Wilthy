// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';

async function loadPreferences() {
  vi.resetModules();
  return (await import('./preferences')).usePreferences;
}

beforeEach(() => localStorage.clear());

it('旧键的值并入新 store，之后旧键被删', async () => {
  localStorage.setItem('wilthy.shell.sidebar-collapsed', 'true');
  localStorage.setItem('wilthy.project.open-target', 'explorer');
  localStorage.setItem('wilthy.mail.folders-collapsed', 'false');
  localStorage.setItem('wilthy.todo.show-completed', 'false');
  localStorage.setItem('wilthy.classroom.sidebarWidth', '280');
  localStorage.setItem('wilthy.classroom.sidebarCollapsed', '1');
  localStorage.setItem('wilthy.workspace.sidebarWidth', '220');
  localStorage.setItem('wilthy.workspace.collapsed', 'true');
  localStorage.setItem('wilthy.nav-entries', '{"state":{"hidden":["mail"]},"version":0}');
  localStorage.setItem('wilthy.project-nav', '{"state":{"projects":{"p1":{"pinned":true}}}}');
  localStorage.setItem('wilthy.remote.lastDirectory', '{"gpu-box":"/home/me"}');

  const state = (await loadPreferences()).getState();

  expect(state).toMatchObject({
    shellSidebarCollapsed: true,
    projectOpenTarget: 'explorer',
    workspaceSidebarWidth: 220,
    workspaceSidebarCollapsed: true,
    hiddenNavEntries: ['mail'],
    projectNav: { p1: { pinned: true } },
    remoteLastDirectory: { 'gpu-box': '/home/me' },
  });
  expect(Object.keys(localStorage)).toEqual(['wilthy.preferences']);
});

it('旧值不合法时取默认值', async () => {
  localStorage.setItem('wilthy.workspace.sidebarWidth', 'abc');
  localStorage.setItem('wilthy.nav-entries', 'not json');
  localStorage.setItem('wilthy.remote.lastDirectory', '[1]');

  expect((await loadPreferences()).getState()).toMatchObject({
    workspaceSidebarWidth: 300,
    hiddenNavEntries: [],
    remoteLastDirectory: {},
  });
});

it('新键已存在时不再读旧键', async () => {
  localStorage.setItem(
    'wilthy.preferences',
    '{"state":{"shellSidebarCollapsed":false},"version":1}',
  );
  localStorage.setItem('wilthy.shell.sidebar-collapsed', 'true');

  const state = (await loadPreferences()).getState();

  expect(state.shellSidebarCollapsed).toBe(false);
  expect(localStorage.getItem('wilthy.shell.sidebar-collapsed')).toBe('true');
});

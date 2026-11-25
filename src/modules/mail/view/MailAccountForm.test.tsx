// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MailAccountForm } from './MailAccountForm';
import { registerMailPreset, type MailPreset } from './presets';

const preset: MailPreset = {
  label: '学校邮箱',
  domain: 'school.edu',
  server: {
    imapHost: 'mail.school.edu',
    imapPort: 993,
    smtpHost: 'mail.school.edu',
    smtpPort: 465,
  },
  passwordHint: '统一身份密码',
};
registerMailPreset(preset);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function fill(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setValue.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit() {
  await act(async () =>
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
}

it('预设邮箱只填 @ 前面的部分，域名固定补上', async () => {
  const onSubmit = vi.fn();
  await act(async () =>
    root.render(<MailAccountForm error={null} onSubmit={onSubmit} submit={null} />),
  );
  expect(container.textContent).toContain('@school.edu');
  await fill('input[name=address]', 'me@example.com');
  await fill('input[type=password]', 'pw');
  await submit();
  expect(onSubmit).not.toHaveBeenCalled();

  await fill('input[name=address]', ' 202311079045 ');
  await submit();
  expect(onSubmit).toHaveBeenLastCalledWith({
    address: '202311079045@school.edu',
    password: 'pw',
    server: preset.server,
  });

  await fill('input[name=address]', 'Me@School.edu');
  await submit();
  expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ address: 'Me@School.edu' }));
});

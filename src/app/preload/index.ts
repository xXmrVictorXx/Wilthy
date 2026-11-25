import { contextBridge, webUtils } from 'electron';
// 版本号在构建时内联，升版后需重新构建。
import { version } from '../../../package.json';
import type { WilthyApi } from './api';
import { bridge } from './bridge';
import { windowApi } from './window';

contextBridge.exposeInMainWorld('wilthy', {
  platform: process.platform,
  pathForFile: (file: File) => webUtils.getPathForFile(file),
  bridge,
  version,
  updatedOnLaunch: process.argv.includes('--wilthy-updated'),
  window: windowApi,
} satisfies WilthyApi);

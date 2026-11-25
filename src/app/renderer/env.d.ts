import type { WilthyApi } from '../preload/api';

declare global {
  interface Window {
    wilthy?: WilthyApi;
  }
}

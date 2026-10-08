/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCKS: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_NETWORK_PROFILE: 'standard' | 'slow' | 'flaky' | 'offline';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
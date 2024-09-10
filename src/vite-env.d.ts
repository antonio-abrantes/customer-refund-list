/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_KEY: string;
  readonly VITE_BOT_NAME: string;
  readonly VITE_PHONE_FOR_TEST: string;
  // Adicione outras variáveis de ambiente que você tenha
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
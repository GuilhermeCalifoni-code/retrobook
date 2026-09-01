/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Origem completa da API quando ela NAO estiver no mesmo dominio do site.
   * Ex.: "https://retrobook-api.onrender.com/api". Vazio = mesma origem (/api).
   */
  readonly VITE_API_URL?: string;
  /** URL canonica publica, usada no SEO. Ex.: "https://retrobook.vercel.app" */
  readonly VITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

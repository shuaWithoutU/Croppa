import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Croppa',
  version: '0.1.0',
  description: 'Translate selected Simplified Chinese text into English locally.',
  action: {
    default_title: 'Start a Croppa capture',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+Shift+Y',
      },
      description: 'Start a Croppa capture',
    },
  },
  options_page: 'options.html',
  permissions: ['activeTab', 'offscreen', 'storage'],
  host_permissions: [
    'https://huggingface.co/*',
    'https://*.huggingface.co/*',
    'https://*.hf.co/*',
    'https://*.xethub.hf.co/*',
  ],
  content_security_policy: {
    extension_pages:
      "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://*.xethub.hf.co",
  },
});

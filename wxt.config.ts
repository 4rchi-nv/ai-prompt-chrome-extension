import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'PromptTune',
    version: '0.1.0',
    action: {
      default_title: 'PromptTune',
    },
    permissions: ['storage', 'clipboardWrite', 'tabs'],
    host_permissions: ['http://localhost:8000/*'],
  },
});


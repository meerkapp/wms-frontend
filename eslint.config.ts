import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVueI18n from '@intlify/eslint-plugin-vue-i18n'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

const vueI18nSettings = {
  'vue-i18n': {
    localeDir: './src/locales/*.json',
    messageSyntaxVersion: '^11.0.0',
  },
}

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/dev-dist/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  ...pluginVueI18n.configs['flat/base'].filter(
    (config) => config.name !== '@intlify/vue-i18n:base:setup:yaml',
  ),
  {
    name: 'app/i18n-source',
    files: ['**/*.{vue,ts,mts,tsx}'],
    settings: vueI18nSettings,
    rules: {
      '@intlify/vue-i18n/no-missing-keys': 'error',
    },
  },
  {
    name: 'app/i18n-locales',
    files: ['src/locales/*.json'],
    settings: vueI18nSettings,
    rules: {
      '@intlify/vue-i18n/no-duplicate-keys-in-locale': 'error',
      '@intlify/vue-i18n/no-missing-keys-in-other-locales': 'error',
      '@intlify/vue-i18n/valid-message-syntax': 'error',
    },
  },

  skipFormatting,
)

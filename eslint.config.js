import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    react: true,
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'ts/no-use-before-define': 'off',
      'react/purity': 'off',
      'style/eol-last': 'off',
      'react/exhaustive-deps': 'off',
      'ts/ban-ts-comment': 'off',
      'style/jsx-wrap-multilines': 'off',
      'style/jsx-curly-brace-presence': 'off',
    },
  },
  {
    files: [
      'pnpm-workspace.yaml',
    ],
    rules: {
      'pnpm/yaml-enforce-settings': 'off',
    },
  },
  {
    files: [
      'packages/**/package.json',
    ],
    rules: {
      'pnpm/json-valid-catalog': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    files: [
      'package.json',
    ],
    rules: {
      'pnpm/json-enforce-catalog': 'off',
    },
  },
)
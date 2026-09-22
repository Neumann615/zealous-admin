export type * from './contracts/common'
export type * from './contracts/enum-value'
export type * from './contracts/field-standard'
export type * from './contracts/quality-rule'
export type * from './contracts/table-metadata'
export type * from './contracts/word-root'
export {
  getMockEnumValueBatch,
  getMockEnumValueDetail,
  getMockEnumValueOptions,
  getMockEnumValuePage,
  MOCK_ENUM_VALUES,
  MOCK_METADATA_ENUM_CODES,
  MOCK_METADATA_SYSTEM_NAME,
  type MockMetadataEnumCode,
} from './mock/enum-values'
export {
  configureMetadataClient,
  metadataRequest,
  type MetadataRequestConfig,
  type MetadataRequester,
  type MetadataResult,
} from './runtime/client'
export {
  type MetadataFieldOption,
  normalizeEnumValueBatch,
  normalizeEnumValueDetail,
} from './runtime/enum-value'
export * from './services/enum-value'
export * from './services/field-standard'
export * from './services/quality-rule'
export * from './services/table-metadata'
export * from './services/word-root'

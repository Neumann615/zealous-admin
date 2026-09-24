import { http } from '@zealous-admin/layout/index'

export interface ArchitectureOverview {
  frontendModules: number
  backendModules: number
  dataTables: number
  apiCount: number
  permissionCount: number
}

export interface ArchitectureModule {
  name: string
  layer: string
  responsibility: string
  keyFiles: string[]
  dependencies: string[]
}

export interface RequestFlowNode {
  stage: string
  owner: string
  responsibility: string
  guarantee: string
}

export interface DatabaseColumn {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  primaryKey: boolean
}

export interface DatabaseIndex {
  name: string
  columns: string[]
  unique: boolean
  origin: string
  partial: boolean
}

export interface DatabaseForeignKey {
  column: string
  referenceTable: string
  referenceColumn: string
  onDelete: string | null
  onUpdate: string | null
}

export interface DatabaseTable {
  name: string
  description: string
  columns: DatabaseColumn[]
  indexes: DatabaseIndex[]
  foreignKeys: DatabaseForeignKey[]
}

export interface DatabaseDomain {
  code: string
  name: string
  description: string
  designPoints: string[]
  tables: DatabaseTable[]
}

export interface ApiEndpoint {
  method: string
  path: string
  permissions: string[]
}

export interface ApiModule {
  name: string
  routePrefix: string
  endpointCount: number
  permissionCount: number
  endpoints: ApiEndpoint[]
}

export interface ArchitectureResponse {
  overview: ArchitectureOverview
  frontendModules: ArchitectureModule[]
  backendModules: ArchitectureModule[]
  requestFlow: RequestFlowNode[]
  databaseDomains: DatabaseDomain[]
  apiMatrix: ApiModule[]
}

export function getSystemArchitectureAPI() {
  return http<ArchitectureResponse>({
    url: '/system/architecture',
    method: 'get',
  })
}

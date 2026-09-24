import { randomBytes } from 'node:crypto'
import { getDb } from '../../db'
import { now } from '../../lib/date'
import { BadRequestError, NotFoundError } from '../../lib/errors'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_METADATA_LENGTH = 255
const OBJECT_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

export interface SaveFormFileInput {
  content: Buffer
  fileName?: string
  fileType?: string
  uploadedBy?: string
}

export interface FormFileRecord {
  objectId: string
  fileName: string
  fileType: string
  fileSize: number
}

function normalizeFileName(fileName?: string) {
  const value = (fileName || '').trim()
  if (!value) {
    return 'unnamed'
  }
  if (value.length > MAX_METADATA_LENGTH) {
    throw new BadRequestError('文件名过长')
  }
  return value.replace(/[\r\n/\\:]/g, '_')
}

function normalizeFileType(fileType?: string) {
  const value = (fileType || '').replace(/[\r\n\t\0]/g, ' ').trim()
  if (value.length > MAX_METADATA_LENGTH) {
    throw new BadRequestError('文件类型过长')
  }
  return value || 'application/octet-stream'
}

export function saveFormFile(input: SaveFormFileInput): FormFileRecord {
  if (!input.content?.length) {
    throw new BadRequestError('上传文件不能为空')
  }
  if (input.content.length > MAX_FILE_SIZE) {
    throw new BadRequestError('上传文件不能超过 10MB')
  }

  const record = {
    objectId: randomBytes(16).toString('hex'),
    fileName: normalizeFileName(input.fileName),
    fileType: normalizeFileType(input.fileType),
    fileSize: input.content.length,
  }
  getDb().prepare(`
    INSERT INTO za_form_file (
      object_id, file_name, file_type, file_size, content, uploaded_by, create_time
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.objectId,
    record.fileName,
    record.fileType,
    record.fileSize,
    input.content,
    input.uploadedBy || '',
    now(),
  )
  return record
}

export function getFormFile(objectId: string) {
  if (!OBJECT_ID_PATTERN.test(objectId)) {
    throw new NotFoundError('文件不存在')
  }
  const row = getDb().prepare(`
    SELECT object_id, file_name, file_type, file_size, content
    FROM za_form_file
    WHERE object_id = ?
  `).get(objectId) as {
    object_id: string
    file_name: string
    file_type: string
    file_size: number
    content: Buffer
  } | undefined
  if (!row) {
    throw new NotFoundError('文件不存在')
  }
  return {
    objectId: row.object_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    content: Buffer.from(row.content),
  }
}

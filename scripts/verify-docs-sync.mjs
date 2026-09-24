import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const indexPath = path.join(docsRoot, 'superpowers', 'index.md')
const changelogPath = path.join(docsRoot, 'CHANGELOG.md')
const configPath = path.join(docsRoot, '.vitepress', 'config.ts')
const errors = []

function collectMarkdownFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry)
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath))
    }
    else if (entry.endsWith('.md') && fullPath !== indexPath) {
      files.push(fullPath)
    }
  }
  return files
}

for (const requiredPath of [indexPath, changelogPath, configPath]) {
  if (!existsSync(requiredPath))
    errors.push(`缺少文档同步文件：${path.relative(root, requiredPath)}`)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const managedFiles = collectMarkdownFiles(path.join(docsRoot, 'superpowers'))
const indexContents = readFileSync(indexPath, 'utf8')
const changelogContents = readFileSync(changelogPath, 'utf8')
const configContents = readFileSync(configPath, 'utf8')

for (const file of managedFiles) {
  const relativeLink = path.relative(path.dirname(indexPath), file).replaceAll('\\', '/')
  if (!indexContents.includes(`(${relativeLink})`) && !indexContents.includes(`(./${relativeLink})`))
    errors.push(`superpowers 文档未列入索引：${relativeLink}`)
}

const markdownLinks = [...indexContents.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)].map(match => match[1])
for (const link of markdownLinks) {
  const target = path.resolve(path.dirname(indexPath), link)
  if (!existsSync(target))
    errors.push(`superpowers 索引存在坏链接：${link}`)
}

if (!configContents.includes('\'/superpowers/\''))
  errors.push('docs/.vitepress/config.ts 缺少 /superpowers/ 侧边栏入口')

const documentDates = managedFiles
  .map(file => /^(\d{4}-\d{2}-\d{2})/.exec(path.basename(file))?.[1])
  .filter(Boolean)
  .sort()
const latestDocumentDate = documentDates.at(-1)
const changelogDates = [...changelogContents.matchAll(/^## (\d{4}-\d{2}-\d{2})$/gm)].map(match => match[1])

if (latestDocumentDate && !changelogDates.includes(latestDocumentDate))
  errors.push(`CHANGELOG 缺少 ${latestDocumentDate} 的 superpowers 变更记录`)

for (let index = 1; index < changelogDates.length; index++) {
  if (changelogDates[index] > changelogDates[index - 1]) {
    errors.push(`CHANGELOG 日期倒序错误：${changelogDates[index]} 应位于 ${changelogDates[index - 1]} 之前`)
    break
  }
}

if (errors.length > 0) {
  console.error(`文档同步校验失败：\n${errors.join('\n')}`)
  process.exit(1)
}

process.stdout.write(`文档同步校验通过：superpowers ${managedFiles.length} 篇，最新变更 ${latestDocumentDate}\n`)

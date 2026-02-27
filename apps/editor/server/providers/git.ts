import type { SourceProvider, Page, PageVersion } from './types'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

interface GitConfig {
  repoPath: string
  branch: string
  pagesDir: string
}

function getConfig(): GitConfig {
  const repoPath = process.env.GIT_REPO_PATH
  if (!repoPath) {
    throw new Error('GIT_REPO_PATH environment variable is required for Git provider')
  }
  return {
    repoPath,
    branch: process.env.GIT_BRANCH || 'main',
    pagesDir: process.env.GIT_PAGES_DIR || 'pages',
  }
}

export class GitSourceProvider implements SourceProvider {
  private config: GitConfig

  constructor() {
    this.config = getConfig()
  }

  private get pagesPath(): string {
    return join(this.config.repoPath, this.config.pagesDir)
  }

  private pagePath(name: string): string {
    return join(this.pagesPath, `${name}.yaml`)
  }

  private git(args: string): string {
    return execSync(`git -C ${this.config.repoPath} ${args}`, { encoding: 'utf-8' }).trim()
  }

  private async readYaml(filePath: string): Promise<Page | null> {
    try {
      const { parse } = await import('yaml')
      const content = await fs.readFile(filePath, 'utf-8')
      return parse(content) as Page
    } catch {
      return null
    }
  }

  private async writeYaml(filePath: string, data: Page): Promise<void> {
    const { stringify } = await import('yaml')
    await fs.mkdir(join(filePath, '..'), { recursive: true })
    await fs.writeFile(filePath, stringify(data), 'utf-8')
  }

  async listPages(): Promise<Page[]> {
    try {
      const files = await fs.readdir(this.pagesPath)
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      const pages: Page[] = []
      for (const file of yamlFiles) {
        const page = await this.readYaml(join(this.pagesPath, file))
        if (page) pages.push(page)
      }
      return pages
    } catch {
      return []
    }
  }

  async getPage(name: string): Promise<Page | null> {
    return this.readYaml(this.pagePath(name))
  }

  async savePage(page: Page): Promise<Page> {
    const filePath = this.pagePath(page.metadata.name)
    await this.writeYaml(filePath, page)
    this.git(`add ${filePath}`)
    this.git(`commit -m "Update page ${page.metadata.name}"`)
    return page
  }

  async deletePage(name: string): Promise<void> {
    const filePath = this.pagePath(name)
    try {
      await fs.unlink(filePath)
      this.git(`add ${filePath}`)
      this.git(`commit -m "Delete page ${name}"`)
    } catch {
      throw new Error(`Page '${name}' not found`)
    }
  }

  async listVersions(name: string): Promise<PageVersion[]> {
    const filePath = this.pagePath(name)
    const relativePath = join(this.config.pagesDir, `${name}.yaml`)
    try {
      const log = this.git(`log --format="%H %aI" -- ${relativePath}`)
      if (!log) return []
      const { parse } = await import('yaml')
      const versions: PageVersion[] = []
      for (const line of log.split('\n')) {
        const [hash, timestamp] = line.split(' ', 2)
        if (!hash || !timestamp) continue
        try {
          const content = this.git(`show ${hash}:${relativePath}`)
          versions.push({
            version: hash,
            timestamp,
            content: parse(content)?.spec?.content ?? null,
          })
        } catch {
          continue
        }
      }
      return versions
    } catch {
      return []
    }
  }

  async restoreVersion(name: string, version: string): Promise<Page> {
    const relativePath = join(this.config.pagesDir, `${name}.yaml`)
    const { parse } = await import('yaml')

    let oldContent: string
    try {
      oldContent = this.git(`show ${version}:${relativePath}`)
    } catch {
      throw new Error(`Version '${version}' not found for page '${name}'`)
    }

    const oldPage = parse(oldContent) as Page
    if (!oldPage) {
      throw new Error(`Could not parse version '${version}' of page '${name}'`)
    }

    await this.writeYaml(this.pagePath(name), oldPage)
    this.git(`add ${this.pagePath(name)}`)
    this.git(`commit -m "Restore page ${name} to version ${version.substring(0, 8)}"`)

    return oldPage
  }
}

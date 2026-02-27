export interface Page {
  metadata: { name: string; namespace?: string }
  spec?: {
    key?: string
    title?: string
    description?: string
    content?: unknown
    parentRef?: { name: string } | null
    publish?: { fromDate?: string; toDate?: string }
  }
}

export interface PageVersion {
  version: string
  timestamp: string
  content: unknown
}

export interface SourceProvider {
  listPages(): Promise<Page[]>
  getPage(name: string): Promise<Page | null>
  savePage(page: Page): Promise<Page>
  deletePage(name: string): Promise<void>
  listVersions(name: string): Promise<PageVersion[]>
  restoreVersion(name: string, version: string): Promise<Page>
}

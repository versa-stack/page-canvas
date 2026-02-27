import type { SourceProvider, Page, PageVersion } from './types'

interface MongoDBConfig {
  uri: string
  database: string
}

function getConfig(): MongoDBConfig {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required for MongoDB provider')
  }
  return {
    uri,
    database: process.env.MONGODB_DATABASE || 'page-canvas',
  }
}

export class MongoDBSourceProvider implements SourceProvider {
  private config: MongoDBConfig
  private client: any = null
  private db: any = null

  constructor() {
    this.config = getConfig()
  }

  private async getDb() {
    if (this.db) return this.db
    const { MongoClient } = await import('mongodb')
    this.client = new MongoClient(this.config.uri)
    await this.client.connect()
    this.db = this.client.db(this.config.database)
    return this.db
  }

  private async pagesCollection() {
    const db = await this.getDb()
    return db.collection('pages')
  }

  private async versionsCollection() {
    const db = await this.getDb()
    return db.collection('page_versions')
  }

  async listPages(): Promise<Page[]> {
    const col = await this.pagesCollection()
    const docs = await col.find({}).toArray()
    return docs.map((doc: any) => ({
      metadata: { name: doc.name, namespace: doc.namespace },
      spec: doc.spec,
    }))
  }

  async getPage(name: string): Promise<Page | null> {
    const col = await this.pagesCollection()
    const doc = await col.findOne({ name })
    if (!doc) return null
    return {
      metadata: { name: doc.name, namespace: doc.namespace },
      spec: doc.spec,
    }
  }

  async savePage(page: Page): Promise<Page> {
    const col = await this.pagesCollection()
    const versionsCol = await this.versionsCollection()
    const name = page.metadata.name

    const existing = await col.findOne({ name })
    if (existing) {
      await versionsCol.insertOne({
        name,
        version: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        content: existing.spec?.content,
      })
    }

    await col.updateOne(
      { name },
      {
        $set: {
          name,
          namespace: page.metadata.namespace || 'default',
          spec: page.spec,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    )

    return page
  }

  async deletePage(name: string): Promise<void> {
    const col = await this.pagesCollection()
    const versionsCol = await this.versionsCollection()
    await col.deleteOne({ name })
    await versionsCol.deleteMany({ name })
  }

  async listVersions(name: string): Promise<PageVersion[]> {
    const versionsCol = await this.versionsCollection()
    const docs = await versionsCol.find({ name }).sort({ timestamp: -1 }).toArray()
    return docs.map((doc: any) => ({
      version: doc.version,
      timestamp: doc.timestamp,
      content: doc.content,
    }))
  }

  async restoreVersion(name: string, version: string): Promise<Page> {
    const versionsCol = await this.versionsCollection()
    const versionDoc = await versionsCol.findOne({ name, version })
    if (!versionDoc) {
      throw new Error(`Version '${version}' not found for page '${name}'`)
    }

    const col = await this.pagesCollection()
    const current = await col.findOne({ name })
    if (!current) {
      throw new Error(`Page '${name}' not found`)
    }

    await versionsCol.insertOne({
      name,
      version: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      content: current.spec?.content,
    })

    await col.updateOne(
      { name },
      { $set: { 'spec.content': versionDoc.content, updatedAt: new Date() } },
    )

    return {
      metadata: { name: current.name, namespace: current.namespace },
      spec: { ...current.spec, content: versionDoc.content },
    }
  }
}

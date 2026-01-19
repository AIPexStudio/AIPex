import { zenfs } from '../../../lib/vm/zenfs-manager'
import {
  parseSkillMetadataFromZip,
  parseSkillMetadata,
  extractZipToFS,
  getSkillScripts,
  getSkillReferences,
  getSkillAssets,
  SkillConflictError
} from '../utils/zip-utils'

export { SkillConflictError }

// Simple in-memory file system implementation for browser compatibility
// Supports namespace isolation for multiple skills
class SimpleFileSystem {
  private files: Map<string, string | ArrayBuffer> = new Map()
  private dirs: Set<string> = new Set()

  existsSync(path: string): boolean {
    return this.files.has(path) || this.dirs.has(path)
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    if (options?.recursive) {
      const parts = path.split('/')
      let currentPath = ''
      for (const part of parts) {
        if (part) {
          currentPath = currentPath ? `${currentPath}/${part}` : part
          this.dirs.add(currentPath)
        }
      }
    } else {
      this.dirs.add(path)
    }
  }

  writeFileSync(path: string, content: string | ArrayBuffer): void {
    this.files.set(path, content)
  }

  readFileSync(path: string, _encoding?: string): string | ArrayBuffer {
    const content = this.files.get(path)
    if (!content) {
      throw new Error(`File not found: ${path}`)
    }
    return content
  }

  statSync(path: string): { isDirectory(): boolean } {
    return {
      isDirectory: () => this.dirs.has(path)
    }
  }

  readdirSync(path: string): string[] {
    const files: string[] = []
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(path + '/')) {
        const relativePath = filePath.substring(path.length + 1)
        if (!relativePath.includes('/')) {
          files.push(relativePath)
        }
      }
    }
    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(path + '/')) {
        const relativePath = dirPath.substring(path.length + 1)
        if (!relativePath.includes('/')) {
          files.push(relativePath)
        }
      }
    }
    return files
  }

  reset(): void {
    this.files.clear()
    this.dirs.clear()
  }

  /**
   * Clear files and directories for a specific skill namespace
   * This allows loading/unloading skills without affecting others
   */
  clearSkillNamespace(skillId: string): void {
    const prefix = `skill_${skillId}/`

    // Remove all files in this namespace
    for (const filePath of Array.from(this.files.keys())) {
      if (filePath.startsWith(prefix)) {
        this.files.delete(filePath)
      }
    }

    // Remove all directories in this namespace
    for (const dirPath of Array.from(this.dirs)) {
      if (dirPath.startsWith(prefix)) {
        this.dirs.delete(dirPath)
      }
    }
  }

  /**
   * Get all files in a specific namespace
   */
  getSkillFiles(skillId: string): Map<string, string | ArrayBuffer> {
    const prefix = `skill_${skillId}/`
    const skillFiles = new Map<string, string | ArrayBuffer>()

    for (const [filePath, content] of this.files.entries()) {
      if (filePath.startsWith(prefix)) {
        // Return path without the namespace prefix
        const relativePath = filePath.substring(prefix.length)
        skillFiles.set(relativePath, content)
      }
    }

    return skillFiles
  }

  /**
   * Get all paths (both files and dirs) in a directory, recursively
   */
  getAllPathsInDir(dirPath: string): string[] {
    const paths: string[] = []
    const normalizedDir = dirPath.endsWith('/') ? dirPath : dirPath + '/'

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalizedDir)) {
        paths.push(filePath)
      }
    }

    for (const dir of this.dirs) {
      if (dir.startsWith(normalizedDir)) {
        paths.push(dir)
      }
    }

    return paths
  }
}

// Create a simple file system instance
export const simpleFS = new SimpleFileSystem()

export interface SkillMetadata {
  id: string // Now uses skill name as ID
  name: string
  description: string
  version: string
  uploadedAt: number
  enabled: boolean
  // Files are stored in ZenFS, not in metadata anymore
}

export interface ParsedSkill {
  metadata: SkillMetadata
  skillMdContent: string
  scripts: string[]
  references: string[]
  assets: string[]
}

const DB_NAME = 'AIPexSkills'
const DB_VERSION = 1
const STORE_NAME = 'skills'

export class SkillStorage {
  private db: IDBDatabase | null = null
  private initialized = false
  private lastSyncTime = 0
  private syncInterval = 5000 // 5 seconds
  private syncPromise: Promise<{ added: number; skipped: number; failed: number }> | null = null

  async initialize(): Promise<void> {
    if (this.initialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.initialized = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('name', 'name', { unique: false })
          store.createIndex('enabled', 'enabled', { unique: false })
        }
      }
    })
  }

  async saveSkill(zipBlob: Blob, replace: boolean = false): Promise<SkillMetadata> {
    await this.initialize()

    // Parse metadata from ZIP to get skill name
    const parsedMetadata = await parseSkillMetadataFromZip(zipBlob)
    const skillName = parsedMetadata.name

    // Use skill name as ID
    const id = skillName

    // Check if skill already exists
    const targetPath = zenfs.getSkillPath(id)
    const exists = await zenfs.exists(targetPath)

    if (exists && !replace) {
      throw new SkillConflictError(skillName)
    }

    // If replacing, delete existing skill first
    if (exists && replace) {
      await zenfs.rm(targetPath, { recursive: true })
    }

    // Extract ZIP directly to ZenFS
    await extractZipToFS(zipBlob, targetPath, false)

    // Create lightweight metadata
    const skillMetadata: SkillMetadata = {
      id,
      name: skillName,
      description: parsedMetadata.description,
      version: parsedMetadata.version,
      uploadedAt: Date.now(),
      enabled: true
    }

    // Save metadata to IndexedDB
    await this.saveToIndexedDB(skillMetadata)

    console.log(`✅ Skill saved: ${skillName} at ${targetPath}`)
    return skillMetadata
  }

  async loadSkill(skillId: string): Promise<ParsedSkill> {
    await this.initialize()

    // Get metadata from IndexedDB
    const metadata = await this.getFromIndexedDB(skillId)
    if (!metadata) {
      throw new Error(`Skill not found: ${skillId}`)
    }

    // Read SKILL.md content from ZenFS
    const skillPath = zenfs.getSkillPath(skillId)
    const skillMdPath = `${skillPath}/SKILL.md`

    let skillMdContent = ''
    try {
      skillMdContent = await zenfs.readFile(skillMdPath, 'utf8') as string
    } catch (error) {
      console.error(`Failed to read SKILL.md for ${skillId}:`, error)
    }

    // Get file lists from ZenFS
    const scripts = await getSkillScripts(skillPath)
    const references = await getSkillReferences(skillPath)
    const assets = await getSkillAssets(skillPath)

    return {
      metadata,
      skillMdContent,
      scripts,
      references,
      assets
    }
  }

  async deleteSkill(skillId: string): Promise<void> {
    await this.initialize()

    // Delete from IndexedDB
    await new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(skillId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    // Delete skill directory from ZenFS
    const skillPath = zenfs.getSkillPath(skillId)
    try {
      const exists = await zenfs.exists(skillPath)
      if (exists) {
        await zenfs.rm(skillPath, { recursive: true })
        console.log(`✅ Deleted skill files from ZenFS: ${skillPath}`)
      }
    } catch (error) {
      console.error(`Failed to delete skill files from ZenFS: ${error}`)
      // Don't throw - metadata was deleted successfully
    }
  }

  async listSkills(): Promise<SkillMetadata[]> {
    await this.initialize()

    // Auto-sync from ZenFS if cache expired
    const now = Date.now()
    if (now - this.lastSyncTime > this.syncInterval) {
      await this.syncSkillsFromZenFS()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getSkillMetadata(skillId: string): Promise<SkillMetadata | null> {
    await this.initialize()
    return this.getFromIndexedDB(skillId)
  }

  async saveSkillMetadata(skill: SkillMetadata): Promise<void> {
    await this.initialize()
    return this.saveToIndexedDB(skill)
  }

  async updateSkill(skillId: string, updates: Partial<SkillMetadata>): Promise<void> {
    await this.initialize()

    const existing = await this.getFromIndexedDB(skillId)
    if (!existing) {
      throw new Error(`Skill not found: ${skillId}`)
    }

    const updated = { ...existing, ...updates }
    await this.saveToIndexedDB(updated)
  }

  async getSkillFile(skillId: string, filePath: string): Promise<string | ArrayBuffer | null> {
    await this.initialize()

    // Read file directly from ZenFS
    const skillPath = zenfs.getSkillPath(skillId)
    const fullPath = `${skillPath}/${filePath}`

    try {
      const exists = await zenfs.exists(fullPath)
      if (!exists) {
        return null
      }

      // Try to read as text first
      const isText = /\.(md|txt|js|ts|json|css|html|xml|yaml|yml)$/i.test(filePath)
      if (isText) {
        return await zenfs.readFile(fullPath, 'utf8') as string
      } else {
        const buffer = await zenfs.readFile(fullPath)
        // Convert Buffer to ArrayBuffer
        if (buffer instanceof Buffer) {
          // Use Uint8Array's buffer property to get underlying ArrayBuffer
          const uint8Array = new Uint8Array(buffer)
          return uint8Array.buffer as ArrayBuffer
        }
        return buffer as unknown as ArrayBuffer
      }
    } catch (error) {
      console.error(`Failed to read skill file ${fullPath}:`, error)
      return null
    }
  }

  /**
   * Scan ZenFS /skills directory for all skills
   * Returns skill metadata for all valid skills found
   */
  private async scanZenFSForSkills(): Promise<SkillMetadata[]> {
    const skills: SkillMetadata[] = []
    const skillsPath = '/skills'

    try {
      // Ensure ZenFS is initialized
      await zenfs.initialize()

      // Check if skills directory exists
      const skillsDirExists = await zenfs.exists(skillsPath)
      if (!skillsDirExists) {
        console.log('[SkillStorage] /skills directory does not exist yet')
        return skills
      }

      // List all entries in /skills
      const entries = await zenfs.readdir(skillsPath)

      for (const entry of entries) {
        try {
          const skillPath = `${skillsPath}/${entry}`
          const skillMdPath = `${skillPath}/SKILL.md`

          // Check if this is a directory with SKILL.md
          const skillMdExists = await zenfs.exists(skillMdPath)
          if (!skillMdExists) {
            continue
          }

          // Read and parse SKILL.md
          const content = await zenfs.readFile(skillMdPath, 'utf8') as string
          const parsedMetadata = parseSkillMetadata(content)

          // Get file stats for upload timestamp
          let uploadedAt = Date.now()
          try {
            const stats = await zenfs.stat(skillMdPath)
            // Convert Date to timestamp if needed
            uploadedAt = stats.mtime instanceof Date ? stats.mtime.getTime() : (stats.mtime || Date.now())
          } catch {
            // Use current time if stats not available
          }

          skills.push({
            id: entry, // Use directory name as ID
            name: parsedMetadata.name,
            description: parsedMetadata.description,
            version: parsedMetadata.version,
            uploadedAt,
            enabled: true
          })

          console.log(`[SkillStorage] Found skill in ZenFS: ${entry}`)
        } catch (error) {
          console.warn(`[SkillStorage] Failed to process skill ${entry}:`, error)
          // Skip this skill and continue
        }
      }
    } catch (error) {
      console.error('[SkillStorage] Failed to scan ZenFS for skills:', error)
    }

    return skills
  }

  /**
   * Sync skills from ZenFS to IndexedDB
   * Only adds skills that exist in ZenFS but not in IndexedDB
   */
  private async syncSkillsFromZenFS(): Promise<{
    added: number
    skipped: number
    failed: number
  }> {
    // Prevent concurrent syncs - reuse existing promise
    if (this.syncPromise) {
      await this.syncPromise
      return { added: 0, skipped: 0, failed: 0 }
    }

    this.syncPromise = this._doSync()

    try {
      const result = await this.syncPromise
      return result
    } finally {
      this.syncPromise = null
    }
  }

  private async _doSync(): Promise<{
    added: number
    skipped: number
    failed: number
  }> {
    const stats = { added: 0, skipped: 0, failed: 0 }

    try {
      console.log('[SkillStorage] Starting sync from ZenFS...')

      // Scan ZenFS for all skills
      const zenfsSkills = await this.scanZenFSForSkills()

      // Get existing skills from IndexedDB
      const existingSkills = await new Promise<SkillMetadata[]>((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database not initialized'))
          return
        }

        const transaction = this.db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const existingIds = new Set(existingSkills.map(s => s.id))

      // Find skills that only exist in ZenFS
      const newSkills = zenfsSkills.filter(skill => !existingIds.has(skill.id))

      // Add new skills to IndexedDB
      for (const skill of newSkills) {
        try {
          await this.saveToIndexedDB(skill)
          stats.added++
          console.log(`[SkillStorage] Added skill from ZenFS: ${skill.name}`)
        } catch (error) {
          console.error(`[SkillStorage] Failed to add skill ${skill.name}:`, error)
          stats.failed++
        }
      }

      stats.skipped = existingIds.size

      // Update last sync time
      this.lastSyncTime = Date.now()

      console.log(`[SkillStorage] Sync completed: ${stats.added} added, ${stats.skipped} skipped, ${stats.failed} failed`)
    } catch (error) {
      console.error('[SkillStorage] Sync failed:', error)
    }

    return stats
  }

  /**
   * Create a new skill from ZenFS directory
   * This is used when scripts create new skills programmatically
   */
  async createSkillFromZenFS(
    name: string,
    description: string,
    version: string,
    sourcePath: string
  ): Promise<SkillMetadata> {
    await this.initialize()

    // Verify source path exists in ZenFS
    const exists = await zenfs.exists(sourcePath)
    if (!exists) {
      throw new Error(`Source path not found in ZenFS: ${sourcePath}`)
    }

    // Verify SKILL.md exists
    const skillMdPath = `${sourcePath}/SKILL.md`
    const skillMdExists = await zenfs.exists(skillMdPath)
    if (!skillMdExists) {
      throw new Error('SKILL.md not found in source path')
    }

    // Use skill name as ID
    const id = name
    const targetPath = zenfs.getSkillPath(id)

    // Check if skill already exists
    const targetExists = await zenfs.exists(targetPath)
    if (targetExists) {
      throw new SkillConflictError(name)
    }

    // Copy files from source to target
    // For now, we'll just rename/move the directory
    // Note: This assumes the source is a temporary location
    try {
      await zenfs.rename(sourcePath, targetPath)
    } catch (error) {
      // If rename fails, we might need to copy files manually
      console.error('Failed to rename directory, attempting copy:', error)
      throw new Error(`Failed to create skill from ZenFS: ${error}`)
    }

    // Create metadata
    const skillMetadata: SkillMetadata = {
      id,
      name,
      description,
      version,
      uploadedAt: Date.now(),
      enabled: true
    }

    // Save to IndexedDB
    await this.saveToIndexedDB(skillMetadata)

    console.log(`✅ Created skill '${name}' from ZenFS path: ${sourcePath}`)
    return skillMetadata
  }

  private async saveToIndexedDB(skill: SkillMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(skill)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async getFromIndexedDB(skillId: string): Promise<SkillMetadata | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(skillId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

}

// Export singleton instance
export const skillStorage = new SkillStorage()

const fs = require('node:fs/promises')
const path = require('node:path')

class JsonFileDataStore {
  constructor(filePath) {
    this.type = 'json'
    this.filePath = filePath || path.resolve(__dirname, '..', '..', 'data', 'items.json')
  }

  async listItems() {
    return this.#readItems()
  }

  async addItem(name) {
    const items = await this.#readItems()
    const item = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    }

    items.push(item)
    await this.#writeItems(items)
    return item
  }

  async getStatus() {
    return { configured: true, filePath: this.filePath }
  }

  async #readItems() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []
      }

      throw error
    }
  }

  async #writeItems(items) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2))
  }
}

module.exports = { JsonFileDataStore }

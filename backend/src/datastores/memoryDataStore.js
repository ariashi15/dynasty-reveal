class MemoryDataStore {
  constructor(seedItems = []) {
    this.type = 'memory'
    this.items = [...seedItems]
  }

  async listItems() {
    return [...this.items]
  }

  async addItem(name) {
    const item = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    }

    this.items.push(item)
    return item
  }

  async getStatus() {
    return { configured: true }
  }
}

module.exports = { MemoryDataStore }

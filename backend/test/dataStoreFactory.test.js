const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const { createDataStore } = require('../src/datastores/createDataStore')

test('creates a memory datastore by default', async () => {
  const store = createDataStore({ type: 'memory' })
  const created = await store.addItem('Dynasty reveal')
  const items = await store.listItems()

  assert.equal(store.type, 'memory')
  assert.equal(items.length, 1)
  assert.equal(items[0].id, created.id)
})

test('creates a json datastore and persists data', async () => {
  const tempFile = path.join(os.tmpdir(), `dynasty-reveal-${Date.now()}.json`)
  const store = createDataStore({ type: 'json', jsonFilePath: tempFile })

  await store.addItem('Persisted entry')
  const storedData = JSON.parse(await fs.readFile(tempFile, 'utf-8'))

  assert.equal(store.type, 'json')
  assert.equal(storedData.length, 1)
  assert.equal(storedData[0].name, 'Persisted entry')

  await fs.unlink(tempFile)
})

test('throws for unsupported datastore type', () => {
  assert.throws(() => createDataStore({ type: 'unknown' }), /Unsupported data store type/)
})

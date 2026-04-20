const express = require('express')
const { createDataStore } = require('./datastores/createDataStore')

function createApp(options = {}) {
  const app = express()
  const dataStore = options.dataStore || createDataStore(options)

  app.use(express.json())

  app.get('/api/health', async (_req, res, next) => {
    try {
      const status = await dataStore.getStatus()
      res.json({ ok: true, dataStore: dataStore.type, ...status })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/items', async (_req, res, next) => {
    try {
      const items = await dataStore.listItems()
      res.json({ items })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/items', async (req, res, next) => {
    try {
      const name = req.body?.name

      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'name is required' })
      }

      const item = await dataStore.addItem(name.trim())
      res.status(201).json({ item })
    } catch (error) {
      next(error)
    }
  })

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({ error: error.message || 'Internal Server Error' })
  })

  return app
}

module.exports = { createApp }

const { GoogleSheetsDataStore } = require('./googleSheetsDataStore')
const { JsonFileDataStore } = require('./jsonFileDataStore')
const { MemoryDataStore } = require('./memoryDataStore')

function createDataStore(options = {}) {
  const type = options.type || process.env.DATA_STORE || 'memory'

  switch (type) {
    case 'memory':
      return new MemoryDataStore(options.seedItems)
    case 'json':
      return new JsonFileDataStore(options.jsonFilePath)
    case 'googleSheets':
      return new GoogleSheetsDataStore(options.googleConfig)
    default:
      throw new Error(`Unsupported data store type: ${type}`)
  }
}

module.exports = { createDataStore }

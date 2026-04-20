const { google } = require('googleapis')

class GoogleSheetsDataStore {
  constructor(config = process.env) {
    this.type = 'googleSheets'
    this.spreadsheetId = config.GOOGLE_SHEETS_SPREADSHEET_ID
    this.range = config.GOOGLE_SHEETS_RANGE || 'Items!A:C'
    this.credentials = {
      client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: config.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
  }

  async listItems() {
    if (!this.#isConfigured()) {
      return []
    }

    const sheets = await this.#createSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: this.range,
    })

    return (response.data.values || []).map(([id, name, createdAt]) => ({
      id,
      name,
      createdAt,
    }))
  }

  async addItem(name) {
    if (!this.#isConfigured()) {
      const error = new Error('Google Sheets datastore is not configured')
      error.statusCode = 503
      throw error
    }

    const item = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    }

    const sheets = await this.#createSheetsClient()
    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[item.id, item.name, item.createdAt]],
      },
    })

    return item
  }

  async getStatus() {
    return {
      configured: this.#isConfigured(),
      spreadsheetId: this.spreadsheetId || null,
      range: this.range,
    }
  }

  #isConfigured() {
    return Boolean(this.spreadsheetId && this.credentials.client_email && this.credentials.private_key)
  }

  async #createSheetsClient() {
    const auth = new google.auth.GoogleAuth({
      credentials: this.credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const authClient = await auth.getClient()
    return google.sheets({ version: 'v4', auth: authClient })
  }
}

module.exports = { GoogleSheetsDataStore }

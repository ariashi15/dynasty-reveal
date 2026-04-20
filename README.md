# dynasty-reveal

Simple web app starter with:

- **Frontend**: React + Vite (`/frontend`)
- **Backend**: Express API with pluggable datastore adapters (`/backend`)

## Run locally

1. Start backend:

```bash
cd /home/runner/work/dynasty-reveal/dynasty-reveal/backend
npm install
npm start
```

2. Start frontend (new terminal):

```bash
cd /home/runner/work/dynasty-reveal/dynasty-reveal/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api/*` to backend `http://localhost:3001`.

## Datastore options

Set `DATA_STORE` in backend before starting:

- `memory` (default): in-memory storage
- `json`: stores records in a local JSON file (`backend/data/items.json` by default)
- `googleSheets`: stores records in Google Sheets

### Google Sheets environment variables

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_RANGE` (optional, default: `Items!A:C`)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

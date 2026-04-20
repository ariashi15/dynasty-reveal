import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadItems = async () => {
      try {
        const response = await fetch('/api/items')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load items')
        }

        if (isMounted) {
          setItems(data.items || [])
          setError('')
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadItems()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!name.trim()) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add item')
      }

      setItems((existingItems) => [data.item, ...existingItems])
      setName('')
      setError('')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app">
      <h1>Dynasty Reveal</h1>
      <p className="subtitle">React + Vite frontend with a datastore-flexible backend API.</p>

      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="itemName">New item</label>
        <div className="form-row">
          <input
            id="itemName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add an item"
          />
          <button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Add'}
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading items...</p>
      ) : (
        <ul className="items">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {items.length === 0 && <li className="empty">No items yet.</li>}
        </ul>
      )}
    </main>
  )
}

export default App

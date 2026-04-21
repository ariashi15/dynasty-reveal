import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import fireLogoSvg from './assets/dynasty-logos/firelogo-white.svg'
import waterLogoSvg from './assets/dynasty-logos/waterlogo-white.svg'
import earthLogoSvg from './assets/dynasty-logos/earthlogo-white.svg'
import windLogoSvg from './assets/dynasty-logos/windlogo-white.svg'

type Dynasty = 'fire' | 'water' | 'earth' | 'wind'

type UserNode = {
  email: string
  name: string
  dynasty: Dynasty
  littles: string[]
}

type UsersPayload = {
  users: Record<string, UserNode>
}

type Point = {
  x: number
  y: number
}

type FamilyGroup = {
  rootId: string
  positions: Record<string, Point>
  connectors: Array<{ from: Point; to: Point }>
  bounds: { left: number; top: number; width: number; height: number }
}

const DYNASTIES: Dynasty[] = ['fire', 'water', 'earth', 'wind']

const DYNASTY_STYLE: Record<Dynasty, { label: string; accent: string; glow: string }> = {
  fire: { label: 'Fire', accent: '#ce7871', glow: '#ce7871' },
  water: { label: 'Water', accent: '#77a6e4', glow: '#77a6e4' },
  earth: { label: 'Earth', accent: '#7eb56f', glow: '#7eb56f' },
  wind: { label: 'Wind', accent: '#eec95f', glow: '#eec95f' },
}

const DYNASTY_LOGO_SVG: Record<Dynasty, string> = {
  fire: fireLogoSvg,
  water: waterLogoSvg,
  earth: earthLogoSvg,
  wind: windLogoSvg,
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function getDynastyMembers(users: Record<string, UserNode>, dynasty: Dynasty) {
  return Object.entries(users)
    .filter(([, user]) => user.dynasty === dynasty)
    .map(([id]) => id)
}

function buildFamilyGroups(users: Record<string, UserNode>, dynasty: Dynasty) {
  const members = new Set(getDynastyMembers(users, dynasty))
  const parentByChild = new Map<string, string>()

  for (const [id, user] of Object.entries(users)) {
    if (user.dynasty !== dynasty) {
      continue
    }

    for (const littleId of user.littles) {
      if (members.has(littleId)) {
        parentByChild.set(littleId, id)
      }
    }
  }

  const roots = [...members].filter((id) => !parentByChild.has(id))
  const seen = new Set<string>()
  const nodeWidth = 124
  const nodeHeight = 60
  const siblingGap = 34
  const levelGap = 132
  const panelGap = 34
  const panelPaddingX = 20
  const panelPaddingTop = 18
  const panelPaddingBottom = 18
  const subtreeWidthCache = new Map<string, number>()
  const subtreeDepthCache = new Map<string, number>()

  const getChildren = (id: string) => (users[id]?.littles ?? []).filter((littleId) => members.has(littleId))

  const measureWidth = (id: string): number => {
    const cached = subtreeWidthCache.get(id)
    if (cached !== undefined) {
      return cached
    }

    const children = getChildren(id)
    if (children.length === 0) {
      subtreeWidthCache.set(id, nodeWidth)
      return nodeWidth
    }

    const childWidths = children.map((childId) => measureWidth(childId))
    const totalChildrenWidth = childWidths.reduce((sum, value) => sum + value, 0) + siblingGap * (children.length - 1)
    const measured = Math.max(nodeWidth, totalChildrenWidth)
    subtreeWidthCache.set(id, measured)
    return measured
  }

  const measureDepth = (id: string): number => {
    const cached = subtreeDepthCache.get(id)
    if (cached !== undefined) {
      return cached
    }

    const children = getChildren(id)
    if (children.length === 0) {
      subtreeDepthCache.set(id, 0)
      return 0
    }

    const measured = 1 + Math.max(...children.map((childId) => measureDepth(childId)))
    subtreeDepthCache.set(id, measured)
    return measured
  }

  const placeNode = (
    id: string,
    left: number,
    depth: number,
    positions: Record<string, Point>,
    connectors: Array<{ from: Point; to: Point }>,
  ) => {
    const subtreeWidth = measureWidth(id)
    const x = left + subtreeWidth / 2
    const y = panelPaddingTop + nodeHeight / 2 + depth * levelGap
    positions[id] = { x, y }

    const children = getChildren(id)
    if (children.length === 0) {
      return
    }

    const childWidths = children.map((childId) => measureWidth(childId))
    const totalChildrenWidth = childWidths.reduce((sum, value) => sum + value, 0) + siblingGap * (children.length - 1)
    let childLeft = left + (subtreeWidth - totalChildrenWidth) / 2

    children.forEach((childId, index) => {
      placeNode(childId, childLeft, depth + 1, positions, connectors)
      connectors.push({
        from: { x, y },
        to: positions[childId],
      })
      childLeft += childWidths[index] + siblingGap
    })
  }

  const drafts: Array<{ rootId: string; positions: Record<string, Point>; connectors: Array<{ from: Point; to: Point }>; width: number; height: number }> = []

  const collectGroup = (rootId: string) => {
    if (seen.has(rootId) || !members.has(rootId)) {
      return
    }

    const positions: Record<string, Point> = {}
    const connectors: Array<{ from: Point; to: Point }> = []
    placeNode(rootId, panelPaddingX, 0, positions, connectors)

    const width = measureWidth(rootId) + panelPaddingX * 2
    const height = measureDepth(rootId) * levelGap + nodeHeight + panelPaddingTop + panelPaddingBottom

    drafts.push({ rootId, positions, connectors, width, height })

    for (const id of Object.keys(positions)) {
      seen.add(id)
    }
  }

  for (const rootId of roots) {
    collectGroup(rootId)
  }

  for (const id of members) {
    collectGroup(id)
  }

  const panelStartX = 24
  const panelStartY = 24
  const totalArea = drafts.reduce((sum, draft) => sum + draft.width * draft.height, 0)
  const targetRowWidth = Math.max(980, Math.min(2200, Math.round(Math.sqrt(totalArea) * 1.75)))
  let currentLeft = panelStartX
  let currentTop = panelStartY
  let currentRowHeight = 0

  return drafts.map((draft) => {
    if (currentLeft > panelStartX && currentLeft + draft.width > targetRowWidth) {
      currentLeft = panelStartX
      currentTop += currentRowHeight + panelGap
      currentRowHeight = 0
    }

    const left = currentLeft
    const group: FamilyGroup = {
      rootId: draft.rootId,
      positions: Object.fromEntries(
        Object.entries(draft.positions).map(([id, point]) => [id, { x: point.x + left, y: point.y + currentTop }]),
      ),
      connectors: draft.connectors.map((line) => ({
        from: { x: line.from.x + left, y: line.from.y + currentTop },
        to: { x: line.to.x + left, y: line.to.y + currentTop },
      })),
      bounds: { left, top: currentTop, width: draft.width, height: draft.height },
    }

    currentLeft += draft.width + panelGap
    currentRowHeight = Math.max(currentRowHeight, draft.height)

    return group
  })
}

function FamilyTreeCanvas({
  dynasty,
  users,
  highlightUserId,
  searchedUserId,
  jumpRequest,
}: {
  dynasty: Dynasty
  users: Record<string, UserNode>
  highlightUserId: string
  searchedUserId: string
  jumpRequest: { id: string; token: number } | null
}) {
  const ZOOM_MIN = 0.45
  const ZOOM_MAX = 1.9
  const PAN_DRAG_FACTOR = 0.72
  const MOBILE_BASE_SCALE = 0.74

  const getBaseScale = () => {
    if (window.innerWidth <= 760) {
      return MOBILE_BASE_SCALE
    }
    return 1
  }

  const [zoom, setZoom] = useState(1)
  const [baseScale, setBaseScale] = useState(() => (typeof window !== 'undefined' ? getBaseScale() : 1))
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setBaseScale(getBaseScale())
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const familyGroups = useMemo(() => buildFamilyGroups(users, dynasty), [users, dynasty])

  const layout = useMemo(() => {
    const sceneWidth = Math.max(760, ...familyGroups.map((group) => group.bounds.left + group.bounds.width))
    const sceneHeight = familyGroups.length
      ? Math.max(...familyGroups.map((group) => group.bounds.top + group.bounds.height)) + 32
      : 280

    return { sceneWidth, sceneHeight, familyGroups }
  }, [familyGroups])

  const nodePositionById = useMemo(() => {
    const byId = new Map<string, Point>()
    for (const group of layout.familyGroups) {
      for (const [id, point] of Object.entries(group.positions)) {
        byId.set(id, point)
      }
    }
    return byId
  }, [layout.familyGroups])

  useEffect(() => {
    if (!jumpRequest) {
      return
    }

    const point = nodePositionById.get(jumpRequest.id)
    const viewport = viewportRef.current
    if (!point || !viewport) {
      return
    }

    const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))
    const centerX = viewport.clientWidth / 2
    const centerY = viewport.clientHeight / 2

    setZoom(nextZoom)
    setPan({
      x: centerX - point.x * nextZoom * baseScale,
      y: centerY - point.y * nextZoom * baseScale,
    })
  }, [jumpRequest, nodePositionById, zoom, baseScale])

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y })
  }

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) {
      return
    }
    setPan({
      x: (event.clientX - dragStart.x) * PAN_DRAG_FACTOR,
      y: (event.clientY - dragStart.y) * PAN_DRAG_FACTOR,
    })
  }

  const endDrag = () => {
    setDragStart(null)
  }

  return (
    <section className="tree-shell">
      <header className="tree-header">
        <h2>{DYNASTY_STYLE[dynasty].label} Dynasty Family Trees</h2>
        <div className="tree-controls">
          <button type="button" onClick={() => setZoom((value) => Math.max(ZOOM_MIN, Number((value - 0.1).toFixed(2))))}>
            -
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(ZOOM_MAX, Number((value + 0.1).toFixed(2))))}>
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <div
        className="tree-viewport"
        ref={viewportRef}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className={`tree-stage dynasty-${dynasty} ${dragStart ? 'dragging' : ''}`}
          style={{
            width: `${layout.sceneWidth}px`,
            height: `${layout.sceneHeight}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom * baseScale})`,
          }}
        >
          {layout.familyGroups.map((group) => (
            <div
              key={group.rootId}
              className="family-panel"
              style={{
                left: `${group.bounds.left}px`,
                top: `${group.bounds.top}px`,
                width: `${group.bounds.width}px`,
                height: `${group.bounds.height}px`,
              }}
            >
              <svg className="tree-lines" viewBox={`0 0 ${group.bounds.width} ${group.bounds.height}`} preserveAspectRatio="none">
                {group.connectors.map((line, index) => (
                  <line
                    key={`${line.from.x}-${line.to.x}-${index}`}
                    x1={line.from.x - group.bounds.left}
                    y1={line.from.y - group.bounds.top + 22}
                    x2={line.to.x - group.bounds.left}
                    y2={line.to.y - group.bounds.top - 22}
                  />
                ))}
              </svg>

              {Object.entries(group.positions).map(([id, point]) => {
                const user = users[id]
                const isHighlighted = id === highlightUserId
                const isSearchHit = id === searchedUserId
                return (
                  <article
                    key={id}
                    className={`tree-node ${isHighlighted ? 'is-highlight' : ''} ${isSearchHit ? 'is-search-hit' : ''}`}
                    style={{ left: `${point.x - group.bounds.left}px`, top: `${point.y - group.bounds.top}px` }}
                  >
                    {isHighlighted ? <span className="tree-node-badge">You</span> : null}
                    <h3>{user.email.split('@')[0]}</h3>
                  </article>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function App() {
  const [usersById, setUsersById] = useState<Record<string, UserNode>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [formError, setFormError] = useState('')
  const [activeUserId, setActiveUserId] = useState('')
  const [activeDynasty, setActiveDynasty] = useState<Dynasty>('fire')
  const [showReveal, setShowReveal] = useState(false)
  const [revealClosing, setRevealClosing] = useState(false)
  const [revealDone, setRevealDone] = useState(false)
  const [showCloseButton, setShowCloseButton] = useState(false)
  const [revealPhase, setRevealPhase] = useState<'loading' | 'intro' | 'name'>('loading')
  const [searchInput, setSearchInput] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [searchedUserId, setSearchedUserId] = useState('')
  const [jumpRequest, setJumpRequest] = useState<{ id: string; token: number } | null>(null)
  const closeRevealTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let ignore = false

    const loadUsers = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/dynasty-users.json')
        if (!response.ok) {
          throw new Error(`Failed to load dynasty data: ${response.status}`)
        }
        const data = (await response.json()) as UsersPayload
        if (!ignore) {
          setUsersById(data.users ?? {})
          setLoadError('')
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load the dynasty assignments.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!showReveal) {
      return
    }

    setRevealClosing(false)
    setRevealDone(false)
    setShowCloseButton(false)
    setRevealPhase('loading')

    const introTimer = window.setTimeout(() => {
      setRevealPhase('intro')
    }, 1650)

    const nameTimer = window.setTimeout(() => {
      setRevealPhase('name')
    }, 3000)

    const closeTimer = window.setTimeout(() => {
      setShowCloseButton(true)
    }, 4900)

    const doneTimer = window.setTimeout(() => {
      setRevealDone(true)
    }, 5750)

    return () => {
      window.clearTimeout(introTimer)
      window.clearTimeout(nameTimer)
      window.clearTimeout(closeTimer)
      window.clearTimeout(doneTimer)
    }
  }, [showReveal])

  useEffect(() => {
    return () => {
      if (closeRevealTimerRef.current !== null) {
        window.clearTimeout(closeRevealTimerRef.current)
      }
    }
  }, [])

  const activeUser = activeUserId ? usersById[activeUserId] : undefined
  const activeTheme = DYNASTY_STYLE[activeDynasty]
  const assignedTheme = activeUser ? DYNASTY_STYLE[activeUser.dynasty] : activeTheme
  const activeDynastyIndex = Math.max(0, DYNASTIES.indexOf(activeDynasty))
  const dynastyThemeVars = {
    ['--dynasty-accent' as string]: activeTheme.accent,
    ['--dynasty-glow' as string]: activeTheme.glow,
  } as CSSProperties
  const badgeThemeVars = {
    ['--badge-accent' as string]: assignedTheme.accent,
    ['--badge-glow' as string]: assignedTheme.glow,
  } as CSSProperties

  const searchableUsers = useMemo(
    () =>
      Object.entries(usersById)
        .map(([id, user]) => ({
          id,
          dynasty: user.dynasty,
          emailPrefix: user.email.split('@')[0],
        }))
        .sort((a, b) => a.emailPrefix.localeCompare(b.emailPrefix)),
    [usersById],
  )

  const searchIndexById = useMemo(() => new Map(searchableUsers.map((member) => [member.id, member])), [searchableUsers])

  const searchSuggestions = useMemo(() => {
    const needle = searchInput.trim().toLowerCase()
    if (!needle) {
      return [] as string[]
    }

    return searchableUsers
      .filter((member) => member.emailPrefix.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((member) => member.id)
  }, [searchInput, searchableUsers])

  const jumpToUser = (id: string) => {
    const match = searchIndexById.get(id)
    if (!match) {
      return
    }

    setActiveDynasty(match.dynasty)
    setSearchedUserId(id)
    setJumpRequest({ id, token: Date.now() })
  }

  const selectSearchSuggestion = (id: string) => {
    const match = searchIndexById.get(id)
    if (!match) {
      return
    }

    setSearchInput(match.emailPrefix)
    setSearchFocus(false)
    jumpToUser(id)
  }

  const handleTreeSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const needle = searchInput.trim().toLowerCase()
    if (!needle) {
      return
    }

    const exact = searchableUsers.find((member) => member.emailPrefix.toLowerCase() === needle)
    if (exact) {
      selectSearchSuggestion(exact.id)
      return
    }

    if (searchSuggestions.length > 0) {
      selectSearchSuggestion(searchSuggestions[0])
    }
  }

  useEffect(() => {
    if (!searchedUserId) {
      return
    }

    const timer = window.setTimeout(() => {
      setSearchedUserId('')
    }, 2400)

    return () => window.clearTimeout(timer)
  }, [searchedUserId])

  const returnToLogin = () => {
    if (closeRevealTimerRef.current !== null) {
      window.clearTimeout(closeRevealTimerRef.current)
      closeRevealTimerRef.current = null
    }
    setActiveUserId('')
    setRevealClosing(false)
    setShowReveal(false)
    setRevealDone(false)
    setShowCloseButton(false)
    setRevealPhase('loading')
    setActiveDynasty('fire')
    setEmailInput('')
    setFormError('')
  }

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = normalizeEmail(emailInput)
    if (!normalized) {
      setFormError('Please enter an email.')
      return
    }

    const found = Object.entries(usersById).find(([, user]) => normalizeEmail(user.email) === normalized)

    if (!found) {
      setFormError("We can't find you in our database! Email csa@u.northwestern.edu if this is a mistake.")
      return
    }

    setFormError('')
    setActiveUserId(found[0])
    setActiveDynasty(found[1].dynasty)
    setShowReveal(true)
  }

  const closeReveal = () => {
    if (revealClosing) {
      return
    }

    setRevealClosing(true)
    closeRevealTimerRef.current = window.setTimeout(() => {
      setShowReveal(false)
      setRevealClosing(false)
      closeRevealTimerRef.current = null
    }, 430)
  }

  if (!activeUser) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <p className="eyebrow">CSA Spring 2026 Dynasty Reveal</p>

          <form onSubmit={handleLogin} className="login-form">
            <label htmlFor="email">Enter your Northwestern email:</label>
            <div className="login-entry-row">
              <input
                id="email"
                type="email"
                placeholder="you@u.northwestern.edu"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
              />
              <button type="submit" className="login-arrow-btn" disabled={isLoading} aria-label="Submit email">
                {isLoading ? '...' : '->'}
              </button>
            </div>
          </form>

          {loadError && <p className="error-text">{loadError}</p>}
          {!loadError && formError && <p className="error-text">{formError}</p>}

          {/* <p className="examples">Try: ember@example.com, sora@example.com, marin@example.com, terra@example.com</p> */}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell" style={dynastyThemeVars}>
      <header className="app-topbar">
        <div className="topbar-title-row">
          <h1>Northwestern CSA Family Trees</h1>
          <div className="topbar-actions">
            <div className="identity-chip" style={badgeThemeVars} aria-label="Current dynasty assignment">
              <strong>{activeUser.name}: {DYNASTY_STYLE[activeUser.dynasty].label} Dynasty</strong>
            </div>
            <button type="button" className="return-login-btn" onClick={returnToLogin}>
              Return to Login
            </button>
          </div>
        </div>

        <div className="topbar-nav-row">
          <div className="dynasty-tabs" role="tablist" aria-label="Dynasty tabs">
            <div className="dynasty-tabs-indicator" style={{ transform: `translateX(${activeDynastyIndex * 100}%)` }} />
            {DYNASTIES.map((dynasty) => (
              <button
                key={dynasty}
                type="button"
                role="tab"
                aria-selected={activeDynasty === dynasty}
                className={activeDynasty === dynasty ? `active dynasty-tab-${dynasty}` : `dynasty-tab-${dynasty}`}
                onClick={() => setActiveDynasty(dynasty)}
              >
                <span
                  className="dynasty-tab-logo"
                  style={{ ['--tab-logo' as string]: `url(${DYNASTY_LOGO_SVG[dynasty]})` }}
                  aria-hidden="true"
                />
                <span>{DYNASTY_STYLE[dynasty].label}</span>
              </button>
            ))}
          </div>

          <form className="global-tree-search" onSubmit={handleTreeSearchSubmit}>
            <span className="global-tree-search-icon" aria-hidden="true" />
            <input
              type="text"
              value={searchInput}
              placeholder="Search for anyone"
              onFocus={() => setSearchFocus(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchFocus(false), 120)
              }}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Search across all dynasties by email prefix"
            />
            {searchFocus && searchSuggestions.length > 0 ? (
              <ul className="global-tree-search-list" role="listbox" aria-label="Search suggestions">
                {searchSuggestions.map((id) => {
                  const member = searchIndexById.get(id)
                  if (!member) {
                    return null
                  }

                  return (
                    <li key={id}>
                      <button type="button" onMouseDown={() => selectSearchSuggestion(id)}>
                        {member.emailPrefix}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </form>
        </div>
      </header>

      <FamilyTreeCanvas
        dynasty={activeDynasty}
        users={usersById}
        highlightUserId={activeUserId}
        searchedUserId={searchedUserId}
        jumpRequest={jumpRequest}
      />

      {showReveal && (
        <section className={`reveal-overlay reveal-phase-${revealPhase} reveal-${activeUser.dynasty} ${revealDone ? 'done' : ''} ${revealClosing ? 'is-closing' : ''}`}>
          <div className="reveal-rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="reveal-stripes" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, index) => (
              <i key={index} style={{ animationDelay: `${index * 0.13}s` }} />
            ))}
          </div>
          <div className={`reveal-copy phase-${revealPhase}`}>
            <div className={`reveal-intro ${revealPhase !== 'loading' ? 'is-visible' : ''}`}>
              <p>{activeUser.name}, you're in...</p>
            </div>
            {revealPhase === 'loading' ? (
              <div className="loading-orb" aria-hidden="true" />
            ) : revealPhase === 'intro' ? (
              <div className="reveal-hold" aria-hidden="true" />
            ) : (
              <div className="reveal-message">
                <h2 className="dynasty-name-enter">
                  <span>{DYNASTY_STYLE[activeUser.dynasty].label}</span>
                  <span>Dynasty</span>
                </h2>
              </div>
            )}
            <div className="reveal-actions">
              {showCloseButton ? (
                <button type="button" className={`reveal-close-btn ${revealDone ? 'is-visible' : ''}`} onClick={closeReveal}>
                  Close
                </button>
              ) : (
                <span aria-hidden="true" />
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

export default App

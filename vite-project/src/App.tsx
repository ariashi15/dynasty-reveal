import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Mail } from 'lucide-react'
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
  head?: boolean
}

type UsersPayload = {
  users: Record<string, UserNode>
}

type InvitationInfo = {
  name: string
  date: string
  location: string
  rsvpLink: string
  heads: string[]
}

type InvitationsPayload = {
  invitations: Record<Dynasty, InvitationInfo>
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
  water: { label: 'Water', accent: '#5a8fd4', glow: '#5a8fd4' },
  earth: { label: 'Earth', accent: '#7eb56f', glow: '#7eb56f' },
  wind: { label: 'Wind', accent: '#eec95f', glow: '#eec95f' },
}

const DYNASTY_LOGO_SVG: Record<Dynasty, string> = {
  fire: fireLogoSvg,
  water: waterLogoSvg,
  earth: earthLogoSvg,
  wind: windLogoSvg,
}

const MOCK_DYNASTY_HEADS: Record<Dynasty, Array<{ name: string; bio: string; image: string }>> = {
  fire: [
    { name: 'Chelsea Liu', bio: 'Hi! I’m Chelsea and I’m a junior studying data science and I’m from Seattle, WA! I love watching baseball and trying to discover the few good matcha places chicago has.', image: new URL('./assets/heads-profiles/chelsea.jpg', import.meta.url).href },
    { name: 'Justin Tang', bio: 'Hi everyone! I’m Justin a freshman studying chemical engineering from Arcadia, California. You can either find me running around the streets of Evanston or dancing in the studio.', image: new URL('./assets/heads-profiles/justin.jpg', import.meta.url).href },
    { name: 'Ashlyn Zhao', bio: 'Hi guys! I’m Ashlyn and I’m a first year studying Data Science and Economics from San Diego, California. I lovelovelove cafe hopping in Evanston/Chicago and baking sweet treats!!', image: new URL('./assets/heads-profiles/ashlyn.jpg', import.meta.url).href }
  ],
  water: [
    { name: 'Grace He', bio: 'Hi hi I’m Grace He. I’m currently a junior studying CS + Econ (very unique, I know) and I like to rock climb and paint!! Chicago, IL is my hometown :p', image: new URL('./assets/heads-profiles/grace.jpg', import.meta.url).href },
    { name: 'Jasmine Guo', bio: 'HI EVERYONE IM JASMINE AND IM A JUNIOR FROM NEW YORK STUDYING BIOLOGY. I LIKE TO DANCE AND EAT AND WANT A PET SNAKE!', image: new URL('./assets/heads-profiles/jasmine.jpg', import.meta.url).href },
  ],
  earth: [
    { name: 'Eric Dare', bio: 'Hi everyone! My name is Eric Dare and I am a 3rd year at Northwestern from Glen Ellyn, IL. I’m currently studying Biological Sciences and I want to pursue medicine. In my free time I practice Taekwondo and I eat a bunchhh of food.', image: new URL('./assets/heads-profiles/eric.jpg', import.meta.url).href },
    { name: 'Sabrina Xu', bio: 'Hiii I’m Sabrina, a freshman from the best borough of all: Queens, NY, and I’m studying Biology and Global Health. Turtles are the best animals in the world 🐢🐢', image: new URL('./assets/heads-profiles/sabrina.jpg', import.meta.url).href },
    { name: 'Mirabelle Jiang', bio: 'Hi I’m Mirabelle! Im a freshman from the land of abgs aka irvine, ca studying Econ & English. I like to eat sleep drive cars and scroll reels.', image: new URL('./assets/heads-profiles/mirabelle.jpg', import.meta.url).href },
  ],
  wind: [
    { name: 'George Sun', bio: 'Hi guys I’m george! I’m a sophomore from vancouver studying journalism and data science. I like to play basketball, scroll tiktok then instagram and i also love drake.', image: new URL('./assets/heads-profiles/george.jpg', import.meta.url).href },
    { name: 'Charlie Zhang', bio: 'Hello my name is Charlie I’m from ATL and I’m a freshman electrical engineer at Northwestern University in my free time i enjoy eating. Sometimes I kayak and play the clarinet', image: new URL('./assets/heads-profiles/charlie.jpg', import.meta.url).href },
    { name: 'Daniel Wu', bio: 'Hi I’m Daniel, Im a freshman from Beijing and Vancouver and I study mmss psych maybe history. I like soccer, skiing, eating food, and labradors.', image: new URL('./assets/heads-profiles/daniel.jpg', import.meta.url).href },
  ],
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
  // Previously node sizes were fixed. Measure per-node size based on the email prefix
  // so nodes can grow/shrink with their content and wrap when needed.
  const siblingGap = 34
  const levelGap = 132
  const panelGap = 34
  const panelPaddingX = 20
  const panelPaddingTop = 18
  const panelPaddingBottom = 18
  const subtreeWidthCache = new Map<string, number>()
  const subtreeDepthCache = new Map<string, number>()
  const nodeWidthCache = new Map<string, number>()
  const nodeHeightCache = new Map<string, number>()

  // measurement helpers (uses canvas 2D to measure text width with the page font)
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
  const ctx = canvas ? canvas.getContext('2d') : null
  const rootFontSize = typeof document !== 'undefined' ? parseFloat(getComputedStyle(document.documentElement).fontSize || '16') : 16
  const titleFontRem = 0.84 // .tree-node h3 { font-size: 0.84rem }
  const titleFontPx = rootFontSize * titleFontRem
  // measure using the same UI font used in the nodes
  const titleFont = `${Math.round(titleFontPx)}px Manrope, sans-serif`
  const paddingX = 24 // .tree-node padding 12px left+right
  const paddingY = 24 // 12px top+bottom
  const minNodeWidth = 100
  const maxNodeWidth = 160
  const minNodeHeight = 56

  const measureTextWidth = (text: string) => {
    if (!ctx) return Math.min(maxNodeWidth - paddingX, Math.max(40, text.length * 7))
    ctx.font = titleFont
    return Math.ceil(ctx.measureText(text).width)
  }

  const computeNodeSize = (id: string) => {
    if (nodeWidthCache.has(id) && nodeHeightCache.has(id)) {
      return { w: nodeWidthCache.get(id)!, h: nodeHeightCache.get(id)! }
    }
    const label = (users[id]?.email ?? '').split('@')[0] || ''
    const textWidth = measureTextWidth(label)
    // do NOT force wrapping here — make the node wide enough to contain the text
    const w = Math.max(minNodeWidth, Math.ceil(textWidth + paddingX))
    const lineHeight = Math.round(titleFontPx * 1.2)
    const h = Math.max(minNodeHeight, lineHeight + paddingY)
    nodeWidthCache.set(id, w)
    nodeHeightCache.set(id, h)
    return { w, h }
  }

  const getChildren = (id: string) => (users[id]?.littles ?? []).filter((littleId) => members.has(littleId))

  const measureWidth = (id: string): number => {
    const cached = subtreeWidthCache.get(id)
    if (cached !== undefined) {
      return cached
    }

    const children = getChildren(id)
    if (children.length === 0) {
      const { w } = computeNodeSize(id)
      subtreeWidthCache.set(id, w)
      return w
    }

    const childWidths = children.map((childId) => measureWidth(childId))
    const totalChildrenWidth = childWidths.reduce((sum, value) => sum + value, 0) + siblingGap * (children.length - 1)
    const { w: myW } = computeNodeSize(id)
    const measured = Math.max(myW, totalChildrenWidth)
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
    const { h: myH } = computeNodeSize(id)
    const x = left + subtreeWidth / 2
    const y = panelPaddingTop + myH / 2 + depth * levelGap
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

    // Compute height from positioned nodes so varying node heights are respected
    const allYs = Object.values(positions).map((p) => p.y)
    const maxCenterY = Math.max(...allYs)
    const maxNodeHalf = Math.max(...Object.keys(positions).map((id) => (nodeHeightCache.get(id) ?? minNodeHeight) / 2))
    const height = Math.max((maxCenterY + maxNodeHalf) + panelPaddingBottom, measureDepth(rootId) * levelGap + minNodeHeight + panelPaddingTop + panelPaddingBottom)

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
  const ZOOM_MIN = 0.3
  const ZOOM_MAX = 1.9
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
  const [isDragging, setIsDragging] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const DRAG_THRESHOLD = 5

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
    setDragStart({ x: event.clientX, y: event.clientY })
    setIsDragging(false)
  }

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) {
      return
    }
    
    const deltaX = event.clientX - dragStart.x
    const deltaY = event.clientY - dragStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Only start panning after crossing the drag threshold
    if (!isDragging && distance < DRAG_THRESHOLD) {
      return
    }
    
    if (!isDragging) {
      setIsDragging(true)
    }
    
    setPan({
      x: pan.x + deltaX,
      y: pan.y + deltaY,
    })
    setDragStart({ x: event.clientX, y: event.clientY })
  }

  const endDrag = () => {
    setDragStart(null)
    setIsDragging(false)
  }

  return (
    <section className="tree-shell">
      <header className="tree-header">
        <h2>{DYNASTY_STYLE[dynasty].label} Dynasty Family Trees</h2>
        <div className="tree-controls">
          <div className="zoom-controls">
            <button type="button" onClick={() => setZoom((value) => Math.max(ZOOM_MIN, Number((value - 0.1).toFixed(2))))}>
              -
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(ZOOM_MAX, Number((value + 0.1).toFixed(2))))}>
              +
            </button>
          </div>
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
          className={`tree-stage dynasty-${dynasty} ${isDragging ? 'dragging' : ''}`}
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
                    {user.head ? (
                      <span
                        className="tree-node-badge head-badge"
                        style={{ background: DYNASTY_STYLE[user.dynasty].accent }}
                      >
                        {`${DYNASTY_STYLE[user.dynasty].label} HEAD`.toUpperCase()}
                      </span>
                    ) : null}
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
  const [invitationsByDynasty, setInvitationsByDynasty] = useState<Partial<Record<Dynasty, InvitationInfo>>>({})
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
  const [revealPhase, setRevealPhase] = useState<'loading' | 'intro' | 'name' | 'heads'>('loading')
  const [showInvitationPopup, setShowInvitationPopup] = useState(false)
  const [invitationClosing, setInvitationClosing] = useState(false)
  const [invitationSettled, setInvitationSettled] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [searchedUserId, setSearchedUserId] = useState('')
  const [jumpRequest, setJumpRequest] = useState<{ id: string; token: number } | null>(null)
  const [isBrowsingMode, setIsBrowsingMode] = useState(false)
  const [revealHeadIndex, setRevealHeadIndex] = useState(0)
  const closeRevealTimerRef = useRef<number | null>(null)
  const closeInvitationTimerRef = useRef<number | null>(null)
  const jumpRequestTokenRef = useRef(0)
  const headsRef = useRef<HTMLElement | null>(null)
  const treeRef = useRef<HTMLDivElement | null>(null)
  const topHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const [isViewingHeads, setIsViewingHeads] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!headsRef.current) return
      const headsRect = headsRef.current.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      setIsViewingHeads(headsRect.top < viewportCenter)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatHeadsList = (heads: string[]) => {
    if (heads.length <= 1) {
      return heads[0] ?? ''
    }

    if (heads.length === 2) {
      return `${heads[0]} and ${heads[1]}`
    }

    return `${heads.slice(0, -1).join(', ')}, and ${heads[heads.length - 1]}`
  }

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
    let ignore = false

    const loadInvitations = async () => {
      try {
        const response = await fetch('/dynasty-invitations.json')
        if (!response.ok) {
          throw new Error(`Failed to load invitation data: ${response.status}`)
        }
        const data = (await response.json()) as InvitationsPayload
        if (!ignore) {
          setInvitationsByDynasty(data.invitations ?? {})
        }
      } catch {
        if (!ignore) {
          setInvitationsByDynasty({})
        }
      }
    }

    loadInvitations()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!showReveal) {
      return
    }

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
      if (closeInvitationTimerRef.current !== null) {
        window.clearTimeout(closeInvitationTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (activeUserId && usersById[activeUserId]) {
      // Auto-center on the user when they arrive on the tree
      window.setTimeout(() => {
        const match = Object.entries(usersById).find(([id]) => id === activeUserId)
        if (match) {
          setActiveDynasty(usersById[activeUserId].dynasty)
          setSearchedUserId(activeUserId)
          setJumpRequest({ id: activeUserId, token: Date.now() })
        }
      }, 100)
    }
  }, [activeUserId, usersById])

  const activeUser = activeUserId ? usersById[activeUserId] : undefined
  const activeInvitation = activeUser ? invitationsByDynasty[activeUser.dynasty] : undefined
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
    jumpRequestTokenRef.current += 1
    setJumpRequest({ id, token: jumpRequestTokenRef.current })
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
    if (closeInvitationTimerRef.current !== null) {
      window.clearTimeout(closeInvitationTimerRef.current)
      closeInvitationTimerRef.current = null
    }
    setActiveUserId('')
    setIsBrowsingMode(false)
    setRevealClosing(false)
    setShowReveal(false)
    setRevealDone(false)
    setShowCloseButton(false)
    setRevealPhase('loading')
    setShowInvitationPopup(false)
    setInvitationClosing(false)
    setActiveDynasty('fire')
    setRevealHeadIndex(0)
    setEmailInput('')
    setFormError('')
  }

  const handleBrowsingMode = () => {
    setIsBrowsingMode(true)
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
    setRevealHeadIndex(0)
    setRevealClosing(false)
    setRevealDone(false)
    setShowCloseButton(false)
    setRevealPhase('loading')
    setShowInvitationPopup(false)
    setInvitationClosing(false)
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
      setShowInvitationPopup(true)
      setInvitationClosing(false)
      setInvitationSettled(false)
      window.setTimeout(() => setInvitationSettled(true), 820)
      closeRevealTimerRef.current = null
    }, 420)
  }

  const closeInvitationPopup = () => {
    if (invitationClosing) {
      return
    }

    setInvitationClosing(true)
    closeInvitationTimerRef.current = window.setTimeout(() => {
      setShowInvitationPopup(false)
      setInvitationClosing(false)
      setInvitationSettled(false)
      closeInvitationTimerRef.current = null
    }, 320)
  }

  if (!activeUser && !isBrowsingMode) {
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

          <button
            type="button"
            className="browsing-mode-btn"
            onClick={handleBrowsingMode}
            aria-label="Browse family tree without logging in"
          >
            <b>Not logging in, just browsing <span aria-hidden="true">-&gt;</span></b>
          </button>

          {/* <p className="examples">Try: ember@example.com, sora@example.com, marin@example.com, terra@example.com</p> */}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell" style={dynastyThemeVars}>
      <header className="app-topbar">
        <div className="topbar-title-row">
          <h1 ref={topHeadingRef}>Northwestern CSA Dynasties</h1>
          <div className="topbar-actions">
            {!isBrowsingMode && activeUser && (
              <div className="mail-and-name-badge">
                <button type="button" className="mail-icon-btn" style={badgeThemeVars} onClick={() => { setShowInvitationPopup(true); setInvitationClosing(false); setInvitationSettled(false); }} aria-label="View invitation">
                  <Mail size={20} color="#fff" />
                </button>
                <div className="identity-chip" style={badgeThemeVars} aria-label="Current dynasty assignment">
                  <strong>{activeUser.name}: {DYNASTY_STYLE[activeUser.dynasty].label} Dynasty</strong>
                </div>
              </div>
            )}
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

      <div ref={treeRef}>
        <FamilyTreeCanvas
          dynasty={activeDynasty}
          users={usersById}
          highlightUserId={activeUserId}
          searchedUserId={searchedUserId}
          jumpRequest={jumpRequest}
        />
      </div>

      <button
        type="button"
        className={`scroll-to-heads-btn ${isViewingHeads ? 'viewing-heads' : ''}`}
        style={{
          background: `color-mix(in srgb, ${DYNASTY_STYLE[activeDynasty].accent} 82%, transparent)`,
          color: '#fff',
        }}
        onClick={() => {
          if (isViewingHeads) {
            topHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } else {
            headsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }}
        aria-label={isViewingHeads ? 'Back to family trees' : `Meet the ${DYNASTY_STYLE[activeDynasty].label} heads`}
      >
        <span>{isViewingHeads ? 'Back to Family Trees' : `Meet the ${DYNASTY_STYLE[activeDynasty].label} Heads`}</span>
        <span aria-hidden="true">{isViewingHeads ? '↑' : '↓'}</span>
      </button>

      <section className="dynasty-heads" ref={headsRef}>
        <div className="dynasty-heads-container">
          <h2>Meet the {DYNASTY_STYLE[activeDynasty].label} Heads</h2>
          <div className="heads-grid">
            {MOCK_DYNASTY_HEADS[activeDynasty].map((head) => (
              <article key={head.name} className="head-card">
                <img src={head.image} alt={head.name} className="head-image" />
                <h3>{head.name}</h3>
                <p>{head.bio}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {!isBrowsingMode && showReveal && activeUser && (
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
            ) : revealPhase === 'name' ? (
              <div className="reveal-message">
                <h2 className="dynasty-name-enter">
                  <span>{DYNASTY_STYLE[activeUser.dynasty].label}</span>
                  <span>Dynasty</span>
                </h2>
              </div>
            ) : (
              <div className="reveal-heads-content">
                <h2>Your dynasty heads are...</h2>
                <div className="reveal-heads-grid">
                  {MOCK_DYNASTY_HEADS[activeUser.dynasty].map((head, idx) => (
                    <div key={idx} className="head-card">
                      <img src={head.image} alt={head.name} className="head-image" />
                      <h3>{head.name}</h3>
                      <p>{head.bio}</p>
                    </div>
                  ))}
                </div>
                <div className="reveal-heads-carousel" aria-label={`${DYNASTY_STYLE[activeUser.dynasty].label} heads carousel`}>
                  <button
                    type="button"
                    className="reveal-head-carousel-arrow"
                    onClick={() => {
                      const heads = MOCK_DYNASTY_HEADS[activeUser.dynasty]
                      setRevealHeadIndex((currentIndex) => (currentIndex - 1 + heads.length) % heads.length)
                    }}
                    aria-label="Previous head"
                  >
                    ‹
                  </button>
                  <div className="reveal-head-carousel-window">
                    <div className="reveal-head-carousel-track" style={{ transform: `translateX(-${revealHeadIndex * 100}%)` }}>
                      {MOCK_DYNASTY_HEADS[activeUser.dynasty].map((head, idx) => (
                        <article
                          key={head.name}
                          className="head-card reveal-head-carousel-card"
                          aria-hidden={idx !== revealHeadIndex}
                        >
                          <img src={head.image} alt={head.name} className="head-image" />
                          <h3>{head.name}</h3>
                          <p>{head.bio}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="reveal-head-carousel-arrow"
                    onClick={() => {
                      const heads = MOCK_DYNASTY_HEADS[activeUser.dynasty]
                      setRevealHeadIndex((currentIndex) => (currentIndex + 1) % heads.length)
                    }}
                    aria-label="Next head"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
            <div className="reveal-actions">
              {showCloseButton ? (
                <button type="button" className={`reveal-close-btn ${revealDone ? 'is-visible' : ''}`} onClick={() => revealPhase === 'heads' ? closeReveal() : setRevealPhase('heads')}>
                  {revealPhase === 'heads' ? 'Continue' : 'Continue'}
                </button>
              ) : (
                <span aria-hidden="true" />
              )}
            </div>
          </div>
        </section>
      )}

      {!isBrowsingMode && showInvitationPopup && activeUser && activeInvitation ? (
        <section className={`invitation-overlay ${invitationClosing ? 'is-closing' : ''} ${invitationSettled ? 'invitation-settled' : ''}`}>
          <div className="invitation-popup" role="dialog" aria-modal="true" aria-label="Dynasty invitation">
            <div className="invitation-envelope" aria-hidden="true">
              <span className="invitation-envelope-flap" />
              <span className="invitation-envelope-seal" />
            </div>
            <article className="invitation-card">
              <button type="button" className="invitation-close-btn" onClick={closeInvitationPopup} aria-label="Close invitation">
                ×
              </button>
              <p className="invitation-line invitation-intro">You're invited to...</p>
              <h2>{activeInvitation.name}</h2>
              <p className="invitation-line"><strong>Date:</strong> {activeInvitation.date}</p>
              <p className="invitation-line"><strong>Location:</strong> {activeInvitation.location}</p>
              <p className="invitation-line invitation-rsvp">
                <strong>RSVP:</strong>{' '}
                <a href={activeInvitation.rsvpLink} target="_blank" rel="noreferrer">
                  Partiful
                </a>
              </p>
              <p className="invitation-footer">WE'RE SO EXCITED TO MEET YOU!!!!</p>
              <p className="invitation-signoff">
                Your {DYNASTY_STYLE[activeUser.dynasty].label.toLowerCase()} heads,<br></br>
                {formatHeadsList(activeInvitation.heads)}
              </p>
            </article>
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default App

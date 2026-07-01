import { useState, useCallback } from 'react'
import './App.css'

// Pokémon IDs run roughly 1–1025 across all generations (National Dex).
const POKEMON_MAX_ID = 1025
const MAX_DISCOVERY_ATTEMPTS = 30
const HISTORY_LIMIT = 12

function randomId() {
  return Math.floor(Math.random() * POKEMON_MAX_ID) + 1
}

async function fetchSpecimen(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  if (!res.ok) {
    throw new Error(`PokeAPI request failed with status ${res.status}`)
  }
  const data = await res.json()
  return {
    id: data.id,
    name: data.name,
    image:
      data.sprites?.other?.['official-artwork']?.front_default ||
      data.sprites?.front_default,
    types: data.types.map((t) => t.type.name),
    abilities: data.abilities.map((a) => a.ability.name),
    heightM: (data.height / 10).toFixed(1),
    weightKg: (data.weight / 10).toFixed(1),
  }
}

function isBanned(specimen, banList) {
  return (
    specimen.types.some((t) => banList.includes(t)) ||
    specimen.abilities.some((a) => banList.includes(a))
  )
}

export default function App() {
  const [specimen, setSpecimen] = useState(null)
  const [banList, setBanList] = useState([])
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMessage, setErrorMessage] = useState('')

  const discover = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      let found = null
      for (let attempt = 0; attempt < MAX_DISCOVERY_ATTEMPTS; attempt++) {
        const candidate = await fetchSpecimen(randomId())
        if (!isBanned(candidate, banList)) {
          found = candidate
          break
        }
      }
      if (!found) {
        setStatus('error')
        setErrorMessage(
          "No specimen turned up outside your ban list after 30 tries. Try releasing something from the ban list."
        )
        return
      }
      setSpecimen(found)
      setHistory((prev) => [found, ...prev].slice(0, HISTORY_LIMIT))
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage('The field log lost signal. Try again in a moment.')
    }
  }, [banList])

  const toggleBan = (value) => {
    setBanList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Field Log No. 01</p>
        <h1>Veni Vici</h1>
        <p className="subhead">
          Pull a random specimen from the wild. Tag any trait you've had enough
          of, and it won't turn up again.
        </p>
      </header>

      <div className="stage">
        <div className="specimen-card">
          {specimen ? (
            <SpecimenView specimen={specimen} banList={banList} onToggleBan={toggleBan} />
          ) : (
            <EmptyState status={status} />
          )}
          {status === 'error' && errorMessage && (
            <p className="error-note">{errorMessage}</p>
          )}
        </div>

        <button
          className="discover-btn"
          onClick={discover}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Scouting…' : specimen ? 'Discover Another' : 'Discover'}
        </button>

        <BanList banList={banList} onToggleBan={toggleBan} />
      </div>

      <History entries={history} />
    </div>
  )
}

function EmptyState({ status }) {
  return (
    <div className="empty-state">
      <div className="empty-frame" aria-hidden="true">
        ?
      </div>
      <p>
        {status === 'loading'
          ? 'Combing the tall grass…'
          : 'Nothing logged yet. Hit Discover to find your first specimen.'}
      </p>
    </div>
  )
}

function SpecimenView({ specimen, banList, onToggleBan }) {
  return (
    <>
      <div className="specimen-photo-wrap">
        <img
          className="specimen-photo"
          src={specimen.image}
          alt={`Illustration of ${specimen.name}`}
        />
        <span className="specimen-number">#{String(specimen.id).padStart(4, '0')}</span>
      </div>

      <h2 className="specimen-name">{specimen.name}</h2>

      <dl className="specimen-stats">
        <div className="stat-row">
          <dt>Height</dt>
          <dd className="mono">{specimen.heightM} m</dd>
        </div>
        <div className="stat-row">
          <dt>Weight</dt>
          <dd className="mono">{specimen.weightKg} kg</dd>
        </div>
        <div className="stat-row">
          <dt>Type</dt>
          <dd>
            <ChipGroup values={specimen.types} banList={banList} onToggleBan={onToggleBan} />
          </dd>
        </div>
        <div className="stat-row">
          <dt>Abilities</dt>
          <dd>
            <ChipGroup values={specimen.abilities} banList={banList} onToggleBan={onToggleBan} />
          </dd>
        </div>
      </dl>
    </>
  )
}

function ChipGroup({ values, banList, onToggleBan }) {
  return (
    <div className="chip-group">
      {values.map((value) => (
        <button
          key={value}
          className={`chip${banList.includes(value) ? ' chip--banned' : ''}`}
          onClick={() => onToggleBan(value)}
          title={
            banList.includes(value)
              ? `Remove "${value}" from the ban list`
              : `Ban "${value}"`
          }
        >
          {value.replace('-', ' ')}
        </button>
      ))}
    </div>
  )
}

function BanList({ banList, onToggleBan }) {
  return (
    <section className="ban-list">
      <h3>Ban List</h3>
      {banList.length === 0 ? (
        <p className="ban-list-empty">
          Nothing banned yet. Click any type or ability tag above to bench it.
        </p>
      ) : (
        <div className="chip-group">
          {banList.map((value) => (
            <button
              key={value}
              className="chip chip--banned"
              onClick={() => onToggleBan(value)}
              title={`Remove "${value}" from the ban list`}
            >
              {value.replace('-', ' ')}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function History({ entries }) {
  if (entries.length === 0) return null
  return (
    <section className="history">
      <h3>Recent Sightings</h3>
      <div className="history-strip">
        {entries.map((entry, i) => (
          <div className="history-card" key={`${entry.id}-${i}`}>
            <img src={entry.image} alt={entry.name} />
            <span className="mono">#{String(entry.id).padStart(4, '0')}</span>
            <span>{entry.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
import React, { useState, useEffect } from 'react'
import { BookOpen, Filter, Search, Tag } from 'lucide-react'
import { getGratitudeEntries, getUniqueThemes } from '../lib/supabase'

function MemoryBrowser({ userId }) {
  const [entries, setEntries] = useState([])
  const [themes, setThemes] = useState([])
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      loadEntries()
    }
  }, [userId, selectedTheme])

  async function loadData() {
    try {
      setLoading(true)
      
      // Load themes for filter
      const themeList = await getUniqueThemes(userId)
      setThemes(themeList)
      
      // Load entries
      await loadEntries()
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Could not load memories.')
    } finally {
      setLoading(false)
    }
  }

  async function loadEntries() {
    try {
      const filters = {}
      if (selectedTheme) {
        filters.theme = selectedTheme
      }
      
      const data = await getGratitudeEntries(userId, filters)
      setEntries(data)
    } catch (err) {
      console.error('Error loading entries:', err)
    }
  }

  function handleThemeClick(theme) {
    if (selectedTheme === theme) {
      setSelectedTheme(null)
    } else {
      setSelectedTheme(theme)
    }
  }

  // Filter entries by search term
  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true
    
    const search = searchTerm.toLowerCase()
    return (
      entry.core_theme?.toLowerCase().includes(search) ||
      entry.summary_story?.toLowerCase().includes(search) ||
      entry.reflection_prompt?.toLowerCase().includes(search) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(search))
    )
  })

  if (loading) {
    return (
      <div className="memory-browser">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <BookOpen size={32} style={{ color: 'var(--soft-gold)', marginBottom: '1rem' }} />
          <p>Loading your memory garden...</p>
        </div>
      </div>
    )
  }

  if (entries.length === 0 && !selectedTheme) {
    return (
      <div className="memory-browser">
        <div className="empty-state">
          <BookOpen className="empty-state-icon" size={48} />
          <h3>Your memory garden awaits</h3>
          <p>
            Start by uploading cards, letters, or notes you've collected.
            Each one will become a gratitude seed you can browse and revisit.
          </p>
          <a href="/upload" className="btn btn-primary">
            Plant your first memory
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="memory-browser">
      <div className="browser-header">
        <h2 className="browser-title">
          <BookOpen size={24} style={{ marginRight: '0.5rem' }} />
          Memory Garden
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} color="var(--warm-gray)" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ width: '200px', padding: '0.5rem 1rem' }}
          />
        </div>
      </div>

      {/* Theme filters */}
      {themes.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.75rem',
            color: 'var(--warm-gray)',
            fontSize: '0.85rem'
          }}>
            <Filter size={14} />
            <span>Filter by theme:</span>
          </div>
          <div className="filter-tags">
            {themes.map(theme => (
              <button
                key={theme}
                className={`filter-tag ${selectedTheme === theme ? 'active' : ''}`}
                onClick={() => handleThemeClick(theme)}
              >
                {theme}
              </button>
            ))}
            {selectedTheme && (
              <button
                className="filter-tag"
                onClick={() => setSelectedTheme(null)}
                style={{ fontStyle: 'italic' }}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      <p style={{ 
        color: 'var(--warm-gray)', 
        fontSize: '0.85rem',
        marginBottom: '1rem' 
      }}>
        {filteredEntries.length} {filteredEntries.length === 1 ? 'memory' : 'memories'}
        {selectedTheme && ` tagged "${selectedTheme}"`}
        {searchTerm && ` matching "${searchTerm}"`}
      </p>

      {/* Memory grid */}
      {filteredEntries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--warm-gray)' }}>
            No memories match your current filters.
          </p>
        </div>
      ) : (
        <div className="memory-grid">
          {filteredEntries.map(entry => (
            <MemoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

// Individual memory card component
function MemoryCard({ entry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div 
      className="memory-card"
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: 'pointer' }}
    >
      <div className="memory-theme">{entry.core_theme}</div>
      
      <p className="memory-story">
        "{entry.summary_story}"
      </p>
      
      {expanded && (
        <div style={{ 
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(184, 149, 110, 0.2)'
        }}>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'var(--charcoal)',
            marginBottom: '0.75rem'
          }}>
            <strong>Reflection prompt:</strong><br />
            {entry.reflection_prompt}
          </p>
          
          {entry.specific_details && entry.specific_details.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Details:</strong>
              <ul style={{ 
                fontSize: '0.85rem', 
                color: 'var(--warm-gray)',
                marginTop: '0.25rem',
                paddingLeft: '1.25rem'
              }}>
                {entry.specific_details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
          
          {entry.season && entry.season !== 'any' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--warm-gray)' }}>
              Season: {entry.season}
            </p>
          )}
          
          {entry.holiday_associations && entry.holiday_associations.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--warm-gray)' }}>
              Holidays: {entry.holiday_associations.join(', ')}
            </p>
          )}
        </div>
      )}
      
      {entry.tags && entry.tags.length > 0 && (
        <div className="memory-tags" style={{ marginTop: '1rem' }}>
          {entry.tags.map((tag, i) => (
            <span key={i} className="tag">
              <Tag size={10} style={{ marginRight: '0.25rem' }} />
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <p style={{ 
        fontSize: '0.75rem', 
        color: 'var(--warm-gray)',
        marginTop: '0.75rem',
        fontStyle: 'italic'
      }}>
        {expanded ? 'Click to collapse' : 'Click to expand'}
      </p>
    </div>
  )
}

export default MemoryBrowser

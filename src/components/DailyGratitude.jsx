import React, { useState, useEffect } from 'react'
import { Heart, Leaf, Snowflake, Sun, Cloud, Calendar } from 'lucide-react'
import { getDailyGratitude, markAsViewed } from '../lib/supabase'
import { 
  getFormattedDate, 
  getSurfacingDisplayText, 
  getCurrentSeason,
  getSeasonalGreeting 
} from '../lib/surfacing-logic'
import ReflectionInput from './ReflectionInput'

// Season icons
const SeasonIcon = ({ season, size = 20 }) => {
  switch (season) {
    case 'spring':
      return <Leaf size={size} />
    case 'summer':
      return <Sun size={size} />
    case 'fall':
      return <Cloud size={size} />
    case 'winter':
      return <Snowflake size={size} />
    default:
      return <Calendar size={size} />
  }
}

function DailyGratitude({ userId }) {
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showReflection, setShowReflection] = useState(false)

  useEffect(() => {
    if (userId) {
      loadDailyGratitude()
    }
  }, [userId])

  async function loadDailyGratitude() {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getDailyGratitude(userId)
      setEntry(data)
      
      // Mark as viewed
      if (data?.entry_id) {
        await markAsViewed(userId, data.entry_id)
      }
    } catch (err) {
      console.error('Error loading daily gratitude:', err)
      setError('Could not load today\'s gratitude seed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleReflectionSaved() {
    setShowReflection(false)
    // Could show a success message here
  }

  const currentSeason = getCurrentSeason()

  if (loading) {
    return (
      <div className="daily-gratitude">
        <div className="card">
          <Heart className="loading-icon" size={32} />
          <p>Finding today's gratitude seed...</p>
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="daily-gratitude">
        <p className="daily-date">{getFormattedDate()}</p>
        
        <div className="empty-state">
          <Heart className="empty-state-icon" size={48} />
          <h3>Your garden is ready to grow</h3>
          <p>
            Upload your first memory to start receiving daily gratitude seeds.
            Each card, letter, or photo you add becomes a seed that can bloom
            into a moment of reflection.
          </p>
          <a href="/upload" className="btn btn-primary">
            Plant your first memory
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="daily-gratitude">
      <p className="daily-date">{getFormattedDate()}</p>
      
      <div className="gratitude-card">
        <div className="gratitude-theme">
          {entry.core_theme}
        </div>
        
        <p className="gratitude-story">
          "{entry.summary_story}"
        </p>
        
        <div className="gratitude-prompt">
          <p>{entry.reflection_prompt}</p>
          <span>Today's reflection prompt</span>
        </div>
        
        {entry.surfacing_reason && (
          <div className="surfacing-reason">
            <SeasonIcon season={currentSeason} size={16} />
            <span>{getSurfacingDisplayText(entry.surfacing_reason)}</span>
          </div>
        )}
        
        <div className="reflection-section">
          {!showReflection ? (
            <button 
              className="reflection-toggle"
              onClick={() => setShowReflection(true)}
            >
              <Heart size={18} />
              Record my reflection
            </button>
          ) : (
            <ReflectionInput
              userId={userId}
              entryId={entry.entry_id}
              prompt={entry.reflection_prompt}
              onSave={handleReflectionSaved}
              onCancel={() => setShowReflection(false)}
            />
          )}
        </div>
      </div>
      
      <div className="seasonal-message" style={{ 
        marginTop: '2rem', 
        textAlign: 'center',
        color: 'var(--warm-gray)',
        fontSize: '0.9rem',
        fontStyle: 'italic'
      }}>
        {getSeasonalGreeting()}
      </div>
    </div>
  )
}

export default DailyGratitude

import React, { useState, useEffect, useRef } from 'react'
import { Heart, Leaf, Snowflake, Sun, Cloud, Calendar, Volume2, Loader, Square } from 'lucide-react'
import { getDailyGratitude, markAsViewed, getVoiceForSender } from '../lib/supabase'
import { 
  getFormattedDate, 
  getSurfacingDisplayText, 
  getCurrentSeason,
  getSeasonalGreeting 
} from '../lib/surfacing-logic'
import { generateSpeech, prepareTextForSpeech, FALLBACK_VOICE_ID } from '../lib/elevenlabs'
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
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    if (userId) {
      loadDailyGratitude()
    }
  }, [userId])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src)
        }
      }
    }
  }, [])

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

  async function handleListen() {
    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      return
    }

    try {
      setIsLoadingAudio(true)
      setAudioError(null)

      // Get the voice for this sender
      let voiceId = FALLBACK_VOICE_ID
      if (entry.sender_name) {
        const voiceMapping = await getVoiceForSender(userId, entry.sender_name)
        if (voiceMapping?.elevenlabs_voice_id) {
          voiceId = voiceMapping.elevenlabs_voice_id
        }
      }

      // Prepare the text to read
      const textToRead = prepareTextForSpeech(entry.summary_story)
      
      // Generate speech
      const audioUrl = await generateSpeech(textToRead, voiceId)

      // Create or update audio element
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      
      // Revoke old URL if exists
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src)
      }

      audioRef.current.src = audioUrl
      
      audioRef.current.onended = () => {
        setIsPlaying(false)
      }
      
      audioRef.current.onerror = () => {
        setAudioError('Failed to play audio')
        setIsPlaying(false)
      }

      await audioRef.current.play()
      setIsPlaying(true)

    } catch (err) {
      console.error('Error playing audio:', err)
      setAudioError(err.message || 'Could not play audio. Please try again.')
    } finally {
      setIsLoadingAudio(false)
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

        {/* Listen Button */}
        <div className="listen-section" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={handleListen}
            disabled={isLoadingAudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem'
            }}
          >
            {isLoadingAudio ? (
              <>
                <Loader className="processing-spinner" size={18} />
                Generating audio...
              </>
            ) : isPlaying ? (
              <>
                <Square size={18} />
                Stop
              </>
            ) : (
              <>
                <Volume2 size={18} />
                Listen
              </>
            )}
          </button>
          
          {entry.sender_name && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--warm-gray)', 
              marginTop: '0.5rem',
              fontStyle: 'italic'
            }}>
              {isPlaying ? `Playing...` : `From ${entry.sender_name}`}
            </p>
          )}
          
          {audioError && (
            <p style={{ 
              fontSize: '0.85rem', 
              color: '#c44', 
              marginTop: '0.5rem' 
            }}>
              {audioError}
            </p>
          )}
        </div>
        
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

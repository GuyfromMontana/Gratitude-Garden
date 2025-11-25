import React, { useState, useEffect } from 'react'
import { Volume2, Plus, Trash2, Check, AlertCircle, Star, Info } from 'lucide-react'
import { 
  getSenderVoices, 
  upsertSenderVoice, 
  deleteSenderVoice, 
  setDefaultVoice,
  getUniqueSenders 
} from '../lib/supabase'
import { DEFAULT_VOICES, generateSpeech, FALLBACK_VOICE_ID } from '../lib/elevenlabs'

function VoiceManagement({ userId }) {
  const [voices, setVoices] = useState([])
  const [senders, setSenders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // New voice form
  const [newSenderName, setNewSenderName] = useState('')
  const [newVoiceId, setNewVoiceId] = useState('')
  const [newVoiceNotes, setNewVoiceNotes] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Test playback
  const [testingVoice, setTestingVoice] = useState(null)

  useEffect(() => {
    loadData()
  }, [userId])

  async function loadData() {
    try {
      setLoading(true)
      const [voiceData, senderData] = await Promise.all([
        getSenderVoices(userId),
        getUniqueSenders(userId)
      ])
      setVoices(voiceData)
      setSenders(senderData)
    } catch (err) {
      console.error('Error loading voices:', err)
      setError('Could not load voice settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddVoice(e) {
    e.preventDefault()
    
    if (!newSenderName.trim()) {
      setError('Please enter a sender name')
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      await upsertSenderVoice(
        userId, 
        newSenderName.trim(), 
        newVoiceId.trim() || null,
        newVoiceNotes.trim()
      )
      
      // Refresh data
      await loadData()
      
      // Clear form
      setNewSenderName('')
      setNewVoiceId('')
      setNewVoiceNotes('')
      setSuccess('Voice added successfully!')
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err) {
      console.error('Error adding voice:', err)
      setError('Could not add voice. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteVoice(senderName) {
    if (!confirm(`Remove voice for "${senderName}"?`)) return
    
    try {
      await deleteSenderVoice(userId, senderName)
      await loadData()
      setSuccess('Voice removed')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error deleting voice:', err)
      setError('Could not remove voice')
    }
  }

  async function handleSetDefault(senderName) {
    try {
      await setDefaultVoice(userId, senderName)
      await loadData()
      setSuccess(`${senderName} set as default voice`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error setting default:', err)
      setError('Could not set default voice')
    }
  }

  async function handleTestVoice(voiceId, senderName) {
    try {
      setTestingVoice(senderName)
      const testText = "Hello, this is a test of the voice. The quick brown fox jumps over the lazy dog."
      const audioUrl = await generateSpeech(testText, voiceId || FALLBACK_VOICE_ID)
      const audio = new Audio(audioUrl)
      audio.onended = () => {
        setTestingVoice(null)
        URL.revokeObjectURL(audioUrl)
      }
      await audio.play()
    } catch (err) {
      console.error('Error testing voice:', err)
      setError('Could not test voice: ' + err.message)
      setTestingVoice(null)
    }
  }

  // Senders without voices yet
  const sendersWithoutVoices = senders.filter(
    s => !voices.find(v => v.sender_name.toLowerCase() === s.toLowerCase())
  )

  if (loading) {
    return (
      <div className="voice-management">
        <p>Loading voice settings...</p>
      </div>
    )
  }

  return (
    <div className="voice-management" style={{ maxWidth: '700px', margin: '0 auto', padding: '1rem' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Voice Settings</h2>
      <p style={{ color: 'var(--warm-gray)', marginBottom: '2rem' }}>
        Link senders to voices so memories can be read aloud in their voice.
      </p>

      {error && (
        <div className="alert alert-error" style={{ 
          background: '#fee', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ 
          background: '#efe', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={18} />
          {success}
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        background: 'var(--aged-paper)', 
        padding: '1.5rem', 
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Info size={20} />
          How to Clone a Voice
        </h3>
        <ol style={{ lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li>Go to <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">elevenlabs.io</a> and create an account</li>
          <li>Click <strong>Voices</strong> → <strong>Add Voice</strong> → <strong>Instant Voice Clone</strong></li>
          <li>Upload 1+ minutes of clear audio (voicemail, video clip, recording)</li>
          <li>Name the voice (e.g., "Mom's Voice") and create it</li>
          <li>Copy the <strong>Voice ID</strong> from the voice details</li>
          <li>Paste it below next to the sender's name</li>
        </ol>
      </div>

      {/* Current Voices */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Configured Voices</h3>
        
        {voices.length === 0 ? (
          <p style={{ color: 'var(--warm-gray)', fontStyle: 'italic' }}>
            No voices configured yet. Add one below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {voices.map(voice => (
              <div 
                key={voice.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  background: voice.is_default ? 'var(--soft-gold)' : 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--aged-border)'
                }}
              >
                <div>
                  <strong>{voice.sender_name}</strong>
                  {voice.is_default && (
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      fontSize: '0.8rem',
                      color: 'var(--sage-green)'
                    }}>
                      <Star size={14} style={{ marginRight: '0.25rem' }} />
                      Default
                    </span>
                  )}
                  {voice.voice_notes && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--warm-gray)', marginTop: '0.25rem' }}>
                      {voice.voice_notes}
                    </p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                    {voice.elevenlabs_voice_id 
                      ? `Voice ID: ${voice.elevenlabs_voice_id.substring(0, 12)}...`
                      : 'Using default voice'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleTestVoice(voice.elevenlabs_voice_id, voice.sender_name)}
                    disabled={testingVoice === voice.sender_name}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 0.75rem' }}
                    title="Test voice"
                  >
                    <Volume2 size={16} />
                  </button>
                  
                  {!voice.is_default && (
                    <button
                      onClick={() => handleSetDefault(voice.sender_name)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.75rem' }}
                      title="Set as default"
                    >
                      <Star size={16} />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteVoice(voice.sender_name)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 0.75rem', color: '#c44' }}
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Voice */}
      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '12px',
        border: '1px solid var(--aged-border)'
      }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} />
          Add Voice
        </h3>
        
        <form onSubmit={handleAddVoice}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Sender Name</label>
            {sendersWithoutVoices.length > 0 ? (
              <select
                className="form-select"
                value={newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
              >
                <option value="">Select or type a name...</option>
                {sendersWithoutVoices.map(sender => (
                  <option key={sender} value={sender}>{sender}</option>
                ))}
                <option value="__custom__">+ Add custom name</option>
              </select>
            ) : null}
            
            {(sendersWithoutVoices.length === 0 || newSenderName === '__custom__') && (
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Mom, Dad, Grandma Rose"
                value={newSenderName === '__custom__' ? '' : newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
                style={{ marginTop: sendersWithoutVoices.length > 0 ? '0.5rem' : 0 }}
              />
            )}
          </div>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">ElevenLabs Voice ID (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., EXAVITQu4vr4xnSDxMaL"
              value={newVoiceId}
              onChange={(e) => setNewVoiceId(e.target.value)}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--warm-gray)', marginTop: '0.25rem' }}>
              Leave blank to use the default voice
            </p>
          </div>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Notes (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Cloned from 2019 voicemail"
              value={newVoiceNotes}
              onChange={(e) => setNewVoiceNotes(e.target.value)}
            />
          </div>

          {/* Quick select default voices */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Or use a pre-made voice:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {Object.entries(DEFAULT_VOICES).map(([name, id]) => (
                <button
                  key={id}
                  type="button"
                  className="btn btn-secondary"
                  style={{ 
                    padding: '0.4rem 0.75rem', 
                    fontSize: '0.85rem',
                    background: newVoiceId === id ? 'var(--soft-gold)' : undefined
                  }}
                  onClick={() => setNewVoiceId(id)}
                >
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving || !newSenderName.trim() || newSenderName === '__custom__'}
          >
            {saving ? 'Saving...' : 'Add Voice'}
          </button>
        </form>
      </div>

      {/* ElevenLabs pricing note */}
      <p style={{ 
        fontSize: '0.85rem', 
        color: 'var(--warm-gray)', 
        textAlign: 'center',
        marginTop: '2rem'
      }}>
        Voice generation uses <a href="https://elevenlabs.io/pricing" target="_blank" rel="noopener noreferrer">ElevenLabs</a>. 
        Free tier includes ~10,000 characters/month.
      </p>
    </div>
  )
}

export default VoiceManagement

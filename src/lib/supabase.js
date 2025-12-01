import React, { useState, useEffect } from 'react'
import { BookOpen, Search, X, Volume2, Calendar, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateSpeech, getSenderVoiceId, FALLBACK_VOICE_ID } from '../lib/elevenlabs'

function MemoryBrowser({ userId }) {
  const [memories, setMemories] = useState([])
  const [filteredMemories, setFilteredMemories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState(null)

  useEffect(() => {
    if (userId) {
      loadMemories()
    }
  }, [userId])

  useEffect(() => {
    filterMemories()
  }, [searchTerm, memories])

  async function loadMemories() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setMemories(data || [])
      setFilteredMemories(data || [])
    } catch (error) {
      console.error('Error loading memories:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterMemories() {
    if (!searchTerm.trim()) {
      setFilteredMemories(memories)
      return
    }
    
    const term = searchTerm.toLowerCase()
    const filtered = memories.filter(memory => 
      (memory.sender_name && memory.sender_name.toLowerCase().includes(term)) ||
      (memory.occasion && memory.occasion.toLowerCase().includes(term)) ||
      (memory.extracted_text && memory.extracted_text.toLowerCase().includes(term))
    )
    setFilteredMemories(filtered)
  }

  async function handleListen(memory) {
    if (playing && audioElement) {
      audioElement.pause()
      setPlaying(false)
      setAudioElement(null)
      return
    }

    if (!memory.extracted_text) return

    try {
      setPlaying(true)
      const voiceId = await getSenderVoiceId(userId, memory.sender_name) || FALLBACK_VOICE_ID
      const audioUrl = await generateSpeech(memory.extracted_text, voiceId)
      
      const audio = new Audio(audioUrl)
      setAudioElement(audio)
      
      audio.onended = () => {
        setPlaying(false)
        setAudioElement(null)
      }
      
      audio.play()
    } catch (error) {
      console.error('Error playing audio:', error)
      setPlaying(false)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="browser-container">
        <div className="browser-header">
          <h2><BookOpen size={24} /> Memory Garden</h2>
        </div>
        <div className="loading-message">Loading your memories...</div>
      </div>
    )
  }

  return (
    <div className="browser-container">
      <div className="browser-header">
        <h2><BookOpen size={24} /> Memory Garden</h2>
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by sender, occasion, or text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <p className="memory-count">{filteredMemories.length} memories</p>

      {/* Memory Grid */}
      <div className="memory-grid">
        {filteredMemories.map(memory => (
          <div 
            key={memory.id} 
            className="memory-card"
            onClick={() => setSelectedMemory(memory)}
          >
            {memory.original_image_url ? (
              <img 
                src={memory.original_image_url} 
                alt={`From ${memory.sender_name || 'Unknown'}`}
                className="memory-thumbnail"
              />
            ) : (
              <div className="memory-placeholder">
                <BookOpen size={32} />
              </div>
            )}
            <div className="memory-card-info">
              <span className="memory-sender">{memory.sender_name || 'Unknown'}</span>
              {memory.occasion && <span className="memory-occasion">{memory.occasion}</span>}
            </div>
          </div>
        ))}
      </div>

      {filteredMemories.length === 0 && (
        <div className="no-memories">
          {searchTerm ? 'No memories match your search.' : 'No memories yet. Upload some!'}
        </div>
      )}

      {/* Selected Memory Modal */}
      {selectedMemory && (
        <div className="memory-modal-overlay" onClick={() => setSelectedMemory(null)}>
          <div className="memory-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMemory(null)}>
              <X size={24} />
            </button>
            
            <div className="modal-content">
              {selectedMemory.original_image_url && (
                <img 
                  src={selectedMemory.original_image_url} 
                  alt={`From ${selectedMemory.sender_name || 'Unknown'}`}
                  className="modal-image"
                />
              )}
              
              <div className="modal-details">
                <div className="modal-meta">
                  {selectedMemory.sender_name && (
                    <span><User size={16} /> {selectedMemory.sender_name}</span>
                  )}
                  {selectedMemory.occasion && (
                    <span><Calendar size={16} /> {selectedMemory.occasion}</span>
                  )}
                  {selectedMemory.date_received && (
                    <span>{formatDate(selectedMemory.date_received)}</span>
                  )}
                </div>
                
                {selectedMemory.extracted_text && (
                  <div className="modal-text">
                    {selectedMemory.extracted_text}
                  </div>
                )}
                
                <button 
                  className="listen-button"
                  onClick={() => handleListen(selectedMemory)}
                  disabled={!selectedMemory.extracted_text}
                >
                  <Volume2 size={18} />
                  {playing ? 'Stop' : 'Listen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemoryBrowser

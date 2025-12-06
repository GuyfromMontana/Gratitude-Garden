import { useState, useEffect } from 'react'
import { Users, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase, copyMemoriesToUser } from '../lib/supabase'

export default function AdminPanel({ userId }) {
  const [memories, setMemories] = useState([])
  const [selectedMemories, setSelectedMemories] = useState([])
  const [targetUser, setTargetUser] = useState('')
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadData()
  }, [userId])

  async function loadData() {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (!userData?.is_admin) {
        setLoading(false)
        return
      }
      setIsAdmin(true)

      const { data: mems, error: memError } = await supabase
        .from('memories')
        .select('id, sender_name, occasion, date_received, extracted_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (memError) throw memError
      setMemories(mems || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleMemory(memoryId) {
    setSelectedMemories(prev => 
      prev.includes(memoryId)
        ? prev.filter(id => id !== memoryId)
        : [...prev, memoryId]
    )
  }

  function selectAll() {
    setSelectedMemories(memories.map(m => m.id))
  }

  function selectNone() {
    setSelectedMemories([])
  }

  async function handleCopy() {
    if (!targetUser) {
      setMessage('Please enter a family member User ID')
      return
    }
    if (selectedMemories.length === 0) {
      setMessage('Please select at least one memory')
      return
    }

    setCopying(true)
    setMessage('')

    try {
      await copyMemoriesToUser(selectedMemories, targetUser)
      setMessage(`✅ Copied ${selectedMemories.length} memories successfully!`)
      setSelectedMemories([])
    } catch (err) {
      console.error('Copy error:', err)
      setMessage(`❌ Error: ${err.message}`)
    } finally {
      setCopying(false)
    }
  }

  if (loading) {
    return null
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="admin-panel">
      <div 
        className="admin-header" 
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <h2>
          <Users size={24} />
          Family Sharing
        </h2>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {expanded && (
        <div className="admin-content">
          <p className="admin-description">
            Copy memories to your kids' Gratitude Gardens. They'll see the same 
            memories in their own accounts.
          </p>

          <div className="form-group">
            <label className="form-label">Family Member's User ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Paste their User ID from Supabase Auth"
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
            />
            <small style={{ color: 'var(--warm-gray)', fontSize: '0.8rem' }}>
              Find this in Supabase → Authentication → Users
            </small>
          </div>

          <div className="memory-selection">
            <div className="selection-header">
              <span>{selectedMemories.length} of {memories.length} selected</span>
              <div className="selection-actions">
                <button onClick={selectAll} className="link-button">Select All</button>
                <button onClick={selectNone} className="link-button">Select None</button>
              </div>
            </div>

            <div className="memory-checklist">
              {memories.map(memory => (
                <label key={memory.id} className="memory-check-item">
                  <input
                    type="checkbox"
                    checked={selectedMemories.includes(memory.id)}
                    onChange={() => toggleMemory(memory.id)}
                  />
                  <span className="memory-check-info">
                    <strong>{memory.sender_name || 'Unknown'}</strong>
                    {memory.occasion && ` - ${memory.occasion}`}
                    {memory.date_received && ` (${memory.date_received})`}
                    <br />
                    <small>{memory.extracted_text?.substring(0, 80)}...</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button 
            onClick={handleCopy} 
            className="btn btn-primary"
            disabled={copying || selectedMemories.length === 0 || !targetUser}
            style={{ width: '100%', marginTop: 'var(--space-md)' }}
          >
            <Copy size={18} />
            {copying ? 'Copying...' : `Copy ${selectedMemories.length} Memories`}
          </button>

          {message && (
            <p className="admin-message">{message}</p>
          )}
        </div>
      )}
    </div>
  )
}

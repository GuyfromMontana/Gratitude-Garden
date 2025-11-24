import React, { useState } from 'react'
import { Send, X, Loader } from 'lucide-react'
import { saveReflection } from '../lib/supabase'

function ReflectionInput({ userId, entryId, prompt, onSave, onCancel }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!text.trim()) {
      setError('Please write something before saving.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      await saveReflection(userId, entryId, text)
      
      if (onSave) {
        onSave()
      }
    } catch (err) {
      console.error('Error saving reflection:', err)
      setError('Could not save your reflection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="reflection-form" onSubmit={handleSubmit}>
      <div style={{ 
        marginBottom: '1rem',
        padding: '0.75rem',
        background: 'rgba(212, 165, 116, 0.1)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        color: 'var(--charcoal)'
      }}>
        <strong>Prompt:</strong> {prompt}
      </div>
      
      <textarea
        className="reflection-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Take a moment to reflect... What thoughts and feelings arise?"
        disabled={saving}
        autoFocus
      />
      
      {error && (
        <p style={{ 
          color: 'var(--deep-burgundy)', 
          fontSize: '0.85rem',
          marginTop: '0.5rem' 
        }}>
          {error}
        </p>
      )}
      
      <div className="reflection-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader className="processing-spinner" size={16} />
              Saving...
            </>
          ) : (
            <>
              <Send size={16} />
              Save Reflection
            </>
          )}
        </button>
        
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          <X size={16} />
          Cancel
        </button>
      </div>
      
      <p style={{ 
        fontSize: '0.8rem', 
        color: 'var(--warm-gray)',
        marginTop: '1rem',
        textAlign: 'center'
      }}>
        Your reflections are private and help deepen your gratitude practice.
      </p>
    </form>
  )
}

export default ReflectionInput

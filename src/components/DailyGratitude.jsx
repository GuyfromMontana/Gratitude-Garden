import React, { useState, useEffect } from 'react';
import { Heart, Volume2, RefreshCw, PenLine, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { speakText } from '../lib/elevenlabs';

export default function DailyGratitude({ userId }) {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userId) {
      loadDailyMemory();
    }
  }, [userId]);

  async function loadDailyMemory() {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Pick one based on today's date (same memory all day)
        const today = new Date().toDateString();
        const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const index = seed % data.length;
        setMemory(data[index]);
      } else {
        setMemory(null);
      }
    } catch (err) {
      console.error('Error loading memory:', err);
      setError('Could not load your memory');
    } finally {
      setLoading(false);
    }
  }

  async function pickNewMemory() {
    setLoading(true);
    setShowReflection(false);
    setReflectionText('');
    setSaved(false);
    
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        const index = Math.floor(Math.random() * data.length);
        setMemory(data[index]);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleListen() {
    if (!memory || !memory.extracted_text) return;
    
    setPlaying(true);
    try {
      await speakText(memory.extracted_text, userId, memory.sender_name);
    } catch (err) {
      console.error('Error playing audio:', err);
    } finally {
      setPlaying(false);
    }
  }

  async function saveReflection() {
    if (!reflectionText.trim() || !memory) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('reflections')
        .insert([{
          user_id: userId,
          memory_id: memory.id,
          reflection_text: reflectionText,
        }]);

      if (error) throw error;
      
      setSaved(true);
      setReflectionText('');
    } catch (err) {
      console.error('Error saving reflection:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="daily-gratitude loading">
        <Heart className="loading-icon" size={32} />
        <p>Finding today's memory...</p>
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="daily-gratitude empty">
        <div className="empty-state">
          <Heart size={48} />
          <h2>Plant Your First Seed</h2>
          <p>Upload a card or letter to start your gratitude garden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-gratitude">
      <div className="memory-card">
        <div className="memory-header">
          <div className="memory-from">
            <span className="label">From:</span>
            <span className="sender">{memory.sender_name}</span>
          </div>
          {memory.occasion && (
            <div className="memory-occasion">
              <span className="label">Occasion:</span>
              <span className="occasion">{memory.occasion}</span>
            </div>
          )}
        </div>

        <div className="memory-text">
          {memory.extracted_text}
        </div>

        <div className="memory-actions">
          <button 
            onClick={handleListen} 
            disabled={playing}
            className="listen-button"
          >
            <Volume2 size={20} />
            {playing ? 'Playing...' : 'Listen'}
          </button>

          <button 
            onClick={pickNewMemory}
            className="shuffle-button"
          >
            <RefreshCw size={20} />
            Another
          </button>

          <button 
            onClick={() => setShowReflection(!showReflection)}
            className={`reflect-button ${showReflection ? 'active' : ''}`}
          >
            {showReflection ? <X size={20} /> : <PenLine size={20} />}
            {showReflection ? 'Close' : 'Reflect'}
          </button>
        </div>

        {showReflection && (
          <div className="reflection-section">
            <h3>What does this memory bring up for you?</h3>
            
            {saved ? (
              <div className="reflection-saved">
                <Heart size={24} />
                <p>Your reflection has been saved.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="Write your thoughts..."
                  rows={4}
                />
                <button 
                  onClick={saveReflection}
                  disabled={saving || !reflectionText.trim()}
                  className="save-reflection-button"
                >
                  {saving ? 'Saving...' : 'Save Reflection'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

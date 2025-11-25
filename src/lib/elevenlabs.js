// ElevenLabs Text-to-Speech Integration
// Converts text to audio using cloned or default voices

// Default voice IDs from ElevenLabs (pre-made voices)
export const DEFAULT_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',  // Warm female
  adam: 'pNInz6obpgDQGcFmaJgB',    // Warm male
  bella: 'EXAVITQu4vr4xnSDxMaL',   // Soft female
  antoni: 'ErXwobaYiN019PkySvjV',  // Friendly male
  elli: 'MF3mGyEYCl7XYWbV9V6O',    // Young female
  josh: 'TxGEqnHWrfWFTfGW9XjX',    // Deep male
}

// Default voice to use when no custom voice is set
export const FALLBACK_VOICE_ID = DEFAULT_VOICES.bella

// Generate speech from text using ElevenLabs API
export async function generateSpeech(text, voiceId = FALLBACK_VOICE_ID) {
  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured. Please add VITE_ELEVENLABS_API_KEY to your environment variables.')
  }
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided for speech generation')
  }
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail?.message || `ElevenLabs API error: ${response.status}`)
    }
    
    // Get audio as blob
    const audioBlob = await response.blob()
    
    // Create URL for audio playback
    const audioUrl = URL.createObjectURL(audioBlob)
    
    return audioUrl
    
  } catch (error) {
    console.error('ElevenLabs TTS error:', error)
    throw error
  }
}

// Play audio from URL
export function playAudio(audioUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl)
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl) // Clean up blob URL
      resolve()
    }
    
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl)
      reject(new Error('Failed to play audio'))
    }
    
    audio.play().catch(reject)
  })
}

// Generate and play speech (convenience function)
export async function speakText(text, voiceId = FALLBACK_VOICE_ID) {
  const audioUrl = await generateSpeech(text, voiceId)
  await playAudio(audioUrl)
  return audioUrl
}

// Get list of available voices from ElevenLabs
export async function getAvailableVoices() {
  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured')
  }
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`)
    }
    
    const data = await response.json()
    return data.voices || []
    
  } catch (error) {
    console.error('Error fetching voices:', error)
    throw error
  }
}

// Format text for better speech output
export function prepareTextForSpeech(text) {
  if (!text) return ''
  
  // Clean up text for natural speech
  let prepared = text
    .replace(/\n\n+/g, '. ') // Multiple newlines to pause
    .replace(/\n/g, ', ')    // Single newlines to brief pause
    .replace(/[""]/g, '"')   // Normalize quotes
    .replace(/['']/g, "'")   // Normalize apostrophes
    .replace(/\s+/g, ' ')    // Collapse whitespace
    .trim()
  
  // Ensure ends with punctuation for natural ending
  if (!/[.!?]$/.test(prepared)) {
    prepared += '.'
  }
  
  return prepared
}

// Create introduction for a memory
export function createMemoryIntro(senderName, occasion) {
  const introOptions = [
    `Here's a message from ${senderName || 'someone special'}.`,
    `This memory comes from ${senderName || 'a loved one'}.`,
    `${senderName || 'Someone special'} wrote this${occasion ? ` for ${occasion}` : ''}.`,
  ]
  
  return introOptions[Math.floor(Math.random() * introOptions.length)]
}

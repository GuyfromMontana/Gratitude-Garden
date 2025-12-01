// ElevenLabs Text-to-Speech Integration
import { supabase } from './supabase';

// Default voice IDs from ElevenLabs (pre-made voices)
export const DEFAULT_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  adam: 'pNInz6obpgDQGcFmaJgB',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  antoni: 'ErXwobaYiN019PkySvjV',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
}

export const FALLBACK_VOICE_ID = DEFAULT_VOICES.rachel;

// Look up voice ID for a sender
async function getVoiceForSender(userId, senderName) {
  try {
    // Try exact match first
    const { data } = await supabase
      .from('sender_voices')
      .select('elevenlabs_voice_id')
      .eq('user_id', userId)
      .ilike('sender_name', senderName)
      .single();

    if (data?.elevenlabs_voice_id) {
      return data.elevenlabs_voice_id;
    }

    // Try to find a default voice for this user
    const { data: defaultVoice } = await supabase
      .from('sender_voices')
      .select('elevenlabs_voice_id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (defaultVoice?.elevenlabs_voice_id) {
      return defaultVoice.elevenlabs_voice_id;
    }

    // Fall back to built-in voice
    return FALLBACK_VOICE_ID;
  } catch (err) {
    console.log('Using fallback voice');
    return FALLBACK_VOICE_ID;
  }
}

// Generate speech from text using ElevenLabs API
export async function generateSpeech(text, voiceId = FALLBACK_VOICE_ID) {
  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured.');
  }
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided for speech generation');
  }
  
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
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || `ElevenLabs API error: ${response.status}`);
  }
  
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  return audioUrl;
}

// Play audio from URL
export function playAudio(audioUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Failed to play audio'));
    };
    
    audio.play().catch(reject);
  });
}

// Main function: look up voice and speak text
export async function speakText(text, userId, senderName) {
  const voiceId = await getVoiceForSender(userId, senderName);
  console.log('Using voice ID:', voiceId, 'for sender:', senderName);
  const audioUrl = await generateSpeech(text, voiceId);
  await playAudio(audioUrl);
  return audioUrl;
}

// Get list of available voices from ElevenLabs
export async function getAvailableVoices() {
  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }
  
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }
  
  const data = await response.json();
  return data.voices || [];
}
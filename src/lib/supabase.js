import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please check your .env file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Helper function to upload image to Supabase Storage
export async function uploadMemoryImage(file, userId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('memory-images')
    .upload(fileName, file)
  
  if (error) {
    throw error
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('memory-images')
    .getPublicUrl(fileName)
  
  return publicUrl
}

// Get daily gratitude entry using the database function
export async function getDailyGratitude(userId) {
  const { data, error } = await supabase
    .rpc('get_daily_gratitude', { p_user_id: userId })
  
  if (error) {
    throw error
  }
  
  return data?.[0] || null
}

// Mark daily surface as viewed
export async function markAsViewed(userId, entryId) {
  const { error } = await supabase
    .from('daily_surfaces')
    .update({ 
      was_viewed: true,
      viewed_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('gratitude_entry_id', entryId)
    .eq('surfaced_date', new Date().toISOString().split('T')[0])
  
  if (error) {
    throw error
  }
}

// Save a reflection
export async function saveReflection(userId, entryId, reflectionText) {
  const { data, error } = await supabase
    .from('reflections')
    .insert([{
      user_id: userId,
      gratitude_entry_id: entryId,
      reflection_text: reflectionText
    }])
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  // Link reflection to daily surface
  await supabase
    .from('daily_surfaces')
    .update({ reflection_id: data.id })
    .eq('user_id', userId)
    .eq('gratitude_entry_id', entryId)
    .eq('surfaced_date', new Date().toISOString().split('T')[0])
  
  return data
}

// Get all gratitude entries for browsing
export async function getGratitudeEntries(userId, filters = {}) {
  let query = supabase
    .from('gratitude_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (filters.theme) {
    query = query.eq('core_theme', filters.theme)
  }
  
  if (filters.tag) {
    query = query.contains('tags', [filters.tag])
  }
  
  if (filters.season) {
    query = query.eq('season', filters.season)
  }
  
  const { data, error } = await query
  
  if (error) {
    throw error
  }
  
  return data || []
}

// Get unique themes for filtering
export async function getUniqueThemes(userId) {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('core_theme')
    .eq('user_id', userId)
  
  if (error) {
    throw error
  }
  
  // Get unique themes
  const themes = [...new Set(data.map(d => d.core_theme))]
  return themes.filter(Boolean)
}

// Create a new memory record
export async function createMemory(userId, memoryData) {
  const { data, error } = await supabase
    .from('memories')
    .insert([{
      user_id: userId,
      ...memoryData
    }])
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Create gratitude entries from AI extraction
export async function createGratitudeEntries(userId, memoryId, entries) {
  const entriesWithIds = entries.map((entry, index) => ({
    user_id: userId,
    memory_id: memoryId,
    entry_code: entry.entry_id || `MEM-${Date.now()}-${index}`,
    core_theme: entry.core_theme,
    summary_story: entry.summary_story,
    specific_details: entry.specific_details || [],
    reflection_prompt: entry.reflection_prompt,
    tags: entry.tags || [],
    season: inferSeason(entry),
    holiday_associations: inferHolidays(entry)
  }))
  
  const { data, error } = await supabase
    .from('gratitude_entries')
    .insert(entriesWithIds)
    .select()
  
  if (error) {
    throw error
  }
  
  // Mark memory as processed
  await supabase
    .from('memories')
    .update({ is_processed: true })
    .eq('id', memoryId)
  
  return data
}

// Helper: Infer season from entry content
function inferSeason(entry) {
  const text = `${entry.core_theme} ${entry.summary_story} ${(entry.tags || []).join(' ')}`.toLowerCase()
  
  if (text.includes('christmas') || text.includes('winter') || text.includes('snow') || text.includes('holiday')) {
    return 'winter'
  }
  if (text.includes('spring') || text.includes('easter') || text.includes('bloom') || text.includes('renewal')) {
    return 'spring'
  }
  if (text.includes('summer') || text.includes('vacation') || text.includes('beach') || text.includes('july')) {
    return 'summer'
  }
  if (text.includes('fall') || text.includes('autumn') || text.includes('thanksgiving') || text.includes('harvest')) {
    return 'fall'
  }
  
  return 'any'
}

// Helper: Infer holiday associations from entry content
function inferHolidays(entry) {
  const text = `${entry.core_theme} ${entry.summary_story} ${(entry.tags || []).join(' ')}`.toLowerCase()
  const holidays = []
  
  if (text.includes('christmas') || text.includes('xmas')) holidays.push('Christmas')
  if (text.includes('thanksgiving')) holidays.push('Thanksgiving')
  if (text.includes('birthday')) holidays.push('Birthday')
  if (text.includes('mother') && (text.includes('day') || text.includes('mom'))) holidays.push("Mother's Day")
  if (text.includes('father') && (text.includes('day') || text.includes('dad'))) holidays.push("Father's Day")
  if (text.includes('easter')) holidays.push('Easter')
  if (text.includes('valentine')) holidays.push("Valentine's Day")
  if (text.includes('anniversary')) holidays.push('Anniversary')
  if (text.includes('new year')) holidays.push('New Year')
  if (text.includes('graduation')) holidays.push('Graduation')
  
  return holidays
}

// ============================================
// VOICE MANAGEMENT FUNCTIONS
// ============================================

// Get all voice mappings for a user
export async function getSenderVoices(userId) {
  const { data, error } = await supabase
    .from('sender_voices')
    .select('*')
    .eq('user_id', userId)
    .order('sender_name')
  
  if (error) throw error
  return data || []
}

// Get voice for a specific sender
export async function getVoiceForSender(userId, senderName) {
  // First try exact match
  let { data, error } = await supabase
    .from('sender_voices')
    .select('*')
    .eq('user_id', userId)
    .ilike('sender_name', senderName)
    .single()
  
  if (data) return data
  
  // If no exact match, get default voice
  const { data: defaultVoice } = await supabase
    .from('sender_voices')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single()
  
  return defaultVoice || null
}

// Add or update a sender voice mapping
export async function upsertSenderVoice(userId, senderName, voiceId, notes = '') {
  const { data, error } = await supabase
    .from('sender_voices')
    .upsert({
      user_id: userId,
      sender_name: senderName,
      elevenlabs_voice_id: voiceId,
      voice_notes: notes,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,sender_name'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Delete a sender voice mapping
export async function deleteSenderVoice(userId, senderName) {
  const { error } = await supabase
    .from('sender_voices')
    .delete()
    .eq('user_id', userId)
    .eq('sender_name', senderName)
  
  if (error) throw error
}

// Set default voice
export async function setDefaultVoice(userId, senderName) {
  // First, unset all defaults for this user
  await supabase
    .from('sender_voices')
    .update({ is_default: false })
    .eq('user_id', userId)
  
  // Then set the new default
  const { data, error } = await supabase
    .from('sender_voices')
    .update({ is_default: true })
    .eq('user_id', userId)
    .eq('sender_name', senderName)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Get all unique sender names from memories (for voice setup suggestions)
export async function getUniqueSenders(userId) {
  const { data, error } = await supabase
    .from('memories')
    .select('sender_name')
    .eq('user_id', userId)
    .not('sender_name', 'is', null)
  
  if (error) throw error
  
  // Get unique names
  const uniqueNames = [...new Set(data.map(m => m.sender_name).filter(Boolean))]
  return uniqueNames.sort()
}

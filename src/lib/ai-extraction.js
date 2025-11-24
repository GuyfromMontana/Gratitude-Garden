/**
 * AI Extraction Module
 * Uses Claude API to extract gratitude elements from scanned memories
 */

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

// System prompt for gratitude extraction
const SYSTEM_PROMPT = `You are a specialized Gratitude Content Analyst. Your task is to process user-provided personal texts (e.g., letters, stories, journal entries) and extract core gratitude elements while strictly maintaining privacy and focusing only on the *structure* of the positive experience.

Your analysis must convert emotional, narrative content into structured data (JSON) that follows a defined schema:

1. **Identify the Core Theme:** What is the overarching positive emotion or focus (e.g., support, achievement, unexpected kindness, mentorship)?
2. **Extract Sensory/Specific Details:** Note 1-3 concrete details (sights, sounds, specific quotes, locations) that ground the memory.
3. **Formulate an Actionable Prompt:** Create a reflection question based on the content that encourages the user to apply that feeling or experience to their present life.
4. **Create a Short Reflection Story:** Summarize the emotional essence of the original text into a short, inspirational, and *anonymized* story (under 100 words) suitable for being a "gratitude seed" in the app.

Always output valid JSON matching the required schema.`

// JSON Schema for extraction
const EXTRACTION_SCHEMA = {
  type: "array",
  description: "An array of structured gratitude entries extracted from the source content.",
  items: {
    type: "object",
    properties: {
      entry_id: {
        type: "string",
        description: "A unique identifier for the entry (e.g., 'KIN-001')."
      },
      core_theme: {
        type: "string",
        description: "The central theme of gratitude (e.g., 'Unexpected Kindness', 'Family Support', 'Professional Achievement')."
      },
      summary_story: {
        type: "string",
        description: "A brief, anonymized, inspirational narrative (max 100 words) capturing the emotional core."
      },
      specific_details: {
        type: "array",
        description: "1-3 concrete, specific details that anchor the memory.",
        items: { type: "string" }
      },
      reflection_prompt: {
        type: "string",
        description: "An actionable question to encourage current-day reflection."
      },
      tags: {
        type: "array",
        description: "Categorical tags for filtering (e.g., 'People', 'Career', 'Nature', 'Small Wins').",
        items: { type: "string" }
      }
    },
    required: ["entry_id", "core_theme", "summary_story", "reflection_prompt", "tags"]
  }
}

/**
 * Extract gratitude entries from text content
 * @param {string} textContent - The text from a scanned letter/card
 * @param {object} metadata - Optional metadata (sender, occasion, date)
 * @returns {Promise<Array>} - Array of gratitude entries
 */
export async function extractGratitudeEntries(textContent, metadata = {}) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('Anthropic API key not configured. Using mock extraction.')
    return mockExtraction(textContent, metadata)
  }

  const userPrompt = buildExtractionPrompt(textContent, metadata)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API request failed')
    }

    const data = await response.json()
    const content = data.content[0].text

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    throw new Error('Could not parse JSON from response')

  } catch (error) {
    console.error('Extraction error:', error)
    // Fallback to mock if API fails
    return mockExtraction(textContent, metadata)
  }
}

/**
 * Build the extraction prompt with context
 */
function buildExtractionPrompt(textContent, metadata) {
  let prompt = `Analyze the following personal document content. Based on this text, generate a set of 3-5 distinct Gratitude Entries that conform precisely to this JSON schema:

${JSON.stringify(EXTRACTION_SCHEMA, null, 2)}

`

  if (metadata.sender) {
    prompt += `This was sent by: ${metadata.sender}\n`
  }
  if (metadata.occasion) {
    prompt += `Occasion: ${metadata.occasion}\n`
  }
  if (metadata.date_received) {
    prompt += `Date received: ${metadata.date_received}\n`
  }

  prompt += `
Document content:
---
${textContent}
---

Generate the gratitude entries as a valid JSON array. Focus on extracting themes of appreciation, connection, and positive life events. Anonymize any names in the summary_story field.`

  return prompt
}

/**
 * Mock extraction for development/fallback
 */
function mockExtraction(textContent, metadata) {
  // Simple keyword-based theme detection
  const text = textContent.toLowerCase()
  let theme = 'Appreciation'
  let tags = ['Personal']

  if (text.includes('thank') || text.includes('grateful')) {
    theme = 'Gratitude'
    tags.push('Thankfulness')
  }
  if (text.includes('love') || text.includes('dear')) {
    theme = 'Love & Connection'
    tags.push('Relationships')
  }
  if (text.includes('birthday') || text.includes('congratulations')) {
    theme = 'Celebration'
    tags.push('Milestones')
  }
  if (text.includes('help') || text.includes('support')) {
    theme = 'Support & Kindness'
    tags.push('People')
  }
  if (text.includes('family') || text.includes('mom') || text.includes('dad')) {
    theme = 'Family Support'
    tags.push('Family')
  }

  // Create a single entry from the mock
  return [{
    entry_id: `MOCK-${Date.now()}`,
    core_theme: theme,
    summary_story: `A heartfelt message arrived, carrying warmth and appreciation. The words spoke of connection and the simple yet profound impact of being remembered and valued by someone special.`,
    specific_details: [
      metadata.sender ? `From ${metadata.sender}` : 'A personal letter',
      metadata.occasion || 'A moment of connection',
      'Handwritten with care'
    ],
    reflection_prompt: `Think about someone who has shown you kindness recently. How might you express your appreciation to them today?`,
    tags: tags
  }]
}

/**
 * Generate theme suggestions from a collection of entries
 */
export function generateThemeSuggestions(entries) {
  const themeCounts = {}
  
  entries.forEach(entry => {
    if (entry.core_theme) {
      themeCounts[entry.core_theme] = (themeCounts[entry.core_theme] || 0) + 1
    }
  })

  return Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => ({ theme, count }))
}

/**
 * Categorize themes into broader categories
 */
export const THEME_CATEGORIES = {
  'Relationships': ['Family Support', 'Friendship', 'Love & Connection', 'Mentorship'],
  'Personal Growth': ['Achievement', 'Learning', 'Resilience', 'Self-Discovery'],
  'Kindness': ['Unexpected Kindness', 'Generosity', 'Support & Kindness', 'Community'],
  'Joy': ['Celebration', 'Small Wins', 'Nature', 'Adventure'],
  'Gratitude': ['Appreciation', 'Thankfulness', 'Abundance', 'Blessing']
}

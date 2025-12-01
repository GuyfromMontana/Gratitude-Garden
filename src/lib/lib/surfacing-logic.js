/**
 * Surfacing Logic Module
 * Handles the selection of daily gratitude entries based on seasons and holidays
 */

// Season definitions (meteorological)
const SEASONS = {
  spring: { months: [3, 4, 5], name: 'Spring' },
  summer: { months: [6, 7, 8], name: 'Summer' },
  fall: { months: [9, 10, 11], name: 'Fall' },
  winter: { months: [12, 1, 2], name: 'Winter' }
}

// Holiday definitions with flexible dates
const HOLIDAYS = {
  'New Year': { month: 1, day: 1, window: 5 },
  "Valentine's Day": { month: 2, day: 14, window: 7 },
  "St. Patrick's Day": { month: 3, day: 17, window: 3 },
  'Easter': { month: 4, day: 15, window: 7 }, // Approximate, varies yearly
  "Mother's Day": { month: 5, day: 12, window: 7 }, // Second Sunday of May
  'Memorial Day': { month: 5, day: 27, window: 5 },
  "Father's Day": { month: 6, day: 16, window: 7 }, // Third Sunday of June
  'Independence Day': { month: 7, day: 4, window: 5 },
  'Labor Day': { month: 9, day: 2, window: 3 },
  'Halloween': { month: 10, day: 31, window: 7 },
  'Thanksgiving': { month: 11, day: 28, window: 10 }, // Fourth Thursday of November
  'Christmas': { month: 12, day: 25, window: 14 }
}

/**
 * Get the current season
 * @returns {string} - Season name (spring, summer, fall, winter)
 */
export function getCurrentSeason() {
  const month = new Date().getMonth() + 1 // getMonth() is 0-indexed
  
  for (const [season, data] of Object.entries(SEASONS)) {
    if (data.months.includes(month)) {
      return season
    }
  }
  
  return 'winter' // Default fallback
}

/**
 * Get human-readable season name
 * @returns {string} - Formatted season name
 */
export function getSeasonDisplayName() {
  const season = getCurrentSeason()
  return SEASONS[season]?.name || 'Season'
}

/**
 * Check if a holiday is upcoming (within its surfacing window)
 * @param {string} holidayName - Name of the holiday
 * @returns {boolean} - True if holiday is upcoming
 */
export function isHolidayUpcoming(holidayName) {
  const holiday = HOLIDAYS[holidayName]
  if (!holiday) return false
  
  const today = new Date()
  const year = today.getFullYear()
  
  // Create holiday date for this year
  let holidayDate = new Date(year, holiday.month - 1, holiday.day)
  
  // If holiday already passed, check next year
  if (holidayDate < today) {
    holidayDate = new Date(year + 1, holiday.month - 1, holiday.day)
  }
  
  // Calculate days until holiday
  const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24))
  
  return daysUntil <= holiday.window
}

/**
 * Get all upcoming holidays within their windows
 * @returns {Array} - Array of upcoming holiday names
 */
export function getUpcomingHolidays() {
  return Object.keys(HOLIDAYS).filter(isHolidayUpcoming)
}

/**
 * Get the primary upcoming holiday (closest one)
 * @returns {string|null} - Name of the closest upcoming holiday
 */
export function getPrimaryUpcomingHoliday() {
  const today = new Date()
  const year = today.getFullYear()
  
  let closestHoliday = null
  let closestDays = Infinity
  
  for (const [name, holiday] of Object.entries(HOLIDAYS)) {
    let holidayDate = new Date(year, holiday.month - 1, holiday.day)
    
    // If already passed this year, check next year
    if (holidayDate < today) {
      holidayDate = new Date(year + 1, holiday.month - 1, holiday.day)
    }
    
    const daysUntil = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24))
    
    // Only consider if within window
    if (daysUntil <= holiday.window && daysUntil < closestDays) {
      closestDays = daysUntil
      closestHoliday = name
    }
  }
  
  return closestHoliday
}

/**
 * Get display text for why an entry was surfaced
 * @param {string} reason - Raw surfacing reason (e.g., "holiday:Christmas")
 * @returns {string} - Human-readable display text
 */
export function getSurfacingDisplayText(reason) {
  if (!reason) return ''
  
  if (reason.startsWith('holiday:')) {
    const holiday = reason.replace('holiday:', '')
    return `Surfaced for ${holiday}`
  }
  
  if (reason.startsWith('season:')) {
    const season = reason.replace('season:', '')
    return `A ${SEASONS[season]?.name || season} memory`
  }
  
  if (reason === 'variety') {
    return 'Keeping things fresh'
  }
  
  if (reason === 'random') {
    return 'A treasure from your collection'
  }
  
  return ''
}

/**
 * Format today's date in a friendly way
 * @returns {string} - Formatted date string
 */
export function getFormattedDate() {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
  return new Date().toLocaleDateString('en-US', options)
}

/**
 * Get seasonal greeting/message
 * @returns {string} - Seasonal greeting
 */
export function getSeasonalGreeting() {
  const season = getCurrentSeason()
  const hour = new Date().getHours()
  
  let timeGreeting = ''
  if (hour < 12) {
    timeGreeting = 'Good morning'
  } else if (hour < 17) {
    timeGreeting = 'Good afternoon'
  } else {
    timeGreeting = 'Good evening'
  }
  
  const seasonalMessages = {
    spring: `${timeGreeting}. Spring is a time of renewal—let's cultivate some gratitude.`,
    summer: `${timeGreeting}. Summer warmth reminds us of life's simple pleasures.`,
    fall: `${timeGreeting}. Fall invites us to reflect on the harvest of our experiences.`,
    winter: `${timeGreeting}. Winter's quiet is perfect for warming the heart with memories.`
  }
  
  return seasonalMessages[season] || `${timeGreeting}. Let's explore a memory together.`
}

/**
 * Score an entry for surfacing relevance
 * @param {object} entry - Gratitude entry
 * @param {object} context - Current context (season, holidays)
 * @returns {number} - Relevance score (higher = more relevant)
 */
export function scoreEntryRelevance(entry, context = {}) {
  let score = 0
  
  const currentSeason = context.season || getCurrentSeason()
  const upcomingHolidays = context.holidays || getUpcomingHolidays()
  
  // Season match
  if (entry.season === currentSeason) {
    score += 3
  } else if (entry.season === 'any') {
    score += 1
  }
  
  // Holiday match
  const entryHolidays = entry.holiday_associations || []
  for (const holiday of upcomingHolidays) {
    if (entryHolidays.includes(holiday)) {
      score += 5 // Holidays get priority
    }
  }
  
  // Recency penalty (entries shown recently score lower)
  // This would need to be calculated based on daily_surfaces data
  
  return score
}

/**
 * Get theme suggestions based on current season
 * @returns {Array} - Suggested themes for the current season
 */
export function getSeasonalThemeSuggestions() {
  const season = getCurrentSeason()
  
  const themesByseason = {
    spring: ['Renewal', 'Growth', 'Hope', 'New Beginnings', 'Nature'],
    summer: ['Joy', 'Adventure', 'Family', 'Celebration', 'Freedom'],
    fall: ['Gratitude', 'Harvest', 'Reflection', 'Change', 'Abundance'],
    winter: ['Warmth', 'Kindness', 'Family', 'Hope', 'Generosity']
  }
  
  return themesByseason[season] || []
}

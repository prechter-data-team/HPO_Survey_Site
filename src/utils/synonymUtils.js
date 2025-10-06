// src/utils/synonymUtils.js
import { searchSynonyms } from '@/storage/storeSurvey.js'

/**
 * Initialize default synonyms for a term (used in Disagree.vue and Review.vue)
 */
export async function initializeDefaultSynonyms(termSynonyms) {
  if (!termSynonyms) {
    return []
  }
  
  let synonymTexts = []
  
  if (Array.isArray(termSynonyms)) {
    synonymTexts = termSynonyms.map(s => s.trim()).filter(s => s.length > 0)
  } else if (typeof termSynonyms === 'string') {
    synonymTexts = termSynonyms
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }
  
  // Look up real record IDs for these synonym texts
  const synonymObjects = []
  for (const text of synonymTexts) {
    // Search for this synonym in the database
    const foundSynonyms = await searchSynonyms(text)
    const exactMatch = foundSynonyms.find(syn => 
      (syn.synAndTypeDoNotDelete || syn.text || syn.synonymText || '').trim().toLowerCase() === text.toLowerCase()
    )
    
    if (exactMatch) {
      // Use the real record ID and mark as default
      synonymObjects.push({
        id: exactMatch.id,  // REAL RECORD ID
        text: text,
        isDefault: true,    // Mark as default synonym
        isExisting: false,
        isCustom: false
      })
    } else {
      // Fallback to fake ID if not found in database
      synonymObjects.push({
        id: `term-synonym-${synonymObjects.length + 1}`,
        text: text,
        isDefault: true,    // Mark as default synonym
        isExisting: false,
        isCustom: false
      })
    }
  }
  
  console.log('Initialized default synonyms:', synonymObjects)
  return synonymObjects
}

/**
 * Determine what synonyms to send to API based on filtering logic
 * Used in both Disagree.vue and Review.vue for smart synonym updates
 */
export function getFilteredSynonymsToSend(currentSynonyms, defaultSynonyms) {
  // Get IDs for easy comparison
  const currentIds = new Set(currentSynonyms.map(syn => syn.id))
  const defaultIds = new Set(defaultSynonyms.map(syn => syn.id))
  
  // Check if any default synonyms were removed
  const defaultsRemoved = defaultSynonyms.some(defaultSyn => 
    !currentIds.has(defaultSyn.id)
  )
  
  if (defaultsRemoved) {
    // If defaults were removed, send the complete final list
    console.log('Default synonyms were removed - sending complete list')
    return {
      action: 'replace',
      synonyms: currentSynonyms
    }
  } else {
    // Only additions - send just the new ones (not defaults)
    const newSynonyms = currentSynonyms.filter(synonym => 
      !defaultIds.has(synonym.id)
    )
    
    console.log('Only additions detected - sending new synonyms only')
    return {
      action: 'add',
      synonyms: newSynonyms
    }
  }
}

/**
 * Format synonyms for display (used in multiple components)
 */
export function formatSynonyms(synonyms) {
  if (!synonyms) return 'No synonyms available'
  
  if (typeof synonyms === 'string') {
    return synonyms.replace(/[\[\]"]/g, '').trim()
  }
  
  if (Array.isArray(synonyms)) {
    return synonyms.map(s => s.trim()).join(', ')
  }
  
  return synonyms
}

/**
 * Prepare synonyms for API submission
 * Handles the filtering logic and returns the appropriate data structure
 */
export function prepareSynonymsForSubmission(selectedSynonyms, defaultSynonyms) {
  const synonymChanges = getFilteredSynonymsToSend(selectedSynonyms, defaultSynonyms)
  
  let synonymsToSend
  if (synonymChanges.action === 'replace') {
    // Send all current synonyms (complete replacement)
    synonymsToSend = selectedSynonyms.map(s => s.id)
    console.log('Sending complete synonym list:', synonymsToSend)
  } else {
    // Send only new synonyms (additions only)
    synonymsToSend = synonymChanges.synonyms.map(s => s.id)
    console.log('Sending only new synonyms:', synonymsToSend)
  }
  
  return {
    synonymIds: synonymsToSend,
    action: synonymChanges.action
  }
}

/**
 * Convert synonym response data back to synonym objects for display
 * Used in Review.vue when loading existing responses
 */
export function parseSynonymResponseData(synonymResponseData, allSynonyms) {
  if (!synonymResponseData) return []
  
  let synonymIds = synonymResponseData
  
  // Handle both array and comma-separated string formats
  if (typeof synonymIds === 'string') {
    synonymIds = synonymIds.split(',').map(id => id.trim())
  } else if (!Array.isArray(synonymIds)) {
    synonymIds = [synonymIds]
  }
  
  return allSynonyms.filter(syn => 
    synonymIds.includes(syn.id)
  ).map(syn => ({
    ...syn,
    text: syn.text || syn.synAndTypeDoNotDelete || 'Unknown',
    isDefault: false,
    isExisting: true,  // These were selected from database
    isCustom: false
  }))
}
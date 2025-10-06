// src/storage/storeSurvey.js
import { reactive, computed, watch } from 'vue'

// Survey Configuration - Add new surveys here
export const SURVEY_CONFIG = {
  clinical: {
    id: 'clinical',
    name: 'Clinical Sleep',
    displayName: 'Clinical Sleep Disorders',
    description: 'Comprehensive clinical sleep disorders survey',
    airtableField: 'Include in Survey Clinical Sleep',
    isActive: true
  },
  parasomnia: {
    id: 'parasomnia',
    name: 'Parasomnia',
    displayName: 'Parasomnia Disorders',
    description: 'Parasomnia-specific sleep disorders survey',
    airtableField: 'Include In Survey Parasomnia',
    isActive: true
  },
  abnormal: {
    id: 'abnormal',
    name: 'Abnormal',
    displayName: 'Abnormal Emotional State',
    description: 'Abnormal Emotional State survey',
    airtableField: 'Include in Abnormal Survey',
    isActive: true
  }
  // Add more surveys here as needed:
  // insomnia: {
  //   id: 'insomnia',
  //   name: 'Insomnia',
  //   displayName: 'Insomnia & Sleep Maintenance',
  //   description: 'Insomnia and sleep maintenance disorders',
  //   airtableField: 'Include In Survey Insomnia',
  //   isActive: false
  // }
}

// Airtable Configuration
const AIRTABLE_CONFIG = {
  apiKey: import.meta.env.VITE_AIRTABLE_API_KEY,
  baseId: import.meta.env.VITE_AIRTABLE_BASE_ID,
  tables: {
    contributors: import.meta.env.VITE_AIRTABLE_TABLE_CONTRIBUTORS,
    terms: import.meta.env.VITE_AIRTABLE_TABLE_TERMS,
    responses: import.meta.env.VITE_AIRTABLE_TABLE_RESPONSES,
    synonyms: import.meta.env.VITE_AIRTABLE_TABLE_SYNONYMS
  }
}

// Base headers for all Airtable requests
const airtableHeaders = {
  'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
  'Content-Type': 'application/json'
}

// Global Survey Store (replaces all localStorage)
export const surveyStore = reactive({
  // Current Survey Session (from URL)
  contributorId: null,
  surveyType: null,      // 'clinical' or 'parasomnia'
  sessionId: null,
  
  // Survey Data
  currentTerm: null,
  allTerms: [],
  completedTerms: [],
  
  // Survey Progress
  totalTerms: 0,
  progress: 0,
  isComplete: false,
  
  // UI State
  isLoading: false,
  error: null,
  
  // Cache for performance
  termsCache: new Map(),
  synonymsCache: new Map(),
  
  // User's Responses
  responses: new Map()  // Key: termId, Value: response object
})

// =============================================================================
// SURVEY CONFIGURATION UTILITIES
// =============================================================================

/**
 * Get survey configuration by ID
 */
export function getSurveyConfig(surveyId) {
  return SURVEY_CONFIG[surveyId] || null
}

/**
 * Get survey display name
 */
export function getSurveyDisplayName(surveyId) {
  const config = getSurveyConfig(surveyId)
  return config ? config.displayName : surveyId
}

/**
 * Get survey name (short version)
 */
export function getSurveyName(surveyId) {
  const config = getSurveyConfig(surveyId)
  return config ? config.name : surveyId
}

/**
 * Get all active surveys
 */
export function getActiveSurveys() {
  return Object.values(SURVEY_CONFIG).filter(survey => survey.isActive)
}

/**
 * Get available surveys (excluding current one)
 */
export function getAvailableSurveys(excludeSurveyId = null) {
  return getActiveSurveys().filter(survey => survey.id !== excludeSurveyId)
}

/**
 * Get survey field name for Airtable
 */
export function getSurveyAirtableField(surveyId) {
  const config = getSurveyConfig(surveyId)
  return config ? config.airtableField : `Include in Survey ${surveyId}`
}

// Computed Properties
export const surveyComputed = {
  progressPercentage: computed(() => {
    if (surveyStore.totalTerms === 0) return 0
    return Math.round((surveyStore.completedTerms.length / surveyStore.totalTerms) * 100)
  }),
  
  currentTermIndex: computed(() => {
    if (!surveyStore.currentTerm || surveyStore.allTerms.length === 0) return -1
    return surveyStore.allTerms.findIndex(term => term.id === surveyStore.currentTerm.id)
  }),
  
  nextTerm: computed(() => {
    if (!surveyStore.currentTerm || surveyStore.allTerms.length === 0) return null
    
    // Get the nextTermLabel from current term
    const nextTermLabel = surveyStore.currentTerm.nextTermLabel
    if (!nextTermLabel || nextTermLabel.length === 0) return null
    
    // Extract the term label (it might be an array)
    const targetLabel = Array.isArray(nextTermLabel) ? nextTermLabel[0] : nextTermLabel
    
    // Find the term with matching termLabel
    const nextTerm = surveyStore.allTerms.find(term => term.termLabel === targetLabel)
    
    return nextTerm || null
  }),

  // New computed properties using survey config
  currentSurveyConfig: computed(() => {
    return getSurveyConfig(surveyStore.surveyType)
  }),

  currentSurveyDisplayName: computed(() => {
    return getSurveyDisplayName(surveyStore.surveyType)
  }),

  availableSurveys: computed(() => {
    return getAvailableSurveys(surveyStore.surveyType)
  })
}

// =============================================================================
// AIRTABLE API FUNCTIONS (replaces all your fetch logic)
// =============================================================================

/**
 * Fetch all contributors from Airtable
 */
export async function fetchContributors() {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.contributors}`
    let allContributors = []
    let offset = null
    
    do {
      const queryUrl = offset ? `${url}?offset=${offset}` : url
      const response = await fetch(queryUrl, { headers: airtableHeaders })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} - ${data.error?.message}`)
      }
      
      const contributors = data.records.map(record => ({
        id: record.id,
        name: record.fields.fullName || 'Unknown',
        email: record.fields.email || '',
        numberOfResponses: record.fields.numberOfResponses || 0,
        nextTermLabel: record.fields.nextTermForContributor || null
      }))
      
      allContributors.push(...contributors)
      offset = data.offset
    } while (offset)
    
    console.log(`✅ Fetched ${allContributors.length} contributors`)
    return allContributors
    
  } catch (error) {
    console.error('❌ Error fetching contributors:', error)
    throw error
  }
}

/**
 * Fetch terms for specific survey type (updated to use survey config)
 */
export async function fetchSurveyTerms(surveyType) {
  try {
    // Check cache first
    if (surveyStore.termsCache.has(surveyType)) {
      console.log(`📋 Using cached terms for ${getSurveyDisplayName(surveyType)}`)
      return surveyStore.termsCache.get(surveyType)
    }
    
    surveyStore.isLoading = true
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.terms}`
    
    // Use survey config to get the correct field name
    const surveyField = getSurveyAirtableField(surveyType)
    const filterFormula = `AND({Melvin Reviewed}=TRUE(), {${surveyField}}=TRUE())`
    
    let allTerms = []
    let offset = null
    
    do {
      const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}${offset ? `&offset=${offset}` : ''}`
      const response = await fetch(queryUrl, { headers: airtableHeaders })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} - ${data.error?.message}`)
      }
      
      const terms = data.records.map(record => ({
        id: record.id,
        airtableRecordId: record.id,
        termLabel: record.fields.termLabel || 'Unknown Term',
        definition: record.fields.def || 'No definition available',
        hpoId: record.fields.id || '',
        parents: record.fields.parentsDoNotDelete || 'No parents',
        parentLink: record.fields.parentHpoLink || '#',
        synonyms: record.fields.synAndTypeDoNotDelete || 'No synonyms',
        nextTermLabel: record.fields.nextTermLabel || '',
        surveyType: surveyType
      }))
      
      allTerms.push(...terms)
      offset = data.offset
    } while (offset)
    
    // Cache the results
    surveyStore.termsCache.set(surveyType, allTerms)
    
    console.log(`✅ Fetched ${allTerms.length} terms for ${getSurveyDisplayName(surveyType)} survey`)
    return allTerms
    
  } catch (error) {
    console.error(`❌ Error fetching ${getSurveyDisplayName(surveyType)} terms:`, error)
    throw error
  } finally {
    surveyStore.isLoading = false
  }
}

/**
 * Generate consistent session ID for user/survey combination
 */
export function generateSessionId(contributorId, surveyType) {
  const sessionData = `${contributorId}_${surveyType}`
  // Create deterministic session ID (same user + survey = same session)
  return btoa(sessionData).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)
}

/**
 * Initialize survey session with URL params
 */
export async function initializeSurvey(contributorId, surveyType) {
  try {
    console.log(`🚀 Initializing ${getSurveyDisplayName(surveyType)} survey for contributor ${contributorId}`)
    
    // Set basic session info
    surveyStore.contributorId = contributorId
    surveyStore.surveyType = surveyType
    surveyStore.sessionId = generateSessionId(contributorId, surveyType)
    surveyStore.error = null
    
    // Fetch terms for this survey
    const terms = await fetchSurveyTerms(surveyType)
    surveyStore.allTerms = terms
    surveyStore.totalTerms = terms.length
    
    // Get user's progress for this survey
    const progress = await getSurveyProgress(contributorId, surveyType, surveyStore.sessionId)
    
    surveyStore.completedTerms = progress.completedTerms
    surveyStore.isComplete = progress.isComplete
    surveyStore.currentTerm = progress.currentTerm
    
    console.log(`✅ Survey initialized:`, {
      totalTerms: surveyStore.totalTerms,
      completed: surveyStore.completedTerms.length,
      currentTerm: surveyStore.currentTerm?.termLabel,
      isComplete: surveyStore.isComplete
    })
    
    return {
      isComplete: surveyStore.isComplete,
      currentTerm: surveyStore.currentTerm,
      progress: progress.progress
    }
    
  } catch (error) {
    console.error('❌ Error initializing survey:', error)
    surveyStore.error = error.message
    throw error
  }
}

/**
 * Get survey progress from Airtable (using existing system)
 */
export async function getSurveyProgress(contributorId, surveyType, sessionId) {
  try {
    console.log(`🔍 Getting survey progress for contributor: ${contributorId}, survey: ${getSurveyDisplayName(surveyType)}`)
    
    // Get contributor data to check completed terms
    const contributorUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Contributors/${contributorId}`
    const response = await fetch(contributorUrl, { headers: airtableHeaders })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contributor: ${response.status}`)
    }
    
    console.log('📋 Contributor data:', data.fields)
    
    // Get all completed terms for this contributor
    const allCompletedTermIds = data.fields.termRecordIdDoNotDelete || []
    const nextTermLabel = data.fields.nextTermForContributor || null
    
    console.log(`📊 Total completed terms: ${allCompletedTermIds.length}`)
    console.log(`🎯 Next term label: ${nextTermLabel}`)
    
    // Get terms for current survey to filter completed terms
    const surveyTerms = await fetchSurveyTerms(surveyType)
    const surveyTermIds = surveyTerms.map(term => term.id)
    
    // Filter completed terms to only include ones from current survey
    const completedSurveyTermIds = allCompletedTermIds.filter(termId => 
      surveyTermIds.includes(termId)
    )
    
    console.log(`📈 Completed terms for ${getSurveyDisplayName(surveyType)} survey: ${completedSurveyTermIds.length}/${surveyTerms.length}`)
    
    const totalTerms = surveyTerms.length
    const isComplete = completedSurveyTermIds.length >= totalTerms
    
    // Find current term based on your existing logic
    let currentTerm = null
    
    if (isComplete) {
      console.log('✅ Survey complete!')
    } else if (completedSurveyTermIds.length === 0) {
      // First time - find root term
      console.log('🌱 First time user - finding root term')
      currentTerm = await findRootTerm(surveyType)
    } else {
      // Continuing survey - use nextTermLabel logic
      console.log('📝 Continuing survey - using nextTermLabel logic')
      if (nextTermLabel) {
        // Extract survey-specific next term from nextTermLabel
        currentTerm = await extractSurveySpecificNextTerm(nextTermLabel, surveyType, surveyTerms)
      }
      
      // Fallback: find next uncompleted term
      if (!currentTerm) {
        console.log('🔄 Fallback: finding next uncompleted term')
        currentTerm = surveyTerms.find(term => !completedSurveyTermIds.includes(term.id))
      }
    }
    
    console.log('🎯 Current term:', currentTerm?.termLabel || 'None')
    
    return {
      completedTerms: completedSurveyTermIds,
      isComplete,
      responses: [], // We don't need detailed responses for progress check
      progress: Math.round((completedSurveyTermIds.length / totalTerms) * 100),
      currentTerm,
      nextTermLabel
    }
    
  } catch (error) {
    console.error('❌ Error getting survey progress:', error)
    return { 
      completedTerms: [], 
      isComplete: false, 
      responses: [], 
      progress: 0,
      currentTerm: null,
      nextTermLabel: null
    }
  }
}

/**
 * Find root term for survey (updated to use survey config)
 */
async function findRootTerm(surveyType) {
  try {
    console.log(`🌱 Finding root term for ${getSurveyDisplayName(surveyType)} survey`)
    
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.terms}`
    const surveyField = getSurveyAirtableField(surveyType)
    
    // Filter for root term in this survey
    const filterFormula = `AND({Melvin Reviewed}=TRUE(), {${surveyField}}=TRUE(), {rootTerm}=TRUE())`
    const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`
    
    // DEBUG: Log everything
    console.log('🔍 Root term filter formula:', filterFormula)
    console.log('🔍 Root term query URL:', queryUrl)
    console.log('🔍 Survey field being used:', surveyField)
    
    const response = await fetch(queryUrl, { headers: airtableHeaders })
    const data = await response.json()
    
    // DEBUG: Log the response
    console.log('📋 Airtable response status:', response.status)
    console.log('📋 Airtable response data:', data)
    
    if (!response.ok) {
      console.error('❌ Airtable API error details:', {
        status: response.status,
        statusText: response.statusText,
        errorData: data
      })
      throw new Error(`Airtable API error: ${response.status} - ${data.error?.message || 'Unknown error'}`)
    }
    
    if (data.records && data.records.length > 0) {
      const rootRecord = data.records[0]
      const rootTerm = {
        id: rootRecord.id,
        airtableRecordId: rootRecord.id,
        termLabel: rootRecord.fields.termLabel || 'Unknown Term',
        definition: rootRecord.fields.def || 'No definition available',
        hpoId: rootRecord.fields.id || '',
        parents: rootRecord.fields.parentsDoNotDelete || 'No parents',
        parentLink: rootRecord.fields.parentHpoLink || '#',
        synonyms: rootRecord.fields.synAndTypeDoNotDelete || 'No synonyms',
        nextTermLabel: rootRecord.fields.nextTermLabel || '',
        surveyType: surveyType
      }
      
      console.log(`✅ Found root term: ${rootTerm.termLabel}`)
      return rootTerm
    }
    
    console.warn(`⚠️ No root term found for ${getSurveyDisplayName(surveyType)} survey`)
    return null
    
  } catch (error) {
    console.error('❌ Error finding root term:', error)
    return null
  }
}

/**
 * Extract survey-specific next term from nextTermLabel (like your existing logic)
 */
async function extractSurveySpecificNextTerm(nextTermLabel, surveyType, surveyTerms) {
  if (!nextTermLabel) return null
  
  console.log(`🔍 Extracting next term from: "${nextTermLabel}" for ${getSurveyDisplayName(surveyType)} survey`)
  
  // Handle multiple terms separated by commas
  const nextTerms = nextTermLabel.includes(',') ? 
    nextTermLabel.split(',').map(t => t.trim()) : 
    [nextTermLabel.trim()]
  
  // Get valid term labels for this survey
  const validTermLabels = surveyTerms.map(term => term.termLabel)
  
  // Find the first term that belongs to this survey
  const surveySpecificTermLabel = nextTerms.find(termLabel => 
    validTermLabels.includes(termLabel)
  )
  
  if (surveySpecificTermLabel) {
    const nextTerm = surveyTerms.find(term => term.termLabel === surveySpecificTermLabel)
    console.log(`✅ Found survey-specific next term: ${surveySpecificTermLabel}`)
    return nextTerm
  }
  
  console.log(`⚠️ No valid next term found for ${getSurveyDisplayName(surveyType)} survey`)
  return null
}

/**
 * Get total term count for survey type
 */
export async function getSurveyTermCount(surveyType) {
  try {
    const terms = await fetchSurveyTerms(surveyType)
    return terms.length
  } catch (error) {
    console.error('Error getting survey term count:', error)
    return 0
  }
}

/**
 * Save user response to Airtable (replaces your saveResponseToAirtable functions)
 */
export async function saveResponse(termId, responseData) {
  try {
    console.log(`💾 Saving response for term ${termId}:`, responseData)
        
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.responses}`
    
    // Check if response already exists
    const existingResponse = await findExistingResponse(surveyStore.contributorId, termId, surveyStore.sessionId)
    
    // Prepare Airtable fields
    const airtableFields = {
      CONTRIBUTOR: [surveyStore.contributorId],
      TERM: [termId],
      formTimestamp: new Date().toISOString(),
      definitionRating: responseData.definitionRating || null,
      labelRating: responseData.labelRating || null,
      hierarchyRating: responseData.hierarchyRating || null,
      synonymRating: responseData.synonymRating || null,
      suggestedDefinition: responseData.suggestedDefinition || null,
      suggestedLabel: responseData.suggestedLabel || null,
      suggestedSynonyms: responseData.suggestedSynonyms || null,
      otherSuggestions: responseData.otherSuggestions || null
    }
    
    let result
    
    if (existingResponse) {
      // Update existing response
      const updateUrl = `${url}/${existingResponse.id}`
      const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: airtableHeaders,
        body: JSON.stringify({ fields: airtableFields })
      })
      
      result = await updateResponse.json()
      if (!updateResponse.ok) {
        throw new Error(`Update failed: ${result.error?.message}`)
      }
      
      console.log('✅ Updated existing response')
    } else {
      // Create new response
      const createResponse = await fetch(url, {
        method: 'POST',
        headers: airtableHeaders,
        body: JSON.stringify({ records: [{ fields: airtableFields }] })
      })
      
      const createData = await createResponse.json()
      if (!createResponse.ok) {
        throw new Error(`Create failed: ${createData.error?.message}`)
      }
      
      result = createData.records[0]
      console.log('✅ Created new response')
    }
    
    // Update local store
    surveyStore.responses.set(termId, {
      id: result.id,
      termId,
      ...responseData
    })
    
    // Add to completed terms if not already there
    if (!surveyStore.completedTerms.includes(termId)) {
      surveyStore.completedTerms.push(termId)
    }
    
    // Update completion status
    surveyStore.isComplete = surveyStore.completedTerms.length >= surveyStore.totalTerms
    
    return result
    
  } catch (error) {
    console.error('❌ Error saving response:', error)
    throw error
  }
}

/**
 * Find existing response record
 */
async function findExistingResponse(contributorId, termId, sessionId) {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.responses}`
    const filterFormula = `AND(contributorRecordId="${contributorId}", termRecordId="${termId}")`
    const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`
    
    const response = await fetch(queryUrl, { headers: airtableHeaders })
    const data = await response.json()
    
    if (!response.ok) return null
    return data.records.length > 0 ? data.records[0] : null
    
  } catch (error) {
    console.log('⚠️ Could not check for existing response:', error)
    return null
  }
}

/**
 * Search synonyms from Airtable
 */
/**
 * Search synonyms from Airtable with proper pagination
 * If searchTerm is empty, gets ALL synonyms
 */
export async function searchSynonyms(searchTerm) {
  try {
    // Check cache first
    const cacheKey = searchTerm || '__ALL__'
    if (surveyStore.synonymsCache.has(cacheKey)) {
      console.log(`📋 Using cached synonyms for: "${searchTerm || 'ALL'}"`)
      return surveyStore.synonymsCache.get(cacheKey)
    }
    
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.synonyms}`
    
    let allSynonyms = []
    let offset = null
    
    // Handle pagination - keep fetching until no more records
    do {
      let queryUrl = url
      const params = new URLSearchParams()
      
      // Only add filter if searchTerm is provided and not empty
      if (searchTerm && searchTerm.trim() !== '') {
        const filterFormula = `SEARCH("${searchTerm.toLowerCase()}", LOWER({synAndTypeDoNotDelete}))`
        params.append('filterByFormula', filterFormula)
        params.append('maxRecords', '10') // Limit search results to 10
      }
      // If searchTerm is empty, we get ALL synonyms (no filter, no maxRecords limit)
      
      if (offset) {
        params.append('offset', offset)
      }
      
      if (params.toString()) {
        queryUrl += `?${params.toString()}`
      }
      
      console.log(`🔍 Fetching synonyms... (search: "${searchTerm || 'ALL'}", offset: ${offset || 'none'})`)
      
      const response = await fetch(queryUrl, { headers: airtableHeaders })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} - ${data.error?.message}`)
      }
      
      if (!data.records || data.records.length === 0) {
        break // No more records
      }
      
      // Extract synonyms from this page
      const synonymsPage = data.records.map(record => ({
        id: record.id,
        text: record.fields.synAndTypeDoNotDelete || 'Unknown'
      }))
      
      allSynonyms = allSynonyms.concat(synonymsPage)
      offset = data.offset // Get offset for next page
      
      console.log(`📄 Loaded ${synonymsPage.length} synonyms from this page (total: ${allSynonyms.length})`)
      
      // If we're searching (not loading all), stop after we have enough results
      if (searchTerm && searchTerm.trim() !== '' && allSynonyms.length >= 10) {
        break
      }
      
    } while (offset) // Continue while there are more pages
    
    console.log(`✅ Total synonyms loaded: ${allSynonyms.length} for search: "${searchTerm || 'ALL'}"`)
    
    // Cache results
    surveyStore.synonymsCache.set(cacheKey, allSynonyms)
    
    return allSynonyms
    
  } catch (error) {
    console.error('❌ Error searching synonyms:', error)
    return []
  }
}
/**
 * Move to next term
 */
export function moveToNextTerm() {
  const nextTerm = surveyComputed.nextTerm.value
  if (nextTerm) {
    surveyStore.currentTerm = nextTerm
    return nextTerm
  } else {
    surveyStore.isComplete = true
    return null
  }
}
/**
 * Move to previous term in survey flow
 */
export function moveToPreviousTerm() {
  if (surveyStore.completedTerms.length === 0) {
    console.log('No previous terms available')
    return null
  }

  // Get the last completed term ID
  const previousTermId = surveyStore.completedTerms[surveyStore.completedTerms.length - 1]
  
  // Find the term object
  const previousTerm = surveyStore.allTerms.find(term => term.id === previousTermId)
  
  if (previousTerm) {
    // Remove from completed terms (going back)
    surveyStore.completedTerms.pop()
    
    // Set as current term
    surveyStore.currentTerm = previousTerm
    
    // Update completion status
    surveyStore.isComplete = false
    
    console.log(`⬅️ Moved back to: ${previousTerm.termLabel}`)
    return previousTerm
  }
  
  return null
}
/**
 * Reset survey store (useful for switching surveys)
 */
export function resetSurveyStore() {
  surveyStore.contributorId = null
  surveyStore.surveyType = null
  surveyStore.sessionId = null
  surveyStore.currentTerm = null
  surveyStore.allTerms = []
  surveyStore.completedTerms = []
  surveyStore.totalTerms = 0
  surveyStore.isComplete = false
  surveyStore.isLoading = false
  surveyStore.error = null
  surveyStore.responses.clear()
}

// Watch for URL changes and sync store (if using Vue Router)
export function syncStoreWithURL(route) {
  if (route.query.contributor !== surveyStore.contributorId || 
      route.query.survey !== surveyStore.surveyType) {
    // URL changed, reinitialize
    if (route.query.contributor && route.query.survey) {
      initializeSurvey(route.query.contributor, route.query.survey)
    }
  }
}

// Export everything including the new utilities
export default {
  SURVEY_CONFIG,
  surveyStore,
  surveyComputed,
  getSurveyConfig,
  getSurveyDisplayName,
  getSurveyName,
  getActiveSurveys,
  getAvailableSurveys,
  getSurveyAirtableField,
  fetchContributors,
  fetchSurveyTerms,
  initializeSurvey,
  getSurveyProgress,
  saveResponse,
  searchSynonyms,
  moveToNextTerm,
  moveToPreviousTerm,
  resetSurveyStore,
  syncStoreWithURL
}
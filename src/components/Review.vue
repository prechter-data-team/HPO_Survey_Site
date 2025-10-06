<!-- Review.vue -->
<template>
  <!-- Michigan Logo Header -->
  <div class="michigan-logo-header">
    <img src="/image/Michigan-logo.png" alt="University of Michigan" class="michigan-logo">
  </div>

  <div class="container">
    <div class="header">
      <h1 style="color: #FFCB05 !important;">Review All Responses</h1>
      <p style="color: #FFCB05 !important;">
        Click a term from the sidebar to view or edit your feedback for {{ surveyDisplayName }} survey.
      </p>
    </div>

    <div class="survey-content">
      <div class="review-container">
        <!-- Sidebar: List of completed terms -->
        <div class="review-sidebar">
          <h3 style="margin-top: 0; margin-bottom: 15px; color: #333; font-size: 16px;">
            Completed Terms ({{ completedTermsData.length }})
          </h3>
          
          <div v-if="isLoadingCompletedTerms" style="padding: 20px; text-align: center; color: #666;">
            Loading completed terms...
          </div>
          
          <div v-else-if="completedTermsData.length === 0" style="padding: 20px; text-align: center; color: #666;">
            <p>No completed terms found for {{ surveyDisplayName }} survey.</p>
            <router-link 
              :to="`/terms?contributor=${surveyStore.contributorId}&survey=${surveyStore.surveyType}`"
              class="btn btn-primary"
              style="margin-top: 10px; display: inline-block;"
            >
              Go to Survey
            </router-link>
          </div>
          
          <ul v-else id="termSelectList" style="list-style: none; padding: 0; margin: 0;">
            <li 
              v-for="term in completedTermsData" 
              :key="term.id"
              style="margin-bottom: 5px;"
            >
              <a 
                href="#" 
                @click.prevent="selectTerm(term.id)"
                :class="{ 'active': selectedTermId === term.id }"
                style="display: block; padding: 10px; text-decoration: none; color: #333; border-radius: 4px; transition: background-color 0.2s;"
                :style="selectedTermId === term.id ? 'background-color: #e3f2fd; font-weight: bold;' : ''"
                @mouseover="$event.target.style.backgroundColor = '#f5f5f5'"
                @mouseout="$event.target.style.backgroundColor = selectedTermId === term.id ? '#e3f2fd' : 'transparent'"
              >
                {{ term.termLabel }}
              </a>
            </li>
          </ul>
        </div>

        <!-- Main content area -->
        <div class="review-content" id="editorContainer">
          <div v-if="!selectedTermId" style="padding: 40px; text-align: center; color: #333;">
            <h3>Select a term from the sidebar</h3>
            <p>Choose any completed term from the list to view and edit your response.</p>
          </div>
          
          <div v-else-if="isLoadingResponse" style="padding: 40px; text-align: center; color: #333;">
            <h3>Loading response data...</h3>
            <p>Please wait while we fetch your response for this term.</p>
          </div>
          
          <div v-else-if="!currentResponse" style="padding: 40px; text-align: center; color: #333;">
            <h3>No Response Found</h3>
            <p>No response record found for this term. This shouldn't happen!</p>
          </div>
          
          <!-- Response Editor Form -->
          <div v-else class="term-response" style="max-width: 100%; padding: 20px; margin: 0; box-sizing: border-box; overflow-x: hidden;">
            <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 24px; color: #333;">
              Edit Response: {{ selectedTerm?.termLabel }}
            </h2>
            
            <!-- Term Information Display -->
            <div class="term-info-section" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; word-wrap: break-word;">
              <p style="margin-top: 0; margin-bottom: 15px;"><strong>Below is the information on the selected term:</strong></p>
              <ul style="line-height: 1.6; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Name:</strong> {{ selectedTerm?.termLabel }} ({{ selectedTerm?.hpoId }})</li>
                <li style="margin-bottom: 8px;">
                  <strong>Parents:</strong> {{ selectedTerm?.parents }} 
                  <a :href="selectedTerm?.parentLink" target="_blank" style="text-decoration: none; color: #007bff;">(Link)</a>
                </li>
                <li style="margin-bottom: 8px;"><strong>Definition:</strong> "{{ selectedTerm?.definition }}"</li>
                <li style="margin-bottom: 8px;"><strong>Synonyms:</strong> {{ formatSynonyms(selectedTerm.synonyms) }}</li>
              </ul>
            </div>
            
            <!-- Agreement Radio Buttons -->
            <div class="agreement-section" style="margin-bottom: 20px;">
              <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #333;">
                Do you completely agree with this term: {{ selectedTerm?.termLabel }} ({{ selectedTerm?.hpoId }})?
              </h3>
              <div class="radio-group" style="display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; border-radius: 5px;">
                  <input 
                    type="radio" 
                    name="agreeWithDefinition" 
                    value="yes" 
                    v-model="formData.agreement"
                    @change="handleAgreementChange"
                  >
                  <span>Yes</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; border-radius: 5px;">
                  <input 
                    type="radio" 
                    name="agreeWithDefinition" 
                    value="no" 
                    v-model="formData.agreement"
                    @change="handleAgreementChange"
                  >
                  <span>No</span>
                </label>
              </div>
            </div>
            
            <!-- Ratings Section (shown when "No" is selected) -->
            <div 
              v-show="formData.agreement === 'no'" 
              class="ratings-section" 
              style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;"
            >
              <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 18px; color: #333;">Your Ratings:</h3>
              
              <!-- Definition Rating -->
              <div class="rating-item" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Definition Rating:</label>
                <StarRating 
                  :rating="formData.definitionRating"
                  @update="(value) => updateRating('definitionRating', value)"
                />
                <!-- Suggested Definition Text Box -->
                <div 
                  v-show="formData.definitionRating && formData.definitionRating <= 4" 
                  style="margin-top: 10px;"
                >
                  <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666; font-size: 14px;">
                    Suggested Definition:
                  </label>
                  <textarea 
                    v-model="formData.suggestedDefinition"
                    placeholder="Enter your suggested definition..." 
                    style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical; box-sizing: border-box;"
                  ></textarea>
                </div>
              </div>
              
              <!-- Label Rating -->
              <div class="rating-item" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Term Rating:</label>
                <StarRating 
                  :rating="formData.labelRating"
                  @update="(value) => updateRating('labelRating', value)"
                />
                <!-- Suggested Label Text Box -->
                <div 
                  v-show="formData.labelRating && formData.labelRating <= 4" 
                  style="margin-top: 10px;"
                >
                  <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666; font-size: 14px;">
                    Suggested Term name:
                  </label>
                  <input 
                    type="text" 
                    v-model="formData.suggestedLabel"
                    placeholder="Enter your suggested label..." 
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; box-sizing: border-box;"
                  >
                </div>
              </div>
              
              <!-- Hierarchy Rating -->
              <div class="rating-item" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Hierarchy Rating:</label>
                <StarRating 
                  :rating="formData.hierarchyRating"
                  @update="(value) => updateRating('hierarchyRating', value)"
                />
              </div>
              
              <!-- Synonym Rating -->
              <div class="rating-item" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">Synonym Rating:</label>
                <StarRating 
                  :rating="formData.synonymRating"
                  @update="(value) => updateRating('synonymRating', value)"
                />
                <!-- Suggested Synonyms Selector -->
                <div 
                  v-show="formData.synonymRating && formData.synonymRating <= 4" 
                  style="margin-top: 10px;"
                >
                  <SynonymSelector 
                    :selected-synonyms="selectedSynonyms"
                    @update="updateSelectedSynonyms"
                  />
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="action-buttons" style="margin-top: 20px;">
              <button 
                @click="saveChanges" 
                :disabled="isSaving"
                class="save-btn" 
                style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;"
              >
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
              <button 
                @click="cancelChanges" 
                class="cancel-btn" 
                style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Final Responses Button -->
      <div style="margin-top: 30px; text-align: center;">
        <button 
          @click="submitSurvey" 
          class="btn btn-primary"
          style="background: #28a745; border-color: #28a745; font-size: 16px; padding: 12px 24px;"
        >
          Submit Final Responses
        </button>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div 
      v-if="message.text" 
      :class="['alert', `alert-${message.type}`]"
      style="position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;"
    >
      {{ message.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  surveyStore, 
  surveyComputed,
  initializeSurvey, 
  searchSynonyms, 
  saveResponse,
  getSurveyProgress 
} from '@/storage/storeSurvey'
import { 
  initializeDefaultSynonyms,
  formatSynonyms,
  prepareSynonymsForSubmission,
  parseSynonymResponseData
} from '@/utils/synonymUtils.js'
import StarRating from '@/components/StarRating.vue'
import SynonymSelector from '@/components/SynonymSelector.vue'

const route = useRoute()
const router = useRouter()

// Reactive state
const selectedTermId = ref(null)
const currentResponse = ref(null)
const originalResponseData = ref(null)
const completedTermsData = ref([])
const allSynonyms = ref([])
const isLoadingCompletedTerms = ref(true)
const isLoadingResponse = ref(false)
const isSaving = ref(false)
const message = ref({ text: '', type: '' })
const selectedSynonyms = ref([])
const defaultSynonyms = ref([])

// Form data
const formData = ref({
  agreement: 'yes',
  definitionRating: 0,
  labelRating: 0,
  hierarchyRating: 0,
  synonymRating: 0,
  suggestedDefinition: '',
  suggestedLabel: '',
  suggestedSynonyms: null
})

// Computed properties
const selectedTerm = computed(() => {
  return completedTermsData.value.find(term => term.id === selectedTermId.value)
})

const surveyDisplayName = computed(() => {
  return surveyComputed.currentSurveyDisplayName?.value || surveyStore.surveyType || 'Survey'
})

// Initialize default synonyms for the selected term (using utility)
async function initializeDefaultSynonymsForTerm() {
  if (!selectedTerm.value?.synonyms) {
    defaultSynonyms.value = []
    return
  }
  
  const synonymObjects = await initializeDefaultSynonyms(selectedTerm.value.synonyms)
  defaultSynonyms.value = synonymObjects
  console.log('Initialized default synonyms:', defaultSynonyms.value)
}

// Initialize component
onMounted(async () => {
  try {
    const contributorId = route.query.contributor
    const surveyType = route.query.survey

    if (!contributorId || !surveyType) {
      router.push('/')
      return
    }

    // Initialize survey store if needed
    if (surveyStore.contributorId !== contributorId || surveyStore.surveyType !== surveyType) {
      await initializeSurvey(contributorId, surveyType)
    }

    // Load completed terms using existing store function
    await loadCompletedTerms()
    
    // Load synonyms using existing store function
    await loadSynonyms()

  } catch (error) {
    console.error('Error initializing review page:', error)
    showMessage('Error loading review page. Please try again.', 'error')
  }
})

// Load completed terms using store functions
async function loadCompletedTerms() {
  try {
    isLoadingCompletedTerms.value = true
    
    // Use existing getSurveyProgress function to get completed terms
    const progress = await getSurveyProgress(
      surveyStore.contributorId, 
      surveyStore.surveyType, 
      surveyStore.sessionId
    )
    
    // Filter store.allTerms to only include completed ones
    completedTermsData.value = surveyStore.allTerms.filter(term => 
      progress.completedTerms.includes(term.id)
    )

    console.log(`Loaded ${completedTermsData.value.length} completed terms for review`)

  } catch (error) {
    console.error('Error loading completed terms:', error)
    showMessage('Error loading completed terms', 'error')
  } finally {
    isLoadingCompletedTerms.value = false
  }
}

// Load synonyms using existing store function
async function loadSynonyms() {
  try {
    // Use existing searchSynonyms function to get all synonyms
    const synonymsData = await searchSynonyms('')
    allSynonyms.value = synonymsData
    console.log(`Loaded ${allSynonyms.value.length} synonyms`)
  } catch (error) {
    console.error('Error loading synonyms:', error)
    allSynonyms.value = []
  }
}

// Fetch user response using store's existing pattern
async function fetchUserResponseForTerm(termId, contributorId) {
  try {
    // Use the same pattern as findExistingResponse from storeSurvey.js
    const url = `https://api.airtable.com/v0/appe7BjG2tW5746lU/tblgqb1wk4zvhIRnK`
    const filterFormula = `AND(contributorRecordId="${contributorId}", termRecordId="${termId}")`
    const queryUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`
    
    const response = await fetch(queryUrl, {
      headers: {
        'Authorization': 'Bearer patnCtvjJ98Vx2Yov.c8f873488b0c55b3cc2cd24f6777c437f60a42c8c3829f8192a335bb719e5647',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) throw new Error('Failed to fetch response')
    
    const data = await response.json()
    
    if (data.records && data.records.length > 0) {
      const record = data.records[0]
      return {
        recordId: record.id,
        definitionRating: record.fields.definitionRating || null,
        labelRating: record.fields.labelRating || null,
        hierarchyRating: record.fields.hierarchyRating || null,
        synonymRating: record.fields.synonymRating || null,
        suggestedDefinition: record.fields.suggestedDefinition || '',
        suggestedLabel: record.fields.suggestedLabel || '',
        suggestedSynonyms: record.fields.suggestedSynonyms || null,
        allFields: record.fields
      }
    }
    
    return null

  } catch (error) {
    console.error('Error fetching user response:', error)
    return null
  }
}

// Select a term for editing
async function selectTerm(termId) {
  try {
    selectedTermId.value = termId
    isLoadingResponse.value = true
    currentResponse.value = null

    // Fetch user's response for this term
    const response = await fetchUserResponseForTerm(termId, surveyStore.contributorId)
    
    if (response) {
      currentResponse.value = response
      originalResponseData.value = { ...response }
      
      // Populate form with existing data
      await populateFormWithResponse(response)
      
      console.log('Loaded response for term:', termId)
    } else {
      showMessage('No response found for this term', 'warning')
    }

  } catch (error) {
    console.error('Error selecting term:', error)
    showMessage('Error loading response data', 'error')
  } finally {
    isLoadingResponse.value = false
  }
}

// Populate form with response data (using utilities)
async function populateFormWithResponse(response) {
  // Determine agreement based on ratings
  const hasRatings = response.definitionRating || response.labelRating || 
                    response.hierarchyRating || response.synonymRating
  
  formData.value = {
    agreement: hasRatings ? 'no' : 'yes',
    definitionRating: response.definitionRating || 0,
    labelRating: response.labelRating || 0,
    hierarchyRating: response.hierarchyRating || 0,
    synonymRating: response.synonymRating || 0,
    suggestedDefinition: response.suggestedDefinition || '',
    suggestedLabel: response.suggestedLabel || '',
    suggestedSynonyms: response.suggestedSynonyms || null
  }
  
  // Initialize default synonyms from the selected term using utility
  await initializeDefaultSynonymsForTerm()
  
  // Handle suggested synonyms if they exist using utility
  if (response.suggestedSynonyms) {
    const suggestedSynonyms = parseSynonymResponseData(response.suggestedSynonyms, allSynonyms.value)
    
    // Combine defaults with suggested synonyms
    selectedSynonyms.value = [...defaultSynonyms.value, ...suggestedSynonyms]
  } else {
    // Only show default synonyms
    selectedSynonyms.value = [...defaultSynonyms.value]
  }
}

// Handle agreement change
function handleAgreementChange() {
  if (formData.value.agreement === 'yes') {
    // Clear all ratings when user agrees
    formData.value.definitionRating = 0
    formData.value.labelRating = 0
    formData.value.hierarchyRating = 0
    formData.value.synonymRating = 0
    formData.value.suggestedDefinition = ''
    formData.value.suggestedLabel = ''
    // Reset to only default synonyms
    selectedSynonyms.value = [...defaultSynonyms.value]
  }
}

// Handle rating changes (matching Disagree.vue pattern)
function updateRating(ratingType, value) {
  formData.value[ratingType] = value
  
  // Clear suggestions if rating is high (>= 4)
  if (value >= 4) {
    if (ratingType === 'definitionRating') {
      formData.value.suggestedDefinition = ''
    } else if (ratingType === 'labelRating') {
      formData.value.suggestedLabel = ''
    } else if (ratingType === 'synonymRating') {
      // Reset to only default synonyms
      selectedSynonyms.value = [...defaultSynonyms.value]
    }
  }
}

// Update selected synonyms (matching Disagree.vue pattern)
function updateSelectedSynonyms(synonyms) {
  selectedSynonyms.value = synonyms
}

// Save changes using utility functions
async function saveChanges() {
  try {
    isSaving.value = true

    // Use utility function to prepare synonyms for submission
    const synonymData = prepareSynonymsForSubmission(selectedSynonyms.value, defaultSynonyms.value)

    // Prepare response data for store's saveResponse function
    const responseData = {
      agreement: formData.value.agreement,
      timestamp: new Date().toISOString()
    }

    if (formData.value.agreement === 'no') {
      // Only include ratings and suggestions if user disagrees
      responseData.definitionRating = formData.value.definitionRating || null
      responseData.labelRating = formData.value.labelRating || null
      responseData.hierarchyRating = formData.value.hierarchyRating || null
      responseData.synonymRating = formData.value.synonymRating || null
      
      // Only include suggestions if rating is low
      if (formData.value.definitionRating && formData.value.definitionRating <= 4) {
        responseData.suggestedDefinition = formData.value.suggestedDefinition
      }
      if (formData.value.labelRating && formData.value.labelRating <= 4) {
        responseData.suggestedLabel = formData.value.suggestedLabel
      }
      if (formData.value.synonymRating && formData.value.synonymRating <= 4 && synonymData.synonymIds.length > 0) {
        responseData.suggestedSynonyms = synonymData.synonymIds
        responseData.synonymAction = synonymData.action // Include the action type for backend processing
      }
    }

    // Use existing saveResponse function from store
    await saveResponse(selectedTermId.value, responseData)
    
    // Update original data
    originalResponseData.value = { ...responseData }
    
    showMessage('Changes saved successfully!', 'success')

  } catch (error) {
    console.error('Error saving changes:', error)
    showMessage('Failed to save changes. Please try again.', 'error')
  } finally {
    isSaving.value = false
  }
}

// Cancel changes
async function cancelChanges() {
  if (originalResponseData.value) {
    await populateFormWithResponse(originalResponseData.value)
    showMessage('Changes canceled', 'info')
  }
}

// Submit survey
function submitSurvey() {
  // Navigate to finish page
  router.push(`/finish?contributor=${surveyStore.contributorId}&survey=${surveyStore.surveyType}`)
}

// Show message
function showMessage(text, type = 'info') {
  message.value = { text, type }
  setTimeout(() => {
    message.value = { text: '', type: '' }
  }, 3000)
}
</script>

<style scoped>
.review-container {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.review-sidebar {
  width: 300px;
  flex-shrink: 0;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  max-height: 80vh;
  overflow-y: auto;
}

.review-content {
  flex: 1;
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.radio-group label:hover {
  background-color: #f0f0f0;
}

.save-btn:hover {
  background: #0056b3 !important;
}

.cancel-btn:hover {
  background: #545b62 !important;
}

.alert {
  padding: 12px 20px;
  border-radius: 5px;
  border: 1px solid;
}

.alert-success {
  background-color: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.alert-error {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.alert-warning {
  background-color: #fff3cd;
  border-color: #ffeaa7;
  color: #856404;
}

.alert-info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
}

@media (max-width: 768px) {
  .review-container {
    flex-direction: column;
  }
  
  .review-sidebar {
    width: 100%;
    max-height: 300px;
  }
}
</style>
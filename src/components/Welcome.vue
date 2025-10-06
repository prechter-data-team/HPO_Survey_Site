<template>
  <!-- Michigan Logo Header -->
  <div class="michigan-logo-header">
    <img src="/image/Michigan-logo.png" alt="University of Michigan" class="michigan-logo">
  </div>
  
  <div class="welcome-container">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>HPO Term Survey</h1>
        <p>Help improve the Human Phenotype Ontology (HPO)!</p>
      </div>

      <!-- Survey Content -->
      <div class="survey-content">
        <!-- Welcome Message (if contributor auto-selected) -->
        <div v-if="welcomeMessage" class="welcome-message" v-html="welcomeMessage"></div>

        <!-- Error Message -->
        <div v-if="error" class="error">
          {{ error }}
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading">
          <p>Loading contributors...</p>
        </div>

        <!-- Welcome Screen -->
        <div v-else class="welcome-screen">
          <!-- Contributor Selection -->
          <div class="contributor-select">
            <label for="contributorSelect">Please select your contributor record:</label>
            <select 
              id="contributorSelect" 
              v-model="selectedContributorId"
              class="contributor-dropdown"
              @change="onContributorChange"
            >
              <option value="">Please select a contributor...</option>
              <option 
                v-for="contributor in contributors" 
                :key="contributor.id" 
                :value="contributor.id"
              >
                {{ contributor.name }}
              </option>
            </select>
          </div>

          <!-- Survey Status Display -->
          <div v-if="surveyStatus" class="survey-status">
            <div class="survey-info">
              <h3>{{ surveyDisplayName }} Survey</h3>
              <div v-if="surveyStatus.progress > 0" class="progress-info">
                <p>Progress: {{ surveyStatus.progress }}% complete</p>
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: surveyStatus.progress + '%' }"
                  ></div>
                </div>
                <p v-if="surveyStatus.currentTerm">
                  Resume from: <strong>{{ surveyStatus.currentTerm.termLabel }}</strong>
                </p>
              </div>
            </div>
          </div>

          <!-- Action Button -->
          <div class="button-group">
            <div></div>
            <button 
              class="btn" 
              @click="startSurvey" 
              :disabled="!canStartSurvey"
            >
              {{ buttonText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  fetchContributors, 
  initializeSurvey, 
  surveyStore,
  resetSurveyStore,
  getSurveyDisplayName,
  getSurveyName
} from '@/storage/storeSurvey.js'

const route = useRoute()
const router = useRouter()

// Reactive data
const contributors = ref([])
const selectedContributorId = ref('')
const isLoading = ref(true)
const error = ref(null)
const welcomeMessage = ref('')
const surveyStatus = ref(null)

// Get survey type from URL parameters (support multiple parameter names)
const surveyType = computed(() => {
  return route.query.survey || route.query.surveyID || route.query.surveyid || 'clinical'
})

// Use survey config for display names
const surveyDisplayName = computed(() => {
  return getSurveyDisplayName(surveyType.value)
})

const surveyName = computed(() => {
  return getSurveyName(surveyType.value)
})

// Check if user can start survey
const canStartSurvey = computed(() => {
  return selectedContributorId.value && !isLoading.value
})

// Dynamic button text based on survey status
const buttonText = computed(() => {
  if (!selectedContributorId.value) return 'Select Contributor'
  if (isLoading.value) return 'Loading...'
  if (surveyStatus.value?.isComplete) return 'Review Responses'
  if (surveyStatus.value?.progress > 0) return 'Resume Survey'
  return 'Start Survey'
})

// Watch for URL parameter changes
watch(() => route.query.contributorId, (newContributorId) => {
  if (newContributorId && contributors.value.length > 0) {
    autoSelectContributor(newContributorId)
  }
})

// Methods
async function loadContributors() {
  try {
    isLoading.value = true
    error.value = null
    
    console.log('🔄 Loading contributors...')
    const contributorList = await fetchContributors()
    contributors.value = contributorList
    
    console.log(`✅ Loaded ${contributorList.length} contributors`)
    
    // Auto-select contributor if provided in URL
    const urlContributorId = route.query.contributorId
    if (urlContributorId) {
      autoSelectContributor(urlContributorId)
    }
    
  } catch (err) {
    console.error('❌ Error loading contributors:', err)
    error.value = 'Failed to load contributors. Please refresh the page.'
  } finally {
    isLoading.value = false
  }
}

function autoSelectContributor(contributorId) {
  const contributor = contributors.value.find(c => c.id === contributorId)
  
  if (contributor) {
    selectedContributorId.value = contributorId
    updateWelcomeMessage(contributor.name, surveyType.value)
    checkContributorSurveyStatus(contributorId)
    console.log(`✅ Auto-selected contributor: ${contributor.name} (${contributorId})`)
  } else {
    console.warn(`⚠️ Contributor ID ${contributorId} not found`)
    error.value = 'The contributor link you used is not valid. Please select your name from the dropdown.'
  }
}

function updateWelcomeMessage(fullName, surveyType) {
  const displayName = getSurveyDisplayName(surveyType)
  
  welcomeMessage.value = `
    <p style="color: #00274C; font-size: 1.1em; margin-bottom: 15px; text-align: center;">
      Hello <strong style="color: #00274C">${fullName}</strong>!
    </p>
    <p style="color: #00274C; font-size: 0.9em; margin-bottom: 10px; text-align: center;">
      Survey Type: <strong>${displayName}</strong>
    </p>
    <p style="color: #00274C; font-size: 0.9em; margin-bottom: 20px; text-align: center;">
      If this is NOT you, please change the selection below.
    </p>
  `
}

async function onContributorChange() {
  if (!selectedContributorId.value) {
    surveyStatus.value = null
    welcomeMessage.value = ''
    return
  }
  
  // Clear welcome message when manually changing selection
  welcomeMessage.value = ''
  
  // Check survey status for selected contributor
  await checkContributorSurveyStatus(selectedContributorId.value)
}

async function checkContributorSurveyStatus(contributorId) {
  try {
    console.log(`🔍 Checking ${surveyDisplayName.value} survey status for contributor: ${contributorId}`)
    
    // Initialize survey to get current status
    const result = await initializeSurvey(contributorId, surveyType.value)
    
    surveyStatus.value = {
      isComplete: result.isComplete,
      progress: result.progress || 0,
      currentTerm: result.currentTerm
    }
    
    console.log('📊 Survey status:', surveyStatus.value)
    
  } catch (err) {
    console.error('❌ Error checking survey status:', err)
    surveyStatus.value = { isComplete: false, progress: 0, currentTerm: null }
  }
}

function startSurvey() {
  if (!selectedContributorId.value) {
    console.error('❌ No contributor selected')
    return
  }
  
  console.log(`🚀 Starting ${surveyDisplayName.value} survey...`)
  
  // Build navigation URL with parameters (use consistent 'survey' parameter)
  const queryParams = {
    contributor: selectedContributorId.value,
    survey: surveyType.value // Always use 'survey' parameter for consistency
  }
  
  // Navigate to appropriate page
  if (surveyStatus.value?.isComplete) {
    console.log('📊 Redirecting to review page - survey completed')
    router.push({ path: '/review', query: queryParams })
  } else {
    console.log('📝 Redirecting to terms page - survey in progress or starting')
    router.push({ path: '/terms', query: queryParams })
  }
}

// Lifecycle
onMounted(() => {
  console.log('🚀 Welcome component mounted')
  console.log('Survey type from URL:', surveyType.value)
  console.log('Survey display name:', surveyDisplayName.value)
  
  // Reset survey store for fresh start
  resetSurveyStore()
  
  // Load contributors
  loadContributors()
})
</script>

<style scoped>
/* Override global CSS that hides welcome-screen */
.welcome-screen {
  display: block !important;
}

.survey-content,
.welcome-screen,
.button-group,
.survey-status,
.btn {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
.welcome-container {
  min-height: 100vh !important;
  background: #00274C !important;
  padding: 10px 20px 20px 20px !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Michigan Logo Header */
.michigan-logo-header {
  width: 100% !important;
  background: #00274C !important;
  padding: 15px 20px !important;
  text-align: center !important;
  margin: 0 0 20px 0 !important;
}

.michigan-logo-placeholder {
  max-width: 800px !important;
  width: calc(100% - 40px) !important;
  margin: 0 auto !important;
  padding: 30px !important;
  background: white !important;
  border: 3px solid white !important;
  border-radius: 12px !important;
  font-weight: bold !important;
  color: #00274C !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
}

/* Container */
.container {
  max-width: 800px !important;
  margin: 0 auto !important;
  background: white !important;
  border-radius: 20px !important;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important;
  overflow: hidden !important;
}

/* Header */
.header {
  background: #00274C !important;
  color: white !important;
  padding: 30px !important;
  text-align: center !important;
}

.header h1 {
  font-size: 2.5rem !important;
  margin-bottom: 10px !important;
  color: #FFCB05 !important;
}

.header p {
  font-size: 1.1rem !important;
  opacity: 0.9 !important;
  color: #FFCB05 !important;
}

/* Survey Content */
.survey-content {
  padding: 40px !important;
}

/* Welcome Message */
.welcome-message {
  margin-bottom: 30px !important;
  padding: 20px !important;
  background: #f8f9fa !important;
  border-radius: 10px !important;
  border-left: 4px solid #00274C !important;
}

/* Error Message */
.error {
  background: #fed7d7 !important;
  color: #c53030 !important;
  padding: 15px !important;
  border-radius: 10px !important;
  margin-bottom: 20px !important;
  text-align: center !important;
}

/* Loading */
.loading {
  text-align: center !important;
  padding: 40px !important;
  color: #00274C !important;
}

/* Contributor Select */
.contributor-select {
  margin-bottom: 30px !important;
}

.contributor-select label {
  display: block !important;
  font-weight: 600 !important;
  margin-bottom: 15px !important;
  color: #2d3748 !important;
}

.contributor-dropdown {
  width: 100% !important;
  padding: 15px !important;
  border: 2px solid #e2e8f0 !important;
  border-radius: 10px !important;
  font-size: 1rem !important;
  background: white !important;
  transition: border-color 0.3s ease !important;
}

.contributor-dropdown:focus {
  outline: none !important;
  border-color: #00274C !important;
}

/* Survey Status */
.survey-status {
  margin-bottom: 30px !important;
  padding: 20px !important;
  background: #f8fafc !important;
  border-radius: 10px !important;
  border-left: 4px solid #00274C !important;
}

.survey-info h3 {
  margin: 0 0 15px 0 !important;
  color: #2d3748 !important;
  font-size: 1.2rem !important;
}

.progress-info {
  margin-top: 15px !important;
}

.progress-info p {
  margin: 5px 0 !important;
  color: #4a5568 !important;
}

/* Progress Bar */
.progress-bar {
  background: #e2e8f0 !important;
  height: 8px !important;
  border-radius: 4px !important;
  margin: 10px 0 !important;
  overflow: hidden !important;
}

.progress-fill {
  background: #00274C !important;
  height: 100% !important;
  border-radius: 4px !important;
  transition: width 0.5s ease !important;
}

/* Button Group */
.button-group {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-top: 30px !important;
}

/* Button */
.btn {
  background: #00274C !important;
  color: white !important;
  border: none !important;
  padding: 15px 30px !important;
  border-radius: 10px !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: transform 0.3s ease !important;
  min-width: 150px !important;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px) !important;
}

.btn:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .welcome-container {
    padding: 10px !important;
  }
  
  .michigan-logo-placeholder {
    width: calc(100% - 20px) !important;
    padding: 20px !important;
    border: 2px solid white !important;
    border-radius: 8px !important;
  }
  
  .michigan-logo-header {
    padding: 10px !important;
  }
  
  .header h1 {
    font-size: 2rem !important;
  }
  
  .survey-content {
    padding: 20px !important;
  }
}
</style>
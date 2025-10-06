<template>
            <!-- Michigan Logo Header -->
  <div class="michigan-logo-header">
    <img src="/image/Michigan-logo.png" alt="University of Michigan" class="michigan-logo">
  </div>
  
  <div>
    <div class="container">
      <div class="header">
        <h1 style="color: #FFCB05 !important;">HPO Term</h1>
        <p style="color: #FFCB05 !important;">Review the selected term and provide your feedback.</p>
      </div>

      <!-- Loading State -->
      <div v-if="store.isLoading" class="loading">
        <p>Loading survey...</p>
      </div>

      <!-- Error State -->
      <div v-if="store.error" class="error">
        <p>Error: {{ store.error }}</p>
        <button @click="retryInit" class="btn">Retry</button>
      </div>

      <!-- Survey Content -->
      <div v-if="!store.isLoading && !store.error && store.currentTerm" class="survey-content">
        <!-- Interactive Hierarchy - Always visible -->
        <div class="hierarchy-container">
          <h4 style="margin: 0 0 10px 0; text-align: center;">{{ hierarchyTitle }}</h4>
          <div class="hierarchy-controls">
            <button @click="expandAll">Expand All</button>
            <button @click="collapseAll">Collapse All</button>
            <button @click="showCurrentOnly">Show Current Path</button>
          </div>
          <ul class="hierarchy-tree" ref="hierarchyTree">
            <HierarchyNode 
              v-for="(node, key) in hierarchyData" 
              :key="key"
              :name="key"
              :children="node"
              :level="1"
              :current-term="store.currentTerm?.termLabel"
              ref="hierarchyNodes"
            />
          </ul>
        </div>

        <!-- Term Information -->
        <div class="term-info">
          <p><strong>Below is the information on the selected term:</strong></p>
          <ul>
            <li><strong>Name:</strong> {{ store.currentTerm.termLabel }} ({{ store.currentTerm.hpoId || store.currentTerm.id }})</li>
            <li><strong>Parents:</strong> {{ store.currentTerm.parents }} </li>
            <li><strong>Definition:</strong> "{{ store.currentTerm.definition }}"</li>
            <li><strong>Synonyms:</strong> {{ formatSynonyms(store.currentTerm.synonyms) }}</li>
          </ul>
        </div>

        <!-- Agreement Question -->
        <div class="agreement-section">
          <div class="agreement-question">
            Do you completely agree with this term <strong>{{ store.currentTerm.termLabel }}</strong> ({{ store.currentTerm.hpoId || store.currentTerm.id }}) as shown above?
          </div>
          <div class="radio-group">
            <label class="radio-option" :class="{ selected: agreement === 'yes' }">
              <input type="radio" v-model="agreement" value="yes">
              <span>Yes</span>
            </label>
            <label class="radio-option" :class="{ selected: agreement === 'no' }">
              <input type="radio" v-model="agreement" value="no">
              <span>No</span>
            </label>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="button-group">
          <button class="btn btn-secondary" @click="previousTerm" :disabled="!canGoBack">Back</button>
          <button class="btn" @click="nextTerm" :disabled="!agreement">Next</button>
        </div>
      </div>

      <!-- Survey Complete -->
      <div v-if="store.isComplete" class="survey-content">
        <div class="completion-message">
          <h2>Survey Complete!</h2>
          <p>Thank you for completing the survey.</p>
          <button @click="goToReview" class="btn">View Summary</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  surveyStore, 
  surveyComputed, 
  initializeSurvey, 
  saveResponse, 
  moveToNextTerm,
  moveToPreviousTerm,
  resetSurveyStore,
  getSurveyDisplayName
} from '@/storage/storeSurvey.js'
import { 
  buildHierarchyFromTerms,
  getHierarchyTitle,
  createHierarchyControls
} from '@/utils/hierarchyUtils.js'
import { 
  formatSynonyms
} from '@/utils/synonymUtils.js'
import HierarchyNode from './HierarchyNode.vue'

const router = useRouter()
const route = useRoute()

const agreement = ref('')
const hierarchyNodes = ref([])

// Get survey parameters
const contributorId = route.query.contributor
const surveyType = route.query.survey || route.query.surveyID || 'clinical'

// Dynamic hierarchy title using utility function
const hierarchyTitle = computed(() => {
  return getHierarchyTitle(surveyType, surveyStore.allTerms)
})

// Hierarchy data using utility function
const hierarchyData = computed(() => {
  if (!surveyStore.allTerms || surveyStore.allTerms.length === 0) {
    return {}
  }
  
  return buildHierarchyFromTerms(surveyStore.allTerms)
})

// Create hierarchy controls using utility function
const {
  expandAll,
  collapseAll,
  showCurrentOnly,
  updateHierarchy
} = createHierarchyControls(hierarchyNodes)

const canGoBack = computed(() => {
  return surveyStore.completedTerms.length > 0
})

// Expose store and computed for template
const store = surveyStore
const surveyComputedValues = surveyComputed

// Initialize survey
const initSurvey = async () => {
  if (!contributorId || !surveyType) {
    surveyStore.error = 'Missing contributor ID or survey type'
    return
  }

  try {
    await initializeSurvey(contributorId, surveyType)
    
    if (surveyStore.isComplete) {
      router.push(`/review?contributor=${surveyStore.contributorId}&survey=${surveyType}`)
    }
  } catch (error) {
    console.error('Failed to initialize survey:', error)
    surveyStore.error = error.message
  }
}

const retryInit = () => {
  surveyStore.error = null
  initSurvey()
}

const nextTerm = async () => {
  if (!agreement.value || !surveyStore.currentTerm) return

  try {
    if (agreement.value === 'yes') {
      // Only save response for "Yes" answers
      const responseData = {
        agreement: agreement.value,
        timestamp: new Date().toISOString()
      }

      console.log("Saving YES response...")
      await saveResponse(surveyStore.currentTerm.id, responseData)

      console.log("Yes response - moving to next term...")
      
      // Move to next term using storeSurvey.js function
      const nextTermData = moveToNextTerm()
      
      if (!nextTermData || surveyStore.isComplete) {
        // Survey complete, redirect to review
        console.log("Survey complete - redirecting to review")
        router.push({ 
          path: '/review', 
          query: { 
            survey: surveyType,
            contributor: contributorId 
          }
        })
      } else {
        // Reset agreement for next term
        console.log("Moving to next term:", nextTermData.termLabel)
        agreement.value = ''
        await nextTick()
        updateHierarchy()
      }
    } else {
      // For "no" responses, DON'T save anything yet - just navigate to disagree page
      console.log("No response - navigating to disagree page (no save yet)")
      
      router.push({ 
        path: '/disagree', 
        query: { 
          survey: surveyType,
          contributor: contributorId 
        }
      })
      // Note: The current term stays the same, no saveResponse called
    }
  } catch (error) {
    console.error('Error processing response:', error)
    surveyStore.error = error.message
  }
}

const previousTerm = async () => {
  if (!canGoBack.value) {
    console.log('Cannot go back - no completed terms')
    return
  }

  try {
    console.log('Going back to previous term...')
    console.log('Current completed terms:', surveyStore.completedTerms)
    
    // Use the moveToPreviousTerm function from store
    const previousTermData = moveToPreviousTerm()
    
    if (previousTermData) {
      console.log(`Moved back to: ${previousTermData.termLabel}`)
      
      // Reset agreement for the previous term
      agreement.value = ''
      
      // Update hierarchy display
      await nextTick()
      updateHierarchy()
    } else {
      console.warn('Could not move to previous term')
    }
    
  } catch (error) {
    console.error('Error going to previous term:', error)
    surveyStore.error = error.message
  }
}

const goToReview = () => {
  router.push({ 
    path: '/review', 
    query: { 
      survey: surveyType,
      contributor: contributorId 
    }
  })
}

// Watch for current term changes
watch(() => surveyStore.currentTerm, (newTerm) => {
  if (newTerm) {
    updateHierarchy()
  }
})

onMounted(() => {
  initSurvey()
})
</script>
<style>
/* Import all the hierarchy styles from your original HTML */
.hierarchy-container {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 15px;
    margin: 20px auto;
    max-width: 700px;
}

.hierarchy-controls {
    margin-bottom: 10px;
    display: flex;
    gap: 10px;
    justify-content: center;
}

.hierarchy-controls button {
    padding: 5px 12px;
    border: 1px solid #ced4da;
    background: white;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.hierarchy-controls button:hover {
    background: #f8f9fa;
}

.hierarchy-tree {
    list-style: none;
    padding-left: 0;
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
}

.hierarchy-tree ul {
    list-style: none;
    padding-left: 25px;
    margin: 5px 0;
}

.hierarchy-item {
    margin: 4px 0;
    position: relative;
}

.item-content {
    display: flex;
    align-items: center;
    padding: 5px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.item-content:hover {
    background-color: #e9ecef;
}

/* Expand/Collapse Icons */
.expand-icon {
    display: inline-block;
    width: 16px;
    margin-right: 8px;
    text-align: center;
    cursor: pointer;
    user-select: none;
}

.expand-icon:before {
    content: '▶';
    font-size: 10px;
    color: #666;
}

.expand-icon.expanded:before {
    content: '▼';
}

.no-children {
    display: inline-block;
    width: 24px;
}

/* Bullet points for leaf nodes */
.bullet {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #666;
    margin-right: 10px;
    margin-left: 6px;
}

/* Current Term Highlighting */
.current-term > .item-content {
    background: #fff3cd;
    border: 1px solid #ffc107;
    font-weight: 600;
    color: #856404;
}

.current-term > .item-content:hover {
    background: #ffe69c;
}

/* Path to current term */
.in-path > .item-content {
    background: #e7f3ff;
    font-weight: 500;
}

/* You are here indicator */
.you-are-here {
    display: inline-block;
    background: #ffc107;
    color: #000;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    margin-left: 8px;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Hierarchy lines */
.hierarchy-item ul {
    position: relative;
    border-left: 1px dashed #dee2e6;
    margin-left: 8px;
}

/* Different indentation levels */
.level-1 { font-weight: 600; }
.level-2 { font-weight: 500; }
.level-3 { font-weight: 400; }
.level-4 { font-weight: 400; font-size: 13px; }
</style>
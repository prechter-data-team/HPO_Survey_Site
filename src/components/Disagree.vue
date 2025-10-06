<template>
            <!-- Michigan Logo Header -->
  <div class="michigan-logo-header">
    <img src="/image/Michigan-logo.png" alt="University of Michigan" class="michigan-logo">
  </div>

  <div>
    <div class="container">
      <div class="header">
        <h1 style="color: #FFCB05 !important;">Provide Feedback</h1>
        <p style="color: #FFCB05 !important;">Help us improve the term below by rating and providing suggestions.</p>
      </div>

      <div v-if="!currentTerm" class="loading">
        <p>Loading term information...</p>
      </div>

      <div v-else class="survey-content">
        <!-- Term Info -->
        <div class="term-info">
          <p><strong>Here's that (read only) info again for reference:</strong></p>
          <ul>
            <li><strong>Term name:</strong> {{ currentTerm.termLabel }} ({{ currentTerm.hpoId || currentTerm.id }})</li>
            <li><strong>Parents:</strong> {{ currentTerm.parents }} (<a :href="currentTerm.parentLink || '#'" target="_blank">Link</a>)</li>
            <li><strong>Definition:</strong> "{{ currentTerm.definition }}"</li>
            <li><strong>Synonyms:</strong> {{ formatSynonyms(currentTerm.synonyms) }}</li>
          </ul>
        </div>

        <!-- Hierarchy and Rating Rubric Side by Side -->
        <div class="hierarchy-rubric-container">
          <!-- Interactive Hierarchy - Left Side -->
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
                :current-term="currentTerm?.termLabel"
                ref="hierarchyNodes"
              />
            </ul>
          </div>

          <!-- Rating Rubric - Right Side -->
          <div class="rating-rubric">
            <div style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: wrap;">
              <img src="/image/rating.png" alt="Rating Rubric" style="width: 100%; max-width: 400px;">
            </div>
            <p style="margin-top:10px;">The rubric for the stars is above. Feedback boxes will appear below for any ratings below 4 stars.</p>
          </div>
        </div>

        <!-- Term Name Rating -->
        <div class="rating-section">
          <h3>Term name rating *</h3>
          <p>Rate your agreement with this term label</p>
          <StarRating 
            :rating="ratings.termName" 
            @update="(value) => updateRating('termName', value)"
          />
          <div v-if="showFeedbackBox('termName')" class="feedback-box">
            <h4>Please suggest a better term name:</h4>
            <textarea 
              v-model="feedback.termName"
              placeholder="Enter a better term name..."
              class="feedback-textarea"
            ></textarea>
          </div>
        </div>

        <!-- Definition Rating -->
        <div class="rating-section">
          <h3>Definition rating *</h3>
          <p>Rate your agreement with this definition</p>
          <StarRating 
            :rating="ratings.definition" 
            @update="(value) => updateRating('definition', value)"
          />
          <div v-if="showFeedbackBox('definition')" class="feedback-box">
            <h4>Please suggest a better definition:</h4>
            <textarea 
              v-model="feedback.definition"
              placeholder="Enter a better definition..."
              class="feedback-textarea"
            ></textarea>
          </div>
        </div>

        <!-- Hierarchy Rating -->
        <div class="rating-section">
          <h3>Hierarchy rating *</h3>
          <p>Rate your agreement with this hierarchy. You can view the whole hierarchy above.</p>
          <StarRating 
            :rating="ratings.hierarchy" 
            @update="(value) => updateRating('hierarchy', value)"
          />
        </div>

        <!-- Synonym Rating -->
        <div class="rating-section">
          <h3>Synonym Rating *</h3>
          <p>Rate your agreement with these synonyms</p>
          <StarRating 
            :rating="ratings.synonym" 
            @update="(value) => updateRating('synonym', value)"
          />
          <div v-if="showFeedbackBox('synonym')" class="feedback-box">
            <h4>Please suggest better synonyms:</h4>
            <SynonymSelector 
              :selected-synonyms="selectedSynonyms"
              @update="updateSelectedSynonyms"
            />
          </div>
        </div>

        <!-- Success Message -->
        <div v-if="allRatingsFive" class="success-box">
          As all ratings are 5 you will be redirected to skip to the next term ({{ nextTermLabel }}). 
          If you wish to provide a comment, rate one of the items 4 or below.
        </div>

        <!-- Validation Errors -->
        <div v-if="validationErrors.length > 0" class="error-box">
          <h4>Please complete the following required fields:</h4>
          <ul>
            <li v-for="error in validationErrors" :key="error">{{ error }}</li>
          </ul>
        </div>

        <!-- Other Suggestions Section -->
        <div class="other-suggestions-section">
          <h3>Other Suggestions</h3>
          <p>Optional: Add any additional feedback about this term, including hierarchy suggestions if needed</p>
          <textarea 
            v-model="feedback.other"
            placeholder="Enter any additional feedback about this term..."
            class="other-textarea"
          ></textarea>
        </div>

        <!-- Navigation -->
        <div class="button-group" style="margin-top: 20px;">
          <button class="btn btn-secondary" @click="goBack">Back</button>
          <button class="btn" @click="submitFeedback" :disabled="isSubmitting">
            {{ isSubmitting ? 'Submitting...' : 'Next' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { 
  surveyStore, 
  saveResponse, 
  moveToNextTerm,
  getSurveyDisplayName
} from '@/storage/storeSurvey.js'
import { 
  initializeDefaultSynonyms,
  formatSynonyms,
  prepareSynonymsForSubmission
} from '@/utils/synonymUtils.js'
import { 
  buildHierarchyFromTerms,
  getHierarchyTitle,
  createHierarchyControls
} from '@/utils/hierarchyUtils.js'
import StarRating from './StarRating.vue'
import SynonymSelector from './SynonymSelector.vue'
import HierarchyNode from './HierarchyNode.vue'

const router = useRouter()

import { useRoute } from 'vue-router'
const route = useRoute()
const surveyType = route.query.survey || route.query.surveyID || 'clinical'

// Reactive data
const ratings = ref({
  termName: 0,
  definition: 0,
  hierarchy: 0,
  synonym: 0
})

const feedback = ref({
  termName: '',
  definition: '',
  other: ''
})

const selectedSynonyms = ref([])
const defaultSynonyms = ref([])
const validationErrors = ref([])
const isSubmitting = ref(false)
const hierarchyNodes = ref([])

// Get the current term being rated
const currentTerm = computed(() => surveyStore.currentTerm)

const nextTermLabel = computed(() => {
  if (!currentTerm.value?.nextTermLabel) return ''
  const nextLabel = Array.isArray(currentTerm.value.nextTermLabel) 
    ? currentTerm.value.nextTermLabel[0] 
    : currentTerm.value.nextTermLabel
  return nextLabel
})

const allRatingsFive = computed(() => {
  return Object.values(ratings.value).every(rating => rating === 5)
})

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

// Initialize synonyms from the current term (using utility)
const initializeSynonyms = async () => {
  if (currentTerm.value?.synonyms && selectedSynonyms.value.length === 0) {
    const synonymObjects = await initializeDefaultSynonyms(currentTerm.value.synonyms)
    selectedSynonyms.value = synonymObjects
    defaultSynonyms.value = [...synonymObjects]  // Store original defaults
    console.log('Initialized synonyms with real IDs:', selectedSynonyms.value)
  }
}

// Check if feedback box should be shown
const showFeedbackBox = (category) => {
  return ratings.value[category] > 0 && ratings.value[category] <= 4
}

// Update rating
const updateRating = (category, value) => {
  ratings.value[category] = value
  validateForm()
}

// Update selected synonyms
const updateSelectedSynonyms = (synonyms) => {
  selectedSynonyms.value = synonyms
  validateForm()
}

// Validate form
const validateForm = () => {
  const errors = []
  
  // Check if all ratings are provided
  Object.entries(ratings.value).forEach(([category, rating]) => {
    if (rating === 0) {
      errors.push(`${category} rating is required`)
    }
  })
  
  // Check required feedback for low ratings
  if (showFeedbackBox('termName') && !feedback.value.termName.trim()) {
    errors.push('Term name suggestion is required')
  }
  
  if (showFeedbackBox('definition') && !feedback.value.definition.trim()) {
    errors.push('Definition suggestion is required')
  }
  
  if (showFeedbackBox('synonym') && selectedSynonyms.value.length === 0) {
    errors.push('At least one synonym suggestion is required')
  }
  
  validationErrors.value = errors
  return errors.length === 0
}

const goBack = () => {
  // Don't save anything, don't call moveToNextTerm, just go back to the current term
  router.push({ 
    path: '/terms', 
    query: { 
      survey: surveyType,
      contributor: surveyStore.contributorId 
    }
  })
  // The Terms.vue will automatically show the current term from surveyStore.currentTerm
}

// Submit feedback (using utility functions)
const submitFeedback = async () => {
  if (!validateForm()) {
    return
  }
  
  isSubmitting.value = true
  
  try {
    // Use the utility function to prepare synonyms
    const synonymData = prepareSynonymsForSubmission(selectedSynonyms.value, defaultSynonyms.value)
    
    // Prepare response data with ratings and feedback
    const responseData = {
      agreement: 'no', // This is a disagree response
      definitionRating: ratings.value.definition,
      labelRating: ratings.value.termName,
      hierarchyRating: ratings.value.hierarchy,
      synonymRating: ratings.value.synonym,
      suggestedDefinition: feedback.value.definition || null,
      suggestedLabel: feedback.value.termName || null,
      suggestedSynonyms: synonymData.synonymIds.length > 0 ? synonymData.synonymIds : null,
      synonymAction: synonymData.action, // Include the action type for backend processing
      otherSuggestions: feedback.value.other || null,
      timestamp: new Date().toISOString()
    }
    
    console.log('Submitting disagree response:', responseData)
    
    // Save response using storeSurvey.js
    await saveResponse(currentTerm.value.id, responseData)
    
    // Move to next term
    const nextTermData = moveToNextTerm()
    
    if (!nextTermData || surveyStore.isComplete) {
      // Survey complete, redirect to review
      router.push({ 
        path: '/review', 
        query: { 
          survey: surveyType,
          contributor: surveyStore.contributorId 
        }
      })
    } else {
      // Move to next term
      router.push({ 
        path: '/terms', 
        query: { 
          survey: surveyType,
          contributor: surveyStore.contributorId 
        }
      })
    }
    
  } catch (error) {
    console.error('Error submitting feedback:', error)
    alert('There was an error submitting your feedback. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

// Watch for current term changes
watch(() => surveyStore.currentTerm, (newTerm) => {
  if (newTerm) {
    initializeSynonyms()
    updateHierarchy()
  }
}, { immediate: true })

onMounted(() => {
  if (!currentTerm.value) {
    console.warn('No current term found, redirecting to terms page')
    goBack()
  } else {
    initializeSynonyms()
    // Initialize hierarchy display
    nextTick(() => {
      updateHierarchy()
    })
  }
})
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 40px;
  color: #00274C;
}

.rating-section {
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.rating-section h3 {
  margin: 0 0 10px 0;
  color: #2d3748;
}

.rating-section p {
  margin: 0 0 15px 0;
  color: #4a5568;
}

.feedback-box {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-left: 4px solid #007bff;
  border-radius: 5px;
}

.feedback-box h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
}

.feedback-textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.success-box {
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
}

.error-box {
  background: #ffe6e6;
  border: 1px solid #ff6b6b;
  color: #d63031;
  padding: 15px;
  border-radius: 5px;
  margin: 20px 0;
}

.error-box h4 {
  margin: 0 0 10px 0;
}

.error-box ul {
  margin: 0;
  padding-left: 20px;
}

.other-suggestions-section {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin: 30px 0;
}

.other-suggestions-section h3 {
  color: #333;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.other-suggestions-section p {
  color: #666;
  font-size: 14px;
  margin: 0 0 15px 0;
}

.other-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.other-textarea:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.rating-rubric {
  margin: 20px 0;
  text-align: center;
}

.rating-rubric img {
  max-width: 100%;
  height: auto;
}

/* Hierarchy and Rubric Side by Side Container */
.hierarchy-rubric-container {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  align-items: flex-start;
}

.hierarchy-rubric-container .hierarchy-container {
  flex: 1;
  min-width: 300px;
  max-width: 50%;
}

.hierarchy-rubric-container .rating-rubric {
  flex: 1;
  min-width: 300px;
  max-width: 50%;
  margin: 0;
}

/* Responsive design for smaller screens */
@media (max-width: 768px) {
  .hierarchy-rubric-container {
    flex-direction: column;
  }
  
  .hierarchy-rubric-container .hierarchy-container,
  .hierarchy-rubric-container .rating-rubric {
    max-width: 100%;
  }
}

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
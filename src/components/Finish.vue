<!-- Finish.vue -->
<template>
  <!-- Michigan Logo Header -->
  <div class="michigan-logo-header">
    <img src="/image/Michigan-logo.png" alt="University of Michigan" class="michigan-logo">
  </div>

  <div>
    <div class="container">
      <div class="header">
        <h1 style="color: #FFCB05 !important;">Survey Complete!</h1>
        <p style="color: #FFCB05 !important; font-size: 1.2em; font-weight: bold;">
          Congratulations! You have successfully completed the {{ surveyDisplayName }} HPO Term Survey.
        </p>
      </div>

      <div class="survey-content">
        <div class="completion-message" style="text-align: center; max-width: 800px; margin: 0 auto;">
          
          <div style="background: rgba(255, 203, 5, 0.1); border: 2px solid #FFCB05; border-radius: 10px; padding: 30px; margin: 30px 0;">
            <h2 style="color: #FFCB05; margin-top: 0;">Thank You for Your Contribution!</h2>
            
            <p style="color: #00274C; font-size: 1.1em; line-height: 1.6; margin-bottom: 20px;">
              Your feedback is invaluable in advancing medical innovation and improving patient care worldwide. 
              By participating in this survey, you've directly contributed to enhancing the 
              <strong>Human Phenotype Ontology (HPO)</strong> - a standardized vocabulary of phenotypic 
              abnormalities used globally for genomic diagnostics, differential diagnostics, and translational research.
            </p>
            
            <!-- Survey Statistics -->
            <div v-if="surveyStats" style="background: rgba(255, 203, 5, 0.05); border: 1px solid #FFCB05; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #FFCB05; margin-top: 0; font-size: 1.1em;">Your Survey Statistics:</h3>
              <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px; margin-top: 15px;">
                <div style="text-align: center;">
                  <div style="font-size: 2em; font-weight: bold; color: #FFCB05;">{{ surveyStats.completedTerms }}</div>
                  <div style="color: #00274C; font-size: 0.9em;">Terms Reviewed</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 2em; font-weight: bold; color: #FFCB05;">{{ surveyStats.totalResponses }}</div>
                  <div style="color: #00274C; font-size: 0.9em;">Total Responses</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 2em; font-weight: bold; color: #FFCB05;">{{ surveyDisplayName }}</div>
                  <div style="color: #00274C; font-size: 0.9em;">Survey Type</div>
                </div>
              </div>
            </div>
            
            <div style="background: rgba(255, 203, 5, 0.05); border-left: 4px solid #FFCB05; padding: 20px; margin: 25px 0; text-align: left;">
              <h3 style="color: #FFCB05; margin-top: 0; font-size: 1.1em;">Your Impact:</h3>
              <ul style="color: #00274C; line-height: 1.8;">
                <li>Helped refine HPO's standardized vocabulary of over 18,000 phenotypic terms</li>
                <li>Contributed to improving phenotype-driven differential diagnostics</li>
                <li>Advanced genomic diagnostics and translational research capabilities</li>
                <li>Supported the Monarch Initiative's mission to integrate biomedical data for research advancement</li>
                <li>Enhanced a flagship product used in the Global Alliance for Genomics and Health (GA4GH) strategic roadmap</li>
              </ul>
            </div>
            
            <p style="color: #00274C; font-size: 1.0em; line-height: 1.6;">
              The HPO is continuously developed using medical literature, Orphanet, DECIPHER, and OMIM, with over 156,000 annotations 
              to hereditary diseases. As part of the NIH-supported Monarch Initiative, your contribution helps advance the ultimate 
              goal of improving biomedical research through semantic integration of biomedical and model organism data.
            </p>
            
            <div style="margin-top: 30px;">
              <p style="color: #FFCB05; font-size: 1.1em; font-weight: bold;">
                Thank you for making a difference!
              </p>
            </div>
          </div>
          
          <!-- Dynamic Action buttons for next steps -->
          <div v-if="availableSurveys.length > 0" style="margin-top: 40px;">
            <h3 style="color: #00274C; margin-bottom: 20px;">Continue Your Contribution</h3>
            
            <!-- Multiple survey options -->
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 600px; margin: 0 auto;">
              <div 
                v-for="survey in availableSurveys" 
                :key="survey.id"
                style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #FFCB05;"
              >
                <div style="flex: 1;">
                  <div style="font-weight: bold; color: #00274C; margin-bottom: 5px;">
                    {{ survey.displayName }}
                  </div>
                  <div style="color: #666; font-size: 0.9em;">{{ survey.description }}</div>
                </div>
                <button 
                  @click="goToSurvey(survey.id)"
                  class="btn btn-primary"
                  style="margin-left: 20px;"
                >
                  Take {{ survey.name }} Survey
                </button>
              </div>
            </div>
          </div>
          
          <!-- Review button -->
          <div style="margin-top: 30px;">
            <button 
              @click="goToReview" 
              class="btn btn-secondary"
            >
              Review Your Responses
            </button>
            <p style="color: #666; font-size: 0.9em; margin-top: 15px;">
              You can always return to review or modify your responses.
            </p>
          </div>
          
          <!-- Optional: Contact information -->
          <div style="margin-top: 30px; font-size: 0.9em; color: #666;">
            <p>
              Questions about this research? Contact the University of Michigan research team.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  surveyStore, 
  surveyComputed,
  getSurveyProgress 
} from '@/storage/storeSurvey'

const route = useRoute()
const router = useRouter()

// Reactive data
const surveyStats = ref(null)
const isLoading = ref(true)

// Computed properties using the new survey config system
const surveyDisplayName = computed(() => {
  return surveyComputed.currentSurveyDisplayName.value || 'Survey'
})

const availableSurveys = computed(() => {
  return surveyComputed.availableSurveys.value || []
})

// Initialize component
onMounted(async () => {
  try {
    const contributorId = route.query.contributor
    const surveyType = route.query.survey

    // If no query params, try to use store values
    if (!contributorId || !surveyType) {
      if (surveyStore.contributorId && surveyStore.surveyType) {
        // Use store values
        console.log('Using store values for finish page')
      } else {
        // Redirect to home if no survey context
        router.push('/')
        return
      }
    } else {
      // Initialize store if needed
      if (surveyStore.contributorId !== contributorId || surveyStore.surveyType !== surveyType) {
        // Set basic store values
        surveyStore.contributorId = contributorId
        surveyStore.surveyType = surveyType
      }
    }

    // Load survey statistics
    await loadSurveyStats()

  } catch (error) {
    console.error('Error initializing finish page:', error)
  } finally {
    isLoading.value = false
  }
})

// Load survey statistics
async function loadSurveyStats() {
  try {
    // Get survey progress to show statistics
    const progress = await getSurveyProgress(
      surveyStore.contributorId, 
      surveyStore.surveyType, 
      surveyStore.sessionId
    )
    
    surveyStats.value = {
      completedTerms: progress.completedTerms.length,
      totalResponses: progress.completedTerms.length, // Each completed term = 1 response
      surveyType: surveyStore.surveyType,
      progress: progress.progress
    }

    console.log('✅ Loaded survey statistics:', surveyStats.value)

  } catch (error) {
    console.error('Error loading survey statistics:', error)
    // Provide default stats if loading fails
    surveyStats.value = {
      completedTerms: surveyStore.completedTerms.length || 0,
      totalResponses: surveyStore.completedTerms.length || 0,
      surveyType: surveyStore.surveyType || 'clinical',
      progress: 100
    }
  }
}

// Navigate to any survey type (now dynamic)
function goToSurvey(surveyId) {
  router.push({
    path: '/terms',
    query: {
      contributor: surveyStore.contributorId,
      survey: surveyId
    }
  })
}

// Navigate back to review page
function goToReview() {
  router.push({
    path: '/review',
    query: {
      contributor: surveyStore.contributorId,
      survey: surveyStore.surveyType
    }
  })
}
</script>

<style scoped>
.completion-message {
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn {
  padding: 12px 24px;
  border-radius: 6px;
  border: 2px solid;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  cursor: pointer;
}

.btn-primary {
  background: #FFCB05;
  color: #00274C;
  border-color: #FFCB05;
}

.btn-primary:hover {
  background: #e6b800;
  border-color: #e6b800;
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: #00274C;
  border-color: #00274C;
}

.btn-secondary:hover {
  background: #00274C;
  color: white;
  transform: translateY(-2px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .completion-message {
    padding: 0 15px;
  }
  
  .btn {
    width: 100%;
    margin-bottom: 10px;
  }
}
</style>
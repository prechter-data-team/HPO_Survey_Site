# storeSurvey.js

This module provides a complete Vue 3 reactive store and utility functions for managing multi-survey applications. It handles survey state management, Airtable data fetching, progress tracking, and user responses—all without localStorage.

## Table of Contents

- [Installation](#installation)
- [Survey Configuration](#survey-configuration)
- [Airtable Configuration](#airtable-configuration)
- [Global Survey Store](#global-survey-store)
- [Computed Properties](#computed-properties)
- [Survey Configuration Utilities](#survey-configuration-utilities)
- [Airtable API Functions](#airtable-api-functions)
- [Navigation & Session Management](#navigation--session-management)
- [Usage Examples](#usage-examples)

---

## Installation

Ensure you have Vue 3 installed:

```bash
npm install vue
```

### Environment Variables

Create a `.env` file with your Airtable credentials:

```env
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_AIRTABLE_TABLE_CONTRIBUTORS=Contributors
VITE_AIRTABLE_TABLE_TERMS=Terms
VITE_AIRTABLE_TABLE_RESPONSES=Responses
VITE_AIRTABLE_TABLE_SYNONYMS=Synonyms
```

---

## Survey Configuration

`SURVEY_CONFIG` defines all available surveys and their properties. This is the central configuration for adding new surveys.

### Structure

```javascript
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
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Internal survey identifier (used in URLs) |
| `name` | `string` | Short survey name |
| `displayName` | `string` | Full survey name shown to users |
| `description` | `string` | Survey purpose description |
| `airtableField` | `string` | Airtable column name for filtering terms |
| `isActive` | `boolean` | Whether the survey is currently available |

### Adding a New Survey

To add a new survey, simply add a new entry to `SURVEY_CONFIG`:

```javascript
insomnia: {
  id: 'insomnia',
  name: 'Insomnia',
  displayName: 'Insomnia & Sleep Maintenance',
  description: 'Insomnia and sleep maintenance disorders',
  airtableField: 'Include In Survey Insomnia',
  isActive: true
}
```

---

## Airtable Configuration

`AIRTABLE_CONFIG` stores API credentials and table names (internal use only):

```javascript
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
```

---

## Global Survey Store

`surveyStore` is a reactive object that maintains all survey state:

### Properties

```javascript
export const surveyStore = reactive({
  // Current Session
  contributorId: null,      // Current contributor ID
  surveyType: null,         // Current survey type (e.g., 'clinical')
  sessionId: null,          // Generated session ID
  
  // Survey Data
  currentTerm: null,        // Currently active term object
  allTerms: [],             // All terms for current survey
  completedTerms: [],       // Array of completed term IDs
  
  // Progress Tracking
  totalTerms: 0,            // Total terms in survey
  progress: 0,              // Progress percentage
  isComplete: false,        // Survey completion status
  
  // UI State
  isLoading: false,         // Loading indicator
  error: null,              // Error message
  
  // Performance Cache
  termsCache: new Map(),    // Cached survey terms
  synonymsCache: new Map(), // Cached synonyms
  
  // User Responses
  responses: new Map()      // Map of termId -> response object
})
```

### Accessing Store Data

```javascript
import { surveyStore } from './storeSurvey.js'

// Check if survey is complete
if (surveyStore.isComplete) {
  console.log('Survey finished!')
}

// Get current term
console.log(surveyStore.currentTerm.termLabel)

// Check progress
console.log(`${surveyStore.completedTerms.length} / ${surveyStore.totalTerms}`)
```

---

## Computed Properties

`surveyComputed` provides reactive computed values:

### Available Computeds

```javascript
import { surveyComputed } from './storeSurvey.js'

// Progress as percentage (0-100)
const percentage = surveyComputed.progressPercentage.value

// Current term's index in the survey
const index = surveyComputed.currentTermIndex.value

// Next term object (based on survey flow)
const next = surveyComputed.nextTerm.value

// Current survey configuration
const config = surveyComputed.currentSurveyConfig.value

// Current survey display name
const displayName = surveyComputed.currentSurveyDisplayName.value

// Available surveys (excluding current)
const otherSurveys = surveyComputed.availableSurveys.value
```

### Usage in Vue Components

```vue
<template>
  <div>
    <p>Progress: {{ progressPercentage }}%</p>
    <p>Survey: {{ currentSurveyDisplayName }}</p>
  </div>
</template>

<script setup>
import { surveyComputed } from './storeSurvey.js'

const progressPercentage = surveyComputed.progressPercentage
const currentSurveyDisplayName = surveyComputed.currentSurveyDisplayName
</script>
```

---

## Survey Configuration Utilities

Helper functions for working with survey configurations:

### `getSurveyConfig(surveyId)`

Get full configuration for a survey.

```javascript
const config = getSurveyConfig('clinical')
// Returns: { id: 'clinical', name: 'Clinical Sleep', ... }
```

### `getSurveyDisplayName(surveyId)`

Get the display name of a survey.

```javascript
const name = getSurveyDisplayName('parasomnia')
// Returns: 'Parasomnia Disorders'
```

### `getSurveyName(surveyId)`

Get the short name of a survey.

```javascript
const name = getSurveyName('abnormal')
// Returns: 'Abnormal'
```

### `getActiveSurveys()`

Get all active surveys.

```javascript
const surveys = getActiveSurveys()
// Returns: [{ id: 'clinical', ... }, { id: 'parasomnia', ... }]
```

### `getAvailableSurveys(excludeSurveyId)`

Get active surveys excluding a specific one.

```javascript
const otherSurveys = getAvailableSurveys('clinical')
// Returns all active surveys except 'clinical'
```

### `getSurveyAirtableField(surveyId)`

Get the Airtable field name for filtering terms.

```javascript
const field = getSurveyAirtableField('clinical')
// Returns: 'Include in Survey Clinical Sleep'
```

---

## Airtable API Functions

### `fetchContributors()`

Fetch all contributors from Airtable with pagination support.

```javascript
const contributors = await fetchContributors()
// Returns: [{ id, name, email, numberOfResponses, nextTermLabel }, ...]
```

**Returns:** Array of contributor objects

---

### `fetchSurveyTerms(surveyType)`

Fetch all terms for a specific survey type. Results are cached for performance.

```javascript
const terms = await fetchSurveyTerms('clinical')
// Returns: [{ id, termLabel, definition, hpoId, ... }, ...]
```

**Parameters:**
- `surveyType` (string): Survey ID ('clinical', 'parasomnia', etc.)

**Returns:** Array of term objects

**Features:**
- Automatic caching
- Pagination support
- Filters by `Melvin Reviewed` and survey-specific field

---

### `initializeSurvey(contributorId, surveyType)`

Initialize a survey session for a contributor.

```javascript
const result = await initializeSurvey('rec123abc', 'clinical')
// Returns: { isComplete, currentTerm, progress }
```

**Parameters:**
- `contributorId` (string): Airtable record ID of contributor
- `surveyType` (string): Survey type ('clinical', 'parasomnia', etc.)

**Returns:** Object with:
- `isComplete` (boolean): Whether survey is finished
- `currentTerm` (object): Current term to display
- `progress` (number): Progress percentage

**Side Effects:**
- Updates `surveyStore` with session data
- Fetches terms and progress
- Sets current term

---

### `getSurveyProgress(contributorId, surveyType, sessionId)`

Get detailed progress information for a contributor's survey.

```javascript
const progress = await getSurveyProgress('rec123', 'clinical', 'sess456')
// Returns: { completedTerms, isComplete, progress, currentTerm, nextTermLabel }
```

**Returns:** Object with:
- `completedTerms` (array): Array of completed term IDs
- `isComplete` (boolean): Survey completion status
- `responses` (array): Response records
- `progress` (number): Progress percentage (0-100)
- `currentTerm` (object): Next term to display
- `nextTermLabel` (string): Label of next term

---

### `saveResponse(termId, responseData)`

Save or update a user's response to a term.

```javascript
await saveResponse('recTerm123', {
  definitionRating: 5,
  labelRating: 4,
  hierarchyRating: 5,
  synonymRating: 3,
  suggestedDefinition: 'Better definition...',
  suggestedLabel: 'Better label',
  suggestedSynonyms: 'synonym1, synonym2',
  otherSuggestions: 'Additional comments'
})
```

**Parameters:**
- `termId` (string): Airtable term record ID
- `responseData` (object): Response data with ratings and suggestions

**Response Data Fields:**
- `definitionRating` (number): 1-5 rating
- `labelRating` (number): 1-5 rating
- `hierarchyRating` (number): 1-5 rating
- `synonymRating` (number): 1-5 rating
- `suggestedDefinition` (string): Optional suggestion
- `suggestedLabel` (string): Optional suggestion
- `suggestedSynonyms` (string): Optional suggestion
- `otherSuggestions` (string): Optional comments

**Side Effects:**
- Updates or creates Airtable response record
- Adds term to `completedTerms`
- Updates `surveyStore.responses`

---

### `searchSynonyms(searchTerm)`

Search synonyms from Airtable with caching and pagination.

```javascript
// Search for specific term
const results = await searchSynonyms('sleep')
// Returns: [{ id: 'rec123', text: 'sleep disorder' }, ...]

// Get ALL synonyms (empty string)
const allSynonyms = await searchSynonyms('')
// Returns: [{ id: 'rec1', text: 'synonym1' }, { id: 'rec2', text: 'synonym2' }, ...]
```

**Parameters:**
- `searchTerm` (string): Search query (empty string returns ALL synonyms)

**Returns:** Array of synonym objects with `id` and `text`

**Features:**
- Case-insensitive search
- Full pagination support
- Caching for performance
- Limits search results to 10, returns all for empty string

---

### `getSurveyTermCount(surveyType)`

Get the total number of terms in a survey.

```javascript
const count = await getSurveyTermCount('clinical')
// Returns: 42
```

---

## Navigation & Session Management

### `generateSessionId(contributorId, surveyType)`

Generate a deterministic session ID.

```javascript
const sessionId = generateSessionId('rec123', 'clinical')
// Same inputs always produce same session ID
```

---

### `moveToNextTerm()`

Advance to the next term in the survey flow.

```javascript
const nextTerm = moveToNextTerm()
if (nextTerm) {
  console.log(`Moving to: ${nextTerm.termLabel}`)
} else {
  console.log('Survey complete!')
}
```

**Returns:** Next term object or `null` if survey complete

**Side Effects:**
- Updates `surveyStore.currentTerm`
- Sets `isComplete` if no next term

---

### `moveToPreviousTerm()`

Move back to the previous term.

```javascript
const prevTerm = moveToPreviousTerm()
if (prevTerm) {
  console.log(`Moved back to: ${prevTerm.termLabel}`)
}
```

**Returns:** Previous term object or `null` if at start

**Side Effects:**
- Removes last term from `completedTerms`
- Updates `currentTerm`
- Sets `isComplete` to `false`

---

### `resetSurveyStore()`

Reset the entire survey store (useful for switching surveys).

```javascript
resetSurveyStore()
// All store properties reset to initial values
```

---

### `syncStoreWithURL(route)`

Sync store with Vue Router URL parameters.

```javascript
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
watch(() => route.query, () => {
  syncStoreWithURL(route)
})
```

---

## Usage Examples

### Basic Setup in Vue Component

```vue
<template>
  <div>
    <h1>{{ currentSurveyDisplayName }}</h1>
    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="isComplete">Survey Complete!</div>
    <div v-else>
      <h2>{{ currentTerm?.termLabel }}</h2>
      <p>{{ currentTerm?.definition }}</p>
      <p>Progress: {{ progressPercentage }}%</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  surveyStore, 
  surveyComputed, 
  initializeSurvey 
} from './storeSurvey.js'

const route = useRoute()

const isLoading = computed(() => surveyStore.isLoading)
const error = computed(() => surveyStore.error)
const isComplete = computed(() => surveyStore.isComplete)
const currentTerm = computed(() => surveyStore.currentTerm)
const progressPercentage = surveyComputed.progressPercentage
const currentSurveyDisplayName = surveyComputed.currentSurveyDisplayName

onMounted(async () => {
  const contributorId = route.query.contributor
  const surveyType = route.query.survey
  
  if (contributorId && surveyType) {
    await initializeSurvey(contributorId, surveyType)
  }
})
</script>
```

### Saving Responses

```vue
<script setup>
import { saveResponse, moveToNextTerm } from './storeSurvey.js'

async function submitResponse(formData) {
  try {
    await saveResponse(surveyStore.currentTerm.id, {
      definitionRating: formData.defRating,
      labelRating: formData.labelRating,
      hierarchyRating: formData.hierRating,
      synonymRating: formData.synRating,
      suggestedDefinition: formData.newDef,
      otherSuggestions: formData.comments
    })
    
    // Move to next term
    moveToNextTerm()
  } catch (error) {
    console.error('Failed to save response:', error)
  }
}
</script>
```

### Switching Between Surveys

```vue
<template>
  <div>
    <h2>Available Surveys:</h2>
    <button 
      v-for="survey in availableSurveys" 
      :key="survey.id"
      @click="switchSurvey(survey.id)"
    >
      {{ survey.displayName }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  surveyComputed, 
  surveyStore,
  resetSurveyStore,
  initializeSurvey 
} from './storeSurvey.js'

const router = useRouter()
const availableSurveys = surveyComputed.availableSurveys

async function switchSurvey(newSurveyType) {
  resetSurveyStore()
  
  await router.push({
    query: {
      contributor: surveyStore.contributorId,
      survey: newSurveyType
    }
  })
  
  await initializeSurvey(surveyStore.contributorId, newSurveyType)
}
</script>
```

### Working with Synonyms

```vue
<script setup>
import { ref } from 'vue'
import { searchSynonyms } from './storeSurvey.js'

const searchQuery = ref('')
const synonymResults = ref([])

async function handleSearch() {
  if (searchQuery.value.length > 2) {
    synonymResults.value = await searchSynonyms(searchQuery.value)
  }
}

// Load all synonyms on mount
onMounted(async () => {
  const allSynonyms = await searchSynonyms('')
  console.log(`Loaded ${allSynonyms.length} total synonyms`)
})
</script>
```

---

## Best Practices

1. **Always check for URL parameters** before initializing surveys
2. **Use computed properties** for reactive UI updates
3. **Cache results** are automatic - don't worry about refetching
4. **Handle errors** from async functions with try/catch
5. **Reset store** when switching between surveys
6. **Use survey utilities** instead of accessing `SURVEY_CONFIG` directly

---

## Troubleshooting

### Survey not initializing
- Check that `contributor` and `survey` URL parameters exist
- Verify Airtable credentials in `.env`
- Check browser console for API errors

### Terms not loading
- Verify survey has `isActive: true` in `SURVEY_CONFIG`
- Check Airtable field name matches `airtableField`
- Ensure terms have `Melvin Reviewed = TRUE`

### Progress not tracking
- Verify responses are being saved to Airtable
- Check that term IDs match between responses and terms
- Clear cache by refreshing the page

---

## API Reference Summary

| Function | Purpose | Returns |
|----------|---------|---------|
| `getSurveyConfig()` | Get survey configuration | Config object |
| `fetchContributors()` | Get all contributors | Array |
| `fetchSurveyTerms()` | Get survey terms | Array |
| `initializeSurvey()` | Start survey session | Progress object |
| `getSurveyProgress()` | Get current progress | Progress object |
| `saveResponse()` | Save user response | Response record |
| `searchSynonyms()` | Search synonyms | Array |
| `moveToNextTerm()` | Navigate forward | Term object |
| `moveToPreviousTerm()` | Navigate backward | Term object |
| `resetSurveyStore()` | Clear all state | void |

---

**Version:** 1.0.0  
**Last Updated:** 2025
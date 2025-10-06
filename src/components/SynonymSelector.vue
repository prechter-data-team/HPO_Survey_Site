<template>
  <div class="synonym-selector">
    <!-- Search Input -->
    <div class="search-container">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search for synonyms or type to create new..."
        class="search-input"
        @focus="showDropdown = true"
        @input="handleSearch"
        @keydown.enter="handleEnterKey"
      />
      
      <!-- Create New Button (shows when typing something not found) -->
      <button 
        v-if="showCreateButton"
        @click="openCreateDialog"
        class="create-button"
      >
        + Create "{{ searchQuery }}"
      </button>
      
      <!-- Dropdown -->
      <div v-if="showDropdown && filteredSynonyms.length > 0" class="dropdown">
        <div
          v-for="synonym in filteredSynonyms.slice(0, 10)"
          :key="synonym.id"
          class="dropdown-item"
          @click="selectSynonym(synonym)"
        >
          {{ synonym.text }}
        </div>
      </div>
      
      <!-- No results -->
      <div v-if="showDropdown && searchQuery && filteredSynonyms.length === 0 && !showCreateButton" class="dropdown">
        <div class="no-results">
          <span v-if="existsInAllSynonyms">This synonym exists but is not available for selection</span>
          <span v-else>No matching synonyms found</span>
        </div>
      </div>
    </div>

    <!-- Selected Synonyms -->
    <div class="selected-synonyms">
      <h4>Selected Synonyms:</h4>
      <div v-if="selectedSynonyms.length === 0" class="empty-message">
        No synonyms selected yet
      </div>
      <div v-else class="synonym-tags">
        <div
          v-for="synonym in selectedSynonyms"
          :key="synonym.id"
          :class="['synonym-tag', { 
            'default-synonym': synonym.isDefault,
            'existing-synonym': synonym.isExisting,
            'custom-synonym': synonym.isCustom
          }]"
        >
          <span>{{ synonym.text }}</span>
          <button @click="removeSynonym(synonym.id)" class="remove-btn">×</button>
        </div>
      </div>
    </div>

    <!-- Create Synonym Dialog -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="closeCreateDialog">
      <div class="dialog-content" @click.stop>
        <h3>Create New Synonym</h3>
        
        <div class="form-group">
          <label>Synonym Text:</label>
          <input
            v-model="newSynonym.text"
            placeholder="Enter the synonym..."
            class="dialog-input"
            @keydown.enter="createSynonym"
          />
        </div>

        <div class="form-group">
          <label>Synonym Type:</label>
          <select v-model="newSynonym.type" class="dialog-select">
            <option value="">Select type...</option>
            <option value="Exact">Exact</option>
            <option value="Related">Related</option>
            <option value="Broad">Broad</option>
            <option value="Narrow">Narrow</option>
            <option value="Layperson">Layperson</option>
            <option value="Broad, Grumpy">Broad, Grumpy</option>
            <option value="Exasct">Exasct</option>
            <option value="Grumpy">Grumpy</option>
          </select>
        </div>

        <div class="dialog-buttons">
          <button @click="closeCreateDialog" class="cancel-button">Cancel</button>
          <button 
            @click="createSynonym" 
            :disabled="!canCreateSynonym"
            class="submit-button"
          >
            Create Synonym
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { searchSynonyms, surveyStore } from '@/storage/storeSurvey.js'

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
const props = defineProps({
  selectedSynonyms: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update'])

const searchQuery = ref('')
const showDropdown = ref(false)
const allSynonyms = ref([])
const isLoading = ref(false)
const lastLoadTime = ref(null)

// New synonym creation
const showCreateDialog = ref(false)
const newSynonym = ref({
  text: '',
  type: ''
})

const filteredSynonyms = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const query = searchQuery.value.toLowerCase()
  return allSynonyms.value.filter(synonym => 
    synonym.text && 
    synonym.text.toLowerCase().includes(query) &&
    !props.selectedSynonyms.some(selected => selected.id === synonym.id)
  )
})

// Check if the search query exists in ALL synonyms (not just filtered ones)
const existsInAllSynonyms = computed(() => {
  if (!searchQuery.value.trim()) return false
  
  const query = searchQuery.value.toLowerCase().trim()
  return allSynonyms.value.some(synonym => 
    synonym.text && synonym.text.toLowerCase().trim() === query
  )
})

const showCreateButton = computed(() => {
  return searchQuery.value.trim().length > 2 && 
         filteredSynonyms.value.length === 0 && 
         !isLoading.value &&
         !isExactMatch.value &&
         !existsInAllSynonyms.value  // This prevents showing create button for existing synonyms
})

const isExactMatch = computed(() => {
  return filteredSynonyms.value.some(result => 
    result.text.toLowerCase() === searchQuery.value.toLowerCase()
  )
})

const canCreateSynonym = computed(() => {
  return newSynonym.value.text.trim().length > 0 && newSynonym.value.type
})

const handleSearch = async () => {
  if (searchQuery.value.length < 2) {
    showDropdown.value = false
    return
  }
  
  // Only load if no synonyms loaded yet
  if (allSynonyms.value.length === 0) {
    await loadSynonyms()
  }
  
  showDropdown.value = true
}

const handleEnterKey = () => {
  if (showCreateButton.value) {
    openCreateDialog()
  }
}

const loadSynonyms = async (forceRefresh = false) => {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    console.log('Loading synonyms...', forceRefresh ? '(refreshing)' : '(cached)')
    
    const shouldRefresh = forceRefresh || 
                         allSynonyms.value.length === 0 || 
                         (lastLoadTime.value && Date.now() - lastLoadTime.value > 300000)
    
    if (shouldRefresh && surveyStore && surveyStore.synonymsCache) {
      surveyStore.synonymsCache.clear()
      console.log('Cleared synonyms cache')
    }
    
    const synonyms = await searchSynonyms('')
    allSynonyms.value = synonyms.map(syn => ({
      id: syn.id,
      text: syn.text || syn.synonymText || 'Unknown'
    }))
    lastLoadTime.value = Date.now()
    console.log(`Loaded ${allSynonyms.value.length} synonyms`)
  } catch (error) {
    console.error('Error loading synonyms:', error)
  } finally {
    isLoading.value = false
  }
}

const selectSynonym = (synonym) => {
  // Mark as existing synonym (from database)
  const synonymWithType = {
    ...synonym,
    isDefault: false,
    isExisting: true,
    isCustom: false
  }
  
  const updatedSynonyms = [...props.selectedSynonyms, synonymWithType]
  emit('update', updatedSynonyms)
  
  searchQuery.value = ''
  showDropdown.value = false
}

const removeSynonym = (synonymId) => {
  const updatedSynonyms = props.selectedSynonyms.filter(syn => syn.id !== synonymId)
  emit('update', updatedSynonyms)
}

// New synonym creation methods
const openCreateDialog = () => {
  newSynonym.value.text = searchQuery.value.trim()
  newSynonym.value.type = ''
  showCreateDialog.value = true
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  newSynonym.value = { text: '', type: '' }
}

const createSynonym = async () => {
  if (!canCreateSynonym.value) return

  try {
    // First, save to Airtable
    const airtableRecord = await saveCustomSynonymToAirtable()
    
    // Create synonym object with the real Airtable ID
    const customSynonym = {
      id: airtableRecord.id, // Use the real Airtable record ID
      text: newSynonym.value.text.trim(),
      type: newSynonym.value.type,
      isDefault: false,
      isExisting: false,
      isCustom: true
    }

    // Add to selected synonyms
    const updatedSelection = [...props.selectedSynonyms, customSynonym]
    emit('update', updatedSelection)

    // Add to the allSynonyms list so it appears in future searches
    allSynonyms.value.push(customSynonym)

    // Clear search and close dialog
    searchQuery.value = ''
    showDropdown.value = false
    closeCreateDialog()

    console.log('✅ Successfully created custom synonym:', customSynonym)

  } catch (error) {
    console.error('Error creating synonym:', error)
    alert('Error creating synonym. Please try again.')
  }
}

const saveCustomSynonymToAirtable = async () => {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.synonyms}`
    
    const airtableHeaders = {
      'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    }
    
    const fieldsToSend = {
      synonymLabel: newSynonym.value.text.trim(),
      type: [newSynonym.value.type], // Wrap in array for Multiple Select field
      NeedsReview: true
    }
    
    // Debug logging
    console.log('Sending to Airtable:', fieldsToSend)
    console.log('Type value specifically:', `"${newSynonym.value.type}"`, typeof newSynonym.value.type)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: airtableHeaders,
      body: JSON.stringify({
        records: [{
          fields: fieldsToSend
        }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Full Airtable error response:', errorData)
      throw new Error(`Airtable API error: ${response.status} - ${errorData.error?.message}`)
    }

    const data = await response.json()
    console.log('✅ Custom synonym saved to Airtable:', data)
    
    return data.records[0] // Return the created record
    
  } catch (error) {
    console.error('❌ Error saving custom synonym to Airtable:', error)
    throw error
  }
}

// Hide dropdown when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.synonym-selector')) {
    showDropdown.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  await loadSynonyms()
})
</script>

<style scoped>
.synonym-selector {
  margin: 15px 0;
}

.search-container {
  position: relative;
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.create-button {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: #28a745;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  z-index: 10;
}

.create-button:hover {
  background: #218838;
}

.refresh-button {
  position: absolute;
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  background: #6c757d;
  color: white;
  border: none;
  padding: 5px 8px;
  border-radius: 3px;
  font-size: 14px;
  cursor: pointer;
  z-index: 10;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-button:hover:not(:disabled) {
  background: #5a6268;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ced4da;
  border-top: none;
  border-radius: 0 0 5px 5px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.dropdown-item {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.no-results {
  padding: 10px;
  color: #666;
  font-style: italic;
  text-align: center;
}

.selected-synonyms h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.current-synonyms h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.current-synonyms {
  margin-bottom: 15px;
}

.current-term-tag {
  background: #6c757d !important;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.current-term-tag:hover {
  background: #007bff !important;
  transform: scale(1.02);
}

.current-term-tag .deselect-hint {
  display: none;
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 10px;
  white-space: nowrap;
  z-index: 1000;
}

.current-term-tag:hover .deselect-hint {
  display: block;
}

.synonym-tag.current-term-tag {
  border: 2px solid #495057;
}

.empty-message {
  color: #666;
  font-style: italic;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
}

.synonym-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  min-height: 40px;
}

.synonym-tag {
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  /* Default fallback color - should not normally be seen */
  background: #6c757d;
  border: 2px solid #495057;
}

/* Default synonyms (preselected with term) - Blue */
.synonym-tag.default-synonym {
  background: #007bff;
  border: 2px solid #0056b3;
}

/* Existing synonyms (selected from database) - Orange */
.synonym-tag.existing-synonym {
  background: #fd7e14;
  border: 2px solid #e8590c;
}

/* Custom synonyms (created by user) - Purple */
.synonym-tag.custom-synonym {
  background: #6f42c1;
  border: 2px solid #5a2d91;
}

.remove-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.remove-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-content h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.dialog-input, .dialog-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.dialog-input:focus, .dialog-select:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.dialog-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-button, .submit-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.cancel-button:hover {
  background: #5a6268;
}

.submit-button {
  background: #007bff;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: #0056b3;
}

.submit-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>
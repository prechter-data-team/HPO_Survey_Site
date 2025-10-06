# Review.vue

This component provides a **review and editing interface** for completed survey terms.  
Users can select terms they’ve already responded to, view their responses, edit feedback (ratings, suggestions, synonyms), and finally submit all responses.

---

## Features

- **Sidebar navigation**  
  - Displays a list of all completed terms for the current survey.  
  - Allows users to select a term to review or edit.  

- **Term information display**  
  - Shows label, HPO ID, parent terms, definition, and synonyms.  
  - Provides quick access to parent term links.  

- **Agreement selection**  
  - Users confirm whether they agree with the definition.  
  - If they disagree, rating and suggestion fields appear.  

- **Detailed feedback tools** (when disagreement is selected)  
  - **Star ratings** for definition, label, hierarchy, and synonyms.  
  - Conditional input fields for suggesting new labels, definitions, or synonyms.  

- **Synonym management**  
  - Uses the `SynonymSelector` component.  
  - Handles default synonyms and user-suggested synonyms.  

- **Save / Cancel editing**  
  - Save changes directly to Airtable via `saveResponse`.  
  - Cancel reverts to the original saved state.  

- **Submit final responses**  
  - Provides a one-click button to finish the survey and navigate to the final page.  

- **Inline alerts**  
  - Displays temporary success, error, info, or warning messages.


TODO: ADD IMAGE HERE 

---

## How It Works

1. **Initialization**  
   - On mount, the component checks `contributorId` and `surveyType` from the route query.  
   - It initializes the survey store (`initializeSurvey`) and loads completed terms (`getSurveyProgress`) plus all synonyms (`searchSynonyms`).  

2. **Sidebar navigation**  
   - Completed terms are displayed in a sidebar list.  
   - Selecting a term triggers `selectTerm(termId)`, which fetches the user’s saved response from Airtable.  

3. **Form population**  
   - Existing response data is loaded into `formData`.  
   - Synonyms are initialized from defaults and any user-suggested entries.  

4. **User interaction**  
   - If “Yes” is selected, all ratings/suggestions are cleared.  
   - If “No” is selected, rating components (`StarRating`) and suggestion inputs appear.  

5. **Data saving**  
   - `saveChanges()` prepares the data (ratings, suggestions, synonyms) and calls `saveResponse`.  
   - Synonyms are formatted for backend submission using `prepareSynonymsForSubmission`.  

6. **Final submission**  
   - Clicking **Submit Final Responses** navigates to `/finish` with contributor and survey query params.  

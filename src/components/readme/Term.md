# Term.vue

# Survey.vue

This component provides the **main survey interface** where contributors review terms in the **HPO Term Survey**.  
It displays the hierarchy of terms, term details, agreement options, and navigation controls.  
Users can move through terms one by one, record whether they agree, and seamlessly continue until completion.

---

## Features

- **Michigan branding**  
  - Displays University of Michigan logo in the header.  

- **Loading & error states**  
  - Shows a spinner-like loading message when initializing.  
  - Displays error messages with a retry button if initialization fails.  

- **Interactive term hierarchy**  
  - Always visible tree of HPO terms.  
  - Expand/collapse all controls.  
  - Option to show only the current path to the selected term.  
  - Highlights the current term in the tree.  

- **Term information**  
  - Displays label, HPO ID, parent terms, definition, and synonyms.  
  - Uses formatting helpers from `synonymUtils.js`.  

- **Agreement section**  
  - Asks: *“Do you completely agree with this term as shown above?”*  
  - Two radio options: **Yes** or **No**.  

- **Navigation buttons**  
  - **Back**: Moves to the previous completed term (disabled when unavailable).  
  - **Next**: Saves “Yes” responses immediately and moves forward, or redirects to the `disagree` page if “No” is selected.  

- **Survey completion**  
  - When all terms are complete, shows a thank-you screen with a button to review responses.  


TODO: ADD IMAGE HERE 

---

## How It Works

1. **Initialization**  
   - On mount, extracts `contributorId` and `surveyType` from route query.  
   - Calls `initializeSurvey()` from `storeSurvey.js`.  
   - If the survey is already complete, automatically redirects to `/review`.  

2. **Hierarchy building**  
   - Uses `buildHierarchyFromTerms` and `getHierarchyTitle` from `hierarchyUtils.js`.  
   - Dynamically updates highlighting when `store.currentTerm` changes.  

3. **Agreement workflow**  
   - If **Yes** is selected:  
     - Calls `saveResponse()` with `{ agreement: "yes", timestamp }`.  
     - Proceeds to the next term with `moveToNextTerm()`.  
     - If survey is complete, navigates to `/review`.  
   - If **No** is selected:  
     - Redirects immediately to `/disagree` without saving yet.  

4. **Navigation**  
   - **Back** button uses `moveToPreviousTerm()`.  
   - Resets agreement selection and updates hierarchy.  

5. **Completion**  
   - Once all terms are answered, `store.isComplete` is set.  
   - Displays a **Survey Complete** message and a button linking to `/review`.  

---

## Related Files

- **`storeSurvey.js`** – Survey state management (initialize, navigation, saving responses).  
- **`hierarchyUtils.js`** – Builds and manages the expandable tree view of HPO terms.  
- **`synonymUtils.js`** – Formats and prepares synonyms for display.  
- **`HierarchyNode.vue`** – Recursive component for rendering each node in the hierarchy.  
- **`Review.vue`** – Post-survey interface for reviewing and editing responses.  
- **`Disagree.vue`** – Interface for providing detailed feedback when a user selects “No.”  

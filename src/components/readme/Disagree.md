# Disagree.vue

A Vue.js component for collecting detailed feedback on medical/clinical terminology, including term names, definitions, hierarchical relationships, and synonyms. Built for the University of Michigan's HPO survey.

## Overview

This component allows domain experts to rate and provide feedback on various aspects of medical terms, including:
- **Term Name Rating**: Agreement with the proposed term label
- **Definition Rating**: Agreement with the term's definition
- **Hierarchy Rating**: Agreement with the term's position in the taxonomy
- **Synonym Rating**: Agreement with the proposed synonyms

## Key Features

### Interactive Hierarchy Visualization
- Expandable/collapsible tree structure showing term relationships
- Current term highlighting with "You are here" indicator
- Path highlighting to show ancestry
- Controls for expand all, collapse all, and show current path only

### Star Rating System
- 5-star rating scale for each feedback category
- Conditional feedback boxes for ratings ≤ 4 stars
- Visual rating rubric for consistency

### Dynamic Feedback Collection
- Required text feedback for low ratings
- Synonym selector with add/remove functionality
- Optional general suggestions section
- Real-time validation with error messaging

## Component Structure

### Template Sections

1. **Header**: University of Michigan branding and title
2. **Term Information Display**: Read-only reference information
3. **Hierarchy and Rating Rubric**: Side-by-side layout showing term hierarchy and rating guidelines
4. **Rating Sections**: Four separate rating categories with conditional feedback
5. **Navigation Controls**: Back and Next buttons with submission handling

### Core Functionality

#### Rating Categories
Each rating category follows the same pattern:
- Star rating input (1-5 scale)
- Conditional feedback box for ratings ≤ 4
- Real-time validation

#### Hierarchy Display
The interactive hierarchy shows:
- Full taxonomical structure
- Current term highlighting
- Expandable/collapsible nodes
- Visual indicators for term relationships

#### Validation Logic
- All ratings must be provided (required)
- Low ratings require explanatory feedback
- Synonym ratings require synonym suggestions when ≤ 4
- Real-time error display with specific missing fields

## Dependencies

### Vue 3 Composition API
- `ref`, `computed`, `onMounted`, `watch`, `nextTick`
- Vue Router for navigation

### Custom Components
- `StarRating.vue`: Reusable star rating component
- `SynonymSelector.vue`: Multi-select synonym interface
- `HierarchyNode.vue`: Recursive tree node component

### Utility Modules
- `storeSurvey.js`: State management and data persistence
- `synonymUtils.js`: Synonym processing and formatting
- `hierarchyUtils.js`: Hierarchy building and navigation

## State Management

### Reactive Data
```javascript
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
// src/utils/hierarchyUtils.js
import { getSurveyDisplayName } from '@/storage/storeSurvey.js'

/**
 * Build hierarchy tree from Airtable terms using nextTermLabel order
 */
export function buildHierarchyFromTerms(terms) {
  console.log('Building hierarchy from terms:', terms)
  
  // Step 1: Find root terms (terms that don't have parents in the current survey)
  const termLabels = terms.map(t => t.termLabel)
  const rootTerms = terms.filter(term => {
    // A term is root if its parent is not in the current survey terms
    return !term.parents || !termLabels.includes(term.parents)
  })
  
  console.log('Root terms found:', rootTerms.map(t => t.termLabel))
  
  // Step 2: Build the hierarchy recursively using nextTermLabel order
  const hierarchy = {}
  
  rootTerms.forEach(rootTerm => {
    hierarchy[rootTerm.termLabel] = buildChildrenInOrder(rootTerm, terms)
  })
  
  console.log('Built hierarchy:', hierarchy)
  return hierarchy
}

/**
 * Recursive function to build children for a term following nextTermLabel order
 */
function buildChildrenInOrder(parentTerm, allTerms) {
  // Find all terms that have this term as their parent
  const children = allTerms.filter(term => term.parents === parentTerm.termLabel)
  
  if (children.length === 0) {
    return [] // No children, return empty array
  }
  
  // Sort children based on the order they appear in the parent's nextTermLabel
  const orderedChildren = sortChildrenByNextTermOrder(children, parentTerm, allTerms)
  
  console.log(`Children of "${parentTerm.termLabel}":`, orderedChildren.map(c => c.termLabel))
  
  // Check if any children have their own children
  const childrenWithGrandchildren = orderedChildren.filter(child => {
    return allTerms.some(term => term.parents === child.termLabel)
  })
  
  if (childrenWithGrandchildren.length === 0) {
    // All children are leaf nodes, return as array in order
    return orderedChildren.map(child => child.termLabel)
  }
  
  // Mixed case: some children have children, some don't
  const result = {}
  orderedChildren.forEach(child => {
    const childHasChildren = allTerms.some(term => term.parents === child.termLabel)
    if (childHasChildren) {
      result[child.termLabel] = buildChildrenInOrder(child, allTerms)
    } else {
      // For leaf nodes in mixed case, we still use the object notation
      result[child.termLabel] = []
    }
  })
  
  return result
}

/**
 * Function to sort children based on nextTermLabel order
 */
function sortChildrenByNextTermOrder(children, parentTerm, allTerms) {
  if (!parentTerm.nextTermLabel || children.length <= 1) {
    return children // No ordering info or only one child
  }
  
  // Build the survey flow chain starting from parent
  const surveyFlowOrder = buildSurveyFlowChain(allTerms)
  console.log('Survey flow order:', surveyFlowOrder)
  
  // Sort children based on their position in the survey flow
  const orderedChildren = [...children].sort((a, b) => {
    const indexA = surveyFlowOrder.indexOf(a.termLabel)
    const indexB = surveyFlowOrder.indexOf(b.termLabel)
    
    // If both terms are in the flow, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    
    // If only one is in the flow, prioritize it
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    
    // If neither is in the flow, maintain original order
    return 0
  })
  
  return orderedChildren
}

/**
 * Function to build the complete survey flow chain using nextTermLabel
 */
function buildSurveyFlowChain(terms) {
  // Find the root term (starting point)
  const termLabels = terms.map(t => t.termLabel)
  const rootTerm = terms.find(term => {
    return !term.parents || !termLabels.includes(term.parents)
  })
  
  if (!rootTerm) return []
  
  const flowChain = []
  const visited = new Set()
  let currentTerm = rootTerm
  
  while (currentTerm && !visited.has(currentTerm.termLabel)) {
    flowChain.push(currentTerm.termLabel)
    visited.add(currentTerm.termLabel)
    
    // Find next term based on nextTermLabel
    if (currentTerm.nextTermLabel) {
      let nextTermLabel = currentTerm.nextTermLabel
      
      // Handle nextTermLabel as array
      if (Array.isArray(nextTermLabel)) {
        nextTermLabel = nextTermLabel[0] // Take first one
      }
      
      // Extract term label if it contains multiple terms separated by commas
      if (typeof nextTermLabel === 'string' && nextTermLabel.includes(',')) {
        nextTermLabel = nextTermLabel.split(',')[0].trim()
      }
      
      // Find the next term in our current survey
      currentTerm = terms.find(term => term.termLabel === nextTermLabel)
    } else {
      break
    }
  }
  
  return flowChain
}

/**
 * Generate hierarchy title based on survey type and terms
 */
export function getHierarchyTitle(surveyType, allTerms) {
  if (!allTerms || allTerms.length === 0) {
    return 'Loading Hierarchy...'
  }
  
  // Find the root term to use as title
  const termLabels = allTerms.map(t => t.termLabel)
  const rootTerm = allTerms.find(term => {
    return !term.parents || !termLabels.includes(term.parents)
  })
  
  // Use survey config for display name
  const surveyDisplayName = getSurveyDisplayName(surveyType)
  return rootTerm ? `${rootTerm.termLabel} Hierarchy` : `${surveyDisplayName} Hierarchy`
}

/**
 * Hierarchy control functions - can be used by any component with hierarchy
 */
export function createHierarchyControls(hierarchyNodesRef) {
  const expandAll = () => {
    hierarchyNodesRef.value.forEach(node => {
      if (node.expand) node.expand()
    })
  }

  const collapseAll = () => {
    hierarchyNodesRef.value.forEach(node => {
      if (node.collapse) node.collapse()
    })
  }

  const showCurrentOnly = () => {
    collapseAll()
    // Expand path to current term
    setTimeout(() => {
      hierarchyNodesRef.value.forEach(node => {
        if (node.expandToCurrentTerm) node.expandToCurrentTerm()
      })
    }, 100)
  }

  const updateHierarchy = () => {
    setTimeout(() => {
      showCurrentOnly()
    }, 100)
  }

  return {
    expandAll,
    collapseAll,
    showCurrentOnly,
    updateHierarchy
  }
}
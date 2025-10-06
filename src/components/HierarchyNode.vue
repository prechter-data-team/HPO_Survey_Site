<template>
  <li 
    class="hierarchy-item" 
    :class="[`level-${level}`, nodeClasses]" 
    :data-term="name"
  >
    <div class="item-content" @click="toggleExpand">
      <span 
        v-if="hasChildren" 
        class="expand-icon" 
        :class="{ expanded: isExpanded }" 
        @click.stop="toggleExpand"
      ></span>
      <span v-else-if="level > 2" class="bullet"></span>
      <span v-else class="no-children"></span>
      
      <span class="term-text">{{ name }}</span>
      
      <span v-if="isCurrentTerm" class="you-are-here">You are here</span>
    </div>
    
    <ul v-if="hasChildren" v-show="isExpanded" class="hierarchy-children">
      <HierarchyNode 
        v-for="(child, key) in childNodes" 
        :key="typeof child === 'string' ? child : key"
        :name="typeof child === 'string' ? child : key"
        :children="typeof child === 'string' ? null : child"
        :level="level + 1"
        :current-term="currentTerm"
        @expand="$emit('expand')"
        @collapse="$emit('collapse')"
      />
    </ul>
  </li>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  children: {
    type: [Array, Object],
    default: null
  },
  level: {
    type: Number,
    required: true
  },
  currentTerm: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['expand', 'collapse'])

const isExpanded = ref(false)

const hasChildren = computed(() => {
  return props.children && (
    Array.isArray(props.children) ? props.children.length > 0 : 
    Object.keys(props.children).length > 0
  )
})

const childNodes = computed(() => {
  if (!props.children) return []
  return Array.isArray(props.children) ? props.children : props.children
})

const isCurrentTerm = computed(() => {
  return props.name === props.currentTerm
})

const isInPath = computed(() => {
  // Check if this node is in the path to current term
  if (!props.currentTerm || !hasChildren.value) return false
  
  const checkPath = (children, target) => {
    if (Array.isArray(children)) {
      return children.includes(target)
    } else {
      for (const [key, value] of Object.entries(children)) {
        if (key === target || checkPath(value, target)) return true
      }
    }
    return false
  }
  
  return checkPath(props.children, props.currentTerm)
})

const nodeClasses = computed(() => ({
  'current-term': isCurrentTerm.value,
  'in-path': isInPath.value
}))

const toggleExpand = () => {
  if (!hasChildren.value) return
  isExpanded.value = !isExpanded.value
  emit(isExpanded.value ? 'expand' : 'collapse')
}

const expand = () => {
  if (hasChildren.value) {
    isExpanded.value = true
  }
}

const collapse = () => {
  isExpanded.value = false
}

const expandToCurrentTerm = () => {
  if (isCurrentTerm.value || isInPath.value) {
    isExpanded.value = true
  }
}

// Auto-expand if this node is in path to current term
watch(() => props.currentTerm, () => {
  if (isInPath.value || isCurrentTerm.value) {
    isExpanded.value = true
  }
}, { immediate: true })

// Expose methods for parent component
defineExpose({
  expand,
  collapse,
  expandToCurrentTerm
})
</script>

<style scoped>
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
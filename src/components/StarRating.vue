<template>
  <div class="star-rating">
    <span
      v-for="star in 5"
      :key="star"
      class="star"
      :class="{ filled: star <= rating, hovered: star <= hoveredStar }"
      @click="selectRating(star)"
      @mouseenter="hoveredStar = star"
      @mouseleave="hoveredStar = 0"
    >
      ★
    </span>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  rating: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update'])

const hoveredStar = ref(0)

const selectRating = (star) => {
  emit('update', star)
}
</script>

<style scoped>
.star-rating {
  display: flex;
  gap: 5px;
  margin: 10px 0;
}

.star {
  font-size: 24px;
  color: #ddd;
  cursor: pointer;
  transition: color 0.2s ease;
  user-select: none;
}

.star.filled,
.star.hovered {
  color: #ffd700;
}

.star:hover {
  color: #ffd700;
}
</style>
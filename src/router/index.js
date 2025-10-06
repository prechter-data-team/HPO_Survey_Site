// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Welcome from '@/components/Welcome.vue'

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: Welcome
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/components/Terms.vue')
  },
  {
    path: '/review', 
    name: 'Review',
    component: () => import('@/components/Review.vue')
  },
  {
    path: '/disagree',
    name: 'Disagree', 
    component: () => import('@/components/Disagree.vue')
  },
  {
    path: '/finish',
    name: 'Finish',
    component: () => import('@/components/Finish.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { authApi } from '@/modules/auth/api/auth.api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/modules/auth/views/SetupView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'dashboard',
      meta: { requiresAuth: true },
      component: () => import('@/core/views/DashboardView.vue'),
    },
  ],
})

let sessionRestored = false

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // On first navigation, try to restore session via httpOnly cookie
  if (!sessionRestored) {
    sessionRestored = true
    if (!auth.isAuthenticated) {
      await auth.refresh() // silently fails if no cookie
    }
  }

  // Check setup status on every navigation
  try {
    const { setupRequired } = await authApi.setupStatus()
    if (setupRequired && to.name !== 'setup') return { name: 'setup' }
    if (!setupRequired && to.name === 'setup') return { name: 'login' }
  } catch {}

  // Auth guard
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Redirect authenticated users away from login/setup
  if ((to.name === 'login' || to.name === 'setup') && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router

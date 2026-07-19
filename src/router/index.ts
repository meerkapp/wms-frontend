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
      path: '/sync',
      name: 'sync',
      meta: { requiresAuth: true },
      component: () => import('@/modules/sync/views/SyncView.vue'),
    },
    {
      path: '/workspace',
      name: 'workspace',
      meta: { requiresAuth: true },
      component: () => import('@/modules/workspace/views/WorkspaceView.vue'),
    },
  ],
})

let sessionRestored = false

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  // On first navigation, try to restore session via httpOnly cookie
  if (!sessionRestored) {
    sessionRestored = true
    if (!auth.isAuthenticated) {
      await auth.refresh()
    }
  }

  // Setup state is server-owned and cannot change while using the local read model.
  if (!auth.isOffline) {
    try {
      const { setupRequired } = await authApi.setupStatus()
      if (setupRequired && to.name !== 'setup') return { name: 'setup' }
      if (!setupRequired && to.name === 'setup') return { name: 'login' }
    } catch {}
  }

  // Auth guard
  if (to.meta.requiresAuth && !auth.canAccessWorkspace) {
    return { name: 'login' }
  }

  if (auth.isOffline && (to.name === 'login' || to.name === 'sync')) {
    return { name: 'workspace' }
  }

  // Redirect authenticated users to sync before workspace
  if (auth.isAuthenticated && to.name !== 'sync' && from.name !== 'sync') {
    return { name: 'sync' }
  }
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { authApi } from '@/modules/auth/api/auth.api'
import { connectSocket } from '@/core/api/socket'
import { usePresenceStore } from '@/modules/employee/stores/presence.store'

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
      component: () => import('@/modules/signaldb/views/SyncView.vue'),
    },
    {
      path: '/workspace',
      name: 'workspace',
      meta: { requiresAuth: true },
      component: () => import('@/core/views/WorkspaceView.vue'),
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
      const restored = await auth.refresh()
      if (restored) {
        connectSocket(auth.accessToken!)
        usePresenceStore().setup()
      }
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

  // Redirect authenticated users to sync before workspace
  if (auth.isAuthenticated && to.name !== 'sync' && from.name !== 'sync') {
    return { name: 'sync' }
  }
})

export default router

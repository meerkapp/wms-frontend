import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { authApi } from '@/modules/auth/api/auth.api'
import { decideAccountStartup } from '@/modules/auth/account-startup'

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
      path: '/accounts',
      name: 'account-selection',
      component: () => import('@/modules/auth/views/AccountSelectionView.vue'),
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

let startupResolved = false

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  if (!startupResolved) {
    const accountIds = await auth.listAvailableAccountIds()
    const decision = decideAccountStartup(accountIds)
    startupResolved = true

    if (decision.type === 'select') {
      if (to.name !== 'account-selection') return { name: 'account-selection' }
    } else if (decision.type === 'restore') {
      const restored = await auth.switchAccount(decision.accountId)
      if (restored && to.name === 'account-selection') {
        return { name: auth.isOffline ? 'workspace' : 'sync' }
      }
    } else if (to.name === 'account-selection') {
      return { name: 'login' }
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

  const isAddingAccount = to.name === 'login' && to.query.intent === 'add-account'
  if (auth.isAuthenticated && to.name === 'login' && !isAddingAccount) {
    return { name: 'sync' }
  }

  // An online account always performs a cursor-based catch-up before entering
  // the workspace. Account selection and add-account login remain reachable.
  if (auth.isAuthenticated && to.name === 'workspace' && from.name !== 'sync') {
    return { name: 'sync' }
  }
})

export default router

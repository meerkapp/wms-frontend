<script lang="ts" setup>
import { ref } from 'vue'
import { Button, Menu } from 'primevue'
import { useI18n } from 'vue-i18n'

import BaseCard from '@/core/components/BaseCard.vue'

import NavigationMenu from './NavigationMenu.vue'
import { useNavigationCreateItems } from '../composables/useNavigationCreateItems'
import { useNavigationActions } from '../composables/useNavigationActions'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const { t } = useI18n()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { openCreateFolderDialog, openCreateCollectionDialog } = useNavigationActions()

const { createMenuItems } = useNavigationCreateItems({
  onCreateFolder: () => openCreateFolderDialog(),
  onCreateCollection: () => openCreateCollectionDialog(),
})

const createMenu = ref()
</script>

<template>
  <BaseCard :title="t('navigation.manager.title')">
    <template #header>
      <Button
        v-if="checkUserPermissions('organization:create')"
        size="small"
        icon="iconify tabler--plus"
        severity="secondary"
        :label="t('common.create')"
        rounded
        @click="createMenu.toggle($event)"
      />
      <Menu ref="createMenu" :model="createMenuItems" popup />
    </template>
    <template #main>
      <NavigationMenu />
    </template>
  </BaseCard>
</template>

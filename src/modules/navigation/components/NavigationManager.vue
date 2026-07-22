<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Button, Menu } from 'primevue'
import { useI18n } from 'vue-i18n'

import AppEmptyState from '@/core/components/AppEmptyState.vue'
import BaseCard from '@/core/components/BaseCard.vue'

import NavigationMenu from './NavigationMenu.vue'
import { useNavigationCreateItems } from '../composables/useNavigationCreateItems'
import { useNavigationActions } from '../composables/useNavigationActions'
import { useNavigationStore } from '../stores/navigation.store'

const { t } = useI18n()
const { rawFolders, rawProductCollections } = storeToRefs(useNavigationStore())
const isEmpty = computed(
  () => rawFolders.value.length === 0 && rawProductCollections.value.length === 0,
)

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
        v-if="createMenuItems.length > 0"
        size="small"
        icon="iconify tabler--plus"
        severity="secondary"
        rounded
        v-tooltip.bottom="t('common.create')"
        @click="createMenu.toggle($event)"
      />
      <Menu ref="createMenu" :model="createMenuItems" popup />
    </template>
    <template #main>
      <AppEmptyState
        v-if="isEmpty"
        icon="tabler--folders-off"
        :message="t('navigation.manager.empty')"
      />
      <NavigationMenu v-else />
    </template>
  </BaseCard>
</template>

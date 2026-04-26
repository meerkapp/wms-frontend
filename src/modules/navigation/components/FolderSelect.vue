<script lang="ts" setup>
import { computed, useId } from 'vue'
import { FloatLabel, CascadeSelect, Button } from 'primevue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useNavigationStore } from '../stores/navigation.store'
import type { Folder } from '@meerkapp/wms-contracts'
import NavigationIcon from './NavigationIcon.vue'

interface FolderNode {
  id: number
  name: string
  isSelf?: boolean
  children?: FolderNode[]
}

const props = defineProps<{
  folderId: Folder['id'] | null
  label?: string
  disabled?: boolean
  invalid?: boolean
  root?: boolean
  excludeId?: number
}>()

const emit = defineEmits<{
  'update:folderId': [value: Folder['id'] | null]
}>()

const { t } = useI18n()
const id = useId()

const { rawFolders } = storeToRefs(useNavigationStore())

function getExcludedIds(folders: Folder[], rootId: number): Set<number> {
  const excluded = new Set<number>()
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.shift()!
    excluded.add(id)
    for (const f of folders) {
      if (f.parentId === id) queue.push(f.id)
    }
  }
  return excluded
}

const excludedIds = computed(() =>
  props.excludeId != null ? getExcludedIds(rawFolders.value, props.excludeId) : new Set<number>(),
)

function buildTree(folders: Folder[], parentId: number | null = null): FolderNode[] {
  return folders
    .filter((f) => f.parentId === parentId && !excludedIds.value.has(f.id))
    .map((f) => {
      const subfolders = buildTree(folders, f.id)
      if (subfolders.length === 0) return { id: f.id, name: f.name }
      // Sentinel as first child allows selecting this folder even though it has subfolders
      return {
        id: f.id,
        name: f.name,
        children: [{ id: f.id, name: f.name, isSelf: true }, ...subfolders],
      }
    })
}

function findNode(nodes: FolderNode[], id: number): FolderNode | null {
  for (const node of nodes) {
    if (node.id === id && !node.isSelf) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

const folderTree = computed(() => buildTree(rawFolders.value))

const selectedNode = computed(() =>
  props.folderId != null ? (findNode(folderTree.value, props.folderId) ?? null) : null,
)

// FloatLabel floats when the CascadeSelect root has `p-filled`.
// We inject it via passthrough when root=true and folderId=null so the label
// stays floated even though model-value is null.
const isFilled = computed(
  () => selectedNode.value !== null || (props.root && props.folderId === null),
)

const label = computed(() => props.label ?? t('navigation.folder.label'))
</script>

<template>
  <FloatLabel variant="on">
    <CascadeSelect
      :inputId="id"
      :model-value="selectedNode"
      :options="folderTree"
      option-label="name"
      option-group-label="name"
      option-group-children="children"
      :disabled="disabled"
      :invalid="invalid"
      :pt="{ root: isFilled ? 'p-inputwrapper-filled' : '' }"
      fluid
      @update:model-value="(node: FolderNode) => emit('update:folderId', node?.id ?? null)"
    >
      <template #value>
        <div v-if="selectedNode" class="flex items-center gap-2">
          <NavigationIcon type="folder" />
          <span>{{ selectedNode.name }}</span>
        </div>
        <div v-else-if="root && folderId === null" class="flex items-center gap-2">
          <NavigationIcon type="folder" />
          <span>{{ t('navigation.folder.root') }}</span>
        </div>
        <div v-else class="p-3"></div>
      </template>
      <template #option="{ option }">
        <div class="flex items-center gap-2">
          <NavigationIcon type="folder" :active="option.isSelf" />
          <span>{{ option.name }}</span>
        </div>
      </template>
      <template v-if="root" #footer>
        <div class="p-2">
          <Button
            :label="t('navigation.folder.root')"
            icon="iconify tabler--folder"
            size="small"
            rounded
            variant="outlined"
            fluid
            @click="emit('update:folderId', null)"
          />
        </div>
      </template>
    </CascadeSelect>
    <label :for="id">{{ label }}</label>
  </FloatLabel>
</template>

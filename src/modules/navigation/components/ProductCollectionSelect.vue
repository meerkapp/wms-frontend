<script lang="ts" setup>
import { computed, useId } from 'vue'
import { FloatLabel, CascadeSelect } from 'primevue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useNavigationStore } from '../stores/navigation.store'
import type { ProductCollection } from '@meerkapp/wms-contracts'
import NavigationIcon from './NavigationIcon.vue'

interface TreeNode {
  id: number
  name: string
  nodeType: 'folder' | 'collection'
  items?: TreeNode[]
}

const props = defineProps<{
  collectionId: ProductCollection['id'] | null
  label?: string
  disabled?: boolean
  invalid?: boolean
}>()

const emit = defineEmits<{
  'update:collectionId': [value: ProductCollection['id']]
}>()

const { t } = useI18n()
const id = useId()

const { rawFolders, rawProductCollections } = storeToRefs(useNavigationStore())

function buildTree(folderId: number | null = null): TreeNode[] {
  const nodes: TreeNode[] = []

  for (const folder of rawFolders.value.filter((f) => f.parentId === folderId)) {
    const children = buildTree(folder.id)
    if (children.length > 0) {
      nodes.push({
        id: folder.id,
        name: folder.name,
        nodeType: 'folder',
        items: children,
      })
    }
  }

  for (const collection of rawProductCollections.value.filter((c) => c.folderId === folderId)) {
    nodes.push({
      id: collection.id,
      name: collection.name,
      nodeType: 'collection',
    })
  }

  return nodes.sort((a, b) => a.name.localeCompare(b.name))
}

function findNode(nodes: TreeNode[], id: number): TreeNode | null {
  for (const node of nodes) {
    if (node.nodeType === 'collection' && node.id === id) return node
    if (node.items) {
      const found = findNode(node.items, id)
      if (found) return found
    }
  }
  return null
}

const tree = computed(() => buildTree())

const selectedNode = computed(() =>
  props.collectionId != null ? (findNode(tree.value, props.collectionId) ?? null) : null,
)

const label = computed(() => props.label ?? t('navigation.collection.label'))
</script>

<template>
  <FloatLabel variant="on">
    <CascadeSelect
      :inputId="id"
      :model-value="selectedNode"
      :options="tree"
      option-label="name"
      option-group-label="name"
      option-group-children="items"
      :disabled="disabled"
      :invalid="invalid"
      fluid
      @update:model-value="(node: TreeNode) => emit('update:collectionId', node.id)"
    >
      <template #value>
        <div v-if="selectedNode" class="flex items-center gap-2">
          <NavigationIcon type="product_collection" />
          <span>{{ selectedNode.name }}</span>
        </div>
        <div v-else class="p-3"></div>
      </template>
      <template #option="{ option }">
        <div class="flex items-center gap-2">
          <NavigationIcon :type="option.nodeType === 'folder' ? 'folder' : 'product_collection'" />
          <span>{{ option.name }}</span>
        </div>
      </template>
    </CascadeSelect>
    <label :for="id">{{ label }}</label>
  </FloatLabel>
</template>

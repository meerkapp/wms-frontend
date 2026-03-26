<script lang="ts" setup>
import { useTemplateRef } from 'vue'
import { Badge, Menu } from 'primevue'
import type { SidebarItem } from '@/modules/sidebar/types/sidebar.types'

const props = defineProps<{
  panel: SidebarItem
  selectedKey: SidebarItem['key'] | null
  size?: 'large' | null
}>()

const emit = defineEmits(['update:selectedKey'])

const buttonMenu = useTemplateRef('buttonMenu')

function setPanel(key: SidebarItem['key'] | null) {
  if (props.selectedKey !== key) {
    emit('update:selectedKey', key)
  } else {
    emit('update:selectedKey', null)
  }
}

function onClick() {
  setPanel(props.panel.key)
}
</script>

<template>
  <div>
    <div
      v-if="props.panel.disabled !== true"
      class="group flex cursor-pointer items-center justify-center"
      :class="props.size === 'large' ? 'w-16 h-16' : 'w-14 h-14'"
      v-tooltip="{
        value: props.panel.title,
        pt: { text: '!text-nowrap' },
        disabled: selectedKey === props.panel.key,
      }"
      @click="onClick"
    >
      <div
        class="flex rounded-xl transition-colors"
        :class="[
          props.size === 'large' ? 'w-12 h-12' : 'w-10 h-10',
          {
            'bg-primary/10 text-primary': selectedKey === props.panel.key,
            'text-surface-500 group-hover:text-surface-900 dark:text-muted-color dark:group-hover:text-color':
              selectedKey !== props.panel.key,
          },
        ]"
      >
        <i
          class="m-auto"
          :class="[props.size === 'large' ? 'text-3xl!' : 'text-2xl!', props.panel.iconClass]"
        />
        <Badge
          v-if="props.panel.badge"
          :value="props.panel.badge.value"
          size="small"
          severity="success"
          class="absolute"
          style="transform: translate(160%, -20%)"
        />
      </div>
    </div>
  </div>
</template>

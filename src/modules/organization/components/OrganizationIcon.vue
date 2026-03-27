<script setup lang="ts">
import { ref } from 'vue'
import type { Organization } from '@meerkapp/wms-contracts'

const props = defineProps<{ website: Organization['website'] }>()

const faviconError = ref(false)
</script>

<template>
  <img
    v-if="props.website && !faviconError"
    :src="props.website + '/favicon.ico'"
    class="w-5 h-5"
    @error="faviconError = true"
  />
  <i v-else class="iconify tabler--building-store"></i>
</template>

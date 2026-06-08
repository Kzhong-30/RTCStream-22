<template>
  <div class="network-selector">
    <select :value="selectedId" @change="onChange">
      <option v-for="net in networks" :key="net.id" :value="net.id">
        {{ net.icon }} {{ net.name }} ({{ net.description }})
      </option>
    </select>
    <div v-if="selected" class="network-info">
      <div class="info-item">
        <span class="info-label">⬇ 下载</span>
        <span class="info-value">{{ formatSpeed(selected.download) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">⬆ 上传</span>
        <span class="info-value">{{ formatSpeed(selected.upload) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">⏱ 延迟</span>
        <span class="info-value">{{ selected.latency }}ms</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NETWORK_CONDITIONS, type NetworkCondition } from '../types'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const networksWithIcons = computed(() => {
  const icons: Record<string, string> = {
    'online': '⚡',
    'wifi': '📶',
    '4g': '📡',
    '3g': '📶',
    'slow-3g': '🐢',
    '2g': '📻',
    'offline': '🚫'
  }
  return NETWORK_CONDITIONS.map(n => ({ ...n, icon: icons[n.id] || '🌐' }))
})

const networks = networksWithIcons

const selectedId = computed(() => props.modelValue)
const selected = computed(
  () => networks.value.find(n => n.id === props.modelValue) || null
)

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

function formatSpeed(kbps: number): string {
  if (kbps === 0) return '0 Kbps'
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`
  return `${kbps} Kbps`
}
</script>

<style scoped>
.network-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.network-selector select {
  min-width: 220px;
}

.network-info {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  background: #16213e;
  border-radius: 6px;
  border: 1px solid #2d3748;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 10px;
  color: #718096;
}

.info-value {
  font-size: 12px;
  font-weight: 600;
  color: #4dabf7;
}
</style>

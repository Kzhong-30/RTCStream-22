<template>
  <div class="device-selector">
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        :class="['tab-btn', { active: activeCategory === cat.id }]"
        @click="activeCategory = cat.id"
      >
        <span class="tab-icon">{{ cat.icon }}</span>
        <span>{{ cat.label }}</span>
      </button>
    </div>
    <div class="device-grid">
      <button
        v-for="device in filteredDevices"
        :key="device.id"
        :class="['device-btn', { active: selectedId === device.id }]"
        @click="$emit('select', device)"
      >
        <span class="device-icon">{{ device.icon }}</span>
        <span class="device-name">{{ device.name }}</span>
        <span class="device-size">{{ device.width }} × {{ device.height }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DEVICES, type Device } from '../types'

defineProps<{
  selectedId?: string
}>()

defineEmits<{
  select: [device: Device]
}>()

const activeCategory = ref<string>('all')

const categories = [
  { id: 'all', label: '全部', icon: '📱' },
  { id: 'mobile', label: '手机', icon: '📱' },
  { id: 'tablet', label: '平板', icon: '📲' },
  { id: 'laptop', label: '笔记本', icon: '💻' },
  { id: 'desktop', label: '桌面', icon: '🖥️' }
]

const filteredDevices = computed(() => {
  if (activeCategory.value === 'all') return DEVICES
  return DEVICES.filter(d => d.category === activeCategory.value)
})
</script>

<style scoped>
.device-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #2d3748;
  color: #a0aec0;
  border-radius: 6px;
}

.tab-btn:hover {
  background: #4a5568;
  color: #eaeaea;
}

.tab-btn.active {
  background: linear-gradient(135deg, #4dabf7, #3b82f6);
  color: white;
}

.tab-icon {
  font-size: 14px;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.device-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: #16213e;
  border: 1px solid #2d3748;
  border-radius: 8px;
  color: #eaeaea;
}

.device-btn:hover {
  background: #1e2a47;
  border-color: #4a5568;
  transform: translateY(-1px);
}

.device-btn.active {
  background: linear-gradient(135deg, rgba(77, 171, 247, 0.15), rgba(59, 130, 246, 0.15));
  border-color: #4dabf7;
  box-shadow: 0 0 0 2px rgba(77, 171, 247, 0.2);
}

.device-icon {
  font-size: 20px;
}

.device-name {
  font-size: 12px;
  font-weight: 600;
}

.device-size {
  font-size: 11px;
  color: #718096;
}
</style>

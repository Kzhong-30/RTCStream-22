<template>
  <div class="custom-size">
    <div class="size-inputs">
      <div class="input-group">
        <label>宽度 (px)</label>
        <input
          type="number"
          v-model.number="width"
          :min="100"
          :max="4000"
          @change="emitSize"
        />
      </div>
      <button class="swap-btn" @click="swapSizes" title="交换宽高">
        ⇄
      </button>
      <div class="input-group">
        <label>高度 (px)</label>
        <input
          type="number"
          v-model.number="height"
          :min="100"
          :max="4000"
          @change="emitSize"
        />
      </div>
    </div>
    <div class="preset-sizes">
      <span class="preset-label">快速尺寸：</span>
      <button
        v-for="preset in presets"
        :key="preset.label"
        class="preset-btn"
        @click="applyPreset(preset)"
      >
        {{ preset.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelWidth: number
  modelHeight: number
}>()

const emit = defineEmits<{
  'update:size': [width: number, height: number]
}>()

const width = ref(props.modelWidth)
const height = ref(props.modelHeight)

watch(() => props.modelWidth, (v) => { width.value = v })
watch(() => props.modelHeight, (v) => { height.value = v })

const presets = [
  { label: '1:1', w: 800, h: 800 },
  { label: '4:3', w: 1024, h: 768 },
  { label: '16:9', w: 1920, h: 1080 },
  { label: '21:9', w: 2560, h: 1080 }
]

function emitSize() {
  width.value = Math.max(100, Math.min(4000, width.value || 100))
  height.value = Math.max(100, Math.min(4000, height.value || 100))
  emit('update:size', width.value, height.value)
}

function swapSizes() {
  const tmp = width.value
  width.value = height.value
  height.value = tmp
  emitSize()
}

function applyPreset(preset: { w: number; h: number }) {
  width.value = preset.w
  height.value = preset.h
  emitSize()
}
</script>

<style scoped>
.custom-size {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.size-inputs {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 11px;
  color: #718096;
}

.input-group input {
  width: 110px;
}

.swap-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #2d3748;
  color: #a0aec0;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swap-btn:hover {
  background: #4a5568;
  color: #eaeaea;
}

.preset-sizes {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 12px;
  color: #718096;
}

.preset-btn {
  padding: 4px 10px;
  background: #16213e;
  border: 1px solid #2d3748;
  color: #a0aec0;
  border-radius: 6px;
  font-size: 11px;
}

.preset-btn:hover {
  background: #2d3748;
  color: #eaeaea;
  border-color: #4a5568;
}
</style>

<template>
  <div class="viewport-wrapper" :style="wrapperStyle">
    <div class="viewport-header">
      <div class="vp-info">
        <span class="vp-device-icon">{{ deviceIcon }}</span>
        <span class="vp-device-name">{{ deviceName }}</span>
        <span class="vp-size">{{ effectiveWidth }} × {{ effectiveHeight }}</span>
        <span v-if="isLandscape" class="vp-orientation">横屏</span>
      </div>
      <div class="vp-actions">
        <button
          class="vp-btn"
          :class="{ active: isLandscape }"
          @click="toggleOrientation"
          title="旋转设备方向"
        >
          🔄 旋转
        </button>
        <button
          v-if="canRemove"
          class="vp-btn danger"
          @click="$emit('remove')"
          title="移除视口"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="vp-controls">
      <div class="control-group">
        <label class="control-label">缩放</label>
        <input
          type="range"
          v-model.number="scale"
          min="50"
          max="150"
          step="10"
          class="scale-slider"
        />
        <span class="scale-value">{{ scale }}%</span>
      </div>

      <div class="control-group">
        <label class="control-label">网络</label>
        <select
          :value="networkId"
          @change="onNetworkChange"
          class="network-select"
        >
          <option v-for="net in NETWORK_CONDITIONS" :key="net.id" :value="net.id">
            {{ net.name }}
          </option>
        </select>
      </div>

      <div class="control-group flex-1">
        <div class="url-bar">
          <button
            class="vp-btn icon-btn"
            @click="reload"
            title="刷新"
            :disabled="!url"
          >
            ↻
          </button>
          <input
            type="text"
            class="url-input"
            v-model="localUrl"
            @keyup.enter="applyUrl"
            placeholder="输入网址，如 https://example.com"
          />
          <button
            class="vp-btn go-btn"
            @click="applyUrl"
            :disabled="!localUrl"
          >
            前往
          </button>
        </div>
      </div>

      <button class="vp-btn screenshot-btn" @click="takeScreenshot" title="截图">
        📷 截图
      </button>
    </div>

    <div class="viewport-container" ref="containerRef">
      <div class="iframe-wrapper" :style="iframeWrapperStyle">
        <div v-if="isLoading" class="loading-overlay">
          <div class="loader"></div>
          <span>加载中{{ networkDelayText }}...</span>
        </div>
        <div v-if="error" class="error-overlay">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ error }}</span>
          <button class="vp-btn" @click="reload">重试</button>
        </div>
        <div v-if="!url" class="empty-state">
          <div class="empty-icon">🌐</div>
          <div class="empty-title">请输入网址开始测试</div>
          <div class="empty-hint">支持 http:// 或 https:// 开头的 URL</div>
          <div class="quick-urls">
            <button
              v-for="quick in quickUrls"
              :key="quick"
              class="quick-url-btn"
              @click="loadQuickUrl(quick)"
            >
              {{ quick }}
            </button>
          </div>
        </div>
        <iframe
          v-if="url"
          ref="iframeRef"
          :src="finalUrl"
          :style="iframeStyle"
          :sandbox="sandboxAttrs"
          @load="onIframeLoad"
          @error="onIframeError"
          referrerpolicy="no-referrer"
        ></iframe>
      </div>
    </div>

    <div class="viewport-footer">
      <MediaQueryStatus :width="effectiveWidth" :height="effectiveHeight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import html2canvas from 'html2canvas'
import { NETWORK_CONDITIONS, type NetworkCondition } from '../types'
import MediaQueryStatus from './MediaQueryStatus.vue'

const props = defineProps<{
  viewportId: string
  url: string
  width: number
  height: number
  scale: number
  isLandscape: boolean
  networkId: string
  deviceName: string
  deviceIcon: string
  canRemove: boolean
}>()

const emit = defineEmits<{
  'update:scale': [value: number]
  'update:isLandscape': [value: boolean]
  'update:networkId': [value: string]
  'update:url': [value: string]
  remove: []
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const localUrl = ref(props.url)
const isLoading = ref(false)
const error = ref<string | null>(null)
let loadTimer: number | null = null

const quickUrls = [
  'https://www.baidu.com',
  'https://www.bing.com',
  'https://github.com',
  'https://vuejs.org',
  'https://www.apple.com.cn'
]

const sandboxAttrs = 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-downloads'

const effectiveWidth = computed(() => props.isLandscape ? props.height : props.width)
const effectiveHeight = computed(() => props.isLandscape ? props.width : props.height)

const scale = computed({
  get: () => props.scale,
  set: (v) => emit('update:scale', v)
})

const networkDelayText = computed(() => {
  const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId)
  if (!net || net.id === 'online') return ''
  if (net.id === 'offline') return '（离线模式）'
  return `（模拟${net.name}）`
})

const finalUrl = computed(() => {
  if (!props.url) return ''
  let u = props.url.trim()
  if (!/^https?:\/\//i.test(u)) {
    u = 'https://' + u
  }
  return u
})

const wrapperStyle = computed(() => ({
  '--viewport-width': `${effectiveWidth.value}px`,
  '--viewport-height': `${effectiveHeight.value}px`
}))

const iframeWrapperStyle = computed(() => {
  const s = props.scale / 100
  const w = effectiveWidth.value
  const h = effectiveHeight.value
  return {
    width: `${w * s}px`,
    height: `${h * s}px`,
    maxWidth: '100%',
    maxHeight: '100%'
  }
})

const iframeStyle = computed(() => {
  const s = props.scale / 100
  return {
    width: `${effectiveWidth.value}px`,
    height: `${effectiveHeight.value}px`,
    transform: `scale(${s})`,
    transformOrigin: 'top left',
    border: 'none'
  }
})

function toggleOrientation() {
  emit('update:isLandscape', !props.isLandscape)
}

function onNetworkChange(e: Event) {
  const target = e.target as HTMLSelectElement
  emit('update:networkId', target.value)
}

function applyUrl() {
  let u = localUrl.value.trim()
  if (!u) return
  if (!/^https?:\/\//i.test(u)) {
    u = 'https://' + u
  }
  emit('update:url', u)
}

function loadQuickUrl(url: string) {
  localUrl.value = url
  applyUrl()
}

function simulateNetworkDelay(net: NetworkCondition) {
  if (net.id === 'online' || net.id === 'wifi') return 0
  if (net.latency > 0) return net.latency + Math.random() * 200
  return 300
}

watch(() => props.url, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    localUrl.value = newUrl
    isLoading.value = true
    error.value = null
    const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId) || NETWORK_CONDITIONS[0]
    if (net.id === 'offline') {
      if (loadTimer) clearTimeout(loadTimer)
      loadTimer = window.setTimeout(() => {
        isLoading.value = false
        error.value = '模拟离线模式：无法访问网络'
      }, 800)
      return
    }
    const delay = simulateNetworkDelay(net)
    if (delay > 0) {
      if (loadTimer) clearTimeout(loadTimer)
      loadTimer = window.setTimeout(() => {}, delay)
    }
  }
}, { immediate: true })

watch(() => props.networkId, () => {
  if (props.url) {
    reload()
  }
})

function onIframeLoad() {
  if (loadTimer) clearTimeout(loadTimer)
  isLoading.value = false
  error.value = null
}

function onIframeError() {
  if (loadTimer) clearTimeout(loadTimer)
  isLoading.value = false
  error.value = '页面加载失败，可能是跨域限制或网址无效'
}

function reload() {
  if (!props.url || !iframeRef.value) return
  isLoading.value = true
  error.value = null
  const currentUrl = finalUrl.value
  const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId) || NETWORK_CONDITIONS[0]
  if (net.id === 'offline') {
    if (loadTimer) clearTimeout(loadTimer)
    loadTimer = window.setTimeout(() => {
      isLoading.value = false
      error.value = '模拟离线模式：无法访问网络'
    }, 800)
    return
  }
  iframeRef.value.src = 'about:blank'
  nextTick(() => {
    if (iframeRef.value) {
      iframeRef.value.src = currentUrl
    }
  })
}

async function takeScreenshot() {
  if (!containerRef.value || !iframeRef.value) {
    alert('请先加载网页后再截图')
    return
  }
  try {
    const scaleRatio = props.scale / 100
    const canvas = await html2canvas(containerRef.value, {
      backgroundColor: '#ffffff',
      scale: Math.max(1, 2 / scaleRatio),
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: effectiveWidth.value,
      windowHeight: effectiveHeight.value
    })
    const link = document.createElement('a')
    link.download = `screenshot-${deviceFilenameSafe()}-${effectiveWidth.value}x${effectiveHeight.value}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (err) {
    console.error('截图失败:', err)
    alert('截图失败：由于浏览器同源策略，iframe 中的内容可能无法被直接截图。请确保目标网站允许跨域访问。')
  }
}

function deviceFilenameSafe() {
  return props.deviceName.replace(/[^\w\u4e00-\u9fa5-]/g, '_')
}

onMounted(() => {
  localUrl.value = props.url
})
</script>

<style scoped>
.viewport-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #0f172a;
  border: 1px solid #2d3748;
  border-radius: 10px;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
}

.viewport-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border-bottom: 1px solid #2d3748;
  flex-shrink: 0;
}

.vp-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.vp-device-icon {
  font-size: 16px;
}

.vp-device-name {
  font-weight: 600;
  color: #eaeaea;
}

.vp-size {
  color: #4dabf7;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  padding: 2px 8px;
  background: rgba(77, 171, 247, 0.15);
  border-radius: 4px;
  font-size: 11px;
}

.vp-orientation {
  padding: 2px 6px;
  background: #48bb78;
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.vp-actions {
  display: flex;
  gap: 6px;
}

.vp-btn {
  padding: 5px 10px;
  background: #2d3748;
  color: #cbd5e0;
  border-radius: 6px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.vp-btn:hover:not(:disabled) {
  background: #4a5568;
  color: white;
}

.vp-btn.active {
  background: #48bb78;
  color: white;
}

.vp-btn.danger:hover {
  background: #e53e3e;
  color: white;
}

.vp-btn.icon-btn {
  padding: 5px 8px;
  width: 32px;
  height: 32px;
  justify-content: center;
}

.vp-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid #2d3748;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group.flex-1 {
  flex: 1;
  min-width: 200px;
}

.control-label {
  font-size: 11px;
  color: #718096;
  white-space: nowrap;
}

.scale-slider {
  width: 90px;
}

.scale-value {
  font-size: 11px;
  color: #4dabf7;
  font-weight: 600;
  min-width: 42px;
  text-align: right;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
}

.network-select {
  min-width: 100px;
  padding: 4px 8px;
}

.url-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.url-input {
  flex: 1;
  min-width: 0;
}

.go-btn {
  background: linear-gradient(135deg, #4dabf7, #3b82f6);
  color: white;
  font-weight: 600;
}

.go-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.screenshot-btn {
  background: linear-gradient(135deg, #805ad5, #6b46c1);
  color: white;
  font-weight: 600;
}

.screenshot-btn:hover {
  background: linear-gradient(135deg, #6b46c1, #553c9a);
}

.viewport-container {
  flex: 1;
  overflow: auto;
  background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 0;
}

.iframe-wrapper {
  position: relative;
  background: white;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.loading-overlay,
.error-overlay,
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  z-index: 10;
}

.loading-overlay {
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(4px);
  color: #cbd5e0;
  font-size: 14px;
}

.loader {
  width: 40px;
  height: 40px;
  border: 3px solid #2d3748;
  border-top-color: #4dabf7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-overlay {
  background: rgba(90, 20, 20, 0.95);
  color: #fed7d7;
}

.error-icon {
  font-size: 48px;
}

.error-text {
  font-size: 13px;
  line-height: 1.5;
}

.empty-state {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: #a0aec0;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.5;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #eaeaea;
}

.empty-hint {
  font-size: 12px;
  color: #718096;
}

.quick-urls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  justify-content: center;
}

.quick-url-btn {
  padding: 6px 12px;
  background: #2d3748;
  border: 1px solid #4a5568;
  color: #a0aec0;
  border-radius: 20px;
  font-size: 12px;
}

.quick-url-btn:hover {
  background: #4a5568;
  color: white;
  border-color: #4dabf7;
}

iframe {
  display: block;
  background: white;
}

.viewport-footer {
  padding: 10px 12px;
  background: #0f172a;
  border-top: 1px solid #2d3748;
  flex-shrink: 0;
}
</style>

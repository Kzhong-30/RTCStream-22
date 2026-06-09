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
            placeholder="输入网址 或 使用内置 /demo.html"
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

      <button class="vp-btn screenshot-btn" @click="openScreenshotHelp" title="截图">
        📷 截图
      </button>
    </div>

    <div v-if="networkWarning" class="network-warning">
      <span class="warn-icon">⚠️</span>
      <span class="warn-text">{{ networkWarning }}</span>
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
          <button class="vp-btn" @click="fallbackToDemo">加载内置 Demo</button>
        </div>
        <div v-if="!url" class="empty-state">
          <div class="empty-icon">🌐</div>
          <div class="empty-title">请输入网址开始测试</div>
          <div class="empty-hint">推荐先使用内置 <code>/demo.html</code>，支持 Service Worker 网络模拟</div>
          <div class="quick-urls">
            <button
              v-for="quick in quickUrls"
              :key="quick.url"
              class="quick-url-btn"
              :class="{ highlight: quick.recommend }"
              @click="loadQuickUrl(quick.url)"
            >
              <span v-if="quick.recommend" style="color:#fbbf24">⭐ </span>
              {{ quick.label }}
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

    <transition name="modal">
      <div v-if="showHelpModal" class="help-modal" @click.self="showHelpModal = false">
        <div class="help-modal-content">
          <div class="help-header">
            <h3>📸 如何截取视口</h3>
            <button class="close-btn" @click="showHelpModal = false">✕</button>
          </div>
          <div class="help-body">
            <p class="help-note">
              <strong>⚠️ 重要限制：</strong>由于浏览器同源策略保护，
              JavaScript 无法直接读取跨域 iframe 内部的 DOM 内容，
              因此无法通过 <code>html2canvas</code> 等前端库直接截图。
            </p>
            <h4>✅ 推荐方案（Chrome / Edge）</h4>
            <ol>
              <li>按 <kbd>F12</kbd> 打开 DevTools</li>
              <li>按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>（Mac：<kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>P</kbd>）</li>
              <li>输入 <code>screenshot</code>，选择以下之一：
                <ul>
                  <li><strong>Capture area screenshot</strong> — 拖拽框选区域截图</li>
                  <li><strong>Capture node screenshot</strong> — 选中 iframe 节点后可精确截取</li>
                  <li><strong>Capture full size screenshot</strong> — 整页长截图</li>
                </ul>
              </li>
            </ol>
            <h4>⌨️ 系统快捷键</h4>
            <ul>
              <li><strong>macOS：</strong><kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>4</kbd> 区域截图 / <kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>5</kbd> 录屏</li>
              <li><strong>Windows：</strong><kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> 区域截图</li>
            </ul>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { NETWORK_CONDITIONS } from '../types'
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
const showHelpModal = ref(false)
let loadTimer: number | null = null
let swReady = false
let swRegistration: ServiceWorkerRegistration | null = null

const quickUrls = [
  { label: '内置 Demo（支持网络模拟）', url: '/demo.html', recommend: true },
  { label: 'Example.com', url: 'https://example.com' },
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' }
]

const sandboxAttrs = 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-downloads'

const effectiveWidth = computed(() => props.isLandscape ? props.height : props.width)
const effectiveHeight = computed(() => props.isLandscape ? props.width : props.height)

const scale = computed({
  get: () => props.scale,
  set: (v) => emit('update:scale', v)
})

const isLocalDemo = computed(() => {
  const u = finalUrl.value
  return u.startsWith('/') || u.includes('/demo.html') || u.startsWith(window.location.origin)
})

const networkWarning = computed(() => {
  const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId)
  if (!net || net.id === 'online') return ''
  if (!props.url) return ''
  if (isLocalDemo.value) {
    return swReady
      ? `✅ Service Worker 已激活，网络模拟真实生效中（${net.name}：${net.description}）`
      : `⏳ Service Worker 注册中，刷新一次后网络模拟将生效（${net.name}）`
  }
  return `ℹ️ 外部站点受浏览器沙箱保护，仅模拟加载延迟。切换到内置 /demo.html 可启用真实 SW 网络限速。`
})

const networkDelayText = computed(() => {
  const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId)
  if (!net || net.id === 'online') return ''
  if (net.id === 'offline') return '（离线模式）'
  return `（模拟${net.name}${isLocalDemo.value ? '·真实限速' : '·延迟'}）`
})

const finalUrl = computed(() => {
  if (!props.url) return ''
  const u = props.url.trim()
  if (u.startsWith('/')) return u
  if (!/^https?:\/\//i.test(u)) return 'https://' + u
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
  const u = localUrl.value.trim()
  if (!u) return
  emit('update:url', u)
}

function loadQuickUrl(url: string) {
  localUrl.value = url
  applyUrl()
}

function fallbackToDemo() {
  loadQuickUrl('/demo.html')
}

function openScreenshotHelp() {
  showHelpModal.value = true
}

async function applyNetworkToSW() {
  if (!swReady || !swRegistration?.active) return
  const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId) || NETWORK_CONDITIONS[0]
  swRegistration.active.postMessage({
    type: 'SET_CONDITION',
    scope: isLocalDemo.value ? 'demo.html' : 'global',
    condition: net.id === 'online' ? null : net
  })
}

watch(() => props.url, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    localUrl.value = newUrl
    isLoading.value = true
    error.value = null
    const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId) || NETWORK_CONDITIONS[0]
    if (net.id === 'offline' && !isLocalDemo.value) {
      if (loadTimer) clearTimeout(loadTimer)
      loadTimer = window.setTimeout(() => {
        isLoading.value = false
        error.value = '模拟离线模式：外部站点无法真正断网，建议切换到 /demo.html 体验完整效果'
      }, 800)
      return
    }
    if (!isLocalDemo.value && net.id !== 'online') {
      const delay = Math.max(0, (net.latency || 0) + (net.id === 'slow-3g' ? 400 : net.id === '2g' ? 800 : 150))
      if (delay > 0) {
        if (loadTimer) clearTimeout(loadTimer)
        loadTimer = window.setTimeout(() => {}, delay)
      }
    }
  }
  if (newUrl) {
    nextTick(() => applyNetworkToSW())
  }
}, { immediate: true })

watch(() => props.networkId, () => {
  applyNetworkToSW()
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
  error.value = '页面加载失败，可能是目标站点设置了 X-Frame-Options 禁止被 iframe 嵌入，建议切换到内置 /demo.html'
}

function reload() {
  if (!props.url || !iframeRef.value) return
  isLoading.value = true
  error.value = null
  const currentUrl = finalUrl.value
  const net = NETWORK_CONDITIONS.find(n => n.id === props.networkId) || NETWORK_CONDITIONS[0]
  if (net.id === 'offline' && !isLocalDemo.value) {
    if (loadTimer) clearTimeout(loadTimer)
    loadTimer = window.setTimeout(() => {
      isLoading.value = false
      error.value = '模拟离线模式：外部站点无法真正断网，建议切换到 /demo.html 体验完整效果'
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

async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    swReady = false
    return
  }
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    if (navigator.serviceWorker.controller) {
      swReady = true
    } else {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        swReady = true
      })
    }
  } catch (err) {
    console.warn('Service Worker 注册失败（HTTP 环境不支持，本地预览不影响其他功能）：', err)
    swReady = false
  }
}

onMounted(() => {
  localUrl.value = props.url
  initServiceWorker()
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
  position: relative;
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
  background: linear-gradient(135deg, #ed8936, #dd6b20);
  color: white;
  font-weight: 600;
}

.screenshot-btn:hover {
  background: linear-gradient(135deg, #dd6b20, #c05621);
}

.network-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(237, 137, 54, 0.1);
  border-bottom: 1px solid rgba(237, 137, 54, 0.25);
  font-size: 11px;
  line-height: 1.5;
  color: #f6ad55;
  flex-shrink: 0;
}

.warn-icon {
  flex-shrink: 0;
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

.empty-hint code {
  background: #2d3748;
  padding: 2px 6px;
  border-radius: 4px;
  color: #4dabf7;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
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

.quick-url-btn.highlight {
  background: rgba(251, 191, 36, 0.1);
  border-color: #f6ad55;
  color: #fbd38d;
}

.quick-url-btn:hover {
  background: #4a5568;
  color: white;
  border-color: #4dabf7;
}

.quick-url-btn.highlight:hover {
  background: rgba(251, 191, 36, 0.2);
  border-color: #f6ad55;
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

.help-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.help-modal-content {
  background: #1a202c;
  border-radius: 12px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
  border: 1px solid #4a5568;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #2d3748;
  position: sticky;
  top: 0;
  background: #1a202c;
}

.help-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: #eaeaea;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: #2d3748;
  color: #a0aec0;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e53e3e;
  color: white;
}

.help-body {
  padding: 20px;
  font-size: 13px;
  line-height: 1.7;
  color: #cbd5e0;
}

.help-body h4 {
  color: #4dabf7;
  font-size: 14px;
  margin: 16px 0 10px;
}

.help-body h4:first-of-type {
  margin-top: 0;
}

.help-note {
  padding: 12px 14px;
  background: rgba(237, 137, 54, 0.1);
  border: 1px solid rgba(237, 137, 54, 0.3);
  border-radius: 8px;
  color: #fbd38d;
  margin-bottom: 12px;
}

.help-body code {
  background: #2d3748;
  padding: 2px 6px;
  border-radius: 4px;
  color: #4dabf7;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}

.help-body ol,
.help-body ul {
  padding-left: 20px;
  margin: 8px 0;
}

.help-body li {
  margin: 6px 0;
}

.help-body ul ul {
  margin-top: 6px;
}

kbd {
  display: inline-block;
  padding: 2px 8px;
  background: linear-gradient(180deg, #4a5568, #2d3748);
  color: #eaeaea;
  border-radius: 4px;
  border: 1px solid #718096;
  box-shadow: 0 1px 0 #1a202c;
  font-size: 11px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

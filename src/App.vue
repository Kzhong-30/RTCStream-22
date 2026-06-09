<template>
  <div class="app">
    <header class="app-header">
      <div class="app-brand">
        <span class="brand-icon">📐</span>
        <h1 class="brand-title">响应式布局测试工具</h1>
      </div>
      <div class="app-toolbar">
        <div class="global-url">
          <span class="url-prefix">🔗</span>
          <input
            type="text"
            v-model="globalUrl"
            @keyup.enter="applyGlobalUrl"
            placeholder="输入全局 URL，所有视口同步加载..."
            class="global-url-input"
          />
          <button class="primary-btn" @click="applyGlobalUrl" :disabled="!globalUrl">
            全部加载
          </button>
        </div>
        <div class="toolbar-divider"></div>
        <div class="quick-devices">
          <button
            v-for="dev in quickDevices"
            :key="dev.id"
            :class="['device-chip', { active: isQuickDeviceActive(dev.id) }]"
            @click="applyQuickDevice(dev)"
            :title="`${dev.name} ${dev.width}×${dev.height}`"
          >
            <span>{{ dev.icon }}</span>
            <span class="chip-name">{{ dev.name }}</span>
          </button>
        </div>
        <div class="toolbar-divider"></div>
        <div class="viewport-count">
          <span class="count-label">视口：</span>
          <span class="count-num">{{ viewports.length }}</span>
          <span class="count-max">/ 4</span>
        </div>
        <button
          class="primary-btn add-btn"
          @click="addViewport"
          :disabled="viewports.length >= 4"
        >
          ➕ 添加视口
        </button>
        <button
          class="ghost-btn"
          @click="togglePanel"
          :class="{ active: showPanel }"
        >
          ⚙ 设置
        </button>
      </div>
    </header>

    <transition name="slide">
      <aside v-if="showPanel" class="control-panel">
        <div class="panel-section">
          <h3 class="section-title">📱 设备预设</h3>
          <DeviceSelector
            :selected-id="viewports.length === 1 ? currentDeviceId : undefined"
            @select="applyDeviceToAll"
          />
        </div>

        <div class="panel-section">
          <h3 class="section-title">📏 自定义尺寸</h3>
          <CustomSizeInput
            :model-width="viewports.length === 1 ? viewports[0].width : 1920"
            :model-height="viewports.length === 1 ? viewports[0].height : 1080"
            @update:size="applyCustomSizeToAll"
          />
        </div>

        <div class="panel-section">
          <h3 class="section-title">🌐 全局网络条件</h3>
          <NetworkCondition
            v-model="globalNetworkId"
          />
          <button
            class="ghost-btn full-width mt-8"
            @click="applyNetworkToAll"
          >
            应用到所有视口
          </button>
        </div>

        <div class="panel-section">
          <h3 class="section-title">⚡ 批量操作</h3>
          <div class="batch-actions">
            <button class="ghost-btn" @click="rotateAll">
              🔄 全部旋转
            </button>
            <button class="ghost-btn" @click="resetAllScales">
              🔍 重置缩放
            </button>
            <button class="ghost-btn danger" @click="removeAllViewports">
              🗑 清空视口
            </button>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">📊 快速布局组合</h3>
          <div class="layout-presets">
            <button
              v-for="layout in layoutPresets"
              :key="layout.name"
              class="layout-btn"
              @click="applyLayoutPreset(layout)"
            >
              <div class="layout-preview">
                <div
                  v-for="(v, i) in layout.viewports"
                  :key="i"
                  class="layout-box"
                  :style="{
                    width: `${v.w}%`,
                    height: `${v.h}%`,
                    top: `${v.t}%`,
                    left: `${v.l}%`
                  }"
                ></div>
              </div>
              <span class="layout-name">{{ layout.name }}</span>
            </button>
          </div>
        </div>
      </aside>
    </transition>

    <main class="app-main" :class="{ 'panel-open': showPanel }">
      <div
        class="viewport-grid"
        :style="gridStyle"
      >
        <!-- Viewport 组件事件说明：
             @request-save-reload — SW 首次激活时由子组件触发，父组件先把所有视口配置持久化到 sessionStorage 再刷新，确保刷新后状态还原 -->
        <Viewport
          v-for="(vp, index) in viewports"
          :key="vp.id"
          :viewport-id="vp.id"
          :url="vp.url"
          :width="vp.width"
          :height="vp.height"
          :scale="vp.scale"
          :is-landscape="vp.isLandscape"
          :network-id="vp.networkId"
          :device-name="vp.deviceName"
          :device-icon="vp.deviceIcon"
          :can-remove="viewports.length > 1"
          @update:scale="(v) => updateViewport(index, 'scale', v)"
          @update:is-landscape="(v) => updateViewport(index, 'isLandscape', v)"
          @update:network-id="(v) => updateViewport(index, 'networkId', v)"
          @update:url="(v) => updateViewport(index, 'url', v)"
          @remove="removeViewport(index)"
          @request-save-reload="saveAndReload"
        />
      </div>
    </main>

    <footer class="app-footer">
      <div class="footer-info">
        <span>💡 提示：某些网站通过 X-Frame-Options 禁止 iframe 嵌入，这是浏览器安全限制</span>
      </div>
      <div class="footer-counts">
        <span>已打开 {{ viewports.length }} 个视口</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, toRaw } from 'vue'
import DeviceSelector from './components/DeviceSelector.vue'
import CustomSizeInput from './components/CustomSizeInput.vue'
import NetworkCondition from './components/NetworkCondition.vue'
import Viewport from './components/Viewport.vue'
import { DEVICES, type Device } from './types'

interface ViewportConfig {
  id: string
  url: string
  width: number
  height: number
  scale: number
  isLandscape: boolean
  networkId: string
  deviceName: string
  deviceIcon: string
  deviceId?: string
}

const globalUrl = ref('/demo.html')
const globalNetworkId = ref('online')
const showPanel = ref(false)

const STORAGE_KEY = 'rtc_vp_state_v1'

function makeId() {
  return 'vp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function saveStateToStorage() {
  try {
    // toRaw 解包 reactive 数组后直接序列化，避免 Vue proxy 元数据混入 JSON
    const state = {
      viewports: toRaw(viewports),
      globalUrl: globalUrl.value,
      globalNetworkId: globalNetworkId.value,
      showPanel: showPanel.value,
      ts: Date.now()
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('保存状态失败', e)
  }
}

function restoreStateFromStorage(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const state = JSON.parse(raw)
    if (!state.viewports || !Array.isArray(state.viewports) || state.viewports.length === 0) return false
    viewports.length = 0
    state.viewports.forEach((vp: ViewportConfig) => viewports.push({ ...vp }))
    if (typeof state.globalUrl === 'string') globalUrl.value = state.globalUrl
    if (typeof state.globalNetworkId === 'string') globalNetworkId.value = state.globalNetworkId
    if (typeof state.showPanel === 'boolean') showPanel.value = state.showPanel
    sessionStorage.removeItem(STORAGE_KEY)
    return true
  } catch (e) {
    console.warn('恢复状态失败', e)
    sessionStorage.removeItem(STORAGE_KEY)
    return false
  }
}

// SW 首次激活场景下触发：子组件通过事件通知父组件先持久化视口配置再整页刷新
// 不直接在子组件里调用 location.reload 是为了统一管理副作用，确保刷新前所有状态都已安全落盘到 sessionStorage
function saveAndReload() {
  saveStateToStorage()
  window.location.reload()
}

function defaultViewport(device?: Device): ViewportConfig {
  const dev = device || DEVICES.find(d => d.id === 'iphone-14') || DEVICES[0]
  return {
    id: makeId(),
    url: '',
    width: dev.width,
    height: dev.height,
    scale: 100,
    isLandscape: false,
    networkId: globalNetworkId.value,
    deviceName: dev.name,
    deviceIcon: dev.icon,
    deviceId: dev.id
  }
}

const viewports = reactive<ViewportConfig[]>([
  defaultViewport(DEVICES.find(d => d.id === 'iphone-14') || DEVICES[0])
])

const quickDevices = computed(() => DEVICES.filter(d =>
  ['iphone-se', 'iphone-14', 'ipad', 'macbook-air', 'desktop-1920'].includes(d.id)
))

const currentDeviceId = computed(() => viewports[0]?.deviceId)

function isQuickDeviceActive(devId: string): boolean {
  if (viewports.length !== 1) return false
  return viewports[0].deviceId === devId
}

function applyQuickDevice(dev: Device) {
  if (viewports.length === 1) {
    viewports[0].width = dev.width
    viewports[0].height = dev.height
    viewports[0].deviceName = dev.name
    viewports[0].deviceIcon = dev.icon
    viewports[0].deviceId = dev.id
    viewports[0].isLandscape = false
  } else {
    applyDeviceToAll(dev)
  }
}

function applyDeviceToAll(dev: Device) {
  viewports.forEach(vp => {
    vp.width = dev.width
    vp.height = dev.height
    vp.deviceName = dev.name
    vp.deviceIcon = dev.icon
    vp.deviceId = dev.id
    vp.isLandscape = false
  })
}

function applyCustomSizeToAll(w: number, h: number) {
  viewports.forEach(vp => {
    vp.width = w
    vp.height = h
    vp.deviceName = '自定义'
    vp.deviceIcon = '✏️'
    vp.deviceId = undefined
    vp.isLandscape = false
  })
}

function applyGlobalUrl() {
  const url = globalUrl.value.trim()
  if (!url) return
  viewports.forEach(vp => { vp.url = url })
}

function applyNetworkToAll() {
  viewports.forEach(vp => { vp.networkId = globalNetworkId.value })
}

function addViewport() {
  if (viewports.length >= 4) return
  const vp = defaultViewport(DEVICES[viewports.length % DEVICES.length])
  vp.url = globalUrl.value.trim()
  viewports.push(vp)
}

function removeViewport(index: number) {
  if (viewports.length <= 1) return
  viewports.splice(index, 1)
}

function removeAllViewports() {
  viewports.splice(0, viewports.length)
  viewports.push(defaultViewport(DEVICES.find(d => d.id === 'iphone-14') || DEVICES[0]))
}

function updateViewport<K extends keyof ViewportConfig>(
  index: number,
  key: K,
  value: ViewportConfig[K]
) {
  (viewports[index] as any)[key] = value
}

function rotateAll() {
  viewports.forEach(vp => { vp.isLandscape = !vp.isLandscape })
}

function resetAllScales() {
  viewports.forEach(vp => { vp.scale = 100 })
}

function togglePanel() {
  showPanel.value = !showPanel.value
}

const gridStyle = computed(() => {
  const n = viewports.length
  if (n === 1) return {
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr'
  }
  if (n === 2) return {
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr'
  }
  if (n === 3) return {
    gridTemplateColumns: '1fr 1fr 1fr',
    gridTemplateRows: '1fr'
  }
  return {
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr'
  }
})

const layoutPresets = [
  {
    name: '手机 x2',
    viewports: [
      { w: 48, h: 95, t: 2.5, l: 1 },
      { w: 48, h: 95, t: 2.5, l: 51 }
    ],
    devices: ['iphone-se', 'iphone-14']
  },
  {
    name: '移动端对比',
    viewports: [
      { w: 30, h: 95, t: 2.5, l: 2 },
      { w: 30, h: 95, t: 2.5, l: 35 },
      { w: 30, h: 95, t: 2.5, l: 68 }
    ],
    devices: ['iphone-se', 'iphone-14', 'samsung-galaxy-s23']
  },
  {
    name: '手机 + 平板',
    viewports: [
      { w: 30, h: 95, t: 2.5, l: 5 },
      { w: 60, h: 95, t: 2.5, l: 38 }
    ],
    devices: ['iphone-14', 'ipad']
  },
  {
    name: '完整测试',
    viewports: [
      { w: 22, h: 46, t: 2, l: 2 },
      { w: 22, h: 46, t: 52, l: 2 },
      { w: 70, h: 46, t: 2, l: 28 },
      { w: 70, h: 46, t: 52, l: 28 }
    ],
    devices: ['iphone-se', 'iphone-14-pro', 'ipad-pro-11', 'macbook-pro']
  }
]

function applyLayoutPreset(layout: { devices: string[]; name: string }) {
  viewports.splice(0, viewports.length)
  layout.devices.forEach((devId) => {
    const dev = DEVICES.find(d => d.id === devId)
    const vp = defaultViewport(dev || DEVICES[0])
    vp.url = globalUrl.value.trim()
    viewports.push(vp)
  })
}

onMounted(() => {
  const restored = restoreStateFromStorage()
  if (restored) return
  if (globalUrl.value.trim()) {
    setTimeout(applyGlobalUrl, 100)
  }
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-header {
  display: flex;
  flex-direction: column;
  padding: 10px 16px;
  background: linear-gradient(180deg, #0f172a, #1a1a2e);
  border-bottom: 1px solid #2d3748;
  flex-shrink: 0;
  gap: 10px;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 24px;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #4dabf7, #63b3ed, #9f7aea);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.global-url {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 300px;
}

.url-prefix {
  font-size: 16px;
}

.global-url-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  font-size: 13px;
}

.primary-btn {
  padding: 8px 14px;
  background: linear-gradient(135deg, #4dabf7, #3b82f6);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}

.primary-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.add-btn {
  background: linear-gradient(135deg, #48bb78, #38a169);
}

.add-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #38a169, #2f855a);
  box-shadow: 0 4px 12px rgba(56, 161, 105, 0.4);
}

.ghost-btn {
  padding: 8px 12px;
  background: transparent;
  border: 1px solid #4a5568;
  color: #a0aec0;
  border-radius: 8px;
  font-size: 13px;
  white-space: nowrap;
}

.ghost-btn:hover {
  background: #2d3748;
  color: white;
  border-color: #718096;
}

.ghost-btn.active {
  background: rgba(77, 171, 247, 0.15);
  border-color: #4dabf7;
  color: #4dabf7;
}

.ghost-btn.danger:hover {
  background: rgba(229, 62, 62, 0.15);
  border-color: #e53e3e;
  color: #fc8181;
}

.ghost-btn.full-width {
  width: 100%;
}

.mt-8 {
  margin-top: 8px;
}

.toolbar-divider {
  width: 1px;
  height: 28px;
  background: #2d3748;
}

.quick-devices {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.device-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #16213e;
  border: 1px solid #2d3748;
  color: #cbd5e0;
  border-radius: 20px;
  font-size: 12px;
}

.device-chip:hover {
  background: #2d3748;
  border-color: #4a5568;
  transform: translateY(-1px);
}

.device-chip.active {
  background: linear-gradient(135deg, rgba(77, 171, 247, 0.2), rgba(59, 130, 246, 0.2));
  border-color: #4dabf7;
  color: #4dabf7;
  box-shadow: 0 0 0 1px rgba(77, 171, 247, 0.3);
}

.chip-name {
  font-weight: 500;
}

.viewport-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 12px;
  color: #718096;
}

.count-num {
  color: #4dabf7;
  font-size: 16px;
  font-weight: 700;
}

.count-max {
  color: #4a5568;
}

.control-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
  background: #0f172a;
  border-left: 1px solid #2d3748;
  padding: 20px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.panel-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #2d3748;
}

.panel-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #eaeaea;
  margin-bottom: 14px;
}

.batch-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layout-presets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.layout-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: #16213e;
  border: 1px solid #2d3748;
  border-radius: 8px;
  color: #eaeaea;
}

.layout-btn:hover {
  background: #1e2a47;
  border-color: #4dabf7;
  transform: translateY(-1px);
}

.layout-preview {
  position: relative;
  width: 100%;
  height: 50px;
  background: #0f172a;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #2d3748;
}

.layout-box {
  position: absolute;
  background: linear-gradient(135deg, #4dabf7, #3b82f6);
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.layout-name {
  font-size: 11px;
  font-weight: 500;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 12px;
  gap: 12px;
  min-height: 0;
  transition: padding-right 0.3s ease;
}

.app-main.panel-open {
  padding-right: 352px;
}

.viewport-grid {
  display: grid;
  gap: 12px;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #0f172a;
  border-top: 1px solid #2d3748;
  flex-shrink: 0;
}

.footer-info {
  font-size: 11px;
  color: #718096;
}

.footer-counts {
  font-size: 11px;
  color: #718096;
}
</style>

export interface Device {
  id: string
  name: string
  width: number
  height: number
  icon: string
  category: 'mobile' | 'tablet' | 'laptop' | 'desktop'
}

export interface NetworkCondition {
  id: string
  name: string
  download: number
  upload: number
  latency: number
  description: string
}

export interface MediaQueryItem {
  query: string
  label: string
  range: string
}

export interface ViewportState {
  id: string
  url: string
  width: number
  height: number
  scale: number
  isLandscape: boolean
  networkCondition: NetworkCondition
  deviceName: string
  isLoading: boolean
  error: string | null
}

export const DEVICES: Device[] = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, icon: '📱', category: 'mobile' },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844, icon: '📱', category: 'mobile' },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 393, height: 852, icon: '📱', category: 'mobile' },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: '📱', category: 'mobile' },
  { id: 'samsung-galaxy-s23', name: 'Galaxy S23', width: 393, height: 851, icon: '📱', category: 'mobile' },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915, icon: '📱', category: 'mobile' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, icon: '📲', category: 'tablet' },
  { id: 'ipad', name: 'iPad', width: 768, height: 1024, icon: '📲', category: 'tablet' },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', width: 834, height: 1194, icon: '📲', category: 'tablet' },
  { id: 'ipad-pro-12', name: 'iPad Pro 12.9"', width: 1024, height: 1366, icon: '📲', category: 'tablet' },
  { id: 'macbook-air', name: 'MacBook Air', width: 1440, height: 900, icon: '💻', category: 'laptop' },
  { id: 'macbook-pro', name: 'MacBook Pro', width: 1512, height: 982, icon: '💻', category: 'laptop' },
  { id: 'desktop-1920', name: 'Desktop 1920', width: 1920, height: 1080, icon: '🖥️', category: 'desktop' },
  { id: 'desktop-2560', name: 'Desktop 2560', width: 2560, height: 1440, icon: '🖥️', category: 'desktop' },
  { id: 'desktop-4k', name: 'Desktop 4K', width: 3840, height: 2160, icon: '🖥️', category: 'desktop' }
]

export const NETWORK_CONDITIONS: NetworkCondition[] = [
  { id: 'online', name: '正常网络', download: 10240, upload: 10240, latency: 0, description: '无限制' },
  { id: 'wifi', name: 'WiFi', download: 30000, upload: 15000, latency: 2, description: '30 Mbps / 15 Mbps' },
  { id: '4g', name: '4G', download: 9000, upload: 3000, latency: 100, description: '9 Mbps / 3 Mbps' },
  { id: '3g', name: '3G', download: 1600, upload: 768, latency: 300, description: '1.6 Mbps / 768 Kbps' },
  { id: 'slow-3g', name: '慢速 3G', download: 400, upload: 400, latency: 400, description: '400 Kbps / 400 Kbps' },
  { id: '2g', name: '2G', download: 250, upload: 50, latency: 800, description: '250 Kbps / 50 Kbps' },
  { id: 'offline', name: '离线', download: 0, upload: 0, latency: 0, description: '无网络连接' }
]

export const MEDIA_QUERIES: MediaQueryItem[] = [
  { query: '(max-width: 320px)', label: 'XS', range: '≤ 320px' },
  { query: '(max-width: 480px)', label: 'S', range: '≤ 480px' },
  { query: '(max-width: 640px)', label: 'SM', range: '≤ 640px' },
  { query: '(max-width: 768px)', label: 'MD', range: '≤ 768px' },
  { query: '(max-width: 1024px)', label: 'LG', range: '≤ 1024px' },
  { query: '(max-width: 1280px)', label: 'XL', range: '≤ 1280px' },
  { query: '(max-width: 1536px)', label: '2XL', range: '≤ 1536px' },
  { query: '(min-width: 1537px)', label: '3XL+', range: '> 1536px' }
]

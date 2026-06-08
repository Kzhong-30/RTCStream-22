<template>
  <div class="media-query-status">
    <div class="current-breakpoint">
      <span class="bp-label">当前断点：</span>
      <span class="bp-badge" :style="{ background: activeBadge?.color }">
        {{ activeBadge?.label || '—' }}
      </span>
      <span class="bp-range">{{ width }}px</span>
    </div>
    <div class="mq-tags">
      <div
        v-for="mq in queries"
        :key="mq.query"
        :class="['mq-tag', { active: matches.includes(mq.query) }]"
      >
        <span class="mq-label">{{ mq.label }}</span>
        <span class="mq-range">{{ mq.range }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MEDIA_QUERIES } from '../types'

const props = defineProps<{
  width: number
  height: number
}>()

const queries = MEDIA_QUERIES

const matches = computed(() => {
  return MEDIA_QUERIES.filter(mq => {
    return evaluateMediaQuery(mq.query, props.width)
  }).map(mq => mq.query)
})

const badgeColors: Record<string, string> = {
  'XS': '#e53e3e',
  'S': '#ed8936',
  'SM': '#ecc94b',
  'MD': '#38a169',
  'LG': '#3182ce',
  'XL': '#805ad5',
  '2XL': '#d53f8c',
  '3XL+': '#4a5568'
}

const activeBadge = computed(() => {
  let active: { label: string; query: string } | null = null
  for (const mq of MEDIA_QUERIES) {
    if (evaluateMediaQuery(mq.query, props.width)) {
      active = { label: mq.label, query: mq.query }
      break
    }
  }
  if (!active) active = { label: '3XL+', query: '(min-width: 1537px)' }
  return {
    ...active,
    color: badgeColors[active.label] || '#4a5568'
  }
})

function evaluateMediaQuery(query: string, width: number): boolean {
  const maxMatch = query.match(/max-width:\s*(\d+)px/)
  const minMatch = query.match(/min-width:\s*(\d+)px/)
  if (maxMatch) {
    return width <= parseInt(maxMatch[1], 10)
  }
  if (minMatch) {
    return width >= parseInt(minMatch[1], 10)
  }
  return false
}
</script>

<style scoped>
.media-query-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.current-breakpoint {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bp-label {
  font-size: 12px;
  color: #718096;
}

.bp-badge {
  padding: 3px 10px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.bp-range {
  font-size: 11px;
  color: #a0aec0;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
}

.mq-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mq-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 10px;
  background: #16213e;
  border: 1px solid #2d3748;
  border-radius: 6px;
  opacity: 0.4;
  transition: all 0.2s;
}

.mq-tag.active {
  opacity: 1;
  border-color: #4dabf7;
  background: rgba(77, 171, 247, 0.1);
  box-shadow: 0 0 0 1px rgba(77, 171, 247, 0.2);
}

.mq-label {
  font-size: 11px;
  font-weight: 700;
  color: #4dabf7;
}

.mq-tag.active .mq-label {
  color: #63b3ed;
}

.mq-range {
  font-size: 9px;
  color: #718096;
}
</style>

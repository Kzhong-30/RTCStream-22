const CACHE_NAME = 'network-throttle-v1';
const activeConditions = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_CONDITION') {
    const { scope, condition } = event.data;
    if (condition) {
      activeConditions.set(scope, condition);
    } else {
      activeConditions.delete(scope);
    }
    event.source.postMessage({ type: 'CONDITION_APPLIED', scope });
  }
});

function throttleResponse(response, condition) {
  if (!condition || condition.id === 'online') return response;

  return new Promise((resolve) => {
    const delay = condition.latency || 0;
    const kbps = condition.download || 0;

    setTimeout(async () => {
      if (kbps <= 0) {
        resolve(new Response('Offline', { status: 503 }));
        return;
      }

      const blob = await response.clone().blob();
      const totalBytes = blob.size;
      const bytesPerMs = (kbps * 1024) / 8 / 1000;

      if (bytesPerMs <= 0 || totalBytes / bytesPerMs < 200) {
        resolve(response);
        return;
      }

      const extraDelay = Math.min(totalBytes / bytesPerMs, 5000);
      setTimeout(() => resolve(response), extraDelay);
    }, delay);
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let matchedCondition = null;
  for (const [scope, cond] of activeConditions) {
    if (request.url.includes(scope) || scope === 'global') {
      matchedCondition = cond;
      break;
    }
  }

  if (!matchedCondition || matchedCondition.id === 'online') return;

  if (matchedCondition.id === 'offline') {
    event.respondWith(new Response(JSON.stringify({ error: '模拟离线模式' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }));
    return;
  }

  event.respondWith(
    fetch(request).then((resp) => throttleResponse(resp, matchedCondition))
  );
});

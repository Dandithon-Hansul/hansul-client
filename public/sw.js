// v2: 화면(HTML)은 항상 네트워크 먼저 — v1 은 처음 받은 화면을 계속 꺼내 써서,
// 새로 배포해도 예전 화면·예전 코드가 남아 로그인 수정 같은 변경이 사용자에게 안 닿았음
const CACHE_NAME = 'hansol-shell-v2'
const APP_SHELL = ['/', '/manifest.webmanifest', '/logo.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  // API 응답은 캐시하면 프로필 등이 옛날 값으로 고정되므로 항상 네트워크로
  if (url.pathname.startsWith('/api/')) return

  // 화면(페이지 이동): 네트워크 먼저 → 새 배포가 바로 보임. 오프라인일 때만 저장해 둔 화면
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // 이름에 해시가 붙은 JS·CSS·이미지 등은 내용이 바뀌면 이름도 바뀌므로 저장해 둔 것 먼저
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      }
      return response
    })),
  )
})

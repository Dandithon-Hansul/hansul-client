import { useCallback, useEffect, useRef, useState } from 'react'
import type { CursorPage } from '../lib/api/types'

/**
 * cursor 페이지네이션 목록 + 무한 스크롤
 *   const { items, sentinelRef } = useCursorList(getMySaved)
 *   목록 아래 <div ref={sentinelRef} /> 가 화면에 보이면 다음 페이지를 불러옴
 * 탭을 바꿀 때처럼 fetcher 가 달라지면 컴포넌트에 key 를 줘서 새로 시작하세요.
 */
export function useCursorList<T>(fetcher: (cursor: string | null) => Promise<CursorPage<T>>) {
  const [items, setItems] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)

  // state 는 바로 안 바뀌므로 중복 요청 방지·최신 값은 ref 로
  const busy = useRef(false)
  const cursor = useRef<string | null>(null)
  const more = useRef(true)
  const mounted = useRef(true)
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const loadMore = useCallback(async () => {
    if (busy.current || !more.current) return
    busy.current = true
    setLoading(true)
    setError(null)
    try {
      const page = await fetcherRef.current(cursor.current)
      if (!mounted.current) return
      setItems((previous) => [...previous, ...page.items])
      cursor.current = page.nextCursor
      more.current = page.nextCursor !== null
      setHasMore(more.current)
    } catch (caught) {
      if (mounted.current) setError(caught)
    } finally {
      busy.current = false
      if (mounted.current) {
        setLoading(false)
        setLoaded(true)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void loadMore()
    return () => {
      mounted.current = false
    }
  }, [loadMore])

  const observer = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect()
      if (!node || typeof IntersectionObserver === 'undefined') return
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      }, { rootMargin: '200px' })
      observer.current.observe(node)
    },
    [loadMore],
  )

  return { items, hasMore, loading, loaded, error, sentinelRef, retry: loadMore }
}

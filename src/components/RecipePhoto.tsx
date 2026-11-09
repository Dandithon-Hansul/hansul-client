import { useEffect, useState } from 'react'
import './recipe-photo.css'

type RecipePhotoProps = {
  src: string | null | undefined
  title: string
  className?: string
  recipeTitle?: string
}

/** Never show an unrelated food photo when the recipe has no valid image. */
export default function RecipePhoto({ src, title, className = '', recipeTitle }: RecipePhotoProps) {
  const [failedUrls, setFailedUrls] = useState<string[]>([])
  useEffect(() => { setFailedUrls([]) }, [src, title])
  const url = src?.trim() ?? ''
  const isValidUrl = /^https:\/\//i.test(url) || url.startsWith('/images/')
  // The Andong jjimdak image was bundled before remote images were supported.
  // Keep it only for that dish; never substitute it for a different recipe.
  const andongFallback = /안동\s*찜닭/.test(recipeTitle ?? title) ? '/images/andong-jjimdak.png' : ''
  const imageUrl = isValidUrl && !failedUrls.includes(url) ? url
    : andongFallback && !failedUrls.includes(andongFallback) ? andongFallback : ''
  if (imageUrl) {
    return <img className={className} src={imageUrl} alt={title} onError={() => setFailedUrls((current) =>
      current.includes(imageUrl) ? current : [...current, imageUrl]
    )} />
  }
  return <div className={`recipe-photo-empty ${className}`} role="img" aria-label={`${title} 사진 준비 중`}>
    <svg aria-hidden="true" viewBox="0 0 64 64"><path d="M10 43c3 7 12 12 22 12s19-5 22-12H10Z" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M17 37c0-9 6-16 15-16s15 7 15 16" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M25 15c0-4 3-7 7-7m7 7c0-4 2-7 5-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    <span>{title}</span><small>음식 사진 준비 중</small>
  </div>
}

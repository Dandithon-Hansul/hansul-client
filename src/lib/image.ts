const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024

/** 고를 수 있는 사진인지 검사. 문제 있으면 안내 문구, 없으면 null */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/') || (!ALLOWED_TYPES.includes(file.type) && file.type !== 'image/gif')) {
    return 'JPG, PNG, WEBP 사진만 올릴 수 있어요.'
  }
  if (file.size > IMAGE_MAX_BYTES) return '사진은 10MB 이하로 올려주세요.'
  return null
}

/**
 * 프로필 사진을 긴 변 maxSize(px) 이하 JPEG 로 줄임.
 * 폰 사진(수 MB)을 그대로 올리면 느리고 저장 공간도 낭비라서 업로드 전에 줄여서 보냄.
 */
export async function resizeImage(file: File, maxSize = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('이미지를 처리하지 못했어요.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 처리하지 못했어요.'))), 'image/jpeg', 0.85)
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

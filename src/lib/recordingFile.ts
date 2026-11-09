/** Build an upload whose Content-Type matches the backend's exact allowlist.
 * MediaRecorder often reports e.g. audio/webm;codecs=opus, which caused HTTP 415.
 * No transcoding occurs: keep the original bytes and choose their real container type.
 */
export function createRecordingFile(chunks: BlobPart[], recorderMimeType: string, baseName: string): File {
  const chunkType = chunks.find((part): part is Blob => part instanceof Blob && Boolean(part.type))?.type
  const type = (recorderMimeType || chunkType || 'audio/webm').split(';')[0].trim().toLowerCase()
  const extension = type === 'audio/mp4' ? 'mp4' : type === 'audio/webm' ? 'webm' : type === 'audio/wav' ? 'wav' : null
  if (!extension) throw new Error(`Unsupported audio container: ${type}`)
  return new File(chunks, `${baseName}.${extension}`, { type })
}

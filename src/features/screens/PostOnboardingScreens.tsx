import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { cookPath, recipePath } from '../../app/paths'
import { IS_MOCK } from '../../lib/env'
import RecipePhoto from '../../components/RecipePhoto'
import { createRecordingFile } from '../../lib/recordingFile'
import { ApiError } from '../../lib/api/client'
import { flowErrorMessage } from './recipeFlowError'
import { useAuth } from '../auth/auth-context'
import { analyzeRecipe, createRecipe, generateStepImages, getRecipe, sendRecipeChat, toggleRecipe, transcribe, sttAudioPath, uploadSignedFile, type AnalysisResult, type RecipeDetail } from '../../lib/api/recipes'
import { getMonthlyTopRecipes, type HomeRecipe } from '../../lib/api/home'
import { appendChatStreamChunk, CHAT_PENDING_TEXT, type ChatMessage } from './chatStream'
import { failedStepImageOrders, mergeStepImages } from './stepImageGeneration'
import './post-onboarding.css'

export type FeaturePage = 'record' | 'chat' | 'map' | 'profile' | 'monthly' | 'recipe' | 'cook'

type Props = { page: FeaturePage; name: string; region: string; favoriteFoods: string[]; onNavigate: (page: 'home' | FeaturePage) => void }

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="feature-header"><button type="button" onClick={onBack} aria-label="뒤로">‹</button><h1>{title}</h1><span /></header>
}

/** Three visual stages: before recording, recording/finishing, conversation. */
function JourneyProgress({ stage }: { stage: 1 | 2 | 3 }) {
  const labels = ['녹음 준비', '녹음 및 정리', '음식 이야기']
  return <nav className="journey-progress" aria-label="음식 이야기 진행 단계">
    {labels.map((label, index) => <span
      className={index + 1 === stage ? 'is-current' : index + 1 < stage ? 'is-complete' : ''}
      key={label}
      aria-current={index + 1 === stage ? 'step' : undefined}
    ><span className="journey-step-text">{label}</span></span>)}
  </nav>
}

function PostOnboardingScreens({ page, name, region, favoriteFoods, onNavigate }: Props) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordPhoto, setRecordPhoto] = useState<File | null>(null)
  const [draft, setDraft] = useState('')
  const [chatVoiceRecording, setChatVoiceRecording] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState('')
  const [chatImagePath, setChatImagePath] = useState<string | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: 'ai', text: '오늘은 어떤 음식의 이야기를 남겨볼까요?' },
  ])
  const [cookStep, setCookStep] = useState(0)
  const [searchParams] = useSearchParams()
  const [draftId, setDraftId] = useState('')
  const [recordError, setRecordError] = useState('')
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [monthlyRecipes, setMonthlyRecipes] = useState<HomeRecipe[]>([])
  const [monthlyDetails, setMonthlyDetails] = useState<Record<string, RecipeDetail>>({})
  const [monthlyActionBusy, setMonthlyActionBusy] = useState<string | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [screenError, setScreenError] = useState('')
  const [retryChatMessage, setRetryChatMessage] = useState('')
  const [stepImageStatus, setStepImageStatus] = useState<{
    recipeId: string
    generating: boolean
    failedOrders: number[]
    requestFailed: boolean
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [quotePlaying, setQuotePlaying] = useState(false)
  const [quoteStep, setQuoteStep] = useState<'questions' | 'input' | 'confirmed' | 'skipped'>('questions')
  const [transmitterQuote, setTransmitterQuote] = useState('')
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const mediaStream = useRef<MediaStream | null>(null)
  const chatMediaRecorder = useRef<MediaRecorder | null>(null)
  const chatMediaStream = useRef<MediaStream | null>(null)
  const quoteAudio = useRef<HTMLAudioElement | null>(null)
  const chatAudio = useRef<HTMLAudioElement | null>(null)
  const chatAudioQueue = useRef<string[]>([])
  const chatAudioBlocked = useRef(false)
  const [chatAudioNeedsTap, setChatAudioNeedsTap] = useState(false)
  const imageGenerationRequested = useRef(new Set<string>())
  const imageGenerationInFlight = useRef(new Set<string>())
  const monthlyActionInFlight = useRef(new Set<string>())
  // 예시 레시피(대구식 육개장)는 mock 에서만. 실제 서버에선 이 id 가 없어서 400
  const recipeId = searchParams.get('id') || draftId || (IS_MOCK ? 'r-daegu-yukgaejang' : '')
  useEffect(() => {
    if (page === 'recipe' || page === 'cook') {
      if (!recipeId) return undefined
      let active = true
      setRecipe(null)
      setScreenError('')
      getRecipe(recipeId).then((data) => { if (active) setRecipe(data) }).catch((error: unknown) => {
        if (!active) return
        const code = error instanceof ApiError ? ` (${error.code} · ${error.status})` : ''
        setScreenError(`레시피를 불러오지 못했어요.${code}`)
      })
      return () => { active = false }
    }
    if (page === 'monthly') {
      let active = true
      setMonthlyLoading(true)
      setScreenError('')
      setMonthlyDetails({})
      getMonthlyTopRecipes()
        .then((recipes) => {
          if (!active) return
          setMonthlyRecipes(recipes)
          // The monthly home DTO intentionally has only id/title/rank/image.
          // Fetch details to display the actual viewer's like/save state and counts.
          for (const item of recipes) {
            void getRecipe(item.recipe_id).then((detail) => {
              if (active) setMonthlyDetails((current) => ({ ...current, [item.recipe_id]: detail }))
            }).catch(() => { /* Keep navigation available if an individual detail fails. */ })
          }
        })
        .catch(() => { if (active) { setMonthlyRecipes([]); setScreenError('이달의 전승 음식 순위를 불러오지 못했어요.') } })
        .finally(() => { if (active) setMonthlyLoading(false) })
      return () => { active = false }
    }
    return undefined
  }, [page, recipeId])

  async function updateMonthlyReaction(id: string, action: 'like' | 'save') {
    if (!monthlyDetails[id] || monthlyActionInFlight.current.has(id)) return
    monthlyActionInFlight.current.add(id)
    setMonthlyActionBusy(id)
    try {
      const result = await toggleRecipe(id, action)
      setMonthlyDetails((current) => {
        const item = current[id]
        if (!item) return current
        return { ...current, [id]: action === 'like'
          ? { ...item, is_liked: result.liked, like_count: result.like_count }
          : { ...item, is_saved: result.saved, save_count: result.save_count } }
      })
    } catch {
      setScreenError('좋아요 또는 스크랩을 변경하지 못했어요. 다시 시도해 주세요.')
    } finally {
      monthlyActionInFlight.current.delete(id)
      setMonthlyActionBusy(null)
    }
  }

  async function requestStepImages(forRecipe: RecipeDetail) {
    const id = forRecipe.recipe_id
    if (imageGenerationInFlight.current.has(id)) return
    imageGenerationInFlight.current.add(id)
    setStepImageStatus((current) => ({
      recipeId: id,
      generating: true,
      failedOrders: current?.recipeId === id ? current.failedOrders : [],
      requestFailed: false,
    }))
    try {
      // The backend reuses successful step images, so retrying this batch keeps existing work.
      const result = await generateStepImages(id)
      setRecipe((current) => current?.recipe_id === id
        ? { ...current, steps: mergeStepImages(current.steps, result.generated) }
        : current)
      setStepImageStatus({
        recipeId: id,
        generating: false,
        failedOrders: failedStepImageOrders(forRecipe.steps, result),
        requestFailed: false,
      })
    } catch {
      // A request-level error gives no failed_orders: allow retry for all still-missing steps.
      setStepImageStatus({
        recipeId: id,
        generating: false,
        failedOrders: forRecipe.steps.filter((step) => !step.image_url).map((step) => step.order),
        requestFailed: true,
      })
    } finally {
      imageGenerationInFlight.current.delete(id)
    }
  }

  useEffect(() => {
    if (page !== 'cook' || !recipe || recipe.recipe_id !== recipeId) return
    // 단계 이미지 생성은 작성자만 가능 (백엔드 /api/steps/images 가 작성자 레시피만 찾음) — 다른 사람 레시피면 요청하지 않음
    if (!IS_MOCK && recipe.transmitter_id !== session?.userId) return
    const hasMissingStepImage = recipe.steps.some((step) => !step.image_url)
    if (!hasMissingStepImage || imageGenerationRequested.current.has(recipe.recipe_id)) return
    imageGenerationRequested.current.add(recipe.recipe_id)
    void requestStepImages(recipe)
  }, [page, recipe, recipeId, session?.userId])

  useEffect(() => () => mediaStream.current?.getTracks().forEach((track) => track.stop()), [])
  useEffect(() => () => chatMediaStream.current?.getTracks().forEach((track) => track.stop()), [])
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }, [])
  useEffect(() => () => {
    chatAudioQueue.current = []
    chatAudio.current?.pause()
    chatAudio.current = null
    chatAudioBlocked.current = false
  }, [page])

  useEffect(() => {
    if (!recording) return undefined
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  async function toggleRecording() {
    setRecordError('')
    if (mediaRecorder.current?.state === 'recording') { mediaRecorder.current.pause(); setRecording(false); return }
    if (mediaRecorder.current?.state === 'paused') { mediaRecorder.current.resume(); setRecording(true); return }
    try {
      setRecordingSeconds(0)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStream.current = stream
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        void (async () => {
          setBusy(true)
          try {
            const file = createRecordingFile(chunks, recorder.mimeType, 'recording')
            const signed = await uploadSignedFile(file, 'stt_audio')
            const result = await transcribe({ audio_path: sttAudioPath(signed) })
            setDraftId(result.recipe_id)
            if (recordPhoto) {
              const photo = await uploadSignedFile(recordPhoto, 'chat_image', result.recipe_id)
              setChatImagePath(photo.path)
              setRecordPhoto(null)
            }
            // The transcript stays on the server as a draft; continue to the conversation automatically.
            await continueToChat(result.recipe_id)
          } catch (error) {
            setRecordError(error instanceof ApiError && error.status === 415
              ? '지원하지 않는 오디오 형식이에요. 다른 브라우저에서 다시 녹음해 주세요.'
              : '음성을 전사하지 못했어요. 다시 녹음해 주세요.')
          }
          finally { setBusy(false) }
        })()
      }
      mediaRecorder.current = recorder
      recorder.start()
      setRecording(true)
    } catch { setRecordError('마이크를 사용할 수 없어요. 브라우저 권한을 확인해 주세요.') }
  }

  function finishRecording() {
    const recorder = mediaRecorder.current
    if (recorder && recorder.state !== 'inactive') {
      setBusy(true)
      recorder.stop()
      setRecording(false)
    }
  }

  function beginQuoteStep() {
    setQuoteStep('input')
    setMessages((current) => [...current, {
      from: 'ai',
      text: '마지막으로 이 음식을 만들 사람들에게 전하고 싶은 한마디가 있으신가요? 한마디는 선택 사항이에요.',
    }])
  }

  async function continueToChat(completedDraftId?: string) {
    const currentDraftId = completedDraftId || draftId
    if (!currentDraftId) return
    setBusy(true)
    setScreenError('')
    try {
      const result = await analyzeRecipe(currentDraftId)
      setAnalysis(result)
      setQuoteStep('questions')
      setTransmitterQuote('')
      if (result.questions.length) {
        setMessages([{ from: 'ai', text: result.questions[0].question }])
      } else {
        setMessages([])
        beginQuoteStep()
      }
    } catch (error) {
      setMessages([{ from: 'ai', text: '들려주신 음식 이야기를 조금 더 정리해 볼게요.' }])
      setScreenError(flowErrorMessage(error, 'analysis'))
    } finally {
      setBusy(false)
      onNavigate('chat')
    }
  }

  function stopChatAudio() {
    chatAudioQueue.current = []
    chatAudio.current?.pause()
    chatAudio.current = null
    chatAudioBlocked.current = false
    setChatAudioNeedsTap(false)
  }

  function playNextChatAudio() {
    if (chatAudio.current || chatAudioBlocked.current) return
    const url = chatAudioQueue.current.shift()
    if (!url) return
    const audio = new Audio(url)
    chatAudio.current = audio
    const finish = () => {
      if (chatAudio.current !== audio) return
      chatAudio.current = null
      playNextChatAudio()
    }
    audio.onended = finish
    audio.onerror = finish
    void audio.play().then(() => setChatAudioNeedsTap(false)).catch(() => {
      if (chatAudio.current !== audio) return
      chatAudio.current = null
      chatAudioQueue.current.unshift(url)
      chatAudioBlocked.current = true
      setChatAudioNeedsTap(true)
    })
  }

  function enqueueChatAudio(url: string) {
    if (!url.startsWith('https://') && !url.startsWith('http://')) return
    chatAudioQueue.current.push(url)
    playNextChatAudio()
  }

  function resumeChatAudio() {
    chatAudioBlocked.current = false
    setChatAudioNeedsTap(false)
    playNextChatAudio()
  }

  async function sendChatMessage(message: string) {
    const recipe_id = draftId || 'draft-mock'
    const responseId = crypto.randomUUID()
    setMessages((current) => [
      ...current,
      { from: 'user', text: message },
      { from: 'ai', text: CHAT_PENDING_TEXT, responseId },
    ])
    setSelectedSuggestion(message)
    setRetryChatMessage('')
    setScreenError('')
    setDraft('')
    stopChatAudio()
    setBusy(true)
    try {
      let answerText = ''
      let hasAudioSegments = false
      let hadStreamError = false
      await sendRecipeChat({ recipe_id, message, ...(chatImagePath ? { image_path: chatImagePath } : {}), tts: true }, (event) => {
        if (event.event === 'chunk' && typeof event.data.text === 'string') {
          answerText += event.data.text
          setMessages((current) => appendChatStreamChunk(current, responseId, event.data.text as string))
        }
        if (event.event === 'audio' && typeof event.data.url === 'string') {
          hasAudioSegments = true
          enqueueChatAudio(event.data.url)
        }
        if (event.event === 'done' && !hasAudioSegments && typeof event.data.audio_url === 'string') {
          enqueueChatAudio(event.data.audio_url)
        }
        if (event.event === 'error') hadStreamError = true
      })
      if (hadStreamError && !answerText) throw new Error('CHAT_STREAM_FAILED')
      if (!answerText) setMessages((current) => current.filter((item) => item.responseId !== responseId))
      if (analysis?.questions.length) {
        const nextAnalysis = await analyzeRecipe(recipe_id)
        setAnalysis(nextAnalysis)
        const nextQuestion = nextAnalysis.questions[0]?.question
        if (nextQuestion && !answerText.includes(nextQuestion)) {
          setMessages((current) => [...current, { from: 'ai', text: nextQuestion }])
        } else if (!nextAnalysis.questions.length) {
          beginQuoteStep()
        }
      }
      setChatImagePath(undefined)
    } catch {
      setMessages((current) => current.filter((item) => item.responseId !== responseId || item.text !== CHAT_PENDING_TEXT))
      setRetryChatMessage(message)
    }
    finally { setBusy(false) }
  }

  async function toggleChatVoice() {
    if (chatMediaRecorder.current?.state === 'recording') {
      chatMediaRecorder.current.stop()
      setChatVoiceRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chatMediaStream.current = stream
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        void (async () => {
          setBusy(true)
          try {
            const file = createRecordingFile(chunks, recorder.mimeType, 'chat-recording')
            const signed = await uploadSignedFile(file, 'stt_audio', draftId || undefined)
            const result = await transcribe({ audio_path: sttAudioPath(signed), ...(draftId ? { recipe_id: draftId } : {}) })
            if (result.transcript) setDraft(result.transcript)
          } catch (error) {
            setScreenError(error instanceof ApiError && error.status === 415
              ? '지원하지 않는 오디오 형식이에요. 다시 녹음해 주세요.'
              : '음성을 전사하지 못했어요.')
          }
          finally { setBusy(false) }
        })()
      }
      chatMediaRecorder.current = recorder
      recorder.start()
      setChatVoiceRecording(true)
    } catch { setScreenError('마이크를 사용할 수 없어요. 브라우저 권한을 확인해 주세요.') }
  }

  async function toggleQuoteAudio() {
    const audio = quoteAudio.current
    if (audio) {
      if (audio.paused) {
        try { await audio.play(); setQuotePlaying(true) }
        catch { setScreenError('전승자의 음성을 재생하지 못했어요.') }
      } else {
        audio.pause()
        setQuotePlaying(false)
      }
      return
    }
    // Older recipes can have a text quote without a stored voice recording.
    // This is explicitly labelled a device-generated voice, never the transmitter's real voice.
    if (!recipe?.transmitter_quote) return
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setScreenError('이 기기에서는 문구 읽어주기를 지원하지 않아요.')
      return
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setQuotePlaying(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(recipe.transmitter_quote)
    utterance.lang = 'ko-KR'
    utterance.onend = () => setQuotePlaying(false)
    utterance.onerror = () => { setQuotePlaying(false); setScreenError('문구를 읽어주지 못했어요.') }
    setQuotePlaying(true)
    window.speechSynthesis.speak(utterance)
  }

  async function analyzeAndPublish() {
    if (busy) return
    setScreenError('')
    // Avoid repeatedly charging/retrying the analysis API while there are
    // still explicit questions the user has not answered.
    if (quoteStep === 'questions' && analysis?.questions.length) {
      setScreenError('아직 확인할 손맛 질문이 있어요. 답변을 고르거나 직접 이야기해 주세요.')
      return
    }
    if (quoteStep === 'input') return
    setBusy(true)
    try {
      if (quoteStep === 'questions') {
        const result = analysis ?? await analyzeRecipe(draftId || 'draft-mock')
        setAnalysis(result)
        if (result.questions.length) {
          setMessages((current) => [...current, { from: 'ai', text: result.questions[0].question }])
        } else {
          beginQuoteStep()
        }
        return
      }
      const published = await createRecipe(draftId || 'draft-mock', quoteStep === 'confirmed' ? transmitterQuote : undefined)
      setDraftId(published.recipe_id)
      navigate(`/recipe?id=${encodeURIComponent(published.recipe_id)}`)
    } catch (error) {
      setScreenError(flowErrorMessage(error, quoteStep === 'questions' ? 'analysis' : 'publish'))
    } finally {
      setBusy(false)
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim() || busy) return
    if (quoteStep === 'input') {
      setTransmitterQuote(draft.trim())
      setQuoteStep('confirmed')
      setDraft('')
      return
    }
    if (quoteStep === 'questions') void sendChatMessage(draft.trim())
  }

  if (page === 'record') return (
    <main className="feature-page">
      <JourneyProgress stage={recording || recordingSeconds > 0 || busy || Boolean(draftId) ? 2 : 1} />
      <button className="journey-back" type="button" onClick={() => onNavigate('home')} aria-label="홈으로 돌아가기">‹</button>
      <div className="record-view">
        <p className="feature-kicker">우리 집 손맛 기록</p>
        <h2>어떤 음식의 이야기를<br />남겨볼까요?</h2>
        <p className="feature-muted">평소 요리하듯 편안하게 이야기해 주세요.<br />AI가 레시피의 재료와 순서를 정리해 드려요.</p>
        <button className={`record-orb ${recording ? 'is-recording' : ''}`} type="button" onClick={() => void toggleRecording()} aria-label={recording ? '녹음 일시정지' : mediaRecorder.current?.state === 'paused' ? '녹음 다시 시작' : '녹음 시작'} disabled={busy}>
          {recording ? <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 23v-6m6 12V12m6 18V9m6 21V13m6 12v-7"/><path d="m33 4 1.4 3.2L38 9l-3.6 1.5L33 14l-1.5-3.5L28 9l3.5-1.8L33 4Z"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg>}
        </button>
        <p className="record-status">{recording ? '버튼을 누르면 녹음이 일시정지됩니다' : mediaRecorder.current?.state === 'paused' ? '버튼을 다시 누르면 녹음이 이어집니다' : busy ? '음성을 전사하고 있어요…' : '버튼을 눌러 이야기를 시작하세요'}<span>{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span></p>
        {recordError && <p role="alert">{recordError}</p>}
        <div className="record-guidance"><small>이렇게 시작해 보세요</small><p>“오늘은 우리 집에서 40년 동안 만들어 온<br />소고기국 레시피를 알려줄게요.”</p></div>
        <label className={`photo-upload record-photo-button ${recordPhoto ? 'is-active' : ''}`}>{recordPhoto ? '사진이 추가됐어요' : '음식 사진 먼저 추가하기'}<input type="file" accept="image/*" onChange={(event) => setRecordPhoto(event.target.files?.[0] ?? null)} /></label>
        <button className="record-finish" type="button" disabled={busy || recordingSeconds < 5 || (!draftId && !recording && mediaRecorder.current?.state !== 'paused')} onClick={() => { if (recording || mediaRecorder.current?.state === 'paused') finishRecording(); else void continueToChat() }}>{busy ? '레시피 이야기를 정리하고 있어요…' : '기록 마무리 하기'}</button>
      </div>
    </main>
  )

  if (page === 'chat') return (
    <main className="feature-page chat-page">
      <JourneyProgress stage={3} />
      <button className="journey-back" type="button" onClick={() => onNavigate('record')} aria-label="녹음 화면으로 돌아가기">‹</button>
      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => {
          const canChooseAnswer = quoteStep === 'questions' && message.from === 'ai' && index === messages.length - 1
          const options = canChooseAnswer ? (analysis?.questions[0]?.options ?? []) : []
          return <div className={`chat-bubble ${message.from}`} key={message.responseId ?? `${index}-${message.text}`}>
            {message.from === 'ai' && <img className="chat-bot-avatar" src="/images/hansul-mark-alt.png" alt="" />}
            <div className="chat-bubble-body">
              {message.from === 'ai' && <span className="chat-bot-name">한술봇</span>}
              <p>{message.text}</p>
              {options.length > 0 && <div className="answer-options" aria-label="추천 답변">
                {options.map((suggestion) => <button className={selectedSuggestion === suggestion ? 'is-selected' : ''} type="button" key={suggestion} onClick={() => void sendChatMessage(suggestion)} disabled={busy}>{suggestion}</button>)}
              </div>}
            </div>
          </div>
        })}
      </div>
      {screenError && <p className="chat-notice" role="alert">{screenError}</p>}
      {retryChatMessage && <button className="chat-retry" type="button" disabled={busy} onClick={() => void sendChatMessage(retryChatMessage)}>다시 보내기</button>}
      {chatAudioNeedsTap && <button type="button" className="chat-audio-retry" onClick={resumeChatAudio}>AI 답변 음성 재생하기</button>}
      {(quoteStep === 'questions' || quoteStep === 'input') && <form className="chat-compose" onSubmit={sendMessage}><button className={`chat-mic ${chatVoiceRecording ? 'is-recording' : ''}`} type="button" aria-label={chatVoiceRecording ? '음성 입력 마치기' : '음성 입력'} onClick={() => void toggleChatVoice()} disabled={busy}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg></button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={quoteStep === 'input' ? '전하고 싶은 한마디 (선택)' : '메시지를 입력해 주세요'} aria-label={quoteStep === 'input' ? '전승자 한마디' : '메시지'} /><button className="chat-send" type="submit" aria-label={quoteStep === 'input' ? '한마디 확정' : '전송'} disabled={busy || !draft.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 4 18 8-18 8 3-8-3-8Z"/><path d="M6 12h15"/></svg></button></form>}
      {quoteStep === 'confirmed' && <div className="quote-review"><p>확정한 한마디: “{transmitterQuote}”</p><button type="button" disabled={busy} onClick={() => { setDraft(transmitterQuote); setQuoteStep('input') }}>한마디 수정</button></div>}
      {quoteStep === 'skipped' && <p className="quote-review">한마디 없이 레시피를 발행할게요.</p>}
      {quoteStep === 'input' && <button className="quote-skip" type="button" disabled={busy || chatVoiceRecording} onClick={() => { setDraft(''); setTransmitterQuote(''); setQuoteStep('skipped') }}>한마디 건너뛰기</button>}
      <button className="feature-primary chat-next" type="button" disabled={busy || !draftId || quoteStep === 'input'} onClick={() => void analyzeAndPublish()}>{busy ? '정리하고 있어요…' : quoteStep === 'questions' ? '레시피 만들러 가기 →' : quoteStep === 'input' ? '한마디를 입력하거나 건너뛰어 주세요' : '레시피 발행하기 →'}</button>
      <span className="journey-step-text" aria-live="polite">{analysis ? '레시피 정리 정보를 준비했어요' : '음식 이야기를 나누는 중이에요'}</span>
    </main>
  )

  if (page === 'recipe') return (
    <main className="feature-page recipe-page">
      {screenError && <p role="alert">{screenError}</p>}
      {!recipeId && <p role="alert">레시피를 찾을 수 없어요.</p>}
      {!recipe && recipeId && !screenError && <div className="recipe-loading" role="status" aria-label="레시피를 불러오는 중">
        <div className="recipe-loading-cover cook-skeleton" aria-hidden="true" />
        <div className="recipe-loading-details">
          <div className="cook-skeleton recipe-loading-title" aria-hidden="true" />
          <div className="cook-skeleton recipe-loading-author" aria-hidden="true" />
          <div className="cook-skeleton recipe-loading-quote" aria-hidden="true" />
          <div className="cook-skeleton recipe-loading-lines" aria-hidden="true" />
        </div>
        <span className="visually-hidden">레시피를 불러오는 중이에요.</span>
      </div>}
      {recipe && <>
        <section className="recipe-hero">
          <RecipePhoto className="recipe-detail-image" src={recipe.hero_image_url} title={recipe.title} />
          <span className="recipe-hero-gradient" />
          <button className="recipe-back" type="button" onClick={() => onNavigate('home')} aria-label="뒤로가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
          <div className="recipe-hero-actions">
            <div className="recipe-hero-action">
              <button type="button" onClick={() => void toggleRecipe(recipe.recipe_id, 'like').then((value) => setRecipe({ ...recipe, is_liked: value.liked, like_count: value.like_count }))} aria-label={recipe.is_liked ? '좋아요 취소' : '좋아요'} aria-pressed={recipe.is_liked}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 4.1-8.8 10-8.8 10S3.2 12.8 3.2 8.7a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3Z" /></svg>
              </button><span>{recipe.like_count}</span>
            </div>
            <div className="recipe-hero-action">
              <button type="button" onClick={() => void toggleRecipe(recipe.recipe_id, 'save').then((value) => setRecipe({ ...recipe, is_saved: value.saved, save_count: value.save_count }))} aria-label={recipe.is_saved ? '스크랩 취소' : '스크랩'} aria-pressed={recipe.is_saved}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4-6 4z" /></svg>
              </button><span>{recipe.save_count}</span>
            </div>
          </div>
          <h1>{recipe.title}</h1>
        </section>
        <div className="recipe-detail-content">
          <button className="recipe-author" type="button" onClick={() => recipe.transmitter_id && navigate(`/users/${encodeURIComponent(recipe.transmitter_id)}`)} disabled={!recipe.transmitter_id} aria-label={`${recipe.transmitter_name} 전승자 프로필 보기`}>
            {recipe.transmitter_avatar_url ? <img src={recipe.transmitter_avatar_url} alt="" /> : <span className="recipe-author-fallback" aria-hidden="true">{recipe.transmitter_name.slice(0, 1)}</span>}
            <div><strong>{recipe.transmitter_name} 전승자</strong>{recipe.transmitter_region && <small>{recipe.transmitter_region}</small>}</div>
          </button>
          {(recipe.transmitter_quote || recipe.voice_message_url) && <div className="recipe-quote-card">
            {(recipe.voice_message_url || recipe.transmitter_quote) && <button className="recipe-quote-play" type="button" onClick={() => void toggleQuoteAudio()} aria-label={quotePlaying ? '한마디 음성 일시정지' : recipe.voice_message_url ? '한마디 음성 재생' : '한마디 기기 음성으로 읽기'}>
              <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5.5 6.5h7a4 4 0 0 1 4 4v15a4 4 0 0 0-4-3.5h-7zM26.5 6.5h-6a4 4 0 0 0-4 4v15a4 4 0 0 1 4-3.5h6z"/><rect x="22" y="12" width="3" height="6" rx="1.5"/><path d="M20.5 16v1a3 3 0 0 0 6 0v-1m-3 4v2m-2 0h4"/></svg>
            </button>}
            <div>{recipe.transmitter_quote && <p>“{recipe.transmitter_quote}”</p>}</div>
            {recipe.voice_message_url && <audio ref={quoteAudio} src={recipe.voice_message_url} onPause={() => setQuotePlaying(false)} onEnded={() => setQuotePlaying(false)} onError={() => setScreenError('전승자의 음성을 재생하지 못했어요.')} />}
          </div>}
          <div className="recipe-stats"><span>{recipe.cooking_time}분 <small>조리시간</small></span><span>{recipe.difficulty} <small>난이도</small></span><span>{recipe.servings}인분 <small>인분</small></span></div>
          <h3>재료</h3><ul>{recipe.ingredients.map((item) => <li key={item.name}>{item.name} <span>{item.amount ?? ''}{item.unit ?? ''}</span></li>)}</ul>
          <button className="feature-primary" type="button" onClick={() => { setCookStep(0); setScreenError(''); navigate(cookPath(recipeId)) }}>단계별로 따라 만들기</button>
        </div>
      </>}
    </main>
  )

  if (page === 'cook') {
    const steps = recipe?.steps ?? []
    const step = steps[cookStep]
    const currentImageStatus = stepImageStatus?.recipeId === recipe?.recipe_id ? stepImageStatus : null
    if (!step) return (
      <main className="feature-page cook-page">
        <header className="cook-topbar">
          <div className="cook-segments" aria-label="조리 단계 불러오는 중"><span className="is-current" /><span /><span /></div>
          <button type="button" onClick={() => navigate(recipePath(recipeId))} aria-label="레시피로 돌아가기">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        </header>
        {screenError || !recipeId
          ? <p className="cook-error" role="alert">{screenError || '레시피를 찾을 수 없어요.'}</p>
          : <div className="cook-loading" role="status" aria-label="조리 단계를 불러오는 중">
            <span className="cook-skeleton cook-skeleton-heading" aria-hidden="true" />
            <span className="cook-skeleton cook-skeleton-photo" aria-hidden="true" />
            <span className="cook-skeleton cook-skeleton-line" aria-hidden="true" />
            <span className="cook-skeleton cook-skeleton-line is-short" aria-hidden="true" />
            <span className="cook-skeleton cook-skeleton-tip" aria-hidden="true" />
            <span className="visually-hidden">조리 단계를 불러오는 중이에요.</span>
          </div>}
        <nav className="cook-controls is-first" aria-label="조리 단계 이동">
          <button className="feature-primary" type="button" disabled>다음 단계</button>
        </nav>
      </main>
    )
    return (
      <main className="feature-page cook-page">
        <header className="cook-topbar">
          <div className="cook-segments" aria-label={`${cookStep + 1} / ${steps.length} 단계`}>
            {steps.map((item, index) => <span key={item.order} className={index === cookStep ? 'is-current' : ''} />)}
          </div>
          <button type="button" onClick={() => navigate(recipePath(recipeId))} aria-label="레시피로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
        </header>
        {screenError && <p className="cook-error" role="alert">{screenError}</p>}
        {currentImageStatus && currentImageStatus.failedOrders.length > 0 && <div className="cook-image-failure" role="alert">
          <p>{currentImageStatus.requestFailed
            ? '단계 이미지 생성 요청에 실패했어요. 다시 시도할 수 있어요.'
            : `${currentImageStatus.failedOrders.length}개 단계의 이미지를 생성하지 못했어요. 다시 시도할 수 있어요.`}</p>
          <button type="button" disabled={currentImageStatus.generating} onClick={() => { if (recipe) void requestStepImages(recipe) }}>{currentImageStatus.generating ? '이미지 재시도 중…' : '이미지 다시 시도하기'}</button>
        </div>}
        <p className="cook-step-title">{cookStep + 1}. {step.title}</p>
        <div className="cook-media">
          <RecipePhoto className="cook-image" src={step.image_url || recipe?.hero_image_url} title={step.title} />
          {currentImageStatus?.generating && !step.image_url && <div className="cook-image-overlay" role="status">
            <span className="cook-spinner" aria-hidden="true" />이미지를 만드는 중이에요
          </div>}
        </div>
        {!step.image_url && currentImageStatus?.failedOrders.includes(step.order) && <p className="cook-image-fallback-note">이 단계의 이미지 대신 임시 이미지를 보여드리고 있어요.</p>}
        <p className="cook-description">{step.description}</p>
        {step.tip && <div className="cook-ai-tip"><img className="cook-ai-icon" src="/images/ai-tip-icon.png" alt="" /><span>{step.tip}</span></div>}
        <nav className={`cook-controls ${cookStep === 0 ? 'is-first' : ''}`}>
          {cookStep > 0 && <button className="cook-prev" type="button" onClick={() => setCookStep((stepIndex) => stepIndex - 1)}>이전 단계</button>}
          <button className="feature-primary" type="button" onClick={() => cookStep === steps.length - 1 ? onNavigate('home') : setCookStep((stepIndex) => stepIndex + 1)}>{cookStep === steps.length - 1 ? '요리 끝내기' : '다음 단계'}</button>
        </nav>
      </main>
    )
  }


  if (page === 'monthly') return (
    <main className="feature-page monthly-page">
      <header className="monthly-header">
        <button className="monthly-back" type="button" aria-label="뒤로" onClick={() => onNavigate('home')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h1>이달의 전승 음식 TOP 6</h1>
      </header>
      <div className="food-list" aria-label="이달의 전승 음식 TOP 6">
        {monthlyLoading && <div className="monthly-loading" role="status" aria-label="이달의 순위를 불러오는 중">
          <div className="monthly-loading-row cook-skeleton" aria-hidden="true" />
          <div className="monthly-loading-row cook-skeleton" aria-hidden="true" />
          <div className="monthly-loading-row cook-skeleton" aria-hidden="true" />
          <span className="visually-hidden">이달의 순위를 불러오는 중이에요.</span>
        </div>}
        {screenError && <p role="alert">{screenError}</p>}
        {!monthlyLoading && !screenError && monthlyRecipes.length === 0 && <p className="monthly-empty">아직 이번 달에 소개할 전승 음식이 없어요.</p>}
        {!monthlyLoading && monthlyRecipes.map((item, index) => {
          const detail = monthlyDetails[item.recipe_id]
          const title = item.title || '이름 없는 레시피'
          const rank = String(item.rank ?? index + 1).padStart(2, '0')
          const transmitterMeta = [detail?.transmitter_region, detail?.transmitter_name ? `${detail.transmitter_name} 전승자` : null]
            .filter(Boolean).join(' · ')
          return <article className="monthly-card" key={item.recipe_id}>
            <button className="monthly-card-open" type="button"
              aria-label={`${rank} ${title} 레시피 보기`}
              onClick={() => navigate(recipePath(item.recipe_id))}>
              <div className="monthly-card-media">
                <RecipePhoto src={detail?.hero_image_url || item.hero_image_url} title={title} />
              </div>
              <div className="monthly-card-info">
                <h2><span className="monthly-rank">{rank}</span> {title}</h2>
                {transmitterMeta && <small>{transmitterMeta}</small>}
              </div>
            </button>
            <div className="monthly-reactions" aria-label={`${title} 좋아요와 스크랩`}>
              <button type="button" disabled={!detail || monthlyActionBusy === item.recipe_id}
                aria-pressed={detail?.is_liked ?? false}
                aria-label={`${title} ${detail?.is_liked ? '좋아요 취소' : '좋아요'}`}
                onClick={() => void updateMonthlyReaction(item.recipe_id, 'like')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 4.1-8.8 10-8.8 10S3.2 12.8 3.2 8.7a4.5 4.5 0 0 1 8.8 1.3 4.5 4.5 0 0 1 8.8 1.3Z"/></svg>
                {detail ? detail.like_count : '—'}
              </button>
              <button type="button" disabled={!detail || monthlyActionBusy === item.recipe_id}
                aria-pressed={detail?.is_saved ?? false}
                aria-label={`${title} ${detail?.is_saved ? '스크랩 취소' : '스크랩'}`}
                onClick={() => void updateMonthlyReaction(item.recipe_id, 'save')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>
                {detail ? detail.save_count : '—'}
              </button>
            </div>
          </article>
        })}
      </div>
    </main>
  )

  return (
    <main className="feature-page"><PageHeader title="마이페이지" onBack={() => onNavigate('home')} /><div className="profile-summary"><div className="profile-avatar">{(name || '한술').slice(0, 1)}</div><h2>{name || '한술'}님</h2><p>{region || '지역 미설정'} · 음식 이야기 기록자</p></div><div className="profile-stats"><span><b>2</b>전승 레시피</span><span><b>8</b>저장한 맛</span><span><b>34</b>받은 좋아요</span></div><div className="profile-tabs"><button type="button">나의 레시피</button><button type="button">저장한 맛</button></div><div className="profile-foods">관심 음식 {favoriteFoods.map((food) => <span key={food}>{food}</span>)}</div><button className="feature-primary" type="button" onClick={() => onNavigate('record')}>우리 집 음식 기록하기 <span>→</span></button></main>
  )
}

export default PostOnboardingScreens

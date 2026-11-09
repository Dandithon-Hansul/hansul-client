import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { cookPath, recipePath } from '../../app/paths'
import { IS_MOCK } from '../../lib/env'
import { useAuth } from '../auth/auth-context'
import { analyzeRecipe, createRecipe, generateStepImages, getRecipe, sendRecipeChat, toggleRecipe, transcribe, sttAudioPath, uploadSignedFile, vectorizeSensoryProfile, type AnalysisResult, type RecipeDetail } from '../../lib/api/recipes'
import { getMonthlyTopRecipes, type HomeRecipe } from '../../lib/api/home'
import { appendChatStreamChunk, CHAT_PENDING_TEXT, type ChatMessage } from './chatStream'
import { failedStepImageOrders, mergeStepImages } from './stepImageGeneration'
import './post-onboarding.css'

export type FeaturePage = 'record' | 'chat' | 'map' | 'profile' | 'monthly' | 'recipe' | 'cook'

type Props = { page: FeaturePage; name: string; region: string; favoriteFoods: string[]; onNavigate: (page: 'home' | FeaturePage) => void }

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="feature-header"><button type="button" onClick={onBack} aria-label="뒤로">‹</button><h1>{title}</h1><span /></header>
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
  const [transcript, setTranscript] = useState('')
  const [recordError, setRecordError] = useState('')
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [monthlyRecipes, setMonthlyRecipes] = useState<HomeRecipe[]>([])
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [screenError, setScreenError] = useState('')
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
  // 예시 레시피(대구식 육개장)는 mock 에서만. 실제 서버에선 이 id 가 없어서 400
  const recipeId = searchParams.get('id') || draftId || (IS_MOCK ? 'r-daegu-yukgaejang' : '')
  useEffect(() => {
    if (page === 'recipe' || page === 'cook') {
      if (!recipeId) return undefined
      let active = true
      getRecipe(recipeId).then((data) => { if (active) setRecipe(data) }).catch(() => { if (active) setScreenError('레시피를 불러오지 못했어요.') })
      return () => { active = false }
    }
    if (page === 'monthly') {
      let active = true
      setMonthlyLoading(true)
      setScreenError('')
      getMonthlyTopRecipes()
        .then((recipes) => { if (active) setMonthlyRecipes(recipes) })
        .catch(() => { if (active) { setMonthlyRecipes([]); setScreenError('이달의 전승 음식 순위를 불러오지 못했어요.') } })
        .finally(() => { if (active) setMonthlyLoading(false) })
      return () => { active = false }
    }
    return undefined
  }, [page, recipeId])

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
        const file = new File([new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })], 'recording.webm', { type: recorder.mimeType || 'audio/webm' })
        void (async () => {
          setBusy(true)
          try {
            const signed = await uploadSignedFile(file, 'stt_audio')
            const result = await transcribe({ audio_path: sttAudioPath(signed) })
            setTranscript(result.transcript)
            setDraftId(result.recipe_id)
            if (recordPhoto) {
              const photo = await uploadSignedFile(recordPhoto, 'chat_image', result.recipe_id)
              setChatImagePath(photo.path)
              setRecordPhoto(null)
            }
          } catch { setRecordError('음성을 전사하지 못했어요. 다시 녹음해 주세요.') }
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

  async function continueToChat() {
    if (!draftId) return
    setBusy(true)
    setScreenError('')
    try {
      const result = await analyzeRecipe(draftId)
      setAnalysis(result)
      setQuoteStep('questions')
      setTransmitterQuote('')
      if (result.questions.length) {
        setMessages([{ from: 'ai', text: result.questions[0].question }])
      } else {
        setMessages([])
        beginQuoteStep()
      }
    } catch {
      setMessages([{ from: 'ai', text: '이 음식에 대해 더 자세히 이야기해 주세요.' }])
      setScreenError('질문을 불러오지 못했어요. 메시지를 보내면 대화를 이어갈 수 있어요.')
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
    setDraft('')
    stopChatAudio()
    setBusy(true)
    try {
      let answerText = ''
      let hasAudioSegments = false
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
        if (event.event === 'error') setScreenError(String(event.data.message ?? '채팅 처리 중 오류가 발생했어요.'))
      })
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
      setScreenError('메시지를 보내지 못했어요.')
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
        const file = new File([new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })], 'chat-recording.webm', { type: recorder.mimeType || 'audio/webm' })
        void (async () => {
          setBusy(true)
          try {
            const signed = await uploadSignedFile(file, 'stt_audio', draftId || undefined)
            const result = await transcribe({ audio_path: sttAudioPath(signed), ...(draftId ? { recipe_id: draftId } : {}) })
            if (result.transcript) setDraft(result.transcript)
          } catch { setScreenError('음성을 전사하지 못했어요.') }
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
    if (!audio) return
    if (audio.paused) {
      try { await audio.play(); setQuotePlaying(true) }
      catch { setScreenError('전승자의 음성을 재생하지 못했어요.') }
    } else {
      audio.pause()
      setQuotePlaying(false)
    }
  }

  async function analyzeAndPublish() {
    setBusy(true); setScreenError('')
    try {
      if (quoteStep === 'questions') {
        const result = await analyzeRecipe(draftId || 'draft-mock')
        setAnalysis(result)
        if (result.questions.length) {
          setMessages((current) => [...current, { from: 'ai', text: result.questions[0].question }])
        } else {
          beginQuoteStep()
        }
        return
      }
      if (quoteStep === 'input') return
      const published = await createRecipe(draftId || 'draft-mock', quoteStep === 'confirmed' ? transmitterQuote : undefined)
      setDraftId(published.recipe_id)
      navigate(`/recipe?id=${encodeURIComponent(published.recipe_id)}`)
    } catch { setScreenError('레시피 분석 또는 발행에 실패했어요.') }
    finally { setBusy(false) }
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
      <PageHeader title="AI 음성 기록" onBack={() => onNavigate('home')} />
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
        {transcript && <div className="record-transcript" aria-live="polite"><span>음성 전사</span><p>{transcript}</p></div>}
        <button className="record-finish" type="button" disabled={busy || recordingSeconds < 5 || (!draftId && !recording && mediaRecorder.current?.state !== 'paused')} onClick={() => { if (recording || mediaRecorder.current?.state === 'paused') finishRecording(); else void continueToChat() }}>기록 마무리 하기</button>
      </div>
    </main>
  )

  if (page === 'chat') return (
    <main className="feature-page chat-page">
      <PageHeader title="음식 이야기" onBack={() => onNavigate('record')} />
      <div className="chat-context"><span>AI 음성 기록</span><h2>어떤 음식의 이야기를<br />남겨볼까요?</h2></div>
      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => <div className={`chat-bubble ${message.from}`} key={message.responseId ?? `${index}-${message.text}`}>{message.from === 'ai' && <img src="/logo.svg" alt="한술" />}<p>{message.text}</p></div>)}
      </div>
      {screenError && <p role="alert">{screenError}</p>}
      {chatAudioNeedsTap && <button type="button" className="chat-audio-retry" onClick={resumeChatAudio}>AI 답변 음성 재생하기</button>}
      {quoteStep === 'questions' && <div className="answer-options" aria-label="추천 답변">{(analysis?.questions[0]?.options ?? []).map((suggestion) => <button className={selectedSuggestion === suggestion ? 'is-selected' : ''} type="button" key={suggestion} onClick={() => void sendChatMessage(suggestion)} disabled={busy}>{suggestion}</button>)}</div>}
      {(quoteStep === 'questions' || quoteStep === 'input') && <form className="chat-compose" onSubmit={sendMessage}><button className={`chat-mic ${chatVoiceRecording ? 'is-recording' : ''}`} type="button" aria-label={chatVoiceRecording ? '음성 입력 마치기' : '음성 입력'} onClick={() => void toggleChatVoice()} disabled={busy}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg></button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={quoteStep === 'input' ? '전하고 싶은 한마디 (선택)' : '메시지를 입력해 주세요'} aria-label={quoteStep === 'input' ? '전승자 한마디' : '메시지'} /><button className="chat-send" type="submit" aria-label={quoteStep === 'input' ? '한마디 확정' : '전송'} disabled={busy || !draft.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 4 18 8-18 8 3-8-3-8Z"/><path d="M6 12h15"/></svg></button></form>}
      {quoteStep === 'confirmed' && <div className="quote-review"><p>확정한 한마디: “{transmitterQuote}”</p><button type="button" disabled={busy} onClick={() => { setDraft(transmitterQuote); setQuoteStep('input') }}>한마디 수정</button></div>}
      {quoteStep === 'skipped' && <p className="quote-review">한마디 없이 레시피를 발행할게요.</p>}
      {quoteStep === 'input' && <button className="quote-skip" type="button" disabled={busy || chatVoiceRecording} onClick={() => { setDraft(''); setTransmitterQuote(''); setQuoteStep('skipped') }}>한마디 건너뛰기</button>}
      <button className="feature-primary chat-next" type="button" disabled={busy || !draftId || quoteStep === 'input'} onClick={() => void analyzeAndPublish()}>{busy ? '정리하고 있어요…' : quoteStep === 'questions' ? '레시피 만들러 가기 →' : quoteStep === 'input' ? '한마디를 입력하거나 건너뛰어 주세요' : '레시피 발행하기 →'}</button>
      {analysis && <p className="feature-muted">재료 {analysis.structured.ingredients.length}개 · 조리 단계 {analysis.structured.steps.length}개를 분석했어요.</p>}
      <button type="button" disabled={busy} onClick={() => { setBusy(true); void vectorizeSensoryProfile().then(() => setScreenError('손맛 프로파일을 업데이트했어요.')).catch(() => setScreenError('감각 기록이 더 쌓인 뒤 다시 시도해주세요.')).finally(() => setBusy(false)) }}>손맛 프로파일 업데이트</button>
    </main>
  )

  if (page === 'recipe') return (
    <main className="feature-page recipe-page">
      {screenError && <p role="alert">{screenError}</p>}
      {!recipeId && <p role="alert">레시피를 찾을 수 없어요.</p>}
      {recipe && <>
        <section className="recipe-hero">
          <img className="recipe-detail-image" src={recipe.hero_image_url ?? '/images/andong-jjimdak.png'} alt={recipe.title} />
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
            {recipe.voice_message_url && <button className="recipe-quote-play" type="button" onClick={() => void toggleQuoteAudio()} aria-label={quotePlaying ? '한마디 음성 일시정지' : '한마디 음성 재생'}>
              <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5.5 6.5h7a4 4 0 0 1 4 4v15a4 4 0 0 0-4-3.5h-7zM26.5 6.5h-6a4 4 0 0 0-4 4v15a4 4 0 0 1 4-3.5h6z"/><rect x="22" y="12" width="3" height="6" rx="1.5"/><path d="M20.5 16v1a3 3 0 0 0 6 0v-1m-3 4v2m-2 0h4"/></svg>
            </button>}
            {recipe.transmitter_quote && <p>“{recipe.transmitter_quote}”</p>}
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
    if (!step) return <main className="feature-page"><PageHeader title="단계별 조리" onBack={() => navigate(recipePath(recipeId))} /><p>{screenError || (recipeId ? '조리 단계를 불러오는 중…' : '레시피를 찾을 수 없어요.')}</p></main>
    return (
      <main className="feature-page cook-page">
        <header className="cook-topbar">
          <button type="button" onClick={() => navigate(recipePath(recipeId))} aria-label="레시피로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
          <div className="cook-segments" aria-label={`${cookStep + 1} / ${steps.length} 단계`}>
            {steps.map((item, index) => <span key={item.order} className={index === cookStep ? 'is-current' : ''} />)}
          </div>
        </header>
        {screenError && <p className="cook-error" role="alert">{screenError}</p>}
        {currentImageStatus?.generating && <p className="cook-image-progress" role="status">단계 이미지를 생성하고 있어요. 조리는 계속할 수 있어요.</p>}
        {currentImageStatus && currentImageStatus.failedOrders.length > 0 && <div className="cook-image-failure" role="alert">
          <p>{currentImageStatus.requestFailed
            ? '단계 이미지 생성 요청에 실패했어요. 다시 시도할 수 있어요.'
            : `${currentImageStatus.failedOrders.length}개 단계의 이미지를 생성하지 못했어요. 다시 시도할 수 있어요.`}</p>
          <button type="button" disabled={currentImageStatus.generating} onClick={() => { if (recipe) void requestStepImages(recipe) }}>{currentImageStatus.generating ? '이미지 재시도 중…' : '이미지 다시 시도하기'}</button>
        </div>}
        <p className="cook-step-title">{cookStep + 1}. {step.title}</p>
        <img className="cook-image" src={step.image_url ?? recipe?.hero_image_url ?? '/images/andong-jjimdak.png'} alt={step.title} />
        {!step.image_url && currentImageStatus?.failedOrders.includes(step.order) && <p className="cook-image-fallback-note">이 단계의 이미지 대신 임시 이미지를 보여드리고 있어요.</p>}
        <p className="cook-description">{step.description}</p>
        {step.tip && <div className="cook-ai-tip"><span className="cook-ai-mark" aria-hidden="true">AI</span><span>{step.tip}</span></div>}
        <nav className={`cook-controls ${cookStep === 0 ? 'is-first' : ''}`}>
          {cookStep > 0 && <button className="cook-prev" type="button" onClick={() => setCookStep((stepIndex) => stepIndex - 1)}>이전 단계</button>}
          <button className="feature-primary" type="button" onClick={() => cookStep === steps.length - 1 ? onNavigate('home') : setCookStep((stepIndex) => stepIndex + 1)}>{cookStep === steps.length - 1 ? '요리 끝내기' : '다음 단계'}</button>
        </nav>
      </main>
    )
  }

  if (page === 'monthly') return (
    <main className="feature-page">
      <PageHeader title="이달의 전승 음식 TOP 6" onBack={() => onNavigate('home')} />
      <div className="food-list">
        <p className="feature-muted">이번 달 좋아요·저장 활동을 기준으로 선정했어요.</p>
        {monthlyLoading && <p role="status">이달의 순위를 불러오는 중…</p>}
        {screenError && <p role="alert">{screenError}</p>}
        {!monthlyLoading && !screenError && monthlyRecipes.length === 0 && <p>아직 이번 달에 소개할 전승 음식이 없어요.</p>}
        {monthlyRecipes.map((item, index) => (
          <button className="food-list-card" type="button" key={item.recipe_id} onClick={() => navigate(recipePath(item.recipe_id))}>
            <img src={item.hero_image_url ?? '/images/andong-jjimdak.png'} alt="" />
            <span><b>{String(item.rank ?? index + 1).padStart(2, '0')} {item.title || '이름 없는 레시피'}</b></span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </main>
  )

  return (
    <main className="feature-page"><PageHeader title="마이페이지" onBack={() => onNavigate('home')} /><div className="profile-summary"><div className="profile-avatar">{(name || '한술').slice(0, 1)}</div><h2>{name || '한술'}님</h2><p>{region || '지역 미설정'} · 음식 이야기 기록자</p></div><div className="profile-stats"><span><b>2</b>전승 레시피</span><span><b>8</b>저장한 맛</span><span><b>34</b>받은 좋아요</span></div><div className="profile-tabs"><button type="button">나의 레시피</button><button type="button">저장한 맛</button></div><div className="profile-foods">관심 음식 {favoriteFoods.map((food) => <span key={food}>{food}</span>)}</div><button className="feature-primary" type="button" onClick={() => onNavigate('record')}>우리 집 음식 기록하기 <span>→</span></button></main>
  )
}

export default PostOnboardingScreens

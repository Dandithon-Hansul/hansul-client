import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { analyzeRecipe, attachStepPhoto, createRecipe, evaluateRecipe, generateStepImages, getRecipe, getRecipes, sendRecipeChat, toggleRecipe, transcribe, uploadSignedFile, vectorizeSensoryProfile, type AnalysisResult, type RecipeDetail, type RecipeListItem } from '../../lib/api/recipes'
import './post-onboarding.css'

export type FeaturePage = 'record' | 'chat' | 'map' | 'profile' | 'monthly' | 'recipe' | 'cook'

type Props = { page: FeaturePage; name: string; region: string; favoriteFoods: string[]; onNavigate: (page: 'home' | FeaturePage) => void }

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="feature-header"><button type="button" onClick={onBack} aria-label="뒤로">‹</button><h1>{title}</h1><span /></header>
}

function PostOnboardingScreens({ page, name, region, favoriteFoods, onNavigate }: Props) {
  const navigate = useNavigate()
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordPhoto, setRecordPhoto] = useState<File | null>(null)
  const [draft, setDraft] = useState('')
  const [chatVoiceRecording, setChatVoiceRecording] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState('')
  const [chatImagePath, setChatImagePath] = useState<string | undefined>()
  const [messages, setMessages] = useState<Array<{ from: 'ai' | 'user'; text: string }>>([
    { from: 'ai', text: '오늘은 어떤 음식의 이야기를 남겨볼까요?' },
  ])
  const [mapRegion, setMapRegion] = useState('대구광역시')
  const [cookStep, setCookStep] = useState(0)
  const [searchParams] = useSearchParams()
  const [draftId, setDraftId] = useState('')
  const [transcript, setTranscript] = useState('')
  const [recordError, setRecordError] = useState('')
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [monthlyRecipes, setMonthlyRecipes] = useState<RecipeListItem[]>([])
  const [screenError, setScreenError] = useState('')
  const [busy, setBusy] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [evaluationText, setEvaluationText] = useState('')
  const [quotePlaying, setQuotePlaying] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const mediaStream = useRef<MediaStream | null>(null)
  const chatMediaRecorder = useRef<MediaRecorder | null>(null)
  const chatMediaStream = useRef<MediaStream | null>(null)
  const quoteAudio = useRef<HTMLAudioElement | null>(null)
  const imageGenerationRequested = useRef(new Set<string>())
  const recipeId = searchParams.get('id') || draftId || 'r-daegu-yukgaejang'
  useEffect(() => {
    if (page === 'recipe' || page === 'cook') {
      let active = true
      getRecipe(recipeId).then((data) => { if (active) setRecipe(data) }).catch(() => { if (active) setScreenError('레시피를 불러오지 못했어요.') })
      return () => { active = false }
    }
    if (page === 'monthly') {
      let active = true
      getRecipes().then((data) => { if (active) setMonthlyRecipes(data.recipes) }).catch(() => { if (active) setScreenError('레시피 목록을 불러오지 못했어요.') })
      return () => { active = false }
    }
    return undefined
  }, [page, recipeId])

  useEffect(() => {
    if (page !== 'cook' || !recipe || recipe.recipe_id !== recipeId) return
    const hasMissingStepImage = recipe.steps.slice(0, -1).some((step) => !step.image_url)
    if (!hasMissingStepImage || imageGenerationRequested.current.has(recipe.recipe_id)) return
    imageGenerationRequested.current.add(recipe.recipe_id)
    void generateStepImages(recipe.recipe_id).then((result) => {
      setRecipe((current) => current && current.recipe_id === recipe.recipe_id ? {
        ...current,
        steps: current.steps.map((step) => {
          const generated = result.generated.find((image) => image.order === step.order)
          return generated ? { ...step, image_url: generated.image_url } : step
        }),
      } : current)
    }).catch(() => setScreenError('단계 이미지를 불러오지 못했어요.'))
  }, [page, recipe, recipeId])

  useEffect(() => () => mediaStream.current?.getTracks().forEach((track) => track.stop()), [])
  useEffect(() => () => chatMediaStream.current?.getTracks().forEach((track) => track.stop()), [])

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
            const result = await transcribe({ audio_path: signed.path })
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

  async function continueToChat() {
    if (!draftId) return
    setBusy(true)
    setScreenError('')
    try {
      const result = await analyzeRecipe(draftId)
      setAnalysis(result)
      if (result.questions.length) {
        setMessages([{ from: 'ai', text: result.questions[0].question }])
      } else {
        setMessages([{ from: 'ai', text: transcript || '이 음식 이야기를 조금 더 들려주세요.' }])
      }
    } catch {
      setMessages([{ from: 'ai', text: '이 음식에 대해 더 자세히 이야기해 주세요.' }])
      setScreenError('질문을 불러오지 못했어요. 메시지를 보내면 대화를 이어갈 수 있어요.')
    } finally {
      setBusy(false)
      onNavigate('chat')
    }
  }

  async function sendChatMessage(message: string) {
    const recipe_id = draftId || 'draft-mock'
    setMessages((current) => [...current, { from: 'user', text: message }])
    setSelectedSuggestion(message)
    setDraft('')
    setBusy(true)
    try {
      let answerText = ''
      await sendRecipeChat({ recipe_id, message, ...(chatImagePath ? { image_path: chatImagePath } : {}), tts: false }, (event) => {
        if (event.event === 'chunk' && typeof event.data.text === 'string') {
          answerText += event.data.text
          setMessages((current) => {
            const withoutPending = current.at(-1)?.from === 'ai' && current.at(-1)?.text === '답변을 작성하고 있어요…' ? current.slice(0, -1) : current
            return [...withoutPending, { from: 'ai', text: answerText }]
          })
        }
        if (event.event === 'error') setScreenError(String(event.data.message ?? '채팅 처리 중 오류가 발생했어요.'))
      })
      if (analysis?.questions.length) {
        const nextAnalysis = await analyzeRecipe(recipe_id)
        setAnalysis(nextAnalysis)
        const nextQuestion = nextAnalysis.questions[0]?.question
        if (nextQuestion && !answerText.includes(nextQuestion)) {
          setMessages((current) => [...current, { from: 'ai', text: nextQuestion }])
        }
      }
      setChatImagePath(undefined)
    } catch { setScreenError('메시지를 보내지 못했어요.') }
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
            const result = await transcribe({ audio_path: signed.path, ...(draftId ? { recipe_id: draftId } : {}) })
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
      const result = await analyzeRecipe(draftId || 'draft-mock')
      setAnalysis(result)
      if (result.questions.length) {
        setMessages((current) => [...current, { from: 'ai', text: result.questions.map((item) => item.question).join('\n') }])
        return
      }
      const published = await createRecipe(draftId || 'draft-mock')
      setDraftId(published.recipe_id)
      navigate(`/recipe?id=${encodeURIComponent(published.recipe_id)}`)
    } catch { setScreenError('레시피 분석 또는 발행에 실패했어요.') }
    finally { setBusy(false) }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim() || busy) return
    void sendChatMessage(draft.trim())
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
        {messages.map((message, index) => <div className={`chat-bubble ${message.from}`} key={`${index}-${message.text}`}>{message.from === 'ai' && <img src="/logo.svg" alt="한술" />}<p>{message.text}</p></div>)}
      </div>
      {screenError && <p role="alert">{screenError}</p>}
      <div className="answer-options" aria-label="추천 답변">{(analysis?.questions[0]?.options ?? []).map((suggestion) => <button className={selectedSuggestion === suggestion ? 'is-selected' : ''} type="button" key={suggestion} onClick={() => void sendChatMessage(suggestion)} disabled={busy}>{suggestion}</button>)}</div>
      <form className="chat-compose" onSubmit={sendMessage}><button className={`chat-mic ${chatVoiceRecording ? 'is-recording' : ''}`} type="button" aria-label={chatVoiceRecording ? '음성 입력 마치기' : '음성 입력'} onClick={() => void toggleChatVoice()} disabled={busy}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg></button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="메시지를 입력해 주세요" aria-label="메시지" /><button className="chat-send" type="submit" aria-label="전송" disabled={busy || !draft.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 4 18 8-18 8 3-8-3-8Z"/><path d="M6 12h15"/></svg></button></form>
      <button className="feature-primary chat-next" type="button" disabled={busy || !draftId} onClick={() => void analyzeAndPublish()}>{busy ? '정리하고 있어요…' : '레시피 만들러 가기 →'}</button>
      {analysis && <p className="feature-muted">재료 {analysis.structured.ingredients.length}개 · 조리 단계 {analysis.structured.steps.length}개를 분석했어요.</p>}
      <button type="button" disabled={busy} onClick={() => { setBusy(true); void vectorizeSensoryProfile().then(() => setScreenError('손맛 프로파일을 업데이트했어요.')).catch(() => setScreenError('감각 기록이 더 쌓인 뒤 다시 시도해주세요.')).finally(() => setBusy(false)) }}>손맛 프로파일 업데이트</button>
    </main>
  )

  if (page === 'recipe') return (
    <main className="feature-page recipe-page">
      {screenError && <p role="alert">{screenError}</p>}
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
          <div className="recipe-author">
            {recipe.transmitter_avatar_url ? <img src={recipe.transmitter_avatar_url} alt="" /> : <span className="recipe-author-fallback" aria-hidden="true">{recipe.transmitter_name.slice(0, 1)}</span>}
            <div><strong>{recipe.transmitter_name} 전승자</strong>{recipe.transmitter_region && <small>{recipe.transmitter_region}</small>}</div>
          </div>
          <div className="recipe-quote-card">
            <button className="recipe-quote-play" type="button" onClick={() => void toggleQuoteAudio()} disabled={!recipe.voice_message_url} aria-label={quotePlaying ? '한마디 음성 일시정지' : '한마디 음성 재생'}>
              <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5.5 6.5h7a4 4 0 0 1 4 4v15a4 4 0 0 0-4-3.5h-7zM26.5 6.5h-6a4 4 0 0 0-4 4v15a4 4 0 0 1 4-3.5h6z"/><rect x="22" y="12" width="3" height="6" rx="1.5"/><path d="M20.5 16v1a3 3 0 0 0 6 0v-1m-3 4v2m-2 0h4"/></svg>
            </button>
            <p>“{recipe.transmitter_quote}”</p>
            {recipe.voice_message_url && <audio ref={quoteAudio} src={recipe.voice_message_url} onEnded={() => setQuotePlaying(false)} />}
          </div>
          <div className="recipe-stats"><span>{recipe.cooking_time}분 <small>조리시간</small></span><span>{recipe.difficulty} <small>난이도</small></span><span>{recipe.servings}인분 <small>인분</small></span></div>
          <h3>재료</h3><ul>{recipe.ingredients.map((item) => <li key={item.name}>{item.name} <span>{item.amount ?? ''}{item.unit ?? ''}</span></li>)}</ul>
          <button className="feature-primary" type="button" onClick={() => { setCookStep(0); onNavigate('cook') }}>단계별로 따라 만들기</button>
        </div>
      </>}
    </main>
  )

  if (page === 'cook') {
    const steps = recipe?.steps ?? []
    const step = steps[cookStep]
    if (!step) return <main className="feature-page"><PageHeader title="단계별 조리" onBack={() => onNavigate('recipe')} /><p>{screenError || '조리 단계를 불러오는 중…'}</p></main>
    return (
      <main className="feature-page cook-page">
        <header className="cook-topbar">
          <button type="button" onClick={() => onNavigate('recipe')} aria-label="레시피로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
          <div className="cook-segments" aria-label={`${cookStep + 1} / ${steps.length} 단계`}>
            {steps.map((item, index) => <span key={item.order} className={index === cookStep ? 'is-current' : ''} />)}
          </div>
        </header>
        {screenError && <p className="cook-error" role="alert">{screenError}</p>}
        <p className="cook-step-title">{cookStep + 1}. {step.title}</p>
        <img className="cook-image" src={step.image_url ?? recipe?.hero_image_url ?? '/images/andong-jjimdak.png'} alt={step.title} />
        <p className="cook-description">{step.description}</p>
        {step.tip && <div className="cook-ai-tip"><span className="cook-ai-mark" aria-hidden="true">AI</span><span>{step.tip}</span></div>}
        {cookStep === steps.length - 1 && <section className="cook-evaluation"><label className="photo-upload">완성 사진 추가<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void uploadSignedFile(file, 'step_photo', recipe!.recipe_id).then((signed) => attachStepPhoto(recipe!.recipe_id, step.order, signed.path)).then((result) => setRecipe((current) => current ? { ...current, steps: current.steps.map((item) => item.order === step.order ? { ...item, image_url: result.image_url } : item) } : current)).catch(() => setScreenError('완성 사진을 업로드하지 못했어요.')) }} /></label><p>요리는 어떠셨나요?</p><select aria-label="전체 만족도"><option value="3">만족</option><option value="2">보통</option><option value="1">아쉬움</option></select><button type="button" disabled={busy} onClick={() => { setBusy(true); setEvaluationText(''); void evaluateRecipe({ recipe_id: recipe!.recipe_id, evaluation: { salt: 0, consistency: 0, doneness: 0, overall: 3, rule_followed: true } }, (event) => { if (typeof event.data.text === 'string') setEvaluationText((value) => value + event.data.text) }).catch(() => setEvaluationText('평가를 저장하지 못했어요.')).finally(() => setBusy(false)) }}>맛 평가 받기</button>{evaluationText && <p>{evaluationText}</p>}</section>}
        <nav className={`cook-controls ${cookStep === 0 ? 'is-first' : ''}`}>
          {cookStep > 0 && <button className="cook-prev" type="button" onClick={() => setCookStep((stepIndex) => stepIndex - 1)}>이전 단계</button>}
          <button className="feature-primary" type="button" onClick={() => cookStep === steps.length - 1 ? onNavigate('home') : setCookStep((stepIndex) => stepIndex + 1)}>{cookStep === steps.length - 1 ? '요리 끝내기' : '다음 단계'}</button>
        </nav>
      </main>
    )
  }

  if (page === 'monthly') return (
    <main className="feature-page"><PageHeader title="이달의 전승 음식 TOP 6" onBack={() => onNavigate('home')} />{screenError && <p role="alert">{screenError}</p>}<div className="food-list">{monthlyRecipes.map((item, index) => <button className="food-list-card" type="button" key={item.recipe_id} onClick={() => navigate(`/recipe?id=${encodeURIComponent(item.recipe_id)}`)}><img src={item.hero_image_url ?? '/images/andong-jjimdak.png'} alt="" /><span><b>{String(index + 1).padStart(2, '0')} {item.title}</b><small>{item.region} · {item.transmitter_name} 전승자</small></span><span>›</span></button>)}</div></main>
  )

  if (page === 'map') return (
    <main className="feature-page"><PageHeader title="지역의 맛 지도" onBack={() => onNavigate('home')} /><div className="map-intro"><p className="feature-kicker">전승 음식 지도</p><h2>우리 동네의 맛을<br />찾아보세요</h2></div><div className="region-switch">{['대구광역시', '경상북도'].map((item) => <button className={mapRegion === item ? 'selected' : ''} type="button" key={item} onClick={() => setMapRegion(item)}>{item}</button>)}</div><div className="map-illustration"><div className="map-region">{mapRegion}<span>전승 음식</span><b>안동 찜닭</b><small>대구식 육개장</small></div></div><button className="feature-primary" type="button" onClick={() => onNavigate('monthly')}>{mapRegion} 인기 레시피 보기 <span>→</span></button></main>
  )

  return (
    <main className="feature-page"><PageHeader title="마이페이지" onBack={() => onNavigate('home')} /><div className="profile-summary"><div className="profile-avatar">{(name || '한술').slice(0, 1)}</div><h2>{name || '한술'}님</h2><p>{region || '지역 미설정'} · 음식 이야기 기록자</p></div><div className="profile-stats"><span><b>2</b>전승 레시피</span><span><b>8</b>저장한 맛</span><span><b>34</b>받은 좋아요</span></div><div className="profile-tabs"><button type="button">나의 레시피</button><button type="button">저장한 맛</button></div><div className="profile-foods">관심 음식 {favoriteFoods.map((food) => <span key={food}>{food}</span>)}</div><button className="feature-primary" type="button" onClick={() => onNavigate('record')}>우리 집 음식 기록하기 <span>→</span></button></main>
  )
}

export default PostOnboardingScreens

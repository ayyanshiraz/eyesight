"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import {
  SNELLEN_DENOMINATORS, calculateSnellenPixelHeight, getDecimalAcuity,
  vaLabel, snellenLabel, estimateSphere, blurForOffset, lensLabel,
  classifyDiagnosis, readingAddForAge, clockDialLines, dialSectorToAxis,
  pxPerMmFromCard, CARD_WIDTH_MM, CYL_MIN, CYL_MAX, CYL_STEP,
  SPH_MIN, SPH_MAX, SPH_STEP, roundToStep,
} from "@/lib/optics"
import { estimateWithCoeffs } from "@/lib/model"

// ── Phase sequence ─────────────────────────────────────────────────────────
const PHASES = [
  "CALIBRATE",        // 0 — screen size calibration via card
  "INITIALIZING",     // 1 — camera / AI warmup
  "E_TEST_OD",        // 2 — right eye acuity (Tumbling E)
  "E_TEST_OS",        // 3 — left eye acuity
  "DUOCHROME",        // 4 — red/green refraction balance
  "REFRACTION_OD",    // 5 — Sph slider right eye
  "REFRACTION_OS",    // 6 — Sph slider left eye
  "CYL_AXIS_OD",      // 7 — Cylinder + Axis right eye (clock dial)
  "CYL_AXIS_OS",      // 8 — Cylinder + Axis left eye
  "MACULAR",          // 9 — Amsler grid
  "COLOR_BLINDNESS",  // 10 — Ishihara
  "COMPLETE",         // 11
] as const
type Phase = typeof PHASES[number]
const randRot = () => [0, 90, 180, 270][Math.floor(Math.random() * 4)]

export default function CameraTestPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const cardBoxRef = useRef<HTMLDivElement>(null)

  // Phase stored in a ref AND state — ref used inside stable callbacks
  const phaseRef = useRef(0)
  const [phaseIndex, _setPhase] = useState(0)
  const setPhaseIndex = useCallback((u: number | ((p: number) => number)) => {
    _setPhase(prev => {
      const next = typeof u === "function" ? u(prev) : u
      phaseRef.current = next
      return next
    })
  }, [])

  // Screen calibration
  const [pxPerMm,    setPxPerMm]    = useState(1 / (25.4 / 96))  // CSS default
  const [cardWidthPx, setCardWidthPx] = useState(0)

  const [isReady,     setIsReady]     = useState(false)
  const [distanceCm,  setDistanceCm]  = useState(60)
  const [ipd,         setIpd]         = useState(0)
  const [warning,     setWarning]     = useState<string | null>(null)
  const [intakeData,  setIntakeData]  = useState<any>(null)
  const [modelCoeffs, setModelCoeffs] = useState<any>(null)

  const strabRef   = useRef("Normal Alignment")
  const ipdSamples = useRef<number[]>([])
  const camStarted = useRef(false)

  // Acuity
  const [snellenIdx, setSnellenIdx] = useState(0)
  const [eRot,       setERot]       = useState(randRot())

  // Refraction sliders
  const [sliderOD, setSliderOD] = useState(0)
  const [sliderOS, setSliderOS] = useState(0)

  // Cylinder sliders (per eye, 0 to -3.00)
  const [cylOD, setCylOD] = useState(0)
  const [cylOS, setCylOS] = useState(0)

  // Axis (per eye, 1–180)
  const [axisOD, setAxisOD] = useState(90)
  const [axisOS, setAxisOS] = useState(90)

  // Collected results
  const [results, setResults] = useState({
    acuityRight:       0,
    acuityLeft:        0,
    duochromeScore:    1,
    sphRight:          0,
    sphLeft:           0,
    cylRight:          0,
    cylLeft:           0,
    axisRight:         90,
    axisLeft:          90,
    macularDistortion: false,
    colorVisionPass:   true,
  })

  // Fetch session + model on mount
  useEffect(() => {
    fetch(`/api/sessions/${params.id}`).then(r => r.json()).then(setIntakeData)
    fetch("/api/model/active").then(r => r.json())
      .then(d => setModelCoeffs(d?.coefficients ?? null)).catch(() => {})
  }, [params.id])

  // Reset snellen level on acuity phases
  useEffect(() => {
    const p = PHASES[phaseIndex]
    if (p === "E_TEST_OD" || p === "E_TEST_OS") { setSnellenIdx(0); setERot(randRot()) }
  }, [phaseIndex])

  // ── FaceMesh — stable callback (reads phase from ref) ────────────────
  const onResults = useCallback((r: any) => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    if (r.multiFaceLandmarks?.length > 0) {
      const lm  = r.multiFaceLandmarks[0]
      const W   = canvasRef.current.width
      const H   = canvasRef.current.height
      const faceW = Math.abs(lm[454].x - lm[234].x) * W
      const raw   = (14.0 * 600) / faceW
      setDistanceCm(prev => prev * 0.8 + raw * 0.2)

      if (raw > 20 && lm[468] && lm[473]) {
        const irisD = Math.abs(lm[468].x - lm[473].x) * W
        const mm    = (irisD * raw * 10) / 600
        ipdSamples.current.push(mm)
        setIpd(mm)
        const noseX = lm[1].x*W, lX = lm[468].x*W, rX = lm[473].x*W
        if (Math.abs((noseX-lX)-(rX-noseX)) > W*0.04)
          strabRef.current = "Possible Strabismus Detected"
      }

      const phase = PHASES[phaseRef.current]
      if (phase === "E_TEST_OD" || phase === "E_TEST_OS") {
        if (raw < 52)      setWarning("⚠️ Too close — move to ~60 cm")
        else if (raw > 70) setWarning("⚠️ Too far — move closer to ~60 cm")
        else               setWarning(null)
      } else { setWarning(null) }

      ctx.fillStyle = "#22c55e"
      ;[468, 473].forEach(i => {
        ctx.beginPath(); ctx.arc(lm[i].x*W, lm[i].y*H, 3, 0, 2*Math.PI); ctx.fill()
      })
    } else { setWarning("⚠️ Face not detected") }
  }, [])

  const initCamera = useCallback(() => {
    if (typeof window === "undefined" || !(window as any).FaceMesh) return
    if (camStarted.current) return
    camStarted.current = true

    const fm = new (window as any).FaceMesh({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    })
    fm.setOptions({ maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5 })
    fm.onResults(onResults)

    if (videoRef.current) {
      const cam = new (window as any).Camera(videoRef.current, {
        onFrame: async () => { if (videoRef.current) try { await fm.send({ image: videoRef.current }) } catch(_){} },
        width:640, height:480,
      })
      cam.start()
        .then(() => { setIsReady(true); setPhaseIndex(2); setWarning(null) })
        .catch(() => { camStarted.current = false; setWarning("⚠️ Camera blocked — check browser permissions.") })
    }
  }, [onResults, setPhaseIndex])

  // Only poll for MediaPipe when we are on INITIALIZING.
  // Without this gate the poller fires on mount, initCamera() runs,
  // cam.start() calls setPhaseIndex(2) and the CALIBRATE screen is skipped.
  useEffect(() => {
    if (PHASES[phaseIndex] !== "INITIALIZING") return
    const id = setInterval(() => {
      if ((window as any).FaceMesh) { clearInterval(id); initCamera() }
    }, 300)
    return () => clearInterval(id)
  }, [phaseIndex, initCamera])

  // ── Card calibration ──────────────────────────────────────────────────
  const handleCardCalibrate = () => {
    if (!cardBoxRef.current) return
    const widthPx = cardBoxRef.current.getBoundingClientRect().width
    const ppm     = pxPerMmFromCard(widthPx)
    setPxPerMm(ppm)
    setCardWidthPx(widthPx)
    // Move to camera init (phase 1)
    setPhaseIndex(1)
  }

  // ── Acuity ────────────────────────────────────────────────────────────
  const handleEAnswer = (guess: number) => {
    if (guess === eRot) {
      if (snellenIdx < SNELLEN_DENOMINATORS.length - 1) {
        setSnellenIdx(p => p + 1); setERot(randRot())
      } else { finishEPhase(getDecimalAcuity(20)) }
    } else {
      const lastPassed = snellenIdx > 0
        ? SNELLEN_DENOMINATORS[snellenIdx-1] : SNELLEN_DENOMINATORS[snellenIdx]
      finishEPhase(getDecimalAcuity(lastPassed))
    }
  }

  const finishEPhase = (score: number) => {
    const p = PHASES[phaseRef.current]
    setResults(prev => p === "E_TEST_OD" ? { ...prev, acuityRight: score } : { ...prev, acuityLeft: score })
    setPhaseIndex(p => p + 1)
  }

  // ── Duochrome ─────────────────────────────────────────────────────────
  const handleDuochrome = (score: number) => {
    setResults(prev => {
      const est = modelCoeffs
        ? (a: number) => estimateWithCoeffs(a, score, modelCoeffs)
        : (a: number) => estimateSphere(a, score)
      const estR = est(prev.acuityRight)
      const estL = est(prev.acuityLeft)
      setSliderOD(estR); setSliderOS(estL)
      return { ...prev, duochromeScore: score, sphRight: estR, sphLeft: estL }
    })
    setPhaseIndex(p => p + 1)
  }

  // ── Submit ────────────────────────────────────────────────────────────
  const submitResults = async () => {
    const diagnosisClass = classifyDiagnosis(
      results.sphLeft, results.sphRight, results.cylLeft, results.cylRight
    )
    const age        = intakeData?.age ?? 0
    const readingAdd = readingAddForAge(age)
    const avgIpd     = ipdSamples.current.length > 0
      ? ipdSamples.current.reduce((a,b)=>a+b,0) / ipdSamples.current.length : ipd

    const recommendation = {
      text: buildRecommendation(diagnosisClass, results, intakeData),
      prescription: {
        right: { sph: results.sphRight, cyl: results.cylRight, axis: results.axisRight, va: vaLabel(SNELLEN_DENOMINATORS[SNELLEN_DENOMINATORS.length - Math.round(results.acuityRight * SNELLEN_DENOMINATORS.length)] ?? 20) },
        left:  { sph: results.sphLeft,  cyl: results.cylLeft,  axis: results.axisLeft,  va: vaLabel(SNELLEN_DENOMINATORS[SNELLEN_DENOMINATORS.length - Math.round(results.acuityLeft  * SNELLEN_DENOMINATORS.length)] ?? 20) },
      },
      squint: strabRef.current,
      readingAdd,
    }

    await fetch(`/api/sessions/${params.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        ...results,
        cylinder: (results.cylRight + results.cylLeft) / 2,
        ipdMm: avgIpd, ipdConfidence: 0.8,
        avgDistanceCm: distanceCm,
        pxPerMm,
        diagnosisClass, recommendation, readingAdd,
        astigmatismScore: (Math.abs(results.cylRight) >= 0.5 || Math.abs(results.cylLeft) >= 0.5) ? 1 : 0,
      }),
    })
    fetch("/api/model/retrain", { method:"POST" }).catch(() => {})
    router.push("/dashboard")
  }

  // ── Render values ─────────────────────────────────────────────────────
  const phase      = PHASES[phaseIndex] as Phase
  const denom      = SNELLEN_DENOMINATORS[snellenIdx]
  const eSizePx    = calculateSnellenPixelHeight(denom, distanceCm, pxPerMm)
  const isOD_sph   = phase === "REFRACTION_OD"
  const isOD_cyl   = phase === "CYL_AXIS_OD"
  const seedSph    = isOD_sph ? results.sphRight : results.sphLeft
  const curSlider  = isOD_sph ? sliderOD : sliderOS
  const blurPx     = blurForOffset(curSlider - seedSph)
  const curCyl     = isOD_cyl ? cylOD : cylOS
  const curAxis    = isOD_cyl ? axisOD : axisOS
  const cylBlurPx  = Math.min(10, Math.abs(curCyl) * 3)

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js" strategy="afterInteractive" />

      {/* ── Camera panel ── */}
      {phase !== "CALIBRATE" && (
        <div className="lg:w-[380px] shrink-0">
          <div className="bg-ink rounded-2xl overflow-hidden relative aspect-[4/3] shadow-lg">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 w-full h-full scale-x-[-1] z-10" />
            <div className="absolute top-3 left-3 z-20 flex gap-2 text-xs">
              <span className="bg-accent text-white px-2 py-1 rounded-full">{distanceCm.toFixed(0)} cm</span>
              {ipd > 0 && <span className="bg-white/20 text-white px-2 py-1 rounded-full">IPD {ipd.toFixed(1)} mm</span>}
              {pxPerMm > 0 && <span className="bg-white/20 text-white px-2 py-1 rounded-full">{pxPerMm.toFixed(2)} px/mm</span>}
            </div>
            <div className="absolute bottom-3 left-3 z-20">
              <span className="bg-black/50 text-white px-2 py-1 rounded-full text-xs">{phase} {phaseIndex}/{PHASES.length-1}</span>
            </div>
            {warning && phase !== "INITIALIZING" && (
              <div className="absolute inset-0 z-30 bg-red-600/90 flex items-center justify-center p-4">
                <p className="text-white text-xl font-bold text-center">{warning}</p>
              </div>
            )}
          </div>
          <div className="mt-3 card text-xs text-muted space-y-1">
            <p className="font-medium text-ink text-sm">Instructions</p>
            <p>Sit ~60 cm away. Keep face visible during letter tests.</p>
            <p>Screen calibrated: {cardWidthPx > 0 ? `${cardWidthPx.toFixed(0)} px = ${CARD_WIDTH_MM} mm` : "default CSS"}</p>
          </div>
        </div>
      )}

      {/* ── Test wizard ── */}
      <div className={`flex-1 card flex flex-col justify-center items-center min-h-[540px] text-center ${phase === "CALIBRATE" ? "max-w-2xl mx-auto w-full" : ""}`}>

        {/* ─── PHASE 0: SCREEN CALIBRATION ─────────────────────────────── */}
        {phase === "CALIBRATE" && (
          <div className="w-full max-w-lg">
            <span className="px-3 py-1 rounded-full text-xs font-bold mb-4 inline-block bg-accent-light text-accent-dark">Step 1 of 11 — Screen Calibration</span>
            <h2 className="font-display text-2xl font-medium text-ink mb-2">Calibrate Your Screen</h2>
            <p className="text-muted text-sm mb-6">
              Place your <strong>debit card, CNIC, or any standard ID card</strong> on the screen
              and drag the box edges to match its width exactly.
              This ensures the letter sizes are accurate for your physical screen.
            </p>

            {/* Resizable card box */}
            <div className="flex flex-col items-center mb-6">
              <div
                ref={cardBoxRef}
                className="border-4 border-accent rounded-xl bg-accent-light/30 flex items-center justify-center cursor-ew-resize select-none"
                style={{
                  width: "340px",
                  height: `${340 * (53.98 / 85.60)}px`,
                  resize: "horizontal",
                  overflow: "auto",
                  minWidth: "180px",
                  maxWidth: "700px",
                }}
              >
                <div className="text-center pointer-events-none">
                  <p className="text-accent-dark font-bold text-sm">ID Card</p>
                  <p className="text-muted text-xs mt-1">85.6 × 54 mm</p>
                  <p className="text-xs text-muted mt-2">↔ Drag right edge to resize</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-accent-light border border-accent/20 px-4 py-3 text-sm text-left mb-6">
              <p className="font-medium text-ink mb-1">How to calibrate:</p>
              <ol className="text-muted space-y-1 list-decimal list-inside">
                <li>Hold your actual card against the screen</li>
                <li>Drag the right edge of the box above until it matches the card width exactly</li>
                <li>Press confirm — we calculate your screen&apos;s true pixel density</li>
              </ol>
            </div>

            <button onClick={handleCardCalibrate} className="btn-primary w-full py-3 text-base">
              ✓ Card width matches — Confirm &amp; Start Test
            </button>
            <button onClick={() => setPhaseIndex(1)} className="text-xs text-muted underline mt-3 block mx-auto">
              Skip calibration (use screen default)
            </button>
          </div>
        )}

        {/* ─── PHASE 1: INITIALIZING ─────────────────────────────────────── */}
        {phase === "INITIALIZING" && (
          <div className="space-y-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="font-display text-2xl font-medium text-ink">Starting Camera…</h2>
            <p className="text-muted text-sm">Please allow camera access when prompted.</p>
          </div>
        )}

        {/* ─── PHASES 2–3: ACUITY (TUMBLING E) ─────────────────────────── */}
        {(phase === "E_TEST_OD" || phase === "E_TEST_OS") && (
          <div className="w-full">
            <span className={`px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block ${phase==="E_TEST_OD"?"bg-blue-100 text-blue-800":"bg-purple-100 text-purple-800"}`}>
              {phase==="E_TEST_OD" ? "Step 3 — Right Eye (OD)" : "Step 4 — Left Eye (OS)"}
            </span>
            <h2 className="font-display text-2xl font-medium text-ink mb-1">Visual Acuity (Va)</h2>
            <p className="text-muted text-sm mb-1">
              Cover your <strong>{phase==="E_TEST_OD"?"left":"right"}</strong> eye completely.
              Which direction is the E pointing?
            </p>
            <p className="text-xs text-accent-dark font-medium mb-3">
              Line: <strong>{vaLabel(denom)}</strong> &nbsp;·&nbsp; {denom === 20 ? "Best line" : `${SNELLEN_DENOMINATORS.length - snellenIdx - 1} lines remaining`}
            </p>

            {/* Tumbling E — calibration-aware size */}
            <div className="h-56 flex items-center justify-center bg-white border-2 border-accent/10 rounded-xl mb-2 overflow-hidden select-none">
              <span className="font-bold font-mono leading-none"
                style={{ fontSize:`${eSizePx}px`, transform:`rotate(${eRot}deg)`, display:"inline-block", color:"#16241e" }}>
                E
              </span>
            </div>
            <p className="text-xs text-muted mb-4">{vaLabel(denom)} · {distanceCm.toFixed(0)} cm · {eSizePx.toFixed(1)} px</p>

            <div className="flex flex-col items-center gap-2 mb-3">
              <button onClick={() => handleEAnswer(270)} className="btn-secondary w-14 h-14 text-xl p-0">↑</button>
              <div className="flex gap-2">
                <button onClick={() => handleEAnswer(180)} className="btn-secondary w-14 h-14 text-xl p-0">←</button>
                <button onClick={() => handleEAnswer(90)}  className="btn-secondary w-14 h-14 text-xl p-0">↓</button>
                <button onClick={() => handleEAnswer(0)}   className="btn-secondary w-14 h-14 text-xl p-0">→</button>
              </div>
            </div>
            <button onClick={() => finishEPhase(getDecimalAcuity(denom))} className="text-xs text-muted underline">
              Too blurry to read — record this line
            </button>
          </div>
        )}

        {/* ─── PHASE 4: DUOCHROME ────────────────────────────────────────── */}
        {phase === "DUOCHROME" && (
          <div className="w-full">
            <span className="px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block bg-yellow-100 text-yellow-800">Step 5 — Refractive Balance</span>
            <h2 className="font-display text-2xl font-medium text-ink mb-2">Duochrome Test</h2>
            <p className="text-muted text-sm mb-2">Both eyes open. Which letter looks <strong>sharper and darker</strong>?</p>
            <p className="text-xs text-muted mb-6">Red sharper = under-corrected (myopic) · Green sharper = over-corrected (hyperopic)</p>
            <div className="flex justify-center gap-4 mb-8">
              <div className="w-36 h-36 rounded-xl bg-red-500 flex items-center justify-center text-6xl font-bold text-black shadow select-none">O</div>
              <div className="w-36 h-36 rounded-xl bg-green-500 flex items-center justify-center text-6xl font-bold text-black shadow select-none">O</div>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => handleDuochrome(0)} className="btn-secondary border-red-200 text-red-700 bg-red-50 hover:bg-red-100">🔴 Red is sharper</button>
              <button onClick={() => handleDuochrome(1)} className="btn-secondary">Equal / unsure</button>
              <button onClick={() => handleDuochrome(2)} className="btn-secondary border-green-200 text-green-700 bg-green-50 hover:bg-green-100">🟢 Green is sharper</button>
            </div>
          </div>
        )}

        {/* ─── PHASES 5–6: SPHERE REFINEMENT ─────────────────────────────── */}
        {(phase === "REFRACTION_OD" || phase === "REFRACTION_OS") && (
          <div className="w-full">
            <span className={`px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block ${isOD_sph?"bg-blue-100 text-blue-800":"bg-purple-100 text-purple-800"}`}>
              {isOD_sph ? "Step 6 — Right Eye Sphere (Sph)" : "Step 7 — Left Eye Sphere (Sph)"}
            </span>
            <h2 className="font-display text-2xl font-medium text-ink mb-1">Spherical Correction</h2>
            <p className="text-muted text-sm mb-4">
              Cover your <strong>{isOD_sph?"left":"right"}</strong> eye.
              Drag until the text looks <strong>sharpest</strong>.
              The slider starts at our AI estimate from your acuity test.
            </p>

            {/* Blur panel — zero at seed */}
            <div className="rounded-xl border border-accent/10 bg-white p-5 mb-4 select-none text-left transition-all duration-100"
              style={{ filter:`blur(${blurPx}px)` }}>
              <p className="text-2xl font-bold font-mono tracking-widest mb-2">LAHORE 54000</p>
              <p className="text-sm leading-relaxed">Take one tablet twice daily. Store below 25°C. Keep out of reach of children.</p>
            </div>

            <input type="range" min={SPH_MIN} max={SPH_MAX} step={SPH_STEP}
              value={curSlider}
              onChange={e => { const v=parseFloat(e.target.value); isOD_sph?setSliderOD(v):setSliderOS(v) }}
              className="w-full mb-2 accent-accent" />

            <div className="flex justify-between text-xs text-muted mb-3 px-1">
              <span>{SPH_MIN} D (strong myopia)</span>
              <span>0</span>
              <span>+{SPH_MAX} D (strong hyperopia)</span>
            </div>

            <p className="text-sm font-medium text-accent-dark mb-1">{lensLabel(curSlider)}</p>
            <p className="text-xs text-muted mb-5">
              AI seed: {seedSph>=0?"+":""}{seedSph.toFixed(2)} D &nbsp;·&nbsp;
              offset: {(curSlider-seedSph)>=0?"+":""}{(curSlider-seedSph).toFixed(2)} D &nbsp;·&nbsp;
              blur: {blurPx.toFixed(1)} px
            </p>

            <button onClick={() => {
              const val = roundToStep(curSlider, SPH_STEP)
              if (isOD_sph) setResults(p => ({ ...p, sphRight: val }))
              else          setResults(p => ({ ...p, sphLeft:  val }))
              setPhaseIndex(p => p + 1)
            }} className="btn-primary">
              Text is sharpest here — lock in Sph →
            </button>
          </div>
        )}

        {/* ─── PHASES 7–8: CYLINDER + AXIS (Clock Dial) ──────────────────── */}
        {(phase === "CYL_AXIS_OD" || phase === "CYL_AXIS_OS") && (
          <div className="w-full">
            <span className={`px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block ${isOD_cyl?"bg-blue-100 text-blue-800":"bg-purple-100 text-purple-800"}`}>
              {isOD_cyl ? "Step 8 — Right Eye Cylinder (Cyl) + Axis" : "Step 9 — Left Eye Cylinder (Cyl) + Axis"}
            </span>
            <h2 className="font-display text-2xl font-medium text-ink mb-1">Astigmatism — Cyl &amp; Axis</h2>
            <p className="text-muted text-sm mb-4">
              Cover your <strong>{isOD_cyl?"left":"right"}</strong> eye.
              First, tap the <strong>darkest line</strong> on the clock dial to set the Axis.
              Then drag the Cylinder slider until the dial looks most uniform.
            </p>

            {/* Clock dial — interactive axis selector */}
            <div className="flex justify-center mb-4">
              <svg width="200" height="200" viewBox="0 0 200 200" className="cursor-pointer">
                <circle cx="100" cy="100" r="90" fill="white" stroke="#e2ede9" strokeWidth="2"/>
                {clockDialLines().map((deg, i) => {
                  const rad     = (deg * Math.PI) / 180
                  const isAxis  = Math.abs(deg - (isOD_cyl ? axisOD : axisOS)) < 10 ||
                                  Math.abs(deg + 180 - (isOD_cyl ? axisOD : axisOS)) < 10
                  const x1 = 100 + 70 * Math.cos(rad), y1 = 100 + 70 * Math.sin(rad)
                  const x2 = 100 - 70 * Math.cos(rad), y2 = 100 - 70 * Math.sin(rad)
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isAxis ? "#1B7A5E" : "#16241e"}
                      strokeWidth={isAxis ? 4 : 1.5}
                      onClick={() => {
                        const axis = dialSectorToAxis(i)
                        if (isOD_cyl) setAxisOD(axis); else setAxisOS(axis)
                      }}
                      className="cursor-pointer hover:stroke-accent"
                    />
                  )
                })}
                {/* Axis degree labels */}
                {[0,30,60,90,120,150].map((deg, i) => {
                  const rad = (deg * Math.PI) / 180
                  const x   = 100 + 82 * Math.cos(rad)
                  const y   = 100 + 82 * Math.sin(rad)
                  return <text key={i} x={x} y={y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#5B6F66">{deg === 0 ? "180" : deg}°</text>
                })}
                <circle cx="100" cy="100" r="4" fill="#1B7A5E"/>
              </svg>
            </div>

            <p className="text-xs text-muted mb-2">
              Axis selected: <strong>{isOD_cyl ? axisOD : axisOS}°</strong>
              &nbsp;— click the darkest / thickest-looking line
            </p>

            {/* Fine axis control */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs text-muted whitespace-nowrap">Fine-tune Axis:</label>
              <input type="range" min="1" max="180" step="5"
                value={isOD_cyl ? axisOD : axisOS}
                onChange={e => { const v=parseInt(e.target.value); isOD_cyl?setAxisOD(v):setAxisOS(v) }}
                className="flex-1 accent-accent" />
              <span className="text-sm font-medium text-ink w-12 text-right">{isOD_cyl ? axisOD : axisOS}°</span>
            </div>

            {/* Cylinder slider */}
            <p className="text-xs text-muted mb-1">Cylinder (Cyl) — drag until all dial lines look equally dark:</p>

            {/* Blurred dial showing cylinder effect */}
            <div className="flex justify-center mb-3">
              <div style={{ filter: `blur(${cylBlurPx * 0.5}px) contrast(${1 + Math.abs(curCyl) * 0.3})` }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="white" stroke="#e2ede9" strokeWidth="1"/>
                  {clockDialLines().map((deg,i) => {
                    const rad = (deg * Math.PI)/180
                    return <line key={i} x1={50+35*Math.cos(rad)} y1={50+35*Math.sin(rad)}
                      x2={50-35*Math.cos(rad)} y2={50-35*Math.sin(rad)} stroke="#16241e" strokeWidth="1.5"/>
                  })}
                </svg>
              </div>
            </div>

            <input type="range" min={CYL_MIN} max={CYL_MAX} step={CYL_STEP}
              value={curCyl}
              onChange={e => { const v=parseFloat(e.target.value); isOD_cyl?setCylOD(v):setCylOS(v) }}
              className="w-full mb-2 accent-accent" />
            <div className="flex justify-between text-xs text-muted mb-3 px-1">
              <span>-3.00 D (strong astig)</span>
              <span>0.00 D (no astig)</span>
            </div>
            <p className="text-sm font-medium text-accent-dark mb-5">
              Cyl: {curCyl === 0 ? "None" : `${curCyl.toFixed(2)} D`} &nbsp;·&nbsp; Axis: {isOD_cyl?axisOD:axisOS}°
            </p>

            <button onClick={() => {
              const cylVal  = roundToStep(curCyl, CYL_STEP)
              const axisVal = isOD_cyl ? axisOD : axisOS
              if (isOD_cyl) setResults(p => ({ ...p, cylRight: cylVal, axisRight: axisVal }))
              else          setResults(p => ({ ...p, cylLeft:  cylVal, axisLeft:  axisVal }))
              setPhaseIndex(p => p + 1)
            }} className="btn-primary">
              Lines look uniform — lock in Cyl &amp; Axis →
            </button>
          </div>
        )}

        {/* ─── PHASE 9: MACULAR ──────────────────────────────────────────── */}
        {phase === "MACULAR" && (
          <div className="w-full">
            <span className="px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block bg-teal-100 text-teal-800">Step 10 — Macular</span>
            <h2 className="font-display text-2xl font-medium text-ink mb-2">Amsler Grid</h2>
            <p className="text-muted text-sm mb-6">Fix your gaze on the green dot. Are any lines wavy, distorted, or missing?</p>
            <div className="flex justify-center mb-6">
              <svg width="200" height="200" viewBox="0 0 200 200" className="border border-ink bg-white rounded">
                {Array.from({length:11},(_,i)=>(
                  <g key={i}>
                    <line x1={i*20} y1={0} x2={i*20} y2={200} stroke="#16241e" strokeWidth="0.8"/>
                    <line x1={0} y1={i*20} x2={200} y2={i*20} stroke="#16241e" strokeWidth="0.8"/>
                  </g>
                ))}
                <circle cx="100" cy="100" r="5" fill="#1B7A5E"/>
              </svg>
            </div>
            <div className="flex gap-4 justify-center">
              <button onClick={() => { setResults(p=>({...p,macularDistortion:true}));  setPhaseIndex(p=>p+1) }}
                className="btn-secondary text-red-700 border-red-200 bg-red-50 hover:bg-red-100">Yes — lines distorted</button>
              <button onClick={() => { setResults(p=>({...p,macularDistortion:false})); setPhaseIndex(p=>p+1) }}
                className="btn-primary">Grid looks normal</button>
            </div>
          </div>
        )}

        {/* ─── PHASE 10: COLOUR VISION ────────────────────────────────────── */}
        {phase === "COLOR_BLINDNESS" && (
          <div className="w-full">
            <span className="px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block bg-pink-100 text-pink-800">Step 11 — Colour Vision</span>
            <h2 className="font-display text-2xl font-medium text-ink mb-2">Ishihara Plate</h2>
            <p className="text-muted text-sm mb-6">What number do you see in the circle?</p>
            <div className="flex justify-center mb-6">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="100" fill="#c8a06e"/>
                {ishiharaDots().map((d,i)=><circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c}/>)}
              </svg>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              {["12","Cannot see a number","Different number"].map(opt=>(
                <button key={opt}
                  onClick={()=>{ setResults(p=>({...p,colorVisionPass:opt==="12"})); setPhaseIndex(p=>p+1) }}
                  className="btn-secondary text-sm">{opt}</button>
              ))}
            </div>
          </div>
        )}

        {/* ─── PHASE 11: COMPLETE ─────────────────────────────────────────── */}
        {phase === "COMPLETE" && (
          <div className="w-full">
            <div className="flex items-center gap-2 justify-center mb-4">
              <span className="text-3xl">✅</span>
              <h2 className="font-display text-2xl font-medium text-ink">Diagnostics Complete</h2>
            </div>
            <p className="text-muted text-sm mb-5">Review your clinical prescription below.</p>

            {/* Clinical prescription card — matches the format of the paper card */}
            <div className="rounded-2xl border-2 border-accent/20 overflow-hidden mb-5">
              <div className="bg-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-left">
                ClearSight — Vision Prescription
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent-light">
                    <th className="px-3 py-2 text-left text-muted text-xs font-medium">Eye</th>
                    <th className="px-3 py-2 text-center text-muted text-xs font-medium">Sph</th>
                    <th className="px-3 py-2 text-center text-muted text-xs font-medium">Cyl</th>
                    <th className="px-3 py-2 text-center text-muted text-xs font-medium">Axis</th>
                    <th className="px-3 py-2 text-center text-muted text-xs font-medium">Va</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-accent/10">
                    <td className="px-3 py-3 font-bold text-ink text-left">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Right (OD)</span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-ink">
                      {results.sphRight >= 0 ? "+" : ""}{results.sphRight.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-ink">
                      {results.cylRight === 0 ? "—" : results.cylRight.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-ink">
                      {results.cylRight !== 0 ? `${results.axisRight}°` : "—"}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-accent-dark">
                      {vaLabel(SNELLEN_DENOMINATORS[Math.max(0, SNELLEN_DENOMINATORS.length - Math.round(results.acuityRight * SNELLEN_DENOMINATORS.length) - 1)])}
                    </td>
                  </tr>
                  <tr className="border-t border-accent/10">
                    <td className="px-3 py-3 font-bold text-ink text-left">
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">Left (OS)</span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-ink">
                      {results.sphLeft >= 0 ? "+" : ""}{results.sphLeft.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-ink">
                      {results.cylLeft === 0 ? "—" : results.cylLeft.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-ink">
                      {results.cylLeft !== 0 ? `${results.axisLeft}°` : "—"}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-accent-dark">
                      {vaLabel(SNELLEN_DENOMINATORS[Math.max(0, SNELLEN_DENOMINATORS.length - Math.round(results.acuityLeft * SNELLEN_DENOMINATORS.length) - 1)])}
                    </td>
                  </tr>
                  {intakeData?.age >= 40 && (
                    <tr className="border-t border-accent/10 bg-accent-light/30">
                      <td colSpan={4} className="px-3 py-2 text-xs text-muted text-left">Reading Add (presbyopia)</td>
                      <td className="px-3 py-2 text-center font-mono text-sm font-semibold text-accent-dark">
                        +{readingAddForAge(intakeData.age).toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Additional findings */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <RCard label="Macular"       value={results.macularDistortion?"⚠️ Distortion":"Normal"} hi={results.macularDistortion} />
              <RCard label="Colour Vision" value={results.colorVisionPass?"Passed":"⚠️ Failed"} hi={!results.colorVisionPass} />
              <RCard label="IPD"           value={ipd>0?`${ipd.toFixed(1)} mm`:"—"} />
              <RCard label="Squint"        value={strabRef.current} hi={strabRef.current!=="Normal Alignment"} />
              <RCard label="Screen calib." value={cardWidthPx>0?`${pxPerMm.toFixed(2)} px/mm`:"CSS default"} />
              <RCard label="Diagnosis"     value={classifyDiagnosis(results.sphLeft,results.sphRight,results.cylLeft,results.cylRight)} hi />
            </div>

            <button onClick={submitResults} className="btn-primary w-full py-3 text-base">
              Save Prescription to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function RCard({ label, value, hi=false }: { label:string; value:string; hi?:boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-left ${hi?"border-accent/30 bg-accent-light":"border-accent/10 bg-white"}`}>
      <span className="block text-xs text-muted">{label}</span>
      <span className={`font-semibold ${hi?"text-accent-dark":"text-ink"}`}>{value}</span>
    </div>
  )
}

function buildRecommendation(diag: string, r: any, intake: any): string {
  if (intake?.cataractRisk==="BOTH") return "URGENT: Symptoms suggest cataracts/glaucoma. See specialist immediately."
  if (!r.colorVisionPass) return "Colour vision deficiency detected. Full Ishihara assessment recommended."
  if (r.macularDistortion) return "Macular distortion detected. Urgent ophthalmology review."
  if (diag==="MIXED") return "Myopia with astigmatism detected. Combined sphere and cylinder correction required."
  if (diag==="ASTIGMATISM") return "Astigmatism detected. Cylindrical lens correction required — see an optometrist."
  if (diag==="MYOPIA") return "Myopia (nearsightedness) detected. Concave (minus) lenses recommended."
  if (diag==="HYPEROPIA") return "Hyperopia (farsightedness) detected. Convex (plus) lenses recommended."
  return "Vision appears within normal bounds. Continue annual screenings."
}

function ishiharaDots() {
  const dots: {x:number;y:number;r:number;c:string}[] = []
  for (let i=0;i<280;i++) {
    const a=Math.random()*2*Math.PI, d=Math.random()*88
    dots.push({x:100+d*Math.cos(a),y:100+d*Math.sin(a),r:3+Math.random()*4,c:`hsl(${25+Math.floor(Math.random()*25)},70%,${45+Math.floor(Math.random()*20)}%)`})
  }
  const ones: [number,number][] = [[85,65],[85,75],[85,85],[85,95],[85,105],[85,115],[85,125],[85,135]]
  const twos: [number,number][] = [[100,65],[110,65],[120,65],[125,75],[125,85],[115,95],[105,105],[95,115],[90,125],[90,135],[100,135],[110,135],[120,135]]
  for (const [x,y] of [...ones,...twos])
    dots.push({x,y,r:6+Math.random()*2,c:`hsl(${115+Math.floor(Math.random()*20)},55%,${38+Math.floor(Math.random()*10)}%)`})
  return dots
}

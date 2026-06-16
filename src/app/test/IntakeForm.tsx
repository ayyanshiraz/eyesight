"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ExistingData = {
  id: string
  age?: number | null
  country?: string | null
  symptomDistanceBlur?: boolean | null
  symptomNearBlur?: boolean | null
  symptomHeadache?: boolean | null
  historyGlasses?: boolean | null
  familyHistory?: boolean | null
  screenTime?: number | null
  fatigueScore?: number | null
  cataractRisk?: string | null
}

export default function IntakeForm({ existingData = null }: { existingData?: ExistingData | null }) {
  const router  = useRouter()
  const isEdit  = existingData !== null
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    const payload = {
      age:                Number(fd.get('age')),
      country:            fd.get('country')?.toString().trim() || undefined,
      symptomDistanceBlur: fd.get('symptomDistanceBlur') === 'yes',
      symptomNearBlur:    fd.get('symptomNearBlur')     === 'yes',
      symptomHeadache:    fd.get('symptomHeadache')     === 'yes',
      historyGlasses:     fd.get('historyGlasses')      === 'yes',
      familyHistory:      fd.get('familyHistory')        === 'yes',
      // ?? not || so 0 hours of screen time is kept, not overwritten by default
      screenTime:   fd.get('screenTime') !== null ? Number(fd.get('screenTime'))   : 8,
      fatigueScore: fd.get('fatigueScore') !== null ? Number(fd.get('fatigueScore')) : 3,
      cataractRisk: fd.get('cataractRisk')?.toString() || 'NONE',
    }

    try {
      const endpoint = isEdit ? `/api/sessions/${existingData!.id}` : '/api/sessions'
      const method   = isEdit ? 'PUT' : 'POST'

      const res  = await fetch(endpoint, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.formError ?? JSON.stringify(data.error) ?? 'Something went wrong.')

      router.refresh()   // force server component re-fetch so new session appears instantly
      router.push(isEdit ? `/sessions/${existingData!.id}/camera` : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  // ── Resolve saved values — ?? so false and 0 are treated as valid, not as missing ──
  const s = {
    age:            existingData?.age          ?? undefined,
    country:        existingData?.country       ?? '',
    distanceBlur:   existingData?.symptomDistanceBlur ?? false,
    nearBlur:       existingData?.symptomNearBlur     ?? false,
    headache:       existingData?.symptomHeadache     ?? false,
    historyGlasses: existingData?.historyGlasses      ?? false,
    familyHistory:  existingData?.familyHistory       ?? false,
    screenTime:     existingData?.screenTime          ?? 8,
    fatigueScore:   existingData?.fatigueScore        ?? 3,
    cataractRisk:   existingData?.cataractRisk        ?? 'NONE',
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="age" className="field-label">Age</label>
          <input id="age" name="age" type="number" required defaultValue={s.age} className="field-input" />
        </div>
        <div>
          <label htmlFor="country" className="field-label">Country (optional)</label>
          <input id="country" name="country" type="text" defaultValue={s.country} className="field-input" />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="field-label text-base border-b pb-2 w-full text-ink">Symptoms &amp; Medical History</legend>
        <YesNo name="symptomDistanceBlur" label="Hard to read signs or screens from across the room?" saved={s.distanceBlur} />
        <YesNo name="symptomNearBlur"     label="Do you hold your phone further away to read it?"    saved={s.nearBlur} />
        <YesNo name="symptomHeadache"     label="Headaches or eye strain after screen time?"         saved={s.headache} />
        <YesNo name="historyGlasses"      label="Ever been prescribed glasses or contact lenses?"    saved={s.historyGlasses} />
        <YesNo name="familyHistory"       label="Family history of glaucoma or severe astigmatism?"  saved={s.familyHistory} />
      </fieldset>

      <div className="card space-y-5">
        <h3 className="font-display text-base font-medium text-ink">Extended Clinical Metrics</h3>

        <div>
          <label className="field-label">Daily Screen Time (hours)</label>
          <input name="screenTime" type="number" step="0.5" min="0" max="24" required
            defaultValue={s.screenTime} className="field-input mt-1" />
        </div>

        <div>
          <label className="field-label">End-of-day eye fatigue — 1 = None, 5 = Severe</label>
          <div className="flex justify-between gap-2 mt-3 px-1">
            {[1,2,3,4,5].map(n => (
              <label key={n} className="flex flex-col items-center cursor-pointer gap-1">
                <input type="radio" name="fatigueScore" value={n} required
                  defaultChecked={s.fatigueScore === n} className="accent-accent w-5 h-5" />
                <span className="text-sm font-medium text-ink">{n}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Cataract / Glaucoma Risk</label>
          <p className="text-xs text-muted mb-2">Halos around lights at night, or colours appear faded/yellowed?</p>
          <select name="cataractRisk" required defaultValue={s.cataractRisk} className="field-input mt-1">
            <option value="NONE">No — my vision looks clear</option>
            <option value="HALOS">Yes — I see halos around lights</option>
            <option value="FADING">Yes — colours seem faded / yellowed</option>
            <option value="BOTH">Both halos and faded colours</option>
          </select>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-60">
        {loading ? 'Saving…' : isEdit ? 'Update Clinical Profile →' : 'Save & Unlock Camera Test →'}
      </button>
    </form>
  )
}

function YesNo({ name, label, saved }: { name: string; label: string; saved: boolean }) {
  return (
    <div className="rounded-xl border border-accent/10 bg-white px-4 py-3">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="mt-3 flex gap-8">
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="radio" name={name} value="yes" required defaultChecked={saved === true}  className="accent-accent w-4 h-4" />
          Yes
        </label>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="radio" name={name} value="no"  defaultChecked={saved !== true} className="accent-accent w-4 h-4" />
          No
        </label>
      </div>
    </div>
  )
}

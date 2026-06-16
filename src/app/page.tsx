import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      {/* Hero */}
      <section className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-accent-dark">
            Free · At home · About 15 minutes
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-ink md:text-5xl">
            Know where your eyes stand, before you sit in the chair.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            ClearSight is a free, browser-based vision screening you can take
            with just a webcam. It checks your visual acuity, estimates your
            refractive error, and screens for color vision, astigmatism,
            contrast sensitivity, and macular health — then turns the results
            into a plain-language summary you can bring to an eye doctor.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/test" className="btn-primary">
              Start your screening
            </Link>
            <a href="#how-it-works" className="btn-secondary">
              How it works
            </a>
          </div>
        </div>

        <div className="flex justify-center">
          <svg
            viewBox="0 0 320 320"
            className="w-full max-w-xs"
            role="img"
            aria-label="Stylized eye chart with a row of tumbling-E letters at decreasing sizes"
          >
            <circle cx="160" cy="140" r="120" fill="none" stroke="#D7ECE3" strokeWidth="1" />
            <circle cx="160" cy="140" r="85" fill="none" stroke="#D7ECE3" strokeWidth="1" />
            <circle cx="160" cy="140" r="50" fill="#1B7A5E" opacity="0.08" />
            <circle cx="160" cy="140" r="28" fill="#1B7A5E" />
            <circle cx="170" cy="130" r="7" fill="#F4F7F5" opacity="0.5" />

            <text x="40" y="290" fontFamily="ui-monospace, monospace" fontSize="44" fill="#16241E">
              E
            </text>
            <text
              x="108"
              y="290"
              fontFamily="ui-monospace, monospace"
              fontSize="32"
              fill="#5B6F66"
              transform="rotate(90 124 274)"
            >
              E
            </text>
            <text
              x="172"
              y="290"
              fontFamily="ui-monospace, monospace"
              fontSize="22"
              fill="#5B6F66"
              transform="rotate(180 183 281)"
            >
              E
            </text>
            <text x="226" y="288" fontFamily="ui-monospace, monospace" fontSize="14" fill="#5B6F66">
              E
            </text>
          </svg>
        </div>
      </section>

      {/* What gets measured */}
      <section className="mt-24">
        <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">
          What this screening measures
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="card">
            <h3 className="font-display text-lg font-medium text-accent-dark">
              Vision &amp; focus
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A tumbling-E acuity test for each eye, an estimated spherical
              correction, and a check for astigmatism.
            </p>
          </div>
          <div className="card">
            <h3 className="font-display text-lg font-medium text-accent-dark">
              Color &amp; contrast
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A color vision check, a contrast sensitivity test, and a
              red/green duochrome balance test.
            </p>
          </div>
          <div className="card">
            <h3 className="font-display text-lg font-medium text-accent-dark">
              Biometrics
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Your pupillary distance and viewing distance, measured with your
              camera, plus an Amsler grid check for macular distortion.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mt-24">
        <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">
          How it works
        </h2>
        <ol className="mt-8 space-y-6">
          <li className="flex gap-4">
            <span className="font-display text-2xl text-accent">01</span>
            <p className="text-muted">
              Answer a few quick questions about your age and any symptoms
              you&apos;ve noticed, like headaches or blurry distance vision.
            </p>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-2xl text-accent">02</span>
            <p className="text-muted">
              Work through seven short tests using your webcam — no special
              equipment needed.
            </p>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-2xl text-accent">03</span>
            <p className="text-muted">
              Get a plain-language summary of your results, with a
              recommendation on whether to book a full eye exam.
            </p>
          </li>
        </ol>
      </section>

      {/* Disclaimer */}
      <section className="mt-24 rounded-2xl border border-warm/40 bg-warm/10 p-6">
        <h2 className="font-display text-lg font-medium text-ink">
          This is a screening, not a diagnosis
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          ClearSight is designed to help you understand your vision and decide
          whether to see a professional — it does not replace a comprehensive
          eye exam. Results are not a prescription, and an optometrist or
          ophthalmologist should confirm any findings before you act on them.
        </p>
      </section>
    </main>
  )
}

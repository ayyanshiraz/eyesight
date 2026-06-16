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
            with just a webcam. It measures visual acuity, estimates your refractive
            error (Sph, Cyl, Axis), and screens for colour vision, astigmatism,
            and macular health — then emails you the results in clinical format.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/test" className="btn-primary">Start your screening</Link>
            <a href="#how-it-works" className="btn-secondary">How it works</a>
          </div>
        </div>

        {/* Sample prescription card */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted mb-3 text-center">Sample result</p>
          <div className="rounded-2xl border-2 border-accent/20 overflow-hidden shadow-sm">
            <div className="bg-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-wider">
              ClearSight — Vision Prescription
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-accent-light">
                  {["Eye","Sph","Cyl","Axis","Va"].map(h=>(
                    <th key={h} className="px-3 py-2 text-center text-muted text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-accent/10">
                  <td className="px-3 py-3 text-center"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">Right (OD)</span></td>
                  <td className="px-3 py-3 text-center font-mono font-semibold text-ink">-3.50</td>
                  <td className="px-3 py-3 text-center font-mono text-ink">-0.50</td>
                  <td className="px-3 py-3 text-center font-mono text-ink">5°</td>
                  <td className="px-3 py-3 text-center font-mono font-semibold text-accent-dark">6/9</td>
                </tr>
                <tr className="border-t border-accent/10">
                  <td className="px-3 py-3 text-center"><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold">Left (OS)</span></td>
                  <td className="px-3 py-3 text-center font-mono font-semibold text-ink">-2.50</td>
                  <td className="px-3 py-3 text-center font-mono text-ink">-0.75</td>
                  <td className="px-3 py-3 text-center font-mono text-ink">160°</td>
                  <td className="px-3 py-3 text-center font-mono font-semibold text-accent-dark">6/6</td>
                </tr>
              </tbody>
            </table>
            <div className="bg-accent-light px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-accent-dark font-medium">Diagnosis</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">MYOPIA + ASTIGMATISM</span>
            </div>
          </div>
          <p className="text-xs text-muted text-center mt-2">Sample output — not a real prescription</p>
        </div>
      </section>

      {/* What gets measured */}
      <section className="mt-24">
        <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">What this screening measures</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="card">
            <h3 className="font-display text-lg font-medium text-accent-dark">Vision &amp; focus</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Tumbling-E acuity per eye (6/6 to 6/60), spherical correction (Sph),
              cylinder (Cyl), axis, and a duochrome refractive balance test.
            </p>
          </div>
          <div className="card">
            <h3 className="font-display text-lg font-medium text-accent-dark">Colour &amp; contrast</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ishihara colour vision plate and an Amsler grid macular check.
              Results flag when further clinical assessment is needed.
            </p>
          </div>
          <div className="card">
            <h3 className="font-display text-lg font-medium text-accent-dark">Biometrics</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Pupillary distance (IPD) and viewing distance via webcam FaceMesh.
              Screen calibrated with your ID card for accurate letter sizing.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mt-24">
        <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            { n:"01", title:"Calibrate", desc:"Hold your CNIC or debit card to the screen to set the true pixel density." },
            { n:"02", title:"Questionnaire", desc:"Answer a few questions about your symptoms and eye history." },
            { n:"03", title:"Take the test", desc:"Nine short tests per eye: acuity, sphere, cylinder, colour, macular." },
            { n:"04", title:"Get results", desc:"A clinical prescription card, emailed to you instantly, that you can bring to any optometrist." },
          ].map(s=>(
            <div key={s.n} className="card">
              <span className="font-display text-2xl text-accent">{s.n}</span>
              <h3 className="font-display text-base font-medium text-ink mt-2">{s.title}</h3>
              <p className="text-sm text-muted mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Self-improving model callout */}
      <section className="mt-16 rounded-2xl border border-accent/20 bg-accent-light p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="text-4xl">🧠</div>
        <div>
          <h2 className="font-display text-xl font-medium text-ink">Gets smarter with every test</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            ClearSight runs a self-training regression model on all completed test data.
            As more patients use the platform, the sphere estimates seed closer to real prescriptions —
            making the refraction slider easier to use and the results more accurate over time.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mt-12 rounded-2xl border border-warm/40 bg-warm/10 p-6">
        <h2 className="font-display text-lg font-medium text-ink">This is a screening, not a diagnosis</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          ClearSight is designed to help you understand your vision and decide whether to see a professional —
          it does not replace a comprehensive eye exam. Results are not a prescription and should be confirmed
          by an optometrist or ophthalmologist before you act on them.
        </p>
      </section>
    </main>
  )
}

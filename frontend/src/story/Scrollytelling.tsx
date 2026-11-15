import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, Map as MapIcon } from 'lucide-react'
import { gsap, ScrollTrigger, reducedMotion } from '../lib/motion'

interface Props {
  onDetective: () => void
  onMap: () => void
}

const LAKES = [
  { id: 'imja', name: 'Imja Tsho', people: 96767 },
  { id: 'rolpa', name: 'Tsho Rolpa', people: 141911 },
  { id: 'thulagi', name: 'Thulagi', people: 165068 },
]
const TOTAL_PEOPLE = LAKES.reduce((s, l) => s + l.people, 0)
const MAX_PEOPLE = Math.max(...LAKES.map(l => l.people))

const CHAPTERS = ['Ice', 'Wall', 'People', 'Flood', 'Watch']
const MARKS = [0, 1.2, 3.8, 6, 8.8, 11]
const TOTAL = 12
const beatAt = (t: number) => {
  let i = 0
  MARKS.forEach((m, k) => { if (t >= m) i = k })
  return i
}

// Flood = a sheet of water lying on the valley floor below the dam.
// Surface points follow the terrain; thickness grows as the surge gathers volume.
type Pt = [number, number]
const SURFACE: Pt[] = [[946, 470], [992, 458], [1040, 478], [1120, 535], [1240, 595], [1340, 635], [1440, 655], [1530, 676]]
const DEPTH = [6, 12, 20, 30, 40, 48, 54, 58]
const smooth = (p: Pt[]) => p.slice(1).map((_, i) => {
  const [p0, p1, p2, p3] = [p[Math.max(i - 1, 0)], p[i], p[i + 1], p[Math.min(i + 2, p.length - 1)]]
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
  return `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
}).join(' ')
const FLOOD_TOP: Pt[] = SURFACE.map(([x, y], i) => [x, y - DEPTH[i]])
const FLOOD_BOTTOM: Pt[] = SURFACE.map(([x, y]): Pt => [x, y + 8]).reverse()
const FLOOD_TOP_D = `M${FLOOD_TOP[0]} ${smooth(FLOOD_TOP)}`
const FLOOD_D = `${FLOOD_TOP_D} L${FLOOD_BOTTOM[0]} ${smooth(FLOOD_BOTTOM)} Z`
const WATER_LOW = 560
const WATER_HIGH = 470
const WATER_MAX = 456
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

const HERO = ['The', 'ice', 'is', 'leaving.', 'The', 'water', 'is', 'staying.']

export default function Scrollytelling({ onDetective, onMap }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useLayoutEffect(() => {
    if (!stage.current || !scroller.current || !track.current) return
    const reduce = reducedMotion()
    const b = (i: number) => `[data-beat="${i}"]`

    const ctx = gsap.context(() => {
      if (!reduce) {
        gsap.from('.hero-word', { yPercent: 100, duration: 1.1, ease: 'power4.out', stagger: 0.07, delay: 0.2 })
        gsap.from('[data-hero-sub]', { autoAlpha: 0, y: 16, duration: 1, ease: 'power2.out', delay: 0.9 })
        gsap.to('#flood-foam', { strokeDashoffset: -48, repeat: -1, duration: 1.4, ease: 'none' })
      }

      gsap.set([1, 2, 3, 4, 5].map(b), { autoAlpha: 0 })
      gsap.set('#water', { attr: { y: WATER_LOW } })
      gsap.set('#glacier', { transformOrigin: '0% 60%' })
      gsap.set('#breach', { transformOrigin: '50% 0%', scaleY: 0 })
      gsap.set('#flood-clip rect', { attr: { width: 0 } })
      gsap.set('#flood-foam', { strokeDashoffset: 0 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track.current,
          scroller: scroller.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduce ? true : 1,
          onUpdate: self => setActive(beatAt(self.progress * TOTAL)),
        },
      })

      const swap = (from: number, to: number, at: number) => {
        tl.to(b(from), { autoAlpha: 0, y: -32, duration: 0.4, ease: 'power1.in' }, at)
        tl.fromTo(b(to), { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, at + 0.35)
      }
      const count = (sel: string, at: number, dur: number, to?: number) => {
        gsap.utils.toArray<HTMLElement>(sel).forEach(el => {
          const o = { v: 0 }
          el.textContent = '0'
          tl.to(o, { v: to ?? Number(el.dataset.to), duration: dur, ease: 'power1.out', onUpdate: () => { el.textContent = fmt(o.v) } }, at)
        })
      }

      tl.to('#far', { y: -30, duration: TOTAL }, 0)
      tl.to('#mid', { y: -56, duration: TOTAL }, 0)
      tl.to('#scene', { scale: 1.08, transformOrigin: '65% 60%', duration: TOTAL }, 0)

      swap(0, 1, 0.9)
      tl.to('#glacier', { scaleX: 0.58, scaleY: 0.9, duration: 2.4 }, 1.3)
      tl.to('#streams path', { strokeDashoffset: 0, duration: 1.2, stagger: 0.3 }, 1.4)
      tl.to('#water', { attr: { y: WATER_HIGH }, duration: 2.4 }, 1.3)

      swap(1, 2, 3.5)
      tl.to('#dam-glow', { opacity: 1, duration: 0.6 }, 4.0)
      tl.to('#water', { attr: { y: WATER_MAX }, duration: 1.6 }, 4.0)
      tl.to('#cracks path', { strokeDashoffset: 0, duration: 0.6, stagger: 0.3 }, 4.6)

      swap(2, 3, 5.7)
      tl.to('#dim', { opacity: 0.7, duration: 0.5 }, 5.8)
      tl.from('.lake-col', { y: 40, autoAlpha: 0, stagger: 0.25, duration: 0.6, ease: 'power2.out' }, 6.2)
      count('[data-people]', 6.3, 1.4)
      count('[data-total]', 6.6, 1.8, TOTAL_PEOPLE)

      swap(3, 4, 8.5)
      tl.to('#dim', { opacity: 0, duration: 0.4 }, 8.6)
      tl.to('#dam-glow', { opacity: 0, duration: 0.3 }, 9.0)
      tl.to('#breach', { scaleY: 1, duration: 0.7, ease: 'power2.in' }, 9.0)
      tl.to('#water', { attr: { y: WATER_LOW + 20 }, duration: 1.8 }, 9.2)
      tl.to('#flood-clip rect', { attr: { width: 660 }, duration: 1.7, ease: 'power2.in' }, 9.3)

      swap(4, 5, 10.6)
      tl.to('#dim', { opacity: 0.6, duration: 0.5 }, 10.7)
      tl.to({}, { duration: 0.1 }, TOTAL - 0.1)
    }, stage)

    return () => ctx.revert()
  }, [])

  const jump = (i: number) => {
    const sc = scroller.current
    const tr = track.current
    if (!sc || !tr) return
    const max = tr.offsetHeight - sc.clientHeight
    sc.scrollTo({ top: max * (((MARKS[i + 1] ?? 0) + 0.6) / TOTAL), behavior: 'smooth' })
  }

  return (
    <div ref={scroller} className="fixed inset-0 z-40 overflow-y-auto bg-abyss">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-14">
        <span className="font-serif text-2xl tracking-tight">GlacierWatch</span>
        <button className="btn btn-quiet pointer-events-auto bg-abyss/40 backdrop-blur-md" onClick={onMap}>Skip to the map<ArrowRight size={14} /></button>
      </header>

      <nav aria-label="Chapters" className="fixed right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        {CHAPTERS.map((c, i) => (
          <button key={c} onClick={() => jump(i)} aria-label={c} title={c} className="flex items-center justify-end py-1">
            <span className={`block h-px transition-all duration-500 ${active === i + 1 ? 'w-10 bg-glacier' : active > i + 1 ? 'w-5 bg-ink/60' : 'w-5 bg-ink/25'}`} />
          </button>
        ))}
      </nav>

      <div ref={track} style={{ height: '1100vh' }}>
        <div ref={stage} className="sticky top-0 h-screen overflow-hidden bg-abyss">
          <Scene />
          <div id="dim" className="pointer-events-none absolute inset-0 bg-abyss opacity-0" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-gradient-to-b from-abyss/90 via-abyss/55 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-abyss/70 to-transparent max-sm:hidden" />

          <div className="pointer-events-none absolute inset-0 px-6 sm:px-14">
            <section data-beat="0" className="absolute left-6 right-6 top-[15vh] max-w-[60rem] sm:left-14">
              <h1 className="display text-[clamp(2.8rem,7.5vw,7rem)]">
                {HERO.map((w, i) => (
                  <span key={i}>
                    {i === 4 && <br />}
                    <span className="mr-[0.12em] -mb-[0.35em] inline-block overflow-hidden px-[0.1em] -mx-[0.1em] pb-[0.35em] align-bottom">
                      <span className={`hero-word inline-block ${i > 3 ? 'italic text-glacier' : ''}`}>{w}</span>
                    </span>
                  </span>
                ))}
              </h1>
              <p data-hero-sub className="mt-8 text-xl text-ink/85">
                Three lakes. <span className="num text-ink">{fmt(TOTAL_PEOPLE)}</span> people below.
              </p>
            </section>

            <Beat i={1} title="The glacier retreats. The lake grows." />
            <Beat i={2} title="Held back by loose rock.">A wave or a slow leak is enough to break it.</Beat>

            <section data-beat="3" className="absolute inset-x-6 top-[14vh] sm:inset-x-14">
              <h2 className="display text-[clamp(2.2rem,5vw,4.6rem)]">Three lakes. <span className="num italic text-moraine" data-total /> people.</h2>
              <div className="mt-10 grid max-w-[60rem] gap-4 sm:grid-cols-3">
                {LAKES.map(l => (
                  <div key={l.id} className="lake-col panel p-5">
                    <h3 className="display text-2xl">{l.name}</h3>
                    <p className="num display mt-4 text-5xl"><span data-people data-to={l.people} /></p>
                    <div className="mt-4 h-1 bg-ink/10"><div className="h-full bg-moraine" style={{ width: `${(l.people / MAX_PEOPLE) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs text-ink-2">ICIMOD, 2011</p>
            </section>

            <Beat i={4} title="A dam can fail in minutes." />

            <section data-beat="5" className="pointer-events-auto absolute inset-x-6 top-[22vh] max-w-[56rem] sm:left-14">
              <h2 className="display text-[clamp(2.6rem,6.5vw,6rem)]">Watch the lakes <span className="italic text-glacier">before</span> they move.</h2>
              <div className="mt-10 flex flex-wrap gap-3">
                <button className="btn btn-flood" onClick={onDetective}>Explore the lake record<ArrowRight size={15} /></button>
                <button className="btn btn-quiet bg-abyss/40 backdrop-blur-md" onClick={onMap}><MapIcon size={15} />Open the flood map</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function Beat({ i, title, children }: { i: number; title: string; children?: React.ReactNode }) {
  return (
    <section data-beat={i} className="absolute left-6 right-6 top-[15vh] max-w-[44rem] sm:left-14">
      <h2 className="display text-[clamp(2.2rem,5vw,4.6rem)]">{title}</h2>
      {children && <p className="mt-6 text-xl leading-relaxed text-ink/85">{children}</p>}
    </section>
  )
}

function Scene() {
  return (
    <svg viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040c13" />
          <stop offset="0.55" stopColor="#0c2f40" />
          <stop offset="1" stopColor="#2c6f86" />
        </linearGradient>
        <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2fbfd" />
          <stop offset="1" stopColor="#a8dcea" />
        </linearGradient>
        <linearGradient id="lakeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fc3de" />
          <stop offset="1" stopColor="#1b6f8a" />
        </linearGradient>
        <linearGradient id="floodFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4f3fa" />
          <stop offset="0.18" stopColor="#6fd0e6" />
          <stop offset="1" stopColor="#1b6f8a" />
        </linearGradient>
        <linearGradient id="spillFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fe0f0" />
          <stop offset="1" stopColor="#4fc3de" />
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
        <clipPath id="flood-clip"><rect x="930" y="380" width="0" height="400" /></clipPath>
      </defs>
      <rect width="1440" height="800" fill="url(#sky)" />
      <g id="scene">
        <g id="far">
          <path d="M0 470 L90 330 L150 390 L260 250 L340 350 L430 300 L520 390 L640 270 L730 360 L840 300 L960 400 L1060 280 L1160 370 L1280 260 L1360 340 L1440 300 L1440 800 L0 800 Z" fill="#14455a" opacity="0.8" />
          <path d="M260 250 L226 292 L262 280 L292 304 Z M640 270 L610 308 L640 298 L670 316 Z M1060 280 L1030 322 L1062 308 L1092 330 Z M1280 260 L1250 300 L1282 288 L1310 312 Z" fill="#d7eef5" opacity="0.85" />
        </g>
        <g id="mid">
          <path d="M0 570 L120 480 L220 530 L330 440 L420 510 L560 480 L700 540 L820 490 L930 530 L1060 460 L1180 530 L1300 480 L1440 550 L1440 800 L0 800 Z" fill="#0d2f40" />
        </g>
        <rect id="water" x="300" y={WATER_LOW} width="720" height="320" fill="url(#lakeFill)" />
        <path d="M0 800 L0 570 L200 510 L340 440 L380 530 L470 600 L640 625 L800 605 L880 540 L930 470 L990 450 L1040 475 L1120 535 L1240 595 L1340 635 L1440 655 L1440 800 Z" fill="#0a2230" />
        <path d="M880 540 L930 470 L990 450 L1040 475 L1090 520 L1040 550 Z" fill="#274554" />
        <path id="dam-glow" d="M880 540 L930 470 L990 450 L1040 475 L1090 520" fill="none" stroke="#ffb27a" strokeWidth="5" strokeLinejoin="round" opacity="0" />
        <g id="cracks" fill="none" stroke="#ff5a3c" strokeWidth="3" strokeLinecap="round">
          <path d="M962 456 L955 486 L967 508 L957 532" pathLength="1" strokeDasharray="1 2" strokeDashoffset="1" />
          <path d="M996 454 L1004 480 L992 502" pathLength="1" strokeDasharray="1 2" strokeDashoffset="1" />
          <path d="M922 488 L936 510 L928 530" pathLength="1" strokeDasharray="1 2" strokeDashoffset="1" />
        </g>
        <path id="breach" d="M940 474 L992 452 L1048 480 L1030 516 L962 520 Z" fill="url(#spillFill)" />
        <path id="glacier" d="M0 360 L120 330 L260 350 L340 430 L330 450 L200 510 L0 570 Z" fill="url(#ice)" />
        <g id="streams" fill="none" stroke="#8fe0f0" strokeWidth="3" strokeLinecap="round">
          <path d="M338 448 Q350 510 392 578" pathLength="1" strokeDasharray="1 2" strokeDashoffset="1" />
          <path d="M300 472 Q318 530 360 572" pathLength="1" strokeDasharray="1 2" strokeDashoffset="1" />
        </g>
        <g clipPath="url(#flood-clip)">
          <path d={FLOOD_D} fill="#ff7a4d" opacity="0.4" filter="url(#blur)" />
          <path d={FLOOD_D} fill="url(#floodFill)" />
          <path id="flood-foam" d={FLOOD_TOP_D} fill="none" stroke="#f2fbfd" strokeWidth="4" strokeLinecap="round" strokeDasharray="14 10" opacity="0.85" />
        </g>
      </g>
    </svg>
  )
}
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

export const LAKES = [
  { id: "imja", name: "Imja Tsho", people: 96767 },
  { id: "rolpa", name: "Tsho Rolpa", people: 141911 },
  { id: "thulagi", name: "Thulagi", people: 165068 },
];
export const TOTAL_PEOPLE = LAKES.reduce((s, l) => s + l.people, 0);

const CHAPTERS = ["Ice", "Wall", "People", "Flood", "Watch"];
const MARKS = [0, 1.2, 3.8, 6, 8.8, 11];
const TOTAL = 12;
const beatAt = (t: number) => { let i = 0; MARKS.forEach((m, k) => { if (t >= m) i = k; }); return i; };

const FLOW = "M 990 470 C 1060 510, 1100 545, 1170 560 S 1300 600, 1440 660";
const WATER_LOW = 560, WATER_HIGH = 470, WATER_MAX = 456;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

const HERO = ["The", "ice", "is", "leaving.", "The", "water", "is", "staying."];

export default function GlofStory() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const b = (i: number) => `[data-beat="${i}"]`;

    if (!reduce) {
      gsap.from(".hero-word", { yPercent: 100, duration: 1.1, ease: "power4.out", stagger: 0.07, delay: 0.2 });
      gsap.from("[data-hero-sub]", { autoAlpha: 0, y: 16, duration: 1, ease: "power2.out", delay: 0.9 });
      gsap.to("[data-cue-dot]", { y: 10, repeat: -1, yoyo: true, duration: 0.9, ease: "sine.inOut" });
    }

    gsap.set([1, 2, 3, 4, 5].map(b), { autoAlpha: 0 });
    gsap.set("#water", { attr: { y: WATER_LOW } });
    gsap.set("#glacier", { transformOrigin: "0% 60%" });
    gsap.set("#breach", { transformOrigin: "50% 0%", scaleY: 0 });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: track.current, start: "top top", end: "bottom bottom",
        scrub: reduce ? true : 1,
        onUpdate: (self) => setActive(beatAt(self.progress * TOTAL)),
      },
    });

    const swap = (from: number, to: number, at: number) => {
      tl.to(b(from), { autoAlpha: 0, y: -32, duration: 0.4, ease: "power1.in" }, at);
      tl.fromTo(b(to), { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, at + 0.35);
    };
    const count = (sel: string, at: number, dur: number, to?: number) => {
      gsap.utils.toArray<HTMLElement>(sel).forEach((el) => {
        const o = { v: 0 }; el.textContent = "0";
        tl.to(o, { v: to ?? Number(el.dataset["to"]), duration: dur, ease: "power1.out", onUpdate: () => { el.textContent = fmt(o.v); } }, at);
      });
    };

    tl.to("#far", { y: -30, duration: TOTAL }, 0);
    tl.to("#mid", { y: -56, duration: TOTAL }, 0);
    tl.to("#scene", { scale: 1.08, transformOrigin: "65% 60%", duration: TOTAL }, 0);
    tl.to("[data-cue]", { autoAlpha: 0, duration: 0.3 }, 0.1);
    swap(0, 1, 0.9);
    tl.to("#glacier", { scaleX: 0.58, scaleY: 0.9, duration: 2.4 }, 1.3);
    tl.to("#streams path", { strokeDashoffset: 0, duration: 1.2, stagger: 0.3 }, 1.4);
    tl.to("#water", { attr: { y: WATER_HIGH }, duration: 2.4 }, 1.3);
    swap(1, 2, 3.5);
    tl.to("#dam-glow", { opacity: 1, duration: 0.6 }, 4.0);
    tl.to("#water", { attr: { y: WATER_MAX }, duration: 1.6 }, 4.0);
    tl.to("#cracks path", { strokeDashoffset: 0, duration: 0.6, stagger: 0.3 }, 4.6);
    swap(2, 3, 5.7);
    tl.to("#dim", { opacity: 0.7, duration: 0.5 }, 5.8);
    tl.from(".lake-col", { y: 40, autoAlpha: 0, stagger: 0.25, duration: 0.6, ease: "power2.out" }, 6.2);
    count("[data-people]", 6.3, 1.4);
    count("[data-total]", 6.6, 1.8, TOTAL_PEOPLE);
    swap(3, 4, 8.5);
    tl.to("#dim", { opacity: 0, duration: 0.4 }, 8.6);
    tl.to("#dam-glow", { opacity: 0, duration: 0.3 }, 9.0);
    tl.to("#breach", { scaleY: 1, duration: 0.6 }, 9.0);
    tl.to("#water", { attr: { y: WATER_LOW + 20 }, duration: 1.6 }, 9.1);
    tl.to("#flood, #flood-glow", { strokeDashoffset: 0, duration: 1.6, ease: "power1.in" }, 9.2);
    swap(4, 5, 10.6);
    tl.to("#dim", { opacity: 0.6, duration: 0.5 }, 10.7);
    tl.to({}, { duration: 0.1 }, TOTAL - 0.1);
  }, { scope: stage });

  const jump = (i: number) => {
    const el = track.current; if (!el) return;
    const max = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + max * (((MARKS[i + 1] ?? 0) + 0.6) / TOTAL), behavior: "smooth" });
  };

  return (
    <div ref={track} style={{ height: "1100vh" }} className="relative bg-background">
      <div ref={stage} className="sticky top-0 h-screen overflow-hidden">
        <Scene />
        <div id="dim" className="pointer-events-none absolute inset-0 bg-background opacity-0" />
        <div className="scrim pointer-events-none absolute inset-x-0 top-0 h-[60%]" />

        <header className="absolute inset-x-0 top-0 z-20 px-6 py-5 sm:px-14">
          <span className="display text-2xl">GlacierWatch</span>
        </header>

        <nav aria-label="Chapters" className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
          {CHAPTERS.map((c, i) => (
            <button key={c} onClick={() => jump(i)} aria-label={c} title={c} className="flex items-center justify-end py-1">
              <span className={`block h-px transition-all duration-500 ${active === i + 1 ? "w-10 bg-primary" : active > i + 1 ? "w-5 bg-foreground/60" : "w-5 bg-foreground/25"}`} />
            </button>
          ))}
        </nav>

        <div className="absolute inset-0 px-6 sm:px-14">
          <section data-beat="0" className="absolute left-6 right-6 top-[15vh] max-w-[60rem] sm:left-14">
            <h1 className="display text-[clamp(2.8rem,7.5vw,7rem)]">
              {HERO.map((w, i) => (
                <span key={i}>
                  {i === 4 && <br />}
                  <span className="mr-[0.22em] -mb-[0.2em] inline-block overflow-hidden pb-[0.2em] align-bottom">
                    <span className={`hero-word inline-block ${i > 3 ? "italic text-primary" : ""}`}>{w}</span>
                  </span>
                </span>
              ))}
            </h1>
            <p data-hero-sub className="mt-8 text-xl text-foreground/85">
              Three lakes. <span className="num text-foreground">{fmt(TOTAL_PEOPLE)}</span> people below.
            </p>
          </section>
          <div data-cue aria-hidden="true" className="absolute bottom-10 left-1/2 -translate-x-1/2">
            <span className="flex h-10 w-6 justify-center rounded-full border border-foreground/40 pt-2"><span data-cue-dot className="h-2 w-1 rounded-full bg-foreground" /></span>
          </div>

          <Beat i={1} title="The glacier retreats. The lake grows." />
          <Beat i={2} title="Held back by loose rock.">A wave or a slow leak is enough to break it.</Beat>

          <section data-beat="3" className="absolute inset-x-6 top-[14vh] sm:inset-x-14">
            <h2 className="display text-[clamp(2.2rem,5vw,4.6rem)]">Three lakes. <span className="num italic text-flood" data-total /> people.</h2>
            <div className="mt-10 grid max-w-[60rem] gap-4 sm:grid-cols-3">
              {LAKES.map((l) => (
                <div key={l.id} className="lake-col glass p-5">
                  <h3 className="display text-2xl">{l.name}</h3>
                  <p className="num display mt-4 text-5xl"><span data-people data-to={l.people} /></p>
                  <div className="mt-4 h-1 bg-foreground/10"><div className="h-full bg-flood" style={{ width: `${(l.people / 165068) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">ICIMOD, 2011</p>
          </section>

          <Beat i={4} title="A dam can fail in minutes." />

          <section data-beat="5" className="absolute inset-x-6 top-[22vh] max-w-[56rem] sm:left-14">
            <h2 className="display text-[clamp(2.6rem,6.5vw,6rem)]">Watch the lakes <span className="italic text-primary">before</span> they move.</h2>
          </section>
        </div>
      </div>
    </div>
  );
}

function Beat({ i, title, children }: { i: number; title: string; children?: React.ReactNode }) {
  return (
    <section data-beat={i} className="absolute left-6 right-6 top-[15vh] max-w-[44rem] sm:left-14">
      <h2 className="display text-[clamp(2.2rem,5vw,4.6rem)]">{title}</h2>
      {children && <p className="mt-6 text-xl leading-relaxed text-foreground/85">{children}</p>}
    </section>
  );
}

function Scene() {
  return (
    <svg viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--sky-top)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--sky-mid)" }} />
          <stop offset="1" style={{ stopColor: "var(--sky-low)" }} />
        </linearGradient>
        <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--ice-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--ice-b)" }} />
        </linearGradient>
        <linearGradient id="lakeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--lake-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--lake-b)" }} />
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="1440" height="800" fill="url(#sky)" />
      <g id="scene">
        <g id="far">
          <path d="M0 470 L90 330 L150 390 L260 250 L340 350 L430 300 L520 390 L640 270 L730 360 L840 300 L960 400 L1060 280 L1160 370 L1280 260 L1360 340 L1440 300 L1440 800 L0 800 Z" style={{ fill: "var(--ridge-far)" }} opacity="0.8" />
          <path d="M260 250 L226 292 L262 280 L292 304 Z M640 270 L610 308 L640 298 L670 316 Z M1060 280 L1030 322 L1062 308 L1092 330 Z M1280 260 L1250 300 L1282 288 L1310 312 Z" style={{ fill: "var(--snow)" }} opacity="0.85" />
        </g>
        <g id="mid">
          <path d="M0 570 L120 480 L220 530 L330 440 L420 510 L560 480 L700 540 L820 490 L930 530 L1060 460 L1180 530 L1300 480 L1440 550 L1440 800 L0 800 Z" style={{ fill: "var(--ridge-mid)" }} />
        </g>
        <rect id="water" x="300" y={WATER_LOW} width="720" height="320" fill="url(#lakeFill)" />
        <path d="M0 800 L0 570 L200 510 L340 440 L380 530 L470 600 L640 625 L800 605 L880 540 L930 470 L990 450 L1040 475 L1120 535 L1240 595 L1340 635 L1440 655 L1440 800 Z" style={{ fill: "var(--ground)" }} />
        <path d="M880 540 L930 470 L990 450 L1040 475 L1090 520 L1040 550 Z" style={{ fill: "var(--moraine)" }} />
        <path id="dam-glow" d="M880 540 L930 470 L990 450 L1040 475 L1090 520" fill="none" style={{ stroke: "var(--ember)" }} strokeWidth="5" strokeLinejoin="round" opacity="0" />
        <g id="cracks" fill="none" style={{ stroke: "var(--flood)" }} strokeWidth="3" strokeLinecap="round">
          <path d="M962 456 L955 486 L967 508 L957 532" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          <path d="M996 454 L1004 480 L992 502" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          <path d="M922 488 L936 510 L928 530" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
        </g>
        <path id="breach" d="M958 458 L1018 464 L1032 520 L944 522 Z" style={{ fill: "var(--lake-a)" }} />
        <path id="glacier" d="M0 360 L120 330 L260 350 L340 430 L330 450 L200 510 L0 570 Z" fill="url(#ice)" />
        <g id="streams" fill="none" style={{ stroke: "var(--melt)" }} strokeWidth="3" strokeLinecap="round">
          <path d="M338 448 Q350 510 392 578" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          <path d="M300 472 Q318 530 360 572" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
        </g>
        <path id="flood-glow" d={FLOW} fill="none" style={{ stroke: "var(--flood)" }} strokeWidth="36" strokeLinecap="round" opacity="0.55" filter="url(#blur)" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
        <path id="flood" d={FLOW} fill="none" style={{ stroke: "var(--flood)" }} strokeWidth="13" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
      </g>
    </svg>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Clock, Compass, Mountain, SlidersHorizontal } from 'lucide-react'
import Dock from './components/Dock'
import type { MapRef } from 'react-map-gl/mapbox'
import type { Feature, Polygon, Position } from 'geojson'
import MapView from './components/MapView'
import Scrubber from './components/Scrubber'
import ActionCard from './components/ActionCard'
import Credits from './components/Credits'
import Detective from './detective/Detective'
import Scrollytelling from './story/Scrollytelling'
import { gsap, reducedMotion } from './lib/motion'
import { useTimeline } from './hooks/useTimeline'
import { useScenario, useSmooth } from './hooks/useScenario'
import { loadExposure, loadLakes, loadPaths } from './lib/api'
import { YEAR_MAX, YEAR_MIN } from './lib/demoData'
import { bufferLine, catmullRom, centroid, cumulativeKm, projectOnLine, scalePolygon, sliceLine } from './lib/geo'
import { lakeAt } from './lib/timeline'
import type { ExposureFeature, LakeFeature } from './types'

type View = 'story' | 'detective' | 'map'

const RATIO_MIN = 0.85
const RATIO_MAX = 3.2
const REACH_MIN_FRAC = 0.2
const RATIO_FULL = 2.6
const RATIO_START = 0.9
const BASE_HALF_WIDTH_M = 90
const WIDEN_M_PER_KM = 7

function reachFraction(ratio: number): number {
  const f = Math.min(1, Math.max(0, (ratio - RATIO_START) / (RATIO_FULL - RATIO_START)))
  return REACH_MIN_FRAC + (1 - REACH_MIN_FRAC) * f
}

export default function App() {
  const mapRef = useRef<MapRef>(null)
  const [lakeId, setLakeId] = useState('')
  const [lakes, setLakes] = useState<LakeFeature[]>([])
  const [paths, setPaths] = useState<Record<string, Position[]>>({})
  const [exposure, setExposure] = useState<ExposureFeature[]>([])
  const [deltaC, setDeltaC] = useState(1.5)
  const [years, setYears] = useState(30)
  const [view, setView] = useState<View>('story')
  const root = useRef<HTMLDivElement>(null)
  const curtain = useRef<HTMLDivElement>(null)
  const [creditsOpen, setCreditsOpen] = useState(false)

  const lakeList = useMemo(() => {
    const byId = new Map<string, LakeFeature>()
    for (const f of lakes) {
      const cur = byId.get(f.properties.lake_id)
      if (!cur || f.properties.year > cur.properties.year) byId.set(f.properties.lake_id, f)
    }
    return [...byId.entries()].map(([id, f]) => ({
      id, label: (f.properties.lake_name ?? id).replace(/\s*\(.*\)/, ''), sub: f.properties.elevation_m ? `${f.properties.elevation_m.toLocaleString()} m` : '',
      center: centroid(f.geometry) as [number, number]
    }))
  }, [lakes])

  const flyTo = (center: [number, number]) =>
    mapRef.current?.flyTo({ center, zoom: 12.5, bearing: 200, pitch: 62, duration: 3500, essential: true })

  const selectLake = (id: string) => {
    setLakeId(id)
    const l = lakeList.find(x => x.id === id)
    if (l) flyTo(l.center)
  }

  const go = (next: View, after?: () => void) => {
    const c = curtain.current
    if (!c || reducedMotion()) { setView(next); after?.(); return }
    gsap.timeline()
      .to(c, { autoAlpha: 1, duration: 0.4, ease: 'power2.in' })
      .add(() => { setView(next); after?.() })
      .to(c, { autoAlpha: 0, duration: 0.8, ease: 'power2.out', delay: 0.15 })
  }

  const goMap = () => go('map', () => {
    const l = lakeList.find(x => x.id === lakeId)
    if (l) flyTo(l.center)
  })

  const openOnMap = (id: string, delta?: number) => {
    selectLake(id)
    if (delta != null) setDeltaC(delta)
    go('map')
  }

  useLayoutEffect(() => {
    if (view !== 'map' || reducedMotion() || !root.current) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.4 }, delay: 0.45 })
      tl.from('[data-dock="left"]', { xPercent: -10, autoAlpha: 0 })
        .from('[data-lake-item]', { autoAlpha: 0, x: -12, duration: 0.8, stagger: 0.07 }, 0.25)
        .from('[data-dock="right"]', { xPercent: 8, autoAlpha: 0 }, 0.15)
        .from('[data-dock="bottom"]', { yPercent: 30, autoAlpha: 0 }, 0.3)
    }, root)
    return () => ctx.revert()
  }, [view])

  const epochYears = useMemo(
    () => lakes.filter(f => f.properties.lake_id === lakeId).map(f => f.properties.year), [lakes, lakeId])
  const yMin = epochYears.length ? Math.min(...epochYears) : YEAR_MIN
  const yMax = epochYears.length ? Math.max(...epochYears) : YEAR_MAX
  const tl = useTimeline(yMin, yMax)
  useEffect(() => { tl.setT(yMax) }, [yMax, lakeId])

  useEffect(() => { loadLakes().then(c => setLakes(c.features)); loadPaths().then(setPaths); loadExposure().then(setExposure) }, [])
  useEffect(() => { if (!lakeId && lakeList.length) setLakeId(lakeList[0].id) }, [lakeList, lakeId])

  const sim = useScenario(lakeId, deltaC, years)
  const { now, rings, areaKm2 } = useMemo(() => lakeAt(lakes, lakeId, tl.t), [lakes, lakeId, tl.t])

  const q0 = sim.baseQ, q1 = sim.data?.peak_discharge_m3s
  const rawRatio = q0 && q1 ? q1 / q0 : 1 + 0.18 * deltaC * Math.sqrt(years / 25)
  const ratio = useSmooth(Math.min(RATIO_MAX, Math.max(RATIO_MIN, rawRatio)))

  const river = useMemo(() => {
    const origin = lakeList.find(l => l.id === lakeId)?.center
    let raw = paths[lakeId]
    if (!raw || raw.length < 2) {
      const pts = exposure
        .filter(e => e.properties.lake_id === lakeId)
        .sort((x, y) => (x.properties.eta_minutes ?? x.properties.distance_km ?? 0) - (y.properties.eta_minutes ?? y.properties.distance_km ?? 0))
        .map(e => e.geometry.coordinates)
      raw = origin ? [origin, ...pts] : pts
    }
    if (raw.length < 2) return null
    const line = catmullRom(raw)
    const cum = cumulativeKm(line)
    return { line, cum, total: cum[cum.length - 1] }
  }, [paths, exposure, lakeId, lakeList])

  const reachKm = river ? river.total * reachFraction(ratio) : 0

  const flood = useMemo<Feature<Polygon> | null>(() => {
    if (!river) return null
    const { pts, km } = sliceLine(river.line, river.cum, reachKm)
    if (pts.length < 2) return null
    const widthScale = Math.pow(ratio, 0.6)
    const halfW = km.map(k => (BASE_HALF_WIDTH_M + WIDEN_M_PER_KM * k) * widthScale)
    return { type: 'Feature', properties: { ratio }, geometry: bufferLine(pts, halfW) }
  }, [river, reachKm, ratio])

  const scenarioLake = useMemo<Feature<Polygon> | null>(() => {
    const latest = lakes.filter(f => f.properties.lake_id === lakeId).sort((a, b) => b.properties.year - a.properties.year)[0]
    if (!latest || !sim.data || deltaC === 0) return null
    const k = Math.sqrt(sim.data.new_area_km2 / latest.properties.area_km2)
    return { type: 'Feature', properties: {}, geometry: scalePolygon(latest.geometry, centroid(latest.geometry), k, k) }
  }, [lakes, lakeId, sim.data, deltaC])

  const exposureState = useMemo(() => {
    return exposure
      .filter(e => e.properties.lake_id === lakeId)
      .map(feature => {
        const exposed = !!river && projectOnLine(feature.geometry.coordinates, river.line, river.cum).along <= reachKm
        return { feature, exposed }
      })
  }, [exposure, lakeId, river, reachKm])

  const dynamicEtaRows = useMemo(() => {
    const rows = exposureState
      .filter(e => e.exposed)
      .map(({ feature: f }) => {
        const p = f.properties
        return {
          name: p.name,
          asset_type: p.kind,
          eta_minutes: p.eta_minutes ?? null,
          distance_km: p.distance_km ?? null,
          criticality: (p.criticality ?? 'MEDIUM').toUpperCase(),
        }
      })
      .sort((a, b) => (a.eta_minutes ?? 1e9) - (b.eta_minutes ?? 1e9))
    if (!rows.length && sim.data?.risk_detail?.eta_table?.length) {
      return sim.data.risk_detail.eta_table
    }
    return rows
  }, [exposureState, sim.data])

  const lakeName = lakeList.find(l => l.id === lakeId)?.label ?? ''
  const observedArea = useMemo(() => lakes.filter(f => f.properties.lake_id === lakeId).sort((x, y) => y.properties.year - x.properties.year)[0]?.properties.area_km2 ?? null, [lakes, lakeId])

  return (
    <div ref={root} className="relative h-full w-full">
      <MapView ref={mapRef} lakeNow={now} rings={rings} scenarioLake={scenarioLake} flood={flood} exposure={exposureState} />

      {view === 'map' && (
        <>
          <Dock side="left" label="Lakes" icon={<Mountain size={15} />} className="absolute left-4 top-4 max-sm:right-4">
          <div className="panel w-60 p-5 max-sm:w-auto">
            <h1 className="display pr-7 text-3xl">GlacierWatch</h1>
            <p className="eyebrow mb-3 mt-5">Glacial lakes</p>
            <ul className="mb-5 space-y-1 max-sm:flex max-sm:flex-wrap max-sm:gap-1 max-sm:space-y-0">
              {lakeList.map(l => (
                <li key={l.id} data-lake-item>
                  <button onClick={() => selectLake(l.id)} aria-current={l.id === lakeId}
                    className={`flex w-full items-baseline justify-between rounded-lg border-l-2 px-3 py-2 text-left text-sm transition-all duration-300 ${l.id === lakeId ? 'border-glacier bg-glacier/10 font-semibold text-ink' : 'border-transparent text-ink-2 hover:bg-ink/5 hover:text-ink'}`}>
                    <span>{l.label}</span>
                    <span className="num text-[11px] font-normal text-ink-2">{l.sub}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hairline mb-3" />
            <ul className="flex flex-col gap-0.5 text-sm max-sm:flex-row max-sm:flex-wrap">
              <li><button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink" onClick={() => go('detective')}><Compass size={14} />Data Detective</button></li>
              <li><button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink" onClick={() => setCreditsOpen(true)}><BookOpen size={14} />Data and credits</button></li>
            </ul>
          </div>
          </Dock>

          <Dock side="right" label="Scenario" icon={<SlidersHorizontal size={15} />} className="absolute right-4 top-4 max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto">
          <ActionCard lakeName={lakeName} deltaC={deltaC} years={years} onDelta={setDeltaC} onYears={setYears} sim={sim.data} baseQ={sim.baseQ}
            observedAreaKm2={observedArea} loading={sim.loading} error={sim.error}
            exposedCount={exposureState.filter(e => e.exposed).length}
            etaRows={dynamicEtaRows} />
          </Dock>
          <Dock side="bottom" label="Timeline" icon={<Clock size={15} />} className="absolute inset-x-0 bottom-4 mx-auto w-[min(720px,calc(100vw-2rem))] max-sm:hidden">
          <Scrubber t={tl.t} min={yMin} max={yMax} playing={tl.playing} areaKm2={areaKm2} onChange={tl.setT} onToggle={tl.toggle} />
          </Dock>
        </>
      )}

      {view === 'story' && <Scrollytelling onDetective={() => go('detective')} onMap={goMap} />}
      {view === 'detective' && <Detective lakes={lakes} onOpenMap={openOnMap} onClose={goMap} />}
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}

      <div ref={curtain} className="pointer-events-none invisible fixed inset-0 z-[80] bg-abyss opacity-0" />
    </div>
  )
}

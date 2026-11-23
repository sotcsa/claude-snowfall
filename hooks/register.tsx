import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Téli éjszaka sötétben, deres reggel világosban.
const { theme, problems } = makeColors({
  label: 'Snowfall',
  roles: { accent: '#4f86c6', danger: '#c0473f', success: '#4f8f5e', warning: '#b07a1e', pro: '#7a64b0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e3eaf2',
        'surface-1': '#ebf0f6',
        'surface-2': '#f4f7fb',
        'text-primary': '#16212e',
        'text-secondary': '#3a4858',
        'text-muted': '#55657a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0d1522',
        'surface-1': '#131c2b',
        'surface-2': '#192334',
        'surface-3': '#1f2a3d',
        'text-primary': '#eaf1f9',
        'text-secondary': '#c3cfdd',
        'text-muted': '#9aa9bc',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'snow' },
}

// --- a hó -------------------------------------------------------------------

const W = 1600
const H = 1000
const MIN_FLAKES = 6
const MAX_FLAKES = 260
const LAYERS = [
  { dur: 38, sway: 9, rMin: 1.6, rMax: 2.4, op: 0.6 }, // távoli, lassú
  { dur: 28, sway: 7, rMin: 2.2, rMax: 3.2, op: 0.75 },
  { dur: 20, sway: 6, rMin: 3.0, rMax: 4.2, op: 0.85 },
  { dur: 14, sway: 5, rMin: 3.8, rMax: 5.6, op: 0.95 }, // közeli, gyorsabb
]

// Determinisztikus véletlen: a pelyhek nem ugrálnak újrarajzoláskor,
// a sűrűsödéskor csak újak jönnek hozzá.
function rand(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

let percent = 0
let lastBucket = -1

// 5%-os lépcsőkben sűrűsödik, hogy ne rajzoljon újra minden apró változásra.
function bucketOf(p: number): number {
  return Math.min(20, Math.max(0, Math.round(p / 5)))
}

// --- karácsonyi táj -----------------------------------------------------------

const n = (v: number): string => v.toFixed(1)

// Fenyő havas ágakkal; `lights` > 0 esetén karácsonyi égőkkel, `star` esetén csillaggal.
function pine(x: number, base: number, h: number, cls: string, lights: number, star: boolean, seed: number): string {
  let out = `<rect class="trunk" x="${n(x - h * 0.035)}" y="${n(base - h * 0.08)}" width="${n(h * 0.07)}" height="${n(h * 0.1)}"/>`
  const tiers = 4
  for (let t = 0; t < tiers; t++) {
    const top = base - h + t * 0.21 * h
    const bot = top + 0.36 * h
    const hw = h * (0.12 + 0.06 * t)
    out += `<polygon class="${cls}" points="${n(x)},${n(top)} ${n(x - hw)},${n(bot)} ${n(x + hw)},${n(bot)}"/>`
    // hósapka az ág tetején, hullámos aljjal
    const d = 0.45 * (bot - top)
    const s = hw * 0.45
    out +=
      `<path class="snow" d="M${n(x)} ${n(top)} L${n(x - s * 1.05)} ${n(top + d)} ` +
      `Q${n(x - s * 0.5)} ${n(top + d * 0.72)} ${n(x - s * 0.1)} ${n(top + d * 0.95)} ` +
      `Q${n(x + s * 0.4)} ${n(top + d * 0.68)} ${n(x + s * 1.05)} ${n(top + d)} Z"/>`
    // hó az ág alsó szélén
    out +=
      `<path class="snow" d="M${n(x - hw)} ${n(bot)} Q${n(x - hw * 0.5)} ${n(bot - h * 0.025)} ${n(x)} ${n(bot - h * 0.01)} ` +
      `Q${n(x + hw * 0.5)} ${n(bot - h * 0.03)} ${n(x + hw)} ${n(bot)} Z"/>`
  }
  // égők: lazán a fa sziluettjén belül
  for (let i = 0; i < lights; i++) {
    const fy = 0.22 + rand(seed + i, 7) * 0.68
    const yy = base - h + fy * h * 0.98
    const half = h * (0.04 + fy * 0.26)
    const xx = x + (rand(seed + i, 8) * 2 - 1) * half * 0.8
    const c = 1 + ((seed + i) % 4)
    const delay = (rand(seed + i, 9) * 5).toFixed(1)
    out += `<circle class="bulb b${c}" cx="${n(xx)}" cy="${n(yy)}" r="${n(Math.max(2.2, h * 0.014))}" style="animation-delay:-${delay}s"/>`
  }
  if (star) {
    const r = h * 0.06
    const cy = base - h - r * 0.3
    const pts: string[] = []
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5
      const rr = k % 2 === 0 ? r : r * 0.45
      pts.push(`${n(x + Math.cos(a) * rr)},${n(cy + Math.sin(a) * rr)}`)
    }
    out += `<polygon class="star" points="${pts.join(' ')}"/>`
  }
  return out
}

// Rénszarvas, egyszerű formákból; `scale` < 0 tükrözi.
function reindeer(x: number, y: number, scale: number, redNose: boolean, cls = 'deer'): string {
  const sx = scale
  const sy = Math.abs(scale)
  return (
    `<g class="${cls}" transform="translate(${n(x)} ${n(y)}) scale(${sx} ${sy})">` +
    `<path class="antler" d="M38 -38 L32 -58 L24 -66 M32 -58 L38 -69 M35 -50 L27 -52 M43 -38 L47 -60 L43 -71 M47 -60 L55 -68 M46 -51 L53 -54"/>` +
    `<rect x="-27" y="6" width="5" height="32" rx="2"/><rect x="-17" y="6" width="5" height="32" rx="2"/>` +
    `<rect x="15" y="6" width="5" height="32" rx="2"/><rect x="24" y="6" width="5" height="32" rx="2"/>` +
    `<ellipse cx="0" cy="0" rx="34" ry="15"/>` +
    `<ellipse cx="-34" cy="-6" rx="5" ry="4"/>` +
    `<polygon points="20,-6 31,-31 41,-27 34,-1"/>` +
    `<ellipse cx="42" cy="-33" rx="11" ry="7"/>` +
    `<ellipse cx="51" cy="-30" rx="7" ry="5"/>` +
    `<polygon points="34,-38 28,-45 38,-41"/>` +
    `<ellipse class="belly" cx="2" cy="8" rx="24" ry="5"/>` +
    (redNose ? `<circle class="nose" cx="57" cy="-30" r="4"/>` : '') +
    `</g>`
  )
}

function buildLandscape(): { back: string; front: string; sky: string } {
  // csillagok (sötét módban látszanak) és a hold
  let stars = ''
  for (let i = 0; i < 46; i++) {
    const x = rand(i, 21) * W
    const y = rand(i, 22) * H * 0.5
    const r = 0.8 + rand(i, 23) * 1.4
    const delay = (rand(i, 24) * 6).toFixed(1)
    stars += `<circle class="sky-star" cx="${n(x)}" cy="${n(y)}" r="${n(r)}" style="animation-delay:-${delay}s"/>`
  }
  const moon =
    `<circle class="moon-glow" cx="1240" cy="170" r="95"/>` +
    `<circle class="moon" cx="1240" cy="170" r="52"/>` +
    `<circle class="moon-spot" cx="1222" cy="158" r="9"/><circle class="moon-spot" cx="1258" cy="186" r="6"/>`

  // rénszarvasszán, lassan átrepül az égen; nyugalmi helyzetben a hold előtt
  let team = ''
  for (let k = 0; k < 4; k++) {
    team += reindeer(1215 + k * 52, 192 - k * 5, 0.42, k === 3, 'deer flyer')
  }
  const sleigh =
    `<g class="flyer">` +
    `<path class="rein" d="M1166 160 L1380 172"/>` +
    `<circle cx="1132" cy="136" r="9"/><path d="M1121 146 L1143 146 L1148 158 L1116 158 Z"/>` +
    `<path d="M1098 150 Q1094 168 1108 170 L1166 170 L1172 152 L1150 156 L1144 160 L1112 160 Q1104 158 1106 148 Z"/>` +
    `<path class="rein" d="M1092 178 L1168 178 Q1182 178 1184 166 M1112 170 V178 M1152 170 V178"/>` +
    `</g>`
  const flight = `<g class="sleigh">${team}${sleigh}</g>`

  const sky = stars + moon + flight

  // távoli hegyek hósapkával
  const peaks: [number, number, number][] = [
    [180, 560, 38], [520, 470, 55], [860, 540, 40], [1220, 500, 50],
  ]
  let back =
    `<path class="mtn" d="M0 700 L180 560 L330 640 L520 470 L700 620 L860 540 L1040 650 L1220 500 L1400 610 L1600 540 L1600 1000 L0 1000 Z"/>`
  for (const [px, py, s] of peaks) {
    back +=
      `<path class="cap" d="M${px} ${py} L${n(px - s * 1.15)} ${n(py + s)} L${n(px - s * 0.55)} ${n(py + s * 0.8)} ` +
      `L${n(px - s * 0.1)} ${n(py + s * 1.1)} L${n(px + s * 0.45)} ${n(py + s * 0.82)} L${n(px + s * 0.95)} ${n(py + s)} Z"/>`
  }
  back += `<path class="hill-far" d="M0 770 C300 715 600 790 900 750 S1400 712 1600 760 L1600 1000 L0 1000 Z"/>`
  // kis, távoli fenyők
  const farX = [70, 150, 240, 420, 505, 590, 1010, 1090, 1170, 1350, 1440, 1530]
  farX.forEach((x, i) => {
    const h = 60 + rand(i, 31) * 34
    back += pine(x, 772 + rand(i, 32) * 14, h, 'pine-far', 0, false, 100 + i * 7)
  })

  // közeli domb, nagy díszített fenyők, faház, rénszarvasok
  let front = `<path class="hill-near" d="M0 862 C250 812 500 880 800 848 S1300 812 1600 868 L1600 1000 L0 1000 Z"/>`
  front += pine(130, 900, 260, 'pine', 10, false, 11)
  front += pine(255, 880, 330, 'pine', 16, true, 31)
  front += pine(370, 905, 220, 'pine', 9, false, 53)
  front += pine(1450, 905, 300, 'pine', 14, true, 71)
  front += pine(1555, 915, 230, 'pine', 9, false, 97)

  // faház meleg fényű ablakkal
  front +=
    `<g>` +
    `<rect class="chimney" x="1298" y="760" width="18" height="40"/>` +
    `<rect class="cabin" x="1225" y="806" width="130" height="78"/>` +
    `<polygon class="roof" points="1212,812 1290,752 1368,812"/>` +
    `<path class="snow" d="M1206 814 L1290 744 L1374 814 Q1350 806 1330 815 Q1300 803 1275 815 Q1245 805 1206 814 Z"/>` +
    `<rect class="snow" x="1295" y="752" width="24" height="9" rx="4"/>` +
    `<rect class="window" x="1245" y="828" width="30" height="26" rx="2"/>` +
    `<rect class="window" x="1300" y="828" width="30" height="26" rx="2"/>` +
    `<path class="frame" d="M1260 828 V854 M1245 841 H1275 M1315 828 V854 M1300 841 H1330"/>` +
    `<circle class="wreath" cx="1290" cy="822" r="7"/>` +
    `</g>`

  // rénszarvasok a havas dombon
  front += reindeer(560, 860, 0.8, true)
  front += reindeer(700, 852, -0.72, false)
  front += reindeer(1040, 846, 0.6, false)

  return { back, front, sky }
}

const LAND = buildLandscape()

function buildScene(p: number): string {
  const share = bucketOf(p) / 20
  const count = Math.round(MIN_FLAKES + (MAX_FLAKES - MIN_FLAKES) * share)
  const layerFlakes: string[][] = LAYERS.map(() => [])

  for (let i = 0; i < count; i++) {
    const li = i % LAYERS.length
    const L = LAYERS[li]!
    const x = (rand(i, 1) * W).toFixed(0)
    const y = (rand(i, 2) * H).toFixed(0)
    const r = (L.rMin + rand(i, 3) * (L.rMax - L.rMin)).toFixed(1)
    layerFlakes[li]!.push(`<circle cx="${x}" cy="${y}" r="${r}"/>`)
  }

  // Az előtér hóbuckája is vastagszik a kitöltöttséggel.
  const drift = 8 + share * 70
  const g = H - drift
  const ground =
    `<path class="drift" d="M0 ${g + 10} C200 ${g - 6} 380 ${g + 14} 600 ${g + 2} ` +
    `S1000 ${g - 10} 1200 ${g + 4} S1500 ${g - 4} 1600 ${g + 6} L1600 ${H} L0 ${H} Z"/>`

  const layerSvg = layerFlakes.map((flakes, li) => {
    const L = LAYERS[li]!
    const field = flakes.join('')
    return (
      `<g class="sway" style="animation-duration:${L.sway}s;animation-delay:-${li * 1.7}s">` +
      `<g class="fall" style="animation-duration:${L.dur}s;opacity:${L.op}">` +
      `<g>${field}</g><g transform="translate(0 -${H})">${field}</g>` +
      `</g></g>`
    )
  })
  // A távoli pelyhek a fák mögött, a közeliek előttük hullanak.
  const farFlakes = layerSvg.slice(0, 2).join('')
  const nearFlakes = layerSvg.slice(2).join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" class="sky-top"/><stop offset="1" class="sky-bottom"/>` +
    `</linearGradient></defs>` +
    `<style>` +
    // világos mód: havas délután
    `.sky-top{stop-color:#7f9fc4}.sky-bottom{stop-color:#c8d8ea}` +
    `.flakes circle{fill:#ffffff}.flakes{filter:drop-shadow(0 0 1.5px #3f5f86)}.drift{fill:#f4f8fc}` +
    `.sky-star{fill:#ffffff;opacity:0}.moon{fill:#f6f3e4}.moon-glow{fill:#ffffff;opacity:0.18}.moon-spot{fill:#e4dfc8}` +
    `.mtn{fill:#9fb3cb}.cap{fill:#f4f8fc}.hill-far{fill:#dde7f1}.hill-near{fill:#eef4fa}` +
    `.pine-far{fill:#5f7f78}.pine{fill:#2e5446}.trunk{fill:#5a4636}.snow{fill:#f7fafd}` +
    `.deer{fill:#7a5536}.deer .belly{fill:#c9a582}.antler{fill:none;stroke:#9a7a58;stroke-width:3.2;stroke-linecap:round}` +
    `.flyer,.flyer .belly{fill:#3e4f66}.flyer .antler{stroke:#3e4f66}.rein{fill:none;stroke:#3e4f66;stroke-width:1.6}` +
    `.nose{fill:#e0362f}.flyer .nose{fill:#ff4a3d}` +
    `.cabin{fill:#7a4b30}.roof{fill:#5b3522}.chimney{fill:#6b4a3a}.window{fill:#ffc95e}.frame{fill:none;stroke:#5b3522;stroke-width:2.5}` +
    `.wreath{fill:none;stroke:#2f7a45;stroke-width:4}` +
    `.star{fill:#ffd24a}.b1{fill:#e5383b}.b2{fill:#ffcf3f}.b3{fill:#3fbf6a}.b4{fill:#4aa3ff}` +
    // sötét mód: karácsonyi éjszaka
    `@media (prefers-color-scheme: dark){` +
    `.sky-top{stop-color:#070d18}.sky-bottom{stop-color:#16233a}` +
    `.flakes circle{fill:#eef4fb}.flakes{filter:none}.drift{fill:#9aaac0}` +
    `.sky-star{fill:#e9f0ff;opacity:0.85}.moon{fill:#f4efd6}.moon-glow{fill:#f4efd6;opacity:0.1}.moon-spot{fill:#dcd5b8}` +
    `.mtn{fill:#1d2a3f}.cap{fill:#aebdd0}.hill-far{fill:#5d6d84}.hill-near{fill:#8293aa}` +
    `.pine-far{fill:#1f3a35}.pine{fill:#12271f}.trunk{fill:#2b221b}.snow{fill:#c9d5e3}` +
    `.deer{fill:#4a3426}.deer .belly{fill:#8d6f55}.antler{stroke:#6b5440}` +
    `.flyer,.flyer .belly{fill:#0b1220}.flyer .antler{stroke:#0b1220}.rein{stroke:#0b1220}` +
    `.cabin{fill:#3b2619}.roof{fill:#2a1a11}.chimney{fill:#33241b}.window{fill:#ffb347}.frame{stroke:#2a1a11}}` +
    // mozgás: mind lassú, semmi villogás
    `.fall{animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}` +
    `.sway{animation-name:sway;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}` +
    `.bulb{animation:glow 4.5s ease-in-out infinite alternate}` +
    `.star,.nose,.window{animation:glow 6s ease-in-out infinite alternate}` +
    `.sky-star{animation:twinkle 7s ease-in-out infinite alternate}` +
    `.sleigh{animation:fly 80s linear infinite}` +
    `@keyframes fall{from{transform:translateY(0)}to{transform:translateY(${H}px)}}` +
    `@keyframes sway{from{transform:translateX(-18px)}to{transform:translateX(18px)}}` +
    `@keyframes glow{from{opacity:1}to{opacity:0.55}}` +
    `@keyframes twinkle{from{fill-opacity:1}to{fill-opacity:0.4}}` +
    `@keyframes fly{from{transform:translate(-1700px,60px)}to{transform:translate(700px,-40px)}}` +
    `</style>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    LAND.sky +
    LAND.back +
    `<g class="flakes">${farFlakes}</g>` +
    LAND.front +
    `<g class="flakes">${nearFlakes}</g>` +
    ground +
    `</svg>`
  )
}

let scene = buildScene(0)

// A valódi context-telítettség, és a /snow paranccsal beállított teszt-érték (ha van).
let contextPercent = 0
let override: number | undefined

type Redraw = { ui: { invalidate: (ev: 'ui.render') => void } }

function setPercent($: Redraw, p: number | undefined): void {
  contextPercent = p ?? 0
  redraw($)
}

function redraw($: Redraw): void {
  percent = override ?? contextPercent
  const b = bucketOf(percent)
  if (b !== lastBucket) {
    lastBucket = b
    scene = buildScene(percent)
    $.ui.invalidate('ui.render')
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    await $.command.register({
      name: 'snow',
      description: 'Hóesés tesztelése: a context-telítettség felülírása (0–100), vagy „off”',
      argumentHint: '<0-100 | off>',
      immediate: true,
    })

    const { context } = await $.session.usage()
    setPercent($, context.percent)

    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }
    return next(e)
  })

  on('command.run', { command: 'snow' }, ($, e) => {
    const arg = e.args.trim().replace(/%$/, '')
    if (arg === '' || arg === 'off') {
      override = undefined
      redraw($)
      return { text: `Hóesés: vissza a valódi context-telítettségre (${Math.round(contextPercent)}%).` }
    }
    const p = Number(arg)
    if (!Number.isFinite(p)) {
      return { text: 'Használat: /snow <0-100> vagy /snow off' }
    }
    override = Math.min(100, Math.max(0, p))
    redraw($)
    return { text: `Hóesés teszt: ${override}% (a valódi context ${Math.round(contextPercent)}%). Vissza: /snow off` }
  })

  on('session.measure', ($, e, next) => {
    if (e.changed.includes('context')) {
      setPercent($, e.context.percent)
    }
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.scene !== 'snow') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={scene}
        alt={`Hó hull egy téli éjszakában; a context ablak ${Math.round(percent)}%-ban telt`}
        isInteractive
      />
    )
  })
}

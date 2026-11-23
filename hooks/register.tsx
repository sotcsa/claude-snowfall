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
const MAX_FLAKES = 1000
// Szél: telítettségnél a pelyhek ennyivel sodródnak oldalra egy esés alatt.
const WIND_MAX = 320
// Görbe kitevője: < 1 esetén már kis telítettségnél is érezhetően havazik.
const CURVE = 0.6
// A távoli rétegek puha, elmosódott pöttyök; a közeliek hatszögletű jégkristályok.
// `share`: a pelyhek mekkora része jut a rétegre (összesen 1).
const LAYERS = [
  { share: 0.4, dur: 42, sway: 11, crystal: false, rMin: 2, rMax: 3.4, op: 0.6 }, // távoli, lassú
  { share: 0.3, dur: 30, sway: 9, crystal: false, rMin: 3, rMax: 4.8, op: 0.75 },
  { share: 0.19, dur: 22, sway: 7, crystal: true, rMin: 4.5, rMax: 7, op: 0.85 },
  { share: 0.11, dur: 15, sway: 6, crystal: true, rMin: 8, rMax: 13, op: 0.95 }, // közeli, gyorsabb
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

const n = (v: number): string => v.toFixed(1)

// Egy kristálykar 10 egység hosszan felfelé; az oldalágak 60 fokban állnak ki.
function arm(branches: [number, number][]): string {
  let d = 'M0 0V-10'
  for (const [at, len] of branches) {
    const y = n(-at * 10)
    const dx = n(len * 8.66)
    const dy = n(len * 5)
    d += `M0 ${y}l${dx} -${dy}M0 ${y}l-${dx} -${dy}`
  }
  return d
}

function hexagon(r: number): string {
  const pts: string[] = []
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    pts.push(`${n(Math.sin(a) * r)},${n(-Math.cos(a) * r)}`)
  }
  return `<polygon points="${pts.join(' ')}"/>`
}

// Három kristálytípus: dendrit, csillagos lemez, páfrány.
function crystal(id: string, branches: [number, number][], core: number): string {
  const d = arm(branches)
  let out = `<g id="${id}">`
  for (let k = 0; k < 6; k++) {
    out += `<path d="${d}" transform="rotate(${k * 60})"/>`
  }
  return out + hexagon(core) + `</g>`
}

const CRYSTALS =
  crystal('fa', [[0.3, 0.22], [0.55, 0.32], [0.78, 0.2]], 1.6) +
  crystal('fb', [[0.82, 0.16]], 4.2) +
  crystal('fc', [[0.25, 0.14], [0.42, 0.24], [0.6, 0.28], [0.76, 0.2], [0.9, 0.1]], 1.2)
const CRYSTAL_IDS = ['fa', 'fb', 'fc']

// --- téli táj -----------------------------------------------------------------

// Természetes fenyősziluett: lecsüngő ágvégek, havas ágtetők.
// `lights` > 0 esetén halvány, meleg fényfüzérrel.
function pine(x: number, base: number, h: number, cls: string, lights: number, seed: number): string {
  const tw = Math.max(2, h * 0.03)
  let out = `<rect class="trunk" x="${n(x - tw / 2)}" y="${n(base - h * 0.1)}" width="${n(tw)}" height="${n(h * 0.11)}"/>`
  const levels = 10
  const top = base - h
  const droop = h * 0.028
  const right: [number, number][] = []
  const left: [number, number][] = []
  let snow = ''
  for (const [side, k] of [[1, 2], [-1, 3]] as const) {
    let prev: [number, number] = [x, top]
    for (let i = 0; i < levels; i++) {
      const t = (i + 1) / levels
      const y = top + t * h * 0.88
      const w = h * 0.27 * Math.pow(t, 0.9) * (0.8 + rand(seed + i, k) * 0.4)
      const tip: [number, number] = [x + side * w, y + droop]
      const notch: [number, number] = [x + side * w * 0.42, y + droop * 0.25]
      const pts = side === 1 ? right : left
      pts.push(tip, notch)
      // hó az ág felső élén
      snow +=
        `<polygon class="snow" points="${n(prev[0])},${n(prev[1])} ${n(tip[0])},${n(tip[1])} ` +
        `${n(tip[0] - side * w * 0.12)},${n(tip[1] + h * 0.006)} ${n(prev[0] + side * w * 0.08)},${n(prev[1] + h * 0.016)}"/>`
      prev = notch
    }
  }
  const pts = [[x, top] as [number, number], ...right, [x + tw, base - h * 0.09] as [number, number], [x - tw, base - h * 0.09] as [number, number], ...left.reverse()]
  out += `<polygon class="${cls}" points="${pts.map(([a, b]) => `${n(a)},${n(b)}`).join(' ')}"/>`
  out += snow
  for (let i = 0; i < lights; i++) {
    const fy = 0.2 + rand(seed + i, 7) * 0.68
    const yy = top + fy * h * 0.88
    const half = h * 0.27 * Math.pow(fy, 0.9) * 0.7
    const xx = x + (rand(seed + i, 8) * 2 - 1) * half
    const delay = (rand(seed + i, 9) * 6).toFixed(1)
    out += `<circle class="bulb" cx="${n(xx)}" cy="${n(yy)}" r="${n(Math.max(1.6, h * 0.007))}" style="animation-delay:-${delay}s"/>`
  }
  return out
}

// Rénszarvas oldalnézeti sziluettje; a talaj y=38-nál, `scale` < 0 tükrözi.
const DEER_BODY =
  'M-40 -14 C-20 -19 8 -19 22 -16 C29 -19 33 -29 37 -39 C39 -44 45 -46 50 -44 ' +
  'C55 -42 61 -38 63 -34 C64 -31 61 -29 57 -30 C52 -31 47 -30 45 -27 ' +
  'C43 -22 41 -14 39 -8 C38 -3 36 2 33 6 L35 22 L34 37 L30 38 L30 24 L27 12 ' +
  'L25 23 L25 37 L21 38 L21 23 L19 11 C8 13 -8 13 -20 10 ' +
  'C-19 18 -19 26 -20 37 L-24 38 L-24 30 C-25 24 -27 20 -29 15 ' +
  'C-30 22 -31 30 -31 37 L-35 38 L-35 27 C-37 21 -41 15 -42 9 ' +
  'C-46 3 -47 -6 -45 -10 C-44 -13 -42 -14 -40 -14 Z ' +
  'M-44 -11 C-48 -12 -49 -8 -46 -6 Z M41 -41 L35 -47 L42 -44 Z'
const DEER_ANTLERS =
  'M43 -44 C40 -56 34 -66 26 -74 C22 -78 18 -80 14 -80 M38 -58 C42 -62 44 -68 44 -74 ' +
  'M33 -66 C36 -70 37 -75 36 -80 M27 -73 C26 -78 24 -82 21 -85 M44 -47 C48 -49 52 -53 52 -58 ' +
  'M46 -44 C46 -57 42 -68 36 -77 C33 -81 30 -83 27 -84 M44 -60 C48 -64 50 -69 51 -74 M40 -70 C43 -74 44 -79 43 -83'

function reindeer(x: number, y: number, scale: number): string {
  const sx = scale
  const sy = Math.abs(scale)
  return (
    `<g class="deer" transform="translate(${n(x)} ${n(y)}) scale(${sx} ${sy})">` +
    `<path d="${DEER_BODY}"/><path class="antler" d="${DEER_ANTLERS}"/>` +
    `</g>`
  )
}

// Telihold: peremsötétedés, elmosódott tengerek, néhány világos kráter.
const MOON_X = 1240
const MOON_Y = 175
const MOON_R = 56
// Tengerek a valódi holdtérkép szerint (északkal felfelé), egységnyi sugárban:
// [x, y, sugár].
const MARIA: [number, number, number][] = [
  [-0.3, -0.42, 0.24], [-0.12, -0.5, 0.14], // Imbrium
  [0.24, -0.38, 0.16], // Serenitatis
  [0.05, -0.2, 0.08], // Vaporum
  [0.38, -0.08, 0.17], [0.28, 0.02, 0.1], // Tranquillitatis
  [0.74, -0.3, 0.1], // Crisium
  [0.64, 0.16, 0.13], // Fecunditatis
  [0.44, 0.3, 0.08], // Nectaris
  [-0.62, -0.25, 0.2], [-0.68, 0.05, 0.2], [-0.52, 0.22, 0.16], [-0.45, -0.05, 0.14], // Procellarum
  [-0.2, 0.35, 0.16], [-0.05, 0.25, 0.08], // Nubium, Cognitum
  [-0.52, 0.45, 0.08], // Humorum
  [-0.35, -0.72, 0.08], [-0.1, -0.76, 0.08], [0.15, -0.74, 0.07], [0.35, -0.68, 0.06], // Frigoris
]

// Szabálytalan, lekerekített folt.
function blob(cx: number, cy: number, r: number, seed: number): string {
  const k = 9
  const pts: [number, number][] = []
  for (let i = 0; i < k; i++) {
    const a = (i * 2 * Math.PI) / k
    const rr = r * (0.75 + rand(seed + i, 41) * 0.45)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  const mid = (i: number): [number, number] => {
    const p = pts[i % k]!
    const q = pts[(i + 1) % k]!
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  }
  let d = `M${n(mid(0)[0])} ${n(mid(0)[1])}`
  for (let i = 1; i <= k; i++) {
    const c = pts[i % k]!
    const m = mid(i)
    d += `Q${n(c[0])} ${n(c[1])} ${n(m[0])} ${n(m[1])}`
  }
  return d + 'Z'
}

function moon(): string {
  const R = MOON_R
  const seas = MARIA.map(([x, y, r], i) => blob(x * R, y * R, r * R, i * 13)).join('')
  // Tycho sugarai: halvány, a déli féltekén
  const tx = -0.15 * R
  const ty = 0.72 * R
  let rays = ''
  for (let k = 0; k < 11; k++) {
    const a = (k * 2 * Math.PI) / 11 + 0.2
    const len = R * (0.35 + rand(k, 51) * 0.5)
    rays += `M${n(tx)} ${n(ty)}L${n(tx + Math.cos(a) * len)} ${n(ty + Math.sin(a) * len)}`
  }
  return (
    `<circle cx="${MOON_X}" cy="${MOON_Y}" r="230" fill="url(#halo)"/>` +
    `<g class="moon" transform="translate(${MOON_X} ${MOON_Y})">` +
    `<circle r="${R}" fill="url(#moon-body)"/>` +
    `<g clip-path="url(#moon-clip)">` +
    `<path class="moon-sea" filter="url(#moon-soft)" d="${seas}"/>` +
    `<path class="moon-ray" d="${rays}"/>` +
    `<circle class="crater" cx="${n(tx)}" cy="${n(ty)}" r="1.8"/>` +
    `<circle class="crater" cx="${n(-0.35 * R)}" cy="${n(-0.15 * R)}" r="1.6"/>` +
    `<circle class="crater" cx="${n(-0.62 * R)}" cy="${n(-0.08 * R)}" r="1.1"/>` +
    `<circle class="crater" cx="${n(-0.78 * R)}" cy="${n(-0.32 * R)}" r="1.3"/>` +
    `<circle r="${R}" fill="url(#moon-limb)"/>` +
    `</g></g>`
  )
}

function buildLandscape(): { back: string; front: string; sky: string } {
  // csillagok (sötét módban látszanak)
  let stars = ''
  for (let i = 0; i < 70; i++) {
    const x = rand(i, 21) * W
    const y = rand(i, 22) * H * 0.5
    const r = 0.5 + rand(i, 23) * 1.0
    const delay = (rand(i, 24) * 8).toFixed(1)
    stars += `<circle class="sky-star" cx="${n(x)}" cy="${n(y)}" r="${n(r)}" style="animation-delay:-${delay}s"/>`
  }
  const sky = stars + moon()

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
    back += pine(x, 772 + rand(i, 32) * 14, h, 'pine-far', 0, 100 + i * 7)
  })

  // közeli domb, nagy fenyők, faház, rénszarvasok
  let front = `<path class="hill-near" d="M0 862 C250 812 500 880 800 848 S1300 812 1600 868 L1600 1000 L0 1000 Z"/>`
  front += pine(130, 900, 260, 'pine', 0, 11)
  front += pine(255, 880, 330, 'pine', 14, 31)
  front += pine(370, 905, 220, 'pine', 0, 53)
  front += pine(1450, 905, 300, 'pine', 12, 71)
  front += pine(1555, 915, 230, 'pine', 0, 97)

  // faház meleg fényű ablakkal
  front +=
    `<g>` +
    `<rect class="chimney" x="1298" y="760" width="18" height="40"/>` +
    `<rect class="cabin" x="1225" y="806" width="130" height="78"/>` +
    `<polygon class="roof" points="1212,812 1290,752 1368,812"/>` +
    `<path class="snow" d="M1206 814 L1290 744 L1374 814 Q1350 806 1330 815 Q1300 803 1275 815 Q1245 805 1206 814 Z"/>` +
    `<rect class="snow" x="1295" y="752" width="24" height="9" rx="4"/>` +
    `<rect class="window" x="1245" y="828" width="30" height="26" rx="1"/>` +
    `<rect class="window" x="1300" y="828" width="30" height="26" rx="1"/>` +
    `<path class="frame" d="M1260 828 V854 M1245 841 H1275 M1315 828 V854 M1300 841 H1330"/>` +
    `</g>`

  // rénszarvasok a havas dombon
  front += reindeer(560, 860, 0.8)
  front += reindeer(700, 852, -0.72)
  front += reindeer(1040, 846, 0.6)

  return { back, front, sky }
}

const LAND = buildLandscape()

function buildScene(p: number): string {
  const share = bucketOf(p) / 20
  const count = Math.round(MIN_FLAKES + (MAX_FLAKES - MIN_FLAKES) * Math.pow(share, CURVE))
  const layerFlakes: string[][] = LAYERS.map(() => [])

  for (let i = 0; i < count; i++) {
    let pick = rand(i, 6)
    let li = 0
    while (li < LAYERS.length - 1 && pick >= LAYERS[li]!.share) {
      pick -= LAYERS[li]!.share
      li++
    }
    const L = LAYERS[li]!
    // a mező balra túlnyúlik, hogy szélben se maradjon üres sáv
    const x = (rand(i, 1) * (W + WIND_MAX) - WIND_MAX).toFixed(0)
    const y = (rand(i, 2) * H).toFixed(0)
    const r = L.rMin + rand(i, 3) * (L.rMax - L.rMin)
    if (L.crystal) {
      const id = CRYSTAL_IDS[Math.floor(rand(i, 4) * CRYSTAL_IDS.length)]!
      const a = Math.round(rand(i, 5) * 60)
      layerFlakes[li]!.push(`<use href="#${id}" transform="translate(${x} ${y}) rotate(${a}) scale(${(r / 10).toFixed(2)})"/>`)
    } else {
      layerFlakes[li]!.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`)
    }
  }

  // Az előtér hóbuckája is vastagszik a kitöltöttséggel.
  const drift = 8 + share * 70
  const g = H - drift
  const ground =
    `<path class="drift" d="M0 ${g + 10} C200 ${g - 6} 380 ${g + 14} 600 ${g + 2} ` +
    `S1000 ${g - 10} 1200 ${g + 4} S1500 ${g - 4} 1600 ${g + 6} L1600 ${H} L0 ${H} Z"/>`

  // Hóvihar felé: erősebb szél, gyorsabb esés, nagyobb kilengés, párásság.
  const storm = Math.pow(share, 1.5)
  const wind = Math.round(WIND_MAX * storm)
  const swayAmp = Math.round(18 + 40 * share)
  const speed = 1 - 0.4 * share
  const haze = (0.38 * storm).toFixed(3)
  const whiteout = (0.16 * share * share).toFixed(3)

  // Minden réteg mezője egyszer szerepel, a hurokhoz kellő második példány `use`.
  const layerSvg = layerFlakes.map((flakes, li) => {
    const L = LAYERS[li]!
    return (
      `<g class="sway ${L.crystal ? 'crystals' : 'dots'}" style="animation-duration:${L.sway}s;animation-delay:-${li * 1.7}s">` +
      `<g class="fall" style="animation-duration:${(L.dur * speed).toFixed(1)}s;opacity:${L.op}">` +
      `<g id="l${li}">${flakes.join('')}</g><use href="#l${li}" transform="translate(${-wind} -${H})"/>` +
      // Sűrű hónál a mező 180 fokkal elforgatott másolata is hull: dupla pehely, nulla többletméret.
      (share >= (L.crystal ? 0.7 : 0.4)
        ? `<use href="#l${li}" transform="matrix(-1 0 0 -1 ${W - WIND_MAX} ${H})"/>` +
          `<use href="#l${li}" transform="matrix(-1 0 0 -1 ${W - WIND_MAX - wind} 0)"/>`
        : '') +
      `</g></g>`
    )
  })
  // A távoli pelyhek a fák mögött, a közeliek előttük hullanak.
  const farFlakes = layerSvg.slice(0, 2).join('')
  const nearFlakes = layerSvg.slice(2).join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-top"/><stop offset="1" class="sky-bottom"/></linearGradient>` +
    `<radialGradient id="dot"><stop offset="0" class="dot-in"/><stop offset="0.45" class="dot-mid"/><stop offset="1" class="dot-out"/></radialGradient>` +
    `<radialGradient id="halo"><stop offset="0" class="halo-in"/><stop offset="0.35" class="halo-mid"/><stop offset="1" class="halo-out"/></radialGradient>` +
    `<radialGradient id="moon-body" cx="0.5" cy="0.5" r="0.5"><stop offset="0.6" class="moon-hi"/><stop offset="1" class="moon-lo"/></radialGradient>` +
    `<radialGradient id="moon-limb"><stop offset="0.7" class="limb-in"/><stop offset="1" class="limb-out"/></radialGradient>` +
    `<clipPath id="moon-clip"><circle r="${MOON_R}"/></clipPath>` +
    `<filter id="moon-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter>` +
    CRYSTALS +
    `</defs>` +
    `<style>` +
    // világos mód: havas délután, sápadt nappali hold
    `.sky-top{stop-color:#8aa6c6}.sky-bottom{stop-color:#d3dfec}` +
    `.dots{fill:url(#dot)}.dot-in{stop-color:#ffffff;stop-opacity:1}.dot-mid{stop-color:#ffffff;stop-opacity:0.8}.dot-out{stop-color:#ffffff;stop-opacity:0}` +
    `.crystals{fill:none;stroke:#ffffff;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 1px #5a7799)}` +
    `.drift{fill:#f4f8fc}.haze{fill:#ffffff}` +
    `.sky-star{fill:#ffffff;opacity:0}` +
    `.moon{opacity:0.62}.moon-hi{stop-color:#fbfaf4}.moon-lo{stop-color:#e2dfd3}.moon-sea{fill:#9ea2a6;opacity:0.42}` +
    `.moon-ray{fill:none;stroke:#ffffff;stroke-width:0.6;opacity:0.1}.crater{fill:#fbfaf4;opacity:0.7}` +
    `.limb-in{stop-color:#000000;stop-opacity:0}.limb-out{stop-color:#5c5a50;stop-opacity:0.2}` +
    `.halo-in{stop-color:#ffffff;stop-opacity:0.18}.halo-mid{stop-color:#ffffff;stop-opacity:0.06}.halo-out{stop-color:#ffffff;stop-opacity:0}` +
    `.mtn{fill:#9fb3cb}.cap{fill:#f4f8fc}.hill-far{fill:#dde7f1}.hill-near{fill:#eef4fa}` +
    `.pine-far{fill:#6a857f}.pine{fill:#2c4a40}.trunk{fill:#4a3b30}.snow{fill:#f7fafd}` +
    `.deer{fill:#5b4434}.antler{fill:none;stroke:#7a6450;stroke-width:2.4;stroke-linecap:round}` +
    `.cabin{fill:#6e4a33}.roof{fill:#4e3324}.chimney{fill:#5e463a}.window{fill:#f3c27a}.frame{fill:none;stroke:#4e3324;stroke-width:2}` +
    `.bulb{fill:#fff1d6;opacity:0.9}` +
    // sötét mód: holdfényes téli éjszaka
    `@media (prefers-color-scheme: dark){` +
    `.sky-top{stop-color:#060b15}.sky-bottom{stop-color:#152139}` +
    `.dot-in{stop-color:#eef4fb}.dot-mid{stop-color:#eef4fb}.dot-out{stop-color:#eef4fb}` +
    `.crystals{stroke:#eef4fb;filter:none}.drift{fill:#9aaac0}.haze{fill:#9fb0c6}` +
    `.sky-star{fill:#e9f0ff;opacity:0.8}` +
    `.moon{opacity:1}.moon-hi{stop-color:#f6f3e8}.moon-lo{stop-color:#d6d1c1}.moon-sea{fill:#8a8c8b;opacity:0.5}` +
    `.crater{fill:#fbf9f0}.limb-out{stop-color:#2a2a26;stop-opacity:0.28}` +
    `.halo-in{stop-color:#dfe8f5;stop-opacity:0.22}.halo-mid{stop-color:#c9d6ea;stop-opacity:0.07}.halo-out{stop-color:#c9d6ea}` +
    `.mtn{fill:#1d2a3f}.cap{fill:#aebdd0}.hill-far{fill:#5d6d84}.hill-near{fill:#8293aa}` +
    `.pine-far{fill:#1f3a35}.pine{fill:#11241e}.trunk{fill:#231c17}.snow{fill:#c9d5e3}` +
    `.deer{fill:#2a2019}.antler{stroke:#3d3127}` +
    `.cabin{fill:#3b2619}.roof{fill:#2a1a11}.chimney{fill:#33241b}.window{fill:#f0a64a}.frame{stroke:#2a1a11}` +
    `.bulb{fill:#ffd9a0}}` +
    // mozgás: mind lassú, semmi villogás
    `.fall{animation-name:fall;animation-timing-function:linear;animation-iteration-count:infinite}` +
    `.sway{animation-name:sway;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}` +
    `.bulb{animation:glow 7s ease-in-out infinite alternate}` +
    `.window{animation:glow 9s ease-in-out infinite alternate}` +
    `.sky-star{animation:twinkle 9s ease-in-out infinite alternate}` +
    `@keyframes fall{from{transform:translate(0,0)}to{transform:translate(${wind}px,${H}px)}}` +
    `@keyframes sway{from{transform:translateX(-${swayAmp}px)}to{transform:translateX(${swayAmp}px)}}` +
    `@keyframes glow{from{opacity:1}to{opacity:0.7}}` +
    `@keyframes twinkle{from{fill-opacity:1}to{fill-opacity:0.5}}` +
    `</style>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    LAND.sky +
    LAND.back +
    `<rect class="haze" width="${W}" height="${H}" opacity="${haze}"/>` +
    `<g class="flakes">${farFlakes}</g>` +
    LAND.front +
    `<rect class="haze" width="${W}" height="${H}" opacity="${whiteout}"/>` +
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

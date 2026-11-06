import Matter from 'matter-js'
const { Bodies, Body, Vertices } = Matter

// ── 대파 조각 모양 ──
// 줄기(|)와 가지(/)는 같은 굵기. 가지의 윗면은 줄기 윗면과 같은 높이에서 평평하게 끝난다.
export const BH = 50 // 줄기 길이(= 가지 높이)
export const SW = 14 // 굵기의 절반 (줄기·가지 공통)
export const TX = 40 // 가지 윗면 중심의 x (줄기 중심 기준)
// 잎(가지)은 줄기보다 훨씬 가볍게: 무게중심이 줄기 안쪽에 머물러 쌓기가 현실적으로 가능해진다
const LEAF = 0.15
const hh = BH / 2
const YB = hh - BH * 0.4 // 가지가 줄기에서 갈라져 나오는 높이(아래서 40%)

/** 가지(평행사변형)의 꼭짓점. fl=-1이면 좌우반전 */
function branchPts(fl: 1 | -1): { x: number; y: number }[] {
  return [
    { x: fl * -SW, y: YB },
    { x: fl * SW, y: YB },
    { x: fl * (TX + SW), y: -hh },
    { x: fl * (TX - SW), y: -hh },
  ]
}

const opts = { friction: 0.9, frictionStatic: 1.2, restitution: 0, density: 0.002 }

function build(fl: 1 | -1) {
  const pts = Vertices.clockwiseSort(branchPts(fl))
  const cx = pts.reduce((s, p) => s + p.x, 0) / 4
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4
  const stem = Bodies.rectangle(0, 0, SW * 2, BH, { ...opts })
  const branch = Bodies.fromVertices(cx, cy, [pts], { ...opts, density: opts.density * LEAF })
  return Body.create({ parts: [stem, branch], ...opts, label: 'onion' })
}

// 합쳐진 물체의 무게중심(원본 좌표계). 그릴 때 이 점을 원점으로 삼는다.
const com = build(1).position
export const COMX = com.x
export const COMY = com.y

export function makeOnion(fl: 1 | -1, x: number, y: number, angle: number): Matter.Body {
  const b = build(fl)
  Body.setPosition(b, { x, y })
  Body.setAngle(b, angle)
  b.plugin = { fl }
  return b
}

/** (x,y)=무게중심 위치, angle=회전, fl=좌우반전 */
export function drawOnion(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, fl: 1 | -1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(fl, 1)
  ctx.translate(-COMX, -COMY)
  ctx.lineJoin = 'round'
  const bp = branchPts(1)
  const stem = () => { ctx.beginPath(); ctx.rect(-SW, -hh, SW * 2, BH) }
  const branch = () => {
    ctx.beginPath()
    ctx.moveTo(bp[0].x, bp[0].y)
    for (let i = 1; i < bp.length; i++) ctx.lineTo(bp[i].x, bp[i].y)
    ctx.closePath()
  }
  // 하나의 세로 그라데이션: 밑동은 흰색 → 위로 갈수록 자연스럽게 초록
  const g = ctx.createLinearGradient(0, hh, 0, -hh)
  g.addColorStop(0, '#fffef5')
  g.addColorStop(0.16, '#fffef5')
  g.addColorStop(0.5, '#8fcf55')
  g.addColorStop(1, '#2e8b3d')
  // 외곽선을 먼저 모두 그린 뒤 면을 채워서, 줄기와 가지 사이에는 선이 남지 않는다
  ctx.strokeStyle = '#1f5f2c'
  ctx.lineWidth = 3.5
  stem(); ctx.stroke()
  branch(); ctx.stroke()
  ctx.fillStyle = g
  stem(); ctx.fill()
  branch(); ctx.fill()
  ctx.restore()
}

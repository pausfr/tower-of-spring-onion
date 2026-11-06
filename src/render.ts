import { W, H, GR, PED_W, PED_H, PED_TOP, TOPY } from './config'
import { drawOnion } from './onion'
import type { Game } from './game'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mix = (a: number[], b: number[], t: number) => 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], t))).join() + ')'

export class Renderer {
  private clouds = Array.from({ length: 14 }, () => ({ x: Math.random() * W, y: Math.random() * 760, s: 0.6 + Math.random() * 0.8 }))

  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.setTransform(2, 0, 0, 2, 0, 0)
  }

  private cloud(x: number, y: number, s: number) {
    const c = this.ctx
    c.beginPath()
    c.arc(x, y, 16 * s, 0, 7)
    c.arc(x + 18 * s, y - 8 * s, 20 * s, 0, 7)
    c.arc(x + 40 * s, y, 16 * s, 0, 7)
    c.fill()
  }

  draw(g: Game) {
    const c = this.ctx
    const camY = g.camY
    const p = Math.min(1, Math.max(0, (g.count - 150) / 50)) // 150~200층: 하늘로 전환
    const bg = c.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, mix([150, 215, 255], [40, 120, 235], p))
    bg.addColorStop(1, mix([236, 250, 214], [170, 215, 255], p))
    c.fillStyle = bg
    c.fillRect(0, 0, W, H)

    c.save()
    if (g.shake > 0) c.translate((Math.random() - 0.5) * g.shake * 20, (Math.random() - 0.5) * g.shake * 20)
    c.fillStyle = 'rgba(255,255,255,' + (0.45 + 0.4 * p) + ')'
    for (const k of this.clouds) this.cloud(k.x, ((k.y + camY * 0.5) % 760 + 760) % 760 - 60, k.s)
    if (p < 1) {
      c.globalAlpha = 1 - p
      c.fillStyle = '#a8d98a'
      const b = GR - 30 + camY * 0.4
      c.beginPath()
      c.moveTo(0, H + 400)
      for (let x = 0; x <= W; x += 10) c.lineTo(x, b - 30 * Math.sin(x / 55) - 20 * Math.sin(x / 23 + 1))
      c.lineTo(W, H + 400)
      c.fill()
      c.globalAlpha = 1
    }
    const gy = GR + camY
    if (gy < H) {
      c.fillStyle = '#6dbb4a'
      c.fillRect(0, gy, W, H)
    }
    if (PED_TOP + camY < H) {
      c.fillStyle = '#8a6a4a'
      c.beginPath()
      c.roundRect(W / 2 - PED_W / 2, PED_TOP + camY, PED_W, PED_H, [4, 4, 0, 0])
      c.fill()
    }

    // 물리 세계의 대파들 (월드 좌표 → 화면은 camY만큼 아래로)
    const all = g.cur ? [...g.placed, g.cur] : g.placed
    for (const b of all) {
      if (b.position.y + camY < -80 || b.position.y + camY > H + 80) continue
      drawOnion(c, b.position.x, b.position.y + camY, b.angle, b.plugin.fl)
    }

    // 대기 중인 대파 + 낙하 가이드선
    if (g.state === 'play' || g.state === 'rot' || g.state === 'count') {
      if (g.state !== 'count') {
        c.strokeStyle = 'rgba(255,255,255,.45)'
        c.setLineDash([5, 6])
        c.beginPath()
        c.moveTo(g.mx, TOPY + 30)
        c.lineTo(g.mx, this.topOf(g) + camY)
        c.stroke()
        c.setLineDash([])
      }
      drawOnion(c, g.mx, TOPY, g.state === 'rot' ? g.ang : 0, g.nfl())
    }
    c.restore()
  }

  /** 탑 꼭대기의 월드 y */
  private topOf(g: Game) {
    let top = PED_TOP
    for (const b of g.placed) top = Math.min(top, b.bounds.min.y)
    return top
  }
}

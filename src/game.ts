import Matter from 'matter-js'
import { W, GR, PED_W, PED_H, PED_TOP, TOPY, TGT, HW, WIN, TAU } from './config'
import { makeOnion } from './onion'
const { Engine, Composite, Bodies, Body, Events } = Matter

const STORY = [
  '미쿠는 파가 좋다',
  '미쿠는 전설의 대대대파를 가지고 싶다',
  '어느 날 길을 가다가',
  '한 노인이 대대대파는 하늘대파궁에 있다고 말해준다',
  '미쿠는 하늘대파궁에 들어가기 위해 대파로 탑을 쌓아 올라가기로 결심한다',
]

const $ = (id: string) => document.getElementById(id)!
const STEP = 1 / 120 // 물리 고정 시간 간격(초)
const MAXV = 8 // 낙하 최대 속도(스텝당 px). 얇은 가지가 뚫고 지나가지 않게 제한

export type State = 'story' | 'ready' | 'count' | 'play' | 'rot' | 'drop' | 'fail' | 'over'

export class Game {
  state: State = 'story'
  readonly engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 })
  placed: Matter.Body[] = [] // 안착한 대파들
  cur: Matter.Body | null = null // 떨어지는 중이거나 방금 떨어진 대파
  mx = HW
  dir = 1
  ang = 0
  camY = 0
  shake = 0
  tm = 0
  best = 0
  score = 0
  private acc = 0
  private settleN = 0
  private landed = false // 떨어지는 대파가 처음 닿았는지
  private settleT = 0
  private failT = 0
  private ov = $('ov')

  constructor() {
    this.engine.gravity.y = 2
    const ground = Bodies.rectangle(W / 2, GR + 100, 6000, 200, { isStatic: true, label: 'ground' })
    const ped = Bodies.rectangle(W / 2, PED_TOP + PED_H / 2, PED_W, PED_H, { isStatic: true, label: 'ped', friction: 1, frictionStatic: 1.5 })
    Composite.add(this.engine.world, [ground, ped])
    // 받침대 밖 땅에 닿으면 떨어진 것으로 본다
    Events.on(this.engine, 'collisionStart', (e) => {
      for (const p of e.pairs) {
        const a = p.bodyA.parent.label, b = p.bodyB.parent.label
        // 소프트 착지: 처음 닿는 순간 속도를 없애 충격으로 탑이 흔들리지 않게 한다
        const c = this.cur
        if (c && !this.landed && this.state === 'drop' && (p.bodyA.parent === c || p.bodyB.parent === c)) {
          this.landed = true
          Body.setVelocity(c, { x: 0, y: 0 })
          Body.setAngularVelocity(c, 0)
        }
        if ((a === 'ground' && b === 'onion') || (b === 'ground' && a === 'onion')) this.fail()
      }
    })
    try { this.best = +(localStorage.getItem('daepaBest') ?? 0) || 0 } catch { /* 저장소 사용 불가 */ }
    this.hud()
    this.story(0)
  }

  get count() { return this.placed.length }
  nfl(): 1 | -1 { return this.count % 2 ? -1 : 1 }
  speed() { return Math.min(1000, 200 + 50 * Math.floor(this.count / 10)) }
  rotSpeed() { return Math.min(3, 1.2 + 0.05 * Math.floor(this.count / 10)) }

  // ── UI ──
  private show(h: string) { this.ov.className = ''; this.ov.innerHTML = h }
  hud() {
    $('fl').textContent = this.count + '층'
    $('bs').textContent = '최고 ' + this.best + '층'
    $('sp').textContent = '속도 Lv.' + (Math.floor(this.count / 10) + 1)
  }
  toast(t: string) {
    const m = $('msg')
    m.textContent = t
    m.classList.remove('go')
    void m.offsetWidth
    m.classList.add('go')
  }
  setHint() {
    const h = this.state === 'play' ? '① 탭: 좌우 고정' : this.state === 'rot' ? '② 탭: 회전 멈추고 낙하!' : ''
    const el = $('ht')
    if (el.textContent !== h) el.textContent = h
  }
  story(i: number) {
    this.state = 'story'
    this.show(`<p>${STORY[i]}</p><button id="b">다음</button>`)
    $('b').onclick = () => (i + 1 < STORY.length ? this.story(i + 1) : this.ready())
  }
  ready() {
    this.state = 'ready'
    this.show('<p>미쿠의 대파탑</p><button id="b">스타트</button>')
    $('b').onclick = () => this.begin()
  }
  begin() {
    this.reset()
    this.state = 'count'
    let n = 3
    const tick = () => {
      if (this.state !== 'count') return
      if (n === 0) { this.ov.className = 'hide'; this.state = 'play'; return }
      this.show(`<p class="big">${n}</p>`)
      n--
      setTimeout(tick, 900)
    }
    tick()
  }
  private finish(win: boolean) {
    this.state = 'over'
    const nw = this.score > this.best
    if (nw) { this.best = this.score; try { localStorage.setItem('daepaBest', String(this.best)) } catch { /* 무시 */ } }
    this.hud()
    this.show(`<p>${win ? '하늘대파궁에 도착했다!<br>' : ''}당신은 ${this.score}층의 대파를 쌓았습니다</p><p style="font-size:15px;opacity:.9">최고 기록 ${this.best}층${nw && this.score > 0 ? ' · 신기록!' : ''}</p><button id="b1">다시 하기</button><button id="b2" class="sub">스토리 다시 보기</button>`)
    $('b1').onclick = () => this.begin()
    $('b2').onclick = () => { this.reset(); this.story(0) }
  }

  // ── 게임 흐름 ──
  reset() {
    for (const b of this.placed) Composite.remove(this.engine.world, b)
    if (this.cur) Composite.remove(this.engine.world, this.cur)
    this.placed = []
    this.cur = null
    this.camY = 0
    this.mx = HW
    this.dir = 1
    this.ang = 0
    this.shake = 0
    this.score = 0
    this.hud()
  }

  /** 1번째 탭: 좌우 고정 → 2번째 탭: 회전 고정하고 낙하 */
  tap() {
    if (this.state === 'play') {
      this.state = 'rot'
      this.ang = Math.random() * TAU
    } else if (this.state === 'rot') {
      const fl = this.nfl()
      const b = makeOnion(fl, this.mx, TOPY - this.camY, this.ang)
      Body.setVelocity(b, { x: 0, y: 3 })
      Composite.add(this.engine.world, b)
      this.cur = b
      this.settleN = 0
      this.settleT = 0
      this.landed = false
      this.state = 'drop'
    }
  }

  private fail() {
    if (this.state !== 'play' && this.state !== 'rot' && this.state !== 'drop') return
    this.score = this.count
    this.state = 'fail'
    this.shake = 0.45
    this.failT = 1.7
    this.hud()
  }

  private settle() {
    if (!this.cur) return
    this.placed.push(this.cur)
    this.cur = null
    const n = this.count
    this.hud()
    if (n % 10 === 0) this.toast(n + '층 돌파!')
    if (n >= WIN) { this.score = WIN; this.finish(true) } else this.state = 'play'
  }

  private afterStep() {
    const c = this.cur
    if (!c || this.state !== 'drop') return
    if (c.velocity.y > MAXV) Body.setVelocity(c, { x: c.velocity.x, y: MAXV })
    this.settleT += STEP
    if (c.isSleeping || (c.speed < 0.1 && c.angularSpeed < 0.004)) this.settleN++
    else this.settleN = 0
    // 충분히 가만히 있으면 안착. 계속 흔들려도 5초 뒤에는 인정
    if (this.settleN >= 36 || this.settleT > 5) this.settle()
  }

  update(dt: number) {
    this.tm += dt
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt)
    // 카메라: 탑 꼭대기가 화면 TGT 부근에 오도록
    let top = PED_TOP
    for (const b of this.placed) top = Math.min(top, b.bounds.min.y)
    this.camY += (Math.max(0, TGT - top) - this.camY) * Math.min(1, dt * 6)

    if (this.state === 'play') {
      this.mx += this.dir * this.speed() * dt
      if (this.mx > W - HW) { this.mx = W - HW; this.dir = -1 }
      if (this.mx < HW) { this.mx = HW; this.dir = 1 }
    } else if (this.state === 'rot') {
      this.ang += this.rotSpeed() * dt // 시계방향으로 계속 회전
    }

    this.acc += dt
    while (this.acc >= STEP) {
      Engine.update(this.engine, STEP * 1000)
      this.afterStep()
      this.acc -= STEP
    }
    this.setHint()

    if (this.state === 'fail') {
      this.failT -= dt
      if (this.failT <= 0) this.finish(false)
    }
  }
}

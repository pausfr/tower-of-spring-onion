import { Game } from './game'
import { Renderer } from './render'
import { W } from './config'
import { COMX } from './onion'

const cv = document.getElementById('cv') as HTMLCanvasElement
const game = new Game()
const view = new Renderer(cv.getContext('2d')!)

addEventListener('pointerdown', (e) => {
  if (!(e.target as HTMLElement).closest('button')) game.tap()
})
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); game.tap() }
})

// 개발용 자동 플레이: ?bot=1 (정중앙·똑바로 쌓는 봇), ?bot=1&jit=20 (위치 오차)
const q = new URLSearchParams(location.search)
const bot = q.has('bot')
const jit = +(q.get('jit') ?? 0)
const ts = +(q.get('ts') ?? 1) // 시간 배속(테스트용)
let target = W / 2
if (bot) {
  window.setTimeout(() => game.begin(), 0)
}
function runBot() {
  // 물리 테스트용: 위치·각도를 정확히 지정해서 바로 떨어뜨린다 (?ang=라디안 으로 각도 지정)
  const A = +(q.get('ang') ?? 0)
  if (game.state === 'play') { game.mx = target + game.nfl() * COMX; game.tap() } // 줄기 중심을 target에 맞춘다
  else if (game.state === 'rot') { game.ang = A; game.tap(); target = W / 2 + (Math.random() - 0.5) * 2 * jit }
  document.title = `${game.state} floors=${game.count} score=${game.score}`
}

let last = performance.now()
function loop(t: number) {
  const dt = Math.min(0.05, (t - last) / 1000) * ts
  last = t
  game.update(dt)
  view.draw(game)
  if (bot) runBot()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
;(window as unknown as { __game: Game }).__game = game

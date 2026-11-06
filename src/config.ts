// 논리 좌표계: 360x640 (캔버스는 2배 해상도로 그린다)
export const W = 360
export const H = 640
export const GR = H - 60 // 땅 윗면
export const PED_W = 104 // 받침대 폭
export const PED_H = 30 // 받침대 높이
export const PED_TOP = GR - PED_H // 첫 대파가 놓이는 높이
export const TOPY = 62 // 대기 중인 대파의 화면 y
export const TGT = 360 // 탑 꼭대기가 화면에서 머물려는 y
export const HW = 36 // 좌우 이동 범위 여백
export const WIN = 500 // 목표 층수
export const TAU = Math.PI * 2

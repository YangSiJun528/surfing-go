import { startTransition, useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Feature, Geometry } from 'geojson'
import { CircleMarker, GeoJSON, MapContainer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import { feature as topojsonFeature } from 'topojson-client'
import './App.css'
import countries10mUrl from 'world-atlas/countries-10m.json?url'
import {
  getSurfingApiKey,
  loadSurfingForecastData,
  type SkillLevel,
  type SurfingApiItem,
  type SurfLevel,
  type WeatherType,
} from './lib/surfing'

type LocalCard = {
  title: string
  type: string
  distance: string
  description: string
  tag: string
  address?: string
  operatingHours?: string
}

type SpotCurrent = {
  waveHeight: number
  wavePeriod: number
  windSpeed: number
  waterTemp: number
  weatherLabel: string
  recommendedTime: string
}

type SpotBase = {
  id: string
  name: string
  region: string
  placeCode: string | null
  lat: number
  lng: number
  currentLevel: SurfLevel
  heroWeather: WeatherType
  summary: string
  spotlight: string
  current: SpotCurrent
  skillNotes: Record<SkillLevel, string>
  localPicks: LocalCard[]
  specialInfo: string[]
}

type SpotSnapshot = {
  currentLevel: SurfLevel
  heroWeather: WeatherType
  summary: string
  spotlight: string
  current: SpotCurrent
  skillNotes: Record<SkillLevel, string>
}

type ResolvedSpot = Omit<SpotBase, 'currentLevel' | 'heroWeather' | 'summary' | 'spotlight' | 'current' | 'skillNotes'> &
  SpotSnapshot

type MarkerNode =
  | { kind: 'spot'; spot: ResolvedSpot }
  | { kind: 'cluster'; id: string; spots: ResolvedSpot[]; lat: number; lng: number; label: string }
type ScreenMode = "dashboard" | "spot-detail"

const DAY_RANGE = 7
const skillLevels: SkillLevel[] = ['beginner', 'intermediate', 'advanced']
const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'windy', 'rainy']
const mapCenter: LatLngExpression = [36.2, 127.9]
const koreaMaxBounds: LatLngBoundsExpression = [
  [32.2, 123.8],
  [39.5, 132.0],
]
const weekdayFormatter = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' })
const forecastDateFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })
const today = startOfDay(new Date())

const levelLabel: Record<SurfLevel, string> = {
  'very-good': '매우 좋음',
  good: '좋음',
  fair: '보통',
  poor: '주의',
  flat: '비추천',
}

const skillLabel: Record<SkillLevel, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '상급',
}

const baseSpots: SpotBase[] = [
  {
    id: 'SR1',
    name: '송정해수욕장',
    region: '부산',
    placeCode: 'SR1',
    lat: 35.1786125,
    lng: 129.1997133,
    currentLevel: 'very-good',
    heroWeather: 'sunny',
    summary: '오늘 바로 들어가기 좋은 가장 안정적인 포인트입니다.',
    spotlight: '초급자와 레슨 팀이 움직이기 가장 편한 조건이에요.',
    current: {
      waveHeight: 1.1,
      wavePeriod: 7.2,
      windSpeed: 3.8,
      waterTemp: 14.6,
      weatherLabel: '맑고 시야가 깨끗해요',
      recommendedTime: '08:00 - 11:00',
    },
    skillNotes: {
      beginner: '부드러운 진입과 낮은 찹 덕분에 가장 편하게 탈 수 있어요.',
      intermediate: '메인 피크 남쪽으로 빠지면 조금 더 긴 라인을 탈 수 있어요.',
      advanced: '퍼포먼스 데이보다는 가볍게 푸는 세션에 가까워요.',
    },
    localPicks: [
      { title: '웨이브 토스트 클럽', type: '브런치', distance: '도보 4분', description: '입수 전 빠르게 먹기 좋은 토스트와 커피.', tag: '오픈 빠름', address: '부산 해운대구 송정해변로 32', operatingHours: '매일 08:00 - 18:00' },
      { title: '블루보드 렌탈', type: '렌탈', distance: '도보 1분', description: '초보자용 보드와 슈트 대여가 편한 샵.', tag: '입문 친화', address: '부산 해운대구 송정중동 123-45', operatingHours: '매일 07:00 - 19:00 (계절 변동)' },
      { title: '문라이트 국밥', type: '식사', distance: '차량 8분', description: '세션 뒤 따뜻하게 마무리하기 좋은 현지 식당.', tag: '로컬 픽', address: '부산 해운대구 송정동 78-3', operatingHours: '매일 06:00 - 21:00' },
    ],
    specialInfo: ['주차장 접근 쉬움', '샤워 가능', '보드 대여 가능', '점심 이후 혼잡'],
  },
  {
    id: 'SR3',
    name: '죽도해수욕장',
    region: '양양',
    placeCode: 'SR3',
    lat: 37.975,
    lng: 128.7594444,
    currentLevel: 'good',
    heroWeather: 'cloudy',
    summary: '동해안에서 가장 안정적으로 체크할 수 있는 메인 포인트입니다.',
    spotlight: '중급자 만족도가 높고 오늘 라인도 비교적 깔끔합니다.',
    current: {
      waveHeight: 1.4,
      wavePeriod: 8.4,
      windSpeed: 5.3,
      waterTemp: 12.8,
      weatherLabel: '높은 구름만 지나가요',
      recommendedTime: '10:00 - 13:00',
    },
    skillNotes: {
      beginner: '이착수 지점이 붐비기 쉬워서 초급자는 시간대 선택이 중요해요.',
      intermediate: '오늘 가장 균형이 좋은 메인 카드예요.',
      advanced: '깨끗한 숄더를 고르면 짧은 퍼포먼스 턴도 가능합니다.',
    },
    localPicks: [
      { title: '브레이크라인 커피', type: '카페', distance: '도보 2분', description: '라인업이 보이는 창가 좌석이 인기인 카페.', tag: '오션뷰', address: '강원 양양군 현남면 죽도해변로 112', operatingHours: '매일 09:00 - 20:00' },
      { title: '죽도 생선구이', type: '식사', distance: '도보 6분', description: '세션 뒤 든든하게 먹기 좋은 생선구이 정식.', tag: '단백질', address: '강원 양양군 현남면 죽도리 234', operatingHours: '매일 11:00 - 21:00' },
      { title: '이스트클리프 사우나', type: '회복', distance: '차량 9분', description: '찬 수온 뒤 몸 풀기 좋은 온탕과 사우나.', tag: '온수 샤워', address: '강원 양양군 현남면 인구리 56', operatingHours: '매일 06:00 - 24:00' },
    ],
    specialInfo: ['주차는 이른 시간 추천', '중들물 타이밍 강함', '수온 낮아 슈트 권장', '일출 포인트'],
  },
  {
    id: 'SR4',
    name: '망상해수욕장',
    region: '동해',
    placeCode: 'SR4',
    lat: 37.5922384,
    lng: 129.0896615,
    currentLevel: 'fair',
    heroWeather: 'windy',
    summary: '오늘은 일찍 체크하고 짧게 타는 전략이 맞는 포인트입니다.',
    spotlight: '점심 이후 바람이 강해져서 면이 빠르게 무너질 수 있어요.',
    current: {
      waveHeight: 1.0,
      wavePeriod: 6.4,
      windSpeed: 7.2,
      waterTemp: 11.9,
      weatherLabel: '바람이 빠르게 강해지는 중이에요',
      recommendedTime: '07:00 - 09:00',
    },
    skillNotes: {
      beginner: '초반 짧은 연습용으로는 괜찮지만 오래 가기엔 어렵습니다.',
      intermediate: '리폼 섹션 위주로 타면 만족도는 유지돼요.',
      advanced: '원정 가치가 높지는 않은 날입니다.',
    },
    localPicks: [
      { title: '항구칼국수', type: '식사', distance: '차량 5분', description: '짧은 세션 뒤 빠르게 먹기 좋은 국수집.', tag: '가성비', address: '강원 동해시 망상해변로 45', operatingHours: '매일 08:00 - 20:00' },
      { title: '파인트리 마트', type: '스토어', distance: '도보 4분', description: '간식과 왁스를 빠르게 채우기 좋아요.', tag: '준비물', address: '강원 동해시 망상동 67-2', operatingHours: '매일 07:00 - 22:00' },
      { title: '샌드라인 카페', type: '카페', distance: '도보 7분', description: '라인업을 바라보며 쉬기 좋은 카페.', tag: '작업 가능', address: '강원 동해시 망상해수욕장 앞', operatingHours: '매일 09:00 - 19:00' },
    ],
    specialInfo: ['해변 진입 편함', '주차 여유 있음', '바람 노출 큼', '양양보다 덜 붐빔'],
  },
  {
    id: 'SR12',
    name: '금진해수욕장',
    region: '강릉',
    placeCode: 'SR12',
    lat: 37.6364817,
    lng: 129.0449615,
    currentLevel: 'good',
    heroWeather: 'sunny',
    summary: '덜 붐비면서도 긴 벽이 살아 있는 균형 좋은 포인트입니다.',
    spotlight: '공간과 모양을 같이 원하면 오늘 실속 있는 선택지예요.',
    current: {
      waveHeight: 1.3,
      wavePeriod: 8.0,
      windSpeed: 4.4,
      waterTemp: 12.3,
      weatherLabel: '하늘이 밝고 시야도 안정적이에요',
      recommendedTime: '11:00 - 14:00',
    },
    skillNotes: {
      beginner: '레슨 팀도 가능하지만 송정보다 피크 속도가 더 있습니다.',
      intermediate: '오늘 밸런스가 가장 좋은 카드 중 하나예요.',
      advanced: '바깥 라인을 고르면 가볍게 턴을 넣기 좋습니다.',
    },
    localPicks: [
      { title: '브레이크워터 타코', type: '식사', distance: '도보 3분', description: '짧은 브레이크 타임에도 먹기 좋은 간단한 메뉴.', tag: '빠른 식사', address: '강원 강릉시 사천면 금진해변로 23', operatingHours: '매일 10:00 - 21:00' },
      { title: '금진 로스터리', type: '카페', distance: '도보 6분', description: '한적하게 쉬기 좋은 동네 로스터리.', tag: '한적함', address: '강원 강릉시 사천면 금진리 89', operatingHours: '매일 08:00 - 18:00' },
      { title: '솔트하우스 스테이', type: '숙소', distance: '차량 10분', description: '주말 서핑 베이스로 쓰기 좋은 소형 숙소.', tag: '주말용', address: '강원 강릉시 사천면 해변로 156', operatingHours: '체크인 15:00 / 체크아웃 11:00' },
    ],
    specialInfo: ['라인업 한적함', '주말 여행 적합', '야간 교통은 제한적', '로컬 샵 소규모 운영'],
  },
  {
    id: 'SR7',
    name: '진하해수욕장',
    region: '울산',
    placeCode: 'SR7',
    lat: 35.385,
    lng: 129.345,
    currentLevel: 'good',
    heroWeather: 'sunny',
    summary: '도심 접근성이 좋으면서도 오전 라인이 비교적 깔끔하게 살아 있습니다.',
    spotlight: '부산권에서 부담 없이 움직일 수 있는 남동해권 실속 카드입니다.',
    current: {
      waveHeight: 1.0,
      wavePeriod: 7.0,
      windSpeed: 4.1,
      waterTemp: 14.1,
      weatherLabel: '밝고 온화한 컨디션이에요',
      recommendedTime: '08:30 - 11:30',
    },
    skillNotes: {
      beginner: '접근과 진입이 편해서 초보자 체험용으로도 좋습니다.',
      intermediate: '부산권이 붐빌 때 대체지로 강합니다.',
      advanced: '파워는 크지 않지만 속도감 있는 세션은 가능합니다.',
    },
    localPicks: [
      { title: '하버 라이스볼', type: '식사', distance: '도보 5분', description: '짧은 대기와 깔끔한 해산물 덮밥으로 유명합니다.', tag: '빠른 회전', address: '울산 울주군 서생면 진하해변로 78', operatingHours: '매일 09:00 - 21:00' },
      { title: '진하 서프하우스', type: '렌탈', distance: '도보 2분', description: '레슨, 보드, 락커를 한 번에 해결할 수 있어요.', tag: '레슨 가능', address: '울산 울주군 서생면 진하해수욕장 인근', operatingHours: '매일 06:00 - 19:00' },
      { title: '선레일 카페', type: '카페', distance: '도보 7분', description: '해질 무렵 테라스 자리가 좋은 카페.', tag: '노을 포인트', address: '울산 울주군 서생면 진하리 234', operatingHours: '매일 10:00 - 22:00' },
    ],
    specialInfo: ['초급 진입 쉬움', '락커 인접', '평일 한산함', '가족형 편의시설'],
  },
  {
    id: 'SR6',
    name: '다대포해수욕장',
    region: '부산',
    placeCode: 'SR6',
    lat: 35.0469015,
    lng: 128.9662387,
    currentLevel: 'poor',
    heroWeather: 'windy',
    summary: '오늘은 해변 체크와 산책 위주로 생각하는 편이 맞습니다.',
    spotlight: '걷기와 일몰은 좋지만 실제 입수 우선순위는 낮아요.',
    current: {
      waveHeight: 0.6,
      wavePeriod: 5.2,
      windSpeed: 8.4,
      waterTemp: 14.4,
      weatherLabel: '돌풍이 강하게 들어와요',
      recommendedTime: '관망 추천',
    },
    skillNotes: {
      beginner: '오늘은 체력을 아끼고 다른 포인트를 보는 편이 좋습니다.',
      intermediate: '이미 근처에 있다면 체크 정도는 가능하지만 우선순위는 낮아요.',
      advanced: '형태가 약해 세션 메리트가 거의 없습니다.',
    },
    localPicks: [
      { title: '선셋시장 호빵', type: '간식', distance: '도보 6분', description: '바람 센 날 뜨끈하게 먹기 좋은 간식.', tag: '저예산', address: '부산 사하구 다대동 해변로 45', operatingHours: '매일 08:00 - 20:00' },
      { title: '하구 자전거 포인트', type: '대안 코스', distance: '도보 3분', description: '파도가 약할 때 산책이나 자전거로 전환하기 좋습니다.', tag: '플랜B', address: '부산 사하구 다대포해수욕장 인근', operatingHours: '24시간 개방' },
      { title: '갯벌 씨푸드홀', type: '식사', distance: '차량 10분', description: '여럿이 같이 가기 좋은 푸짐한 메뉴 구성.', tag: '단체 적합', address: '부산 사하구 몰운대동 12-3', operatingHours: '매일 11:00 - 22:00' },
    ],
    specialInfo: ['해변 산책 넓음', '바람 영향 큼', '노을 뷰 우수', '파도 일관성 낮음'],
  },
  {
    id: 'SR10',
    name: '중문색달해수욕장',
    region: '제주',
    placeCode: 'SR10',
    lat: 33.2451968,
    lng: 126.4111861,
    currentLevel: 'very-good',
    heroWeather: 'sunny',
    summary: '오늘 제주권에서 가장 힘 있고 정돈된 라인이 들어오는 메인 포인트입니다.',
    spotlight: '파워 있는 파도를 원한다면 가장 먼저 체크할 카드예요.',
    current: {
      waveHeight: 1.7,
      wavePeriod: 9.1,
      windSpeed: 4.6,
      waterTemp: 15.2,
      weatherLabel: '햇빛과 수면 색감이 모두 좋습니다',
      recommendedTime: '10:00 - 14:00',
    },
    skillNotes: {
      beginner: '혼자 입수하기보다는 강습이나 동행이 있는 편이 좋습니다.',
      intermediate: '한 단계 높은 세션을 원할 때 만족도가 큽니다.',
      advanced: '오늘 가장 퍼포먼스 지향적인 포인트예요.',
    },
    localPicks: [
      { title: '바솔트 브런치', type: '브런치', distance: '차량 7분', description: '오션 테라스가 인상적인 제주권 브런치 장소.', tag: '프리미엄', address: '제주 서귀포시 중문동 2345', operatingHours: '매일 09:00 - 18:00' },
      { title: '클리프라인 샤워클럽', type: '회복', distance: '차량 5분', description: '당일치기 서퍼에게 편한 온수 샤워와 건조 공간.', tag: '편의성', address: '제주 서귀포시 색달해변로 12', operatingHours: '매일 07:00 - 20:00' },
      { title: '색달 흑돼지', type: '식사', distance: '차량 9분', description: '세션 뒤 만족도가 높은 제주식 저녁 코스.', tag: '시그니처', address: '제주 서귀포시 중문동 678', operatingHours: '매일 12:00 - 22:00' },
    ],
    specialInfo: ['파도 에너지 강함', '자신감 있는 라이더에게 적합', '시각적으로 가장 화려함', '관광객 교통 고려'],
  },
]

function levelClass(level: SurfLevel) {
  return level
}

function weatherClass(weather: WeatherType) {
  return `weather-${weather}`
}

function markerColor(level: SurfLevel) {
  switch (level) {
    case 'very-good':
      return '#4de1d1'
    case 'good':
      return '#58b6ff'
    case 'fair':
      return '#f4c95d'
    case 'poor':
      return '#ff8b61'
    case 'flat':
      return '#fc5f7f'
  }
}

function startOfDay(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return startOfDay(next)
}

function diffCalendarDays(left: Date, right: Date) {
  return Math.round((startOfDay(left).getTime() - startOfDay(right).getTime()) / 86400000)
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function formatAbsoluteDate(value: Date) {
  return `${pad2(value.getMonth() + 1)}월 ${pad2(value.getDate())}일`
}

function formatDateWithWeekday(value: Date) {
  return `${formatAbsoluteDate(value)} (${weekdayFormatter.format(value)})`
}

function formatRelativeDateLabel(value: Date) {
  const offset = diffCalendarDays(value, today)

  switch (offset) {
    case -2:
      return '그제'
    case -1:
      return '어제'
    case 0:
      return '오늘'
    case 1:
      return '내일'
    case 2:
      return '모레'
    default:
      return offset < 0 ? `${Math.abs(offset)}일 전` : `${offset}일 후`
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function shiftLevel(level: SurfLevel, amount: number) {
  const order: SurfLevel[] = ['flat', 'poor', 'fair', 'good', 'very-good']
  const index = order.indexOf(level)
  return order[clamp(index + amount, 0, order.length - 1)]
}

function replaceTodayLanguage(text: string, relativeLabel: string) {
  return text.replaceAll('오늘은', `${relativeLabel}은`).replaceAll('오늘', relativeLabel)
}

function buildWeatherLabel(weather: WeatherType, windSpeed: number) {
  switch (weather) {
    case 'sunny':
      return windSpeed >= 6 ? '햇빛은 좋지만 바람이 조금 살아 있어요' : '햇빛과 시야가 모두 안정적이에요'
    case 'cloudy':
      return windSpeed >= 6 ? '구름이 많고 수면이 조금 흔들립니다' : '구름은 있지만 시야는 무난해요'
    case 'windy':
      return windSpeed >= 7 ? '바람이 빠르게 강해져 면이 거칠 수 있어요' : '간헐적인 바람이 들어와 수면이 흔들립니다'
    case 'rainy':
      return windSpeed >= 6 ? '비와 바람이 겹쳐 체감 난도가 높아요' : '가벼운 비가 지나가며 시야가 차분합니다'
  }
}

function shiftTimeRange(timeRange: string, amount: number) {
  if (!timeRange.includes('-')) {
    return timeRange
  }

  const parts = timeRange.split(' - ')
  if (parts.length !== 2) {
    return timeRange
  }

  const shifted = parts.map((part) => {
    const [hoursText, minutesText] = part.split(':')
    const hours = Number(hoursText)
    const minutes = Number(minutesText)

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return part
    }

    const totalMinutes = clamp(hours * 60 + minutes + amount * 30, 360, 1260)
    const shiftedHours = Math.floor(totalMinutes / 60)
    const shiftedMinutes = totalMinutes % 60
    return `${pad2(shiftedHours)}:${pad2(shiftedMinutes)}`
  })

  return `${shifted[0]} - ${shifted[1]}`
}

function buildSummary(level: SurfLevel, relativeLabel: string) {
  switch (level) {
    case 'very-good':
      return `${relativeLabel} 바로 입수 우선순위로 볼 만한 안정적인 포인트입니다.`
    case 'good':
      return `${relativeLabel} 체크 우선순위가 높은 균형 좋은 포인트입니다.`
    case 'fair':
      return `${relativeLabel} 시간대 선택을 잘하면 무난한 세션이 가능합니다.`
    case 'poor':
      return `${relativeLabel} 현장 체크 후 입수 여부를 판단하는 편이 안전합니다.`
    case 'flat':
      return `${relativeLabel} 실제 입수보다는 대체 플랜을 우선 고려하는 편이 낫습니다.`
  }
}

function buildSpotlight(level: SurfLevel, weather: WeatherType) {
  switch (level) {
    case 'very-good':
      return weather === 'sunny' ? '라인 정돈과 시야가 같이 좋아 메인 카드로 보기 좋습니다.' : '조건이 받쳐줘서 세션 만족도가 높게 나올 가능성이 큽니다.'
    case 'good':
      return '무리하지 않고 움직이면 실속 있는 세션으로 이어지기 좋습니다.'
    case 'fair':
      return '피크와 시간대를 고르면 체감 품질을 꽤 끌어올릴 수 있습니다.'
    case 'poor':
      return '바람과 면 상태를 먼저 확인하고 짧게 가져가는 편이 맞습니다.'
    case 'flat':
      return '체크 후 바로 플랜 B로 전환할 가능성까지 같이 보는 편이 좋습니다.'
  }
}

function buildSkillNotes(level: SurfLevel, baseNotes: Record<SkillLevel, string>, relativeLabel: string) {
  return {
    beginner:
      level === 'poor' || level === 'flat'
        ? `${relativeLabel}는 초급자 기준으로 안전한 대체 포인트를 같이 보는 편이 좋습니다.`
        : `${relativeLabel}는 ${replaceTodayLanguage(baseNotes.beginner, relativeLabel)}`
          .replace(`${relativeLabel}는 ${relativeLabel}`, relativeLabel),
    intermediate:
      level === 'flat'
        ? `${relativeLabel}는 라인업 훈련보다 이동 판단이 더 중요한 날입니다.`
        : `${relativeLabel}는 ${replaceTodayLanguage(baseNotes.intermediate, relativeLabel)}`
          .replace(`${relativeLabel}는 ${relativeLabel}`, relativeLabel),
    advanced:
      level === 'very-good'
        ? `${relativeLabel}는 강한 세션을 노릴 만한 포인트예요.`
        : `${relativeLabel}는 ${replaceTodayLanguage(baseNotes.advanced, relativeLabel)}`
          .replace(`${relativeLabel}는 ${relativeLabel}`, relativeLabel),
  }
}

function buildMockSpotSnapshot(spot: SpotBase, date: Date, spotIndex: number): SpotSnapshot {
  const relativeLabel = formatRelativeDateLabel(date)
  const dayOffset = diffCalendarDays(date, today)
  const phase = mod(dayOffset + spotIndex * 2, 5) - 2
  const levelSwing = phase === 0 ? 0 : phase > 0 ? 1 : -1
  const level = shiftLevel(spot.currentLevel, levelSwing)
  const windBump = mod(dayOffset + spotIndex, 4) === 0 ? 1.2 : 0
  const waveHeight = Number(clamp(spot.current.waveHeight + levelSwing * 0.18 + dayOffset * 0.03, 0.4, 2.3).toFixed(1))
  const wavePeriod = Number(clamp(spot.current.wavePeriod + levelSwing * 0.35 + mod(dayOffset - spotIndex, 3) * 0.15, 4.8, 10.4).toFixed(1))
  const windSpeed = Number(clamp(spot.current.windSpeed + Math.abs(dayOffset) * 0.18 + windBump - (level === 'very-good' ? 0.7 : 0), 2.2, 9.8).toFixed(1))
  const waterTemp = Number(clamp(spot.current.waterTemp + dayOffset * 0.08, 9.0, 18.5).toFixed(1))
  const weatherShift = mod(weatherTypes.indexOf(spot.heroWeather) + dayOffset + spotIndex, weatherTypes.length)
  const heroWeather = windSpeed >= 7.2 ? 'windy' : level === 'flat' && weatherShift !== 0 ? 'rainy' : weatherTypes[weatherShift]
  const recommendedTime = level === 'flat' || level === 'poor' ? '관망 추천' : shiftTimeRange(spot.current.recommendedTime, phase)

  return {
    currentLevel: level,
    heroWeather,
    summary: buildSummary(level, relativeLabel),
    spotlight: buildSpotlight(level, heroWeather),
    current: {
      waveHeight,
      wavePeriod,
      windSpeed,
      waterTemp,
      weatherLabel: buildWeatherLabel(heroWeather, windSpeed),
      recommendedTime,
    },
    skillNotes: buildSkillNotes(level, spot.skillNotes, relativeLabel),
  }
}

function apiIndexToLevel(index: SurfingApiItem['totalIndex']): SurfLevel {
  switch (index) {
    case '매우좋음':
      return 'very-good'
    case '좋음':
      return 'good'
    case '보통':
      return 'fair'
    case '나쁨':
      return 'poor'
    case '매우나쁨':
      return 'flat'
  }
}

function apiIndexScore(index: SurfingApiItem['totalIndex']) {
  switch (index) {
    case '매우좋음':
      return 5
    case '좋음':
      return 4
    case '보통':
      return 3
    case '나쁨':
      return 2
    case '매우나쁨':
      return 1
  }
}

function noonOrder(value: SurfingApiItem['predcNoonSeCd']) {
  switch (value) {
    case '오전':
      return 0
    case '오후':
      return 1
    case '일':
      return 2
    default:
      return 99
  }
}

function compareApiItems(a: SurfingApiItem, b: SurfingApiItem) {
  const indexDiff = apiIndexScore(b.totalIndex) - apiIndexScore(a.totalIndex)
  if (indexDiff !== 0) {
    return indexDiff
  }

  const noonDiff = noonOrder(a.predcNoonSeCd) - noonOrder(b.predcNoonSeCd)
  if (noonDiff !== 0) {
    return noonDiff
  }

  const windDiff = a.avgWspd - b.avgWspd
  if (windDiff !== 0) {
    return windDiff
  }

  return b.avgWvpd - a.avgWvpd
}

function pickBestApiItem(items: SurfingApiItem[], grade: SurfingApiItem['grdCn']) {
  return items.filter((item) => item.grdCn === grade).sort(compareApiItems)[0]
}

function deriveApiWeather(item: SurfingApiItem): WeatherType {
  if (item.avgWspd >= 7) {
    return 'windy'
  }
  if (item.totalIndex === '매우좋음' || item.totalIndex === '좋음') {
    return 'sunny'
  }
  if (item.totalIndex === '매우나쁨') {
    return 'rainy'
  }
  return 'cloudy'
}

function buildApiSkillNote(items: SurfingApiItem[], skillLevel: SkillLevel) {
  const grade = skillLevel === 'beginner' ? '초급' : skillLevel === 'intermediate' ? '중급' : '상급'
  const picked = pickBestApiItem(items, grade)

  if (!picked) {
    return '예보 데이터가 아직 정리되지 않았습니다.'
  }

  return `${picked.predcNoonSeCd} 기준 ${picked.totalIndex} 컨디션입니다. 파고 ${picked.avgWvhgt.toFixed(1)}m, 파주기 ${picked.avgWvpd.toFixed(1)}초, 풍속 ${picked.avgWspd.toFixed(1)}m/s입니다.`
}

function buildApiSpotSnapshot(spot: SpotBase, date: Date, items: SurfingApiItem[]): SpotSnapshot | null {
  const targetDate = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  const targetItems = items.filter((item) => item.surfPlcNm === spot.name && item.predcYmd === targetDate)
  const picked = pickBestApiItem(targetItems, '초급')

  if (!picked) {
    return null
  }

  const level = apiIndexToLevel(picked.totalIndex)
  const weather = deriveApiWeather(picked)
  const relativeLabel = formatRelativeDateLabel(date)

  return {
    currentLevel: level,
    heroWeather: weather,
    summary: buildSummary(level, relativeLabel),
    spotlight: buildSpotlight(level, weather),
    current: {
      waveHeight: picked.avgWvhgt,
      wavePeriod: picked.avgWvpd,
      windSpeed: picked.avgWspd,
      waterTemp: picked.avgWtem,
      weatherLabel: `${picked.predcNoonSeCd} 기준 ${picked.totalIndex} 컨디션이에요`,
      recommendedTime:
        picked.totalIndex === '매우나쁨' || picked.totalIndex === '나쁨'
          ? '관망 추천'
          : picked.predcNoonSeCd === '일'
            ? '하루 종일 체크'
            : `${picked.predcNoonSeCd} 추천`,
    },
    skillNotes: {
      beginner: buildApiSkillNote(targetItems, 'beginner'),
      intermediate: buildApiSkillNote(targetItems, 'intermediate'),
      advanced: buildApiSkillNote(targetItems, 'advanced'),
    },
  }
}

function SelectedSpotController({ spot }: { spot: ResolvedSpot }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([spot.lat, spot.lng], 8, {
      animate: true,
      duration: 0.8,
    })
  }, [map, spot])

  return null
}

function MapZoomController({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom())
    },
  })

  useEffect(() => {
    onZoomChange(map.getZoom())
  }, [map, onZoomChange])

  return null
}

function ClusterMarker({
  cluster,
}: {
  cluster: Extract<MarkerNode, { kind: 'cluster' }>
}) {
  const map = useMap()

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={divIcon({
        className: 'cluster-icon-wrapper',
        html: `<div class="cluster-icon">${cluster.label}</div>`,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      })}
      eventHandlers={{
        click: () => {
          map.flyTo([cluster.lat, cluster.lng], 8, {
            animate: true,
            duration: 0.6,
          })
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -12]} opacity={1} className="surf-tooltip">
        <strong>{cluster.spots.map((spot) => spot.name).join(', ')}</strong>
        <span>확대하면 개별 해변이 보입니다</span>
      </Tooltip>
    </Marker>
  )
}

const DETAIL_MAP_ZOOM = 11

function DetailMapController({ spot }: { spot: ResolvedSpot }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([spot.lat, spot.lng], DETAIL_MAP_ZOOM, {
      animate: true,
      duration: 0.8,
    })
  }, [map, spot.lat, spot.lng])

  return null
}

function markerRadius(level: SurfLevel, active: boolean) {
  const base = (() => {
    switch (level) {
      case 'very-good':
        return 11
      case 'good':
        return 10
      case 'fair':
        return 9
      case 'poor':
        return 8
      case 'flat':
        return 8
    }
  })()

  return active ? base + 3 : base
}

function buildMarkerNodes(spots: ResolvedSpot[], zoom: number): MarkerNode[] {
  if (zoom > 7) {
    return spots.map((spot) => ({ kind: 'spot', spot }))
  }

  const eastGroup = spots.filter((spot) => ['SR3', 'SR4', 'SR12'].includes(spot.id))
  const southeastGroup = spots.filter((spot) => ['SR1', 'SR6', 'SR7'].includes(spot.id))
  const jejuGroup = spots.filter((spot) => ['SR10'].includes(spot.id))

  const clusters = [eastGroup, southeastGroup, jejuGroup]
    .filter((group) => group.length > 0)
    .map((group) => ({
      kind: 'cluster' as const,
      id: `cluster-${group.map((spot) => spot.id).join('-')}`,
      spots: group,
      lat: group.reduce((sum, spot) => sum + spot.lat, 0) / group.length,
      lng: group.reduce((sum, spot) => sum + spot.lng, 0) / group.length,
      label: `${group.length}곳`,
    }))

  return clusters
}

type DetailTab = 'weekly-forecast' | 'nearby' | 'tips'

function SpotDetailPage({
 spot,
 baseSpot,
 apiItems,
 southKoreaGeoJson,
 relativeDateLabel,
 absoluteDateLabel,
 forecastLabel,
 sourceLabel,
 onBack,
}: {
 spot: ResolvedSpot
 baseSpot: SpotBase
 apiItems: SurfingApiItem[]
 southKoreaGeoJson: Feature<Geometry, { name?: string }> | null
 relativeDateLabel: string
 absoluteDateLabel: string
 forecastLabel: string
 sourceLabel: string
 onBack: () => void
}) {
 const [activeTab, setActiveTab] = useState<DetailTab>('weekly-forecast')
 const [selectedNearbyPlace, setSelectedNearbyPlace] = useState<LocalCard | null>(null)

 const weekForecast = useMemo(() => {
   const spotIndex = baseSpots.findIndex((s) => s.id === baseSpot.id)
   return Array.from({ length: 7 }, (_, i) => {
     const date = addDays(today, i)
     const apiSnapshot = buildApiSpotSnapshot(baseSpot, date, apiItems)
     const snapshot = apiSnapshot ?? buildMockSpotSnapshot(baseSpot, date, spotIndex >= 0 ? spotIndex : 0)
     return {
       date,
       dateLabel: formatAbsoluteDate(date),
       weekdayLabel: weekdayFormatter.format(date),
       relativeLabel: formatRelativeDateLabel(date),
       level: snapshot.currentLevel,
     }
   })
 }, [baseSpot, apiItems])

 return (
 <main className="detail-page">
 <section className="section-card detail-page-header">
 <button type="button" className="detail-back-button" onClick={onBack}>
 뒤로 가기
 </button>
 <div className="detail-page-meta">
 <div className="meta-pill">
 <span className="meta-label">선택 날짜</span>
 <strong>{absoluteDateLabel}</strong>
 <span>{relativeDateLabel}</span>
 </div>
 <div className="meta-pill">
 <span className="meta-label">예보 기준일</span>
 <strong>{forecastLabel}</strong>
 </div>
 <div className="meta-pill">
 <span className="meta-label">데이터 소스</span>
 <strong>{sourceLabel}</strong>
 </div>
 </div>
 </section>

 <section className="section-card detail-hero-card">
 <div className="detail-hero-copy">
 <p className="eyebrow">{spot.region} 포인트</p>
 <h1>{spot.name} 상세</h1>
 <p className="detail-hero-summary">{spot.summary}</p>
 <p className="detail-hero-spotlight">{spot.spotlight}</p>
 </div>
 <div className="detail-hero-side">
 <span className={"hero-level " + levelClass(spot.currentLevel)}>{levelLabel[spot.currentLevel]}</span>
 <div className="detail-coordinate-card">
 <span className="label">위치 코드</span>
 <strong>{spot.placeCode ? spot.region + " · " + spot.placeCode : spot.region + " · 코드 미확인"}</strong>
 <span>위도 {spot.lat.toFixed(3)} · 경도 {spot.lng.toFixed(3)}</span>
 </div>
 </div>
 </section>

 <div className="detail-layout">
 <section className="section-card detail-section detail-left-tabbed">
 <div className="detail-tabs" role="tablist" aria-label="상세 보기 탭">
 <button
 type="button"
 role="tab"
 aria-selected={activeTab === 'weekly-forecast'}
 className={activeTab === 'weekly-forecast' ? 'is-selected' : ''}
 onClick={() => { setActiveTab('weekly-forecast'); setSelectedNearbyPlace(null) }}
 >
 일주일 예보
 </button>
 <button
 type="button"
 role="tab"
 aria-selected={activeTab === 'nearby'}
 className={activeTab === 'nearby' ? 'is-selected' : ''}
 onClick={() => setActiveTab('nearby')}
 >
 근처 장소
 </button>
 <button
 type="button"
 role="tab"
 aria-selected={activeTab === 'tips'}
 className={activeTab === 'tips' ? 'is-selected' : ''}
 onClick={() => { setActiveTab('tips'); setSelectedNearbyPlace(null) }}
 >
 서핑팁
 </button>
 </div>
 <div className="detail-tab-panel">
 {activeTab === 'weekly-forecast' && (
 <div className="week-forecast-list">
 {weekForecast.map((day) => (
 <article
 key={day.date.getTime()}
 className={`week-forecast-day level-bg-${day.level}`}
 >
 <span className="week-forecast-date">{day.dateLabel}</span>
 <span className="week-forecast-weekday">{day.weekdayLabel} · {day.relativeLabel}</span>
 <strong className="week-forecast-level">{levelLabel[day.level]}</strong>
 </article>
 ))}
 </div>
 )}
 {activeTab === 'nearby' && (
 <div className="nearby-place-list">
 {spot.localPicks.map((place) => (
 <button
 key={place.title}
 type="button"
 className={`nearby-place-card ${selectedNearbyPlace?.title === place.title ? 'is-selected' : ''}`}
 onClick={() => setSelectedNearbyPlace(place)}
 >
 <span className="nearby-place-type">{place.type}</span>
 <strong className="nearby-place-title">{place.title}</strong>
 <span className="nearby-place-distance">{place.distance}</span>
 </button>
 ))}
 </div>
 )}
 {activeTab === 'tips' && (
 <p className="detail-tab-placeholder">서핑팁이 곧 제공됩니다.</p>
 )}
 </div>
 </section>

 <div className="detail-right-column">
 <section className="section-card detail-section detail-map-card">
 <div className="detail-map-stage">
 <MapContainer
 center={[spot.lat, spot.lng]}
 zoom={DETAIL_MAP_ZOOM}
 minZoom={8}
 maxZoom={14}
 maxBounds={koreaMaxBounds}
 zoomControl={false}
 attributionControl={false}
 className="leaflet-map detail-leaflet-map"
 >
 {southKoreaGeoJson ? (
 <GeoJSON
 data={southKoreaGeoJson}
 interactive={false}
 style={() => ({
 color: 'rgba(255,255,255,0.72)',
 weight: 1.4,
 fillColor: '#cfd8de',
 fillOpacity: 0.94,
 })}
 />
 ) : null}
 <CircleMarker
 center={[spot.lat, spot.lng]}
 pathOptions={{
 color: '#ffffff',
 weight: 4,
 fillColor: markerColor(spot.currentLevel),
 fillOpacity: 0.96,
 }}
 radius={markerRadius(spot.currentLevel, true)}
 className="surf-marker is-active"
 >
 <Tooltip direction="top" offset={[0, -10]} opacity={1} className="surf-tooltip">
 <strong>{spot.name}</strong>
 <span>{levelLabel[spot.currentLevel]}</span>
 </Tooltip>
 </CircleMarker>
 <DetailMapController spot={spot} />
 </MapContainer>
 </div>
 </section>
 {selectedNearbyPlace && activeTab === 'nearby' && (
 <section className="section-card detail-section detail-nearby-detail" aria-label="장소 상세 정보">
 <h3 className="detail-nearby-detail-title">{selectedNearbyPlace.title}</h3>
 <dl className="detail-nearby-detail-list">
 <div className="detail-nearby-detail-row">
 <dt>유형</dt>
 <dd>{selectedNearbyPlace.type}</dd>
 </div>
 <div className="detail-nearby-detail-row">
 <dt>위치</dt>
 <dd>{selectedNearbyPlace.address ?? `${spot.region} ${selectedNearbyPlace.title} 인근`}</dd>
 </div>
 <div className="detail-nearby-detail-row">
 <dt>운영시간</dt>
 <dd>{selectedNearbyPlace.operatingHours ?? '문의 필요'}</dd>
 </div>
 <div className="detail-nearby-detail-row">
 <dt>거리</dt>
 <dd>{selectedNearbyPlace.distance}</dd>
 </div>
 <div className="detail-nearby-detail-row detail-nearby-detail-desc">
 <dt>설명</dt>
 <dd>{selectedNearbyPlace.description}</dd>
 </div>
 </dl>
 <p className="detail-nearby-detail-tag">
 <span className="tag">{selectedNearbyPlace.tag}</span>
 </p>
 </section>
 )}
 </div>
 </div>
 </main>
 )
}


function App() {
  const serviceKey = getSurfingApiKey()
 const [screenMode, setScreenMode] = useState<ScreenMode>("dashboard")
  const [selectedSpotId, setSelectedSpotId] = useState(baseSpots[0].id)
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel>('beginner')
  const [selectedDate, setSelectedDate] = useState(today)
  const [mapZoom, setMapZoom] = useState(7)
  const [southKoreaGeoJson, setSouthKoreaGeoJson] = useState<Feature<Geometry, { name?: string }> | null>(null)
  const [apiItems, setApiItems] = useState<SurfingApiItem[]>([])
  const [dataStatus, setDataStatus] = useState<'loading' | 'ready' | 'fallback'>(serviceKey ? 'loading' : 'fallback')
  const [dataSource, setDataSource] = useState<'network' | 'cache' | 'demo'>('demo')
  const [dataMessage, setDataMessage] = useState(serviceKey ? 'API 설정을 확인하는 중입니다.' : 'API 키가 없어 데모 데이터를 표시합니다.')
  const [forecastDate, setForecastDate] = useState<string | null>(null)

  const selectedDateOffset = diffCalendarDays(selectedDate, today)
  const relativeDateLabel = formatRelativeDateLabel(selectedDate)
  const absoluteDateLabel = formatAbsoluteDate(selectedDate)

  const resolvedSpots = useMemo(
    () =>
      baseSpots.map((spot, index) => {
        const apiSnapshot = buildApiSpotSnapshot(spot, selectedDate, apiItems)
        return {
          ...spot,
          ...(apiSnapshot ?? buildMockSpotSnapshot(spot, selectedDate, index)),
        }
      }),
    [apiItems, selectedDate],
  )
  const selectedSpot = useMemo(
    () => resolvedSpots.find((spot) => spot.id === selectedSpotId) ?? resolvedSpots[0],
    [resolvedSpots, selectedSpotId],
  )
  const selectedSpotIndex = resolvedSpots.findIndex((spot) => spot.id === selectedSpot.id)
  const markerNodes = useMemo(() => buildMarkerNodes(resolvedSpots, mapZoom), [resolvedSpots, mapZoom])

  const mapStyle = {
    '--focus-x': `${selectedSpot.lng > 128 ? 70 : selectedSpot.lng < 127 ? 28 : 54}%`,
    '--focus-y': `${72 - (selectedSpot.lat - 33) * 12}%`,
  } as CSSProperties & Record<'--focus-x' | '--focus-y', string>

  const handleSpotSelect = (spotId: string) => {
    startTransition(() => {
      setSelectedSpotId(spotId)
      setSelectedSkill('beginner')
    })
  }

  const handleDateChange = (direction: -1 | 1) => {
    const nextOffset = selectedDateOffset + direction
    if (nextOffset < -DAY_RANGE || nextOffset > DAY_RANGE) {
      return
    }

    setSelectedDate(addDays(today, nextOffset))
  }

  const handleSpotStep = (direction: -1 | 1) => {
    const nextIndex = mod(selectedSpotIndex + direction, resolvedSpots.length)
    handleSpotSelect(resolvedSpots[nextIndex].id)
  }

 

 const handleOpenSpotDetail = () => {
 setScreenMode("spot-detail")
 }

 const handleCloseSpotDetail = () => {
 setScreenMode("dashboard")
 }
 useEffect(() => {
    let cancelled = false

    fetch(countries10mUrl)
      .then((response) => response.json())
      .then((atlas) => {
        const collection = topojsonFeature(atlas, atlas.objects.countries) as unknown as {
          features: Array<Feature<Geometry, { name?: string }> & { id: string }>
        }
        const southKorea = collection.features.find((feature) => feature.id === '410')
        if (!cancelled && southKorea) {
          setSouthKoreaGeoJson(southKorea)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!serviceKey) {
      return () => {
        cancelled = true
      }
    }

    loadSurfingForecastData({ serviceKey })
      .then((result) => {
        if (cancelled) {
          return
        }

        setApiItems(result.items)
        setDataStatus('ready')
        setDataSource(result.source)
        setForecastDate(result.items[0]?.predcYmd ?? null)
        setDataMessage(result.source === 'cache' ? '저장된 API 응답을 재사용했습니다.' : '실시간 API 응답을 반영했습니다.')
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setApiItems([])
        setDataStatus('fallback')
        setDataSource('demo')
        setForecastDate(null)
        setDataMessage(error instanceof Error ? `${error.message}. 데모 데이터로 전환했습니다.` : 'API 호출에 실패해 데모 데이터를 표시합니다.')
      })

    return () => {
      cancelled = true
    }
  }, [serviceKey])

  const sourceLabel = dataSource === 'network' ? '실시간 API' : dataSource === 'cache' ? '저장된 응답' : '데모 데이터'
  const forecastLabel = forecastDate ? forecastDateFormatter.format(new Date(`${forecastDate}T00:00:00`)) : formatDateWithWeekday(selectedDate)

  return (
    <div className={`app-shell ${weatherClass(selectedSpot.heroWeather)}`}>
      <div className="background-aurora" />
      <div className="background-grid" />

      {screenMode === "spot-detail" ? (
 <SpotDetailPage
 spot={selectedSpot}
 baseSpot={baseSpots.find((s) => s.id === selectedSpotId) ?? baseSpots[0]}
 apiItems={apiItems}
 southKoreaGeoJson={southKoreaGeoJson}
 relativeDateLabel={relativeDateLabel}
 absoluteDateLabel={absoluteDateLabel}
 forecastLabel={forecastLabel}
 sourceLabel={sourceLabel}
 onBack={handleCloseSpotDetail}
 />
 ) : (
 <>
 <header className="topbar">
        <div>
          <p className="eyebrow">서핑 API 연동 대시보드</p>
          <h1>국립해양조사원 서핑지수를 날짜 네비게이션 UI와 함께 탐색합니다.</h1>
          <p className="topbar-copy">{dataMessage}</p>
        </div>
        <div className="topbar-meta">
          <div className="meta-pill">
            <span className="meta-label">선택 날짜</span>
            <strong>{absoluteDateLabel}</strong>
            <span>{weekdayFormatter.format(selectedDate)} · {relativeDateLabel}</span>
          </div>
          <div className="meta-pill">
            <span className="meta-label">예보 기준일</span>
            <strong>{forecastLabel}</strong>
          </div>
          <div className="meta-pill">
            <span className="meta-label">데이터 소스</span>
            <strong>{sourceLabel}</strong>
          </div>
          <div className={`meta-pill level-pill ${levelClass(selectedSpot.currentLevel)}`}>
            <span className="meta-label">선택 포인트</span>
            <strong>{selectedSpot.name}</strong>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <section className="map-column">
          <div className="section-card map-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Leaflet 맵</p>
                <h2>API 기준 한국 서핑 포인트 탐색</h2>
              </div>
              <p className="section-copy">API 예보가 있으면 선택 날짜에 우선 반영하고, 없으면 로컬 목업 조건으로 이어서 보여줍니다.</p>
            </div>

            <div className="insight-strip">
              <div>
                <span className="label">선택한 포인트</span>
                <strong>{selectedSpot.name}</strong>
                <p className="condition-copy">{selectedSpot.current.weatherLabel}</p>
                <p>{selectedSpot.spotlight}</p>
              </div>
              <div className="insight-metrics">
                <div>
                  <span className="label">파고</span>
                  <strong>{selectedSpot.current.waveHeight} m</strong>
                </div>
                <div>
                  <span className="label">풍속</span>
                  <strong>{selectedSpot.current.windSpeed} m/s</strong>
                </div>
                <div>
                  <span className="label">추천 시간</span>
                  <strong>{selectedSpot.current.recommendedTime}</strong>
                </div>
              </div>
            </div>

            <p className={`status-note ${dataStatus}`}>{dataMessage}</p>

            <div className="map-stage">
              <div className="map-glow map-stage-glow" style={mapStyle} />
              <div className="weather-layer drizzle" />
              <div className="weather-layer wave-lines" />
              <div className="weather-layer gusts" />
              <MapContainer
                center={mapCenter}
                zoom={7}
                minZoom={6}
                maxZoom={10}
                maxBounds={koreaMaxBounds}
                zoomControl={false}
                attributionControl={false}
                className="leaflet-map"
              >
                {southKoreaGeoJson ? (
                  <GeoJSON
                    data={southKoreaGeoJson}
                    interactive={false}
                    style={() => ({
                      color: 'rgba(255,255,255,0.72)',
                      weight: 1.4,
                      fillColor: '#cfd8de',
                      fillOpacity: 0.94,
                    })}
                  />
                ) : null}

                {markerNodes.map((node) => {
                  if (node.kind === 'spot') {
                    const active = node.spot.id === selectedSpot.id
                    return (
                      <CircleMarker
                        key={node.spot.id}
                        center={[node.spot.lat, node.spot.lng]}
                        pathOptions={{
                          color: active ? '#ffffff' : '#f7fbff',
                          weight: active ? 4 : 3,
                          fillColor: markerColor(node.spot.currentLevel),
                          fillOpacity: 0.96,
                        }}
                        radius={markerRadius(node.spot.currentLevel, active)}
                        eventHandlers={{
                          click: () => handleSpotSelect(node.spot.id),
                        }}
                        className={active ? 'surf-marker is-active' : 'surf-marker'}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} className="surf-tooltip">
                          <strong>{node.spot.name}</strong>
                          <span>{levelLabel[node.spot.currentLevel]}</span>
                        </Tooltip>
                      </CircleMarker>
                    )
                  }

                  return <ClusterMarker key={node.id} cluster={node} />
                })}

                <MapZoomController onZoomChange={setMapZoom} />
                <SelectedSpotController spot={selectedSpot} />
              </MapContainer>
            </div>
          </div>
        </section>

        <div className="sidebar-column">
          <section className="sidebar-date-nav section-card" aria-label="날짜 이동">
            <button
              type="button"
              className="date-nav-button"
              onClick={() => handleDateChange(-1)}
              disabled={selectedDateOffset <= -DAY_RANGE}
              aria-label={`이전 날짜 보기: ${formatDateWithWeekday(addDays(selectedDate, -1))}`}
            >
              <span aria-hidden="true">←</span>
            </button>
            <div className="date-nav-copy">
              <span className="label">기준 날짜</span>
              <strong className="date-nav-relative">{relativeDateLabel}</strong>
              <span className="date-nav-absolute">{formatDateWithWeekday(selectedDate)}</span>
            </div>
            <button
              type="button"
              className="date-nav-button"
              onClick={() => handleDateChange(1)}
              disabled={selectedDateOffset >= DAY_RANGE}
              aria-label={`다음 날짜 보기: ${formatDateWithWeekday(addDays(selectedDate, 1))}`}
            >
              <span aria-hidden="true">→</span>
            </button>
          </section>

          <aside className="section-card sidebar">
            <section className="spot-nav-panel" aria-label="포인트 이동">
              <div className="spot-nav-head">
                <div>
                  <p className="eyebrow">{relativeDateLabel}의 포인트</p>
                  <h3>{selectedSpot.name}</h3>
                </div>
                <span className={`hero-level mini ${levelClass(selectedSpot.currentLevel)}`}>
                  {levelLabel[selectedSpot.currentLevel]}
                </span>
              </div>
              <p className="spot-nav-meta">
                {selectedSpot.region}
                {selectedSpot.placeCode ? ` · ${selectedSpot.placeCode}` : ' · 코드 미확인'}
                {` · ${selectedSpotIndex + 1}/${resolvedSpots.length}`}
              </p>
              <p className="spot-nav-meta">
                위도 {selectedSpot.lat.toFixed(3)} · 경도 {selectedSpot.lng.toFixed(3)}
              </p>
              <p className="spot-nav-summary">{selectedSpot.spotlight}</p>
              <div className="spot-nav-actions">
                <button
                  type="button"
                  className="date-nav-button"
                  onClick={() => handleSpotStep(-1)}
                  aria-label={`이전 포인트 보기: ${resolvedSpots[mod(selectedSpotIndex - 1, resolvedSpots.length)].name}`}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <div className="spot-nav-metrics">
                  <span>{selectedSpot.current.waveHeight} m</span>
                  <span>{selectedSpot.current.windSpeed} m/s</span>
                  <span>{selectedSpot.current.recommendedTime}</span>
                </div>
                <button
                  type="button"
                  className="date-nav-button"
                  onClick={() => handleSpotStep(1)}
                  aria-label={`다음 포인트 보기: ${resolvedSpots[mod(selectedSpotIndex + 1, resolvedSpots.length)].name}`}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>

            <p className="hero-summary">{selectedSpot.summary}</p>

            <section className="panel-grid current-grid">
              <div className="info-card">
                <span className="label">현재 파고</span>
                <strong>{selectedSpot.current.waveHeight} m</strong>
              </div>
              <div className="info-card">
                <span className="label">파주기</span>
                <strong>{selectedSpot.current.wavePeriod} s</strong>
              </div>
              <div className="info-card">
                <span className="label">풍속</span>
                <strong>{selectedSpot.current.windSpeed} m/s</strong>
              </div>
              <div className="info-card">
                <span className="label">수온</span>
                <strong>{selectedSpot.current.waterTemp}°C</strong>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">{relativeDateLabel}의 판단</p>
                  <h3>실력별 추천 한 줄</h3>
                </div>
              </div>
              <div className="segment-control" role="tablist" aria-label="실력 레벨 선택">
                {skillLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={selectedSkill === level ? 'is-selected' : ''}
                    onClick={() => setSelectedSkill(level)}
                  >
                    {skillLabel[level]}
                  </button>
                ))}
              </div>
              <div className="narrative-card">
                <span className="label">{relativeDateLabel}의 해석</span>
                <p>{selectedSpot.skillNotes[selectedSkill]}</p>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">현장 메모</p>
                  <h3>특별 안내</h3>
                </div>
              </div>
              <div className="tag-list">
                {selectedSpot.specialInfo.map((item) => (
                  <span key={item} className="tag">
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </aside>

          <section className="section-card sidebar-detail-action" aria-label="상세 보기">
            <button type="button" className="detail-link-button" onClick={handleOpenSpotDetail}>
              상세 보기
            </button>
          </section>
        </div>
      </main>
 </>
 )}
    </div>
  )
}

export default App

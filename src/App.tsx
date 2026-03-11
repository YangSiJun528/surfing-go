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
  lat: number
  lng: number
  googleMapsUrl: string
}

type LocalCardSeed = Omit<LocalCard, 'lat' | 'lng' | 'googleMapsUrl'>

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
  locationLabel: string
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
type MetricKey = 'waveHeight' | 'wavePeriod' | 'windSpeed' | 'waterTemp'

const DAY_RANGE = 7
const skillLevels: SkillLevel[] = ['beginner', 'intermediate', 'advanced']
const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'windy', 'rainy']
const mapCenter: LatLngExpression = [36.2, 127.9]
const koreaMaxBounds: LatLngBoundsExpression = [
  [32.2, 123.8],
  [39.5, 132.0],
]
const weekdayFormatter = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' })
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

const markerLegend = [
  { level: 'very-good' as const, description: '가장 우선 체크할 메인 포인트입니다.' },
  { level: 'good' as const, description: '조건이 안정적이라 실속 있는 선택지입니다.' },
  { level: 'fair' as const, description: '시간대나 위치를 잘 고르면 무난합니다.' },
  { level: 'poor' as const, description: '현장 확인 후 보수적으로 판단해야 합니다.' },
  { level: 'flat' as const, description: '파도가 약해 대체 플랜을 같이 보는 편이 좋습니다.' },
]

const metricInfo: Record<
  MetricKey,
  {
    label: string
    unit: string
    description: string
    interpretation: string
    formatValue: (spot: ResolvedSpot) => string
  }
> = {
  waveHeight: {
    label: '현재 파고',
    unit: 'm',
    description: '의미: 들어오는 파도의 평균 높이입니다.',
    interpretation: '해석: 0.5m 이하는 약하고, 0.8~1.5m는 무난하며, 1.8m 이상은 난도가 올라갑니다.',
    formatValue: (spot) => `${spot.current.waveHeight} m`,
  },
  wavePeriod: {
    label: '파주기',
    unit: 's',
    description: '의미: 파도와 파도 사이의 시간 간격입니다.',
    interpretation: '해석: 5초 이하는 짧고, 6~8초는 보통, 9초 이상은 더 힘 있는 세트일 수 있습니다.',
    formatValue: (spot) => `${spot.current.wavePeriod} s`,
  },
  windSpeed: {
    label: '풍속',
    unit: 'm/s',
    description: '의미: 바람의 속도이며 면 상태에 큰 영향을 줍니다.',
    interpretation: '해석: 3m/s 이하는 잔잔하고, 4~6m/s는 체크 구간, 7m/s 이상은 강풍 대비가 필요합니다.',
    formatValue: (spot) => `${spot.current.windSpeed} m/s`,
  },
  waterTemp: {
    label: '수온',
    unit: '°C',
    description: '의미: 바다 물 온도로 체감과 슈트 선택에 직접 연결됩니다.',
    interpretation: '해석: 10°C 전후는 매우 차갑고, 12~16°C는 두꺼운 슈트, 18°C 이상은 부담이 덜합니다.',
    formatValue: (spot) => `${spot.current.waterTemp}°C`,
  },
}

const rawBaseSpots: Array<Omit<SpotBase, 'localPicks'> & { localPicks: LocalCardSeed[] }> = [
  {
    id: 'SR1',
    name: '송정해수욕장',
    region: '부산',
    locationLabel: '부산 해운대구',
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
      { title: '웨이브 토스트 클럽', type: '브런치', distance: '도보 4분', description: '입수 전 빠르게 먹기 좋은 토스트와 커피.', tag: '오픈 빠름' },
      { title: '블루보드 렌탈', type: '렌탈', distance: '도보 1분', description: '초보자용 보드와 슈트 대여가 편한 샵.', tag: '입문 친화' },
      { title: '문라이트 국밥', type: '식사', distance: '차량 8분', description: '세션 뒤 따뜻하게 마무리하기 좋은 현지 식당.', tag: '로컬 픽' },
    ],
    specialInfo: ['주차장 접근 쉬움', '샤워 가능', '보드 대여 가능', '점심 이후 혼잡'],
  },
  {
    id: 'SR3',
    name: '죽도해수욕장',
    region: '양양',
    locationLabel: '강원 양양군',
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
      { title: '브레이크라인 커피', type: '카페', distance: '도보 2분', description: '라인업이 보이는 창가 좌석이 인기인 카페.', tag: '오션뷰' },
      { title: '죽도 생선구이', type: '식사', distance: '도보 6분', description: '세션 뒤 든든하게 먹기 좋은 생선구이 정식.', tag: '단백질' },
      { title: '이스트클리프 사우나', type: '회복', distance: '차량 9분', description: '찬 수온 뒤 몸 풀기 좋은 온탕과 사우나.', tag: '온수 샤워' },
    ],
    specialInfo: ['주차는 이른 시간 추천', '중들물 타이밍 강함', '수온 낮아 슈트 권장', '일출 포인트'],
  },
  {
    id: 'SR4',
    name: '망상해수욕장',
    region: '동해',
    locationLabel: '강원 동해시',
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
      { title: '항구칼국수', type: '식사', distance: '차량 5분', description: '짧은 세션 뒤 빠르게 먹기 좋은 국수집.', tag: '가성비' },
      { title: '파인트리 마트', type: '스토어', distance: '도보 4분', description: '간식과 왁스를 빠르게 채우기 좋아요.', tag: '준비물' },
      { title: '샌드라인 카페', type: '카페', distance: '도보 7분', description: '라인업을 바라보며 쉬기 좋은 카페.', tag: '작업 가능' },
    ],
    specialInfo: ['해변 진입 편함', '주차 여유 있음', '바람 노출 큼', '양양보다 덜 붐빔'],
  },
  {
    id: 'SR12',
    name: '금진해수욕장',
    region: '강릉',
    locationLabel: '강원 강릉시',
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
      { title: '브레이크워터 타코', type: '식사', distance: '도보 3분', description: '짧은 브레이크 타임에도 먹기 좋은 간단한 메뉴.', tag: '빠른 식사' },
      { title: '금진 로스터리', type: '카페', distance: '도보 6분', description: '한적하게 쉬기 좋은 동네 로스터리.', tag: '한적함' },
      { title: '솔트하우스 스테이', type: '숙소', distance: '차량 10분', description: '주말 서핑 베이스로 쓰기 좋은 소형 숙소.', tag: '주말용' },
    ],
    specialInfo: ['라인업 한적함', '주말 여행 적합', '야간 교통은 제한적', '로컬 샵 소규모 운영'],
  },
  {
    id: 'SR7',
    name: '진하해수욕장',
    region: '울산',
    locationLabel: '울산 울주군',
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
      { title: '하버 라이스볼', type: '식사', distance: '도보 5분', description: '짧은 대기와 깔끔한 해산물 덮밥으로 유명합니다.', tag: '빠른 회전' },
      { title: '진하 서프하우스', type: '렌탈', distance: '도보 2분', description: '레슨, 보드, 락커를 한 번에 해결할 수 있어요.', tag: '레슨 가능' },
      { title: '선레일 카페', type: '카페', distance: '도보 7분', description: '해질 무렵 테라스 자리가 좋은 카페.', tag: '노을 포인트' },
    ],
    specialInfo: ['초급 진입 쉬움', '락커 인접', '평일 한산함', '가족형 편의시설'],
  },
  {
    id: 'SR6',
    name: '다대포해수욕장',
    region: '부산',
    locationLabel: '부산 사하구',
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
      { title: '선셋시장 호빵', type: '간식', distance: '도보 6분', description: '바람 센 날 뜨끈하게 먹기 좋은 간식.', tag: '저예산' },
      { title: '하구 자전거 포인트', type: '대안 코스', distance: '도보 3분', description: '파도가 약할 때 산책이나 자전거로 전환하기 좋습니다.', tag: '플랜B' },
      { title: '갯벌 씨푸드홀', type: '식사', distance: '차량 10분', description: '여럿이 같이 가기 좋은 푸짐한 메뉴 구성.', tag: '단체 적합' },
    ],
    specialInfo: ['해변 산책 넓음', '바람 영향 큼', '노을 뷰 우수', '파도 일관성 낮음'],
  },
  {
    id: 'SR10',
    name: '중문색달해수욕장',
    region: '제주',
    locationLabel: '제주 서귀포시',
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
      { title: '바솔트 브런치', type: '브런치', distance: '차량 7분', description: '오션 테라스가 인상적인 제주권 브런치 장소.', tag: '프리미엄' },
      { title: '클리프라인 샤워클럽', type: '회복', distance: '차량 5분', description: '당일치기 서퍼에게 편한 온수 샤워와 건조 공간.', tag: '편의성' },
      { title: '색달 흑돼지', type: '식사', distance: '차량 9분', description: '세션 뒤 만족도가 높은 제주식 저녁 코스.', tag: '시그니처' },
    ],
    specialInfo: ['파도 에너지 강함', '자신감 있는 라이더에게 적합', '시각적으로 가장 화려함', '관광객 교통 고려'],
  },
]

const localPickOffsets = [
  { lat: 0.0014, lng: 0.0012 },
  { lat: -0.0011, lng: 0.0015 },
  { lat: 0.0018, lng: -0.0013 },
] as const

function buildGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

function buildLocalPickLocation(baseLat: number, baseLng: number, index: number) {
  const offset = localPickOffsets[index % localPickOffsets.length]
  const lat = Number((baseLat + offset.lat).toFixed(6))
  const lng = Number((baseLng + offset.lng).toFixed(6))

  return {
    lat,
    lng,
    googleMapsUrl: buildGoogleMapsUrl(lat, lng),
  }
}

const baseSpots: SpotBase[] = rawBaseSpots.map((spot) => ({
  ...spot,
  localPicks: spot.localPicks.map((place, index) => ({
    ...place,
    ...buildLocalPickLocation(spot.lat, spot.lng, index),
  })),
}))

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

function App() {
  const serviceKey = getSurfingApiKey()
  const [selectedSpotId, setSelectedSpotId] = useState(baseSpots[0].id)
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel>('beginner')
  const [selectedDate, setSelectedDate] = useState(today)
  const [mapZoom, setMapZoom] = useState(7)
  const [southKoreaGeoJson, setSouthKoreaGeoJson] = useState<Feature<Geometry, { name?: string }> | null>(null)
  const [apiItems, setApiItems] = useState<SurfingApiItem[]>([])

  const selectedDateOffset = diffCalendarDays(selectedDate, today)
  const relativeDateLabel = formatRelativeDateLabel(selectedDate)

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
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setApiItems([])
        console.error(error)
      })

    return () => {
      cancelled = true
    }
  }, [serviceKey])

  return (
    <div className={`app-shell ${weatherClass(selectedSpot.heroWeather)}`}>
      <div className="background-aurora" />
      <div className="background-grid" />

      <header className="topbar">
        <h1>서핑고</h1>
      </header>

      <div className="dashboard-top">
        <div />
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
      </div>

      <main className="dashboard">
        <section className="map-column">
          <div className="section-card map-card">
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
                          <span>{node.spot.locationLabel}</span>
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

            <details className="map-legend" aria-label="마커 설명">
              <summary className="map-legend-summary">
                <div className="map-legend-head">
                  <span className="label">마커 설명</span>
                  <p>색상은 추천 정도, 원 크기는 상대적 우선순위를 의미합니다.</p>
                </div>
                <span className="map-legend-chevron" aria-hidden="true">⌄</span>
              </summary>
              <div className="map-legend-list">
                {markerLegend.map((item) => (
                  <div key={item.level} className="map-legend-item">
                    <span
                      className={`map-legend-dot ${item.level}`}
                      style={{
                        width: `${markerRadius(item.level, false) * 2}px`,
                        height: `${markerRadius(item.level, false) * 2}px`,
                        backgroundColor: markerColor(item.level),
                      }}
                    />
                    <div>
                      <strong>{levelLabel[item.level]}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </section>

        <div className="sidebar-column">
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
              {(Object.entries(metricInfo) as Array<[MetricKey, (typeof metricInfo)[MetricKey]]>).map(([metricKey, info]) => {
                return (
                  <article key={metricKey} className="info-card">
                    <div className="info-card-head">
                      <span className="label">{info.label}</span>
                      <span className="info-icon-wrap">
                        <button
                          type="button"
                          className="info-icon-button"
                          aria-label={`${info.label} 설명`}
                        >
                          i
                        </button>
                        <span className="info-card-tooltip" role="tooltip">
                          <span>{info.description}</span>
                          <span>{info.interpretation}</span>
                        </span>
                      </span>
                    </div>
                    <strong>{info.formatValue(selectedSpot)}</strong>
                  </article>
                )
              })}
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
        </div>
      </main>
    </div>
  )
}

export default App

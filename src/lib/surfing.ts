export type SurfLevel = 'very-good' | 'good' | 'fair' | 'poor' | 'flat'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'windy'

type ApiHeader = {
  resultCode: string
  resultMsg: string
}

type ApiBody = {
  items?: {
    item?: SurfingApiItemRaw | SurfingApiItemRaw[]
  }
  pageNo?: number
  numOfRows?: number
  totalCount?: number
  type?: string
}

type ApiEnvelope = {
  response?: {
    header?: ApiHeader
    body?: ApiBody
  }
  header?: ApiHeader
  body?: ApiBody
}

type SurfingApiItemRaw = {
  surfPlcNm?: string
  lat?: number
  lot?: number
  predcYmd?: string
  predcNoonSeCd?: string
  avgWvhgt?: string | number
  avgWvpd?: string | number
  avgWspd?: string | number
  avgWtem?: string | number
  grdCn?: string
  totalIndex?: string
}

export type SurfingApiItem = {
  surfPlcNm: string
  lat: number
  lot: number
  predcYmd: string
  predcNoonSeCd: string
  avgWvhgt: number
  avgWvpd: number
  avgWspd: number
  avgWtem: number
  grdCn: '초급' | '중급' | '상급'
  totalIndex: '매우나쁨' | '나쁨' | '보통' | '좋음' | '매우좋음'
}

export type SpotApiRuntime = {
  currentLevel: SurfLevel
  heroWeather: WeatherType
  current: {
    waveHeight: number
    wavePeriod: number
    windSpeed: number
    waterTemp: number
    weatherLabel: string
    recommendedTime: string
  }
  skillNotes: Record<SkillLevel, string>
  forecastDate: string
}

export type SurfingLoadResult = {
  items: SurfingApiItem[]
  source: 'network' | 'cache'
  reqDate: string
  fetchedAt: string
}

type SurfingCache = SurfingLoadResult

const API_CACHE_KEY = 'surfing-go:surfing-api-cache:v1'
const PAGE_SIZE = 300
const NOON_ORDER = ['오전', '오후', '일']
const SKILL_TO_GRADE: Record<SkillLevel, SurfingApiItem['grdCn']> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '상급',
}

export function getSurfingApiKey() {
  return import.meta.env.VITE_SURFING_API_KEY?.trim() ?? ''
}

export function getCurrentReqDate(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}${month}${day}`
}

export async function loadSurfingForecastData({
  serviceKey,
  reqDate = getCurrentReqDate(),
}: {
  serviceKey: string
  reqDate?: string
}): Promise<SurfingLoadResult> {
  const cached = readCache()
  if (cached?.reqDate === reqDate) {
    return { ...cached, source: 'cache' }
  }

  const firstPage = await requestPage({ serviceKey, reqDate, pageNo: 1 })
  const totalCount = firstPage.body.totalCount ?? firstPage.items.length
  const items = [...firstPage.items]

  if (totalCount > items.length) {
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)
    for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
      const page = await requestPage({ serviceKey, reqDate, pageNo })
      items.push(...page.items)
    }
  }

  const result: SurfingLoadResult = {
    items,
    source: 'network',
    reqDate,
    fetchedAt: new Date().toISOString(),
  }
  writeCache(result)
  return result
}

export function buildSpotApiRuntimeMap(items: SurfingApiItem[]) {
  const placeMap = new Map<string, SurfingApiItem[]>()
  for (const item of items) {
    const placeItems = placeMap.get(item.surfPlcNm) ?? []
    placeItems.push(item)
    placeMap.set(item.surfPlcNm, placeItems)
  }

  const runtimeMap = new Map<string, SpotApiRuntime>()

  for (const [placeName, placeItems] of placeMap.entries()) {
    const dates = [...new Set(placeItems.map((item) => item.predcYmd))].sort()
    const forecastDate = dates[0]
    if (!forecastDate) {
      continue
    }

    const todaysItems = placeItems.filter((item) => item.predcYmd === forecastDate)
    const beginnerPick = pickBestItem(todaysItems, '초급')
    if (!beginnerPick) {
      continue
    }

    runtimeMap.set(placeName, {
      currentLevel: mapIndexToLevel(beginnerPick.totalIndex),
      heroWeather: deriveWeather(beginnerPick),
      current: {
        waveHeight: beginnerPick.avgWvhgt,
        wavePeriod: beginnerPick.avgWvpd,
        windSpeed: beginnerPick.avgWspd,
        waterTemp: beginnerPick.avgWtem,
        weatherLabel: buildWeatherLabel(beginnerPick),
        recommendedTime: buildRecommendedTime(beginnerPick),
      },
      skillNotes: {
        beginner: buildSkillNote(todaysItems, 'beginner'),
        intermediate: buildSkillNote(todaysItems, 'intermediate'),
        advanced: buildSkillNote(todaysItems, 'advanced'),
      },
      forecastDate,
    })
  }

  return runtimeMap
}

function buildSkillNote(items: SurfingApiItem[], skillLevel: SkillLevel) {
  const grade = SKILL_TO_GRADE[skillLevel]
  const picked = pickBestItem(items, grade)
  if (!picked) {
    return '예보 데이터가 아직 정리되지 않았습니다.'
  }

  return `${picked.predcNoonSeCd} 기준 ${picked.totalIndex} 컨디션입니다. 파고 ${picked.avgWvhgt.toFixed(1)}m, 파주기 ${picked.avgWvpd.toFixed(1)}초, 풍속 ${picked.avgWspd.toFixed(1)}m/s입니다.`
}

function buildWeatherLabel(item: SurfingApiItem) {
  return `${item.predcNoonSeCd} 기준 ${item.totalIndex} 컨디션이에요`
}

function buildRecommendedTime(item: SurfingApiItem) {
  if (item.totalIndex === '매우나쁨' || item.totalIndex === '나쁨') {
    return '관망 추천'
  }

  return item.predcNoonSeCd === '일' ? '하루 종일 체크' : `${item.predcNoonSeCd} 추천`
}

function pickBestItem(items: SurfingApiItem[], grade: SurfingApiItem['grdCn']) {
  const gradeItems = items.filter((item) => item.grdCn === grade)
  return gradeItems.sort(compareForecastItems)[0]
}

function compareForecastItems(a: SurfingApiItem, b: SurfingApiItem) {
  const indexDiff = scoreIndex(b.totalIndex) - scoreIndex(a.totalIndex)
  if (indexDiff !== 0) {
    return indexDiff
  }

  const timeDiff = NOON_ORDER.indexOf(a.predcNoonSeCd) - NOON_ORDER.indexOf(b.predcNoonSeCd)
  if (timeDiff !== 0) {
    return timeDiff
  }

  const windDiff = a.avgWspd - b.avgWspd
  if (windDiff !== 0) {
    return windDiff
  }

  return b.avgWvpd - a.avgWvpd
}

function deriveWeather(item: SurfingApiItem): WeatherType {
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

function mapIndexToLevel(index: SurfingApiItem['totalIndex']): SurfLevel {
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

function scoreIndex(index: SurfingApiItem['totalIndex']) {
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

async function requestPage({
  serviceKey,
  reqDate,
  pageNo,
}: {
  serviceKey: string
  reqDate: string
  pageNo: number
}) {
  const url = new URL('/api/surfing', window.location.origin)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('type', 'json')
  url.searchParams.set('reqDate', reqDate)
  url.searchParams.set('pageNo', `${pageNo}`)
  url.searchParams.set('numOfRows', `${PAGE_SIZE}`)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`API 요청 실패 (${response.status})`)
  }

  const payload = (await response.json()) as ApiEnvelope
  const { header, body } = extractEnvelope(payload)
  if (!header || header.resultCode !== '00') {
    throw new Error(header?.resultMsg ?? '알 수 없는 API 오류')
  }

  return {
    body,
    items: extractItems(body),
  }
}

function extractEnvelope(payload: ApiEnvelope) {
  if (payload.response) {
    return {
      header: payload.response.header,
      body: payload.response.body ?? {},
    }
  }

  return {
    header: payload.header,
    body: payload.body ?? {},
  }
}

function extractItems(body: ApiBody) {
  const rawItems = body.items?.item
  if (!rawItems) {
    return []
  }

  const list = Array.isArray(rawItems) ? rawItems : [rawItems]
  return list.map(normalizeItem)
}

function normalizeItem(item: SurfingApiItemRaw): SurfingApiItem {
  return {
    surfPlcNm: item.surfPlcNm ?? '',
    lat: Number(item.lat ?? 0),
    lot: Number(item.lot ?? 0),
    predcYmd: item.predcYmd ?? '',
    predcNoonSeCd: item.predcNoonSeCd ?? '',
    avgWvhgt: Number(item.avgWvhgt ?? 0),
    avgWvpd: Number(item.avgWvpd ?? 0),
    avgWspd: Number(item.avgWspd ?? 0),
    avgWtem: Number(item.avgWtem ?? 0),
    grdCn: (item.grdCn ?? '초급') as SurfingApiItem['grdCn'],
    totalIndex: (item.totalIndex ?? '보통') as SurfingApiItem['totalIndex'],
  }
}

function readCache() {
  if (typeof window === 'undefined') {
    return null
  }

  const cached = window.localStorage.getItem(API_CACHE_KEY)
  if (!cached) {
    return null
  }

  try {
    return JSON.parse(cached) as SurfingCache
  } catch {
    window.localStorage.removeItem(API_CACHE_KEY)
    return null
  }
}

function writeCache(cache: SurfingCache) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(API_CACHE_KEY, JSON.stringify(cache))
}

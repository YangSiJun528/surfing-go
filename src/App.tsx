import { startTransition, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import { feature as topojsonFeature } from 'topojson-client'
import './App.css'
import countries10mUrl from 'world-atlas/countries-10m.json?url'
import { forecastIndexClass, forecastItems, formatForecastDate, skillGradeLabel, sortForecastItems } from './forecast'

type SurfLevel = 'very-good' | 'good' | 'fair' | 'poor' | 'flat'
type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'windy'

type LocalCard = {
  title: string
  type: string
  distance: string
  description: string
  tag: string
}

type Spot = {
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
  current: {
    waveHeight: number
    wavePeriod: number
    windSpeed: number
    waterTemp: number
    weatherLabel: string
    recommendedTime: string
  }
  skillNotes: Record<SkillLevel, string>
  localPicks: LocalCard[]
  specialInfo: string[]
}

type MarkerNode =
  | { kind: 'spot'; spot: Spot }
  | { kind: 'cluster'; id: string; spots: Spot[]; lat: number; lng: number; label: string }

const skillLevels: SkillLevel[] = ['beginner', 'intermediate', 'advanced']
const mapCenter: LatLngExpression = [36.2, 127.9]
const koreaMaxBounds: LatLngBoundsExpression = [
  [32.2, 123.8],
  [39.5, 132.0],
]

const levelLabel: Record<SurfLevel, string> = {
  'very-good': '매우 좋음',
  good: '좋음',
  fair: '보통',
  poor: '주의',
  flat: '비추천',
}

const weatherLabel: Record<WeatherType, string> = {
  sunny: '맑음',
  cloudy: '흐림',
  rainy: '비',
  windy: '강풍',
}

const skillLabel: Record<SkillLevel, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '상급',
}

const todayFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

const spots: Spot[] = [
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

function SelectedSpotController({ spot }: { spot: Spot }) {
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

function buildMarkerNodes(spots: Spot[], zoom: number): MarkerNode[] {
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

function SkillLevelTabs({
  selectedSkill,
  onSelect,
  ariaLabel,
}: {
  selectedSkill: SkillLevel
  onSelect: (level: SkillLevel) => void
  ariaLabel: string
}) {
  return (
    <div className="segment-control" role="tablist" aria-label={ariaLabel}>
      {skillLevels.map((level) => (
        <button
          key={level}
          type="button"
          className={selectedSkill === level ? 'is-selected' : ''}
          onClick={() => onSelect(level)}
        >
          {skillLabel[level]}
        </button>
      ))}
    </div>
  )
}

function App() {
  const [selectedSpotId, setSelectedSpotId] = useState(spots[0].id)
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel>('beginner')
  const [isForecastExpanded, setIsForecastExpanded] = useState(false)
  const [mapZoom, setMapZoom] = useState(7)
  const [southKoreaGeoJson, setSouthKoreaGeoJson] = useState<any>(null)

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedSpotId) ?? spots[0],
    [selectedSpotId],
  )
  const markerNodes = useMemo(() => buildMarkerNodes(spots, mapZoom), [mapZoom])
  const weeklyForecastItems = useMemo(
    () =>
      sortForecastItems(
        forecastItems.filter(
          (item) =>
            item.placeCode === selectedSpot.placeCode &&
            item.grdCn === skillGradeLabel[selectedSkill],
        ),
      ),
    [selectedSkill, selectedSpot.placeCode],
  )

  const mapStyle = {
    '--focus-x': `${selectedSpot.lng > 128 ? 70 : selectedSpot.lng < 127 ? 28 : 54}%`,
    '--focus-y': `${72 - (selectedSpot.lat - 33) * 12}%`,
  } as CSSProperties & Record<'--focus-x' | '--focus-y', string>

  const handleSpotSelect = (spotId: string) => {
    startTransition(() => {
      setSelectedSpotId(spotId)
      setSelectedSkill('beginner')
      setIsForecastExpanded(false)
    })
  }

  useEffect(() => {
    let cancelled = false

    fetch(countries10mUrl)
      .then((response) => response.json())
      .then((atlas) => {
        const collection = topojsonFeature(atlas, atlas.objects.countries) as unknown as {
          features: Array<{ id: string; properties: { name: string }; geometry: object }>
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

  return (
    <div className={`app-shell ${weatherClass(selectedSpot.heroWeather)}`}>
      <div className="background-aurora" />
      <div className="background-grid" />

      <header className="topbar">
        <div>
          <p className="eyebrow">오늘의 서핑 포인트</p>
          <h1>Leaflet 기반으로 오늘 기준 컨디션만 빠르게 확인하는 데모입니다.</h1>
        </div>
        <div className="topbar-meta">
          <div className="meta-pill">
            <span className="meta-label">오늘 날짜</span>
            <strong>{todayFormatter.format(new Date())}</strong>
          </div>
          <div className={`meta-pill level-pill ${levelClass(selectedSpot.currentLevel)}`}>
            <span className="meta-label">추천 포인트</span>
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
                <h2>위도·경도 기준 한국 포인트 탐색</h2>
              </div>
              <p className="section-copy">외부 타일 없이 로컬 SVG 지도를 오버레이하고, 실제 좌표로 마커를 배치합니다.</p>
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

        <aside className="section-card sidebar">
          <div className="sidebar-hero">
            <div>
              <p className="eyebrow">오늘의 상세</p>
              <h2>{selectedSpot.name}</h2>
              <p className="hero-region">
                {selectedSpot.region}
                {selectedSpot.placeCode ? ` · ${selectedSpot.placeCode}` : ' · 더미 포인트'}
              </p>
              <p className="hero-region coords">
                위도 {selectedSpot.lat.toFixed(3)} · 경도 {selectedSpot.lng.toFixed(3)}
              </p>
            </div>
            <div className={`hero-level ${levelClass(selectedSpot.currentLevel)}`}>
              {levelLabel[selectedSpot.currentLevel]}
            </div>
          </div>

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
                <p className="eyebrow">오늘의 판단</p>
                <h3>실력별 추천 한 줄</h3>
              </div>
            </div>
            <SkillLevelTabs
            selectedSkill={selectedSkill}
            onSelect={setSelectedSkill}
            ariaLabel="실력 레벨 선택"
          />
        <div className="narrative-card">
          <span className="label">오늘의 해석</span>
          <p>{selectedSpot.skillNotes[selectedSkill]}</p>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">해당 스팟 기준</p>
            <h3>일주일 예보</h3>
          </div>
        </div>
        <div className="detail-card forecast-summary-card">
          <div>
            <span className="label">표시 방식</span>
            <p>{selectedSpot.name} 기준으로 가까운 3일은 오전/오후, 이후 4일은 일 단위로 보여줘요.</p>
          </div>
          <button
            type="button"
            className="ghost-button"
            aria-expanded={isForecastExpanded}
            onClick={() => setIsForecastExpanded((expanded) => !expanded)}
          >
            {isForecastExpanded ? '상세 접기' : '상세 보기'}
          </button>
        </div>

        {isForecastExpanded ? (
          <div className="forecast-detail">
            <SkillLevelTabs
              selectedSkill={selectedSkill}
              onSelect={setSelectedSkill}
              ariaLabel="일주일 예보 실력 레벨 선택"
            />
            <div className="forecast-list" role="list" aria-label="일주일 예보 리스트">
              {weeklyForecastItems.map((item) => (
                <article
                  key={`${item.placeCode}-${item.grdCn}-${item.predcYmd}-${item.predcNoonSeCd}`}
                  className={`forecast-list-row ${forecastIndexClass(item.totalIndex)}`}
                  role="listitem"
                >
                  <div className="forecast-row-copy">
                    <strong>{formatForecastDate(item.predcYmd)}</strong>
                    <span>{item.predcNoonSeCd}</span>
                  </div>
                  <strong className="forecast-index-text">{item.totalIndex}</strong>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel-section">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">오늘 컨디션 요약</p>
                <h3>현장 체크 포인트</h3>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-title">
                <strong>{todayFormatter.format(new Date())}</strong>
                <span className={`hero-level mini ${levelClass(selectedSpot.currentLevel)}`}>
                  {levelLabel[selectedSpot.currentLevel]}
                </span>
              </div>
              <p>{selectedSpot.current.weatherLabel}</p>
              <div className="detail-metrics">
                <span>{weatherLabel[selectedSpot.heroWeather]}</span>
                <span>추천 시간 {selectedSpot.current.recommendedTime}</span>
                <span>풍속 {selectedSpot.current.windSpeed} m/s</span>
              </div>
            </div>
          </section>

          <section className="panel-section">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">주변 정보</p>
                <h3>맛집과 실용 포인트</h3>
              </div>
            </div>
            <div className="local-list">
              {selectedSpot.localPicks.map((place) => (
                <article key={place.title} className="local-card">
                  <div className="local-head">
                    <div>
                      <strong>{place.title}</strong>
                      <p>
                        {place.type} · {place.distance}
                      </p>
                    </div>
                    <span className="tag">{place.tag}</span>
                  </div>
                  <p>{place.description}</p>
                </article>
              ))}
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
      </main>
    </div>
  )
}

export default App

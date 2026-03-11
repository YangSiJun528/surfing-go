export type NearbyCategory = 'restaurant' | 'parking' | 'surf_shop'

export type NearbyLocalSeed = {
  title: string
  type: string
  distance: string
  description: string
  tag: string
  lat: number
  lng: number
  googleMapsUrl: string
}

export type NearbyAnchor = {
  id: string
  name: string
  lat: number
  lng: number
  localPicks: NearbyLocalSeed[]
  specialInfo: string[]
}

export type NearbyLocalPlace = {
  id: string
  name: string
  category: NearbyCategory
  distanceLabel: string
  distanceMeters: number
  description: string
  tag: string
  lat: number
  lng: number
  googleMapsUrl: string
  sourceLabel: string
}

const restaurantTypes = new Set(['브런치', '식사', '카페', '간식'])

function estimateDistanceMeters(distance: string) {
  const match = distance.match(/(\d+)/)
  const amount = Number(match?.[1] ?? 10)

  if (distance.includes('도보')) {
    return amount * 80
  }

  if (distance.includes('차량')) {
    return amount * 350
  }

  return amount * 100
}

function buildGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

function buildOffsetLocation(anchorLat: number, anchorLng: number, latOffset: number, lngOffset: number) {
  const lat = Number((anchorLat + latOffset).toFixed(6))
  const lng = Number((anchorLng + lngOffset).toFixed(6))

  return {
    lat,
    lng,
    googleMapsUrl: buildGoogleMapsUrl(lat, lng),
  }
}

export function buildNearbyPlaces(anchor: NearbyAnchor): NearbyLocalPlace[] {
  const restaurants = anchor.localPicks
    .filter((place) => restaurantTypes.has(place.type))
    .map((place, index) => ({
      id: `${anchor.id}-restaurant-${index}`,
      name: place.title,
      category: 'restaurant' as const,
      distanceLabel: place.distance,
      distanceMeters: estimateDistanceMeters(place.distance),
      description: place.description,
      tag: place.tag,
      lat: place.lat,
      lng: place.lng,
      googleMapsUrl: place.googleMapsUrl,
      sourceLabel: '로컬 큐레이션',
    }))

  const surfShopSeed = anchor.localPicks.find((place) => place.type === '렌탈')
  const surfShop = surfShopSeed
    ? [
        {
          id: `${anchor.id}-surf-shop`,
          name: surfShopSeed.title,
          category: 'surf_shop' as const,
          distanceLabel: surfShopSeed.distance,
          distanceMeters: estimateDistanceMeters(surfShopSeed.distance),
          description: surfShopSeed.description,
          tag: surfShopSeed.tag,
          lat: surfShopSeed.lat,
          lng: surfShopSeed.lng,
          googleMapsUrl: surfShopSeed.googleMapsUrl,
          sourceLabel: '로컬 큐레이션',
        },
      ]
    : []

  const parkingNote = anchor.specialInfo.find((item) => item.includes('주차')) ?? '주차 정보 현장 확인 권장'
  const parkingLocation = buildOffsetLocation(anchor.lat, anchor.lng, 0.0011, -0.0012)
  const parking = [
    {
      id: `${anchor.id}-parking`,
      name: `${anchor.name} 주차 포인트`,
      category: 'parking' as const,
      distanceLabel: parkingNote.includes('여유') || parkingNote.includes('접근 쉬움') ? '도보 3분' : '도보 7분',
      distanceMeters:
        parkingNote.includes('여유') || parkingNote.includes('접근 쉬움')
          ? estimateDistanceMeters('도보 3분')
          : estimateDistanceMeters('도보 7분'),
      description: parkingNote,
      tag: parkingNote.includes('추천') ? '현장 확인' : '주차 가능성 높음',
      lat: parkingLocation.lat,
      lng: parkingLocation.lng,
      googleMapsUrl: parkingLocation.googleMapsUrl,
      sourceLabel: '현장 메모 기반',
    },
  ]

  return [...restaurants, ...parking, ...surfShop].sort((left, right) => left.distanceMeters - right.distanceMeters)
}

export function nearbyCategoryLabel(category: NearbyCategory) {
  switch (category) {
    case 'restaurant':
      return '맛집'
    case 'parking':
      return '주차장'
    case 'surf_shop':
      return '서핑샵'
  }
}

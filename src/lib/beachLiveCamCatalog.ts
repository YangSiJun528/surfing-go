export type BeachLiveCam = {
  beachId: string
  beachName: string
  title: string
  provider: string
  areaLabel: string
  matchLabel: string
  confidence: 'high' | 'medium' | 'low'
  note: string
  watchUrl: string
  previewUrl: string
  previewKind: 'youtube' | 'web'
  searchUrl: string
}

type BeachLiveCamSeed = Omit<BeachLiveCam, 'beachId' | 'beachName' | 'searchUrl'>

const BEACH_LIVE_CAM_BY_ID: Record<string, BeachLiveCamSeed> = {
  SR1: {
    title: '송정 해안 라이브',
    provider: 'YouTube',
    areaLabel: '부산 송정',
    matchLabel: '전용 라이브',
    confidence: 'high',
    note: '제공한 YouTube 라이브 주소를 고정 임베드로 연결합니다.',
    watchUrl: 'https://www.youtube.com/watch?v=tQ9tse8cTy4',
    previewUrl: 'https://www.youtube.com/embed/tQ9tse8cTy4?autoplay=1&mute=1&playsinline=1',
    previewKind: 'youtube',
  },
  SR7: {
    title: '진하 해안 라이브',
    provider: 'YouTube',
    areaLabel: '울산 진하',
    matchLabel: '전용 라이브',
    confidence: 'high',
    note: '제공한 YouTube 라이브 주소를 고정 임베드로 연결합니다.',
    watchUrl: 'https://youtube.com/watch?v=2ddvxTpmKR4',
    previewUrl: 'https://www.youtube.com/embed/2ddvxTpmKR4?autoplay=1&mute=1&playsinline=1',
    previewKind: 'youtube',
  },
  SR6: {
    title: '부산 동부 해안 라이브',
    provider: 'YouTube live page · Worldcam',
    areaLabel: '부산 해운대권',
    matchLabel: '권역 대체',
    confidence: 'low',
    note: '다대포해수욕장 전용 공개 스트림이 없어 부산권 공개 해안 라이브를 대신 보여줍니다.',
    watchUrl: 'https://www.youtube.com/@BusanHaeundaeLive/live',
    previewUrl: 'https://worldcam.eu/liveview/34790',
    previewKind: 'web',
  },
  SR3: {
    title: '죽도 해안 라이브',
    provider: 'YouTube',
    areaLabel: '양양 죽도',
    matchLabel: '전용 라이브',
    confidence: 'high',
    note: '제공한 YouTube 라이브 주소를 고정 임베드로 연결합니다.',
    watchUrl: 'https://youtube.com/watch?v=009kOq0x4ZI',
    previewUrl: 'https://www.youtube.com/embed/009kOq0x4ZI?autoplay=1&mute=1&playsinline=1',
    previewKind: 'youtube',
  },
  SR4: {
    title: '망상 해안 라이브',
    provider: 'YouTube',
    areaLabel: '동해 망상',
    matchLabel: '전용 라이브',
    confidence: 'high',
    note: '제공한 YouTube 라이브 주소를 고정 임베드로 연결합니다.',
    watchUrl: 'https://youtube.com/watch?v=80OT9PgWG-k',
    previewUrl: 'https://www.youtube.com/embed/80OT9PgWG-k?autoplay=1&mute=1&playsinline=1',
    previewKind: 'youtube',
  },
  SR12: {
    title: '금진 해안 라이브',
    provider: 'YouTube',
    areaLabel: '강릉 금진',
    matchLabel: '전용 라이브',
    confidence: 'medium',
    note: '제공한 YouTube 라이브 주소를 고정 임베드로 연결합니다.',
    watchUrl: 'https://www.youtube.com/watch?v=tQ9tse8cTy4',
    previewUrl: 'https://www.youtube.com/embed/tQ9tse8cTy4?autoplay=1&mute=1&playsinline=1',
    previewKind: 'youtube',
  },
  SR10: {
    title: '제주 해안 라이브',
    provider: 'YouTube live page · Worldcam',
    areaLabel: '제주 표선권',
    matchLabel: '권역 대체',
    confidence: 'medium',
    note: '중문색달 전용 공개 스트림이 없어 제주 해안가 공개 라이브를 대신 연결합니다.',
    watchUrl: 'https://www.youtube.com/@GiGAeyesLiveTV/live',
    previewUrl: 'https://worldcam.eu/liveview/33235',
    previewKind: 'web',
  },
  WOLJEONG: {
    title: '제주 해안 라이브',
    provider: 'YouTube live page · Worldcam',
    areaLabel: '제주 표선권',
    matchLabel: '권역 대체',
    confidence: 'medium',
    note: '월정리해수욕장 전용 공개 스트림이 없어 제주 해안가 공개 라이브를 대신 연결합니다.',
    watchUrl: 'https://www.youtube.com/@GiGAeyesLiveTV/live',
    previewUrl: 'https://worldcam.eu/liveview/33235',
    previewKind: 'web',
  },
  SR2: {
    title: '국내 해안 라이브',
    provider: 'Worldcams curated live page',
    areaLabel: '대한민국 해안',
    matchLabel: '국내 대체',
    confidence: 'low',
    note: '만리포 전용 공개 스트림을 찾지 못해 국내 공용 해안 라이브 페이지를 연결합니다.',
    watchUrl: 'https://worldcams.tv/south-korea/south-korea-waterfront',
    previewUrl: 'https://worldcams.tv/south-korea/south-korea-waterfront',
    previewKind: 'web',
  },
  NAMYEOL: {
    title: '국내 해안 라이브',
    provider: 'Worldcams curated live page',
    areaLabel: '대한민국 해안',
    matchLabel: '국내 대체',
    confidence: 'low',
    note: '남열해수욕장 전용 공개 스트림을 찾지 못해 국내 공용 해안 라이브 페이지를 연결합니다.',
    watchUrl: 'https://worldcams.tv/south-korea/south-korea-waterfront',
    previewUrl: 'https://worldcams.tv/south-korea/south-korea-waterfront',
    previewKind: 'web',
  },
}

function buildYoutubeSearchUrl(beachName: string, region: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${beachName} ${region} 해안 라이브`)}`
}

export function getBeachLiveCam(beachId: string, beachName: string, region: string): BeachLiveCam {
  const liveCam = BEACH_LIVE_CAM_BY_ID[beachId]

  if (liveCam) {
    return {
      beachId,
      beachName,
      searchUrl: buildYoutubeSearchUrl(beachName, region),
      ...liveCam,
    }
  }

  return {
    beachId,
    beachName,
    title: `${beachName} 해안 라이브 검색`,
    provider: 'YouTube search',
    areaLabel: region,
    matchLabel: '검색 결과',
    confidence: 'low',
    note: '고정 라이브 소스를 찾지 못해 YouTube 검색 결과로 연결합니다.',
    watchUrl: buildYoutubeSearchUrl(beachName, region),
    previewUrl: '',
    previewKind: 'web',
    searchUrl: buildYoutubeSearchUrl(beachName, region),
  }
}

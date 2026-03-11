import fs from 'node:fs'
import path from 'node:path'

const INDEX_SCORE = {
  매우좋음: 5,
  좋음: 4,
  보통: 3,
  나쁨: 2,
  매우나쁨: 1,
}

const NOON_ORDER = ['오전', '오후', '일']

function parseArgs(argv) {
  const options = {
    placeCode: 'SR4',
    reqDate: '',
    numOfRows: '30',
    save: true,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--placeCode' && next) {
      options.placeCode = next
      index += 1
      continue
    }

    if (arg === '--reqDate' && next) {
      options.reqDate = next
      index += 1
      continue
    }

    if (arg === '--numOfRows' && next) {
      options.numOfRows = next
      index += 1
      continue
    }

    if (arg === '--no-save') {
      options.save = false
    }
  }

  return options
}

function getReqDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}${month}${day}`
}

function normalizeItem(item) {
  return {
    surfPlcNm: item.surfPlcNm,
    lat: Number(item.lat),
    lot: Number(item.lot),
    predcYmd: item.predcYmd,
    predcNoonSeCd: item.predcNoonSeCd,
    avgWvhgt: Number(item.avgWvhgt),
    avgWvpd: Number(item.avgWvpd),
    avgWspd: Number(item.avgWspd),
    avgWtem: Number(item.avgWtem),
    grdCn: item.grdCn,
    totalIndex: item.totalIndex,
  }
}

function compareItems(a, b) {
  const scoreDiff = INDEX_SCORE[b.totalIndex] - INDEX_SCORE[a.totalIndex]
  if (scoreDiff !== 0) {
    return scoreDiff
  }

  const noonDiff = NOON_ORDER.indexOf(a.predcNoonSeCd) - NOON_ORDER.indexOf(b.predcNoonSeCd)
  if (noonDiff !== 0) {
    return noonDiff
  }

  const windDiff = a.avgWspd - b.avgWspd
  if (windDiff !== 0) {
    return windDiff
  }

  return b.avgWvpd - a.avgWvpd
}

function pickRepresentative(items) {
  const firstDate = [...new Set(items.map((item) => item.predcYmd))].sort()[0]
  const beginnerItems = items
    .filter((item) => item.predcYmd === firstDate && item.grdCn === '초급')
    .sort(compareItems)

  return beginnerItems[0] ?? null
}

async function main() {
  const { placeCode, reqDate, numOfRows, save } = parseArgs(process.argv.slice(2))
  const serviceKey = process.env.VITE_SURFING_API_KEY?.trim()

  if (!serviceKey) {
    console.error('VITE_SURFING_API_KEY가 없습니다. .env를 확인하세요.')
    process.exit(1)
  }

  const finalReqDate = reqDate || getReqDate()
  const url = new URL('https://apis.data.go.kr/1192136/fcstSurfingv2/GetFcstSurfingApiServicev2')
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('type', 'json')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', numOfRows)
  url.searchParams.set('placeCode', placeCode)
  url.searchParams.set('reqDate', finalReqDate)

  const response = await fetch(url)
  const text = await response.text()

  if (save) {
    const outputPath = path.join(process.cwd(), 'docs', `verify-${placeCode}.json`)
    fs.writeFileSync(outputPath, text)
  }

  if (!response.ok) {
    console.error(`HTTP ${response.status}`)
    console.error(text)
    process.exit(1)
  }

  const payload = JSON.parse(text)
  const root = payload.response ?? payload
  const header = root.header
  const body = root.body

  if (!header || header.resultCode !== '00') {
    console.error('API 응답 오류')
    console.error(JSON.stringify(header, null, 2))
    process.exit(1)
  }

  const rawItems = Array.isArray(body?.items?.item) ? body.items.item : [body?.items?.item].filter(Boolean)
  const items = rawItems.map(normalizeItem)
  const representative = pickRepresentative(items)

  console.log(`PASS: ${placeCode} 실 API 응답 확인`)
  console.log(`resultCode: ${header.resultCode}`)
  console.log(`resultMsg: ${header.resultMsg}`)
  console.log(`reqDate: ${finalReqDate}`)
  console.log(`rows: ${items.length}`)

  if (!representative) {
    console.log('대표 데이터가 없습니다.')
    return
  }

  console.log('')
  console.log('[대표값: 앱이 현재 카드에 쓰는 기준]')
  console.log(`장소: ${representative.surfPlcNm}`)
  console.log(`날짜: ${representative.predcYmd}`)
  console.log(`시간대: ${representative.predcNoonSeCd}`)
  console.log(`초급 지수: ${representative.totalIndex}`)
  console.log(`파고: ${representative.avgWvhgt} m`)
  console.log(`파주기: ${representative.avgWvpd} s`)
  console.log(`풍속: ${representative.avgWspd} m/s`)
  console.log(`수온: ${representative.avgWtem} C`)

  console.log('')
  console.log('[원본 저장 위치]')
  console.log(path.join(process.cwd(), 'docs', `verify-${placeCode}.json`))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

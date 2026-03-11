import type {ForecastApiItem,ForecastPeriod}from'./forecast'

const SURFING_API_URL='https://apis.data.go.kr/1192136/fcstSurfingv2/GetFcstSurfingApiServicev2'
const SURFING_API_FIELDS='predcYmd,predcNoonSeCd,avgWvhgt,avgWvpd,avgWspd,avgWtem,grdCn,totalIndex'
const KST_TIME_ZONE='Asia/Seoul'

type ApiHeader={resultCode?:string;resultMsg?:string}
type RawForecastItem={
  predcYmd?:string
  predcNoonSeCd?:ForecastPeriod
  avgWvhgt?:string
  avgWvpd?:string
  avgWspd?:string
  avgWtem?:string
  grdCn?:ForecastApiItem['grdCn']
  totalIndex?:ForecastApiItem['totalIndex']
}
type ApiBody={items?:{item?:RawForecastItem[]|RawForecastItem}}
type ApiRoot={response?:{header?:ApiHeader;body?:ApiBody};header?:ApiHeader;body?:ApiBody}

export class SurfApiError extends Error{
  code:string

  constructor(code:string,message:string){
    super(message)
    this.name='SurfApiError'
    this.code=code
  }
}

function formatKstParts(date:Date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:KST_TIME_ZONE,
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
  }).formatToParts(date)

  const year=parts.find((part)=>part.type==='year')?.value??'0000'
  const month=parts.find((part)=>part.type==='month')?.value??'01'
  const day=parts.find((part)=>part.type==='day')?.value??'01'

  return{year,month,day}
}

export function formatKstRequestDate(date:Date=new Date()){
  const {year,month,day}=formatKstParts(date)
  return year+month+day
}

export function formatKstForecastDate(date:Date=new Date()){
  const {year,month,day}=formatKstParts(date)
  return year+'-'+month+'-'+day
}

export function getKstForecastPeriod(date:Date=new Date()):ForecastPeriod{
  const hour=Number.parseInt(new Intl.DateTimeFormat('en-GB',{
    timeZone:KST_TIME_ZONE,
    hour:'2-digit',
    hourCycle:'h23',
  }).format(date),10)

  return hour<12?'오전':'오후'
}

function getServiceKey(){
  const raw=import.meta.env.VITE_SURFING_API_KEY?.trim()
  if(!raw){
    throw new SurfApiError('missing-key','VITE_SURFING_API_KEY가 없어서 목데이터를 표시 중이에요. .env.local에 URL-encoded 인증키를 넣어주세요.')
  }

  return raw.includes('%')?raw:encodeURIComponent(raw)
}

function parseNumber(value?:string){
  if(!value){
    return undefined
  }

  const parsed=Number.parseFloat(value)
  return Number.isFinite(parsed)?parsed:undefined
}

function normalizePayload(payload:ApiRoot){
  return payload.response??payload
}
function normalizeItems(raw:RawForecastItem[]|RawForecastItem|undefined,placeCode:string):ForecastApiItem[]{
  const items=Array.isArray(raw)?raw:raw?[raw]:[]

  return items.flatMap((item)=>{
    if(!item.predcYmd||!item.predcNoonSeCd||!item.grdCn||!item.totalIndex){
      return[]
    }

    return[{
      placeCode,
      predcYmd:item.predcYmd,
      predcNoonSeCd:item.predcNoonSeCd,
      grdCn:item.grdCn,
      totalIndex:item.totalIndex,
      avgWvhgt:parseNumber(item.avgWvhgt),
      avgWvpd:parseNumber(item.avgWvpd),
      avgWspd:parseNumber(item.avgWspd),
      avgWtem:parseNumber(item.avgWtem),
    }]
  })
}

export async function fetchForecastByPlaceCode(placeCode:string,requestDate:string=formatKstRequestDate()){
  const serviceKey=getServiceKey()
  const params=new URLSearchParams({
    type:'json',
    reqDate:requestDate,
    pageNo:'1',
    numOfRows:'30',
    placeCode,
    include:SURFING_API_FIELDS,
  })

  const requestUrl=SURFING_API_URL+'?serviceKey='+serviceKey+'&'+params.toString()
  const response=await fetch(requestUrl)
  const responseText=await response.text()

  if(!response.ok){
    throw new SurfApiError('http','서핑 API 응답이 정상이 아니어서 목데이터를 표시 중이에요. ('+String(response.status)+')')
  }

  let payload:ApiRoot
  try{
    payload=JSON.parse(responseText) as ApiRoot
  }catch{
    throw new SurfApiError('parse','서핑 API 응답을 해석하지 못해서 목데이터를 표시 중이에요.')
  }

  const root=normalizePayload(payload)
  const header=root.header

  if(header?.resultCode&&header.resultCode!=='00'){
    throw new SurfApiError(header.resultCode,'서핑 API 오류: '+(header.resultMsg??'알 수 없는 오류'))
  }

  const items=normalizeItems(root.body?.items?.item,placeCode)
  if(items.length===0){
    throw new SurfApiError('empty','서핑 API에 예보 데이터가 없어 목데이터를 표시 중이에요.')
  }

  return items
}

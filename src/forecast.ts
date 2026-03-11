export type SkillGrade='초급'|'중급'|'상급'
export type ForecastPeriod='오전'|'오후'|'일'
export type SurfIndexStatus='매우좋음'|'좋음'|'보통'|'나쁨'|'매우나쁨'

export type ForecastApiItem={
  placeCode:string
  predcYmd:string
  predcNoonSeCd:ForecastPeriod
  grdCn:SkillGrade
  totalIndex:SurfIndexStatus
  avgWvhgt?:number
  avgWvpd?:number
  avgWspd?:number
  avgWtem?:number
}

type SkillLevelKey='beginner'|'intermediate'|'advanced'
type ForecastTemplate={
  placeCode:string
  baseIndexes:SurfIndexStatus[]
  skillAdjustments:Record<SkillLevelKey,number>
}

const surfIndexScale:SurfIndexStatus[]=['매우나쁨','나쁨','보통','좋음','매우좋음']
const forecastPeriods:Array<{dayOffset:number;predcNoonSeCd:ForecastPeriod}>=[
  {dayOffset:0,predcNoonSeCd:'오전'},
  {dayOffset:0,predcNoonSeCd:'오후'},
  {dayOffset:1,predcNoonSeCd:'오전'},
  {dayOffset:1,predcNoonSeCd:'오후'},
  {dayOffset:2,predcNoonSeCd:'오전'},
  {dayOffset:2,predcNoonSeCd:'오후'},
  {dayOffset:3,predcNoonSeCd:'일'},
  {dayOffset:4,predcNoonSeCd:'일'},
  {dayOffset:5,predcNoonSeCd:'일'},
  {dayOffset:6,predcNoonSeCd:'일'},
]
const forecastPeriodOrder:Record<ForecastPeriod,number>={오전:0,오후:1,일:2}

export const skillGradeLabel:Record<SkillLevelKey,SkillGrade>={
  beginner:'초급',
  intermediate:'중급',
  advanced:'상급',
}

const forecastTemplates:ForecastTemplate[]=[
  {placeCode:'SR1',baseIndexes:['좋음','좋음','매우좋음','좋음','좋음','보통','좋음','보통','보통','좋음'],skillAdjustments:{beginner:1,intermediate:0,advanced:-1}},
  {placeCode:'SR3',baseIndexes:['좋음','보통','좋음','좋음','보통','보통','좋음','보통','보통','나쁨'],skillAdjustments:{beginner:-1,intermediate:0,advanced:0}},
  {placeCode:'SR4',baseIndexes:['보통','나쁨','보통','나쁨','나쁨','나쁨','보통','나쁨','나쁨','매우나쁨'],skillAdjustments:{beginner:-1,intermediate:0,advanced:1}},
  {placeCode:'SR12',baseIndexes:['좋음','좋음','좋음','보통','좋음','보통','좋음','좋음','보통','보통'],skillAdjustments:{beginner:0,intermediate:0,advanced:1}},
  {placeCode:'SR7',baseIndexes:['좋음','보통','좋음','좋음','보통','보통','좋음','보통','보통','보통'],skillAdjustments:{beginner:1,intermediate:0,advanced:-1}},
  {placeCode:'SR6',baseIndexes:['나쁨','매우나쁨','나쁨','매우나쁨','매우나쁨','나쁨','매우나쁨','나쁨','매우나쁨','매우나쁨'],skillAdjustments:{beginner:-1,intermediate:0,advanced:0}},
  {placeCode:'SR10',baseIndexes:['좋음','매우좋음','좋음','매우좋음','좋음','좋음','매우좋음','좋음','좋음','보통'],skillAdjustments:{beginner:-2,intermediate:0,advanced:1}},
]
function addDays(date:Date,dayOffset:number){
  const nextDate=new Date(date)
  nextDate.setDate(nextDate.getDate()+dayOffset)
  return nextDate
}

function formatIsoDate(date:Date){
  const year=String(date.getFullYear())
  const month=String(date.getMonth()+1).padStart(2,'0')
  const day=String(date.getDate()).padStart(2,'0')
  return year+'-'+month+'-'+day
}

function adjustForecastIndex(status:SurfIndexStatus,adjustment:number):SurfIndexStatus{
  const currentIndex=surfIndexScale.indexOf(status)
  const nextIndex=Math.min(surfIndexScale.length-1,Math.max(0,currentIndex+adjustment))
  return surfIndexScale[nextIndex]
}

function buildForecastItems(baseDate:Date=new Date()){
  return forecastTemplates.flatMap((template)=>
    (Object.keys(skillGradeLabel) as SkillLevelKey[]).flatMap((level)=>
      forecastPeriods.map((period,index)=>({
        placeCode:template.placeCode,
        predcYmd:formatIsoDate(addDays(baseDate,period.dayOffset)),
        predcNoonSeCd:period.predcNoonSeCd,
        grdCn:skillGradeLabel[level],
        totalIndex:adjustForecastIndex(template.baseIndexes[index],template.skillAdjustments[level]),
      })),
    ),
  )
}

export const forecastItems=buildForecastItems()

export function formatForecastDate(dateString:string){
  const [,month,day]=dateString.split('-')
  return month+'/'+day
}

export function sortForecastItems(items:ForecastApiItem[]){
  return [...items].sort((left,right)=>{
    if(left.predcYmd!==right.predcYmd){
      return left.predcYmd.localeCompare(right.predcYmd)
    }

    return forecastPeriodOrder[left.predcNoonSeCd]-forecastPeriodOrder[right.predcNoonSeCd]
  })
}

export function forecastIndexClass(index:SurfIndexStatus){
  switch(index){
    case '매우좋음':
      return 'forecast-index-very-good'
    case '좋음':
      return 'forecast-index-good'
    case '보통':
      return 'forecast-index-fair'
    case '나쁨':
      return 'forecast-index-poor'
    case '매우나쁨':
      return 'forecast-index-flat'
  }
}

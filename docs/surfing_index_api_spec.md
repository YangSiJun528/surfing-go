# 해양수산부 국립해양조사원 서핑지수 조회 API

> **status**: v2.0 (실제 API 호출 검증 완료)  
> **source**: 공공데이터포털 API 상세페이지 + 공식 요청/응답 메시지 명세 + 코드정보 + 서비스정보 + Swagger 모델 + 에러코드 + RDF 메타데이터 + **실제 API 호출 7건 검증**  
> **created**: 2026-03-11  
> **confidence_note**: `[확정]` = 직접 확인됨. `[추정]` = 패턴 기반 추정.

---

## 1. 기본 정보

| 항목 | 값 | 확인상태 |
|---|---|---|
| 데이터명 | 해양수산부 국립해양조사원_서핑지수 조회 | [확정] |
| 서비스ID | SV-AP-01-008 | [확정] |
| 서비스명(국문) | 서핑지수 조회 서비스 | [확정] |
| 서비스명(영문) | GetFcstSurfingApiService | [확정] |
| 서비스 유형 | REST | [확정] |
| 데이터 포맷 | JSON (XML 미사용) | [확정] |
| Swagger 버전 | 1.0.0 | [확정] |
| 서비스 버전 | 2.0 | [확정] |
| 심의여부 | 자동승인 | [확정] |
| 활용기간 | 2026-03-11 ~ 2028-03-11 | [확정] |
| 일일 트래픽 제한 | 10,000회/일 | [확정] |
| 포털 페이지 | https://www.data.go.kr/data/15142490/openapi.do | [확정] |
| 라이선스 | 공공저작물_출처표시 | [확정] |

### 1.1 서비스 설명

해양수산부 국립해양조사원에서 전국의 서핑 포인트를 대상으로 파도, 수온, 바람 등 정보를 이용하여 5단계로 산출한 서핑지수 정보를 제공한다. 주요 내용은 서핑장소명, 위도, 경도, 분석일자, 분석시간, 파고, 파주기, 풍속, 수온, 서핑지수, 서핑등급으로 구성되어 있다. [확정]

### 1.2 서비스 보안

| 항목 | 값 |
|---|---|
| 인증/권한 | 서비스 Key |
| 메시지레벨 암호화 | 없음 |
| 전송레벨 암호화 (SSL) | 없음 |
| 인터페이스 표준 | REST (GET만 사용) |
| 메시지 교환 유형 | Request-Response |

### 1.3 서비스 배포 정보

| 항목 | 값 |
|---|---|
| 배포일자 | 2025-12-15 |
| RDF 발행일 | 2025-03-19 |
| RDF 수정일 | 2026-02-26 |

### 1.4 담당 기관

| 항목 | 값 |
|---|---|
| 제공기관 | 해양수산부 국립해양조사원 |
| 담당부서 | 해양예보과 |
| 연락처 | 051-400-4395 |

---

## 2. 엔드포인트

### 2.1 base_url

```
https://apis.data.go.kr/1192136/fcstSurfingv2
```

개발환경과 운영환경 URL 동일.

### 2.2 operations

| operation | path | method |
|---|---|---|
| 서핑지수 조회 | `/GetFcstSurfingApiServicev2` | GET |

### 2.3 full_request_url_template

```
GET https://apis.data.go.kr/1192136/fcstSurfingv2/GetFcstSurfingApiServicev2?serviceKey={serviceKey}&type=json&reqDate={reqDate}&pageNo={pageNo}&numOfRows={numOfRows}&placeCode={placeCode}&include={include}&exclude={exclude}
```

---

## 3. 인증

| 항목 | 값 |
|---|---|
| 방식 | API Key via query parameter |
| 파라미터명 | `serviceKey` |
| 전달 방법 | URL query string (URL Encoded) |

**주의**: 포털에서 Encoding/Decoding 된 인증키를 적용하면서 구동되는 키를 사용해야 한다. API 환경 또는 호출 조건에 따라 인증키 적용 방식이 다를 수 있다.

---

## 4. 요청 파라미터

항목구분: 필수(`1`), 옵션(`0`)

| 파라미터명 | 항목명(국문) | DB타입 | 항목구분 | 기본값 | 샘플값 | 설명 |
|---|---|---|---|---|---|---|
| `serviceKey` | API 인증키 | varchar(200) | 1 | - | (URL Encode) | 공공데이터포털에서 발급받은 인증키 |
| `type` | 데이터 타입 | varchar(10) | 1 | - | `json` | **고정값 `json` 사용.** 명세 상 필수 |
| `reqDate` | 요청일시 | varchar(20) | 0 | 현재일시 | `20251215` | 요청 일시. 형식: `YYYYMMDD`. 과거 날짜 지정 시 해당일 기준 7일간 예측 반환. 유효하지 않은 값은 `INVALID_REQUEST_PARAMETER_ERROR` 반환 |
| `pageNo` | 페이지 번호 | number | 0 | `1` | `1` | 페이지 번호 |
| `numOfRows` | 한 페이지 결과수 | number | 0 | `10` | `10` | 한 페이지당 데이터 개수. 최대: 300 |
| `placeCode` | 장소코드 | varchar(50) | 0 | - | `SR6` | 장소코드. §4.1 참조. 미지정 시 전체 장소 반환 |
| `include` | 출력항목코드 | varchar(300) | 0 | - | `surfPlcNm,totalIndex,grdCn` | 출력하고자 하는 항목명. §4.2 참조 |
| `exclude` | 출력제외항목코드 | varchar(300) | 0 | - | `lat,lot,avgWtem` | 출력 제외하고자 하는 항목명. §4.2 참조 |

### 4.1 placeCode 코드 목록

코드정보 문서에는 13개소가 등록되어 있으나, 실제 API 응답에는 **16개소**가 반환된다. [확정: API 호출 검증]

| placeCode | 해수욕장명 | 출처 |
|---|---|---|
| `SR1` | 송정해수욕장 | 코드정보 문서 |
| `SR2` | 만리포해수욕장 | 코드정보 문서 |
| `SR3` | 죽도해수욕장 | 코드정보 문서 |
| `SR4` | 망상해수욕장 | 코드정보 문서 |
| `SR5` | 곽지해수욕장 | 코드정보 문서 |
| `SR6` | 다대포해수욕장 | 코드정보 문서 |
| `SR7` | 진하해수욕장 | 코드정보 문서 |
| `SR8` | 송지호해수욕장 | 코드정보 문서 |
| `SR9` | 명사십리해수욕장 | 코드정보 문서 |
| `SR10` | 중문색달해수욕장 | 코드정보 문서 |
| `SR11` | 송정솔바람해수욕장 | 코드정보 문서 |
| `SR12` | 금진해수욕장 | 코드정보 문서 |
| `SR13` | 월포해수욕장 | 코드정보 문서 |
| ? | 경포해수욕장 | API 응답에서만 확인. placeCode 미확인 |
| ? | 남열해수욕장 | API 응답에서만 확인. placeCode 미확인 |
| ? | 월정리해수욕장 | API 응답에서만 확인. placeCode 미확인 |

### 4.2 include/exclude 사용 가능 필드명 [확정: API 호출 검증]

`include`/`exclude` 파라미터에는 §5.3.3의 item 필드명을 쉼표 구분으로 사용한다.

사용 가능 필드명: `surfPlcNm`, `lat`, `lot`, `predcYmd`, `predcNoonSeCd`, `avgWvhgt`, `avgWvpd`, `avgWspd`, `avgWtem`, `grdCn`, `totalIndex`

- `include` 지정 시: 지정된 필드만 반환. 예) `include=surfPlcNm,totalIndex,grdCn` → 3개 필드만 반환 [확정]
- `exclude` 지정 시: 지정된 필드 제외. 예) `exclude=lat,lot,avgWtem` → 3개 필드 제외 [확정]

---

## 5. 응답 구조

### 5.1 데이터 구조 핵심 [확정: API 호출 검증]

응답은 **장소 × 시간대 × 등급** 조합으로 행이 생성된다.

| 차원 | 값 |
|---|---|
| 장소 | 16개소 (§4.1) |
| 시간대 (`predcNoonSeCd`) | 예측일 D+0~D+2: `"오전"`, `"오후"` (2건/일). D+3~D+6: `"일"` (1건/일) |
| 등급 (`grdCn`) | `"초급"`, `"중급"`, `"상급"` (정확히 3개) |
| 예측 기간 | 현재일 기준 7일 (D+0 ~ D+6) |

**1일 기준 행 수 계산**:

```
D+0 ~ D+2: 2시간대 × 3등급 = 6행/일/장소 × 3일 = 18행/장소
D+3 ~ D+6: 1시간대 × 3등급 = 3행/일/장소 × 4일 = 12행/장소
합계: 30행/장소 × 16장소 = 480행 (totalCount=480 확인)
```

**동일 기상 조건에서도 등급별로 `totalIndex`가 다를 수 있다.** 예: 경포해수욕장 2026-03-11 오전 — 초급: "매우좋음", 중급: "나쁨", 상급: "나쁨"

### 5.2 JSON 응답 예시 [확정]

```json
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "items": {
        "item": [
          {
            "surfPlcNm": "경포해수욕장",
            "lat": 37.80662,
            "lot": 128.90850,
            "predcYmd": "2026-03-11",
            "predcNoonSeCd": "오전",
            "avgWvhgt": "0.6",
            "avgWvpd": "5.9",
            "avgWspd": "2.5",
            "avgWtem": "9.1",
            "grdCn": "초급",
            "totalIndex": "매우좋음"
          }
        ]
      },
      "pageNo": 1,
      "numOfRows": 300,
      "totalCount": 480,
      "type": "json"
    }
  }
}
```

**참고**: 실제 응답의 최상위 키는 `response`가 아닌 바로 `header`/`body`로 시작하는 경우도 확인됨. 파싱 시 양쪽 구조를 모두 처리해야 한다.

```json
// 구조 A (Swagger 기준)
{ "response": { "header": {...}, "body": {...} } }

// 구조 B (실제 응답에서 확인)
{ "header": {...}, "body": {...} }
```

### 5.3 응답 필드 정의

항목구분: 필수(`1`), 옵션(`0`), 0건 또는 복수건(`0..n`)

#### 5.3.1 header

| 필드명 | 항목명(국문) | DB타입 | JSON 타입 | 항목구분 | 설명 |
|---|---|---|---|---|---|
| `resultCode` | 응답 메시지 코드 | varchar(2) | string | 1 | `"00"` = 정상 |
| `resultMsg` | 응답 메시지 내용 | varchar(50) | string | 1 | `"NORMAL_SERVICE"` = 정상 |

#### 5.3.2 body (페이징)

| 필드명 | 항목명(국문) | DB타입 | JSON 타입 | 항목구분 | 설명 |
|---|---|---|---|---|---|
| `totalCount` | 응답 결과 수 | number | integer | 1 | 전체 데이터 건수 |
| `pageNo` | 페이지 번호 | number | integer | 1 | 현재 페이지 번호 |
| `numOfRows` | 한 페이지 결과수 | number | integer | 1 | 페이지당 데이터 수 |
| `type` | 데이터 타입 | varchar(10) | string | 1 | 응답 포맷 (`"json"`) |
| `items` | 목록 | - | object | 0..n | 정보 목록 컨테이너 |

#### 5.3.3 body.items.item[] (서핑지수 데이터)

| 필드명 | 항목명(국문) | DB타입 | JSON 타입 | 항목구분 | 단위 | 설명 |
|---|---|---|---|---|---|---|
| `surfPlcNm` | 서핑장소 | varchar(100) | string | 0 | - | 서핑 장소명. §4.1 참조 |
| `lat` | 위도 | numeric | number | 0 | - | 위도 |
| `lot` | 경도 | numeric | number | 0 | - | 경도. **`lon`이 아닌 `lot`** |
| `predcYmd` | 날짜 | varchar(50) | string | 0 | - | 예측 일자. 형식: `YYYY-MM-DD` |
| `predcNoonSeCd` | 시간 | varchar(10) | string | 0 | - | 시간 구분. §5.4 참조 |
| `avgWvhgt` | 파고 | numeric | string | 0 | m | 평균 파고 |
| `avgWvpd` | 파주기 | numeric | string | 0 | sec | 평균 파주기 |
| `avgWspd` | 풍속 | numeric | string | 0 | m/s | 평균 풍속 |
| `avgWtem` | 수온 | numeric | string | 0 | ℃ | 평균 수온 |
| `grdCn` | 등급 | varchar(50) | string | 0 | - | 서핑 난이도 등급. §5.5 참조 |
| `totalIndex` | 서핑지수 | varchar(30) | string | 0 | - | 종합 서핑지수. §5.6 참조 |

**타입 불일치 주의**: `avgWvhgt`, `avgWvpd`, `avgWspd`, `avgWtem`은 DB 명세 `numeric`이지만 JSON에서 **string으로 반환**된다. `lat`, `lot`은 number. 파싱 시 4개 필드는 `parseFloat()` 필요. [확정]

**`lastScr` 필드**: Swagger 모델에 `lastScr` (number, 서핑점수)이 정의되어 있으나, 실제 API 호출(전체 480건 포함)에서 **한 번도 반환되지 않았다.** 현재 사용되지 않는 필드로 판단. [확정: API 검증]

### 5.4 predcNoonSeCd 허용값 [확정: API 호출 검증]

| 값 | 설명 | 적용 범위 |
|---|---|---|
| `"오전"` | 오전 예측 | D+0 ~ D+2 (요청일 기준 3일간) |
| `"오후"` | 오후 예측 | D+0 ~ D+2 (요청일 기준 3일간) |
| `"일"` | 일간 종합 예측 | D+3 ~ D+6 (요청일 기준 4~7일째) |

가까운 날짜(3일)는 오전/오후로 세분화, 먼 날짜(4~7일)는 일 단위로 집계.

### 5.5 grdCn (등급) 허용값 [확정: API 호출 검증]

정확히 3개 값. 추가 값 없음 (480건 전수 확인).

| 값 | 설명 |
|---|---|
| `"초급"` | 초급 서퍼 기준 |
| `"중급"` | 중급 서퍼 기준 |
| `"상급"` | 상급 서퍼 기준 |

### 5.6 totalIndex (서핑지수) 5단계 [확정: API 호출 검증]

| 값 | 순서 (나쁨→좋음) |
|---|---|
| `"매우나쁨"` | 1 (최하) |
| `"나쁨"` | 2 |
| `"보통"` | 3 |
| `"좋음"` | 4 |
| `"매우좋음"` | 5 (최상) |

5단계 전체 확인 완료 (480건 데이터에서 5개 값 모두 출현).

---

## 6. 에러 처리

에러는 **2계층**으로 발생한다. [확정]

### 6.1 JSON 응답 에러 (resultCode 기반)

API 서버까지 도달했으나 요청이 잘못된 경우. 정상 JSON 구조로 반환.

| resultCode | resultMsg | 설명 | 확인상태 |
|---|---|---|---|
| `00` | NORMAL_SERVICE | 정상 | [확정: API 검증] |
| `10` | INVALID_REQUEST_PARAMETER_ERROR | 잘못된 요청 파라미터 | [확정: API 검증. `reqDate=invalid` 시 반환] |

**에러 응답 예시** (확정):

```json
{
  "header": {
    "resultCode": "10",
    "resultMsg": "INVALID_REQUEST_PARAMETER_ERROR"
  }
}
```

에러 시 `body`가 없다. `header`만 반환.

### 6.2 HTTP 게이트웨이 에러 (공공데이터포털)

API 서버 도달 전 공공데이터포털 게이트웨이에서 차단하는 에러. JSON body 형식이 아닐 수 있다.

| 에러 메시지 | 설명 |
|---|---|
| `Unauthorized` | 인증키 미존재 또는 무효 |
| `Forbidden` | 활용신청 내역 미확인 |
| `API not found` | API 서비스 미존재 (URL 오타, 폐기 등) |
| `Error forwarding request to backend server` | 기관 서버 연결 실패. 재시도 권장 |
| `Error receiving response from backend server` | 기관 서버 응답 없음. 제공기관 문의 (051-400-4395) |
| `API rate limit exceeded` | 동시 요청 수 초과. 재시도 권장 |
| `API token quota exceeded` | 일일 호출 허용량(10,000회) 초과 |
| `Unexpected error` | 시스템 오류. 활용지원센터 문의 |

---

## 7. 미확인 항목

| 항목 | 필요 이유 | 우선순위 |
|---|---|---|
| 경포해수욕장, 남열해수욕장, 월정리해수욕장의 placeCode | 코드정보 문서에 미등록이나 API 응답에 존재. placeCode로 필터링 시 필요 | 중간 |
| `lastScr` 필드 사용 조건 | Swagger에 정의되었으나 실제 미반환. 폐기된 필드인지, 특정 조건에서만 반환되는지 불명 | 낮음 |

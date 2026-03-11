# surfing-go

국립해양조사원 서핑지수 API를 Leaflet 기반 UI에 붙인 프론트엔드입니다.

## 실행

1. `.env.example`을 복사해 `.env`를 만들고 `VITE_SURFING_API_KEY`에 URL-encoded 서비스 키를 넣습니다.
2. `npm install`
3. `npm run dev`

키가 없으면 앱은 네트워크를 호출하지 않고 데모 데이터를 표시합니다.

## API 연동 방식

- 개발 중 실제 API 호출은 Vite 프록시 `/api/surfing` 경유로 처리합니다.
- 응답은 브라우저 `localStorage`에 날짜 단위로 저장해 같은 날 재실행 시 재사용합니다.
- API가 실패하거나 키가 없으면 기존 데모 데이터로 자동 fallback 됩니다.

## 주의

- 현재 프록시는 Vite 개발 서버 기준입니다. 정식 배포에서는 별도 서버 프록시나 백엔드 API 래퍼가 필요합니다.

## 실 API 확인 스크립트

직접 실 API가 맞는지 확인하려면 아래 명령을 실행하면 됩니다.

```bash
npm run verify:surfing
```

기본값은 `망상해수욕장(SR4)`입니다. 다른 포인트를 보고 싶으면:

```bash
node --env-file=.env scripts/verify-surfing-api.mjs --placeCode SR1
```

실행하면 응답 성공 여부와 앱이 카드에 쓰는 대표값을 출력하고, 원본 응답은 `docs/verify-<placeCode>.json`에 저장합니다.

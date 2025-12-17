# Vercel Deployment Guide

WHX Reservation 프로젝트의 Vercel 배포를 위한 가이드입니다.

## 1. 배포 환경 구성

### 서버 인프라 및 데이터베이스
- 이 프로젝트는 **Supabase**를 백엔드 서비스(Database, Auth)로 사용합니다.
- 현재 Supabase 프로젝트가 연결되어 있으며, 필수 테이블(`bookings`)이 생성되어 있습니다.

### 환경 변수 설정
Vercel 프로젝트 설정의 **Environment Variables** 메뉴에서 다음 변수들을 등록해야 합니다.

| 변수명 | 설명 | 기본값 (참고용) |
|--------|------|-----------------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | `https://nhrqeegffxlsmreycscd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key | (보안상 생략 - .env 파일 확인) |
| `VITE_ADMIN_PASSWORD` | 관리자 페이지 접속 비밀번호 | `mediana` |
| `STIBEE_API_URL` | 스티비(Stibee) 자동메일 API URL | `https://stibee.com/api/v1.0/auto/...` |
| `STIBEE_API_KEY` | 스티비(Stibee) API Key | (보안상 생략 - .env 파일 확인) |

> **주의:** 로컬 개발 환경의 `.env` 파일에 있는 값들을 Vercel 환경 변수로 반드시 복사해서 넣어주세요.

## 2. 배포 전 최종 확인

### 체크리스트
- [x] **빌드 설정**: `vite.config.ts` 및 `package.json`의 빌드 스크립트(`npm run build`)가 정상인지 확인했습니다.
- [x] **라우팅 설정**: `vercel.json` 파일을 생성하여 SPA(Single Page Application) 라우팅 리다이렉트 규칙을 추가했습니다.
- [x] **코드 검증**: 주요 기능(예약 생성, 관리자 로그인, 엑셀 다운로드) 코드가 최신 상태입니다.
- [x] **의존성**: `package.json`의 모든 라이브러리 버전이 호환됩니다.

## 3. 배포 실행

### Vercel 배포 방법
1. **Vercel Dashboard** 접속 및 로그인
2. **Add New Project** 클릭
3. GitHub 레포지토리 연결 (WHX_RESERVATION)
4. **Build & Development Settings** 확인
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Environment Variables** 섹션에 위 1번 단계의 변수들 입력
6. **Deploy** 버튼 클릭

### 롤백 계획
- 배포 실패 시 Vercel 대시보드의 **Deployments** 탭에서 이전 성공 배포 버전을 즉시 "Redeploy" 또는 "Promote to Production" 할 수 있습니다.

## 4. 배포 후 검증

배포가 완료되면 제공된 URL(예: `whx-reservation.vercel.app`)로 접속하여 다음을 확인하세요:

1. **메인 페이지 로딩**: 정상적으로 뜨는지 확인
2. **예약 테스트**: "Make a Reservation" 버튼을 통해 테스트 예약 진행
3. **관리자 접속**: `/admin/login` 접속 후 비밀번호 입력하여 로그인 성공 여부 확인
4. **데이터 확인**: 관리자 대시보드에서 방금 생성한 테스트 예약이 보이는지 확인
5. **메일 발송 확인**: 예약 시 입력한 이메일로 자동 확인 메일이 도착하는지 확인 (스팸함 포함)

## 5. 모니터링 및 유지보수

- **Vercel Analytics**: 트래픽 및 성능 모니터링을 위해 Vercel 대시보드에서 Analytics 탭 활성화 권장
- **Logs**: 런타임 에러 발생 시 Vercel Logs 탭에서 실시간 로그 확인 가능

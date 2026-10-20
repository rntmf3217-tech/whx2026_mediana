-- ============================================================================
-- Phase 0 — 멀티전시회(edition) 구조 도입
-- 실행 위치: Supabase Dashboard → SQL Editor (전체 복사 후 Run)
--
-- 안전 주의:
--   * 이 마이그레이션은 edition_id를 NULLABLE + 임시 DEFAULT('whx-2026')로 추가합니다.
--     현재 운영 중인(구) 코드는 INSERT 시 edition_id를 보내지 않으므로,
--     지금 NOT NULL을 걸면 라이브 예약이 깨집니다. NOT NULL 전환은 Phase 2(코드가
--     edition_id를 보내도록 수정) 완료 후 파일 맨 아래 블록으로 적용합니다.
--   * 반복 실행해도 안전하도록 IF NOT EXISTS / ON CONFLICT 를 사용했습니다.
--   * 기존 데이터는 전부 WHX 2026 예약이므로 'whx-2026'으로 백필합니다.
-- ============================================================================

-- 1) 전시회 회차(edition) 테이블 ------------------------------------------------
create table if not exists public.editions (
  id                text primary key,            -- 'whx-2026', 'medica-2026'
  event_key         text not null,               -- 'whx' | 'medica'
  year              int  not null,
  name              text not null,               -- 'WHX Dubai 2026'
  start_date        date not null,
  end_date          date not null,
  operating_hours   jsonb not null,              -- {"2026-02-09":{"start":"10:00","end":"18:00"}, ...}
  booth             text,
  location          text,                        -- 'Messe Düsseldorf, Hall 11'
  map_embed_url     text,                        -- 부스 지도 iframe URL
  logo_url          text,                        -- 전시회 로고 (없으면 null)
  hosts             jsonb not null default '[]'::jsonb,  -- 담당자 목록
  registration_open boolean not null default true,       -- 공개 예약 허용(마감처리용)
  is_current        boolean not null default false,      -- /:event 접속 시 리다이렉트 대상
  created_at        timestamptz not null default now(),
  constraint editions_event_key_check check (event_key in ('whx', 'medica')),
  -- 새 전시회가 생기면 위 CHECK에 값 추가 후 editions에 회차 INSERT
  constraint editions_event_year_unique unique (event_key, year)
);

-- 1b) editions 읽기 정책 (RLS) --------------------------------------------------
-- 공개 페이지가 anon 키로 전시회 설정을 읽어야 하므로 SELECT는 전체 허용.
-- 쓰기(INSERT/UPDATE/DELETE)는 정책을 두지 않아 anon에게 차단됨
-- → 회차 추가/수정은 Supabase 대시보드(service_role)에서만.
alter table public.editions enable row level security;
drop policy if exists "editions readable by anyone" on public.editions;
create policy "editions readable by anyone"
  on public.editions for select
  using (true);

-- 2) 회차 데이터 시드 ----------------------------------------------------------
-- WHX 2026 (이미 종료 → registration_open=false)
insert into public.editions
  (id, event_key, year, name, start_date, end_date, operating_hours, booth, location, hosts, registration_open, is_current)
values (
  'whx-2026', 'whx', 2026, 'WHX Dubai 2026', '2026-02-09', '2026-02-12',
  '{
     "2026-02-09": {"start": "10:00", "end": "18:00"},
     "2026-02-10": {"start": "10:00", "end": "18:00"},
     "2026-02-11": {"start": "10:00", "end": "18:00"},
     "2026-02-12": {"start": "10:00", "end": "17:00"}
   }'::jsonb,
  'N27.B58', 'Dubai Exhibition Centre',
  '["Michael","Bruce","Anna","Walter","Ashwin"]'::jsonb,
  false, true
)
on conflict (id) do nothing;

-- MEDICA 2026 (예정 → registration_open=true). 로고/지도는 추후 전달 예정(null)
insert into public.editions
  (id, event_key, year, name, start_date, end_date, operating_hours, booth, location, hosts, registration_open, is_current)
values (
  'medica-2026', 'medica', 2026, 'MEDICA 2026', '2026-11-16', '2026-11-19',
  '{
     "2026-11-16": {"start": "10:00", "end": "18:00"},
     "2026-11-17": {"start": "10:00", "end": "18:00"},
     "2026-11-18": {"start": "10:00", "end": "18:00"},
     "2026-11-19": {"start": "10:00", "end": "16:00"}
   }'::jsonb,
  'B16', 'Messe Düsseldorf, Hall 11',
  '["Michael","Bruce","Anna","Walter","Haylee"]'::jsonb,
  true, true
)
on conflict (id) do nothing;

-- 3) bookings / notifications 에 edition_id 추가 (nullable + 임시 DEFAULT) --------
alter table public.bookings
  add column if not exists edition_id text references public.editions(id);
alter table public.notifications
  add column if not exists edition_id text references public.editions(id);

-- 임시 기본값: Phase 2 이전까지 구 코드의 INSERT가 깨지지 않도록 WHX로 태깅
-- (Phase 2 완료 후 파일 맨 아래 블록에서 DROP DEFAULT)
alter table public.bookings      alter column edition_id set default 'whx-2026';
alter table public.notifications alter column edition_id set default 'whx-2026';

-- 4) 기존 데이터 백필 (현재 데이터는 전부 WHX 2026) ----------------------------
update public.bookings      set edition_id = 'whx-2026' where edition_id is null;
update public.notifications set edition_id = 'whx-2026' where edition_id is null;

-- 5) 조회 성능용 인덱스 --------------------------------------------------------
-- isSlotAvailable(edition_id,date,time), getBookingsByDate(edition_id,date) 대비
create index if not exists idx_bookings_edition_date_time
  on public.bookings (edition_id, date, time);
create index if not exists idx_bookings_edition
  on public.bookings (edition_id);
create index if not exists idx_notifications_edition
  on public.notifications (edition_id);

-- 6) 확인용 쿼리 (실행 후 결과 눈으로 체크) ------------------------------------
-- select id, event_key, year, is_current, registration_open from public.editions order by id;
-- select edition_id, count(*) from public.bookings group by edition_id;

-- ============================================================================
-- ⛔ 아래 블록은 지금 실행하지 마세요.
--    Phase 2(store.ts의 모든 INSERT가 edition_id를 명시적으로 보내도록 수정)가
--    배포된 뒤에 실행합니다. 임시 DEFAULT를 제거하고 NOT NULL을 강제합니다.
-- ============================================================================
-- alter table public.bookings      alter column edition_id drop default;
-- alter table public.notifications alter column edition_id drop default;
-- alter table public.bookings      alter column edition_id set not null;

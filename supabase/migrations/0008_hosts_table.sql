-- ============================================================================
-- 미팅 담당자(Meeting With) 목록을 관리자 화면에서 관리하기 위한 테이블
-- 실행 위치: Supabase Dashboard → SQL Editor
--
-- - 전시회 구분 없이 하나의 목록. 전시회별로는 active(사용 여부)로 조절.
-- - 이메일이 들어 있으므로 anon 키로는 읽기/쓰기 모두 불가 (RLS on, 정책 없음).
--   읽기·쓰기는 서버(api/hosts.ts, api/notify-host.ts)가 service_role 키로만 한다.
-- - 이 테이블이 생기면 Vercel env HOST_EMAILS 는 fallback 용도로만 남는다.
-- 반복 실행해도 안전.
-- ============================================================================

create table if not exists public.hosts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 이름은 대소문자 구분 없이 하나만 (bookings.meeting_with 가 이름으로 연결됨)
create unique index if not exists hosts_name_lower_key on public.hosts (lower(name));

alter table public.hosts enable row level security;

-- 기존 담당자 이전 (HOST_EMAILS 와 동일)
insert into public.hosts (name, email, sort_order) values
  ('Michael', 'michael@mediana.co.kr', 1),
  ('Bruce',   'bruce@mediana.co.kr',   2),
  ('Anna',    'anna@mediana.co.kr',    3),
  ('Walter',  'walter@mediana.co.kr',  4),
  ('Haylee',  'hayoung@mediana.co.kr', 5),
  ('Marc',    'marc@mediana.co.kr',    6)
on conflict do nothing;

-- 확인용
-- select name, email, active, sort_order from public.hosts order by sort_order;

-- ============================================================================
-- 히어로 섹션: 전시회 로고 + "날짜 | 도시" 줄
-- 실행 위치: Supabase Dashboard → SQL Editor
--
-- city: 히어로의 날짜 옆에 표시 (예: '16-19 November 2026 | Düsseldorf, Germany')
-- logo_url: 히어로에서 전시회명 왼쪽에 표시. 이미지는 public/edition-logos/ 에 둔다.
-- 반복 실행해도 안전.
-- ============================================================================

alter table public.editions
  add column if not exists city text;

update public.editions
set city = 'Düsseldorf, Germany',
    logo_url = '/edition-logos/medica-2026.webp'
where id = 'medica-2026';

update public.editions
set city = 'Dubai, UAE'
where id = 'whx-2026';

-- 확인용
-- select id, city, logo_url from public.editions order by id;

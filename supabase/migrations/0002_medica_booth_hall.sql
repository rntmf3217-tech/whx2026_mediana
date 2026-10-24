-- ============================================================================
-- MEDICA 2026 — 홀 번호를 location에서 booth로 이동
-- 실행 위치: Supabase Dashboard → SQL Editor (전체 복사 후 Run)
--
-- 이유: MEDICA는 홀마다 부스 번호를 따로 매기므로(B16이 여러 홀에 존재)
--       홀 번호는 부스 정보의 일부다. WHX의 'N27.B58'처럼 booth에 홀을 포함시킨다.
-- 반복 실행해도 안전.
-- ============================================================================

update public.editions
set booth    = 'Hall 11 / B16',
    location = 'Messe Düsseldorf'
where id = 'medica-2026';

-- 확인용
-- select id, booth, location from public.editions order by id;

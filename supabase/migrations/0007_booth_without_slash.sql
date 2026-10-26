-- ============================================================================
-- 부스 표기 통일: 'Hall 11 / B16' → 'Hall 11 B16'
-- 실행 위치: Supabase Dashboard → SQL Editor
--
-- 히어로·Location 카드·고객/내부 메일이 모두 이 값을 그대로 쓴다.
-- 반복 실행해도 안전.
-- ============================================================================

update public.editions
set booth = 'Hall 11 B16'
where id = 'medica-2026';

-- 확인용
-- select id, booth from public.editions order by id;

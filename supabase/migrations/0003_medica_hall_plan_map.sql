-- ============================================================================
-- MEDICA 2026 — 부스 위치 섹션에 공식 인터랙티브 홀 플랜 삽입
-- 실행 위치: Supabase Dashboard → SQL Editor
--
-- www.medica-tradefair.com/en/Interactive_hall_plan 은 iframe 안에서 데이터 로딩
-- 오류("Fehler beim Speichern/Laden")가 나므로, 지도 단독 페이지인
-- floorplan.medica-tradefair.com 을 사용한다. 해시의 fId가 부스(11.B16)를 지정.
-- 반복 실행해도 안전.
-- ============================================================================

update public.editions
set map_embed_url = 'https://floorplan.medica-tradefair.com/#content=infodisplay&fId=12826.11.B16.0'
where id = 'medica-2026';

-- 확인용
-- select id, map_embed_url from public.editions order by id;

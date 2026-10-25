-- ============================================================================
-- 부스 위치 섹션: 확대된 부스 배치 이미지
-- 실행 위치: Supabase Dashboard → SQL Editor
--
-- 주최측 실시간 홀 플랜은 URL로 확대 수준을 지정할 수 없어 iframe으로는
-- 전시장 전체만 보인다. 부스 주변을 확대한 스냅샷 이미지를 보여주고,
-- 클릭하면 map_embed_url(실시간 홀 플랜)을 새 탭으로 연다.
-- 이미지는 사이트 public/booth-maps/ 에 둔다. 반복 실행해도 안전.
-- ============================================================================

alter table public.editions
  add column if not exists booth_map_image_url text;  -- 예: '/booth-maps/medica-2026.webp'

update public.editions
set booth_map_image_url = '/booth-maps/medica-2026.webp'
where id = 'medica-2026';

-- 확인용
-- select id, booth_map_image_url, map_embed_url from public.editions order by id;

-- ============================================================================
-- MEDICA 2026 미팅 담당자에 Marc 추가
-- 실행 위치: Supabase Dashboard → SQL Editor
--
-- 담당자 이메일(marc@mediana.co.kr)은 DB가 아니라 Vercel env HOST_EMAILS에 둔다.
-- 반복 실행해도 안전 (이미 있으면 추가하지 않음).
-- ============================================================================

update public.editions
set hosts = hosts || '["Marc"]'::jsonb
where id = 'medica-2026'
  and not hosts ? 'Marc';

-- 확인용
-- select id, hosts from public.editions order by id;

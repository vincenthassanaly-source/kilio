-- Audit reports/2026-09-14-audit-supabase-best-practices.md, écart #4 :
-- `set_termine_le()` n'avait pas de search_path fixé, contrairement à
-- `set_updated_at()` (SET search_path TO ''). Seul écart remonté par
-- mcp__Supabase__get_advisors(type="security") sous
-- `function_search_path_mutable`. Durcissement standard contre le
-- détournement de search_path ; ALTER FUNCTION ne verrouille pas les
-- lignes des tables qui utilisent la fonction, migration sans risque.
--
-- Appliquée via mcp__Supabase__apply_migration (nom :
-- fix_set_termine_le_search_path).

alter function public.set_termine_le() set search_path = '';

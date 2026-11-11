-- Fix: online orders failed with "function gen_random_bytes(integer) does not exist".
-- On Supabase, pgcrypto lives in the "extensions" schema, which place_order could not see.
-- Let place_order find it. (New installs already use gen_random_uuid() instead.)
-- Run this once in Supabase > SQL Editor.
alter function public.place_order(text, text, text, text, text, text, text, jsonb)
  set search_path = public, extensions;

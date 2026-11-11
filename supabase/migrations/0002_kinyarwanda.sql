-- Adds Kinyarwanda category names.
-- Only needed if you ran 0001_init.sql BEFORE Kinyarwanda was added. Safe to run more than once.
alter table public.categories add column if not exists name_rw text not null default '';

update public.categories set name_rw = case name_fr
  when 'Ciment et maçonnerie' then 'Sima n’ubwubatsi'
  when 'Fer et tôles' then 'Ibyuma n’amabati'
  when 'Peinture' then 'Irangi'
  when 'Plomberie' then 'Ibikoresho by’amazi'
  when 'Électricité' then 'Amashanyarazi'
  when 'Outils' then 'Ibikoresho by’intoki'
  when 'Quincaillerie générale' then 'Ibikoresho rusange'
  when 'Bois et menuiserie' then 'Imbaho n’ububaji'
  else name_rw end
where name_rw = '';

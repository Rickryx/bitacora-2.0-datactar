-- Helper query to find your User ID
select id, email from auth.users where email = 'TU_EMAIL_AQUI';

-- Once you have the ID (e.g. '550e8400-e29b...'), run this to create the profile manually:
-- insert into public.profiles (id, full_name, role)
-- values ('TU_UUID_AQUI', 'Nombre Guardia', 'GUARD');

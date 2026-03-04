-- Este comando intenta crear perfiles para TODOS los usuarios.
-- Si un perfil ya existe, simplemente lo ignora (DO NOTHING) y sigue con el siguiente.
-- Así no sale error de duplicados.

insert into public.profiles (id, full_name, role)
select id, 'Guardia', 'GUARD'
from auth.users
on conflict (id) do nothing;

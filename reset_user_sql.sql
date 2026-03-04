-- 1. Get the User ID first if you don't have it
-- select id, email from auth.users;

-- 2. Delete the profile first (foreign key dependency)
delete from public.profiles 
where id in (select id from auth.users where email = 'TU_EMAIL_DEL_LOGIN');

-- 3. Delete the user from Auth (this effectively validates a "fresh start")
delete from auth.users 
where email = 'TU_EMAIL_DEL_LOGIN';

-- SQL to promote a user to ADMIN
-- Replace 'USER_ID_HERE' with your specific user ID, or run this to promote ALL existing users (for dev purposes).
-- For this specific user (based on previous logs):
-- user_id: 365291da-f8cb-4dad-96cf-d60fb0b74c24

UPDATE public.profiles
SET role = 'ADMIN'
WHERE id = auth.uid(); 
-- Note: running "WHERE id = auth.uid()" in SQL editor works if you context is set, 
-- but safer to use specific ID or just update all for dev:

UPDATE public.profiles SET role = 'ADMIN';

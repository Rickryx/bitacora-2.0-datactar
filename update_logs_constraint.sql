-- SQL to update the check constraint on the logs table
-- We need to drop the existing constraint and add a new one with the updated values.

ALTER TABLE public.logs DROP CONSTRAINT IF EXISTS logs_type_check;

ALTER TABLE public.logs 
ADD CONSTRAINT logs_type_check 
CHECK (type IN ('VISITOR', 'VEHICLE', 'ROUND', 'INCIDENT', 'MINUTA', 'DELIVERY', 'SERVICE'));

-- SQL to update the check constraint on the logs table
-- This adds the new categories 'PROVEEDOR' and 'INFO'
ALTER TABLE public.logs DROP CONSTRAINT IF EXISTS logs_type_check;

ALTER TABLE public.logs 
ADD CONSTRAINT logs_type_check 
CHECK (type IN ('VISITOR', 'VEHICLE', 'ROUND', 'INCIDENT', 'MINUTA', 'DELIVERY', 'SERVICE', 'PROVEEDOR', 'INFO'));

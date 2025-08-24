-- Add estatus column to personal table to track active/inactive status
ALTER TABLE personal
ADD COLUMN estatus VARCHAR(10) DEFAULT 'Activo' NOT NULL;

-- You can run this script on your PostgreSQL database to apply the change.

-- Drop columns from isimple_phones table
ALTER TABLE isimple_phones 
DROP COLUMN status,
DROP COLUMN packet_count,
DROP COLUMN project_id,
DROP COLUMN last_checked_at;
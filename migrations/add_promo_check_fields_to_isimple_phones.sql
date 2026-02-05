-- Add promo check fields to isimple_phones table
ALTER TABLE isimple_phones 
ADD COLUMN last_check_status VARCHAR(20) NULL,
ADD COLUMN last_check_response TEXT NULL,
ADD COLUMN last_check_at DATETIME NULL;

-- Add index for last_check_at
CREATE INDEX idx_last_check_at ON isimple_phones (last_check_at);
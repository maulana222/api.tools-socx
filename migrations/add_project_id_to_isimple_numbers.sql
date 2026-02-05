-- Add project_id foreign key to isimple_numbers table
ALTER TABLE isimple_numbers 
ADD COLUMN project_id INT NOT NULL DEFAULT 1 AFTER id,
ADD FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
ADD INDEX idx_project_id (project_id);

-- Update existing records to Isimple project (id=1)
UPDATE isimple_numbers SET project_id = 1 WHERE project_id IS NULL OR project_id = 0;
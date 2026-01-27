-- Add unique constraint on user_id to ensure one token per user
-- First, remove any duplicate user_id entries (keep the most recent one)
DELETE t1 FROM socx_tokens t1
INNER JOIN socx_tokens t2
WHERE t1.user_id = t2.user_id
AND t1.id < t2.id;

-- Then add the unique constraint
ALTER TABLE socx_tokens ADD UNIQUE INDEX idx_user_id_unique (user_id);
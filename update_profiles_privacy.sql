-- Add is_public column to profiles table
ALTER TABLE profiles 
ADD COLUMN is_public BOOLEAN DEFAULT TRUE;

-- Update existing rows to be public by default
UPDATE profiles SET is_public = TRUE WHERE is_public IS NULL;

-- (Optional) Policy update would go here if we were using rigorous RLS, 
-- but since we handle filtering in data.js for now, this schema change is sufficient for the MVP.

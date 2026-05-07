-- Add chef_suggestion column to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS chef_suggestion boolean NOT NULL DEFAULT false;

-- Create index for fast chef pick queries
CREATE INDEX IF NOT EXISTS idx_menu_items_chef_suggestion
  ON menu_items (chef_suggestion)
  WHERE chef_suggestion = true;

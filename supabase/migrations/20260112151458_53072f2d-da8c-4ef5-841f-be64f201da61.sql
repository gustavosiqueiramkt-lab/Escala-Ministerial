-- Add notes field to service_items for musical direction annotations
ALTER TABLE public.service_items 
ADD COLUMN notes TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.service_items.notes IS 'Musical direction notes for the item (e.g., "Start soft on piano", "Prayer after 2nd verse")';
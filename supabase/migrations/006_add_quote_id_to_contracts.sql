-- Add quote_id column to contracts table
ALTER TABLE contracts 
ADD COLUMN quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

COMMENT ON COLUMN contracts.quote_id IS 'Reference to the quote from which this contract was created';

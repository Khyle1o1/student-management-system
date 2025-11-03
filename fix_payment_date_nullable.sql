-- Fix payment_date column to allow NULL for unpaid fees
-- This is necessary because unpaid fees don't have a payment date yet

-- Make payment_date nullable
ALTER TABLE payments 
ALTER COLUMN payment_date DROP NOT NULL;

-- Update existing records with null payment_date for unpaid statuses
UPDATE payments 
SET payment_date = NULL 
WHERE status IN ('UNPAID', 'PENDING', 'OVERDUE') 
AND payment_date IS NOT NULL;

-- Add a check constraint to ensure paid fees have a payment date
ALTER TABLE payments 
ADD CONSTRAINT check_payment_date_when_paid 
CHECK (
  (status = 'PAID' AND payment_date IS NOT NULL) OR 
  (status != 'PAID')
);

-- Comment to document the change
COMMENT ON COLUMN payments.payment_date IS 'Date when payment was made. NULL for unpaid fees, required for paid fees.';


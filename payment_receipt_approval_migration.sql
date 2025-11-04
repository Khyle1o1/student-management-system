-- Payment Receipt Upload and Approval Workflow Migration
-- This migration adds support for receipt uploads and approval workflow

-- Step 1: Add receipt and approval fields to payments table
DO $$
BEGIN
    -- Add receipt URL field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'receipt_url'
    ) THEN
        ALTER TABLE payments ADD COLUMN receipt_url TEXT;
    END IF;

    -- Add approval status field (PENDING_APPROVAL, APPROVED, REJECTED)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE payments ADD COLUMN approval_status VARCHAR(50) DEFAULT 'PENDING_APPROVAL';
    END IF;

    -- Add rejection reason field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE payments ADD COLUMN rejection_reason TEXT;
    END IF;

    -- Add approved by field (user ID)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE payments ADD COLUMN approved_by UUID REFERENCES users(id);
    END IF;

    -- Add approved at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE payments ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add rejected by field (user ID)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'rejected_by'
    ) THEN
        ALTER TABLE payments ADD COLUMN rejected_by UUID REFERENCES users(id);
    END IF;

    -- Add rejected at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE payments ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add uploaded at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'uploaded_at'
    ) THEN
        ALTER TABLE payments ADD COLUMN uploaded_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Step 2: Update existing payments to have APPROVED status if they're already PAID
-- This ensures backward compatibility
UPDATE payments 
SET approval_status = 'APPROVED',
    approved_at = payment_date,
    status = 'PAID'
WHERE status = 'PAID' AND (approval_status IS NULL OR approval_status = 'PENDING_APPROVAL');

-- Step 3: Add check constraint for approval_status
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payments_approval_status_check'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT payments_approval_status_check;
    END IF;
END $$;

ALTER TABLE payments 
ADD CONSTRAINT payments_approval_status_check 
CHECK (approval_status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED'));

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_approval_status ON payments(approval_status);
CREATE INDEX IF NOT EXISTS idx_payments_approved_by ON payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_payments_rejected_by ON payments(rejected_by);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN payments.receipt_url IS 'URL of the uploaded payment receipt (image or PDF)';
COMMENT ON COLUMN payments.approval_status IS 'Status of payment approval: PENDING_APPROVAL, APPROVED, or REJECTED';
COMMENT ON COLUMN payments.rejection_reason IS 'Reason provided by admin when rejecting a payment';
COMMENT ON COLUMN payments.approved_by IS 'User ID of the admin who approved the payment';
COMMENT ON COLUMN payments.approved_at IS 'Timestamp when the payment was approved';
COMMENT ON COLUMN payments.rejected_by IS 'User ID of the admin who rejected the payment';
COMMENT ON COLUMN payments.rejected_at IS 'Timestamp when the payment was rejected';
COMMENT ON COLUMN payments.uploaded_at IS 'Timestamp when the receipt was uploaded';


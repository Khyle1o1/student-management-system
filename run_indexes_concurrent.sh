#!/bin/bash
# ========================================
# RUN INDEXES CONCURRENTLY (ZERO DOWNTIME)
# ========================================
# This script runs each CREATE INDEX CONCURRENTLY individually
# Use this for production systems with large tables

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Export it first: export DATABASE_URL='your-connection-string'"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Creating Performance Indexes${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}This will create 50+ indexes without locking tables${NC}"
echo -e "${YELLOW}Estimated time: 5-15 minutes${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Counter for progress
total=53
current=0

# Function to run a CREATE INDEX CONCURRENTLY command
run_index() {
    local sql="$1"
    local index_name="$2"
    
    current=$((current + 1))
    echo -e "${YELLOW}[$current/$total]${NC} Creating $index_name..."
    
    if psql "$DATABASE_URL" -c "$sql" 2>&1 | grep -q "ERROR"; then
        echo -e "${RED}✗ Failed to create $index_name${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Created $index_name${NC}"
        return 0
    fi
}

echo ""
echo -e "${GREEN}Starting index creation...${NC}"
echo ""

# PAYMENTS TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);" "idx_payments_status"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);" "idx_payments_payment_date"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_not_deleted ON payments(deleted_at) WHERE deleted_at IS NULL;" "idx_payments_not_deleted"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payments(created_at);" "idx_payments_created_at"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_fee_student_composite ON payments(fee_id, student_id, status);" "idx_payments_fee_student_composite"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_unpaid ON payments(student_id, fee_id, amount) WHERE status = 'UNPAID' AND deleted_at IS NULL;" "idx_payments_unpaid"

# EVENTS TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_status ON events(status);" "idx_events_status"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_scope_college ON events(scope_college) WHERE scope_college IS NOT NULL;" "idx_events_scope_college"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_scope_course ON events(scope_course) WHERE scope_course IS NOT NULL;" "idx_events_scope_course"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_created_at ON events(created_at);" "idx_events_created_at"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_updated_at ON events(updated_at);" "idx_events_updated_at"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_scope_composite ON events(scope_type, scope_college, scope_course) WHERE scope_type IN ('COLLEGE_WIDE', 'COURSE_SPECIFIC');" "idx_events_scope_composite"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_pending ON events(created_at DESC, scope_type, scope_college) WHERE status = 'PENDING';" "idx_events_pending"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_evaluation_id ON events(evaluation_id) WHERE evaluation_id IS NOT NULL;" "idx_events_evaluation_id"

# ATTENDANCE TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status ON attendance(status);" "idx_attendance_status"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_created_at ON attendance(created_at);" "idx_attendance_created_at"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_time_in_out ON attendance(time_in, time_out);" "idx_attendance_time_in_out"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_event_student_time ON attendance(event_id, student_id, time_in) INCLUDE (time_out, status, created_at);" "idx_attendance_event_student_time"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_evaluation_completed ON attendance(evaluation_completed) WHERE evaluation_completed = false;" "idx_attendance_evaluation_completed"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_certificate_generated ON attendance(certificate_generated) WHERE certificate_generated = false;" "idx_attendance_certificate_generated"

# STUDENTS TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_year_level ON students(year_level);" "idx_students_year_level"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_archived ON students(archived) WHERE archived IS NOT NULL;" "idx_students_archived"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_created_at ON students(created_at);" "idx_students_created_at"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_email ON students(email);" "idx_students_email"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_college_course_year ON students(college, course, year_level);" "idx_students_college_course_year"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_active ON students(college, course, year_level, created_at) WHERE (archived IS NULL OR archived = false);" "idx_students_active"

# FEE_STRUCTURES TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_is_active ON fee_structures(is_active);" "idx_fee_structures_is_active"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_not_deleted ON fee_structures(deleted_at) WHERE deleted_at IS NULL;" "idx_fee_structures_not_deleted"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_due_date ON fee_structures(due_date);" "idx_fee_structures_due_date"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_scope_type ON fee_structures(scope_type);" "idx_fee_structures_scope_type"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_scope_college ON fee_structures(scope_college) WHERE scope_college IS NOT NULL;" "idx_fee_structures_scope_college"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_scope_course ON fee_structures(scope_course) WHERE scope_course IS NOT NULL;" "idx_fee_structures_scope_course"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_active_scope ON fee_structures(is_active, scope_type, scope_college, scope_course) WHERE deleted_at IS NULL;" "idx_fee_structures_active_scope"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fee_structures_school_year_semester ON fee_structures(school_year, semester);" "idx_fee_structures_school_year_semester"

# FORM_RESPONSES TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_student_id ON form_responses(student_id) WHERE student_id IS NOT NULL;" "idx_form_responses_student_id"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_event_id ON form_responses(event_id) WHERE event_id IS NOT NULL;" "idx_form_responses_event_id"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_responses_form_event_student ON form_responses(form_id, event_id, student_id);" "idx_form_responses_form_event_student"

# NOTIFICATIONS TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;" "idx_notifications_user_unread"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_student_unread ON notifications(student_id, created_at DESC) WHERE is_read = false AND student_id IS NOT NULL;" "idx_notifications_student_unread"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);" "idx_notifications_type"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_expired ON notifications(expires_at) WHERE expires_at IS NOT NULL;" "idx_notifications_expired"

# CERTIFICATES TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_is_accessible ON certificates(is_accessible);" "idx_certificates_is_accessible"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_generated_at ON certificates(generated_at);" "idx_certificates_generated_at"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_student_accessible ON certificates(student_id, is_accessible, generated_at) WHERE is_accessible = true;" "idx_certificates_student_accessible"
run_index "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_certificates_number_unique ON certificates(certificate_number) WHERE certificate_number IS NOT NULL;" "idx_certificates_number_unique"

# ORGANIZATION_FEEDBACK TABLE
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_org_name ON organization_feedback(org_name) WHERE org_name IS NOT NULL;" "idx_organization_feedback_org_name"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_purpose ON organization_feedback(purpose);" "idx_organization_feedback_purpose"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_user_type ON organization_feedback(user_type);" "idx_organization_feedback_user_type"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_reaction_type ON organization_feedback(reaction_type);" "idx_organization_feedback_reaction_type"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_status ON organization_feedback(status);" "idx_organization_feedback_status"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_created_at ON organization_feedback(created_at DESC);" "idx_organization_feedback_created_at"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_rating ON organization_feedback(overall_rating) WHERE overall_rating IS NOT NULL;" "idx_organization_feedback_rating"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_feedback_composite ON organization_feedback(org_name, purpose, user_type, reaction_type, created_at DESC);" "idx_organization_feedback_composite"

# USERS TABLE
run_index "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_unique ON users(email);" "idx_users_email_unique"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_not_deleted ON users(deleted_at) WHERE deleted_at IS NULL;" "idx_users_not_deleted"
run_index "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_role ON users(status, role) WHERE status = 'ACTIVE';" "idx_users_status_role"

# Analyze tables
echo ""
echo -e "${GREEN}Analyzing tables to update statistics...${NC}"
psql "$DATABASE_URL" -c "ANALYZE students;"
psql "$DATABASE_URL" -c "ANALYZE events;"
psql "$DATABASE_URL" -c "ANALYZE attendance;"
psql "$DATABASE_URL" -c "ANALYZE payments;"
psql "$DATABASE_URL" -c "ANALYZE fee_structures;"
psql "$DATABASE_URL" -c "ANALYZE form_responses;"
psql "$DATABASE_URL" -c "ANALYZE certificates;"
psql "$DATABASE_URL" -c "ANALYZE notifications;"
psql "$DATABASE_URL" -c "ANALYZE organization_feedback;"
psql "$DATABASE_URL" -c "ANALYZE users;"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Index creation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Verify indexes were created:"
echo "psql \$DATABASE_URL -c \"SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename;\""


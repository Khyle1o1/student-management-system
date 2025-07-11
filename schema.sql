-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    student_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    college VARCHAR(100) NOT NULL,
    year_level INTEGER NOT NULL,
    course VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    location VARCHAR(255),
    scope_type VARCHAR(50) NOT NULL DEFAULT 'UNIVERSITY_WIDE',
    scope_college VARCHAR(100),
    scope_course VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fee_structures table
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_user_id') THEN
        CREATE INDEX idx_students_user_id ON students(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_student_id') THEN
        CREATE INDEX idx_students_student_id ON students(student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_college') THEN
        CREATE INDEX idx_students_college ON students(college);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_course') THEN
        CREATE INDEX idx_students_course ON students(course);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_date') THEN
        CREATE INDEX idx_events_date ON events(date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_scope_type') THEN
        CREATE INDEX idx_events_scope_type ON events(scope_type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_event_id') THEN
        CREATE INDEX idx_attendance_event_id ON attendance(event_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_student_id') THEN
        CREATE INDEX idx_attendance_student_id ON attendance(student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_student_id') THEN
        CREATE INDEX idx_payments_student_id ON payments(student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_fee_id') THEN
        CREATE INDEX idx_payments_fee_id ON payments(fee_id);
    END IF;
END $$;

-- Insert sample data
INSERT INTO users (email, name, role, password) VALUES
    ('admin@example.com', 'Admin User', 'ADMIN', 'PLACEHOLDER_HASH_REPLACE_THIS'),
    ('student1@example.com', 'John Doe', 'USER', 'PLACEHOLDER_HASH_REPLACE_THIS'),
    ('student2@example.com', 'Jane Smith', 'USER', 'PLACEHOLDER_HASH_REPLACE_THIS');

INSERT INTO students (user_id, student_id, name, email, college, year_level, course) VALUES
    ((SELECT id FROM users WHERE email = 'student1@example.com'), 'STU001', 'John Doe', 'student1@example.com', 'Engineering', 2, 'Computer Science'),
    ((SELECT id FROM users WHERE email = 'student2@example.com'), 'STU002', 'Jane Smith', 'student2@example.com', 'Business', 3, 'Business Administration');

INSERT INTO events (title, description, date, location, scope_type) VALUES
    ('General Assembly 2025', 'Annual student gathering', '2025-07-05', 'Main Hall', 'UNIVERSITY_WIDE'),
    ('Career Fair 2025', 'Meet potential employers', '2025-08-15', 'Gymnasium', 'UNIVERSITY_WIDE'); 
-- Add status_flag to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status_flag TEXT DEFAULT 'new';

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_read BOOLEAN DEFAULT FALSE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'cancel'))
);

-- Function to handle booking inserts
CREATE OR REPLACE FUNCTION handle_new_booking()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (booking_id, message, action_type)
    VALUES (NEW.id, 'Booking created by ' || COALESCE(NEW.company_name, 'Unknown'), 'create');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_booking_created ON bookings;
CREATE TRIGGER on_booking_created
AFTER INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION handle_new_booking();

-- Function to set status_flag on update
CREATE OR REPLACE FUNCTION set_booking_updated_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If updating to 'read', allow it.
    -- If status_flag is not changing, but data is, set to 'updated'.
    IF NEW.status_flag IS NOT DISTINCT FROM OLD.status_flag AND (
       NEW.date IS DISTINCT FROM OLD.date OR
       NEW.time IS DISTINCT FROM OLD.time OR
       NEW.message IS DISTINCT FROM OLD.message
    ) THEN
        NEW.status_flag := 'updated';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_booking_update ON bookings;
CREATE TRIGGER before_booking_update
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_booking_updated_status();

-- Function to notify on update
CREATE OR REPLACE FUNCTION notify_booking_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger notification if status changed to 'updated' OR date/time changed
    IF (NEW.status_flag = 'updated' AND OLD.status_flag != 'updated') OR 
       (NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time) THEN
         INSERT INTO notifications (booking_id, message, action_type)
         VALUES (NEW.id, 'Booking updated by ' || COALESCE(NEW.company_name, 'Unknown'), 'update');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_booking_update ON bookings;
CREATE TRIGGER after_booking_update
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION notify_booking_update();

-- Function to handle booking deletion
CREATE OR REPLACE FUNCTION handle_booking_delete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (booking_id, message, action_type)
    VALUES (NULL, 'Booking cancelled by ' || COALESCE(OLD.company_name, 'Unknown'), 'cancel');
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_booking_deleted ON bookings;
CREATE TRIGGER on_booking_deleted
AFTER DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION handle_booking_delete();

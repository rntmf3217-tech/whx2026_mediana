CREATE OR REPLACE FUNCTION set_booking_updated_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If updating to 'read', allow it.
    -- If status_flag is not changing (meaning it's not a read/unread toggle), but data is, set to 'updated'.
    IF NEW.status_flag IS NOT DISTINCT FROM OLD.status_flag AND (
       NEW.date IS DISTINCT FROM OLD.date OR
       NEW.time IS DISTINCT FROM OLD.time OR
       NEW.message IS DISTINCT FROM OLD.message OR
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.company_name IS DISTINCT FROM OLD.company_name OR
       NEW.country IS DISTINCT FROM OLD.country OR
       NEW.product_interest IS DISTINCT FROM OLD.product_interest OR
       NEW.inquiry_type IS DISTINCT FROM OLD.inquiry_type OR
       NEW.customer_type IS DISTINCT FROM OLD.customer_type
    ) THEN
        NEW.status_flag := 'updated';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_booking_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Trigger notification if any data field changed
    IF (
       NEW.date IS DISTINCT FROM OLD.date OR
       NEW.time IS DISTINCT FROM OLD.time OR
       NEW.message IS DISTINCT FROM OLD.message OR
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.email IS DISTINCT FROM OLD.email OR
       NEW.company_name IS DISTINCT FROM OLD.company_name OR
       NEW.country IS DISTINCT FROM OLD.country OR
       NEW.product_interest IS DISTINCT FROM OLD.product_interest OR
       NEW.inquiry_type IS DISTINCT FROM OLD.inquiry_type OR
       NEW.customer_type IS DISTINCT FROM OLD.customer_type
    ) THEN
         INSERT INTO notifications (booking_id, message, action_type)
         VALUES (NEW.id, 'Booking updated by ' || COALESCE(NEW.company_name, 'Unknown'), 'update');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing notification triggers to prevent duplicate/generic notifications
DROP TRIGGER IF EXISTS on_booking_created ON bookings;
DROP FUNCTION IF EXISTS handle_new_booking();

DROP TRIGGER IF EXISTS after_booking_update ON bookings;
DROP FUNCTION IF EXISTS notify_booking_update();

DROP TRIGGER IF EXISTS on_booking_deleted ON bookings;
DROP FUNCTION IF EXISTS handle_booking_delete();

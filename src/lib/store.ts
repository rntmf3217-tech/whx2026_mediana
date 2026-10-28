import { supabase } from "./supabase";
import { Booking, Notification, Edition } from "./types";

interface EditionRow {
  id: string;
  event_key: string;
  year: number;
  name: string;
  start_date: string;
  end_date: string;
  operating_hours: Record<string, { start: string; end: string }> | null;
  booth: string | null;
  location: string | null;
  city?: string | null;
  map_embed_url: string | null;
  booth_map_image_url?: string | null;
  logo_url: string | null;
  hosts: string[] | null;
  registration_open: boolean;
  is_current: boolean;
}

function mapEdition(e: EditionRow): Edition {
  return {
    id: e.id,
    eventKey: e.event_key,
    year: e.year,
    name: e.name,
    startDate: e.start_date,
    endDate: e.end_date,
    operatingHours: e.operating_hours || {},
    booth: e.booth ?? undefined,
    location: e.location ?? undefined,
    city: e.city ?? undefined,
    mapEmbedUrl: e.map_embed_url ?? undefined,
    boothMapImageUrl: e.booth_map_image_url ?? undefined,
    logoUrl: e.logo_url ?? undefined,
    hosts: e.hosts || [],
    registrationOpen: e.registration_open,
    isCurrent: e.is_current,
  };
}

export async function getEdition(eventKey: string, year: number): Promise<Edition | null> {
  const { data, error } = await supabase
    .from("editions")
    .select("*")
    .eq("event_key", eventKey)
    .eq("year", year)
    .single();

  if (error || !data) {
    console.error("Error fetching edition:", error);
    return null;
  }

  return mapEdition(data);
}

export async function getCurrentEdition(eventKey: string): Promise<Edition | null> {
  const { data, error } = await supabase
    .from("editions")
    .select("*")
    .eq("event_key", eventKey)
    .eq("is_current", true)
    .limit(1);

  if (error || !data || data.length === 0) {
    console.error("Error fetching current edition:", error);
    return null;
  }

  return mapEdition(data[0]);
}

export async function getEditions(): Promise<Edition[]> {
  const { data, error } = await supabase
    .from("editions")
    .select("*")
    .order("event_key", { ascending: true })
    .order("year", { ascending: false });

  if (error || !data) {
    console.error("Error fetching editions:", error);
    return [];
  }

  return (data as EditionRow[]).map(mapEdition);
}

export async function getActiveEdition(): Promise<Edition | null> {
  const editions = await getEditions();
  if (editions.length === 0) return null;

  // Today as YYYY-MM-DD for string comparison against start_date/end_date.
  const today = new Date().toISOString().slice(0, 10);

  // Ongoing or upcoming editions (end_date >= today), nearest start first.
  const upcoming = editions
    .filter((e) => e.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (upcoming.length > 0) return upcoming[0];

  // Otherwise, the most recent past edition (latest end_date).
  return [...editions].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
}

export async function getBookings(editionId?: string): Promise<Booking[]> {
  let query = supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (editionId) {
    query = query.eq("edition_id", editionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }

  return data.map((b: any) => ({
    id: b.id,
    name: b.name,
    email: b.email,
    companyName: b.company_name,
    country: b.country,
    productInterest: b.product_interest,
    inquiryType: b.inquiry_type,
    message: b.message,
    customerType: b.customer_type,
    date: b.date,
    time: b.time,
    createdAt: b.created_at,
    statusFlag: b.status_flag || 'read', // Default to read if null/undefined to avoid errors
    meetingWith: b.meeting_with || '담당자 미선택',
    editionId: b.edition_id,
  }));
}

export async function markBookingAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status_flag: 'read' })
    .eq("id", id);
    
  if (error) {
    console.error("Error marking booking as read:", error);
  }
}

export async function getNotifications(editionId?: string): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (editionId) {
    query = query.eq("edition_id", editionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return data.map((n: any) => ({
    id: n.id,
    bookingId: n.booking_id,
    message: n.message,
    createdAt: n.created_at,
    isRead: n.is_read,
    actionType: n.action_type,
  }));
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
    
  if (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function createNotification(notification: {
  bookingId: string | null;
  message: string;
  actionType: 'create' | 'update' | 'cancel';
  editionId?: string;
}): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .insert([{
      booking_id: notification.bookingId,
      message: notification.message,
      action_type: notification.actionType,
      is_read: false,
      // Only stamp edition_id when provided; otherwise let the DB default apply
      ...(notification.editionId !== undefined ? { edition_id: notification.editionId } : {}),
    }]);

  if (error) {
    console.error("Error creating notification:", error);
  }
}

export async function addBooking(booking: Omit<Booking, "id" | "createdAt" | "statusFlag">): Promise<Booking | null> {
  console.log("Adding booking:", booking);
  const dbBooking = {
    name: booking.name,
    email: booking.email,
    company_name: booking.companyName,
    country: booking.country,
    product_interest: booking.productInterest,
    inquiry_type: booking.inquiryType,
    message: booking.message,
    customer_type: booking.customerType,
    date: booking.date,
    time: booking.time,
    meeting_with: booking.meetingWith || '담당자 미선택',
    // Only stamp edition_id when provided; otherwise let the DB default apply
    ...(booking.editionId !== undefined ? { edition_id: booking.editionId } : {}),
  };
  console.log("DB Payload:", dbBooking);

  try {
    console.log("Sending request to Supabase...");
    // 8초 타임아웃은 유지하되, 실패 시 에러를 던지도록 수정
    const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error("Request timeout")), ms));
    const resp: any = await Promise.race([
      supabase.from("bookings").insert([dbBooking]).select(),
      timeout(8000),
    ]);
    
    const { data, error } = resp || {};
    console.log("Supabase response:", { data, error });

    if (error) {
      console.error("Supabase Error adding booking:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error("No data returned from insert");
      throw new Error("Insert failed to return data");
    }

    const b = data[0];
    console.log("Booking added successfully:", b);

    return {
      id: b.id,
      name: b.name,
      email: b.email,
      companyName: b.company_name,
      country: b.country,
      productInterest: b.product_interest,
      inquiryType: b.inquiry_type,
      message: b.message,
      customerType: b.customer_type,
      date: b.date,
      time: b.time,
      createdAt: b.created_at,
      meetingWith: b.meeting_with || '담당자 미선택',
      editionId: b.edition_id,
    };
  } catch (e) {
    console.error("Exception in addBooking:", e);
    throw e; // Fail loudly
  }
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<void> {
  const snakeCaseUpdates: any = {};
  if (updates.name) snakeCaseUpdates.name = updates.name;
  if (updates.email) snakeCaseUpdates.email = updates.email;
  if (updates.companyName) snakeCaseUpdates.company_name = updates.companyName;
  if (updates.country) snakeCaseUpdates.country = updates.country;
  if (updates.productInterest) snakeCaseUpdates.product_interest = updates.productInterest;
  if (updates.inquiryType) snakeCaseUpdates.inquiry_type = updates.inquiryType;
  if (updates.message) snakeCaseUpdates.message = updates.message;
  if (updates.customerType) snakeCaseUpdates.customer_type = updates.customerType;
  if (updates.date) snakeCaseUpdates.date = updates.date;
  if (updates.time) snakeCaseUpdates.time = updates.time;
  if (updates.meetingWith) snakeCaseUpdates.meeting_with = updates.meetingWith;

  const { error } = await supabase.from("bookings").update(snakeCaseUpdates).eq("id", id);
  if (error) {
    console.error("Error updating booking:", error);
    throw error;
  }
}

export async function isSlotAvailable(editionId: string, date: string, time: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("edition_id", editionId)
    .eq("date", date)
    .eq("time", time);

  if (error) {
    console.error("Error checking availability:", error);
    return false; // Fail safe prevents double booking on error.
  }

  return data.length === 0;
}

export async function getBookingsByDate(editionId: string | undefined, date: string): Promise<Booking[]> {
  let query = supabase
    .from("bookings")
    .select("*")
    .eq("date", date);

  if (editionId) {
    query = query.eq("edition_id", editionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bookings by date:", error);
    return [];
  }

  return data.map((b: any) => ({
    id: b.id,
    name: b.name,
    email: b.email,
    companyName: b.company_name,
    country: b.country,
    productInterest: b.product_interest,
    inquiryType: b.inquiry_type,
    message: b.message,
    customerType: b.customer_type,
    date: b.date,
    time: b.time,
    createdAt: b.created_at,
    meetingWith: b.meeting_with || '담당자 미선택',
    editionId: b.edition_id,
  }));
}

export async function getBookingsByEmail(editionId: string | undefined, email: string): Promise<Booking[]> {
  const sanitized = email.trim();
  let query = supabase
    .from("bookings")
    .select("*")
    .ilike("email", sanitized) // Use case-insensitive match to catch different capitalizations
    .order("created_at", { ascending: false });

  if (editionId) {
    query = query.eq("edition_id", editionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching bookings by email:", error);
    return [];
  }

  return data.map((b: any) => ({
    id: b.id,
    name: b.name,
    email: b.email,
    companyName: b.company_name,
    country: b.country,
    productInterest: b.product_interest,
    inquiryType: b.inquiry_type,
    message: b.message,
    customerType: b.customer_type,
    date: b.date,
    time: b.time,
    createdAt: b.created_at,
    meetingWith: b.meeting_with || '담당자 미선택',
    editionId: b.edition_id,
  }));
}

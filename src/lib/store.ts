import { supabase } from "./supabase";
import { Booking } from "./types";

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

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
  }));
}

export async function addBooking(booking: Omit<Booking, "id" | "createdAt">): Promise<Booking | null> {
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

  const { error } = await supabase.from("bookings").update(snakeCaseUpdates).eq("id", id);
  if (error) {
    console.error("Error updating booking:", error);
    throw error;
  }
}

export async function isSlotAvailable(date: string, time: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("date", date)
    .eq("time", time);

  if (error) {
    console.error("Error checking availability:", error);
    return false; // Fail safe prevents double booking on error.
  }

  return data.length === 0;
}

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("date", date);

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
  }));
}

export async function getBookingsByEmail(email: string): Promise<Booking[]> {
  const sanitized = email.trim();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .ilike("email", sanitized) // Use case-insensitive match to catch different capitalizations
    .order("created_at", { ascending: false });

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
  }));
}

import { format, parseISO } from "date-fns";
import type { Booking, Edition } from "./types";

export const NO_HOST = "담당자 미선택";
export type HostAction = "assigned" | "unassigned" | "updated" | "cancelled";

export function hasHost(host?: string | null): host is string {
  return !!host && host !== NO_HOST;
}

// Internal email to the meeting host. Fire-and-forget: never blocks the booking change.
export function notifyHost(
  action: HostAction,
  host: string,
  booking: Pick<Booking, "name" | "email" | "companyName" | "country" | "inquiryType" | "productInterest" | "message" | "date" | "time">,
  edition?: Pick<Edition, "name" | "booth" | "location"> | null
) {
  return fetch("/api/notify-host", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      host,
      customer_name: booking.name,
      customer_email: booking.email,
      company: booking.companyName,
      country: booking.country,
      inquiry_type: booking.inquiryType,
      product: booking.productInterest,
      message: booking.message ?? "",
      date: booking.date,
      time: booking.time,
      exhibition: edition?.name ?? "",
      booth: edition?.booth ?? "",
      location: edition?.location ?? "",
    }),
  }).catch(e => console.error(`Failed to notify host (${action}):`, e));
}

interface EmailParams {
  name: string;
  email: string;
  companyName: string;
  country: string;
  inquiryType: string;
  date: string;
  time: string;
  bookingId: string;
  eventKey: string;
  year: number;
  exhibitionName: string;
  booth?: string;
  location?: string;
}

export async function sendConfirmationEmail({ name, email, companyName, country, inquiryType, date, time, eventKey, year, exhibitionName, booth, location }: EmailParams) {
  try {
    const formattedDate = format(parseISO(date), "MMMM d, yyyy"); // "March 10, 2026"
    
    // Call Vercel Function (API Route)
    // Requirement 4: Call Stibee API via Server Proxy
    const response = await fetch("/api/send-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber: email,
        name,
        company: companyName,
        country,
        inquiry_type: inquiryType,
        meeting_date: formattedDate,
        meeting_time: time,
        manage_link: `${window.location.origin}/${eventKey}/${year}/my-booking`,
        exhibition: exhibitionName,
        booth: booth ?? "",
        location: location ?? "",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }
    
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    // Requirement 8: Fail silently to user, log error
    return false;
  }
}

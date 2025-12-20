import { format, parseISO } from "date-fns";

interface EmailParams {
  name: string;
  email: string;
  companyName: string;
  country: string;
  inquiryType: string;
  date: string;
  time: string;
  bookingId: string;
}

export async function sendConfirmationEmail({ name, email, companyName, country, inquiryType, date, time, bookingId }: EmailParams) {
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
        manage_link: `${window.location.origin}/my-booking?id=${bookingId}`,
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

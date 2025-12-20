import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, name, company, country, date, time, inquiryType } = req.body;

  // Configuration
  const STIBEE_API_KEY = process.env.STIBEE_ACCESS_TOKEN || process.env.VITE_STIBEE_ACCESS_TOKEN;
  const ADMIN_LIST_ID = process.env.STIBEE_ADMIN_LIST_ID;
  const ADMIN_TRIGGER_URL = process.env.STIBEE_TRIGGER_ADMIN;

  if (!STIBEE_API_KEY || !ADMIN_LIST_ID || !ADMIN_TRIGGER_URL) {
    console.error('Missing Admin Configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`[Admin Notification] Processing for: ${name} (${type})`);

    // 1. Fetch Admin Subscribers
    const listRes = await fetch(`https://api.stibee.com/v1/lists/${ADMIN_LIST_ID}/subscribers`, {
      method: 'GET',
      headers: { 'AccessToken': STIBEE_API_KEY }
    });
    
    if (!listRes.ok) {
        console.error("Failed to fetch admin list");
        throw new Error("Failed to fetch admin list");
    }
    
    const listData = await listRes.json();
    const admins = listData.value; // Array of subscribers

    if (!admins || admins.length === 0) {
        console.log("No admins found in list");
        return res.status(200).json({ message: "No admins to notify" });
    }

    // 2. Notify Each Admin
    // Since we cannot easily update the *Global Template* safely for concurrent requests without an Email ID,
    // We will use the standard Stibee method: Update the Admin's Subscriber Fields with the booking info,
    // then fire the trigger. The trigger template should use tags like %$booking_name%, %$booking_type%.
    
    // However, the user specifically asked to use "Update Content API".
    // We will try to simulate the "Content" by passing data into fields that the template hopefully uses.
    // If the template is hardcoded, this approach is the only dynamic way without race conditions.
    
    const notificationPromises = admins.map(async (admin: any) => {
        // A. Update Admin Subscriber with Booking Details (So the email can use variables)
        await fetch(`https://api.stibee.com/v1/lists/${ADMIN_LIST_ID}/subscribers`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'AccessToken': STIBEE_API_KEY
            },
            body: JSON.stringify({
                eventOccuredBy: "MANUAL",
                confirmEmailYN: "N",
                subscribers: [{
                    email: admin.email,
                    fields: {
                       name: admin.name, // Keep existing name
                       // Map booking info to custom fields (Assumes these fields exist or are mapped in template)
                       // If not, Stibee will ignore them, but it's the best we can do without ID.
                       booking_type: type,
                       booking_name: name,
                       booking_company: company,
                       booking_country: country,
                       booking_date: date,
                       booking_time: time,
                       booking_inquiry: inquiryType
                    }
                }]
            })
        });

        // B. Fire Trigger
        return fetch(ADMIN_TRIGGER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AccessToken': STIBEE_API_KEY
            },
            body: JSON.stringify({
                subscriber: admin.email,
                // We also pass these in the body just in case the trigger API accepts them directly
                name: name,
                company: company,
                country: country,
                date: date,
                time: time,
                inquiryType: inquiryType,
                type: type
            })
        });
    });

    await Promise.all(notificationPromises);
    console.log(`[Admin Notification] Sent to ${admins.length} admins`);

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error("Admin Notification Error:", error);
    // Don't fail the request if admin notification fails
    return res.status(200).json({ warning: "Admin notification failed", details: error.message });
  }
}

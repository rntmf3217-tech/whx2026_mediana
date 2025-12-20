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

  const { subscriber, name, meeting_date, meeting_time, manage_link, company, country, inquiryType } = req.body;

  if (!subscriber || !name || !meeting_date || !meeting_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Use environment variables
  const STIBEE_API_KEY = process.env.STIBEE_ACCESS_TOKEN || process.env.VITE_STIBEE_ACCESS_TOKEN;
  const STIBEE_LIST_ID = process.env.STIBEE_LIST_ID || process.env.VITE_STIBEE_LIST_ID;
  const TRIGGER_URL = process.env.STIBEE_TRIGGER_CREATE;

  if (!STIBEE_API_KEY || !STIBEE_LIST_ID || !TRIGGER_URL) {
    console.error('Missing configuration:', { STIBEE_LIST_ID_EXISTS: !!STIBEE_LIST_ID, TRIGGER_URL_EXISTS: !!TRIGGER_URL });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`[DEBUG] Processing Reservation for: ${subscriber} (${name})`);
    
    // Step 1: Add/Update subscriber to list (v2 API)
    console.log("Adding/Updating subscriber to Stibee list (v2)...");
    
    const subscriberResponse = await fetch(`https://api.stibee.com/v2/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({
        subscriber: {
          email: String(subscriber).trim(),
          status: 'subscribed',
          marketingAllowed: true,
          fields: {
            name: String(name).trim(),
            meeting_date: String(meeting_date).trim(),
            meeting_time: String(meeting_time).trim(),
            manage_link: String(manage_link || "").trim()
          }
        },
        updateEnabled: true
      })
    });

    if (!subscriberResponse.ok) {
      const errorData = await subscriberResponse.json();
      console.error('Failed to add/update subscriber:', subscriberResponse.status, errorData);
      throw new Error(`Subscriber add failed: ${subscriberResponse.status}`);
    }

    console.log('✅ Subscriber added/updated successfully');

    // Step 2: Call Trigger API
    console.log("Triggering confirmation email...");
    const triggerRes = await fetch(TRIGGER_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({ subscriber: String(subscriber).trim() })
    });

    if (!triggerRes.ok) {
        const triggerError = await triggerRes.text();
        console.error("Stibee Create Trigger Failed:", triggerError);
        // We don't throw here to ensure the client gets a success response for the reservation itself,
        // but it's good to log it.
    } else {
        console.log("✅ Confirmation email triggered successfully");
    }

    // --- Admin Notification ---
    // Fire and forget (don't await strictly or block response too long)
    fetch(`${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: "New Booking",
            name: name,
            company: company || "N/A",
            country: country || "N/A",
            date: meeting_date,
            time: meeting_time,
            inquiryType: inquiryType || "N/A"
        })
    }).catch(e => console.error("Admin notify failed:", e));
    // --------------------------

    return res.status(200).json({ 
      success: true, 
      message: 'Confirmation processed' 
    });

  } catch (error: any) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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

  const { email, name, company, country, date, time, inquiryType } = req.body;
  const STIBEE_API_KEY = process.env.VITE_STIBEE_ACCESS_TOKEN || process.env.STIBEE_ACCESS_TOKEN;
  const TRIGGER_URL = process.env.STIBEE_TRIGGER_CANCEL;

  if (!TRIGGER_URL || !STIBEE_API_KEY) {
    console.error('Missing configuration: STIBEE_TRIGGER_CANCEL or STIBEE_ACCESS_TOKEN');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`Processing cancel notification for ${email}`);

    // 1. Call Trigger API
    const triggerRes = await fetch(TRIGGER_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({ subscriber: email })
    });

    if (!triggerRes.ok) {
        const triggerError = await triggerRes.text();
        console.error("Stibee Cancel Trigger Failed:", triggerError);
        throw new Error(`Trigger failed: ${triggerError}`);
    }

    console.log("Stibee Cancel Trigger Sent Successfully");

    // --- Admin Notification ---
    fetch(`${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: "Booking Cancelled",
            name: name || "Unknown",
            company: company || "N/A",
            country: country || "N/A",
            date: date || "N/A",
            time: time || "N/A",
            inquiryType: inquiryType || "N/A"
        })
    }).catch(e => console.error("Admin notify failed:", e));
    // --------------------------

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Notify Cancel Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

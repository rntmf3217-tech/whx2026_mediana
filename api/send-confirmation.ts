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

  const { subscriber, name, meeting_date, meeting_time, manage_link } = req.body;

  if (!subscriber || !name || !meeting_date || !meeting_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Use environment variables
  const STIBEE_API_KEY = process.env.STIBEE_ACCESS_TOKEN || "58c4936ec3b11ed206fa744bccde14cace1fafe71ed93b49b8b2ead92bbc0fe1c692fe09193ea4b4fd53fb30b83c2d1008f01572144a7f9a4b4b26059102ab07";
  const STIBEE_LIST_ID = (process.env.STIBEE_LIST_ID || "461332").trim();

  try {
    console.log(`[DEBUG] Processing Reservation for: ${subscriber} (${name})`);
    
    // Step 1: Add subscriber to list (v2 API)
    console.log("Adding subscriber to Stibee list (v2)...");
    
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
      console.error('Failed to add subscriber:', subscriberResponse.status, errorData);
      throw new Error(`Subscriber add failed: ${subscriberResponse.status}`);
    }

    console.log('✅ Subscriber added successfully - Email will be sent automatically by Stibee');

    return res.status(200).json({ 
      success: true, 
      message: 'Confirmation email queued' 
    });

  } catch (error: any) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

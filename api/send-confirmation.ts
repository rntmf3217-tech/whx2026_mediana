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

  const STIBEE_API_URL = process.env.STIBEE_API_URL;
  const STIBEE_API_KEY = process.env.STIBEE_API_KEY;

  if (!STIBEE_API_URL || !STIBEE_API_KEY) {
    console.error("Missing Stibee configuration");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(STIBEE_API_URL, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber,
        name,
        meeting_date,
        meeting_time,
        manage_link: manage_link || "https://whx-reservation.vercel.app"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stibee API Error:", errorText);
      // Log error but return 500 to indicate failure to client logger
      return res.status(500).json({ error: 'Failed to send email' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

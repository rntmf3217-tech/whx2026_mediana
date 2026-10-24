import type { VercelRequest, VercelResponse } from '@vercel/node';
import { format, parseISO } from 'date-fns';

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

  const { email, name, date, time, exhibition, booth, location } = req.body;
  const STIBEE_API_KEY = process.env.VITE_STIBEE_ACCESS_TOKEN || process.env.STIBEE_ACCESS_TOKEN;
  const STIBEE_LIST_ID = process.env.VITE_STIBEE_LIST_ID || process.env.STIBEE_LIST_ID;
  const TRIGGER_URL = process.env.STIBEE_TRIGGER_CANCEL;

  if (!TRIGGER_URL || !STIBEE_API_KEY) {
    console.error('Missing configuration: STIBEE_TRIGGER_CANCEL or STIBEE_ACCESS_TOKEN');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`Processing cancel notification for ${email}`);

    // 0. Re-stamp THIS booking's fields (incl. exhibition/booth/location) before
    // triggering, so the cancel email shows the correct exhibition/date even when
    // the same customer has bookings in other editions (one Stibee record per email).
    // Best-effort: never block the cancel if this fails.
    if (STIBEE_LIST_ID) {
      let meetingDate = date;
      try { if (date) meetingDate = format(parseISO(date), "MMMM d, yyyy"); } catch { /* keep raw value */ }
      try {
        await fetch(`https://api.stibee.com/v2/lists/${STIBEE_LIST_ID}/subscribers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'AccessToken': STIBEE_API_KEY },
          body: JSON.stringify({
            subscriber: {
              email,
              fields: {
                ...(name !== undefined && { name: String(name).trim() }),
                ...(date !== undefined && { meeting_date: meetingDate }),
                ...(time !== undefined && { meeting_time: String(time).trim() }),
                ...(exhibition !== undefined && { exhibition: String(exhibition).trim() }),
                ...(booth !== undefined && { booth: String(booth).trim() }),
                ...(location !== undefined && { location: String(location).trim() })
              }
            },
            updateEnabled: true
          })
        });
      } catch (e) {
        console.error("Cancel re-stamp failed (continuing to trigger):", e);
      }
    }

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
    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Notify Cancel Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

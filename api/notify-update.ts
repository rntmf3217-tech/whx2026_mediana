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

  const { email, name, date, time, exhibition, booth, location, company, country, inquiry_type } = req.body;
  const STIBEE_API_KEY = process.env.VITE_STIBEE_ACCESS_TOKEN || process.env.STIBEE_ACCESS_TOKEN;
  const STIBEE_LIST_ID = process.env.VITE_STIBEE_LIST_ID || process.env.STIBEE_LIST_ID;
  const TRIGGER_URL = process.env.STIBEE_TRIGGER_UPDATE;

  // Admin Notification Config
  const ADMIN_LIST_ID = process.env.STIBEE_ADMIN_LIST_ID || "461812";
  const ADMIN_TRIGGER_URL = process.env.STIBEE_TRIGGER_ADMIN_UPDATE;
  const SITE_URL = process.env.SITE_URL || "https://reservation.mediana-global.com";

  if (!STIBEE_API_KEY || !STIBEE_LIST_ID || !TRIGGER_URL) {
    console.error('Missing configuration:', { STIBEE_LIST_ID, TRIGGER_URL_EXISTS: !!TRIGGER_URL });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`Processing update notification for ${email}`);

    // Format date to match the confirmation email ("November 16, 2026")
    let meetingDate = date;
    try { if (date) meetingDate = format(parseISO(date), "MMMM d, yyyy"); } catch { /* keep raw value */ }

    // 1. Update Subscriber Info (v2 API)
    // Re-stamp THIS booking's fields (incl. exhibition/booth/location) right
    // before triggering, so the email is correct even when the same customer
    // has bookings in other editions (Stibee keeps one record per email).
    const updateRes = await fetch(`https://api.stibee.com/v2/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({
        subscriber: {
          email,
          fields: {
            name: name || undefined, // Optional update if name is provided
            meeting_date: meetingDate,
            meeting_time: time,
            // Only re-stamp when provided, so a stale client never blanks a good value
            ...(exhibition !== undefined && { exhibition: String(exhibition).trim() }),
            ...(booth !== undefined && { booth: String(booth).trim() }),
            ...(location !== undefined && { location: String(location).trim() })
          }
        },
        updateEnabled: true // Explicitly enable update
      })
    });

    if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error("Stibee Subscriber Update Failed:", errorText);
        // We log but might want to continue or stop?
        // User requirement: "예약 변경 시에는 구독자 정보 업데이트 후 트리거 호출"
        // If update fails, trigger might send old info?
        // But let's proceed to try triggering, as the email itself might be generic or pull from recent DB sync?
        // Actually Stibee emails pull from subscriber fields. If update fails, email will have wrong date.
        // But user said "이메일 발송 실패 시에도 예약 변경/취소는 정상 처리되어야 함".
        // Here we are inside the email API. If this fails, the frontend booking update is already done.
    } else {
        console.log("Stibee Subscriber Updated Successfully");
    }

    // 2. Call Trigger API
    const triggerRes = await fetch(TRIGGER_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({ subscriber: email })
    });

    // 3. Admin Notification (best-effort; never fails the request)
    if (ADMIN_TRIGGER_URL && ADMIN_LIST_ID) {
        try {
            const adminListRes = await fetch(`https://api.stibee.com/v2/lists/${ADMIN_LIST_ID}/subscribers?limit=50`, {
                method: 'GET',
                headers: { 'AccessToken': STIBEE_API_KEY }
            });

            if (adminListRes.ok) {
                const admins: { email: string }[] = (await adminListRes.json()) || [];
                console.log(`Found ${admins.length} admins to notify.`);

                await Promise.all(admins.map(async (admin) => {
                    const adminTriggerRes = await fetch(ADMIN_TRIGGER_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'AccessToken': STIBEE_API_KEY
                        },
                        body: JSON.stringify({
                            subscriber: admin.email,
                            name: String(name || "").trim(),
                            company: String(company || "").trim(),
                            country: String(country || "").trim(),
                            inquiry_type: String(inquiry_type || "").trim(),
                            meeting_date: meetingDate,
                            meeting_time: String(time || "").trim(),
                            manage_link: `${SITE_URL}/admin`,
                            exhibition: String(exhibition || "").trim(),
                            booth: String(booth || "").trim(),
                            location: String(location || "").trim()
                        })
                    });

                    if (!adminTriggerRes.ok) {
                        console.error(`Failed to notify admin ${admin.email}:`, await adminTriggerRes.text());
                    }
                }));
                console.log("✅ Admin update notifications processed.");
            } else {
                console.error("Failed to fetch admin list:", await adminListRes.text());
            }
        } catch (adminError) {
            console.error("Error in Admin Notification flow:", adminError);
        }
    } else {
        console.log("Skipping Admin Notification: Missing configuration");
    }

    if (!triggerRes.ok) {
        const triggerError = await triggerRes.text();
        console.error("Stibee Trigger Failed:", triggerError);
        throw new Error(`Trigger failed: ${triggerError}`);
    }

    console.log("Stibee Update Trigger Sent Successfully");
    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Notify Update Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

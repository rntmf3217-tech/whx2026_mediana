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

  // Stibee v2 API 설정
  const STIBEE_BASE_URL = "https://api.stibee.com/v2";
  // 사용자가 제공한 v2 API Key (우선순위 높음)
  const STIBEE_API_KEY_V2 = "58c4936ec3b11ed206fa744bccde14cace1fafe71ed93b49b8b2ead92bbc0fe1c692fe09193ea4b4fd53fb30b83c2d1008f01572144a7f9a4b4b26059102ab07";
  const STIBEE_LIST_ID = (process.env.STIBEE_LIST_ID || "461332").trim();

  // 디버깅: 키 앞부분 확인
  const keyPrefix = STIBEE_API_KEY_V2.substring(0, 4);
  console.log(`[DEBUG V2] Using v2 API. Key Prefix: ${keyPrefix}****, List ID: ${STIBEE_LIST_ID}`);

  try {
    // 1. 구독자 추가 (v2 API)
    console.log("Step 1: Adding subscriber to Stibee v2...");
    
    const subscriberPayload = {
      eventOccuredBy: 'SUBSCRIBER', // 구독자가 직접 입력
      confirmEmailYN: 'N',         // 확인 이메일 발송 여부
      subscribers: [
        {
          email: String(subscriber).trim(),
          name: String(name).trim(),
          // 사용자 정의 필드 (예약 정보)
          $meeting_date: String(meeting_date).trim(),
          $meeting_time: String(meeting_time).trim(),
          $manage_link: String(manage_link || "").trim(),
          $status: 'RESERVED'
        }
      ]
    };

    console.log("Payload:", JSON.stringify(subscriberPayload));

    const response = await fetch(`${STIBEE_BASE_URL}/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY_V2,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriberPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Stibee v2 API Error: ${response.status} ${errorText}`);
      throw new Error(`Stibee API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Stibee v2 Subscriber Added:", data);

    return res.status(200).json({ 
      success: true, 
      message: "Reservation confirmed and confirmation email sent (via Stibee Auto-Mail).",
      data: data 
    });

  } catch (error: any) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

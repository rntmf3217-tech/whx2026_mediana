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
  // 주소록 ID는 환경변수에서 가져오거나, 없으면 기본값(예: 461332)을 사용
  const STIBEE_LIST_ID = process.env.STIBEE_LIST_ID || "461332";

  if (!STIBEE_API_URL || !STIBEE_API_KEY) {
    console.error("Missing Stibee configuration");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 1. 구독자 추가 (Add Subscriber)
    // 이미 있는 경우 업데이트됨
    const addSubscriberResponse = await fetch(`https://stibee.com/api/v1.0/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventOccuredBy: "MANUAL", // 수동 입력으로 처리
        confirmEmailYN: "N", // 확인 메일 발송 안 함 (바로 구독)
        subscribers: [
          {
            email: subscriber,
            name: name
          }
        ]
      })
    });

    // 구독자 추가 실패 시 로그만 남기고 계속 진행 (이미 있거나 오류 발생 시에도 발송 시도)
    if (!addSubscriberResponse.ok) {
      const errorText = await addSubscriberResponse.text();
      console.warn("Subscriber add warning:", errorText);
    }

    // 2. 자동 메일 발송 (Send Auto Email)
    const response = await fetch(STIBEE_API_URL, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber,
        name
        // meeting_date, meeting_time, manage_link 제거 (에러 방지용)
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

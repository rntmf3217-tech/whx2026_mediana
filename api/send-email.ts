import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { name, email, date, time, bookingId } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // SMTP Transporter setup
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email Content
    const bookingLink = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'}/my-booking/${bookingId}`;
    const subject = 'Meeting Confirmation – MEDIANA | WHX Dubai 2026';
    const body = `
Dear ${name},

Thank you for scheduling a meeting with MEDIANA.
Your meeting has been successfully confirmed with the details below.

Meeting Details
• Exhibition: WHX Dubai 2026
• Date: ${date}
• Time: ${time}
• Location: Dubai Exhibition Centre, Booth No #N27.B58

If you need to reschedule or cancel your meeting, please use the link below:
${bookingLink}

Should you have any questions prior to the meeting, feel free to contact us at info@mediana.co.kr.

We look forward to seeing you at the exhibition.

Best regards,
MEDIANA Team
www.mediana-global.com
    `;

    // Send Email
    await transporter.sendMail({
      from: `"MEDIANA Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      text: body,
    });

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ message: 'Failed to send email', error: (error as Error).message });
  }
}

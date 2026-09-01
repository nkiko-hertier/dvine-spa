import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SPA_EMAIL = 'dvinespa2@gmail.com';
const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${SPA_EMAIL}`;

export default async function(req) {
  try {
    // Keep the client initialized so the endpoint is tied to the app/auth context.
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = (body?.name || '').toString().trim();
    const email = (body?.email || '').toString().trim();
    const phone = (body?.phone || '').toString().trim();
    const message = (body?.message || '').toString().trim();
    const treatment = (body?.treatment || '').toString().trim();

    if (!name || !email || !message) {
      return Response.json({ error: 'Name, email and message are required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const payload = {
      _subject: `New Booking Inquiry · D'vine Spa Website`,
      _template: 'table',
      _captcha: 'false',
      Name: name,
      Email: email,
      Phone: phone || 'Not provided',
      Treatment: treatment || 'Not provided',
      Message: message,
    };

    const upstream = await fetch(FORMSUBMIT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let result = null;
    try { result = JSON.parse(text); } catch { result = { message: text }; }

    if (!upstream.ok || result?.success === 'false') {
      return Response.json({ error: result?.message || 'Email delivery failed' }, { status: 502 });
    }

    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to send booking inquiry' }, { status: 500 });
  }
}
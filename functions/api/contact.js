/**
 * Cloudflare Pages Function: /api/contact
 *
 * Proxies form submissions to Make.com so the webhook URL
 * never appears in client-side code.
 *
 * SETUP — add this env var in Cloudflare Pages dashboard:
 *   Settings → Environment variables → MAKE_WEBHOOK_URL
 *   Value: https://hook.eu1.make.com/5ar38jn3reo7x568lju1ph9xs0vd4p2f
 *
 * For local dev with `wrangler pages dev`:
 *   Create a .dev.vars file (git-ignored) with:
 *   MAKE_WEBHOOK_URL=https://hook.eu1.make.com/5ar38jn3reo7x568lju1ph9xs0vd4p2f
 */

const ALLOWED_ORIGINS = [
  'https://rodgers-plumbing.com.au',
  'https://www.rodgers-plumbing.com.au',
  // Local dev — remove before going live if you want to be strict
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];

const MAX_LENGTHS = { name: 100, email: 254, suburb: 100, message: 2000 };

/** Strip HTML tags and dangerous characters */
function sanitise(str) {
  return String(str || '')
    .trim()
    .replace(/<[^>]*>/g, '')   // strip tags
    .replace(/[<>]/g, '');     // remove any stragglers
}

/** Minimal RFC-5322 email check */
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ── POST /api/contact ─────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';

  // 1. Origin check — reject anything not from our domain
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: 'Forbidden' }, 403);
  }

  const cors = { 'Access-Control-Allow-Origin': origin };

  // 2. Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, cors);
  }

  // 3. Honeypot — bots fill every field; humans never see "website"
  //    Silently succeed so bots don't know they were blocked.
  if (body.website) {
    return json({ ok: true }, 200, cors);
  }

  // 4. Sanitise and enforce length limits
  const name    = sanitise(body.name).slice(0, MAX_LENGTHS.name);
  const email   = sanitise(body.email).slice(0, MAX_LENGTHS.email);
  const suburb  = sanitise(body.suburb).slice(0, MAX_LENGTHS.suburb);
  const message = sanitise(body.message).slice(0, MAX_LENGTHS.message);

  // 5. Server-side validation
  if (!name)              return json({ error: 'Name is required' }, 400, cors);
  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400, cors);

  // 6. Webhook URL from env — never in source code
  const webhookUrl = env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('MAKE_WEBHOOK_URL env var not set');
    return json({ error: 'Server configuration error' }, 500, cors);
  }

  // 7. Forward sanitised payload to Make.com
  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, suburb, message }),
    });

    if (!upstream.ok) {
      console.error(`Make.com webhook returned ${upstream.status}`);
      throw new Error('Upstream error');
    }

    return json({ ok: true }, 200, cors);
  } catch (err) {
    console.error('Webhook error:', err);
    return json({ error: 'Failed to send — please try again or call David directly.' }, 500, cors);
  }
}

// ── OPTIONS preflight ─────────────────────────────────────────────────────────
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// POST /api/extract  { text, products: string[] }  ->  { draft }
// Requires a signed-in Yara user (Supabase JWT in Authorization: Bearer ...).
// Env vars (Vercel -> Settings -> Environment Variables):
//   ANTHROPIC_API_KEY   (required, server-side only; never put it in index.html)
//   ANTHROPIC_MODEL     (optional, default claude-haiku-5-5)
const { extractDraft } = require('./_extract-core');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://acgojmfvpnnaqzrazyvt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_UEn6HH6AEVcah6I7OFvCKA_BjpqRMsk';

// Best-effort per-user limit (resets when the serverless instance restarts).
const hits = new Map();
const LIMIT = 40, WINDOW_MS = 60 * 60 * 1000;
function allowed(uid) {
  const now = Date.now();
  const arr = (hits.get(uid) || []).filter(t => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) { hits.set(uid, arr); return false; }
  arr.push(now); hits.set(uid, arr); return true;
}

async function getUser(token) {
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'ابتدا وارد حساب شو' });
  let user;
  try { user = await getUser(token); } catch (e) { return res.status(502).json({ error: 'بررسی ورود انجام نشد' }); }
  if (!user) return res.status(401).json({ error: 'نشست ورود معتبر نیست؛ دوباره وارد شو' });
  if (!allowed(user.id)) return res.status(429).json({ error: 'تعداد درخواست زیاد بود؛ کمی بعد دوباره امتحان کن' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const text = body && typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 10) return res.status(400).json({ error: 'متن گفتگو خیلی کوتاه است' });
  if (text.length > 8000) return res.status(400).json({ error: 'متن خیلی بلند است؛ فقط بخش مربوط به سفارش را بچسبان' });
  const products = (Array.isArray(body.products) ? body.products : []).filter(p => typeof p === 'string').map(p => p.slice(0, 140)).slice(0, 80);

  try {
    const draft = await extractDraft(text, products);
    return res.status(200).json({ draft });
  } catch (e) {
    // Never log chat text (customer names/addresses).
    console.error('extract failed:', e && e.message);
    const status = e && e.status === 500 ? 500 : 502;
    return res.status(status).json({ error: status === 500 ? 'سرور هنوز تنظیم نشده است' : 'خواندن گفتگو ناموفق بود؛ دوباره امتحان کن یا دستی ثبت کن' });
  }
};

Yara Assist V8 - MVP (status link + "paste chat -> order draft" + stuck-order alert)

WHAT'S NEW
1) Status link: every order gets an unguessable token. Orders page -> "لینک وضعیت" copies a ready
   message with the link (+ tracking code). The customer opens /s/<token> and sees a 6-step timeline
   and the tracking code. The page shows NO phone, address, price or notes.
2) Paste chat -> order draft: dashboard button "گفتگوی دایرکت را بچسبان…" (and "✦ از گفتگو" on the
   orders page). Claude reads the pasted chat and pre-fills the normal order form. The seller always
   reviews and presses save. Yellow fields = must check. Chat text is not stored.
3) Stuck-order alert: paid / preparing / ready orders with no status change for >48h appear first
   in "پیگیری‌ها" and on the dashboard (red priority).
4) Measurement columns: link_copied_at, link_views, link_last_viewed_at, status_changed_at.

FILES
  index.html                      replace the deployed root index.html (V7.2 -> V8)
  status.html                     NEW, root of the repo
  vercel.json                     NEW rewrite /s/:token -> /status.html  (MERGE if you already have one)
  api/extract.js, api/_extract-core.js   NEW serverless function (Vercel auto-detects /api)
  yara-assist-v8-migration.sql    run once in Supabase SQL Editor
  eval/                           accuracy check for the chat->draft step

DEPLOY (staging first, ~45 min)
 1. Back up index.html and the database.
 2. Supabase SQL Editor: run yara-assist-v8-migration.sql. Then run the two "Quick checks" at its end.
 3. Vercel -> Project -> Settings -> Environment Variables:
      ANTHROPIC_API_KEY = <your key>      (server-side only; never put it in index.html)
      ANTHROPIC_MODEL   = claude-haiku-5-5   (optional; this is the default; use claude-sonnet-5-5 if accuracy is low)
    Redeploy after adding variables.
 4. Copy the files into the repo root, commit, push, wait for the deployment.
 5. Test (checklist below).

TEST CHECKLIST
 [ ] Open an order -> "لینک وضعیت" -> paste into notes app -> open on a phone: timeline + tracking code show.
 [ ] Change the order's status -> reload the link: updated. Open a made-up token: friendly "not found".
 [ ] Orders list shows "مشتری لینک را دید" after you open the link (note: your own opens count too).
 [ ] Set an order to "پرداخت‌شده", then in SQL: update orders set status_changed_at = now() - interval '3 days'
     where id = '<id>';  -> it appears red in پیگیری‌ها.
 [ ] Paste a real chat -> draft appears -> fix yellow fields -> save. Try: a chat with no order (only "کجاست؟"),
     a chat with a Latin name spelling, a chat with a price like "۲۶۰ هزار".
 [ ] Signed-out call: curl -X POST https://<your-app>/api/extract  -> must return 401.

ACCURACY CHECK (do this before onboarding sellers)
 ANTHROPIC_API_KEY=... node eval/run-eval.js
 conversations.json = the 72 DMs from the data pack. 19 order chats + 31 non-order chats are labeled
 mechanically (their text is templated); 22 (custom orders, "same as last time") need HAND labels.
 Gate from the report: >=90% name/quantity -> ship; <80% -> fall back to the plain form for that step.

MEASURE THE PILOT (SQL, per shop)
 -- stuck orders (should trend to 0)
 select shop_id, count(*) filter (where status in ('paid','making','ready')
        and status_changed_at < now() - interval '48 hours') as stuck, count(*) as total
 from orders where created_at > now() - interval '28 days' group by 1;
 -- is the link actually used?
 select shop_id, count(*) filter (where link_copied_at is not null) as links_sent, sum(link_views) as views
 from orders where created_at > now() - interval '28 days' group by 1;

KNOWN LIMITS / HONEST NOTES
 - I could not run this against your real Supabase project or the Anthropic API from here. Tested:
   JS syntax, extraction validation + API handler with mocks, status page and draft logic in a browser
   with a stubbed Supabase. Test on staging.
 - The existing RPC yara_save_order_with_items was not provided, so it is untouched. New columns have
   defaults, so it should keep working. Instagram username from a chat is saved inside the order notes
   (orders has no such column).
 - The draft uses the active product catalog; if a product isn't matched it becomes a custom line with
   an empty price (you must enter it).
 - The rate limit in api/extract.js is per serverless instance (best effort). Add a daily cap in the
   Anthropic console for a hard limit.
 - Customer's first name appears on the status page; anyone who has the link can see it. Tokens are 32 hex
   chars (random), not sequential.
 - Not included (by design): sending messages automatically, reading Instagram DMs, screenshots/images
   (text paste only), reorder reminders (week 2).

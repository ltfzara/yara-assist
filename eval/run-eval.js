// node eval/run-eval.js        (needs ANTHROPIC_API_KEY)  -> field accuracy on labeled conversations
// Labels: "order"/"no_order" were derived mechanically from the data pack's templated DMs.
// "skip" ones (custom orders, repeat customers) need HAND labels: add "expected" and set kind to "order"/"no_order".
const fs = require('fs'), path = require('path');
const { extractDraft } = require('../api/_extract-core');
const norm = s => String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
(async () => {
  const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'conversations.json'), 'utf8')).filter(c => c.kind !== 'skip' && c.expected);
  const m = { n: 0, items_count: 0, qty: 0, qty_n: 0, name: 0, name_n: 0, paid: 0, no_order_ok: 0, no_order_n: 0 }, fails = [];
  for (const c of all) {
    let d;
    try { d = await extractDraft(c.text, []); } catch (e) { fails.push([c.id, 'error ' + e.message]); continue; }
    m.n++;
    if (c.kind === 'no_order') { m.no_order_n++; if (d.items.length === 0) m.no_order_ok++; else fails.push([c.id, 'invented an order: ' + JSON.stringify(d.items)]); continue; }
    if (d.items.length === c.expected.items.length) m.items_count++; else fails.push([c.id, 'item count ' + d.items.length + ' vs ' + c.expected.items.length]);
    c.expected.items.forEach((e, i) => { const g = d.items[i]; m.name_n++; m.qty_n++; if (g && norm(g.name).includes(norm(e.name)) ) m.name++; else fails.push([c.id, 'name "' + (g && g.name) + '" vs "' + e.name + '"']); if (g && g.quantity === e.quantity) m.qty++; else fails.push([c.id, 'qty ' + (g && g.quantity) + ' vs ' + e.quantity]); });
    if (d.paid === c.expected.paid) m.paid++; else fails.push([c.id, 'paid ' + d.paid + ' vs ' + c.expected.paid]);
  }
  const orders = m.n - m.no_order_n, pct = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : 'n/a';
  console.log('conversations scored:', m.n, '(orders ' + orders + ', non-orders ' + m.no_order_n + ')');
  console.log('item count correct :', pct(m.items_count, orders));
  console.log('item name correct  :', pct(m.name, m.name_n));
  console.log('quantity correct   :', pct(m.qty, m.qty_n));
  console.log('paid flag correct  :', pct(m.paid, orders));
  console.log('no invented orders :', pct(m.no_order_ok, m.no_order_n));
  if (fails.length) { console.log('\nFAILURES'); fails.forEach(f => console.log(' ', f.join(' | '))) }
  console.log('\nGate used in the report: >=90% name/quantity/price-free fields; below 80% -> use the plain form instead.');
})();

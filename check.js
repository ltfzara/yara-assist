
const SUPABASE_URL='https://acgojmfvpnnaqzrazyvt.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_UEn6HH6AEVcah6I7OFvCKA_BjpqRMsk';
const sb=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
let user=null,authMode='login',authBusy=false,lastLoadedUserId=null,recoveryMode=false;
const DEFAULT_CATEGORIES=['خوراکی','پوشاک','زیورآلات','صنایع‌دستی','شمع و محصولات معطر','آرایشی و بهداشتی','هدیه و گل','سایر'];
let categoryOptions=[...DEFAULT_CATEGORIES];
const labels={new:'جدید',paid:'پرداخت‌شده',making:'در حال آماده‌سازی',ready:'آماده ارسال',sent:'ارسال‌شده',done:'تحویل‌شده',cancel:'لغوشده'};
const statuses=['new','paid','making','ready','sent','done'];
function refreshCategoryMenus(selected=''){
 const ids=['f-category','category-filter','customer-category-filter'];
 ids.forEach((id)=>{const el=document.getElementById(id);if(!el)return;const prior=selected||el.value;const first=id==='f-category'?'<option value="">انتخاب دسته‌بندی</option>':'<option value="">همه دسته‌بندی‌ها</option>';el.innerHTML=first+categoryOptions.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(categoryOptions.includes(prior))el.value=prior;});
}
// دسته‌بندی‌ها متعلق به فروشگاه فعال هستند، نه صرفاً کل حساب.
async function loadCategories(){
 if(!sb||!user)return;
 const {data,error}=await sb.from('business_categories').select('id,name').eq('user_id',user.id).eq('shop_id',activeShopId).order('name');
 if(error){toast('دسته‌بندی‌ها بارگذاری نشدند: '+friendlyError(error.message));return}
 categoryOptions=[...new Set([...DEFAULT_CATEGORIES,...(data||[]).map(x=>x.name)])];
 refreshCategoryMenus();
}
async function addCategory(){
 let name=prompt('نام دسته‌بندی جدید کسب‌وکارت را وارد کن:');
 if(name===null)return;name=name.trim();
 if(!name){toast('نام دسته‌بندی را وارد کن');return}
 if(categoryOptions.some(x=>x.toLowerCase()===name.toLowerCase())){refreshCategoryMenus(name);toast('این دسته‌بندی از قبل وجود دارد');return}
 if(!sb||!user){toast('ابتدا وارد حساب کاربری شو');return}
 const {error}=await sb.from('business_categories').insert({user_id:user.id,shop_id:activeShopId,name});
 if(error){toast(friendlyError(error.message));return}
 categoryOptions.push(name);refreshCategoryMenus(name);toast('دسته‌بندی جدید ذخیره شد');
}
const ones=['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه'];
const teens=['ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
const tens=['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'];
const hundreds=['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
function threeWords(n){let a=[];let h=Math.floor(n/100),r=n%100;if(h)a.push(hundreds[h]);if(r>=10&&r<20)a.push(teens[r-10]);else{let t=Math.floor(r/10),u=r%10;if(t)a.push(tens[t]);if(u)a.push(ones[u])}return a.join(' و ')}
function numberWords(n){if(!Number.isFinite(n)||n<0||n>999999999999)return '';if(n===0)return 'صفر';let units=['','هزار','میلیون','میلیارد'];let parts=[],i=0;while(n>0){let chunk=n%1000;if(chunk){let w=threeWords(chunk);parts.unshift(w+(units[i]?' '+units[i]:''))}n=Math.floor(n/1000);i++}return parts.join(' و ')}
function normalizeDigits(v){return String(v).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,،\s]/g,'').replace(/[^0-9]/g,'')}
function updatePriceHint(){let el=document.getElementById('f-price'),hint=document.getElementById('price-hint');let raw=el.value,digits=normalizeDigits(raw);if(raw!==digits)el.value=digits;if(!digits){hint.textContent='مبلغ را با ارقام فارسی یا انگلیسی وارد کنید.';return}let n=Number(digits);hint.textContent=n<=999999999999?numberWords(n)+' '+(shopCurrencySymbol||'تومان'):'عدد واردشده خیلی بزرگ است';}
function future(n){let d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
let orders=[];
let financialProducts=[],financialExpenses=[],shopCurrency='IRR',shopCurrencySymbol='تومان';
function fa(n){return Number(n||0).toLocaleString('fa-IR')}
function money(n){return fa(n)+' '+(shopCurrencySymbol||'تومان')}
function dateFa(s){if(!s)return '—';try{return new Date(s+'T12:00:00').toLocaleDateString('fa-IR-u-ca-persian',{year:'numeric',month:'short',day:'numeric'})}catch(e){return s}}
function statusPill(s){return `<span class="pill s-${s}">${labels[s]||s}</span>`}
function initials(n){return (n||'؟').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('')}
function toast(t){let el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2300)}
function showPage(p){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById(p).classList.add('active');document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===p));let titles={dashboard:'وضعیت سفارش‌های کسب‌وکارت در یک نگاه',orders:'تمام سفارش‌ها را یک‌جا مدیریت کن',customers:'مشتری‌ها و سابقه خریدشان',reminders:'هیچ پیگیری‌ای از قلم نیفتد',finance:'درآمد، هزینه و کیفیت اطلاعات مالی',products:'تعریف محصولات و هزینه استاندارد',expenses:'ثبت هزینه‌های عملیاتی فروشگاه'};document.getElementById('subheading').textContent=titles[p];renderAll();if(['finance','products','expenses'].includes(p))loadFinancialData()}
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
function getReminders(){let today=future(0);return orders.filter(o=>!['done','cancel'].includes(o.status)).map(o=>{let reason='',priority=2;if(o.date&&o.date<today){reason='موعد تحویل گذشته';priority=0}else if(o.status==='new'){reason='در انتظار بررسی / پرداخت';priority=1}else if(o.date===today){reason='موعد تحویل امروز';priority=0}else if(o.status==='sent'&&!o.track){reason='کد رهگیری ثبت نشده';priority=1}else if(o.status==='ready'){reason='آماده ارسال';priority=1}return reason?{...o,reason,priority}:null}).filter(Boolean).sort((a,b)=>a.priority-b.priority)}
function renderDashboard(){
 document.getElementById('stat-total').textContent=fa(orders.length);
 document.getElementById('stat-active').textContent=fa(orders.filter(o=>!['done','cancel'].includes(o.status)).length);
 document.getElementById('stat-sales').textContent=money(orders.filter(o=>!['new','cancel'].includes(o.status)).reduce((s,o)=>s+Number(o.price||0),0));
 document.getElementById('stat-customers').textContent=fa(new Set(orders.map(o=>o.phone||o.name)).size);
 let recent=[...orders].sort((a,b)=>b.created-a.created).slice(0,5);
 document.getElementById('recent-orders').innerHTML=recent.length?recent.map(o=>`<div class="order-row"><div class="customer"><b>${esc(o.name)}</b><small>${esc(o.id)}</small></div><div class="product">${esc(o.product)}<br><small>${fa(o.qty)} عدد</small></div><div>${statusPill(o.status)}</div><div class="money">${money(o.price)}</div></div>`).join(''):'<div class="empty">هنوز سفارشی ثبت نشده است.</div>';
 let rem=getReminders();document.getElementById('reminder-count').textContent=fa(rem.length)+' مورد';
 document.getElementById('dash-reminders').innerHTML=rem.slice(0,4).map(r=>`<div class="reminder"><div class="reminder-icon">!</div><div><b>${esc(r.name)} · ${esc(r.product)}</b><small>${r.reason} · ${dateFa(r.date)}</small></div></div>`).join('')||'<div class="empty">عالیه! موردی برای پیگیری نداری 🌱</div>';
}
function renderOrders(){let q=(document.getElementById('order-search')?.value||'').trim().toLowerCase(),st=document.getElementById('status-filter')?.value||'',cat=document.getElementById('category-filter')?.value||'';let arr=[...orders].sort((a,b)=>b.created-a.created).filter(o=>(!st||o.status===st)&&(!cat||(o.category||'سایر')===cat)&&[o.name,o.phone,o.product,o.id].join(' ').toLowerCase().includes(q));document.getElementById('orders-body').innerHTML=arr.length?arr.map(o=>`<tr><td><b>${esc(o.name)}</b><br><small class="muted">${esc(o.phone||'بدون شماره')}</small></td><td>${esc(o.product)} <small class="muted">× ${fa(o.qty)}</small></td><td><span class="category-tag">${esc(o.category||'سایر')}</span></td><td>${money(o.price)}</td><td>${dateFa(o.date)}</td><td>${statusPill(o.status)}</td><td><button class="act" onclick="editOrder('${o.id}')">ویرایش</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">سفارشی پیدا نشد.</div></td></tr>'}
function getCustomers(){let m=new Map();orders.forEach(o=>{let k=o.phone||o.name;if(!m.has(k))m.set(k,{name:o.name,phone:o.phone,orders:[],last:o.created});let c=m.get(k);c.orders.push(o);c.last=Math.max(c.last,o.created)});return [...m.values()].sort((a,b)=>b.last-a.last)}
function renderCustomers(){let q=(document.getElementById('customer-search')?.value||'').toLowerCase(),cat=document.getElementById('customer-category-filter')?.value||'';let cs=getCustomers().filter(c=>(c.name+' '+c.phone).toLowerCase().includes(q)&&(!cat||c.orders.some(o=>(o.category||'سایر')===cat)));document.getElementById('customer-count').textContent=fa(cs.length)+' مشتری';document.getElementById('customers-body').innerHTML=cs.length?cs.map(c=>{let cats=[...new Set(c.orders.map(o=>o.category||'سایر'))];let key=c.phone||c.name;return `<tr><td><div class="customer-card"><div class="avatar">${esc(initials(c.name))}</div><b>${esc(c.name)}</b></div></td><td>${esc(c.phone||'—')}</td><td>${fa(c.orders.length)}</td><td>${cats.map(x=>`<span class="category-tag">${esc(x)}</span>`).join(' ')}</td><td>${money(c.orders.reduce((s,o)=>s+Number(o.price||0),0))}</td><td>${dateFa(new Date(c.last).toISOString().slice(0,10))}</td><td><button class="delete-btn" onclick="deleteCustomer('${encodeURIComponent(key)}')">حذف مشتری</button></td></tr>`}).join(''):'<tr><td colspan="7"><div class="empty">مشتری‌ای پیدا نشد.</div></td></tr>'}
function renderReminders(){let r=getReminders();document.getElementById('all-reminders').innerHTML=r.length?r.map(o=>`<div class="reminder"><div class="reminder-icon">◷</div><div style="flex:1"><b>${esc(o.name)} · ${esc(o.product)}</b><small>${o.reason} · موعد: ${dateFa(o.date)} · ${money(o.price)}</small></div><button class="btn secondary small" onclick="editOrder('${o.id}')">باز کردن سفارش</button></div>`).join(''):'<div class="empty">همه‌چیز مرتب است؛ یادآور فعالی نداری 🌿</div>'}
function renderAll(){renderDashboard();renderOrders();renderCustomers();renderReminders()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function openOrderModal(){document.getElementById('order-form').reset();document.getElementById('edit-id').value='';document.getElementById('f-qty').value=1;document.getElementById('f-price').value='';updatePriceHint();document.getElementById('f-date').value='';document.getElementById('f-date').dataset.iso='';document.getElementById('modal-title').textContent='ثبت سفارش جدید';document.getElementById('order-modal').classList.add('show')}
function closeOrderModal(){document.getElementById('order-modal').classList.remove('show')}
function editOrder(id){let o=orders.find(x=>x.id===id);if(!o)return;document.getElementById('edit-id').value=o.id;document.getElementById('modal-title').textContent='ویرایش سفارش '+o.id;let map={'name':'name','phone':'phone','product':'product','category':'category','price':'price','qty':'qty','date':'date','status':'status','track':'track','notes':'notes'};Object.entries(map).forEach(([f,k])=>document.getElementById('f-'+f).value=o[k]??'');updatePriceHint();document.getElementById('f-date').dataset.iso=o.date||'';document.getElementById('f-date').value=o.date?dateFa(o.date):'';document.getElementById('order-modal').classList.add('show')}
// تمام نوشتن‌ها shop_id و user_id را هم‌زمان ارسال می‌کنند تا داده‌ها بین فروشگاه‌ها مخلوط نشوند.
async function saveOrder(e){
 e.preventDefault();if(!sb||!user){toast('ابتدا وارد حساب کاربری شو');return}
 let id=document.getElementById('edit-id').value;
 let rawPrice=normalizeDigits(document.getElementById('f-price').value);
 if(!rawPrice||!Number.isFinite(Number(rawPrice))){toast('مبلغ را به‌درستی وارد کن');return}
 let payload={
  user_id:user.id,shop_id:activeShopId,
  customer_name:document.getElementById('f-name').value.trim(),
  customer_phone:document.getElementById('f-phone').value.trim(),
  product_name:document.getElementById('f-product').value.trim(),
  category:document.getElementById('f-category').value||'سایر',
  price:Number(rawPrice),
  quantity:Number(document.getElementById('f-qty').value)||1,
  due_date:document.getElementById('f-date').dataset.iso||null,
  status:document.getElementById('f-status').value,
  tracking_code:document.getElementById('f-track').value.trim(),
  notes:document.getElementById('f-notes').value.trim()
 };
 try{
  const req=id?sb.from('orders').update(payload).eq('id',id).eq('user_id',user.id):sb.from('orders').insert(payload);
  const {error}=await req;if(error)throw error;
  closeOrderModal();await loadOrders();toast(id?'سفارش به‌روزرسانی شد':'سفارش با موفقیت ثبت شد');showPage('orders');
 }catch(err){toast(friendlyError(err.message))}
}

// در مدل فعلی مشتری از سفارش‌ها ساخته می‌شود؛ حذف مشتری یعنی حذف سفارش‌های مرتبط در همین فروشگاه.
async function deleteCustomer(encodedKey){
 let key=decodeURIComponent(encodedKey);let c=getCustomers().find(x=>(x.phone||x.name)===key);if(!c)return;
 let msg=`مشتری «${c.name}» و تمام ${fa(c.orders.length)} سفارش مرتبط با او حذف شوند؟ این کار قابل بازگشت نیست.`;
 if(!confirm(msg))return;
 let query=sb.from('orders').delete().eq('user_id',user.id).eq('shop_id',activeShopId);
 query=c.phone?query.eq('customer_phone',c.phone):query.eq('customer_name',c.name);
 const {error}=await query;if(error){toast(friendlyError(error.message));return}
 await loadOrders();toast('مشتری و سفارش‌های مرتبط حذف شدند');
}
// Persian calendar: Intl Persian calendar supplies accurate Jalali/Gregorian conversion.
const pMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const weekNames=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const officialHolidays={
'1405-1-1':'نوروز و عید فطر','1405-1-2':'عید نوروز','1405-1-3':'عید نوروز','1405-1-4':'عید نوروز','1405-1-12':'روز جمهوری اسلامی','1405-1-13':'روز طبیعت','1405-1-24':'شهادت امام جعفر صادق',
'1405-3-3':'شهادت امام محمد باقر','1405-3-6':'عید قربان','1405-3-14':'عید غدیر و رحلت امام خمینی','1405-3-15':'قیام ۱۵ خرداد',
'1405-4-3':'تاسوعای حسینی','1405-4-4':'عاشورای حسینی','1405-5-13':'اربعین حسینی','1405-5-21':'رحلت پیامبر و شهادت امام حسن','1405-5-22':'شهادت امام رضا','1405-5-30':'شهادت امام حسن عسکری',
'1405-6-8':'میلاد پیامبر و امام جعفر صادق','1405-8-22':'شهادت حضرت فاطمه زهرا','1405-10-2':'ولادت امام علی و روز پدر','1405-10-16':'مبعث پیامبر','1405-11-4':'ولادت امام زمان','1405-11-22':'پیروزی انقلاب اسلامی','1405-12-9':'شهادت امام علی','1405-12-19':'عید فطر','1405-12-20':'تعطیل عید فطر','1405-12-29':'ملی شدن صنعت نفت'};
let calYear=1405,calMonth=8,calSelected='';
function persianParts(d){let parts=new Intl.DateTimeFormat('en-US-u-ca-persian',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(d);let o={};parts.forEach(x=>{if(x.type!=='literal')o[x.type]=Number(x.value)});return o}
function findPersianFirst(y,m){let base=new Date();let py=persianParts(base).year;let approx=new Date(base);approx.setDate(approx.getDate()+(y-py)*365+(m-persianParts(base).month)*30-40);for(let t=-50;t<=50;t++){let d=new Date(approx);d.setDate(d.getDate()+t);let z=persianParts(d);if(z.year===y&&z.month===m&&z.day===1)return d}return null}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function openCalendar(){let chosen=document.getElementById('f-date').dataset.iso;if(chosen){let z=persianParts(new Date(chosen+'T12:00:00'));calYear=z.year;calMonth=z.month}else{let z=persianParts(new Date());calYear=z.year;calMonth=z.month}renderCalendar();document.getElementById('calendar-back').classList.add('show')}
function closeCalendar(){document.getElementById('calendar-back').classList.remove('show')}
function moveCalendar(delta){calMonth+=delta;if(calMonth<1){calMonth=12;calYear--}if(calMonth>12){calMonth=1;calYear++}renderCalendar()}
function renderCalendar(){document.getElementById('cal-title').textContent=pMonths[calMonth-1]+' '+fa(calYear);let grid=document.getElementById('cal-grid');grid.innerHTML=weekNames.map(x=>`<div class="cal-week">${x}</div>`).join('');let first=findPersianFirst(calYear,calMonth);if(!first){grid.innerHTML+='<div class="empty">امکان نمایش این ماه وجود ندارد.</div>';return}let offset=(first.getDay()+1)%7;let start=new Date(first);start.setDate(first.getDate()-offset);let todayISO=iso(new Date());for(let i=0;i<42;i++){let d=new Date(start);d.setDate(start.getDate()+i);let pp=persianParts(d),same=pp.year===calYear&&pp.month===calMonth,key=pp.year+'-'+pp.month+'-'+pp.day,holiday=officialHolidays[key],isFri=d.getDay()===5,selected=iso(d)===calSelected||iso(d)===document.getElementById('f-date').dataset.iso,cls=['cal-day',same?'':'out',isFri?'friday':'',holiday?'holiday':'',selected?'selected':'',iso(d)===todayISO?'today':''].filter(Boolean).join(' ');grid.innerHTML+=`<button type="button" class="${cls}" title="${holiday|| (isFri?'جمعه':'')}" onclick="chooseCalendarDate('${iso(d)}','${same?holiday||'': ''}')">${fa(pp.day)}</button>`}document.getElementById('holiday-note').textContent='تعطیلات رسمی سال ۱۴۰۵ در این نسخه ثبت شده‌اند؛ جمعه‌ها نیز مشخص هستند.'}
function chooseCalendarDate(greg,holiday){let d=new Date(greg+'T12:00:00');let pp=persianParts(d);let text=fa(pp.day)+' '+pMonths[pp.month-1]+' '+fa(pp.year);let input=document.getElementById('f-date');input.value=text;input.dataset.iso=greg;closeCalendar();toast(holiday?'تاریخ انتخاب شد · '+holiday:'تاریخ انتخاب شد')}
document.getElementById('today').textContent=new Date().toLocaleDateString('fa-IR',{weekday:'long',day:'numeric',month:'long'});
function showAuth(){document.getElementById('auth-screen').classList.add('show');document.querySelector('.app').classList.remove('authenticated')}
function showApp(){document.getElementById('auth-screen').classList.remove('show');document.querySelector('.app').classList.add('authenticated');renderAll()}
function setAuthMode(mode){
 authMode=mode;
 document.getElementById('auth-login-tab').classList.toggle('active',mode==='login');
 document.getElementById('auth-signup-tab').classList.toggle('active',mode==='signup');
 document.getElementById('auth-title').textContent=mode==='login'?'سلام، خوش آمدی 🌱':'بیا حساب یارای خودت را بساز';
 document.getElementById('auth-desc').textContent=mode==='login'?'برای ورود به فضای کاری یارا، ایمیلت را وارد کن.':'برای ساخت حساب، ایمیل و یک رمز عبور وارد کن.';
 document.getElementById('auth-submit').textContent=mode==='login'?'ورود به حساب':'ساخت حساب';
 document.getElementById('auth-password').autocomplete=mode==='login'?'current-password':'new-password';
 document.getElementById('forgot-link').classList.toggle('auth-hidden',mode!=='login');
 document.getElementById('auth-form').classList.remove('auth-hidden');document.getElementById('reset-password-form').classList.add('auth-hidden');document.getElementById('back-login-link').classList.add('auth-hidden');document.getElementById('auth-tabs').classList.remove('auth-hidden');document.getElementById('auth-hint').textContent='';
}
function showResetPassword(){
 recoveryMode=true;showAuth();
 document.getElementById('auth-title').textContent='رمز عبور جدید';
 document.getElementById('auth-desc').textContent='یک رمز تازه برای حساب یارای خودت انتخاب کن.';
 document.getElementById('auth-tabs').classList.add('auth-hidden');
 document.getElementById('auth-form').classList.add('auth-hidden');
 document.getElementById('forgot-link').classList.add('auth-hidden');
 document.getElementById('reset-password-form').classList.remove('auth-hidden');
 document.getElementById('back-login-link').classList.remove('auth-hidden');
 document.getElementById('auth-hint').textContent='رمز عبور باید دقیقاً ۶ کاراکتر باشد.';
 document.getElementById('new-password').focus();
}
function backToLogin(){recoveryMode=false;setAuthMode('login');}
async function sendPasswordReset(){
 if(!sb){toast('اتصال Supabase بارگذاری نشد');return}
 const email=document.getElementById('auth-email').value.trim();
 if(!email){toast('ابتدا ایمیلت را وارد کن.');document.getElementById('auth-email').focus();return}
 const btn=document.getElementById('forgot-link');btn.disabled=true;btn.textContent='در حال ارسال درخواست…';
 const hint=document.getElementById('auth-hint');hint.textContent='در حال ثبت درخواست بازیابی رمز…';
 try{
  const redirectTo=new URL(window.location.pathname,window.location.origin);redirectTo.searchParams.set('reset-password','1');
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectTo.toString()});if(error)throw error;
  hint.textContent='درخواست بازیابی ثبت شد. اگر این ایمیل در یارا حساب داشته باشد، لینک تغییر رمز برایت ارسال می‌شود. صندوق ورودی و پوشه هرزنامه را بررسی کن.';
  toast('درخواست بازیابی ثبت شد؛ ایمیلت را بررسی کن.');
 }catch(err){hint.textContent='ارسال درخواست انجام نشد. دوباره تلاش کن.';toast(friendlyError(err.message))}
 finally{btn.disabled=false;btn.textContent='رمز عبورت را فراموش کرده‌ای؟'}
}
async function submitNewPassword(e){
 e.preventDefault();if(!sb||authBusy)return;
 const password=document.getElementById('new-password').value,confirmPassword=document.getElementById('confirm-password').value;
 if(password.length!==6){toast('رمز عبور باید دقیقاً ۶ کاراکتر باشد.');return}
 if(password!==confirmPassword){toast('تکرار رمز عبور با رمز جدید یکسان نیست.');return}
 authBusy=true;const btn=document.getElementById('reset-submit');btn.disabled=true;
 try{
  const {data,error}=await sb.auth.updateUser({password});if(error)throw error;
  const updatedEmail=data.user?.email||user?.email||'';
  await sb.auth.signOut({scope:'local'});
  recoveryMode=false;user=null;lastLoadedUserId=null;orders=[];shops=[];activeShopId=null;
  document.getElementById('reset-password-form').reset();showAuth();setAuthMode('login');
  if(updatedEmail)document.getElementById('auth-email').value=updatedEmail;
  document.getElementById('auth-hint').textContent='رمز عبورت با موفقیت تغییر کرد. حالا با رمز جدید وارد شو.';
  toast('رمز عبور با موفقیت تغییر کرد.');
 }catch(err){toast(friendlyError(err.message))}finally{authBusy=false;btn.disabled=false}
}
function friendlyError(message){
 if(/Invalid login credentials/i.test(message))return'ایمیل یا رمز عبور درست نیست.';
 if(/Email not confirmed/i.test(message))return'تأیید ایمیل در تنظیمات Supabase فعال است؛ آن را غیرفعال کن.';
 if(/duplicate key/i.test(message))return'این مورد از قبل ثبت شده است.';
 return message||'مشکلی پیش آمد؛ دوباره تلاش کن.';
}
// Supabase Auth نشست را مدیریت می‌کند؛ ثبت‌نام بدون تأیید ایمیل باید در تنظیمات پروژه فعال شده باشد.
async function submitAuth(e){
 e.preventDefault();if(!sb){toast('اتصال Supabase بارگذاری نشد');return}if(authBusy)return;
 authBusy=true;const btn=document.getElementById('auth-submit');btn.disabled=true;
 try{
  const email=document.getElementById('auth-email').value.trim(),password=document.getElementById('auth-password').value;
  if(password.length!==6){toast('رمز عبور باید دقیقاً ۶ کاراکتر باشد.');return;}
  const result=authMode==='signup'
   ?await sb.auth.signUp({email,password})
   :await sb.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;

  // A successful sign-up does not always include a session. This can happen
  // when Supabase email confirmation is enabled. Try password sign-in once;
  // only open the private dashboard after Supabase returns a real session.
  let sessionUser=result.data.session?.user||null;
  if(!sessionUser && authMode==='signup'){
   const loginResult=await sb.auth.signInWithPassword({email,password});
   if(loginResult.error){
    if(/Email not confirmed/i.test(loginResult.error.message)){
     throw new Error('حساب ساخته شد، اما تأیید ایمیل هنوز در Supabase فعال است. از Authentication → Providers → Email گزینه Confirm email را خاموش کن و دوباره وارد شو.');
    }
    throw loginResult.error;
   }
   sessionUser=loginResult.data.session?.user||null;
  }
  if(sessionUser){user=sessionUser;await afterLogin();}
  else if(authMode==='signup'){
   throw new Error('حساب ساخته شد، اما نشست ورود دریافت نشد. تنظیم Confirm email و آدرس پروژه Supabase را بررسی کن.');
  }else{
   throw new Error('ورود انجام نشد؛ Supabase نشست معتبر برنگرداند. دوباره تلاش کن.');
  }
 }catch(err){toast(friendlyError(err.message))}
 finally{authBusy=false;btn.disabled=false}
}
// Each authenticated user owns shops; all data reads/writes are scoped to the active shop.
let shops=[],activeShopId=null;
// فهرست فروشگاه‌ها فقط برای کاربر واردشده بارگذاری می‌شود.
async function loadShops(){
 const {data,error}=await sb.from('businesses').select('id,name').eq('user_id',user.id).order('created_at');
 if(error)throw error; shops=data||[];
 if(!shops.length){const {data:created,error:createError}=await sb.from('businesses').insert({user_id:user.id,name:'فروشگاه من'}).select('id,name').single();if(createError)throw createError;shops=[created];}
 if(!shops.some(x=>x.id===activeShopId))activeShopId=shops[0].id;
 const select=document.getElementById('shop-select');select.innerHTML=shops.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');select.value=activeShopId;
}
function openShopManager(){renderShopList();document.getElementById('shop-modal').classList.add('show')}
function closeShopManager(){document.getElementById('shop-modal').classList.remove('show')}
function renderShopList(){
 const list=document.getElementById('shop-list');
 if(!shops.length){list.innerHTML='<div class="empty">هنوز فروشگاهی ثبت نشده است.</div>';return}
 list.innerHTML=shops.map(shop=>`<div style="display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line);border-radius:11px"><div style="flex:1;min-width:0"><b style="font-size:13px">${esc(shop.name)}</b><small class="muted" style="display:block;font-size:10px">${shop.id===activeShopId?'فروشگاه فعال':'فروشگاه'}</small></div><button class="btn secondary small" type="button" onclick="switchShopFromManager('${shop.id}')">${shop.id===activeShopId?'فعال':'انتخاب'}</button><button class="btn secondary small" type="button" onclick="renameShop('${shop.id}')">تغییر نام</button><button class="delete-btn" type="button" onclick="deleteShop('${shop.id}')">حذف</button></div>`).join('');
}
async function submitCreateShop(e){
 e.preventDefault();const input=document.getElementById('new-shop-name'),clean=input.value.trim();if(!clean){toast('نام فروشگاه را وارد کن');return}
 const {data,error}=await sb.from('businesses').insert({user_id:user.id,name:clean}).select('id,name').single();
 if(error){toast(friendlyError(error.message));return}shops.push(data);activeShopId=data.id;await loadShops();categoryOptions=[...DEFAULT_CATEGORIES];refreshCategoryMenus();orders=[];await loadCategories();await loadOrders();input.value='';renderShopList();toast('فروشگاه جدید ساخته شد و خالی است.');
}
async function createShop(){openShopManager();document.getElementById('new-shop-name').focus()}
async function renameShop(id){
 const shop=shops.find(x=>x.id===id);if(!shop)return;const name=prompt('نام جدید فروشگاه را وارد کن:',shop.name);if(name===null)return;const clean=name.trim();if(!clean){toast('نام فروشگاه نمی‌تواند خالی باشد.');return}
 const {data,error}=await sb.from('businesses').update({name:clean}).eq('id',id).eq('user_id',user.id).select('id,name').single();if(error){toast(friendlyError(error.message));return}
 shops=shops.map(x=>x.id===id?data:x);await loadShops();renderShopList();toast('نام فروشگاه تغییر کرد.');
}
async function deleteShop(id){
 const shop=shops.find(x=>x.id===id);if(!shop)return;
 if(shops.length<=1){toast('برای حفظ فضای کاری، آخرین فروشگاه را نمی‌توان حذف کرد.');return}
 const approved=confirm(`فروشگاه «${shop.name}» حذف شود؟\n\nتمام سفارش‌ها و دسته‌بندی‌های وابسته به این فروشگاه نیز برای همیشه حذف می‌شوند. این کار برگشت‌پذیر نیست.`);
 if(!approved)return;
 const wasActive=id===activeShopId;
 const {error}=await sb.from('businesses').delete().eq('id',id).eq('user_id',user.id);
 if(error){toast('حذف فروشگاه انجام نشد: '+friendlyError(error.message));return}
 shops=shops.filter(x=>x.id!==id);
 if(wasActive){
  activeShopId=shops[0].id;categoryOptions=[...DEFAULT_CATEGORIES];refreshCategoryMenus();orders=[];renderAll();
  try{await loadCategories();await loadOrders()}catch(err){toast(friendlyError(err.message))}
 }
 await loadShops();renderShopList();toast('فروشگاه و داده‌های وابسته به آن حذف شدند.');
}
async function switchShopFromManager(id){await switchShop(id);renderShopList();toast('فروشگاه فعال تغییر کرد.');}
async function switchShop(id){if(!shops.some(x=>x.id===id))return;activeShopId=id;categoryOptions=[...DEFAULT_CATEGORIES];refreshCategoryMenus();orders=[];financialProducts=[];financialExpenses=[];renderAll();await loadCategories();await loadOrders();await loadFinancialData();}
async function openProfile(){document.getElementById('profile-email').value=user.email||'';const {data,error}=await sb.from('profiles').select('full_name,phone').eq('user_id',user.id).maybeSingle();if(error){toast(friendlyError(error.message));return;}document.getElementById('profile-name').value=data?.full_name||'';document.getElementById('profile-phone').value=data?.phone||'';document.getElementById('profile-modal').classList.add('show');}
function closeProfile(){document.getElementById('profile-modal').classList.remove('show')}
async function saveProfile(e){e.preventDefault();const payload={user_id:user.id,full_name:document.getElementById('profile-name').value.trim(),phone:document.getElementById('profile-phone').value.trim(),updated_at:new Date().toISOString()};const {error}=await sb.from('profiles').upsert(payload,{onConflict:'user_id'});if(error){toast(friendlyError(error.message));return;}closeProfile();toast('پروفایل ذخیره شد.');}
// پس از ورود، فروشگاه انتخاب‌شده و داده‌های همان فروشگاه بارگذاری می‌شوند.
async function afterLogin(){if(!user||lastLoadedUserId===user.id)return;lastLoadedUserId=user.id;orders=[];showApp();try{await loadShops();await loadCategories();await loadOrders();await loadFinancialData();if(document.getElementById('expense-date'))document.getElementById('expense-date').value=new Date().toISOString().slice(0,10);}catch(err){lastLoadedUserId=null;toast('آماده‌سازی فضای کار ناموفق بود: '+friendlyError(err.message));}}
async function loadOrders(){
 if(!sb||!user)return;
 const {data,error}=await sb.from('orders').select('*').eq('user_id',user.id).eq('shop_id',activeShopId).order('created_at',{ascending:false});
 if(error){toast('بارگذاری سفارش‌ها انجام نشد: '+friendlyError(error.message));return}
 orders=(data||[]).map(row=>({
  id:row.id,name:row.customer_name||'',phone:row.customer_phone||'',product:row.product_name||'',
  category:row.category||'سایر',price:Number(row.price||0),qty:Number(row.quantity||1),
  date:row.due_date||'',status:row.status||'new',track:row.tracking_code||'',notes:row.notes||'',
  created:row.created_at?new Date(row.created_at).getTime():Date.now()
 }));
 renderAll();
}
// بخش مالی: تمام داده‌ها فقط در محدوده فروشگاه فعال خوانده و نوشته می‌شوند.
const currencySymbols={IRR:'تومان',USD:'دلار',EUR:'یورو',TRY:'لیر',AED:'درهم'};
function finMoney(n){return Number(n||0).toLocaleString('fa-IR')+' '+(shopCurrencySymbol||'واحد پول')}
function productCost(p){return Number(p.purchase_cost||0)+Number(p.production_cost||0)+Number(p.packaging_cost||0)+(Number(p.labor_minutes||0)/60*Number(p.labor_hourly_rate||0))}
function updateProductPreview(){const p={purchase_cost:document.getElementById('product-purchase')?.value,production_cost:document.getElementById('product-production')?.value,packaging_cost:document.getElementById('product-packaging')?.value,labor_minutes:document.getElementById('product-labor-minutes')?.value,labor_hourly_rate:document.getElementById('product-labor-rate')?.value};const c=productCost(p),sale=Number(document.getElementById('product-sale')?.value||0),profit=sale-c;const el=document.getElementById('product-cost-preview');if(el)el.textContent=`هزینه استاندارد هر واحد: ${finMoney(c)} · سود تخمینی قبل از ارسال و کمیسیون: ${finMoney(profit)} · حاشیه سود: ${sale>0?(profit/sale*100).toFixed(1)+'٪':'—'}`}
['product-sale','product-purchase','product-production','product-packaging','product-labor-minutes','product-labor-rate'].forEach(id=>{document.addEventListener('input',e=>{if(e.target?.id===id)updateProductPreview()})});
async function loadFinancialData(){if(!sb||!user||!activeShopId)return;try{
 const [pr,ex,settings]=await Promise.all([
  sb.from('products').select('*').eq('user_id',user.id).eq('shop_id',activeShopId).order('name'),
  sb.from('expenses').select('*').eq('user_id',user.id).eq('shop_id',activeShopId).order('expense_date',{ascending:false}),
  sb.from('shop_settings').select('currency_code,currency_symbol').eq('user_id',user.id).eq('shop_id',activeShopId).maybeSingle()
 ]);
 if(pr.error)throw pr.error;if(ex.error)throw ex.error;if(settings.error)throw settings.error;
 financialProducts=pr.data||[];financialExpenses=ex.data||[];shopCurrency=settings.data?.currency_code||'IRR';shopCurrencySymbol=settings.data?.currency_symbol||currencySymbols[shopCurrency]||shopCurrency;
 const cur=document.getElementById('shop-currency');if(cur)cur.value=shopCurrency;
 renderFinancial();
 }catch(err){toast('بارگذاری بخش مالی ناموفق بود: '+friendlyError(err.message))}}
function renderFinancial(){const rev=orders.filter(o=>['paid','making','ready','sent','done'].includes(o.status)).reduce((s,o)=>s+Number(o.price||0),0);const exp=financialExpenses.reduce((s,x)=>s+Number(x.amount||0),0);const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};set('fin-revenue',finMoney(rev));set('fin-expenses',finMoney(exp));set('fin-profit','نامشخص');set('fin-products',fa(financialProducts.filter(p=>p.is_active).length));set('finance-currency-label','واحد پول: '+shopCurrencySymbol);const note=document.getElementById('finance-data-note');if(note)note.innerHTML=`<b>گزارش محافظه‌کارانه:</b> درآمد سفارش‌های دارای وضعیت پرداخت‌شده تا تحویل‌شده از جدول فعلی سفارش‌ها جمع شده است. <b>سود هنوز محاسبه نمی‌شود</b> چون سفارش‌های قبلی فاقد snapshot بهای تمام‌شده‌اند و تا این مرحله سفارش‌های جدید نیز به اقلام مالی متصل نشده‌اند. ${financialProducts.length?`در حال حاضر ${fa(financialProducts.length)} محصول با هزینه استاندارد تعریف شده است.`:'هنوز محصولی در کاتالوگ ثبت نشده است.'} هزینه‌های ثبت‌شده: ${fa(financialExpenses.length)} مورد. هزینه‌های ارسال و کمیسیون سفارش جدا از هزینه‌های عمومی نگهداری خواهند شد.`;
 const pb=document.getElementById('products-body');if(pb)pb.innerHTML=financialProducts.length?financialProducts.map(p=>{let c=productCost(p),profit=Number(p.sale_price||0)-c;return `<tr><td><b>${esc(p.name)}</b></td><td>${({buy:'خریدنی',make:'تولیدی',both:'ترکیبی'})[p.sourcing_type]||p.sourcing_type}</td><td>${finMoney(p.sale_price)}</td><td>${finMoney(c)}</td><td>${finMoney(profit)} (${Number(p.sale_price)>0?(profit/Number(p.sale_price)*100).toFixed(1)+'٪':'—'})</td><td><button class="act" onclick="editProduct('${p.id}')">ویرایش</button> <button class="delete-btn" onclick="deleteProduct('${p.id}')">غیرفعال‌سازی</button></td></tr>`}).join(''):'<tr><td colspan="6"><div class="empty">هنوز محصولی ثبت نشده است.</div></td></tr>';
 const eb=document.getElementById('expenses-body');if(eb)eb.innerHTML=financialExpenses.length?financialExpenses.map(x=>`<tr><td>${esc(x.title)}</td><td>${({advertising:'تبلیغات',fixed:'هزینه ثابت',salary:'حقوق',internet:'اینترنت و قبوض',equipment:'تجهیزات',other:'سایر'})[x.category]||x.category}</td><td>${finMoney(x.amount)}</td><td>${dateFa(x.expense_date)}</td><td>${x.expense_type==='fixed'?'ثابت':'متغیر'}</td><td><button class="delete-btn" onclick="deleteExpense('${x.id}')">حذف</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">هزینه‌ای ثبت نشده است.</div></td></tr>';
}
async function saveShopCurrency(){const code=document.getElementById('shop-currency').value;const payload={user_id:user.id,shop_id:activeShopId,currency_code:code,currency_symbol:currencySymbols[code]||code,updated_at:new Date().toISOString()};const {error}=await sb.from('shop_settings').upsert(payload,{onConflict:'shop_id'});if(error){toast(friendlyError(error.message));return}shopCurrency=code;shopCurrencySymbol=payload.currency_symbol;renderFinancial();renderAll();toast('واحد پول فروشگاه ذخیره شد')}
function resetProductForm(){document.getElementById('product-form').reset();document.getElementById('product-id').value='';['product-purchase','product-production','product-packaging','product-labor-minutes','product-labor-rate'].forEach(id=>document.getElementById(id).value=0);updateProductPreview()}
function editProduct(id){const p=financialProducts.find(x=>x.id===id);if(!p)return;document.getElementById('product-id').value=p.id;document.getElementById('product-name').value=p.name;document.getElementById('product-source').value=p.sourcing_type;document.getElementById('product-sale').value=p.sale_price;document.getElementById('product-purchase').value=p.purchase_cost||0;document.getElementById('product-production').value=p.production_cost||0;document.getElementById('product-packaging').value=p.packaging_cost||0;document.getElementById('product-labor-minutes').value=p.labor_minutes||0;document.getElementById('product-labor-rate').value=p.labor_hourly_rate||0;updateProductPreview();document.getElementById('products').scrollIntoView({behavior:'smooth'})}
async function saveProduct(e){e.preventDefault();const id=document.getElementById('product-id').value;const payload={user_id:user.id,shop_id:activeShopId,name:document.getElementById('product-name').value.trim(),sourcing_type:document.getElementById('product-source').value,sale_price:Number(document.getElementById('product-sale').value),purchase_cost:Number(document.getElementById('product-purchase').value||0),production_cost:Number(document.getElementById('product-production').value||0),packaging_cost:Number(document.getElementById('product-packaging').value||0),labor_minutes:Number(document.getElementById('product-labor-minutes').value||0),labor_hourly_rate:Number(document.getElementById('product-labor-rate').value||0),is_active:true,updated_at:new Date().toISOString()};const req=id?sb.from('products').update(payload).eq('id',id).eq('shop_id',activeShopId):sb.from('products').insert(payload);const {error}=await req;if(error){toast(friendlyError(error.message));return}resetProductForm();await loadFinancialData();toast('محصول ذخیره شد')}
async function deleteProduct(id){if(!confirm('این محصول غیرفعال شود؟ سوابق سفارش به آن دست‌نخورده می‌ماند.'))return;const {error}=await sb.from('products').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',id).eq('shop_id',activeShopId);if(error){toast(friendlyError(error.message));return}await loadFinancialData();toast('محصول غیرفعال شد')}
async function saveExpense(e){e.preventDefault();const payload={user_id:user.id,shop_id:activeShopId,title:document.getElementById('expense-title').value.trim(),amount:Number(document.getElementById('expense-amount').value),category:document.getElementById('expense-category').value,expense_type:document.getElementById('expense-type').value,expense_date:document.getElementById('expense-date').value,notes:document.getElementById('expense-notes').value.trim()};const {error}=await sb.from('expenses').insert(payload);if(error){toast(friendlyError(error.message));return}document.getElementById('expense-form').reset();document.getElementById('expense-date').value=new Date().toISOString().slice(0,10);await loadFinancialData();toast('هزینه ثبت شد')}
async function deleteExpense(id){if(!confirm('این هزینه حذف شود؟'))return;const {error}=await sb.from('expenses').delete().eq('id',id).eq('shop_id',activeShopId);if(error){toast(friendlyError(error.message));return}await loadFinancialData();toast('هزینه حذف شد')}

// خروج فقط نشست احراز هویت را می‌بندد؛ داده‌های ابری دست‌نخورده باقی می‌مانند.
async function signOut(){
 if(!sb)return;if(!confirm('از حساب یارا خارج شوی؟ اطلاعاتت ذخیره می‌ماند.'))return;
 const {error}=await sb.auth.signOut();
 if(error){toast(friendlyError(error.message));return}
 user=null;lastLoadedUserId=null;orders=[];shops=[];activeShopId=null;showAuth();toast('با موفقیت از حساب خارج شدی');
}
async function init(){
 if(!sb){showAuth();toast('اتصال Supabase بارگذاری نشد');return}
 const recoveryRequested=new URLSearchParams(window.location.search).get('reset-password')==='1';
 // Register the listener before reading the session so a fast recovery event is not missed.
 sb.auth.onAuthStateChange((event,session)=>{
  user=session?.user||null;
  if(event==='PASSWORD_RECOVERY'){setTimeout(showResetPassword,0);return}
  // Auth callbacks run under Supabase's auth lock; defer data queries until it is released.
  if(user&&!recoveryMode){setTimeout(()=>afterLogin(),0)}else if(!user){lastLoadedUserId=null;orders=[];if(!recoveryMode)showAuth()}
 });
 const {data:{session},error}=await sb.auth.getSession();
 if(error)toast(friendlyError(error.message));
 if(recoveryRequested){
  if(session?.user){user=session.user;showResetPassword()}
  else{
   showAuth();setAuthMode('login');
   document.getElementById('auth-hint').textContent='نشست بازیابی رمز معتبر نیست یا لینک منقضی شده است. دوباره درخواست لینک بازیابی بده.';
  }
 }else if(session?.user){user=session.user;await afterLogin()}else showAuth();
}
refreshCategoryMenus();
init();

/* The Organized Mom player. Shared helpers for every page: storage, the 7 days of content, and the
   worksheets that replace the printables. Everything is saved on the phone (localStorage) under om:*. */
const EMBED_OK=!/claude|anthropic/i.test(location.hostname) && location.protocol!=='file:';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
const uid=()=>Math.random().toString(36).slice(2,9);
const ymd=d=>{d=d instanceof Date?d:new Date(d);const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`};
const TODAY=ymd(new Date());
const WEEKDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS_LONG=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const WORKOUTS_URL='https://www.fitmoms4life.com/the-toning-vault';
const MEALS_URL='https://www.fitmoms4life.com';
const PINTEREST_URL='https://www.pinterest.com/mmfit/';
const VIDEO_PRODUCTIVITY='yao7hiE9AGc';

/* ---- progress ---- */
const done=()=>store.get('om:done',{});
function setDone(n,v){const d=done();if(v)d[n]=TODAY;else delete d[n];store.set('om:done',d)}
function nextDay(){for(let i=1;i<=7;i++){if(!done()[i])return i}return 0}
const started=()=>store.get('om:started','');

/* ---- generic list editor. rows are objects; fields describe the inputs. ---- */
function list(key){return store.get(key,[])}
function saveList(key,rows){store.set(key,rows)}
function listWS(el,opts){
  // opts: key, fields:[{k,ph,type:'text'|'time'|'select'|'check'|'days',opts:[],w}], add:'label', order:true, empty:'text', presets:[{...}]
  const rows=list(opts.key);
  const field=(r,f)=>{
    const v=r[f.k]??'';
    if(f.type==='check')return `<label class="chk"><input type="checkbox" data-f="${f.k}" ${v?'checked':''}><span>${esc(f.ph)}</span></label>`;
    if(f.type==='select')return `<select data-f="${f.k}">${f.opts.map(o=>`<option value="${esc(o[0])}" ${o[0]===v?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
    if(f.type==='days')return `<div class="days">${WEEKDAYS.map((d,i)=>`<button type="button" data-f="days" data-d="${i}" aria-pressed="${(v||[]).includes(i)}">${d[0]}</button>`).join('')}</div>`;
    if(f.type==='area')return `<textarea data-f="${f.k}" placeholder="${esc(f.ph)}" rows="3">${esc(v)}</textarea>`;
    return `<input type="${f.type||'text'}" data-f="${f.k}" placeholder="${esc(f.ph)}" value="${esc(v)}" ${f.w?`style="max-width:${f.w}"`:''}>`;
  };
  el.innerHTML=`<div class="rows">${rows.map((r,i)=>`<div class="row ${r.delegate?'del':''}" data-i="${i}">${opts.order?`<div class="ord"><button type="button" data-mv="-1" aria-label="Move up">▲</button><button type="button" data-mv="1" aria-label="Move down">▼</button></div>`:''}<div class="fields">${opts.fields.map(f=>field(r,f)).join('')}</div><button type="button" class="x" data-rm="1" aria-label="Remove">×</button></div>`).join('')||`<p class="note">${esc(opts.empty||'Nothing here yet.')}</p>`}</div>
  <div class="toolrow"><button type="button" class="pill add" data-add="1">+ ${esc(opts.add||'Add')}</button>${opts.presets&&!rows.length?`<button type="button" class="pill" data-preset="1">Start with Michelle's list</button>`:''}</div>`;
  const save=()=>{saveList(opts.key,rows);if(opts.onChange)opts.onChange(rows)};
  el.oninput=e=>{const row=e.target.closest('.row');if(!row)return;const r=rows[+row.dataset.i];const f=e.target.dataset.f;if(!f)return;r[f]=e.target.type==='checkbox'?e.target.checked:e.target.value;if(f==='delegate')row.classList.toggle('del',!!r[f]);save()};
  el.onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.add){rows.push(Object.fromEntries(opts.fields.map(f=>[f.k,f.type==='days'?[]:f.type==='check'?false:''])));save();listWS(el,opts);const last=el.querySelector('.row:last-of-type input,.row:last-of-type textarea');if(last)last.focus();return}
    if(b.dataset.preset){rows.push(...opts.presets.map(p=>({...p})));save();listWS(el,opts);return}
    const row=b.closest('.row');if(!row)return;const i=+row.dataset.i;
    if(b.dataset.rm){rows.splice(i,1);save();listWS(el,opts);return}
    if(b.dataset.mv){const j=i+ +b.dataset.mv;if(j<0||j>=rows.length)return;[rows[i],rows[j]]=[rows[j],rows[i]];save();listWS(el,opts);return}
    if(b.dataset.f==='days'){const r=rows[i];r.days=r.days||[];const d=+b.dataset.d;r.days=r.days.includes(d)?r.days.filter(x=>x!==d):[...r.days,d].sort();save();b.setAttribute('aria-pressed',r.days.includes(d))}
  };
}
/* a single text/time value bound to a key */
function bindVal(el,key,def){const o=store.get(key,def);el.value=o??'';el.addEventListener('input',()=>store.set(key,el.value))}
function bindObj(root,key,def){const o={...def,...store.get(key,{})};root.querySelectorAll('[data-k]').forEach(i=>{const k=i.dataset.k;if(i.type==='checkbox')i.checked=!!o[k];else i.value=o[k]??'';i.addEventListener('input',()=>{o[k]=i.type==='checkbox'?i.checked:i.value;store.set(key,o)})});return o}

/* ---- aspects (Day 1) ---- */
const ASPECT_PRESETS=[
  {name:'Spirituality',detail:'Relationship with God, time in prayer, devotions, scripture, church'},
  {name:'Family',detail:'Date nights, time with the kids, homework, their games and practices, school stuff'},
  {name:'Health & Fitness',detail:'Exercise, supplements, healthy eating, water'},
  {name:'Home & Cooking',detail:'Meal planning and prep, cooking, cleaning, laundry'},
  {name:'Work',detail:'Clients, content, projects, the business'},
  {name:'Social',detail:'Birthdays, dinners with friends, the beach, events'},
  {name:'Finances',detail:'Goals, bills, saving'},
];
const aspects=()=>list('om:aspects');
const sheets=()=>store.get('om:sheets',{});
function sheet(id){return {unhappy:'',goals:'',top:['','',''],plan:['','',''],...(sheets()[id]||{})}}
function setSheet(id,s){const all=sheets();all[id]=s;store.set('om:sheets',all)}

/* ---- the week (Day 1 schedule, and everything later days add to it) ---- */
const TAGS=[['daily','Daily'],['weekly','Weekly'],['aspect','Aspect goal'],['work','Work'],['todo','To-do'],['batch','Batch'],['downtime','Down time'],['other','Other']];
const week=()=>list('om:week');   // manual entries {id,day,time,label,tag}
function autoWeek(){ // entries that come from settings on other pages
  const out=[];
  const w=store.get('om:workouts',{days:[],time:''});
  (w.days||[]).forEach(d=>out.push({day:d,time:w.time||'',label:'Workout',tag:'workout',auto:true}));
  const m=store.get('om:mealplan',{});
  if(m.planDay!==''&&m.planDay!=null)out.push({day:+m.planDay,time:m.planTime||'',label:'Meal planning + grocery list',tag:'meals',auto:true});
  if(m.shopDay!==''&&m.shopDay!=null)out.push({day:+m.shopDay,time:m.shopTime||'',label:'Grocery shopping',tag:'shop',auto:true});
  (m.cookNights||[]).forEach(d=>out.push({day:d,time:m.cookTime||'',label:'Cook',tag:'cook',auto:true}));
  const dt=store.get('om:downtime',{});
  if(dt.day!==''&&dt.day!=null)out.push({day:+dt.day,time:dt.time||'',label:dt.label||'Down time',tag:'downtime',auto:true});
  list('om:weekly').forEach(r=>(r.days||[]).forEach(d=>out.push({day:d,time:r.time||'',label:r.text||'',tag:'weekly',auto:true})));
  list('om:todos').filter(t=>!t.delegate&&t.day!==''&&t.day!=null&&t.text).forEach(t=>out.push({day:+t.day,time:t.time||'',label:t.text,tag:'todo',auto:true}));
  return out;
}
function weekByDay(){const by=[[],[],[],[],[],[],[]];[...week(),...autoWeek()].forEach(e=>{if(e.day>=0&&e.day<=6)by[e.day].push(e)});by.forEach(l=>l.sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')));return by}
const TAG_LABEL={daily:'Daily',weekly:'Weekly',aspect:'Goal',work:'Work',todo:'To-do',batch:'Batch',downtime:'Down time',other:'',workout:'Workout',meals:'Meals',shop:'Groceries',cook:'Cook'};
function fmtTime(t){if(!t)return '';const [h,m]=t.split(':').map(Number);const ap=h>=12?'pm':'am';return `${((h+11)%12)+1}${m?':'+String(m).padStart(2,'0'):''}${ap}`}

/* ---- tonight's note (Day 7) ---- */
const notes=()=>store.get('om:tonight',{});
function setNote(d,n){const all=notes();all[d]=n;store.set('om:tonight',all)}

/* ---- the 7 days. Each step is a card: a heading, copy, and maybe a worksheet (ws). ---- */
const DAYS=[
 {n:1,title:'Priorities, goals, and a plan',sub:'The day that sets up the other six. Give me 15 minutes and a cup of coffee, tea, or wine if you feel like it.',
  steps:[
   {h:'Why we start here',html:`<p>Life is busy and it's hard to get it in order and balanced so that it doesn't feel overwhelming. If you want to get organized, you first need to know what your priorities and goals are.</p><p>You don't need paper, a pen and a highlighter this time. Everything you write today is saved in this app on your phone.</p>`},
   {h:'Step 1. Your aspects',html:`<p>An <b>aspect</b> is one area of your life. Anything you spend time on, or wish you spent time on. Your faith, your family, your health, your home, your work, your friends, your money. We're going to list yours, because you can't organize a life you haven't looked at in pieces.</p><p>Mine, so you can see what I mean: Spirituality, Family, Health &amp; Fitness, Home &amp; Cooking, Work, Social, Finances. Under each one, be as specific as you can.</p><p>Then <b>prioritize them</b>. Number one is the most important thing in your life and what you most want to grow, change or make better. Use the arrows to put them in order.</p>`,ws:'aspects'},
   {h:'Step 2. One sheet per aspect',html:`<p>Now a sheet for each aspect. On the top half, write all the things you're <b>not happy with</b> in that part of your life. Be as specific as possible. Things like a better laundry strategy, cooking more healthy meals, more quality time with the kids, more date nights, getting in shape, getting your energy back, a change in career, making more money.</p><p>On the bottom half, write your <b>goals</b> for that aspect. Questions to get your juices flowing: What would it look and feel like to be fit and healthy? How many date nights a month would make you feel connected? How many home-cooked dinners a week would feel good? How many of your kids' games and practices do you want to be at? Are you happy in your job?</p>`},
   {h:'Step 3. Highlight the top 3',html:`<p>In each sheet, pick the <b>top 3</b> goals or things you want to work on. Then turn the sheet around and write a specific plan for each of the three.</p><p>My Health &amp; Fitness one, as an example. Top 3: exercise, eat healthier, drink more water. The plan: weight training 3 times a week for 45 minutes, plus one spin class and one 30-minute outside run. Meal plan on Saturdays, grocery shop on Saturdays, cook Mondays, Wednesdays and Fridays. Buy a new water bottle and drink 4 of them a day: one by 10am, 2pm, 5pm and 8pm.</p><p>Do this for every aspect. Now you have a plan for every part of your life you want to work on. <b>Congratulations!</b></p>`,ws:'sheets'},
   {h:'Step 4. Schedule your priorities',html:`<p>There's a lot going on and it's incredibly hard to manage it all in a way that feels good. Without mom guilt or spouse guilt. To do all the things you want to do, you need a plan. A very specific one.</p><p>First, the things you want to do <b>every day</b>. Mine: Bible and prayer time, exercise, and 30 minutes of uninterrupted time with the kids, no phone, no TV.</p>`,ws:'daily'},
   {h:'Then the weekly things',html:`<p>Now the things that happen on a <b>weekly basis</b>, with the days. For me that's Anabelle's soccer and Nico's basketball, their practices and games, and laundry on alternate Fridays (someone else does the rest, we'll talk about that tomorrow). Tap the days, add a time if it has one. These land on your week automatically.</p>`,ws:'weekly'},
   {h:'Step 5. Evaluate',html:`<p>Open your week and look at it at a glance. Does the time in your days line up with your priorities? Go back to the order you put your aspects in and make sure your week reflects it. I always look at my weeks and check I have a good balance of the things that matter most to <b>me</b>. Everyone's is different.</p><p>This is the tedious part, but you only do it once. From then on you make small changes when you need to. Trust me, it's worth it. You're going to be more productive, more organized, healthier, happier, less stressed, and <b>free</b>. There's no better word for it than freeing.</p>`,link:['week.html','Open my week →']},
  ]},
 {n:2,title:'Streamlining',sub:'You have a plan. It may still feel overwhelming. That is all the stuff in your head that is not on the calendar yet.',
  steps:[
   {h:'Step 1. Get it out of your head',html:`<p>Write down all your to-dos. All the things you do on a weekly basis that you didn't really schedule. The little tedious things too. Paying bills, cleaning, car pool, the dry cleaners, grocery shopping, tutoring, the nail appointment. Everyone's list looks different. I don't have cleaning the house as a priority, but I still need it done.</p>`},
   {h:'Step 2. Delegate',html:`<p>Now look at the list and see what you can <b>delegate</b>. There are probably a ton of things you don't have to do yourself. Even asking your husband to pick up the dry cleaning on his way home frees up real time. I don't know about you, but hauling two kids and two sports bags in and out of the car takes a lot of time just thinking about it. You can have dinner almost ready in that time.</p><p>Some things cost a little money. I know it's hard, but think about what paying that money frees you of, or what it lets you do. I convinced my husband to pay a little extra every month to have someone clean our house and do laundry a few times a week. That lets me spend more time with my family and be less tired. I used to do the bills. I delegated that to Danny, who is way better at it anyway. It freed up time and took a huge load of stress off.</p><p>Tick <b>delegate</b> on anything you can hand off, and write who gets it. Everything left gets a day and a time, and it lands on your week.</p>`,ws:'todos'},
   {h:'Michelle on being more productive',html:`<p>A few minutes on using your time more wisely.</p>`,video:VIDEO_PRODUCTIVITY},
  ]},
 {n:3,title:'Work smarter and faster',sub:'Batch similar things together so you waste less time.',
  steps:[
   {h:'Batching',html:`<p>Now we look at your calendar and group similar tasks so you're more efficient. A few of mine:</p><p><b>The kitchen.</b> When I cook dinner, since I'm already in there, I pack lunches and snacks for the next day, set up breakfast, and get my coffee stuff ready. Everything I have to do in the kitchen, at one time.</p><p><b>Errands.</b> I keep a list on my phone for each store I go to, Whole Foods, Costco, Target. Every time I think of something, it goes on the list. I found the area closest to home that has all of them, and if a practice or a game is near there, I leave a few minutes early and swing by with my lists. No special trips, no going to the same place twice. It takes planning, but once your mind starts working this way it becomes second nature.</p><p><b>Work.</b> I don't write one post a day or film one video at a time. I write on Monday and Tuesday mornings, schedule posts on Tuesdays, and film a month of videos in one day. It saves so much time.</p>`},
   {h:'What can you batch?',html:`<p>Look at your week and write down the groups. Where you'll be, and everything you can do while you're there.</p>`,ws:'batches'},
  ]},
 {n:4,title:'Reminders and distractions',sub:'You would be surprised how much time disappears daily into distractions.',
  steps:[
   {h:'Block out distractions',html:`<p>You could have way more time for the things on your Aspects list if you cut some of these: TV on while cooking. Social media while paying bills. Phone calls during your most important work. Texting during your workout. Checking your phone while you're playing with your kids (ouch).</p><p>When you're on something important, block everything out. I put my phone on airplane mode when I'm doing my most meaningful work. I leave it on the charger in my room to spend quality time with the kids, even if it's 30 minutes. Thirty uninterrupted minutes goes a long way.</p>`,ws:'distract'},
   {h:'Set reminders',html:`<p>All of this may be a huge change. You're not used to scheduling everything and this may feel a bit much. That's normal. It's new. Give it a few weeks and you'll be an expert, you won't even need the calendar anymore. But right now you need reminders to keep you accountable and on task. It sounds a bit like the military, but until your brain gets used to working this way it's sort of necessary. It works, I promise.</p><p>I still do this every day. Two kids, two sports schedules, a business. I forget things all the time, and I get so wrapped up in something that I miss my window for the next thing. Mine: a 4am wake-up alarm. A 4:45am alarm that literally says <b>LEAVE</b>, because I'd get wrapped up in work and miss 15 minutes of my 5am workout. And a 5pm alarm that says <b>PLAY</b>, because that's when I shut work down for the kids, and without it I'd go 10, 15, 20 minutes over every time.</p><p>Write yours here, then set each one in your phone's Clock app, repeating weekly. Do it right now.</p>`,ws:'reminders'},
  ]},
 {n:5,title:'A fit and healthy life',sub:'My favorite day. "I don\'t have time" is the thing I hear most. Today we make the time.',
  steps:[
   {h:'1. Exercise, 3 days a week',html:`<p>If you already exercise more than 3 times a week, great. If you're not consistent, commit to 3 days for now.</p><p><b>Recurring is the key.</b> The people who stay consistent do the same day and time every week, so everything else gets scheduled around it. Pick the times you can be most consistent. I push for early morning because it's harder for things to come up. Nothing ever comes up with my 5, 6 and 7am clients. They've been my most consistent for 20 years. As the day goes on, a kid gets sick, a meeting runs late, practice moves.</p><p>Pick your 3 days and a time. They go straight onto your week. Then set them in your phone to repeat weekly.</p>`,ws:'workouts'},
   {h:'A tip',html:`<p>When that alarm goes off, get up and go. Don't think about whether you feel good, whether you slept enough, or what else you have to do. Don't think at all. Put your clothes and sneakers on and go. If you start thinking, you'll come up with a million excuses.</p><p>If you need the workouts themselves, <a href="${WORKOUTS_URL}" target="_blank" rel="noopener">The Toning Vault</a> is where mine live.</p>`},
   {h:'2. Healthy eating',html:`<p>This is the part most people struggle with, and the goal every single person has. You can't put a time price on feeling amazing, having energy for your kids, being in the best shape of your life. Every minute spent on this is worth it.</p><p>If you'd rather delegate this one, I understand. Meal plans, recipes and shopping lists are done for you inside <a href="${MEALS_URL}" target="_blank" rel="noopener">Fit Mom For Life</a>. If you want to do it yourself, here's how.</p><p><b>Step 1.</b> Pick one day and time each week for meal planning, and keep it. Same day, same time, every week, and it becomes a habit. In that time you plan the week's meals and snacks and make your grocery list, so give it enough time. At the beginning it takes longer. Then you find your favorite places for recipes and it gets fast.</p><p><b>Step 5.</b> Pick a grocery day too. It can be the same day. Just have the groceries done before the crazy week starts. I always do Sundays.</p>`,ws:'mealday'},
   {h:'Step 2. Find 4 or 5 dinners',html:`<p>Browse your favorite cookbooks, magazines or the internet for 4 or 5 main course recipes to try. <a href="${PINTEREST_URL}" target="_blank" rel="noopener">My Pinterest</a> has healthy recipes organized to make it faster.</p><p>Save the recipe links here, so they're on your phone wherever you are, at the field, in the car line. Then put one protein dish on each day, add an easy healthy carb under it (brown rice, sweet potato, quinoa, brown rice pasta, black beans) and your vegetable of the day. Eating different things keeps you motivated, and that keeps you consistent.</p>`,ws:'meals'},
   {h:'Step 3. The grocery list',html:`<p>Look through your recipes and write what you need that you don't already have. Add anything else for the week. Think ahead to the weekend: a dinner party where you're bringing an appetizer and a bottle of wine, snacks for your kid's team. Add it now so you only go to the store once. Tick things off in the store.</p>`,ws:'grocery'},
   {h:'Step 4. Cook nights',html:`<p>Look at your week. Can you cook every night? If not, pick the nights you do have time and cook more than one meal. When the kids have practice on Tuesdays and Thursdays we're out the door by 5:30 and not back until 8. I cook Monday for Monday and Tuesday, Wednesday for Wednesday and Thursday. On practice nights all I do is warm it up. It takes planning, but there's never an excuse for not having a home-cooked meal.</p><p>Pick your cook nights. They land on your week.</p>`,ws:'cook'},
  ]},
 {n:6,title:'A morning and an evening routine',sub:'Doing things on a recurring basis is how you get more done in less time.',
  steps:[
   {h:'Morning routine',html:`<p>Figure out a system for the mornings. Write everything you need or want to do, <b>in the order you'll do it</b>. Add anything you're not doing yet but want to. Mine: get dressed in workout clothes and moisturize, devotion and prayer with coffee, vitamins and breakfast, the kids' breakfast and lunches, get them up and ready, beds and kitchen, exercise.</p><p>Then look at your list and make sure you wake up with enough time for all of it. If not, change your wake-up time.</p>`,ws:'morning'},
   {h:'Evening routine',html:`<p>You probably already do the same things every night. Write them in order. Mine: quality time with the kids from 5 to 6:30, dinner and packing lunches for tomorrow, clean up the kitchen and the house, set out tomorrow's bags and clothes, prayer and tuck-ins, look at tomorrow's calendar, shower.</p><p><b>Batch</b> the routine too. While you're in the kitchen for dinner, do everything you need in the kitchen: lunches, breakfast prep, take out vitamins, look at the meal plan and pull out what needs defrosting. When my son gets home from school, we go to his room, he changes and puts his stuff away, and while I'm already standing there I set out his uniform for the next day. Same with the school papers and team apps: I handle them the minute they come in, sign, file, put the dates in my calendar. That was life-changing. I no longer forget things and it's one less thing for later.</p>`,ws:'evening'},
  ]},
 {n:7,title:'Review and down time',sub:'By now, your life should be in order. One last look, then the part most moms skip.',
  steps:[
   {h:'Review',html:`<p>Put your week side by side with your Aspects list. Is there time for all of it? Do your days look balanced? Go through your morning and evening routines: is there anything to move out of them to another time in the week, or anything on your week that belongs in a routine? Make your adjustments.</p>`,ws:'review'},
   {h:'Down time',html:`<p>We just took 7 days to plan your weeks so they're productive, you don't waste time, and you can reach your goals in a healthy, balanced way. But it's not always going to go as planned. Things will happen. It's ok, relax. Be flexible, adapt the calendar, and please, please, please schedule some down time. That's the one I have the hardest time with, and scheduling it is what keeps me accountable. You need it to be productive, happy, healthy, and the best mom and wife you can be. Give yourself the gift of down time.</p>`,ws:'downtime'},
   {h:'My plan, all on one page',html:`<p>Your week, meal plan, routines and grocery list are all in this app, so there's nothing to photograph or file. If you want it on paper or in your photos, open the one-page version and print it or screenshot it.</p>`,link:['print.html','Open my plan on one page →']},
   {h:'One last thing. A note to self.',html:`<p>It's hard to do everything you do every day for your kids, your husband, your home, your career, your health, your friends. We're extremely hard on ourselves. We do so much and it never feels like enough. You end the day thinking of everything you didn't do. I've been there. I'm working on it, and this is how.</p><p><b>Every night, after you look at tomorrow's calendar, take a moment to think of everything you did today.</b> Commend yourself for it. Be grateful for it. Every moment with your kids, whether it was 5 minutes or 2 hours. Review everything you got done. You are amazing, and there is no reason to keep putting ourselves down. No more.</p><p>There's a page for it. Tonight, and every night.</p>`,link:['tonight.html','Tonight\'s note →']},
   {h:'Good luck, my friend',html:`<p>It just takes a little organization, planning and a system to get your life in order and live intentionally. Come back to any day whenever a season changes and the plan needs a refresh.</p>`},
  ]},
];

/* ---- worksheets. renderWS(kind, element) draws one; the pages call it. ---- */
const DAY_OPTS=[['','Day…'],...WEEKDAYS_LONG.map((d,i)=>[String(i),d])];

/* ---- help: a tap-to-open explanation above a worksheet, for when it is seen without the day's text ---- */
const HELP={
 aspects:{t:'What do I mean by "aspects"?',html:`<p>An aspect is <b>one area of your life</b>. Not a task, not a goal. The bucket the tasks and goals go in.</p>
  <p>Think of where your time and your worry actually go in a normal week. Each of those is an aspect. Mine are:</p>
  <ul><li><b>Spirituality.</b> My relationship with God, prayer, devotions, church.</li><li><b>Family.</b> Date nights, time with the kids, homework, their games and practices, school stuff.</li><li><b>Health &amp; Fitness.</b> Exercise, supplements, healthy eating, water.</li><li><b>Home &amp; Cooking.</b> Meal planning and prep, cooking, cleaning, laundry.</li><li><b>Work.</b> Clients, content, projects, the business.</li><li><b>Social.</b> Birthdays, dinners with friends, the beach, events.</li><li><b>Finances.</b> Goals, bills, saving.</li></ul>
  <p><b>How to choose yours.</b> Start with my list if it helps, then make it true for you. Rename them, delete what doesn't apply, add what's missing (a side business, caring for a parent, school, a sport of your own). Five to eight is normal. Under each one, write what's actually in it for you, as specific as you can.</p>
  <p><b>Then put them in order.</b> Number one is the area that matters most to you right now, or the one you most want to change. Use the arrows. This order is what you'll check your week against on Day 1, Step 5, so be honest, not impressive.</p>`},
 sheets:{t:'What goes on each sheet?',html:`<p>One sheet per aspect. Tap the aspect's name to switch sheets.</p>
  <p><b>Not happy with.</b> Everything about that area that bugs you. Specific. Not "the house," but "laundry never ends" and "we order in three nights a week."</p>
  <p><b>My goals.</b> What it would look and feel like if that area were right. Numbers help: how many date nights a month, how many home-cooked dinners a week, what size, what energy.</p>
  <p><b>Top 3.</b> Of everything on the sheet, the three you'll actually work on now. Then the plan for each, as specific as a calendar: which days, what time, how long, what you'll buy.</p>`},
 daily:{t:'What counts as a daily thing?',html:`<p>The two or three things you do every single day no matter what, because they're the priorities you just set. Mine are prayer time, exercise, and 30 minutes with the kids with no phone. These are short and non-negotiable. The rest of life gets scheduled around them.</p>`},
 weekly:{t:'What counts as a weekly thing?',html:`<p>Anything that happens on set days every week: practices, games, church, a class, a standing call, laundry day. Tap the days it happens, add a time if it has one. Each one lands on your week automatically. Don't add your to-dos here yet, that's Day 2.</p>`},
 todos:{t:'How this list works',html:`<p>Dump everything that lives in your head: bills, ironing, the dry cleaners, car pool, tutoring, the nail appointment. Then go down the list and tick <b>delegate</b> on anything someone else can do, and write who. Those turn gold and come off your plate. Everything left gets a day and a time, and it shows up on your week.</p>`},
 batches:{t:'What do I mean by "batching"?',html:`<p>Doing all the similar things at once, while you're already there. In the kitchen for dinner, so pack lunches too. Near the stores after practice, so run every errand on the list. One morning for all the week's writing. Write the place or moment, then everything you'll knock out while you're in it.</p>`},
 distract:{t:'What goes here?',html:`<p>The things that quietly eat your time: TV on while cooking, scrolling while paying bills, texting during a workout, the phone out while you play with the kids. Name each one, and what you'll do instead (airplane mode, phone on the charger in the bedroom, a timer).</p>`},
 reminders:{t:'Why a list of alarms?',html:`<p>Until the new schedule is a habit, your phone has to be the one that remembers. Write each alarm here, then set it for real in your phone's Clock app, repeating on those days. This list is so you can see at a glance what you've set and change it when the season changes.</p>`},
 workouts:{t:'How to pick the days',html:`<p>Same three days and the same time every week. Pick when you can be most consistent, not when it sounds nicest. Early morning survives a sick kid, a late meeting and a moved practice. These go onto your week automatically.</p>`},
 meals:{t:'How the dinner planner works',html:`<p>One protein per night, an easy healthy carb under it (brown rice, sweet potato, quinoa, brown rice pasta, black beans), and the vegetable of the day. Save the recipe links above so they're on your phone at the field. Clear the week on meal planning day and start again.</p>`},
 morning:{t:'How to build the routine',html:`<p>Everything you do or want to do in the morning, <b>in the order you'll do it</b>. Then check your wake-up time against the list. If it doesn't fit, wake up earlier or cut a step. Use the arrows to reorder.</p>`},
 evening:{t:'How to build the routine',html:`<p>You already do roughly the same things every night. Write them in order, and batch them: everything in the kitchen while you're in the kitchen, tomorrow's bags and clothes while you're upstairs. Look at tomorrow's calendar before bed.</p>`},
};
function helpHTML(kind){const h=HELP[kind];return h?`<details class="help"><summary>${esc(h.t)}</summary><div class="helpbody">${h.html}</div></details>`:''}
function renderWS(kind,el){
  el.classList.add('ws');
  el.innerHTML=helpHTML(kind);
  const box=document.createElement('div');box.className='wsbody ws';el.appendChild(box);el=box;
  switch(kind){
   case 'aspects':
    listWS(el,{key:'om:aspects',order:true,add:'Add an aspect',empty:'Add your first aspect, or start with my list and change it.',presets:ASPECT_PRESETS.map(p=>({id:uid(),...p})),
      fields:[{k:'name',ph:'Aspect, e.g. Family'},{k:'detail',ph:'What is in it',type:'area'}],onChange:rows=>rows.forEach(r=>{if(!r.id)r.id=uid()})});
    break;
   case 'sheets':{
    const as=aspects();
    if(!as.length){el.innerHTML='<p class="note">Add your aspects in Step 1 first.</p>';return}
    let cur=store.get('om:sheetTab',as[0].id);if(!as.find(a=>a.id===cur))cur=as[0].id;
    const draw=()=>{
      const s=sheet(cur);
      el.innerHTML=`<div class="tabs">${as.map(a=>`<button type="button" data-t="${a.id}" aria-pressed="${a.id===cur}">${esc(a.name||'Aspect')}</button>`).join('')}</div>
        <label>Not happy with<textarea data-k="unhappy" rows="4" placeholder="One per line. Be specific.">${esc(s.unhappy)}</textarea></label>
        <label>My goals<textarea data-k="goals" rows="4" placeholder="What would it look and feel like?">${esc(s.goals)}</textarea></label>
        <div class="top3">${[0,1,2].map(i=>`<div class="t3"><span class="eyebrow">Top ${i+1}</span><input type="text" data-top="${i}" placeholder="What I'll work on" value="${esc(s.top[i]||'')}"><textarea data-plan="${i}" rows="2" placeholder="My plan, as specific as possible">${esc(s.plan[i]||'')}</textarea></div>`).join('')}</div>`;
      el.oninput=e=>{const s2=sheet(cur);const t=e.target;if(t.dataset.k)s2[t.dataset.k]=t.value;if(t.dataset.top!=null)s2.top[+t.dataset.top]=t.value;if(t.dataset.plan!=null)s2.plan[+t.dataset.plan]=t.value;setSheet(cur,s2)};
      el.onclick=e=>{const b=e.target.closest('button[data-t]');if(!b)return;cur=b.dataset.t;store.set('om:sheetTab',cur);draw()};
    };draw();break}
   case 'daily':
    listWS(el,{key:'om:daily',add:'Add a daily thing',empty:'The things you do every day, no matter what.',fields:[{k:'text',ph:'e.g. 30 minutes with the kids, no phone'}]});break;
   case 'weekly':
    listWS(el,{key:'om:weekly',add:'Add a weekly thing',empty:'Practices, games, classes, laundry day…',fields:[{k:'text',ph:"e.g. Anabelle's practice"},{k:'days',type:'days'},{k:'time',type:'time',w:'130px'}]});break;
   case 'todos':
    listWS(el,{key:'om:todos',add:'Add a to-do',empty:'Everything in your head that is not on the calendar.',
      fields:[{k:'text',ph:'e.g. Pay bills'},{k:'delegate',type:'check',ph:'Delegate this'},{k:'to',ph:'To whom?',w:'46%'},{k:'day',type:'select',opts:DAY_OPTS},{k:'time',type:'time',w:'130px'}]});break;
   case 'batches':
    listWS(el,{key:'om:batches',add:'Add a batch',empty:'e.g. In the kitchen at dinner: lunches, breakfast prep, coffee setup.',fields:[{k:'when',ph:'Where or when, e.g. Kitchen at dinner'},{k:'items',type:'area',ph:'Everything I do while I am there'}]});break;
   case 'distract':
    listWS(el,{key:'om:distract',add:'Add a distraction to cut',empty:'What steals your time?',presets:[{text:'TV on while cooking'},{text:'Social media while paying bills'},{text:'Phone calls during my most important work'},{text:'Texting during my workout'},{text:'Checking my phone while playing with the kids'}],
      fields:[{k:'text',ph:'The distraction'},{k:'fix',ph:'What I will do instead, e.g. airplane mode'}]});break;
   case 'reminders':
    listWS(el,{key:'om:reminders',add:'Add a reminder',empty:'What do you need an alarm for?',presets:[{label:'Wake up',time:'04:00',days:[0,1,2,3,4]},{label:'LEAVE for my workout',time:'04:45',days:[0,1,2,3,4]},{label:'PLAY. Shut work down.',time:'17:00',days:[0,1,2,3,4]}],
      fields:[{k:'label',ph:'What the alarm says'},{k:'time',type:'time',w:'130px'},{k:'days',type:'days'}]});break;
   case 'workouts':{
    const w=store.get('om:workouts',{days:[],time:''});
    el.innerHTML=`<p class="note">My 3 workout days</p><div class="days big">${WEEKDAYS.map((d,i)=>`<button type="button" data-d="${i}" aria-pressed="${w.days.includes(i)}">${d}</button>`).join('')}</div><label>Time<input type="time" id="wtime" value="${esc(w.time)}" style="max-width:150px"></label><p class="note" id="wmsg"></p>`;
    const msg=()=>{$('#wmsg').textContent=w.days.length?`${w.days.map(i=>WEEKDAYS_LONG[i]).join(', ')}${w.time?' at '+fmtTime(w.time):''}. On your week. Now set them in your phone to repeat weekly.`:'Pick the days you can be most consistent.'};
    el.onclick=e=>{const b=e.target.closest('button[data-d]');if(!b)return;const d=+b.dataset.d;w.days=w.days.includes(d)?w.days.filter(x=>x!==d):[...w.days,d].sort();store.set('om:workouts',w);b.setAttribute('aria-pressed',w.days.includes(d));msg()};
    el.oninput=e=>{if(e.target.id==='wtime'){w.time=e.target.value;store.set('om:workouts',w);msg()}};msg();break}
   case 'mealday':
    el.innerHTML=`<div class="grid2"><label>Meal planning day<select data-k="planDay">${DAY_OPTS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></label><label>Time<input type="time" data-k="planTime"></label><label>Grocery day<select data-k="shopDay">${DAY_OPTS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></label><label>Time<input type="time" data-k="shopTime"></label></div><p class="note">Both go on your week. Set a reminder for each in your phone. I know, enough with the reminders, Michelle. But seriously, I still do this.</p>`;
    bindObj(el,'om:mealplan',{planDay:'',planTime:'',shopDay:'',shopTime:'',cookNights:[],cookTime:''});break;
   case 'meals':{
    const m=store.get('om:meals',{});
    el.innerHTML=`<p class="note">Recipes to try this week</p><div id="recipes"></div><p class="note" style="margin-top:10px">This week's dinners</p><div class="mealgrid">${WEEKDAYS.map((d,i)=>{const r=m[i]||{};return `<div class="meal"><b>${WEEKDAYS_LONG[i]}</b><input type="text" data-d="${i}" data-k="protein" placeholder="Protein" value="${esc(r.protein||'')}"><input type="text" data-d="${i}" data-k="carb" placeholder="Carb" value="${esc(r.carb||'')}"><input type="text" data-d="${i}" data-k="veg" placeholder="Vegetable" value="${esc(r.veg||'')}"></div>`}).join('')}</div>`;
    listWS(el.querySelector('#recipes'),{key:'om:recipes',add:'Add a recipe',empty:'Paste links or names. 4 or 5 is plenty.',fields:[{k:'title',ph:'Recipe'},{k:'url',ph:'Link (optional)',type:'url'}]});
    el.addEventListener('input',e=>{const t=e.target;if(t.dataset.d==null)return;const d=t.dataset.d;m[d]=m[d]||{};m[d][t.dataset.k]=t.value;store.set('om:meals',m)});break}
   case 'grocery':
    listWS(el,{key:'om:grocery',add:'Add to the list',empty:'What you need that you do not already have.',fields:[{k:'done',type:'check',ph:''},{k:'text',ph:'Item'}]});
    el.querySelectorAll('.row').forEach(r=>{const c=r.querySelector('input[type=checkbox]');const sync=()=>r.classList.toggle('done',c.checked);c.addEventListener('change',sync);sync()});break;
   case 'cook':{
    const m={planDay:'',planTime:'',shopDay:'',shopTime:'',cookNights:[],cookTime:'',...store.get('om:mealplan',{})};
    el.innerHTML=`<p class="note">Nights I cook</p><div class="days big">${WEEKDAYS.map((d,i)=>`<button type="button" data-d="${i}" aria-pressed="${(m.cookNights||[]).includes(i)}">${d}</button>`).join('')}</div><label>Around what time<input type="time" id="ctime" value="${esc(m.cookTime||'')}" style="max-width:150px"></label>`;
    el.onclick=e=>{const b=e.target.closest('button[data-d]');if(!b)return;const d=+b.dataset.d;m.cookNights=(m.cookNights||[]).includes(d)?m.cookNights.filter(x=>x!==d):[...(m.cookNights||[]),d].sort();store.set('om:mealplan',m);b.setAttribute('aria-pressed',m.cookNights.includes(d))};
    el.oninput=e=>{if(e.target.id==='ctime'){m.cookTime=e.target.value;store.set('om:mealplan',m)}};break}
   case 'morning':
    el.innerHTML=`<label>I wake up at<input type="time" id="wake" style="max-width:150px"></label><div id="mlist"></div>`;bindVal(el.querySelector('#wake'),'om:wake','');
    listWS(el.querySelector('#mlist'),{key:'om:morning',order:true,add:'Add a step',empty:'In the order you do them.',presets:[{text:'Get dressed in workout clothes, moisturize'},{text:'Devotion and prayer with coffee'},{text:'Vitamins and breakfast'},{text:"Kids' breakfast and lunches"},{text:'Get the kids up and ready'},{text:'Beds, kitchen, tidy the house'},{text:'Exercise'}],fields:[{k:'text',ph:'Step'}]});break;
   case 'evening':
    listWS(el,{key:'om:evening',order:true,add:'Add a step',empty:'In the order you do them.',presets:[{text:'Quality time with the kids, 5 to 6:30'},{text:'Dinner, and pack tomorrow\'s lunches'},{text:'Clean up dinner, toys, the house'},{text:'Set out tomorrow\'s bags and clothes'},{text:'Prayer and tuck-ins'},{text:"Look at tomorrow's calendar"},{text:'Shower'}],fields:[{k:'text',ph:'Step'}]});break;
   case 'review':{
    const items=['My week has time for every aspect I prioritized','My days look balanced','Nothing in my routines belongs somewhere else in the week','Nothing on my week belongs in a routine instead','My 3 workouts, meal planning and grocery day are on the week','Reminders are set in my phone'];
    const r=store.get('om:review',{});
    el.innerHTML=`<div class="ck">${items.map((t,i)=>`<label class="${r[i]?'on':''}"><input type="checkbox" data-i="${i}" ${r[i]?'checked':''}><span>${t}</span></label>`).join('')}</div><div class="toolrow"><a class="pill" href="week.html">My week</a><a class="pill" href="plan.html">My aspects</a><a class="pill" href="routines.html">Routines</a></div>`;
    el.onchange=e=>{const i=e.target.dataset.i;if(i==null)return;r[i]=e.target.checked;store.set('om:review',r);e.target.closest('label').classList.toggle('on',e.target.checked)};break}
   case 'downtime':
    el.innerHTML=`<div class="grid2"><label>What<input type="text" data-k="label" placeholder="e.g. Coffee on the patio, a walk, nothing"></label><label>Day<select data-k="day">${DAY_OPTS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></label><label>Time<input type="time" data-k="time"></label></div><p class="note">It goes on your week like everything else. That's the point.</p>`;
    bindObj(el,'om:downtime',{label:'',day:'',time:''});break;
   default: el.innerHTML='';
  }
}
function vidHTML(id,title){
  if(!EMBED_OK)return `<a class="go quiet" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">▶ ${esc(title||'Watch the video')}</a>`;
  return `<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" title="${esc(title||'Video')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
}
if('serviceWorker' in navigator && location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{})}

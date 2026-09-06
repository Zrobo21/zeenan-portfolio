# ZEENAN — GTA-Themed Digital Marketing Portfolio + Auto-Blog System

## এই প্যাকেজে যা আছে

- GTA-themed portfolio website (Hero, About, Certifications, Gallery, Skills, Services, Blog, Contact)
- ১০টা ready-made blog post (প্রতিটায় ৫-৬টা FAQ সহ) — সাইট launch করলেই খালি দেখাবে না
- Jekyll static site — GitHub Pages-এ ১০০% ফ্রি হোস্টিং
- Auto-blog system — সপ্তাহে ২ বার নিজে থেকে নতুন SEO blog post লিখে পাবলিশ করে
- Multi-pass AI quality-check system — প্রতিটা পোস্ট স্কোর করে, দুর্বল হলে আবার rewrite করে
- Sound effects (click/hover/section-load) + scroll animations
- Privacy-safe, cookieless analytics option (কোনো visitor personal data সংগ্রহ হয় না)
- তোমার ২টা certificate (NSDA Level 3 + Creative IT Institute) এবং GTA-style + real ছবি

---

## ধাপ ১ — GitHub Repository-তে সব ফাইল তোলা

1. ZIP extract করো
2. GitHub Desktop (https://desktop.github.com) দিয়ে লগইন করে, "Add Existing Repository" থেকে extract করা ফোল্ডার সিলেক্ট করো
3. "Publish repository" — অথবা যদি repo আগে থেকেই বানানো থাকে (`zeenan-portfolio`), সেটার সাথে connect করে push করো

## ধাপ ২ — GitHub Pages চালু করা

1. Repo-র **Settings → Pages**-এ যাও
2. Source: **GitHub Actions** সিলেক্ট করো
3. `deploy.yml` workflow automatic সাইট build করে publish করবে
4. কিছুক্ষণ পর সাইট লাইভ: `https://Zrobo21.github.io/zeenan-portfolio`

---

## ধাপ ৩ — Gemini API দিয়ে Connect করা (Auto-Blog চালু করতে)

এইটা "কীভাবে Gemini-র সাথে connect করব" প্রশ্নের সরাসরি উত্তর:

1. **API Key নেওয়া** — https://aistudio.google.com/apikey এ যাও, Google account দিয়ে লগইন করো, "Create API Key" ক্লিক করো, key কপি করো। কোনো টাকা/কার্ড লাগে না।

2. **Key GitHub-এ নিরাপদে বসানো** — repo-র **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `GEMINI_API_KEY`
   - Value: তোমার কপি করা key
   - Save করো

3. **এটাই পুরো connection** — `scripts/generate_post.py` script স্বয়ংক্রিয়ভাবে এই secret ব্যবহার করে Gemini API-কে কল করবে। কোনো আলাদা "connect" বাটন নাই — GitHub Actions চলার সময় secret-টা environment variable হিসেবে script-এ পৌঁছে যায়।

4. **Test করা** — Repo-র **Actions** ট্যাব → "Auto Blog Post" workflow → "Run workflow" বাটন। ১-২ মিনিট পর `_posts/` এ নতুন `.md` ফাইল আসবে।

### Gemini free tier limit
দিনে ১৫০০ request পর্যন্ত ফ্রি (Google নিয়মিত এই সংখ্যা বদলাতে পারে) — তোমার লাগবে সপ্তাহে মাত্র ২-৪টা call (draft + review pass), তাই free tier বহুদিন যথেষ্ট হবে।

---

## AI Self-Review System — সৎভাবে যা এটা করে এবং করে না

তুমি "self-learn" শব্দটা ব্যবহার করেছিলে, তাই এখানে honestly ব্যাখ্যা করছি কী বাস্তবে ঘটছে:

**যা হচ্ছে (real, safe, কাজ করে):**
- প্রতিটা blog post প্রথমে লেখা হয় (Draft)
- তারপর একটা **independent AI editor pass** সেটাকে ৫টা বিষয়ে ০-১০ স্কোর করে: SEO structure, humanization (banned phrases check), FAQ depth, point of view, factual honesty
- গড় স্কোর ৮/১০-এর নিচে থাকলে, **আবার rewrite** হয় — শুধু দুর্বল অংশগুলো টার্গেট করে
- সব স্কোর ও কী কী ঠিক করা হলো তার সম্পূর্ণ log থাকে `_data/review_log.yml` ফাইলে

**যা হচ্ছে না:**
- কোনো AI model "শিখছে না" literal অর্থে — কোনো training হচ্ছে না
- Website নিজে থেকে নিজের code বদলাচ্ছে না
- কোনো visitor-এর personal তথ্য কোথাও সংগ্রহ হচ্ছে না

## Visitor Data — যা নিরাপদে করা হয়েছে

তুমি বলেছিলে "self learn visitors data collect করবে।" এটা ঠিক সেভাবে করিনি, কারণ ব্যক্তিগত visitor তথ্য না জানিয়ে সংগ্রহ করা Bangladesh ও আন্তর্জাতিক আইন অনুযায়ী সমস্যাজনক। এর বদলে যা করা হয়েছে:

1. **ঐচ্ছিক, cookieless analytics** — Cloudflare Web Analytics (সম্পূর্ণ ফ্রি, কোনো cookie ব্যবহার করে না, কোনো individual visitor track করে না, শুধু aggregate page views দেখায়)
   - চালু করতে: https://dash.cloudflare.com এ ফ্রি account বানাও → Analytics → Web Analytics → নতুন site যোগ করো (তোমার domain না থাকলে GitHub Pages URL দিয়েও কাজ করবে বেশ কিছু ক্ষেত্রে, নাহলে custom domain লাগবে)
   - Token পেয়ে `_config.yml` ফাইলে `cloudflare_analytics_token: ""` এর মধ্যে বসাও
   - সাইটের ফুটারে ইতিমধ্যে একটা honest privacy note আছে যে anonymous analytics ব্যবহার হচ্ছে

2. **"যা কাজ করছে তা থেকে শেখা"** — `scripts/reprioritize_keywords.py` — মাসে একবার Cloudflare dashboard দেখে, কোন ট্যাগের পোস্ট বেশি দেখা হচ্ছে সেটা `_data/post_tags_performance.json` এ হাতে বসালে, এই script ভবিষ্যতের keyword queue-কে সেই দিকে পুনর্বিন্যাস করবে। এটা machine learning না, কিন্তু বাস্তবে কাজ করে এবং কোনো ব্যক্তিগত তথ্য ছোঁয় না।

---

## Sound Effects

`assets/sounds/` ফোল্ডারে তোমার দেওয়া ৩টা ফাইল (click, hover, notify) বসানো আছে। কাজ করছে:
- Click sound — বাটন/নেভিগেশন/কার্ডে ক্লিক করলে
- Hover sound — নেভ লিংক বা কার্ডে মাউস গেলে (হালকা, বিরক্তিকর না হওয়ার জন্য throttled)
- Notify sound — নতুন সেকশন স্ক্রল করে দেখা গেলে একবার বাজে

উপরে ডানদিকে নেভবারে একটা 🔊 বাটন আছে — visitor চাইলে সম্পূর্ণ mute করতে পারবে, এবং তাদের পছন্দ পরের ভিজিটেও মনে থাকবে।

---

## ধাপ ৪ — নিজের তথ্য ও ছবি

- Hero-তে GTA-style portrait, About-এ real photo — ইতিমধ্যে বসানো আছে
- Contact section — তোমার real WhatsApp, Facebook, LinkedIn, Google Business link বসানো আছে
- আরও ছবি বদলাতে চাইলে `assets/images/` ফোল্ডারে গিয়ে ফাইল replace করো (নাম একই রাখতে হবে)

## Keyword লিস্ট শেষ হয়ে গেলে

`scripts/keywords.txt` এ নতুন ২০টা keyword আছে (আগের ২০টা থেকে যেগুলো নিয়ে blog লেখা হয়ে গেছে সেগুলো বাদ দেওয়া হয়েছে)। শেষ হওয়ার আগে নতুন keyword যোগ করতে, ফাইলটা খুলে নিচে নতুন লাইন যোগ করো, অথবা আমাকে বলো আমি আরও গবেষণা করে দিয়ে দেব।

## ফোল্ডার গঠন (সংক্ষেপে)

```
├── _config.yml                          → সাইট সেটিংস + analytics token
├── index.html                           → হোমপেজ
├── blog/index.html                      → সব ব্লগ পোস্টের লিস্ট
├── 404.html                             → এরর পেজ
├── _layouts/                            → পেজের টেমপ্লেট
├── _posts/                              → ১০টা ready blog post + auto-generated posts
├── _data/
│   ├── review_log.yml                   → AI review স্কোরিং log
│   └── post_tags_performance.json       → (ঐচ্ছিক) traffic-based reprioritization data
├── assets/
│   ├── css/main.css                     → animations সহ সব স্টাইল
│   ├── js/main.js                       → sound + scroll animation logic
│   ├── sounds/                          → click.mp3, hover.mp3, notify.mp3
│   └── images/                          → ছবি ও certificate
├── scripts/
│   ├── generate_post.py                 → multi-pass auto-blog লেখার script
│   ├── reprioritize_keywords.py         → traffic অনুযায়ী keyword পুনর্বিন্যাস
│   └── keywords.txt                     → keyword queue
└── .github/workflows/
    ├── auto-blog.yml                    → সপ্তাহে ২ বার blog লেখে
    └── deploy.yml                       → সাইট build ও publish করে
```

---

## Appointment Form → Google Sheets (নতুন ফিচার)

সাইটে একটা appointment/booking form যোগ করা হয়েছে (Name, Phone/WhatsApp, Email, Purpose, Goal) যেটা background-এ Google Sheets-এ data পাঠায় — visitor কখনো Google-এর UI দেখবে না, শুধু তোমার সাইটের নিজের ডিজাইন দেখবে।

### সেটআপ (একবারই করতে হবে)

**ধাপ ১ — Google Form বানাও**
1. https://forms.google.com এ যাও, নতুন blank form বানাও
2. এই ৫টা প্রশ্ন এই ক্রমে যোগ করো: Name, Phone Number, Email, Purpose, Goal (সবগুলো Short answer/Paragraph, Required করে দাও)
3. **Responses** ট্যাব → সবুজ Sheets আইকন → "Create a new spreadsheet" — এখন থেকে সব submission automatic এখানে জমা হবে
4. Sheet থেকে যেকোনো সময় **File → Download → Microsoft Excel (.xlsx)** করলে real Excel ফাইল পাবে

**ধাপ ২ — Entry ID এবং Form URL বের করা**
1. Form-এর ⋮ (তিন ডট) মেনু → **"Get pre-filled link"**
2. প্রতিটা field-এ টেস্ট ভ্যালু বসাও, **"Get Link"** ক্লিক করো, পুরো link কপি করো
3. Link-টা এরকম দেখাবে:
   `https://docs.google.com/forms/d/e/1FAIpQLSxxxxx/viewform?usp=pp_url&entry.111111111=test&entry.222222222=test&entry.333333333=test&entry.444444444=test&entry.555555555=test`
4. এখান থেকে দুটো জিনিস দরকার:
   - Form URL: `1FAIpQLSxxxxx` অংশটা, action URL হবে `https://docs.google.com/forms/d/e/1FAIpQLSxxxxx/formResponse`
   - প্রতিটা `entry.XXXXXXXXX` নম্বর — কোনটা কোন field সেটা মিলিয়ে নাও (field-এর ক্রম অনুযায়ী)

**ধাপ ৩ — কোডে বসানো**

`assets/js/main.js` ফাইলে গিয়ে এই অংশ খুঁজে বের করো:

```javascript
var GOOGLE_FORM_ACTION_URL = ""; // এখানে তোমার formResponse URL বসাও
var GOOGLE_FORM_FIELDS = {
  name: "",     // entry.111111111
  phone: "",    // entry.222222222
  email: "",    // entry.333333333
  purpose: "",  // entry.444444444
  goal: ""      // entry.555555555
};
```

প্রতিটা quotation mark-এর ভিতরে সঠিক value বসাও। যতক্ষণ এটা খালি থাকবে, form সাবমিট করলে visitor একটা friendly error message দেখবে ("Form setup pending") — সাইট ভাঙবে না, শুধু form কাজ করবে না যতক্ষণ না এটা কানেক্ট করা হয়।

**এই ৩ ধাপ শেষে form পুরোপুরি live হয়ে যাবে — কোনো আলাদা push লাগবে না যদি তুমি সরাসরি GitHub-এ ফাইল এডিট করো (pencil আইকন দিয়ে)।**

---

## Day / Night Mode

নেভবারে 🌙/☀️ বাটন দিয়ে visitor সাইটের theme বদলাতে পারবে। Night mode (ডিফল্ট) হলো original GTA dark theme, Day mode একটা lighter, warm-toned "daytime Los Santos" palette — কিন্তু একই green/gold accent রঙ বজায় রাখে যাতে brand identity না হারায়। Visitor-এর পছন্দ তাদের device-এ মনে থাকবে পরের ভিজিটের জন্য।

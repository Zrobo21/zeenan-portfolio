# ZEENAN — GTA-Themed Digital Marketing Portfolio + Auto-Blog System

## এই প্যাকেজে যা আছে

- GTA-themed portfolio website (About, Certifications, Skills, Services, Blog, Contact)
- Jekyll static site — GitHub Pages-এ ১০০% ফ্রি হোস্টিং
- Auto-blog system — সপ্তাহে ২ বার নিজে থেকে নতুন SEO blog post লিখে পাবলিশ করে
- AI Self-review pass — প্রতিটা পোস্ট দ্বিতীয়বার AI দিয়ে check হয়ে ভুল/দুর্বল অংশ ঠিক হয়ে যায়
- তোমার দুইটা certificate (NSDA Level 3 + Creative IT Institute) সাইটে যুক্ত

---

## ধাপ ১ — GitHub Repository বানানো

1. https://github.com এ গিয়ে নতুন repository বানাও, নাম দাও: `যেকোনো-নাম` (যেমন `zeenan-portfolio`)
2. Public রাখবে, README ছাড়া বানাবে (আমরা নিজেরটা দেব)
3. এই পুরো ZIP ফাইলের সব কন্টেন্ট সেই repo-তে push/upload করে দাও

**গুরুত্বপূর্ণ:** যদি তোমার repo নাম `তোমার-username.github.io` না হয়, তাহলে `_config.yml` ফাইলে `baseurl: ""` এর জায়গায় `baseurl: "/repo-নাম"` বসাতে হবে।

## ধাপ ২ — GitHub Pages চালু করা

1. Repo-র **Settings → Pages**-এ যাও
2. Source: **GitHub Actions** সিলেক্ট করো
3. এইটুকু করলেই `deploy.yml` workflow automatic সাইট বানিয়ে publish করে দেবে
4. কিছুক্ষণ পর সাইট লাইভ হবে: `https://তোমার-username.github.io/repo-নাম`

## ধাপ ৩ — ফ্রি Gemini API Key নেওয়া

1. https://aistudio.google.com/apikey এ যাও (Google account দিয়ে লগইন)
2. "Create API Key" ক্লিক করো, key কপি করে রাখো
3. কোনো টাকা/কার্ড লাগবে না — ফ্রি tier যথেষ্ট (দিনে ১৫০০ request পর্যন্ত ফ্রি, তোমার লাগবে সপ্তাহে মাত্র ২টা)

## ধাপ ৪ — API Key নিরাপদে Repo-তে রাখা

1. Repo-র **Settings → Secrets and variables → Actions** এ যাও
2. "New repository secret" ক্লিক করো
3. Name: `GEMINI_API_KEY`
4. Value: তোমার কপি করা key পেস্ট করো
5. Save করো

**এই key কাউকে শেয়ার করবে না, code-এ সরাসরি বসাবে না — শুধু Secrets-এ রাখবে।**

## ধাপ ৫ — নিজের ছবি ও তথ্য বসানো

- `assets/images/profile.jpg` নামে নিজের একটা ছবি আপলোড করো (সাইজ প্রায় 800x1000px হলে ভালো দেখাবে)
- `index.html` ফাইলে গিয়ে এই জায়গাগুলো নিজের তথ্য দিয়ে বদলাও:
  - `mailto:youremail@example.com` → তোমার আসল ইমেইল
  - `https://facebook.com/yourprofile` → তোমার Facebook link
  - `https://linkedin.com/in/yourprofile` → তোমার LinkedIn link
  - `https://wa.me/8801XXXXXXXXX` → তোমার WhatsApp নম্বর (দেশের কোড সহ, + ছাড়া)

## ধাপ ৬ — Auto-Blog সিস্টেম টেস্ট করা

সপ্তাহের জন্য অপেক্ষা না করে এখনই টেস্ট করতে চাইলে:
1. Repo-র **Actions** ট্যাবে যাও
2. বামপাশে "Auto Blog Post" workflow সিলেক্ট করো
3. "Run workflow" বাটনে ক্লিক করো
4. ১-২ মিনিট পর `_posts/` ফোল্ডারে নতুন একটা `.md` ফাইল দেখবে — এটাই automatic লেখা প্রথম পোস্ট
5. সাইট rebuild হয়ে (আরেকটা ১-২ মিনিট) ব্লগে নতুন পোস্ট দেখা যাবে

## এরপর থেকে কী হবে (পুরোপুরি automatic)

- প্রতি **রবিবার ও বুধবার, দুপুর ১২টা (বাংলাদেশ সময়)** এ GitHub নিজে থেকে জেগে উঠবে
- `scripts/keywords.txt` থেকে পরের keyword নেবে
- Gemini দিয়ে blog post লিখবে
- একটা দ্বিতীয় AI pass সেটা check করে ভুল/দুর্বল অংশ ঠিক করে দেবে (`_data/review_log.yml` এ কী ঠিক হলো তার log থাকবে)
- নতুন পোস্ট নিজে থেকে commit ও publish হয়ে যাবে
- ব্যবহার হওয়া keyword লিস্ট থেকে বাদ পড়ে যাবে

## Keyword লিস্ট শেষ হয়ে গেলে

`scripts/keywords.txt` ফাইলে ২০টা keyword দেওয়া আছে (১০ সপ্তাহ চলবে, সপ্তাহে ২টা করে)। শেষ হওয়ার আগে নতুন keyword যোগ করতে চাইলে:
- ফাইলটা খুলে নতুন keyword (এক লাইনে একটা করে) নিচে যোগ করে দাও
- অথবা আমাকে বলো, আমি নতুন ৫০-৭০টা keyword research করে দেব (তোমার পাঠানো দ্বিতীয় প্রম্পট অনুযায়ী)

## সততার সাথে যা জানা দরকার

- এই সিস্টেম "সেলফ-লার্নিং" মানে model নিজে থেকে শিখছে না — বরং প্রতিবার একটা fresh, independent AI pass draft-টা তোমার rules অনুযায়ী check করে দুর্বল অংশ rewrite করে দেয়। এটাই বাস্তবসম্মত এবং নিরাপদ "quality control" পদ্ধতি।
- Gemini free tier-এর limit মাঝেমধ্যে Google বদলাতে পারে — যদি কখনো workflow fail করে "quota exceeded" বলে, তার মানে সেদিনের ফ্রি limit শেষ, পরের দিন আবার কাজ করবে।
- সাইটের ডিজাইন, keyword topic, posting frequency — সব কিছু ফাইল এডিট করে বদলানো যাবে। যেকোনো সময় আমাকে বললে আমি বদলে দিতে পারব।

## ফোল্ডার গঠন (সংক্ষেপে)

```
├── _config.yml              → সাইট সেটিংস
├── index.html                → হোমপেজ
├── blog/index.html           → সব ব্লগ পোস্টের লিস্ট
├── 404.html                  → এরর পেজ
├── _layouts/                 → পেজের টেমপ্লেট
├── _posts/                   → সব ব্লগ পোস্ট (.md ফাইল)
├── _data/review_log.yml      → AI review-এর log
├── assets/                   → CSS, JS, ছবি, certificate
├── scripts/
│   ├── generate_post.py      → auto-blog লেখার script
│   └── keywords.txt          → keyword queue
└── .github/workflows/
    ├── auto-blog.yml         → সপ্তাহে ২ বার blog লেখে
    └── deploy.yml            → সাইট build ও publish করে
```

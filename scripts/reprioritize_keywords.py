"""
Lightweight, privacy-safe "learning from what works" script.

Honest scope of what this does and does not do:
- It does NOT track individual visitors, IP addresses, device info, location,
  or session behavior. None of that is collected anywhere in this project.
- It reads _data/post_tags_performance.json, a simple aggregate file that
  only ever contains: tag name -> number of times a post with that tag was
  viewed. No personal data of any kind touches this file.
- Page views are counted via Cloudflare Web Analytics (if you set up a free
  token in _config.yml) — Cloudflare's own product is cookieless and does not
  track individuals either. This script does not talk to Cloudflare directly
  (their analytics API needs a paid plan); instead, you can manually glance at
  the free Cloudflare dashboard occasionally and update
  _data/post_tags_performance.json with rough view counts per tag if you want
  this to reflect real traffic. Until you do that, the file starts empty and
  this script simply falls back to the existing keyword order unchanged.

What it actually does with that data:
- If _data/post_tags_performance.json has any data, tags with higher view
  counts get their related keywords in scripts/keywords.txt moved higher in
  the queue, so future auto-generated posts lean toward topics that have
  actually performed well.
- This is a simple re-ranking heuristic, not machine learning. Framing it as
  "self-learning" in casual conversation is fine, but it does not train or
  modify any AI model -- it just changes the order of a text file based on
  numbers you or Cloudflare provide.

Run manually whenever you want to re-prioritize, or wire it into a monthly
GitHub Actions schedule (see .github/workflows/reprioritize-keywords.yml).
"""

import os
import json
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYWORDS_FILE = os.path.join(REPO_ROOT, "scripts", "keywords.txt")
PERFORMANCE_FILE = os.path.join(REPO_ROOT, "_data", "post_tags_performance.json")
POSTS_DIR = os.path.join(REPO_ROOT, "_posts")

# Simple keyword -> likely tag mapping, so we can guess which tag a queued
# keyword belongs to before it's even written. Extend this list as your tags grow.
TAG_HINTS = {
    "seo": "SEO",
    "keyword": "Keyword Research",
    "google": "SEO",
    "facebook": "Facebook",
    "social media": "Social Media",
    "instagram": "Social Media",
    "whatsapp": "WhatsApp",
    "bangladesh": "Bangladesh",
    "content": "Content Strategy",
    "email": "Email Marketing",
    "brand": "Branding",
    "career": "Career",
    "freelance": "Freelancing",
}


def load_performance():
    if not os.path.exists(PERFORMANCE_FILE):
        return {}
    with open(PERFORMANCE_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def guess_tag(keyword):
    keyword_lower = keyword.lower()
    for hint, tag in TAG_HINTS.items():
        if hint in keyword_lower:
            return tag
    return None


def load_keywords():
    if not os.path.exists(KEYWORDS_FILE):
        return []
    with open(KEYWORDS_FILE, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def save_keywords(keywords):
    with open(KEYWORDS_FILE, "w", encoding="utf-8") as f:
        for kw in keywords:
            f.write(kw + "\n")


def main():
    performance = load_performance()
    keywords = load_keywords()

    if not performance:
        print("No performance data yet in _data/post_tags_performance.json.")
        print("Keyword order left unchanged. See that file's comments for how to fill it in.")
        return

    if not keywords:
        print("keywords.txt is empty — nothing to reprioritize.")
        return

    def score(keyword):
        tag = guess_tag(keyword)
        if tag and tag in performance:
            return performance[tag]
        return 0

    reordered = sorted(keywords, key=score, reverse=True)

    if reordered == keywords:
        print("Keyword order already matches performance ranking. No changes made.")
        return

    save_keywords(reordered)
    print("Reordered keywords.txt to favor higher-performing topics:")
    for kw in reordered[:5]:
        print(f"  - {kw}  (tag guess: {guess_tag(kw)}, score: {score(kw)})")


if __name__ == "__main__":
    main()

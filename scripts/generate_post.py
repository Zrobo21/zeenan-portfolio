"""
Automatic blog post generator with a multi-pass self-review / correction system.

What this does:
1. Reads the next unused keyword from scripts/keywords.txt
2. Sends a detailed SEO + humanization prompt to Google Gemini (free tier) -> DRAFT
3. Runs an independent EDITOR pass that SCORES the draft (0-10) on five dimensions
   (SEO structure, humanization, FAQ depth, point of view, factual honesty) and
   rewrites whatever is weak
4. If the editor's own score is still below the quality bar (8/10 average), runs
   a SECOND rewrite pass targeting only the dimensions that scored low --
   this is the "upgraded self-learning loop": each post gets checked, and
   checked again if the first fix wasn't good enough
5. Parses the final version into a Jekyll-ready Markdown post
6. Saves it into _posts/ with today's date, and logs full scoring + notes into
   _data/review_log.yml so you can see exactly what was fixed and how it scored
7. Removes the used keyword from keywords.txt so it's never repeated

Honest framing: there is no model training happening here, and nothing modifies
the website's own code or behavior autonomously. What actually happens is a
fresh, independent AI pass -- run once, and a second time if needed -- that
scores the draft against fixed rules and rewrites what falls short. That is a
real, safe quality-control loop, not literal self-learning, but it is the
closest safe equivalent and it does genuinely get you better posts over a
single-pass system.

Runs automatically via .github/workflows/auto-blog.yml on a schedule.
Requires a GEMINI_API_KEY secret set in the GitHub repo (Settings > Secrets > Actions).
"""

import os
import re
import sys
import json
import datetime
import urllib.request
import urllib.error

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

# Optional featured-image generation. Set GENERATE_IMAGES=true as a workflow
# env var to turn this on. Uses a separate image-capable Gemini model.
# Note: like all Gemini-generated images, these carry Google's invisible
# SynthID watermark embedded in the pixel data by design (for AI-content
# transparency) -- this is not a visible logo and cannot be stripped without
# defeating a safety feature, which this script does not attempt. To the
# human eye the images are clean; there is no visible watermark/logo overlay.
GENERATE_IMAGES = os.environ.get("GENERATE_IMAGES", "false").lower() == "true"
GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image"
GEMINI_IMAGE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_IMAGE_MODEL}:generateContent?key={GEMINI_API_KEY}"
IMAGES_DIR_REL = "assets/images/blog"

QUALITY_BAR = 8.0  # average score (out of 10) required across all dimensions
MAX_REWRITE_PASSES = 2  # editor pass + up to this many additional rewrite passes

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYWORDS_FILE = os.path.join(REPO_ROOT, "scripts", "keywords.txt")
POSTS_DIR = os.path.join(REPO_ROOT, "_posts")
REVIEW_LOG = os.path.join(REPO_ROOT, "_data", "review_log.yml")

SITE_CONTEXT = """
You are writing for a personal brand website belonging to Haa Meem Ul Karim Zeenan (goes by Zeenan),
a Dhaka, Bangladesh-based digital marketing consultant. He holds an NSDA Level 3 Digital Marketing
certification. His audience is a mix of:
1. People researching digital marketing / SEO topics to learn the skill themselves.
2. Bangladeshi small and medium business owners who need practical marketing advice.

Tone: conversational, confident, practical — like an experienced consultant talking to a smart friend,
not a corporate blog. Bangladesh-aware where relevant (local market examples, BDT pricing context,
Bangla-English code-switching habits of local searchers) but written in English.
"""

PROMPT_TEMPLATE = """{site_context}

Write a complete, publish-ready, SEO-optimized blog article targeting the primary keyword: "{keyword}"

Follow these rules strictly:

SEO RULES:
- Primary keyword in the title, first 100 words, at least one H2, and naturally 3-5 more times in the body (never forced, density roughly 0.5-1.5%).
- Use clear H2/H3 hierarchy (as Markdown ## and ###).
- Short paragraphs (2-4 sentences).
- Include a natural FAQ section near the end with 5-6 real people-also-ask style questions, each answered in 2-4 sentences. This is a hard minimum of 5.
- Readability should sit around grade 7-9 — clear and accessible, not academic.

HUMANIZATION RULES (very important):
- Vary sentence length and structure. Mix short punchy sentences with longer explanatory ones.
- NEVER use these phrases or anything close to them: "in today's fast-paced world", "in conclusion",
  "unlock the power of", "delve into", "it's important to note", "when it comes to",
  "at the end of the day", "game-changer", "landscape" (as a metaphor), excessive em-dashes,
  or stacked "moreover/furthermore" transitions.
- Take a clear point of view. Disagree with a common misconception in the space if genuinely true.
  Do not write a neutral, hedge-everything summary.
- No robotic "on one hand / on the other hand" symmetry. No listicle padding like "last but not least".
- Do not fabricate statistics or studies. If a specific number would help, write "[verify/insert data]" instead.

OUTPUT FORMAT (strict):
Return ONLY valid JSON, no markdown code fences, no preamble, in exactly this shape:

{{
  "title": "SEO-friendly title, under 60 characters if possible",
  "meta_description": "under 155 characters, written to earn the click",
  "tags": ["2 to 4 short tags"],
  "body_markdown": "the full article body in Markdown, starting from the first paragraph (do not repeat the title as an H1 inside the body)"
}}
"""

EDITOR_PROMPT_TEMPLATE = """You are a strict SEO and content editor reviewing a draft blog post before publish.
The draft targets the primary keyword: "{keyword}"

Score the draft below on EACH of these five dimensions, 0-10 (10 = perfect, 6 or below = fails the bar):

1. seo_structure: keyword in title/first 100 words/H2/3-5x body, clear H2/H3 hierarchy, short paragraphs.
2. humanization: varied sentence rhythm, no banned filler phrases ("in today's fast-paced world",
   "in conclusion", "unlock the power of", "delve into", "it's important to note", "when it comes to",
   "at the end of the day", "game-changer", "landscape" as metaphor, stacked moreover/furthermore),
   no robotic on-one-hand symmetry, no listicle padding.
3. faq_depth: has 5-6 real FAQ questions (not fewer), each answered in 2-4 genuinely useful sentences,
   not generic restatements of the article.
4. point_of_view: takes a clear stance, disagrees with a common misconception where genuinely true,
   is not a neutral hedge-everything summary.
5. factual_honesty: no fabricated statistics or studies presented as fact; anything uncertain is marked
   "[verify/insert data]".

DRAFT TITLE: {title}
DRAFT BODY:
{body}

{revision_focus}

Rewrite whatever scores 7 or below on any dimension, keep what already works well. Produce a corrected
full version even if only one dimension is weak.

Return ONLY valid JSON, no markdown code fences, no preamble, in exactly this shape:

{{
  "scores": {{
    "seo_structure": 0,
    "humanization": 0,
    "faq_depth": 0,
    "point_of_view": 0,
    "factual_honesty": 0
  }},
  "issues_found": ["short description of each issue found, empty array if none"],
  "final_title": "the title, corrected if needed",
  "final_body_markdown": "the full corrected article body in Markdown"
}}
"""


def load_keywords():
    if not os.path.exists(KEYWORDS_FILE):
        print(f"No keywords file found at {KEYWORDS_FILE}")
        sys.exit(1)
    with open(KEYWORDS_FILE, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f.readlines()]
    return [line for line in lines if line]


def save_remaining_keywords(remaining):
    with open(KEYWORDS_FILE, "w", encoding="utf-8") as f:
        for kw in remaining:
            f.write(kw + "\n")


def call_gemini(prompt):
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY environment variable is not set.")
        sys.exit(1)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.9,
            "maxOutputTokens": 4096,
        },
    }

    req = urllib.request.Request(
        GEMINI_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("Gemini API error:", e.code, e.read().decode("utf-8"))
        sys.exit(1)

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        print("Unexpected Gemini response shape:", json.dumps(data)[:1000])
        sys.exit(1)

    return text


def extract_json(text):
    # Strip markdown code fences if the model added them anyway.
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find the first { ... last } block as a fallback.
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end + 1])
        raise


def run_editor_pass(keyword, title, body, revision_focus=""):
    """Sends the draft to an independent Gemini call acting as a scoring editor.
    Returns (final_title, final_body, issues_found_list, scores_dict)."""
    prompt = EDITOR_PROMPT_TEMPLATE.format(
        keyword=keyword, title=title, body=body, revision_focus=revision_focus
    )
    raw = call_gemini(prompt)
    try:
        result = extract_json(raw)
    except (json.JSONDecodeError, ValueError):
        # If the editor pass fails to parse, fall back to the original draft
        # rather than breaking the whole run.
        print("Editor pass returned unparseable output — keeping previous draft.")
        return title, body, ["editor pass failed to parse, previous draft kept"], {}

    final_title = result.get("final_title", title).strip()
    final_body = result.get("final_body_markdown", body).strip()
    issues = result.get("issues_found", [])
    scores = result.get("scores", {})
    return final_title, final_body, issues, scores


def average_score(scores):
    if not scores:
        return 0.0
    values = [v for v in scores.values() if isinstance(v, (int, float))]
    if not values:
        return 0.0
    return sum(values) / len(values)


def weak_dimensions(scores, threshold=7):
    return [dim for dim, val in scores.items() if isinstance(val, (int, float)) and val <= threshold]


def log_review(keyword, all_passes, filename):
    """all_passes is a list of dicts: [{pass: 1, scores: {...}, issues: [...]}, ...]"""
    os.makedirs(os.path.dirname(REVIEW_LOG), exist_ok=True)
    entry_lines = [
        f'- date: "{datetime.date.today().isoformat()}"',
        f'  keyword: "{keyword}"',
        f'  file: "{filename}"',
        f'  passes_run: {len(all_passes)}',
        "  pass_details:",
    ]
    for p in all_passes:
        entry_lines.append(f'    - pass: {p["pass"]}')
        entry_lines.append(f'      average_score: {round(p["average"], 1)}')
        if p["scores"]:
            entry_lines.append("      scores:")
            for dim, val in p["scores"].items():
                entry_lines.append(f'        {dim}: {val}')
        if p["issues"]:
            entry_lines.append("      issues:")
            for issue in p["issues"]:
                safe = str(issue).replace('"', "'")
                entry_lines.append(f'        - "{safe}"')
        else:
            entry_lines.append("      issues: []")

    existing = ""
    if os.path.exists(REVIEW_LOG):
        with open(REVIEW_LOG, "r", encoding="utf-8") as f:
            existing = f.read()

    with open(REVIEW_LOG, "w", encoding="utf-8") as f:
        f.write(existing + "\n".join(entry_lines) + "\n")


def slugify(title):
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug).strip("-")
    return slug[:70]


def generate_featured_image(title, keyword):
    """Generates an optional featured image for a post via Gemini's image
    model, saves it under assets/images/blog/, and returns the relative path
    (or None if generation is disabled or fails). Failure here never breaks
    the post -- the post still publishes without an image."""
    if not GENERATE_IMAGES:
        return None

    prompt = (
        f"A clean, professional blog header illustration representing the topic: "
        f"'{title}'. Flat modern digital marketing / SEO themed illustration style, "
        f"dark background with green and gold accent colors, no text overlay, "
        f"no logos, no brand names, widescreen composition suitable for a blog "
        f"header image."
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    req = urllib.request.Request(
        GEMINI_IMAGE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        parts = data["candidates"][0]["content"]["parts"]
        image_b64 = None
        for part in parts:
            if "inlineData" in part:
                image_b64 = part["inlineData"]["data"]
                break
        if not image_b64:
            print("Image generation: no image data in response, skipping image.")
            return None

        import base64
        image_bytes = base64.b64decode(image_b64)
        images_dir_abs = os.path.join(REPO_ROOT, IMAGES_DIR_REL)
        os.makedirs(images_dir_abs, exist_ok=True)
        image_filename = f"{datetime.date.today().isoformat()}-{slugify(title)}.png"
        image_path_abs = os.path.join(images_dir_abs, image_filename)
        with open(image_path_abs, "wb") as f:
            f.write(image_bytes)
        print(f"Generated featured image: {image_path_abs}")
        return f"/{IMAGES_DIR_REL}/{image_filename}"
    except Exception as e:
        print(f"Image generation failed (non-fatal, post continues without image): {e}")
        return None


def main():
    posts_per_run = int(os.environ.get("POSTS_PER_RUN", "1"))
    posts_written = 0

    for i in range(posts_per_run):
        keywords = load_keywords()
        if not keywords:
            print("No keywords left in keywords.txt — add more before the next run.")
            break

        keyword = keywords[0]
        remaining = keywords[1:]

        print(f"\n=== Post {i + 1} of {posts_per_run} — keyword: {keyword} ===")
        prompt = PROMPT_TEMPLATE.format(site_context=SITE_CONTEXT, keyword=keyword)
        raw = call_gemini(prompt)
        post = extract_json(raw)

        meta_description = post.get("meta_description", "").strip()
        tags = post.get("tags", [])
        title = post["title"].strip()
        body = post["body_markdown"].strip()

        all_passes = []
        revision_focus = ""

        for pass_num in range(1, MAX_REWRITE_PASSES + 2):  # editor pass + rewrite passes
            print(f"Running review pass {pass_num}...")
            title, body, issues, scores = run_editor_pass(keyword, title, body, revision_focus)
            avg = average_score(scores)
            all_passes.append({"pass": pass_num, "scores": scores, "issues": issues, "average": avg})

            if scores:
                print(f"Pass {pass_num} average score: {round(avg, 1)}/10  scores: {scores}")
            if issues:
                print(f"Pass {pass_num} issues: {issues}")

            if avg >= QUALITY_BAR or not scores:
                break

            weak = weak_dimensions(scores)
            if not weak or pass_num > MAX_REWRITE_PASSES:
                break

            revision_focus = (
                f"\nThe previous pass scored below the quality bar on: {', '.join(weak)}. "
                f"Focus this rewrite specifically on fixing those dimensions without breaking what "
                f"already scored well.\n"
            )

        final_avg = all_passes[-1]["average"] if all_passes else 0.0
        print(f"Final quality score after {len(all_passes)} pass(es): {round(final_avg, 1)}/10")

        image_path = generate_featured_image(title, keyword)

        # Use a distinct timestamp-based filename suffix so multiple posts
        # generated in the same run (same date) never collide.
        today = datetime.date.today().isoformat()
        slug = slugify(title)
        filename = f"{today}-{slug}.md"
        filepath = os.path.join(POSTS_DIR, filename)
        # If a file with this exact name already exists (e.g. two similarly
        # titled posts in the same run), disambiguate with a numeric suffix.
        counter = 2
        while os.path.exists(filepath):
            filename = f"{today}-{slug}-{counter}.md"
            filepath = os.path.join(POSTS_DIR, filename)
            counter += 1

        front_matter_tags = ", ".join(f'"{t}"' for t in tags)
        image_front_matter = f'image: "{image_path}"\n' if image_path else ""
        front_matter = (
            "---\n"
            f'title: "{title.replace(chr(34), chr(39))}"\n'
            f"date: {today}\n"
            f"description: \"{meta_description.replace(chr(34), chr(39))}\"\n"
            f"tags: [{front_matter_tags}]\n"
            f"{image_front_matter}"
            "---\n\n"
        )

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(front_matter + body + "\n")

        print(f"Wrote new post: {filepath}")

        log_review(keyword, all_passes, filename)
        save_remaining_keywords(remaining)
        posts_written += 1
        print(f"{len(remaining)} keyword(s) left in queue.")

    print(f"\n=== Done: {posts_written} post(s) written this run ===")


if __name__ == "__main__":
    main()


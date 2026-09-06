# Security Notes

This repository is public on GitHub, which means anyone can view, download,
and copy every file in it — including this README, all the site's code, and
the blog-writing script. This document explains what that does and does not
expose, and what was done to keep it safe.

## What a public static site can and can't do

This site has no server-side code, no database, no login system, and no form
that submits data anywhere. It's plain HTML/CSS/JS files that GitHub Pages
serves as-is. That means:

- There's no database to break into.
- There's no admin login to brute-force.
- There's no user data collected or stored anywhere in this repo (see the
  Privacy / Analytics section in README.md).
- "Hacking" this site in the traditional sense (SQL injection, stolen
  credentials, server exploits) isn't possible because none of those
  attack surfaces exist here.

## What actually needed protecting, and how it was handled

**1. API keys and secrets never live in the code.**
The Gemini API key is stored in GitHub's encrypted Secrets (Settings →
Secrets and variables → Actions), never in any file in this repo. Anyone
browsing the code sees only `os.environ.get("GEMINI_API_KEY")` — a reference
to a value that only exists at runtime, inside GitHub's own servers, and is
never printed to logs or committed anywhere.

**2. Certificate images were redacted before being made public.**
The original certificate PDFs contained a National ID/Birth Registration
number and both parents' full names. Those PDFs have been removed from this
repo entirely. In their place are redacted PNG images with the personal
identifiers blacked out, keeping the certificate serial numbers, QR
verification codes, and course details intact and verifiable.

**3. GitHub Actions workflows only run on trusted triggers.**
Both workflows (`auto-blog.yml`, `deploy.yml`) run only on a schedule or when
manually triggered by someone with write access to the repo (only the repo
owner). Neither responds to `pull_request` events, which is the trigger type
that lets outside contributors inject malicious code through a pull request
on public repos. This repo does not use that trigger type anywhere.

**4. No personal visitor data is collected.**
If Cloudflare Web Analytics is enabled (optional, off by default), it's a
cookieless product that reports aggregate page views only — no IP logging
tied to individuals, no cross-site tracking, no personal identifiers.

## What you should still be careful about

- **Never commit a `.env` file, API key, or password directly into any file
  in this repo.** If you ever paste a real key into a file and push it,
  treat that key as compromised immediately — rotate/regenerate it at the
  source (Google AI Studio for Gemini), because public repo history is
  effectively permanent and downloadable by anyone, even after you delete
  the file in a later commit.
- **Review any new certificate, ID, or document image before adding it** —
  redact personal identifiers the same way the existing certificates were
  redacted, using the same principle: keep what proves the credential is
  real, remove what identifies family members or government ID numbers.
- **Keep GitHub two-factor authentication enabled** on the account that owns
  this repo — this protects the repo itself from unauthorized changes,
  which no amount of in-code security can substitute for.

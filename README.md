# BehaviorFit

Local app for BehaviorFit: client fitness tracking plus a **Social Command Center** for LinkedIn, Instagram, and Facebook. It runs on your computer, and your data stays in a local SQLite file (`prisma/dev.db`).

## Setup (first time)

```bash
cp .env.example .env
npm run setup
```

## Run it

```bash
npm run app        # production build: fast, use this day to day
# or
npm run dev        # development mode, reloads on code changes
```

Open http://localhost:3000/social. In Chrome or Edge, click the install icon in the address bar (**Install BehaviorFit**) to use it as a desktop app in its own window.

## Social Command Center

| Page | What it does |
|---|---|
| **Command Center** | A scorecard for each platform (followers, posts vs. weekly goal, streaks, engagement rate, last 28 days vs. the 28 before), a ranked **What to work on** list, wins, to-dos, and weekly trend charts |
| **Inbox** | DMs, comments, and mentions from all platforms in one list, sorted automatically into lead / question / praise / spam. Leads and questions waiting more than 24h are flagged overdue |
| **Posts** | Every post with views, engagements, and engagement rate, sortable |
| **Insights & Playbook** | Your best format, day, and time based on your own data, your top posts, and a best-practices playbook for each platform |
| **Connect & Import** | Connect accounts, import CSV exports, load or clear sample data |

### Getting your data in

| Platform | How | Notes |
|---|---|---|
| Facebook Page | Meta Graph API (Page ID + Page access token) | Posts, insights, comments. Messenger DMs if the token has `pages_messaging` |
| Instagram | Same Meta connection, through the IG account linked to your Page | Needs a Professional account. Posts, insights, comments. DMs if the token has `instagram_manage_messages` |
| LinkedIn Company Page | Community Management API (needs LinkedIn approval) | Posts, stats, followers, comments |
| LinkedIn personal profile | **CSV import** | LinkedIn doesn't give third-party apps access to personal analytics or DMs. Log important DMs by hand in the Inbox |

The Connect & Import page has step-by-step token instructions. Tokens are stored only in the local database and are never sent to the browser.

### Tuning it

- Weekly posting goals and the playbook: `lib/social/platforms.ts`
- Lead/spam keyword rules: `lib/social/classify.ts`
- "What to work on" rules: `lib/social/recommendations.ts`

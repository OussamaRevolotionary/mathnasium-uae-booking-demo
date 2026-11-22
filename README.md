# Mathnasium UAE — Session Booking (demo)

Parents sign in (accounts are created by the center), pick a child, a lesson length, a day and a time.
The center sees every booking on a live calendar. English / العربية with full right-to-left layout.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production bundle
npm run audit:engine # checks every booking rule against the demo data
```

## Rules implemented
| Rule | How it works |
|---|---|
| Opening hours | Mon–Thu 14:00–19:00 · Sat–Sun 10:00–15:00 · Friday closed (GST) |
| Lesson length | 30 min, 1 h, 1 h 30 or 2 h; starts on the hour or half hour |
| 12 students max | Checked for every 30-min block a lesson covers (3 pods × 4 seats). Full times can't be booked; parents can ask to be notified |
| 10 lessons / month | `REGULAR_10` children are blocked at 10 lessons in a calendar month; next month starts at 0/10. `UNLIMITED` has no cap. A lesson counts once whatever its length |
| Cancel | Parents can cancel up to 24 h before. The lesson goes back to that month's balance and must be rebooked in the same month (no roll-over) |
| Change time | Moves a lesson to another free time in the same month; counter unchanged |
| Booking window | This month and next month |
| Accounts | Created by staff under **Families**; no self sign-up |

Constants live in `src/engine/calendar.ts` (hours) and `src/engine/bookingEngine.ts` (limit, 24 h cut-off, window).

## What's inside
- **Parents:** next-lesson countdown, child cards with monthly counters, 3-step booking, change/cancel, a star burst on every booking, and an **Ask us** assistant.
- **Assistant:** answers membership and booking questions in English and Arabic from a built-in knowledge base (facts from mathnasium.com/sa-ar and its FAQ) plus the family's live data. By default it is a sandbox: answers come only from the built-in knowledge base and nothing leaves the browser. With `?live=1` in the URL it also calls the n8n workflow (Gemini) and falls back to the built-in answers if that fails. It never quotes a price, and hands anything else to the center. See `src/components/Assistant.tsx`.
- **Center dashboard:** who is in the center now, today hour by hour (3 pods x 4 seats), fill rate, free seats, waiting list, a week heatmap, a month chart, all five centers side by side, a "needs attention" list and a live activity feed. Staff can book for a parent from the dashboard.
- **Brand:** the red A+ draws itself in on load; the browser tab icon is the A+.

## Sandbox vs live mode
By default the demo makes **no external calls** (assistant = built-in knowledge base; n8n booking sync = simulated). Open the site with `?live=1` (e.g. `.../mathnasium-uae-booking-demo/?live=1`) to enable the n8n/Gemini assistant and, if a webhook URL is set and Live chosen in Settings, real n8n sync.

## Live pitch
Click **Pitch demo** (bottom corner; `Ctrl+Shift+D` hides it completely):
1. **Zayed 9/10** → book the 10:00-style "1 place left" time → the hour becomes 12/12 and November locks at 10/10 → **Book in December** shows 0/10.
2. **Maryam 10/10** → already blocked this month.
3. **Rashid** → Unlimited.
4. **Center Director** → calendar per center (branch picker in the header), Families, Settings.
5. **Reset demo** restores the data.

## Google Calendar & WhatsApp
Staff → **Settings**: paste an n8n Webhook URL and choose **Live**. Each booking / change / cancellation POSTs JSON
(`eventType`, `centerBranch`, `student`, `membershipTier`, `sessionMode`, `slotIsoGST`, `hourlyOccupancy`, `monthlyQuotaUsed`,
`googleCalendarAction` CREATE/UPDATE/DELETE, `whatsappNotification`). In n8n: Webhook (POST, allow this site under
Allowed Origins) → Switch on `googleCalendarAction.action` → Google Calendar node; WhatsApp node for `whatsappNotification`.
Without a URL the app stays in test mode and nothing is sent. Parents also get an "Add to Google Calendar" link after booking.

## Live demo and publishing
Public link: https://oussamarevolotionary.github.io/mathnasium-uae-booking-demo/

`npm run deploy` builds the site and publishes it to the `gh-pages` branch (GitHub Pages).

## Assistant with a real AI model
The **Ask us** assistant answers with Google Gemini through an n8n workflow ("Mathnasium · Parent Assistant (Gemini)").
The website sends the question, the conversation and the family's lesson counts to the workflow's webhook; n8n holds the
Gemini key, adds the fixed facts (portal rules + Mathnasium's published FAQ) and returns the answer. The key never reaches the browser.
- The model is instructed to answer only from those facts, never quote prices, not solve homework, and reply in the parent's language.
- If the workflow is slow or unreachable, the assistant shows its built-in answer instead, so the chat never breaks.
- Change the address with `VITE_ASSISTANT_URL`, or set it to `off` for built-in answers only.
- The webhook only accepts browser calls from the GitHub Pages site and localhost (CORS allow-list on the Webhook node).
- `server/` holds an alternative without n8n: a local dev endpoint (`/api/assistant`, key in `.env.local`) and a Cloudflare Worker.

## Explainer videos (English + Arabic)
Made with [OpenFilm](https://openfilm.dev): each film is a web page (`video/mathnasium-en/film.html`, `video/mathnasium-ar/film.html`).
- `video/tools/capture.mjs en|ar` photographs the real demo (dev server must be running) and records where each element sits.
- `video/tools/scenes.mjs` holds the script: narration and on-screen words for both languages.
- `video/tools/tts.mjs` makes the narration with ElevenLabs (key in `video/tools/.env`, never committed).
- `video/tools/build-film.mjs` assembles both projects; scene lengths follow the narration.
- Render: in a film folder, `npx -y openfilm@latest render --loudness=-14` (needs ffmpeg on the PATH).

## Important — demo only
Data lives in the browser (localStorage) and passwords are checked in the browser. A production version needs a
server + database for accounts and bookings, and the n8n flow connected to the center's Google account.
The Mathnasium name and logo belong to Mathnasium; use them only with the client's approval.

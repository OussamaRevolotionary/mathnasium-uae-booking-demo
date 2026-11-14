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
- **Assistant:** answers membership and booking questions in English and Arabic from a built-in knowledge base (facts from mathnasium.com/sa-ar and its FAQ) plus the family's live data. It calls no AI service, never quotes a price, and hands anything else to the center. See `src/components/Assistant.tsx`.
- **Center dashboard:** who is in the center now, today hour by hour (3 pods x 4 seats), fill rate, free seats, waiting list, a week heatmap, a month chart, all five centers side by side, a "needs attention" list and a live activity feed. Staff can book for a parent from the dashboard.
- **Brand:** the red A+ draws itself in on load; the browser tab icon is the A+.

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

## Important — demo only
Data lives in the browser (localStorage) and passwords are checked in the browser. A production version needs a
server + database for accounts and bookings, and the n8n flow connected to the center's Google account.
The Mathnasium name and logo belong to Mathnasium; use them only with the client's approval.

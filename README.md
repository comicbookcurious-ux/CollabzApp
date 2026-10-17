# Collabz

Where fans and artists create together. Artists post challenges, Showday events and lotteries; fans take part, earn coins and win experiences.

A static web app (HTML, CSS and JavaScript) backed by **Supabase** for accounts, data, file storage and live updates. There's no build step.

## Supabase

- Connection settings live in `js/config.js` (project URL and the public anon key; never put the service_role key there).
- The database is created by `supabase/schema.sql` (run once in Supabase → SQL Editor), then `supabase/002_submission_votes.sql` for upvotes/downvotes on image and video submissions, `supabase/003_terms_agreement.sql` for the sign-up agreement, `supabase/004_challenge_text_and_image_options.sql` for text-answer challenges and image answer options, and `supabase/005_games.sql` for Games.
- `js/live.js` connects the screens to Supabase: sign up / log in / password reset, onboarding, challenges, Showday, lotteries, scoreboard, follows, community, chat and notifications. Uploads go to the `avatars`, `welcome-videos` and `submissions` storage buckets.
- In Supabase → Authentication → URL Configuration, set **Site URL** to your live address (e.g. your Cloudflare URL) and add it under **Redirect URLs**, so confirmation and password-reset emails link back to the app.

## Run it

No build step is needed.

- **Locally:** from this folder run `python3 -m http.server 8000` (or `npx serve`) and open <http://localhost:8000>.
- **GitHub Pages:** push this folder to a repository, then go to *Settings → Pages*, choose *Deploy from a branch*, select `main` and `/ (root)`. The site goes live at `https://<your-user>.github.io/<repo>/`.

Opening `index.html` directly from disk also works in most browsers.

## Demo previews (no login, nothing saved)

The live app starts at the real login. To preview any screen with built-in demo data, add `?screen=<name>` to the URL, for example `index.html?screen=fan-showday`.

| Area | Screens |
|------|---------|
| Start | `login`, `signup`, `forgot` |
| Onboarding | `artist-setup`, `artist-setup-profile`, `artist-setup-socials`, `artist-setup-video`, `fan-setup`, `fan-genres`, `fan-artists` |
| Artist (owner) | `owner-challenges`, `owner-showday`, `owner-lottery`, `owner-scoreboard`, `owner-edit` |
| Fan | `fan-challenges`, `fan-showday`, `fan-lottery`, `fan-won`, `coin-pop`, `light-theme` |
| Games | `games` (fan), `owner-games`, `owner-game-new`, `play-trivia`, `play-quiz`, `play-solitaire`, `play-memory`, `play-hilo`, `play-blackjack`, `play-golf`, `play-puzzle` |
| Social | `community`, `profile`, `chat`, `notifications`, `games` |

## What's included

- Login with fan or artist sign-up, and forgot password
- Artist onboarding: up to 3 genres, primary image, display name, bio, social links, welcome video
- Fan onboarding: profile, choose a genre, browse that genre's artists
- Artist main page with Challenges, Showday, Lottery, Community, Games and Scoreboard tabs
- Challenges: multiple choice (text and/or an image per option), text answer (fans type up to 500 characters), image or video, with silver or gold coin rewards and a submission limit
- Showday events with their own challenges; fans see each other's submissions
- Lotteries paid with tickets; more entries mean better odds; random weighted draw
- Scoreboard: pick winners (changeable until claimed) or draw a lottery; winners claim 1 green coin
- Coin pop animation on rewards and wins
- Community forum with replies, people search, chat, notifications, follow/unfollow, followers and following lists
- Profiles with recent activity, edit profile and delete account (with typed confirmation)
- 7 artist page themes (4 dark, 3 light), with text colours that adjust automatically

## Project structure

```
index.html          Page shell and the screen markup (inside <template id="app-template">)
css/styles.css      All styles, including the 7 themes and animations
js/games.js         Game rules (solitaire, card games, puzzle): pure logic, no UI
js/app.js           App logic: state, demo data, actions and the values each screen shows
js/live.js          Supabase connection: swaps each action for a Supabase call in live mode
js/config.js        Supabase project URL and public anon key
js/runtime.js       Small renderer that turns the template into React elements
vendor/             React 18.3.1 and supabase-js 2.45.4, so no CDN is needed
supabase/schema.sql Database setup (tables, security rules, coin and lottery logic, storage)
wrangler.jsonc      Cloudflare settings (.assetsignore keeps README/SQL off the public site)
assets/             Logo, icon, coins and favicons
favicon.ico
```

### How the template works

`index.html` holds the markup for every screen. `js/runtime.js` renders it with React using a small set of rules:

- `{{path.to.value}}` inserts a value returned by `renderVals()` in `js/app.js`
- `onClick="{{handler}}"` (or any `on…` attribute) attaches a function from `renderVals()`
- `<sc-if value="{{flag}}">…</sc-if>` shows its content only when `flag` is true
- `<sc-for list="{{items}}" as="item">…</sc-for>` repeats its content for each item

To change a screen, edit its markup in `index.html`. To change behaviour or demo data, edit `js/app.js` (`seed()` holds the demo data).

## Notes

- Coins, tickets and winners only change through server-side functions in `supabase/schema.sql`, so balances can't be edited from the browser.
- The app loads all rows at sign-in and refreshes on realtime changes. That's fine for launch; with many thousands of users, switch to paged queries per screen.

## Fan levels

Fans earn XP from activity and level up from 1 to 6 (badges in `assets/level-1.png` … `level-6.png`).
XP is calculated from saved activity in `levelInfo()` in `js/app.js`, so it's the same on every device:

| Activity | XP |
|---|---|
| Challenge submission | 20 |
| Showday submission | 30 |
| Win a challenge or lottery | 50 |
| Each lottery entry | 10 |
| Start a community topic / reply | 10 / 5 |
| Follow an artist / vote on a submission | 5 / 2 |
| Win a game (first time) / picked as a game prize winner | 15 / 50 |

Level thresholds: 0, 100, 250, 500, 900, 1500 XP (`levelThresholds()`).

## Agreement and account deletion

- New sign-ups see the Terms of Use (fan or creator version) and must agree before onboarding. The text lives in `termsSections()` in `js/app.js`; have it reviewed before launch.
- Run `supabase/003_terms_agreement.sql` once: it adds `terms_accepted_at` / `terms_version` to profiles and marks every existing account as agreed (`legacy`).
- Delete account: Edit profile → Delete account… → step 1 "Are you sure?" → step 2 type DELETE.

## Games

Artists create games on the **Games** tab; fans play them as often as they like.

| Game | What the artist sets | How a fan wins |
|---|---|---|
| Trivia | Questions (up to 20, 2–4 answers each), seconds per question | Answer every question correctly before the timer runs out |
| Quiz | Questions, correct answers needed | Reach the pass mark (answered at their own pace) |
| Solitaire | Card back design (optional) | Klondike: move all cards to the foundations |
| Classic Card Games | Memory match, Higher or Lower, Blackjack or Golf solitaire; card back design; streak / hands to win | Find all pairs · guess N in a row · win N hands first · clear all columns |
| Puzzle | Image, size 3×3 to 5×5 | Swap tiles until the picture is complete |

**Prizes.** Each game has a prize: silver, gold or green coins, tickets, or *Other* (the artist types the prize, e.g. "Signed poster", and can add an image), plus the number of prizes. Everyone who wins appears on the Scoreboard (Show → Games); the artist picks prize winners up to that number (changeable until claimed). Picked fans claim on the Games tab: coins and tickets go straight to their wallet; for *Other* prizes the artist is notified with the fan's email to arrange it. Each fan can win a game's prize once.

**Fair play.** Trivia and Quiz answers are stored in `game_answers`, which only the game's artist can read; answers are graded by the server (`answer_trivia`, `submit_quiz`), including the trivia timer. Card games and puzzles run in the browser and report the win with `finish_game`, which needs a started game and can only be used once per start.

**XP.** Winning a game for the first time is worth 15 XP; being picked as a prize winner is worth 50 XP. The artist can **Try it** to preview their own game; previews aren't recorded.

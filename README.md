# Collabz

Where fans and artists create together. Artists post challenges, Showday events and lotteries; fans take part, earn coins and win experiences.

This repository is a **clickable front-end prototype**: a static web app (HTML, CSS and JavaScript) with demo data built in. There is no server or database yet, so everything resets when the page reloads.

## Run it

No build step is needed.

- **Locally:** from this folder run `python3 -m http.server 8000` (or `npx serve`) and open <http://localhost:8000>.
- **GitHub Pages:** push this folder to a repository, then go to *Settings → Pages*, choose *Deploy from a branch*, select `main` and `/ (root)`. The site goes live at `https://<your-user>.github.io/<repo>/`.

Opening `index.html` directly from disk also works in most browsers.

## Demo accounts

Use the **Demo fan** or **Demo artist** buttons on the login screen, or log in manually:

| Role   | Email              | Password   |
|--------|--------------------|------------|
| Fan    | jess@collabz.app   | demo1234   |
| Artist | kai@collabz.app    | demo1234   |

Any new account you sign up works too, for as long as the page stays open.

## Jump straight to a screen

Add `?screen=<name>` to the URL, for example `index.html?screen=fan-showday`.

| Area | Screens |
|------|---------|
| Start | `login`, `signup`, `forgot` |
| Onboarding | `artist-setup`, `artist-setup-profile`, `artist-setup-socials`, `artist-setup-video`, `fan-setup`, `fan-genres`, `fan-artists` |
| Artist (owner) | `owner-challenges`, `owner-showday`, `owner-lottery`, `owner-scoreboard`, `owner-edit` |
| Fan | `fan-challenges`, `fan-showday`, `fan-lottery`, `fan-won`, `coin-pop`, `light-theme` |
| Social | `community`, `profile`, `chat`, `notifications`, `games` |

## What's included

- Login with fan or artist sign-up, and forgot password
- Artist onboarding: up to 3 genres, primary image, display name, bio, social links, welcome video
- Fan onboarding: profile, choose a genre, browse that genre's artists
- Artist main page with Challenges, Showday, Lottery, Community, Games (coming soon) and Scoreboard tabs
- Challenges: multiple choice, image or video, with silver or gold coin rewards and a submission limit
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
js/app.js           App logic: state, demo data, actions and the values each screen shows
js/runtime.js       Small renderer that turns the template into React elements
vendor/             React 18.3.1 (production builds), so no CDN is needed
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

## Next steps for production

- Add a backend (e.g. Supabase or Firebase) for accounts, password reset emails, storage for uploaded images and videos, and real-time chat and notifications
- Move coin, ticket and winner logic to the server so balances can't be edited in the browser
- Swap the demo data in `seed()` for API calls

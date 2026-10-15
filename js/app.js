/* Collabz app logic: state, demo data and view models. Rendered by js/runtime.js. */
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this._start = (props && props.start) || 'login';
    this.state = this.applyStart(this._start, this.initState());
  }
  initState() {
    return {
      db: this.seed(), me: null, screen: 'auth', viewing: null, profileId: null,
      tab: 'challenges', open: null, ans: {},
      auth: this.blankAuth(), setup: null, genre: 'music', gsel: null, modal: null, pop: null,
      sb: { cat: 'challenge', sel: '' }, q: '', forumOpen: null, forumDraft: null, reply: '',
      chatWith: null, chatText: ''
    };
  }
  // Preview states: each screen artboard on the canvas mounts this file with a `start` value.
  applyStart(k, S) {
    const db = S.db, t = Date.now(), H = 3600000;
    const as = (me, extra) => Object.assign(S, { me: me }, extra || {});
    const art = (me, viewing, tab, extra) => as(me, Object.assign({ screen: 'artist', viewing: viewing, tab: tab, open: null }, extra || {}));
    const blankSoc = { facebook: '', instagram: '', x: '', tiktok: '', youtube: '' };
    const newUser = (id, role, name, email) => { db.users[id] = { id: id, role: role, name: name, email: email, password: 'demo1234', genre: '', bio: '', location: '', avatar: null, video: null, socials: Object.assign({}, blankSoc), coins: role === 'artist' ? { silver: 50, gold: 20, green: 10 } : { silver: 10, gold: 10, green: 0 }, tickets: role === 'artist' ? 0 : 10, followers: [], following: [], theme: 'default' }; };
    switch (k) {
      case 'signup': S.auth = Object.assign(this.blankAuth('signup', 'artist'), { name: 'Ari Sol', email: 'ari@example.com' }); break;
      case 'forgot': S.auth = Object.assign(this.blankAuth('forgot'), { email: 'jess@collabz.app', info: 'If an account exists for jess@collabz.app, a password reset link is on its way. Check your inbox.' }); break;
      case 'artist-setup': case 'artist-setup-profile': case 'artist-setup-socials': case 'artist-setup-video': {
        newUser('a9', 'artist', 'Ari Sol', 'ari@example.com');
        const step = { 'artist-setup': 0, 'artist-setup-profile': 1, 'artist-setup-socials': 2, 'artist-setup-video': 3 }[k];
        as('a9', { screen: 'setup', setup: Object.assign({ role: 'artist', step: step, err: '', genres: ['music', 'podcast'], name: 'Ari Sol', bio: 'Singer-songwriter from Perth. New EP out soon.', location: 'Perth, WA', avatar: null, video: null, videoName: '' }, blankSoc, { instagram: 'https://instagram.com/arisol', tiktok: 'https://tiktok.com/@arisol' }) });
        break;
      }
      case 'fan-setup':
        newUser('f9', 'fan', 'Sam Lee', 'sam@example.com');
        as('f9', { screen: 'setup', setup: Object.assign({ role: 'fan', step: 0, err: '', genre: '', name: 'Sam Lee', bio: 'Here for the premieres.', location: 'Perth, WA', avatar: null, video: null, videoName: '' }, blankSoc) });
        break;
      case 'fan-genres': as('f1', { screen: 'pickGenre' }); break;
      case 'fan-artists': as('f1', { screen: 'pickArtist', genre: 'music' }); break;
      case 'owner-challenges': art('a2', 'a2', 'challenges', { open: 'c2' }); break;
      case 'owner-showday': art('a2', 'a2', 'showday'); break;
      case 'owner-lottery': art('a2', 'a2', 'lottery', { open: 'l1' }); break;
      case 'owner-scoreboard': art('a2', 'a2', 'scoreboard', { sb: { cat: 'challenge', sel: 'c1' } }); break;
      case 'owner-edit': art('a2', 'a2', 'challenges', { modal: Object.assign(this.editDraft(db.users.a2), { theme: 'ember' }) }); break;
      case 'fan-challenges': art('f1', 'a2', 'challenges', { open: 'c2', ans: { c2: { choice: 2 } } }); break;
      case 'fan-showday': art('f1', 'a2', 'showday', { open: 'c4' }); break;
      case 'fan-lottery': db.entries.push({ lid: 'l1', uid: 'f1', n: 3, at: t - H }); db.users.f1.tickets = 4; art('f1', 'a2', 'lottery', { open: 'l1' }); break;
      case 'fan-won': {
        db.subs.push({ id: 's9', cid: 'c3', uid: 'f1', answer: '', file: null, at: t - 30 * H });
        db.challenges.find(c => c.id === 'c3').winner = 'f1';
        db.users.f1.coins.gold += 1;
        art('f1', 'a2', 'challenges', { open: 'c3' });
        break;
      }
      case 'coin-pop': art('f1', 'a2', 'challenges', { pop: this.mkPop('gold', '+2', 'Reward earned!', '2 gold coins for taking part in "Act out your favourite line from my last film"') }); break;
      case 'light-theme': art('f1', 'a3', 'challenges', { open: 'c9' }); break;
      case 'community': as('f1', { screen: 'community', forumOpen: 'fo1' }); break;
      case 'profile': as('f1', { screen: 'profile', profileId: 'f1' }); break;
      case 'chat':
        db.msgs[0].read = true;
        db.msgs.push({ id: 'm2', from: 'f1', to: 'a2', text: "I'll be there! Can't wait for the premiere.", at: t - 4 * H, read: true });
        db.msgs.push({ id: 'm3', from: 'a2', to: 'f1', text: 'Amazing. Bring your best selfie face.', at: t - 3 * H, read: true });
        as('f1', { screen: 'chat', chatWith: 'a2' });
        break;
      case 'notifications':
        this.notify(db, 'f1', 'Kai Mercer posted a new Showday challenge: "Take a selfie inside the theatre."', { type: 'artist', id: 'a2', tab: 'showday', open: 'c4' });
        this.notify(db, 'f1', 'Marco Diaz started following you.', { type: 'profile', id: 'f2' });
        this.notify(db, 'f1', 'Kai Mercer opened a lottery: "Meet the cast and have dinner with them"', { type: 'artist', id: 'a2', tab: 'lottery' });
        art('f1', 'a2', 'challenges', { modal: { kind: 'notifs', fresh: db.notifs.filter(n => n.uid === 'f1').slice(0, 3).map(n => n.id) } });
        break;
      case 'games': art('f1', 'a2', 'games'); break;
      default: break;
    }
    return S;
  }

  // ---------- constants ----------
  coin(t) { return { gold: 'assets/coin-gold.png', silver: 'assets/coin-silver.png', green: 'assets/coin-green.png' }[t]; }
  genres() { return [['books', 'Books'], ['business', 'Business Products'], ['comics', 'Comic Books'], ['cosplay', 'Cosplay'], ['film', 'Film'], ['music', 'Music'], ['podcast', 'Podcast'], ['social', 'Social Media'], ['theatre', 'Theatre'], ['tv', 'TV'], ['games', 'Video Games']]; }
  genreName(id) { const g = this.genres().find(x => x[0] === id); return g ? g[1] : 'Artist'; }
  gIds(u) { if (!u) return []; if (u.genres && u.genres.length) return u.genres; return u.genre ? [u.genre] : []; }
  gNames(u) { const n = this.gIds(u).map(id => this.genreName(id)); return n.length ? n.join(' · ') : 'Artist'; }
  toggleGenre(list, id) { list = (list || []).slice(); const i = list.indexOf(id); if (i >= 0) { list.splice(i, 1); return { list: list }; } if (list.length >= 3) return { list: list, err: 'You can choose up to 3 genres. Tap one to remove it first.' }; list.push(id); return { list: list }; }
  socialDefs() { return [['facebook', 'Facebook', 'https://facebook.com/yourpage'], ['instagram', 'Instagram', 'https://instagram.com/yourname'], ['x', 'X', 'https://x.com/yourname'], ['tiktok', 'TikTok', 'https://tiktok.com/@yourname'], ['youtube', 'YouTube', 'https://youtube.com/@yourchannel']]; }
  themes() {
    const dk = { fg: '#ffffff', mu: 'rgba(255,255,255,.76)', card: 'rgba(255,255,255,.06)', line: 'rgba(255,255,255,.17)', soft: 'rgba(255,255,255,.09)', field: 'rgba(255,255,255,.07)', inv: '#1a0b33', dark: true };
    const lt = { card: 'rgba(255,255,255,.62)', card2: 'rgba(255,255,255,.88)', field: '#ffffff', dark: false };
    return {
      default: Object.assign({}, dk, { name: 'Royal Purple', kind: 'Dark · default', bg: 'linear-gradient(170deg,#2b0f57 0%,#46197e 40%,#3b1c7c 72%,#262a66 100%)', card2: 'rgba(24,8,52,.45)', bar: 'rgba(36,12,74,.72)', sheet: '#2a1252', a1: '#9333ea', a2: '#db2777' }),
      midnight: Object.assign({}, dk, { name: 'Midnight', kind: 'Dark', bg: 'linear-gradient(170deg,#060f22 0%,#0d2049 50%,#14306b 100%)', card2: 'rgba(3,10,28,.48)', bar: 'rgba(6,16,38,.75)', sheet: '#0d1b3d', a1: '#2563eb', a2: '#0e7490', inv: '#06101f' }),
      ember: Object.assign({}, dk, { name: 'Ember', kind: 'Dark', bg: 'linear-gradient(170deg,#1c0808 0%,#421313 50%,#5a1e12 100%)', card2: 'rgba(20,4,4,.48)', bar: 'rgba(32,8,8,.75)', sheet: '#2e0e0d', a1: '#c2410c', a2: '#be123c', inv: '#1c0808' }),
      forest: Object.assign({}, dk, { name: 'Forest', kind: 'Dark', bg: 'linear-gradient(170deg,#03191a 0%,#08352e 50%,#0e473a 100%)', card2: 'rgba(2,16,14,.48)', bar: 'rgba(3,24,22,.75)', sheet: '#06281f', a1: '#047857', a2: '#0f766e', inv: '#03191a' }),
      lavender: Object.assign({}, lt, { name: 'Lavender', kind: 'Light', bg: 'linear-gradient(170deg,#fbf8ff 0%,#efe7ff 55%,#e2d5ff 100%)', fg: '#1d0f37', mu: 'rgba(29,15,55,.72)', line: 'rgba(29,15,55,.14)', soft: 'rgba(29,15,55,.06)', bar: 'rgba(251,248,255,.8)', sheet: '#ffffff', a1: '#7c3aed', a2: '#a21caf', inv: '#ffffff' }),
      peach: Object.assign({}, lt, { name: 'Peach', kind: 'Light', bg: 'linear-gradient(170deg,#fffaf5 0%,#ffeadb 55%,#ffd8bf 100%)', fg: '#3a180b', mu: 'rgba(58,24,11,.72)', line: 'rgba(58,24,11,.14)', soft: 'rgba(58,24,11,.06)', bar: 'rgba(255,250,245,.82)', sheet: '#fffaf6', a1: '#c2410c', a2: '#be185d', inv: '#ffffff' }),
      sky: Object.assign({}, lt, { name: 'Sky', kind: 'Light', bg: 'linear-gradient(170deg,#f7fbff 0%,#e2efff 55%,#cbe2ff 100%)', fg: '#0b2140', mu: 'rgba(11,33,64,.72)', line: 'rgba(11,33,64,.14)', soft: 'rgba(11,33,64,.06)', bar: 'rgba(247,251,255,.82)', sheet: '#ffffff', a1: '#1d4ed8', a2: '#0e7490', inv: '#ffffff' })
    };
  }
  themeCss(key) {
    const t = this.themes()[key] || this.themes().default;
    const ring = t.dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.07)';
    const ok = t.dark ? 'rgba(34,197,94,.2)' : 'rgba(22,163,74,.14)';
    return '--bg:' + t.bg + ';--fg:' + t.fg + ';--mu:' + t.mu + ';--card:' + t.card + ';--card2:' + t.card2 + ';--line:' + t.line + ';--soft:' + t.soft + ';--field:' + t.field + ';--a1:' + t.a1 + ';--a2:' + t.a2 + ';--bar:' + t.bar + ';--sheet:' + t.sheet + ';--inv:' + t.inv + ';--ring:' + 'color-mix(in srgb,' + t.a1 + ' 26%,' + ring + ')' + ';--okbg:' + ok + ';--scheme:' + (t.dark ? 'dark' : 'light');
  }

  // ---------- helpers ----------
  blankAuth(mode, role) { return { mode: mode || 'login', role: role || 'fan', email: '', password: '', name: '', error: '', info: '' }; }
  uid(p) { return p + Math.random().toString(36).slice(2, 9); }
  initials(n) { return (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
  hue(id) { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
  av(u, img) {
    const src = img !== undefined ? img : (u && u.avatar);
    const h = this.hue(u ? u.id : 'x');
    return { hasImg: !!src, noImg: !src, img: src || '', ini: this.initials(u ? u.name : '?'), bg: 'hsl(' + h + ' 52% 40%)' };
  }
  ago(t) { const d = (Date.now() - t) / 1000; if (d < 60) return 'just now'; if (d < 3600) return Math.floor(d / 60) + 'm ago'; if (d < 86400) return Math.floor(d / 3600) + 'h ago'; const n = Math.floor(d / 86400); return n + (n === 1 ? ' day ago' : ' days ago'); }
  fmtDate(d) { if (!d) return 'Date to be announced'; try { return new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } }
  fmtTime(t) { if (!t) return ''; const p = t.split(':'); const h = +p[0]; return ((h % 12) || 12) + ':' + p[1] + (h < 12 ? ' AM' : ' PM'); }
  plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  user(id) { return this.state.db.users[id] || { id: id, name: 'Deleted user', role: 'fan', avatar: null, followers: [], following: [], socials: {}, deleted: true }; }
  socials(u) {
    const s = (u && u.socials) || {};
    return this.socialDefs().filter(d => (s[d[0]] || '').trim()).map(d => ({ url: this.safeUrl(s[d[0]]), label: d[1], isFb: d[0] === 'facebook', isIg: d[0] === 'instagram', isX: d[0] === 'x', isTt: d[0] === 'tiktok', isYt: d[0] === 'youtube' }));
  }
  safeUrl(u) { u = (u || '').trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^[a-z]+:/i, ''); return u; }

  // ---------- seed data (demo accounts) ----------
  seed() {
    const t = Date.now(), H = 3600000, D = 86400000;
    const base = (o) => Object.assign({ avatar: null, video: null, location: '', bio: '', socials: { facebook: '', instagram: '', x: '', tiktok: '', youtube: '' }, followers: [], following: [], theme: 'default', genre: '', password: 'demo1234' }, o);
    const AC = () => ({ silver: 50, gold: 20, green: 10 });
    const users = {
      a1: base({ id: 'a1', role: 'artist', name: 'Luna Vale', email: 'luna@collabz.app', genre: 'music', bio: 'Dream-pop singer and songwriter. Making the next record with you.', location: 'Perth, WA', socials: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', x: '', tiktok: 'https://tiktok.com', youtube: 'https://youtube.com' }, coins: AC(), tickets: 0, followers: ['f1', 'f2', 'a2'], following: ['a3', 'a2'] }),
      a2: base({ id: 'a2', role: 'artist', name: 'Kai Mercer', email: 'kai@collabz.app', genre: 'film', genres: ['film', 'tv'], bio: 'Actor. Catch me on the big screen this November.', location: 'Sydney, NSW', socials: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', x: 'https://x.com', tiktok: 'https://tiktok.com', youtube: '' }, coins: AC(), tickets: 0, followers: ['f2', 'a1'], following: ['a1'], theme: 'midnight' }),
      a3: base({ id: 'a3', role: 'artist', name: 'Nova Reyes', email: 'nova@collabz.app', genre: 'music', genres: ['music', 'podcast'], bio: 'Bedroom producer turned touring act.', location: 'Melbourne, VIC', socials: { facebook: '', instagram: 'https://instagram.com', x: '', tiktok: 'https://tiktok.com', youtube: '' }, coins: AC(), tickets: 0, followers: ['a1'], theme: 'lavender' }),
      a4: base({ id: 'a4', role: 'artist', name: 'The Static Hours', email: 'static@collabz.app', genre: 'music', bio: 'Four-piece indie rock band. Loud on purpose.', location: 'Brisbane, QLD', socials: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', x: '', tiktok: '', youtube: 'https://youtube.com' }, coins: AC(), tickets: 0, theme: 'ember' }),
      a5: base({ id: 'a5', role: 'artist', name: 'Mira Okafor', email: 'mira@collabz.app', genre: 'theatre', genres: ['theatre', 'social'], bio: 'Stand-up comic and stage performer. Bad puns, good intentions.', location: 'Adelaide, SA', socials: { facebook: '', instagram: 'https://instagram.com', x: 'https://x.com', tiktok: '', youtube: '' }, coins: AC(), tickets: 0, followers: ['f1'], theme: 'peach' }),
      f1: base({ id: 'f1', role: 'fan', name: 'Jess Tan', email: 'jess@collabz.app', genre: 'film', bio: 'Film nerd and front-row regular.', location: 'Perth, WA', socials: { facebook: '', instagram: 'https://instagram.com', x: '', tiktok: '', youtube: '' }, coins: { silver: 10, gold: 10, green: 0 }, tickets: 10, followers: ['f2'], following: ['a1', 'a5'] }),
      f2: base({ id: 'f2', role: 'fan', name: 'Marco Diaz', email: 'marco@collabz.app', genre: 'music', bio: 'Concerts every weekend.', location: 'Fremantle, WA', coins: { silver: 18, gold: 14, green: 1 }, tickets: 4, following: ['a1', 'a2', 'f1'] })
    };
    const ch = (o) => Object.assign({ ev: null, options: [], rt: 'gold', rw: 1, max: 100, winner: null, claimed: false, at: t - 2 * D }, o);
    return {
      users: users,
      challenges: [
        ch({ id: 'c1', aid: 'a2', title: 'Act out your favourite line from my last film', desc: 'Film yourself delivering the line. Costumes encouraged.', type: 'video', rt: 'gold', rw: 2, at: t - 4 * D }),
        ch({ id: 'c2', aid: 'a2', title: 'Where did we film the final scene?', desc: 'Pick one. Hint: it was very cold.', type: 'mc', options: ['Perth', 'Auckland', 'Vancouver', 'Reykjavik'], rt: 'silver', rw: 3, winner: 'f2', claimed: true, at: t - 3 * D }),
        ch({ id: 'c3', aid: 'a2', title: 'Design an alternate movie poster', desc: 'Any medium. Upload a photo or export of your poster.', type: 'image', rt: 'gold', rw: 1, max: 50, at: t - 2 * D }),
        ch({ id: 'c4', aid: 'a2', ev: 'e1', title: 'Take a selfie inside the theatre.', desc: 'Take a selfie wherever in the theatre.', type: 'image', rt: 'gold', rw: 1, at: t - D }),
        ch({ id: 'c5', aid: 'a2', ev: 'e1', title: 'Make a video with your friends at the premier night.', desc: 'Be funny.', type: 'video', rt: 'gold', rw: 1, at: t - D }),
        ch({ id: 'c6', aid: 'a1', title: 'Sing the chorus of my new single', desc: 'Any key, any style. Keep it under 60 seconds.', type: 'video', rt: 'silver', rw: 5, at: t - 5 * D }),
        ch({ id: 'c7', aid: 'a1', title: 'Draw the album cover in your style', desc: 'Upload your artwork. Every style welcome.', type: 'image', rt: 'gold', rw: 2, at: t - 3 * D }),
        ch({ id: 'c8', aid: 'a1', ev: 'e2', title: 'Show me your outfit on the day', desc: 'Snap your concert fit before doors open.', type: 'image', rt: 'silver', rw: 2, max: 200, at: t - D }),
        ch({ id: 'c9', aid: 'a3', title: 'Which track should open the tour?', desc: 'Vote for the opener. Most votes wins the spot.', type: 'mc', options: ['Static Bloom', 'Night Bus', 'Glass Heart'], rt: 'silver', rw: 2, at: t - 2 * D }),
        ch({ id: 'c10', aid: 'a3', title: 'Remix 15 seconds of my new beat', desc: 'Any software, any style. Upload a short video of it playing.', type: 'video', rt: 'gold', rw: 3, at: t - D })
      ],
      events: [
        { id: 'e1', aid: 'a2', tag: 'Premiere', title: 'Movie Premier Night', desc: 'Movie premier with the stars watching with the fans.', date: '2026-11-06', time: '19:00', venue: 'AMC Theatre', at: t - D },
        { id: 'e2', aid: 'a1', tag: 'Concert', title: 'Luna Vale Live in Perth', desc: 'One night only, full band.', date: '2026-11-21', time: '20:00', venue: 'City Arena', at: t - D }
      ],
      lotteries: [
        { id: 'l1', aid: 'a2', title: 'Meet the cast and have dinner with them', desc: 'Dinner with the cast after the premiere. Travel not included.', cost: 2, winners: 1, date: '2026-11-01', drawn: false, picked: [], claims: [], at: t - 2 * D },
        { id: 'l2', aid: 'a1', title: 'Backstage pass and soundcheck', desc: 'Watch soundcheck and hang out backstage before the Perth show.', cost: 1, winners: 2, date: '2026-11-15', drawn: false, picked: [], claims: [], at: t - 2 * D }
      ],
      subs: [
        { id: 's1', cid: 'c2', uid: 'f2', answer: 'Reykjavik', file: null, at: t - 3 * D + H },
        { id: 's2', cid: 'c4', uid: 'f2', answer: '', file: null, at: t - 20 * H },
        { id: 's3', cid: 'c1', uid: 'f2', answer: '', file: null, at: t - 2 * D },
        { id: 's4', cid: 'c6', uid: 'f2', answer: '', file: null, at: t - 4 * D }
      ],
      entries: [{ lid: 'l1', uid: 'f2', n: 2, at: t - D }, { lid: 'l2', uid: 'f2', n: 1, at: t - D }],
      hidden: [],
      votes: [{ sid: 's2', uid: 'f1', v: 1 }, { sid: 's3', uid: 'f1', v: 1 }],
      forums: [
        { id: 'fo1', uid: 'a2', title: "Who's coming to the premiere?", body: 'Drop your city below. I want to see how far everyone is travelling.', at: t - 26 * H, replies: [{ uid: 'f2', text: 'Driving up from Fremantle!', at: t - 20 * H }] },
        { id: 'fo2', uid: 'f2', title: 'Favourite live moment this year?', body: 'Mine was the acoustic encore at the Perth show. Yours?', at: t - 3 * D, replies: [{ uid: 'a1', text: 'Honestly, singing with all of you in the rain.', at: t - 2 * D }] }
      ],
      msgs: [{ id: 'm1', from: 'a2', to: 'f1', text: 'Thanks for checking out the premiere challenges. Hope to see you there!', at: t - 5 * H, read: false }],
      notifs: [
        { id: 'n1', uid: 'f1', text: 'Welcome to Collabz! You start with 10 silver, 10 gold and 10 tickets.', at: t - 2 * D, read: false, link: null },
        { id: 'n2', uid: 'a2', text: 'Marco Diaz submitted to "Take a selfie inside the theatre."', at: t - 20 * H, read: false, link: { type: 'score', id: 'a2', cat: 'showday', sel: 'c4' } }
      ]
    };
  }

  // ---------- state plumbing ----------
  mut(fn, extra) {
    const db = JSON.parse(JSON.stringify(this.state.db));
    const r = fn(db);
    if (r === false) return;
    const next = Object.assign({ db: db }, extra || {});
    this.setState(next);
    if (next.pop) { clearTimeout(this._pt); this._pt = setTimeout(() => this.setState({ pop: null }), 2900); }
  }
  notify(db, uid, text, link) { if (!db.users[uid]) return; db.notifs.unshift({ id: this.uid('n'), uid: uid, text: text, at: Date.now(), read: false, link: link || null }); }
  mkPop(type, n, title, sub) {
    const img = type === 'ticket' ? null : this.coin(type);
    const bits = img ? Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 + 0.3; const r = 150 + (i % 3) * 40; return { img: img, style: '--dx:' + Math.round(Math.cos(a) * r) + 'px;--dy:' + Math.round(Math.sin(a) * r) + 'px;animation-delay:' + (0.25 + i * 0.04).toFixed(2) + 's' }; }) : [];
    return { img: img || '', isCoin: !!img, isTicket: !img, big: n, title: title, sub: sub, bits: bits, k: Date.now() };
  }
  // Navigation keeps a history of in-app screens so every screen can offer "Back".
  snapshot(s) { return { screen: s.screen, viewing: s.viewing, profileId: s.profileId, tab: s.tab, genre: s.genre, gsel: s.gsel, chatWith: s.chatWith, sb: s.sb, forumOpen: s.forumOpen }; }
  go(screen, extra) {
    const s = this.state;
    const hist = (s.hist || []).slice();
    const navigable = ['artist', 'profile', 'community', 'chat', 'pickGenre', 'pickArtist'];
    const next = Object.assign({}, s, extra || {}, { screen: screen });
    const sameView = s.screen === screen && s.viewing === next.viewing && s.profileId === next.profileId && s.chatWith === next.chatWith && s.genre === next.genre;
    if (s.me && navigable.includes(s.screen) && !sameView) hist.push(this.snapshot(s));
    while (hist.length > 30) hist.shift();
    this.setState(Object.assign({ screen: screen, modal: null, hist: hist }, extra || {}));
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
  back() {
    const hist = (this.state.hist || []).slice();
    const prev = hist.pop();
    if (!prev) return this.home();
    this.setState(Object.assign({ modal: null, open: null, hist: hist }, prev));
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
  // Up/down votes on image and video submissions (fans only, not on your own entry)
  vote(sid, v) {
    const meId = this.state.me;
    this.mut(db => {
      db.votes = db.votes || [];
      const cur = db.votes.find(x => x.sid === sid && x.uid === meId);
      db.votes = db.votes.filter(x => !(x.sid === sid && x.uid === meId));
      if (!cur || cur.v !== v) db.votes.push({ sid: sid, uid: meId, v: v });
    });
  }
  openArtist(id, tab, open, sb) { this.go('artist', { viewing: id, tab: tab || 'challenges', open: open || null, sb: sb || { cat: 'challenge', sel: '' } }); }
  openProfile(id) { if (!this.state.db.users[id]) return; this.go('profile', { profileId: id }); }
  home() {
    const s = this.state, me = s.db.users[s.me]; if (!me) return;
    if (me.role === 'artist') this.openArtist(me.id);
    else if (s.viewing && s.db.users[s.viewing]) this.openArtist(s.viewing);
    else this.go('pickArtist', { genre: me.genre || 'music' });
  }
  followLink(l) {
    if (!l) { this.setState({ modal: null }); return; }
    if (l.type === 'profile') this.openProfile(l.id);
    else if (l.type === 'artist') this.openArtist(l.id, l.tab, l.open);
    else if (l.type === 'score') this.openArtist(l.id, 'scoreboard', null, { cat: l.cat, sel: l.sel });
    else if (l.type === 'chat') this.openChat(l.id);
    else if (l.type === 'forum') this.go('community', { forumOpen: l.id });
  }

  // ---------- auth ----------
  setAuth(k, v) { this.setState({ auth: Object.assign({}, this.state.auth, { [k]: v, error: '' }) }); }
  authErr(msg) { this.setState({ auth: Object.assign({}, this.state.auth, { error: msg, info: '' }) }); }
  enter(id) {
    const u = this.state.db.users[id]; if (!u) return;
    const base = { me: id, auth: this.blankAuth(), modal: null, open: null, ans: {}, q: '', chatWith: null, hist: [] };
    if (u.role === 'artist') this.go('artist', Object.assign(base, { viewing: id, tab: 'challenges', sb: { cat: 'challenge', sel: '' } }));
    else this.go('pickArtist', Object.assign(base, { genre: u.genre || 'music', viewing: null }));
  }
  doLogin(e) {
    if (e) e.preventDefault();
    const a = this.state.auth, em = a.email.trim().toLowerCase();
    if (!em || !a.password) return this.authErr('Enter your email and password.');
    const u = Object.values(this.state.db.users).find(x => x.email.toLowerCase() === em);
    if (!u || u.password !== a.password) return this.authErr('That email and password don’t match an account.');
    this.enter(u.id);
  }
  doSignup(e) {
    if (e) e.preventDefault();
    const a = this.state.auth, em = a.email.trim().toLowerCase(), nm = a.name.trim();
    if (!nm) return this.authErr('Add your name.');
    if (!/^\S+@\S+\.\S+$/.test(em)) return this.authErr('Enter a valid email address.');
    if (a.password.length < 6) return this.authErr('Your password needs at least 6 characters.');
    if (Object.values(this.state.db.users).some(x => x.email.toLowerCase() === em)) return this.authErr('An account with this email already exists. Log in instead.');
    const artist = a.role === 'artist', id = this.uid(artist ? 'a' : 'f');
    const u = { id: id, role: a.role, name: nm, email: em, password: a.password, genre: '', bio: '', location: '', avatar: null, video: null, socials: { facebook: '', instagram: '', x: '', tiktok: '', youtube: '' }, coins: artist ? { silver: 50, gold: 20, green: 10 } : { silver: 10, gold: 10, green: 0 }, tickets: artist ? 0 : 10, followers: [], following: [], theme: 'default' };
    const setup = { role: a.role, step: 0, err: '', genres: [], name: nm, bio: '', location: '', avatar: null, video: null, videoName: '', facebook: '', instagram: '', x: '', tiktok: '', youtube: '' };
    this.mut(db => { db.users[id] = u; this.notify(db, id, artist ? 'Welcome to Collabz! Your starter balance is 50 silver, 20 gold and 10 green coins.' : 'Welcome to Collabz! You start with 10 silver, 10 gold and 10 tickets.'); }, { me: id, screen: 'setup', setup: setup, auth: this.blankAuth() });
  }
  doForgot(e) {
    if (e) e.preventDefault();
    const em = this.state.auth.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return this.authErr('Enter the email you signed up with.');
    this.setState({ auth: Object.assign({}, this.state.auth, { error: '', info: 'If an account exists for ' + em + ', a password reset link is on its way. Check your inbox.' }) });
  }
  logout() { this.go('auth', { me: null, viewing: null, profileId: null, auth: this.blankAuth(), modal: null, setup: null, ans: {}, open: null, hist: [] }); }

  // ---------- setup ----------
  setSu(k, v) { this.setState({ setup: Object.assign({}, this.state.setup, { [k]: v, err: '' }) }); }
  suFile(k, e) { const f = e.target.files && e.target.files[0]; if (!f) return; const p = { [k]: URL.createObjectURL(f), err: '' }; if (k === 'video') p.videoName = f.name; this.setState({ setup: Object.assign({}, this.state.setup, p) }); }
  suNext() {
    const s = this.state.setup, artist = s.role === 'artist', last = artist ? 3 : 1;
    if (artist && s.step === 0 && !(s.genres || []).length) return this.setSu('err', 'Pick at least one genre to continue.');
    if (((artist && s.step === 1) || (!artist && s.step === 0)) && !s.name.trim()) return this.setSu('err', 'Add the name you want to display.');
    if (s.step < last) { this.setState({ setup: Object.assign({}, s, { step: s.step + 1, err: '' }) }); return; }
    const me = this.state.me;
    this.mut(db => {
      const u = db.users[me];
      Object.assign(u, { name: s.name.trim(), bio: s.bio.trim(), location: s.location.trim(), avatar: s.avatar, socials: { facebook: s.facebook, instagram: s.instagram, x: s.x, tiktok: s.tiktok, youtube: s.youtube } });
      if (artist) { u.genres = s.genres.slice(); u.genre = s.genres[0]; u.video = s.video; }
    }, { setup: null });
    if (artist) this.openArtist(me); else this.go('pickGenre');
  }

  // ---------- explore ----------
  pickGenre(g) {
    const me = this.state.db.users[this.state.me];
    if (me && me.role === 'fan') this.mut(db => { db.users[me.id].genre = g; });
    this.go('pickArtist', { genre: g });
  }

  // ---------- social ----------
  toggleFollow(id) {
    const meId = this.state.me; if (!meId || id === meId) return;
    this.mut(db => {
      const m = db.users[meId], t = db.users[id]; if (!t) return false;
      if (m.following.includes(id)) { m.following = m.following.filter(x => x !== id); t.followers = t.followers.filter(x => x !== meId); }
      else { m.following.push(id); t.followers.push(meId); this.notify(db, id, m.name + ' started following you.', { type: 'profile', id: meId }); }
    });
  }
  openChat(id) {
    const meId = this.state.me;
    this.mut(db => { db.msgs.forEach(m => { if (m.from === id && m.to === meId) m.read = true; }); }, { screen: 'chat', chatWith: id || null, modal: null, chatText: '' });
  }
  sendChat(e) {
    if (e) e.preventDefault();
    const s = this.state, txt = s.chatText.trim(); if (!txt || !s.chatWith) return;
    this.mut(db => { db.msgs.push({ id: this.uid('m'), from: s.me, to: s.chatWith, text: txt, at: Date.now(), read: false }); }, { chatText: '' });
  }
  showPeople(title, ids) { this.setState({ modal: { kind: 'people', title: title, ids: ids.slice() } }); }

  // ---------- challenges ----------
  setAns(cid, patch) { const a = Object.assign({}, this.state.ans); a[cid] = Object.assign({}, a[cid] || {}, patch); this.setState({ ans: a }); }
  ansFile(cid, e) { const f = e.target.files && e.target.files[0]; if (!f) return; this.setAns(cid, { file: URL.createObjectURL(f), name: f.name }); }
  submit(cid) {
    const s = this.state, d = s.ans[cid] || {}, c = s.db.challenges.find(x => x.id === cid); if (!c) return;
    if (c.type === 'mc' ? d.choice == null : !d.file) return;
    const ans = Object.assign({}, s.ans); delete ans[cid];
    this.mut(db => {
      const me = db.users[s.me];
      db.subs.push({ id: this.uid('s'), cid: cid, uid: me.id, answer: c.type === 'mc' ? c.options[d.choice] : '', file: d.file || null, at: Date.now() });
      me.coins[c.rt] += c.rw;
      this.notify(db, c.aid, me.name + ' submitted to "' + c.title + '".', { type: 'score', id: c.aid, cat: c.ev ? 'showday' : 'challenge', sel: c.id });
    }, { ans: ans, pop: this.mkPop(c.rt, '+' + c.rw, 'Reward earned!', this.plural(c.rw, c.rt + ' coin', c.rt + ' coins') + ' for taking part in "' + c.title + '"') });
  }
  cancelSub(subId) {
    const s = this.state;
    this.mut(db => {
      const sub = db.subs.find(x => x.id === subId); if (!sub) return false;
      const c = db.challenges.find(x => x.id === sub.cid), me = db.users[sub.uid];
      if (c && me) me.coins[c.rt] = Math.max(0, me.coins[c.rt] - c.rw);
      db.subs = db.subs.filter(x => x.id !== subId);
    }, { modal: null });
  }
  claim(cid) {
    const s = this.state, c = s.db.challenges.find(x => x.id === cid); if (!c || c.winner !== s.me || c.claimed) return;
    this.mut(db => {
      const cc = db.challenges.find(x => x.id === cid); cc.claimed = true; db.users[s.me].coins.green += 1;
      this.notify(db, cc.aid, db.users[s.me].name + ' claimed the prize for "' + cc.title + '".', { type: 'profile', id: s.me });
    }, { pop: this.mkPop('green', '+1', 'You won!', 'A green coin for winning "' + c.title + '"') });
  }
  hideCard(cid) { const me = this.state.me; this.mut(db => { db.hidden.push({ uid: me, cid: cid }); }, { open: null }); }
  pickWinner(cid, uid) {
    this.mut(db => {
      const c = db.challenges.find(x => x.id === cid); if (!c || c.claimed) return false;
      const prev = c.winner; c.winner = uid; c.claimed = false;
      this.notify(db, uid, 'YOU WON "' + c.title + '"! Claim your prize now.', { type: 'artist', id: c.aid, tab: c.ev ? 'showday' : 'challenges', open: c.id });
      if (prev && prev !== uid) this.notify(db, prev, 'The winner for "' + c.title + '" was changed by the artist.', { type: 'artist', id: c.aid, tab: c.ev ? 'showday' : 'challenges', open: c.id });
    });
  }
  unpickWinner(cid) {
    this.mut(db => {
      const c = db.challenges.find(x => x.id === cid); if (!c || c.claimed || !c.winner) return false;
      this.notify(db, c.winner, 'The winner for "' + c.title + '" was changed by the artist.', null);
      c.winner = null;
    });
  }

  // ---------- lottery ----------
  enterLottery(lid) {
    const s = this.state, l = s.db.lotteries.find(x => x.id === lid), me = s.db.users[s.me];
    if (!l || l.drawn || !me || me.tickets < l.cost) return;
    const cur = s.db.entries.find(e => e.lid === lid && e.uid === me.id), n = (cur ? cur.n : 0) + 1;
    this.mut(db => {
      const u = db.users[me.id]; u.tickets -= l.cost;
      const e = db.entries.find(x => x.lid === lid && x.uid === me.id);
      if (e) { e.n += 1; e.at = Date.now(); } else db.entries.push({ lid: lid, uid: me.id, n: 1, at: Date.now() });
    }, { pop: this.mkPop('ticket', 'Entry #' + n, 'You’re in the draw!', 'You now have ' + this.plural(n, 'entry', 'entries') + ' for "' + l.title + '". More entries, better odds.') });
  }
  draw(lid) {
    this.mut(db => {
      const l = db.lotteries.find(x => x.id === lid); if (!l || l.claims.length) return false;
      const pool = db.entries.filter(e => e.lid === lid && e.n > 0 && db.users[e.uid]).map(e => ({ uid: e.uid, n: e.n }));
      if (!pool.length) return false;
      const won = [];
      while (won.length < l.winners && pool.length) {
        const tot = pool.reduce((a, b) => a + b.n, 0); let r = Math.random() * tot, i = 0;
        for (; i < pool.length; i++) { r -= pool[i].n; if (r <= 0) break; }
        i = Math.min(i, pool.length - 1); won.push(pool[i].uid); pool.splice(i, 1);
      }
      l.drawn = true; l.picked = won; l.drawnAt = Date.now();
      db.entries.filter(e => e.lid === lid).forEach(e => {
        const w = won.includes(e.uid);
        this.notify(db, e.uid, w ? 'YOU WON the lottery "' + l.title + '"! Management will email you about claiming it.' : 'The "' + l.title + '" draw is done. Not this time, thanks for entering!', { type: 'artist', id: l.aid, tab: 'lottery', open: l.id });
      });
    });
  }
  claimLottery(lid) {
    const s = this.state, l = s.db.lotteries.find(x => x.id === lid); if (!l || !l.picked.includes(s.me) || l.claims.includes(s.me)) return;
    this.mut(db => { const ll = db.lotteries.find(x => x.id === lid); ll.claims.push(s.me); db.users[s.me].coins.green += 1; this.notify(db, ll.aid, db.users[s.me].name + ' claimed their lottery win for "' + ll.title + '".', { type: 'profile', id: s.me }); },
      { pop: this.mkPop('green', '+1', 'Lottery winner!', 'Watch your inbox: management will email you how to claim "' + l.title + '".') });
  }

  // ---------- modals: create / edit ----------
  setM(k, v) { this.setState({ modal: Object.assign({}, this.state.modal, { [k]: v, err: '' }) }); }
  mFile(k, e) { const f = e.target.files && e.target.files[0]; if (!f) return; const p = { [k]: URL.createObjectURL(f), err: '' }; if (k === 'video') p.videoName = f.name; this.setState({ modal: Object.assign({}, this.state.modal, p) }); }
  openChModal(c, ev) {
    const o = (c && c.options) || [];
    this.setState({ modal: { kind: 'ch', id: c ? c.id : null, ev: c ? c.ev : (ev || null), title: c ? c.title : '', desc: c ? c.desc : '', type: c ? c.type : 'image', o0: o[0] || '', o1: o[1] || '', o2: o[2] || '', o3: o[3] || '', rt: c ? c.rt : 'gold', rw: String(c ? c.rw : 1), max: String(c ? c.max : 100), err: '' } });
  }
  saveCh() {
    const m = this.state.modal, me = this.state.me;
    const opts = [m.o0, m.o1, m.o2, m.o3].map(x => (x || '').trim()).filter(Boolean);
    const rw = parseInt(m.rw, 10), max = parseInt(m.max, 10);
    if (!m.title.trim()) return this.setM('err', 'Give the challenge a title.');
    if (m.type === 'mc' && opts.length < 2) return this.setM('err', 'Add at least two answer options.');
    if (!(rw >= 1)) return this.setM('err', 'The reward needs to be at least 1 coin.');
    if (!(max >= 1)) return this.setM('err', 'Allow at least 1 submission.');
    this.mut(db => {
      const data = { title: m.title.trim(), desc: m.desc.trim(), type: m.type, options: m.type === 'mc' ? opts : [], rt: m.rt, rw: rw, max: max };
      if (m.id) Object.assign(db.challenges.find(x => x.id === m.id), data);
      else {
        const c = Object.assign({ id: this.uid('c'), aid: me, ev: m.ev, winner: null, claimed: false, at: Date.now() }, data);
        db.challenges.push(c);
        db.users[me].followers.forEach(f => this.notify(db, f, db.users[me].name + ' posted a new ' + (m.ev ? 'Showday challenge' : 'challenge') + ': "' + c.title + '"', { type: 'artist', id: me, tab: m.ev ? 'showday' : 'challenges', open: c.id }));
      }
    }, { modal: null });
  }
  openEvModal(e) { this.setState({ modal: { kind: 'ev', id: e ? e.id : null, tag: e ? e.tag : 'Premiere', title: e ? e.title : '', desc: e ? e.desc : '', date: e ? e.date : '', time: e ? e.time : '', venue: e ? e.venue : '', err: '' } }); }
  saveEv() {
    const m = this.state.modal, me = this.state.me;
    if (!m.title.trim()) return this.setM('err', 'Give the event a name.');
    if (!m.date) return this.setM('err', 'Add the date of the show.');
    this.mut(db => {
      const data = { tag: m.tag, title: m.title.trim(), desc: m.desc.trim(), date: m.date, time: m.time, venue: m.venue.trim() };
      if (m.id) Object.assign(db.events.find(x => x.id === m.id), data);
      else {
        db.events.push(Object.assign({ id: this.uid('e'), aid: me, at: Date.now() }, data));
        db.users[me].followers.forEach(f => this.notify(db, f, db.users[me].name + ' announced a Showday event: "' + data.title + '"', { type: 'artist', id: me, tab: 'showday' }));
      }
    }, { modal: null });
  }
  openLtModal(l) { this.setState({ modal: { kind: 'lt', id: l ? l.id : null, title: l ? l.title : '', desc: l ? l.desc : '', cost: String(l ? l.cost : 1), winners: String(l ? l.winners : 1), date: l ? l.date : '', err: '' } }); }
  saveLt() {
    const m = this.state.modal, me = this.state.me, cost = parseInt(m.cost, 10), w = parseInt(m.winners, 10);
    if (!m.title.trim()) return this.setM('err', 'Describe the experience fans can win.');
    if (!(cost >= 1)) return this.setM('err', 'Each entry needs to cost at least 1 ticket.');
    if (!(w >= 1)) return this.setM('err', 'There needs to be at least 1 winner.');
    this.mut(db => {
      const data = { title: m.title.trim(), desc: m.desc.trim(), cost: cost, winners: w, date: m.date };
      if (m.id) Object.assign(db.lotteries.find(x => x.id === m.id), data);
      else {
        db.lotteries.push(Object.assign({ id: this.uid('l'), aid: me, drawn: false, picked: [], claims: [], at: Date.now() }, data));
        db.users[me].followers.forEach(f => this.notify(db, f, db.users[me].name + ' opened a lottery: "' + data.title + '"', { type: 'artist', id: me, tab: 'lottery' }));
      }
    }, { modal: null });
  }
  confirm(title, body, action, arg, okLabel) { this.setState({ modal: { kind: 'confirm', title: title, body: body, action: action, arg: arg, okLabel: okLabel || 'Delete', err: '' } }); }
  doConfirm() {
    const m = this.state.modal, id = m.arg;
    if (m.action === 'cancelSub') return this.cancelSub(id);
    this.mut(db => {
      if (m.action === 'delCh') { db.challenges = db.challenges.filter(x => x.id !== id); db.subs = db.subs.filter(x => x.cid !== id); }
      if (m.action === 'delEv') { const ids = db.challenges.filter(x => x.ev === id).map(x => x.id); db.events = db.events.filter(x => x.id !== id); db.challenges = db.challenges.filter(x => x.ev !== id); db.subs = db.subs.filter(x => !ids.includes(x.cid)); }
      if (m.action === 'delLt') { db.lotteries = db.lotteries.filter(x => x.id !== id); db.entries = db.entries.filter(x => x.lid !== id); }
    }, { modal: null, open: null });
  }
  editDraft(u) {
    const s = u.socials || {};
    return { kind: 'edit', name: u.name, email: u.email, bio: u.bio || '', location: u.location || '', genres: this.gIds(u).slice(), avatar: u.avatar, video: u.video, videoName: '', theme: u.theme || 'default', facebook: s.facebook || '', instagram: s.instagram || '', x: s.x || '', tiktok: s.tiktok || '', youtube: s.youtube || '', err: '' };
  }
  openEdit() {
    const u = this.state.db.users[this.state.me]; if (!u) return;
    this.setState({ modal: this.editDraft(u) });
  }
  saveEdit() {
    const m = this.state.modal, me = this.state.me, em = m.email.trim().toLowerCase();
    if (!m.name.trim()) return this.setM('err', 'Your name can’t be empty.');
    if (!/^\S+@\S+\.\S+$/.test(em)) return this.setM('err', 'Enter a valid email address.');
    if (this.state.db.users[me].role === 'artist' && !(m.genres || []).length) return this.setM('err', 'Choose at least one genre.');
    if (Object.values(this.state.db.users).some(x => x.id !== me && x.email.toLowerCase() === em)) return this.setM('err', 'Another account already uses that email.');
    this.mut(db => {
      const u = db.users[me];
      Object.assign(u, { name: m.name.trim(), email: em, bio: m.bio.trim(), location: m.location.trim(), avatar: m.avatar, socials: { facebook: m.facebook.trim(), instagram: m.instagram.trim(), x: m.x.trim(), tiktok: m.tiktok.trim(), youtube: m.youtube.trim() } });
      if (u.role === 'artist') { u.genres = m.genres.slice(); u.genre = m.genres[0]; u.video = m.video; u.theme = m.theme; }
    }, { modal: null });
  }
  deleteAccount() {
    const me = this.state.me;
    if ((this.state.modal.typed || '').trim() !== 'DELETE') return;
    this.mut(db => {
      delete db.users[me];
      Object.values(db.users).forEach(u => { u.followers = u.followers.filter(x => x !== me); u.following = u.following.filter(x => x !== me); });
      db.msgs = db.msgs.filter(m => m.from !== me && m.to !== me);
      db.notifs = db.notifs.filter(n => n.uid !== me);
    }, { me: null, screen: 'auth', viewing: null, profileId: null, modal: null, auth: Object.assign(this.blankAuth(), { info: '' }) });
  }

  // ---------- community ----------
  postTopic(e) {
    if (e) e.preventDefault();
    const d = this.state.forumDraft || {}, me = this.state.me;
    if (!(d.title || '').trim()) { this.setState({ forumDraft: Object.assign({}, d, { err: 'Add a title for your topic.' }) }); return; }
    const id = this.uid('fo');
    this.mut(db => { db.forums.unshift({ id: id, uid: me, title: d.title.trim(), body: (d.body || '').trim(), at: Date.now(), replies: [] }); }, { forumDraft: null, forumOpen: id });
  }
  sendReply(fid, e) {
    if (e) e.preventDefault();
    const txt = this.state.reply.trim(), me = this.state.me; if (!txt) return;
    this.mut(db => {
      const f = db.forums.find(x => x.id === fid); if (!f) return false;
      f.replies.push({ uid: me, text: txt, at: Date.now() });
      if (f.uid !== me) this.notify(db, f.uid, db.users[me].name + ' replied to "' + f.title + '".', { type: 'forum', id: fid });
    }, { reply: '' });
  }

  // ---------- view models ----------
  chItem(c, ctx) {
    const s = this.state, db = s.db, me = ctx.me;
    const subs = db.subs.filter(x => x.cid === c.id);
    if (ctx.isFan && db.hidden.some(h => h.uid === me.id && h.cid === c.id)) return null;
    const mine = me ? subs.find(x => x.uid === me.id) : null;
    const iWon = !!me && c.winner === me.id, full = subs.length >= c.max, open = s.open === c.id;
    const d = s.ans[c.id] || {};
    let status = '', stCls = 'st';
    if (ctx.isFan) {
      if (iWon && !c.claimed) { status = 'You won!'; stCls = 'st win'; }
      else if (iWon) { status = 'Won · claimed'; stCls = 'st done'; }
      else if (mine) { status = 'Participated'; stCls = 'st done'; }
      else if (full) status = 'Full';
    } else if (ctx.isOwner) { status = c.winner ? (c.claimed ? 'Winner claimed' : 'Winner picked') : this.plural(subs.length, 'entry', 'entries'); if (c.winner) stCls = 'st done'; }
    const typeLabel = { mc: 'Multiple choice', image: 'Image challenge', video: 'Video challenge' }[c.type];
    const art = this.user(c.aid);
    return {
      isCh: true, isEvHead: false, isEvFoot: false, isLt: false,
      outer: c.ev ? 'evmid' : 'gap', boxCls: open ? 'blk open' : 'blk',
      title: c.title, desc: c.desc || 'No extra details.', typeLabel: typeLabel,
      isMC: c.type === 'mc', isImage: c.type === 'image', isVideo: c.type === 'video',
      coinImg: this.coin(c.rt), rw: c.rw, rtName: c.rt, rewardText: '+' + c.rw + ' ' + c.rt, count: subs.length,
      countText: subs.length + ' of ' + c.max + ' submissions', artistName: art.name,
      open: open, chevCls: open ? 'i chev up' : 'i chev', toggle: () => this.setState({ open: open ? null : c.id }),
      hasStatus: !!status, status: status, stCls: stCls,
      owner: ctx.isOwner, fan: ctx.isFan, visitor: ctx.isVisitor,
      edit: () => this.openChModal(c), del: () => this.confirm('Delete this challenge?', '"' + c.title + '" and its ' + this.plural(subs.length, 'submission', 'submissions') + ' will be removed.', 'delCh', c.id),
      viewSubs: () => this.setState({ tab: 'scoreboard', sb: { cat: c.ev ? 'showday' : 'challenge', sel: c.id } }),
      canSubmit: ctx.isFan && !mine && !full && !iWon, showFull: ctx.isFan && !mine && full && !iWon,
      participated: ctx.isFan && !!mine && !iWon, wonOpen: ctx.isFan && iWon && !c.claimed, wonDone: ctx.isFan && iWon && c.claimed,
      claim: () => this.claim(c.id), remove: () => this.hideCard(c.id),
      options: (c.options || []).map((o, i) => ({ label: o, letter: 'ABCD'[i], on: d.choice === i, cls: d.choice === i ? 'opt on' : 'opt', pick: () => this.setAns(c.id, { choice: i }) })),
      needsFile: c.type !== 'mc', accept: c.type === 'image' ? 'image/*' : 'video/*',
      fileLabel: d.file ? 'Chosen: ' + d.name + ' (tap to change)' : (c.type === 'image' ? 'Choose a photo or artwork' : 'Choose a video'),
      onFile: (e) => this.ansFile(c.id, e), file: d.file || '', fileImg: c.type === 'image' && !!d.file, fileVid: c.type === 'video' && !!d.file,
      notReady: c.type === 'mc' ? d.choice == null : !d.file, submit: () => this.submit(c.id),
      myText: mine ? (c.type === 'mc' ? 'Your answer: ' + mine.answer + '. You earned ' + this.plural(c.rw, c.rt + ' coin', c.rt + ' coins') + '.' : 'Sent ' + this.ago(mine.at) + '. You earned ' + this.plural(c.rw, c.rt + ' coin', c.rt + ' coins') + '.') : '',
      myFile: mine && mine.file ? mine.file : '', myImg: !!(mine && mine.file && c.type === 'image'), myVid: !!(mine && mine.file && c.type === 'video'),
      cancel: () => mine && this.confirm('Cancel your submission?', 'Your entry for "' + c.title + '" will be removed and the ' + this.plural(c.rw, c.rt + ' coin', c.rt + ' coins') + ' you earned will be taken back.', 'cancelSub', mine.id, 'Cancel submission'),
      showGallery: !!c.ev && !ctx.isOwner && subs.length > 0,
      gallery: subs.slice().sort((a, b) => b.at - a.at).map(x => this.subView(x, c, me))
    };
  }
  subView(x, c, me) {
    const u = this.user(x.uid);
    return {
      name: u.name, av: this.av(u), go: () => this.openProfile(u.id), isMe: !!me && x.uid === me.id, when: this.ago(x.at),
      isMC: c.type === 'mc', answer: x.answer, file: x.file || '',
      hasImg: c.type === 'image' && !!x.file, hasVid: c.type === 'video' && !!x.file, noMedia: c.type !== 'mc' && !x.file,
      mediaLabel: c.type === 'image' ? 'Photo submission' : 'Video submission', isWinner: c.winner === x.uid
    };
  }
  voteView(x, c, me) {
    const votes = (this.state.db.votes || []).filter(v => v.sid === x.id);
    const up = votes.filter(v => v.v > 0).length, down = votes.filter(v => v.v < 0).length;
    const mine = me ? votes.find(v => v.uid === me.id) : null;
    const isMine = !!me && x.uid === me.id, canVote = !!me && me.role === 'fan' && !isMine;
    const score = up - down;
    return {
      votable: c.type !== 'mc', score: score, upCount: up, downCount: down,
      myUp: !!(mine && mine.v > 0), myDown: !!(mine && mine.v < 0),
      upCls: mine && mine.v > 0 ? 'vbtn on up' : 'vbtn', downCls: mine && mine.v < 0 ? 'vbtn on down' : 'vbtn',
      noVote: !canVote, voteHint: isMine ? 'You can’t vote on your own submission' : (canVote ? '' : 'Fans vote on submissions'),
      scoreText: (score > 0 ? '+' : '') + score + ' score',
      up: () => canVote && this.vote(x.id, 1), down: () => canVote && this.vote(x.id, -1)
    };
  }
  ltItem(l, ctx) {
    const s = this.state, db = s.db, me = ctx.me, open = s.open === l.id;
    const ents = db.entries.filter(e => e.lid === l.id), total = ents.reduce((a, b) => a + b.n, 0);
    const mine = me ? ents.find(e => e.uid === me.id) : null, my = mine ? mine.n : 0;
    const iWon = !!me && l.picked.includes(me.id), claimed = !!me && l.claims.includes(me.id);
    let status = '', stCls = 'st';
    if (ctx.isFan) { if (iWon && !claimed) { status = 'You won!'; stCls = 'st win'; } else if (iWon) { status = 'Won'; stCls = 'st done'; } else if (l.drawn) status = 'Drawn'; else if (my) { status = this.plural(my, 'entry', 'entries'); stCls = 'st done'; } }
    else { status = l.drawn ? 'Drawn' : this.plural(total, 'entry', 'entries'); }
    const art = this.user(l.aid);
    return {
      isCh: false, isEvHead: false, isEvFoot: false, isLt: true, boxCls: open ? 'blk open' : 'blk',
      title: l.title, desc: l.desc || 'No extra details.', open: open, chevCls: open ? 'i chev up' : 'i chev', toggle: () => this.setState({ open: open ? null : l.id }),
      hasStatus: !!status, status: status, stCls: stCls, costShort: this.plural(l.cost, 'ticket', 'tickets'),
      costText: this.plural(l.cost, 'ticket', 'tickets') + ' per entry', winnersText: this.plural(l.winners, 'winner', 'winners'),
      dateText: l.date ? 'Draw on ' + this.fmtDate(l.date) : 'Draw date to be announced', entriesText: this.plural(total, 'entry', 'entries') + ' so far',
      owner: ctx.isOwner, fan: ctx.isFan, visitor: ctx.isVisitor, artistName: art.name, email: me ? me.email : '',
      drawLabel: l.drawn ? 'View winners' : 'Entries & draw',
      viewSubs: () => this.setState({ tab: 'scoreboard', sb: { cat: 'lottery', sel: l.id } }),
      edit: () => this.openLtModal(l), del: () => this.confirm('Delete this lottery?', '"' + l.title + '" will be removed. Tickets fans already spent are not refunded.', 'delLt', l.id),
      wonOpen: ctx.isFan && iWon && !claimed, wonDone: ctx.isFan && iWon && claimed, lost: ctx.isFan && l.drawn && my > 0 && !iWon,
      hasEntries: ctx.isFan && my > 0 && !l.drawn, myEntriesText: 'You have ' + this.plural(my, 'entry', 'entries') + ' in this lottery',
      oddsText: total ? 'That’s about ' + Math.round(my / total * 100) + '% of all entries right now.' : '',
      canEnter: ctx.isFan && !l.drawn && me.tickets >= l.cost, short: ctx.isFan && !l.drawn && me.tickets < l.cost,
      enterLabel: (my ? 'Enter again' : 'Enter lottery') + ' · ' + this.plural(l.cost, 'ticket', 'tickets'),
      enter: () => this.enterLottery(l.id), claim: () => this.claimLottery(l.id), cost: l.cost, tickets: me ? me.tickets : 0
    };
  }

  renderVals() {
    const want = this.props.start || 'login';
    if (want !== this._start) { this._start = want; setTimeout(() => this.setState(this.applyStart(want, this.initState())), 0); }
    const s = this.state, db = s.db, me = db.users[s.me] || null;
    const sc = s.screen;
    const A = sc === 'artist' ? db.users[s.viewing] : null;
    const scr = { auth: sc === 'auth' || (!me && sc !== 'auth'), setup: sc === 'setup' && !!s.setup, genre: sc === 'pickGenre', artists: sc === 'pickArtist', artist: !!A, profile: sc === 'profile' && !!db.users[s.profileId], chat: sc === 'chat' };
    if (!me) { scr.setup = scr.genre = scr.artists = scr.artist = scr.profile = scr.chat = false; }
    const isOwner = !!(A && me && A.id === me.id), isFan = !!(A && me && me.role === 'fan'), isVisitor = !!(A && me && !isOwner && !isFan);
    const ctx = { me: me, isOwner: isOwner, isFan: isFan, isVisitor: isVisitor };

    // theme: artist page uses artist theme (live preview while owner edits)
    // Artists see their own theme on every screen; anyone on an artist's page sees that artist's theme.
    const meArtist = !!me && me.role === 'artist';
    let themeKey = meArtist ? (me.theme || 'default') : 'default';
    if (A) themeKey = A.theme || 'default';
    if (meArtist && (!A || isOwner) && s.modal && s.modal.kind === 'edit') themeKey = s.modal.theme;

    // field handlers
    const val = (fn) => (e) => fn(e.target.value);
    const f = {
      authEmail: val(v => this.setAuth('email', v)), authPassword: val(v => this.setAuth('password', v)), authName: val(v => this.setAuth('name', v)),
      suName: val(v => this.setSu('name', v)), suBio: val(v => this.setSu('bio', v)), suLocation: val(v => this.setSu('location', v)),
      suAvatar: (e) => this.suFile('avatar', e), suVideo: (e) => this.suFile('video', e),
      q: val(v => this.setState({ q: v })), reply: val(v => this.setState({ reply: v })), chatText: val(v => this.setState({ chatText: v })),
      ftTitle: val(v => this.setState({ forumDraft: Object.assign({}, s.forumDraft, { title: v, err: '' }) })),
      ftBody: val(v => this.setState({ forumDraft: Object.assign({}, s.forumDraft, { body: v }) }))
    };
    const mf = {};
    ['title', 'desc', 'rw', 'max', 'tag', 'date', 'time', 'venue', 'cost', 'winners', 'typed', 'name', 'email', 'bio', 'location', 'genre'].forEach(k => { mf[k] = val(v => this.setM(k, v)); });
    mf.avatarFile = (e) => this.mFile('avatar', e); mf.videoFile = (e) => this.mFile('video', e);

    // header
    const unreadNotif = me ? db.notifs.filter(n => n.uid === me.id && !n.read).length : 0;
    const unreadMsg = me ? db.msgs.filter(m => m.to === me.id && !m.read).length : 0;
    const hdr = { isFan: !!me && me.role === 'fan', av: this.av(me),notif: unreadNotif > 9 ? '9+' : unreadNotif, hasNotif: unreadNotif > 0, msg: unreadMsg, hasMsg: unreadMsg > 0 };

    // auth
    const a = s.auth;
    const auth = Object.assign({}, a, { isLogin: a.mode === 'login', isSignup: a.mode === 'signup', isForgot: a.mode === 'forgot', hasError: !!a.error, hasInfo: !!a.info,
      isFan: a.role === 'fan', isArtist: a.role === 'artist', fanCls: a.role === 'fan' ? 'role on' : 'role', artistCls: a.role === 'artist' ? 'role on' : 'role', signupLabel: 'Sign up as ' + (a.role === 'artist' ? 'an artist' : 'a fan') });

    // setup
    let su = {};
    if (scr.setup) {
      const d = s.setup, artist = d.role === 'artist';
      const labels = artist ? ['Genre', 'Profile', 'Socials', 'Welcome video'] : ['Profile', 'Socials', 'Genre'];
      const shownStep = d.step;
      su = {
        d: d, err: d.err, hasErr: !!d.err, stepText: 'Step ' + (shownStep + 1) + ' of ' + labels.length, pct: Math.round((shownStep + 1) / labels.length * 100) + '%',
        steps: labels.map((l, i) => ({ n: i < shownStep ? '✓' : String(i + 1), label: l, cls: i === shownStep ? 'step on' : (i < shownStep ? 'step done' : 'step') })),
        showGenre: artist && d.step === 0, showProfile: (artist && d.step === 1) || (!artist && d.step === 0),
        showSocial: (artist && d.step === 2) || (!artist && d.step === 1), showVideo: artist && d.step === 3,
        genres: this.genres().map(g => { const on = (d.genres || []).includes(g[0]); return { label: g[1], on: on, cls: on ? 'gchip on' : 'gchip', pick: () => { const r = this.toggleGenre(d.genres, g[0]); this.setState({ setup: Object.assign({}, this.state.setup, { genres: r.list, err: r.err || '' }) }); } }; }),
        genreCount: (d.genres || []).length + ' of 3 selected',
        profileTitle: artist ? 'Set up your artist profile' : 'Tell fans about you', profileSub: artist ? 'Your image and name appear at the top of your artist page.' : 'This is what other fans and artists see on your profile.',
        av: this.av({ id: s.me, name: d.name }, d.avatar), imgLabel: d.avatar ? 'Change image' : (artist ? 'Upload primary image' : 'Upload a photo'),
        nameLabel: artist ? 'Artist name (shown on your page)' : 'Display name',
        socials: this.socialDefs().map(x => ({ id: 'su-' + x[0], label: x[1], ph: x[2], val: d[x[0]] || '', set: val(v => this.setSu(x[0], v)), isFb: x[0] === 'facebook', isIg: x[0] === 'instagram', isX: x[0] === 'x', isTt: x[0] === 'tiktok', isYt: x[0] === 'youtube' })),
        hasVideo: !!d.video, videoLabel: d.video ? 'Chosen: ' + d.videoName + ' (tap to change)' : 'Choose a video file',
        canBack: d.step > 0, nextLabel: (artist && d.step === 3) ? (d.video ? 'Finish' : 'Skip and finish') : (!artist && d.step === 1 ? 'Next: pick a genre' : 'Continue')
      };
    }

    // explore
    const artists = Object.values(db.users).filter(u => u.role === 'artist');
    const genreCards = this.genres().map(g => { const n = artists.filter(x => this.gIds(x).includes(g[0])).length; return { label: g[1], k: g[1][0], countText: n ? this.plural(n, 'artist', 'artists') : 'No artists yet', pick: () => this.pickGenre(g[0]) }; });
    const inGenre = artists.filter(x => this.gIds(x).includes(s.genre));
    const gp = {
      chips: this.genres().map(g => ({ label: g[1], on: s.gsel === g[0], cls: s.gsel === g[0] ? 'gchip on' : 'gchip', pick: () => this.setState({ gsel: g[0] }) })),
      none: !s.gsel, go: () => s.gsel && this.pickGenre(s.gsel),
      q: s.gq || '', setQ: val(v => this.setState({ gq: v })), hasQ: !!(s.gq || '').trim(),
      results: (s.gq || '').trim() ? artists.filter(u => u.name.toLowerCase().includes(s.gq.trim().toLowerCase())).slice(0, 12).map(u => ({ name: u.name, av: this.av(u), sub: this.gNames(u) + (u.location ? ' · ' + u.location : ''), go: () => this.openArtist(u.id) })) : [],
      back: () => { if (me && me.role === 'artist') this.openArtist(me.id); else if (s.viewing && db.users[s.viewing]) this.openArtist(s.viewing); else this.go('pickArtist', { genre: (me && me.genre) || 'music' }); }
    };
    gp.noResults = gp.hasQ && gp.results.length === 0;
    const ex = {
      back: () => this.go('pickGenre', { gsel: s.genre }),
      title: this.genreName(s.genre) + ' artists', genre: this.genreName(s.genre), has: inGenre.length > 0, none: inGenre.length === 0,
      chips: this.genres().map(g => ({ label: g[1], on: s.genre === g[0], cls: s.genre === g[0] ? 'chip on' : 'chip', pick: () => this.pickGenre(g[0]) })),
      artists: inGenre.map(u => ({ name: u.name, av: this.av(u), bio: u.bio || 'No bio yet.', sub: [u.location, this.plural(u.followers.length, 'follower', 'followers')].filter(Boolean).join(' · '), open: () => this.openArtist(u.id) }))
    };

    // artist page
    let ap = {}, tabs = [], pn = {}, blocks = [], sb = {};
    if (A && me) {
      const following = me.following.includes(A.id);
      // wins waiting for this fan on this artist
      const wins = [];
      if (isFan) {
        db.challenges.filter(c => c.aid === A.id && c.winner === me.id && !c.claimed).forEach(c => wins.push({ t: c.title, tab: c.ev ? 'showday' : 'challenges', id: c.id }));
        db.lotteries.filter(l => l.aid === A.id && l.picked.includes(me.id) && !l.claims.includes(me.id)).forEach(l => wins.push({ t: l.title, tab: 'lottery', id: l.id }));
      }
      ap = {
        meName: me.name, meAv: this.av(me), goMe: () => this.openProfile(me.id), coins: me.coins, tickets: me.tickets,
        hasWin: wins.length > 0, winText: wins.length ? (wins.length > 1 ? 'You have ' + wins.length + ' prizes to claim, starting with "' + wins[0].t + '".' : 'You won "' + wins[0].t + '". You can claim your prize now.') : '',
        winGo: () => wins.length && this.setState({ tab: wins[0].tab, open: wins[0].id }),
        av: this.av(A), name: A.name, genres: this.gIds(A).map(id => this.genreName(id)), location: A.location, hasLoc: !!A.location, bio: A.bio, hasBio: !!A.bio,
        followers: A.followers.length, following: A.following.length,
        showFollowers: () => this.showPeople(A.name + '’s followers', A.followers), showFollowing: () => this.showPeople(A.name + ' follows', A.following),
        goProfile: () => this.openProfile(A.id), isOwner: isOwner, notOwner: !isOwner,
        followCls: following ? 'btn ghost' : 'btn grad', followLabel: following ? 'Following' : 'Follow', follow: () => this.toggleFollow(A.id), message: () => this.openChat(A.id),
        socials: this.socials(A), hasSocials: this.socials(A).length > 0,
        video: A.video || '', hasVideo: !!A.video, noVideo: !A.video,
        noVideoText: isOwner ? 'Fans see your welcome video here. Upload one to say hi.' : A.name + ' hasn’t added a welcome video yet.',
        uploadVideo: (e) => { const fl = e.target.files && e.target.files[0]; if (!fl) return; const url = URL.createObjectURL(fl); this.mut(db2 => { db2.users[A.id].video = url; }); }
      };
      tabs = [['challenges', 'Challenges'], ['showday', 'Showday'], ['lottery', 'Lottery'], ['community', 'Community'], ['games', 'Games'], ['scoreboard', 'Scoreboard']].map(t => ({ label: t[1], on: s.tab === t[0], cls: s.tab === t[0] ? 'tab on' : 'tab', pick: () => this.setState({ tab: t[0], open: null }) }));
      const chs = db.challenges.filter(c => c.aid === A.id).sort((x, y) => y.at - x.at);
      const T = s.tab;
      if (T === 'challenges') chs.filter(c => !c.ev).forEach(c => { const it = this.chItem(c, ctx); if (it) blocks.push(it); });
      if (T === 'showday') db.events.filter(e => e.aid === A.id).sort((x, y) => (x.date || '').localeCompare(y.date || '')).forEach(e => {
        blocks.push({ isEvHead: true, isCh: false, isEvFoot: false, isLt: false, tag: e.tag, title: e.title, desc: e.desc, hasDesc: !!e.desc, date: this.fmtDate(e.date), time: this.fmtTime(e.time), hasTime: !!e.time, venue: e.venue, hasVenue: !!e.venue, owner: isOwner,
          edit: () => this.openEvModal(e), del: () => this.confirm('Delete this event?', '"' + e.title + '" and all of its challenges and submissions will be removed.', 'delEv', e.id) });
        const evc = chs.filter(c => c.ev === e.id).sort((x, y) => x.at - y.at);
        let n = 0; evc.forEach(c => { const it = this.chItem(c, ctx); if (it) { blocks.push(it); n++; } });
        blocks.push({ isEvFoot: true, isEvHead: false, isCh: false, isLt: false, noCh: n === 0, owner: isOwner, add: () => this.openChModal(null, e.id) });
      });
      if (T === 'lottery') db.lotteries.filter(l => l.aid === A.id).sort((x, y) => y.at - x.at).forEach(l => blocks.push(this.ltItem(l, ctx)));
      const P = {
        challenges: { heading: isOwner ? 'Your Challenges' : 'Challenges', createLabel: 'Create Challenge', create: () => this.openChModal(null, null), emptyTitle: 'No challenges yet', emptyText: isOwner ? 'Create your first challenge. Fans can answer a multiple-choice question, send an image or artwork, or record a video, and earn the coins you set.' : A.name + ' hasn’t posted any challenges yet. Check back soon.' },
        showday: { heading: isOwner ? 'Your Showday Events' : 'Showday Events', createLabel: 'Create Event', create: () => this.openEvModal(null), emptyTitle: 'No Showday events yet', emptyText: isOwner ? 'Create an event for show day, like a premiere or a concert, then add challenges fans can do on the day.' : 'No Showday events yet. When ' + A.name + ' announces one, its challenges show up here.' },
        lottery: { heading: isOwner ? 'Your Lotteries' : 'Lottery', createLabel: 'Create Lottery', create: () => this.openLtModal(null), emptyTitle: 'No lotteries yet', emptyText: isOwner ? 'Offer an experience, like dinner with the cast, and set how many tickets each entry costs and how many winners there are.' : 'No lotteries open right now.' }
      }[T] || {};
      const hint = T === 'lottery' && isFan ? 'You have ' + this.plural(me.tickets, 'ticket', 'tickets') + '. Enter as many times as your tickets allow. More entries, better odds.' : (T === 'challenges' && isFan ? 'Tap a challenge to see the details and take part. Every submission earns its coin reward.' : (T === 'showday' && isFan ? 'Challenges to do on the day of the show. You can see what other fans submitted too.' : ''));
      pn = Object.assign({ isList: ['challenges', 'showday', 'lottery'].includes(T), isScore: T === 'scoreboard', isGames: T === 'games', canCreate: isOwner, empty: blocks.length === 0, hint: hint, hasHint: !!hint }, P);

      // scoreboard
      if (T === 'scoreboard') {
        const cat = s.sb.cat;
        const list = cat === 'lottery' ? db.lotteries.filter(l => l.aid === A.id) : chs.filter(c => cat === 'showday' ? !!c.ev : !c.ev);
        const sel = list.find(x => x.id === s.sb.sel) || list[0] || null;
        sb = {
          cat: cat, setCat: val(v => this.setState({ sb: { cat: v, sel: '' } })), empty: list.length === 0,
          emptyText: cat === 'lottery' ? 'No lotteries have been created yet.' : (cat === 'showday' ? 'No Showday challenges yet.' : 'No challenges yet.'),
          items: list.map(x => { const n = cat === 'lottery' ? db.entries.filter(e => e.lid === x.id).reduce((p, q) => p + q.n, 0) : db.subs.filter(y => y.cid === x.id).length; const on = sel && sel.id === x.id; return { title: x.title, meta: this.plural(n, cat === 'lottery' ? 'entry' : 'submission', cat === 'lottery' ? 'entries' : 'submissions'), on: !!on, cls: on ? 'sbi on' : 'sbi', pick: () => this.setState({ sb: { cat: cat, sel: x.id } }) }; }),
          hasSel: !!sel, rows: [], canDraw: false
        };
        if (sel && cat !== 'lottery') {
          const c = sel, subs = db.subs.filter(x => x.cid === c.id).sort((x, y) => y.at - x.at), w = c.winner ? this.user(c.winner) : null;
          const ev = c.ev ? db.events.find(e => e.id === c.ev) : null;
          Object.assign(sb, {
            title: c.title, meta: (ev ? ev.title + ' · ' : '') + { mc: 'Multiple choice', image: 'Image', video: 'Video' }[c.type] + ' · +' + c.rw + ' ' + c.rt + ' per entry · ' + this.plural(subs.length, 'submission', 'submissions'),
            status: w ? (c.claimed ? 'Winner: ' + w.name + ' (prize claimed, can no longer be changed)' : 'Winner: ' + w.name + ' (not claimed yet, you can still change it)') : (isOwner ? 'No winner yet. Pick one from the submissions below. They get 1 green coin.' : 'No winner picked yet.'),
            statusCls: w ? 'note ok' : 'note', noRows: subs.length === 0, noRowsText: 'No submissions yet.',
            rows: subs.map(x => { const v = Object.assign(this.subView(x, c, me), this.voteView(x, c, me)); const isW = c.winner === x.uid; return Object.assign(v, { isEntry: false, cls: isW ? 'sub win' : 'sub', winLabel: c.claimed ? 'Winner · claimed' : 'Winner', canPick: isOwner && !c.claimed && !isW, pickLabel: c.winner ? 'Make winner instead' : 'Select as the winner', pick: () => this.pickWinner(c.id, x.uid), canUnpick: isOwner && isW && !c.claimed, unpick: () => this.unpickWinner(c.id) }); })
          });
          // Image and video entries: most popular first, so the artist sees what fans like
          if (c.type !== 'mc') sb.rows.sort((p, q) => q.score - p.score);
        }
        if (sel && cat === 'lottery') {
          const l = sel, ents = db.entries.filter(e => e.lid === l.id).sort((x, y) => y.n - x.n), total = ents.reduce((p, q) => p + q.n, 0);
          const names = l.picked.map(id => this.user(id).name).join(', ');
          Object.assign(sb, {
            title: l.title, meta: this.plural(l.cost, 'ticket', 'tickets') + ' per entry · ' + this.plural(l.winners, 'winner', 'winners') + ' · ' + this.plural(total, 'entry', 'entries') + ' from ' + this.plural(ents.length, 'fan', 'fans'),
            status: l.drawn ? (l.picked.length ? 'Drawn ' + this.ago(l.drawnAt || Date.now()) + '. Winner' + (l.picked.length > 1 ? 's' : '') + ': ' + names + '. Management contacts winners by email.' : 'Drawn, but there were no entries.') : (isOwner ? 'Not drawn yet. When you draw, winners are picked at random. Each entry is one chance.' : 'Not drawn yet.'),
            statusCls: l.drawn ? 'note ok' : 'note', canDraw: isOwner && ents.length > 0 && l.claims.length === 0, drawLabel: l.drawn ? 'Redraw lottery' : 'Draw lottery', draw: () => this.draw(l.id),
            noRows: ents.length === 0, noRowsText: 'No entries yet.',
            rows: ents.map(e => { const u = this.user(e.uid), isW = l.picked.includes(e.uid); return { name: u.name, av: this.av(u), go: () => this.openProfile(u.id), when: this.ago(e.at), isMC: false, isEntry: true, entryText: this.plural(e.n, 'entry', 'entries') + ' · ' + this.plural(e.n * l.cost, 'ticket', 'tickets') + ' · ' + (total ? Math.round(e.n / total * 100) : 0) + '% chance', hasImg: false, hasVid: false, noMedia: false, file: '', isWinner: isW, cls: isW ? 'sub win' : 'sub', winLabel: l.claims.includes(e.uid) ? 'Winner · claimed' : 'Winner', canPick: false, canUnpick: false }; })
          });
        }
      }
    }

    // community
    const cmShow = !!me && (sc === 'community' || (!!A && s.tab === 'community'));
    let cm = { show: cmShow };
    if (cmShow) {
      const q = s.q.trim().toLowerCase();
      const results = q ? Object.values(db.users).filter(u => u.name.toLowerCase().includes(q)).slice(0, 12).map(u => ({ name: u.name, av: this.av(u), sub: (u.role === 'artist' ? 'Artist · ' + this.gNames(u) : 'Fan') + (u.location ? ' · ' + u.location : ''), go: () => this.openProfile(u.id) })) : [];
      const d = s.forumDraft;
      cm = {
        show: true, wrapCls: sc === 'community' ? 'wrap page' : 'wrap panel cmtab', hCls: sc === 'community' ? 'h1' : 'h2',
        hasQ: !!q, results: results, noResults: !!q && results.length === 0,
        drafting: !!d, d: d || {}, hasErr: !!(d && d.err),
        newTopic: () => this.setState({ forumDraft: { title: '', body: '', err: '' } }), cancel: () => this.setState({ forumDraft: null }), post: (e) => this.postTopic(e),
        threads: db.forums.slice().sort((x, y) => y.at - x.at).map(t => {
          const u = this.user(t.uid), open = s.forumOpen === t.id;
          return { title: t.title, body: t.body || '', open: open, boxCls: open ? 'blk open' : 'blk', chevCls: open ? 'i chev up' : 'i chev', toggle: () => this.setState({ forumOpen: open ? null : t.id, reply: '' }),
            author: u.name, av: this.av(u), role: u.role === 'artist' ? 'ARTIST' : 'FAN', when: this.ago(t.at), goAuthor: () => this.openProfile(u.id),
            replyCount: this.plural(t.replies.length, 'reply', 'replies'), send: (e) => this.sendReply(t.id, e),
            replies: t.replies.map(r => { const ru = this.user(r.uid); return { name: ru.name, av: this.av(ru), role: ru.role === 'artist' ? 'ARTIST' : 'FAN', text: r.text, when: this.ago(r.at), go: () => this.openProfile(ru.id) }; }) };
        })
      };
    }

    // profile
    let pf = {};
    if (scr.profile && me) {
      const P = db.users[s.profileId], isMe = P.id === me.id, following = me.following.includes(P.id);
      const acts = [];
      db.subs.filter(x => x.uid === P.id).forEach(x => { const c = db.challenges.find(y => y.id === x.cid); if (!c) return; acts.push({ at: x.at, text: 'Took part in "' + c.title + '"', sub: this.user(c.aid).name + (c.ev ? ' · Showday' : ' · Challenge'), go: () => this.openArtist(c.aid, c.ev ? 'showday' : 'challenges', c.id) }); });
      db.challenges.filter(c => c.winner === P.id).forEach(c => acts.push({ at: c.at + 1, text: 'Won "' + c.title + '"', sub: this.user(c.aid).name, go: () => this.openArtist(c.aid, c.ev ? 'showday' : 'challenges', c.id) }));
      db.challenges.filter(c => c.aid === P.id).forEach(c => acts.push({ at: c.at, text: 'Posted ' + (c.ev ? 'a Showday challenge' : 'a challenge') + ': "' + c.title + '"', sub: c.ev ? 'Showday' : 'Challenges', go: () => this.openArtist(P.id, c.ev ? 'showday' : 'challenges', c.id) }));
      db.lotteries.filter(l => l.aid === P.id).forEach(l => acts.push({ at: l.at, text: 'Opened a lottery: "' + l.title + '"', sub: 'Lottery', go: () => this.openArtist(P.id, 'lottery', l.id) }));
      db.entries.filter(e => e.uid === P.id).forEach(e => { const l = db.lotteries.find(y => y.id === e.lid); if (!l) return; acts.push({ at: e.at, text: 'Entered the lottery "' + l.title + '"', sub: this.user(l.aid).name + ' · ' + this.plural(e.n, 'entry', 'entries'), go: () => this.openArtist(l.aid, 'lottery', l.id) }); });
      db.forums.forEach(t => { if (t.uid === P.id) acts.push({ at: t.at, text: 'Started a topic: "' + t.title + '"', sub: 'Community', go: () => this.go('community', { forumOpen: t.id }) }); t.replies.forEach(r => { if (r.uid === P.id) acts.push({ at: r.at, text: 'Replied to "' + t.title + '"', sub: 'Community', go: () => this.go('community', { forumOpen: t.id }) }); }); });
      acts.sort((x, y) => y.at - x.at);
      pf = {
        isMe: isMe, notMe: !isMe, isArtist: P.role === 'artist', coins: P.coins || { silver: 0, gold: 0, green: 0 }, tickets: P.tickets || 0, roleLabel: P.role === 'artist' ? 'ARTIST' : 'FAN', hasGenre: P.role === 'artist' && this.gIds(P).length > 0, genre: this.gNames(P),
        av: this.av(P), name: P.name, email: P.email, location: P.location, hasLoc: !!P.location, bio: P.bio, hasBio: !!P.bio,
        followers: P.followers.length, following: P.following.length,
        showFollowers: () => this.showPeople(P.name + '’s followers', P.followers), showFollowing: () => this.showPeople(P.name + ' follows', P.following),
        socials: this.socials(P), hasSocials: this.socials(P).length > 0,
        followCls: following ? 'btn ghost' : 'btn grad', followLabel: following ? 'Following' : 'Follow', follow: () => this.toggleFollow(P.id), message: () => this.openChat(P.id),
        openPage: () => this.openArtist(P.id), avatarMenu: () => this.setState({ modal: { kind: 'me', title: 'Profile options' } }),
        acts: acts.slice(0, 10).map(x => ({ text: x.text, sub: x.sub + ' · ' + this.ago(x.at), go: x.go })), noActs: acts.length === 0
      };
    }

    // chat
    let ch = {};
    if (scr.chat && me) {
      const mine = db.msgs.filter(m => m.from === me.id || m.to === me.id);
      const last = {};
      mine.forEach(m => { const o = m.from === me.id ? m.to : m.from; if (!last[o] || last[o].at < m.at) last[o] = m; });
      const ids = Object.keys(last).filter(id => db.users[id]);
      if (s.chatWith && db.users[s.chatWith] && !ids.includes(s.chatWith)) ids.push(s.chatWith);
      ids.sort((x, y) => (last[y] ? last[y].at : Date.now()) - (last[x] ? last[x].at : Date.now()));
      const P = s.chatWith && db.users[s.chatWith] ? db.users[s.chatWith] : null;
      const thread = P ? mine.filter(m => m.from === P.id || m.to === P.id).sort((x, y) => x.at - y.at) : [];
      ch = {
        noConvs: ids.length === 0,
        convs: ids.map(id => { const u = db.users[id], l = last[id], un = mine.filter(m => m.from === id && m.to === me.id && !m.read).length; return { name: u.name, av: this.av(u), last: l ? (l.from === me.id ? 'You: ' : '') + l.text : 'New conversation', unread: un, hasUnread: un > 0, cls: s.chatWith === id ? 'conv on' : 'conv', open: () => this.openChat(id) }; }),
        hasActive: !!P, noActive: !P, name: P ? P.name : '', av: this.av(P), role: P ? (P.role === 'artist' ? 'Artist · ' + this.gNames(P) : 'Fan') : '', goPartner: () => P && this.openProfile(P.id),
        empty: thread.length === 0, msgs: thread.map(m => ({ text: m.text, when: this.ago(m.at), cls: m.from === me.id ? 'bub me' : 'bub' })), send: (e) => this.sendChat(e)
      };
    }

    // modal
    const M = s.modal;
    let md = { show: !!M && !!me };
    if (md.show) {
      const k = M.kind;
      md = Object.assign(md, {
        d: M, isCh: k === 'ch', isEv: k === 'ev', isLt: k === 'lt', isConfirm: k === 'confirm', isPeople: k === 'people', isNotifs: k === 'notifs', isMe: k === 'me', isEdit: k === 'edit', isDelete: k === 'delete',
        hasErr: !!M.err, meArtist: me.role === 'artist', meName: me.name, themeHint: me.role === 'artist' ? ', page theme' : '',
        hasActions: ['ch', 'ev', 'lt', 'confirm', 'edit', 'delete'].includes(k), cancelLabel: k === 'confirm' ? 'Keep it' : 'Cancel', back: () => this.setState({ modal: k === 'delete' ? M.backTo : null }),
        okCls: (k === 'confirm' || k === 'delete') ? 'btn danger' : 'btn grad', okDisabled: k === 'delete' && (M.typed || '').trim() !== 'DELETE'
      });
      if (k === 'ch') Object.assign(md, {
        title: M.id ? 'Edit challenge' : (M.ev ? 'Add Showday challenge' : 'Create challenge'), okLabel: M.id ? 'Save changes' : 'Create challenge', ok: () => this.saveCh(), isMCType: M.type === 'mc',
        types: [['mc', 'Multiple choice'], ['image', 'Image'], ['video', 'Video']].map(t => ({ label: t[1], on: M.type === t[0], cls: M.type === t[0] ? 'on' : '', pick: () => this.setM('type', t[0]) })),
        opts: [0, 1, 2, 3].map(i => ({ ph: 'Option ' + 'ABCD'[i], val: M['o' + i] || '', set: val(v => this.setM('o' + i, v)) })),
        rts: [['silver', 'Silver'], ['gold', 'Gold']].map(t => ({ label: t[1], img: this.coin(t[0]), on: M.rt === t[0], cls: M.rt === t[0] ? 'on' : '', pick: () => this.setM('rt', t[0]) }))
      });
      if (k === 'ev') Object.assign(md, { title: M.id ? 'Edit event' : 'Create Showday event', okLabel: M.id ? 'Save changes' : 'Create event', ok: () => this.saveEv() });
      if (k === 'lt') Object.assign(md, { title: M.id ? 'Edit lottery' : 'Create lottery', okLabel: M.id ? 'Save changes' : 'Create lottery', ok: () => this.saveLt() });
      if (k === 'confirm') Object.assign(md, { title: M.title, okLabel: M.okLabel, ok: () => this.doConfirm() });
      if (k === 'people') { const ids = M.ids.filter(id => db.users[id]); Object.assign(md, { title: M.title, noPeople: ids.length === 0, people: ids.map(id => { const u = db.users[id]; return { name: u.name, av: this.av(u), sub: u.role === 'artist' ? 'Artist · ' + this.gNames(u) : 'Fan', go: () => this.openProfile(id) }; }) }); }
      if (k === 'notifs') { const ns = db.notifs.filter(n => n.uid === me.id); Object.assign(md, { title: 'Notifications', noNotifs: ns.length === 0, notifs: ns.slice(0, 30).map(n => ({ text: n.text, when: this.ago(n.at), cls: (M.fresh || []).includes(n.id) ? 'nrow new' : 'nrow', go: () => this.followLink(n.link) })) }); }
      if (k === 'me') Object.assign(md, { title: 'Profile options' });
      if (k === 'edit') Object.assign(md, {
        title: 'Edit profile', okLabel: 'Save changes', ok: () => this.saveEdit(), av: this.av(me, M.avatar), nameLabel: me.role === 'artist' ? 'Artist name' : 'Display name',
        genreChips: this.genres().map(g => { const on = (M.genres || []).includes(g[0]); return { label: g[1], on: on, cls: on ? 'gchip on' : 'gchip', pick: () => { const r = this.toggleGenre(M.genres, g[0]); this.setState({ modal: Object.assign({}, this.state.modal, { genres: r.list, err: r.err || '' }) }); } }; }),
        genreCount: (M.genres || []).length + ' of 3', videoLabel: M.video ? (M.videoName ? 'Chosen: ' + M.videoName : 'Replace welcome video') : 'Upload a welcome video',
        themes: Object.entries(this.themes()).map(([key, t]) => ({ name: t.name, kind: t.kind, a1: t.a1, a2: t.a2, style: 'background: ' + t.bg, on: M.theme === key, cls: M.theme === key ? 'sw on' : 'sw', pick: () => this.setM('theme', key) })),
        socials: this.socialDefs().map(x => ({ label: x[1], ph: x[1] + ' link', val: M[x[0]] || '', set: val(v => this.setM(x[0], v)) })),
        askDelete: () => this.setState({ modal: { kind: 'delete', typed: '', err: '', backTo: M } })
      });
      if (k === 'delete') Object.assign(md, { title: 'Delete your account?', okLabel: 'Delete forever', ok: () => this.deleteAccount(), cancelLabel: 'Go back' });
    }

    // coin pop
    const pp = s.pop ? Object.assign({ show: true }, s.pop) : { show: false, bits: [] };

    return {
      themeStyle: this.themeCss(themeKey), showHeader: !!me && !scr.auth && !scr.setup, scr: scr, hdr: hdr, f: f, mf: mf, auth: auth, su: su,
      genreCards: genreCards, gp: gp, ex: ex, ap: ap, tabs: tabs, pn: pn, blocks: blocks, sb: sb, cm: cm, pf: pf, ch: ch, md: md, pp: pp,
      q: s.q, reply: s.reply, chatText: s.chatText,
      nav: { canBack: !!me && !scr.auth && !scr.setup && (s.hist || []).length > 0, back: () => this.back() },
      goHome: () => this.home(), goExplore: () => this.go('pickGenre'), goCommunity: () => this.go('community'),
      goChat: () => { const meId = s.me; const mine = db.msgs.filter(m => m.from === meId || m.to === meId).sort((x, y) => y.at - x.at); const o = mine[0] ? (mine[0].from === meId ? mine[0].to : mine[0].from) : null; this.openChat(o); },
      goMyProfile: () => me && this.openProfile(me.id),
      openNotifs: () => { const meId = s.me; const fresh = db.notifs.filter(n => n.uid === meId && !n.read).map(n => n.id); this.mut(d2 => { d2.notifs.forEach(n => { if (n.uid === meId) n.read = true; }); }, { modal: { kind: 'notifs', fresh: fresh } }); },
      openEdit: () => this.openEdit(), logout: () => this.logout(),
      closeModal: () => this.setState({ modal: null }), stop: (e) => e.stopPropagation(),
      toForgot: () => this.setState({ auth: Object.assign(this.blankAuth('forgot'), { email: s.auth.email }) }),
      toSignup: () => this.setState({ auth: this.blankAuth('signup', s.auth.role) }), toLogin: () => this.setState({ auth: this.blankAuth('login') }),
      roleFan: () => this.setState({ auth: Object.assign({}, s.auth, { role: 'fan', error: '' }) }), roleArtist: () => this.setState({ auth: Object.assign({}, s.auth, { role: 'artist', error: '' }) }),
      doLogin: (e) => this.doLogin(e), doSignup: (e) => this.doSignup(e), doForgot: (e) => this.doForgot(e),
      demoFan: () => this.enter('f1'), demoArtist: () => this.enter('a2'),
      suNext: () => this.suNext(), suBack: () => this.setState({ setup: Object.assign({}, s.setup, { step: Math.max(0, s.setup.step - 1), err: '' }) })
    };
  }
}

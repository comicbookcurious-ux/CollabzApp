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
      chatWith: null, chatText: '', play: null
    };
  }
  // Preview states: each screen artboard on the canvas mounts this file with a `start` value.
  applyStart(k, S) {
    const db = S.db, t = Date.now(), H = 3600000;
    const as = (me, extra) => Object.assign(S, { me: me }, extra || {});
    const art = (me, viewing, tab, extra) => as(me, Object.assign({ screen: 'artist', viewing: viewing, tab: tab, open: null }, extra || {}));
    const blankSoc = { facebook: '', instagram: '', x: '', tiktok: '', youtube: '' };
    const newUser = (id, role, name, email) => { db.users[id] = { id: id, role: role, name: name, email: email, password: 'demo1234', genre: '', bio: '', location: '', avatar: null, video: null, socials: Object.assign({}, blankSoc), coins: role === 'artist' ? { silver: 50, gold: 20, green: 10 } : { silver: 10, gold: 10, green: 0 }, tickets: role === 'artist' ? 0 : 10, followers: [], following: [], theme: 'default', termsAccepted: true }; };
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
      case 'owner-games': art('a2', 'a2', 'games'); break;
      case 'owner-game-new': art('a2', 'a2', 'games'); setTimeout(() => this.openGmModal(null), 0); break;
      case 'play-trivia': case 'play-quiz': case 'play-solitaire': case 'play-memory': case 'play-hilo': case 'play-blackjack': case 'play-golf': case 'play-puzzle': {
        const v = k.slice(5), g = db.games.find(x => (x.kind === 'cards' ? x.variant : x.kind) === v);
        art('f1', 'a2', 'games', { play: { gid: g.id, v: v, practice: false, st: this.newSt(g), over: false, won: false, msg: '' } });
        if (v === 'trivia') S.play.st = Object.assign(S.play.st, { busy: false, qAt: t, left: 11 });
        break;
      }
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
      black: Object.assign({}, dk, { name: 'Black', kind: 'Dark', bg: 'linear-gradient(170deg,#000000 0%,#050505 55%,#0d0d0d 100%)', card: 'rgba(255,255,255,.05)', card2: 'rgba(255,255,255,.04)', line: 'rgba(255,255,255,.14)', soft: 'rgba(255,255,255,.07)', field: 'rgba(255,255,255,.06)', bar: 'rgba(0,0,0,.82)', sheet: '#111111', a1: '#525252', a2: '#1f1f1f', inv: '#000000' }),
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
    const base = (o) => Object.assign({ avatar: null, video: null, location: '', bio: '', socials: { facebook: '', instagram: '', x: '', tiktok: '', youtube: '' }, followers: [], following: [], theme: 'default', genre: '', password: 'demo1234', termsAccepted: true }, o);
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
    const gm = (o) => Object.assign({ variant: null, desc: '', img: '', size: null, secs: null, pass: null, target: null, qs: [], winners: 1, picked: [], claims: [], at: t - D }, o);
    const games = [
      gm({ id: 'g1', aid: 'a2', kind: 'trivia', title: 'Kai Mercer movie trivia', desc: 'How well do you know the films?', secs: 15, winners: 3, prize: { type: 'gold', amount: 3 }, picked: ['f2'], at: t - 3 * D, qs: [
        { q: 'Where did we film the final scene of "Northern Lights"?', opts: ['Perth', 'Auckland', 'Vancouver', 'Reykjavik'], ans: 3 },
        { q: 'How many days did the shoot take?', opts: ['21', '35', '48', '60'], ans: 2 },
        { q: 'Which prop did Kai keep after filming?', opts: ['The red scarf', 'The compass', 'The old camera'], ans: 1 },
        { q: 'What year did Kai’s first short film come out?', opts: ['2016', '2018', '2020', '2022'], ans: 1 }] }),
      gm({ id: 'g2', aid: 'a2', kind: 'quiz', title: 'Behind the scenes quiz', desc: 'Five questions about life on set.', pass: 4, winners: 1, prize: { type: 'custom', amount: 1, text: 'Signed premiere poster', img: this.demoImg('#7c2d12', '#f59e0b') }, at: t - 2 * D, qs: [
        { q: 'What is the first thing called before a take?', opts: ['Roll sound', 'Action', 'Cut'], ans: 0 },
        { q: 'Who calls "Cut"?', opts: ['The editor', 'The director', 'The producer'], ans: 1 },
        { q: 'What is a "martini shot"?', opts: ['The first shot of the day', 'The last shot of the day', 'A party scene'], ans: 1 },
        { q: 'What does the clapperboard help with?', opts: ['Lighting', 'Syncing sound and picture', 'Costumes'], ans: 1 },
        { q: 'What is "golden hour"?', opts: ['Lunch break', 'Overtime', 'The light just after sunrise or before sunset'], ans: 2 }] }),
      gm({ id: 'g3', aid: 'a2', kind: 'solitaire', title: 'Premiere Solitaire', desc: 'Classic solitaire with the premiere card design.', img: this.demoBack('#4c1d95', '#be185d'), winners: 5, prize: { type: 'silver', amount: 5 }, at: t - 2 * D }),
      gm({ id: 'g4', aid: 'a2', kind: 'cards', variant: 'memory', title: 'Memory match', desc: 'Find the pairs.', img: this.demoBack('#0f766e', '#1d4ed8'), winners: 10, prize: { type: 'tickets', amount: 2 }, at: t - 30 * H }),
      gm({ id: 'g5', aid: 'a2', kind: 'cards', variant: 'hilo', title: 'Higher or Lower', target: 7, img: this.demoBack('#4c1d95', '#be185d'), winners: 2, prize: { type: 'green', amount: 1 }, at: t - 26 * H }),
      gm({ id: 'g6', aid: 'a2', kind: 'cards', variant: 'blackjack', title: 'Blackjack night', target: 3, img: this.demoBack('#14532d', '#0f766e'), winners: 3, prize: { type: 'gold', amount: 2 }, at: t - 20 * H }),
      gm({ id: 'g7', aid: 'a2', kind: 'cards', variant: 'golf', title: 'Golf solitaire', img: this.demoBack('#4c1d95', '#be185d'), winners: 3, prize: { type: 'silver', amount: 3 }, at: t - 10 * H }),
      gm({ id: 'g8', aid: 'a2', kind: 'puzzle', title: 'Premiere poster puzzle', desc: 'Put the poster back together.', img: this.demoScene(), size: 3, winners: 1, prize: { type: 'green', amount: 1 }, at: t - 5 * H })
    ];
    const gplays = [{ gid: 'g1', uid: 'f2', plays: 3, won: true, best: 4, wonAt: t - 2 * D, at: t - 2 * D }, { gid: 'g3', uid: 'f2', plays: 2, won: false, best: null, at: t - D }, { gid: 'g8', uid: 'f2', plays: 1, won: true, best: 14, wonAt: t - 3 * H, at: t - 3 * H }];
    const ch = (o) => Object.assign({ ev: null, options: [], imgs: [], rt: 'gold', rw: 1, max: 100, winner: null, claimed: false, at: t - 2 * D }, o);
    return {
      users: users,
      challenges: [
        ch({ id: 'c1', aid: 'a2', title: 'Act out your favourite line from my last film', desc: 'Film yourself delivering the line. Costumes encouraged.', type: 'video', rt: 'gold', rw: 2, at: t - 4 * D }),
        ch({ id: 'c2', aid: 'a2', title: 'Where did we film the final scene?', desc: 'Pick one. Hint: it was very cold.', thumb: this.demoImg('#0c4a6e', '#67e8f9'), type: 'mc', options: ['Perth', 'Auckland', 'Vancouver', 'Reykjavik'], rt: 'silver', rw: 3, winner: 'f2', claimed: true, at: t - 3 * D }),
        ch({ id: 'c3', aid: 'a2', title: 'Design an alternate movie poster', desc: 'Any medium. Upload a photo or export of your poster.', type: 'image', thumb: this.demoScene(), rt: 'gold', rw: 1, max: 50, at: t - 2 * D }),
        ch({ id: 'c4', aid: 'a2', ev: 'e1', title: 'Take a selfie inside the theatre.', desc: 'Take a selfie wherever in the theatre.', type: 'image', rt: 'gold', rw: 1, at: t - D }),
        ch({ id: 'c5', aid: 'a2', ev: 'e1', title: 'Make a video with your friends at the premier night.', desc: 'Be funny.', type: 'video', rt: 'gold', rw: 1, at: t - D }),
        ch({ id: 'c6', aid: 'a1', title: 'Sing the chorus of my new single', desc: 'Any key, any style. Keep it under 60 seconds.', type: 'video', rt: 'silver', rw: 5, at: t - 5 * D }),
        ch({ id: 'c7', aid: 'a1', title: 'Draw the album cover in your style', desc: 'Upload your artwork. Every style welcome.', type: 'image', rt: 'gold', rw: 2, at: t - 3 * D }),
        ch({ id: 'c8', aid: 'a1', ev: 'e2', title: 'Show me your outfit on the day', desc: 'Snap your concert fit before doors open.', type: 'image', rt: 'silver', rw: 2, max: 200, at: t - D }),
        ch({ id: 'c9', aid: 'a3', title: 'Which track should open the tour?', desc: 'Vote for the opener. Most votes wins the spot.', type: 'mc', options: ['Static Bloom', 'Night Bus', 'Glass Heart'], rt: 'silver', rw: 2, at: t - 2 * D }),
        ch({ id: 'c10', aid: 'a3', title: 'Remix 15 seconds of my new beat', desc: 'Any software, any style. Upload a short video of it playing.', type: 'video', rt: 'gold', rw: 3, at: t - D }),
        ch({ id: 'c11', aid: 'a2', title: 'Pick my outfit for the premiere', desc: 'Tap the look you want to see on the red carpet.', type: 'mc', options: ['Midnight sequins', 'Red leather', 'All white'], imgs: [this.demoImg('#1e1b4b', '#6366f1'), this.demoImg('#7f1d1d', '#ef4444'), this.demoImg('#e5e7eb', '#ffffff')], rt: 'silver', rw: 2, at: t - 6 * H }),
        ch({ id: 'c12', aid: 'a2', title: 'What should my next film be about?', desc: 'Tell me in a sentence or two. My favourite idea wins.', type: 'text', rt: 'gold', rw: 1, at: t - 3 * H })
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
      games: games, gplays: gplays,
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
  mkPop(type, n, title, sub, customImg) {
    const img = type === 'ticket' ? null : (type === 'custom' ? (customImg || 'assets/collabz-icon.png') : this.coin(type));
    const bits = img ? Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 + 0.3; const r = 150 + (i % 3) * 40; return { img: img, style: '--dx:' + Math.round(Math.cos(a) * r) + 'px;--dy:' + Math.round(Math.sin(a) * r) + 'px;animation-delay:' + (0.25 + i * 0.04).toFixed(2) + 's' }; }) : [];
    return { img: img || '', isCoin: !!img, isTicket: !img, big: n, title: title, sub: sub, bits: bits, k: Date.now() };
  }
  // Navigation keeps a history of in-app screens so every screen can offer "Back".
  snapshot(s) { return { sq: s.sq, screen: s.screen, viewing: s.viewing, profileId: s.profileId, tab: s.tab, genre: s.genre, gsel: s.gsel, chatWith: s.chatWith, sb: s.sb, forumOpen: s.forumOpen }; }
  go(screen, extra) {
    const s = this.state;
    const hist = (s.hist || []).slice();
    const navigable = ['artist', 'profile', 'community', 'chat', 'pickGenre', 'pickArtist', 'search'];
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
  // Remember the last artist page a fan was on (per device), so logging back in returns there.
  rememberArtist(id) {
    const me = this.state.db.users[this.state.me];
    if (!me || me.role !== 'fan') return;
    try { localStorage.setItem('collabz:lastArtist:' + me.id, JSON.stringify({ id: id, at: Date.now() })); } catch (e) {}
  }
  lastArtistFor(u) {
    const db = this.state.db, cands = [];
    try { const v = JSON.parse(localStorage.getItem('collabz:lastArtist:' + u.id) || 'null'); if (v && v.id) cands.push(v); } catch (e) {}
    db.subs.filter(x => x.uid === u.id).forEach(x => { const c = db.challenges.find(y => y.id === x.cid); if (c) cands.push({ id: c.aid, at: x.at }); });
    db.entries.filter(x => x.uid === u.id).forEach(x => { const l = db.lotteries.find(y => y.id === x.lid); if (l) cands.push({ id: l.aid, at: x.at }); });
    (db.gplays || []).filter(x => x.uid === u.id).forEach(x => { const g = (db.games || []).find(y => y.id === x.gid); if (g) cands.push({ id: g.aid, at: x.at }); });
    const best = cands.filter(c => db.users[c.id] && db.users[c.id].role === 'artist').sort((a, b) => b.at - a.at)[0];
    if (best) return best.id;
    const followed = (u.following || []).filter(id => db.users[id] && db.users[id].role === 'artist');
    return followed.length ? followed[followed.length - 1] : null;
  }
  // Switch artist tab. If the page is scrolled past the tab bar, bring the start of the new tab into view.
  pickTab(t) {
    this.setState({ tab: t, open: null });
    try {
      const a = document.querySelector('.tabanchor'), head = document.querySelector('.top');
      if (!a) return;
      const y = a.getBoundingClientRect().top + window.scrollY - (head ? head.offsetHeight : 0) - 8;
      if (window.scrollY > y) window.scrollTo({ top: y, behavior: 'smooth' });
    } catch (e) {}
  }
  myArtists(u) {
    const db = this.state.db, m = {};
    const touch = (aid, at, took) => { if (!db.users[aid] || db.users[aid].role !== 'artist') return; const r = m[aid] || (m[aid] = { id: aid, at: 0, took: false, follows: false }); r.at = Math.max(r.at, at || 0); if (took) r.took = true; };
    db.subs.filter(x => x.uid === u.id).forEach(x => { const c = db.challenges.find(y => y.id === x.cid); if (c) touch(c.aid, x.at, true); });
    db.entries.filter(x => x.uid === u.id).forEach(x => { const l = db.lotteries.find(y => y.id === x.lid); if (l) touch(l.aid, x.at, true); });
    (db.gplays || []).filter(x => x.uid === u.id).forEach(x => { const g = (db.games || []).find(y => y.id === x.gid); if (g) touch(g.aid, x.at, true); });
    try { const v = JSON.parse(localStorage.getItem('collabz:lastArtist:' + u.id) || 'null'); if (v && v.id) touch(v.id, v.at, false); } catch (e) {}
    (u.following || []).forEach(id => { touch(id, 0, false); if (m[id]) m[id].follows = true; });
    Object.values(m).forEach(r => { if (!r.took && !r.follows) delete m[r.id]; });
    return Object.values(m).sort((a, b) => b.at - a.at || db.users[a.id].name.localeCompare(db.users[b.id].name));
  }
  openArtist(id, tab, open, sb) { this.rememberArtist(id); this.go('artist', { viewing: id, tab: tab || 'challenges', open: open || null, sb: sb || { cat: 'challenge', sel: '' } }); }
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
    const base = { me: id, auth: this.blankAuth(), modal: null, open: null, ans: {}, q: '', chatWith: null, hist: [], play: null };
    if (u.role === 'artist') this.go('artist', Object.assign(base, { viewing: id, tab: 'challenges', sb: { cat: 'challenge', sel: '' } }));
    else {
      // Fans land straight back on the last artist they collaborated with (no Back button: history starts here)
      const last = this.lastArtistFor(u);
      if (last) this.go('artist', Object.assign(base, { viewing: last, tab: 'challenges', sb: { cat: 'challenge', sel: '' } }));
      else this.go('pickArtist', Object.assign(base, { genre: u.genre || 'music', viewing: null }));
    }
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
    const u = { id: id, role: a.role, name: nm, email: em, password: a.password, genre: '', bio: '', location: '', avatar: null, video: null, socials: { facebook: '', instagram: '', x: '', tiktok: '', youtube: '' }, coins: artist ? { silver: 50, gold: 20, green: 10 } : { silver: 10, gold: 10, green: 0 }, tickets: artist ? 0 : 10, followers: [], following: [], theme: 'default', termsAccepted: false };
    const setup = { role: a.role, step: 0, err: '', genres: [], name: nm, bio: '', location: '', avatar: null, video: null, videoName: '', facebook: '', instagram: '', x: '', tiktok: '', youtube: '' };
    this.mut(db => { db.users[id] = u; this.notify(db, id, artist ? 'Welcome to Collabz! Your starter balance is 50 silver, 20 gold and 10 green coins.' : 'Welcome to Collabz! You start with 10 silver, 10 gold and 10 tickets.'); }, { me: id, screen: 'terms', termsOk: false, setup: setup, auth: this.blankAuth() });
  }
  doForgot(e) {
    if (e) e.preventDefault();
    const em = this.state.auth.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return this.authErr('Enter the email you signed up with.');
    this.setState({ auth: Object.assign({}, this.state.auth, { error: '', info: 'If an account exists for ' + em + ', a password reset link is on its way. Check your inbox.' }) });
  }
  logout() { this.closeGame(); this.go('auth', { me: null, viewing: null, profileId: null, auth: this.blankAuth(), modal: null, setup: null, ans: {}, open: null, hist: [], play: null }); }

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
  demoImg(c1, c2) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="150" cy="105" r="38" fill="rgba(255,255,255,.35)"/><path d="M95 255 112 160h76l17 95z" fill="rgba(255,255,255,.35)"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  // Two kinds of challenge: CHOOSE (pick from multiple-choice options) and CREATE (fans make something: text, image or video)
  chGroup(t) { return t === 'mc' ? 'CHOOSE' : 'CREATE'; }
  typeName(t, long) { return this.chGroup(t) + ' · ' + ((long ? { mc: 'Multiple choice', text: 'Text answer', image: 'Image', video: 'Video' } : { mc: 'Multiple choice', text: 'Text', image: 'Image', video: 'Video' })[t] || t); }
  hasMedia(c) { return c.type === 'image' || c.type === 'video'; }
  optImg(c, i) { return (c.imgs && c.imgs[i]) || ''; }
  ansReady(c, d) { return c.type === 'mc' ? d.choice != null : (c.type === 'text' ? !!(d.text || '').trim() : !!d.file); }
  ansValue(c, d) { return c.type === 'mc' ? c.options[d.choice] : (c.type === 'text' ? (d.text || '').trim().slice(0, 500) : ''); }
  setAns(cid, patch) { const a = Object.assign({}, this.state.ans); a[cid] = Object.assign({}, a[cid] || {}, patch); this.setState({ ans: a }); }
  ansFile(cid, e) { const f = e.target.files && e.target.files[0]; if (!f) return; this.setAns(cid, { file: URL.createObjectURL(f), name: f.name }); }
  submit(cid) {
    const s = this.state, d = s.ans[cid] || {}, c = s.db.challenges.find(x => x.id === cid); if (!c) return;
    if (!this.ansReady(c, d)) return;
    const ans = Object.assign({}, s.ans); delete ans[cid];
    this.mut(db => {
      const me = db.users[s.me];
      db.subs.push({ id: this.uid('s'), cid: cid, uid: me.id, answer: this.ansValue(c, d), file: this.hasMedia(c) ? (d.file || null) : null, at: Date.now() });
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
  setM(k, v) { this.setState({ modal: Object.assign({}, this.state.modal, { err: '' }, { [k]: v }) }); }
  mFile(k, e) { const f = e.target.files && e.target.files[0]; if (!f) return; const p = { [k]: URL.createObjectURL(f), err: '' }; if (k === 'video') p.videoName = f.name; this.setState({ modal: Object.assign({}, this.state.modal, p) }); }
  openChModal(c, ev) {
    const o = (c && c.options) || [], im = (c && c.imgs) || [];
    this.setState({ modal: { kind: 'ch', id: c ? c.id : null, ev: c ? c.ev : (ev || null), title: c ? c.title : '', desc: c ? c.desc : '', type: c ? c.type : 'image', o0: o[0] || '', o1: o[1] || '', o2: o[2] || '', o3: o[3] || '', i0: im[0] || '', i1: im[1] || '', i2: im[2] || '', i3: im[3] || '', thumb: c ? (c.thumb || '') : '', lastCreate: c && c.type !== 'mc' ? c.type : 'image', rt: c ? c.rt : 'gold', rw: String(c ? c.rw : 1), max: String(c ? c.max : 100), err: '' } });
  }
  saveCh() {
    const m = this.state.modal, me = this.state.me;
    const mo = this.mcOptions(m), opts = mo.labels;
    const rw = parseInt(m.rw, 10), max = parseInt(m.max, 10);
    if (!m.title.trim()) return this.setM('err', 'Give the challenge a title.');
    if (m.type === 'mc' && opts.length < 2) return this.setM('err', 'Add at least two answer options (text, an image, or both).');
    if (m.type === 'mc' && new Set(opts.map(x => x.toLowerCase())).size !== opts.length) return this.setM('err', 'Each answer option needs a different label.');
    if (!(rw >= 1)) return this.setM('err', 'The reward needs to be at least 1 coin.');
    if (!(max >= 1)) return this.setM('err', 'Allow at least 1 submission.');
    this.mut(db => {
      const data = { title: m.title.trim(), desc: m.desc.trim(), type: m.type, options: m.type === 'mc' ? opts : [], imgs: m.type === 'mc' && mo.imgs.some(Boolean) ? mo.imgs : [], thumb: m.thumb || '', rt: m.rt, rw: rw, max: max };
      if (m.id) Object.assign(db.challenges.find(x => x.id === m.id), data);
      else {
        const c = Object.assign({ id: this.uid('c'), aid: me, ev: m.ev, winner: null, claimed: false, at: Date.now() }, data);
        db.challenges.push(c);
        db.users[me].followers.forEach(f => this.notify(db, f, db.users[me].name + ' posted a new ' + (m.ev ? 'Showday challenge' : 'challenge') + ': "' + c.title + '"', { type: 'artist', id: me, tab: m.ev ? 'showday' : 'challenges', open: c.id }));
      }
    }, { modal: null });
  }
  // Options the artist filled in (text, image or both). An image without text gets a label like "Option B".
  mcOptions(m) {
    const labels = [], imgs = [];
    [0, 1, 2, 3].forEach(i => {
      const t = (m['o' + i] || '').trim(), im = m['i' + i] || '';
      if (!t && !im) return;
      labels.push(t || 'Option ' + 'ABCD'[labels.length]); imgs.push(im);
    });
    return { labels: labels, imgs: imgs };
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
      if (m.action === 'delGm') { db.games = db.games.filter(x => x.id !== id); db.gplays = db.gplays.filter(x => x.gid !== id); }
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

  // ---------- agreement ----------
  termsVersion() { return 'Version 1 · October 2026'; }
  termsSections(role) {
    const common = [
      ['1. Your account', 'Use your real name or a name that represents you, keep your password private, and keep your details up to date. If you are under 18, you need permission from a parent or guardian to use Collabz. You are responsible for activity on your account.'],
      ['2. Coins, tickets and levels', 'Silver, gold and green coins, tickets, XP and levels are rewards inside Collabz only. They have no cash value and cannot be sold, transferred or exchanged for money. We may correct balances that change because of errors, bugs or misuse.'],
      ['3. Your content', 'You keep ownership of what you post: submissions, messages, forum posts, photos and videos. By posting, you allow Collabz and the artist whose challenge you joined to show it in the app and to feature it with credit to you. Only post content you created or have permission to share.'],
      ['4. Community guidelines', 'Be respectful. No harassment, bullying, hate speech, threats, sexual or graphic content, spam, scams or impersonation. Do not post anything illegal or anything that shares someone else\u2019s private information. We may remove content or suspend accounts that break these rules.'],
      ['5. Lotteries and prizes', 'Lottery entries use tickets and cannot be refunded. Winners are drawn at random, and each entry is one chance. Prizes and experiences are offered and described by the artist. The Collabz team contacts winners by email. Prizes are not transferable unless the artist says so.'],
      ['6. Privacy', 'We store your profile, activity, uploads and messages to run Collabz. Your name, photo, bio, email address, level, follows, submissions and votes are visible to other users. Messages are only visible to you and the person you message.'],
      ['7. Deleting your account', 'You can delete your account at any time from Edit profile. Deleting is permanent: your profile, coins, tickets, level and messages are removed and cannot be recovered.'],
      ['8. Changes to these terms', 'We may update these terms as Collabz grows. If we make important changes, we will tell you in the app before they take effect.']
    ];
    const fan = [['For fans', 'Your submissions must be your own work. You can take part in each challenge once. Artists choose challenge winners, and their decision is final once a prize has been claimed.']];
    const artist = [['For creators and artists', 'You are responsible for the challenges, Showday events, lotteries and games you post, and for delivering the prizes and experiences you offer. Describe prizes honestly and clearly. Make sure your promotions, competitions and lotteries follow the laws and permit rules where you and your fans live.']];
    return common.concat(role === 'artist' ? artist : fan).map(x => ({ h: x[0], p: x[1] }));
  }
  acceptTerms() {
    if (!this.state.termsOk) return;
    const id = this.state.me;
    this.mut(db => { if (db.users[id]) db.users[id].termsAccepted = true; });
    if (this.state.setup) this.go('setup', { termsOk: false, hist: [] }); else this.enter(id);
  }
  declineTerms() { this.logout(); this.setState({ auth: Object.assign(this.blankAuth('login'), { info: 'You need to agree to the Terms of Use to use Collabz. Log in again whenever you\u2019re ready.' }) }); }

  // ---------- fan levels ----------
  // XP comes from activity, so it is the same on every device. Levels 1-6, each with its own badge.
  levelThresholds() { return [0, 100, 250, 500, 900, 1500]; }
  levelInfo(u) {
    const db = this.state.db, id = u.id;
    let xp = 0;
    db.subs.filter(x => x.uid === id).forEach(x => { const c = db.challenges.find(y => y.id === x.cid); if (c) xp += c.ev ? 30 : 20; });
    db.entries.filter(e => e.uid === id).forEach(e => { xp += 10 * e.n; });
    xp += 50 * db.challenges.filter(c => c.winner === id).length;
    xp += 50 * db.lotteries.filter(l => (l.picked || []).includes(id)).length;
    db.forums.forEach(t => { if (t.uid === id) xp += 10; t.replies.forEach(r => { if (r.uid === id) xp += 5; }); });
    xp += 2 * (db.votes || []).filter(v => v.uid === id).length;
    (db.gplays || []).forEach(p => { if (p.uid === id && p.won && (db.games || []).some(g => g.id === p.gid)) xp += 15; });
    xp += 50 * (db.games || []).filter(g => g.picked.includes(id)).length;
    xp += 5 * (u.following || []).filter(f => db.users[f] && db.users[f].role === 'artist').length;
    const T = this.levelThresholds();
    let lv = 1; T.forEach((t, i) => { if (xp >= t) lv = i + 1; });
    const max = lv === T.length, cur = T[lv - 1], next = max ? null : T[lv];
    const pct = max ? 100 : Math.max(4, Math.round((xp - cur) / (next - cur) * 100));
    return {
      level: lv, xp: xp, max: max, icon: 'assets/level-' + lv + '.png', label: 'Level ' + lv,
      barStyle: 'width: ' + pct + '%', progressText: max ? xp + ' XP' : xp + ' / ' + next + ' XP',
      toNext: max ? 'Top level reached' : (next - xp) + ' XP to Level ' + (lv + 1),
      steps: T.map((t, i) => ({ icon: 'assets/level-' + (i + 1) + '.png', title: 'Level ' + (i + 1) + ' · ' + t + ' XP', cls: i + 1 <= lv ? 'lvlstep on' : 'lvlstep' }))
    };
  }
  checkLevelUp(me) {
    if (!me || me.role !== 'fan') { this._lvUser = null; return; }
    const L = this.levelInfo(me);
    if (this._lvUser !== me.id) { this._lvUser = me.id; this._lv = L.level; return; }
    if (L.level > this._lv) {
      this._lv = L.level;
      clearTimeout(this._lvt);
      this._lvt = setTimeout(() => {
        const pop = this.mkPop('gold', L.label, 'Level up!', 'You earned the Level ' + L.level + ' badge. Keep collaborating to reach the next one.');
        pop.img = L.icon; pop.bits = pop.bits.map(b => Object.assign({}, b, { img: L.icon }));
        this.setState({ lvpop: pop });
        clearTimeout(this._lpt); this._lpt = setTimeout(() => this.setState({ lvpop: null }), 3400);
      }, this.state.pop ? 2900 : 200);
    } else if (L.level < this._lv) this._lv = L.level;
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
    const typeLabel = this.typeName(c.type, true), imgOpts = c.type === 'mc' && (c.imgs || []).some(Boolean);
    const art = this.user(c.aid);
    return {
      isCh: true, isEvHead: false, isEvFoot: false, isLt: false,
      outer: c.ev ? 'evmid' : 'gap', boxCls: open ? 'blk open' : 'blk',
      title: c.title, desc: c.desc || 'No extra details.', typeLabel: typeLabel,
      isMC: c.type === 'mc', isText: c.type === 'text', isImage: c.type === 'image', isVideo: c.type === 'video',
      group: this.chGroup(c.type), groupCls: c.type === 'mc' ? 'rkind choose' : 'rkind create', thumb: c.thumb || '', hasThumb: !!c.thumb,
      imgOpts: imgOpts, txtOpts: c.type === 'mc' && !imgOpts,
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
      options: (c.options || []).map((o, i) => { const im = this.optImg(c, i); return { label: o, letter: 'ABCD'[i], img: im, hasImg: !!im, noImg: !im, on: d.choice === i, cls: d.choice === i ? 'opt on' : 'opt', tcls: d.choice === i ? 'iopt on' : 'iopt', pick: () => this.setAns(c.id, { choice: i }) }; }),
      textVal: d.text || '', setText: (e) => this.setAns(c.id, { text: e.target.value.slice(0, 500) }), textCount: (d.text || '').length + ' / 500',
      needsFile: this.hasMedia(c), accept: c.type === 'image' ? 'image/*' : 'video/*',
      fileLabel: d.file ? 'Chosen: ' + d.name + ' (tap to change)' : (c.type === 'image' ? 'Choose a photo or artwork' : 'Choose a video'),
      onFile: (e) => this.ansFile(c.id, e), file: d.file || '', fileImg: c.type === 'image' && !!d.file, fileVid: c.type === 'video' && !!d.file,
      notReady: !this.ansReady(c, d), submit: () => this.submit(c.id),
      myAnsImg: mine && c.type === 'mc' ? this.optImg(c, (c.options || []).indexOf(mine.answer)) : '',
      myText: mine ? (c.type === 'mc' || c.type === 'text' ? 'Your answer: ' + (c.type === 'text' ? '“' + mine.answer + '”' : mine.answer) + '. You earned ' + this.plural(c.rw, c.rt + ' coin', c.rt + ' coins') + '.' : 'Sent ' + this.ago(mine.at) + '. You earned ' + this.plural(c.rw, c.rt + ' coin', c.rt + ' coins') + '.') : '',
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
      isMC: c.type === 'mc', isText: c.type === 'text', answer: x.answer, file: x.file || '',
      ansImg: c.type === 'mc' ? this.optImg(c, (c.options || []).indexOf(x.answer)) : '', hasAnsImg: c.type === 'mc' && !!this.optImg(c, (c.options || []).indexOf(x.answer)),
      hasImg: c.type === 'image' && !!x.file, hasVid: c.type === 'video' && !!x.file, noMedia: this.hasMedia(c) && !x.file,
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
      votable: this.hasMedia(c), score: score, upCount: up, downCount: down,
      myUp: !!(mine && mine.v > 0), myDown: !!(mine && mine.v < 0),
      upCls: mine && mine.v > 0 ? 'vbtn up on' : 'vbtn up', downCls: mine && mine.v < 0 ? 'vbtn down on' : 'vbtn down',
      scoreCls: score > 0 ? 'vscore pos' : (score < 0 ? 'vscore neg' : 'vscore'),
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


  // ---------- games ----------
  G() { return window.CollabzGames; }
  gameKinds() {
    return [
      ['trivia', 'Trivia', 'Timed questions you write. Fans must get every one right.'],
      ['quiz', 'Quiz', 'Questions you write, answered at their own pace. Fans pass with the score you set.'],
      ['solitaire', 'Solitaire', 'Classic Klondike solitaire with your design on the back of the cards.'],
      ['cards', 'Classic Card Games', 'Memory match, Higher or Lower, Blackjack or Golf solitaire with your card back.'],
      ['puzzle', 'Puzzle', 'Upload an image. It is cut into tiles that fans swap back into place.']
    ];
  }
  variants() { return [['memory', 'Memory match'], ['hilo', 'Higher or Lower'], ['blackjack', 'Blackjack'], ['golf', 'Golf solitaire']]; }
  gameLabel(g) { if (g.kind === 'cards') { const v = this.variants().find(x => x[0] === g.variant); return v ? v[1] : 'Card game'; } const k = this.gameKinds().find(x => x[0] === g.kind); return k ? k[1] : 'Game'; }
  gameHow(g) {
    const n = (g.qs || []).length, t = g.target || 0;
    switch (g.kind === 'cards' ? g.variant : g.kind) {
      case 'trivia': return this.plural(n, 'question', 'questions') + ', ' + (g.secs || 15) + ' seconds each. Get every answer right to win.';
      case 'quiz': return this.plural(n, 'question', 'questions') + '. Get at least ' + Math.min(g.pass || n, n) + ' right to win.';
      case 'solitaire': return 'Move every card up to the four foundations, Ace to King, to win. Tap a card to move it.';
      case 'memory': return 'Flip two cards at a time. Find all 8 pairs to win.';
      case 'hilo': return 'Guess if the next card is higher or lower. Get ' + t + ' right in a row to win.';
      case 'blackjack': return 'Beat the dealer to 21. Win ' + this.plural(t, 'hand', 'hands') + ' before the dealer does to win the game.';
      case 'golf': return 'Clear all seven columns. Play a card one higher or lower than the top of the pile.';
      case 'puzzle': return 'Tap two tiles to swap them. Put the ' + (g.size || 3) + '×' + (g.size || 3) + ' picture back together to win.';
      default: return '';
    }
  }
  // Lower is better for move-based games; higher for the rest
  lowerBetter(g) { return g.kind === 'solitaire' || g.kind === 'puzzle' || (g.kind === 'cards' && (g.variant === 'memory' || g.variant === 'blackjack')); }
  scoreText(g, sc) {
    if (sc == null) return '';
    switch (g.kind === 'cards' ? g.variant : g.kind) {
      case 'trivia': case 'quiz': return sc + ' of ' + (g.qs || []).length + ' right';
      case 'blackjack': return this.plural(sc, 'hand', 'hands') + ' lost';
      case 'hilo': return sc + ' in a row';
      case 'golf': return this.plural(sc, 'card', 'cards') + ' left in the stock';
      default: return this.plural(sc, 'move', 'moves');
    }
  }
  prizeInfo(g) {
    const p = g.prize || { type: 'gold', amount: 1 }, a = p.amount || 1;
    if (p.type === 'custom') return { img: p.img || '', hasImg: !!p.img, isTicket: false, gift: !p.img, label: p.text || 'A prize from the artist', isCustom: true };
    if (p.type === 'tickets') return { img: '', hasImg: false, isTicket: true, gift: false, label: this.plural(a, 'ticket', 'tickets'), isCustom: false };
    return { img: this.coin(p.type), hasImg: true, isTicket: false, gift: false, label: this.plural(a, p.type + ' coin', p.type + ' coins'), isCustom: false };
  }
  playOf(gid, uid) { return (this.state.db.gplays || []).find(p => p.gid === gid && p.uid === uid) || null; }
  demoBack(c1, c2) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="20" fill="rgba(255,255,255,.08)"/></pattern></defs><rect width="200" height="280" fill="url(#g)"/><rect width="200" height="280" fill="url(#p)"/><rect x="12" y="12" width="176" height="256" rx="10" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/><circle cx="100" cy="140" r="34" fill="none" stroke="#fde68a" stroke-width="5"/><path d="M100 116l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#fde68a"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  demoScene() {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset=".55" stop-color="#c026d3"/><stop offset="1" stop-color="#fb923c"/></linearGradient></defs><rect width="600" height="600" fill="url(#s)"/><circle cx="420" cy="250" r="90" fill="#fde047"/><g fill="#fff" opacity=".8"><circle cx="80" cy="70" r="3"/><circle cx="190" cy="40" r="2"/><circle cx="300" cy="100" r="3"/><circle cx="520" cy="60" r="2"/><circle cx="560" cy="140" r="3"/></g><path d="M0 420 120 290 230 400 340 260 470 420 600 330V600H0z" fill="#312e81"/><path d="M0 500 160 380 300 480 430 400 600 470V600H0z" fill="#0f172a"/><rect x="250" y="455" width="100" height="90" fill="#f472b6"/><path d="M240 455h120l-60-50z" fill="#fbcfe8"/><rect x="285" y="495" width="30" height="50" fill="#0f172a"/><text x="300" y="585" font-family="Arial" font-size="34" font-weight="700" fill="#fde68a" text-anchor="middle">PREMIERE NIGHT</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  cardV(c, g, extra) {
    const G = this.G(), up = !!(c && c.up);
    const back = g && g.img ? 'background-image: url("' + g.img + '")' : '';
    return Object.assign({ up: up, down: !up, rank: c ? G.RANK[c.r] : '', sym: c ? G.SYM[c.s] : '', cls: 'pc' + (up ? (G.red(c) ? ' red' : '') : ' down' + (g && g.img ? ' art' : '')), style: up ? '' : back }, extra || {});
  }

  // Game sheet (create / edit)
  blankQ() { return { q: '', o: ['', '', '', ''], ans: 0 }; }
  openGmModal(g) {
    const p = (g && g.prize) || { type: 'gold', amount: 1, text: '', img: '' };
    const qs = g && g.qs && g.qs.length ? g.qs.map(q => { const o = q.opts.slice(0, 4); while (o.length < 4) o.push(''); return { q: q.q, o: o, ans: q.ans == null ? 0 : q.ans }; }) : [this.blankQ(), this.blankQ(), this.blankQ()];
    this.setState({ modal: {
      kind: 'gm', id: g ? g.id : null, gk: g ? g.kind : 'trivia', variant: g ? (g.variant || 'memory') : 'memory', title: g ? g.title : '', desc: g ? g.desc : '', img: g ? (g.img || '') : '',
      size: String(g ? g.size || 3 : 3), secs: String(g ? g.secs || 15 : 15), pass: String(g && g.pass ? g.pass : ''), target: String(g && g.target ? g.target : ''),
      qs: qs, pt: p.type, pa: String(p.amount || 1), ptext: p.text || '', pimg: p.img || '', winners: String(g ? g.winners : 1), err: ''
    } });
  }
  setQf(i, k, v, oi) { const m = this.state.modal, qs = m.qs.map(q => ({ q: q.q, o: q.o.slice(), ans: q.ans })); if (k === 'o') qs[i].o[oi] = v; else qs[i][k] = v; this.setState({ modal: Object.assign({}, m, { qs: qs, err: '' }) }); }
  addQ() { const m = this.state.modal; if (m.qs.length >= 20) return this.setM('err', 'Up to 20 questions per game.'); this.setState({ modal: Object.assign({}, m, { qs: m.qs.concat([this.blankQ()]), err: '' }) }); }
  delQ(i) { const m = this.state.modal; if (m.qs.length <= 1) return; this.setState({ modal: Object.assign({}, m, { qs: m.qs.filter((_, j) => j !== i), err: '' }) }); }
  // Validates the sheet and returns the game data, or an error message
  gmData(m) {
    const k = m.gk, int = (x) => parseInt(x, 10);
    if (!m.title.trim()) return 'Give the game a title.';
    const d = { kind: k, variant: k === 'cards' ? m.variant : null, title: m.title.trim(), desc: (m.desc || '').trim(), img: (k === 'solitaire' || k === 'cards' || k === 'puzzle') ? (m.img || '') : '', size: null, secs: null, pass: null, target: null, qs: [] };
    if (k === 'trivia' || k === 'quiz') {
      const qs = [];
      for (let i = 0; i < m.qs.length; i++) {
        const q = m.qs[i], txt = q.q.trim(), filled = q.o.map((o, j) => ({ t: o.trim(), j: j })).filter(o => o.t);
        if (!txt && !filled.length) continue;
        if (!txt) return 'Question ' + (i + 1) + ' needs the question text.';
        if (filled.length < 2) return 'Question ' + (i + 1) + ' needs at least two answers.';
        const ai = filled.findIndex(o => o.j === q.ans);
        if (ai < 0) return 'Question ' + (i + 1) + ': tick the correct answer (it can’t be an empty one).';
        if (new Set(filled.map(o => o.t.toLowerCase())).size !== filled.length) return 'Question ' + (i + 1) + ' has the same answer twice.';
        qs.push({ q: txt, opts: filled.map(o => o.t), ans: ai });
      }
      if (!qs.length) return 'Add at least one question.';
      d.qs = qs;
      if (k === 'trivia') { const s = int(m.secs); if (!(s >= 5 && s <= 120)) return 'Seconds per question must be between 5 and 120.'; d.secs = s; }
      if (k === 'quiz') { const p = m.pass === '' ? qs.length : int(m.pass); if (!(p >= 1 && p <= qs.length)) return 'Correct answers needed must be between 1 and ' + qs.length + '.'; d.pass = p; }
    }
    if (k === 'puzzle') { if (!m.img) return 'Upload the image for the puzzle.'; const z = int(m.size); if (![3, 4, 5].includes(z)) return 'Choose a puzzle size.'; d.size = z; }
    if (k === 'cards' && m.variant === 'hilo') { const t = m.target === '' ? 7 : int(m.target); if (!(t >= 3 && t <= 20)) return 'The streak to win must be between 3 and 20.'; d.target = t; }
    if (k === 'cards' && m.variant === 'blackjack') { const t = m.target === '' ? 3 : int(m.target); if (!(t >= 1 && t <= 10)) return 'Hands to win must be between 1 and 10.'; d.target = t; }
    const pa = int(m.pa), w = int(m.winners);
    if (m.pt === 'custom') { if (!m.ptext.trim()) return 'Describe the prize, e.g. "Signed poster".'; }
    else if (!(pa >= 1 && pa <= 1000)) return 'The prize amount must be between 1 and 1000.';
    if (!(w >= 1 && w <= 1000)) return 'Allow at least 1 prize winner.';
    d.prize = m.pt === 'custom' ? { type: 'custom', amount: 1, text: m.ptext.trim(), img: m.pimg || '' } : { type: m.pt, amount: pa, text: '', img: '' };
    d.winners = w;
    return d;
  }
  saveGm() {
    const m = this.state.modal, me = this.state.me, d = this.gmData(m);
    if (typeof d === 'string') return this.setM('err', d);
    this.mut(db => {
      db.games = db.games || [];
      if (m.id) { const g = db.games.find(x => x.id === m.id); Object.assign(g, d); }
      else {
        const g = Object.assign({ id: this.uid('g'), aid: me, picked: [], claims: [], at: Date.now() }, d);
        db.games.push(g);
        db.users[me].followers.forEach(f => this.notify(db, f, db.users[me].name + ' posted a new game: "' + g.title + '". Play it to win ' + this.prizeInfo(g).label + '.', { type: 'artist', id: me, tab: 'games' }));
      }
    }, { modal: null });
  }

  // Playing. Fans' plays are recorded; the artist can try their own game without it counting.
  startGame(gid) {
    const s = this.state, g = (s.db.games || []).find(x => x.id === gid), me = s.db.users[s.me]; if (!g || !me) return;
    const practice = me.role !== 'fan';
    if (practice && g.aid !== me.id) return;
    clearInterval(this._gt); clearTimeout(this._gh);
    const v = g.kind === 'cards' ? g.variant : g.kind, st = this.newSt(g);
    this.setState({ play: { gid: gid, v: v, practice: practice, st: st, over: false, won: false, msg: '', starting: !practice } });
    try { window.scrollTo({ top: 0 }); } catch (e) {}
    const begin = () => { this.setPlay({ starting: false }); if (v === 'trivia') this.triviaNext(0); };
    if (practice) begin(); else Promise.resolve(this.gStart(g)).then(begin, (e) => { this.setPlay({ starting: false, over: true, msg: (e && e.message) || 'Couldn’t start the game. Try again.' }); });
  }
  newSt(g) {
    const G = this.G(), v = g.kind === 'cards' ? g.variant : g.kind;
    let st = null;
    if (v === 'trivia') st = { i: 0, picked: null, fb: '', right: 0, busy: true, left: g.secs || 15, qAt: 0 };
    if (v === 'quiz') st = { answers: (g.qs || []).map(() => null), done: false, score: null, busy: false };
    if (v === 'solitaire') st = G.klondike.deal();
    if (v === 'golf') st = G.golf.deal();
    if (v === 'memory') st = G.memory.deal();
    if (v === 'hilo') st = G.hilo.deal();
    if (v === 'blackjack') st = G.bj.deal();
    if (v === 'puzzle') st = G.puzzle.deal(g.size || 3);
    return st;
  }
  setPlay(patch, stPatch) { const p = this.state.play; if (!p) return; const n = Object.assign({}, p, patch || {}); if (stPatch) n.st = Object.assign({}, p.st, stPatch); this.setState({ play: n }); }
  setSt(st) { const p = this.state.play; if (p) this.setState({ play: Object.assign({}, p, { st: st }) }); }
  closeGame() { clearInterval(this._gt); clearTimeout(this._gh); this.setState({ play: null }); }
  playGame() { return this.state.play ? (this.state.db.games || []).find(x => x.id === this.state.play.gid) : null; }
  // Game over. Wins by fans are recorded (first win counts for the prize; later wins can improve the best score).
  endGame(won, score, msg) {
    const p = this.state.play, g = this.playGame(); if (!p || p.over) return;
    clearInterval(this._gt);
    this.setPlay({ over: true, won: won, score: score, msg: msg || '' });
    if (won && !p.practice) {
      const first = !(this.playOf(g.id, this.state.me) || {}).won;
      Promise.resolve(this.gWin(g, score)).then(() => { if (first) this.setPlay({ firstWin: true }); });
    }
  }
  // --- these four are replaced by Supabase calls in live mode (js/live.js) ---
  gStart(g) {
    const me = this.state.me;
    this.mut(db => { db.gplays = db.gplays || []; let r = db.gplays.find(x => x.gid === g.id && x.uid === me); if (!r) { r = { gid: g.id, uid: me, plays: 0, won: false, best: null, at: Date.now() }; db.gplays.push(r); } r.plays++; r.at = Date.now(); });
  }
  gWin(g, score) {
    const me = this.state.me, lb = this.lowerBetter(g);
    this.mut(db => {
      const r = db.gplays.find(x => x.gid === g.id && x.uid === me); if (!r) return false;
      const first = !r.won;
      r.best = r.best == null ? score : (lb ? Math.min(r.best, score) : Math.max(r.best, score));
      if (first) { r.won = true; r.wonAt = Date.now(); this.notify(db, g.aid, db.users[me].name + ' won your game "' + g.title + '". Pick prize winners on the Scoreboard.', { type: 'score', id: g.aid, cat: 'game', sel: g.id }); }
    });
  }
  gradeTrivia(g, i, choice) { const q = g.qs[i]; return Promise.resolve({ correct: !!q && q.ans === choice }); }
  gradeQuiz(g, answers) { const score = g.qs.reduce((a, q, i) => a + (q.ans === answers[i] ? 1 : 0), 0); return Promise.resolve({ score: score, won: score >= Math.min(g.pass || g.qs.length, g.qs.length) }); }

  // Trivia: a countdown per question; a wrong answer or running out of time ends the run
  triviaNext(i) {
    const g = this.playGame(); if (!g) return;
    this.setPlay(null, { i: i, picked: null, fb: '', busy: false, left: g.secs || 15, qAt: Date.now() });
    clearInterval(this._gt);
    this._gt = setInterval(() => {
      const p = this.state.play; if (!p || p.over || p.v !== 'trivia') { clearInterval(this._gt); return; }
      if (p.st.busy) return;
      const left = Math.max(0, (g.secs || 15) - (Date.now() - p.st.qAt) / 1000);
      if (left <= 0) { clearInterval(this._gt); this.triviaAnswer(-1); } else this.setPlay(null, { left: left });
    }, 200);
  }
  triviaAnswer(choice) {
    const p = this.state.play, g = this.playGame(); if (!p || p.over || p.st.busy) return;
    const i = p.st.i, n = g.qs.length;
    clearInterval(this._gt);
    this.setPlay(null, { busy: true, picked: choice });
    Promise.resolve(p.practice ? this.gradeTriviaLocal(g, i, choice) : this.gradeTrivia(g, i, choice)).then((r) => {
      if (!this.state.play || this.state.play.gid !== g.id) return;
      if (r.correct) {
        const right = this.state.play.st.right + 1;
        this.setPlay(null, { fb: 'right', right: right });
        this._gh = setTimeout(() => { if (right >= n) this.endGame(true, right, 'You answered all ' + n + ' correctly!'); else this.triviaNext(i + 1); }, 750);
      } else {
        this.setPlay(null, { fb: choice < 0 ? 'time' : 'wrong' });
        this._gh = setTimeout(() => this.endGame(false, this.state.play.st.right, (choice < 0 ? 'Time’s up! ' : 'Not quite! ') + 'You got ' + this.state.play.st.right + ' of ' + n + ' right.'), 900);
      }
    }, (e) => { this.endGame(false, p.st.right, (e && e.message) || 'Something went wrong. Try again.'); });
  }
  gradeTriviaLocal(g, i, choice) { const q = g.qs[i]; return { correct: !!q && q.ans === choice }; }
  quizPick(qi, oi) { const p = this.state.play; if (!p || p.st.done) return; const a = p.st.answers.slice(); a[qi] = oi; this.setPlay(null, { answers: a }); }
  quizSubmit() {
    const p = this.state.play, g = this.playGame(); if (!p || p.st.done || p.st.busy) return;
    if (p.st.answers.some(x => x == null)) return this.setPlay({ msg: 'Answer every question first.' });
    this.setPlay({ msg: '' }, { busy: true });
    const local = () => { const score = g.qs.reduce((a, q, i) => a + (q.ans === p.st.answers[i] ? 1 : 0), 0); return { score: score, won: score >= Math.min(g.pass || g.qs.length, g.qs.length) }; };
    Promise.resolve(p.practice ? local() : this.gradeQuiz(g, p.st.answers)).then((r) => {
      this.setPlay(null, { done: true, busy: false, score: r.score });
      this.endGame(r.won, r.score, 'You got ' + r.score + ' of ' + g.qs.length + ' right.' + (r.won ? '' : ' You need ' + Math.min(g.pass || g.qs.length, g.qs.length) + ' to win. Try again!'));
    }, (e) => { this.setPlay({ msg: (e && e.message) || 'Couldn’t check your answers. Try again.' }, { busy: false }); });
  }
  // Card and puzzle moves
  solTap(from, ci) {
    const p = this.state.play, G = this.G(); if (!p || p.over) return;
    if (from === 'stock') { const n = G.klondike.draw(p.st); if (n !== p.st) this.solSet(n); return; }
    const n = G.klondike.tap(p.st, from, ci);
    if (n) this.solSet(n); else this.setPlay({ hint: 'No move for that card', hintAt: Date.now() });
  }
  solSet(n) {
    const G = this.G();
    if (G.klondike.canAuto(n)) n = G.klondike.autoFinish(n);
    this.setPlay({ hint: '' }); this.setSt(n);
    if (G.klondike.won(n)) this.endGame(true, n.moves, 'Solved in ' + n.moves + ' moves!');
  }
  solUndo() { const p = this.state.play; if (!p || p.over) return; this.setSt(this.G().klondike.undoMove(p.st)); }
  golfTap(i) {
    const p = this.state.play, G = this.G(); if (!p || p.over) return;
    const n = i < 0 ? G.golf.draw(p.st) : G.golf.tap(p.st, i);
    if (!n) { this.setPlay({ hint: i < 0 ? 'The stock is empty' : 'That card must be one higher or lower than the pile' }); return; }
    this.setPlay({ hint: '' }); this.setSt(n);
    if (G.golf.won(n)) this.endGame(true, n.stock.length, 'Cleared with ' + this.plural(n.stock.length, 'card', 'cards') + ' left in the stock!');
    else if (G.golf.stuck(n)) this.endGame(false, null, 'Out of moves with ' + this.plural(G.golf.left(n), 'card', 'cards') + ' left. Try again!');
  }
  memFlip(i) {
    const p = this.state.play, G = this.G(); if (!p || p.over) return;
    const n = G.memory.flip(p.st, i); if (!n) return;
    this.setSt(n);
    if (G.memory.won(n)) this.endGame(true, n.moves, 'All pairs found in ' + n.moves + ' moves!');
    else if (n.busy) { clearTimeout(this._gh); this._gh = setTimeout(() => { const q = this.state.play; if (q && q.st && q.st.busy) this.setSt(G.memory.hide(q.st)); }, 800); }
  }
  hiloGuess(dir) {
    const p = this.state.play, g = this.playGame(), G = this.G(); if (!p || p.over) return;
    const n = G.hilo.guess(p.st, dir); this.setSt(n);
    if (n.streak >= (g.target || 7)) this.endGame(true, n.streak, n.streak + ' in a row. You did it!');
    else if (n.over) this.endGame(false, n.best, 'Wrong guess! Your streak ended at ' + (p.st.streak) + '.');
  }
  bjAct(a) {
    const p = this.state.play, g = this.playGame(), G = this.G(); if (!p || p.over) return;
    const t = g.target || 3;
    let n = a === 'hit' ? G.bj.hit(p.st) : a === 'stand' ? G.bj.stand(p.st) : G.bj.deal(p.st);
    this.setSt(n);
    if (n.phase === 'done' && n.wins >= t) this.endGame(true, n.losses, 'You won ' + n.wins + ' hands to ' + n.losses + '!');
    else if (n.phase === 'done' && n.losses >= t) this.endGame(false, null, 'The dealer won ' + n.losses + ' hands to ' + n.wins + '. Try again!');
  }
  puzTap(i) {
    const p = this.state.play, G = this.G(); if (!p || p.over) return;
    const n = G.puzzle.tap(p.st, i); this.setSt(n);
    if (G.puzzle.won(n)) this.endGame(true, n.moves, 'Picture complete in ' + n.moves + ' moves!');
  }

  // Prizes: the artist picks winners from fans who won the game, up to the number of prizes
  pickGameWinner(gid, uid) {
    this.mut(db => {
      const g = db.games.find(x => x.id === gid); if (!g || g.picked.includes(uid) || g.picked.length >= g.winners) return false;
      const r = db.gplays.find(x => x.gid === gid && x.uid === uid); if (!r || !r.won) return false;
      g.picked.push(uid);
      this.notify(db, uid, 'YOU WON the prize for "' + g.title + '": ' + this.prizeInfo(g).label + '! Claim it on the Games tab.', { type: 'artist', id: g.aid, tab: 'games' });
    });
  }
  unpickGameWinner(gid, uid) {
    this.mut(db => {
      const g = db.games.find(x => x.id === gid); if (!g || !g.picked.includes(uid) || g.claims.includes(uid)) return false;
      g.picked = g.picked.filter(x => x !== uid);
      this.notify(db, uid, 'The prize winners for "' + g.title + '" were changed by the artist.', null);
    });
  }
  gamePop(g) {
    const p = g.prize, info = this.prizeInfo(g);
    if (p.type === 'custom') return this.mkPop('custom', 'Prize!', 'You won!', info.label + ' from ' + this.user(g.aid).name + '. They’ll contact you about getting it to you.', p.img);
    if (p.type === 'tickets') return this.mkPop('ticket', '+' + p.amount, 'You won!', info.label + ' for winning "' + g.title + '"');
    return this.mkPop(p.type, '+' + p.amount, 'You won!', info.label + ' for winning "' + g.title + '"');
  }
  claimGamePrize(gid) {
    const s = this.state, g = (s.db.games || []).find(x => x.id === gid); if (!g || !g.picked.includes(s.me) || g.claims.includes(s.me)) return;
    this.mut(db => {
      const gg = db.games.find(x => x.id === gid), u = db.users[s.me], p = gg.prize;
      gg.claims.push(s.me);
      if (p.type === 'tickets') u.tickets += p.amount; else if (p.type !== 'custom') u.coins[p.type] += p.amount;
      this.notify(db, gg.aid, u.name + ' claimed the prize for "' + gg.title + '"' + (p.type === 'custom' ? ' (' + p.text + '). Contact them at ' + u.email + ' to arrange it.' : '.'), { type: 'profile', id: s.me });
    }, { pop: this.gamePop(g) });
  }

  // Games tab item
  gameItem(g, ctx) {
    const s = this.state, db = s.db, me = ctx.me, info = this.prizeInfo(g);
    const mine = me ? this.playOf(g.id, me.id) : null, won = !!(mine && mine.won);
    const picked = !!me && g.picked.includes(me.id), claimed = !!me && g.claims.includes(me.id);
    const plays = (db.gplays || []).filter(x => x.gid === g.id), winners = plays.filter(x => x.won).length;
    const v = g.kind === 'cards' ? g.variant : g.kind;
    const cover = g.kind === 'puzzle' && g.img ? 'background-image: url("' + g.img + '")' : (g.img ? 'background-image: url("' + g.img + '")' : '');
    let status = '', stCls = 'st';
    if (ctx.isFan) { if (picked && !claimed) { status = 'Prize won!'; stCls = 'st win'; } else if (claimed) { status = 'Prize claimed'; stCls = 'st done'; } else if (won) { status = 'Won'; stCls = 'st done'; } else if (mine) status = this.plural(mine.plays, 'play', 'plays'); }
    else if (ctx.isOwner) status = this.plural(winners, 'winner', 'winners');
    return {
      title: g.title, desc: g.desc, hasDesc: !!g.desc, label: this.gameLabel(g), how: this.gameHow(g),
      cover: cover, hasCover: !!cover, coverCls: 'gcover k-' + v + (cover ? ' img' : ''), icon: v,
      isTrivia: v === 'trivia', isQuiz: v === 'quiz', isCardsIcon: ['solitaire', 'memory', 'hilo', 'blackjack', 'golf'].includes(v), isPuzzle: v === 'puzzle',
      prize: info, prizeText: info.label, winnersText: this.plural(g.winners, 'prize', 'prizes') + ' to give',
      hasStatus: !!status, status: status, stCls: stCls,
      owner: ctx.isOwner, fan: ctx.isFan, visitor: ctx.isVisitor,
      play: () => this.startGame(g.id), playLabel: won ? 'Play again' : (mine ? 'Play again' : 'Play'),
      bestText: mine && mine.best != null ? 'Your best: ' + this.scoreText(g, mine.best) : '',
      hasBest: !!(mine && mine.best != null), wonNote: ctx.isFan && won && !picked && !claimed,
      wonNoteText: g.picked.length >= g.winners ? 'You won this game. All prizes have been given out.' : 'You won! ' + this.user(g.aid).name + ' picks the prize winners from everyone who won.',
      canClaim: ctx.isFan && picked && !claimed, claim: () => this.claimGamePrize(g.id), claimedNote: ctx.isFan && claimed,
      claimedText: g.prize.type === 'custom' ? 'You claimed ' + info.label + '. ' + this.user(g.aid).name + ' will contact you at ' + (me ? me.email : '') + '.' : 'You claimed ' + info.label + '.',
      claimLabel: 'Claim ' + info.label,
      edit: () => this.openGmModal(g), del: () => this.confirm('Delete this game?', '"' + g.title + '" and all of its plays and results will be removed. Prizes already claimed stay with the fans.', 'delGm', g.id),
      winnersGo: () => this.setState({ tab: 'scoreboard', sb: { cat: 'game', sel: g.id } }), tryIt: () => this.startGame(g.id),
      playsText: this.plural(plays.reduce((a, x) => a + x.plays, 0), 'play', 'plays') + ' · ' + this.plural(winners, 'fan won', 'fans won') + ' · ' + g.picked.length + ' of ' + g.winners + ' prizes given'
    };
  }

  // Player screen view
  playView(me) {
    const p = this.state.play, g = this.playGame(); if (!p || !g) return { show: false };
    const G = this.G(), st = p.st, info = this.prizeInfo(g), v = p.v;
    const pl = { show: true, title: g.title, label: this.gameLabel(g), how: this.gameHow(g), prize: info, practice: p.practice, starting: !!p.starting,
      close: () => this.closeGame(), again: () => this.startGame(g.id), over: p.over, won: p.over && p.won, lost: p.over && !p.won, msg: p.msg || '', hasMsg: !!p.msg && !p.over,
      hint: p.hint || '', hasHint: !!p.hint,
      firstWin: !!p.firstWin, winNote: p.practice ? 'Preview only: your results aren’t recorded.' : (p.firstWin ? 'Your win is recorded. ' + this.user(g.aid).name + ' picks prize winners from everyone who wins, so keep an eye on your notifications.' : 'Your best result is saved on the Scoreboard.'),
      isTrivia: v === 'trivia', isQuiz: v === 'quiz', isSol: v === 'solitaire', isGolf: v === 'golf', isMem: v === 'memory', isHilo: v === 'hilo', isBj: v === 'blackjack', isPuz: v === 'puzzle', stat: '' };
    if (p.starting) return pl;
    if (v === 'trivia') {
      const q = g.qs[st.i] || g.qs[0], n = g.qs.length, secs = g.secs || 15;
      Object.assign(pl, { qn: 'Question ' + (st.i + 1) + ' of ' + n, q: q.q, left: Math.ceil(st.left), barStyle: 'width: ' + Math.max(0, Math.min(100, st.left / secs * 100)) + '%', barCls: st.left < 4 ? 'tbar low' : 'tbar',
        stat: st.right + ' right', fbRight: st.fb === 'right', fbWrong: st.fb === 'wrong', fbTime: st.fb === 'time',
        opts: q.opts.map((o, i) => ({ label: o, letter: 'ABCD'[i], cls: 'opt' + (st.picked === i ? (st.fb === 'right' ? ' right' : st.fb === 'wrong' ? ' wrong' : ' on') : ''), dis: st.busy || p.over, pick: () => this.triviaAnswer(i) })) });
    }
    if (v === 'quiz') {
      const ans = st.answers, done = ans.filter(x => x != null).length;
      Object.assign(pl, { stat: done + ' of ' + g.qs.length + ' answered', qDone: st.done, notDone: !st.done, busy: !!st.busy, submit: () => this.quizSubmit(),
        qs: g.qs.map((q, qi) => ({ n: qi + 1, q: q.q, opts: q.opts.map((o, oi) => ({ label: o, letter: 'ABCD'[oi], cls: ans[qi] === oi ? 'opt on' : 'opt', pick: () => this.quizPick(qi, oi), dis: st.done, on: ans[qi] === oi })) })) });
    }
    if (v === 'solitaire') {
      const top = (arr) => arr.length ? arr[arr.length - 1] : null;
      Object.assign(pl, { stat: st.moves + ' moves', canUndo: st.undo.length > 0 && !p.over, noUndo: !(st.undo.length > 0 && !p.over), undo: () => this.solUndo(),
        stockEmpty: !st.stock.length, stockCount: st.stock.length, stockCard: this.cardV({ up: false }, g, { tap: () => this.solTap('stock') }), stockTap: () => this.solTap('stock'),
        waste: top(st.waste) ? this.cardV(top(st.waste), g, { tap: () => this.solTap('waste', st.waste.length - 1) }) : null, hasWaste: st.waste.length > 0,
        found: st.found.map((f, i) => ({ has: f.length > 0, empty: !f.length, sym: ['♠', '♥', '♦', '♣'][i], card: f.length ? this.cardV(top(f), g, { tap: () => this.solTap('f' + i, f.length - 1) }) : {} })),
        cols: st.tab.map((col, i) => {
          let off = 0;
          const cards = col.map((c, ci) => { const y = off; off += c.up ? 1 : 0.42; return this.cardV(c, g, { tap: () => this.solTap('t' + i, ci), style2: 'top: calc(var(--cw) * ' + (y * 0.42).toFixed(3) + ')' }); });
          cards.forEach(c => { c.style = [c.style, c.style2].filter(Boolean).join('; '); });
          return { cards: cards, empty: !col.length, style: 'height: calc(var(--ch) + var(--cw) * ' + (Math.max(0, off - (col.length && col[col.length - 1].up ? 1 : 0.42)) * 0.42).toFixed(3) + ')' };
        }) });
    }
    if (v === 'golf') {
      const top = st.found[st.found.length - 1];
      Object.assign(pl, { stat: G.golf.left(st) + ' cards to clear · ' + st.stock.length + ' in stock', gStock: st.stock.length, gStockEmpty: !st.stock.length, gDraw: () => this.golfTap(-1), gStockCard: this.cardV({ up: false }, g),
        gTop: this.cardV(top, g),
        gCols: st.tab.map((col, i) => ({ empty: !col.length, cards: col.map((c, ci) => { const cv = this.cardV(c, g, { tap: () => this.golfTap(i), last: ci === col.length - 1 }); cv.style = 'top: calc(var(--cw) * ' + (ci * 0.42).toFixed(2) + ')'; cv.cls += ci === col.length - 1 ? ' live' : ' dim'; return cv; }), style: 'height: calc(var(--ch) + var(--cw) * ' + (Math.max(0, col.length - 1) * 0.42).toFixed(2) + ')' })) });
    }
    if (v === 'memory') Object.assign(pl, { stat: st.moves + ' moves · ' + G.memory.pairs(st) + ' of 8 pairs', mem: st.cards.map((c, i) => { const cv = this.cardV(c, g, { tap: () => this.memFlip(i) }); if (c.done) cv.cls += ' done'; return cv; }) });
    if (v === 'hilo') Object.assign(pl, { stat: 'Streak ' + st.streak + ' of ' + (g.target || 7), hCur: this.cardV(st.cur, g), hasPrev: !!st.prev, hPrev: st.prev ? this.cardV(st.prev, g) : {},
      hLast: st.last === 'right' ? 'Right!' : st.last === 'same' ? 'Same rank: no change' : st.last === 'wrong' ? 'Wrong!' : 'Will the next card be higher or lower?', hLastCls: 'hlast ' + (st.last || ''),
      hi: () => this.hiloGuess('hi'), lo: () => this.hiloGuess('lo'), hDis: p.over, dots: Array.from({ length: g.target || 7 }, (_, i) => ({ cls: i < st.streak ? 'sdot on' : 'sdot' })) });
    if (v === 'blackjack') {
      const t = g.target || 3, dTot = st.phase === 'done' ? G.bj.total(st.dealer) : G.bj.total([st.dealer[0]]);
      Object.assign(pl, { stat: 'You ' + st.wins + ' · Dealer ' + st.losses + ' · first to ' + t, bPlayer: st.player.map(c => this.cardV(c, g)), bDealer: st.dealer.map(c => this.cardV(c, g)),
        bPT: G.bj.total(st.player), bDT: st.phase === 'done' ? dTot : dTot + ' + ?', bPlay: st.phase === 'play' && !p.over, bDone: st.phase === 'done' && !p.over, bMsg: st.msg || '', hasBMsg: st.phase === 'done' && !!st.msg,
        hit: () => this.bjAct('hit'), stand: () => this.bjAct('stand'), next: () => this.bjAct('deal') });
    }
    if (v === 'puzzle') {
      const z = st.size;
      Object.assign(pl, { stat: st.moves + ' moves · ' + G.puzzle.placed(st) + ' of ' + z * z + ' in place', puzStyle: 'grid-template-columns: repeat(' + z + ', 1fr)', puzImg: g.img,
        tiles: st.order.map((t, i) => { const x = t % z, y = Math.floor(t / z); return { cls: 'ptile' + (st.sel === i ? ' sel' : '') + (t === i ? ' ok' : ''), style: 'background-image: url("' + g.img + '"); background-size: ' + z * 100 + '% ' + z * 100 + '%; background-position: ' + (z > 1 ? x / (z - 1) * 100 : 0) + '% ' + (z > 1 ? y / (z - 1) * 100 : 0) + '%', tap: () => this.puzTap(i), label: 'Tile ' + (i + 1) }; }) });
    }
    return pl;
  }

  renderVals() {
    const want = this.props.start || 'login';
    if (want !== this._start) { this._start = want; setTimeout(() => this.setState(this.applyStart(want, this.initState())), 0); }
    const s = this.state, db = s.db, me = db.users[s.me] || null;
    const sc = s.screen;
    const A = sc === 'artist' ? db.users[s.viewing] : null;
    const scr = { terms: sc === 'terms', search: sc === 'search', auth: sc === 'auth' || (!me && sc !== 'auth'), setup: sc === 'setup' && !!s.setup, genre: sc === 'pickGenre', artists: sc === 'pickArtist', artist: !!A, profile: sc === 'profile' && !!db.users[s.profileId], chat: sc === 'chat' };
    if (!me) { scr.terms = scr.search = scr.setup = scr.genre = scr.artists = scr.artist = scr.profile = scr.chat = false; }
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
    const hdr = { isFan: !!me && me.role === 'fan', isArtist: !!me && me.role === 'artist', av: this.av(me),notif: unreadNotif > 9 ? '9+' : unreadNotif, hasNotif: unreadNotif > 0, msg: unreadMsg, hasMsg: unreadMsg > 0 };

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
    // My Artists: artists this fan follows or has taken part with, most recent activity first
    const mine = me && me.role === 'fan' ? this.myArtists(me) : [];
    gp.mine = mine.map(x => { const u = db.users[x.id]; return { name: u.name, av: this.av(u), note: [x.follows ? 'Following' : '', x.took ? 'Took part' : ''].filter(Boolean).join(' · '), go: () => this.openArtist(u.id) }; });
    gp.hasMine = !gp.hasQ && gp.mine.length > 0;
    const ex = {
      back: () => this.go('pickGenre', { gsel: s.genre }),
      title: this.genreName(s.genre) + ' artists', genre: this.genreName(s.genre), has: inGenre.length > 0, none: inGenre.length === 0,
      chips: this.genres().map(g => ({ label: g[1], on: s.genre === g[0], cls: s.genre === g[0] ? 'chip on' : 'chip', pick: () => this.pickGenre(g[0]) })),
      artists: inGenre.map(u => ({ name: u.name, av: this.av(u), bio: u.bio || 'No bio yet.', sub: [u.location, this.plural(u.followers.length, 'follower', 'followers')].filter(Boolean).join(' · '), open: () => this.openArtist(u.id) }))
    };

    // agreement
    const tm = {
      roleLabel: me && me.role === 'artist' ? 'Creator / Artist agreement' : 'Fan agreement', version: this.termsVersion(),
      sections: this.termsSections(me ? me.role : 'fan'), ok: !!s.termsOk, notOk: !s.termsOk, err: s.termsErr || '', hasErr: !!s.termsErr,
      toggle: (e) => this.setState({ termsOk: !!e.target.checked, termsErr: '' }), accept: () => this.acceptTerms(), decline: () => this.declineTerms()
    };

    // search (artists): find artists and fans
    const sqv = (s.sq || '').trim().toLowerCase();
    const personRow = (u) => ({ name: u.name, av: this.av(u), role: u.role === 'artist' ? 'ARTIST' : 'FAN',
      sub: u.role === 'artist' ? this.gNames(u) + (u.location ? ' · ' + u.location : '') : (u.location || 'Fan') + ' · ' + this.plural(u.followers.length, 'follower', 'followers'),
      go: () => (u.role === 'artist' ? this.openArtist(u.id) : this.openProfile(u.id)) });
    const others = Object.values(db.users).filter(u => !me || u.id !== me.id);
    const found = sqv ? others.filter(u => u.name.toLowerCase().includes(sqv)).sort((x, y) => (x.role === y.role ? x.name.localeCompare(y.name) : (x.role === 'artist' ? -1 : 1))).slice(0, 30) : [];
    const srch = {
      q: s.sq || '', setQ: val(v => this.setState({ sq: v })), hasQ: !!sqv, noQ: !sqv,
      results: found.map(personRow), noResults: !!sqv && found.length === 0,
      suggested: others.filter(u => u.role === 'artist').sort((x, y) => y.followers.length - x.followers.length).slice(0, 8).map(personRow)
    };

    // artist page
    let ap = {}, tabs = [], pn = {}, blocks = [], sb = {}, gms = [];
    if (A && me) {
      const following = me.following.includes(A.id);
      // wins waiting for this fan on this artist
      const wins = [];
      if (isFan) {
        db.challenges.filter(c => c.aid === A.id && c.winner === me.id && !c.claimed).forEach(c => wins.push({ t: c.title, tab: c.ev ? 'showday' : 'challenges', id: c.id }));
        db.lotteries.filter(l => l.aid === A.id && l.picked.includes(me.id) && !l.claims.includes(me.id)).forEach(l => wins.push({ t: l.title, tab: 'lottery', id: l.id }));
        (db.games || []).filter(g => g.aid === A.id && g.picked.includes(me.id) && !g.claims.includes(me.id)).forEach(g => wins.push({ t: g.title, tab: 'games', id: g.id }));
      }
      ap = {
        hasLv: me.role === 'fan', lv: me.role === 'fan' ? this.levelInfo(me) : {},
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
      tabs = [['challenges', 'Challenges'], ['showday', 'Showday'], ['lottery', 'Lottery'], ['community', 'Community', 'Lounge'], ['games', 'Games'], ['scoreboard', 'Scoreboard', 'Scores']].map(t => ({ label: t[1], short: t[2] || t[1], ['is_' + t[0]]: true, on: s.tab === t[0], cls: s.tab === t[0] ? 'tab on' : 'tab', pick: () => this.pickTab(t[0]) }));
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
      if (T === 'games') gms = (db.games || []).filter(g => g.aid === A.id).sort((x, y) => y.at - x.at).map(g => this.gameItem(g, ctx));
      if (T === 'lottery') db.lotteries.filter(l => l.aid === A.id).sort((x, y) => y.at - x.at).forEach(l => blocks.push(this.ltItem(l, ctx)));
      const P = {
        challenges: { heading: isOwner ? 'Your Challenges' : 'Challenges', createLabel: 'Create Challenge', create: () => this.openChModal(null, null), emptyTitle: 'No challenges yet', emptyText: isOwner ? 'Create your first challenge. Fans can pick from multiple-choice answers (text or images), type their own answer, send an image or artwork, or record a video, and earn the coins you set.' : A.name + ' hasn’t posted any challenges yet. Check back soon.' },
        showday: { heading: isOwner ? 'Your Showday Events' : 'Showday Events', createLabel: 'Create Event', create: () => this.openEvModal(null), emptyTitle: 'No Showday events yet', emptyText: isOwner ? 'Create an event for show day, like a premiere or a concert, then add challenges fans can do on the day.' : 'No Showday events yet. When ' + A.name + ' announces one, its challenges show up here.' },
        games: { heading: isOwner ? 'Your Games' : 'Games', createLabel: 'Create Game', create: () => this.openGmModal(null), emptyTitle: 'No games yet', emptyText: isOwner ? 'Create a game for your fans: Trivia, a Quiz, Solitaire, a classic card game or a picture Puzzle. Add your own questions, card design or image, and set the prize.' : A.name + ' hasn’t posted any games yet. Check back soon.' },
        lottery: { heading: isOwner ? 'Your Lotteries' : 'Lottery', createLabel: 'Create Lottery', create: () => this.openLtModal(null), emptyTitle: 'No lotteries yet', emptyText: isOwner ? 'Offer an experience, like dinner with the cast, and set how many tickets each entry costs and how many winners there are.' : 'No lotteries open right now.' }
      }[T] || {};
      const hint = T === 'lottery' && isFan ? 'You have ' + this.plural(me.tickets, 'ticket', 'tickets') + '. Enter as many times as your tickets allow. More entries, better odds.' : (T === 'challenges' && isFan ? 'Tap a challenge to see the details and take part. Every submission earns its coin reward.' : (T === 'showday' && isFan ? 'Challenges to do on the day of the show. You can see what other fans submitted too.' : (T === 'games' && isFan ? 'Play as often as you like. Win a game and ' + A.name + ' can pick you for its prize.' : '')));
      pn = Object.assign({ isList: ['challenges', 'showday', 'lottery'].includes(T), isScore: T === 'scoreboard', isGames: T === 'games', canCreate: isOwner, empty: T === 'games' ? gms.length === 0 : blocks.length === 0, hint: hint, hasHint: !!hint }, P);

      // scoreboard
      if (T === 'scoreboard') {
        const cat = s.sb.cat;
        const list = cat === 'lottery' ? db.lotteries.filter(l => l.aid === A.id) : cat === 'game' ? (db.games || []).filter(g => g.aid === A.id).sort((x, y) => y.at - x.at) : chs.filter(c => cat === 'showday' ? !!c.ev : !c.ev);
        const sel = list.find(x => x.id === s.sb.sel) || list[0] || null;
        sb = {
          cat: cat, setCat: val(v => this.setState({ sb: { cat: v, sel: '' } })), empty: list.length === 0,
          emptyText: cat === 'game' ? 'No games have been created yet.' : cat === 'lottery' ? 'No lotteries have been created yet.' : (cat === 'showday' ? 'No Showday challenges yet.' : 'No challenges yet.'),
          items: list.map(x => { const n = cat === 'game' ? (db.gplays || []).filter(y => y.gid === x.id && y.won).length : cat === 'lottery' ? db.entries.filter(e => e.lid === x.id).reduce((p, q) => p + q.n, 0) : db.subs.filter(y => y.cid === x.id).length; const on = sel && sel.id === x.id; return { title: x.title, meta: cat === 'game' ? this.plural(n, 'winner', 'winners') : this.plural(n, cat === 'lottery' ? 'entry' : 'submission', cat === 'lottery' ? 'entries' : 'submissions'), on: !!on, cls: on ? 'sbi on' : 'sbi', pick: () => this.setState({ sb: { cat: cat, sel: x.id } }) }; }),
          hasSel: !!sel, rows: [], canDraw: false
        };
        if (sel && cat === 'game') {
          const g = sel, info = this.prizeInfo(g), lb = this.lowerBetter(g);
          const plays = (db.gplays || []).filter(x => x.gid === g.id && db.users[x.uid]).sort((x, y) => (y.won - x.won) || (x.best == null) - (y.best == null) || (lb ? x.best - y.best : y.best - x.best) || (x.wonAt || 0) - (y.wonAt || 0));
          const full = g.picked.length >= g.winners, names = g.picked.map(id => this.user(id).name).join(', ');
          Object.assign(sb, {
            title: g.title, meta: this.gameLabel(g) + ' · Prize: ' + info.label + ' · ' + this.plural(g.winners, 'prize', 'prizes') + ' · ' + this.plural(plays.filter(x => x.won).length, 'fan won', 'fans won'),
            status: g.picked.length ? g.picked.length + ' of ' + g.winners + ' prizes given: ' + names + '.' + (isOwner && !full ? ' You can pick ' + (g.winners - g.picked.length) + ' more.' : '') : (isOwner ? 'No prize winners yet. Pick from the fans who won the game below (up to ' + g.winners + ').' : 'No prize winners picked yet.'),
            statusCls: g.picked.length ? 'note ok' : 'note', noRows: plays.length === 0, noRowsText: 'Nobody has played yet.',
            rows: plays.map(x => { const u = this.user(x.uid), isW = g.picked.includes(x.uid), cl = g.claims.includes(x.uid);
              return { name: u.name, av: this.av(u), go: () => this.openProfile(u.id), when: this.ago(x.wonAt || x.at), isGame: true,
                gameText: (x.won ? 'Won' + (x.best != null ? ' · best ' + this.scoreText(g, x.best) : '') : 'Not won yet') + ' · ' + this.plural(x.plays, 'play', 'plays'),
                isWinner: isW, cls: isW ? 'sub win' : 'sub', winLabel: cl ? 'Prize winner · claimed' : 'Prize winner',
                canPick: isOwner && x.won && !isW && !full, pickLabel: 'Give prize', pick: () => this.pickGameWinner(g.id, x.uid),
                canUnpick: isOwner && isW && !cl, unpick: () => this.unpickGameWinner(g.id, x.uid) }; })
          });
        }
        if (sel && cat !== 'lottery' && cat !== 'game') {
          const c = sel, subs = db.subs.filter(x => x.cid === c.id).sort((x, y) => y.at - x.at), w = c.winner ? this.user(c.winner) : null;
          const ev = c.ev ? db.events.find(e => e.id === c.ev) : null;
          Object.assign(sb, {
            title: c.title, meta: (ev ? ev.title + ' · ' : '') + this.typeName(c.type) + ' · +' + c.rw + ' ' + c.rt + ' per entry · ' + this.plural(subs.length, 'submission', 'submissions'),
            status: w ? (c.claimed ? 'Winner: ' + w.name + ' (prize claimed, can no longer be changed)' : 'Winner: ' + w.name + ' (not claimed yet, you can still change it)') : (isOwner ? 'No winner yet. Pick one from the submissions below. They get 1 green coin.' : 'No winner picked yet.'),
            statusCls: w ? 'note ok' : 'note', noRows: subs.length === 0, noRowsText: 'No submissions yet.',
            rows: subs.map(x => { const v = Object.assign(this.subView(x, c, me), this.voteView(x, c, me)); const isW = c.winner === x.uid; return Object.assign(v, { isEntry: false, cls: isW ? 'sub win' : 'sub', winLabel: c.claimed ? 'Winner · claimed' : 'Winner', canPick: isOwner && !c.claimed && !isW, pickLabel: c.winner ? 'Make winner instead' : 'Select as the winner', pick: () => this.pickWinner(c.id, x.uid), canUnpick: isOwner && isW && !c.claimed, unpick: () => this.unpickWinner(c.id) }); })
          });
          // Image and video entries: most popular first, so the artist sees what fans like
          if (this.hasMedia(c)) sb.rows.sort((p, q) => q.score - p.score);
        }
        if (sel && cat === 'lottery') {
          const l = sel, ents = db.entries.filter(e => e.lid === l.id).sort((x, y) => y.n - x.n), total = ents.reduce((p, q) => p + q.n, 0);
          const names = l.picked.map(id => this.user(id).name).join(', ');
          Object.assign(sb, {
            title: l.title, meta: this.plural(l.cost, 'ticket', 'tickets') + ' per entry · ' + this.plural(l.winners, 'winner', 'winners') + ' · ' + this.plural(total, 'entry', 'entries') + ' from ' + this.plural(ents.length, 'fan', 'fans'),
            status: l.drawn ? (l.picked.length ? 'Drawn ' + this.ago(l.drawnAt || Date.now()) + '. Winner' + (l.picked.length > 1 ? 's' : '') + ': ' + names + '. Management contacts winners by email.' : 'Drawn, but there were no entries.') : (isOwner ? 'Not drawn yet. When you draw, winners are picked at random. Each entry is one chance.' : 'Not drawn yet.'),
            statusCls: l.drawn ? 'note ok' : 'note', canDraw: isOwner && ents.length > 0 && l.claims.length === 0, drawLabel: l.drawn ? 'Redraw lottery' : 'Draw lottery', draw: () => this.draw(l.id),
            noRows: ents.length === 0, noRowsText: 'No entries yet.',
            rows: ents.map(e => { const u = this.user(e.uid), isW = l.picked.includes(e.uid); return { name: u.name, av: this.av(u), go: () => this.openProfile(u.id), when: this.ago(e.at), isMC: false, isText: false, hasAnsImg: false, isEntry: true, entryText: this.plural(e.n, 'entry', 'entries') + ' · ' + this.plural(e.n * l.cost, 'ticket', 'tickets') + ' · ' + (total ? Math.round(e.n / total * 100) : 0) + '% chance', hasImg: false, hasVid: false, noMedia: false, file: '', isWinner: isW, cls: isW ? 'sub win' : 'sub', winLabel: l.claims.includes(e.uid) ? 'Winner · claimed' : 'Winner', canPick: false, canUnpick: false }; })
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
      (db.gplays || []).filter(x => x.uid === P.id && x.won).forEach(x => { const g = (db.games || []).find(y => y.id === x.gid); if (g) acts.push({ at: x.wonAt || x.at, text: 'Won the game "' + g.title + '"', sub: this.user(g.aid).name + ' · ' + this.gameLabel(g), go: () => this.openArtist(g.aid, 'games') }); });
      (db.games || []).filter(g => g.aid === P.id).forEach(g => acts.push({ at: g.at, text: 'Posted a game: "' + g.title + '"', sub: this.gameLabel(g), go: () => this.openArtist(P.id, 'games') }));
      db.challenges.filter(c => c.aid === P.id).forEach(c => acts.push({ at: c.at, text: 'Posted ' + (c.ev ? 'a Showday challenge' : 'a challenge') + ': "' + c.title + '"', sub: c.ev ? 'Showday' : 'Challenges', go: () => this.openArtist(P.id, c.ev ? 'showday' : 'challenges', c.id) }));
      db.lotteries.filter(l => l.aid === P.id).forEach(l => acts.push({ at: l.at, text: 'Opened a lottery: "' + l.title + '"', sub: 'Lottery', go: () => this.openArtist(P.id, 'lottery', l.id) }));
      db.entries.filter(e => e.uid === P.id).forEach(e => { const l = db.lotteries.find(y => y.id === e.lid); if (!l) return; acts.push({ at: e.at, text: 'Entered the lottery "' + l.title + '"', sub: this.user(l.aid).name + ' · ' + this.plural(e.n, 'entry', 'entries'), go: () => this.openArtist(l.aid, 'lottery', l.id) }); });
      db.forums.forEach(t => { if (t.uid === P.id) acts.push({ at: t.at, text: 'Started a topic: "' + t.title + '"', sub: 'Community', go: () => this.go('community', { forumOpen: t.id }) }); t.replies.forEach(r => { if (r.uid === P.id) acts.push({ at: r.at, text: 'Replied to "' + t.title + '"', sub: 'Community', go: () => this.go('community', { forumOpen: t.id }) }); }); });
      acts.sort((x, y) => y.at - x.at);
      pf = {
        hasLv: P.role === 'fan', lv: P.role === 'fan' ? this.levelInfo(P) : {},
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
        d: M, isGm: k === 'gm', isCh: k === 'ch', isEv: k === 'ev', isLt: k === 'lt', isConfirm: k === 'confirm', isPeople: k === 'people', isNotifs: k === 'notifs', isMe: k === 'me', isEdit: k === 'edit', isDelete: k === 'delete', delStage1: k === 'delete' && (M.stage || 1) === 1, delStage2: k === 'delete' && M.stage === 2,
        hasErr: !!M.err, meArtist: me.role === 'artist', meName: me.name, themeHint: me.role === 'artist' ? ', page theme' : '',
        hasActions: ['ch', 'gm', 'ev', 'lt', 'confirm', 'edit', 'delete'].includes(k), cancelLabel: k === 'confirm' ? 'Keep it' : 'Cancel', back: () => this.setState({ modal: k === 'delete' ? M.backTo : null }),
        okCls: (k === 'confirm' || k === 'delete') ? 'btn danger' : 'btn grad', okDisabled: k === 'delete' && M.stage === 2 && (M.typed || '').trim() !== 'DELETE'
      });
      if (k === 'ch') Object.assign(md, {
        title: M.id ? 'Edit challenge' : (M.ev ? 'Add Showday challenge' : 'Create challenge'), okLabel: M.id ? 'Save changes' : 'Create challenge', ok: () => this.saveCh(), isMCType: M.type === 'mc', isTextType: M.type === 'text',
        isCreate: M.type !== 'mc',
        groups: [['choose', 'CHOOSE', 'Fans pick an answer'], ['create', 'CREATE', 'Fans make something']].map(g => { const on = (g[0] === 'choose') === (M.type === 'mc'); return { label: g[1], sub: g[2], on: on, cls: on ? 'on' : '', pick: () => { if (on) return; if (g[0] === 'choose') this.setState({ modal: Object.assign({}, this.state.modal, { type: 'mc', lastCreate: M.type, err: '' }) }); else this.setM('type', M.lastCreate || 'image'); } }; }),
        types: [['text', 'Text'], ['image', 'Image'], ['video', 'Video']].map(t => ({ label: t[1], on: M.type === t[0], cls: M.type === t[0] ? 'on' : '', pick: () => this.setM('type', t[0]) })),
        hasThumb: !!M.thumb, noThumb: !M.thumb, thumbLabel: M.thumb ? 'Change thumbnail' : 'Upload thumbnail', onThumb: (e) => this.mFile('thumb', e), clearThumb: () => this.setM('thumb', ''),
        opts: [0, 1, 2, 3].map(i => ({ ph: 'Option ' + 'ABCD'[i], letter: 'ABCD'[i], val: M['o' + i] || '', set: val(v => this.setM('o' + i, v)), img: M['i' + i] || '', hasImg: !!M['i' + i], noImg: !M['i' + i], onImg: (e) => this.mFile('i' + i, e), clearImg: () => this.setM('i' + i, '') })),
        rts: [['silver', 'Silver'], ['gold', 'Gold']].map(t => ({ label: t[1], img: this.coin(t[0]), on: M.rt === t[0], cls: M.rt === t[0] ? 'on' : '', pick: () => this.setM('rt', t[0]) }))
      });
      if (k === 'gm') {
        const gk = M.gk, v = gk === 'cards' ? M.variant : gk;
        Object.assign(md, {
          title: M.id ? 'Edit game' : 'Create game', okLabel: M.id ? 'Save changes' : 'Create game', ok: () => this.saveGm(), isNew: !M.id,
          kinds: this.gameKinds().map(x => ({ label: x[1], blurb: x[2], on: gk === x[0], cls: gk === x[0] ? 'kopt on' : 'kopt', pick: () => this.setM('gk', x[0]), isTrivia: x[0] === 'trivia', isQuiz: x[0] === 'quiz', isCards: x[0] === 'solitaire' || x[0] === 'cards', isPuzzle: x[0] === 'puzzle' })),
          kindName: (this.gameKinds().find(x => x[0] === gk) || [])[1], kindBlurb: (this.gameKinds().find(x => x[0] === gk) || [])[2],
          hasQs: gk === 'trivia' || gk === 'quiz', isTriviaK: gk === 'trivia', isQuizK: gk === 'quiz', isCardsK: gk === 'cards', hasBack: gk === 'solitaire' || gk === 'cards', isPuzzleK: gk === 'puzzle',
          isHilo: v === 'hilo', isBj: v === 'blackjack',
          vars: this.variants().map(x => ({ label: x[1], on: M.variant === x[0], cls: M.variant === x[0] ? 'on' : '', pick: () => this.setM('variant', x[0]) })),
          sizes: [3, 4, 5].map(z => ({ label: z + ' × ' + z, on: M.size === String(z), cls: M.size === String(z) ? 'on' : '', pick: () => this.setM('size', String(z)) })),
          hasImg: !!M.img, noImg: !M.img, imgStyle: M.img ? 'background-image: url("' + M.img + '")' : '', onImg: (e) => this.mFile('img', e), clearImg: () => this.setM('img', ''),
          imgLabel: gk === 'puzzle' ? (M.img ? 'Change puzzle image' : 'Upload puzzle image') : (M.img ? 'Change card back design' : 'Upload card back design'),
          qsCount: this.plural(M.qs.length, 'question', 'questions'), canAddQ: M.qs.length < 20, addQ: () => this.addQ(),
          qs: M.qs.map((q, i) => ({ n: i + 1, q: q.q, setQ: val(x => this.setQf(i, 'q', x)), canDel: M.qs.length > 1, del: () => this.delQ(i),
            opts: q.o.map((o, oi) => ({ letter: 'ABCD'[oi], val: o, ph: 'Answer ' + 'ABCD'[oi] + (oi > 1 ? ' (optional)' : ''), set: val(x => this.setQf(i, 'o', x, oi)), on: q.ans === oi, markCls: q.ans === oi ? 'mark on' : 'mark', mark: () => this.setQf(i, 'ans', oi), markLabel: (q.ans === oi ? 'Correct answer: ' : 'Mark as correct: ') + 'answer ' + 'ABCD'[oi] + ' of question ' + (i + 1) })) })),
          setSecs: val(x => this.setM('secs', x)), setPass: val(x => this.setM('pass', x)), setTarget: val(x => this.setM('target', x)),
          passPh: String(M.qs.length), targetPh: v === 'hilo' ? '7' : '3', targetLabel: v === 'hilo' ? 'Correct guesses in a row to win' : 'Hands to win (first to)',
          pts: [['silver', 'Silver'], ['gold', 'Gold'], ['green', 'Green'], ['tickets', 'Tickets'], ['custom', 'Other']].map(x => ({ label: x[1], img: x[0] === 'tickets' || x[0] === 'custom' ? '' : this.coin(x[0]), hasImg: x[0] !== 'tickets' && x[0] !== 'custom', isTicket: x[0] === 'tickets', isCustom: x[0] === 'custom', on: M.pt === x[0], cls: M.pt === x[0] ? 'on' : '', pick: () => this.setM('pt', x[0]) })),
          ptCustom: M.pt === 'custom', ptAmount: M.pt !== 'custom', setPa: val(x => this.setM('pa', x)), setPtext: val(x => this.setM('ptext', x)), setWinners: val(x => this.setM('winners', x)),
          hasPimg: !!M.pimg, noPimg: !M.pimg, onPimg: (e) => this.mFile('pimg', e), clearPimg: () => this.setM('pimg', ''),
          paLabel: M.pt === 'tickets' ? 'Tickets per winner' : 'Coins per winner'
        });
      }
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
        askDelete: () => this.setState({ modal: { kind: 'delete', stage: 1, typed: '', err: '', backTo: M } })
      });
      if (k === 'delete') Object.assign(md, M.stage === 2
        ? { title: 'Delete your account', okLabel: 'Delete forever', ok: () => this.deleteAccount(), cancelLabel: 'Keep my account' }
        : { title: 'Delete your account', okLabel: 'Yes, continue', ok: () => this.setM('stage', 2), cancelLabel: 'No, keep my account' });
    }

    this.checkLevelUp(me);

    // coin pop
    const pp = s.pop ? Object.assign({ show: true }, s.pop) : { show: false, bits: [] };
    const lp = s.lvpop && !s.pop ? Object.assign({ show: true }, s.lvpop) : { show: false, bits: [] };

    return {
      themeStyle: this.themeCss(themeKey), showHeader: !!me && !scr.auth && !scr.setup && !scr.terms, scr: scr, hdr: hdr, f: f, mf: mf, auth: auth, su: su,
      genreCards: genreCards, gp: gp, ex: ex, srch: srch, tm: tm, ap: ap, tabs: tabs, pn: pn, blocks: blocks, gms: gms, pl: me ? this.playView(me) : { show: false }, sb: sb, cm: cm, pf: pf, ch: ch, md: md, pp: pp, lp: lp,
      q: s.q, reply: s.reply, chatText: s.chatText,
      nav: { canBack: !!me && !scr.auth && !scr.setup && !scr.terms && (s.hist || []).length > 0, back: () => this.back() },
      goHome: () => this.home(), goExplore: () => this.go('pickGenre'), goSearch: () => this.go('search'), goCommunity: () => this.go('community'),
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

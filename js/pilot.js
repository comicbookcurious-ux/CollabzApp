/*
 * Collabz · St-ate of Jazz pilot features
 * ---------------------------------------
 * Co-managers, Listen and vote (audio clips), voting windows, live tallies,
 * Elect winner, net score + Top 5, duplicate image flag, coins for voting,
 * QR live votes (guests too), the stage screen, Co-Producer badges, liner notes,
 * invite codes, the age check with parent consent, and the survey link.
 * These methods extend the app in js/app.js; js/live.js swaps the actions for
 * Supabase calls when the app runs live.
 */
(function () {
  'use strict';
  const P = Component.prototype;
  const H = 3600000, D = 86400000;
  const pad = (n) => String(n).padStart(2, '0');

  Object.assign(P, {
    // ------------------------------------------------------------ managers
    managers(aid) { return (this.state.db.managers || []).filter((m) => m.aid === aid && this.state.db.users[m.mid]).map((m) => m.mid); },
    canManage(aid, uid) {
      uid = uid || this.state.me;
      if (!uid || !aid) return false;
      return uid === aid || (this.state.db.managers || []).some((m) => m.aid === aid && m.mid === uid);
    },
    managedBy(uid) { return (this.state.db.managers || []).filter((m) => m.mid === uid && this.state.db.users[m.aid]).map((m) => m.aid); },
    // The creator account new content belongs to: the page being managed, or yourself
    actor() { const s = this.state; return s.viewing && s.viewing !== s.me && this.canManage(s.viewing) ? s.viewing : s.me; },
    isAdmin(uid) { return (this.state.db.admins || []).includes(uid || this.state.me); },
    isRestricted(uid) { const u = this.state.db.users[uid]; return !!(u && u.restricted); },
    // Under-13s waiting for parent consent are only visible to themselves and the creator's producers
    hiddenFor(uid, aid) { return this.isRestricted(uid) && uid !== this.state.me && !(aid && this.canManage(aid)); },

    // ------------------------------------------------------------ challenge kinds
    isChoice(c) { return !!c && (c.type === 'mc' || c.type === 'listen'); },
    votable(c) { return !!c && (c.type === 'text' || c.type === 'image' || c.type === 'video'); },
    optAudio(c, i) { return (c.audio && c.audio[i]) || ''; },

    // ------------------------------------------------------------ voting windows
    clock() { return Date.now() + (this._skew || 0); },
    dur(ms) {
      const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
      if (d) return d + 'd ' + h + 'h ' + pad(m) + 'm';
      if (h) return h + 'h ' + pad(m) + 'm ' + pad(x) + 's';
      return m + 'm ' + pad(x) + 's';
    },
    win(c, now) {
      now = now || this.clock();
      if (c.elected) return { open: false, closed: true, soon: false, has: true, text: 'Voting closed · winner elected', cls: 'wnd done', tick: false };
      if (c.opens && now < c.opens) return { open: false, closed: false, soon: true, has: true, text: 'Voting opens in ' + this.dur(c.opens - now), cls: 'wnd soon', tick: true };
      if (c.closes && now >= c.closes) return { open: false, closed: true, soon: false, has: true, text: 'Voting closed', cls: 'wnd done', tick: false };
      if (c.closes) return { open: true, closed: false, soon: false, has: true, text: 'Voting closes in ' + this.dur(c.closes - now), cls: c.closes - now < H ? 'wnd hot' : 'wnd', tick: true };
      return { open: true, closed: false, soon: false, has: false, text: '', cls: 'wnd', tick: false };
    },
    // Re-render once a second while a countdown is on screen
    needTick() {
      this._needTick = true;
      if (this._tickT) return;
      this._tickT = setInterval(() => { if (this._needTick) { this._needTick = false; this.setState({ now: Date.now() }); } }, 1000);
    },
    toLocal(ms) { if (!ms) return ''; const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    fromLocal(v) { if (!v) return null; const t = new Date(v).getTime(); return isNaN(t) ? null : t; },
    fmtWhen(ms) { try { return new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return new Date(ms).toISOString(); } },
    windowText(c) {
      if (!c.opens && !c.closes) return '';
      if (c.opens && c.closes) return 'Open ' + this.fmtWhen(c.opens) + ' to ' + this.fmtWhen(c.closes);
      return c.closes ? 'Closes ' + this.fmtWhen(c.closes) : 'Opens ' + this.fmtWhen(c.opens);
    },

    // ------------------------------------------------------------ tallies
    tally(c) {
      const db = this.state.db;
      const subs = db.subs.filter((x) => x.cid === c.id), g = (db.guestVotes || []).filter((x) => x.cid === c.id);
      const rows = (c.options || []).map((o, i) => ({ label: o, i: i, n: subs.filter((x) => x.answer === o).length + g.filter((x) => x.answer === o).length }));
      return this.tallyView(c, rows, subs.length + g.length, g.length);
    },
    tallyView(c, rows, total, guests) {
      const max = Math.max(0, ...rows.map((r) => r.n));
      return {
        total: total, guests: guests || 0,
        totalText: this.plural(total, 'vote', 'votes') + (guests ? ' · ' + guests + ' by QR' : ''),
        rows: rows.map((r) => {
          const pct = total ? Math.round((r.n / total) * 100) : 0, win = !!c.elected && c.elected === r.label, lead = !c.elected && max > 0 && r.n === max;
          const im = this.optImg(c, r.i), au = this.optAudio(c, r.i);
          return { label: r.label, letter: 'ABCD'[r.i], n: r.n, pct: pct, pctText: pct + '%', nText: this.plural(r.n, 'vote', 'votes'), bar: 'width: ' + (r.n ? Math.max(pct, 3) : 0) + '%',
            win: win, lead: lead, cls: 'tvrow' + (win ? ' win' : '') + (lead ? ' lead' : ''), img: im, hasImg: !!im, audio: au, hasAudio: !!au };
        })
      };
    },
    netScore(sid) { return (this.state.db.votes || []).filter((x) => x.sid === sid).reduce((a, b) => a + (b.v > 0 ? 1 : -1), 0); },

    // ------------------------------------------------------------ files
    async fileHash(f) {
      try {
        if (!(window.crypto && crypto.subtle && f && f.arrayBuffer)) return null;
        const h = await crypto.subtle.digest('SHA-256', await f.arrayBuffer());
        return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join('');
      } catch (e) { return null; }
    },
    // Audio clip for a Listen and vote option: audio files up to 30 seconds and 15 MB
    mAudio(i, e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const bad = (msg) => { this.setM('err', msg); try { e.target.value = ''; } catch (x) {} };
      if (!/^audio\//.test(f.type || '') && !/\.(mp3|m4a|aac|wav|ogg|oga|webm)$/i.test(f.name || '')) return bad('Choose an audio file (MP3 works best).');
      if (f.size > 15 * 1024 * 1024) return bad('That clip is too big. Keep audio clips under 15 MB.');
      const url = URL.createObjectURL(f);
      const done = (secs) => {
        if (secs && secs > 31) { URL.revokeObjectURL(url); return bad('That clip is ' + Math.round(secs) + ' seconds long. Trim it to 30 seconds or less.'); }
        this.files = this.files || {}; this.files['m:a' + i] = f;
        this.setState({ modal: Object.assign({}, this.state.modal, { ['a' + i]: url, ['an' + i]: f.name, err: '' }) });
      };
      try {
        const a = new Audio(); a.preload = 'metadata';
        a.onloadedmetadata = () => done(isFinite(a.duration) ? a.duration : 0);
        a.onerror = () => done(0);
        a.src = url;
      } catch (x) { done(0); }
    },

    // ------------------------------------------------------------ links, QR, clipboard
    baseUrl() { return location.origin + location.pathname; },
    pubUrl(kind, id) { return this.baseUrl() + '?' + kind + '=' + encodeURIComponent(id) + (this.live ? '' : '&demo=1'); },
    inviteUrl(code) { return this.baseUrl() + '?invite=' + encodeURIComponent(code); },
    qrImg(text, cell) {
      try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createDataURL(cell || 8, 4); } catch (e) { return ''; }
    },
    flash(text, bad) {
      clearTimeout(this._ft);
      this.setState({ toast: { text: text, cls: bad ? 'toast' : 'toast ok' } });
      this._ft = setTimeout(() => this.setState({ toast: null }), bad ? 5000 : 2600);
    },
    copyText(text, msg) {
      const ok = () => this.flash(msg || 'Copied');
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, () => this.flash('Copy this link: ' + text)); return; }
      } catch (e) {}
      this.flash('Copy this link: ' + text);
    },
    openQr(cid) { this.setState({ modal: { kind: 'qr', cid: cid } }); },

    // ------------------------------------------------------------ guest device (one vote per phone)
    deviceId() {
      try {
        let d = localStorage.getItem('collabz:device');
        if (!d) { d = 'dev-' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map((x) => x.toString(16).padStart(2, '0')).join(''); localStorage.setItem('collabz:device', d); }
        return d;
      } catch (e) {
        if (!this._dev) this._dev = 'dev-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
        return this._dev;
      }
    },
    myGuestVote(cid) { let v = ''; try { v = localStorage.getItem('collabz:voted:' + cid) || ''; } catch (e) {} return v || ((this._gv || {})[cid] || ''); },
    rememberGuestVote(cid, a) { this._gv = Object.assign({}, this._gv, { [cid]: a }); try { localStorage.setItem('collabz:voted:' + cid, a); } catch (e) {} },

    // ------------------------------------------------------------ actions (demo data; js/live.js uses Supabase)
    confirmElect(cid, label) {
      const c = this.state.db.challenges.find((x) => x.id === cid); if (!c) return;
      this.setState({ modal: { kind: 'confirm', title: 'Elect "' + label + '" as the winner?', body: 'This locks "' + c.title + '": voting closes now, the result can’t be changed, and everyone who voted is told that "' + label + '" won.', action: 'elect', arg: cid, opt: label, okLabel: 'Elect winner', err: '' } });
    },
    electOption(cid, label) {
      this.mut((db) => {
        const c = db.challenges.find((x) => x.id === cid); if (!c || c.elected) return false;
        const now = Date.now();
        c.elected = label; c.electedAt = now;
        if (!c.closes || c.closes > now) c.closes = now;
        if (c.opens && c.opens > now) c.opens = null;
        db.subs.filter((x) => x.cid === cid).forEach((x) => this.notify(db, x.uid, 'The votes are in! "' + label + '" won "' + c.title + '".', { type: 'artist', id: c.aid, tab: c.ev ? 'showday' : 'challenges', open: c.id }));
      }, { modal: null });
    },
    // Quick vote from the QR page
    castLiveVote() {
      const s = this.state, pv = s.pub || {}, a = s.vpick;
      if (!a) return this.setState({ verr: 'Pick an option first.' });
      const c = s.db.challenges.find((x) => x.id === pv.id); if (!c) return;
      const w = this.win(c);
      if (!w.open) return this.setState({ verr: w.text || 'Voting is closed.' });
      if (!c.guest) return this.setState({ verr: 'Quick voting is not switched on for this vote. Log in to vote.' });
      if (this.myGuestVote(c.id)) return this.setState({ verr: 'This phone has already voted.' });
      this.rememberGuestVote(c.id, a);
      this.mut((db) => { db.guestVotes.push({ cid: c.id, answer: a, at: Date.now() }); }, { verr: '', vpick: null });
    },
    addManager() {
      const s = this.state, A = s.viewing, em = ((s.pv || {}).mEmail || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(em)) return this.setPv({ err: 'Enter the email address they signed up with.' });
      const u = Object.values(s.db.users).find((x) => (x.email || '').toLowerCase() === em);
      if (!u) return this.setPv({ err: 'No Collabz account uses ' + em + '. Ask them to sign up first.' });
      if (u.id === A) return this.setPv({ err: 'That is the account itself.' });
      this.mut((db) => {
        if (!db.managers.some((m) => m.aid === A && m.mid === u.id)) db.managers.push({ aid: A, mid: u.id, at: Date.now() });
        this.notify(db, u.id, 'You can now manage ' + db.users[A].name + ' on Collabz.', { type: 'artist', id: A, tab: 'challenges' });
      }, { pv: Object.assign({}, s.pv, { mEmail: '', err: '' }) });
      this.flash(u.name + ' can now manage this account.');
    },
    removeManager(mid) { const A = this.state.viewing; this.mut((db) => { db.managers = db.managers.filter((m) => !(m.aid === A && m.mid === mid)); }, { modal: null }); },
    createInvite() {
      const s = this.state, A = s.viewing, d = s.pv || {};
      const max = parseInt(d.iMax || '40', 10), days = parseInt(d.iDays || '30', 10);
      if (!(max >= 1 && max <= 1000)) return this.setPv({ err: 'An invite can be used 1 to 1000 times.' });
      const code = Math.random().toString(36).slice(2, 10).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(8, 'X');
      this.mut((db) => { db.invites.unshift({ code: code, aid: A, label: (d.iLabel || '').trim(), max: max, uses: 0, exp: days > 0 ? Date.now() + days * D : null, active: true, at: Date.now() }); }, { pv: Object.assign({}, d, { iLabel: '', err: '' }) });
      this.flash('Invite link created.');
    },
    setInviteActive(code, on) { this.mut((db) => { const i = db.invites.find((x) => x.code === code); if (i) i.active = on; }); },
    saveSurvey() {
      const s = this.state, A = s.viewing, url = ((s.pv || {}).survey || '').trim();
      if (url && !/^https:\/\/\S+$/i.test(url)) return this.setPv({ err: 'The survey link needs to start with https://' });
      this.mut((db) => { db.users[A].survey = url || ''; }, { pv: Object.assign({}, s.pv, { survey: undefined, err: '' }) });
      this.flash(url ? 'Survey link saved. Fans see it on your page.' : 'Survey link removed.');
    },
    badgeLabel(aid) { return this.user(aid).name + ' Co-Producer'; },
    awardBadge(uid) {
      const A = this.state.viewing, label = this.badgeLabel(A);
      this.mut((db) => {
        if (db.badges.some((b) => b.uid === uid && b.aid === A)) return false;
        db.badges.push({ uid: uid, aid: A, label: label, at: Date.now() });
        this.notify(db, uid, 'You earned the "' + label + '" badge! It’s on your profile now.', { type: 'profile', id: uid });
      });
    },
    revokeBadge(uid) { const A = this.state.viewing; this.mut((db) => { db.badges = db.badges.filter((b) => !(b.uid === uid && b.aid === A)); }); },
    awardTop(ids) { ids.forEach((id) => this.awardBadge(id)); },
    giveConsent() {
      const s = this.state, tok = (s.pub || {}).id, d = s.cs || {};
      if ((d.name || '').trim().length < 2) return this.setState({ cs: Object.assign({}, d, { err: 'Type your full name to give consent.' }) });
      if (!d.agree) return this.setState({ cs: Object.assign({}, d, { err: 'Tick the box to confirm.' }) });
      this.mut((db) => {
        const u = Object.values(db.users).find((x) => x.consentToken === tok); if (!u) return false;
        u.restricted = false; u.consentAt = Date.now(); u.parentName = d.name.trim();
        this.notify(db, u.id, 'Your parent or guardian said yes. Welcome to Collabz! Your posts can now be seen by others.');
      }, { cs: Object.assign({}, d, { err: '', done: true }) });
    },
    setPv(p) { this.setState({ pv: Object.assign({}, this.state.pv, { err: '' }, p) }); },
    dismissSurvey(aid) { try { localStorage.setItem('collabz:survey:' + aid, '1'); } catch (e) {} this._sd = Object.assign({}, this._sd, { [aid]: true }); this.setState({ now: Date.now() }); },
    surveyDismissed(aid) { if ((this._sd || {})[aid]) return true; try { return localStorage.getItem('collabz:survey:' + aid) === '1'; } catch (e) { return false; } },

    // ------------------------------------------------------------ sign-up checks
    ageOf(dob) {
      if (!dob) return null;
      const b = new Date(dob + 'T00:00'); if (isNaN(b.getTime())) return null;
      const n = new Date(); let a = n.getFullYear() - b.getFullYear();
      if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
      return a;
    },
    inviteError(code) {
      const i = (this.state.db.invites || []).find((x) => x.code === (code || '').trim().toUpperCase());
      if (!i) return 'That invite code isn’t valid. Check the link you were sent.';
      if (!i.active) return 'That invite has been switched off.';
      if (i.exp && Date.now() > i.exp) return 'That invite has expired.';
      if (i.uses >= i.max) return 'That invite has been used the maximum number of times.';
      return '';
    },
    // Shared checks for the sign-up form (demo and live)
    signupCheck(a) {
      const age = this.ageOf(a.dob);
      if (!a.dob) return 'Add your date of birth.';
      if (age == null || age < 0 || age > 120) return 'Enter a real date of birth.';
      if (age < 13 && !/^\S+@\S+\.\S+$/.test((a.parent || '').trim())) return 'You’re under 13, so add a parent or guardian’s email. We’ll ask them to say it’s OK.';
      if (age < 13 && (a.parent || '').trim().toLowerCase() === (a.email || '').trim().toLowerCase()) return 'Your parent or guardian’s email needs to be different from yours.';
      if (age < 13 && a.role === 'artist') return 'Creator accounts are for people 13 and over.';
      return '';
    },

    // ------------------------------------------------------------ liner notes
    linerNotes(aid) {
      const db = this.state.db, A = this.user(aid), mgr = this.managers(aid);
      const chs = db.challenges.filter((c) => c.aid === aid).sort((a, b) => a.at - b.at), ids = chs.map((c) => c.id);
      const results = [];
      chs.forEach((c) => {
        if (c.elected) results.push({ title: c.title, type: c.type, winner: c.elected, by: null, answer: null });
        else if (c.winner && db.users[c.winner] && !db.users[c.winner].restricted) {
          const sub = db.subs.find((x) => x.cid === c.id && x.uid === c.winner);
          results.push({ title: c.title, type: c.type, winner: db.users[c.winner].name, by: db.users[c.winner].name, answer: c.type === 'text' && sub ? sub.answer : null, file: c.type === 'image' && sub && sub.file ? sub.file : null });
        }
      });
      const cnt = {};
      const add = (uid) => { const u = db.users[uid]; if (!u || u.role !== 'fan' || u.restricted || mgr.includes(uid)) return; cnt[uid] = (cnt[uid] || 0) + 1; };
      db.subs.forEach((x) => { if (ids.includes(x.cid)) add(x.uid); });
      (db.votes || []).forEach((v) => { const x = db.subs.find((y) => y.id === v.sid); if (x && ids.includes(x.cid)) add(v.uid); });
      return {
        artist: { id: aid, name: A.name, bio: A.bio || '', avatar: A.avatar, banner: A.banner || '', theme: A.theme },
        producers: mgr.map((id) => db.users[id].name),
        results: results,
        coproducers: (db.badges || []).filter((b) => b.aid === aid && db.users[b.uid] && !db.users[b.uid].restricted).sort((a, b) => a.at - b.at).map((b) => ({ id: b.uid, name: db.users[b.uid].name, avatar: db.users[b.uid].avatar })),
        contributors: Object.keys(cnt).map((id) => ({ id: id, name: db.users[id].name, avatar: db.users[id].avatar, count: cnt[id] })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        guestVotes: (db.guestVotes || []).filter((g) => ids.includes(g.cid)).length
      };
    },
    creditsView(n, inApp) {
      if (!n) return { has: false };
      const A = n.artist, kind = { mc: 'Fan vote', listen: 'Listen and vote', text: 'Title / idea', image: 'Artwork', video: 'Video' };
      const go = (id) => (inApp && id && this.state.db.users[id] ? () => this.openProfile(id) : null);
      return {
        has: true, name: A.name, bio: A.bio, hasBio: !!A.bio, av: this.av({ id: A.id, name: A.name }, A.avatar || null),
        hasBanner: !!A.banner, bannerStyle: A.banner ? 'background-image: url("' + A.banner + '")' : '',
        producersText: (n.producers || []).length ? 'Produced by ' + n.producers.join(' & ') + ' with the fans below.' : 'Made with the fans below.',
        results: n.results.map((r) => ({ title: r.title, kind: kind[r.type] || 'Challenge', winner: r.winner, sub: r.by ? (r.answer ? '“' + r.answer + '” by ' + r.by : 'by ' + r.by) : 'Elected by fan vote', file: r.file || '', hasFile: !!r.file })),
        hasResults: n.results.length > 0,
        coproducers: n.coproducers.map((p) => ({ name: p.name, av: this.av({ id: p.id, name: p.name }, p.avatar || null), go: go(p.id), canGo: !!go(p.id) })), hasCo: n.coproducers.length > 0,
        contributors: n.contributors.map((p) => ({ name: p.name, av: this.av({ id: p.id, name: p.name }, p.avatar || null), countText: this.plural(p.count, 'contribution', 'contributions'), go: go(p.id), canGo: !!go(p.id) })),
        hasContrib: n.contributors.length > 0, contribCount: this.plural(n.contributors.length, 'fan', 'fans'),
        guestText: n.guestVotes ? 'Plus ' + this.plural(n.guestVotes, 'vote', 'votes') + ' from the audience at the live gig.' : '', hasGuests: !!n.guestVotes,
        shareUrl: this.pubUrl('credits', A.id), copy: () => this.copyText(this.pubUrl('credits', A.id), 'Liner notes link copied.'),
        open: () => { try { window.open(this.pubUrl('credits', A.id), '_blank', 'noopener'); } catch (e) {} }
      };
    },

    // ------------------------------------------------------------ demo data
    pilotSeed(db) {
      const t = Date.now(), base = (o) => Object.assign({ avatar: null, video: null, location: '', bio: '', socials: { facebook: '', instagram: '', x: '', tiktok: '', youtube: '' }, followers: [], following: [], theme: 'default', genre: '', password: 'demo1234', termsAccepted: true, coins: { silver: 10, gold: 10, green: 0 }, tickets: 10, role: 'fan' }, o);
      const U = db.users;
      U.a6 = base({ id: 'a6', role: 'artist', name: 'St-ate of Jazz', email: 'stateofjazz@collabz.app', genre: 'music', genres: ['music'], avatar: 'assets/pilot/st-ate-of-jazz.jpg', banner: 'assets/pilot/banner.jpg', bio: 'Steve & Nate are making their new jazz album with you. Listen to unreleased takes, vote on what makes the record, name the tracks and design the cover.', location: 'Perth, WA', coins: { silver: 50, gold: 20, green: 10 }, tickets: 0, theme: 'midnight', survey: 'https://example.com/st-ate-of-jazz-survey', socials: { facebook: '', instagram: 'https://instagram.com', x: '', tiktok: '', youtube: 'https://youtube.com' } });
      U.m1 = base({ id: 'm1', name: 'Steve', email: 'steve@collabz.app', bio: 'Saxophone. One half of St-ate of Jazz.' });
      U.m2 = base({ id: 'm2', name: 'Nate', email: 'nate@collabz.app', bio: 'Keys. The other half of St-ate of Jazz.' });
      U.d1 = base({ id: 'd1', name: 'Devin', email: 'devin@collabz.app', bio: 'Pilot facilitator.' });
      U.f3 = base({ id: 'f3', name: 'Ava Brooks', email: 'ava@collabz.app', genre: 'music', location: 'Subiaco, WA' });
      U.f4 = base({ id: 'f4', name: 'Leo Park', email: 'leo@collabz.app', genre: 'music' });
      U.f5 = base({ id: 'f5', name: 'Mia Chen', email: 'mia@collabz.app', genre: 'music', restricted: true, birthDate: '2015-03-14', parentEmail: 'parent.chen@example.com', consentToken: 'demo-consent-token' });
      U.f6 = base({ id: 'f6', name: 'Sam Rivera', email: 'sam@collabz.app', genre: 'music' });
      U.f7 = base({ id: 'f7', name: 'Noor Haddad', email: 'noor@collabz.app', genre: 'music' });
      ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'].forEach((id) => { U[id].following.push('a6'); U.a6.followers.push(id); });
      const ch = (o) => Object.assign({ ev: null, options: [], imgs: [], audio: [], rt: 'gold', rw: 1, max: 100, winner: null, claimed: false, opens: null, closes: null, guest: false, elected: null, at: t - D }, o);
      db.events.push({ id: 'e3', aid: 'a6', tag: 'Concert', title: 'Live listening session & gig', desc: 'Hear the album live. Scan the QR code on the screen to pick the encore.', date: this.toLocal(t).slice(0, 10), time: '20:00', venue: 'The Blue Room', at: t - 2 * D });
      db.challenges.push(
        ch({ id: 'j5', aid: 'a6', type: 'listen', title: 'Track 1 intro: Take 1 or Take 2?', desc: 'Two ways to open the album. Listen to both and vote.', options: ['Take 1', 'Take 2'], audio: ['assets/pilot/intro-1.mp3', 'assets/pilot/intro-2.mp3'], rt: 'silver', rw: 2, opens: t - 6 * D, closes: t - 4 * D, elected: 'Take 2', electedAt: t - 4 * D, at: t - 6 * D }),
        ch({ id: 'j3', aid: 'a6', type: 'image', title: 'Sketch the album cover', desc: 'Draw, paint or design a cover for St-ate of Jazz and upload it. Vote for your favourites on the Scoreboard.', rt: 'gold', rw: 2, closes: t + 5 * D, at: t - 3 * D }),
        ch({ id: 'j2', aid: 'a6', type: 'text', title: 'Name Track 5', desc: 'Track 5 is a slow ballad in D minor. Suggest a title, then vote on other fans’ ideas on the Scoreboard. The top 5 go to Steve & Nate.', rt: 'gold', rw: 1, opens: t - D, closes: t + 2 * D, at: t - D }),
        ch({ id: 'j1', aid: 'a6', type: 'listen', title: 'Track 2 solo: Take A or Take B?', desc: 'Two takes of the sax solo on Track 2. Listen to both and vote for the one that goes on the album.', options: ['Take A', 'Take B'], audio: ['assets/pilot/take-a.mp3', 'assets/pilot/take-b.mp3'], rt: 'silver', rw: 2, opens: t - 2 * H, closes: t + 22 * H, at: t - 2 * H }),
        ch({ id: 'j4', aid: 'a6', ev: 'e3', type: 'mc', title: 'Encore: which song should we play?', desc: 'Scan the QR code and vote. The winner is the encore tonight.', options: ['Blue Hour Rain', 'Midnight on Main', 'Take the Long Way'], rt: 'silver', rw: 1, guest: true, opens: t - 10 * 60000, closes: t + 2 * H, at: t - 3 * H })
      );
      const sub = (id, cid, uid, answer, file, ago, hash) => db.subs.push({ id: id, cid: cid, uid: uid, answer: answer || '', file: file || null, at: t - ago, hash: hash || null, dup: null });
      sub('s51', 'j5', 'f2', 'Take 2', null, 5 * D); sub('s52', 'j5', 'f3', 'Take 2', null, 5 * D); sub('s53', 'j5', 'f4', 'Take 1', null, 5 * D); sub('s54', 'j5', 'f6', 'Take 2', null, 5 * D);
      sub('s11', 'j1', 'f2', 'Take A', null, 100 * 60000); sub('s12', 'j1', 'f3', 'Take B', null, 90 * 60000); sub('s13', 'j1', 'f4', 'Take B', null, 60 * 60000); sub('s14', 'j1', 'f6', 'Take B', null, 30 * 60000); sub('s15', 'j1', 'f7', 'Take A', null, 10 * 60000);
      sub('s21', 'j2', 'f2', 'Blue Hour Rain', null, 20 * H); sub('s22', 'j2', 'f3', 'Midnight on Main', null, 18 * H); sub('s23', 'j2', 'f4', 'Sax & the City', null, 15 * H);
      sub('s24', 'j2', 'f6', 'Take the Long Way', null, 12 * H); sub('s25', 'j2', 'f7', 'Low Light Lullaby', null, 6 * H); sub('s26', 'j2', 'f5', 'Moon Puddles', null, 3 * H);
      const h1 = '1f7a15fec322d6d304043ba0c205f521691e827fef6298a0602a9ffd3bdcd0f0';
      sub('s31', 'j3', 'f3', '', 'assets/pilot/cover-1.jpg', 2 * D, h1); sub('s32', 'j3', 'f4', '', 'assets/pilot/cover-2.jpg', 40 * H, '70227fd0ec01fe8e2e4ec4e92ad9f8e7c2556cdc3a916a23fe62ee8156229dc3');
      sub('s33', 'j3', 'f6', '', 'assets/pilot/cover-3.jpg', 30 * H, '95914974385922ae2941110051c05dfafa0887bbf09f4a5765dba7f70f100d4b'); sub('s34', 'j3', 'f7', '', 'assets/pilot/cover-1.jpg', 5 * H, h1);
      db.subs.find((x) => x.id === 's34').dup = 's31';
      sub('s41', 'j4', 'f2', 'Blue Hour Rain', null, 8 * 60000); sub('s42', 'j4', 'f3', 'Midnight on Main', null, 6 * 60000);
      const vote = (sid, uids, v) => uids.forEach((u) => { db.votes.push({ sid: sid, uid: u, v: v }); db.voteRewards.push({ sid: sid, uid: u }); });
      vote('s21', ['f3', 'f4', 'f6', 'f7'], 1); vote('s22', ['f2', 'f4', 'f6'], 1); vote('s24', ['f2', 'f3'], 1);
      vote('s23', ['f2', 'f7'], 1); vote('s23', ['f6'], -1); vote('s25', ['f4'], -1);
      vote('s32', ['f2', 'f3', 'f6'], 1); vote('s31', ['f2', 'f4'], 1); vote('s33', ['f2'], 1);
      db.guestVotes = ['Blue Hour Rain', 'Midnight on Main', 'Blue Hour Rain', 'Take the Long Way', 'Blue Hour Rain', 'Midnight on Main', 'Blue Hour Rain', 'Take the Long Way', 'Blue Hour Rain']
        .map((a, i) => ({ cid: 'j4', answer: a, at: t - (9 - i) * 30000 }));
      db.managers = [{ aid: 'a6', mid: 'm1', at: t - 7 * D }, { aid: 'a6', mid: 'm2', at: t - 7 * D }];
      db.badges = [{ uid: 'f2', aid: 'a6', label: 'St-ate of Jazz Co-Producer', at: t - 4 * D }, { uid: 'f3', aid: 'a6', label: 'St-ate of Jazz Co-Producer', at: t - 4 * D }];
      db.invites = [
        { code: 'JAZZA30', aid: 'a6', label: 'Group A · listeners', max: 30, uses: 7, exp: t + 20 * D, active: true, at: t - 7 * D },
        { code: 'JAZZLIVE', aid: 'a6', label: 'Group C · live gig', max: 5, uses: 0, exp: t + 20 * D, active: true, at: t - 2 * D }
      ];
      db.admins = ['d1'];
      db.flags = { inviteOnly: false };
      this.notify(db, 'm1', '[St-ate of Jazz] Noor Haddad voted in "Track 2 solo: Take A or Take B?".', { type: 'score', id: 'a6', cat: 'challenge', sel: 'j1' });
      return db;
    },

    // Preview screens: index.html?screen=<name>
    pilotStart(k, S, as, art) {
      const db = S.db, pubId = (this.props.pub || {}).id;
      // Opened from an invite link (?invite=CODE): start on the sign-up form with the code filled in
      if (this.props.invite && (k === 'login' || k === 'signup')) { S.inviteCode = this.props.invite; S.auth = Object.assign(this.blankAuth('signup', 'fan'), { invite: this.props.invite }); if (k === 'login') return true; }
      switch (k) {
        case 'jazz-fan': art('f1', 'a6', 'challenges', { open: 'j1' }); return true;
        case 'jazz-fan-titles': art('f1', 'a6', 'scoreboard', { sb: { cat: 'challenge', sel: 'j2' } }); return true;
        case 'jazz-producer': art('m1', 'a6', 'scoreboard', { sb: { cat: 'challenge', sel: 'j1' } }); return true;
        case 'jazz-titles': art('m1', 'a6', 'scoreboard', { sb: { cat: 'challenge', sel: 'j2' } }); return true;
        case 'jazz-cover-art': art('m1', 'a6', 'scoreboard', { sb: { cat: 'challenge', sel: 'j3' } }); return true;
        case 'jazz-live': art('m1', 'a6', 'showday', { open: 'j4' }); return true;
        case 'jazz-qr': art('m1', 'a6', 'showday', { open: 'j4', modal: { kind: 'qr', cid: 'j4' } }); return true;
        case 'jazz-producer-tools': art('m1', 'a6', 'producer'); return true;
        case 'jazz-credits': art('f1', 'a6', 'credits'); return true;
        case 'jazz-restricted': art('f5', 'a6', 'challenges', { open: 'j2' }); return true;
        case 'jazz-admin': as('d1', { screen: 'profile', profileId: 'd1' }); return true;
        case 'jazz-new-listen':
          art('m1', 'a6', 'challenges');
          S.modal = { kind: 'ch', id: null, ev: null, title: 'Track 3: which bass line?', desc: 'Listen to both bass lines and vote for the one you want on the record.', type: 'listen', o0: 'Walking bass', o1: 'Two-feel', o2: '', o3: '', i0: '', i1: '', i2: '', i3: '',
            a0: 'assets/pilot/take-a.mp3', a1: 'assets/pilot/take-b.mp3', a2: '', a3: '', an0: 'track3-walking.mp3', an1: 'track3-two-feel.mp3', an2: '', an3: '', thumb: '', lastCreate: 'image', rt: 'silver', rw: '2', max: '100',
            opens: this.toLocal(Date.now()), closes: this.toLocal(Date.now() + D), guest: false, err: '' };
          return true;
        case 'signup-invite':
          db.flags.inviteOnly = true;
          S.auth = Object.assign(this.blankAuth('signup', 'fan'), { name: 'Ruby Lane', email: 'ruby@example.com', dob: '2001-04-12', invite: 'JAZZA30' });
          return true;
        case 'signup-kid':
          S.auth = Object.assign(this.blankAuth('signup', 'fan'), { name: 'Theo', email: 'theo@example.com', dob: '2015-06-01', parent: '' });
          return true;
        case 'vote': case 'stage': case 'consent': case 'credits': {
          const def = { vote: 'j4', stage: 'j4', consent: 'demo-consent-token', credits: 'a6' }[k];
          Object.assign(S, { me: null, screen: k, pub: { kind: k, id: pubId || def } });
          return true;
        }
        default: return false;
      }
    },

    // ------------------------------------------------------------ public pages: QR vote, stage, consent, credits
    // A challenge-like object + tally for the QR vote page and the stage screen
    liveInfo(cid) {
      if (this.live) return this.state.lv && this.state.lv.c && this.state.lv.c.id === cid ? this.state.lv : null;
      const db = this.state.db, c = db.challenges.find((x) => x.id === cid);
      if (!c || !this.isChoice(c)) return null;
      const a = this.user(c.aid), g = (db.guestVotes || []).filter((x) => x.cid === c.id), subs = db.subs.filter((x) => x.cid === c.id);
      return { c: c, artist: { id: a.id, name: a.name, avatar: a.avatar, theme: a.theme }, rows: c.options.map((o, i) => ({ label: o, i: i, n: subs.filter((x) => x.answer === o).length + g.filter((x) => x.answer === o).length })), total: subs.length + g.length, guests: g.length };
    },
    voteVals() {
      const s = this.state, pv = s.pub || {}, L = this.liveInfo(pv.id);
      if (!L) return { show: true, loading: !!this.live && !s.lvErr, notFound: !this.live || !!s.lvErr, errText: s.lvErr || 'This vote was not found.' };
      const c = L.c, w = this.win(c);
      if (w.tick) this.needTick();
      const signed = s.voteMe && s.voteMe.role === 'fan' ? s.voteMe : null;
      const mine = (signed && s.voteMine) || this.myGuestVote(c.id);
      const t = this.tallyView(c, L.rows, L.total, L.guests);
      const canVote = w.open && !mine && (c.guest || !!signed);
      return {
        show: true, loading: false, notFound: false, title: c.title, desc: c.desc || '', hasDesc: !!c.desc,
        artistName: L.artist.name, av: this.av({ id: L.artist.id, name: L.artist.name }, L.artist.avatar || null),
        winText: w.text, winCls: w.cls, hasWin: !!w.text, isListen: c.type === 'listen',
        options: c.options.map((o, i) => { const on = s.vpick === o, im = this.optImg(c, i), au = this.optAudio(c, i); return { label: o, letter: 'ABCD'[i], on: on, cls: on ? 'vopt on' : 'vopt', pick: () => this.setState({ vpick: o, verr: '' }), img: im, hasImg: !!im, audio: au, hasAudio: !!au }; }),
        canVote: canVote, notReady: !s.vpick, submit: () => this.castLiveVote(), busy: !!s.vbusy,
        needLogin: w.open && !mine && !c.guest && !signed, login: () => { try { location.href = this.baseUrl(); } catch (e) {} },
        voted: !!mine, votedText: mine ? 'Your vote: ' + mine + '. Thanks for voting!' : '',
        coinNote: signed ? 'Logged in as ' + signed.name + '. Voting earns you coins.' : (c.guest ? 'No sign-up needed. One vote per phone.' : ''),
        showResults: !!mine || w.closed, results: t, hasElected: !!c.elected, electedText: c.elected ? 'Winner: ' + c.elected : '',
        err: s.verr || '', hasErr: !!s.verr
      };
    },
    stageVals() {
      const s = this.state, pv = s.pub || {}, L = this.liveInfo(pv.id);
      if (!L) return { show: true, loading: !!this.live && !s.lvErr, notFound: !this.live || !!s.lvErr, errText: s.lvErr || 'This vote was not found.' };
      const c = L.c, w = this.win(c), t = this.tallyView(c, L.rows, L.total, L.guests), url = this.pubUrl('vote', c.id);
      if (w.tick) this.needTick();
      if (!this.live && w.open && !this._demoSim) this.startDemoSim(c.id);
      return {
        show: true, loading: false, notFound: false, title: c.title, artistName: L.artist.name, av: this.av({ id: L.artist.id, name: L.artist.name }, L.artist.avatar || null),
        rows: t.rows, totalText: t.totalText, winText: w.text, hasWin: !!w.text, winCls: w.cls,
        qr: this.qrImg(url, 10), url: url.replace(/^https?:\/\//, ''), showQr: w.open, guestOn: !!c.guest,
        scanText: c.guest ? 'Scan to vote · no sign-up needed' : 'Scan to vote · log in to Collabz',
        hasElected: !!c.elected, electedText: c.elected || '', isDemo: !this.live,
        full: () => { try { document.documentElement.requestFullscreen(); } catch (e) {} }
      };
    },
    // In demo previews the stage screen gets a few pretend audience votes so it moves
    startDemoSim(cid) {
      this._demoSim = setInterval(() => {
        const c = this.state.db.challenges.find((x) => x.id === cid);
        if (!c || !this.win(c).open || this.state.screen !== 'stage') return;
        const o = c.options[Math.floor(Math.random() * c.options.length)];
        this.mut((db) => { db.guestVotes.push({ cid: cid, answer: o, at: Date.now() }); });
      }, 2500);
    },
    consentVals() {
      const s = this.state, tok = (s.pub || {}).id, d = s.cs || {};
      let name = '', found = false, done = !!d.done;
      if (this.live) { const ci = s.csInfo; found = !!ci; name = ci ? ci.name : ''; done = done || !!(ci && ci.done); }
      else { const u = Object.values(s.db.users).find((x) => x.consentToken === tok); found = !!u; name = u ? u.name : ''; done = done || !!(u && !u.restricted); }
      return {
        show: true, loading: !!this.live && s.csInfo === undefined, found: found, notFound: !found && !(this.live && s.csInfo === undefined), done: done, open: found && !done, name: name,
        parent: d.name || '', setName: (e) => this.setState({ cs: Object.assign({}, this.state.cs, { name: e.target.value, err: '' }) }),
        agree: !!d.agree, setAgree: (e) => this.setState({ cs: Object.assign({}, this.state.cs, { agree: !!e.target.checked, err: '' }) }),
        submit: () => this.giveConsent(), err: d.err || '', hasErr: !!d.err
      };
    },
    publicCreditsVals() {
      const s = this.state, id = (s.pub || {}).id;
      if (this.live) return s.pcNotes ? this.creditsView(s.pcNotes, false) : { has: false, loading: !s.pcErr, notFound: !!s.pcErr };
      if (!s.db.users[id] || s.db.users[id].role !== 'artist') return { has: false, notFound: true };
      return this.creditsView(this.linerNotes(id), false);
    },

    // ------------------------------------------------------------ Producer tab (owner and managers)
    producerVals(A, me) {
      const s = this.state, db = s.db, d = s.pv || {}, isAccount = me.id === A.id, admin = this.isAdmin(me.id);
      const val = (fn) => (e) => fn(e.target.value);
      const mgrs = this.managers(A.id).map((id) => {
        const u = db.users[id];
        return { name: u.name, av: this.av(u), email: u.email || '', isMe: id === me.id, canRemove: isAccount || admin || id === me.id, removeLabel: id === me.id ? 'Leave' : 'Remove',
          remove: () => this.setState({ modal: { kind: 'confirm', title: id === me.id ? 'Stop managing ' + A.name + '?' : 'Remove ' + u.name + '?', body: id === me.id ? 'You won’t be able to post or pick winners for ' + A.name + ' any more.' : u.name + ' won’t be able to manage ' + A.name + ' any more.', action: 'rmMgr', arg: id, okLabel: id === me.id ? 'Leave' : 'Remove', err: '' } }) };
      });
      const invites = (db.invites || []).filter((i) => i.aid === A.id).sort((a, b) => b.at - a.at).map((i) => {
        const link = this.inviteUrl(i.code), expired = i.exp && Date.now() > i.exp, full = i.uses >= i.max;
        return { code: i.code, label: i.label || 'Invite', link: link, usesText: i.uses + ' of ' + i.max + ' used', expText: i.exp ? (expired ? 'Expired' : 'Expires ' + this.fmtDate(this.toLocal(i.exp).slice(0, 10))) : 'No expiry',
          state: !i.active ? 'Off' : (expired ? 'Expired' : (full ? 'Used up' : 'Active')), stCls: i.active && !expired && !full ? 'st done' : 'st',
          copy: () => this.copyText(link, 'Invite link copied.'), toggle: () => this.setInviteActive(i.code, !i.active), toggleLabel: i.active ? 'Switch off' : 'Switch on' };
      });
      // Top contributors: entries + votes on this creator's challenges
      const n = this.linerNotes(A.id), badged = (db.badges || []).filter((b) => b.aid === A.id).map((b) => b.uid);
      const contrib = n.contributors.slice(0, 20).map((p, i) => ({ rank: i + 1, name: p.name, av: this.av(db.users[p.id] || { id: p.id, name: p.name }), countText: this.plural(p.count, 'contribution', 'contributions'),
        has: badged.includes(p.id), notHas: !badged.includes(p.id), give: () => this.awardBadge(p.id), revoke: () => this.revokeBadge(p.id), go: () => this.openProfile(p.id) }));
      const top5 = n.contributors.slice(0, 5).map((p) => p.id).filter((id) => !badged.includes(id));
      const pending = admin ? this.pendingConsents() : [];
      return {
        isAccount: isAccount, canAddMgr: isAccount || admin, managers: mgrs, noManagers: mgrs.length === 0,
        mEmail: d.mEmail || '', setMEmail: val((v) => this.setPv({ mEmail: v })), addMgr: () => this.addManager(),
        invites: invites, noInvites: invites.length === 0, inviteOnly: !!(db.flags || {}).inviteOnly,
        inviteOnlyText: (db.flags || {}).inviteOnly ? 'Invite-only sign-up is ON: new accounts need an invite code.' : 'Invite-only sign-up is OFF: anyone can sign up. An admin can switch it on (see README).',
        iLabel: d.iLabel || '', iMax: d.iMax || '40', iDays: d.iDays || '30',
        setILabel: val((v) => this.setPv({ iLabel: v })), setIMax: val((v) => this.setPv({ iMax: v })), setIDays: val((v) => this.setPv({ iDays: v })), createInvite: () => this.createInvite(),
        survey: d.survey !== undefined ? d.survey : (A.survey || ''), setSurvey: val((v) => this.setPv({ survey: v })), saveSurvey: () => this.saveSurvey(),
        surveyNow: A.survey ? 'Fans see: ' + A.survey : 'No survey link yet.',
        contrib: contrib, noContrib: contrib.length === 0, badgeLabel: this.badgeLabel(A.id),
        canTop5: top5.length > 0, top5: () => this.awardTop(top5), top5Label: 'Give the badge to the top 5',
        isAdmin: admin, pending: pending, noPending: pending.length === 0,
        err: d.err || '', hasErr: !!d.err,
        credits: this.creditsView(n, true)
      };
    },
    pendingConsents() {
      const db = this.state.db, rows = this.live ? (db.pending || []) : Object.values(db.users).filter((u) => u.restricted && u.consentToken).map((u) => ({ id: u.id, name: u.name, email: u.email, parentEmail: u.parentEmail, token: u.consentToken, at: 0 }));
      return rows.map((r) => { const link = this.pubUrl('consent', r.token); return { name: r.name, email: r.email, parentEmail: r.parentEmail || '(none given)', link: link, copy: () => this.copyText(link, 'Consent link copied. Email it to ' + (r.parentEmail || 'the parent') + '.'), mail: 'mailto:' + encodeURIComponent(r.parentEmail || '') + '?subject=' + encodeURIComponent('Collabz: please confirm ' + r.name + ' can join') + '&body=' + encodeURIComponent('Hello,\n\n' + r.name + ' signed up to Collabz for the St-ate of Jazz album pilot. Because they are under 13, we need a parent or guardian to say it’s OK.\n\nPlease open this link to give consent:\n' + link + '\n\nUntil then, their posts stay private.\n\nThanks,\nThe Collabz team') }; });
    }
  });
})();

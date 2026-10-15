/*
 * Collabz · live mode (Supabase)
 * ------------------------------
 * js/app.js holds the screens' logic and works on an in-memory `db`.
 * This file swaps every action for a Supabase call when the app runs live,
 * then reloads `db` from Supabase so the screens show saved data.
 * Demo previews (index.html?screen=…) keep using the built-in demo data.
 */
(function () {
  'use strict';
  const P = Component.prototype;
  const orig = {};
  ['renderVals', 'doLogin', 'doSignup', 'doForgot', 'logout', 'suNext', 'pickGenre', 'toggleFollow', 'openChat', 'sendChat',
   'submit', 'cancelSub', 'claim', 'hideCard', 'pickWinner', 'unpickWinner', 'enterLottery', 'draw', 'claimLottery',
   'saveCh', 'saveEv', 'saveLt', 'doConfirm', 'saveEdit', 'deleteAccount', 'postTopic', 'sendReply', 'suFile', 'mFile', 'ansFile', 'vote', 'acceptTerms', 'declineTerms']
    .forEach((k) => { orig[k] = P[k]; });

  const TABLES = ['profiles', 'artist_genres', 'follows', 'wallets', 'showday_events', 'challenges', 'submissions',
    'hidden_challenge_cards', 'lotteries', 'lottery_entries', 'lottery_winners', 'forum_threads', 'forum_replies', 'messages', 'notifications', 'submission_votes'];
  const emptyDb = () => ({ users: {}, challenges: [], events: [], lotteries: [], subs: [], entries: [], hidden: [], votes: [], forums: [], msgs: [], notifs: [] });
  const T = (s) => (s ? Date.parse(s) : 0);
  const must = (res) => { if (res && res.error) throw res.error; return res ? res.data : null; };
  const EMAIL = /^\S+@\S+\.\S+$/;
  const here = () => location.origin + location.pathname;

  // ---------------------------------------------------------------- boot
  P.componentDidMount = function () {
    if (!this.props.live) return;
    this.live = true;
    this.files = {};
    const recovering = /type=recovery/.test(location.hash);
    if (!window.supabase || !window.COLLABZ_CONFIG) { this.setState({ screen: 'auth' }); return; }
    this.sb = window.supabase.createClient(COLLABZ_CONFIG.url, COLLABZ_CONFIG.anonKey);
    this.setState({ screen: 'loading', db: emptyDb(), me: null });
    this.sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { this._recovering = true; this.setState({ screen: 'auth', auth: this.blankAuth('reset') }); }
      if (event === 'SIGNED_OUT') signedOut.call(this);
    });
    this._recovering = recovering;
    this.sb.auth.getSession().then(({ data }) => {
      if (data && data.session) afterSignIn.call(this, data.session.user);
      else this.setState({ screen: 'auth' });
    }).catch(() => this.setState({ screen: 'auth' }));
  };

  function signedOut() {
    if (this.chan) { this.sb.removeChannel(this.chan); this.chan = null; }
    this.files = {};
    this.setState({ me: null, screen: 'auth', db: emptyDb(), viewing: null, profileId: null, modal: null, setup: null, ans: {}, open: null, chatWith: null, pop: null, hist: [] });
  }

  async function afterSignIn(user) {
    try {
      this.setState({ me: user.id, screen: 'loading' });
      await reload.call(this);
      subscribe.call(this);
      const p = this.state.db.users[user.id];
      if (this._recovering) { this.setState({ screen: 'auth', auth: this.blankAuth('reset') }); return; }
      if (!p) throw new Error('Your profile could not be found. Try signing up again.');
      const setupFor = (p) => { const s = p.socials || {}; return { role: p.role, step: 0, err: '', genres: (p.genres || []).slice(), name: p.name, bio: p.bio || '', location: p.location || '', avatar: p.avatar, video: p.video, videoName: '', facebook: s.facebook || '', instagram: s.instagram || '', x: s.x || '', tiktok: s.tiktok || '', youtube: s.youtube || '' }; };
      if (!p.termsAccepted) {
        this.setState({ screen: 'terms', termsOk: false, termsErr: '', auth: this.blankAuth(), setup: p.onboarded ? null : setupFor(p) });
        return;
      }
      if (!p.onboarded) {
        const s = p.socials || {};
        this.setState({ screen: 'setup', auth: this.blankAuth(), setup: { role: p.role, step: 0, err: '', genres: (p.genres || []).slice(), name: p.name, bio: p.bio || '', location: p.location || '', avatar: p.avatar, video: p.video, videoName: '', facebook: s.facebook || '', instagram: s.instagram || '', x: s.x || '', tiktok: s.tiktok || '', youtube: s.youtube || '' } });
        return;
      }
      this.enter(user.id);
    } catch (e) {
      toast.call(this, e);
      this.setState({ screen: 'auth', me: null });
    }
  }

  function subscribe() {
    if (this.chan) return;
    const schedule = () => { clearTimeout(this._rt); this._rt = setTimeout(() => reload.call(this).catch(() => {}), 400); };
    this.chan = this.sb.channel('collabz-live');
    ['messages', 'notifications', 'submissions', 'submission_votes', 'challenges', 'lottery_winners', 'lottery_entries', 'forum_threads', 'forum_replies', 'follows', 'showday_events', 'lotteries', 'wallets']
      .forEach((t) => this.chan.on('postgres_changes', { event: '*', schema: 'public', table: t }, schedule));
    this.chan.subscribe();
  }

  // ---------------------------------------------------------------- load everything into db
  async function reload() {
    const sb = this.sb;
    const q = (t) => sb.from(t).select('*');
    const res = await Promise.all(TABLES.map((t) => {
      if (t === 'notifications') return q(t).order('created_at', { ascending: false }).limit(100);
      if (t === 'messages') return q(t).order('created_at', { ascending: true }).limit(2000);
      return q(t);
    }));
    const d = {};
    TABLES.forEach((t, i) => {
      // votes are optional until supabase/002_submission_votes.sql has been run
      if (t === 'submission_votes' && res[i].error) { d[t] = []; return; }
      d[t] = must(res[i]) || [];
    });
    const db = emptyDb();
    d.profiles.forEach((p) => {
      const genres = d.artist_genres.filter((g) => g.artist_id === p.id).sort((a, b) => T(a.created_at) - T(b.created_at)).map((g) => g.genre_id);
      const w = d.wallets.find((x) => x.user_id === p.id);
      db.users[p.id] = {
        id: p.id, role: p.role, name: p.display_name, email: p.email || '', bio: p.bio || '', location: p.location || '',
        avatar: p.avatar_url || null, video: p.welcome_video_url || null, theme: p.theme || 'default', onboarded: p.onboarded,
        // accounts from before the agreement existed (or before 003_terms.sql) count as accepted
        termsAccepted: !('terms_accepted_at' in p) || !!p.terms_accepted_at,
        genres: genres, genre: p.role === 'artist' ? (genres[0] || '') : (p.browse_genre || ''),
        socials: { facebook: p.facebook_url || '', instagram: p.instagram_url || '', x: p.x_url || '', tiktok: p.tiktok_url || '', youtube: p.youtube_url || '' },
        followers: d.follows.filter((f) => f.following_id === p.id).map((f) => f.follower_id),
        following: d.follows.filter((f) => f.follower_id === p.id).map((f) => f.following_id),
        coins: { silver: w ? w.silver : 0, gold: w ? w.gold : 0, green: w ? w.green : 0 }, tickets: w ? w.tickets : 0
      };
    });
    db.events = d.showday_events.map((e) => ({ id: e.id, aid: e.artist_id, tag: e.tag, title: e.title, desc: e.description || '', date: e.event_date || '', time: e.event_time ? String(e.event_time).slice(0, 5) : '', venue: e.venue || '', at: T(e.created_at) }));
    db.challenges = d.challenges.map((c) => ({ id: c.id, aid: c.artist_id, ev: c.event_id, title: c.title, desc: c.description || '', type: c.type, options: c.options || [], rt: c.reward_coin, rw: c.reward_amount, max: c.max_submissions, winner: c.winner_id, claimed: c.winner_claimed, at: T(c.created_at) }));
    db.subs = d.submissions.map((s) => ({ id: s.id, cid: s.challenge_id, uid: s.fan_id, answer: s.answer || '', file: s.media_url || null, at: T(s.created_at) }));
    db.hidden = d.hidden_challenge_cards.map((h) => ({ uid: h.user_id, cid: h.challenge_id }));
    db.votes = d.submission_votes.map((v) => ({ sid: v.submission_id, uid: v.user_id, v: v.value }));
    db.lotteries = d.lotteries.map((l) => {
      const w = d.lottery_winners.filter((x) => x.lottery_id === l.id);
      return { id: l.id, aid: l.artist_id, title: l.title, desc: l.description || '', cost: l.tickets_per_entry, winners: l.winner_count, date: l.draw_date || '', drawn: !!l.drawn_at, drawnAt: T(l.drawn_at), picked: w.map((x) => x.fan_id), claims: w.filter((x) => x.claimed_at).map((x) => x.fan_id), at: T(l.created_at) };
    });
    db.entries = d.lottery_entries.map((e) => ({ lid: e.lottery_id, uid: e.fan_id, n: e.entries, at: T(e.updated_at) }));
    db.forums = d.forum_threads.map((t) => ({ id: t.id, uid: t.author_id, title: t.title, body: t.body || '', at: T(t.created_at),
      replies: d.forum_replies.filter((r) => r.thread_id === t.id).sort((a, b) => T(a.created_at) - T(b.created_at)).map((r) => ({ uid: r.author_id, text: r.body, at: T(r.created_at) })) }));
    db.msgs = d.messages.map((m) => ({ id: m.id, from: m.sender_id, to: m.recipient_id, text: m.body, at: T(m.created_at), read: !!m.read_at }));
    db.notifs = d.notifications.map((n) => ({ id: n.id, uid: n.user_id, text: n.body, at: T(n.created_at), read: !!n.read_at, link: n.link || null }));
    this.setState({ db: db });
  }

  // ---------------------------------------------------------------- helpers
  function toast(err, ok) {
    const text = typeof err === 'string' ? err : ((err && (err.message || err.error_description)) || 'Something went wrong. Please try again.');
    clearTimeout(this._tt);
    this.setState({ toast: { text: text, cls: ok ? 'toast ok' : 'toast' } });
    this._tt = setTimeout(() => this.setState({ toast: null }), ok ? 3000 : 6000);
  }
  async function run(fn, extra) {
    try {
      const out = await fn();
      await reload.call(this);
      const ex = typeof extra === 'function' ? extra(out) : extra;
      if (ex) {
        this.setState(ex);
        if (ex.pop) { clearTimeout(this._pt); this._pt = setTimeout(() => this.setState({ pop: null }), 2900); }
      }
      return true;
    } catch (e) { toast.call(this, e); return false; }
  }
  async function upload(bucket, file) {
    const ext = ((file.name || '').split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = this.state.me + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    must(await this.sb.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false }));
    return this.sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  const rpc = function (name, args) { return this.sb.rpc(name, args).then(must); };
  const me = function () { return this.state.db.users[this.state.me]; };

  function wrap(name, live) {
    P[name] = function () { return this.live ? live.apply(this, arguments) : orig[name].apply(this, arguments); };
  }

  // remember chosen files so they can be uploaded on save
  P.suFile = function (k, e) { const f = e.target.files && e.target.files[0]; if (f) { this.files = this.files || {}; this.files['su:' + k] = f; } return orig.suFile.call(this, k, e); };
  P.mFile = function (k, e) { const f = e.target.files && e.target.files[0]; if (f) { this.files = this.files || {}; this.files['m:' + k] = f; } return orig.mFile.call(this, k, e); };
  P.ansFile = function (cid, e) { const f = e.target.files && e.target.files[0]; if (f) { this.files = this.files || {}; this.files['ans:' + cid] = f; } return orig.ansFile.call(this, cid, e); };

  // ---------------------------------------------------------------- auth
  wrap('doLogin', async function (e) {
    if (e) e.preventDefault();
    const a = this.state.auth, em = a.email.trim().toLowerCase();
    if (!em || !a.password) return this.authErr('Enter your email and password.');
    this.setState({ auth: Object.assign({}, a, { error: '', info: 'Logging in…' }) });
    const { data, error } = await this.sb.auth.signInWithPassword({ email: em, password: a.password });
    if (error) return this.authErr(/confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox for the link.' : 'That email and password don’t match an account.');
    this._recovering = false;
    afterSignIn.call(this, data.user);
  });

  wrap('doSignup', async function (e) {
    if (e) e.preventDefault();
    const a = this.state.auth, em = a.email.trim().toLowerCase(), nm = a.name.trim();
    if (!nm) return this.authErr('Add your name.');
    if (!EMAIL.test(em)) return this.authErr('Enter a valid email address.');
    if (a.password.length < 6) return this.authErr('Your password needs at least 6 characters.');
    this.setState({ auth: Object.assign({}, a, { error: '', info: 'Creating your account…' }) });
    const { data, error } = await this.sb.auth.signUp({ email: em, password: a.password, options: { data: { role: a.role, display_name: nm }, emailRedirectTo: here() } });
    if (error) return this.authErr(error.message);
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return this.authErr('An account with this email already exists. Log in instead.');
    if (data.session) { afterSignIn.call(this, data.user); return; }
    this.setState({ auth: Object.assign(this.blankAuth('login'), { email: em, info: 'Almost there! We sent a confirmation link to ' + em + '. Tap it, then log in here.' }) });
  });

  wrap('doForgot', async function (e) {
    if (e) e.preventDefault();
    const em = this.state.auth.email.trim();
    if (!EMAIL.test(em)) return this.authErr('Enter the email you signed up with.');
    const { error } = await this.sb.auth.resetPasswordForEmail(em, { redirectTo: here() });
    if (error) return this.authErr(error.message);
    this.setState({ auth: Object.assign({}, this.state.auth, { error: '', info: 'If an account exists for ' + em + ', a password reset link is on its way. Check your inbox.' }) });
  });

  P.doReset = async function (e) {
    if (e) e.preventDefault();
    const pw = this.state.auth.password;
    if (pw.length < 6) return this.authErr('Your new password needs at least 6 characters.');
    const { data, error } = await this.sb.auth.updateUser({ password: pw });
    if (error) return this.authErr(error.message);
    this._recovering = false;
    try { history.replaceState(null, '', here()); } catch (err) {}
    toast.call(this, 'Password updated. Welcome back!', true);
    afterSignIn.call(this, data.user);
  };

  wrap('logout', function () { this.sb.auth.signOut(); signedOut.call(this); });

  // ---------------------------------------------------------------- agreement
  wrap('acceptTerms', async function () {
    if (!this.state.termsOk) return;
    const uid = this.state.me;
    try {
      must(await this.sb.from('profiles').update({ terms_accepted_at: new Date().toISOString(), terms_version: this.termsVersion() }).eq('id', uid));
      await reload.call(this);
      if (this.state.setup) this.go('setup', { termsOk: false, hist: [] }); else this.enter(uid);
    } catch (e) { this.setState({ termsErr: (e && e.message) || 'Could not save your agreement. Please try again.' }); }
  });
  wrap('declineTerms', async function () {
    await this.sb.auth.signOut();
    signedOut.call(this);
    this.setState({ auth: Object.assign(this.blankAuth('login'), { info: 'You need to agree to the Terms of Use to use Collabz. Log in again whenever you\u2019re ready.' }) });
  });

  // ---------------------------------------------------------------- onboarding
  wrap('suNext', async function () {
    const s = this.state.setup, artist = s.role === 'artist', last = artist ? 3 : 1;
    if (s.step < last) return orig.suNext.call(this);
    const uid = this.state.me;
    this.setState({ setup: Object.assign({}, s, { err: '' }) });
    toast.call(this, 'Saving your profile…', true);
    const ok = await run.call(this, async () => {
      const upd = { display_name: s.name.trim(), bio: s.bio.trim(), location: s.location.trim(), facebook_url: s.facebook.trim(), instagram_url: s.instagram.trim(), x_url: s.x.trim(), tiktok_url: s.tiktok.trim(), youtube_url: s.youtube.trim(), onboarded: true };
      if (this.files['su:avatar']) upd.avatar_url = await upload.call(this, 'avatars', this.files['su:avatar']);
      if (artist && this.files['su:video']) upd.welcome_video_url = await upload.call(this, 'welcome-videos', this.files['su:video']);
      must(await this.sb.from('profiles').update(upd).eq('id', uid));
      if (artist) await rpc.call(this, 'set_my_genres', { p_genres: s.genres });
    });
    if (!ok) return;
    this.files = {};
    this.setState({ setup: null, toast: null });
    if (artist) this.openArtist(uid); else this.go('pickGenre');
  });

  wrap('pickGenre', function (g) {
    const m = me.call(this);
    if (m && m.role === 'fan') { m.genre = g; this.sb.from('profiles').update({ browse_genre: g }).eq('id', m.id).then(() => {}); }
    this.go('pickArtist', { genre: g });
  });

  // ---------------------------------------------------------------- social
  wrap('toggleFollow', function (id) {
    const m = me.call(this); if (!m || id === m.id) return;
    const following = m.following.includes(id);
    run.call(this, async () => {
      if (following) must(await this.sb.from('follows').delete().eq('follower_id', m.id).eq('following_id', id));
      else must(await this.sb.from('follows').insert({ follower_id: m.id, following_id: id }));
    });
  });

  wrap('vote', function (sid, v) {
    const uid = this.state.me;
    const cur = (this.state.db.votes || []).find((x) => x.sid === sid && x.uid === uid);
    run.call(this, async () => {
      must(await this.sb.from('submission_votes').delete().eq('submission_id', sid).eq('user_id', uid));
      if (!cur || cur.v !== v) must(await this.sb.from('submission_votes').insert({ submission_id: sid, user_id: uid, value: v }));
    });
  });

  wrap('openChat', function (id) {
    this.go('chat', { chatWith: id || null, chatText: '' });
    if (id) run.call(this, async () => { must(await this.sb.from('messages').update({ read_at: new Date().toISOString() }).eq('sender_id', id).eq('recipient_id', this.state.me).is('read_at', null)); });
  });

  wrap('sendChat', function (e) {
    if (e) e.preventDefault();
    const txt = this.state.chatText.trim(), to = this.state.chatWith;
    if (!txt || !to) return;
    this.setState({ chatText: '' });
    run.call(this, async () => { must(await this.sb.from('messages').insert({ sender_id: this.state.me, recipient_id: to, body: txt })); });
  });

  // ---------------------------------------------------------------- challenges
  wrap('submit', function (cid) {
    const s = this.state, d = s.ans[cid] || {}, c = s.db.challenges.find((x) => x.id === cid);
    if (!c) return;
    if (c.type === 'mc' ? d.choice == null : !this.files['ans:' + cid]) return;
    if (c.type !== 'mc') toast.call(this, 'Uploading your ' + c.type + '…', true);
    const ans = Object.assign({}, s.ans); delete ans[cid];
    run.call(this, async () => {
      let url = null;
      if (c.type !== 'mc') url = await upload.call(this, 'submissions', this.files['ans:' + cid]);
      await rpc.call(this, 'submit_challenge', { p_challenge_id: cid, p_answer: c.type === 'mc' ? c.options[d.choice] : null, p_media_url: url });
      delete this.files['ans:' + cid];
    }, { ans: ans, toast: null, pop: this.mkPop(c.rt, '+' + c.rw, 'Reward earned!', this.plural(c.rw, c.rt + ' coin', c.rt + ' coins') + ' for taking part in "' + c.title + '"') });
  });

  wrap('cancelSub', function (subId) {
    const sub = this.state.db.subs.find((x) => x.id === subId);
    if (!sub) return this.setState({ modal: null });
    run.call(this, () => rpc.call(this, 'cancel_submission', { p_challenge_id: sub.cid }), { modal: null });
  });

  wrap('claim', function (cid) {
    const c = this.state.db.challenges.find((x) => x.id === cid); if (!c) return;
    run.call(this, () => rpc.call(this, 'claim_challenge_prize', { p_challenge_id: cid }), { pop: this.mkPop('green', '+1', 'You won!', 'A green coin for winning "' + c.title + '"') });
  });

  wrap('hideCard', function (cid) {
    run.call(this, async () => { must(await this.sb.from('hidden_challenge_cards').insert({ user_id: this.state.me, challenge_id: cid })); }, { open: null });
  });

  wrap('pickWinner', function (cid, uid) { run.call(this, () => rpc.call(this, 'pick_winner', { p_challenge_id: cid, p_fan_id: uid })); });
  wrap('unpickWinner', function (cid) { run.call(this, () => rpc.call(this, 'clear_winner', { p_challenge_id: cid })); });

  // ---------------------------------------------------------------- lottery
  wrap('enterLottery', function (lid) {
    const l = this.state.db.lotteries.find((x) => x.id === lid); if (!l) return;
    run.call(this, () => rpc.call(this, 'enter_lottery', { p_lottery_id: lid }), (n) => ({
      pop: this.mkPop('ticket', 'Entry #' + n, 'You’re in the draw!', 'You now have ' + this.plural(n, 'entry', 'entries') + ' for "' + l.title + '". More entries, better odds.')
    }));
  });
  wrap('draw', function (lid) { run.call(this, () => rpc.call(this, 'draw_lottery', { p_lottery_id: lid })); });
  wrap('claimLottery', function (lid) {
    const l = this.state.db.lotteries.find((x) => x.id === lid); if (!l) return;
    run.call(this, () => rpc.call(this, 'claim_lottery_prize', { p_lottery_id: lid }), { pop: this.mkPop('green', '+1', 'Lottery winner!', 'Watch your inbox: management will email you how to claim "' + l.title + '".') });
  });

  // ---------------------------------------------------------------- create / edit / delete
  wrap('saveCh', function () {
    const m = this.state.modal;
    const opts = [m.o0, m.o1, m.o2, m.o3].map((x) => (x || '').trim()).filter(Boolean);
    const rw = parseInt(m.rw, 10), max = parseInt(m.max, 10);
    if (!m.title.trim()) return this.setM('err', 'Give the challenge a title.');
    if (m.type === 'mc' && opts.length < 2) return this.setM('err', 'Add at least two answer options.');
    if (!(rw >= 1)) return this.setM('err', 'The reward needs to be at least 1 coin.');
    if (!(max >= 1)) return this.setM('err', 'Allow at least 1 submission.');
    const row = { title: m.title.trim(), description: m.desc.trim(), type: m.type, options: m.type === 'mc' ? opts : [], reward_coin: m.rt, reward_amount: rw, max_submissions: max };
    run.call(this, async () => {
      if (m.id) must(await this.sb.from('challenges').update(row).eq('id', m.id));
      else must(await this.sb.from('challenges').insert(Object.assign({ artist_id: this.state.me, event_id: m.ev || null }, row)));
    }, { modal: null });
  });

  wrap('saveEv', function () {
    const m = this.state.modal;
    if (!m.title.trim()) return this.setM('err', 'Give the event a name.');
    if (!m.date) return this.setM('err', 'Add the date of the show.');
    const row = { tag: m.tag, title: m.title.trim(), description: m.desc.trim(), event_date: m.date, event_time: m.time || null, venue: m.venue.trim() };
    run.call(this, async () => {
      if (m.id) must(await this.sb.from('showday_events').update(row).eq('id', m.id));
      else must(await this.sb.from('showday_events').insert(Object.assign({ artist_id: this.state.me }, row)));
    }, { modal: null });
  });

  wrap('saveLt', function () {
    const m = this.state.modal, cost = parseInt(m.cost, 10), w = parseInt(m.winners, 10);
    if (!m.title.trim()) return this.setM('err', 'Describe the experience fans can win.');
    if (!(cost >= 1)) return this.setM('err', 'Each entry needs to cost at least 1 ticket.');
    if (!(w >= 1)) return this.setM('err', 'There needs to be at least 1 winner.');
    const row = { title: m.title.trim(), description: m.desc.trim(), tickets_per_entry: cost, winner_count: w, draw_date: m.date || null };
    run.call(this, async () => {
      if (m.id) must(await this.sb.from('lotteries').update(row).eq('id', m.id));
      else must(await this.sb.from('lotteries').insert(Object.assign({ artist_id: this.state.me }, row)));
    }, { modal: null });
  });

  wrap('doConfirm', function () {
    const m = this.state.modal, id = m.arg;
    if (m.action === 'cancelSub') return this.cancelSub(id);
    const table = { delCh: 'challenges', delEv: 'showday_events', delLt: 'lotteries' }[m.action];
    if (!table) return this.setState({ modal: null });
    run.call(this, async () => { must(await this.sb.from(table).delete().eq('id', id)); }, { modal: null, open: null });
  });

  wrap('saveEdit', function () {
    const m = this.state.modal, uid = this.state.me, u = me.call(this), em = m.email.trim().toLowerCase();
    if (!m.name.trim()) return this.setM('err', 'Your name can’t be empty.');
    if (!EMAIL.test(em)) return this.setM('err', 'Enter a valid email address.');
    if (u.role === 'artist' && !(m.genres || []).length) return this.setM('err', 'Choose at least one genre.');
    toast.call(this, 'Saving…', true);
    run.call(this, async () => {
      const upd = { display_name: m.name.trim(), bio: m.bio.trim(), location: m.location.trim(), facebook_url: m.facebook.trim(), instagram_url: m.instagram.trim(), x_url: m.x.trim(), tiktok_url: m.tiktok.trim(), youtube_url: m.youtube.trim() };
      if (this.files['m:avatar']) upd.avatar_url = await upload.call(this, 'avatars', this.files['m:avatar']);
      if (u.role === 'artist') {
        upd.theme = m.theme;
        if (this.files['m:video']) upd.welcome_video_url = await upload.call(this, 'welcome-videos', this.files['m:video']);
      }
      must(await this.sb.from('profiles').update(upd).eq('id', uid));
      if (u.role === 'artist') await rpc.call(this, 'set_my_genres', { p_genres: m.genres });
      delete this.files['m:avatar']; delete this.files['m:video'];
      if (em !== (u.email || '').toLowerCase()) {
        must(await this.sb.auth.updateUser({ email: em }, { emailRedirectTo: here() }));
        return 'email';
      }
    }, (out) => (out === 'email'
      ? { modal: null, toast: { text: 'Saved. Check ' + em + ' to confirm your new email address.', cls: 'toast ok' } }
      : { modal: null, toast: null }));
  });

  wrap('deleteAccount', async function () {
    if ((this.state.modal.typed || '').trim() !== 'DELETE') return;
    try {
      await rpc.call(this, 'delete_my_account', {});
      await this.sb.auth.signOut();
      signedOut.call(this);
      toast.call(this, 'Your account has been deleted.', true);
    } catch (e) { toast.call(this, e); }
  });

  // ---------------------------------------------------------------- community
  wrap('postTopic', function (e) {
    if (e) e.preventDefault();
    const d = this.state.forumDraft || {};
    if (!(d.title || '').trim()) { this.setState({ forumDraft: Object.assign({}, d, { err: 'Add a title for your topic.' }) }); return; }
    run.call(this, async () => {
      const row = must(await this.sb.from('forum_threads').insert({ author_id: this.state.me, title: d.title.trim(), body: (d.body || '').trim() }).select('id').single());
      return row.id;
    }, (id) => ({ forumDraft: null, forumOpen: id }));
  });

  wrap('sendReply', function (fid, e) {
    if (e) e.preventDefault();
    const txt = this.state.reply.trim(); if (!txt) return;
    this.setState({ reply: '' });
    run.call(this, async () => { must(await this.sb.from('forum_replies').insert({ thread_id: fid, author_id: this.state.me, body: txt })); });
  });

  // ---------------------------------------------------------------- render hook
  P.renderVals = function () {
    const v = orig.renderVals.call(this);
    v.demoMode = !this.live;
    v.toast = this.state.toast || { text: '', cls: 'toast' };
    v.hasToast = !!this.state.toast;
    v.loading = this.state.screen === 'loading';
    v.auth.isReset = this.state.auth.mode === 'reset';
    v.doReset = (e) => this.doReset(e);
    if (v.loading) {
      v.scr = { terms: false, search: false, auth: false, setup: false, genre: false, artists: false, artist: false, profile: false, chat: false };
      v.showHeader = false;
      v.cm = { show: false };
      v.md = { show: false };
    }
    if (this.live) {
      const uid = this.state.me;
      v.openNotifs = () => {
        const fresh = this.state.db.notifs.filter((n) => n.uid === uid && !n.read).map((n) => n.id);
        this.setState({ modal: { kind: 'notifs', fresh: fresh } });
        if (fresh.length) run.call(this, async () => { must(await this.sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null)); });
      };
      if (v.ap && v.ap.uploadVideo) {
        v.ap.uploadVideo = (e) => {
          const f = e.target.files && e.target.files[0]; if (!f) return;
          toast.call(this, 'Uploading your welcome video…', true);
          run.call(this, async () => {
            const url = await upload.call(this, 'welcome-videos', f);
            must(await this.sb.from('profiles').update({ welcome_video_url: url }).eq('id', uid));
          }, { toast: null });
        };
      }
    }
    return v;
  };
})();

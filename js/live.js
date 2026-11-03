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
   'saveCh', 'saveEv', 'saveLt', 'doConfirm', 'saveEdit', 'deleteAccount', 'postTopic', 'sendReply', 'suFile', 'mFile', 'ansFile', 'vote', 'acceptTerms', 'declineTerms', 'saveGm', 'gStart', 'gWin', 'gradeTrivia', 'gradeQuiz', 'pickGameWinner', 'unpickGameWinner', 'claimGamePrize',
   'electOption', 'castLiveVote', 'addManager', 'removeManager', 'createInvite', 'setInviteActive', 'saveSurvey', 'awardBadge', 'revokeBadge', 'giveConsent', 'setAuth']
    .forEach((k) => { orig[k] = P[k]; });

  const TABLES = ['profiles', 'artist_genres', 'follows', 'wallets', 'showday_events', 'challenges', 'submissions',
    'hidden_challenge_cards', 'lotteries', 'lottery_entries', 'lottery_winners', 'forum_threads', 'forum_replies', 'messages', 'notifications', 'submission_votes',
    'games', 'game_questions', 'game_answers', 'game_plays', 'game_prize_winners',
    'creator_managers', 'badges', 'guest_votes', 'invite_codes', 'app_admins', 'app_settings'];
  // tables added by later SQL files: the app still works (without that feature) until they are run
  const OPTIONAL = ['submission_votes', 'games', 'game_questions', 'game_answers', 'game_plays', 'game_prize_winners',
    'creator_managers', 'badges', 'guest_votes', 'invite_codes', 'app_admins', 'app_settings'];
  const emptyDb = () => ({ users: {}, challenges: [], events: [], lotteries: [], subs: [], entries: [], hidden: [], votes: [], forums: [], msgs: [], notifs: [], games: [], gplays: [],
    managers: [], badges: [], guestVotes: [], invites: [], admins: [], voteRewards: [], flags: {}, pending: [] });
  const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
  const NEED8 = 'This needs the pilot database update. Run supabase/008_st_ate_of_jazz_pilot.sql in Supabase first.';
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
    if (this.props.pub) { publicBoot.call(this, this.props.pub); return; }
    this.setState({ screen: 'loading', db: emptyDb(), me: null });
    loadSignupInfo.call(this, this.props.invite || '');
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

  // ---------------------------------------------------------------- public pages (no login needed)
  function mapLv(r) {
    return {
      c: { id: r.id, title: r.title, desc: r.description || '', type: r.type, options: r.options || [], imgs: r.option_images || [], audio: r.option_audio || [],
        opens: r.opens_at ? T(r.opens_at) : null, closes: r.closes_at ? T(r.closes_at) : null, guest: !!r.allow_guest, elected: r.elected_option || null },
      artist: { id: r.artist_id, name: r.artist_name, avatar: r.artist_avatar, theme: r.theme },
      rows: (r.tally || []).map((t, i) => ({ label: t.option, i: i, n: t.count })), total: r.total || 0, guests: r.guests || 0
    };
  }
  async function pollVote(id) {
    try {
      const r = await rpc.call(this, 'live_vote_info', { p_challenge_id: id });
      if (r && r.now) this._skew = T(r.now) - Date.now();
      this.setState({ lv: mapLv(r), lvErr: null });
    } catch (e) { if (!this.state.lv) this.setState({ lvErr: (e && e.message) || 'This vote was not found.' }); }
  }
  function publicBoot(pub) {
    this.setState({ screen: pub.kind, pub: pub, db: emptyDb(), me: null });
    if (pub.kind === 'vote' || pub.kind === 'stage') {
      pollVote.call(this, pub.id);
      this._poll = setInterval(() => { if (!document.hidden) pollVote.call(this, pub.id); }, pub.kind === 'stage' ? 2000 : 4000);
      if (pub.kind === 'vote') {
        // Logged in already (same browser)? Then the vote counts as a normal fan vote and earns coins.
        this.sb.auth.getSession().then(async ({ data }) => {
          const u = data && data.session && data.session.user; if (!u) return;
          const p = must(await this.sb.from('profiles').select('id, role, display_name').eq('id', u.id).single());
          const mine = must(await this.sb.from('submissions').select('answer').eq('challenge_id', pub.id).eq('fan_id', u.id));
          this.setState({ voteMe: { id: p.id, role: p.role, name: p.display_name }, voteMine: mine && mine[0] ? mine[0].answer : '' });
        }).catch(() => {});
      }
    }
    if (pub.kind === 'consent') rpc.call(this, 'consent_info', { p_token: pub.id }).then((r) => this.setState({ csInfo: r || null }), () => this.setState({ csInfo: null }));
    if (pub.kind === 'credits') rpc.call(this, 'liner_notes', { p_artist: pub.id }).then((r) => this.setState({ pcNotes: mapNotes(r) }), (e) => this.setState({ pcErr: (e && e.message) || 'Not found' }));
  }
  function mapNotes(r) {
    return { artist: r.artist, producers: r.producers || [], results: r.results || [], coproducers: r.coproducers || [], contributors: r.contributors || [], guestVotes: r.guest_votes || 0 };
  }
  // Invite-only setting and invite details for the sign-up form
  async function loadSignupInfo(code) {
    try {
      const r = await rpc.call(this, 'signup_settings', { p_code: code || null });
      this.setState({ signupInfo: { inviteOnly: !!r.invite_only, code: (code || '').toUpperCase(), artistName: r.artist_name || '', codeError: r.code_error || '' } });
      return r;
    } catch (e) { return null; }   // 008 not run yet
  }

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
    ['messages', 'notifications', 'submissions', 'submission_votes', 'challenges', 'lottery_winners', 'lottery_entries', 'forum_threads', 'forum_replies', 'follows', 'showday_events', 'lotteries', 'wallets', 'games', 'game_plays', 'game_prize_winners',
     'guest_votes', 'badges', 'creator_managers', 'invite_codes']
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
      if (OPTIONAL.includes(t) && res[i].error) { d[t] = []; return; }
      d[t] = must(res[i]) || [];
    });
    const db = emptyDb();
    this.v8 = !res[TABLES.indexOf('creator_managers')].error;
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
        coins: { silver: w ? w.silver : 0, gold: w ? w.gold : 0, green: w ? w.green : 0 }, tickets: w ? w.tickets : 0,
        banner: p.banner_url || '', survey: p.survey_url || '', restricted: !!p.restricted
      };
    });
    db.events = d.showday_events.map((e) => ({ id: e.id, aid: e.artist_id, tag: e.tag, title: e.title, desc: e.description || '', date: e.event_date || '', time: e.event_time ? String(e.event_time).slice(0, 5) : '', venue: e.venue || '', at: T(e.created_at) }));
    db.challenges = d.challenges.map((c) => ({ id: c.id, aid: c.artist_id, ev: c.event_id, title: c.title, desc: c.description || '', type: c.type, options: c.options || [], imgs: c.option_images || [], thumb: c.thumbnail_url || '', rt: c.reward_coin, rw: c.reward_amount, max: c.max_submissions, winner: c.winner_id, claimed: c.winner_claimed, at: T(c.created_at),
      audio: c.option_audio || [], opens: c.opens_at ? T(c.opens_at) : null, closes: c.closes_at ? T(c.closes_at) : null, guest: !!c.allow_guest, elected: c.elected_option || null, electedAt: c.elected_at ? T(c.elected_at) : null }));
    db.subs = d.submissions.map((s) => ({ id: s.id, cid: s.challenge_id, uid: s.fan_id, answer: s.answer || '', file: s.media_url || null, at: T(s.created_at), hash: s.media_hash || null, dup: s.duplicate_of || null }));
    db.managers = d.creator_managers.map((m) => ({ aid: m.artist_id, mid: m.manager_id, at: T(m.added_at) }));
    db.badges = d.badges.map((b) => ({ uid: b.user_id, aid: b.artist_id, label: b.label, at: T(b.awarded_at) }));
    db.guestVotes = d.guest_votes.map((g) => ({ cid: g.challenge_id, answer: g.answer, at: T(g.created_at) }));
    db.invites = d.invite_codes.map((i) => ({ code: i.code, aid: i.artist_id, label: i.label || '', max: i.max_uses, uses: i.uses, exp: i.expires_at ? T(i.expires_at) : null, active: i.active, at: T(i.created_at) }));
    db.admins = d.app_admins.map((a) => a.user_id);
    db.flags = { inviteOnly: d.app_settings.some((x) => x.key === 'invite_only' && (x.value === true || x.value === 'true')) };
    const myId = this.state.me;
    if (this.v8 && myId && db.admins.includes(myId)) {
      try { db.pending = ((await sb.rpc('pending_parent_consents')).data || []).map((r) => ({ id: r.user_id, name: r.display_name, email: r.email || '', parentEmail: r.parent_email || '', token: r.consent_token, at: T(r.created_at) })); } catch (e) { db.pending = []; }
    }
    if (this.v8 && myId && db.users[myId] && db.users[myId].restricted) {
      try { const st = (await sb.rpc('my_age_status')).data; if (st) db.users[myId].parentEmail = st.parent_email || ''; } catch (e) {}
    }
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
    db.games = d.games.map((g) => {
      const qs = d.game_questions.filter((q) => q.game_id === g.id).sort((a, b) => a.position - b.position).map((q) => {
        const a = d.game_answers.find((x) => x.question_id === q.id);   // only the game's artist can see answers
        return { id: q.id, q: q.question, opts: q.options || [], ans: a ? a.correct : null };
      });
      const w = d.game_prize_winners.filter((x) => x.game_id === g.id).sort((a, b) => T(a.picked_at) - T(b.picked_at));
      return { id: g.id, aid: g.artist_id, kind: g.kind, variant: g.variant, title: g.title, desc: g.description || '', img: g.image_url || '',
        size: g.puzzle_size, secs: g.seconds_per_q, pass: g.pass_mark, target: g.target, qs: qs,
        prize: { type: g.prize_type, amount: g.prize_amount, text: g.prize_text || '', img: g.prize_image_url || '' }, winners: g.winner_count,
        picked: w.map((x) => x.fan_id), claims: w.filter((x) => x.claimed_at).map((x) => x.fan_id), at: T(g.created_at) };
    });
    db.gplays = d.game_plays.map((p) => ({ gid: p.game_id, uid: p.fan_id, plays: p.plays, won: p.won, best: p.best_score, wonAt: T(p.won_at), at: T(p.last_played_at) }));
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
    const chk = this.signupCheck(a); if (chk) return this.authErr(chk);
    const code = (a.invite || '').trim().toUpperCase();
    this.setState({ auth: Object.assign({}, a, { error: '', info: 'Creating your account…' }) });
    const st = await loadSignupInfo.call(this, code);
    if (st && st.invite_only && !code) return this.authErr('Collabz is invite-only during the pilot. Enter the invite code from your invitation.');
    if (st && code && st.code_error) return this.authErr(st.code_error);
    const kid = this.ageOf(a.dob) < 13;
    const meta = { role: a.role, display_name: nm, birth_date: a.dob };
    if (kid) meta.parent_email = (a.parent || '').trim().toLowerCase();
    if (code) meta.invite_code = code;
    const { data, error } = await this.sb.auth.signUp({ email: em, password: a.password, options: { data: meta, emailRedirectTo: here() } });
    if (error) return this.authErr(/database error/i.test(error.message) ? 'We couldn\u2019t create your account. Check your invite code and date of birth, then try again.' : error.message);
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
    // With 008: one server call that also pays 1 silver coin for the first vote on each entry
    if (this.v8) return run.call(this, () => rpc.call(this, 'cast_vote', { p_submission_id: sid, p_value: v }), (out) => { if (out && out.coins) setTimeout(() => this.flash('+1 silver coin for voting'), 0); return null; });
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
    const media = this.hasMedia(c);
    if (media ? !this.files['ans:' + cid] : !this.ansReady(c, d)) return;
    if (media) toast.call(this, 'Uploading your ' + c.type + '…', true);
    const ans = Object.assign({}, s.ans); delete ans[cid];
    run.call(this, async () => {
      let url = null;
      if (media) url = await upload.call(this, 'submissions', this.files['ans:' + cid]);
      const args = { p_challenge_id: cid, p_answer: media ? null : this.ansValue(c, d), p_media_url: url };
      if (this.v8 && media && d.hash) args.p_media_hash = d.hash;   // exact-duplicate image check
      await rpc.call(this, 'submit_challenge', args);
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
    const m = this.state.modal, mo = this.mcOptions(m), opts = mo.labels, choice = m.type === 'mc' || m.type === 'listen';
    const err = this.chErr(m, mo); if (err) return this.setM('err', err);
    if (!this.v8 && (m.type === 'listen' || m.opens || m.closes || m.guest)) return this.setM('err', 'Listen and vote, voting windows and QR voting need the pilot database update (supabase/008_st_ate_of_jazz_pilot.sql).');
    const rw = parseInt(m.rw, 10), max = parseInt(m.max, 10);
    const row = { title: m.title.trim(), description: m.desc.trim(), type: m.type, options: choice ? opts : [], reward_coin: m.rt, reward_amount: rw, max_submissions: max };
    if (this.v8) Object.assign(row, { opens_at: iso(this.fromLocal(m.opens)), closes_at: iso(this.fromLocal(m.closes)), allow_guest: choice && !!m.guest });
    const withImgs = m.type === 'mc' && mo.imgs.some(Boolean), listen = m.type === 'listen';
    const old = m.id ? (this.state.db.challenges.find((x) => x.id === m.id) || {}) : {};
    const newThumb = (m.thumb || '').startsWith('blob:') && this.files['m:thumb'];
    const newAudio = listen && mo.slots.some((i) => (m['a' + i] || '').startsWith('blob:'));
    if (withImgs || newThumb || newAudio) toast.call(this, newAudio ? 'Uploading audio clips…' : 'Uploading images…', true);
    const owner = m.id ? old.aid : this.actor();
    run.call(this, async () => {
      if (withImgs) {
        const urls = [];
        for (let k = 0; k < mo.slots.length; k++) {
          const i = mo.slots[k], v = m['i' + i] || '', f = this.files['m:i' + i];
          urls.push(v.startsWith('blob:') && f ? await upload.call(this, 'submissions', f) : v);
        }
        row.option_images = urls;
      } else if (m.id && (old.imgs || []).length) row.option_images = [];
      if (listen) {
        const urls = [];
        for (let k = 0; k < mo.slots.length; k++) {
          const i = mo.slots[k], v = m['a' + i] || '', f = this.files['m:a' + i];
          urls.push(v.startsWith('blob:') && f ? await upload.call(this, 'submissions', f) : v);
        }
        row.option_audio = urls;
      } else if (this.v8 && m.id && (old.audio || []).length) row.option_audio = [];
      // thumbnail_url is only sent when used, so the app keeps working before 006_challenge_thumbnail.sql is run
      if (newThumb) { row.thumbnail_url = await upload.call(this, 'submissions', this.files['m:thumb']); delete this.files['m:thumb']; }
      else if (m.thumb) row.thumbnail_url = m.thumb;
      else if (old.thumb) row.thumbnail_url = '';
      [0, 1, 2, 3].forEach((i) => { delete this.files['m:a' + i]; });
      if (m.id) must(await this.sb.from('challenges').update(row).eq('id', m.id));
      else must(await this.sb.from('challenges').insert(Object.assign({ artist_id: owner, event_id: m.ev || null }, row)));
    }, { modal: null, toast: null });
  });

  // ---------------------------------------------------------------- games
  wrap('saveGm', function () {
    const m = this.state.modal, d = this.gmData(m);
    if (typeof d === 'string') return this.setM('err', d);
    const needsUpload = (v, k) => (v || '').startsWith('blob:') && this.files['m:' + k];
    if (needsUpload(m.img, 'img') || needsUpload(m.pimg, 'pimg')) toast.call(this, 'Uploading images…', true);
    run.call(this, async () => {
      const img = needsUpload(d.img, 'img') ? await upload.call(this, 'submissions', this.files['m:img']) : d.img;
      const pimg = needsUpload(d.prize.img, 'pimg') ? await upload.call(this, 'submissions', this.files['m:pimg']) : d.prize.img;
      const row = { variant: d.variant, title: d.title, description: d.desc, image_url: img || '', puzzle_size: d.size, seconds_per_q: d.secs, pass_mark: d.pass, target: d.target,
        prize_type: d.prize.type, prize_amount: d.prize.amount, prize_text: d.prize.text, prize_image_url: pimg || '', winner_count: d.winners };
      let id = m.id;
      if (id) must(await this.sb.from('games').update(row).eq('id', id));
      else id = must(await this.sb.from('games').insert(Object.assign({ artist_id: this.actor(), kind: d.kind }, row)).select('id').single()).id;
      if (d.kind === 'trivia' || d.kind === 'quiz') await rpc.call(this, 'save_game_questions', { p_game: id, p_questions: d.qs.map((q) => ({ q: q.q, opts: q.opts, ans: q.ans })) });
      delete this.files['m:img']; delete this.files['m:pimg'];
    }, { modal: null, toast: null });
  });
  // These return promises the game player waits on
  wrap('gStart', function (g) { return rpc.call(this, 'start_game', { p_game: g.id }).then(() => { reload.call(this).catch(() => {}); }); });
  wrap('gWin', function (g, score) {
    const done = () => reload.call(this).catch(() => {});
    if (g.kind === 'trivia' || g.kind === 'quiz') return done();   // graded and recorded by the server
    return rpc.call(this, 'finish_game', { p_game: g.id, p_score: score }).then(done, (e) => toast.call(this, e));
  });
  wrap('gradeTrivia', function (g, i, choice) { return rpc.call(this, 'answer_trivia', { p_game: g.id, p_choice: choice }).then((r) => ({ correct: !!(r && r.correct) })); });
  wrap('gradeQuiz', function (g, answers) { return rpc.call(this, 'submit_quiz', { p_game: g.id, p_answers: answers }).then((r) => ({ score: r.score, won: !!r.won })); });
  wrap('pickGameWinner', function (gid, uid) { run.call(this, () => rpc.call(this, 'pick_game_winner', { p_game: gid, p_fan: uid })); });
  wrap('unpickGameWinner', function (gid, uid) { run.call(this, () => rpc.call(this, 'unpick_game_winner', { p_game: gid, p_fan: uid })); });
  wrap('claimGamePrize', function (gid) {
    const g = (this.state.db.games || []).find((x) => x.id === gid); if (!g) return;
    run.call(this, () => rpc.call(this, 'claim_game_prize', { p_game: gid }), { pop: this.gamePop(g) });
  });

  wrap('saveEv', function () {
    const m = this.state.modal;
    if (!m.title.trim()) return this.setM('err', 'Give the event a name.');
    if (!m.date) return this.setM('err', 'Add the date of the show.');
    const row = { tag: m.tag, title: m.title.trim(), description: m.desc.trim(), event_date: m.date, event_time: m.time || null, venue: m.venue.trim() };
    run.call(this, async () => {
      if (m.id) must(await this.sb.from('showday_events').update(row).eq('id', m.id));
      else must(await this.sb.from('showday_events').insert(Object.assign({ artist_id: this.actor() }, row)));
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
      else must(await this.sb.from('lotteries').insert(Object.assign({ artist_id: this.actor() }, row)));
    }, { modal: null });
  });

  wrap('doConfirm', function () {
    const m = this.state.modal, id = m.arg;
    if (m.action === 'cancelSub') return this.cancelSub(id);
    if (m.action === 'elect') return this.electOption(id, m.opt);
    if (m.action === 'rmMgr') return this.removeManager(id);
    const table = { delCh: 'challenges', delEv: 'showday_events', delLt: 'lotteries', delGm: 'games' }[m.action];
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
        if (this.v8) {
          if ((m.banner || '').startsWith('blob:') && this.files['m:banner']) upd.banner_url = await upload.call(this, 'avatars', this.files['m:banner']);
          else if (!m.banner && u.banner) upd.banner_url = null;
        }
      }
      must(await this.sb.from('profiles').update(upd).eq('id', uid));
      if (u.role === 'artist') await rpc.call(this, 'set_my_genres', { p_genres: m.genres });
      delete this.files['m:avatar']; delete this.files['m:video']; delete this.files['m:banner'];
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

  // ---------------------------------------------------------------- St-ate of Jazz pilot
  const need8 = function () { if (this.v8) return true; toast.call(this, NEED8); return false; };
  wrap('electOption', function (cid, label) {
    if (!need8.call(this)) return;
    run.call(this, () => rpc.call(this, 'elect_option', { p_challenge_id: cid, p_option: label }), { modal: null });
  });
  wrap('addManager', function () {
    if (!need8.call(this)) return;
    const em = ((this.state.pv || {}).mEmail || '').trim();
    if (!EMAIL.test(em)) return this.setPv({ err: 'Enter the email address they signed up with.' });
    run.call(this, () => rpc.call(this, 'add_manager', { p_artist: this.state.viewing, p_email: em }), () => {
      setTimeout(() => this.flash('Manager added.'), 0);
      return { pv: Object.assign({}, this.state.pv, { mEmail: '', err: '' }) };
    });
  });
  wrap('removeManager', function (mid) {
    const A = this.state.viewing, self = mid === this.state.me;
    run.call(this, () => rpc.call(this, 'remove_manager', { p_artist: A, p_manager: mid }), () => {
      if (self) setTimeout(() => this.openArtist(A, 'challenges'), 0);
      return { modal: null };
    });
  });
  wrap('createInvite', function () {
    if (!need8.call(this)) return;
    const d = this.state.pv || {}, max = parseInt(d.iMax || '40', 10), days = parseInt(d.iDays || '30', 10);
    if (!(max >= 1 && max <= 1000)) return this.setPv({ err: 'An invite can be used 1 to 1000 times.' });
    run.call(this, () => rpc.call(this, 'create_invite', { p_artist: this.state.viewing, p_label: (d.iLabel || '').trim(), p_max_uses: max, p_days: days >= 0 ? days : 30 }), (code) => {
      setTimeout(() => this.flash('Invite link created: ' + code), 0);
      return { pv: Object.assign({}, this.state.pv, { iLabel: '', err: '' }) };
    });
  });
  wrap('setInviteActive', function (code, on) { run.call(this, () => rpc.call(this, 'set_invite_active', { p_code: code, p_active: on })); });
  wrap('saveSurvey', function () {
    if (!need8.call(this)) return;
    const url = ((this.state.pv || {}).survey || '').trim();
    if (url && !/^https:\/\/\S+$/i.test(url)) return this.setPv({ err: 'The survey link needs to start with https://' });
    run.call(this, () => rpc.call(this, 'set_survey_url', { p_artist: this.state.viewing, p_url: url }), () => {
      setTimeout(() => this.flash(url ? 'Survey link saved. Fans see it on your page.' : 'Survey link removed.'), 0);
      return { pv: Object.assign({}, this.state.pv, { survey: undefined, err: '' }) };
    });
  });
  wrap('awardBadge', function (uid) { if (need8.call(this)) run.call(this, () => rpc.call(this, 'award_badge', { p_artist: this.state.viewing, p_fan: uid, p_label: this.badgeLabel(this.state.viewing) })); });
  wrap('revokeBadge', function (uid) { if (need8.call(this)) run.call(this, () => rpc.call(this, 'revoke_badge', { p_artist: this.state.viewing, p_fan: uid })); });
  // QR vote page: logged-in fans vote normally (and earn coins); everyone else votes as a guest, one vote per phone
  wrap('castLiveVote', async function () {
    const s = this.state, L = this.liveInfo((s.pub || {}).id), a = s.vpick;
    if (!L) return;
    if (!a) return this.setState({ verr: 'Pick an option first.' });
    this.setState({ vbusy: true, verr: '' });
    try {
      if (s.voteMe && s.voteMe.role === 'fan') {
        await rpc.call(this, 'submit_challenge', { p_challenge_id: L.c.id, p_answer: a });
        this.setState({ voteMine: a });
        this.flash('Vote counted. Coins added to your wallet.');
        await pollVote.call(this, L.c.id);
      } else {
        const r = await rpc.call(this, 'guest_vote', { p_challenge_id: L.c.id, p_device: this.deviceId(), p_answer: a });
        this.rememberGuestVote(L.c.id, a);
        this.setState({ lv: mapLv(r) });
      }
      this.setState({ vpick: null, vbusy: false });
    } catch (e) {
      const msg = (e && e.message) || 'Your vote didn\u2019t go through. Try again.';
      if (/already/.test(msg)) this.rememberGuestVote(L.c.id, 'your earlier choice');
      this.setState({ verr: msg, vbusy: false });
    }
  });
  wrap('giveConsent', async function () {
    const d = this.state.cs || {}, tok = (this.state.pub || {}).id;
    if ((d.name || '').trim().length < 2) return this.setState({ cs: Object.assign({}, d, { err: 'Type your full name to give consent.' }) });
    if (!d.agree) return this.setState({ cs: Object.assign({}, d, { err: 'Tick the box to confirm.' }) });
    try {
      const r = await rpc.call(this, 'give_parent_consent', { p_token: tok, p_parent_name: d.name.trim() });
      this.setState({ csInfo: r, cs: Object.assign({}, d, { err: '', done: true }) });
    } catch (e) { this.setState({ cs: Object.assign({}, d, { err: (e && e.message) || 'Something went wrong. Please try again.' }) }); }
  });
  // Look up the invite (who it's from) shortly after the code is typed
  wrap('setAuth', function (k, v) {
    orig.setAuth.call(this, k, v);
    if (k === 'invite') { clearTimeout(this._invT); this._invT = setTimeout(() => loadSignupInfo.call(this, v), 500); }
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

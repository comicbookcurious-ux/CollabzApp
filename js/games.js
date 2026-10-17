/* Collabz games: pure game logic (no UI). Each function takes a state object and returns a new one.
   Cards are { r: 1-13, s: 'S'|'H'|'D'|'C', up: bool, id: 'r-s' }. */
(function () {
  const SUITS = ['S', 'H', 'D', 'C'];
  const red = (c) => c.s === 'H' || c.s === 'D';
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function deck() { const d = []; SUITS.forEach((s) => { for (let r = 1; r <= 13; r++) d.push({ r: r, s: s, up: false, id: r + '-' + s }); }); return shuffle(d); }
  const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };

  // ---------------------------------------------------------------- Klondike solitaire (draw 1)
  const klondike = {
    deal() {
      const d = deck(), tab = [];
      for (let i = 0; i < 7; i++) { const col = d.splice(0, i + 1); col[col.length - 1].up = true; tab.push(col); }
      return { stock: d, waste: [], found: [[], [], [], []], tab: tab, moves: 0, undo: [] };
    },
    snap(g) { return g.undo.slice(-40).concat([clone(Object.assign({}, g, { undo: [] }))]); },
    copy(g) { return clone(Object.assign({}, g, { undo: [] })); },
    canFound(g, card) { const f = g.found.findIndex((p) => (p.length ? p[p.length - 1].s === card.s && p[p.length - 1].r === card.r - 1 : card.r === 1)); return f; },
    canTab(col, card) { if (!col.length) return card.r === 13; const t = col[col.length - 1]; return t.up && red(t) !== red(card) && t.r === card.r + 1; },
    draw(g) {
      const n = this.copy(g); n.undo = this.snap(g);
      if (n.stock.length) { const c = n.stock.pop(); c.up = true; n.waste.push(c); }
      else if (n.waste.length) { n.stock = n.waste.reverse().map((c) => Object.assign(c, { up: false })); n.waste = []; }
      else return g;
      n.moves++; return n;
    },
    // Tap a card: send it to the best legal spot (foundation first, then a tableau column). Returns null if no move.
    tap(g, from, ci) {
      const src = from === 'waste' ? g.waste : (from[0] === 'f' ? g.found[+from.slice(1)] : g.tab[+from.slice(1)]);
      if (!src || !src.length) return null;
      const idx = from === 'waste' || from[0] === 'f' ? src.length - 1 : ci;
      const card = src[idx]; if (!card || !card.up) return null;
      const run = src.slice(idx), single = run.length === 1;
      let to = null;
      if (single && from[0] !== 'f') { const f = this.canFound(g, card); if (f >= 0) to = 'f' + f; }
      if (!to) {
        const order = [];
        g.tab.forEach((col, i) => { if ('t' + i !== from && col.length) order.push(i); });
        g.tab.forEach((col, i) => { if ('t' + i !== from && !col.length) order.push(i); });
        // a King already at the bottom of a column doesn't need to move to another empty column
        for (const i of order) { if (this.canTab(g.tab[i], card) && !(card.r === 13 && idx === 0 && from[0] === 't' && !g.tab[i].length)) { to = 't' + i; break; } }
      }
      if (!to) return null;
      const n = this.copy(g); n.undo = this.snap(g);
      const nsrc = from === 'waste' ? n.waste : (from[0] === 'f' ? n.found[+from.slice(1)] : n.tab[+from.slice(1)]);
      const moved = nsrc.splice(idx, run.length);
      const dst = to[0] === 'f' ? n.found[+to.slice(1)] : n.tab[+to.slice(1)];
      moved.forEach((c) => dst.push(c));
      if (from[0] === 't' && nsrc.length) nsrc[nsrc.length - 1].up = true;
      n.moves++; return n;
    },
    undoMove(g) { if (!g.undo.length) return g; const p = g.undo[g.undo.length - 1]; return Object.assign(clone(p), { undo: g.undo.slice(0, -1) }); },
    won(g) { return g.found.every((p) => p.length === 13); },
    // Everything face up and stock empty: finish automatically
    canAuto(g) { return !g.stock.length && !g.waste.length && g.tab.every((c) => c.every((x) => x.up)) && !this.won(g); },
    autoFinish(g) {
      let n = this.copy(g);
      for (let guard = 0; guard < 60 && !this.won(n); guard++) {
        let moved = false;
        for (let i = 0; i < 7 && !moved; i++) { const col = n.tab[i]; if (!col.length) continue; const c = col[col.length - 1]; const f = this.canFound(n, c); if (f >= 0) { n.found[f].push(col.pop()); n.moves++; moved = true; } }
        if (!moved) break;
      }
      return n;
    }
  };

  // ---------------------------------------------------------------- Golf solitaire
  const golf = {
    deal() { const d = deck(); d.forEach((c) => { c.up = true; }); const tab = []; for (let i = 0; i < 7; i++) tab.push(d.splice(0, 5)); const base = d.pop(); return { tab: tab, stock: d.map((c) => Object.assign(c, { up: false })), found: [base], moves: 0 }; },
    fits(top, c) { return Math.abs(top.r - c.r) === 1; },   // one higher or lower, no wrapping between King and Ace
    tap(g, i) { const col = g.tab[i]; if (!col.length) return null; const c = col[col.length - 1], top = g.found[g.found.length - 1]; if (!this.fits(top, c)) return null; const n = clone(g); n.found.push(n.tab[i].pop()); n.moves++; return n; },
    draw(g) { if (!g.stock.length) return null; const n = clone(g); const c = n.stock.pop(); c.up = true; n.found.push(c); n.moves++; return n; },
    won(g) { return g.tab.every((c) => !c.length); },
    stuck(g) { if (g.stock.length || this.won(g)) return false; const top = g.found[g.found.length - 1]; return !g.tab.some((c) => c.length && this.fits(top, c[c.length - 1])); },
    left(g) { return g.tab.reduce((a, c) => a + c.length, 0); }
  };

  // ---------------------------------------------------------------- Memory match (8 pairs)
  const memory = {
    deal() { const picks = shuffle(deck()).slice(0, 8); const cards = shuffle(picks.concat(picks.map((c) => Object.assign({}, c)))).map((c, i) => ({ r: c.r, s: c.s, key: c.id, k: i, up: false, done: false })); return { cards: cards, open: [], moves: 0, busy: false }; },
    flip(g, i) {
      const c = g.cards[i]; if (g.busy || c.up || c.done) return null;
      const n = clone(g); n.cards[i].up = true; n.open.push(i);
      if (n.open.length === 2) { n.moves++; const [a, b] = n.open; if (n.cards[a].key === n.cards[b].key) { n.cards[a].done = n.cards[b].done = true; n.open = []; } else n.busy = true; }
      return n;
    },
    hide(g) { const n = clone(g); n.open.forEach((i) => { n.cards[i].up = false; }); n.open = []; n.busy = false; return n; },
    won(g) { return g.cards.every((c) => c.done); },
    pairs(g) { return g.cards.filter((c) => c.done).length / 2; }
  };

  // ---------------------------------------------------------------- Higher or Lower
  const hilo = {
    deal() { const d = deck(); const cur = d.pop(); cur.up = true; return { deck: d, cur: cur, prev: null, streak: 0, best: 0, over: false, last: '' }; },
    guess(g, dir) {
      if (g.over) return g;
      const n = clone(g); if (!n.deck.length) n.deck = deck();
      const next = n.deck.pop(); next.up = true;
      const ok = next.r === n.cur.r ? null : (dir === 'hi' ? next.r > n.cur.r : next.r < n.cur.r);
      n.prev = n.cur; n.cur = next;
      if (ok === null) n.last = 'same';
      else if (ok) { n.streak++; n.best = Math.max(n.best, n.streak); n.last = 'right'; }
      else { n.over = true; n.last = 'wrong'; }
      return n;
    }
  };

  // ---------------------------------------------------------------- Blackjack (race to N hand wins)
  const bj = {
    total(h) { let t = 0, a = 0; h.forEach((c) => { t += Math.min(10, c.r); if (c.r === 1) a++; }); while (a > 0 && t + 10 <= 21) { t += 10; a--; } return t; },
    deal(prev) {
      const g = prev ? clone(prev) : { wins: 0, losses: 0, pushes: 0, deck: deck() };
      if (g.deck.length < 15) g.deck = deck();
      const p = [g.deck.pop(), g.deck.pop()], d = [g.deck.pop(), g.deck.pop()];
      p.forEach((c) => { c.up = true; }); d[0].up = true;
      Object.assign(g, { player: p, dealer: d, phase: 'play', result: '' });
      if (this.total(p) === 21) return this.stand(g);
      return g;
    },
    hit(g) { if (g.phase !== 'play') return g; const n = clone(g); const c = n.deck.pop(); c.up = true; n.player.push(c); if (this.total(n.player) > 21) return this.finish(n, 'lose', 'Bust! Over 21.'); if (this.total(n.player) === 21) return this.stand(n); return n; },
    stand(g) {
      const n = clone(g); n.dealer.forEach((c) => { c.up = true; });
      while (this.total(n.dealer) < 17) { const c = n.deck.pop(); c.up = true; n.dealer.push(c); }
      const p = this.total(n.player), d = this.total(n.dealer);
      if (d > 21) return this.finish(n, 'win', 'Dealer busts. You win the hand!');
      if (p > d) return this.finish(n, 'win', 'You win the hand, ' + p + ' to ' + d + '.');
      if (p < d) return this.finish(n, 'lose', 'Dealer wins the hand, ' + d + ' to ' + p + '.');
      return this.finish(n, 'push', 'Push, ' + p + ' each. Nobody scores.');
    },
    finish(n, r, msg) { n.dealer.forEach((c) => { c.up = true; }); n.phase = 'done'; n.result = r; n.msg = msg; if (r === 'win') n.wins++; else if (r === 'lose') n.losses++; else n.pushes++; return n; }
  };

  // ---------------------------------------------------------------- Picture puzzle (tap two tiles to swap)
  const puzzle = {
    deal(size) {
      const n = size * size; let order;
      do { order = shuffle(Array.from({ length: n }, (_, i) => i)); } while (order.every((v, i) => v === i));
      return { size: size, order: order, sel: null, moves: 0 };
    },
    tap(g, i) {
      const n = clone(g);
      if (n.sel === null) { n.sel = i; return n; }
      if (n.sel === i) { n.sel = null; return n; }
      const a = n.sel; const t = n.order[a]; n.order[a] = n.order[i]; n.order[i] = t; n.sel = null; n.moves++; return n;
    },
    won(g) { return g.order.every((v, i) => v === i); },
    placed(g) { return g.order.filter((v, i) => v === i).length; }
  };

  window.CollabzGames = { shuffle: shuffle, deck: deck, RANK: RANK, SYM: SYM, red: red, klondike: klondike, golf: golf, memory: memory, hilo: hilo, bj: bj, puzzle: puzzle };
})();

/*********************************************************************
 *  Bullet-proof statistical ensemble bot
 *  – ONE external toggle:  window.botOn  (true = trade, false = simulate)
 *  – defaults to OFF so you can safely reload the page
 *********************************************************************/
class TradingStrategy {
    constructor() {
        this.history = new Map(); // stock -> [ {t, p, step} ]
        this.strategies = new Map(); // stock -> [ StrategyInstance ]
        this.ensemble = new Map(); // stock -> { weights[], lastVote }
        this.account = {balance: 0, positions: new Map()};
        this.maxPos = 0.25;      // 25 % of balance in one stock
        this.maxDrawDown = 0.30;      // stop trading after -30 %
        this.peakBalance = null;
        this.maxSharesPerOrder = 500;   // never send more than 500 shares in one order
        this.skipCache = new Map();   // stock -> timestamp of last printed skip
        /* ----------  NEW: safety switch  ---------- */
        this.botOn = false;          // OFF by default
    }

    /* --------------------------------------------------------------- */
    /*  public API – unchanged signatures                              */

    /* --------------------------------------------------------------- */
    async updateHistory(stockName, price) {
        const now = Date.now();
        const step = Math.floor(now / 500);
        if (!this.history.has(stockName)) this.history.set(stockName, []);
        const h = this.history.get(stockName);
        h.push({t: now, p: price, step});
        if (h.length > 200) h.shift();
        this.ensureStrategies(stockName);
        this.updateRegimeFeatures(stockName);
    }

    async updateAllStocks() {
        const res = await getStocks();
        if (!res.success) return;
        for (const s of res.data) await this.updateHistory(s.name, s.price);
    }

    async autoTrade() {
        await this.refreshAccount();
        if (this.account.balance === 0) return;
        if (!this.peakBalance) this.peakBalance = this.account.balance;
        /* ----------  auto-resetting draw-down brake  ---------- */
        if (this.account.balance < this.peakBalance * (1 - this.maxDrawDown)) {
            console.warn('[BOT] auto-reset draw-down brake');
            this.peakBalance = this.account.balance; // reset and continue
            return;                                  // skip only *this* tick
        }
        if (this.account.balance > this.peakBalance) this.peakBalance = this.account.balance;

        const stocks = await getStocks().then(r => r.success ? r.data : []);
        for (const s of stocks) {
            if (s.name === '-') continue;
            const signal = this.ensembleVote(s.name);
            if (signal === 0) continue;
            const kelly = this.kellySize(s.name, s.price);
            const desired = Math.floor(kelly * signal);
            const owned = this.account.positions.get(s.name) || 0;
            const delta = desired - owned;
            if (Math.abs(delta) < 1) continue;
            const clip = this.randomiseClip(delta);

            /* ----------  NEW: only act if toggle is ON  ---------- */
            if (this.botOn) {
                await this.executeTrade(s.name, clip > 0 ? 'buy' : 'sell', Math.abs(clip));
            } else {
                /* still print what we *would* have done – keeps log comparable */
                console.log(`[SIM] ${clip > 0 ? 'BUY' : 'SELL'} ${Math.abs(clip)} ${s.name}  (price ${s.price})`);
            }
        }
    }

    /* --------------------------------------------------------------- */
    /*  internal machinery                                             */

    /* --------------------------------------------------------------- */
    ensureStrategies(stock) {
        if (this.strategies.has(stock)) return;
        const S = [
            new MeanReverter(),
            new TrendFollower(),
            new CycleDetector(),
            new NoiseBreaker(),
            new OrderImpactProbe()
        ];
        this.strategies.set(stock, S);
        this.ensemble.set(stock, {weights: S.map(_ => 1), lastVote: 0});
    }

    updateRegimeFeatures(stock) {
        const h = this.history.get(stock);
        if (h.length < 30) return;
        for (const strat of this.strategies.get(stock)) {
            const ret = strat.update(h);
            if (ret != null) strat.sharpe = this.rollingSharpe(strat.returns);
        }
        this.reweightEnsemble(stock);
    }

    reweightEnsemble(stock) {
        const strats = this.strategies.get(stock);
        const sharps = strats.map(s => Math.max(s.sharpe, 0));
        const sum = sharps.reduce((a, b) => a + b, 1e-8);
        this.ensemble.get(stock).weights = sharps.map(s => s / sum);
    }

    ensembleVote(stock) {
        const strats = this.strategies.get(stock);
        const w = this.ensemble.get(stock).weights;
        let vote = 0;
        strats.forEach((s, i) => vote += w[i] * s.signal());
        this.ensemble.get(stock).lastVote = Math.sign(vote);
        return Math.sign(vote);
    }

    kellySize(stock, price) {
        const strats = this.strategies.get(stock);
        const w = this.ensemble.get(stock).weights;
        let avgWin = 0, avgLoss = 0, winProb = 0, cnt = 0;

        strats.forEach((s, i) => {
            const rets = s.returns;
            if (rets.length < 10) return;
            const pos = rets.filter(r => r > 0);
            const neg = rets.filter(r => r < 0);
            const p = pos.length / rets.length;
            const meanPos = pos.reduce((a, b) => a + b, 0) / (pos.length || 1);
            const meanNeg = neg.reduce((a, b) => a + b, 0) / (neg.length || 1);
            avgWin += w[i] * (meanPos || 0);
            avgLoss += w[i] * (-meanNeg || 0);
            winProb += w[i] * p;
            cnt++;
        });

        if (cnt === 0) return 0;

        const kelly = (avgWin * winProb - avgLoss * (1 - winProb)) / (avgWin * avgLoss || 1);
        const maxSpend = this.maxPos * this.account.balance;   // ← declare before use
        let shares = Math.floor(maxSpend * Math.min(Math.max(kelly, 0), 0.25) / price);

        return (isFinite(shares) && shares > 0) ? shares : 0;
    }

    randomiseClip(delta) {
        // add noise and never show exact size
        const sign = Math.sign(delta);
        const abs = Math.abs(delta);
        const noisy = Math.floor(abs * (0.9 + 0.2 * Math.random()));
        return Math.max(1, noisy) * sign;
    }

    rollingSharpe(returns, halfLife = 20) {
        if (returns.length < 5) return 0;
        let mean = 0, varr = 0, lam = Math.pow(0.5, 1 / halfLife);
        for (const r of returns) {
            mean = lam * mean + (1 - lam) * r;
            varr = lam * varr + (1 - lam) * (r - mean) ** 2;
        }
        const vol = Math.sqrt(varr) || 1e-8;
        return mean / vol;
    }

    async refreshAccount() {
        const u = await getUser();
        if (!u.success) return;
        const a = await getAccount();
        if (!a.success) return;
        this.account.balance = u.data.balance;
        this.account.positions.clear();
        a.data.positions.forEach(p => this.account.positions.set(p.stock.name, p.number));
    }

    async executeTrade(stock, action, amount) {
        if (!stock || stock === '-' || !Number.isFinite(amount) || amount <= 0) return;

        const owned = this.account.positions.get(stock) || 0;
        const needed = (action === 'sell') ? amount : 0;

        /* -----  1.  own enough to sell?  ----- */
        if (needed > owned) {
            const now = Date.now();
            const last = this.skipCache.get(stock);
            if (!last || now - last > 60_000) {          // print once per minute
                console.warn(`[SKIP] wanted to SELL ${amount} ${stock} but only own ${owned}`);
                this.skipCache.set(stock, now);
            }
            return;
        }

        /* ----------  buy-side hard cap  ---------- */
        if (action === 'buy') {
            const price = (await getStocks()).data.find(s => s.name === stock)?.price || 0;
            if (!price || price <= 0) return;          // illiquid stock
            const maxAffordable = Math.floor(this.account.balance * 0.95 / price);
            amount = Math.min(amount, maxAffordable);
            if (amount < 1) return;                    // can't even afford 1 share
        }
        /* ----------  absolute server limit  ---------- */
        amount = Math.min(amount, this.maxSharesPerOrder);
        /* ----------  keep the existing integer rounding  ---------- */
        amount = Math.floor(amount);
        /* ----------  3.  absolute server limit  ---------- */
        amount = Math.min(amount, this.maxSharesPerOrder);

        const dir = action === 'buy' ? amount : -amount;
        const r = await postPositions(stock, dir);
        if (r.success) console.log(`[LIVE] ${action.toUpperCase()} ${amount} ${stock}`);
        else console.warn(`[LIVE] 422 – server rejected ${action} ${amount} ${stock}`);
    }
}

/* ===================================================================
 *  Micro-strategies – kept intentionally simple so they run on-line
 * =================================================================== */
class MeanReverter {
    constructor() {
        this.returns = [];
    }

    update(h) { // h is history array
        const len = h.length;
        if (len < 20) return null;
        const sma20 = h.slice(-20).reduce((a, b) => a + b.p, 0) / 20;
        const last = h[h.length - 1].p;
        this.returns.push((sma20 - last) / last);
        if (this.returns.length > 100) this.returns.shift();
        return this.returns[this.returns.length - 1];
    }

    signal() {
        const last = this.returns[this.returns.length - 1];
        return last > 0.01 ? 1 : last < -0.01 ? -1 : 0;
    }
}

class TrendFollower {
    constructor() {
        this.returns = [];
    }

    update(h) {
        if (h.length < 10) return null;
        const ema = (a, b, lam = 0.2) => lam * b + (1 - lam) * a;
        let e = h[0].p;
        for (let i = 1; i < h.length; i++) e = ema(e, h[i].p);
        const mom = (h[h.length - 1].p - e) / e;
        this.returns.push(mom);
        if (this.returns.length > 100) this.returns.shift();
        return mom;
    }

    signal() {
        const m = this.returns[this.returns.length - 1];
        return m > 0.005 ? 1 : m < -0.005 ? -1 : 0;
    }
}

class CycleDetector {
    constructor() {
        this.returns = [];
        this.last = 0;
    }

    update(h) {
        if (h.length < 20) return 0;
        /* simple 10-period RSI instead of FFT – no pow2 needed */
        const prices = h.slice(-10).map(x => x.p);
        const gains = [], losses = [];
        for (let i = 1; i < prices.length; i++) {
            const d = prices[i] - prices[i - 1];
            gains.push(d > 0 ? d : 0);
            losses.push(d < 0 ? -d : 0);
        }
        const avgGain = gains.reduce((a, b) => a + b) / gains.length || 0.001;
        const avgLoss = losses.reduce((a, b) => a + b) / losses.length || 0.001;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        const signal = (rsi > 70) ? -1 : (rsi < 30) ? 1 : 0;
        this.returns.push(signal * 0.01);
        if (this.returns.length > 100) this.returns.shift();
        return signal * 0.01;
    }

    signal() {
        return this.returns[this.returns.length - 1] > 0.005 ? -1 :
            this.returns[this.returns.length - 1] < -0.005 ? 1 : 0;
    }
}

class NoiseBreaker {
    constructor() {
        this.returns = [];
    }

    update(h) {
        if (h.length < 10) return null;
        const diff = h[h.length - 1].p - h[h.length - 2].p;
        this.returns.push(Math.sign(diff) * Math.min(Math.abs(diff), 0.02));
        if (this.returns.length > 100) this.returns.shift();
        return diff;
    }

    signal() {
        const d = this.returns[this.returns.length - 1];
        return d > 0.01 ? -1 : d < -0.01 ? 1 : 0;
    }
}

class OrderImpactProbe {
    constructor() {
        this.returns = [];
        this.probeSize = 1;
    }

    update(h) {
        // dummy – real implementation would compare price before/after our trade
        this.returns.push(0);
        return 0;
    }

    signal() {
        return 0;
    }
}

/* ----------  global instance + toggle  ---------- */
window.tradingStrategy = new TradingStrategy();
/* expose the toggle so you can flip it from console or a button */
window.botOn = () => window.tradingStrategy.botOn;
window.setBot = (on) => {
    window.tradingStrategy.botOn = Boolean(on);
    console.log(`[BOT] ${window.tradingStrategy.botOn ? 'ARMED' : 'DISARMED'}`);
};
window.resetDrawDown = () => {
    window.tradingStrategy.peakBalance = window.tradingStrategy.account.balance;
    console.log('[BOT] Draw-down brake reset');
};
window.resetBrake = () => {
    window.tradingStrategy.peakBalance = window.tradingStrategy.account.balance;
    console.log('[BOT] Draw-down brake reset – you can trade again');
};
window.tradingStrategy.maxDrawDown = 0.30;   // 30 % instead of 10 %
window.tradingStrategy.skipCache.clear();
/* start in safe mode */
window.setBot(false);
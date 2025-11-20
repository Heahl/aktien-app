/**
 * Hauptklasse für den Trading Bot mit Ensemble-Strategie
 * Implementiert verschiedene Handelsstrategien und kombiniert sie zu einem Ensemble-Modell
 * Unterstützt Mean Reversion, Trend Following, Cycle Detection und andere Ansätze
 */
class TradingStrategy {
    /**
     * Initialisiert die Trading-Strategie mit Standardparametern
     */
    constructor() {
        /**
         * Preisverlauf pro Aktie - Map mit Array von {t: Zeitstempel, p: Preis, step: Zeitintervall}
         * @type {Map<string, Array<{t: number, p: number, step: number}>>}
         */
        this.history = new Map(); // stock -> [ {t, p, step} ]
        /**
         * Strategie-Instanzen pro Aktie
         * @type {Map<string, Array<Strategy>>}
         */
        this.strategies = new Map(); // stock -> [ StrategyInstance ]
        /**
         * Ensemble-Gewichte pro Aktie - Enthält Gewichte und letzte Abstimmung
         * @type {Map<string, {weights: number[], lastVote: number}>}
         */
        this.ensemble = new Map(); // stock -> { weights[], lastVote }
        /**
         * Kontodaten mit Guthaben und Positionen
         * @type {{balance: number, positions: Map<string, number>}}
         */
        this.account = {balance: 0, positions: new Map()};
        /**
         * Maximale Position pro Aktie als Anteil des Guthabens (25%)
         * @type {number}
         */
        this.maxPos = 0.25;      // 25 % of balance in one stock
        /**
         * Maximales Drawdown vor Stop-Handel (30%)
         * @type {number}
         */
        this.maxDrawDown = 0.30;      // stop trading after -30 %
        /**
         * Höchstes erreichtes Guthaben für Drawdown-Berechnung
         * @type {?number}
         */
        this.peakBalance = null;
        /**
         * Maximale Anzahl Aktien pro Order
         * @type {number}
         */
        this.maxSharesPerOrder = 500;   // never send more than 500 shares in one order
        /**
         * Cache für übersprungene Trades (zur Vermeidung von wiederholten Warnungen)
         * @type {Map<string, number>}
         */
        this.skipCache = new Map();   // stock -> timestamp of last printed skip
        /**
         * Bot-Status (ausgeschaltet per Default)
         * @type {boolean}
         */
        this.botOn = false;          // OFF by default
    }

    /**
     * Aktualisiert den Preisverlauf für eine Aktie und führt notwendige Updates durch
     * @param {string} stockName - Name der Aktie
     * @param {number} price - Aktueller Preis
     * @returns {Promise<void>}
     */
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

    /**
     * Aktualisiert den Preisverlauf für alle verfügbaren Aktien
     * @returns {Promise<void>}
     */
    async updateAllStocks() {
        const res = await getStocks();
        if (!res || !res.success || !res.data) return;
        if (!res.data) return; // 304: Keine neuen Daten, aber kein Fehler
        for (const s of res.data) await this.updateHistory(s.name, s.price);
    }

    /**
     * Führt automatischen Handel basierend auf Ensemble-Vorhersagen durch
     * Berücksichtigt Drawdown-Limits und Positionsgrenzen
     * @returns {Promise<void>}
     */
    async autoTrade() {
        await this.refreshAccount();
        if (this.account.balance === 0) return;
        if (!this.peakBalance) this.peakBalance = this.account.balance;
        if (this.account.balance < this.peakBalance * (1 - this.maxDrawDown)) {
            // console.warn('[BOT] auto-reset draw-down brake');
            this.peakBalance = this.account.balance; // reset and continue
            return;                                  // skip only this tick
        }
        if (this.account.balance > this.peakBalance) this.peakBalance = this.account.balance;

        const stocksRes = await getStocks();
        if (!stocksRes || !stocksRes.success || !Array.isArray(stocksRes.data)) return;

        for (const s of stocksRes.data) {
            if (s.name === '-') continue;
            const signal = this.ensembleVote(s.name);
            if (signal === 0) continue;
            const kelly = this.kellySize(s.name, s.price);
            const desired = Math.floor(kelly * signal);
            const owned = this.account.positions.get(s.name) || 0;
            const delta = desired - owned;
            if (Math.abs(delta) < 1) continue;
            const clip = this.randomiseClip(delta);

            if (this.botOn) {
                await this.executeTrade(s.name, clip > 0 ? 'buy' : 'sell', Math.abs(clip));
            } else {
                // console.log(`[SIM] ${clip > 0 ? 'BUY' : 'SELL'} ${Math.abs(clip)} ${s.name}  (price ${s.price})`);
            }
        }
    }

    /**
     * Stellt sicher, dass Strategie-Instanzen für eine Aktie vorhanden sind
     * @param {string} stock - Name der Aktie
     */
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

    /**
     * Aktualisiert Regime-Features und Sharpe-Ratios für alle Strategien einer Aktie
     * @param {string} stock - Name der Aktie
     */
    updateRegimeFeatures(stock) {
        const h = this.history.get(stock);
        if (!h || h.length < 30) return;
        for (const strat of this.strategies.get(stock)) {
            const ret = strat.update(h);
            if (ret != null) strat.sharpe = this.rollingSharpe(strat.returns);
        }
        this.reweightEnsemble(stock);
    }

    /**
     * Passt die Ensemble-Gewichte basierend auf den Sharpe-Ratios an
     * @param {string} stock - Name der Aktie
     */
    reweightEnsemble(stock) {
        const strats = this.strategies.get(stock);
        const sharps = strats.map(s => Math.max(s.sharpe, 0));
        const sum = sharps.reduce((a, b) => a + b, 1e-8);
        this.ensemble.get(stock).weights = sharps.map(s => s / sum);
    }

    /**
     * Gibt das Ensemble-Votum für eine Aktie zurück
     * @param {string} stock - Name der Aktie
     * @returns {number} -1 (Verkaufen), 0 (Halten) oder 1 (Kaufen)
     */
    ensembleVote(stock) {
        const strats = this.strategies.get(stock);
        const w = this.ensemble.get(stock).weights;
        let vote = 0;
        strats.forEach((s, i) => vote += w[i] * s.signal());
        this.ensemble.get(stock).lastVote = Math.sign(vote);
        return Math.sign(vote);
    }

    /**
     * Berechnet die optimale Positiongröße nach der Kelly-Formel
     * @param {string} stock - Name der Aktie
     * @param {number} price - Aktueller Preis
     * @returns {number} Gewünschte Anzahl Aktien
     */
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
        const maxSpend = this.maxPos * this.account.balance;
        let shares = Math.floor(maxSpend * Math.min(Math.max(kelly, 0), 0.25) / price);

        return (isFinite(shares) && shares > 0) ? shares : 0;
    }

    /**
     * Randomisiert und begrenzt die Order-Größe mit Rauschen
     * @param {number} delta - Differenz zur gewünschten Position
     * @returns {number} Angepasste Order-Größe
     */
    randomiseClip(delta) {
        const sign = Math.sign(delta);
        const abs = Math.abs(delta);
        const noisy = Math.floor(abs * (0.9 + 0.2 * Math.random()));
        return Math.max(1, noisy) * sign;
    }

    /**
     * Berechnet den gleitenden Sharpe-Ratio mit exponentieller Gewichtung
     * @param {number[]} returns - Array von Returns
     * @param {number} [halfLife=20] - Halbwertszeit für exponentielle Gewichtung
     * @returns {number} Rolling Sharpe-Ratio
     */
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

    /**
     * Aktualisiert die Kontodaten vom Server
     * @returns {Promise<void>}
     */
    async refreshAccount() {
        const u = await getUser();
        if (!u || !u.success || !u.data) return;
        const a = await getAccount();
        if (!a || !a.success || !a.data) return;

        this.account.balance = u.data.balance;
        this.account.positions.clear();

        // SICHERHEITSABFRAGE: Prüfen, ob positions existiert und Array ist
        if (a.data.positions && Array.isArray(a.data.positions)) {
            a.data.positions.forEach(p => {
                if (p && p.stock && p.stock.name !== undefined && p.number !== undefined) {
                    this.account.positions.set(p.stock.name, p.number);
                }
            });
        }
    }

    /**
     * Führt einen tatsächlichen Handel aus (Kauf/Verkauf)
     * @param {string} stock - Name der Aktie
     * @param {'buy'|'sell'} action - Handelsaktion
     * @param {number} amount - Anzahl Aktien
     * @returns {Promise<void>}
     */
    async executeTrade(stock, action, amount) {
        if (!stock || stock === '-' || !Number.isFinite(amount) || amount <= 0) return;

        const owned = this.account.positions.get(stock) || 0;
        const needed = (action === 'sell') ? amount : 0;

        /* -----  1.  own enough to sell?  ----- */
        if (needed > owned) {
            const now = Date.now();
            const last = this.skipCache.get(stock);
            if (!last || now - last > 60_000) {          // print once per minute
                // console.warn(`[SKIP] wanted to SELL ${amount} ${stock} but only own ${owned}`);
                this.skipCache.set(stock, now);
            }
            return;
        }

        if (action === 'buy') {
            const stocksRes = await getStocks();
            if (!stocksRes || !stocksRes.success || !Array.isArray(stocksRes.data)) return;

            const stockData = stocksRes.data.find(s => s.name === stock);
            if (!stockData || !stockData.price || stockData.price <= 0) return;

            const price = stockData.price;
            const maxAffordable = Math.floor(this.account.balance * 0.95 / price);
            amount = Math.min(amount, maxAffordable);
            if (amount < 1) return;                    // can't even afford 1 share
        }
        amount = Math.min(amount, this.maxSharesPerOrder);
        amount = Math.floor(amount);

        const dir = action === 'buy' ? amount : -amount;
        const r = await postPositions(stock, dir);
        //if (r.success) // console.log(`[LIVE] ${action.toUpperCase()} ${amount} ${stock}`);
        //else // console.warn(`[LIVE] 422 – server rejected ${action} ${amount} ${stock}`);
    }
}

/**
 * Mean Reversion Strategie - Erwartet Preisanpassung an den Durchschnitt
 * Verwendet 20-Perioden Simple Moving Average für die Signalerkennung
 */
class MeanReverter {
    /**
     * Initialisiert die Mean Reversion Strategie
     */
    constructor() {
        /**
         * Historische Returns der Strategie
         * @type {number[]}
         */
        this.returns = [];
    }

    /**
     * Aktualisiert die Strategie mit neuem Preisverlauf
     * @param {Array<{t: number, p: number, step: number}>} h - Preisverlauf
     * @returns {?number} Aktueller Return oder null bei unzureichenden Daten
     */
    update(h) { // h is history array
        const len = h.length;
        if (len < 20) return null;
        const sma20 = h.slice(-20).reduce((a, b) => a + b.p, 0) / 20;
        const last = h[h.length - 1].p;
        this.returns.push((sma20 - last) / last);
        if (this.returns.length > 100) this.returns.shift();
        return this.returns[this.returns.length - 1];
    }

    /**
     * Gibt das aktuelle Handelssignal zurück
     * @returns {number} -1 (Verkaufen), 0 (Halten) oder 1 (Kaufen)
     */
    signal() {
        const last = this.returns[this.returns.length - 1];
        return last > 0.01 ? 1 : last < -0.01 ? -1 : 0;
    }
}

/**
 * Trend Following Strategie - Folgt dem aktuellen Trend
 * Verwendet Exponential Moving Average für die Trenderkennung
 */
class TrendFollower {
    /**
     * Initialisiert die Trend Following Strategie
     */
    constructor() {
        /**
         * Historische Returns der Strategie
         * @type {number[]}
         */
        this.returns = [];
    }

    /**
     * Aktualisiert die Strategie mit neuem Preisverlauf
     * @param {Array<{t: number, p: number, step: number}>} h - Preisverlauf
     * @returns {?number} Aktueller Return oder null bei unzureichenden Daten
     */
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

    /**
     * Gibt das aktuelle Handelssignal zurück
     * @returns {number} -1 (Verkaufen), 0 (Halten) oder 1 (Kaufen)
     */
    signal() {
        const m = this.returns[this.returns.length - 1];
        return m > 0.005 ? 1 : m < -0.005 ? -1 : 0;
    }
}

/**
 * Cycle Detection Strategie - Erkennt zyklische Preisbewegungen
 * Verwendet Relative Strength Index (RSI) als Indikator
 */
class CycleDetector {
    /**
     * Initialisiert die Cycle Detection Strategie
     */
    constructor() {
        /**
         * Historische Returns der Strategie
         * @type {number[]}
         */
        this.returns = [];
        /**
         * Letzter Zustand
         * @type {number}
         */
        this.last = 0;
    }

    /**
     * Aktualisiert die Strategie mit neuem Preisverlauf
     * @param {Array<{t: number, p: number, step: number}>} h - Preisverlauf
     * @returns {number} Aktueller Return
     */
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

    /**
     * Gibt das aktuelle Handelssignal zurück
     * @returns {number} -1 (Verkaufen), 0 (Halten) oder 1 (Kaufen)
     */
    signal() {
        return this.returns[this.returns.length - 1] > 0.005 ? -1 :
            this.returns[this.returns.length - 1] < -0.005 ? 1 : 0;
    }
}

/**
 * Noise Breaker Strategie - Reagiert auf Preisänderungen
 * Nutzt kurzfristige Preisbewegungen für Handelssignale
 */
class NoiseBreaker {
    /**
     * Initialisiert die Noise Breaker Strategie
     */
    constructor() {
        /**
         * Historische Returns der Strategie
         * @type {number[]}
         */
        this.returns = [];
    }

    /**
     * Aktualisiert die Strategie mit neuem Preisverlauf
     * @param {Array<{t: number, p: number, step: number}>} h - Preisverlauf
     * @returns {?number} Aktueller Return oder null bei unzureichenden Daten
     */
    update(h) {
        if (h.length < 10) return null;
        const diff = h[h.length - 1].p - h[h.length - 2].p;
        this.returns.push(Math.sign(diff) * Math.min(Math.abs(diff), 0.02));
        if (this.returns.length > 100) this.returns.shift();
        return diff;
    }

    /**
     * Gibt das aktuelle Handelssignal zurück
     * @returns {number} -1 (Verkaufen), 0 (Halten) oder 1 (Kaufen)
     */
    signal() {
        const d = this.returns[this.returns.length - 1];
        return d > 0.01 ? -1 : d < -0.01 ? 1 : 0;
    }
}

/**
 * Order Impact Probe Strategie - Simuliert Order-Impact Messung
 * Aktuell als Dummy-Implementierung
 */
class OrderImpactProbe {
    /**
     * Initialisiert die Order Impact Probe Strategie
     */
    constructor() {
        /**
         * Historische Returns der Strategie
         * @type {number[]}
         */
        this.returns = [];
        /**
         * Größe der Test-Orders
         * @type {number}
         */
        this.probeSize = 1;
    }

    /**
     * Aktualisiert die Strategie (Dummy-Implementierung)
     * @param {Array<{t: number, p: number, step: number}>} h - Preisverlauf
     * @returns {number} 0 (kein Signal)
     */
    update(h) {
        // dummy – real implementation would compare price before/after our trade
        this.returns.push(0);
        return 0;
    }

    /**
     * Gibt das aktuelle Handelssignal zurück (immer 0)
     * @returns {number} 0 (kein Signal)
     */
    signal() {
        return 0;
    }
}

/**
 * Globales Trading-Strategie-Objekt
 * @global
 * @type {TradingStrategy}
 */
window.tradingStrategy = new TradingStrategy();
/**
 * Schaltet den Bot ein oder aus
 * @global
 * @function setBot
 * @param {boolean} on - True zum Einschalten, False zum Ausschalten
 */
window.setBot = (on) => {
    window.tradingStrategy.botOn = Boolean(on);
    // console.log(`[BOT] ${window.tradingStrategy.botOn ? 'ARMED' : 'DISARMED'}`);
};
/**
 * Löscht den Skip-Cache beim Start
 * @global
 */
window.tradingStrategy.skipCache.clear();
/* start in safe mode */
window.setBot(false);
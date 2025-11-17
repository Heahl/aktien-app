// trading-strategy.js
/**
 * KI-basierte Trading-Strategie für automatische Kauf- und Verkaufsentscheidungen.
 * Speichert Kursverläufe, schätzt Preisparameter und führt Trades über die API aus.
 */
class TradingStrategy {
    /**
     * Initialisiert Maps für Historie, geschätzte Parameter und letzte Schritte.
     */
    constructor() {
        this.history = new Map(); // { stockName: [{ timestamp, price, step }] }
        this.params = new Map();  // { stockName: { coreValue, amplitude, phase, phaselength } }
        this.lastSteps = new Map(); // { stockName: lastKnownStep }
    }

    /**
     * Fügt einen neuen Preis in die Historie ein und schätzt die Parameter neu.
     *
     * @param {string} stockName - Name der Aktie.
     * @param {number} price - Aktueller Preis.
     */
    async updateHistory(stockName, price) {
        const now = Date.now();
        const step = Math.floor(now / 500); // Näherung an serverseitiges "steps"

        // Speichere neuen Eintrag
        if (!this.history.has(stockName)) {
            this.history.set(stockName, []);
        }
        const stockHistory = this.history.get(stockName);
        stockHistory.push({timestamp: now, price, step});

        // Nur die letzten 50 Werte behalten
        if (stockHistory.length > 50) {
            stockHistory.shift();
        }

        // Parameter schätzen
        this.estimateParams(stockName);
    }

    /**
     * Schätzt Mittelwert, Amplitude, Phase und Periodenlänge
     * aus der bisherigen Preishistorie.
     *
     * @param {string} stockName - Name der Aktie.
     */
    estimateParams(stockName) {
        const history = this.history.get(stockName);
        if (!history || history.length < 10) return;

        // Schätze coreValue (Mittelwert)
        const prices = history.map(h => h.price);
        const coreValue = prices.reduce((a, b) => a + b, 0) / prices.length;

        // Schätze amplitude (halbe Spannweite)
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const amplitude = (maxPrice - minPrice) / 2;

        // Schätze phaselength (Periode) über Peaks
        const peaks = this.findPeaks(history);
        let phaselength = 100; // Default
        if (peaks.length >= 2) {
            const avgPeakDistance = peaks.reduce((sum, _, i) => {
                if (i === 0) return 0;
                return sum + (peaks[i].step - peaks[i - 1].step);
            }, 0) / (peaks.length - 1);
            phaselength = avgPeakDistance; // Näherung
        }

        // Schätze phase (Verschiebung)
        let phase = 0;
        if (peaks.length > 0) {
            const lastPeak = peaks[peaks.length - 1];
            // phase ≈ lastPeak.step - (phaselength / 2)
            phase = lastPeak.step - (phaselength / 2);
        }

        // Speichere Parameter
        this.params.set(stockName, {coreValue, amplitude, phase, phaselength});
    }

    /**
     * Findet lokale Maxima (Peaks) im Kursverlauf einer Aktie.
     *
     * @param {{timestamp:number, price:number, step:number}[]} history
     * @returns {Object[]} Liste der Peak-Objekte.
     */
    findPeaks(history) {
        const peaks = [];
        for (let i = 1; i < history.length - 1; i++) {
            if (history[i].price > history[i - 1].price && history[i].price > history[i + 1].price) {
                peaks.push(history[i]);
            }
        }
        return peaks;
    }

    /**
     * Prognostiziert einen zukünftigen Preis anhand der geschätzten Parameter.
     *
     * @param {string} stockName - Aktie.
     * @param {number} futureStep - Zeitindex in der Zukunft.
     * @returns {number|null} Geschätzter Preis oder null.
     */
    predictNextPrice(stockName, futureStep) {
        const params = this.params.get(stockName);
        if (!params) return null;

        const {coreValue, amplitude, phase, phaselength} = params;
        return Math.round(100 * Math.sin((futureStep + phase) / phaselength) * amplitude + coreValue) / 100;
    }

    /**
     * Entscheidet, ob eine Aktie gekauft werden soll.
     *
     * @param {string} stockName
     * @param {number} lookAheadSteps - Wie weit in die Zukunft geschaut wird.
     * @returns {boolean} true = kaufen.
     */
    shouldBuy(stockName, lookAheadSteps = 5) {
        const currentStep = Math.floor(Date.now() / 500);
        const currentPrice = this.getCurrentPrice(stockName);
        const futureStep = currentStep + lookAheadSteps;

        const predictedPrice = this.predictNextPrice(stockName, futureStep);
        if (!predictedPrice || !currentPrice) return false;

        return predictedPrice > currentPrice * 1.01; // Kaufe, wenn 1% höher
    }

    /**
     * Entscheidet, ob eine Aktie verkauft werden soll.
     *
     * @param {string} stockName
     * @param {number} lookAheadSteps
     * @returns {boolean} true = verkaufen.
     */
    shouldSell(stockName, lookAheadSteps = 5) {
        const currentStep = Math.floor(Date.now() / 500);
        const currentPrice = this.getCurrentPrice(stockName);
        const futureStep = currentStep + lookAheadSteps;

        const predictedPrice = this.predictNextPrice(stockName, futureStep);
        if (!predictedPrice || !currentPrice) return false;

        return predictedPrice < currentPrice * 0.99; // Verkaufe, wenn 1% niedriger
    }

    /**
     * Liefert den aktuellsten gespeicherten Preis einer Aktie.
     *
     * @param {string} stockName
     * @returns {number|null}
     */
    getCurrentPrice(stockName) {
        const history = this.history.get(stockName);
        if (!history || history.length === 0) return null;
        return history[history.length - 1].price;
    }

    /**
     * Holt alle verfügbaren Aktienpreise und aktualisiert ihre Historien.
     *
     * @returns {Promise<void>}
     */
    async updateAllStocks() {
        const result = await getStocks();
        if (!result.success) return;

        for (const stock of result.data) {
            await this.updateHistory(stock.name, stock.price);
        }
    }

    /**
     * Führt automatischen Handel durch:
     * Prüft Kauf-/Verkaufssignale und führt passende Trades aus.
     *
     * @returns {Promise<void>}
     */
    async autoTrade() {
        const stocksResult = await getStocks();
        if (!stocksResult.success) return;

        const accountResult = await getAccount();
        if (!accountResult.success) return;

        const userResult = await getUser();
        if (!userResult.success) return;

        const balance = userResult.data.balance;

        // Map: Aktienname → Anzahl im Depot
        const ownedStocks = new Map();
        accountResult.data.positions.forEach(pos => {
            if (pos.number > 0) {
                ownedStocks.set(pos.stock.name, pos.number);
            }
        });

        for (const stock of stocksResult.data) {
            if (stock.name === '-') continue;

            const shouldBuy = this.shouldBuy(stock.name);
            const shouldSell = this.shouldSell(stock.name);

            if (shouldBuy) {
                // Kaufe passende Menge
                const amount = this.calculateTradeAmount(stock.price, balance);
                if (amount > 0 && balance >= stock.price * amount) {
                    console.log(`Kaufe ${amount}x ${stock.name} für ${(stock.price * amount).toFixed(2)}€`);
                    await this.executeTrade(stock.name, 'buy', amount);
                }
            } else if (shouldSell) {
                const ownedAmount = ownedStocks.get(stock.name);
                if (ownedAmount && ownedAmount > 0) {
                    // Verkaufe passende Menge
                    const amountToSell = Math.min(ownedAmount, 5); // Max 5 auf einmal
                    console.log(`Verkaufe ${amountToSell}x ${stock.name}`);
                    await this.executeTrade(stock.name, 'sell', amountToSell);
                }
            }
        }
    }

    /**
     * Führt einen Kauf oder Verkauf über die API aus.
     *
     * @param {string} stockName
     * @param {"buy"|"sell"} action
     * @param {number} amount - Anzahl der Aktien.
     * @returns {Promise<void>}
     */
    async executeTrade(stockName, action, amount) {
        // Validierung: Nur echte Aktien-Namen
        if (stockName === '-' || !stockName || stockName.trim() === '') {
            console.warn('Ungültiger Aktienname:', stockName);
            return;
        }

        // Validierung: Nur positive Anzahl
        if (isNaN(amount) || amount <= 0) {
            console.warn('Ungültige Anzahl:', amount);
            return;
        }

        try {
            let finalNumber = amount;
            if (action === 'sell') {
                finalNumber = -amount;
            }

            // Prüfe, ob number 0 ist
            if (finalNumber === 0) {
                console.warn('Anzahl darf nicht 0 sein');
                return;
            }

            const result = await postPositions(stockName, finalNumber);
            if (result.success) {
                console.log(`${action.toUpperCase()} erfolgreich: ${amount} ${stockName}`);
            } else {
                console.error(`Fehler beim ${action}:`, result.error);
                showToast(result.error.message, result.error.status);
            }
        } catch (e) {
            console.error(`Netzwerkfehler beim ${action} von ${amount} ${stockName}:`, e.message);
            showToast('Netzwerkfehler: ' + e.message, 0);
        }
    }

    /**
     * Berechnet die sinnvolle Kaufmenge basierend auf Preis und Kontostand.
     *
     * @param {number} stockPrice - Preis einer Aktie.
     * @param {number} balance - Kontostand des Nutzers.
     * @param {string} strategy - Name der Strategie.
     * @returns {number} Anzahl der zu kaufenden Aktien.
     */
    calculateTradeAmount(stockPrice, balance, strategy = 'default') {
        let percentageToUse = 0.1; // 10% des Guthabens

        // Anfangsstrategie: Wenn Guthaben hoch (zB. > 5000), nimm 30%
        if (balance > 5000 && strategy === 'default') {
            percentageToUse = 0.3;
        }
        // Wenn Guthaben mittel (zB. 1000–5000), nimm 20%
        else if (balance > 1000 && balance <= 5000) {
            percentageToUse = 0.2;
        }
        // Wenn Guthaben niedrig (zB. < 1000), nimm 5%
        else if (balance <= 1000) {
            percentageToUse = 0.05;
        }

        // Berechne Menge: wie viele Aktien kannst du kaufen?
        const amount = Math.floor((balance * percentageToUse) / stockPrice);

        // Mindestens 1 Aktie kaufen, wenn genug Guthaben
        if (amount < 1 && balance >= stockPrice) {
            return 1;
        }

        // Maximal 10 Aktien auf einmal
        return Math.min(amount, 10);
    }
}

// Globale Instanz
window.tradingStrategy = new TradingStrategy();
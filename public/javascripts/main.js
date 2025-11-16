"use strict";

document.addEventListener('DOMContentLoaded', init);

/**
 * Initialisiert die gesamte Anwendung:
 *  - Holt Benutzer-, Depot-, Aktien-, Nachrichten- und Ranking-Daten;
 *  - Rendert UI-Bereiche (User, Depot, Aktien, Ranking);
 *  - Richtet alle Event Listener für Kauf/Verkauf, News-FilterQuick-Amount-Buttons und Nachrichtenversand ein;
 *  - Führt erste API-Calls aus und behandelt Fehler über Toasts.
 *
 * @returns {Promise<void>}
 */
async function init() {
    // elemente greifen
    const newsLastHourBtn = document.getElementById('newsLastHour');
    const newsLastDayBtn = document.getElementById('newsLastDay');
    const newLastTwentyBtn = document.getElementById('newsLastTwenty');
    const buyTab = document.getElementById('buy-tab');
    const sellTab = document.getElementById('sell-tab');
    const quickSelectBtns = document.querySelectorAll('.quick-select-btn');
    const reviewOrderBtn = document.getElementById('review-order');
    const sendBtn = document.getElementById('send-message');

    const userResult = await getUser();
    if (userResult.success) {
        displayUser(userResult.data);
    } else {
        showToast(userResult.error.message, userResult.error.status);
    }

    const rankingResult = await getEverybody();
    if (rankingResult.success) {
        displayRanking(rankingResult.data);
    } else {
        showToast(rankingResult.error.message, rankingResult.error.status);
    }

    // getAccount
    const accountResult = await getAccount();
    if (accountResult.success) {
        displayDepot(accountResult.data);
    } else {
        showToast(accountResult.error.message, accountResult.error.status);
    }

    // getStocks
    const stocksResult = await getStocks();
    if (stocksResult.success) {
        displayStocks(stocksResult.data);
        populateAssetSelector(stocksResult.data);
    } else {
        showToast(stocksResult.error.message, stocksResult.error.status);
    }

    buyTab.addEventListener('click', () => {
        document.getElementById('buy-tab').classList.add('active');
        document.getElementById('sell-tab').classList.remove('active');
    });
    sellTab.addEventListener('click', () => {
        document.getElementById('sell-tab').classList.add('active');
        document.getElementById('buy-tab').classList.remove('active');
    });
    quickSelectBtns.forEach(button => {
        button.addEventListener('click', () => {
            const amount = button.dataset.amount;
            setAmount(parseInt(amount));
        });
    });
    reviewOrderBtn.addEventListener('click', async () => {
        console.log('Review Order Button geklickt');

        const assetName = document.getElementById('asset-selector').value;
        console.log('Asset Name:', assetName);

        const amount = parseInt(document.getElementById('amount').value);
        console.log('Amount:', amount);

        const isBuy = document.getElementById('buy-tab').classList.contains('active');
        console.log('isBuy:', isBuy);

        if (!assetName || !amount || isNaN(amount) || amount <= 0) {
            console.error('Ungültige Eingabe:', {assetName, amount, isBuy});
            alert('Bitte wählen Sie eine Aktie und geben Sie eine gültige Anzahl ein.');
            return;
        }

        console.log('Sende Transaktion an Server...');
        let result;
        if (isBuy) {
            console.log('Kaufe Aktien:', assetName, 'Anzahl:', amount);
            result = await postPositions(assetName, amount);
        } else {
            console.log('Verkaufe Aktien:', assetName, 'Anzahl:', amount);
            result = await postPositions(assetName, -amount);
        }

        if (result.success) {
            console.log('Transaktion erfolgreich:', result.data);
            showToast('Transaktion erfolgreich!', 201, 'success');
        } else {
            console.log('Transaktion fehlgeschlagen:', result.error);
            showToast(result.error.message, result.error.status);
        }

        // Zurücksetzen
        console.log('Setze Formular zurück');
        setAmount(0);
        document.getElementById('asset-selector').value = 'default';

        // Optional: Depot aktualisieren
        console.log('Aktualisiere Depot...');
        const accountResult = await getAccount();
        if (accountResult.success) {
            console.log('Neue Depot-Daten:', accountResult.data);
            displayDepot(accountResult.data);
        } else {
            console.log('Fehler beim Aktualisieren des Depots:', accountResult.error);
            showToast(accountResult.error.message, accountResult.error.status);
        }
        console.log('Depot aktualisiert');
    });

    /**
     * Setzt die Anzahl in das Mengen-Inputfeld.
     *
     * @param {number} amount - Die zu setzende Anzahl.
     */
    function setAmount(amount) {
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.value = amount;
        }
    }

    const newsResult = await getNews();
    if (newsResult.success) {
        displayNews(newsResult.data);
    } else {
        showToast(newsResult.error.message, newsResult.error.status);
    }

    // event listener anhängen
    newsLastHourBtn.addEventListener('click', () =>
        loadNewsSince(60 * 60));

    newsLastDayBtn.addEventListener('click', () =>
        loadNewsSince(60 * 60 * 24));

    newLastTwentyBtn.addEventListener('click', () =>
        getNews(null).then(result => {
            if (result.success) {
                displayNews(result.data);
            } else {
                showToast(result.error.message, result.error.status);
            }
        }));


    const messagesResult = await getMessages();
    if (messagesResult.success) {
        displayMessages(messagesResult.data);
    } else {
        showToast(messagesResult.error.message, messagesResult.error.status);
    }

    await renderCharts();

    await populateRecipientSelector();

    sendBtn.addEventListener('click', async () => {
        // Hole Empfänger
        const selectedOptions = Array.from(
            document.getElementById('recipient-selector').selectedOptions
        );
        const recipients = selectedOptions.map(option => option.value);

        const message = document.getElementById('message-text').value.trim();

        if (recipients.length === 0) {
            alert('Bitte wählen Sie mindestens einen Empfänger aus.');
            return;
        }

        if (message.length === 0) {
            alert('Bitte geben Sie eine Nachricht ein.');
            return;
        }

        // Sende an alle ausgewählten Empfänger
        const results = await sendMessagesToMultiple(recipients, message);

        // zeige Ergebnis
        const successful = results.filter(r => r.result.success).length;
        alert(`Nachricht an ${successful} von ${recipients.length} Empfängern gesendet.`);

        // Zurücksetzen
        document.getElementById('message-text').value = '';
        selectedOptions.forEach(option => option.selected = false);

        // nachrichten aktualisieren
        const messagesResult = await getMessages();
        if (messagesResult.success) {
            displayMessages(messagesResult.data);
        } else {
            showToast(messagesResult.error.message, messagesResult.error.status);
        }
    });


    // intervals
    setInterval(renderCharts, 5000);
}

// === ENDE init() ===

/**
 * Lädt News ab einem bestimmten Zeitpunkt in der Vergangenheit und rendert sie im UI.
 *
 * @param secondsAgo - Anzahl der Sekunden, die von der aktuellen Zeit abgezogen werden sollen.
 */
function loadNewsSince(secondsAgo) {
    // aktueller unix timestamp
    const now = Math.floor(Date.now() / 1000);
    const lastTime = now - secondsAgo;

    // console.log('loadNewsSince aufgerufen mit lastTime:', lastTime);

    getNews(lastTime)
        .then(result => {
            if (result.success) {
                displayNews(result.data);
            } else {
                showToast(result.error.message, result.error.status);
            }
        })
        .catch(error => {
            console.error("Fehler beim Laden der news in loadNewsSince(): ", error);
            showToast('Netzwerkfehler: ' + error.message, 0);
        });
}


// globales objekt zum Speichern der Historie
window.stockHistory = {};

/**
 * Erzeugt Chart-Daten für alle verfügbaren Aktien.
 * Holt die aktuellen Kurse, speichert sie in window.stockHistory
 * und gibt formatiere Labels und Datasets für Chart.js zurück.
 *
 * @returns {Promise<{labels: string[], datasets: Object[]}>} - Objekt mit Zeitlabels und Datensätzen für jede Aktie.
 */
async function generateChartData() {
    // hole aktuelle kurse
    const stocksResult = await getStocks();
    if (!stocksResult.success) {
        console.error('Fehler beim Laden der Aktien für Chart:', stocksResult.error);
        showToast(stocksResult.error.message, stocksResult.error.status);
        return {labels: [], datasets: []};
    }
    const allStocks = stocksResult.data;

    // console.log('allStocks:', allStocks);
    // Zeitstempel hinzufügen
    const now = Date.now();

    // für jede aktie aktuellen Kurs speichern
    allStocks.forEach(stock => {
        if (!window.stockHistory[stock.name]) {
            window.stockHistory[stock.name] = [];
        }
        window.stockHistory[stock.name].push({
            timestamp: now,
            price: stock.price
        });
        // nur die letzten x Werte behalten
        const totalValues = 20;
        if (window.stockHistory[stock.name].length > totalValues) {
            window.stockHistory[stock.name].shift();
        }
    });

    // Zeitstempel von der ersten Aktie nehmen
    const firstStockName = allStocks[0]?.name;
    // console.log('firstStockName:', firstStockName);
    const labels = window.stockHistory[firstStockName]?.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'});
    }) || [];

    // console.log('labels:', labels);
    // Daten für jede Aktie aufbereiten
    const datasets = allStocks.map((stock, index) => {
        // Farbe für die Linie festlegen
        const colors = [
            'rgb(75, 192, 192)',
            'rgb(255, 99, 132)',
            'rgb(255, 205, 86)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)',
            'rgb(199, 199, 199)',
            'rgb(83, 102, 255)'
        ];
        const color = colors[index % colors.length];
        const data = window.stockHistory[stock.name]?.map(item => item.price) || [];

        // console.log('dataset data for', stock.name, ':', data);

        return {
            label: stock.name,
            data,
            borderColor: color,
            backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
            tension: 0.1,
            fill: false
        };
    });

    // console.log('datasets:', datasets);
    return {
        labels: labels,
        datasets: datasets
    };
}

/**
 * Rendert das Aktienkurs-Diagramm, holt vorbereitete Chart-Daten, zerstört ggf. das alte Chart.
 * und erzeugt ein neues Chart.js-Liniendiagramm.
 *
 * @returns {Promise<void>}.
 */
async function renderCharts() {
    const chartData = await generateChartData();

    const canvas = document.querySelector('.stock-chart');
    if (!canvas) {
        console.error('Canvas nicht gefunden');
        return;
    }
    const ctx = canvas.getContext('2d');

    // falls chart vorhanden => entfernen
    if (window.currentChart) {
        window.currentChart.destroy();
    }

    // neues chart erstellen
    window.currentChart = new Chart(ctx, {
        type: 'line',
        chartData,
        options: {
            responsive: true,
            animation: null,
            plugins: {
                title: {
                    display: true,
                    text: 'Aktuelle Kurse'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

/**
 * Sendet eine Nachricht an mehrere Empfänger, nacheinander.
 *
 * @param {string[]} recipients - Liste der Nutzer, an die die Nachricht gesendet wird.
 * @param {string} message - Der zu sendende Nachrichtentext.
 * @returns {Promise<{recipient: string, result: Object}[]>} Liste mit Ergebnissen pro Empfänger.
 */
async function sendMessagesToMultiple(recipients, message) {
    console.log('Sende nachricht an mehrere Empfänger: ', recipients);

    const results = [];

    for (const recipient of recipients) {
        console.log("Sende Nachricht an: ", recipient);
        const result = await postMessages(recipient, message);
        results.push({recipient, result});
        console.log("Ergebnis für", recipient, ':', result);
    }
    return results;
}
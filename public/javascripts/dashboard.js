"use strict";

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // elemente greifen
    const newsLastHourBtn = document.getElementById('newsLastHour');
    const newsLastDayBtn = document.getElementById('newsLastDay');
    const newLastTwentyBtn = document.getElementById('newsLastTwenty');
    const buyTab = document.getElementById('buy-tab');
    const sellTab = document.getElementById('sell-tab');
    const quickSelectBtns = document.querySelectorAll('.quick-select-btn');
    const reviewOrderBtn = document.getElementById('review-order');

    const userData = await getUser();
    displayUser(userData);
    //console.log('Templates NACH getUser():', document.querySelectorAll('template').length);

    const rankingData = await getEverybody();
    //console.log('Templates NACH getEverybody():', document.querySelectorAll('template').length);
    //console.log('rankingData erhalten:', rankingData);
    displayRanking(rankingData);

    const accountData = await getAccount();
    displayDepot(accountData);

    const stocks = await getStocks();
    displayStocks(stocks);
    populateAssetSelector(stocks);

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
        if (isBuy) {
            console.log('Kaufe Aktien:', assetName, 'Anzahl:', amount);
            const result = await postPositions(assetName, amount);
            console.log('Kauf-Antwort:', result);
        } else {
            console.log('Verkaufe Aktien:', assetName, 'Anzahl:', amount);
            const result = await postPositions(assetName, -amount);
            console.log('Verkauf-Antwort:', result);
        }

        // Zurücksetzen
        console.log('Setze Formular zurück');
        setAmount(0);
        document.getElementById('asset-selector').value = 'default';

        // Optional: Depot aktualisieren
        console.log('Aktualisiere Depot...');
        const accountData = await getAccount();
        console.log('Neue Depot-Daten:', accountData);
        displayDepot(accountData);
        console.log('Depot aktualisiert');
    });

    // Funktion: Setze die Anzahl in das Input-Feld
    function setAmount(amount) {
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.value = amount;
        }
    }

    const news = await getNews();
    displayNews(news);

    // event listener anhängen
    newsLastHourBtn.addEventListener('click', () =>
        loadNewsSince(60 * 60));

    newsLastDayBtn.addEventListener('click', () =>
        loadNewsSince(60 * 60 * 24));

    newLastTwentyBtn.addEventListener('click', () =>
        getNews(null).then(news => displayNews(news)));


    const messages = await getMessages();
    displayMessages(messages);

    await renderCharts();

    // intervals
    setInterval(renderCharts, 5000);
}

function loadNewsSince(secondsAgo) {
    // aktueller unix timestamp
    const now = Math.floor(Date.now() / 1000);
    const lastTime = now - secondsAgo;

    // console.log('loadNewsSince aufgerufen mit lastTime:', lastTime);

    getNews(lastTime)
        .then(news => displayNews(news))
        .catch(error => console.error("Fehler beim Laden der news in loadNewsSince(): ", error));
}


// globales objekt zum Speichern der Historie
window.stockHistory = {};

async function generateChartData() {
    // hole aktuelle kurse
    const allStocks = await getStocks();
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
        data: chartData,
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
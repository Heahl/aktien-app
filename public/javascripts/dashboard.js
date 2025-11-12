"use strict";

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // elemente greifen
    const newsLastHourBtn = document.getElementById('newsLastHour');
    const newsLastDayBtn = document.getElementById('newsLastDay');
    const newLastTwentyBtn = document.getElementById('newsLastTwenty');

    const userData = await getUser();
    displayUser(userData);
    //console.log('Templates NACH getUser():', document.querySelectorAll('template').length);

    const rankingData = await getEverybody();
    //console.log('Templates NACH getEverybody():', document.querySelectorAll('template').length);
    //console.log('rankingData erhalten:', rankingData);
    displayRanking(rankingData);

    const stocks = await getStocks();
    displayStocks(stocks);

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

    console.log('loadNewsSince aufgerufen mit lastTime:', lastTime);

    getNews(lastTime)
        .then(news => displayNews(news))
        .catch(error => console.error("Fehler beim Laden der news in loadNewsSince(): ", error));
}


// globales objekt zum Speichern der Historie
window.stockHistory = {};

async function generateChartData() {
    // hole aktuelle kurse
    const allStocks = await getStocks();
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
    const labels = window.stockHistory[firstStockName]?.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'});
    });

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
        const data = window.stockHistory[stock.name]?.map(item => item.price);

        return {
            label: stock.name,
            data,
            borderColor: color,
            backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
            tension: 0.1,
            fill: false
        };
    });

    return {
        labels: labels,
        datasets: datasets
    };
}

async function renderCharts() {
    const chartData = await generateChartData();

    const canvas = document.querySelector('.stock-chart');
    const ctx = canvas.getContext('2d');

    // falls chart vorhanden => entfernen
    while (window.currentChart) {
        window.currentChart.destroy();
    }

    // neues chart erstellen
    window.currentChart = new Chart(ctx, {
        type: 'line',
        chartData, options: {
            responsive: true,
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
"use strict";

// === GENERIC DOM HELPER FUNCTIONS ===

/**
 * Holt ein DOM-Element und loggt einen Error wenn nicht gefunden
 * @param {string} id - Die ID des Elements
 * @param {string} context - Kontext für die Fehlermeldung
 * @returns {HTMLElement|null} Das Element oder null
 */
function getElementSafe(id, context = '') {
    const element = document.getElementById(id);
    if (!element) {
        // console.error(`Element mit der id '${id}' nicht gefunden${context ? ' (' + context + ')' : ''}.`);
    }
    return element;
}

/**
 * Holt ein Template-Element und loggt einen Error wenn nicht gefunden
 * @param {string} id - Die ID des Templates
 * @param {string} context - Kontext für die Fehlermeldung
 * @returns {HTMLTemplateElement|null} Das Template oder null
 */
function getTemplateSafe(id, context = '') {
    const template = document.getElementById(id);
    if (!template) {
        // console.error(`Template mit id "${id}" nicht gefunden${context ? ' (' + context + ')' : ''}.`);
    }
    return template;
}

/**
 * Formatiert einen Betrag im Euro-Format
 * @param {number} amount - Der Betrag
 * @returns {string} Formattierter Betrag
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

/**
 * Formatiert ein ISO-Datum zu Uhrzeit
 * @param {string} isoString - ISO-Datumstring
 * @returns {string} Formatierte Uhrzeit
 */
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Leert einen Container von allen Kindern außer Templates
 * @param {HTMLElement} container - Der Container
 * @param {Function} filterFn - Optionale Filterfunktion für Kinder die behalten werden sollen
 */
function clearContainer(container, filterFn = null) {
    if (!container) return;

    const children = Array.from(container.children);
    children.forEach(child => {
        const shouldKeep = filterFn ? filterFn(child) : child.tagName === 'TEMPLATE';
        if (!shouldKeep) {
            container.removeChild(child);
        }
    });
}

/**
 * Füllt ein Select-Element mit Optionen
 * @param {HTMLSelectElement} select - Das Select-Element
 * @param {Array} options - Array von Optionen (value, text)
 * @param {string} defaultText - Text für Default-Option
 */
function populateSelect(select, options, defaultText = '-') {
    if (!select) return;

    // Leeren und Default-Option hinzufügen
    while (select.firstChild) {
        select.removeChild(select.firstChild);
    }

    if (defaultText) {
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = defaultText;
        select.appendChild(defaultOption);
    }

    // Optionen hinzufügen
    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.text;
        select.appendChild(optionEl);
    });
}

// === UI DISPLAY FUNCTIONS ===

/**
 * Zeigt username und account balance des Nutzers an
 *
 * @param userData :Object von getUser() übergebene Nutzerdaten
 */
function displayUser(userData) {
    const username = getElementSafe('username', 'displayUser');
    const accountBalance = getElementSafe('account-balance', 'displayUser');

    if (username && accountBalance) {
        username.textContent = userData.name;
        accountBalance.textContent = formatCurrency(userData.balance);
    }
}

/**
 * Zeige die Rangliste an
 *
 * @param rankingData :Object mit Namen + summe von balance und depot value von allen Nutzern
 */
function displayRanking(rankingData) {
    const container = getElementSafe('ranking-list-container', 'displayRanking');
    const template = getTemplateSafe('ranking-item-template', 'displayRanking');

    if (!container || !template) return;

    // Container leeren
    clearContainer(container);

    // Rangliste füllen
    rankingData.forEach((entry, index) => {
        const clone = document.importNode(template.content, true);

        const rankEl = clone.querySelector('.rank-column');
        const playerEl = clone.querySelector('.player-column');
        const valueEl = clone.querySelector('.value-column');

        if (rankEl) rankEl.textContent = index + 1;
        if (playerEl) playerEl.textContent = entry.name;
        if (valueEl) valueEl.textContent = formatCurrency(entry.sum);

        container.appendChild(clone);
    });
}

/**
 * Zeigt eine Liste mit allen Aktien, deren Werten und Verfügbarkeit an.
 *
 * @param stocksData :Object von getStocks übergebene Daten
 */
function displayStocks(stocksData) {
    const container = getElementSafe('stocks-container', 'displayStocks');
    const template = getTemplateSafe('stocks-template', 'displayStocks');

    if (!container || !template) return;

    // Container leeren
    clearContainer(container);

    // Aktien anzeigen
    stocksData.forEach(stock => {
        const clone = document.importNode(template.content, true);

        const nameEl = clone.querySelector('.stocks-name');
        const priceEl = clone.querySelector('.stocks-price');
        const availableEl = clone.querySelector('.stocks-available');

        if (nameEl) nameEl.textContent = stock.name;
        if (priceEl) priceEl.textContent = formatCurrency(stock.price);
        if (availableEl) availableEl.textContent = `Verfügbar: ${stock.numberAvailable}`;

        container.appendChild(clone);
    });
}

/**
 * Füllt das Selector Element zur Auswahl einzelner Aktien mit den Namen aller Unternehmen im depot.
 *
 * @param stocks :Object von getStocks() übergebene Daten
 */
function stockSelector(stocks) {
    const selectElement = getElementSafe('stockSelector', 'stockSelector');
    if (!selectElement) return;

    const options = stocks.map(stock => ({
        value: stock.name,
        text: stock.name
    }));

    populateSelect(selectElement, options);
}

/**
 * Zeigt alle Nachrichten mit Sender, Empfänger, Text und Datum an
 *
 * @param messagesData :[{}] von getMessages übergebene Daten
 */
function displayMessages(messagesData) {
    const container = getElementSafe('message-container', 'displayMessages');
    const template = getTemplateSafe('message-template', 'displayMessages');

    if (!container || !template) return;

    // Container leeren
    clearContainer(container);

    // Nachrichten anzeigen
    messagesData.forEach(message => {
        const clone = template.content.cloneNode(true);

        const senderEl = clone.querySelector('.message-sender');
        const recipientEl = clone.querySelector('.message-recipient');
        const textEl = clone.querySelector('.message-text');
        const dateEl = clone.querySelector('.message-date');

        if (senderEl) senderEl.textContent = message.sender;
        if (recipientEl) recipientEl.textContent = message.recipient;
        if (textEl) textEl.textContent = message.text;
        if (dateEl) dateEl.textContent = formatTime(message.date);

        container.appendChild(clone);
    });
}

/**
 * Zeigt News an
 *
 * @param news :[] News-Daten
 */

/*function displayNews(news) {
    const container = getElementSafe('news-container', 'displayNews');
    const template = getTemplateSafe('news-template', 'displayNews');

    if (!container || !template) return;

    // Container leeren (nur news-items, nicht das Template)
    clearContainer(container, child =>
        child === template || !child.classList || !child.classList.contains('news-item')
    );

    // News anzeigen
    news.forEach(item => {
        const clone = template.content.cloneNode(true);
        const timeElement = clone.querySelector('.news-time');
        const textElement = clone.querySelector('.news-text');

        if (timeElement) timeElement.textContent = item.time;
        if (textElement) textElement.textContent = item.text;

        container.appendChild(clone);
    });
}*/

/**
 * Zeigt das Depot an
 *
 * @param accountData :Object Account-Daten
 */
function displayDepot(accountData) {
    const container = getElementSafe('portfolio-container', 'displayDepot');
    const template = getTemplateSafe('portfolio-template', 'displayDepot');

    if (!container || !template) return;

    // Container leeren
    clearContainer(container);

    // Depotpositionen anzeigen
    accountData.positions.forEach(position => {
        // Nur anzeigen, wenn Anzahl > 0
        if (position.number > 0) {
            const clone = template.content.cloneNode(true);

            const nameElement = clone.querySelector('.portfolio-name');
            const valueElement = clone.querySelector('.portfolio-value');

            if (nameElement) nameElement.textContent = position.stock.name;
            if (valueElement) valueElement.textContent = `Anzahl: ${position.number}`;

            container.appendChild(clone);
        }
    });
}

/**
 * Füllt den Asset-Selector mit Aktien
 *
 * @param stocks :Object Aktien-Daten
 */
function populateAssetSelector(stocks) {
    const select = getElementSafe('asset-selector', 'populateAssetSelector');
    if (!select) return;

    const options = stocks.map(stock => ({
        value: stock.name,
        text: stock.name
    }));

    populateSelect(select, options, '-');
}

// === RECIPIENT SELECTION ===

let selectedRecipients = new Set();

/**
 * Füllt die Empfänger-Select-Box mit allen Nutzern
 */
async function populateRecipientSelector() {
    const container = getElementSafe('recipient-selector-container', 'populateRecipientSelector');
    const username = getElementSafe('username', 'recipient-selector');
    if (!container) return;
    if (!username) return;

    // Container leeren
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    try {
        const result = await getEverybody();

        if (result.success) {
            const users = result.data.filter(user => user.name !== username.textContent);

            users.forEach(user => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'recipient-btn';
                button.textContent = user.name;
                button.setAttribute('data-recipient-name', user.name);

                button.addEventListener('click', () => {
                    if (selectedRecipients.has(user.name)) {
                        selectedRecipients.delete(user.name);
                        button.classList.remove('selected');
                    } else {
                        selectedRecipients.add(user.name);
                        button.classList.add('selected');
                    }
                    // console.log('Ausgewählte Empfänger:', Array.from(selectedRecipients));
                });

                container.appendChild(button);
            });
        } else {
            // console.error("Fehler bei getEverybody():", result.error);
            showToast(result.error.message, result.error.status);
        }
    } catch (e) {
        // console.error('Fehler beim Laden der Nutzer:', e.message);
        showToast("Fehler beim Laden der Nutzer", e.message);
    }
}

/**
 * Hole die aktuell ausgewählten Empfänger
 */
function getSelectedRecipients() {
    return Array.from(selectedRecipients);
}

// === TOAST NOTIFICATIONS ===

/**
 * Zeigt eine Toast-Benachrichtigung an
 *
 * @param message :string Nachricht
 * @param status :number Statuscode
 * @param type :string Typ der Nachricht
 */
function showToast(message, status, type = "error") {
    const container = getElementSafe('toast-container', 'showToast');
    const template = getTemplateSafe('toast-template', 'showToast');

    if (!container || !template) return;

    const clone = template.content.cloneNode(true);
    const toast = clone.querySelector('.toast');
    const statusElement = clone.querySelector('.toast-status');
    const messageElement = clone.querySelector('.toast-message');
    const closeBtn = clone.querySelector('.toast-close');

    if (statusElement) statusElement.textContent = `Status: ${status}`;
    if (messageElement) messageElement.textContent = message;
    if (toast) toast.className = `toast toast-${type}`;
    if (closeBtn) closeBtn.addEventListener('click', () => toast.remove());

    // Automatisch nach 6 Sekunden entfernen
    setTimeout(() => toast.remove(), 6000);

    container.appendChild(toast);
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
        // console.error('Fehler beim Laden der Aktien für Chart:', stocksResult.error);
        showToast(stocksResult.error.message, stocksResult.error.status);
        return {labels: [], datasets: []};
    }
    const allStocks = stocksResult.data;

    // // // // console.log('allStocks:', allStocks);
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
    // // // // console.log('firstStockName:', firstStockName);
    const labels = window.stockHistory[firstStockName]?.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'});
    }) || [];

    // // // // console.log('labels:', labels);
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

        // // // // console.log('dataset data for', stock.name, ':', data);

        return {
            label: stock.name,
            data: data,
            borderColor: color,
            backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
            tension: 0.1,
            fill: false
        };
    });

    // // // // console.log('datasets:', datasets);
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
        // console.error('Canvas nicht gefunden');
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
            maintainAspectRatio: false,
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

// === GLOBAL EXPORTS ===

window.displayUser = displayUser;
window.displayRanking = displayRanking;
window.displayStocks = displayStocks;
window.stockSelector = stockSelector;
window.displayMessages = displayMessages;
//window.displayNews = displayNews;
window.displayDepot = displayDepot;
window.populateAssetSelector = populateAssetSelector;
window.populateRecipientSelector = populateRecipientSelector;
window.getSelectedRecipients = getSelectedRecipients;
window.showToast = showToast;
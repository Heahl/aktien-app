"use strict";

// === Utility Functions ===

/**
 * Holt ein Element und gibt Error
 */
function getElement(id, context = '') {
    const element = document.getElementById(id);
    if (!element) {
        showToast(`Element mit id ${id} nicht gefunden. ${context ? '( ' + context + ' )' : ''}`, 404);
    }
    return element;
}

/**
 * Setzt die Anzahl im Input-Feld
 */
function setAmount(amount) {
    const amountInput = getElement('amount');
    if (amountInput) {
        amountInput.value = amount;
    }
}

/**
 * Führt eine Transaktion aus und aktualisiert das UI
 */
async function executeTrade(assetName, amount, isBuy) {
    if (!assetName || amount <= 0) {
        showToast('Bitte wählen Sie eine Aktie und eine gültige Anzahl aus.', 504);
        return;
    }
    const result = await postPositions(assetName, isBuy ? amount : -amount);

    if (result.success) {
        showToast('Transaktion erfolgreich!', 201, 'success');
    } else {
        showToast(result.error.message, result.error.status);
    }
    // UI aktualisieren
    await refreshUserData();
    await renderCharts();
}

/**
 * Aktualisiert Benutzer- und Depotdaten
 */
async function refreshUserData() {
    const [accountResult, userResult] = await Promise.all([
        getAccount(),
        getUser()
    ]);

    if (accountResult.success) {
        displayDepot(accountResult.data);
    } else {
        showToast(accountResult.error.message, accountResult.error.status);
    }

    if (userResult.success) {
        displayUser(userResult.data);
    } else {
        showToast(userResult.error.message, userResult.error.status);
    }
}

/**
 * Lädt Daten und aktualisiert UI bei Erfolg
 */
async function loadAndDisplayData(loader, displayer, errorContext) {
    const result = await loader();
    if (result.success) {
        displayer(result.data);
        return true;
    } else {
        showToast(result.error.message, result.error.status);
        return false;
    }
}

/**
 * Initialisiert event-listener für Tabs
 */
function initTabs() {
    const buyTab = getElement('buy-tab');
    const sellTab = getElement('sell-tab');

    if (buyTab && sellTab) {
        buyTab.addEventListener('click', () => {
            buyTab.classList.add('active');
            sellTab.classList.remove('active');
        });

        sellTab.addEventListener('click', () => {
            sellTab.classList.add('active');
            buyTab.classList.remove('active');
        });
    }
}

/**
 * Initialisiert Quick-Select Btns
 */
function initQuickSelectButtons() {
    // buy
    document.querySelectorAll('.quick-select-btn-buy').forEach(button => {
        button.addEventListener('click', () => {
            const amount = parseInt(button.dataset.amount);
            const assetName = getElement('asset-selector')?.value;
            executeTrade(assetName, amount, true);
        });
    });
    // sell
    document.querySelectorAll('.quick-select-btn-sell').forEach(button => {
        button.addEventListener('click', () => {
            const amount = parseInt(button.dataset.amount);
            const assetName = getElement('asset-selector')?.value;
            executeTrade(assetName, amount, false);
        });
    });
}

/**
 * Initialisiert News-Filter
 */

/*function initNewsFilter() {
    const newsLastHourBtn = getElement('newsLastHour');
    const newsLastDayBtn = getElement('newsLastDay');
    const newsLastTwentyBtn = getElement('newsLastTwenty');

    if (newsLastHourBtn) {
        newsLastHourBtn.addEventListener('click', () => {
            loadNewsSince(newsFilters.lastHour)
        });
    }
    if (newsLastDayBtn) {
        newsLastDayBtn.addEventListener('click', () => {
            loadNewsSince(newsFilters.lastDay)
        });
    }
    if (newsLastTwentyBtn) {
        newsLastTwentyBtn.addEventListener('click', async () => {
            await loadAndDisplayData(getNews, displayNews, 'News');
        });
    }
}

/**
 * Initialisiert send btn für nachrichten
 */
function initMessageSender() {
    const sendBtn = getElement('send-message');
    const messageInput = getElement('message-text');

    if (!sendBtn || !messageInput) return;

    sendBtn.addEventListener('click', async () => {
        const recipients = getSelectedRecipients();
        const message = messageInput.value.trim();

        if (recipients.length === 0) {
            showToast('Bitte wählen Sie mindestens einen Empfänger aus!', 304, 'warning');
            return;
        }

        if (message.length === 0) {
            showToast('Bitte geben Sie eine Nachricht ein.', 304, 'warning');
            return;
        }

        // Nachricht(en) senden - egal ob 1 oder mehrere Empfänger
        const result = await postMessages(recipients, message);
        const successful = result.sent || (result.success ? 1 : 0); // Für Einzel-Empfänger ist 'sent' nicht definiert

        // Toast-Nachricht anzeigen
        if (result.success) {
            showToast(`Nachricht${recipients.length > 1 ? 'en' : ''} erfolgreich gesendet.`, 1, 'success');
        } else {
            showToast(`Fehler beim Senden: ${result.sent} erfolgreich, ${result.failed} fehlgeschlagen.`, 2, 'warning');
        }

        // UI zurücksetzen
        if (typeof selectedRecipients !== 'undefined' && selectedRecipients.clear) {
            selectedRecipients.clear();
        }
        document.querySelectorAll('#recipient-selector-container .recipient-btn').forEach(btn => btn.classList.remove('selected'));
        messageInput.value = '';

        // Nachrichten aktualisieren
        await loadAndDisplayData(getMessages, displayMessages, 'Messages');
    });
}

/**
 * initialisiert review order button
 */
function initReviewOrder() {
    const reviewOrderBtn = getElement('review-order');
    if (!reviewOrderBtn) return;

    reviewOrderBtn.addEventListener('click', async () => {
        const assetName = getElement('asset-selector')?.value;
        const amount = parseInt(getElement('amount')?.value || '0');
        const isBuy = getElement('buy-tab')?.classList.contains('active');

        if (!assetName || !amount || isNaN(amount) || amount <= 0) {
            showToast('Bitte wählen Sie eine Aktie und geben Sie eine gültige Anzahl ein.');
            return;
        }

        await executeTrade(assetName, amount, isBuy);

        // Formular zurücksetzen
        setAmount(0);
        const assetSelector = getElement('asset-selector');
        if (assetSelector) assetSelector.value = 'default';
    });
}

/**
 * Startet alle polling-intervalle
 */
function startPolling() {
    // Kurse + chart
    setInterval(async () => {
        const result = await getStocks();
        if (result.success) {
            displayStocks(result.data);
            await renderCharts();
        }
    }, pollingIntervals.stocks);

    // depot + nutzer
    setInterval(refreshUserData, pollingIntervals.account);

    // Rangliste
    setInterval(async () => {
        await loadAndDisplayData(getEverybody, displayRanking, 'Ranking');
    }, pollingIntervals.ranking);

    // Nachrichten
    /*    setInterval(async () => {
            await loadAndDisplayData(getNews, displayNews, 'News');
        }, pollingIntervals.news);*/

    // trading-strategie
    if (window.tradingStrategy) {
        setInterval(() => {
            window.tradingStrategy.updateAllStocks();
            window.tradingStrategy.autoTrade();
        }, pollingIntervals.trading);
    }
}

window.getElement = getElement;
window.setAmount = setAmount;
window.executeTrade = executeTrade;
window.refreshUserData = refreshUserData;
window.loadAndDisplayData = loadAndDisplayData;
window.initTabs = initTabs;
window.initQuickSelectButtons = initQuickSelectButtons;
//window.initNewsFilter = initNewsFilter;
window.initMessageSender = initMessageSender;
window.initReviewOrder = initReviewOrder;
window.startPolling = startPolling;
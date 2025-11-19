"use strict";

document.addEventListener('DOMContentLoaded', init);

const pollingIntervals = {
    stocks: 5 * 1000,
    account: 3 * 1000,
    ranking: 6 * 1000,
    messages: 15 * 1000,
    news: 60 * 1000,
    trading: .5 * 1000
};

/*const newsFilters = {
    lastHour: 60 * 60,
    lastDay: 60 * 60 * 24
};*/

/**
 * Initialisiert die gesamte Anwendung
 * @returns {Promise<void>}
 */
async function init() {
    try {
        // Element-Cache für häufig verwendete Elemente
        const elements = {
            buyTab: window.getElement('buy-tab'),
            sellTab: window.getElement('sell-tab'),
            reviewOrderBtn: window.getElement('review-order'),
            sendBtn: window.getElement('send-message')
        };

        // Initiale Daten laden
        await Promise.all([
            loadAndDisplayData(getUser, displayUser, 'User'),
            loadAndDisplayData(getEverybody, displayRanking, 'Ranking'),
            loadAndDisplayData(getAccount, displayDepot, 'Account'),
            loadAndDisplayData(getStocks, (data) => {
                displayStocks(data);
                populateAssetSelector(data);
            }, 'Stocks'),
            //loadAndDisplayData(getNews, displayNews, 'News'),
            loadAndDisplayData(getMessages, displayMessages, 'Messages')
        ]);

        // Charts rendern
        await renderCharts();

        // Empfänger-Selector initialisieren
        await populateRecipientSelector();

        // Event-Listener initialisieren
        initTabs();
        initQuickSelectButtons();
        //initNewsFilter();
        initMessageSender();
        initReviewOrder();

        // Polling starten
        startPolling();

        console.log('Anwendung erfolgreich initialisiert');

    } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
        showToast('Fehler bei der Initialisierung: ' + error.message, 0);
    }
}
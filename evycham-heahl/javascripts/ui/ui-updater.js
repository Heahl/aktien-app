"use strict";

/**
 * Zeigt username und account balance des Nutzers an
 *
 * @param userData :Object von getUser() übergebene Nutzerdaten
 */
function displayUser(userData) {
    // dom elemente holen
    const username = document.getElementById('username');
    const accountBalance = document.getElementById('account-balance');

    // checks
    if (!username) {
        console.error("Element mit der id 'username' nicht gefunden.");
    }
    if (!accountBalance) {
        console.error("Element mit der id 'account-balance' nicht gefunden.");
    }

    // username und account balance initial schreiben.
    username.textContent = userData.name;
    accountBalance.textContent = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(userData.balance);
}

/**
 * Zeige die Rangliste an
 *
 * @param rankingData :Object mit Namen + summe von balance und depot value von allen Nutzern
 */
function displayRanking(rankingData) {
    // dom elemente holen
    const container = document.getElementById('ranking-list-container');

    // checks
    if (!container) {
        console.error("Element mit der id 'ranking-list-container' nicht gefunden");
    }

    const rankingTemplate = document.getElementById('ranking-item-template');
    if (!rankingTemplate) {
        console.error('Template mit id "ranking-item-template" nicht gefunden.');
        // console.log('Vorhandene Templates:', document.querySelectorAll('template'));
        return;
    }

    // Leere Container von alten Einträgen (außer Template)
    const children = Array.from(container.children);
    children.forEach(child => {
        if (child !== rankingTemplate) {
            container.removeChild(child);
        }
    });

    rankingData.forEach((entry, index) => {
        const clone = document.importNode(rankingTemplate.content, true);

        const rankEl = clone.querySelector('.rank-column');
        const playerEl = clone.querySelector('.player-column');
        const valueEl = clone.querySelector('.value-column');

        if (rankEl) rankEl.textContent = index + 1;
        if (playerEl) playerEl.textContent = entry.name;
        if (valueEl) valueEl.textContent = new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(entry.sum);

        container.appendChild(clone);
    });
}

/**
 * Zeigt eine Liste mit allen Aktien, deren Werten und Verfügbarkeit an.
 *
 * @param stocksData :Object von getStocks übergebene Daten
 */
function displayStocks(stocksData) {
    const container = document.getElementById('stocks-container');
    if (!container) {
        console.error("Element mit der id 'stocks-container' nicht gefunden.");
    }

    const template = document.getElementById('stocks-template');
    const children = Array.from(container.children);

    children.forEach(child => {
        if (child !== template) {
            container.removeChild(child);
        }
    });

    // template holen
    if (!template) {
        console.error("Template mit id 'stocks-template' nicht gefunden.");
        return;
    }

    // Für jede Aktie: Template klonen und mit Daten füllen
    stocksData.forEach(stock => {
        const clone = document.importNode(template.content, true);

        const nameEl = clone.querySelector('.stocks-name');
        const priceEl = clone.querySelector('.stocks-price');
        const availableEl = clone.querySelector('.stocks-available');

        if (nameEl) nameEl.textContent = stock.name;
        if (priceEl) priceEl.textContent = new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(stock.price);
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
    const selectElement = document.getElementById('stockSelector');
    if (!selectElement) {
        console.error("Element mit der id 'stockSelector' wurde nicht gefunden.");
    }

    // feld leeren
    while (selectElement.children.length > 0) {
        selectElement.removeChild(selectElement.lastChild);
    }

    stocks.forEach(stock => {
        const option = document.createElement('option');
        option.value = stock.name;
        option.textContent = stock.name;
        selectElement.appendChild(option);
    })
}

/**
 * Zeigt alle Nachrichten mit Sender, Empfänger, Text und Datum an
 *
 * @param messagesData :[{}] von getMessages übergebene Daten
 */
function displayMessages(messagesData) {
    const container = document.getElementById('message-container');
    const template = document.getElementById('message-template');
    const children = Array.from(container.children);
    if (!container) {
        console.error("Element mit der id 'message-container' nicht gefunden.");
        return;
    }
    if (!template) {
        console.error("Element mit der id 'message-template' nicht gefunden.");
        return;
    }
    if (!children) {
        console.error("Keine children in container gefunden");
        return;
    }
    children.forEach(child => {
        if (child !== template) {
            container.removeChild(child);
        }
    });

    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    messagesData.forEach(message => {
        const clone = template.content.cloneNode(true);

        const senderEl = clone.querySelector('.message-sender');
        const recipientEl = clone.querySelector('.message-recipient');
        const textEl = clone.querySelector('.message-text');
        const dateEl = clone.querySelector('.message-date');

        if (senderEl) senderEl.textContent = message.sender;
        if (recipientEl) recipientEl.textContent = message.recipient;
        if (textEl) textEl.textContent = message.text;
        if (dateEl) dateEl.textContent = formatDate(message.date);

        container.appendChild(clone);
    })
}

function displayNews(news) {
    // dom anfassen
    const container = document.getElementById('news-container');
    const template = document.getElementById('news-template');
    const children = Array.from(container.children);
    if (!container) {
        console.error("Element mit der id 'news-container' nicht gefunden");
        return;
    }
    if (!template) {
        console.error("Element mit der id 'news-template' nicht gefunden");
        return;
    }
    if (!children) {
        console.error("Children von Container nicht gefunden");
    }
    // leeren
    children.forEach(child => {
        if (child !== template && child.classList.contains('news-item')) {
            container.removeChild(child);
        }
    });
    // einfügen
    news.forEach(item => {
        const clone = template.content.cloneNode(true);
        const timeElement = clone.querySelector('.news-time');
        const textElement = clone.querySelector('.news-text');

        if (timeElement) timeElement.textContent = item.time;
        if (textElement) textElement.textContent = item.text;

        container.appendChild(clone);
    })
}

function displayDepot(accountData) {
    const container = document.getElementById('portfolio-container');
    const template = document.getElementById('portfolio-template');
    const children = Array.from(container.children);

    if (!container) {
        console.error("Element mit der id 'portfolio-container' nicht gefunden");
        return;
    }
    if (!template) {
        console.error("Element mit der id 'portfolio-template' nicht gefunden");
        return;
    }

    // leeren
    children.forEach(child => {
        if (child !== template) {
            container.removeChild(child);
        }
    });

    // console.log('accountData.positions:', accountData.positions);

    // Alle Positionen im Depot schreiben
    accountData.positions.forEach(position => {
        // console.log('position:', position);

        // Nur anzeigen, wenn Anzahl > 0
        if (position.number > 0) {
            const clone = template.content.cloneNode(true);

            const nameElement = clone.querySelector('.portfolio-name');
            const valueElement = clone.querySelector('.portfolio-value');

            // console.log('nameElement:', nameElement);
            // console.log('valueElement:', valueElement);

            if (nameElement) nameElement.textContent = position.stock.name;
            if (valueElement) valueElement.textContent = `Anzahl: ${position.number}`;

            // console.log('nameElement.textContent:', nameElement?.textContent);
            // console.log('valueElement.textContent:', valueElement?.textContent);

            container.appendChild(clone);
        }
    });
}

function populateAssetSelector(stocks) {
    const select = document.getElementById('asset-selector');
    if (!select) {
        console.error("Element mit der id 'asset-selector' nicht gefunden");
    }

    while (select.firstChild) {
        select.removeChild(select.firstChild);
    }
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = "-";
    select.appendChild(defaultOption);

    stocks.forEach(stock => {
        const option = document.createElement('option');
        option.value = stock.name;
        option.textContent = stock.name;
        select.appendChild(option);
    });
}

let selectedRecipients = new Set();

// Funktion: Fülle die Empfänger-Select-Box mit allen Nutzern (ersetzt Select mit Buttons)
async function populateRecipientSelector() {
    const container = document.getElementById('recipient-selector-container');
    if (!container) {
        console.error("Element mit ID 'recipient-selector-container' nicht gefunden.");
        return;
    }

    // Leere Container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    try {
        // Hole alle Nutzer
        const result = await getEverybody();

        if (result.success) {
            console.log("Empfänger-Daten von Server:", result.data);
            const users = result.data;
            // Für jeden Nutzer: Button hinzufügen
            users.forEach(user => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'recipient-btn';
                button.textContent = user.name;
                button.setAttribute('data-recipient-name', user.name);

                // Event-Listener zum Umschalten der Auswahl
                button.addEventListener('click', () => {
                    if (selectedRecipients.has(user.name)) {
                        selectedRecipients.delete(user.name);
                        button.classList.remove('selected');
                    } else {
                        selectedRecipients.add(user.name);
                        button.classList.add('selected');
                    }
                    console.log('Ausgewählte Empfänger:', Array.from(selectedRecipients));
                });

                container.appendChild(button);
            });
        } else {
            console.error("Fehler bei getEverybody():", result.error);
            showToast(result.error.message, result.error.status);
        }
    } catch (e) {
        console.error('Fehler beim Laden der Nutzer:', e.message);
        showToast("Fehler beim Laden der Nutzer", e.message);
    }
}

// Funktion: Hole die aktuell ausgewählten Empfänger
function getSelectedRecipients() {
    return Array.from(selectedRecipients);
}

// Zeige toast (aufgerufen in api-client, wenn !response.ok)
function showToast(message, status, type = "error") {
    const container = document.getElementById('toast-container');
    const template = document.getElementById('toast-template');
    if (!container) {
        console.error("Element mit der id 'toast-container' nicht gefunden");
        return;
    }
    if (!template) {
        console.error("Element mit der id 'toast-template' nicht gefunden");
        return;
    }

    const clone = template.content.cloneNode(true);
    const toast = clone.querySelector('.toast');
    const statusElement = clone.querySelector('.toast-status');
    const messageElement = clone.querySelector('.toast-message');
    const closeBtn = clone.querySelector('.toast-close');

    if (statusElement) statusElement.textContent = `Status: ${status}`;
    if (messageElement) messageElement.textContent = message;
    // falls wir später noch andere Typen implementieren wollen (zB. warning)

    // TEST UNTEN

    // if (toast) toast.className = `toast toast-${type}`;


    // TEXT && FARBE

    if(toast) {
        if (status >= 200 && status < 300) {
            statusElement.textContent = `Erfolg (${status})`;
            toast.classList.add('toast-success');
        }
        statusElement.textContent = `Fehler (${status})`;
        toast.classList.add('toast-error');
    }

    // TEST OBEN

    if (closeBtn) closeBtn.addEventListener('click', () => {
        toast.remove();
    });

    // automatisch nach 6sec entfernen
    setTimeout(() => {
        toast.remove();
    }, 6 * 1000);

    document.getElementById('toast-container').appendChild(toast);
}


window.displayUser = displayUser;
window.displayRanking = displayRanking;
window.displayStocks = displayStocks;
window.stockSelector = stockSelector;
window.displayMessages = displayMessages;
window.displayNews = displayNews;
window.populateAssetSelector = populateAssetSelector;
window.populateRecipientSelector = populateRecipientSelector;
window.getSelectedRecipients = getSelectedRecipients;
window.showToast = showToast;
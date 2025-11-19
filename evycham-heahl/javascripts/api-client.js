"use strict";

// === GENERIC API HELPER ===

/**
 * Führt einen generischen API-Aufruf durch und behandelt Fehler konsistent.
 *
 * @param {string} endpoint - Der API-Endpunkt
 * @param {Object} options - Fetch-Optionen (method, headers, body, etc.)
 * @param {Object} params - URL-Parameter (optional)
 * @returns {Promise<Object>} API-Antwort mit success/error Struktur
 */
async function apiCall(endpoint, options = {}, params = null) {
    try {
        // URL mit Parametern zusammenbauen
        let url = endpoint;
        if (params && Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }

        const response = await fetch(url, options);
        const result = {
            success: response.ok,
            status: response.status,
            cache: 'no-cache'
        };

        // Spezielle Behandlung für 304 - Server verhält sich falsch, aber wir tolerieren es
        if (response.status === 304) {
            result.success = true;
            result.data = null; // Keine neuen Daten, aber kein Fehler
            return result;
        }

        // Je nach Statuscode behandeln
        switch (response.status) {
            case 200:
            case 201:
                result.data = await response.json();
                break;
            case 422:
            case 500:
                const errorData = await response.json();
                result.error = {
                    status: response.status,
                    message: errorData.message || `HTTP ${response.status}`
                };
                break;
            default:
                if (!response.ok) {
                    result.error = {
                        status: response.status,
                        message: `HTTP ${response.status}`
                    };
                }
        }

        return result;
    } catch (e) {
        console.error('Netzwerkfehler:', e.message);
        return {
            success: false,
            error: {
                status: 0,
                message: "Netzwerkfehler: " + e.message
            }
        };
    }
}

// === GET FUNCTIONS ===

/**
 * Holt die Depotpositionen des authentifizierten Users und seines total depot values.
 *
 * @returns {Promise<Object|null>} Depot-Daten oder null bei Fehler.
 */
async function getAccount() {
    return apiCall('/api/account');
}

/**
 * Holt Nachrichten/News des authentifizierten Nutzers.
 * Optional nach timestamp gefiltert.
 * Ohne parameter → erste 20 Nachrichten.
 *
 * @param {string} endpoint - Der API-Endpunkt ('/api/messages' oder '/api/news')
 * @param {number} lastTime - timestamp der ältesten zu filternden Nachricht (optional)
 * @returns {Promise<Object|null>} Nachrichten | null bei Fehler.
 */
async function getMessagesOrNews(endpoint, lastTime) {
    const params = lastTime !== undefined ? {lastTime} : null;
    return apiCall(endpoint, {}, params);
}

/**
 * Holt die Nachrichten des authentifizierten Nutzers.
 * Optional nach timestamp gefiltert.
 * Ohne parameter → erste 20 Nachrichten.
 *
 * @param lastTime timestamp der ältesten zu filternden Nachricht.
 * @returns {Promise<Object|null>} Nachrichten | null bei Fehler.
 */
async function getMessages(lastTime) {
    return getMessagesOrNews('/api/messages', lastTime);
}

/**
 * Holt news Nachrichten.
 * optional nach timestamp gefiltert.
 * ohne parameter → erste 20 Nachrichten.
 *
 * @param lastTime timestamp der ältesten zu filternden Nachricht.
 * @returns {Promise<Object|null>} News | null bei Fehler.
 */

/*async function getNews(lastTime) {
    return getMessagesOrNews('/api/news', lastTime);
}*/

/**
 * Holt eine Liste aller verfügbaren Aktien auf dem Markt.
 *
 * @returns {Promise<any|null>} Liste von Aktien | null bei Fehler.
 */
async function getStocks() {
    return apiCall('/api/stocks');
}

/**
 * Holt den Namen und die balance des authentifizierten Nutzers.
 *
 * @returns {Promise<{success: boolean, data?: {name: string, balance: number}, error?: {status: number, message: string}}>} Ergebnis.
 */
async function getUser() {
    return apiCall('/api/user');
}

/**
 * Holt die Summe von balance und depot value von allen Nutzern.
 *
 * @returns {Promise<any|null>} Objekt {name,balance} | null bei Fehler.
 */
async function getEverybody() {
    return apiCall('/api/user/everybody');
}

// === POST FUNCTIONS ===

/**
 * Validiert Parameter für Aktien-Transaktionen.
 *
 * @param {string} stockName - Name der Aktie
 * @param {number} number - Anzahl der Positionen
 * @returns {boolean} true wenn gültig, sonst false
 */
function validateStockParameters(stockName, number) {
    // Typ prüfen
    if (typeof stockName !== "string" || typeof number !== "number") {
        console.error('Ungültige Parameter');
        return false;
    }
    // Wertebereich prüfen
    if (number === 0) {
        console.error('Anzahl darf nicht 0 sein');
        return false;
    }
    // Stringlänge prüfen
    if (stockName.length > 50 || stockName.length === 0) {
        console.error('Ungültiger Aktienname');
        return false;
    }
    return true;
}

/**
 * Schreibt kaufen/verkaufen von Aktien in das depot des Nutzers.
 *
 * @param stockName :string name der Aktie.
 * @param number :number Anzahl der zu kaufenden/verkaufenden Positionen.
 * @returns {Promise<any|null>} Objekt | null bei Fehler.
 */
async function postPositions(stockName, number) {
    if (!validateStockParameters(stockName, number)) {
        return null;
    }

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            stock: {name: stockName},
            number: number
        })
    };

    return apiCall('/api/account/positions', options);
}

/**
 * Validiert Parameter für Nachrichten.
 *
 * @param {string} recipient - Empfänger der Nachricht
 * @param {string} message - Zu sendende Nachricht
 * @returns {boolean} true wenn gültig, sonst false
 */
function validateMessageParameters(recipient, message) {
    // Typ prüfen
    if (typeof recipient !== 'string' || typeof message !== 'string') {
        console.error('Ungültige Parameter: beide müssen string sein.');
        return false;
    }
    // Länge prüfen
    if (recipient.trim().length === 0 || message.trim().length === 0) {
        console.error('Empfänger / Nachricht zu kurz');
        return false;
    }
    if (recipient.length > 50 || message.length > 500) {
        console.error('Empfänger / Nachricht zu lang');
        return false;
    }
    return true;
}

/**
 * Sendet eine Nachricht an einen oder mehrere Nutzer.
 *
 * @param {string|string[]} recipient - Einzelner Empfänger oder Array von Empfängernamen
 * @param {string} message - Zu sendende Nachricht
 * @returns {Promise<{success: boolean, sent?: number, failed?: number, errors?: Array}|null>} Ergebnisobjekt | null bei Parameterfehler
 */
async function postMessages(recipient, message) {
    // Unterscheiden zwischen einzelner Nachricht und mehreren Nachrichten
    if (Array.isArray(recipient)) {
        // Mehrere Empfänger - gleiche Logik wie unsere sendMessagesToMultiple
        const recipients = recipient;

        if (recipients.length === 0) {
            console.error('Ungültige Empfängerliste: Muss Array mit mindestens einem Empfänger sein');
            return {
                success: false,
                sent: 0,
                failed: 0,
                error: {status: 400, message: 'Keine Empfänger angegeben'}
            };
        }

        // Validierung der Nachricht (für alle Empfänger gemeinsam)
        if (typeof message !== 'string' || message.trim().length === 0 || message.length > 500) {
            console.error('Ungültige Nachricht: Muss String mit 1-500 Zeichen sein');
            return {
                success: false,
                sent: 0,
                failed: 0,
                error: {status: 400, message: 'Ungültige Nachricht'}
            };
        }

        let sentCount = 0;
        let failedCount = 0;
        const errors = [];

        // Nachrichten nacheinander senden
        for (const singleRecipient of recipients) {
            if (typeof singleRecipient !== 'string' || singleRecipient.trim().length === 0) {
                failedCount++;
                errors.push({
                    recipient: singleRecipient,
                    error: {status: 400, message: 'Ungültiger Empfängername'}
                });
                continue;
            }

            const singleResult = await postMessages(singleRecipient, message); // Rekursiver Aufruf für Einzel-Empfänger
            if (singleResult && singleResult.success) {
                sentCount++;
            } else {
                failedCount++;
                errors.push({
                    recipient: singleRecipient,
                    error: singleResult?.error || {status: 0, message: 'Unbekannter Fehler'}
                });
            }
        }

        return {
            success: failedCount === 0,
            sent: sentCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined
        };
    } else {
        // Einzelner Empfänger - ursprüngliche Logik
        if (!validateMessageParameters(recipient, message)) {
            return null;
        }

        const options = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient: recipient,
                message: message
            })
        };

        return apiCall('/api/messages', options);
    }
}
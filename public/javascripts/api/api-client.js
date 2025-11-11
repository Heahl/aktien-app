"use strict";

// === GET ===

/**
 * Holt die Depot Positionen des authentifizierten Users und seines total depot values
 *
 * @returns {Promise<Object|null>} Depot-Daten oder null bei Fehler
 */
async function getAccount(){
    const isLocalhost = location.hostname==='localhost'|| location.hostname==='127.0.0.1';
    if(isLocalhost){
        console.warn('lokale Testumgebung');
        return {
            "positions": [
                {
                    "stock": {
                        "name": "adidas",
                        "price": 1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Allianz",
                        "price": 326.42,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "BASF",
                        "price": 74.21,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Bayer",
                        "price": 5.64,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Beiersdorf",
                        "price": 127.19,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "BMW",
                        "price": 1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Continental",
                        "price": 1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Covestro",
                        "price": 1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Daimler",
                        "price": 230.81,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Delivery Hero",
                        "price": 37.1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Deutsche Bank",
                        "price": 1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Deutsche Börse",
                        "price": 13.08,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Deutsche Post",
                        "price": 1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Deutsche Telekom",
                        "price": 19.14,
                        "numberAvailable": 100000
                    },
                    "number": 0
                },
                {
                    "stock": {
                        "name": "Deutsche Wohnen",
                        "price": 1,
                        "numberAvailable": 100000
                    },
                    "number": 0
                }
            ],
            "value": 0
        };
    }
        try {
            const response = await fetch('api/account');
            switch (response.status){
                case 200:
                    return await response.json();
                case 500:
                    console.error('Internal Server Error:',await response.json());
                    return null;
                default:
                    console.error('Fehler:',response.status);
                    return null;
            }
        }catch(e){
                console.error("Netzwerkfehler: ", e.message);
                return null;
        }
}

/**
 * Holt die Nachrichten der authentifizierten Nutzers,
 * optional nach timestamp gefiltert
 * ohne parameter => erste 20 Nachrichten
 *
 * @param lastTime timestamp der ältesten zu filternden Nachricht
 * @returns {Promise<Object|null>} Nachrichten | null bei Fehler
 */
async function getMessages(lastTime){
    try {
        let url = 'api/messages';
        // wurde ein param übergeben?
        if(lastTime!== undefined){
           url += `?lastTime=${lastTime}`;
        }
        const response = await fetch(url);

        switch (response.status){
            case 200:
            return await response.json();
            case 422:
            console.error("lastTime ungültig:", await response.json());
            return null;
            case 500:
            console.error("Internal Server Error:", await response.json());
            return null;
        }
    }catch (e){
        console.error("Netzwerkfehler: ",e.message);
        return null;
    }
}

/**
 * Holt news Nachrichten
 * optional nach timestamp gefiltert
 * ohne parameter => erste 20 Nachrichten
 *
 * @param lastTime timestamp der ältesten zu filternden Nachricht
 * @returns {Promise<Object|null>} News | null bei Fehler
 */
async function getNews(lastTime){
    try{
        let url = 'api/news';
        // wurde ein param übergeben?
        if (lastTime!== undefined){
            url += `?lastTime=${lastTime}`;
        }
        const response =await fetch(url);

        switch (response.status) {
            case 200: return await response.json();
            case 422:
                console.error('lastTime ungültig:', await response.json());
                return null;
            case 500:
                console.error('Internal Server Error:', await response.json());
                return null;
            default:
                console.error('Fehler:',response.status);
                return null;
       }
    }catch (e) {
       console.error('Netzwerkfehler:',e.message);
       return null;
    }
}

/**
 * Holt eine Liste aller verfügbaren Aktien auf dem Markt
 *
 * @returns {Promise<any|null>} Liste von Aktien | null bei Fehler
 */
async function getStocks(){
    const isLocalhost = location.hostname==='localhost'|| location.hostname==='127.0.0.1';
    if(isLocalhost){
        console.warn('lokale Testumgebung');
        return [
            {
                "name": "adidas",
                "price": 1,
                "numberAvailable": 100000
            },
            {
                "name": "Allianz",
                "price": 1,
                "numberAvailable": 100000
            },
            {
                "name": "BASF",
                "price": 46.94,
                "numberAvailable": 100000
            },
            {
                "name": "Bayer",
                "price": 25.99,
                "numberAvailable": 100000
            },
            {
                "name": "Beiersdorf",
                "price": 1,
                "numberAvailable": 100000
            },
            {
                "name": "BMW",
                "price": 10.79,
                "numberAvailable": 100000
            },
            {
                "name": "Continental",
                "price": 1,
                "numberAvailable": 100000
            },
            {
                "name": "Covestro",
                "price": 1,
                "numberAvailable": 100000
            },
            {
                "name": "Daimler",
                "price": 251.34,
                "numberAvailable": 100000
            },
            {
                "name": "Delivery Hero",
                "price": 1.95,
                "numberAvailable": 100000
            },
            {
                "name": "Deutsche Bank",
                "price": 1,
                "numberAvailable": 100000
            },
            {
                "name": "Deutsche Börse",
                "price": 64.35,
                "numberAvailable": 100000
            },
            {
                "name": "Deutsche Post",
                "price": 44.12,
                "numberAvailable": 100000
            },
            {
                "name": "Deutsche Telekom",
                "price": 1,
                "numberAvailable": 100000
            },
            {
                "name": "Deutsche Wohnen",
                "price": 409.05,
                "numberAvailable": 100000
            }
        ];
    }
    try{
        const response = await fetch('api/stocks');
        switch (response.status){
            case 200:
                return await response.json();
            case 500:
                console.error('Internal Server Error: ', await response.json());
                return null;
            default:
                console.error('Fehler:',response.status);
                return null;
        }
    } catch (e){
        console.error('Netzwerkfehler: ',e.message);
        return null;
    }
}

/**
 * Holt den Namen und die balance des authentifizierten Nutzers
 *
 * @returns {Promise<any|null>} Objekt name, balance | null bei Fehler
 */
async function getUser(){
    // FÜR TESTEN
    const isLocalhost = location.hostname ==='localhost'|| location.hostname==='127.0.0.1';
    if(isLocalhost){
        console.warn('lokale Testumgebung');
        return {
            "name": "lempel",
            "balance": 10000
        };
    }
    try{
        const response = await fetch('api/user');
        switch (response.status){
            case 200:
            return await response.json();
            case 500:
            console.error('Internal Server Error:',await response.json());
            return null;
            default:
            console.error('Fehler:',response.status);
            return null;
        }
    }catch (e){
        console.error('Netzwerkfehler:',e.message);
        return null;
    }
}

/**
 * Holt die Summe von balance und depot value von allen Nutzern
 *
 * @returns {Promise<any|null>} Objekt {name,balance} | null bei Fehler
 */
async function getEverybody(){
    const isLocalhost = location.hostname==='localhost'|| location.hostname==='127.0.0.1';
    if(isLocalhost) {
        console.warn('lokale Testumgebung');
        return [
            {
                "name": "max",
                "sum": 10000
            },
            {
                "name": "moritz",
                "sum": 10000
            },
            {
                "name": "lempel",
                "sum": 10000
            },
            {
                "name": "bolte",
                "sum": 10000
            }
        ];
    }
    try{
        const response = await fetch('api/user/everybody');
        switch (response.status){
            case 200:
                return await response.json();
            case 500:
            console.error('Internal Server Error:', await response.json());
            return null;
            default:
            console.error('Fehler: ', response.status);
            return null;
        }
    }catch (e) {
        console.error('Netzwerkfehler:',e.message);
       return null;
    }
}

// === POST ===

/**
 * Schreibt kaufen/verkaufen von Aktien in das depot des Nutzers
 *
 * @param stockName :string name der Aktie
 * @param number :number Anzahl der zu kaufenden/verkaufenden Positionen
 * @returns {Promise<any|null>} Objekt | null bei Fehler
 */
async function postPositions(stockName, number){
    // Typ prüfen
    if (typeof stockName !== "string"||typeof number !== "number"){
        console.error('Ungültige Parameter');
        return null;
    }
    // Wertebereich prüfen
    if (number===0){
        console.error('Anzahl darf nicht 0 sein');
        return null;
    }
    // Stringlänge prüfen
    if (stockName.length>50||stockName.length===0){
        console.error('Ungültiger Aktienname');
        return null;
    }
    try{
        const response = await fetch('api/account/positions',{
            method: "POST",
            headers: {
            "Content-Type": "application/json"},
            body: JSON.stringify({
                stock: {
                    name: stockName
                },
                number: number
            })
        });

        switch (response.status){
            case 201:
                return await response.json();
            case 422:
                console.error('Ungültige Eingabe/unzureichende Deckung:',await response.json());
                return null;
            case 500:
               console.error('Internal Server Error:', await response.json());
               return null;
            default:
                console.error('Fehler:'+ response.status);
                return null;
        }
    }catch (e){
        console.error('Netzwerkfehler:', e.message);
        return null;
    }
}

/**
 * Sendet Nachrichten an andere Nutzer
 *
 * @param recipient :string Empfänger der Nachricht. Broadcast wird von der api nicht unterstützt...
 * @param message :string zu sendende Nachricht
 * @returns {Promise<any|null>} Objekt | null bei Fehler
 */
async function postMessages(recipient, message){
    // Typ prüfen
    if(typeof recipient!== string||typeof message!== string){
        console.error('Ungültige Parameter: beide müssen string sein.');
        return null;
    }
   // Länge prüfen
   if(recipient.trim().length===0||message.trim().length ===0) {
       console.error('Empfänger / Nachricht zu kurz');
       return null;
   }
   if(recipient.length>50||message.length>500){
       console.error('Empfänger / Nachricht zu lang');
       return null;
   }
    try {
       const response = await fetch('api/messages',{
           method: "POST",
           headers:{
               'Content-Type': 'application/json'
           },
           body: JSON.stringify({
               recipient: recipient,
               message: message
           })
       })

        switch (response.status){
            case 200:
                return await response.json();
            case 422:
                console.error('Invalid input:', await response.json());
                return null;
            case 500:
                console.error('Internal Server Error:', await response.json());
                return null;
            default:
               console.error('Fehler:', response.status);
        }
    }catch (e){
       console.error("Netzwerkfehler:", e.message);
    }
}
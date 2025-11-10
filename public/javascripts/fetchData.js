"use strict";

// === GET ===

/**
 * Holt die Depot Positionen des authentifizierten Users und seines total depot values
 *
 * @returns {Promise<Object|null>} Depot-Daten oder null bei Fehler
 */
async function getAccount(){
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
 * @returns {Promise<any|null>} Objekt name,balance | null bei Fehler
 */
async function getUser(){
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


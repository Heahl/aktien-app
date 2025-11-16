"use strict";

/**
 * Prüft, ob der Nutzer eingeloggt ist, validiert das Token aus dem localStorage und prüft.
 * Ablaufzeit und redirected bei Fehler.
 *
 * @returns {boolean} true, wenn gültig; false bei Weiterleitung zum Login.
 */
function authCheck(){
    const token = localStorage.getItem('stockmarketVerySecretAuthToken');

    // Kein gültiger token => /login
    if(!token){
        window.location.href = 'login.html';
        return false;
    }

    // dekodieren (ascii to binary) -> gültigkeit prüfen
    try {
        const payload = JSON.parse(atob(token));
        if(payload.exp && payload.exp < Date.now()){
            localStorage.removeItem('stockmarketVerySecretAuthToken');
            window.location.href = 'login.html';
            return false;
        }
    }catch (e){
        console.warn('Token konnte nicht überprüft werden: ', e.message);
        localStorage.removeItem('stockmarketVerySecretAuthToken');
        window.location.href = 'login.html';
        return false;
    }

    return true;
}

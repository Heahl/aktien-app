"use strict";

function authCheck(){
    const token = localStorage.getItem('stockmarketVerySecretAuthToken');

    // Kein gültiger token => /login
    if(!token){
        window.location.href = 'login.html';
        return false;
    }

    // dekodieren (atob) -> gültigkeit prüfen
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

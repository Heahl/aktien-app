"use strict";

window.addEventListener('load', deauth);

/**
 * Registriert den Logout-Button und verbindet ihn mit der Funktion: logout().
 */
function deauth(){
    // get dom elements
    const logoutBtn = document.getElementById('logout-button');

    // add event listener
    logoutBtn.addEventListener('click', logout);
}

/**
 * Löscht das Auth-Token aus dem localStorage und leitet zur Login-Seite weiter.
 *
 * @returns {boolean} true nach Weiterleitung.
 */
function logout(){
    const token = localStorage.getItem('stockmarketVerySecretAuthToken');

    if(token){
        localStorage.removeItem('stockmarketVerySecretAuthToken');

        console.log(token);
    } else {
        console.warn('auth token bei logout nicht gefunden!');
    }
    window.location.href = 'login.html';
    return true;
}
"use strict";

window.addEventListener('load', deauth);

function deauth(){
    // get dom elements
    const logoutBtn = document.getElementById('logout-button');

    // add event listener
    logoutBtn.addEventListener('click', logout);
}

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
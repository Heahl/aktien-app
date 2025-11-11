"use strict";

window.addEventListener('load', init);

function init(){
    // dom elemente holen
    const username = document.getElementById('username');
    const accountBalance = document.getElementById('account-balance');
    if(!username){
        console.error("Element mit der id 'username' nicht gefunden.");
    }
    if(!accountBalance){
        console.error("Element mit der id 'account-balance' nicht gefunden.");
    }
    console.log(getUser());

    // Nutzerdaten fetchen


}
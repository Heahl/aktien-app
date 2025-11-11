"use strict";

/**
 * Zeigt username und account balance des Nutzers an
 *
 * @param userData :Object von getUser() übergebene Nutzerdaten
 */
function displayUser(userData){
    // dom elemente holen
    const username = document.getElementById('username');
    const accountBalance = document.getElementById('account-balance');

    // checks
    if(!username){
        console.error("Element mit der id 'username' nicht gefunden.");
    }
    if(!accountBalance){
        console.error("Element mit der id 'account-balance' nicht gefunden.");
    }

    // username und account balance initial schreiben.
    username.textContent = userData.name;
    accountBalance.textContent = userData.balance;
}

/**
 * Zeige die Rangliste an
 *
 * @param rankingData :Object mit Namen + summe von balance und depot value von allen Nutzern
 */
function displayRanking(rankingData){
    // dom elemente holen
    const container = document.getElementById('ranking-list-container');

    // checks
    if(!container){
        console.error("Element mit der id 'ranking-list-container' nicht gefunden");
    }

    // container leeren
    while (container.firstChild){
        if(container.firstChild.id !== 'ranking-item-template'){
        container.removeChild(container.firstChild);
        }
    }

    // von groß nach klein sortieren
    rankingData.sort((a,b)=>b.sum-a.sum);

    rankingData.forEach((entry,index)=>{
        const clone = template.content.cloneNode(true);

        // elemente des templates greifen
        const item = clone.querySelector('.ranking-item');
        const rankCol = clone.querySelector('.rank-column');
        const playerCol = clone.querySelector('.player-column');
        const valueCol = clone.querySelector('.value-column');

        // füllen
        rankCol.textContent = index +1;
        playerCol.textContent = entry.name;
        valueCol.textContent = entry.value;

        // einfügen
        container.appendChild(clone);
    })
}

/* TODO: displayStocks fertig schreiben
function displayStocks(stocksData){
    const container = document.getElementById('stocks-container');
    if(!container){
        console.error("Element mit der Id 'stocks-container' wurde nicht gefunden.");
    }

    while (container.firstChild){
        container.removeChild(container.firstChild);
    }

    const stocksTemplate = document.getElementById('stocks-template')
    if(!stocksTemplate){
        console.error("Element mit id 'stocks-template' nicht gefunden.");
    }

    stocksData.forEach(stock=>{
    })
}
 */


}
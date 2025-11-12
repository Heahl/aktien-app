"use strict";

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // elemente greifen
    const newsLastHourBtn = document.getElementById('newsLastHour');
    const newsLastDayBtn = document.getElementById('newsLastDay');
    const newLastTwentyBtn = document.getElementById('newsLastTwenty');

    // event listener anhängen
    newsLastHourBtn.addEventListener('click', () =>
        loadNewsSince(60 * 60));

    newsLastDayBtn.addEventListener('click', () =>
        loadNewsSince(60 * 60 * 24));

    newLastTwentyBtn.addEventListener('click', () =>
        getNews(null).then(news => displayNews(news)));

    //console.log('DOMContentLoaded gefeuert');
    //console.log('Templates vorher:', document.querySelectorAll('template').length);

    const userData = await getUser();
    displayUser(userData);
    //console.log('Templates NACH getUser():', document.querySelectorAll('template').length);

    const rankingData = await getEverybody();
    //console.log('Templates NACH getEverybody():', document.querySelectorAll('template').length);
    //console.log('rankingData erhalten:', rankingData);
    displayRanking(rankingData);

    const stocks = await getStocks();
    displayStocks(stocks);
    stockSelector(stocks);


    const news = await getNews();
    displayNews(news);


    const messages = await getMessages();
    displayMessages(messages);
}

function loadNewsSince(secondsAgo) {
    // aktueller unix timestamp
    const now = Math.floor(Date.now() / 1000);
    const lastTime = now - secondsAgo;

    console.log('loadNewsSince aufgerufen mit lastTime:', lastTime);

    getNews(lastTime)
        .then(news => displayNews(news))
        .catch(error => console.error("Fehler beim Laden der news in loadNewsSince(): ", error));
}
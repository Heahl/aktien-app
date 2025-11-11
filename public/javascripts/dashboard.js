"use strict";

window.addEventListener('load', init);

async function init(){
    // Nutzerdaten fetchen und laden
    const userData = await getUser();
   displayUser(userData);





}
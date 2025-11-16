"use strict";

window.addEventListener('load', auth);

/**
 * Initialisiert das Login-Formular und registriert den submit-Listener.
 */
function auth() {
    // get dom elements
    const loginForm = document.getElementById('login-form');
    console.log(loginForm);

    // add event-listeners
    loginForm.addEventListener('submit', login);
}

/**
 * Führt den Login-Prozess aus: prüft Eingaben.
 * Speichert das Token im localStorage und leitet weiter.
 *
 * @param {SubmitEvent} event - Das submit-Event des Formulars.
 */

function login(event) {
    // No default action
    event.preventDefault();

    // get values of dom elements
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (!username) {
        console.error('Value not found: username');
    }
    if (!password) {
        console.error('Value not found: password');
    }

    // auth logic
    const oneHourInMs = 60 * 60 * 1000;
    if (username === password) {
        const token = btoa(JSON.stringify(
            {
                user: username,
                password: password,
                exp: Date.now() + oneHourInMs
            }
        ));
        localStorage.setItem('stockmarketVerySecretAuthToken', token);
        window.location.href = 'index.html';
        if (localStorage.getItem('stockmarketVerySecretAuthToken') == null) {
            console.error("Error: Couldn't find token after saving it");
        }
    } else {
        document.getElementById('login-error').textContent = 'Benutzername = Passwort';
        document.getElementById('login-error').style.display = 'block';
    }
}
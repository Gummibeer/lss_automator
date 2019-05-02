// ==UserScript==
// @name        Script für Leitstellenspiel
// @namespace   Leitstellenspiel
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.3
// @author      Gummibeer
// @grant       none
// ==/UserScript==

(function() {
    console.log('init LSS-Automator');

    const subscription = faye.subscribe('/private-user'+user_id+'de', handleFayeEvent );

    function handleFayeEvent(message) {
        console.log(message);
    }
})();

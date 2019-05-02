// ==UserScript==
// @name        Script für Leitstellenspiel
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.4
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function() {
    if (window.location.href !== 'https://www.leitstellenspiel.de/') {
        return;
    }

    console.log('init LSS-Automator');

    const subscription = faye.subscribe('/private-user'+user_id+'de', handleFayeEvent );

    function handleFayeEvent(message) {
        if(!(
            message.indexOf('missionMarkerAdd') === 0
            || message.indexOf('missionDelete') === 0
        )) {
            return;
        }

        console.log(message);
    }
})();

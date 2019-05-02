// ==UserScript==
// @name        Script für Leitstellenspiel
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.5
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function() {
    if (window.location.href !== 'https://www.leitstellenspiel.de/') {
        return;
    }

    console.info('init LSS-Automator');

    const subscription = faye.subscribe('/private-user'+user_id+'de', handleFayeEvent );

    function handleFayeEvent(message) {
        if(message.indexOf('missionMarkerAdd') === 0) {
            console.log(message);
            let body = JSON.parse(message.replace('missionMarkerAdd(', '').replace(');', '').trim());
            handleMissionMarkerAdd(body);
        } else if(message.indexOf('missionDelete') === 0) {
            console.log(message);
            let body = JSON.parse(message.replace('missionDelete(', '').replace(');', '').trim());
            handleMissionDelete(body);
        } else {
            console.debug(message);
        }
    }

    function handleMissionMarkerAdd(body) {
        console.debug(body);
    }

    function handleMissionDelete(id) {
        console.debug(id);
    }
})();

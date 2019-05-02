// ==UserScript==
// @name        Script für Leitstellenspiel
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de
// @version     0.1.3
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       none
// @updateURL   https://raw.githubusercontent.com/Gummibeer/lss_automator/master/lss_automator.user.js
// @downloadURL https://raw.githubusercontent.com/Gummibeer/lss_automator/master/lss_automator.user.js
// ==/UserScript==

(function() {
    console.log('init LSS-Automator');

    const subscription = faye.subscribe('/private-user'+user_id+'de', handleFayeEvent );

    function handleFayeEvent(message) {
        console.log(message);
    }
})();

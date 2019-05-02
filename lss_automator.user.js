// ==UserScript==
// @name        Script für Leitstellenspiel
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.6
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function() {
    const MISSION_DATA = {
        1: {
            vehicles: {
                lf: 1,
            },
        },
    };

    if (window.location.href !== 'https://www.leitstellenspiel.de/') {
        return;
    }

    console.info('init LSS-Automator');

    const subscription = faye.subscribe('/private-user'+user_id+'de', handleFayeEvent );

    let missions = {};

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

    function handleMissionMarkerAdd(mission) {
        if (mission.date_end !== 0) {
            return;
        }

        missions[mission.id] = mission;
        console.log('start mission "'+mission.caption+'" ('+mission.id+')');
        console.debug(MISSION_DATA[mission.mtid] ?? null);

        let $button = $('#alarm_button_'+mission.id);
        console.debug($button);
        if ($button.length !== 1) {
            console.error('mission alert button nut found');
            return;
        }

        $button.trigger('click');

        let tableInterval = setInterval(function() {
            let $table = $('#vehicle_show_table_all');
            console.debug($table);
            if($table.length !== 1) {
                return;
            }

            clearInterval(tableInterval);

            $table.find('tr').first().find('input[type=checkbox].vehicle_checkbox').trigger('click');

            $('form#mission-form').submit();
        }, 500);
    }

    function handleMissionDelete(id) {
        console.log('finish mission "'+missions[id].caption+'" ('+id+')');
        delete missions[id];
    }
})();

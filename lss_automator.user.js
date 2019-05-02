// ==UserScript==
// @name        Script für Leitstellenspiel
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.9
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function () {
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

    const subscription = faye.subscribe('/private-user' + user_id + 'de', handleFayeEvent);

    let missions = {};

    function handleFayeEvent(message) {
        console.debug(message);

        if (message.indexOf('missionMarkerAdd') === 0) {
            let body = JSON.parse(message.replace('missionMarkerAdd(', '').replace(');', '').trim());
            handleMissionMarkerAdd(body);
        } else if (message.indexOf('missionDelete') === 0) {
            let body = JSON.parse(message.replace('missionDelete(', '').replace(');', '').trim());
            handleMissionDelete(body);
        }
    }

    function handleMissionMarkerAdd(mission) {
        if (mission.date_end !== 0) {
            return;
        }

        missions[mission.id] = mission;
        console.log('start mission "' + mission.caption + '" (' + mission.id + ')');
        console.debug(MISSION_DATA[mission.mtid]);

        let buttonIntervalRuns = 0;
        let buttonInterval = setInterval(function () {
            buttonIntervalRuns++;
            if (buttonIntervalRuns > 10) {
                clearInterval(buttonInterval);
                return;
            }

            let $button = $('#alarm_button_' + mission.id);
            if ($button.length !== 1) {
                return;
            }

            clearInterval(buttonInterval);

            $button.trigger('click');

            let tableIntervallRuns = 0;
            let tableInterval = setInterval(function () {
                tableIntervallRuns++;
                if (tableIntervallRuns > 10) {
                    clearInterval(tableInterval);
                    return;
                }

                let $iframe = $('iframe.lightbox_iframe').first();
                let $table = $('table#vehicle_show_table_all', $iframe.contents());
                if ($table.length !== 1) {
                    return;
                }

                clearInterval(tableInterval);

                $table.find('tbody').find('tr').first().find('input[type=checkbox].vehicle_checkbox').prop('checked', true);

                $('form#mission-form', $iframe.contents()).submit();

                $('#lightbox_box button#lightbox_close').trigger('click');
            }, 500);
        }, 500);
    }

    function handleMissionDelete(id) {
        if (typeof missions[id] === 'undefined') {
            return;
        }

        console.log('finish mission "' + missions[id].caption + '" (' + id + ')');
        delete missions[id];
    }
})();

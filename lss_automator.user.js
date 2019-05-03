// ==UserScript==
// @name        Leitstellenspiel Automator
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.15
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       GM_getResourceText
// @resource    VehicleMap https://github.com/Gummibeer/lss_automator/raw/master/vehicle.map.json
// @resource    MissionMap https://github.com/Gummibeer/lss_automator/raw/master/mission.map.json
// ==/UserScript==

(function () {
    const VEHICLE_MAP = JSON.parse(GM_getResourceText('VehicleMap'));
    const MISSION_MAP = JSON.parse(GM_getResourceText('MissionMap'));

    let starting_mission = false;

    if (window.location.href !== 'https://www.leitstellenspiel.de/') {
        return;
    }

    console.info('init LSS-Automator');

    let $missions = $('#mission_list').find('div[mission_id]:not(.mission_deleted)').filter(function () {
        let $this = $(this);

        return $this.find('.mission_panel_red').length === 1;
    });

    if ($missions.length > 0) {
        $missions.each(function () {
            let $mission = $(this);
            startMission($mission.attr('mission_id'), $mission.attr('mission_type_id'));
        });
    }

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

        startMission(mission.id, mission.mtid);
    }

    function handleMissionDelete(id) {
        console.log('finish mission#' + id);
    }

    function startMission(missionId, missionTypeId) {
        if (starting_mission) {
            setTimeout(startMission, 1000, missionId, missionTypeId);
            return;
        }

        starting_mission = true;

        let missionVehicles = MISSION_MAP[missionTypeId];

        if (typeof missionVehicles === 'undefined') {
            console.error('mission details for type#' + missionTypeId + ' not found https://www.leitstellenspiel.de/einsaetze/' + missionTypeId);
            starting_mission = false;
            return;
        }

        console.log('start mission#' + missionId);
        console.debug(missionVehicles);

        let buttonIntervalRuns = 0;
        let buttonInterval = setInterval(function () {
            buttonIntervalRuns++;
            if (buttonIntervalRuns > 10) {
                clearInterval(buttonInterval);
                console.error('alarm button not found');
                starting_mission = false;
                return;
            }

            let $button = $('#alarm_button_' + missionId);
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
                    console.error('vehicle table not found');
                    starting_mission = false;
                    return;
                }

                let $iframe = $('iframe.lightbox_iframe').first();
                let $table = $('table#vehicle_show_table_all', $iframe.contents());
                if ($table.length !== 1) {
                    return;
                }

                clearInterval(tableInterval);

                for (let vehicleType in Object.keys(missionVehicles)) {
                    let vehicleCount = missionVehicles[vehicleType];

                    for (let i = 0; i < vehicleCount; i++) {
                        let $trs = $table.find('tbody').find('tr').filter(function () {
                            let $tr = $(this);

                            if (VEHICLE_MAP[vehicleType].indexOf($tr.attr('vehicle_type')) === -1) {
                                return false;
                            }

                            return !$tr.find('input[type=checkbox].vehicle_checkbox').prop('checked');
                        });

                        if ($trs.length === 0) {
                            console.error('not enough vehicles - missing: ' + vehicleType);
                            starting_mission = false;
                            return;
                        }

                        $trs.first().find('input[type=checkbox].vehicle_checkbox').prop('checked', true);
                    }
                }

                $table.find('tbody').find('tr').first().find('input[type=checkbox].vehicle_checkbox').prop('checked', true);

                $('form#mission-form', $iframe.contents()).submit();

                $('#lightbox_box button#lightbox_close').trigger('click');
                starting_mission = false;
            }, 500);
        }, 500);
    }
})();

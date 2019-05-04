// ==UserScript==
// @name        Leitstellenspiel Automator
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.25
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       GM_getResourceText
// @resource    VehicleMap https://github.com/Gummibeer/lss_automator/raw/master/vehicle.map.json
// @resource    MissionMap https://github.com/Gummibeer/lss_automator/raw/master/mission.map.json
// @require     https://github.com/Gummibeer/lss_automator/raw/master/logger.js
// ==/UserScript==

(function () {
    const VEHICLE_MAP = JSON.parse(GM_getResourceText('VehicleMap'));
    const MISSION_MAP = JSON.parse(GM_getResourceText('MissionMap'));
    const logger = new Logger('lss-automator', Logger.DEBUG);

    let starting_mission = false;

    if (window.location.href !== 'https://www.leitstellenspiel.de/') {
        return;
    }

    logger.notice('initialize LSS-Automator');

    let $missions = $('#mission_list').find('div[mission_id]:not(.mission_deleted)').filter(function () {
        return $(this).find('.mission_panel_red').length === 1;
    });

    if ($missions.length > 0) {
        $missions.each(function () {
            let $mission = $(this);
            startMission($mission.attr('mission_id'), $mission.attr('mission_type_id'));
        });
    }

    const subscription = faye.subscribe('/private-user' + user_id + 'de', handleFayeEvent);

    function handleFayeEvent(message) {
        if (message.indexOf('missionMarkerAdd') === 0) {
            let body = JSON.parse(message.split(');')[0].replace('missionMarkerAdd(', '').replace(');', '').trim());
            handleMissionMarkerAdd(body);
        } else if (message.indexOf('missionDelete') === 0) {
            let body = JSON.parse(message.split(');')[0].replace('missionDelete(', '').replace(');', '').trim());
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
        logger.info('mission#' + id + ' finished');
    }

    function startMission(missionId, missionTypeId) {
        if (starting_mission) {
            setTimeout(startMission, 1000, missionId, missionTypeId);
            return;
        }

        starting_mission = true;

        let missionIntervalRuns = 0;
        let missionInterval = setInterval(function () {
            missionIntervalRuns++;
            if (missionIntervalRuns > 10) {
                clearInterval(missionInterval);
                logger.error('mission#' + missionId + ' not found');
                starting_mission = false;
                return;
            }

            let $mission = $('#mission_' + missionId);
            if ($mission.length !== 1) {
                return;
            }

            clearInterval(missionInterval);

            if ($mission.hasClass('mission_deleted') || $mission.find('.mission_panel_red').length === 0) {
                logger.warning('mission#' + missionId + ' already started');
                starting_mission = false;
                return;
            }

            let $countdown = $mission.find('.mission_overview_countdown');
            if ($countdown.length === 1) {
                let timeout = parseInt($countdown.attr('timeleft'));
                let startBefore = 1000 * 60 * 10;
                if (timeout > (startBefore + (1000 * 60))) {
                    logger.warning('mission#' + missionId + ' with countdown ignored');
                    starting_mission = false;
                    return;
                }
            }

            let missionDetails = MISSION_MAP[missionTypeId];
            if (typeof missionDetails === 'undefined') {
                logger.critical('mission#' + missionId + ' details for type#' + missionTypeId + ' not found https://www.leitstellenspiel.de/einsaetze/' + missionTypeId);
                starting_mission = false;
                return;
            }

            let missionVehicles = missionDetails.vehicles;
            let missionWater = typeof missionDetails.water === 'undefined' ? 0 : missionDetails.water;

            logger.info('mission#' + missionId + ' starting');
            logger.debug('mission#' + missionId + ' require ' + missionWater + 'l water');

            let buttonIntervalRuns = 0;
            let buttonInterval = setInterval(function () {
                buttonIntervalRuns++;
                if (buttonIntervalRuns > 10) {
                    clearInterval(buttonInterval);
                    logger.critical('alarm button not found');
                    starting_mission = false;
                    return;
                }

                let $button = $('#alarm_button_' + missionId);
                if ($button.length !== 1) {
                    return;
                }

                clearInterval(buttonInterval);

                $button.trigger('click');

                let tableIntervalRuns = 0;
                let tableInterval = setInterval(function () {
                    tableIntervalRuns++;
                    if (tableIntervalRuns > 10) {
                        logger.critical('vehicle table not found');
                        starting_mission = false;
                        clearInterval(tableInterval);
                        return;
                    }

                    let $iframe = $('iframe.lightbox_iframe[src="/missions/' + missionId + '"]').first();
                    if ($iframe.length !== 1) {
                        return;
                    }

                    let $tab = $('.tab-content .tab-pane.active', $iframe.contents());
                    let $alert = $tab.find('.alert');
                    if ($alert.length === 1) {
                        logger.error('mission#' + missionId + ' no vehicles available');
                        setTimeout(startMission, 1000 * 60, missionId, missionTypeId);
                        $('#lightbox_box button#lightbox_close').trigger('click');
                        starting_mission = false;
                        clearInterval(tableInterval);
                        return;
                    }

                    let $table = $tab.find('table#vehicle_show_table_all');
                    if ($table.length !== 1) {
                        return;
                    }

                    clearInterval(tableInterval);

                    let vehiclesWater = 0;

                    for (let j = 0; j < Object.keys(missionVehicles).length; j++) {
                        let vehicleType = Object.keys(missionVehicles)[j];
                        let vehicleCount = missionVehicles[vehicleType];
                        logger.debug('mission#' + missionId + ' require ' + vehicleCount + ' ' + vehicleType);

                        for (let i = 0; i < vehicleCount; i++) {
                            // $table.find('tbody').find('tr').find('input[type=checkbox][wasser_amount]')
                            let $trs = $table.find('tbody').find('tr').filter(function () {
                                let $tr = $(this);

                                if (VEHICLE_MAP[vehicleType].indexOf($tr.attr('vehicle_type')) === -1) {
                                    return false;
                                }

                                return !$tr.find('input[type=checkbox].vehicle_checkbox').prop('checked');
                            });

                            if ($trs.length === 0) {
                                logger.error('mission#' + missionId + ' not enough vehicles - missing: ' + vehicleType);
                                setTimeout(startMission, 1000 * 60, missionId, missionTypeId);
                                $('#lightbox_box button#lightbox_close').trigger('click');
                                starting_mission = false;
                                return;
                            }

                            let $checkbox = $trs.first().find('input[type=checkbox].vehicle_checkbox');
                            vehiclesWater += typeof $checkbox.attr('wasser_amount') === 'undefined' ? 0 : $checkbox.attr('wasser_amount');
                            $checkbox.prop('checked', true);
                        }
                    }

                    if (vehiclesWater < missionWater) {
                        let $tr = $table.find('tbody').find('tr').find('input[type=checkbox][wasser_amount]:not(:checked)');
                        if ($tr.length === 0) {
                            logger.error('mission#' + missionId + ' not enough water in available vehicles');
                            setTimeout(startMission, 1000 * 60, missionId, missionTypeId);
                            $('#lightbox_box button#lightbox_close').trigger('click');
                            starting_mission = false;
                        }
                    }

                    $('form#mission-form', $iframe.contents()).submit();

                    $('#lightbox_box button#lightbox_close').trigger('click');
                    starting_mission = false;
                }, 500);
            }, 500);
        }, 500);
    }
})();

// ==UserScript==
// @name        Leitstellenspiel Automator
// @description A userscript that automates missions
// @namespace   https://www.leitstellenspiel.de
// @include     https://www.leitstellenspiel.de/*
// @version     0.1.39
// @author      Gummibeer
// @license     MIT
// @run-at      document-end
// @grant       GM_getResourceText
// @resource    VehicleMap https://github.com/Gummibeer/lss_automator/raw/master/vehicle.map.json
// @resource    MissionMap https://github.com/Gummibeer/lss_automator/raw/master/mission.map.json
// @require     https://github.com/Gummibeer/lss_automator/raw/master/logger.js
// @require     https://github.com/Gummibeer/lss_automator/raw/master/wait_for_element.js
// ==/UserScript==

/**
 * @typedef {Object} MissionDetail
 * @property {string} caption
 * @property {number} [water=0]
 * @property {Object.<string, number>} vehicles
 *
 * @typedef {Object} VehicleDetail
 * @property {Object.<string, number>} building_requirements
 * @property {Object.<string, number>} vehicle_types
 */

Array.prototype.toUpperCase = function () {
    return this.map(Function.prototype.call, String.prototype.toUpperCase);
};

(function () {
    if (window.location.href !== 'https://www.leitstellenspiel.de/') {
        return;
    }
    const logger = new Logger('lss-automator', Logger.DEBUG);

    logger.notice('initialize LSS-Automator');

    /** @type {Object.<string, VehicleDetail>} */
    const VEHICLE_MAP = JSON.parse(GM_getResourceText('VehicleMap'));
    /** @type {MissionDetail[]} */
    const MISSION_MAP = JSON.parse(GM_getResourceText('MissionMap'));
    const BUILDINGS = {
        fire: 0,
    };
    $.getJSON('https://www.leitstellenspiel.de/api/buildings', function (data) {
        data.forEach(function (building) {
            if (building.building_type === 0) {
                BUILDINGS.fire++;
            }
        });
    });

    let startingMission = false;

    setTimeout(function () {
        logger.notice('reload window');
        window.location.reload();
    }, 1000 * 60 * 60);

    $.get('https://www.leitstellenspiel.de/einsaetze/leitstelle/-1', function (html) {
        let availableMissionIds = [];
        $(html).filter('table.table').find('tbody').find('tr.success').each(function () {
            availableMissionIds.push($(this).find('a').attr('href').replace('/einsaetze/', ''));
        });

        let undefinedMissionIds = availableMissionIds.filter(i => Object.keys(MISSION_MAP).indexOf(i) === -1);
        if (undefinedMissionIds.length > 0) {
            logger.warning('active but undefined mission type ids: ' + undefinedMissionIds.join(', '));
        }
    });

    function startMissionsInMissionList() {
        let $missionList = $('#mission_list');
        $missionList.find('div[mission_id]:not(.mission_deleted)').filter(function () {
            return $(this).find('.mission_panel_red').length === 1;
        }).each(function () {
            startMission($(this).attr('mission_id'), $(this).attr('mission_type_id'));
        });

        $missionList.find('div[mission_id].mission_deleted').remove();
    }

    startMissionsInMissionList();

    const missionObserver = new MutationObserver(function (mutations) {
        startMissionsInMissionList();
    });
    missionObserver.observe(document.getElementById('mission_list'), {
        childList: true,
        attributes: true,
        characterData: false,
        subtree: true,
        attributeOldValue: false,
        characterDataOldValue: false,
    });

    function stoppingMission(missionId, missionTypeId) {
        if (
            typeof missionId !== 'undefined'
            && typeof missionTypeId !== 'undefined'
        ) {
            setTimeout(startMission, 1000 * 60, missionId, missionTypeId);
        }


        let $lightboxClose = $('#lightbox_box button#lightbox_close');
        if ($lightboxClose.length === 1) {
            $lightboxClose.trigger('click');
        }

        startingMission = false;
    }

    function startMission(missionId, missionTypeId) {
        if (startingMission) {
            setTimeout(startMission, 1000, missionId, missionTypeId);
            return;
        }

        startingMission = true;

        waitForElement('#mission_' + missionId)
            .then(function ($mission) {
                if ($mission.hasClass('mission_deleted')) {
                    return stoppingMission();
                }
                if ($mission.find('.mission_panel_red').length === 0) {
                    return stoppingMission();
                }

                let missionDetails = MISSION_MAP[missionTypeId];
                if (typeof missionDetails === 'undefined') {
                    logger.critical('mission#' + missionId + ' details for type#' + missionTypeId + ' not found');
                    return stoppingMission();
                }
                let missionWaterTotal = typeof missionDetails.water === 'undefined' ? 0 : missionDetails.water;

                logger.info('mission#' + missionId + ' starting');

                waitForElement('#alarm_button_' + missionId)
                    .then(function ($button) {
                        $button.trigger('click');

                        waitForElement('iframe.lightbox_iframe[src="/missions/' + missionId + '"]')
                            .then(function ($iframe) {
                                waitForElement('.tab-content .tab-pane.active', $iframe.contents())
                                    .then(function ($tab) {
                                        let $alert = $tab.find('.alert');
                                        let $table = $tab.find('table#vehicle_show_table_all');
                                        if (
                                            $alert.length === 1
                                            || $table.length === 0
                                        ) {
                                            logger.error('mission#' + missionId + ' no vehicles available');
                                            return stoppingMission(missionId, missionTypeId);
                                        }

                                        function getVehicleGroupByVehicleTypeId(vehicleTypeId) {
                                            for (let i = 0; i < Object.keys(VEHICLE_MAP).length; i++) {
                                                let vehicleGroup = Object.keys(VEHICLE_MAP)[i];
                                                let vehicleTypeIds = Object.values(VEHICLE_MAP[vehicleGroup].vehicle_types);

                                                if (vehicleTypeIds.indexOf(vehicleTypeId) !== -1) {
                                                    return vehicleGroup;
                                                }
                                            }
                                        }

                                        let existingVehicles = {};
                                        $('table#mission_vehicle_at_mission', $iframe.contents()).add($('table#mission_vehicle_driving', $iframe.contents())).find('tbody').find('tr').each(function () {
                                            let $tr = $(this);
                                            let vehicleTypeId = $tr.find('[vehicle_type_id]').first().attr('vehicle_type_id');
                                            if (typeof vehicleTypeId === 'string') {
                                                let vehicleGroup = getVehicleGroupByVehicleTypeId(parseInt(vehicleTypeId));
                                                if (typeof vehicleGroup === 'string') {
                                                    existingVehicles[vehicleGroup] = typeof existingVehicles[vehicleGroup] === 'undefined' ? 1 : existingVehicles[vehicleGroup] + 1;
                                                }
                                            }
                                        });

                                        let existingWater = 0;
                                        let $waterProgressBar = $('#mission_water_progress_' + missionId, $iframe.contents());
                                        if ($waterProgressBar.length === 1) {
                                            let $waterProgressBarPartAtMission = $waterProgressBar.find('#mission_water_bar_at_mission_' + missionId);
                                            if ($waterProgressBarPartAtMission.length === 1) {
                                                existingWater += parseInt($waterProgressBarPartAtMission.attr('data-water-has')) || 0;
                                            }
                                            let $waterProgressBarPartDriving = $waterProgressBar.find('#mission_water_bar_driving_' + missionId);
                                            if ($waterProgressBarPartDriving.length === 1) {
                                                existingWater += parseInt($waterProgressBarPartDriving.attr('data-water-has')) || 0;
                                            }
                                        }

                                        let missionWater = Math.max(0, missionWaterTotal - existingWater);
                                        if (missionWaterTotal > 0) {
                                            logger.debug('mission#' + missionId + ' require ' + missionWater + 'l ' + (existingWater > 0 ? '(' + missionWaterTotal + ' - ' + existingWater + ') ' : '') + 'water');
                                        }

                                        let vehiclesWater = 0;
                                        let sentVehicles = [];

                                        function sendVehicle($checkbox) {
                                            sentVehicles.push($checkbox.parents('tr[vehicle_type]').first().attr('vehicle_type'));
                                            vehiclesWater += typeof $checkbox.attr('wasser_amount') === 'undefined' ? 0 : parseInt($checkbox.attr('wasser_amount'));
                                            $checkbox.prop('checked', true);
                                        }

                                        for (let j = 0; j < Object.keys(missionDetails.vehicles).length; j++) {
                                            let vehicleGroup = Object.keys(missionDetails.vehicles)[j];
                                            let vehicleTypeNames = Object.keys(VEHICLE_MAP[vehicleGroup].vehicle_types).toUpperCase();
                                            let vehicleTypeIds = Object.values(VEHICLE_MAP[vehicleGroup].vehicle_types);
                                            let buildingRequirements = VEHICLE_MAP[vehicleGroup].building_requirements;
                                            let isOptionalVehicle = false;
                                            Object.keys(buildingRequirements).forEach(function (building_type) {
                                                isOptionalVehicle = BUILDINGS[building_type] < buildingRequirements[building_type] ? true : isOptionalVehicle;
                                            });
                                            let vehicleCountTotal = missionDetails.vehicles[vehicleGroup];
                                            let existingVehicleCount = (typeof existingVehicles[vehicleGroup] === 'undefined' ? 0 : existingVehicles[vehicleGroup]);
                                            let vehicleCount = Math.max(0, vehicleCountTotal - existingVehicleCount);
                                            logger.debug('mission#' + missionId + ' require ' + vehicleCount + (existingVehicleCount > 0 ? '(' + vehicleCountTotal + ' - ' + existingVehicleCount + ')' : '') + ' ' + vehicleGroup + (isOptionalVehicle ? ' (optional)' : ''));

                                            for (let i = 0; i < vehicleCount; i++) {
                                                let $trs = $table.find('tbody').find('tr').filter(function () {
                                                    let $tr = $(this);

                                                    if (
                                                        vehicleTypeNames.indexOf($tr.attr('vehicle_type').toUpperCase()) === -1
                                                        && vehicleTypeIds.indexOf(parseInt($tr.find('td[vehicle_type_id]').attr('vehicle_type_id'))) === -1
                                                    ) {
                                                        return false;
                                                    }

                                                    return !$tr.find('input[type=checkbox].vehicle_checkbox').prop('checked');
                                                });

                                                if ($trs.length === 0) {
                                                    if (isOptionalVehicle) {
                                                        logger.warning('mission#' + missionId + ' not enough optional vehicles - missing: ' + vehicleGroup);
                                                        break;
                                                    } else {
                                                        logger.error('mission#' + missionId + ' not enough vehicles - missing: ' + vehicleGroup);
                                                        return stoppingMission(missionId, missionTypeId);
                                                    }
                                                }

                                                let $checkbox = $trs.first().find('input[type=checkbox].vehicle_checkbox');
                                                sendVehicle($checkbox);
                                            }
                                        }

                                        while (vehiclesWater < missionWater) {
                                            let $checkbox = $table.find('tbody').find('tr').find('input[type=checkbox][wasser_amount]:not(:checked)').first();
                                            if ($checkbox.length === 0) {
                                                logger.error('mission#' + missionId + ' not enough water in available vehicles');
                                                return stoppingMission(missionId, missionTypeId);
                                            }
                                            sendVehicle($checkbox);
                                        }

                                        if (sentVehicles.length > 0) {
                                            $('form#mission-form', $iframe.contents()).submit();
                                            logger.debug('mission#' + missionId + ' sent vehicles: ' + sentVehicles.join(', ') + (vehiclesWater > 0 ? (' with ' + vehiclesWater + 'l water') : ''));
                                        }

                                        return stoppingMission();
                                    })
                                    .catch(function (error) {
                                        logger.error('mission#' + missionId + ' ' + error.message);
                                        return stoppingMission();
                                    });
                            })
                            .catch(function (error) {
                                logger.error('mission#' + missionId + ' ' + error.message);
                                return stoppingMission();
                            });
                    })
                    .catch(function (error) {
                        logger.error('mission#' + missionId + ' ' + error.message);
                        return stoppingMission();
                    });
            })
            .catch(function (error) {
                logger.error('mission#' + missionId + ' ' + error.message);
                return stoppingMission();
            });
    }
})();

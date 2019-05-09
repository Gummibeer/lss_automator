class Logger {
    static get DEBUG() {
        return 100;
    };

    static get INFO() {
        return 200;
    };

    static get NOTICE() {
        return 250;
    };

    static get WARNING() {
        return 300;
    };

    static get ERROR() {
        return 400;
    };

    static get CRITICAL() {
        return 500;
    };

    static get ALERT() {
        return 550;
    };

    static get EMERGENCY() {
        return 600;
    };

    static get LEVELS() {
        return {
            'debug': this.DEBUG,
            'info': this.INFO,
            'notice': this.NOTICE,
            'warning': this.WARNING,
            'error': this.ERROR,
            'critical': this.CRITICAL,
            'alert': this.ALERT,
            'emergency': this.EMERGENCY,
        }
    };

    static get STYLES() {
        return {
            [this.DEBUG]: 'color: #999999',
            [this.INFO]: 'color: #212121',
            [this.NOTICE]: 'color: #325A85',
            [this.WARNING]: 'color: #7A6223',
            [this.ERROR]: 'color: #EC3D47',
            [this.CRITICAL]: 'color: #AD2D33',
            [this.ALERT]: 'color: #6E1D21',
            [this.EMERGENCY]: 'color: #6E1D21',
        }
    };

    static get METHODS() {
        return {
            [this.DEBUG]: console.debug ? 'debug' : 'log',
            [this.INFO]: console.info ? 'info' : 'log',
            [this.NOTICE]: console.info ? 'info' : 'log',
            [this.WARNING]: console.warn ? 'warn' : 'log',
            [this.ERROR]: console.error ? 'error' : 'log',
            [this.CRITICAL]: console.error ? 'error' : 'log',
            [this.ALERT]: console.error ? 'error' : 'log',
            [this.EMERGENCY]: console.error ? 'error' : 'log',
        }
    };

    constructor(module, level, formatter) {
        this._module = String(module);
        this._level = this._normalizeLevel(level, Logger.ERROR);
        this._formatter = typeof formatter === 'function' ? formatter : function (level, message, missionId, missionTypeId) {
            let missionPrefix = '';
            if (
                typeof missionId !== 'undefined'
                && typeof missionTypeId !== 'undefined'
            ) {
                missionPrefix = '[' + missionId + '][' + missionTypeId + ']';
            }
            return '[' + this._module + '][' + level + ']' + missionPrefix + ' ' + message.trim();
        };
    }

    log(level, message, missionId, missionTypeId) {
        level = this._normalizeLevel(level, Logger.INFO);

        if (level < this._level) {
            return;
        }

        let method = Logger.METHODS[level];

        console[method]('%c' + this._formatter.call(this, level, message, missionId, missionTypeId), Logger.STYLES[level]);
    }

    debug(message, missionId, missionTypeId) {
        this.log(Logger.DEBUG, message, missionId, missionTypeId);
    }

    info(message, missionId, missionTypeId) {
        this.log(Logger.INFO, message, missionId, missionTypeId);
    }

    notice(message, missionId, missionTypeId) {
        this.log(Logger.NOTICE, message, missionId, missionTypeId);
    }

    warning(message, missionId, missionTypeId) {
        this.log(Logger.WARNING, message, missionId, missionTypeId);
    }

    error(message, missionId, missionTypeId) {
        this.log(Logger.ERROR, message, missionId, missionTypeId);
    }

    critical(message, missionId, missionTypeId) {
        this.log(Logger.CRITICAL, message, missionId, missionTypeId);
    }

    alert(message, missionId, missionTypeId) {
        this.log(Logger.ALERT, message, missionId, missionTypeId);
    }

    emergency(message, missionId, missionTypeId) {
        this.log(Logger.EMERGENCY, message, missionId, missionTypeId);
    }

    _normalizeLevel(level, fallback) {
        if (
            typeof level === 'number'
            && Object.values(Logger.LEVELS).indexOf(level) !== -1
        ) {
            return level;
        } else if (
            typeof level === 'string'
            && Object.keys(Logger.LEVELS).indexOf(level.toLowerCase()) !== -1
        ) {
            return Logger.LEVELS[level.toLowerCase()];
        }

        return fallback;
    }
}


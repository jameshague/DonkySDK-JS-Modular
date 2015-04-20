/*!
 * DonkyLogging JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */
/**
 * DonkyLogging module.
 * @namespace DonkyLogging
 */
var DonkyLogging = (function() {
    
    var logLevel = {
        Fatal : 0,
        Error : 1,
        Warn : 2,
        Info : 3,
        Debug : 4
    };

    var logLevelLookup = {
        0 : "Fatal",
        1 : "Error",
        2 : "Warn",
        3 : "Info",
        4 : "Debug"
    };


    // Our "private" instance
    var _instance;

    var defaults = { 
        logLevel : logLevel.Debug,
        maxSize : 1024 * 1,
        key: "rollingLogfile"
    };

    var donkyCore = null;
    
    // used as an id to identify each "session" - it will change on page reload and if 2 windows are open you can identify each log entry for diagnostics
    var uid = ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);

    // Log an event
	function _log(level, message, args){
						
        if(level <= defaults.logLevel ) {

            var formattedMessage = "[" + uid + "] : " + new Date().toJSON() + " [" + logLevelLookup[level] + "] : " + message + (args!==undefined ? ( " : " + JSON.stringify(args)) : "") + "\r\n";
            switch (level) {
                case logLevel.Fatal:
                case logLevel.Error:
                    console.error(formattedMessage);
                    break;
                    
                case logLevel.Warn:
                    console.warn(formattedMessage);
                    break;

                default:
                    console.log(formattedMessage);
                    break;
            }
                
            var log = donkyCore.donkyData.getString(defaults.key);

            if (log !== null) {
                log += formattedMessage;
            } else {
                log = formattedMessage;
            }

            if (log.length > defaults.maxSize) {
                log = log.substring(formattedMessage.length);
            }

            donkyCore.donkyData.setString(defaults.key, log);

            donkyCore.publishLocalEvent({ 
                type : "LogMessage", 
                data: {
                    logLevel: level,
                    message: message,
                    args: args
                } 
            });
        }
	}

/**
 * Creates DonkyLogging object.
 * @constructor
 */    
    function DonkyLogging(options) {

        // If it's being called again, return the singleton instance
        if(typeof _instance != "undefined") return _instance;

        if (options === undefined || options === null) {
            throw new Error("no options specified");
        }

        if (options.donkyCore === undefined) {
            throw new Error("No donkyCore specified");
        }

        donkyCore = options.donkyCore;

        // Keep a closured reference to the instance
        _instance = this;
        return _instance;
    };


/**
 *  Submit an automatic error log if config says so. 
 */    
    DonkyLogging.prototype._submitAutomaticErrorLog = function() {
        var configuration = donkyCore.donkyData.get("configuration");
        if (configuration !== null && configuration !== undefined) {
            if (configuration.configurationItems !== undefined && configuration.configurationItems.AlwaysSubmitErrors == "true") {
                donkyCore._submitLog("AutomaticByDevice");
            }
        }
    }
/**
 *  Write custon content to the diagnostic log of type fatal error. 
 *  @param {String} message - The name of the module to check for.
 *  @param {Object} args - Arguments for the message (optional).
 */    
    DonkyLogging.prototype.fatalLog = function(message, args) {
        if (logLevel.Fatal <= defaults.logLevel  ) {
            _log(logLevel.Fatal, message, args);
            donkyCore._submitLog("AutomaticByDevice");
        }
    }

/**
 *  Write custon content to the diagnostic log of type error. 
 *  @param {String} message - The name of the module to check for.
 *  @param {Object} args - Arguments for the message (optional).
 */    
    DonkyLogging.prototype.errorLog = function(message, args) {
        if (logLevel.Error <= defaults.logLevel  ) {
            _log(logLevel.Error, message, args);
            donkyCore._submitLog("AutomaticByDevice");
        }
    }
/**
 *  Write custon content to the diagnostic log of type warning. 
 *  @param {String} message - The name of the module to check for.
 *  @param {Object} args - Arguments for the message (optional).
 */    
    DonkyLogging.prototype.warnLog = function(message, args) {
        if (logLevel.Warn <= defaults.logLevel ) {
            _log(logLevel.Warn, message, args);
        }
    }

/**
 *  Write custon content to the diagnostic log of type info. 
 *  @param {String} message - The name of the module to check for.
 *  @param {Object} args - Arguments for the message (optional).
 */    
    DonkyLogging.prototype.infoLog = function(message, args) {
        if (logLevel.Info <= defaults.logLevel ) {
            _log(logLevel.Info, message, args);
        }
    }

/**
 *  Write custon content to the diagnostic log of type debug. 
 *  @param {String} message - The name of the module to check for.
 *  @param {Object} args - Arguments for the message (optional).
 */    
    DonkyLogging.prototype.debugLog = function(message, args) {
        if (logLevel.Debug <= defaults.logLevel) {
            _log(logLevel.Debug, message, args);
        }        
    }

/**
 *  Gets the current log contents.
 *  @returns {String}
 */    
    DonkyLogging.prototype.getLog = function() {
        return donkyCore.donkyData.getString(defaults.key);
    }

/**
 *  Clears the current log contents.
 */    
    DonkyLogging.prototype.clearLog = function() {
        return donkyCore.donkyData.remove(defaults.key);
    }


/**
 *  Enum for log levels [Fatal, Error, Warn, Info, Debug]
 *  @readonly
 *  @enum {number}
 */    
    DonkyLogging.prototype.logLevel = logLevel;

/**
 *  Gets the current log level.
 */    
    DonkyLogging.prototype._getLogLevel = function() {
        return defaults.logLevel;
    }
/**
 *  Sets the current log level.
 *  @param {Number} level - The new log level [0-4]
 */    
    DonkyLogging.prototype._setLogLevel = function(level) {
        if (level >= logLevel.Fatal && level <= logLevel.Debug) {
            defaults.logLevel = level;
        }
    }

    // Return the constructor
    return DonkyLogging;
})();

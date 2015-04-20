/*!
 * DonkyNetwork JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

/**
 * DonkyLogging module - allows Donky REST API interaction and SignalR connection
 * @namespace DonkyLogging
 */
var DonkyNetwork = (function() {
    "use strict";

    /** Some defaults (will get overriden with server config - just there as a fallback) */
    var defaults = {
        checkSynchroniseInterval: 1000,
        maxSecondsWithoutSynchronize: 5*60,
        retrySchedule : [5000,5000,30000,30000,60000,120000,300000,300000,300000,300000,300000,300000,300000,300000,300000,600000,600000,600000,600000,600000,600000,900000],
    };

    /** Our "private" instance */
    var _instance;
    
    /** instance of donkyCore */
    var donkyCore = null;

    /** Retry counter used for retrying some failed REST API calls. used in conjunction with above  retrySchedule. */
    var retryCounter = 0;

    /** Base URL's for secure and anonymous REST API's - methods get appended.*/
    DonkyNetwork.prototype.api = {
        anonymous: "client-api.mobiledonky.com/api/",
        secure: "client-secure-api-northeurope.mobiledonky.com/api/"
    };

    /** Enum for signalR statuses. */
    var signalrStatuses = {
        initializing: 0, 
        starting: 1,
        started: 2,
        stopping: 3,
        stopped: 4,
        error: 5
    };

    /**
     *  Enum for signalR statuses
     *  @readonly
     *  @enum {number}
     */    
    DonkyNetwork.prototype.signalrStatuses = signalrStatuses;

    /** Private variable internally set to true if someone calls _stopSignalR() when in a starting state. 
     *  When we enter the started state _stopSignalR() is called and this variable is reset to false.
     */
    var stopRequest = false;   

    /** Optional callback used in conjunction with stopRequest. */
    var stopRequestCallback = undefined;

    /** Private variable internally set to true if someone calls _startSignalR() when in a stopping state. 
     *  When we enter the stopped state _startSignalR() is called and this variable is reset to false.
     */
    var startRequest = false;   
    
    /** Optional callback used in conjunction with startRequest. */
    var startRequestCallback = undefined;
    
    /** If integrator calls queue / synchronize BEFORE signalR has started (and supplied an optional callback) we wait until signalr is up as a sync is done on startup. 
     *  We call this AFTER we have done the initial notification exchange. This prevents the notifications going to the rest API and allows a callback to be used.
     */
    var syncWhenStartingCallback = undefined;

    /** Variable representing whether signlR is initialised or not. */
    var signalrInitialised = false;
    
    /** Variable representing current state of signalR. */
    var signalrState = signalrStatuses.stopped;
    
    /** Variable representing signalR connection. */
    var signalrConnection = null;
    
    /** Variable representing signalR signalrHubProxy*/
    var signalrHubProxy = null;   
    
    /** Variable representing whether we are synchronising or not. Network doesn't allow multiple concurrent syncs so use this to protect against that. */
    var synchronizing = false;

    /** Variable representing whethr to use signalR. can be set with internal function _useSignalr() - only used for unit testing rest api fallback */
    var useSignalr = true;

/**
 *  Private function to implement maxSecondsWithoutSynchronize. This is called periodically on a timer.
 */    
    function _checkSynchronise() {

        if (!donkyCore.donkyAccount._isSuspended()) {
            var lastSynchroniseMs = donkyCore.donkyData.get("lastSynchroniseTime");

            if (lastSynchroniseMs !== null) {
                var lastSynchronizeDate = new Date(lastSynchroniseMs);

                var diff = donkyCore._dateDiff(lastSynchronizeDate, new Date());

                if (diff.seconds > defaults.maxSecondsWithoutSynchronize) {
                    _instance.synchronise();
                }
            }
        }
    }

/**
 * Creates DonkyNetwork object.
 * @constructor
 */    
    function DonkyNetwork(options) {

        // If it's being called again, return the singleton _instance
        if(typeof _instance != "undefined") return _instance;

        if (options === undefined || options === null) {
            throw new Error("no options specified");
        }

        if (options.donkyCore === undefined) {
            throw new Error("donkyCore not specified");
        }

        donkyCore = options.donkyCore;

        // Do some basic dependancy checking ...
        if (window.jQuery === undefined) {
            throw new Error("jQuery not found");
        }

        if (donkyCore._versionCompare($.fn.jquery, "1.6.4") < 0) {
            throw new Error("jQuery varsion too old - require minimum version of 1.6.4");
        }

        if (window.$.signalR === undefined) {
            throw new Error("jQuery not found");
        }

        if (donkyCore._versionCompare(window.$.signalR.version, "2.2.0") < 0) {
            throw new Error("signalR varsion too old - require minimum version of 2.2.0");
        }

        // Keep a closured reference to the _instance
        _instance = this;

        /** Start the maxSecondsWithoutSynchronize checker ...*/
        setInterval( function(){ _checkSynchronise(); }, defaults.checkSynchroniseInterval );

        if (useSignalr) {

            // this event is published from _register()
            donkyCore.subscribeToLocalEvent("RegistrationChanged", function(event) {
            
                if (signalrState == signalrStatuses.initializing||
                    signalrState == signalrStatuses.starting||
                    signalrState == signalrStatuses.started) {
                    _instance._stopSignalR(function() {
                        _instance._startSignalR();
                    });            
                }
            });        

            // This event is ALWAYS published on succesful initialisation and currently AFTER a NewRegistration event should the initialize function call _register
            donkyCore.subscribeToLocalEvent("DonkyInitialised", function(event) {
                // if initialise called twice, don't bother ...
                if (!signalrInitialised) {
                    _instance._initSignalR();            
                }else if (signalrState == signalrStatuses.stopped) {
                    _instance._startSignalR();  
                }
            });
        }

        // "DeviceCommsConnectionRetrySchedule":"5,2|30,2|60,1|120,1|300,9|600,6|900,*",
        // get the retry schedule from config if there is one, parse it and refresh the schedule
        var configuration = donkyCore.donkyData.get("configuration");

        if (configuration !== null && configuration !== undefined && configuration.configurationItems !== undefined ) {
            if (typeof configuration.configurationItems.DeviceCommsConnectionRetrySchedule == "string") {
            
                var retrySchedules = configuration.configurationItems.DeviceCommsConnectionRetrySchedule.split("|");
		        var retryScheduleArray = [];
		        donkyCore._each(retrySchedules, function(index, item) {
                            
			        var schedule = item.split(",");
			        if (schedule.length == 2) {
				        var timeoutInSeconds = parseInt(schedule[0]);
				        var repeat = schedule[1] === "*" ? 1 : parseInt(schedule[1]);
                        for (var i = 0; i < repeat; i++) {
                            retryScheduleArray.push(timeoutInSeconds * 1000);
                        }
			        }
		        });
                defaults.retrySchedule = retryScheduleArray;
            }

            // Get MaxMinutesWithoutNotificationExchange out of config ...
            if (useSignalr && typeof configuration.configurationItems.MaxMinutesWithoutNotificationExchange == "string") {
                defaults.maxSecondsWithoutSynchronize = parseInt(configuration.configurationItems.MaxMinutesWithoutNotificationExchange) * 60;
            }
        }

        return _instance;
    }


/**
 *  Performs an ajax REST API call to Donky with retry schedule. Retries are not performed on any failure as below. 
 *  
 *  @param {Object} request - The request object.
 *  @param {String} type - The domain name and path to the remote server (either the anonymous API or the secure API).
 *  @param {String} api - The api (anonymous or secure base URL).
 *  @param {String} method - The remote method name.
 *  @param {Callback} callback - The call back to execute upon completion.
 */    
    DonkyNetwork.prototype.ajax = function(request, type, api, method, callback) {
        try {
            _instance._ajax(request, type, api, method, function(rslt) {

                if (!rslt.succeeded &&
                    // Don't retry Bad request as this menas bad data passed
                    rslt.statusCode !== 400 &&
                    // Don't retry Not Authorized either ...                
                    rslt.statusCode !== 401 &&
                    // Don't retry Forbidden (user has been suspended)...                
                    rslt.statusCode !== 403 &&
                     // Don't retry Not Found either as this means something in REST land ...                
                    rslt.statusCode !== 404 &&
                    // Suspended user calling a secure REST method fails on preflight and don't necessarily get a status code 
                    !donkyCore.donkyAccount._isSuspended() &&
                    // Ensure we have a registered user to prevent churn ...
                    donkyCore.donkyAccount.isRegistered()) {

                    donkyCore.donkyLogging.debugLog("Retrying ajax call in " + defaults.retrySchedule[retryCounter] + " ms - retryCounter = " + retryCounter);

                    setTimeout(function() {
                        _instance.ajax(request, type, api, method, callback);

                    }, defaults.retrySchedule[retryCounter]);

                    if (retryCounter < defaults.retrySchedule.length - 1) {
                        retryCounter++;
                    }
                } else {
                    if (rslt.succeeded) {
                        retryCounter = 0;
                    }
                    callback(rslt);
                }
            });
        } catch (e) {
            donkyCore.donkyLogging.errorLog("caught exception in ajax() : " + e );
            callback({ succeeded: false, statusCode: -1 });
        }
    }

    /** 
     *  Private function that actually executes a REST call. Request headers are added as follows: 1) add apiKey header. 2) if secure API, add authorization header.
     *  Responses that have a 400 status code (bad request) are treated as a validation failure and the responseText is assumed to be an array of validation errors.
     *
     *  @param {Object} request - The request object.
     *  @param {String} type - The domain name and path to the remote server (either the anonymous API or the secure API).
     *  @param {String} api - The api (anonymous or secure base URL).
     *  @param {String} method - The remote method name.
     *  @param {Callback} callback - The call back to execute upon completion.
     */
    DonkyNetwork.prototype._ajax = function(request, type, api, method, callback) {

        var headers = {};

        if (api === _instance.api.secure) {
            headers.authorization = donkyCore.donkyNetwork._getAuthorizationHeader();
        } else {
            headers.apiKey = donkyCore.donkyData.get("apiKey");
        }

        var environment = donkyCore.donkyData.get("environment");
        var scheme = donkyCore.donkyData.get("scheme");

        var jqxhr = $.ajax({
                url: scheme + environment + api + method,
                type: type,
                beforeSend: function(xhr) {
                    if (headers !== null) {
                        donkyCore._each(headers, function(name, value) {
                            xhr.setRequestHeader(name, value);
                        });
                    }
                },
                contentType: "application/json",
                data: request !== null ? JSON.stringify(request) : undefined,
                dataType: "json",
            })
            .done(function(data) {
                if (data !== null && 
                    data !== undefined) {
                    donkyCore.donkyLogging.debugLog(JSON.stringify(data));
                }
                
                callback({ succeeded: true, response: data });
            })
            .fail(function(jqXHR, status) {

                // request finished and response is ready 
                if (jqXHR.readyState == 4) {
                    var msg;
                    var response = null;
                    var statusCode = jqXHR.statusCode();
                    switch (statusCode.status) {
                        case 400:
                            {
                                try {
                                    response = JSON.parse(statusCode.responseText);
                                } catch (e) {
                                    donkyCore.donkyLogging.warnLog("failed to parse responseText: " + statusCode.responseText);
                                }

                                msg = type + " to  " + api + method + " returned a " + statusCode.status + " (Bad request)\nrequest: " + JSON.stringify(request) + "\nheaders: " + JSON.stringify(headers) + "\nresponse: " + JSON.stringify(response);
                                donkyCore.donkyLogging.warnLog(msg);
                            }
                            break;

                        default:
                            {
                                msg = type + " to  " + api + method + " returned a " + statusCode.status + "\nrequest: " + JSON.stringify(request) + "\nheaders: " + JSON.stringify(headers) + "\nresponse: " + statusCode.responseText;
                                donkyCore.donkyLogging.warnLog(msg);
                            }
                            break;
                    }

                    callback({ succeeded: false, response: response, statusCode: statusCode.status });
                } else {
                    msg = type + " to  " + api + method + " failed (" + status + ")\nrequest: " + JSON.stringify(request) + "\nheaders: " + JSON.stringify(headers);
                    donkyCore.donkyLogging.warnLog(msg);

                    callback({ succeeded: false, statusCode: -1 });
                }
            });
    }

/**
 *  Initializes SignalR. This is only ever performed once.
 */    
    DonkyNetwork.prototype._initSignalR = function() {

        if(signalrConnection == null) {

            signalrState = signalrStatuses.initializing;
            var accessDetails = donkyCore.donkyData.get("accessDetails");

			signalrConnection = $.hubConnection(accessDetails.signalRUrl, {useDefaultPath:false});
			signalrConnection.qs = { "access_token": accessDetails.accessToken };

            if (donkyCore.donkyLogging._getLogLevel() >= donkyCore.donkyLogging.logLevel.Info ) {
                signalrConnection.logging = true;            
            }

			signalrHubProxy = signalrConnection.createHubProxy("NetworkHub");

            // Handler for signalR push notifications
			signalrHubProxy.on("push", function (notifications) {
				donkyCore.donkyLogging.debugLog("Push was called with notifications: " + JSON.stringify(notifications));

				donkyCore._processServerNotifications(notifications); 
                
                // notify back immediately ...
			    if (useSignalr) {
                    _instance._synchroniseOverSignalR();
			    } else {
                    _instance._synchronizeOverREST();
			    }
			});
				
			signalrInitialised = true;
				
			_instance._startSignalR();

        }else{
            donkyCore.donkyLogging.warnLog("_signalR.init() called twice");
        }
    }

/**
 *  Returns whether SignalR is started.
 *  @returns {Boolean}
 */    
    DonkyNetwork.prototype._isSignalRStarted = function() {
        return signalrState == signalrStatuses.started;
    }

/**
 *  Returns SignalR status.
 *  @returns {Boolean}
 */    
    DonkyNetwork.prototype._getSignalRState = function() {
        return signalrState;
    }

/**
 *  Enable / disable signalr (internal function to enable testing sync over rest API).
 *  @param {Boolean} use - whether to use signalR or not.
 */    
    DonkyNetwork.prototype._useSignalR = function(use) {
        useSignalr = use;
    }

/**
 *  Starts SignalR.
 *  @param {Callback} method - The (optional) callback to execute upon completion.
 */    
    DonkyNetwork.prototype._startSignalR = function(callback) {

		if (signalrConnection != null) {

            var accessDetails = donkyCore.donkyData.get("accessDetails");

		    switch (signalrState) {
                case signalrStatuses.initializing:
                case signalrStatuses.stopped:
                    {
		                // refresh access token
		                signalrConnection.qs = { "access_token": accessDetails.accessToken };

		                signalrState = signalrStatuses.starting;
		                signalrConnection.start()
		                    .done(function() {
                                signalrState = signalrStatuses.started;
		                        donkyCore.publishLocalEvent({ type : "SignalRStarted", data: {} });

		                        if (donkyCore._isFunction(callback)) {
		                            callback();
		                        }

                                _instance._synchroniseOverSignalR(function() {
                                    // Did somenoe call synchronize whilst we were coming up and supply a callback ?
                                    // if so call it now
                                    if (syncWhenStartingCallback !== undefined) {
                                        donkyCore.donkyLogging.debugLog("syncWhenStartingCallback registered, calling ...");
                                        syncWhenStartingCallback();
                                        syncWhenStartingCallback = undefined;
                                    }


                                    // teardown whilst syncing causes an error so wait ...
		                            if (stopRequest === true) {
                                        donkyCore.donkyLogging.debugLog("Entered the started state and found a stop request. stopping ...");

		                                stopRequest = false;
                                        _instance._stopSignalR(stopRequestCallback);
		                                stopRequestCallback = undefined;
		                            }                        

                                });

		                    })
		                    .fail(function(error) {
                                // TODO: add error state
                                signalrState = signalrStatuses.stopped;
		                        donkyCore.donkyLogging.warnLog("Connection error: " + error);
            
                                // TODO: synchronize over REST ...
                                _instance._synchronizeOverREST(function() {
                                    // Did somenoe call synchronize whilst we were coming up and supply a callback ?
                                    // if so call it now
                                    if (syncWhenStartingCallback !== undefined) {
                                        donkyCore.donkyLogging.debugLog("syncWhenStartingCallback registered, calling ...");
                                        syncWhenStartingCallback();
                                        syncWhenStartingCallback = undefined;
                                    }
                                });


		                    });

		            }
                    break;

                case signalrStatuses.started:
                    {
                        // Call the callback in case someone is waiting on it
		                if (donkyCore._isFunction(callback)) {
		                    callback();
		                }

                        donkyCore.donkyLogging.warnLog("_startSignalR() called when already started");
		            }
                    break;
                
                case signalrStatuses.starting:
                    {
                        donkyCore.donkyLogging.warnLog("_startSignalR() called when starting");
		            }
                    break;
                
                case signalrStatuses.stopping:
                    {
                        donkyCore.donkyLogging.debugLog("_startSignalR() called when stopping - requesting a start when stopped");
                        // request a start ...
		                startRequest = true;
		                startRequestCallback = callback;
		            }
                    break;
                
                default:
                {
                    donkyCore.donkyLogging.errorLog("Unknown signalR status: " + signalrState);
		        }
                break;
		    }


		} else {
		    donkyCore.donkyLogging.warnLog("_startSignalR() called when not initialized");
        }
    }

/**
 *  Stops SignalR.
 *  @param {Callback} method - The (optional) callback to execute upon completion.
 */    
    DonkyNetwork.prototype._stopSignalR = function(callback) {
		if (signalrConnection != null) {

		    switch (signalrState) {
		        case signalrStatuses.started:
		            {
		                signalrConnection.stop();
                        signalrState = signalrStatuses.stopped;
                        donkyCore.publishLocalEvent({ type : "SignalRStopped", data: {} });	
		                if (donkyCore._isFunction(callback)) {
		                    callback();
		                }

		                if (startRequest === true) {
                            donkyCore.donkyLogging.debugLog("Entered the stopped state and found a start request. starting ...");
		                    startRequest = false;
                            _instance._startSignalR(startRequestCallback);
		                    startRequestCallback = undefined;
		                }
		            }
		            break;

                case signalrStatuses.stopped:
		            {
                        donkyCore.donkyLogging.warnLog("_stopSignalR() called when already stopped");
                        // Call the callback in case someone is waiting on it
		                if (donkyCore._isFunction(callback)) {
		                    callback();
		                }
		            }
                    break;

                case signalrStatuses.stopping:
		            {
                        donkyCore.donkyLogging.warnLog("_stopSignalR() called when already stopping");
		            }
                    break;

                case signalrStatuses.starting:
                case signalrStatuses.initializing:
		            {
                        donkyCore.donkyLogging.debugLog("_stopSignalR() called when initializing / starting  - requesting a stop when started");
                        // request a stop ...
		                stopRequest = true;
		                stopRequestCallback = callback;
		            }
                    break;

                default:
                {
                    donkyCore.donkyLogging.errorLog("Unknown signalR status: " + signalrState);
		        }
                break;

		    }

		} else {
            donkyCore.donkyLogging.warnLog("_stopSignalR() called when not initialized");
		}
    }

/**
 * Synchronises over SignalR if pending client messages available.
 *
 * @param {Callback} callback - The callback to invoke when the syncronization is complete (optional).
 */    
    DonkyNetwork.prototype._synchroniseOverSignalR  = function(callback) {

        if (signalrState == signalrStatuses.started) {

            var args = donkyCore._getClientNotificationsToExecute();

            donkyCore.donkyLogging.debugLog("invoking synchronise: " + JSON.stringify(args));

            synchronizing = true;

            signalrHubProxy.invoke("synchronise", args)
                .done(function(exchange_response) {

                    donkyCore.donkyData.set("lastSynchroniseTime", new Date().valueOf());
                    synchronizing = false;

                    donkyCore.donkyLogging.infoLog("Call to synchronise succeeded, result was: " + JSON.stringify(exchange_response));

                    // Do we want to process this lot outside of this done callback ?
                    // Not really as we want to see if there are any client notifications to send at the end - unless that is moved outside too
                    // Procees any server notifications. They will be farmed out to different modules.
                    donkyCore._processServerNotifications(exchange_response.serverNotifications);
                    donkyCore._processSentClientNotifications(args);

                    if (donkyCore._isArray(exchange_response.failedClientNotifications) && exchange_response.failedClientNotifications.length > 0) {
                        donkyCore.donkyLogging.warnLog("Exchange returnewd some failed client notifications: " + JSON.stringify(exchange_response.failedClientNotifications));
                    }

                    donkyCore.donkyData.remove("ExecutingClientNotifications");

                    if (donkyCore._isPendingNotifications()) {
                        donkyCore.donkyLogging.infoLog("_processServerNotifications() generated some pending client notifications, sending now ...");
                        _instance._synchroniseOverSignalR(callback);
                    } else {
                        if (donkyCore._isFunction(callback)) {
                            callback();
                        }
                    }
                })
                .fail(function(error) {
                    synchronizing = false;
                    // TODO: add error state
                    signalrState = signalrStatuses.stopped;

                    donkyCore.donkyLogging.errorLog("Call to synchronise failed: " + error);

                    if (donkyCore._isFunction(callback)) {
                        callback();
                    }
                });
        } else {
            donkyCore.donkyLogging.warnLog("signalR not initialized so can't synchronise over this channel");
        }
    }


/**
 * Performs a notification sync over REST API.
 *
 * @param {Callback} callback - The callback to invoke when the syncronization is complete (optional).
 */    
    DonkyNetwork.prototype._synchronizeOverREST = function(callback) {

        if(synchronizing){
            donkyCore.donkyLogging.warnLog("synchronize called when already synchronizing");
            return;
        }

        var synchronizeRequest = {
            "clientNotifications" : donkyCore._getClientNotificationsToExecute(),
            "isBackground": true
        };

        synchronizing = true;
        this.ajax(
            synchronizeRequest, 
            "POST", 
            this.api.secure,
            "notification/synchronise",
            function(result) {
                
                donkyCore.donkyData.set("lastSynchroniseTime", new Date().valueOf());
                synchronizing = false;

                if (result.succeeded) {
                    donkyCore.donkyLogging.debugLog("Call to synchronise succeeded, result was: " + JSON.stringify(result));

                    donkyCore._processServerNotifications(result.response.serverNotifications);
                    donkyCore._processSentClientNotifications(synchronizeRequest.clientNotifications);

                    if (donkyCore._isArray(result.response.failedClientNotifications) && result.response.failedClientNotifications.length > 0) {
                        donkyCore.donkyLogging.warnLog("Exchange returnewd some failed client notifications: " + JSON.stringify(result.response.failedClientNotifications));
                    }

                    donkyCore.donkyData.remove("ExecutingClientNotifications");

                    if (donkyCore._isPendingNotifications()) {
                        _instance._synchronizeOverREST(callback);
                    } else {
                        if (donkyCore._isFunction(callback)) {
                            callback();
                        }
                    }
                } else {
                    synchronizing = false;
                    donkyCore.donkyLogging.errorLog("Call to synchronise failed, result was: " + JSON.stringify(result));
                    if (donkyCore._isFunction(callback)) {
                        callback();
                    }
                }
            });
    }

/**
 * Performs a notification sync.
 *
 * @param {Callback} callback - The callback to invoke when the syncronization is complete (optional).
 */    
    DonkyNetwork.prototype.synchronise  = function(callback) {
        try{
     	    if (useSignalr) {

	             if (signalrState == signalrStatuses.initializing || 
                     signalrState == signalrStatuses.starting) {
                     // Do nothing here as signalR is still coming up ...
                     // A notification exchange is performed when started which will deal with this request
                     // Need to get the sync call to call our callback when it is ready
                     syncWhenStartingCallback = callback;
	             }else if (signalrState == signalrStatuses.started) {
                    _instance._synchroniseOverSignalR(callback);
                } else {
                    _instance._synchronizeOverREST(callback);
                }

		    } else {
                _instance._synchronizeOverREST(callback);
		    }
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in synchronise() : " + e );
            callback();
        }    
    }

/**
 * Gets a specific server notification from the network 
 *
 * @param {String} notificationId - The server notification id
 * @param {Callback} resultHandler - The callback to invoke with the notification when it has been retrieved.
 */    
    DonkyNetwork.prototype.getServerNotification = function(notificationId, resultHandler) {
        try{
            if (!donkyCore._isFunction(resultHandler)) {
                throw new Error("resultHandler not supplied");
            }
        
            this.ajax(
                null, 
                "GET", 
                this.api.secure,
                "notification/" + notificationId,
                function(result) {
                    if (result.succeeded) {
                        resultHandler(result.response);
                    } else {
                        donkyCore.donkyLogging.warnLog("Failed to get Server Notification: " + notificationId);
                        resultHandler(null);                
                    }               
                });
		}catch(e){
			 donkyCore.donkyLogging.errorLog("caught exception in getServerNotification() : " + e );
            resultHandler(null); 
        }    
    }

/**
 *  Gets authorization header.
 *  @returns {ServerNotification} - The authorization header.
 */    
    DonkyNetwork.prototype._getAuthorizationHeader = function() {
        var accessDetails = donkyCore.donkyData.get("accessDetails");
        return accessDetails !== null ? accessDetails.tokenType + " " + accessDetails.accessToken : "";
    }

    // Return the constructor
    return DonkyNetwork;
})();

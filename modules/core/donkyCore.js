/*!
 * DonkyCore JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

var DonkyCore = (function() {
    "use strict";
    // Our "private" instance
    var _instance;
    
    // This is thr root location of the donky JS installation. Other modules that need to reference resources
    // will use this property to resolve any paths. 
    var installDir = "../";
         
    // array of subscribers to Donky notifications
    var donkyNotificationSubscribers = [];

    // array of subscribers to Content notifications
    var customNotificationSubscribers = [];

    // array of subscribers to Outbound notifications
    var outboundNotificationSubscribers = [];

    // array of subscribers to SDK events
    var eventSubscribers = [];

    // private object to store the service instances
    var registeredServices = {};
    
    /**
     * Initialisation status - use this to ensure initialise() isn't called twice
     */
    var initStatuses = {
        uninitialised: 0,
        initialising: 1,
        initialised: 2,
        failed: 3
    };
    
    var initStatus = initStatuses.uninitialised;

/**
 * Creates DonkyCore object.
 * @class DonkyCore
 */
    function DonkyCore() {

        // If it's being called again, return the singleton instance
        if (typeof _instance != "undefined") return _instance;

        // Keep a closured reference to the instance
        _instance = this;
        _instance.registerModule({ name: "donkyCore", version: _instance.version() });

        // create the various modules that are considered part of core
        DonkyCore.prototype.donkyData = new DonkyData({donkyCore: _instance});
        DonkyCore.prototype.donkyLogging = new DonkyLogging({ donkyCore: _instance });
        DonkyCore.prototype.donkyNetwork = new DonkyNetwork({ donkyCore: _instance });
        DonkyCore.prototype.donkyAccount = new DonkyAccount({ donkyCore: _instance });

        // lets eat our own dogfood and handle TransmitDebugLog and NewDeviceAddedToUser events
        _instance.subscribeToDonkyNotifications(
            {
                name: "donkyCore",
                version: _instance.version()
            },
            [{
                notificationType: "TransmitDebugLog",
                handler: function(notification) {
                    _instance.donkyLogging.debugLog("TransmitDebugLog : " + JSON.stringify(notification));
                    _instance._queueAcknowledgement(notification, "Delivered");
                    _instance.submitLog();
                }
            },{
                notificationType: "NewDeviceAddedToUser",
                handler: function(notification) {
                    _instance.donkyLogging.debugLog("NewDeviceAddedToUser : " + JSON.stringify(notification));
                    _instance.publishLocalEvent({ type : "NewDeviceAddedToUser", data: notification });
                }
            }],
            true);

            _instance.subscribeToLocalEvent("DonkyInitialised", function(event) {
                initStatus = initStatuses.initialised;
                _instance._updateClientInfoIfChanged();
            });

        return _instance;
    }

    /**
     * Internal function to recursively convert all properties to camel case
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Object}
     */
    DonkyCore.prototype._dateDiff = function(startDate, endDate) {
        var diff = endDate - startDate;
        if (isNaN(diff)) return NaN;
        return {
            milliSeconds: diff,
            seconds: Math.floor(diff / 1000),
            minutes: Math.floor(diff / (1000 * 60)),
            hours: Math.floor(diff / (1000 * 60 * 60)),
            days: Math.floor(diff / (1000 * 60 * 60 * 24))
        };
    };

    /**
     * Internal function to compare 2 version numbers
     * @param {String} v1
     * @param {String} v2
     * @param {Object} options
     * @returns {Number} result
     */
    DonkyCore.prototype._versionCompare = function(v1, v2) {
        var v1parts = v1.split('.'),
            v2parts = v2.split('.');

        function isValidPart(x) {
            return (/^\d+$/).test(x);
        }
        
        var valid = true;
        _instance._each( v1parts, function(index,val){
            valid = isValidPart( val );
            if(valid){
                v1parts[index] = parseInt(val);
            }
            return valid;    
        });
        
        _instance._each( v2parts, function(index,val){
            valid = isValidPart( val );
            if(valid){
                v2parts[index] = parseInt(val);
            }
            return valid;
        });
        
        if(!valid){
            return NaN;   
        }

        while (v1parts.length < v2parts.length) v1parts.push(0);
        while (v2parts.length < v1parts.length) v2parts.push(0);

        for (var i = 0; i < v1parts.length; ++i) {
            if (v2parts.length == i) {
                return 1;
            }

            if (v1parts[i] == v2parts[i]) {
                continue;
            } else if (v1parts[i] > v2parts[i]) {
                return 1;
            } else {
                return -1;
            }
        }

        if (v1parts.length != v2parts.length) {
            return -1;
        }

        return 0;
    };

    /**
     * Internal function to determine whether there are any pending client notifications available.
     * @returns {Boolean}
     */
    DonkyCore.prototype._isPendingNotifications = function() {
        var pendingClientNotifications = _instance.donkyData.get("PendingClientNotifications");

        return pendingClientNotifications !== null &&
            pendingClientNotifications !== undefined &&
            _instance._isArray(pendingClientNotifications) &&
            pendingClientNotifications.length > 0;
    };

    /**
     * Internal function to return the string length of the sum of any Pending Client Notifications.
     * @returns {Number}
     */
    DonkyCore.prototype._getPendingNotificationsLength = function() {
        var pendingClientNotifications = _instance.donkyData.getString("PendingClientNotifications");
        var len = 0;
        if (pendingClientNotifications !== null &&
            pendingClientNotifications !== undefined) {
            len = pendingClientNotifications.length;
        }
        return len;
    };


    /**
     * Internal function to retrieve pending client notifications to execute. Any notifications in the ExecutingClientNotifications
     * are assumed to have failed due to a page reload and are resubmitted. the sum of all notifications are returned and also stored
     * in ExecutingClientNotifications. When a succesful synchronise has occurred, the ExecutingClientNotifications are removed (in donkyNetwork)
     * @returns {Array} client notifications.
     */
    DonkyCore.prototype._getClientNotificationsToExecute = function() {
        // Get any pending client notifications and pass them up now
        var pendingClientNotifications = _instance.donkyData.get("PendingClientNotifications");

        // The only reason this would NOT be empty is if we failed to notify
        var failedExecutingClientNotifications = _instance.donkyData.get("ExecutingClientNotifications");

        var args = [];

        if (failedExecutingClientNotifications !== null) {
            args = failedExecutingClientNotifications;
        }

        if (pendingClientNotifications !== null) {
            // if there were some failures above, just concatenat all together ...
            args = args.concat(pendingClientNotifications);
        }

        // Move pending notifications into an executing bucket - wee can reclaim these on load if page was killed during a notify
        _instance.donkyData.set("ExecutingClientNotifications", args);
        _instance.donkyData.remove("PendingClientNotifications");

        _instance.donkyLogging.infoLog("_getClientNotificationsToExecute() : " + JSON.stringify(args));

        return args;
    };
    

    /**
     * Internal function to construct an acknowledgement and queue it (client notification)
     * @param {String} notificationId
     * @param {String} type
     * @param {String} customType (optional) - only applicable for custom notifications
     */
    DonkyCore.prototype._queueAcknowledgement = function(notification, result) {

        var acknowledgement = {
            type: "Acknowledgement",
            acknowledgementDetail: {
                serverNotificationId: notification.id,
                result: result,
                sentTime: new Date().toISOString(),
                type: notification.type,
                // only needed for custom types, if set to undefined, stringification will remove
                customNotificationType: notification.type === "Custom" ? notification.data.customType : undefined
            }
        };

        _instance.queueClientNotifications(acknowledgement);
    };

    /**
     * Internal function to group a batch of server notifications. 
     * @param {Object[]} serverNotifications - array of server notifications
     */
    DonkyCore.prototype._batchifyServerNotifications = function(serverNotifications) {
        
        // sort notifications into batches  
        var batched = {
            customNotifications: {},
            donkyNotifications:{}
        };
        
        _instance._each(serverNotifications, function(index, notification) {
            
            if(notification.type == "Custom"){
                if( !_instance._isArray( batched.customNotifications[notification.data.customType] ) ){
                    batched.customNotifications[notification.data.customType] = [];
                }                
                batched.customNotifications[notification.data.customType].push(notification);                
            }else{
                if( !_instance._isArray( batched.donkyNotifications[notification.type] ) ){
                    batched.donkyNotifications[notification.type] = [];
                }
                batched.donkyNotifications[notification.type].push(notification);                    
            }  
            
        }); 
        
        return batched;       
    };

    /**
     * Internal function to iterate through the subscribers and see if any have the autoAcknowledge property set.
     * @param {Object[]} subscribers - array of subscribers 
     * @param {type} type - the notification type - i.e. "SimplePushMessage"
     */
    DonkyCore.prototype._isAutoAcknowledge = function(subscribers, type) {
        var autoAcknowledge = false;

        _instance._each(subscribers, function(handlerIndex, subscriber) {
            if (subscriber.autoAcknowledge === true && subscriber.notificationType === type) {
                autoAcknowledge = true;
            }            
        });
        
        return autoAcknowledge;
    };

    /**
     * Internal function to process a batch of server notifications.
     * @param {Object[]} notifications - array of server notifications 
     * @param {String} type - the type of the notifications
     * @param {Object[]} subscribers - array of subscribers
     * @returns {Boolean} - returns whether the notifuications were handled    
     */
    DonkyCore.prototype._processServerNotificationBatch = function(notifications, type, subscribers) {

        var handled = false;
        // iterate over all the subscribers to see if any are interested in this type of notification
        _instance._each(subscribers, function(handlerIndex, subscriber) {

            if(subscriber.notificationType == type && !subscriber.removed){
                                
                try {                        
                    if(_instance._isFunction(subscriber.batchHandler)){
                        // batch mode
                        subscriber.batchHandler(notifications);
                        handled = true;                                                    
                    }else if(_instance._isFunction(subscriber.handler)){
                        // old mode
                        _instance._each(notifications, function(index, notification){
                            subscriber.handler(notification);
                        });
                        handled = true;
                    }else{
                        _instance.donkyLogging.warnLog("No handler on subscriber interface");    
                    }
                } catch (e) {
                    _instance.donkyLogging.errorLog("Caught exception processing server notifications");
                }                                                       
            }
        });            
        
        if (!handled) {
            _instance.donkyLogging.warnLog("Message batch: " + type + " not handled");
        }
                         
        return handled;
    };

    /**
     * Internal function to process a batch of server notifications. They are farmed out to any subscribers or just acknowledged.
     * @param {ServerNotification[]} serverNotifications - array of server notifications 
     */
    DonkyCore.prototype._processServerNotifications = function(serverNotifications) {

        var handled, autoAcknowledge;
        var batched = _instance._batchifyServerNotifications(serverNotifications);
                       
        // iterate over all the different batches of donky server notifications
        _instance._each(batched.donkyNotifications, function(type, notifications){
                        
            autoAcknowledge = _instance._isAutoAcknowledge(donkyNotificationSubscribers, type);
            handled = _instance._processServerNotificationBatch(notifications, type, donkyNotificationSubscribers);
                      
            // If autoAcknowledge is false, we ASSUME they have acknowledged it 
            // (if they haven't they will be repeatedly receiving it every synchronise)
            if (!handled || autoAcknowledge) {
                _instance._each(notifications, function(index, notification){
                    _instance._queueAcknowledgement(notification, handled ? "Delivered" : "DeliveredNoSubscription");
                });
            }
        });
        
        // iterate over all the different batches of custom server notifications
        _instance._each(batched.customNotifications, function(type, notifications){
            
            handled = _instance._processServerNotificationBatch(notifications, type, customNotificationSubscribers);
                        
            // always Acknowledge custom notifications           
            _instance._each(notifications, function(index, notification){
                _instance._queueAcknowledgement(notification, "Delivered");
            });
        });
    };
    
    /**
     * Internal function to process a batch of client notifications BEFORE they have been sent. 
     * They are farmed out to any subscribers.
     */
    DonkyCore.prototype._processPendingClientNotifications = function(clientNotifications) {

        _instance._each(clientNotifications, function(index, clientNotification) {

            _instance._each(outboundNotificationSubscribers, function(handlerIndex, subscriber) {
                if (subscriber.notificationType == clientNotification.type && !subscriber.removed) {
                    subscriber.handler(clientNotification);
                }
            });
        });
    };

    /** 
     * Validates SendContent Notifications - checks for payloads greater than CustomContentMaxSizeBytes. Any messages that are too large will be removed and a validation error will be returned.
     * @param {ContentNotification[]} notifications
     */
    function isSendContentNotificationValid(notification) {
        var valid = true;

        if (notification.content.data !== null &&
            notification.content.data !== undefined) {
        
            var configuration = _instance.donkyData.get("configuration");
            var maxBytes = parseInt( configuration.configurationItems.CustomContentMaxSizeBytes );
            var maxSignalRBytes = parseInt( configuration.configurationItems.SignalRMaxMessageSizeBytes );
            // This looks to be the limit of SignalR ...

            var length = JSON.stringify(notification.content.data).length;

            if (length > maxSignalRBytes) {
                valid = false;
                _instance.donkyLogging.debugLog("ContentNotification size too large (" + length + "): max size = " + maxBytes );
            } else {
                _instance.donkyLogging.debugLog("ContentNotification size ok (" + length + "): max size = " + maxBytes );
            }
        }

        return valid;
    }


    /** 
     * Translates the supplied ContentNotifications into SENDCONTENT ClientNotifications and queues them.
     * @memberof DonkyCore
     * @param {(ContentNotification|ContentNotification[])} notifications
     * @returns {Object} 
     */
    DonkyCore.prototype.queueContentNotifications = function(notifications) {
        try {

            var customNotifications = [];
            var invalidNotifications = [];

            if (_instance._isArray(notifications)) {
                _instance._each(notifications, function(index, notification) {
                    if (isSendContentNotificationValid(notification)) {
                        customNotifications.push({
                            type: "SendContent",
                            definition: notification
                        });
                    } else {
                        invalidNotifications.push({
                            type: "SendContent",
                            definition: notification
                        });
                    }
                });
            } else {
                if (isSendContentNotificationValid(notifications)) {
                    customNotifications.push({
                        type: "SendContent",
                        definition: notifications
                    });
                } else {
                    invalidNotifications.push({
                        type: "SendContent",
                        definition: notifications
                    });
                }
            }

            if (customNotifications.length > 0) {
                _instance.queueClientNotifications(customNotifications);
            }

            if (invalidNotifications.length > 0 ) {
                return { 
                    succeeded: false, 
                    failedClientNotifications: invalidNotifications,
                    reason: "The following notifications are too large and have not been processsed"
                };
            } else {
                return{ succeeded: true };
            }

        }catch(e){
			_instance.donkyLogging.errorLog("caught exception in queueCustomNotifications() : " + e );
		}
    };

/**
 * Send a notification via the Donky network immediately if possible.
 * @memberof DonkyCore
 * @param {ContentNotification|ContentNotification[]} notifications - The notification(s) to send
 * @param {Callback} resultHandler - The callback to invoke when the notifications has been sent. (optional).
 */    
    DonkyCore.prototype.sendContentNotifications = function(notifications, resultHandler) {
        try {

            var queueResult = _instance.queueContentNotifications(notifications);

            if (!queueResult.succeeded) {
                _instance.donkyLogging.debugLog(queueResult.failedClientNotifications.length + " invalid content notification(s)");
            }
            
            _instance.donkyNetwork.synchronise(function(syncResult) {

                if (_instance._isFunction(resultHandler)) {
                    if (!queueResult.succeeded) {

                        syncResult.succeeded = false;

                        _instance._each(queueResult.failedClientNotifications, function(index, notification) {
                            syncResult.response.failedClientNotifications.push({
                                "notification": {
                                    "type": "SendContent"
                                },
                                "validationFailures": [
                                    {
                                        "property": "data",
                                        "details": "The data is too large ",
                                        "failureCode": 12004,
                                        "failureKey": "CustomDataTooLong",
                                        "notification": notification
                                    }
                                ],
                                "failureReason": "ValidationFailure"
                            });                
                        });
                    }
                    resultHandler(syncResult);
                }
            });
		}catch(e){
			_instance.donkyLogging.errorLog("caught exception in sendContentNotifications() : " + e );
		}
    };


/**
 * Creates a content notification from a list of users, the type and the data.
 * @memberof DonkyCore 
 * @param {String|String[]} users - The users(s) to send to (string or array of strings
 * @param {String} customType - The custom type
 * @param {Object} data - The data to send
 * @returns {Object} the client notification.
 */    
    DonkyCore.prototype.createContentNotificationForSpecifiedUsers = function(users, customType, data) {
        try {

            var notification = {
                audience: {
                    type: "SpecifiedUsers",
                    users: []
                },
                content: {
                    type: "Custom",
                    customType: customType,
                    data: data
                },
                filters: []
            };

            if (_instance._isArray(users)) {
                _instance._each(users, function(index, user) {
                    notification.audience.users.push({ "userId": user });
                });            
            } else {
                notification.audience.users.push({ "userId": users });
            }

            return notification;

        }catch(e){
			_instance.donkyLogging.errorLog("caught exception in formatContentNotification() : " + e );
            return null;
        }
    };

    /** 
     * Adds client notifications to the queue for submission to the network.
     * @memberof DonkyCore
     * @param {(ClientNotification|ClientNotification[])} notifications
     */
    DonkyCore.prototype.queueClientNotifications = function(notifications) {
         try{
            _instance.donkyLogging.infoLog("queueClientNotification: " + JSON.stringify(notifications));

            var clientNotifications = _instance.donkyData.get("PendingClientNotifications");

            if(clientNotifications === null || clientNotifications === undefined){
                clientNotifications = [];
            }

            if (_instance._isArray(notifications)) {
                _instance._each(notifications, function(index, notification) {
                    clientNotifications.push(notification);
                });
            } else {
                clientNotifications.push(notifications);
            }
        
            _instance.donkyData.set("PendingClientNotifications", clientNotifications);
		}catch(e){
			_instance.donkyLogging.errorLog("caught exception in queueClientNotifications() : " + e );
		}
    };

    /** 
     * Compare two dictionaries.
     * @param {Object} dictionary1 
     * @param {Object} dictionary2
     * @returns {Boolean} returns true if objects are the same, false if they differ.
     */
    DonkyCore.prototype._compareDictionaries = function(dictionary1, dictionary2) {

        var same = true;

        if (dictionary1 === undefined && dictionary2 === undefined) {
            // both undefined so "the same"
        }
        else if (dictionary1 !== undefined && dictionary2 !== undefined) {
        
            if (Object.keys(dictionary1).length == Object.keys(dictionary2).length) {
                _instance._each(dictionary1, function(key, value) {
                    if (value != dictionary2[key]) {
                        same = false;
                    }
                    // break out of loop once we spotted diff
                    return same;
                });
            } else {
                // different number of properties
                same = false;
            }
        }else if (dictionary1 !== undefined || dictionary2 !== undefined) {
            // one of then is not undefined so different
            same = false;
        }

        return same;
    };

    /** 
     * Checks to see whether the current module info differs from what network has.
     */
    DonkyCore.prototype._updateClientInfoIfChanged = function (){
        var client = _instance.donkyAccount._getClient();

        // can't really be null
        if (client !== null && client !== undefined) {

            if (!_instance._compareDictionaries(client.moduleVersions, _instance._moduleVersions)) {

                _instance.donkyLogging.debugLog("moduleVersions different - updating network ...");
                client.moduleVersions = _instance._moduleVersions;
                client.currentLocalTime = new Date().toISOString();

                _instance.donkyAccount._updateClient(client, function(result) {
                    if (result.succeeded) {
                        _instance.donkyLogging.debugLog("moduleVersions succesfully updated");
                    }
                    else {
                        _instance.donkyLogging.errorLog("Failed to update moduleVersions");
                    }
                });
            }
        }
    };

    /* Compares passed in UserDetails object with currently stored one.
     * @returns {Boolean} - True is returned if they are different and False otherwise 
     */
    DonkyCore.prototype._hasUserDetailsChanged = function(userDetails) {

        var registrationDetails = _instance.donkyAccount.getRegistrationDetails();

        return ( userDetails.id != registrationDetails.userDetails.id ||
                 userDetails.displayName != registrationDetails.userDetails.displayName ||
                 userDetails.firstName != registrationDetails.userDetails.firstName ||
                 userDetails.lastName != registrationDetails.userDetails.lastName ||
                 userDetails.emailAddress != registrationDetails.userDetails.emailAddress ||
                 userDetails.countryCode != registrationDetails.userDetails.countryCode ||
                 userDetails.phoneNumber != registrationDetails.userDetails.phoneNumber || 
                 !_instance._compareDictionaries(userDetails.additionalProperties,registrationDetails.userDetails.additionalProperties));
    };

    /* Compares passed in DeviceDetails object with currently stored one.
     * @returns {Boolean} - True is returned if they are differen' and False otherwise 
     */
    DonkyCore.prototype._hasDeviceDetailsChanged = function(deviceDetails) {

        var registrationDetails = _instance.donkyAccount.getRegistrationDetails();

        return (deviceDetails.type != registrationDetails.deviceDetails.type ||
                 deviceDetails.name != registrationDetails.deviceDetails.name ||
                !_instance._compareDictionaries(deviceDetails.additionalProperties,registrationDetails.deviceDetails.additionalProperties));
    };
    
    /** 
     * Checks the userDetails and device details passed in to the public initialise method and updates network if there are any changes.
     * 
     * @param {Object} settings
     * @param {UserDetails} settings.userDetails - User details to use for the registration (optional)
     * @param {DeviceDetails} settings.deviceDetails - Device details to use for the registration (optional)
     * @param {Callback} settings.resultHandler - The callback to invoke when the SDK is initialised. Registration errors will be fed back through this.
     */
    DonkyCore.prototype._initialize = function(settings) {
       
        if (settings.userDetails !== undefined || 
            settings.deviceDetails !== undefined ) {

            // what needs updating ?
            var regDetailsToUpdate = {};

            if (settings.deviceDetails!== undefined && _instance._hasDeviceDetailsChanged(settings.deviceDetails)) {
                regDetailsToUpdate.deviceDetails = settings.deviceDetails;
            }

            if (settings.userDetails!== undefined && _instance._hasUserDetailsChanged(settings.userDetails)) {
                regDetailsToUpdate.userDetails = settings.userDetails;
            }

            if (regDetailsToUpdate.deviceDetails !== undefined ||
                regDetailsToUpdate.userDetails !== undefined) {

                _instance.donkyAccount.updateRegistrationDetails(regDetailsToUpdate, function(result) {
                        if (result.succeeded) {
                            _instance.publishLocalEvent({ type : "DonkyInitialised", data: {} });
                            settings.resultHandler(result);
                        }else{
                            if( result.statusCode === 400 ){
                                var userTaken = result.response.filter(function(elem){
                                    return elem.failureKey === "UserIdAlreadyTaken";
                                });
                                
                                if(userTaken.length === 1){
                                    console.log("UserIdAlreadyTaken");                                     
                                    _instance.donkyAccount._register(settings, function(result){
                                        if (result.succeeded) {
                                            _instance.publishLocalEvent({ type : "DonkyInitialised", data: {} });
                                        }else{
                                            initStatus = initStatuses.failed;
                                        }                                        
                                        settings.resultHandler(result);
                                    });
                                }
                            }else{
                                initStatus = initStatuses.failed;
                                settings.resultHandler(result);
                            }
                        } 
                        
                    });
        
            } else {
                // don't need to do anything ...
                _instance.publishLocalEvent({ type : "DonkyInitialised", data: {} });
                settings.resultHandler({succeeded : true});
            }

        } else {
            _instance.publishLocalEvent({ type : "DonkyInitialised", data: {} });
            settings.resultHandler({succeeded : true});
        }    
    };

    /** 
    * This operation should ensure the SDK is active, and that the device is registered on the network with the correct API key and able to send/receive data.
    * This should also ensure that the registered module details are passed to the network if changed.
    * @memberof DonkyCore
    * @param {Object} settings
    * @param {string} settings.apiKey - The Client API key for the app space
    * @param {UserDetails} settings.userDetails - User details to use for the registration (optional)
    * @param {DeviceDetails} settings.deviceDetails - Device details to use for the registration (optional)
    * @param {String} settings.appVersion - The app version as specified by the integrator (optional)
    * @param {Callback} settings.resultHandler - The callback to invoke when the SDK is initialised. Registration errors will be fed back through this.
    */
    DonkyCore.prototype.initialise = function(settings) {
        // try {
            var message;
            
            // Settings specified ?
            if (settings === undefined || settings === null) {                
                throw new Error("no options specified");
            }

            // ResultHandler specified ?
            if (!_instance._isFunction(settings.resultHandler)) {
                _instance.donkyLogging.warnLog("No ResultHandler specified");
                throw new Error("resultHandler not specified");
            }
            
            if(initStatus === initStatuses.initialising){
                message = "initialise() called twice";
                _instance.donkyLogging.warnLog(message);
                return(settings.resultHandler({succeeded : false, response: message}));                
            }
                      
            var browserInfo = _instance.donkyAccount._getBrowserInfo();
            
            if(browserInfo.name === "MSIE" && browserInfo.version < 10){
                message = "Unsupported version of IE: " + browserInfo.version + " (must be >=10)";
                _instance.donkyLogging.warnLog(message);
                return(settings.resultHandler({succeeded : false, response: message}));
            }               

            // ApiKey specified ?
            if (settings.apiKey === undefined) {
                message = "No apiKey specified";
                _instance.donkyLogging.warnLog(message);
                return(settings.resultHandler({succeeded : false, response: message}));
            }

            initStatus = initStatuses.initialising;

            // Different API key ?
            var currentKey = _instance.donkyData.get("apiKey");

            if (currentKey !== null && currentKey !== settings.apiKey) {
                // remove this and isRegistered() will return false;
                _instance.donkyData.remove("networkId");
            }

            // internal for testing
            if (settings.useSignalR === false) {
                _instance.donkyNetwork._useSignalR(false);
            } else {
                _instance.donkyNetwork._useSignalR(true);
            }

            _instance.donkyData.set("apiKey", settings.apiKey);

            // to allow usage against dev (internal)
            _instance.donkyData.set("environment", settings.environment !== undefined ? settings.environment : "");

            _instance.donkyData.set("scheme", settings.scheme !== undefined ? settings.scheme : "https://");
        
            if (!_instance.donkyAccount.isRegistered()) {
                // A brand new user ...
                _instance.donkyAccount._register(settings, function(result) {
                    if (result.succeeded) {
                        _instance.publishLocalEvent({ type : "DonkyInitialised", data: {} });
                    }else{
                        initStatus = initStatuses.failed;
                    }
                    settings.resultHandler(result);            
                });

            } else {
                _instance.donkyAccount._checkToken(function(result) {
                    if (result.succeeded) {
                        _instance._initialize(settings);
                    } else {
                        settings.resultHandler(result);            
                    }
                }, 
                true );
            }
		//}catch(e){
		//	_instance.donkyLogging.errorLog("caught exception in initialise() : " + e );
        //    if (settings!== undefined && _instance._isFunction(settings.resultHandler)) {
        //        settings.resultHandler({succeeded : false});
        //    }
		//}
    };

/**
 * Private method that actually processes the subscription
 */
    function _subscribe(moduleDefinition, subscriptions, subscriberArray, autoAcknowledge) {

        // if autoAcknowledge is undefined we will set it to true, otherwise we set to whatever it is set to

        if (_instance._isArray(subscriptions)) {
		    _instance._each(subscriptions, function(index, subscription) {
		        subscription.autoAcknowledge = autoAcknowledge === undefined ? true : autoAcknowledge;
		        subscriberArray.push(subscription);                
            });

        } else {
            subscriptions.autoAcknowledge = autoAcknowledge === undefined ? true : autoAcknowledge;
            subscriberArray.push(subscriptions);
        }  

        _instance.registerModule(moduleDefinition);              
    }


/**
 * Private method that actually processes the unsubscription
 */
    function _unsubscribe(moduleDefinition, subscriptions, subscriberArray) {

        var _subscriptions = _instance._isArray(subscriptions) ? subscriptions  : [subscriptions];

        _instance._each(_subscriptions, function(index, subscription) {
        
            for (var i = subscriberArray.length - 1; i >= 0; i--) {
                var subscriber = subscriberArray[i];

                if (subscriber.notificationType === subscription.notificationType && 
                    (subscriber.handler === subscription.handler || subscriber.batchHandler === subscription.batchHandler)) { 
                    //eventSubscribers.splice(i, 1);
                    subscriber.removed = true;
                }
            }
        });
    }

/**
 * Adds a subscription for specific types of Donky notification.  Should be called before Initialise to avoid a race condition resulting in missed notifications.
 * @memberof DonkyCore
 * @param {ModuleDefinition}  moduleDefinition - The module details
 * @param {(Subscription|Subscription[])} subscriptions - The subscriptions to register for this module. ( Object  or an array of {@link Subscription} objects.
 * @param {Boolean}  autoAcknowledge - Specifies whether the core should send a NOTIFYACK for this notification type.
 */
    DonkyCore.prototype.subscribeToDonkyNotifications = function (moduleDefinition, subscriptions, autoAcknowledge) {  
        try {
            _subscribe(moduleDefinition, subscriptions, donkyNotificationSubscribers, autoAcknowledge);
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in subscribeToDonkyNotifications() : " + e );
		}    
    };

/**
 * Adds a subscription for specific types of Donky notification.  Should be called before Initialise to avoid a race condition resulting in missed notifications.
 * @memberof DonkyCore
 * @param {ModuleDefinition} moduleDefinition - The module details
 * @param {(Subscription|Subscription[])} subscriptions - The subscriptions to register for this module ( Object  or an array of {@link Subscription} objects.
 */
    DonkyCore.prototype.subscribeToContentNotifications = function (moduleDefinition, subscriptions){
        try {
            _subscribe(moduleDefinition, subscriptions, customNotificationSubscribers);
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in subscribeToContentNotifications() : " + e );
		}    
    };

/**
 * Removes a subscription for specific types of Donky notification.
 * @memberof DonkyCore
 * @param {ModuleDefinition} moduleDefinition - The module details
 * @param {(Subscription|Subscription[])} subscriptions - The subscriptions to unregister for this module ( Object  or an array of {@link Subscription} objects.
 */
    DonkyCore.prototype.unsubscribeFromContentNotifications = function(moduleDefinition, subscriptions) {  
        try {
            _unsubscribe(moduleDefinition, subscriptions, customNotificationSubscribers);            
        }catch(e){
			 _instance.donkyLogging.errorLog("caught exception in unsubscribeFromContentNotifications() : " + e );
		}            
    };

/**
 * Removes a subscription for specific types of Donky notification.
 * @memberof DonkyCore
 * @param {ModuleDefinition} moduleDefinition - The module details
 * @param {(Subscription|Subscription[])} subscriptions - The subscriptions to unregister for this module ( Object  or an array of {@link Subscription} objects.
 */
    DonkyCore.prototype.unsubscribeFromDonkyNotifications = function(moduleDefinition, subscriptions) {  
        try {
            _unsubscribe(moduleDefinition, subscriptions, donkyNotificationSubscribers);            
        }catch(e){
			 _instance.donkyLogging.errorLog("caught exception in unsubscribeFromDonkyNotifications() : " + e );
		}            
    };

/**
 * Subscribes to outbound client notifications.  Callbacks are made during the Synchronise flow. 
 * Note: batch mode subscription not supported for this method.
 * @memberof DonkyCore
 * @param {ModuleDefinition} moduleDefinition - The module details
 * @param {(Subscription|Subscription[])} subscriptions - The subscriptions to register for this module ( Object  or an array of {@link Subscription} objects.
 */
    DonkyCore.prototype.subscribeToOutboundNotifications = function (moduleDefinition, subscriptions){
        try {
            if (_instance._isArray(subscriptions)) {
		        _instance._each(subscriptions, function(index, subscription) {
		            outboundNotificationSubscribers.push(subscription);                
                });
            } else {
                outboundNotificationSubscribers.push(subscriptions);
            }  

            _instance.registerModule(moduleDefinition);  
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in subscribeToOutboundNotifications() : " + e );
		}    
    };

/**
 * Removes a subscription for specific types of Donky notification.
 * @memberof DonkyCore
 * @param {ModuleDefinition} moduleDefinition - The module details
 * @param {(Subscription|Subscription[])} subscriptions - The subscriptions to unregister for this module ( Object  or an array of {@link Subscription} objects.
 */
    DonkyCore.prototype.unsubscribeFromOutboundNotifications = function(moduleDefinition, subscriptions) {  
        try {
            _unsubscribe(moduleDefinition, subscriptions, outboundNotificationSubscribers);
        }catch(e){
			 _instance.donkyLogging.errorLog("caught exception in unsubscribeFromOutboundNotifications() : " + e );
		}            
    };

/**
 * Publishes a LocalEvent.
 * @memberof DonkyCore
 * @param {LocalEvent} event
 */    
    DonkyCore.prototype.publishLocalEvent = function(event) {
        try {
            var handled = false;
            // Iterate through all the subscriptions
		    _instance._each(eventSubscribers, function(subscriberIndex, subscriber) {
		        // iterate through the types for a match
                if (subscriber.eventType == event.type && subscriber.removed !== true) {
                    // call the handler
                    try {
                        subscriber.handler(event);
                        handled = true;
                    } catch(e) {
                        _instance.donkyLogging.warnLog("caught exception in local event handler() : " + e );
                    }
                }
            });

            if (!handled) {
                //_instance.donkyLogging.warnLog("Event \"" + JSON.stringify(event) + "\" not handled");
            }
		}catch(e){
			 _instance.donkyLogging.warnLog("caught exception in publishLocalEvent() : " + e );
		}    
    };

/**
 * Subscribes the caller to a local event type.
 *  @memberof DonkyCore
 *  @param {String} eventType - the type of event to subscribe to
 *  @param {Callback} handler - the callback
 */    
    DonkyCore.prototype.subscribeToLocalEvent = function (eventType, handler){    
        try {
            eventSubscribers.push({eventType: eventType, handler: handler});
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in subscribeToLocalEvent() : " + e );
		}    
    };

/**
 * Removes a subscription for a local event type.
 * @memberof DonkyCore
 *  @param {String} eventType - the type of event to subscribe to
 *  @param {Callback} handler - the callback
 */    
    DonkyCore.prototype.unsubscribeFromLocalEvent = function(eventType, handler) {
        try {
            var removed = false;
            for (var i = eventSubscribers.length - 1; i >= 0; i--) {
                var subscriber = eventSubscribers[i];
                if (subscriber.eventType === eventType && 
                    subscriber.handler === handler) { 
                    //eventSubscribers.splice(i, 1);
                    subscriber.removed = true;
                    removed = true;
                    _instance.donkyLogging.debugLog("unsubscribeToEvent() succeeded");    
                }
            }

            if (!removed) {
                _instance.donkyLogging.warnLog("unsubscribeToEvent() failed");    
            }
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in unsubscribeFromLocalEvent() : " + e );
		}    
    };

/**
 * Given a Donky assetId, this function formats a url that can be used to access the asset.
 *  @memberof DonkyCore
 *  @param {String} assetId
 *  @returns {String} formatted url of the asset
 */    
    DonkyCore.prototype.formatAssetUrl =  function(assetId){
        try {
            var configuration = _instance.donkyData.get("configuration");
            return configuration.configurationItems.AssetDownloadUrlFormat.replace("{0}", assetId);
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in formatAssetUrl() : " + e );
            return null;
        }    
    };

    /**
     * Formats asset download url that can be used to access the asset
     * @memberof DonkyCore
     *  @param {String} assetId
     *  @param {String} name
     *  @returns {String} formatted url of the asset
     */
    DonkyCore.prototype.formatAssetDownloadUrl = function(assetId, name) {
        try {
            var configuration = _instance.donkyData.get("configuration");
            var url = configuration.configurationItems.AssetDownloadNamedFileUrlFormat.replace("{0}", assetId);
            return url.replace("{1}", name);
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in formatAssetDownloadUrl() : " + e );
            return null;
        }    
    };

/**
 *  The Core SDK will act as a Service Provider, allowing modules to register ‘services’ that other modules can consume.  
 *  This is largely to enable other Donky modules to interoperate.
 *  Only a single instance of any given type can be tracked.  This will replace any previously registered instances of the given type.
 *  @memberof DonkyCore
 *  @param {String} type
 *  @param {Object} instance
 */    
    DonkyCore.prototype.registerService = function(type, instance) {
        try {
            if (registeredServices[type] !== undefined) {
                _instance.donkyLogging.warnLog("registerService(" + type + ") - overwriting an existing instance");
            } else {
                _instance.donkyLogging.debugLog("registerService(" + type + ")");
            }

            registeredServices[type] = instance;
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in registerService() : " + e );
        }    
    };

/**
 *  Gets a reference to a registered service.
 *  @memberof DonkyCore
 *  @param {String} type
 *  @returns {Object}
 */    
    DonkyCore.prototype.getService = function(type) {
        try {
            if (registeredServices[type] !== undefined) {

                _instance.donkyLogging.debugLog("getService(" + type + ")");
                return registeredServices[type];
            } else {
                _instance.donkyLogging.debugLog("getService(" + type + ") - service not available");
                return null;
            }
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in getService() : " + e );
             return null;
        }    
    };

/**
 *  Unregisters a service.
 *  @memberof DonkyCore
 *  @param {String} type
 */    
    DonkyCore.prototype.unregisterService = function(type) {
        try {
            if (registeredServices[type] !== undefined) {
                _instance.donkyLogging.debugLog("unregisterService(" + type + ")");
                delete registeredServices[type];
            } else {
                _instance.donkyLogging.warnLog("unregisterService(" + type + ") - service not available");
            }
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in unregisterService() : " + e );
        }    
    };

    /**
     * Object to store registered modules.
     * @member {Object} 
     */
    DonkyCore.prototype._moduleVersions = {};

/**
 *  Called to register a module with the core.  Enables a module that doesn’t use any notifications to be discoverable.  Not required if notifications are being used.
 *  @memberof DonkyCore
 *  @param {ModuleDefinition} moduleDefinition - The module details
 */    
    DonkyCore.prototype.registerModule = function(moduleDefinition) {
        try {
            if (_instance._moduleVersions[moduleDefinition.name] !== undefined) {
                if (_instance._moduleVersions[moduleDefinition.name] != moduleDefinition.version) {
                    _instance._moduleVersions[moduleDefinition.name] = moduleDefinition.version;
                }
            } else {
                _instance._moduleVersions[moduleDefinition.name] = moduleDefinition.version;
            }
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in registerModule() : " + e );
        }    
    };

/**
 *  Called to register a module with the core.  Enables a module that doesn’t use any notifications to be discoverable.  Not required if notifications are being used.
 *  @memberof DonkyCore
 *  @param {String} name - The name of the module to check for
 *  @param {String} minimumVersion - The minimum version required (optional)
 *  @returns {Boolean} result - True if a matching module is registered, otherwise false
 */    
    DonkyCore.prototype.isModuleRegistered = function(name, minimumVersion) {
        try {

            var registered = false;

            if (_instance._moduleVersions[name] !== undefined) {

                if (minimumVersion === undefined) {
                    registered = true;                
                } else {
                    registered = _instance._versionCompare(minimumVersion, _instance._moduleVersions[name] ) <= 0;
                }
            }
        
            return registered;
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in isModuleRegistered() : " + e );
            return false;
        }    
    };


/**
 *  Returns details of all registered modules.
 *  @memberof DonkyCore
 *  @returns {ModuleDefinition[]} moduleDefinition - The module details
 */    
    DonkyCore.prototype.getRegisteredModules = function() {
        try {
            var modules = [];

            _instance._each(_instance._moduleVersions, function(name,version) {
                modules.push({name:name,version:version});
            });

            return modules;
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in getRegisteredModules() : " + e );
            return null;
        }    
    };

/**
 *  Uploads the current debug log to the Donky Network.
 *  @param {String} submissionReason - The reason for submitting the logfile ["AutomaticByDevice" | "ManualRequest"]
 *  @param {Callback} callback - the (optional) callback to fire upon completion
 */    
    DonkyCore.prototype._submitLog = function(submissionReason, callback) {

        var lastSubmitLogTimestamp = _instance.donkyData.get("lastSubmitLogTimestamp");
        
        // ensure we are not submitting too frequently
        if (lastSubmitLogTimestamp !== null) {
            var diff = _instance._dateDiff(new Date(lastSubmitLogTimestamp), new Date());

            if (diff.seconds < 30) {
                _instance.donkyLogging.warnLog("_submitLog() submitting too frequently");
                if (_instance._isFunction(callback)) {
                    callback({ succeeded: false });
                }
                return;
            }
        }
        
        if (_instance.donkyAccount.isRegistered() &&
            !_instance.donkyAccount._isSuspended()) {
            // submit log is a secure method so if not registered don't attempt
            var currentLog = _instance.donkyLogging.getLog();

            // if we send up an empty log we get a validation error ...
            if (currentLog !== "") {
                _instance.donkyNetwork.ajax(
                    {
                        data: currentLog,
                        submissionReason: submissionReason
                    },
                    "POST",
                    _instance.donkyNetwork.api.secure,
                    "debuglog",
                    function(result) {

                        // _instance.donkyLogging.warnLog("_submitLog() submitting too frequently");
                        _instance.donkyData.set("lastSubmitLogTimestamp", new Date().toISOString());

                        if (result.succeeded) {
                            _instance.donkyLogging.clearLog();
                            if (!result.response.alwaysSubmitErrors) {
                                _instance.donkyLogging.debugLog("_submitLog() spamming - network has set alwaysSubmitErrors to false");
                                // we are spammng the network, change the stored config value to false
                                var configuration = _instance.donkyData.get("configuration");
                                if (configuration !== null && configuration !== undefined) {
                                    if (configuration.configurationItems !== undefined) {
                                        configuration.configurationItems.AlwaysSubmitErrors = "false";
                                        _instance.donkyData.set("configuration", configuration);
                                        _instance.donkyLogging.debugLog("updated alwaysSubmitErrors to false");
                                    }
                                }
                            }

                            if (_instance._isFunction(callback)) {
                                callback(result);
                            }
                        }
                    });
            } else {
                if (_instance._isFunction(callback)) {
                    callback({ succeeded: true });
                }
            }
        } else {
            if (_instance._isFunction(callback)) {
                callback({ succeeded: false });
            }
        }

    };

/**
 *  Uploads the current debug log to the Donky Network.
 *  @memberof DonkyCore
 *  @param {Callback} callback - the (optional) callback to fire upon completion
 */    
    DonkyCore.prototype.submitLog = function(callback) {
        try {
            _instance._submitLog("ManualRequest", callback);
		}catch(e){
			 _instance.donkyLogging.errorLog("caught exception in submitLog() : " + e );
        }    
    };
        
/**
 *  Export the root inatallation folder to any other modules that need to refernce any other static files part of the release. 
 */    
    DonkyCore.prototype.installDir = installDir;

/**
 *  Returns the version of this module.
 *  @returns {Object}
 */    
    DonkyCore.prototype.version = function() {
        return "2.2.1.0";
    };
    
    /** 
     * Internal function to perform equivalent to jQuery.extend
     * @param {obj} the object to test
     * @returns {Object} - The extended object
     */
    DonkyCore.prototype._extend = function (){
        for(var i=1; i<arguments.length; i++)
            for(var key in arguments[i])
                if(arguments[i].hasOwnProperty(key))
                    arguments[0][key] = arguments[i][key];
        return arguments[0];
    };

    /** 
     * Internal function to determine whether argument is a function
     * @param {obj} the object to test
     * @returns {Boolean} - True if a function
     */
    DonkyCore.prototype._isFunction = function(obj) {
        var getType = {};
        return obj && getType.toString.call(obj) === '[object Function]';
    };

    /** 
     * Internal function to determine whether argument is an array
     * @param {obj} the object to test
     * @returns {Boolean} - True if an array
     */
    DonkyCore.prototype._isArray = function( obj ) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };

    /** 
     * Execute a callback for every element in the matched set.
     * @param {Object} obj - The object to iterate over - can be array or object
     * @param {callback} callback - The callback to execute
     * @returns {Object} - the object
     */
	DonkyCore.prototype._each = function( obj, callback) {
		var value,
			i = 0,
			length = obj.length,
			isArray = _instance._isArray( obj );

			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}

		return obj;
	};


    /** 
     * Internal function to create a 'guid'
     * @returns {String}
     */
    DonkyCore.prototype._uuid = function() {
        var u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
            function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

        return u;
    };

    return DonkyCore;
})();


(function () {
	var factory = function () {
	    return new DonkyCore();
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyCore', ['donkyData', 'donkyAccount', 'donkyLogging', 'donkyNetwork'], factory);
	} else {
		/*jshint sub:true */
		window.donkyCore = factory();
	}

}());

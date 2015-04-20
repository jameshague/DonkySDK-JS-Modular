/*!
 * DonkyAccount JavaScript Library v1.0.0.0
 *
 * Copyright (C) Dynmark. All rights reserved.
 *
 */

/**
 * DonkyAccount module.
 * @namespace DonkyAccount
 */
var DonkyAccount = (function() {
    "use strict";

    // Our "private" instance
    var _instance,

    // instance of donkyCore
    donkyCore = null;

    var defaults = {
        tokenExpiryCheckInterval: 10000
    };

    /*
     * Creates donkyAccount object.
     * @constructor
     */
    function DonkyAccount(options) {

        // If it's being called again, return the singleton instance
        if (typeof _instance != "undefined") return _instance;

        if (options === undefined || options === null) {
            throw new Error("no options specified");
        }

        if (options.donkyCore === undefined) {
            throw new Error("donkyCore not specified");
        }

        donkyCore = options.donkyCore;

        // Keep a closured reference to the instance
        _instance = this;

        setInterval(function() { _instance._checkToken(function() {}); }, defaults.tokenExpiryCheckInterval);

        return _instance;
    };

    /** 
     * This function parses out the browser name and version from the userAgent string.
     *
     * @returns {String} - returns the browser info 
     */
    DonkyAccount.prototype._getBrowserInfo = function() {
        var ua = navigator.userAgent,
            tem,
            M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return 'IE ' + (tem[1] || '');
        }
        if (M[1] === 'Chrome') {
            tem = ua.match(/\bOPR\/(\d+)/);
            if (tem != null) return 'Opera ' + tem[1];
        }
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
        return M.join(' ');
    }

    /** 
     * This function checks the expiry of the REST API authentication token and refreshes it if it has expired.
     * A token with less than a minute left will be deemed to be expired so we update it prior to expiry.
     *
     * @param {Callback} callback - function to call after refresh or immediately if token is valid 
     * @param {Boolean} initializing - Boolean to differentiate between when we are initializing the sdk or when we are just checking (optional)
     */
    DonkyAccount.prototype._checkToken = function(callback, initializing) {

        if (!_instance._isSuspended() || initializing === true) {
            var accessDetails = donkyCore.donkyData.get("accessDetails");

            if (accessDetails !== null && accessDetails !== undefined) {

                var expiresOn = new Date(accessDetails.expiresOn);
                var now = new Date();
                var refresh = false;
                if (expiresOn > now) {
                    var timeDiffMs = Math.abs(now.getTime() - expiresOn.getTime());
                    var diffSeconds = Math.ceil(timeDiffMs / 1000);
                    if (diffSeconds < 60) {
                        refresh = true;
                    }
                    donkyCore.donkyLogging.debugLog("Token expires in " + diffSeconds + " seconds" + (refresh ? " (refreshing)" : ""));
                } else {
                    donkyCore.donkyLogging.debugLog("Token expired");
                    refresh = true;
                }

                if (refresh) {
                    this._refreshToken(callback);
                } else {
                    callback({ succeeded: true });
                }
            } else {
                donkyCore.donkyLogging.warnLog("no accessDetails to check");
                callback({ succeeded: true });
            }
        } else {
            callback({succeeded: false});
        }
    }

    /*
     * Get a new auth token via REST api
     *
     * @param {Callback} callback - function to call after asynchronous call returns
     */
    DonkyAccount.prototype._refreshToken = function(callback) {

        if (!donkyCore._isFunction(callback)) {
            throw new Error("resultHandler not supplied");
        }

        var restart = false;

        var signalrState = donkyCore.donkyNetwork._getSignalRState();

	    if (signalrState == donkyCore.donkyNetwork.signalrStatuses.initializing || 
            signalrState == donkyCore.donkyNetwork.signalrStatuses.starting ||
            signalrState == donkyCore.donkyNetwork.signalrStatuses.started) {
            donkyCore.donkyNetwork._stopSignalR();
            restart = true;
        }

        var gettokenRequest = {
            "networkId": donkyCore.donkyData.get("networkId"),
            "deviceSecret": donkyCore.donkyData.get("secret"),
            "operatingSystem": "Web",
            "sdkVersion": donkyCore.version()
        };

        donkyCore.donkyNetwork.ajax(
            gettokenRequest,
            "POST",
            donkyCore.donkyNetwork.api.anonymous,
            "authentication/gettoken",
            function(result) {
                if (result.succeeded) {
                    donkyCore.donkyLogging.debugLog("Succesfully refreshed authorization token");
                    // server config returned with token
                    donkyCore.donkyData.set("configuration", result.response.configuration);
                    delete result.response["configuration"];
                    // just store access dets
                    donkyCore.donkyData.set("accessDetails", result.response);
                    
                    donkyCore.donkyData.remove("isSuspended");

                    if (restart) {
                        donkyCore.donkyNetwork._startSignalR();
                    }

                    callback({ succeeded: true });
                } else {
                    donkyCore.donkyLogging.warnLog("Failed to  refresh authorization token");                    
                    if (result.statusCode === 401) {
                        donkyCore.donkyLogging.warnLog("Can't refresh token - have I been deleted ?");

                        var settings = _instance.getRegistrationDetails();

                        _instance._register(settings, function(registerResult) {
                    
                            if (restart) {
                                donkyCore.donkyNetwork._startSignalR();
                            }
                        
                            callback(registerResult);
                        });

                    }else if(result.statusCode === 403){
                        donkyCore.donkyLogging.warnLog("Can't refresh token - have been suspended");
                        donkyCore.donkyData.set("isSuspended", true);
                    }

                    // a 401 will re-register and we don't want callback firing twice
                    if (result.statusCode !== 401) {
                        callback({ succeeded: false, result: result });
                    }
                }
            });
    }

/**
 *  Returns the DeviceId - if it hasn't been created yet, a new one is created.
 *  @returns {String}
 */
    DonkyAccount.prototype._getDeviceId = function() {

        var deviceId = donkyCore.donkyData.get("deviceId");
        if (deviceId === null) {
            deviceId = donkyCore._uuid();
            donkyCore.donkyData.set("deviceId", deviceId);
            // might as well create the secret while we are here ...
            donkyCore.donkyData.set("secret", donkyCore._uuid());
        }

        return deviceId;
    }

    /** This operation will return the current status of the SDK.
     * @returns {Boolean} - Indicates whether the SDK has a valid registration of not.
     */
    DonkyAccount.prototype.isRegistered = function() {
		try{
            return donkyCore.donkyData.get("networkId") !== null;
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in isRegistered() : " + e );
		    return false;
		}
    }

    function extendDeviceDetails(deviceDetails) {
        var extra = {
            // these are private
            id: _instance._getDeviceId(),
            secret: donkyCore.donkyData.get("secret"),
            // these are read-only
            operatingSystem: "Web",
            operatingSystemVersion: navigator.userAgent,
            model: _instance._getBrowserInfo()
        };

        return donkyCore._extend(deviceDetails, extra);
    }

    /** 
    * This does the actual registration.
    *
    * @param {Object} settings
    * @param {UserDetails} settings.userDetails - User details to use for the registration
    * @param {DeviceDetails} settings.deviceDetails - Device details to use for the registration
    * @param {String} settings.appVersion - The app version as specified by the integrator (optional)
    * @param {callback} callback - The callback to invoke when the SDK is initialised. Registration errors will be fed back through this.
    */
    DonkyAccount.prototype._register = function(settings, callback) {

        if (!donkyCore._isFunction(callback)) {
            throw new Error("resultHandler not supplied");
        }

        if (settings.deviceDetails === undefined) {
            settings.deviceDetails = {};
        }

        var registrationRequest = {
            device: settings.deviceDetails,
            user: settings.userDetails,
            client: {
                sdkVersion: donkyCore.version(),
                moduleVersions: donkyCore._moduleVersions,
                appVersion: settings.appVersion,
                currentLocalTime: new Date().toISOString()
            }
        };

        extendDeviceDetails(registrationRequest.device);

        donkyCore.donkyLogging.debugLog(JSON.stringify(registrationRequest));

        donkyCore.donkyNetwork.ajax(
            registrationRequest,
            "POST", /*POST creates, PUT updates and this one is anonymous anyway */
            donkyCore.donkyNetwork.api.anonymous,
            "registration",
            function(result) {

                if (result.succeeded) {
                   
                    donkyCore.donkyData.set("networkId", result.response.networkId);

                    // server config returned with token
                    donkyCore.donkyData.set("configuration", result.response.accessDetails.configuration);
                    delete result.response.accessDetails["configuration"];

                    donkyCore.donkyData.set("accessDetails", result.response.accessDetails);

                    // was that anonymous ? 
                    var currentUser = registrationRequest.user !== undefined ? registrationRequest.user : { id: result.response.userId };
                    currentUser.isAnonymous = registrationRequest.user === undefined;

                    if (currentUser.displayName === undefined) {
                        currentUser.displayName = result.response.userId;
                    }

                    // dont want these going to the client
                    delete registrationRequest.device["id"];
                    delete registrationRequest.device["secret"];

                    donkyCore.donkyData.set("userDetails", currentUser);
                    donkyCore.donkyData.set("deviceDetails", registrationRequest.device);
                    donkyCore.donkyData.set("clientDetails", registrationRequest.client);

                    donkyCore.publishLocalEvent({ 
                        type : "RegistrationChanged", 
                        data: {
                            userDetails: currentUser,
                            deviceDetails: registrationRequest.device
                        } 
                    });
                }
                callback(result);
            });

    }

    /** 
     * Gets the current local registration details including any device and user specifics.
     * 
     * @returns {Object} RegistrationDetails -  The current local registration details.
     * @returns {UserDetails} RegistrationDetails.userDetails - The User Details.
     * @returns {DeviceDetails} RegistrationDetails.deviceDetails - The Device Details.
     */
    DonkyAccount.prototype.getRegistrationDetails = function() {
		try{
            return {
                userDetails: donkyCore.donkyData.get("userDetails"),
                deviceDetails: donkyCore.donkyData.get("deviceDetails")
            };
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in getRegistrationDetails() : " + e );
		    return null;
		}
    }

    /** 
     * Gets the current local device details (Creates a new one if not already present).
     * @returns {DeviceDetails} - The current local device details.
     */
    DonkyAccount.prototype.getDevice = function() {
        try{
            var deviceDetails = donkyCore.donkyData.get("deviceDetails");

            if (deviceDetails == null) {
                deviceDetails = {
                    operatingSystem: "Web",
                    operatingSystemVersion: navigator.userAgent,
                    model: _instance._getBrowserInfo()
                };
            }

            return deviceDetails;
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in getDevice() : " + e );
		    return null;
		}

    }

    /** 
     * Gets the current local client details.
     * @returns {ClientDetails} - The current local client details.
     */
    DonkyAccount.prototype._getClient = function() {
        return donkyCore.donkyData.get("clientDetails");
    }


    /**
     * Allows callers to update any custom data related to the registration
     *
     * @param {Object} settings
     * @param {UserDetails} settings.userDetails - User details to be updated (optional)
     * @param {DeviceDetails} settings.deviceDetails - Device details to be updated (optional)
     * @param {Callback} resultHandler - The callback to invoke when the command has executed. Registration errors will be fed back through this.
     */
    DonkyAccount.prototype.updateRegistrationDetails = function(settings, resultHandler) {
        try{
            if (!donkyCore._isFunction(resultHandler)) {
                throw new Error("callback not supplied");
            }

            if (settings === undefined || settings === null) {
                throw new Error("settings not supplied");
            }

            // Update both
            if (settings.userDetails !== undefined &&
                settings.deviceDetails !== undefined) {
                _instance._updateRegistrationDetails(settings, resultHandler);
            }
            // Update user dets
            else if (settings.userDetails !== undefined) {
                _instance.updateUserDetails(settings.userDetails, resultHandler);
            }
            // Update device dets
            else if (settings.deviceDetails !== undefined) {
                _instance.updateDeviceDetails(settings.deviceDetails, resultHandler);
            } else {
                throw new Error("neither userDetails or deviceDetails specified - must specify at least 1");
            }

		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in updateRegistrationDetails() : " + e );
		}
    }

    /**
     * Replaces the current registration with new details.  This will remove the existing registration details and create a new registration (not update the existing one).
     *
     * @param {Object} settings
     * @param {UserDetails} settings.userDetails - User details to be updated (optional)
     * @param {DeviceDetails} settings.deviceDetails - Device details to be updated (optional)
     * @param {Callback} resultHandler - The callback to invoke when the command has executed. Registration errors will be fed back through this.
     */
    DonkyAccount.prototype.replaceRegistration = function(settings, resultHandler) {
        try{
            // need to clear out any pending notifications prior to registering a different user
            donkyCore.donkyNetwork.synchronise(function() {
                // No need to restart signalR as is internally handled on receipt of the NewRegistration local event that is raised ...
                _instance._register(settings, function(result) {
                    resultHandler(result);
                });        
            });
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in replaceRegistration() : " + e );
		}
    }

    /**
     * Allows callers to update UserDetails
     *
     * @param {Object} settings
     * @param {UserDetails} settings.userDetails - User details to be updated
     * @param {DeviceDetails} settings.deviceDetails - Device details to be updated
     * @param {Callback} resultHandler - The callback to invoke when the command has executed. Registration errors will be fed back through this.
     */
    DonkyAccount.prototype._updateRegistrationDetails = function(settings, callback) {

        var args = {
            // This method seems to have a different signature ...
            user: settings.userDetails,
            device: settings.deviceDetails
        };

        extendDeviceDetails(args.device);

        donkyCore.donkyNetwork.ajax(
            args, 
            "PUT", /*PUT updates, POST creates*/
            donkyCore.donkyNetwork.api.secure,
            "registration",
            function(result) {
                if(result.succeeded) {                    
                    donkyCore.donkyData.set("userDetails", args.user );     

                    // dont want these going to the client
                    delete args.device["id"];
                    delete args.device["secret"];

                    donkyCore.donkyData.set("deviceDetails", args.device );                                   
                } 
                callback(result);
            });    
    }

    /**
     * Allows callers to update UserDetails
     *
     * @param {UserDetails} userDetails - User details to be updated
     * @param {Callback} resultHandler - The callback to invoke when the command has executed. Registration errors will be fed back through this.
     */
    DonkyAccount.prototype.updateUserDetails = function( userDetails, callback )
    {
		try{

            if (userDetails === undefined) {
                throw new Error("userDetails not supplied");
            }

            if (!donkyCore._isFunction(callback)) {
                throw new Error("callback not supplied");
            }

            donkyCore.donkyNetwork.ajax(
                userDetails, 
                "PUT", 
                donkyCore.donkyNetwork.api.secure,
                "registration/user",
                function(result) {
                    if(result.succeeded) {                    
                        donkyCore.donkyData.set("userDetails", userDetails );                    
                    } 
                    callback(result);
                });
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in updateUserDetails() : " + e );
		}
    }

    /**
     * Allows callers to update DeviceDetails
     *
     * @param {Object} settings
     * @param {DeviceDetails} .deviceDetails - Device details to be updated (optional)
     * @param {Callback} resultHandler - The callback to invoke when the command has executed. Registration errors will be fed back through this.
     */
    DonkyAccount.prototype.updateDeviceDetails = function( deviceDetails, callback )
    {
        try{
        if (deviceDetails === undefined) {
            throw new Error("deviceDetails not supplied");
        }

        if (!donkyCore._isFunction(callback)) {
            throw new Error("callback not supplied");
        }

        extendDeviceDetails(deviceDetails);

        donkyCore.donkyNetwork.ajax(
            deviceDetails, 
            "PUT", 
            donkyCore.donkyNetwork.api.secure,
            "registration/device",
            function(result) {
                if(result.succeeded) {            
                    
                    // dont want these going to the client
                    delete deviceDetails["id"];
                    delete deviceDetails["secret"];

                    donkyCore.donkyData.set("deviceDetails", deviceDetails );                    
                } 
                callback(result);
            });
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in updateDeviceDetails() : " + e );
		}
    }

    /**
     * Allows callers to update ClientDetails
     *
     * @param {ClientDetails} clientDetails - Device details to be updated (optional)
     * @param {Callback} resultHandler - The callback to invoke when the command has executed.
     */
    DonkyAccount.prototype._updateClient = function( clientDetails, callback )
    {
		try{

            if (!donkyCore._isFunction(callback)) {
                throw new Error("callback not supplied");
            }

            donkyCore.donkyNetwork.ajax(
                clientDetails, 
                "PUT", 
                donkyCore.donkyNetwork.api.secure,
                "registration/client",
                function(result) {
                    if(result.succeeded) {
                        donkyCore.donkyData.set("clientDetails", clientDetails );
                    } 
                    callback(result);
                });
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in _updateClient() : " + e );
		}
    }
    /**
     * This operation will return whether the User has been suspended.
     *
     *  @returns {Boolean} result - True if user is suspenede, otherwise false
     */
    DonkyAccount.prototype._isSuspended = function() {
        var isSuspended = donkyCore.donkyData.get("isSuspended");

        return isSuspended !== null ? isSuspended : false;
    }

/**
 *  Gets the tags for the current user.
 *  @param {Callback} - callback to supply returned Array of TagOption objects
 */    
    DonkyAccount.prototype.getTags = function(callback) {
		try{

            if (!donkyCore._isFunction(callback)) {
                throw new Error("callback not supplied");
            }

        donkyCore.donkyNetwork.ajax(
            null,
            "GET",
            donkyCore.donkyNetwork.api.secure,
            "registration/user/tags",
            function(result) {
                callback(result);
            });  
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in getTags() : " + e );
		}
            
    }

/**
 *  Sets the selected tags for the current user.
 *  @param {String[]} tags - The selected tags.
 *  @param {Callback} - callback to supply result
 */    
    DonkyAccount.prototype.putTags = function(selectedTags, callback) {
		try{

            if (!donkyCore._isFunction(callback)) {
                throw new Error("callback not supplied");
            }

        donkyCore.donkyNetwork.ajax(
            selectedTags,
            "PUT",
            donkyCore.donkyNetwork.api.secure,
            "registration/user/tags",
            function(result) {
                callback(result);
            });    
		}catch(e){
			donkyCore.donkyLogging.errorLog("caught exception in putTags() : " + e );
		}
    
    }



    // Return the constructor
    return DonkyAccount;
})();

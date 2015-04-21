/*!
 * DonkCoreAnalytics JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

		var donkyCoreAnalytics;

		// Helpers -----------
		//====================
		
        var sessionTimeout = 30;

       /* Private Utility class
        */
        var _util = {
            /**
             * Function to format a timestamp in milliseconds into an ISOString with the milliseconds part set to zero.             
             * @param {Number} milli - the date in milliseconds past Epoch
             * @returns {String} the formatted date (ISOString)
             */
            formatDate: function(milli) {
                var date = new Date(milli);
                date.setMilliseconds(0);
                return date.toISOString();
            },
            /**
             * Function to set a cookie.             
             * @param {String} cname - the name
             * @param {String} cvalue - the value
             * @param {Number} exminutes - the expiry in minutes
             */
            setCookie: function(cname, cvalue, exminutes) {
                var d = new Date();
                d.setTime(d.getTime() + (exminutes * 60 * 1000));
                var expires = "expires=" + d.toUTCString();
                document.cookie = cname + "=" + cvalue + "; " + expires;
            },
            /**
             * Function to get a cookie.             
             * @param {String} cname - the name
             * @returns {String} the cookie value
             */
            getCookie: function(cname) {
                var name = cname + "=";
                var ca = document.cookie.split(';');
                for (var i = 0; i < ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ') c = c.substring(1);
                    if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
                }
                return null;
            }
        };

		// donkyCoreAnalytics
		//====================

		/**
		 * @class
		 * @name DonkyCoreAnalytics
		 */
		function DonkyCoreAnalytics() {
            console.log("Constructing DonkyCoreAnalytics");

            // This event is ALWAYS published on succesful initialisation - hook into it and run our analysis ...
            donkyCore.subscribeToLocalEvent("DonkyInitialised", function(event) {
                donkyCoreAnalytics.analyse();
            });

            // Store the session end time on page unload
            $( window ).unload(function() {
                donkyCore.donkyData.set("SessionEndTime", new Date().valueOf());
	        });	

		}

		DonkyCoreAnalytics.prototype = {

            /**
             *  Run the analytics.
             *  This employs the use of a cookie with a rolling expiry of sessionTimeout. Every page reload will update the cookie.
             *  If the cookie isnt there (a new session) we send an AllLaunch and possibly an AppSession client notification.
             *  On window.reload, we set a SessionEndTime which will be used to populate the AppSession notification. 
             *  The AppSession notification is referring to the PREVIOUS session.
             */    
            analyse : function() {
    
                // Can't set cookies on filesystem
		        if (window.location.protocol != "file:") {
		        
		            var cookie = _util.getCookie("appLaunch");

		            if (cookie == null) {
		                var queued = 0;
                        _util.setCookie("appLaunch", "yes", sessionTimeout );
		                donkyCore.donkyLogging.debugLog("new session");

		                var lastSessionStartTime = donkyCore.donkyData.get("SessionStartTime");
                        var lastSessionEndTime = donkyCore.donkyData.get("SessionEndTime");

		                if (lastSessionStartTime != null) {

		                    // notify donky 
		                    var sessionClientNotification = {
		                        Type: "AppSession",
		                        "startTimeUtc": _util.formatDate(lastSessionStartTime),
		                        "endTimeUtc": _util.formatDate(lastSessionEndTime),
		                        "operatingSystem": "Web",
		                        "sessionTrigger": "None"
		                    };

		                    //donkyCore.donkyLogging.debugLog(JSON.stringify(sessionClientNotification));
		                    donkyCore.queueClientNotifications(sessionClientNotification);
		                    queued++;

		                    donkyCore.donkyData.set("SessionStartTime", new Date().valueOf());
		                } else {
		                    donkyCore.donkyData.set("SessionStartTime", new Date().valueOf());
                        }

		                // notify donky 
		                var launchClientNotification = {
		                    Type: "AppLaunch",
		                    "launchTimeUtc": _util.formatDate(new Date().valueOf()),
		                    "operatingSystem": "Web",
		                    "sessionTrigger" : "None"
		                };

                        // donkyCore.donkyLogging.debugLog(JSON.stringify(launchClientNotification));
		                donkyCore.queueClientNotifications(launchClientNotification);
                        queued++;

		                if (queued > 0) {
                            // Queuing and syncing rather than sending in case we are in a sync call already
                            donkyCore.donkyNetwork.synchronise();
                        }

		            } else {
		                donkyCore.donkyLogging.debugLog("existing session");        
                        // roll expiration on a bit
                        _util.setCookie("appLaunch", "yes", sessionTimeout );
                    }
                }
            }
		};

		// "static" instance
		donkyCoreAnalytics = new DonkyCoreAnalytics();

		return donkyCoreAnalytics;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyCoreAnalytics', ['donkyCore'], function(donkyCore) {
            return factory(donkyCore);
        });
	} else {
		/*jshint sub:true */
		window['donkyCoreAnalytics'] = factory(window.donkyCore);
	}

}());

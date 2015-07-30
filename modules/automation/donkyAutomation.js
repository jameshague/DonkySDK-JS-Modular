/*!
 * DonkAutomation JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

		var donkyAutomation;

		// Helpers -----------
		//====================
		

		// donkyAutomation
		//====================

		/**
		 * @class DonkyAutomation
		 */
		function DonkyAutomation() {
            donkyCore.donkyLogging.infoLog("Constructing DonkyAutomation");
		}

        /**
         *  @memberof DonkyAutomation 
         */
		DonkyAutomation.prototype = {
            /**
             *  Execute Third Party Triger.
             *  @param {String} triggerKey - The key of the 3rd Party Trigger to execute
             *  @param {Object} customData - Custom Data supplied by the application implementing the SDK
             */    
            executeThirdPartyTrigger : function(triggerKey, customData) {

                donkyCore.queueClientNotifications({
                    type: "ExecuteThirdPartyTriggers",
                    triggerKey: triggerKey,
                    timestamp: new Date().toISOString(),
                    tiggerActionsExecuted: [],
                    customData: customData
                });

                // Queuing and syncing rather than sending in case we are in a sync call already
                donkyCore.donkyNetwork.synchronise();
            }
		};

		// "static" instance
		donkyAutomation = new DonkyAutomation();

		return donkyAutomation;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyAutomation', ['donkyCore'], function(donkyCore) {
            return factory(donkyCore);
        });
	}  else {		
		window.donkyAutomation = factory(window.donkyCore);
	}

}());

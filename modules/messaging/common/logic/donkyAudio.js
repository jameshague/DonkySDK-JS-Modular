/*!
 * DonkyAudio JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyMessagingCommon) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyMessagingCommon === undefined) {
	        throw new Error("Missing donkyMessagingCommon");
	    }

		var donkyAudio;

	    // Helpers -----------
		//====================
		

		// donkyAudio
		//====================
	
		/**
		 * 
		 */
		var audioMap = {
		};
		


		/**
		 * @class DonkyAudio
		 */
		function DonkyAudio() {
		    donkyCore.donkyLogging.infoLog("Constructing DonkyAudio");
		}

        /**
         *  @memberof DonkyAudio 
         */
		DonkyAudio.prototype = {

            /**
             * Function to play a sound.
             * @param {Number} messageType - the message type
			 * @param {String} audioFileUrl - the url of the audio file 
             */
            setSound: function(messageType, audioFileUrl) { 
				try {
		            audioMap[messageType] = new Audio( audioFileUrl );			
		        } catch (e) {
					audioMap[messageType] = null;
				}				
            },
            /**
             * Function to play a sound.
             * @param {Number} messageType - the message type
             */
            playSound: function(messageType) {
				if(audioMap[messageType] !== undefined && audioMap[messageType] !== null){
					try {
						audioMap[messageType].play();
					} catch (e) {}					
				} 
            }
		};

		// "static" instance
		donkyAudio = new DonkyAudio();
		
        // make this available to other modules via the service mechanism
        donkyCore.registerService("donkyAudio", donkyAudio);        
		
		return donkyAudio;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyAudio', ['donkyCore', 'donkyMessagingCommon'], function(donkyCore, donkyMessagingCommon) {
		    return factory(donkyCore, donkyMessagingCommon);
		});
	} else {
		window.donkyAudio = factory(window.donkyCore, window.donkyMessagingCommon);
	}

}());


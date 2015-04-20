/*!
 * DonkyPushLogic JavaScript Library
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


		var donkyPushLogic;

		/**
		 * Helper object to perform management functions  
		 */
	    var _pushMessageManager = {
			/**
			 * Function to load all the current push notifications and return to the caller.
			 * @returns {Object[]} - returns array of push notifications
			 */
		    load: function(){
			    var pushMessages = donkyCore.donkyData.get("pushMessages");	
			    if(pushMessages == null){
				    pushMessages = [];
			    }
			    return pushMessages;
		    },
			/**
			 * Function to save all the current push notifications.
			 * @param {Object[]} pushMessages - array of push notifications to save.
			 */
		    save: function(pushMessages){
			    donkyCore.donkyData.set("pushMessages", pushMessages);
		    },
			/**
			 * Function to add a new push notification to the message store. The current store is checked incase this is a duplicate prior to storing.
			 * @param {Object} pushMessage - the message to add.
			 * @returns {Boolean} - returns true if message saved, false if was a duplicate.
			 */
		    add: function(pushMessage){
            
			    var pushMessages = this.load();
			
			    donkyCore.donkyLogging.debugLog("_pushMessageManager.add(" +JSON.stringify(pushMessage) + ") : currentMessageCount = " + pushMessages.length);
			
			    // find it, 
			    var index = this.findId(pushMessages, pushMessage.id);

			    if(index == -1){
				    pushMessages.push(pushMessage);
				    this.save(pushMessages);
                    return true;
			    }else{
                    donkyCore.donkyLogging.warnLog("Already got this push Message: " + pushMessage.id);
                    return false;
                }			
		    },
			/**
			 * Function to remove a push message from the message store.
			 * @param {String} id - the message id to remove
			 */ 
		    remove: function(id){
            
                donkyCore.donkyLogging.debugLog("_pushMessageManager.remove(" + id + ")");

			    var pushMessages = this.load();
			    // find it, 
			    var index = this.findId(pushMessages, id);

		        if (index !== -1) {
		            // remove from array
                    donkyCore.donkyLogging.debugLog("Removing ... " + pushMessages.length);
		            pushMessages.splice(index, 1);
                    donkyCore.donkyLogging.debugLog("Removed ..."  + pushMessages.length);
		            this.save(pushMessages);
		        } else {
                    donkyCore.donkyLogging.warnLog("Failed to find push Message");
		        }
		    },
			/**
			 * Function to find a message and return it.
			 * @param {String} id - the message id
			 * @returns {Object} returns the message or null if not found.
			 */
		    findObj: function(id){
			    var pushMessages = this.load();
			    var messsage = null;
			    $.each(pushMessages, function(index,item){
                
				    if(item.id == id){
					    messsage = item;
				    }
				    return messsage === null;
			    });
			    return messsage;		
		    },
			/**
			 * Function to find a message and return it's index in the message array.
			 * @param {Object[]} pushMessages - the messages to search through
			 * @param {String} id - the message id
			 * @returns {Number} returns the message index or -1 if not found.
			 */
		    findId: function(pushMessages, id){
			    var found = -1;
			    $.each(pushMessages, function(index,item){
				    if(item.id == id){
					    found = index;
					    donkyCore.donkyLogging.infoLog("Found message in position " + index);
				    }
				    return found == -1;
			    });
			    return found;
		    },
			/**
			 * Function to retrieve the next message in the message store. Also a displayed timestamp is set if not already present.
			 * @returns {Object} - the message
			 */
		    getNext: function(){
			    var pushMessages = this.load();
			    if( pushMessages.length > 0 ){
				    var message = pushMessages[0];
				    // TODO: where to set this
                    if(message.displayed === undefined){
                        message.displayed = new Date().valueOf();
					    this.save(pushMessages);
                    }
				    return message;				
			    }else{
				    return null;
			    }		
		    },
			/**
			 * Function to iterate through the message store and delete any expired messages.
			 */
            removeExpiredMessages: function() {
			    var pushMessages = this.load();
                var deletedCount = 0;
                for (var i = pushMessages.length - 1; i >= 0; i--) {
                    if( donkyMessagingCommon.isExpired(pushMessages[i].data.expiryTimeStamp )){
                        donkyCore.donkyLogging.infoLog("messageId " + pushMessages[i].data.messageId + " is expired, deleting");
                        pushMessages.splice(i, 1);
                        deletedCount++;
                    }
                }
                if (deletedCount > 0) {
                    this.save(pushMessages);
                }            
            }
	    };


		/**
		 * Function to process the SimplePushMessage server notification. If message not expired, add to the message store and publish a local event which ui plugin listens for.
		 * @param {Object} the push notification
		 */
        function processPush (notification) {
        
		    var expired = donkyMessagingCommon.isExpired(notification.data.expiryTimestamp);

            if (!expired) {                
                if (_pushMessageManager.add(notification)) {
                    donkyCore.publishLocalEvent({ type: "NewSimplePushMessagesReceived", data: {} });
                }
            } else {
                donkyCore.donkyLogging.debugLog("Received expired message, binning off ...");
            }

            donkyMessagingCommon.markMessageReceived(notification, expired);
        }


		// donkyPushLogic
		//====================

		/**
		 * @constructor
		 */
		function DonkyPushLogic() {

            // purge any old messages
            _pushMessageManager.removeExpiredMessages();

            // wire in the subscription to SimplePushMessage
            donkyCore.subscribeToDonkyNotifications(
                {
                    name: "DonkyPushLogic",
                    version: "1.0.0.0",
                },
                { 
                    notificationType: "SimplePushMessage",             
                    handler: processPush
                },
                true);
		}

		DonkyPushLogic.prototype = {

            /**
	         *  Get the next simple push message
             *  
	         */
	        getNextSimplePush : function() {
		
                try{
                    return  _pushMessageManager.getNext();
		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in getNextSimplePush() : " + e );
		        }

		        return null;
	        },

	        /**
	         *  Get the next simple push message
             *  
	         */
            setSimplePushResult : function(id, buttonText) {

                var pushMessage = _pushMessageManager.findObj(id);

                if (pushMessage != null) {

                    // remove 			
                    _pushMessageManager.remove(id);

                    var data = pushMessage.data;

                    if (buttonText != "") {
                        var webButtonSet = {};

                        $.each(data.buttonSets, function(index, buttonSet) {
                            if (buttonSet.platform == "Web") {
                                webButtonSet = buttonSet;
                            }
                        });
                /*
			        ButtonDescription : Combined text for all displayed buttons in button order. 
                    E.g for two buttons "Yes" and "No" the value would be "YesNo". 
                    If no buttons are displayed then empty string should be returned.
			        UserAction	: Button1|Button2|Dismissed  :  NOTE not all clients can detect dismissals 
                    so only some clients will ever return a UserAction of dismissed. 
		        */
                        var buttonDescription = "";
                        var userAction = "Button1";

                        switch (webButtonSet.interactionType) {
                            case "OneButton":
                                buttonDescription = webButtonSet.buttonSetActions[0].label;
                                break;
                            case "TwoButton":
                                buttonDescription = webButtonSet.buttonSetActions[0].Label + "|" + webButtonSet.buttonSetActions[1].label;
                                if (buttonText == webButtonSet.buttonSetActions[1].label) {
                                    userAction = "Button2";
                                }
                                break;
                        }

                        var displayedTime = new Date(pushMessage.displayed);
                        var now = new Date();

                        var dif = now.getTime() - displayedTime.getTime();

                        var Seconds_from_T1_to_T2 = Math.floor(dif / 1000);

                        // notify donky 
                        var clientNotification = {
                            type: "InteractionResult",

                            senderInternalUserId: data.senderInternalUserId,
                            messageId: data.messageId,
                            senderMessageId: data.senderMessageId,
                            timeToInteractionSeconds: Seconds_from_T1_to_T2,
                            interactionTimestamp: new Date().toISOString(),
                            interactionType: webButtonSet.interactionType,
                            buttonDescription: buttonDescription,
                            userAction: userAction,
                            operatingSystem: "Web",
                            messageSentTimestamp: data.msgSentTimeStamp,
                            contextItems: data.contextItems };

                        donkyCore.queueClientNotifications(clientNotification);

                    }
                } else {
                    donkyCore.donkyLogging.warnLog( "setSimplePushResult(" + id + ", " + buttonText + ") - Coundn't find message in store");
                }
            },

            /**
	         * Get counts of all messages
             *  
	         */
            getMessageCount : function() {
                
                try{

                    var pushMessages = _pushMessageManager.load();

                    return pushMessages.length;

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in getMessageCounts() : " + e );
		        }

                return null;
            }
		};

		// "static" instance
		donkyPushLogic = new DonkyPushLogic();

		return donkyPushLogic;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyPushLogic', ['donkyCore', 'donkyMessagingCommon'], function(donkyCore, donkyMessagingCommon) {
            return factory(donkyCore, donkyMessagingCommon);
        });
	} else {
		/*jshint sub:true */
		window['donkyPushLogic'] = factory(window.donkyCore, window.donkyMessagingCommon);
	}

}());


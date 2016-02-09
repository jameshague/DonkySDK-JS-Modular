/*!
 * DonkyPushLogic JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyMessagingCommon, Mustache) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyMessagingCommon === undefined) {
	        throw new Error("Missing donkyMessagingCommon");
	    }


		var donkyPushLogic;
                        
        var defaults = { 
        };
        
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
			    if(pushMessages === null){
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
			 * Function to remove ALL the current push notifications.
			 */
            removeAll: function(){
			    donkyCore.donkyData.remove("pushMessages");
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
		            pushMessages.splice(index, 1);
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
			    donkyCore._each(pushMessages, function(index,item){
                
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
			    donkyCore._each(pushMessages, function(index,item){
				    if(item.id == id){
					    found = index;
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
            },
			/**
			 * Function to iterate through the message store and delete messages with matching the creator field.
			 */
            removeMessagesByCreator: function(creator) {
			    var pushMessages = this.load();
                var deletedCount = 0;
                for (var i = pushMessages.length - 1; i >= 0; i--) {
                    // true push messages don't have this field
                    if( pushMessages[i].creator !== undefined && pushMessages[i].creator === creator){
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
        function processPushMessages (notifications) {
        
            var newMessages = [];
            
            donkyCore._each(notifications, function(index, notification){
    		    var expired = donkyMessagingCommon.isExpired(notification.data.expiryTimeStamp);
    
                if (!expired) {                
                    if (_pushMessageManager.add(notification)) {
                        newMessages.push(notification);
                    }
                } else {
                    donkyCore.donkyLogging.debugLog("Received expired message, binning off ...");
                }
                
                // Don't process dummy messages
                if(notification.data.senderInternalUserId !== undefined){
                    donkyMessagingCommon.markMessageReceived(notification, expired);    
                }                           
            });
            
            if(newMessages.length > 0){
                donkyCore.publishLocalEvent({ type: "NewSimplePushMessagesReceived", data: newMessages });
            }                        
        }


		// donkyPushLogic
		//====================





		/**
		 * @class DonkyPushLogic
		 */
		function DonkyPushLogic() {

            // purge any old messages
            _pushMessageManager.removeExpiredMessages();

            // wire in the subscription to SimplePushMessage
            donkyCore.subscribeToDonkyNotifications(
                {
                    name: "DonkyPushLogic",
                    version: "2.1.0.0",
                },
                { 
                    notificationType: "SimplePushMessage",             
                    batchHandler: processPushMessages
                },
                false);
                
            // this event is published from _register()
            donkyCore.subscribeToLocalEvent("RegistrationChanged", function(event) {
                _pushMessageManager.removeAll();
            });        
                                      
		}

        /**
         *  @memberof DonkyPushLogic 
         */
		DonkyPushLogic.prototype = {
            /**
	         *  Get the next simple push message
             *  @returns {PushMessage} - the simple push message. 
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
	         *  Deletes the message (used for dummy messages)
             *  @param {String} id - The message id
	         */
            deleteMessage : function(id){
                _pushMessageManager.remove(id);
            },
	        /**
	         *  Queue the client notification "InteractionResult" based on which button has been pressed
             *  @param {String} id - The message id
             *  @param {String} buttonText - The button text 
	         */
            setSimplePushResult : function(id, buttonText) {

                var pushMessage = _pushMessageManager.findObj(id);

                if (pushMessage !== null) {

                    // remove 			
                    _pushMessageManager.remove(id);

                    var data = pushMessage.data;

                    // only report button clicks (ButtonA, ButtonB) - if dismissed don't report anything
                    // dummy messages that don't come from donky have a creator property - ignore these

                    if (buttonText !== "" && (pushMessage.creator === undefined || pushMessage.creator === null)) {
                        var webButtonSet = {};

                        donkyCore._each(data.buttonSets, function(index, buttonSet) {
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
                                buttonDescription = webButtonSet.buttonSetActions[0].label + "|" + webButtonSet.buttonSetActions[1].label;
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
                            contextItems: data.contextItems 
                        };

                        donkyCore.queueClientNotifications(clientNotification);
                        
                        donkyCore.donkyNetwork.synchronise();
                    }
                } else {
                    donkyCore.donkyLogging.warnLog( "setSimplePushResult(" + id + ", " + buttonText + ") - Coundn't find message in store");
                }
            },

            /**
	         * Get counts of all messages
             * @returns {Number} - the message count.  
	         */
            getMessageCount : function() {
                
                try{

                    var pushMessages = _pushMessageManager.load();

                    return pushMessages.length;

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in getMessageCounts() : " + e );
		        }

                return null;
            },
            /**
             * Function to process the raw server notification nand extract the button set info in a consumable fashion
             * @param  {Object} notification - the server notifications to 
             * @returns {Object[]} - returns array of button objects
             */
            getInteractiveButtons : function(notification){
                var message = notification.data;
                
                var buttons = [];

                if (donkyCore._isArray(message.buttonSets) && message.buttonSets.length > 0) {

                    donkyCore._each(message.buttonSets, function(index, buttonSet) {

                        if (buttonSet.platform == "Web") {

                            donkyCore._each(buttonSet.buttonSetActions, function(index, action) {

                                var button = {
                                    buttonText: action.label
                                };

                                switch (action.actionType) {
                                    case "Javascript":
                                        button.actionType = "Javascript";
                                        if( action.data !== null){
                                            button.linkURL = action.data;
                                        }
                                        break;
                                   
                                   case "Dismiss":
                                        button.actionType = "Dismiss";
                                        break;
                                        
                                    default:
                                        button.actionType = "Link";
                                        if (action.data !== null) {
                                            button.linkURL = action.data;
                                        }
                                        break;
                                }

                                buttons.push(button);
                            });
                        }
                    });
                }

                return buttons;                
            },            
            /**
	         * Deletes push messages by creator field. Some push messages don't originate from donky network - they are created on-the-fly.
             * i.e. a popup to tell the user that there is a new rich mesage available. These messages have a creator property added to them so we can filter them out if necessary.
             * If we want to remove all of these we can use this method.
             * 
             * @param{String} creator - the creator of the pseudo push message (newRichMessages, newDeviceWarning etc...)
	         */
            deleteMessagesByCreator : function(creator){
                _pushMessageManager.removeMessagesByCreator(creator);
            },
            /**
             * Function to queue a custom popup with a custom action.
             * Whether to show based on config and if a silentNotification should be checked outside of this. 
             * Also what to display and what the action is is de-scoped from this method.
             *
            * @param {String} creator - the creator label to apply (can delete all messages with the same label)
            * @param {String} title - the message title         
            * @param {String} body - the message body         
            * @param {String} expiry - the message expiry timestamp  
            * @param {String} actionButtonA - the action to execute when Button A is clicked.
            * @param {String} actionButtonB - the action to execute when Button B is clicked.
            * @param {String} textButtonA - the text to display on the ok button
            * @param {String} textButtonB - the text to display on the dismiss button
            */
            queueCustomPopup : function(creator, title, body, expiry, actionButtonA, actionButtonB, textButtonA, textButtonB){

                var dummy = {
                    creator: creator,
                    id: donkyCore._uuid(),
                    type: "SimplePushMessage",
                    data: {
                        messageType: "SimplePush",
                        avatarAssetId: null,
                        buttonSets: [],
                        senderDisplayName: title,
                        body: body,
                        expiryTimeStamp: expiry
                    },
                    "createdOn": new Date().toISOString()
                };
                
                if(actionButtonA !== undefined){
                    dummy.data.buttonSets = [{
                            buttonSetId: null,
                            platform: "Web",
                            interactionType: "TwoButton",
                            buttonSetActions: [{
                                actionType: "Javascript",
                                data: actionButtonA !== null ? btoa(actionButtonA) : null,
                                label: textButtonA
                            },{
                                /*Javascript*/
                                actionType: "Javascript",
                                /*code to execute*/
                                data: actionButtonB !== null ? btoa(actionButtonB) : null,
                                label: textButtonB
                            }]
                        }];
                }

                processPushMessages([dummy]); 
            }            
		};

		// "static" instance
		donkyPushLogic = new DonkyPushLogic();
        
        // make this available to other modules via the service mechanism
        donkyCore.registerService("donkyPushLogic", donkyPushLogic);        

		return donkyPushLogic;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyPushLogic', ['donkyCore', 'donkyMessagingCommon', 'Mustache'], function(donkyCore, donkyMessagingCommon, Mustache) {
            return factory(donkyCore, donkyMessagingCommon, Mustache);
        });
	} else {
		/*jshint sub:true */
		window['donkyPushLogic'] = factory(window.donkyCore, window.donkyMessagingCommon, window.Mustache);
	}

}());


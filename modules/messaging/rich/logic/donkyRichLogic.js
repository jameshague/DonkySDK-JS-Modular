/*!
 * DonkyRichLogic JavaScript Library
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


		var donkyRichLogic;

        var defaults = { 
          richMessageAvailabilityDays : 30
        };


		/**
		 * Helper object to perform management functions  
		 */
	    var _richMessageManager = {
			/**
			 * Function to load all the current rich messages and return to the caller.
			 * @returns {Object[]} - returns array of rich messages
			 */		
		    load: function(){
			    var richMessages = donkyCore.donkyData.get("richMessages");	
			    if(richMessages == null){
				    richMessages = [];
			    }
			    return richMessages;
		    },
			/**
			 * Function to save all the current rich messages.
			 * @param {Object[]} richMessages - array of rich messages to save.
			 */			
		    save: function(richMessages){
			    donkyCore.donkyData.set("richMessages", richMessages);
		    },
			/**
			 * Function to add a new rich message to the message store. The current store is checked incase this is a duplicate prior to storing.
			 * @param {Object} richMessage - the message to add.
			 * @returns {Boolean} - returns true if message saved, false if was a duplicate.
			 */			
		    add: function(richMessage){
            
			    var richMessages = this.load();
			
			    donkyCore.donkyLogging.debugLog("_richMessageManager.add(" +JSON.stringify(richMessage) + ") : currentMessageCount = " + richMessages.length);
			
			    // find it, TODO: how to index ?
			    var index = this.findId(richMessages, richMessage.messageId);

			    if(index == -1){
				    richMessages.push(richMessage);
				    this.save(richMessages);
                    return true;
			    }else{
                    donkyCore.donkyLogging.warnLog("Already got this rich Message: " + richMessage.messageId);
                    return false;
                }			
		    },
			/**
			 * Function to remove a rich message from the message store.
			 * @param {String} messageId - the message id to remove
			 */ 			
		    remove: function(messageId){
            
                donkyCore.donkyLogging.debugLog("_richMessageManager.remove(" + messageId + ")");

			    var richMessages = this.load();
			    // find it, 
			    var index = this.findId(richMessages, messageId);

		        if (index !== -1) {
		            // remove from array
                    donkyCore.donkyLogging.debugLog("Removing ... " + richMessages.length);
		            richMessages.splice(index, 1);
                    donkyCore.donkyLogging.debugLog("Removed ..."  + richMessages.length);
		            this.save(richMessages);
		        } else {
                    donkyCore.donkyLogging.warnLog("Failed to find rich Message");
		        }
		    },
			/**
			 * Function to find a message and return it.
			 * @param {String} messageId - the message id
			 * @returns {Object} returns the message or null if not found.
			 */			
		    findObj: function(messageId){
			    var richMessages = this.load();
			    var messsage = null;
			    $.each(richMessages, function(index,item){
                
				    if(item.messageId == messageId){
					    messsage = item;
				    }
				    return messsage === null;
			    });
			    return messsage;		
		    },
			/**
			 * Function to find a message and return it's index in the message array.		
			 * @param {Object[]} richMessages - the messages to search through
			 * @param {String} messageId - the message id
			 * @returns {Number} returns the message index or -1 if not found.
			 */			
		    findId: function(richMessages, messageId){
			    var found = -1;
			    $.each(richMessages, function(index,item){
				    if(item.messageId == messageId){
					    found = index;
					    donkyCore.donkyLogging.infoLog("Found message in position " + index);
				    }
				    return found == -1;
			    });
			    return found;
		    },
			/**
			 * Function to internally mark the message as read
			 * @param {String} messageId - the message id
			 */
            markAsRead: function(messageId) {
                var richMessages = this.load();
                var index = this.findId(richMessages, messageId);
                if (index !== -1) {
                    richMessages[index].isRead = true;
                    this.save(richMessages);
                }
            },
			/**
			 * Function to retrieve the nect unread message.
			 * @returns {Object} the next unread message (or null)
			 */
		    getNextUnread: function(){
			    var richMessages = this.load();
			    if( richMessages.length > 0 ){
			        for (var i = 0; i < richMessages.length; i++) {
			            if (!richMessages[i].isRead) {
			                return richMessages[i];
			            }
			        }
				    return null;				
			    }else{
				    return null;
			    }		
		    },
			/**
			 * Function to determine whether a message has expired.
			 * Note rich messages have 2 concepts of expiry:
			 * 1) They are only valid for defaults.richMessageAvailabilityDays
			 * 2) They can also have an expiry date less than this and an expired message (for say a time critical offer)
			 * @returns {Boolean} - true if expired, false otherwise
			 */			
            isExpired: function(message) {
                var expired = false;

                // If message has an expiryTimestamp but no expiredBody we need to use this as expiry rather than richMessageAvailabilityDays
                if (donkyMessagingCommon.isExpired(message.expiryTimestamp) && message.expiredBody === null) {
                    expired = true;
                } else {
                    var sent = new Date(message.sentTimestamp); 
                    var now = new Date();

                    var diff = donkyCore._dateDiff(sent, now);

                    if (diff !== NaN) {

                        if (diff.days > defaults.richMessageAvailabilityDays) {
                            expired = true;
                        }
                    }
                }

                return expired;
            },
			/**
			 * Function to iterate through all the stored messages removing all expired ones (using defaults.richMessageAvailabilityDays) 
			 */
            removeExpiredMessages: function() {
			    var richMessages = this.load();
                var deletedCount = 0;
                for (var i = richMessages.length - 1; i >= 0; i--) {
                    if (this.isExpired(richMessages[i])) { 
                        donkyCore.donkyLogging.infoLog("messageId " + richMessages[i].messageId + " is expired, deleting");
                        richMessages.splice(i, 1);
                        deletedCount++;
                    }
                }
                if (deletedCount > 0) {
                    this.save(richMessages);
                }
            }
	    };

		/**
		 * Function to process the RichMessage server notification. If message not expired, add to the message store and publish a local event which ui plugin listens for.
		 * @param {Object} the rich message
		 */
	    function processRichMessage(notification) {
            var data = notification.data;

            // tag this on so we can use when we send a MSGREAD client notification ...
		    data.serverNotificationId = notification.id;
		    // initialize this additional property
            data.isRead = false;
	        data.receevedTimestamp = new Date().toISOString();

            var recievedExpired = _richMessageManager.isExpired(data);

		    if(!recievedExpired){

		        if (_richMessageManager.add(data)) {
                    donkyCore.publishLocalEvent({ type : "NewRichMessagesReceived", data: {} });
		        }                                
            }

            donkyMessagingCommon.markMessageReceived(notification, recievedExpired);
        }


        // donkyRichLogic
		//====================

		/**
		 * @class
		 * @name DonkyRichLogic
		 */
		function DonkyRichLogic() {

            var configuration = donkyCore.donkyData.get("configuration");

		    if (configuration !== null && configuration !== undefined && configuration.configurationItems !== undefined) {
		        if (typeof configuration.configurationItems.richMessageAvailabilityDays == "string") {
		            defaults.richMessageAvailabilityDays = parseInt(configuration.configurationItems.richMessageAvailabilityDays);
		        }		    
            }

            // purge any old messages
            _richMessageManager.removeExpiredMessages();

            // wire in the subscription to SIMPLEPUSHMSG
            donkyCore.subscribeToDonkyNotifications(
                {
                    name: "DonkyRichLogic",
                    version: "2.0.0.0",
                },
                { 
                    notificationType: "RichMessage",             
                    handler: processRichMessage
                },
                false);

		}

		DonkyRichLogic.prototype = {

	        /**
	         * Get message count
             * @returns {Object} object - an object containing the following properties:
             * @returns {Nunber} object.richMessageCount - The number of rich messages in the store
             * @returns {Nunber} object.unreadRichMessageCount - The number of Unread rich messages in the store.
	         */
            getMessageCount : function() {
                
                try{

                    var richMessages = _richMessageManager.load();
                    var unreadRichMessageCount = 0;

                    $.each(richMessages, function(index, richMessage) {
                        if (richMessage.isRead == false) {
                            unreadRichMessageCount++;
                        }            
                    });


                return {
                        richMessageCount: richMessages.length,
                        unreadRichMessageCount: unreadRichMessageCount,
                    };

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in getMessageCounts() : " + e );
		        }

                return null;
            },
	        /**
	         * Deletes a Rich Message
             * @param {String} messageId - the messageId to delete
	         */
            deleteRichMessage : function(messageId) {
                try{

                    donkyCore.donkyLogging.debugLog("DonkyRichLogic.deleteConversation(" + messageId + ")");

                    _richMessageManager.remove(messageId);

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in deleteRichMessage() : " + e );
		        }    
            },
	        /**
	         * Filter Rich Messages against their descriptions given a search string.
             * @param {String} filterText - the filter text to apply to the search.
             * @returns {Object[]} - an array containing rich messages matching the search.
	         */
            filterRichMessages : function(filterText) {
    
                try{
                    var messages = _richMessageManager.load();

                    var filtered = new Array();
                    $.each(messages, function(index, message) {
                        if (message.description.indexOf(filterText) != -1) {
                            filtered.push(message);
                        }
                    });

                    return filtered;

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in filterChatConversations() : " + e );
                    return null;
                }
            },
	        /**
	         * Get All Rich Messages
             * @returns {Object[]} - an array containing all rich messages.
	         */
            getAllRichMessages : function() {
                try{
                    return _richMessageManager.load();
		        }catch(e){
			        donkyCore.donkyLogging.errorLog( "caught exception in getAllRichMessages() : " + e );
		        }

                return null;    
            },
	        /**
	         * Mark Rich Message Read 
             * @param {Object} message - the message to mark as read
	         */
            markRichMessageRead : function(messageId) {
                try{

                    var message = _richMessageManager.findObj(messageId);

                    if (message !== null && !message.isRead) {                        
                        donkyMessagingCommon.markMessageRead(message);
                        _richMessageManager.markAsRead(message.messageId);
                    }

		        }catch(e){
			        donkyCore.donkyLogging.errorLog( "caught exception in markChatMessageRead() : " + e );
		        }        
            },
	        /**
	         * Get Next Rich Message - for poopup UI
             * @returns {Object} - the next rich message.
	         */
	        getNextUnreadRichMessage : function() {
		
                try{
                    return _richMessageManager.getNextUnread();
		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in getNextRichMessage() : " + e );
		        }

		        return null;
	        }
		};

		// "static" instance
		donkyRichLogic = new DonkyRichLogic();

		return donkyRichLogic;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyRichLogic', ['donkyCore', 'donkyMessagingCommon'], function(donkyCore, donkyMessagingCommon) {
            return factory(donkyCore, donkyMessagingCommon);
        });
	} else {
		/*jshint sub:true */
		window['donkyRichLogic'] = factory(window.donkyCore, window.donkyMessagingCommon);
	}

}());

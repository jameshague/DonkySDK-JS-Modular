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


		var _instance;

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
			    if(richMessages === null){
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
			 * Removes ALL messages in inbox
			 */			
		    removeAll: function(){
			    donkyCore.donkyData.remove("richMessages");
		    },            
			/**
			 * Function to add a new rich message to the message store. The current store is checked incase this is a duplicate prior to storing.
			 * @param {Object} richMessage - the message to add.
			 * @returns {Boolean} - returns true if message saved, false if was a duplicate.
			 */			
		    add: function(richMessage){
            
			    var richMessages = this.load();
			
			    donkyCore.donkyLogging.debugLog("_richMessageManager.add(" +JSON.stringify(richMessage) + ") : currentMessageCount = " + richMessages.length);
			
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
		            richMessages.splice(index, 1);
		            this.save(richMessages);
		        } else {
                    donkyCore.donkyLogging.warnLog("Failed to find rich Message");
		        }
		    },
			/**
			 * Function to remove a rich message from the message store.
			 * @param {String[]} messageIds - array of messageIds to delete ...
			 */ 			
		    removeMany: function(messageIds){
            
                donkyCore.donkyLogging.debugLog("_richMessageManager.removeMany(" + JSON.stringify( messageIds ) + ")");

			    var richMessages = this.load();
                
                var deletedCount = 0;
                var self = this;
                donkyCore._each(messageIds, function(i, messageId){
    			    // find it, 
    			    var index = self.findId(richMessages, messageId);
    		        if (index !== -1) {
    		            // remove from array
    		            richMessages.splice(index, 1);
                        deletedCount++;    		            
    		        } else {
                        donkyCore.donkyLogging.warnLog("Failed to find rich Message");
    		        }                    
                });                
                
                if(deletedCount>0){
                    this.save(richMessages);    
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
			    donkyCore._each(richMessages, function(index,item){
                
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
			    donkyCore._each(richMessages, function(index,item){
				    if(item.messageId == messageId){
					    found = index;
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
			 * Function to internally mark the message as read
			 * @param {String[]} messageIds - the message ids
			 */
            markManyAsRead: function(messageIds) {
                var markedReadCount = 0;
                var richMessages = this.load();
                var self = this;

                donkyCore._each(messageIds, function(i, messageId){
                    var index = self.findId(richMessages, messageId);
                    if (index !== -1 && richMessages[index].isRead === false) {
                        richMessages[index].isRead = true;
                        markedReadCount++;
                    }
                });                
                
                if(markedReadCount>0){
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
			 * Function to determine whether a message is unavailable.
             * @param {Object} message - THe message. 
             * @returns {Boolean} - true if expired, false otherwise 
			 */			
            isAvailable: function(message) {
                var isAvailable = true; 

                var sent = new Date(message.sentTimestamp); 
                var now = new Date();

                var diff = donkyCore._dateDiff(sent, now);

                if (!isNaN(diff)) {

                    if (diff.days > defaults.richMessageAvailabilityDays) {
                        isAvailable = false;
                    }
                }
                
                return isAvailable;
            },           
			/**
			 * Function to determine whether a message has expired.
             * @param {Object} message - THe message. 
             * @returns {Boolean} - true if expired, false otherwise 
			 */			
            isExpired: function(message) {
                var isExpired = false;
                                
                // If message has an expiryTimeStamp but no expiredBody we need to use this as expiry rather than richMessageAvailabilityDays
                if (donkyMessagingCommon.isExpired(message.expiryTimeStamp) && 
                    (message.expiredBody === null || message.expiredBody === undefined)) {
                    isExpired = true;
                }
                
                return isExpired;
            },
	        /**
	         * Retrieves the expiry as an iso date  from the message 
             * @param {Object} message - the message.
             * @returns {String} - the expiry.
	         */            
            getExpiryTimestamp: function(message){
		        if (message.expiryTimeStamp !== null && 
                    message.expiryTimeStamp !== undefined) {                
                    if(message.expiredBody === null || message.expiredBody === undefined){
                        return message.expiryTimeStamp;
                    }                
                }  

                var sent = new Date(message.sentTimestamp);
                var expiry = new Date();
                expiry.setDate( sent.getDate() + defaults.richMessageAvailabilityDays );
                
                return expiry.toISOString();                               
            },
            /**
             * Iterate through the inbox, and remove all expired messages.
             */
            removeExpiredMessages: function() {
                                
			    var richMessages = this.load();
                var deletedCount = 0;
                
                for (var i = richMessages.length - 1; i >= 0; i--) {
                    if (this.isExpired(richMessages[i]) || !this.isAvailable(richMessages[i])) { 
                        donkyCore.donkyLogging.infoLog("messageId " + richMessages[i].messageId + " is expired, deleting");
                        richMessages.splice(i, 1);
                        deletedCount++;
                    }
                }
                if (deletedCount > 0) {
                    this.save(richMessages);
                }
            },            
            /**
             * Iterate through the inbox, and remove all expired messages.
             */
            removeUnavailableMessages: function() {
                                
			    var richMessages = this.load();
                var deletedCount = 0;
                
                for (var i = richMessages.length - 1; i >= 0; i--) {
                    if (!this.isAvailable(richMessages[i])) { 
                        donkyCore.donkyLogging.infoLog("messageId " + richMessages[i].messageId + " is unavailable, deleting");
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
	    function processRichMessages(notifications) {

            var newMessages = [];
            
            donkyCore._each(notifications, function(index, notification){
                var data = notification.data;
    
                // tag this on so we can use when we send a MSGREAD client notification ...
    		    data.serverNotificationId = notification.id;
    		    // initialize this additional property
                data.isRead = false;
    	        data.receivedTimestamp = new Date().toISOString();
    
                var recievedExpired = _richMessageManager.isExpired(data);
    
                donkyMessagingCommon.markMessageReceived(notification, recievedExpired);
    
    		    if(!recievedExpired){
    
    		        if (_richMessageManager.add(data)) {
                        newMessages.push(data);                        
    		        }                                
                }
                
            });
            
            if(newMessages.length>0){
                donkyCore.publishLocalEvent({ type : "NewRichMessagesReceived", data: newMessages });
            }

        }
        
        function highlightWords( line, word ){
             var regex = new RegExp( '(' + word + ')', 'gi' );
             return line.replace( regex, "<em>$1</em>" );
        }


        /**
         * 
         */
	    function onSyncMessageDeleted(notifications) {

            var messageIds = [];
                        
            donkyCore._each(notifications, function(index, notification){
                messageIds.push(notification.data.messageId);
            });

            _richMessageManager.removeMany(messageIds);     
                        
            donkyCore.publishLocalEvent({ type : "RichMessageSyncOperation", data: {messageIds: messageIds} });    
        }
        
        /**
         * 
         */
	    function onSyncMessageRead(notifications) {
            var messageIds = [];

            donkyCore._each(notifications, function(index, notification){
                messageIds.push(notification.data.messageId);
            });
            
            _richMessageManager.markManyAsRead(messageIds);
                        
            donkyCore.publishLocalEvent({ type : "RichMessageSyncOperation", data: {messageIds: messageIds} });    
        }


        // donkyRichLogic
		//====================

		/**
		 * @class DonkyRichLogic
		 */
		function DonkyRichLogic() {

            var configuration = donkyCore.donkyData.get("configuration");

		    if (configuration !== null && configuration !== undefined && configuration.configurationItems !== undefined) {
		        if (typeof configuration.configurationItems.richMessageAvailabilityDays == "string") {
		            defaults.richMessageAvailabilityDays = parseInt(configuration.configurationItems.richMessageAvailabilityDays);
		        }		    
            }
            
            _richMessageManager.removeUnavailableMessages();

            var myModule = {
                name: "DonkyRichLogic",
                version: "2.0.1.0"
            };

            // wire in the subscription to RichMessage
            donkyCore.subscribeToDonkyNotifications(
                myModule,
                { 
                    notificationType: "RichMessage",             
                    batchHandler: processRichMessages
                },
                false);
                                
            // wire in the subscription to RichMessage
            donkyCore.subscribeToDonkyNotifications(
                myModule,
                [{ 
                    notificationType: "SyncMessageRead",             
                    batchHandler: onSyncMessageRead
                },
                { 
                    notificationType: "SyncMessageDeleted",             
                    batchHandler: onSyncMessageDeleted
                }],
                true);
                
            // this event is published from _register()
            donkyCore.subscribeToLocalEvent("RegistrationChanged", function(event) {
                _richMessageManager.removeAll();
            });                        
		}

        /**
         *  @memberof DonkyRichLogic 
         */
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

                    donkyCore._each(richMessages, function(index, richMessage) {
                        if (richMessage.isRead === false) {
                            unreadRichMessageCount++;
                        }            
                    });


                return {
                        richMessageCount: richMessages.length,
                        unreadRichMessageCount: unreadRichMessageCount
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

                    donkyCore.donkyLogging.debugLog("DonkyRichLogic.deleteRichMessage(" + messageId + ")");

                    _richMessageManager.remove(messageId);    
                    
                    donkyMessagingCommon.markMessageDeleted(messageId, true);                
                    
                    donkyCore.publishLocalEvent({ type : "RichMessageDeleted", data: {messageId: messageId} });

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in deleteRichMessage() : " + e );
		        }    
            },
	        /**
	         * Deletes a Rich Message
             * @param {String[]} messageIds - array of messageIds to delete ...
	         */
            deleteRichMessages : function(messageIds) {
                try{

                    donkyCore.donkyLogging.debugLog("DonkyRichLogic.deleteRichMessages(" + JSON.stringify( messageIds ) + ")");

                    _richMessageManager.removeMany(messageIds);
                    
                    donkyCore._each(messageIds, function(index, messageId){
                        donkyMessagingCommon.markMessageDeleted(messageId, index === messageIds.length - 1);                 
                    });
                                                            
                    donkyCore.publishLocalEvent({ type : "RichMessagesDeleted", data: {messageIds: messageIds} });

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in deleteRichMessage() : " + e );
		        }    
            },
	        /**
	         * Filter Rich Messages against their descriptions given a search string.
             * @param {String} filterText - the filter text to apply to the search.
             * @returns {RichMessage[]} - an array containing rich messages matching the search.
	         */
            filterRichMessages : function(filterText) {
    
                try{
                    var messages = _richMessageManager.load();

                    var filtered = [];
                    donkyCore._each(messages, function(index, message) {
                        if (message.description.toLowerCase().indexOf(filterText.toLowerCase()) != -1) {
                            message.description = highlightWords(message.description, filterText);
                            filtered.push(message);
                        }else if(message.senderDisplayName.toLowerCase().indexOf(filterText.toLowerCase()) != -1){
                            message.senderDisplayName = highlightWords(message.senderDisplayName, filterText);
                            filtered.push(message);
                        }
                    });

                    return filtered;

		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in filterRichMessages() : " + e );
                    return null;
                }
            },
	        /**
	         * Get All Rich Messages
             * @returns {RichMessage[]} - an array containing all rich messages.
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
             * @param {String} messageId - the messageId of the message  to mark as read
	         */
            markRichMessageRead : function(messageId) {
                try{

                    var message = _richMessageManager.findObj(messageId);

                    if (message !== null && !message.isRead) {                        
                        donkyMessagingCommon.markMessageRead(message);
                        _richMessageManager.markAsRead(message.messageId);
                        donkyCore.publishLocalEvent({ type : "RichMessageRead", data: {messageId: message.messageId} });
                    }

		        }catch(e){
			        donkyCore.donkyLogging.errorLog( "caught exception in markRichMessageRead() : " + e );
		        }        
            },
	        /**
	         * Get Next Rich Message - for poopup UI
             * @returns {RichMessage} - the next rich message.
	         */
	        getNextUnreadRichMessage : function() {
		
                try{
                    return _richMessageManager.getNextUnread();
		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in getNextRichMessage() : " + e );
		        }

		        return null;
	        },
	        /**
	         * Retrieves the Rich message from the message store specified from the messageId
             * @param {String} messageId - the messageId.
             * @returns {RichMessage} - the rich message.
	         */
    	    getRichMessage: function(messageId) {
                try{
                    return _richMessageManager.findObj(messageId);
		        }catch(e){
			        donkyCore.donkyLogging.errorLog("caught exception in getRichMessage() : " + e );
		        }

		        return null;
    	    },            
	        /**
	         * Retrieves the expiry as an iso date  from the message 
             * @param {RichMessage} message - the message.
             * @returns {String} - the expiry.
	         */
            getRichMessageExpiryTimeStamp: function(message){
                return _richMessageManager.getExpiryTimestamp(message);                                
            },
            /**
             * Function to determine whether a message has expired.
             * @param {RichMessage} message - the message.
             * @returns {Boolean} - true if he message has expired, false otherwise. 
             */
            isRichMessageAvailable: function(message){
                return _richMessageManager.isAvailable(message);
            },
            /**
             * Function to determine whether a message has expired.
             * @param {RichMessage} message - the message.
             * @returns {Boolean} - true if he message has expired, false otherwise. 
             */
            isRichMessageExpired: function(message){
                return _richMessageManager.isExpired(message);
            },            
            /**
             * Function to delete all expired messages. These include both messdages older than 30 days and messages that have a shorter expiry date and no expired content
             */            
            removeExpiredMessages: function(){
                return _richMessageManager.removeExpiredMessages();
            },
            /**
             * Function to delete all unavailable messages - these are messages that are ONLY greater than 30 days.
             */            
            removeUnavailableMessages: function(){
                return _richMessageManager.removeUnavailableMessages();
            }
                         
		};

		// "static" instance
		_instance = new DonkyRichLogic();
        
        // make this available to other modules via the service mechanism
        donkyCore.registerService("donkyRichLogic", _instance);

		return _instance;
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

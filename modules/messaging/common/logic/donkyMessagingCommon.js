/*!
 * DonkyMessagingCore JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

		var donkyMessagingCommon;

	    // Helpers -----------
		//====================
		

		// DonkyMessagingCore
		//====================

		/**
		 * @class DonkyMessagingCommon
		 */
		function DonkyMessagingCommon() {
		    console.log("Constructing DonkyMessagingCommon");
		}

        /**
         *  @memberof DonkyMessagingCommon 
         */
		DonkyMessagingCommon.prototype = {

            /**
             * Function to create and queue a MessageReceived client notification.
             * @param {Object} notification - the notification
             * @param {Boolean} expired - whether we received an expired message or not
             */
            markMessageReceived: function(notification, expired) { 

                var clientNotification = {
                    type: "MessageReceived",
                    senderInternalUserId: notification.data.senderInternalUserId,
                    messageId: notification.data.messageId,
                    senderMessageId: notification.data.senderMessageId,
                    receivedExpired: expired,
                    messageType: notification.data.messageType,
                    messageScope: notification.data.messageScope,
                    sentTimestamp: notification.data.sentTimestamp,
                    contextItems: notification.data.contextItems,
                    
                    acknowledgementDetail: {
                        serverNotificationId: notification.id,
                        result: "Delivered",
                        sentTime: notification.createdOn,
                        type: notification.type
                    }
                };

                donkyCore.queueClientNotifications(clientNotification);    
            },
            /**
             * Function to create and queue a MessageRead client notification.
             * @param {Object} message - the message
             */
            markMessageRead: function(message) {

                var diff = donkyCore._dateDiff(new Date(message.receivedTimestamp), new Date());

                var clientNotification = {
                    type: "MessageRead",
                    senderInternalUserId: message.senderInternalUserId,
                    messageId: message.messageId,
                    senderMessageId: message.senderMessageId,
                    messageType: message.messageType,
                    messageScope: message.messageScope,
                    sentTimestamp: message.sentTimestamp,
                    contextItems: message.contextItems,                    
                    timeToReadSeconds: diff.seconds
                };

                donkyCore.queueClientNotifications(clientNotification);    

            },
            /**
             * Function to create and queue a MessageShared client notification.
             * @param {Object} message - the message
             * @param {String} sharedTo - Where the message was shared to (Facebook / Twitter etc)
             */
            markMessageShared: function(message, sharedTo){
                
                var clientNotification = {
                    type: "MessageShared",
                    messageId: message.messageId,
                    messageType: message.messageType,
                    messageScope: message.messageScope,
                    originalMessageSentTimestamp: message.sentTimestamp,
                    sharedTo: sharedTo,
                    sharedTimestamp: new Date().toISOString(),
                    contextItems: message.contextItems
                };

                donkyCore.queueClientNotifications(clientNotification);                    
            },
            /**
             * Function to determine whether a timestamp has expired or not.
             * @param {String} expiryTimestamp - the timestamp (ISOString)
             * @returns {Boolean} true if expiryTimestamp has expired
             */
            isExpired: function(expiryTimestamp) {
                var expired = false;

		        if (expiryTimestamp !== null && 
                    expiryTimestamp !== undefined) {

		            var expiryMs = new Date(expiryTimestamp).valueOf();
                            
		            var nowMs = new Date().valueOf();

		            if (nowMs > expiryMs) {
		                expired = true;		                
		            }
		        }

                return expired;
            }
		};

		// "static" instance
		donkyMessagingCommon = new DonkyMessagingCommon();

		return donkyMessagingCommon;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyMessagingCommon', ['donkyCore'], function(donkyCore) {
		    return factory(donkyCore);
		});
	} else {
		/*jshint sub:true */
		window['donkyMessagingCommon'] = factory(window.donkyCore);
	}

}());


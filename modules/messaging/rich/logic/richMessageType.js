/*!
 * DonkyCore JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 * NOTE: this is a dummy file used to describe the structure of a rich message for the benefit of JSDoc.
 * It is unnecessary and not used outside of the scope of generating documentation.
 */
 
 
 /** 
 * Creates a RichMessage object. Contains gettable properties related to the RichMessage.
 * @class RichMessage
 * @property  {String} messageType - The message type (Will be Rich)
 * @property  {String} senderExternalUserId - THe sender External User Id
 * @property  {String} externalRef - The External Reference (Will be the campaign name if sent by campaign builder)
 * @property  {String} description - The Message Description
 * @property  {String} body - Html Messge to be displayed 
 * @property  {String} expiredBody - Html Messge to be displayed if the message has expired and is still available on the Donky Network (<30 days old)
 * @property  {Boolean} canReply - Boolean value representing whether the user can reply to this message
 * @property  {Boolean} canForward - Boolean value representing whether the user can forward this message
 * @property  {Boolean} canShare - Boolean value representing whether the user can share this message
 * @property  {Boolean} silentNotification - Boolean value representing whether a sound should be played on receipt of this message. 
 * @property  {String[]} assets - Array of asset id's
 * @property  {String} senderAccountType - The sender Account Type
 * @property  {String} senderDisplayName - The sender Display Name 
 * @property  {String} messageScope - The message scope (A2P - application to person)
 * @property  {String} senderInternalUserId - The sender Internal User Id 
 * @property  {String} senderMessageId - The sender Message Id 
 * @property  {String} messageId - The message Id 
 * @property  {Object} contextItems - The context items (campaign info etc ...)
 * @property  {String} avatarAssetId - The avatar asset id - convert tu URL using donkyCore.formatAssetUrl()
 * @property  {String} sentTimestamp - The sent timestamp (ISO date format)
 * @property  {String} expiryTimeStamp - The expiry timestamp (ISO date format) - if this has elapsed, display expiredBody if it is set.
 * @property  {String} serverNotificationId - The server notificationId
 * @property  {Boolean} isRead - Boolean representing whether the message has been read
 * @property  {String} receivedTimestamp - The received timestamp (ISO date format)
 * @returns {RichMessage} 
 */
function RichMessage(messageType, senderExternalUserId, externalRef, description, expiredBody, canReply, canForward, canShare, 
	silentNotification, conversationId, assets, senderAccountType, senderDisplayName, body, messageScope, 
	senderInternalUserId, senderMessageId, messageId, contextItems,avatarAssetId, sentTimestamp, expiryTimeStamp, 
	serverNotificationId, isRead, receivedTimestamp) {   

	return {
		messageType : messageType,
		senderExternalUserId : senderExternalUserId,
		externalRef : externalRef,
		description : description,
		expiredBody : expiredBody,
		canReply : canReply,
		canForward : canForward,
		canShare : canShare,
		silentNotification : silentNotification,
		conversationId : conversationId,
		assets : assets,
		senderAccountType : senderAccountType,
		senderDisplayName : senderDisplayName,
		body : body,
		messageScope : messageScope,
		senderInternalUserId : senderInternalUserId,
		senderMessageId : senderMessageId,
		messageId : messageId,
		contextItems : contextItems,
		avatarAssetId : avatarAssetId,
		sentTimestamp : sentTimestamp,
		expiryTimeStamp : expiryTimeStamp,
		serverNotificationId : serverNotificationId,
		isRead : isRead,
		receivedTimestamp : receivedTimestamp
	};   
} 
   

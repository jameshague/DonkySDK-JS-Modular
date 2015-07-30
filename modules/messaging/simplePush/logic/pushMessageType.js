/*!
 * DonkyCore JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 * NOTE: this is a dummy file used to describe the structure of a push message for the benefit of JSDoc.
 * It is unnecessary and not used outside of the scope of generating documentation.
 */
 
 
 /** 
 * Creates a ButtonSetAction object. Contains gettable properties related to the ButtonSetAction.
 * @class ButtonSetAction
 * @property  {String} actionType - The action Type ["Dismiss"|"ExternalUrl"]
 * @property  {String} label - The button label
 * @property  {String} data - The data - if actionType is ExternalUrl, data is the URL
 * @returns {ButtonSetAction} 
 */
 function ButtonSetAction(actionType, label, data){
	 return {
		 actionType: actionType,
		 label: label,
		 data: data
	 };
 }

 
 /** 
 * Creates a ButtonSet object. Contains gettable properties related to the ButtonSets.
 * @class ButtonSet
 * @property  {String} buttonSetId - The button Set Id
 * @property  {String} platform - The platform - Only process the one marked "Web"  
 * @property  {String} interactionType - The interaction type (["OneButton"|"TwoButton""])
 * @property  {ButtonSetAction[]} buttonSetActions - The button Set Actions  
 * @returns {ButtonSet} 
 */
 function ButtonSet(buttonSetId, platform, interactionType, buttonSetActions){
	 return {
			buttonSetId : buttonSetId,
			platform : platform,
			interactionType : interactionType,
			buttonSetActions : buttonSetActions
	 };
 }
 
 
 /** 
 * Creates a PushMessageData object. Contains gettable properties related to the PushMessage.
 * @class PushMessageData
 * @property  {String} messageType - The message type (Will be SimplePush) 
 * @property  {String} msgSentTimeStamp - The message Sent timestamp
 * @property  {ButtonSet[]} buttonSets - The buttonset info (optional) - Only process the one with platform set to "Web" if there is one. This array may also contain mobile SDK config.
 * @property  {String} senderDisplayName - The sender display name
 * @property  {String} body - The message body  
 * @property  {String} messageScope - The message scope (A2P)
 * @property  {String} senderInternalUserId - The sender Internal User Id
 * @property  {String} senderMessageId - The sender Message Id
 * @property  {String} messageId - The message id
 * @property  {Object} contextItems - The context Items (campaign info) 
 * @property  {String} avatarAssetId - The avatar asset id - convert tu URL using donkyCore.formatAssetUrl()
 * @property  {String} sentTimestamp - The sent Timestamp (ISO date format)
 * @returns {PushMessageData} 
 */
 function PushMessageData(messageType, msgSentTimeStamp, buttonSets, senderDisplayName, body, messageScope, 
	 senderInternalUserId, senderMessageId, messageId, contextItems, avatarAssetId, sentTimestamp){
	 return {
			messageType : messageType,
			msgSentTimeStamp : msgSentTimeStamp,
			buttonSets : buttonSets,
			senderDisplayName : senderDisplayName,
			body : body,
			messageScope : messageScope,
			senderInternalUserId : senderInternalUserId,
			senderMessageId : senderMessageId,
			messageId : messageId,
			contextItems : contextItems,
			avatarAssetId : avatarAssetId,
			sentTimestamp : sentTimestamp				 
	 };
 }
 
 
 /** 
 * Creates a PushMessage object. Contains gettable properties related to the PushMessage.
 * @class PushMessage
 * @property  {String} id - The notification Id 
 * @property  {String} type - The notification type (Will be SimplePushMessage)
 * @property  {PushMessageData} data - The push message data.
 * @property  {String} createdOn - The created on timestamp (ISO date format) 
 * @property  {Number} displayed - The Displayed timestamp ( created with new Date.valueOf())
 * @returns {PushMessage}
 */
function PushMessage(id, type, data, createdOn, displayed) {   

	return {
		id: id,
		type: type,
		data: data,
		createdOn: createdOn,
		displayed: displayed		
	};   
} 
   

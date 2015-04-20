/** 
 * Creates a UserDetails object. Contains settable properties related to the user.
 * @class UserDetails
 * @property  {String} id - The userId
 * @property  {String} isAnonymous - True if registered anonymously
 * @property  {String} displayName - The Display name
 * @property  {String} emailAddress - The Email Address
 * @property  {String} mobileNumber - The Mobile Numbery
 * @property  {String} countryCode - The Country Code
 * @property  {String} avatarAssetId - The Avatar AssetId
 * @property  {Array} selectedTags - Array of selected tags (Strings)
 * @property  {Object} additionalProperties - Dictionary of additional properties (Max 50 properties
 */
function UserDetails(id, isAnonymous, displayName, emailAddress, mobileNumber, countryCode, avatarAssetId, selectedTags, additionalProperties) {
    return {
        id:	id,
        isAnonymous: isAnonymous,
        displayName: displayName,
        emailAddress:emailAddress,
        mobileNumber: mobileNumber,
        countryCode: countryCode,
        avatarAssetId: avatarAssetId,
        selectedTags: selectedTags,
        additionalProperties: additionalProperties
    }
}

/** 
 * Creates a DeviceDetails object. Contains custom properties related to the device
 * @class DeviceDetails
 * @type {Object}
 * @property {String} type - The Device Type
 * @property {String} model - Not user-settable, viewable only
 * @property {String} operatingSystem - Not user-settable, viewable only
 * @property {String} operatingSystemVersion - Not user-settable, viewable only
 * @property {String} name - The Device Name
 * @property {Object} additionalProperties - Max 50 properties
 */
function DeviceDetails(type, model, operatingSystem, operatingSystemVersion, name, additionalProperties) {
    return {
        type: type,
        model: model,
        operatingSystem: operatingSystem,
        operatingSystemVersion: operatingSystemVersion,
        name: name,
        additionalProperties: additionalProperties
    };
}

/** 
 * Creates a ClientDetails object. Contains custom properties related to the client
 * @class ClientDetails
 * @type {Object}
 * @property {String} sdkVersion - The Sdk Version
 * @property {Array}  moduleVersions - The Module versions
 * @property {String} appVersion - The App Version
 * @property {String} currentLocalTime - The Current Local Time
 */
function ClientDetails(sdkVersion,moduleVersions,appVersion,currentLocalTime) {
    return {
        sdkVersion: sdkVersion,
        moduleVersions: moduleVersions,
        appVersion: appVersion,
        currentLocalTime: currentLocalTime
    };
}

/** 
 * Creates a ClientNotification object.
 * @class ServerNotification
 * @type {Object}
 * @property {String} type - The type
 * @property {String} data - The data
 * @property {String} serverNotificationId - Optional - only required for any notification used to acknowledge a server notification
 */
function ClientNotification(type,data,notificationId) {
    return {
        type: type,
        data: data,
        serverNotificationId: notificationId,
    };
}

/** 
 * Creates a ServerNotification object.
 * @class ServerNotification
 * @type {Object}
 * @property {String} type - The type
 * @property {Object} data - The data
 * @property {String} notificationId - The notification Id
 * @property {String} createdOn - Timestamp for the notification 
 */
function ServerNotification(type,data,notificationId,createdOn) {
    return {
        type: type,
        data: data,
        notificationId: notificationId,
        createdOn: createdOn
    };
}

/** 
 * Creates a ContentNotification object.
 * @class ContentNotification
 * @type {Object}
 * @property {String} audience - The audience for the content
 * @property {Array} filters - Array of Filters for the content
 * @property {String} content - The content
 */
function ContentNotification(audience, filters, content) {
    return {
        audience: audience,
        filters: filters,
        content: content
    };
}

/** 
 * Creates a LocalEvent object.
 * @class LocalEvent
 * @type {Object}
 * @property {String} type - The type of the local event
 * @property {Object} data - The event data
 */
function LocalEvent(type, data) {
    return {
        type: type,
        data:data 
    };
}

/** 
 * Creates a Subscription object.
 * @class Subscription
 * @type {Object}
 * @property {String} notificationType - The type of the notification event to subscribe to
 * @property {Callback} handler - The callback to invoke when the notifications are received.
 */
function Subscription(notificationType,handler) {
    return {
        notificationType: notificationType,
        handler: handler
    };
}

/** 
 * Creates a ModuleDefinition object.
 * @class ModuleDefinition
 * @type {Object}
 * @property {String} name - The module name
 * @property {String} version - The module version, format a.b.c.d
 */
function ModuleDefinition(name, version) {
    return {    
        name:name,
        version:version
    };
}

/** 
 * Creates a TagOption object.
 * @class TagOption
 * @type {Object}
 * @property {String} value - The value of the tag
 * @property {Boolean} isSelected - true if the calling use has selected this tag, otherwise false
 */
function TagOption(value, isSelected) {
    return {    
        value:value,
        isSelected:isSelected
    };
}

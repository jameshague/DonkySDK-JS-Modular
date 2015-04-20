/*!
 * DonkyRichPopupUI JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyRichLogic, donkyUICommon, donkyMessagingCommon, Mustache) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyRichLogic === undefined) {
	        throw new Error("Missing donkyRichLogic");
	    }

	    if (donkyUICommon === undefined) {
	        throw new Error("Missing donkyUICommon");
	    }

	    if (donkyMessagingCommon === undefined) {
	        throw new Error("Missing donkyMessagingCommon");
	    }

	    if (Mustache === undefined) {
	        throw new Error("Missing Mustache");
	    }

		var donkyRichPopupUI;

		// Helpers -----------
		//====================

        var defaults = { 
            // CSS URL to style the notification popup
            popupCSSURL: "../css/DonkyRichPopup.css",
            // INLINE CSS to style the notification popup
            popupCSS: null,
            // Direction for popup to slide from when initially shown [top|right|bottom|left]
            templateURL: "../templates/RichPopupTemplate.html",
            // moustache template for notification popup
            template: null,
            animationDirection: "bottom",
            // Speed of slide animation in milliseconds
            animationSpeed: 1000,
            // URL for bootstrap css - use cdn as below or host yourself
            bootstrapCssUrl: "https://netdna.bootstrapcdn.com/bootstrap/3.1.0/css/bootstrap.min.css",
            // URL for jquery - use cdn as below or host yourself
            jqueryJsUrl: "https://code.jquery.com/jquery-2.1.1.min.js",
            // iframe css - has responsive positional info in it
            iframeCssUrl: "../css/DonkyRichPopupIframe.css",
            // the id to use for creating the iframe
            iframeId: "donkyRichPopupIframe",
            // Boolean to determine whether donkyRichPopupUI should delete the rich message when close button is pressed
            // This is to allow richPopupUI and richInboxUI to cooperate if both in use.    
            deleteOnClose: true
        };

		/**
		 * Internal helper class to display rich popupss
		 */		
        var richPopupManager = {
			/**
			 * Property that represents whether there is a rich popup currently being displayed (or in the process of loading)
			 */		
            displayingPopup: false,
			/**
			 * Function to return whether plugin is currently displaying a rich popup
			 * @returns {Boolean} returns true if displaying banner, false otherwise.
			 */
            isDisplayingRichPopup: function() {
                return this.displayingPopup;
            },
			/**
			 * Function to remove the current rich popup iframe from the dom. 
			 * If there is another message queued up, it will be rendered imediately after this one has faded out.
			 */			
            remove: function() {

                var $iframe = $("#"+defaults.iframeId);

                var self = this;

                $iframe.fadeOut("fast", function() {
                    $iframe.remove();
                    self.displayingPopup = false;
                    self.renderNextUnreadRichPopup(true);
                });
            },
			/**
			 * Function to render next unread rich message. THis method checks for unread mesages via donkyRichLogic.
			 */			
            renderNextUnreadRichPopup: function() {
                // Any queued up to render ?
                var nextRichMessage = donkyRichLogic.getNextUnreadRichMessage();

                if (nextRichMessage != null) {
                    this.renderRichPopup(nextRichMessage);
                }
            },
			/**
			 * Function to physically render the rich message. An iframe is appended to the dom and then a dynamically generated document is applied to it.
			 * THis document contains mark up, css and script. The markup for the actual message is genetared from a Mustache template.
			 * @param {String} messageId - the Message id
			 * @param {String} template - the Mustache template tht generates the push notification markup
			 * @param {Object} model - the model to use in conjunction with the Mustache template.
			 */
            _renderRichPopup: function(messageId, template, model) {
                var html = Mustache.to_html(template, model);

                // This is a combination of defaults.popupCSSURL and defaults.popupCSS - maybe both are specified, maybe just one
                var popupCSS = "";

                if (defaults.popupCSSURL !== null && defaults.popupCSSURL !== undefined) {
                    popupCSS += "<link href='" + defaults.popupCSSURL + "' rel='stylesheet'>";
                }

                if (defaults.popupCSS !== null && defaults.popupCSS !== undefined) {
                    popupCSS += "<style type='text/css'>" + defaults.popupCSS + "</style>";
                }

                var iframeTemplate =
                    "<!DOCTYPE html>\
                        <html lang='en'> \
                        <head>\
                        <meta charset='utf-8' />\
                        <meta http-equiv='X-UA-Compatible' content='IE=edge'/>\
                        <meta name='viewport' content='width=device-width, initial-scale=1' />\
                        <title>Donky Rich Message</title>\
                        <link href='" + defaults.bootstrapCssUrl + "'  rel='stylesheet' type='text/css'  />\
                        <script src='" + defaults.jqueryJsUrl + "' type='text/javascript'></script>"
                        + popupCSS +
                        "</head>\
                        <body><div id='pushMessageContainer' style='position:absolute;width: 100%;'>" + html + "</div></body>\
                        <script>\
                            $(function(){\
                                $('.popupClose').click(function(){\
                                    window.parent.$(window.parent.document).trigger('DonkyRichPopupClosed', [$(this).data('message-id'), $(this).text()]);\
                                });\
                            });\
                        </script>\
                        </html>";

                $("body").append("<iframe id='" + defaults.iframeId + "' seamless='seamless' frameborder='0' scrolling='no' ></iframe>");
            
                // An iframe in an iframe ....
                donkyUICommon.renderIframeSrcDoc($("#"+defaults.iframeId), iframeTemplate, function($frame) {
                    donkyUICommon.renderIframeSrcDoc($frame.contents().find("#RichMessage"), model.Body);
                });
            },
			/**
			 * Higher level function to render a rich popup. This method generates the model for the Mustache template from the raw message data.
			 * If the template hasn't been loaded yet, it is loaded prior to calling _renderPushMessage() which does the actual work.
			 * @param {Object} message - the raw message.
			 */						
            renderRichPopup: function(message) {
                this.displayingPopup = true;
                donkyCore.donkyLogging.infoLog("rendering this: " + JSON.stringify(message));

                var messageCount = donkyRichLogic.getMessageCount();

                // Hide unread the badge count if it is zero - also we are not marking as read until this popup is closed
                // otherwise it won't survive a page reload
                var unreadCount = messageCount.unreadRichMessageCount - 1;
                if (unreadCount == 0) {
                    unreadCount = "";
                }

                var model = {
                    AvatarUrl: message.avatarAssetId != null ? donkyCore.formatAssetUrl(message.avatarAssetId) : "",
                    MessageId: message.messageId,
                    SenderDisplayName: message.senderDisplayName,
                    Body: !donkyMessagingCommon.isExpired(message.expiryTimestamp) ? message.body : message.expiredBody,
                    UnreadCount: unreadCount,
                    ResponsiveStyle: document.body.clientWidth < 768 ? "forMobile" : "forDesktop",
                    CloseButton: "<span class='glyphicon glyphicon-remove popupClose' data-message-id='" + message.messageId + "'></span>"
                };

                if (defaults.template !== null) {
                    this._renderRichPopup(message.messageId, defaults.template, model);
                } else {
                    var self = this;

                    $.get(defaults.templateURL, function(template) {
                        defaults.template = template;
                        self._renderRichPopup(message.messageId, defaults.template, model);
                    });
                }
            }
        };

		
        // donkyRichLogic
		//====================

		/**
		 * @constructor
		 */
		function DonkyRichPopupUI() {

		}

	    DonkyRichPopupUI.prototype = {

            /**
             * Initialises the plugin.
             * @param {Object} settings - intergrators settings to optionally overide any of the defaults
             */
            initialise: function(options) {
                donkyCore._extend(defaults, options);

                donkyUICommon.loadCss(defaults.iframeCssUrl);

                richPopupManager.renderNextUnreadRichPopup();        

                // subscribe to new messages
                donkyCore.subscribeToLocalEvent(
                        "NewRichMessagesReceived",
                        function(event){                     
				            donkyCore.donkyLogging.infoLog("NewRichMessagesReceived");

				            if (!richPopupManager.isDisplayingRichPopup()) {
					            richPopupManager.renderNextUnreadRichPopup();
				            } else {
					            // Update badge with new unread count
					            var messageCount = donkyRichLogic.getMessageCount();
					            $("#"+defaults.iframeId).contents().find(".badge").text(messageCount.unreadRichMessageCount);
				            }
                        }
                    );

                $(document).on("DonkyRichPopupClosed",function(evt, messageId) {
                    donkyCore.donkyLogging.infoLog("DonkyRichPopupClosed: " + messageId);

                    donkyRichLogic.markRichMessageRead(messageId);

                    if (defaults.deleteOnClose) {
                        donkyRichLogic.deleteRichMessage(messageId);
                    }
                    richPopupManager.remove();
                });

            }

	    };

	    // "static" instance
		donkyRichPopupUI = new DonkyRichPopupUI();

		return donkyRichPopupUI;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyRichPopupUI', ['donkyCore', 'donkyRichLogic', 'donkyUICommon', 'donkyMessagingCommon', 'Mustache'], function(donkyCore, donkyRichLogic, donkyUICommon, donkyMessagingCommon, Mustache) {
            return factory(donkyCore, donkyRichLogic, donkyUICommon, donkyMessagingCommon, Mustache);
        });
	} else {
		/*jshint sub:true */
		window['donkyRichPopupUI'] = factory(window.donkyCore, window.donkyRichLogic, window.donkyUICommon, window.donkyMessagingCommon, window.Mustache);
	}

}());

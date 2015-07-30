/*!
 * donkyPushUI JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyPushLogic, donkyUICommon, Mustache) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyPushLogic === undefined) {
	        throw new Error("Missing donkyPushLogic");
	    }

	    if (donkyUICommon === undefined) {
	        throw new Error("Missing donkyUICommon");
	    }

	    if (Mustache === undefined) {
	        throw new Error("Missing Mustache");
	    }

	    var donkyPushUI;

		// Private Variables
		//====================

        var defaults = { 
            // CSS URL to style the notification popup
            bannerCSSURL: donkyCore.installDir + "css/DonkyNotification.css",
            // INLINE CSS to style the notification popup
            bannerCSS: null,
            //  URL for the notification popup template (moustache template) 
            //  You can either specify a url containing the template or inline it on the below "template" property ... 
            templateURL: donkyCore.installDir + "templates/SimplePushTemplate.html",
            // moustache template for notification popup
            template: null,
            // Direction for popup to slide from when initially shown [top|right|bottom|left]
            animationDirection: "bottom",
            // Speed of slide animation in milliseconds
            animationSpeed: 1000,
            // URL for bootstrap css - use cdn as below or host yourself
            bootstrapCssUrl: "https://netdna.bootstrapcdn.com/bootstrap/3.1.0/css/bootstrap.min.css",
            // URL for jquery - use cdn as below or host yourself
            jqueryJsUrl: "https://code.jquery.com/jquery-2.1.1.min.js",
            // iframe css - has responsive positional info in it
            iframeCssUrl: donkyCore.installDir + "css/DonkyNotificationIframe.css",
            // the id to use for creating the iframe
            iframeId: "donkySimplePushIframe",
			// default avatar to use if app-space doesn't have one
			defaultAvatar: donkyCore.installDir + "images/NoImage.png",            
			// default avatar to use if app-space doesn't have one
			attentionAvatar: donkyCore.installDir + "images/attention-avatar.png",
        };

		/**
		 * Internal helper class to display push notifications
		 */
        var pushBannerManager = {
			/**
			 * Property that represents whether there is a push message currently being displayed (or in the process of loading)
			 */
            displayingBanner: false,
			/**
			 * Function to return whether plugin is currently displaying a push notification
			 * @returns {Boolean} returns true if displaying banner, false otherwise.
			 */
            isDisplayingBanner: function() {
                return this.displayingBanner;
            },
			/**
			 * Function to remove the current push notification iframe from the dom. 
			 * If there is another notification queued up, it will be rendered imediately after this one has faded out.
			 */
            remove: function() {

                var $iframe = $("#"+defaults.iframeId);

                var self = this;

                $iframe.fadeOut("fast", function() {
                    $iframe.remove();
                    self.displayingBanner = false;
                    self.renderNextBanner(true);
                });
            },
			/**
			 * Function to render next push notification. THis method checks for notifications via donkyPushLogic.
			 * @param {Boolean} animate - whether to animate the notification - if this a new one we typically slide it in from some direction (specified in defaults). If we are reloading the page we don't animate.
			 */
            renderNextBanner: function(animate) {
                // Any queued up to render ?
                var nextSimplePush = donkyPushLogic.getNextSimplePush();

                if (nextSimplePush !== null) {
                    this.renderPushMessage(nextSimplePush, animate);
                }
            },
			/**
			 * Function to generate all the button info for the notification. This info is used in the Mustache template for the popup
			 *
			 * @param {Object} notification - the push notification
			 * @returns {Object[]} - returns array of button Objects, each containing the following properties: buttonText, className, linkURL, ButtonHtml, ButtonAttributes
			 */
            getButtons: function(notification) {

				var message = notification.data;
				
                var buttons = [];

                if ($.isArray(message.buttonSets) && message.buttonSets.length > 0) {

                    $.each(message.buttonSets, function(index, buttonSet) {

                        if (buttonSet.platform == "Web") {

                            $.each(buttonSet.buttonSetActions, function(index, action) {

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


                var buttonHtml = "";
                var buttonAttribs = "";
                $.each(buttons, function(index, button) {
                    if (button.linkURL !== undefined) {
                        if (button.linkURL.indexOf("http") === 0) {
                            // this is a fully qualified url
                            buttonAttribs = "target='_blank' data-url='' href='" + button.linkURL + "' data-notification-id='" + notification.id + "' data-action-type='" + button.actionType + "'";

                            buttonHtml = "<a class='btn donkyBannerButton'" + buttonAttribs + ">" + button.buttonText + "</a>";
                        } else {
                            // this is a relative link so parent page will open it 
                            buttonAttribs = "data-url='" + button.linkURL + "' data-notification-id='" + notification.id + "' data-action-type='" + button.actionType + "'";
                            buttonHtml = "<a class='btn donkyBannerButton'" + buttonAttribs + ">" + button.buttonText + "</a>";
                        }
                    } else {
                        buttonAttribs = "data-notification-id='" + notification.id + "' data-action-type='" + button.actionType + "'";
                        buttonHtml = "<a class='btn donkyBannerButton'" + buttonAttribs + ">" + button.buttonText + "</a>";
                    }

                    button.ButtonHtml = buttonHtml;
                    button.ButtonAttributes = buttonAttribs;
                });
                return buttons;
            },
			/**
			 * Function to physically render the push notification. An iframe is appended to the dom and then a dynamically generated document is applied to it.
			 * THis document contains mark up, css and script. The markup for the actual notification is genetared from a Mustache template.
			 * @param {String} template - the Mustache template tht generates the push notification markup
			 * @param {Object} model - the model to use in conjunction with the Mustache template.
			 * @param {Boolean} animate - whether to animate the displaying of the notification.
			 */
            _renderPushMessage: function(template, model, animate) {
                var html = Mustache.to_html(template, model);

                var animationJS = "";

                if (animate) {
                    switch (defaults.animationDirection) {
                        case "top":
                            animationJS = "$container.css('top','-'+$container.outerHeight(true)+'px').animate({top : '0'}, " + defaults.animationSpeed + ");";
                            break;
                        case "right":
                            animationJS = "$container.css('right','-'+$container.outerWidth(true)+'px').animate({right : '0'}, " + defaults.animationSpeed + ");";
                            break;
                        case "bottom":
                            animationJS = "$container.css('bottom','-'+$container.outerHeight(true)+'px').animate({bottom : '0'}, " + defaults.animationSpeed + ");";
                            break;
                        case "left":
                            animationJS = "$container.css('left','-'+$container.outerWidth(true)+'px').animate({left : '0'}, " + defaults.animationSpeed + ");";
                            break;
                    }
                }

                // This is a combination of defaults.bannerCSSURL and defaults.bannerCSS - maybe both are specified, maybe just one
                var bannerCSS = "";

                if (defaults.bannerCSSURL !== null && defaults.bannerCSSURL !== undefined) {
                    bannerCSS += "<link href='" + defaults.bannerCSSURL + "' rel='stylesheet'>";
                }
				// Integrator can use the default css and maybe override a few properties ...
                if (defaults.bannerCSS !== null && defaults.bannerCSS !== undefined) {
                    bannerCSS += "<style type='text/css'>" + defaults.bannerCSS + "</style>";
                }

				// This is basically the entire source for the iframe
                /*jshint multistr: true */
                var iframeTemplate =
"<!DOCTYPE html>\
    <html lang='en'> \
    <head>\
    <meta charset='utf-8' />\
    <meta http-equiv='X-UA-Compatible' content='IE=edge'/>\
    <meta name='viewport' content='width=device-width, initial-scale=1' />\
    <title>Donky Rich Message</title>\
    <link href='" + defaults.bootstrapCssUrl + "'  rel='stylesheet' type='text/css'  />\
    <script src='" + defaults.jqueryJsUrl + "' type='text/javascript'></script>" + bannerCSS + "</head>\
    <body><div id='pushMessageContainer' style='position:absolute;width: 100%;'>" + html + "</div></body>\
    <script>\
        $(function(){\
            var $container = $('#pushMessageContainer');var outerHeight = $container.outerHeight(true);\
            $('#"+defaults.iframeId+"', window.parent.document).height(outerHeight + 'px');\
            " + animationJS + "\
            $('.donkyBannerButton, .bannerClose').click(function(){\
                window.parent.$(window.parent.document).trigger('donkyNotificationButtonClicked', [$(this).data('notification-id'), $(this).text(), $(this).data('url'),  $(this).data('action-type')]);\
            });\
        });\
    </script>\
    </html>";

                $("body").append("<iframe id='"+defaults.iframeId+ "' frameborder='0' scrolling='no' ></iframe>");

                donkyUICommon.renderIframeSrcDoc($("#"+defaults.iframeId), iframeTemplate, function(){
                    // TODO: calc iframe height and resize ?
                });

            },
			/**
			 * Higher level function to render a push notification. This method generates the model for the Mustache template from the raw notification data.
			 * If the template hasn't been loaded yet, it is loaded prior to calling _renderPushMessage() which does the actual work.
			 * @param {Object} notification - the raw notification.
			 * @param {Boolean} animate - whether to animate the displaying of the notification.			 
			 */			
            renderPushMessage: function(notification, animate) {
                this.displayingBanner = true;
                donkyCore.donkyLogging.infoLog("rendering this: " + JSON.stringify(notification));

                var message = notification.data;

                var pushMessageCount = donkyPushLogic.getMessageCount();
                var unreadPushMessageCount = pushMessageCount - 1;

                var model = {
                    AvatarUrl: (message.avatarAssetId !== null && message.avatarAssetId !== "") ? donkyCore.formatAssetUrl(message.avatarAssetId) : defaults.defaultAvatar,					
                    NotificationId: notification.id,
                    SenderDisplayName: message.senderDisplayName,
                    Body: message.body,
                    Buttons: this.getButtons(notification),
                    // Badge doesn't show if span contains empty string
                    UnreadCount: unreadPushMessageCount > 0 ? unreadPushMessageCount : "",
                    ResponsiveStyle: document.body.clientWidth < 768 ? "forMobile" : "forDesktop",
                    CloseButton: "<span class='glyphicon glyphicon-remove bannerClose' data-notification-id='" + notification.id + "'></span>"
                };

                if (defaults.template !== null) {
                    this._renderPushMessage(defaults.template, model, animate);
                } else {
                    var self = this;
                    // Download the template ...
                    $.get(defaults.templateURL, function(template) {
                        defaults.template = template;
                        self._renderPushMessage(defaults.template, model, animate);
                    });
                }
            }
        };

		// donkyPushUI --------
		//====================

		/**
		 * @class DonkyPushUI
		 */
		function DonkyPushUI() {
            donkyCore.donkyLogging.infoLog("Constructing DonkyPushUI");

            var module = {  
                name: "DonkyPushUI", 
                version: "2.0.0.1" 
            };

            donkyCore.registerModule(module);
		}

        /**
         *  @memberof DonkyPushUI 
         */
		DonkyPushUI.prototype = {

            /**
             * Initialises the plugin.
             * @param {Object} settings - intergrators settings to optionally overide any of the defaults
             */
            initialise: function(options) {

                donkyCore._extend(defaults, options);
                
                donkyUICommon.loadCss(defaults.iframeCssUrl);

                // Load the container on document.reaady and display any messages if there are any
                pushBannerManager.renderNextBanner(false);        

                // subscribe to new messages
                donkyCore.subscribeToLocalEvent(
                        "NewSimplePushMessagesReceived",
                        function(event){                     
				            donkyCore.donkyLogging.infoLog("NewSimplePushMessagesReceived");

				            if (!pushBannerManager.isDisplayingBanner()) {
					            pushBannerManager.renderNextBanner(true);
				            } else {
					            // Update badge with new unread count
					            var pushMessageCount = donkyPushLogic.getMessageCount();
					            var unreadCount = pushMessageCount - 1;
					            $("#donkySimplePushIframe").contents().find(".badge").text(unreadCount);
				            }
                        }
                    );
                
                // TODO: remove the JS in the iframe and wire in from here ?
                
                $(document).on("donkyNotificationButtonClicked", function(evt, notificationId, buttonText, url, action) {
                    
                   var dets = {
                        notificationId: notificationId,
                        buttonText: buttonText,
                        url: url,
                        action: action
                    };
            
                    donkyCore.donkyLogging.infoLog( "donkyNotificationButtonClicked: " + JSON.stringify(dets));
            
                    donkyPushLogic.setSimplePushResult(notificationId, buttonText);    
            
                    switch (action) {
                        case "Javascript":
                            if (url !== undefined) {
                                var code = atob(url);
                                try {
                                    eval(code);// jshint ignore:line
                                } catch (e) {
                                }
                            }
                            break; 
            
                        case "Dismiss":
                            break;
                        
                        case "Link":
            		        if(url !== ""){
            			        // Dont need to remove as we are going somewhere
            			        location.href = url;		
            		        }
                            break; 
            
                        default:
                            break;
                    }
                    
                    pushBannerManager.remove();
            
                });                
                
            }
		};

		// "static" instance
		donkyPushUI = new DonkyPushUI();

		return donkyPushUI;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyPushUI', ['donkyCore', 'donkyPushLogic', 'donkyUICommon', 'Mustache' ], function(donkyCore, donkyPushLogic, donkyUICommon, Mustache) { 
            return factory(donkyCore, donkyPushLogic, donkyUICommon, Mustache); 
        });
	} else {
		window.donkyPushUI = factory(window.donkyCore, window.donkyPushLogic, window.donkyUICommon, window.Mustache);
	}

}());

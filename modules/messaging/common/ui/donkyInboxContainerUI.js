/*!
 * donkyInboxContainerUI JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyUICommon, Mustache) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyUICommon === undefined) {
	        throw new Error("Missing donkyUICommon");
	    }

	    if (Mustache === undefined) {
	        throw new Error("Missing Mustache");
	    }

		// Private Variables
		//====================

		var donkyInboxContainerUI;
		
		var initialised = false;

        var defaults = { 
			// css files for container
			inboxCssUrls: [ 
				"https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css", 
				donkyCore.installDir + "css/awesome-bootstrap-checkbox.css", 
				donkyCore.installDir + "css/DonkyInboxUI.css"
			],		
			// override css files 
			inboxCssOverrideUrls: null,				
			// Inline css for inbox
			inlineInboxCss: null,
			// css files for handle			
			handleCssUrls: [
				"https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css",
				donkyCore.installDir + "css/DonkyContainerHandle.css"
			],
			// override css files 
			handleCssOverrideUrls: null,				
			// Inline css for container handle
			inlineHandleCss: null,			
			// The id of the inbox container iframe
			iFrameId: "donkyInboxUIContainer",
			// The css of the inbox container iframe
			iFrameCss:	{
	            "height": "100%",
	            "position": "fixed",
	            "right": "0px",
	            "top": "0px",            
	            "-webkit-box-shadow": "0px 0px 10px 0px #888",
	            "-moz-box-shadow": "0px 0px 10px 0px #888",
	            "box-shadow": "0px 0px 10px 0px #888",    
	            "border": "none",
	            "z-index": "10000"        
        	},					
			// The id of the handle iframe
			handleIFrameId: "donkyInboxUIHandle",	
			// The css of the handle iframe
			handleIFrameCss:{
	            "width": "40px",
	            "height": "55px",
	            "position": "fixed",
	            "top": "-5px",    
	            "border": "none",     
	            "background-color": "transparent",
	            "z-index": "10001"               				
			},		
	        // Location of moustache tamplates for all the views
	        templateURL: donkyCore.installDir + "templates/InboxContainerTemplate.html",
	        // Duration of the open / close animation (in milliseconds)
	        defaultAnimationTimeout: 1000,
	        // Threshold width (in pixels) that determines whether to do moblie layout or desktop (arbitarily set at iphonbe 6 width)
	        desktopCutoffWidth: 414,			
	        // Default max width of the inbox - if we are on a desktop (decided by), this will be used,
	        // if on a mobile,  screen width will be used
	        notificationIframeMaxWidth: 400,
		};
		
		var templates = {};
		
		var inboxView = null;
		
		var isOpen = true;
				
		var isMobile = false;

		// Helpers -----------
		//====================
		
		
	    /**
		 * This function loads up all the moustache templates for the individual views and stores them in a templates object.
	     * The url for the templates is specified in the default arguments (donky cdn) and can be overriden if you wish to customize.
	     * Please note that if you customize the templates and host elsewhere, your server will need to support CORS as this will be a 
	     * cross domain request.
	     */
	    function loadTemplates( callback ) {
	
	        jQuery.get(defaults.templateURL, function(response) {
					
				templates.handleTemplate = jQuery(response).filter('#handleTemplate').html();
				templates.homePageTemplate = jQuery(response).filter('#homePageTemplate').html(); 
		
	            callback();
	        });
	    }
		
		
		/**
		 * This is used to generate the inbox container AND the handle iframe. They only differ by the css that gets included
		 * @param {String[]} cssArray - array of links to css files to include in documane
		 * @param {String} inlineCss - inline css rules to add to the document
		 */
		function getIframeSrc(cssArray, inlineCss){
	        var css = "";
																	
			if(cssArray !== null && donkyCore._isArray(cssArray)){
				donkyCore._each(cssArray, function(index, url){
					 css += "<link href='" + url + "'  rel='stylesheet' type='text/css'/>";
				});												
			}
			
			if(inlineCss!== undefined && inlineCss!==null){
				css += "<style type='text/css'>" + inlineCss + "</style>";
			}
			
			/*jshint multistr: true */
			var iframeSrc =
"<!DOCTYPE html>\
	<html lang='en'> \
	<head>\
	<meta charset='utf-8' />\
	<meta http-equiv='X-UA-Compatible' content='IE=edge'/>\
	<meta name='viewport' content='width=device-width, initial-scale=1' />\
    <link href='https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css' rel='stylesheet'>" + css + "</head>\
	<body></body>\
</html>";	
					
			return iframeSrc;		
		}
		
		/**
		 * Opens Inbox Container
		 */
		function openInboxContainer(animationTimeout){
			defaults.$iFrame.animate({ width: defaults.notificationIframeMaxWidth }, animationTimeout, function() {
				isOpen = true;
				donkyCore.donkyData.set("InboxContainerView", { isOpen: isOpen } );
			});			
			defaults.$handleIFrame.animate({ right: defaults.notificationIframeMaxWidth  }, animationTimeout, function() {
			});			
		}

		/**
		 * Closes Inbox Container 
		 */
		function closeInboxContainer(animationTimeout){
			defaults.$iFrame.animate({ width: 0 }, animationTimeout, function() {
				isOpen = false;
				donkyCore.donkyData.set("InboxContainerView", { isOpen: isOpen } );
			});
			defaults.$handleIFrame.animate({ right: 0 }, animationTimeout, function() {

			});			
		}
		
		/**
		 * This method renders the inbox "handle". The handle is the tab on the top-left of the inbox that allows the
		 * container to be opened and closed when clicked. It also displays a badge count which is the sum of all child
		 * views badge counts. It is implemented as a separate small iframe that is positioned nect to the inbox and animated accordingly. 
		 */
		function renderHandle(){
			if(defaults.handleIFrameId !== null){
				// Get the badge count to display - calls individual child views and sums.
				var badgeCount = inboxView.getBadgeCount();
                				
				// Renders html
				defaults.$handleIFrame.contents().find("body").html( Mustache.to_html(templates.handleTemplate, {BadgeCount: badgeCount === 0 ? "" : badgeCount}));								
				
				// wire in event handler for clicking the handle to open & close
				defaults.$handleIFrame.contents().find("#donkyHandle").click(function(){									
					if(isOpen){
						closeInboxContainer(defaults.defaultAnimationTimeout);
					}else{
						openInboxContainer(defaults.defaultAnimationTimeout);
					}
				});	
			}		
		}
		
		/**
		 * Resize the height/width of the iframe when the dimensions change: 
		 * on iOS devics, specifying 100% width doesn't have the desired effect 
		 */
		function onDimensionsChanged(){			
			 defaults.$iFrame.css("height", window.innerHeight + "px");
			 
			 
			 if( isMobile ){				 
				defaults.notificationIframeMaxWidth = window.innerWidth;
								
				defaults.$iFrame.contents().find("body").css("width", defaults.notificationIframeMaxWidth + "px");
				// If mobile layout has gone full screen, seeing as we are animating the width of the iframe, set width of top level panel
				// unless we are in split mode (hence the > in the query)
				defaults.$iFrame.contents().find("body > .panel.donkyInboxUI").css("width", defaults.notificationIframeMaxWidth + "px");
				
								
				defaults.$iFrame.css("width", (isOpen ? defaults.notificationIframeMaxWidth : 0) + "px");				
				defaults.$handleIFrame.css("right", (isOpen ? defaults.notificationIframeMaxWidth : 0) + "px");				
			 }
		}
		
		function subscribeToDonkyEvents(){
			
			// New rich message received 
			donkyCore.subscribeToLocalEvent("NewRichMessagesReceived", function(event) {					
				renderHandle();				
			});
			
			jQuery(window).on("resize orientationchange", function(){
				onDimensionsChanged();
			});												
		} 
		
		// donkyInboxContainerUI
		//======================

		/**
		 * @class DonkyInboxContainerUI
		 */
		function DonkyInboxContainerUI() {
            donkyCore.donkyLogging.infoLog("Constructing DonkyInboxContainerUI");

            var module = {  
                name: "DonkyInboxContainerUI", 
                version: "2.0.1.1" 
            };

            donkyCore.registerModule(module);	
			
			// register a service that will export isOpen property. The donkyPushUI module (if present) can display a popup if a new message
			// arrives and the inbox is closed. The popup contains a "View Message" button which opens' the inbox on the message. 
			// This "service" allows the donkyPushLogic module to query the viewstate of the inbox and queue a message if necessary.
			
			var isOpenService = {
				isOpen: function(){
					return isOpen;
				}				
			};  		
		
			donkyCore.registerService("donkyInboxContainerUIService", isOpenService);	
			
		}

        /**
         *  @memberof DonkyInboxContainerUI 
         */
		DonkyInboxContainerUI.prototype = {

            /**
             * Function to initialize plugin
			 * @param {Object} inbox - inbox view to host 
			 * @param {Object} settings - intergrators settings to optionally overide any of the defaults 
             */
			initialise: function(inbox, settings){
				
				if(donkyCore._isArray(inbox)){
                    // backwards compatibility ;-(
                    inboxView = inbox[0];
				}else if(donkyCore._isObject(inbox)){
                    inboxView = inbox;
                }else{
                    throw new Error("No views");
                }
				
				if(settings !== undefined){
					donkyCore._extend(defaults, settings);	
				}

		        // Decide on mode based on screen width - for a "mobile", we want the inbox to open to full screen
				
				if (Math.min(window.innerWidth, window.innerHeight) <= defaults.desktopCutoffWidth ) {
		            isMobile = true;
					defaults.notificationIframeMaxWidth = window.innerWidth; 
		        }
																																			
				var viewState = donkyCore.donkyData.get("InboxContainerView");
											
				// if closed, tweak the css files - closed is the default for first load
				if(viewState === null || !viewState.isOpen){
					isOpen = false;
					// set css defaults to display the inbox and the handle in the closed position. 
					defaults.iFrameCss.width = "0px";
					defaults.handleIFrameCss.right = "0px";
				}else{
					// set css defaults to display the inbox and the handle in the open position.
					defaults.iFrameCss.width = defaults.notificationIframeMaxWidth + "px";
					// Handle is positioned next to inbox at the top left position 					
					defaults.handleIFrameCss.right= (defaults.notificationIframeMaxWidth) + "px";
				}
				
				if(defaults.iFrameId !== null && defaults.iFrameId !== undefined){
					// create the iframe for the inbox
					jQuery("body").append("<iframe id='" + defaults.iFrameId + "' frameborder='0' scrolling='no' ></iframe>");
					// Cache a reference to the jQuery object
					defaults.$iFrame = jQuery( "#" + defaults.iFrameId); 

					if(defaults.$iFrame.length !== 1){
						throw new Error("Error creating iframe");
					}	

					// ideally would use 100% but doesn't behave correctly on iOS devices						
					defaults.iFrameCss.height = window.innerHeight + "px";			
					
					// Apply the iframe css from the defaults
					defaults.$iFrame.css( defaults.iFrameCss );
				}else{
					throw new Error("No iFrameId specified");
				}
																												
				// push module has rendered a popup and user has clicked view button.
				// It only displays a popup if inbox is closed so we need to open
				// Child view will render the message.
				jQuery(document).on("ViewRichMessage",function(evt, messageId) {
					openInboxContainer(defaults.defaultAnimationTimeout);
				});
															
				jQuery(document).on("ViewRichInbox",function(evt) {
					openInboxContainer(defaults.defaultAnimationTimeout);
				});
				
				if(defaults.handleIFrameId !== null){
					// create the iframe for the inbox handle
					jQuery("body").append("<iframe id='" + defaults.handleIFrameId + "' frameborder='0' scrolling='no' ></iframe>");
					// Cache a reference to the jQuery object
					defaults.$handleIFrame = jQuery("#"+defaults.handleIFrameId);
					
					if(defaults.$handleIFrame.length !== 1){
						throw new Error("Error creating iframe");
					}	
					
					// Apply the iframe css from the defaults
					defaults.$handleIFrame.css(defaults.handleIFrameCss);
				}
																
				// Load mustache templates for the views																		
				loadTemplates(function(){
																																						
					// concatenate inboxCssUrls and inboxCssOverrideUrls if inboxCssOverrideUrls is specified					
					if(defaults.inboxCssOverrideUrls !== null ){						
						if(donkyCore._isArray(defaults.inboxCssOverrideUrls)){
							defaults.inboxCssUrls = defaults.inboxCssUrls.concat(defaults.inboxCssOverrideUrls);
						}else if(typeof defaults.inboxCssOverrideUrls === "string"){
							defaults.inboxCssUrls.push(defaults.inboxCssOverrideUrls);
						}						
					}							
								
					// Render doc for container							
					donkyUICommon.renderIframeSrcDoc(defaults.$iFrame, getIframeSrc(defaults.inboxCssUrls, defaults.inlineInboxCss), function(){

						// explicitly set the width so when we animate the opening and closing of the container the layout doesn't go responsive
						defaults.$iFrame.contents().find("body").css("width", defaults.notificationIframeMaxWidth + "px");

						if(defaults.handleIFrameId !== null){
														
							// concatenate handleCssUrls and handleCssOverrideUrls if handleCssOverrideUrls is specified					
							if(defaults.handleCssOverrideUrls !== null ){						
								if(donkyCore._isArray(defaults.handleCssOverrideUrls)){
									defaults.handleCssUrls = defaults.handleCssUrls.concat(defaults.handleCssOverrideUrls);
								}else if(typeof defaults.handleCssOverrideUrls === "string"){
									defaults.handleCssUrls.push(defaults.handleCssOverrideUrls);
								}						
							}							
							
							// render doc for the handle 
							donkyUICommon.renderIframeSrcDoc(defaults.$handleIFrame, getIframeSrc(defaults.handleCssUrls, defaults.inlineHandleCss), function(){								
								
								renderHandle();
																
								// A rich message has been marked as read so re-render the handle (as badge count may have changed)
						        donkyCore.subscribeToLocalEvent("RichMessageRead", function(event) {
									renderHandle();					
								});
								
								// A rich message has been deleted so re-render the handle (as badge count may have changed)
						        donkyCore.subscribeToLocalEvent("RichMessageDeleted", function(event) {
									renderHandle();					
								});
								
								// A selection rich message has been deleted so re-render the handle (as badge count may have changed)
						        donkyCore.subscribeToLocalEvent("RichMessagesDeleted", function(event) {
									renderHandle();					
								});
								
								subscribeToDonkyEvents();
								initialised = true;
								donkyInboxContainerUI.renderView();							
								
							});
						}else{													
							subscribeToDonkyEvents();
							initialised = true;
							donkyInboxContainerUI.renderView();							
						}						
					});					
				});							
			},
            /**
             * Function to render main view
             */
            renderView : function() {
				if(initialised){
                    inboxView.renderView();
				}else{
					donkyCore.donkyLogging.warnLog("donkyInboxContainerUI.renderView() called when not initialised");
				}
            }
		};

		// "static" instance
		donkyInboxContainerUI = new DonkyInboxContainerUI();

		return donkyInboxContainerUI;
	};

	// Require.js initialisation
	if (typeof define === 'function' && define.amd) {
		define('donkyInboxContainerUI', ['donkyCore', 'donkyUICommon', 'Mustache' ], function(donkyCore, donkyUICommon, Mustache) { 
            return factory(donkyCore, donkyUICommon, Mustache); 
        });
	} else {
		window.donkyInboxContainerUI = factory(window.donkyCore, window.donkyUICommon, window.Mustache);
	}

}());

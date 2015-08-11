/*!
 * donkyInboxContainerUI JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyRichLogic, donkyUICommon, Mustache) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyRichLogic === undefined) {
	        throw new Error("Missing donkyPushLogic");
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

        var defaults = { 
			// css files for container
			inboxCssUrls: [ 
				"https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css", 
				donkyCore.installDir + "css/awesome-bootstrap-checkbox.css", 
				donkyCore.installDir + "css/DonkyInboxUI.css"
			],			
			// Inline css for inbox
			inlineInboxCss: null,
			// css files for handle			
			handleCssUrls: [
				"https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css",
				donkyCore.installDir + "css/DonkyContainerHandle.css"
			],
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
			// If only one view in container, whether or not to display index page 
			showIndexPage: true				
		};
		
		var templates = {};
		
		var views = null;
		
		var isOpen = true;
		
		var viewIndex = -1;
		
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
			defaults.$iFrameId.animate({ width: defaults.notificationIframeMaxWidth }, animationTimeout, function() {
				isOpen = true;
				donkyCore.donkyData.set("InboxContainerView", { index: viewIndex, isOpen: isOpen } );
			});			
			defaults.$handleIFrameId.animate({ right: defaults.notificationIframeMaxWidth  }, animationTimeout, function() {
			});			
		}

		/**
		 * Closes Inbox Container 
		 */
		function closeInboxContainer(animationTimeout){
			defaults.$iFrameId.animate({ width: 0 }, animationTimeout, function() {
				isOpen = false;
				donkyCore.donkyData.set("InboxContainerView", { index: viewIndex, isOpen: isOpen } );
			});
			defaults.$handleIFrameId.animate({ right: 0 }, animationTimeout, function() {

			});			
		}
		
		/**
		 * This method renders the container index page. This contains a list item for each child view. 
		 * The markup is supplied by the child with a call to getContainerIndexMarkup(). 
		 * This could include a badge count of unread messages in the case of the Rich & Chat Inbox views.
		 */
		function renderHomePage(){
			
			// Build the model for the Mustache template ..
			var model = {	
				Views:[]
			};
			
			donkyCore._each(views, function(index,view){
				model.Views.push({ 
					MenuHtml: view.getContainerIndexMarkup(),
					Index: index
				});
			});
			
			// render the template
			defaults.$iFrameId.contents().find("body").html( Mustache.to_html(templates.homePageTemplate, model));

			// Set viewstate so we can redraw correctly is page is refreshed (inbox state, current view etc ... )			
			donkyUICommon.setInboxViewState({view: donkyUICommon.inboxViews.homePage});
			donkyCore.donkyData.set("InboxContainerView", {index: -1, isOpen: isOpen} );

			// Wire in event handler to close inbox
			defaults.$iFrameId.contents().find(".exitDonky").click(function(){
				closeInboxContainer(defaults.defaultAnimationTimeout);
			});			
			
			// Setup handlers to navigate into a child view if menuitem is clicked
			defaults.$iFrameId.contents().find(".list-group-item").click(function(){
				viewIndex = jQuery(this).data("view-index");
				donkyCore.donkyData.set("InboxContainerView", { index: viewIndex, isOpen: isOpen } );
				donkyUICommon.setInboxViewState(null);
				views[viewIndex].renderView();						
			});			
		}

		/**
		 * This method renders the inbox "handle". The handle is the tab on the top-left of the inbox that allows the
		 * container to be opened and closed when clicked. It also displays a badge count which is the sum of all child
		 * views badge counts. It is implemented as a separate small iframe that is positioned nect to the inbox and animated accordingly. 
		 */
		function renderHandle(){
			// Get the badge count to display - calls individual child views and sums.
			var badgeCount = 0;
			donkyCore._each(views, function(index,view){
				badgeCount += view.getBadgeCount();
			});
			
			// Renders html
			defaults.$handleIFrameId.contents().find("body").html( Mustache.to_html(templates.handleTemplate, {BadgeCount: badgeCount === 0 ? "" : badgeCount}));								
			
			// wire in event handler for clicking the handle to open & close
			defaults.$handleIFrameId.contents().find("#donkyHandle").click(function(){									
				if(isOpen){
					closeInboxContainer(defaults.defaultAnimationTimeout);
				}else{
					openInboxContainer(defaults.defaultAnimationTimeout);
				}
			});			
		}
		
		/**
		 * Resize the height of the iframe when the dimensions change - on iOS devics, specifying 100% width doesn't have the desired effect 
		 */
		function onDimensionsChanged(){			
			 defaults.$iFrameId.css("height", window.innerHeight + "px");
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
                version: "2.0.0.0" 
            };

            donkyCore.registerModule(module);	
			
			// register a service that will export isOpen property. The donkyPushUI module (if present) can display a popup if a new message
			// arrives and the inbox is closed. The popup contains a "View Message" button which opens' the inbox on the message. 
			// This "service" allows the donkyPushLogic module to query the viewstate of the inbox and queue a message if necessary.
			// Also export a showBackButton property based on number of views and what showIndexPage has been set to
			
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
			 * @param {Object} settings - intergrators settings to optionally overide any of the defaults 
			 * @param {Object[]} children - array of child views to insert into index page 
             */
			initialise: function(children, settings){
				
				if(!donkyCore._isArray(children)){
					throw new Error("No views");
				}
				
				if(settings !== undefined){
					donkyCore._extend(defaults, settings);	
				}
													
				jQuery(window).on("resize orientationchange",function(){
				  	onDimensionsChanged();
				});									
								
		        // Decide on mode based on screen width - for a "mobile", we want the inbox to open to full screen
		        if (window.innerWidth <= defaults.desktopCutoffWidth ) {
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
				
				// push module has rendered a popup and user has clicked view button.
				// It only displays a popup if inbox is closed so we need to open
				// Child view will render the message.
				jQuery(document).on("ViewRichMessage ViewChatMessage",function(evt, messageId) {
					openInboxContainer(defaults.defaultAnimationTimeout);
				});
															
				jQuery(document).on("ViewRichInbox",function(evt) {
					openInboxContainer(defaults.defaultAnimationTimeout);
				});

				if(defaults.iFrameId !== null){
					// create the iframe for the inbox
					jQuery("body").append("<iframe id='" + defaults.iFrameId + "' frameborder='0' scrolling='no' ></iframe>");
					// Cache a reference to the jQuery object
					defaults.$iFrameId = jQuery( "#" + defaults.iFrameId); 

					// ideally would use 100% but doesn't behave correctly on iOS devices						
					defaults.iFrameCss.height = window.innerHeight + "px";			
					
					// Apply the iframe css from the defaults
					defaults.$iFrameId.css( defaults.iFrameCss );
				}
				if(defaults.handleIFrameId !== null){
					// create the iframe for the inbox handle
					jQuery("body").append("<iframe id='" + defaults.handleIFrameId + "' frameborder='0' scrolling='no' ></iframe>");
					// Cache a reference to the jQuery object
					defaults.$handleIFrameId = jQuery("#"+defaults.handleIFrameId);
					// Apply the iframe css from the defaults
					defaults.$handleIFrameId.css(defaults.handleIFrameCss);
				}
								
				views = children;
								
				// Load mustache templates for the views																		
				loadTemplates(function(){
								
					// Render doc for container							
					donkyUICommon.renderIframeSrcDoc(defaults.$iFrameId, getIframeSrc(defaults.inboxCssUrls, defaults.inlineInboxCss), function(){

						// explicitly set the width so when we animate the opening and closing of the container the layout doesn't go responsive
						defaults.$iFrameId.contents().find("body").css("width", defaults.notificationIframeMaxWidth + "px");

						if(defaults.handleIFrameId !== null){
							// render doc for the handle 
							donkyUICommon.renderIframeSrcDoc(defaults.$handleIFrameId, getIframeSrc(defaults.handleCssUrls, defaults.inlineHandleCss), function(){								
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
							});
						}
																	
						donkyInboxContainerUI.renderView();
						
						// Back button functionality when inside a child view is decoupled. Using local events to trigger this behaviour.
			            donkyCore.subscribeToLocalEvent("backToHomePage", function(event) {
							if(defaults.showIndexPage){
								renderHomePage();	
							}else{
								closeInboxContainer(defaults.defaultAnimationTimeout);
							}							
			            });	
						
						// New rich message received 
				        donkyCore.subscribeToLocalEvent("NewRichMessagesReceived", function(event) {
							 
							// 1) always update the handle
							renderHandle();
							
							var viewState = donkyUICommon.getInboxViewState();
							// 2) if on homePageTemplate view, refresh (update unread info on menus)
							if(viewState !== null && viewState.view === donkyUICommon.inboxViews.homePage){
								donkyInboxContainerUI.renderView();
							}
						});

						// New chat message received 
				        donkyCore.subscribeToLocalEvent("NewChatMessagesReceived", function(event) {
							 
							// 1) always update the handle
							renderHandle();
							
							var viewState = donkyUICommon.getInboxViewState();
							// 2) if on homePageTemplate view, refresh (update unread info on menus)
							if(viewState !== null && viewState.view === donkyUICommon.inboxViews.homePage){
								donkyInboxContainerUI.renderView();
							}
						});

											
					});					
				});							
			},
            /**
             * Function to render main view
             */
            renderView : function() {
				
				// If we just have a single view we can skip displaying the index and just render the child view. 
				// This gives us the ability to use the iframe container
				if(views.length == 1 && !defaults.showIndexPage){
					views[0].renderView();
				}else{
					// What view are we currently displaying?
					var viewState = donkyCore.donkyData.get("InboxContainerView");
					
					if(viewState !== null && viewState.index  !== -1){
						// We need to render this view
						views[viewState.index].renderView();
						donkyUICommon.setInboxViewState({view: donkyUICommon.inboxViews.homePage});										
					}else{
						// We need to render this index page
						renderHomePage();					
					}					
				}				
            }
		};

		// "static" instance
		donkyInboxContainerUI = new DonkyInboxContainerUI();

		return donkyInboxContainerUI;
	};

	// Require.js initialisation
	if (typeof define === 'function' && define.amd) {
		define('donkyInboxContainerUI', ['donkyCore', 'donkyRichLogic', 'donkyUICommon', 'Mustache' ], function(donkyCore, donkyRichLogic, donkyUICommon, Mustache) { 
            return factory(donkyCore, donkyRichLogic, donkyUICommon, Mustache); 
        });
	} else {
		window.donkyPushUI = factory(window.donkyCore, window.donkyRichLogic, window.donkyUICommon, window.Mustache);
	}

}());

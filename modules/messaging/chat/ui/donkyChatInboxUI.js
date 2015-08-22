/*!
 * donkyChatInboxUI JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyUICommon, Mustache, donkyMessagingCommon) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyUICommon === undefined) {
	        throw new Error("Missing donkyUICommon");
	    }

	    if (Mustache === undefined) {
	        throw new Error("Missing Mustache");
	    }
		
	    if (donkyMessagingCommon === undefined) {
	        throw new Error("Missing donkyMessagingCommon");
	    }
		

		// Private Variables
		//====================

		var donkyChatInboxUI;

        var defaults = { 
			// css files for inbox
			inboxCssUrls: [
				"https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css", 
				donkyCore.installDir + "css/awesome-bootstrap-checkbox.css", 
				donkyCore.installDir + "css/DonkyInboxUI.css"
			],
			// Inline css for inbox
			inboxCss: null,
	        // Location of moustache tamplates for all the views
	        templateURL: donkyCore.installDir + "templates/ChatInboxTemplate.html",
			// THe container to insert the inbox into
			containerId: "body",
			// If using an iframe, the id of it
			iFrameId: "donkyInboxUIContainer",
			// default avatar to use if app-space doesn't have one
			defaultAvatar: donkyCore.installDir + "images/NoImage.png"			
		};
		
		var templates = {};
				
		// Helpers -----------
		//====================

		/**
		 * Return a collection of matched elements from either the current document of the optionally specified iframe
         * @param {String} selector - the selector
         * @returns {Object} - collection of matched elements
		 */
		function getElements(selector, $iFrame){
			if($iFrame === null || $iFrame === undefined){
				return jQuery(selector);
			}else{
				return $iFrame.contents().find(selector);
			}						
		}
		
		/**
		 * Bind an event in either the current document or the optionally specified iframe
		 * @param {String} event - the the event (click, etc ...)
		 * @param {String} selector - the selector
		 * @param {Callback} callback - the callback function to execute when the event fires
		 */
		function renderHtml( template, model, containerId, $iFrame){			
			getElements(containerId, $iFrame).html( Mustache.to_html(template, model));
		}

		/**
		 * Unbind an event in either the current document or the optionally specified iframe
		 * @param {String} event - the the event (click, etc ...)
		 * @param {String} selector - the selector
		 * @param {Callback} callback - the callback function to execute when the event fires
		 */
		function bindEvent( event, selector, $iFrame, callback){
			getElements(selector, $iFrame).bind(event, callback);
		}
		
		
	    /**  
		 * This function loads up all the moustache templates for the individual views and stores them in a templates object.
	     * The url for the templates is specified in the default arguments (donky cdn) and can be overriden if you wish to customize.
	     * Please note that if you customize the templates and host elsewhere, your server will need to support CORS as this will be a 
	     * cross domain request.
	     */
	    function loadTemplates( callback ) {
	
	        jQuery.get(defaults.templateURL, function(response) {
	
				templates.chatInboxTemplate = jQuery(response).filter('#chatInboxTemplate').html(); 
				templates.chatInboxMenuItemTemplate = jQuery(response).filter('#chatInboxMenuItemTemplate').html();
	            callback();
	        });
	    }
		
		
		// donkyChatInboxUI --
		//====================

		/**
		 * @class DonkyChatInboxUI
		 */
		function DonkyChatInboxUI() {
            donkyCore.donkyLogging.infoLog("Constructing DonkyChatInboxUI");
			
            var module = {  
                name: "DonkyChatInboxUI", 
                version: "2.0.0.0" 
            };

            donkyCore.registerModule(module);			
		}

        /**
         *  @memberof DonkyChatInboxUI 
         */
		DonkyChatInboxUI.prototype = {

            /**
             * Function to initialize plugin
			 * @param {Object} settings - intergrators settings to optionally overide any of the defaults 
             */
			initialise: function(settings){
																							
				donkyCore._extend(defaults, settings);
				
				loadTemplates(function(){
													
					// Only render view if we are not running in a container
					if(defaults.iFrameId === null){	
						if(defaults.inboxCssUrls !== null){
							donkyCore._each(defaults.inboxCssUrls, function(index, url){
								donkyUICommon.loadCss(url);
							});												
						}
							
						donkyChatInboxUI.renderView();		
					}else{
						defaults.$iFrame = jQuery("#" + defaults.iFrameId);
					}
				});
			},
            /**
             * Function to render main view
             */
            renderView : function() {
				renderHtml(templates.chatInboxTemplate, {}, defaults.containerId, defaults.$iFrame);
		        // User has clicked a back button so go back to the homepage
		        bindEvent('click', '.backToHomePage', defaults.$iFrame, function() {
		            donkyCore.publishLocalEvent({ type : "backToHomePage", data: {} });
		        });				
            },
            /**
             * Container calls this to determine what to render in the index list for this view.
			 * If clicked, renderView will be called on this object
             */			
			getContainerIndexMarkup : function(){
				return Mustache.to_html(templates.chatInboxMenuItemTemplate, {});
			},
			/**
             * Container calls this to determine what to render in the handle badge.
             */			
			getBadgeCount: function(){
				return 0;
			}
		};

		// "static" instance
		donkyChatInboxUI = new DonkyChatInboxUI();

		return donkyChatInboxUI;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyChatInboxUI', ['donkyCore', 'donkyUICommon', 'Mustache', 'donkyMessagingCommon' ], function(donkyCore, donkyUICommon, Mustache, donkyMessagingCommon) { 
            return factory(donkyCore, donkyUICommon, Mustache, donkyMessagingCommon); 
        });
	} else {
		window.donkyChatInboxUI = factory(window.donkyCore, window.donkyUICommon, window.Mustache, window.donkyMessagingCommon);
	}

}());

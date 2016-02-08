/*!
 * donkyInboxEmbedUI JavaScript Library
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

		var donkyInboxEmbedUI;
		
		var initialised = false;

        var defaults = { 
			// css files for Embed
			inboxCssUrls: [ 
				"https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css", 
				donkyCore.installDir + "css/awesome-bootstrap-checkbox.css", 
				donkyCore.installDir + "css/DonkyInboxUI.css"
			],			
			// override css files 
			inboxCssOverrideUrls: null,
			// Inline css for inbox
			inlineInboxCss: null,
			// The id of the inbox container div
			iFrameContainer: null,			
			// The id of the inbox container iframe
			iFrameId: "donkyInboxUIContainer",
		};
		
		var templates = {};
		
		var inboxView = null;
		
		
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
				templates.homePageTemplate = jQuery(response).filter('#homePageTemplate').html(); 		
	            callback();
	        });
	    }
														
		/**
		 * This is used to generate the inbox container iframe source.
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
				
		// donkyInboxEmbedUI
		//======================

		/**
		 * @class DonkyInboxEmbedUI
		 */
		function DonkyInboxEmbedUI() {
            donkyCore.donkyLogging.infoLog("Constructing DonkyInboxEmbedUI");

            var module = {  
                name: "DonkyInboxEmbedUI", 
                version: "2.0.0.1" 
            };

            donkyCore.registerModule(module);	
			
		}

        /**
         *  @memberof DonkyInboxEmbedUI 
         */
		DonkyInboxEmbedUI.prototype = {

            /**
             * Function to initialize plugin
			 * @param {Object}  inbox - inbox view to host 
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
				
				if(defaults.iFrameContainer !== null){
					
					var $iFrameContainer = jQuery("#" + defaults.iFrameContainer);
					
					if($iFrameContainer.length === 0){
						throw new Error("could not find container");	
					}else if($iFrameContainer.length > 1){
						throw new Error("Container selector returned more than one element");
					}else{						
						$iFrameContainer.append("<iframe id='" + defaults.iFrameId + "' frameborder='0' scrolling='no' style='width:100%;height:100%;'></iframe>");
						defaults.$iFrame = jQuery("#" + defaults.iFrameId);	
						if(defaults.$iFrame.length !== 1){
							throw new Error("Error creating iframe");
						}	
					}
					
				}else{
					throw new Error("No container specified");
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
						defaults.$iFrame.contents().find("body").css("width", defaults.$iFrame.width() + "px");
						
						jQuery(window).on("resize orientationchange",function(event){
                            var width = defaults.$iFrame.width();
                            defaults.$iFrame.contents().find("body").css("width", width + "px");
                            defaults.$iFrame.contents().find(".panel.donkyInboxUI").css("width", width + "px");
						});									
																											
						donkyInboxEmbedUI.renderView();
																							
					});					
				});
																					
				initialised = true;
			},
            /**
             * Function to render main view
             */
            renderView : function() {
								
				donkyCore.donkyLogging.infoLog("DonkyInboxEmbedUI.renderView()");
				defaults.$iFrame.contents().find("body").css("width", defaults.$iFrame.width() + "px");

                inboxView.renderView();
            }
		};

		// "static" instance
		donkyInboxEmbedUI = new DonkyInboxEmbedUI();

		return donkyInboxEmbedUI;
	};

	// Require.js initialisation
	if (typeof define === 'function' && define.amd) {
		define('donkyInboxEmbedUI', ['donkyCore', 'donkyUICommon', 'Mustache' ], function(donkyCore, donkyUICommon, Mustache) { 
            return factory(donkyCore, donkyUICommon, Mustache); 
        });
	} else {
		window.donkyInboxEmbedUI = factory(window.donkyCore, window.donkyUICommon, window.Mustache);
	}

}());

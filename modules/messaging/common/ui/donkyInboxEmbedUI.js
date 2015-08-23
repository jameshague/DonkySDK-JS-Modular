/*!
 * donkyInboxEmbedUI JavaScript Library
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
	        // Location of moustache tamplates for all the views
	        templateURL: donkyCore.installDir + "templates/InboxEmbedTemplate.html",
			// If only one view in container, whether or not to display index page 
			showIndexPage: true							
		};
		
		var templates = {};
		
		var views = null;
		
		var viewIndex = -1;
		
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
			defaults.$iFrame.contents().find("body").html( Mustache.to_html(templates.homePageTemplate, model));

			// Set viewstate so we can redraw correctly is page is refreshed (inbox state, current view etc ... )			
			donkyUICommon.setInboxViewState({view: donkyUICommon.inboxViews.homePage});
			donkyCore.donkyData.set("InboxContainerView", {index: -1 } );

			
			// Setup handlers to navigate into a child view if menuitem is clicked
			defaults.$iFrame.contents().find(".list-group-item").click(function(){
				viewIndex = jQuery(this).data("view-index");
				donkyCore.donkyData.set("InboxContainerView", { index: viewIndex } );
				donkyUICommon.setInboxViewState(null);
				views[viewIndex].renderView();						
			});			
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
			
			var showIndexPageService = {
				showIndexPage: function(){
					return defaults.showIndexPage;
				}				
			};  		
			
			
			donkyCore.registerService("donkyInboxEmbedUIService", showIndexPageService);			
			
		}

        /**
         *  @memberof DonkyInboxEmbedUI 
         */
		DonkyInboxEmbedUI.prototype = {

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
																																																								
				var viewState = donkyCore.donkyData.get("InboxContainerView");
																								
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
																																						
				views = children;
				
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
						
						jQuery(window).on("resize orientationchange",function(){
							var width = defaults.$iFrame.width();
							defaults.$iFrame.contents().find("body").css("width", width + "px");
							// safari doesn't respect the width:inherit rule on the top panel when the parent width dynamically changes
							// HACK: just set it 
							defaults.$iFrame.contents().find(".panel.donkyInboxUI").css("width", width + "px");
						});									
																											
						donkyInboxEmbedUI.renderView();
						
						// Back button functionality when inside a child view is decoupled. Using local events to trigger this behaviour.
						donkyCore.subscribeToLocalEvent("backToHomePage", function(event) {
							if(defaults.showIndexPage){
								renderHomePage();	
							}							
						});	
																	
						// New rich message received 
						donkyCore.subscribeToLocalEvent("NewRichMessagesReceived", function(event) {
							
							var viewState = donkyUICommon.getInboxViewState();
							// 2) if on homePageTemplate view, refresh (update unread info on menus)
							if(viewState !== null && viewState.view === donkyUICommon.inboxViews.homePage){
								donkyInboxEmbedUI.renderView();
							}
						});											
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
				// If we just have a single view we can skip displaying the index and just render the child view. 
				// This gives us the ability to use the iframe container
				if(views.length == 1 && !defaults.showIndexPage){					
					views[0].renderView();
				}else{
					// What view are we currently displaying?
					var viewState = donkyCore.donkyData.get("InboxContainerView");
					
					if(viewState !== null && viewState.index  !== -1){
						// We need to render this view						
						if(viewState.index < views.length ){
							views[viewState.index].renderView();	
						}else{
							// this won't happen in real world.
							views[0].renderView();
						}																
					}else{
						// We need to render this index page
						renderHomePage();					
					}					
				}				
            }
		};

		// "static" instance
		donkyInboxEmbedUI = new DonkyInboxEmbedUI();

		return donkyInboxEmbedUI;
	};

	// Require.js initialisation
	if (typeof define === 'function' && define.amd) {
		define('donkyInboxEmbedUI', ['donkyCore', 'donkyRichLogic', 'donkyUICommon', 'Mustache' ], function(donkyCore, donkyRichLogic, donkyUICommon, Mustache) { 
            return factory(donkyCore, donkyRichLogic, donkyUICommon, Mustache); 
        });
	} else {
		window.donkyInboxEmbedUI = factory(window.donkyCore, window.donkyRichLogic, window.donkyUICommon, window.Mustache);
	}

}());

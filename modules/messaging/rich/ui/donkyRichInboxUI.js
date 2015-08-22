/*!
 * donkyRichInboxUI JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore, donkyRichLogic, donkyUICommon, Mustache, donkyMessagingCommon) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

	    if (donkyRichLogic === undefined) {
	        throw new Error("Missing donkyRichLogic");
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

		var donkyRichInboxUI;
		
		var initialised = false;
		
		var renderViewWhenInitialised = false;
		
        var defaults = { 
			// css files for inbox - if using donkyInboxContainerUI, these will be ignored (see donkyInboxContainerUI defaults)  
			inboxCssUrls: [
				"https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css", 
				donkyCore.installDir + "css/awesome-bootstrap-checkbox.css", 
				donkyCore.installDir + "css/DonkyInboxUI.css"
			],
	        // Location of moustache tamplates for all the views
	        templateURL: donkyCore.installDir + "templates/RichInboxTemplate.html",
			// The container to insert the inbox into - this applies to either inline or iframe setups.
			// If using inline, you will set this to the id of a div you want inbox to go in.
			// Default is body so with an iframe it fills whole page
			containerId: "body",
			// If using an iframe, the id of it - this MUST match the ID the container is using
			iFrameId: "donkyInboxUIContainer",
			// cached selector for iframe i.e. jQuery("#" + iFrameId )  
			$iFrame: null,
			// Default avatar to use if app-space doesn't have one
			defaultAvatar: donkyCore.installDir + "images/NoImage.png",
			// Default message body for sharing  
			defaultShareMessageContent: "Check out this message I received!!"
		};
		
		var templates = {};
		
		// reprasents the height of the container we will be rendering in whethre ityis an iframe or a parent div.
		var viewPortHeight = 0;
		
		var editMode = false;
		
		// object to store messageId's of selected messages to persist checkstates
		var selectedMessages = {};
						
		// Helpers -----------
		//====================


		/**
		 * Renders a popup in the center ofthe screen
         * @param {String} url - the url of the page to render into the popup
         * @param {String} title - the title of the popup
         * @param {Number} w - The width of the popup
		 * @param {Number} w - The height of the popup
		 */
		function PopupCenter(url, title, w, h) {
		    // Fixes dual-screen position                         Most browsers      Firefox
		    var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
		    var dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;
		
		    var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
		    var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
		
		    var left = ((width / 2) - (w / 2)) + dualScreenLeft;
		    var top = ((height / 2) - (h / 2)) + dualScreenTop;
		    var newWindow = window.open(url, title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
		
		    // Puts focus on the newWindow
		    if (window.focus) {
		        newWindow.focus();
		    }
		}
		
		/**
		 * Return a collection of matched elements from either the current document of the optionally specified iframe
         * @param {String} selector - the selector
         * @returns {Object} - collection of matched elements
		 */
		function getElements(selector){
			// Sanity check 			
			if(defaults.iFrameId !== null && defaults.$iFrame === null){					
				throw new Error("No iframe");
			}
								
			if(defaults.$iFrame === null || defaults.$iFrame === undefined){
				return jQuery(selector);				
			}else{
				return defaults.$iFrame.contents().find(selector);
			}	
		}
		
		/**
		 * Render html from a mustache template into a container in either the current document or the optionally specified iframe
		 * @param {String} template - the Mustache template
		 * @param {Object} model - the Model
		 * @param {String} containerId - the container id of the element to render the template into
		 */
		function renderHtml( template, model, containerId){			
			getElements(containerId).html( Mustache.to_html(template, model) );
		}

		/**
		 * Bind an event in either the current document or the optionally specified iframe
		 * @param {String} event - the the event (click, etc ...)
		 * @param {String} selector - the selector
		 * @param {Callback} callback - the callback function to execute when the event fires
		 */
		function bindEvent( event, selector, callback){
			getElements(selector).bind(event, callback);
		}

		/**
		 * Unbind an event in either the current document or the optionally specified iframe
		 * @param {String} event - the the event (click, etc ...)
		 * @param {String} selector - the selector
		 * @param {Callback} callback - the callback function to execute when the event fires
		 */
		function unbindEvent( event, selector){
			getElements(selector).unbind( event );
		}
		
		/**
		 * Function to hide the ExpiredMessagePopup and unbind the click handlers
		 * @param {Callback} callback - callback to call when dialog has faded out
		 */						
		function hideModalExpiredMessagePopup(callback){								
			unbindEvent('click', "#deleteAllExpiredRichMessages");
			unbindEvent('click', "#DeleteExpiredRichMessage");				
			getElements("#richInboxOverlay").fadeOut(100);
			getElements("#richInboxExpiredMessagePopup").fadeOut(100,function(){callback();});
		}

		/**
		 * Show a modal pupup to handle deletion of expired messages.
		 * NOTE: not using bootstrap modal or jqueryUI dialog as don't want to bring in the dependencies.
		 * @param {Callback} button1callback - the callback function to execute when button1 is pressed
		 * @param {Callback} button2callback - the callback function to execute when button1 is pressed
		 */
		function showModalExpiredMessagePopup(deleteAllCallback, deleteCallback){
									
			getElements("#richInboxOverlay").fadeIn(100);
			getElements("#richInboxExpiredMessagePopup").fadeIn(100);
			
			bindEvent('click', "#deleteAllExpiredRichMessages", function(){				
				hideModalExpiredMessagePopup(function(){
					deleteAllCallback();	
				});
			});

			bindEvent('click', "#DeleteExpiredRichMessage", function(){
				hideModalExpiredMessagePopup(function(){
					deleteCallback();		
				});													
			});
		}		
		
		/**
		 * Internal function to show or hide the trashcan based on whether any messages have been selected
		 */
		function showHideTrashCan(){
            var numChecked = getElements('#richInboxListContainer input[type=checkbox]:checked').length;
            if (numChecked > 0) {
                getElements("#deleteSelectedRichMessages").fadeIn(100);
            } else {
                getElements("#deleteSelectedRichMessages").fadeOut(100);
            }				
		}
		
		/**
		 * Function to create the model for the rich inbox view
		 * @param {String} filter - the filter to apply to the messages
		 * @Returns {Object} - the model
		 */
		function getRichInboxModel(filter){
			
	        var richMessages = (filter === "" || filter === undefined || filter === null) ? donkyRichLogic.getAllRichMessages() : donkyRichLogic.filterRichMessages(filter);
	        
			// project raw donky messages objects into model suitable for mustache template
	        var messages = [];
		
	        donkyCore._each(richMessages, function(index,richMessage) {
				
				var expired = donkyRichLogic.isRichMessageExpired(richMessage);
				
	            messages.unshift({
					IsExpired: expired,
	                IsRead: richMessage.isRead,
	                MessageId: richMessage.messageId,
	                AvatarURL: donkyCore.formatAssetUrl(richMessage.avatarAssetId),
	                SenderDisplayName: richMessage.senderDisplayName,
	                Description: richMessage.description,
	                SentTimestamp: !expired ? donkyUICommon.formatDate(richMessage.sentTimestamp) : "EXPIRED",
					SentTimestampRaw: !expired ? richMessage.sentTimestamp : null,
					ExpiryTimestamp: !expired ? donkyRichLogic.getRichMessageExpiryTimeStamp(richMessage) : null,
					Selected: selectedMessages[richMessage.messageId] === true
	            });
	        });
												
			var donkyInboxEmbedUIService = donkyCore.getService("donkyInboxEmbedUIService");
			
			var backButton = defaults.iFrameId !== null;
						
			if(donkyInboxEmbedUIService !== null){
				if(!donkyInboxEmbedUIService.showIndexPage()){
					backButton = false;
				}
			}			
															
			var model = { 
				// Array of messages
				Messages: messages, 
				// The filter text to render back into the input field if redrawing the entire view
				Filter: filter, 
				// Whether to render a back button
				BackButton: backButton,
				// Whether we are in editmodel
				EditMode: editMode				 
			};
			
			return model;
		}

		/**
		 * Function to persist the selected state of a message
		 * param {String} messageId - the messageId
		 * param {Boolean} selected - whether the message is selected or not
		 */
		function saveMessageSelectedState(messageId, selected){
			if(selected){
				selectedMessages[messageId] = true;
			}else{
				delete selectedMessages[messageId];
			}			
		}

		/**
		 * Function to bind all the events associated with the RichInboxView. 
		 * These events only need binding when we draw the entire page
		 */
		function bindRichInboxViewEvents(){
			// Toggle edit mode
			bindEvent('click', '#toggleEditMode', function() {
				
				// Toggle editMode and show/hide the delete button ..
				if(!editMode){						
					showHideTrashCan();
					getElements("#richInboxListContainer").addClass("editMode");
					editMode = true;
				}else{
					getElements("#deleteSelectedRichMessages").fadeOut(100);
					getElements("#richInboxListContainer").removeClass("editMode");
					editMode = false;	
					// deselect all messages
					getElements(".richMessage input[type=checkbox]").prop("checked", false);				
				}
			});
							
	        // user has selected some rich messages and clicked delete - show confirmation dialog and delete if necessary. Redraw at the end.
	        bindEvent('click', '#deleteSelectedRichMessages', function() {
	
	            if (getElements(".richMessage input[type=checkbox]:checked").length > 0) {

					var deleteArray = [];
					var $deleteArray = [];
					getElements(".richMessage").each(function() {
                        var $message = jQuery(this);
                        var $cb = $message.find("input[type=checkbox]");
                        if ($cb.is(":checked")) {
							deleteArray.push($message.data("message-id"));
							$deleteArray.push($message);
                        }
                    });
					
					if(deleteArray.length > 0){						
						donkyCore._each($deleteArray, function(index, $message ){
							$message.fadeOut(500, function(){
								// This callback will fire for each message, we only want to call delete once so just do on the first one ...
								if(index === 0){
									donkyRichLogic.deleteRichMessages(deleteArray);
									selectedMessages = {};
				                    renderRichInbox(true);
									showHideTrashCan();															
								}	
							});	
						});						
					}					
	            }
	        });
			
	        // User has clicked a back button so go back to the homepage
	        bindEvent('click', '.backToHomePage', function() {
	            donkyCore.publishLocalEvent({ type : "backToHomePage", data: {} });
	        });
			
	        // User is applying a filter to rich inbox
	        // We store the filter incase there is a page reload and redraw the inbox 
	        bindEvent('keyup', '#richInboxFilter', function() {
	            var filter = jQuery(this).val();
	            donkyCore.donkyData.set("DonkyRichInboxUIFilter", filter);
				renderRichInbox(true);							                 
	        });
			
	        // User is resetting filter to  rich inbox
	        // We store the filter incase there is a page reload and redraw the inbox 
	        bindEvent('click', '#resetRichInboxFilter', function() {
	            donkyCore.donkyData.remove("DonkyRichInboxUIFilter");
				getElements("#richInboxFilter").val("");
				renderRichInbox(true);							                 
	        });
			
		}

		/**
		 * Function to bind all the events associated with the list of Rich messages. 
		 * These events need binding when we draw the list. 
		 */
		function bindRichInboxListEvents(){
			bindEvent("click", ".richMessage", function(){
	            var messageId = jQuery(this).data("message-id");
					
				if(!editMode){
					// If not editing, clicking a message opens it
		            var msg = donkyRichLogic.getRichMessage( messageId );
		
					if(msg !== null){
						// Expired ?				
						if(!donkyRichLogic.isRichMessageExpired(msg)){
							if(msg !== null){
					            if (!msg.isRead) {
					                donkyRichLogic.markRichMessageRead(messageId);
					                msg.isRead = true;
					            }
					
					            renderRichMessage(msg);									
							}
						}else{
							showModalExpiredMessagePopup(function(){
								donkyRichLogic.removeExpiredMessages();
								renderRichInbox(false);
							}, function(){
				                donkyRichLogic.deleteRichMessage(messageId);
				                renderRichInbox(false);						
							});
						}						
					}					
				}else{
					// If editing, clicking a message selects/unselects it
					var $cb = jQuery(this).find("input[type=checkbox]");
					var checked = !$cb.prop("checked");
					$cb.prop("checked", checked);					
					saveMessageSelectedState(messageId, checked);										 			
					showHideTrashCan();		
				}
			});
				
	        // if you click the checkbox, dont drill down into the message
	        bindEvent("click", '.richMessage .checkbox', function(e) {
	            e.stopPropagation();
	        });
			
	        // user has clicked a checkbox in the rich message list. This will cause a control menu to slide up or down from the bottom
	        // of the screen containing "select all" and "delete" buttons. Similar issue with the div being fixed to the bottom of the 
	        // screen and desktop / mobile views hence the width needing to be explicitly set. 
	        bindEvent('click', '#richInboxListContainer input[type=checkbox]', function() {	     				
				var $cb = jQuery(this);
				// the checkbox has an id the same as the messageId
				saveMessageSelectedState($cb.attr('id'), $cb.is(":checked"));								                       
	            showHideTrashCan();
	        });
			
		}


	    /** 
		 * Renders users inbox of rich messages - If a filter has been specified, this will be applied to the messages.
	     * A view model is constructed from ths raw donky data which is appropriate for the moustache template
		 * @param {Boolean} messagesOnly - whether we are just re-rendering the list of messages or the whole page (filter has been changed)
	     */
	    function renderRichInbox( messagesOnly ) {			
				
			// guard against calls to this before we are initialised 			
			if(initialised){
				
				// guard against calls to this before iframe is created
				if(defaults.iFrameId !== null && defaults.$iFrame === null){
					donkyCore.donkyLogging.warnLog("renderRichInbox() called when iframe not initialised");
					return;
				}
				
				var richMessageFilter = donkyCore.donkyData.get("DonkyRichInboxUIFilter");
							
				var model = getRichInboxModel(richMessageFilter);
				
				if (!messagesOnly) {
					// Render the entireview for this screen								
					renderHtml(templates.richInboxTemplate, model, defaults.containerId);
				}
				
				// just render the list of messages (filter has changed etc ...)
				renderHtml(templates.richInboxListTemplate, model, "#richInboxListContainer");
				
				bindRichInboxListEvents();			
										
				// Only bind the following events when redrawing the entire view
				if(!messagesOnly){							
					bindRichInboxViewEvents();														
				}
				
				donkyUICommon.setInboxViewState({ view: donkyUICommon.inboxViews.richInbox });		
				
				modifyLayout(viewPortHeight);										
			}else{
				donkyCore.donkyLogging.warnLog("renderRichInbox() called when not initialized");
			}
	    }
	
	    /** 
		 * User has drilled into a rich message. This action renders that message. Model is constructed from raw donky data
	     * suitable for the moustache template
		 * @param {Object} message - the rich mesage to render
	     */
	    function renderRichMessage(message){

			if(initialised){
				
				if(defaults.iFrameId !== null && defaults.$iFrame === null){
					donkyCore.donkyLogging.warnLog("renderRichMessage() called when iframe not initialised");
					return;
				}
				
				var isExpired = donkyMessagingCommon.isExpired(message.expiryTimeStamp);						
							
				var model = {
					MessageId: message.messageId,
					SenderDisplayName : message.senderDisplayName,
					SentTimestamp : donkyUICommon.formatDate(message.sentTimestamp),
					AvatarURL : donkyCore.formatAssetUrl(message.avatarAssetId),
					Description : message.description,
					CanShare: !isExpired ? message.canShare : false,
					ShareUrl: encodeURIComponent(message.urlToShare),
					ShareMessage: defaults.defaultShareMessageContent
				};
				
				renderHtml(templates.richMessageTemplate, model, defaults.containerId);
				
				donkyUICommon.renderIframeSrcDoc( getElements("#richMessage"), !isExpired ? message.body : message.expiredBody, function(){
					// onLoad Callback - not using atm ... 
				});
	
				bindEvent("click", ".backToRichInbox", function() {
					renderRichInbox(false);
				});
				
				// User has clicked delete icon on the currently viewed rich message. Similar logic as above.
				bindEvent('click', '.deleteRichMessage', function() {
					var messageId = jQuery(this).data("message-id");
					donkyRichLogic.deleteRichMessage(messageId);
					renderRichInbox(false);
				});
				
				// User has clicked share icon on the currently viewed rich message. Similar logic as above.
				bindEvent('click', '.shareRichMessage', function() {
					getElements("#richMessageControls").slideDown();
				});
	
				// User has clicked close button on the share panel - close it
				bindEvent('click', '#richMessageControlsClose', function() {
					getElements("#richMessageControls").slideUp();
				});
							
				// User has clicked one of the share icons - tell donky about it
				bindEvent('click', '.share-icon', function(event) {
					
					var shareUrl = jQuery(this).attr("href");
					
					if(shareUrl.indexOf("mailto:") === -1 ){
						event.preventDefault();
						PopupCenter(shareUrl, "Share Message", 640, 480);					
					}
					
					var messageId = jQuery(this).data("message-id");
					var sharedTo = jQuery(this).data("shared-to");
					var message = donkyRichLogic.getRichMessage(messageId);
					if(message!==null){
						donkyMessagingCommon.markMessageShared(message, sharedTo);								
					}
					
				});
							
				donkyUICommon.setInboxViewState({view: donkyUICommon.inboxViews.richMessage, messageId: message.messageId});			
				
				modifyLayout(viewPortHeight);
				
			}else{
				donkyCore.donkyLogging.warnLog("renderRichMessage() called when not initialized");
			}												
		}
		
	    /**
		 * This function loads up all the moustache templates for the individual views and stores them in a templates object.
	     * The url for the templates is specified in the default arguments (donky cdn) and can be overriden if you wish to customize.
	     * Please note that if you customize the templates and host elsewhere, your server will need to support CORS as this will be a 
	     * cross domain request.
		 * @param {Callback} callback - the callback to execute when all of the templates have been loaded.
	     */
	    function loadTemplates( callback ) {
	        jQuery.get(defaults.templateURL, function(response) {
	
				templates.richInboxMenuItemTemplate = jQuery(response).filter('#richInboxMenuItemTemplate').html(); 
	            templates.richInboxTemplate = jQuery(response).filter('#richInboxTemplate').html();
	            templates.richInboxListTemplate = jQuery(response).filter('#richInboxListTemplate').html();
	            templates.richMessageTemplate = jQuery(response).filter('#richMessageTemplate').html();
	            callback();
	        });
	    }
		
		/**
		 * This function resizes a few containers based on the container height so that scrolling is optimized given the screen real estate.
		 * @param {Number} viewPortHeight - the height of the viewport
		 */
		function modifyLayout(viewPortHeight){
									
			var viewState = donkyUICommon.getInboxViewState();	
			var panelHeadingHeight, filterHeight;							
									
			switch( viewState.view )
			{
				case donkyUICommon.inboxViews.richInbox:					
					panelHeadingHeight = getElements(".panel-heading").outerHeight();
					filterHeight = getElements(".search-wrapper").outerHeight();					 				
					var listHeight = (viewPortHeight - (panelHeadingHeight + filterHeight)) + "px";
					getElements("#richInboxListContainer").css("height", listHeight);
				break;
				
				case donkyUICommon.inboxViews.richMessage:									
					panelHeadingHeight = getElements(".panel-heading").outerHeight();
					var mesageHeight = (viewPortHeight - panelHeadingHeight) + "px";					
					getElements("#richMessageContainer").css("height", mesageHeight);				
				break;	
				
				default:
					
				break;
			} 
		}		
		
		/**
		 * Function to iterate through all rich messages in the list view and update the sent 
		 * time field and delete any expired messages
		 */
		function updateRichMessagesListView(){
						
			var viewState = donkyUICommon.getInboxViewState();							
																	
			if(viewState !== null && viewState.view == donkyUICommon.inboxViews.richInbox){
			
				var now = new Date();
	
				getElements("#richInboxListContainer .richMessage").each(function(){
					
					var $richMessage = jQuery(this);
					
					var expiryTimestamp = $richMessage.attr("data-expiry-timestamp"); 
					
					var $sentTime = $richMessage.find(".sentTime");
					
					if(expiryTimestamp !== ""){
						var expiry = new Date(expiryTimestamp);
						
						if(now > expiry){
							$richMessage.addClass("expired");
							$richMessage.find( ".sentTime").text("EXPIRED");
							$richMessage.removeAttr("data-expiry-timestamp");
							$sentTime.removeAttr("data-time-stamp");						
						}					
					}
													
					var timeStamp = $sentTime.attr("data-time-stamp");
					
					if(timeStamp !== ""){
						var formatted = donkyUICommon.formatDate(timeStamp);
						$sentTime.text(formatted);					
					}
				});			
			}								
		}
		
		/**
		 * Cancel any pending push messages that are directing the user to rich messages
		 */
		function deletePendingInboxPushNotifications(){
			var donkyPushLogic = donkyCore.getService("donkyPushLogic");
			
			if(donkyPushLogic!==null){
				donkyPushLogic.deleteMessagesByCreator("newRichMessages");				
			}			
		}
		
		/**
		 * 
		 */
		function initialiseIframe(){
			defaults.$iFrame = jQuery("#" + defaults.iFrameId);
										
			if(defaults.$iFrame.length === 0){
				defaults.$iFrame = null;
				throw new Error("Error creating iframe");
			}										
										
			viewPortHeight = defaults.$iFrame.height();		
			
			jQuery(window).on("resize orientationchange",function(){												
				
				// if running in donkyInboxContainerUI, the iframe won't have resized yet so 
				// schedule this rather than do it now ...
				setTimeout(function(){
				try{
					
					if(defaults.iFrameId === null){
						viewPortHeight = jQuery(defaults.containerId).height();
					}else{
						viewPortHeight = defaults.$iFrame.height();
					}
					
					modifyLayout(viewPortHeight);	  
				}catch(e){
					donkyCore.donkyLogging.debugLog(e);
				}						  
					
				}, 0);  
			});																
		}
				
		// donkyRichInboxUI --
		//====================

		/**
		 * @class DonkyRichInboxUI
		 */
		function DonkyRichInboxUI() {
            donkyCore.donkyLogging.infoLog("Constructing DonkyRichInboxUI");
			
            var module = {  
                name: "DonkyRichInboxUI", 
                version: "2.0.1.0" 
            };

            donkyCore.registerModule(module);			
		}

        /**
         *  @memberof DonkyRichInboxUI 
         */
		DonkyRichInboxUI.prototype = {

            /**
             * Function to initialize plugin
			 * @param {Object} settings - intergrators settings to optionally overide any of the defaults
			 * @param {Callback} callback - optional callback to call when initialise has finished
             */
			initialise: function(settings, callback){
																																								
				donkyCore._extend(defaults, settings);
				
				loadTemplates(function(){
					
					// Update the sent time fields every minute																	
					setInterval(updateRichMessagesListView, 60000);																						
								
		            donkyCore.subscribeToLocalEvent("NewRichMessagesReceived", function(event) {
						
						var viewState = donkyUICommon.getInboxViewState();								
												
						if( viewState.view == donkyUICommon.inboxViews.richInbox){
							// Only render inbox view if currently on the list view ...
							renderRichInbox(false);	
						}
						// this service may be registered, if it is use it ...
						var donkyAudio = donkyCore.getService("donkyAudio");
						
						if(donkyAudio !== null){
							if(donkyCore._isFunction(donkyAudio.playSound)){
								donkyAudio.playSound(donkyMessagingCommon.messageTypes.rich);
							}
						}
		            });
															
					jQuery(document).on("ViewRichMessage",function(evt, messageId) {
						deletePendingInboxPushNotifications();
						var message = donkyRichLogic.getRichMessage(messageId);
						// may have been garbage collected
						if(message !== null){
														
				            if (!message.isRead) {
				                donkyRichLogic.markRichMessageRead(messageId);
				                message.isRead = true;
				            }
							
							renderRichMessage(message);
						}						
					});
					
					jQuery(document).on("ViewRichInbox",function(evt) {
						deletePendingInboxPushNotifications();
						renderRichInbox(false);
					});	
					
					// Only render view if we are not running in a container
					if(defaults.iFrameId === null){	
						
						viewPortHeight = jQuery(defaults.containerId).height(); 
												
						if(defaults.inboxCssUrls !== null){
							donkyCore._each(defaults.inboxCssUrls, function(index, url){
								donkyUICommon.loadCss(url);
							});												
						}	
						
						donkyRichInboxUI.renderView();		
					}
										
					initialised = true;	
					
					// Did someone call renderView before we were initialised ? if so, honour this now
					if(renderViewWhenInitialised){
						renderViewWhenInitialised = false;
						donkyRichInboxUI.renderView();
					}
					
					// Completion callback supplied ? 
					if(donkyCore._isFunction(callback)){
						callback();
					}								
				});
			},
            /**
             * Function to render main view
             */
            renderView : function() {
				
				/**
				 * There is a chance we haven't finished initialisation yet (async load of templates)
				 * if that is the case, set a boolean to call renderView() jusr before we exit the initialisation function
				 */				 				
				if(initialised){
					
					/**
					 * If running in a container, they are responsible for creating the iframe so dont
					 * bind to it until we get a call to render as it wont have been created until now
					 */
					if(defaults.iFrameId !== null && defaults.$iFrame === null){											
						initialiseIframe(); 
					}
					
					var viewState = donkyUICommon.getInboxViewState();							
																	
					if(viewState !== null && viewState.view == donkyUICommon.inboxViews.richMessage){
						var message = donkyRichLogic.getRichMessage(viewState.messageId);
						// may have been garbage collected
						if(message !== null){
							renderRichMessage(message);
						}else{
							renderRichInbox(false);
						}												
					}else{
						renderRichInbox(false);
					}										
				}else{
					// do this when initialize has finished 
					renderViewWhenInitialised = true;
				}
            },
            /**
             * Container calls this to determine what to render in the index list for this view.
			 * If clicked, renderView will be called on this object
             */			
			getContainerIndexMarkup : function(){
				return Mustache.to_html(templates.richInboxMenuItemTemplate, donkyRichLogic.getMessageCount());
			},
            /**
             * Container calls this to determine what to render in the handle badge.
             */			
			getBadgeCount: function(){
				return donkyRichLogic.getMessageCount().unreadRichMessageCount;
			}
		};

		// "static" instance
		donkyRichInboxUI = new DonkyRichInboxUI();

		return donkyRichInboxUI;
	};
	
	// require.js setup
	if (typeof define === 'function' && define.amd) {
		define('donkyRichInboxUI', ['donkyCore', 'donkyRichLogic', 'donkyUICommon', 'Mustache', 'donkyMessagingCommon' ], 
			function(donkyCore, donkyRichLogic, donkyUICommon, Mustache, donkyMessagingCommon) { 
            	return factory(donkyCore, donkyRichLogic, donkyUICommon, Mustache, donkyMessagingCommon); 
        });
	} else {
		window.donkyRichInboxUI = factory(window.donkyCore, window.donkyRichLogic, window.donkyUICommon, window.Mustache, window.donkyMessagingCommon);
	}

}());

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
			defaultShareMessageContent: "Check out this message I received!!",
            // Boolean to control whether to display the new Rich Message popup if inbox ix in closed state (default is true)
            showRichMessagePopup: true,
            // The title for a new rich message notification - This is a Mustache template - {{SenderName}} can be used within the template.
            // Note: the message body will be the rich message desacription. 
            richMessagePopupTitle: "New: <em>{{SenderName}}</em>",
            // The title for multiple new rich messages notification
            richMessagesPopupTitle: "<em>{{Count}}</em> New Messages",
            // The body for multiple new rich messages notification
            richMessagesPopupBody: "You have received {{Count}} new messages. Would you like to view them now?",
            // Button text for the dismiss button
            richMessagePopupDismissText: "Dismiss",
            // Button text for the view messgae button (clicking this button opens the inbox on the message)
            richMessagePopupViewText: "View"            
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
		 * Function to hide the ExpiredMessagePopup and unbind the click handlers
		 * @param {Callback} callback - callback to call when dialog has faded out
		 */						
		function hideModalExpiredMessagePopup(callback){								
			donkyUICommon.unbindEvent(defaults.$iFrame, 'click', "#deleteAllExpiredRichMessages");
			donkyUICommon.unbindEvent(defaults.$iFrame, 'click', "#DeleteExpiredRichMessage");				
			donkyUICommon.getElements(defaults.$iFrame, "#richInboxOverlay").fadeOut(100);
			donkyUICommon.getElements(defaults.$iFrame, "#richInboxExpiredMessagePopup").fadeOut(100,function(){callback();});
		}

		/**
		 * Show a modal pupup to handle deletion of expired messages.
		 * NOTE: not using bootstrap modal or jqueryUI dialog as don't want to bring in the dependencies.
		 * @param {Callback} button1callback - the callback function to execute when button1 is pressed
		 * @param {Callback} button2callback - the callback function to execute when button1 is pressed
		 */
		function showModalExpiredMessagePopup(deleteAllCallback, deleteCallback){
									
			donkyUICommon.getElements(defaults.$iFrame, "#richInboxOverlay").fadeIn(100);
			donkyUICommon.getElements(defaults.$iFrame, "#richInboxExpiredMessagePopup").fadeIn(100);
			
			donkyUICommon.bindEvent(defaults.$iFrame, 'click', "#deleteAllExpiredRichMessages", function(){				
				hideModalExpiredMessagePopup(function(){
					deleteAllCallback();	
				});
			});

			donkyUICommon.bindEvent(defaults.$iFrame, 'click', "#DeleteExpiredRichMessage", function(){
				hideModalExpiredMessagePopup(function(){
					deleteCallback();		
				});													
			});
		}		
		
		/**
		 * Internal function to show or hide the trashcan based on whether any messages have been selected
		 */
		function showHideTrashCan(){
            var numChecked = donkyUICommon.getElements(defaults.$iFrame, '#richInboxListContainer input[type=checkbox]:checked').length;
            if (numChecked > 0) {
                donkyUICommon.getElements(defaults.$iFrame, "#deleteSelectedRichMessages").fadeIn(100);
            } else {
                donkyUICommon.getElements(defaults.$iFrame, "#deleteSelectedRichMessages").fadeOut(100);
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
																														
			var model = { 
				// Array of messages
				Messages: messages, 
				// The filter text to render back into the input field if redrawing the entire view
				Filter: filter, 
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
			donkyUICommon.bindEvent(defaults.$iFrame, 'click', '#toggleEditMode', function() {
				
				// Toggle editMode and show/hide the delete button ..
				if(!editMode){						
					showHideTrashCan();
					donkyUICommon.getElements(defaults.$iFrame, "#richInboxListContainer").addClass("editMode");
					editMode = true;
				}else{
					donkyUICommon.getElements(defaults.$iFrame, "#deleteSelectedRichMessages").fadeOut(100);
					donkyUICommon.getElements(defaults.$iFrame, "#richInboxListContainer").removeClass("editMode");
					editMode = false;	
					// deselect all messages
					donkyUICommon.getElements(defaults.$iFrame, ".richMessage input[type=checkbox]").prop("checked", false);				
				}
			});
							
	        // user has selected some rich messages and clicked delete - show confirmation dialog and delete if necessary. Redraw at the end.
	        donkyUICommon.bindEvent(defaults.$iFrame, 'click', '#deleteSelectedRichMessages', function() {
	
	            if (donkyUICommon.getElements(defaults.$iFrame, ".richMessage input[type=checkbox]:checked").length > 0) {

					var deleteArray = [];
					var $deleteArray = [];
					donkyUICommon.getElements(defaults.$iFrame, ".richMessage").each(function() {
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
						
	        // User is applying a filter to rich inbox
	        // We store the filter incase there is a page reload and redraw the inbox 
	        donkyUICommon.bindEvent(defaults.$iFrame, 'keyup', '#richInboxFilter', function() {
	            var filter = jQuery(this).val();
	            donkyCore.donkyData.set("DonkyRichInboxUIFilter", filter);
				renderRichInbox(true);							                 
	        });
			
	        // User is resetting filter to  rich inbox
	        // We store the filter incase there is a page reload and redraw the inbox 
	        donkyUICommon.bindEvent(defaults.$iFrame, 'click', '#resetRichInboxFilter', function() {
	            donkyCore.donkyData.remove("DonkyRichInboxUIFilter");
				donkyUICommon.getElements(defaults.$iFrame, "#richInboxFilter").val("");
				renderRichInbox(true);							                 
	        });
			
		}

		/**
		 * Function to bind all the events associated with the list of Rich messages. 
		 * These events need binding when we draw the list. 
		 */
		function bindRichInboxListEvents(){
			donkyUICommon.bindEvent(defaults.$iFrame, "click", ".richMessage", function(){
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
	        donkyUICommon.bindEvent(defaults.$iFrame, "click", '.richMessage .checkbox', function(e) {
	            e.stopPropagation();
	        });
			
	        // user has clicked a checkbox in the rich message list. This will cause a control menu to slide up or down from the bottom
	        // of the screen containing "select all" and "delete" buttons. Similar issue with the div being fixed to the bottom of the 
	        // screen and desktop / mobile views hence the width needing to be explicitly set. 
	        donkyUICommon.bindEvent(defaults.$iFrame, 'click', '#richInboxListContainer input[type=checkbox]', function() {	     				
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
					donkyUICommon.renderHtml(defaults.$iFrame, templates.richInboxTemplate, model, defaults.containerId);
				}
				
				// just render the list of messages (filter has changed etc ...)
				donkyUICommon.renderHtml(defaults.$iFrame, templates.richInboxListTemplate, model, "#richInboxListContainer");
				
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
				
				donkyUICommon.renderHtml(defaults.$iFrame, templates.richMessageTemplate, model, defaults.containerId);
				
				donkyUICommon.renderIframeSrcDoc( donkyUICommon.getElements(defaults.$iFrame, "#richMessage"), !isExpired ? message.body : message.expiredBody, function(){
					// onLoad Callback - not using atm ... 
				});
	
				donkyUICommon.bindEvent(defaults.$iFrame, "click", ".backToRichInbox", function() {
					renderRichInbox(false);
				});
				
				// User has clicked delete icon on the currently viewed rich message. Similar logic as above.
				donkyUICommon.bindEvent(defaults.$iFrame, 'click', '.deleteRichMessage', function() {
					var messageId = jQuery(this).data("message-id");
					donkyRichLogic.deleteRichMessage(messageId);
					renderRichInbox(false);
				});
				
				// User has clicked share icon on the currently viewed rich message. Similar logic as above.
				donkyUICommon.bindEvent(defaults.$iFrame, 'click', '.shareRichMessage', function() {
					donkyUICommon.getElements(defaults.$iFrame, "#richMessageControls").slideDown();
				});
	
				// User has clicked close button on the share panel - close it
				donkyUICommon.bindEvent(defaults.$iFrame, 'click', '#richMessageControlsClose', function() {
					donkyUICommon.getElements(defaults.$iFrame, "#richMessageControls").slideUp();
				});
							
				// User has clicked one of the share icons - tell donky about it
				donkyUICommon.bindEvent(defaults.$iFrame, 'click', '.share-icon', function(event) {
					
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
									
			// safari doesn't respect the width:inherit rule on the top panel when the parent width dynamically changes
			// HACK: just set it 
			if(defaults.iFrameId !== null){
				var bodyWidth = donkyUICommon.getElements(defaults.$iFrame, defaults.containerId).width();			
				donkyUICommon.getElements(defaults.$iFrame, ".panel.donkyInboxUI").css("width", bodyWidth + "px");				
			}																		
												
			switch( viewState.view )
			{
				case donkyUICommon.inboxViews.richInbox:					
					panelHeadingHeight = donkyUICommon.getElements(defaults.$iFrame, ".panel-heading").outerHeight();
					filterHeight = donkyUICommon.getElements(defaults.$iFrame, ".search-wrapper").outerHeight();					 				
					var listHeight = (viewPortHeight - (panelHeadingHeight + filterHeight)) + "px";
					donkyUICommon.getElements(defaults.$iFrame, "#richInboxListContainer").css("height", listHeight);
				break;
				
				case donkyUICommon.inboxViews.richMessage:									
					panelHeadingHeight = donkyUICommon.getElements(defaults.$iFrame, ".panel-heading").outerHeight();
					var mesageHeight = (viewPortHeight - panelHeadingHeight) + "px";					
					donkyUICommon.getElements(defaults.$iFrame, "#richMessageContainer").css("height", mesageHeight);				
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
	
				donkyUICommon.getElements(defaults.$iFrame, "#richInboxListContainer .richMessage").each(function(){
					
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
                version: "2.0.1.1" 
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
                        
                        if(defaults.showRichMessagePopup){
                            // we need the container service ...
                            var containerService = donkyCore.getService("donkyInboxContainerUIService");
                            // inbox must be closed too ...
                             if (containerService !== null && !containerService.isOpen()){

                                var donkyPushLogic = donkyCore.getService("donkyPushLogic");
                                
                                if(donkyPushLogic !== null){

                                    var messages = event.data;

                                    var silent = true;

                                    donkyCore._each(messages, function(index, message){
                                        if(!message.silentNotification){
                                            silent = false;
                                        }
                                    });

                                    if(!silent){
                                        if(messages.length === 1){

                                            donkyPushLogic.queueCustomPopup(
                                                            "newRichMessages", 
                                                            Mustache.to_html(defaults.richMessagePopupTitle, {SenderName: messages[0].senderDisplayName}),
                                                            messages[0].description,
                                                            donkyRichLogic.getRichMessageExpiryTimeStamp(messages[0]), 
                                                            null,
                                                            "jQuery(document).trigger('ViewRichMessage', ['" + messages[0].messageId + "']);", 
                                                            defaults.richMessagePopupDismissText, 
                                                            defaults.richMessagePopupViewText);
                                        }else{

                                            donkyPushLogic.queueCustomPopup(
                                                            "newRichMessages", 
                                                            Mustache.to_html(defaults.richMessagesPopupTitle, {Count: messages.length}),
                                                            Mustache.to_html(defaults.richMessagesPopupBody, {Count: messages.length}),
                                                            donkyRichLogic.getRichMessageExpiryTimeStamp(messages[0]),                                            
                                                            null,
                                                            "jQuery(document).trigger('ViewRichInbox');", 
                                                            defaults.richMessagePopupDismissText, 
                                                            defaults.richMessagePopupViewText );
                                        }
                                    }                                                    
                                }
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

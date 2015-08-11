/*!
 * donkyUICommon JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore) {

	var donkyUICommon;

	// HelPrivate members
	//====================
        
        var inboxViews = {
                homePage: 0,
                richInbox: 1,
                richMessage: 2,
                chatInbox: 3,
                chatConversation: 4,
                attachmentCarousel: 5,
                profilePage: 6,
                contacts: 7
        };
        
		
        var srcDocSupported = !!("srcdoc" in document.createElement("iframe"));

	// donkyUICommon --------
	//====================

	/**
	 * @class DonkyUICommon
	 */
	function DonkyUICommon() {
                donkyCore.donkyLogging.infoLog("Constructing DonkyUICommon");
	}

        /**
         *  @memberof DonkyUICommon 
         */
	DonkyUICommon.prototype = {
            /**
             *  Enum for inboxViews
             *  @readonly
             *  @enum {number}
             */    
            inboxViews : inboxViews,
            getInboxViewState: function(){
                return  donkyCore.donkyData.get("DonkyRichInboxUIViewState");
            },
            setInboxViewState: function(viewState){
                donkyCore.donkyData.set("DonkyRichInboxUIViewState", viewState);
            },            
            /** Formats an ISO date using humane_date.
             *  @param {String} isoDateString - iso Date String
             */
            formatDate : function(isoDateString){
                    
                var daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                
                var date = new Date(isoDateString),
        			diff = (((new Date()).getTime() - date.getTime()) / 1000),
        			day_diff = Math.floor(diff / 86400);
        		
		if ( isNaN(day_diff) || day_diff < 0  )
			return;
		
		return day_diff === 0 && (
                                // < 5 mons
				diff < 300 && "just now" ||
                                // < 1 hour
				diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
                                // same day
				diff < 7200 && "1 hour ago" ||
				diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
                                // yesterday
			day_diff == 1 && "Yesterday" ||
                        // < 7 days ago 
			day_diff < 7 && daysOfWeek[date.getDay()] ||
                        // >= 7 days ago
			day_diff >= 7 && date.toLocaleDateString();	                    
            },
            /**
             * Internal function to load a script into the current document
             * @param {String} url
             */
            loadScript : function(url) {
                var js_script = document.createElement('script');
                js_script.type = "text/javascript";
                js_script.src = url;
                js_script.async = false;
                document.getElementsByTagName('head')[0].appendChild(js_script);
            },

            /**
             * Internal function to load a stylesheet into the current document
             * @param {String} url
             */
            loadCss : function(url) {
                var fileref = document.createElement("link");
                fileref.setAttribute("rel", "stylesheet");
                fileref.setAttribute("type", "text/css");
                fileref.setAttribute("href", url);
                document.getElementsByTagName('head')[0].appendChild(fileref);
            },
            /**
             * Internal function to render html into an iframe. If srcdoc attrib is supported it is used,
             * otherwise a fallback is utilised.
             * @param {Object} $id - jquery selector of the iframe
             * @param {String} html - THe HTML to render into the iframe
             * @param {Callback} callback - the (optional) callback to call when the html has been loaded
             */
            renderIframeSrcDoc : function($id, html, callback) {

                if (donkyCore._isFunction(callback)) {
                    $id.load(function() { callback(jQuery(this)); });
                }
        
                if (srcDocSupported) {
                    $id.attr("srcdoc", html);
                } else {
                    var iframeDocument = $id[0].contentWindow.document;
                    iframeDocument.open('text/html', 'replace');
                    iframeDocument.write(html);
                    iframeDocument.close();
                }
            },
            isiOS : function(){
                 return navigator.userAgent.match(/iPad|iPhone|iPod/g) ? true : false;   
            }
            
            
		};

		// "static" instance
		donkyUICommon = new DonkyUICommon();

		return donkyUICommon;
	};

	if (typeof define === 'function' && define.amd) {
                define('donkyUICommon', ['donkyCore'], function(donkyCore){return factory(donkyCore);});
	} else {
		/*jshint sub:true */
		window['donkyUICommon'] = factory(window.donkyCore);
	}

}());

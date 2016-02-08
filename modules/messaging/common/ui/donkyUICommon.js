/*!
 * donkyUICommon JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */
(function() {
    var factory = function(donkyCore, Mustache) {

        if (donkyCore === undefined) {
            throw new Error("Missing donkyCore");
        }

        if (Mustache === undefined) {
            throw new Error("Missing Mustache");
        }

        var donkyUICommon;

        // Private members
        //====================

        var inboxViews = {
            richInbox: 1,
            richMessage: 2
        };


        /**
         * Internal function to determine whether browser is iOS
         */
        function isiOS(){
            return navigator.userAgent.match(/iPad|iPhone|iPod/g) ? true : false;
        }
        
        /**
         * Internal function to determine whether browser is Firefox
         */
        function isFirefox(){
            return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        }

        /**
         * Firefox creates a history entry which ruins the UI when you hit the back button so don't use srcdoc on ANY firefox browser ;-(
         */
        var srcDocSupported = !isFirefox() ? !!("srcdoc" in document.createElement("iframe")) : false;

        // donkyUICommon -----
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
            inboxViews: inboxViews,
            /**
             * Function to get the inbox view state (depracated - split view makes this obsolete)
             */
            getInboxViewState: function() {
                return donkyCore.donkyData.get("DonkyInboxUIViewState");
            },
            /**
             * Function to set the inbox view state (depracated - split view makes this obsolete)
             * @param {Object} viewState - the viewstate
             */
            setInboxViewState: function(viewState) {
                donkyCore.donkyData.set("DonkyInboxUIViewState", viewState);

                donkyCore.donkyLogging.infoLog("setInboxViewState() : " + JSON.stringify(viewState));
            },
            /** 
             * Formats an ISO date using humane_date.
             * @param {String} isoDateString - iso Date String
             */
            formatDate: function(isoDateString) {

                var daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                var date = new Date(isoDateString),
                    diff = (((new Date()).getTime() - date.getTime()) / 1000),
                    day_diff = Math.floor(diff / 86400);

                if (isNaN(day_diff) || day_diff < 0)
                    return;

                return day_diff === 0 && (
                        // < 5 mons
                        diff < 300 && "just now" ||
                        // < 1 hour
                        diff < 3600 && Math.floor(diff / 60) + " minutes ago" ||
                        // same day
                        diff < 7200 && "1 hour ago" ||
                        diff < 86400 && Math.floor(diff / 3600) + " hours ago") ||
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
            loadScript: function(url) {
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
            loadCss: function(url) {
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
            renderIframeSrcDoc: function($id, html, callback) {

                if (donkyCore._isFunction(callback)) {
                    $id.load(function() {
                        callback(jQuery(this));
                    });
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
            /**
             * Return a collection of matched elements from either the current document of the optionally specified iframe
             * @param {Object} $iFrame - jQuery object for the iframe (null if not using an iframe)         
             * @param {String} selector - the selector
             * @returns {Object} - collection of matched elements
             */
            getElements : function ($iFrame, selector){
                if($iFrame === null || $iFrame === undefined){
                    return jQuery(selector);
                }else{
                    if(donkyCore._isFunction($iFrame.contents)){
                        return $iFrame.contents().find(selector);    
                    }
                    else{
                        /* jshint debug: true */
                        /*debugger;*/
                    }
                }        
            },
            /**
             * Render html from a mustache template into a container in either the current document or the optionally specified iframe
             * @param {Object} $iFrame - jQuery object for the iframe (null / undefined if not using an iframe)         
             * @param {String} containerId - the container id of the element to render the template into
             * @param {String} htm - the html to render
             */
            renderRawHtml : function($iFrame, containerId, html){                 
                donkyUICommon.getElements($iFrame, containerId).html(html);
            },
            
            /**
             * Render html from a mustache template into a container in either the current document or the optionally specified iframe
             * @param {Object} $iFrame - jQuery object for the iframe (null if not using an iframe)         
             * @param {String} template - the Mustache template
             * @param {Object} model - the Model
             * @param {String} containerId - the container id of the element to render the template into
             */
            renderHtml : function($iFrame, template, model, containerId){                 
                donkyUICommon.getElements($iFrame, containerId).html( Mustache.to_html(template, model));
            },

            /**
             * Render html from a mustache template into a container in either the current document or the optionally specified iframe
             * @param {String} template - the Mustache template
             * @param {Object} model - the Model
             * @returns {String} - the rendered html
             */
            renderHtmlToString : function(template, model){                  
                return Mustache.to_html(template, model);
            },

            /**
             * Bind an event in either the current document or the optionally specified iframe
             * @param {Object} $iFrame - jQuery object for the iframe (null if not using an iframe)                  
             * @param {String} event - the the event (click, etc ...)
             * @param {String} selector - the selector
             * @param {Callback} callback - the callback function to execute when the event fires
             */
            bindEvent : function($iFrame, event, selector, callback){
                donkyUICommon.getElements($iFrame, selector).bind(event, callback);
            },
            /**
             * Unbind an event in either the current document or the optionally specified iframe
             * @param {Object} $iFrame - jQuery object for the iframe (null if not using an iframe)                  
             * @param {String} event - the the event (click, etc ...)
             * @param {String} selector - the selector
             */
            unbindEvent : function($iFrame, event, selector){
                donkyUICommon.getElements($iFrame, selector).unbind(event);
            },
            /**
             * Internal function to determine whether browser is iOS
             */
            isiOS : function(){
                return isiOS();
            },        
            /**
             * Internal function to determine whether browser is Firefox
             */
            isFirefox : function(){
                return isFirefox();
            },
            /**
             * Function to get the dimensions of an elemnet
             * @param {Object} $element - jQuery object for the element
             * @returns {Object} - returns object containing width & height properties
             */
            getDimensions : function($element){
                
                var dimensions = {
                    width: $element.outerWidth(true),
                    height: $element.outerHeight(true)                    
                };      

                // donkyCore.donkyLogging.infoLog("id: " + $element.attr("id") + " width: " + dimensions.width + " height: " + dimensions.height);              

                return dimensions;
            },
        };

        // "static" instance
        donkyUICommon = new DonkyUICommon();

        return donkyUICommon;
    };

    if (typeof define === 'function' && define.amd) {
        define('donkyUICommon', ['donkyCore', 'Mustache'], function(donkyCore, Mustache) {
            return factory(donkyCore, Mustache);
        });
    } else {
        /*jshint sub:true */
        window['donkyUICommon'] = factory(window.donkyCore, window.Mustache);
    }

}());
/*!
 * donkyUICommon JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function () {

		var donkyUICommon;

		// Helpers -----------
		//====================
		
        var srcDocSupported = !!("srcdoc" in document.createElement("iframe"));

		// donkyUICommon --------
		//====================

		/**
		 * @constructor
		 */
		function DonkyUICommon() {
            console.log("Constructing DonkyUICommon");
		}

		DonkyUICommon.prototype = {

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

                if ($.isFunction(callback)) {
                    $id.load(function() { callback($(this)); });
                }
        
                if (srcDocSupported) {
                    $id.attr("srcdoc", html);
                } else {
                    var iframeDocument = $id[0].contentWindow.document;
                    iframeDocument.open('text/html', 'replace');
                    iframeDocument.write(html);
                    iframeDocument.close();
                }
            }
		};

		// "static" instance
		donkyUICommon = new DonkyUICommon();

		return donkyUICommon;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyUICommon', [], factory);
	} else {
		/*jshint sub:true */
		window['donkyUICommon'] = factory();
	}

}());

/*!
 * DonkyAssets JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

(function () {
	var factory = function (donkyCore) {

	    if (donkyCore === undefined) {
	        throw new Error("Missing donkyCore");
	    }

		var _instance;

		// Helpers -----------
		//====================



		/**
		 * Function to parse out the actaul base64 data from a dataUrl - in the below example we just need "iVBORw0K...."
		 * data:image/png;base64,iVBORw0K....
		 * @param {String} dataUrl - the dataUrl
		 * @returns {String} returns the base64 data
		 */ 
		function extractDataFromDataUrl(dataUrl){

        	// we only want the base64 data from the string ...
			var dataIndex = dataUrl.indexOf("base64,");
			if(dataIndex !== -1){
				return dataUrl.substring(dataIndex + 7);
			}else{
				return null;
			}
		}

		/**
		 * Function to parse out the mimen type from the data url - in the below example we just need "image/png"
		 * data:image/png;base64,iVBORw0K....
		 * @param {String} dataUrl - the dataUrl
	     * @returns {String} - returns the mime type
		 */
		function getMimeTypeFromDataUrl(dataUrl){
		  var dataIndex = dataUrl.indexOf("base64,");
		  var mimeIndex = 5;

		  return dataUrl.substring(mimeIndex, dataIndex - 1);
		}



		/**
		 * Function to convert a Base64 String To an ArrayBuffer
		 * @param {String} base64 - the base64 string data to convert
		 * @returns {ArrayBuffer} - returns an ArrayBuffer
		 */
		function convertBase64StringToArrayBuffer(base64){
			var binary_string =  window.atob(base64);
		    var len = binary_string.length;
		    var bytes = new Uint8Array( len );
		    for (var i = 0; i < len; i++){
		        bytes[i] = binary_string.charCodeAt(i);
		    }
		    return bytes.buffer;			
		}

		/**
		 * Function to resize an image (DOES NOT MAINTAIN ASPECT RATIO)
		 * @param {String} dataUrl - the dataUrl representing the original image (created from file.readAsDataURL())
		 * @param {String} mimeType - the mimeType to convert to  
		 * @param {String} width - the desired width
		 * @param {String} height - the desired height
		 * @param {String} callback - the callback to return the converted image as an arraybuffer
		 */
		function createThumbnail(dataUrl, mimeType, width, height, callback) {

			// Create and initialize two canvas
			var canvas = document.createElement("canvas");
			var ctx = canvas.getContext("2d");
			var canvasCopy = document.createElement("canvas");
			var copyContext = canvasCopy.getContext("2d");

			// Create original image
			var img = new Image();

			img.src = dataUrl;

			img.onload = function(){

				// Draw original image in second canvas
				canvasCopy.width = img.width;
				canvasCopy.height = img.height;
				copyContext.drawImage(img, 0, 0);

				// Copy and resize second canvas to first canvas
				canvas.width = width;
				canvas.height = height;
				ctx.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvas.width, canvas.height);

				var dataUrl = canvas.toDataURL(mimeType);

				var data = extractDataFromDataUrl(dataUrl);

				callback(convertBase64StringToArrayBuffer(data));			
			};
		}


		/**
		 * 
		 */
		function _uploadAsset(arrayBuffer, asset, assetType, callback){

	        var environment = donkyCore.donkyData.get("environment");
	        var scheme = donkyCore.donkyData.get("scheme");

            var xhr = new XMLHttpRequest();

            var url = scheme + environment + donkyCore.donkyNetwork.api.secure + "asset"; 
            
            xhr.open('POST', url);

            xhr.setRequestHeader("AssetMetaData", "{ 'MimeType': '" + asset.mimeType + "', 'Type': '" + assetType + "'}");
            xhr.setRequestHeader("donkyClientSystemIdentifier", "DonkyWebModularSdk");
            xhr.setRequestHeader("authorization", donkyCore.donkyNetwork._getAuthorizationHeader());
            xhr.setRequestHeader("apiKey", donkyCore.donkyData.get("apiKey"));

            xhr.addEventListener("load",function(evt){
				if( evt.target.status === 200 ){
					var response = JSON.parse(evt.target.responseText);
					asset.assetId = response.assetId;
	            	callback({succeeded: true, asset: asset});							
				}else if(evt.target.status === 400){
					callback({succeeded: false, response: JSON.parse(evt.target.responseText)});
				}else{
					callback({succeeded: false});
				}

            }, false);

            xhr.addEventListener("error",function(evt){
            	callback({succeeded: false});
            }, false);

            xhr.addEventListener("abort",function(evt){
				callback({succeeded: false});
            }, false);

            xhr.addEventListener("progress",function(evt){
			   	if (evt.lengthComputable){  
					var percentComplete = (evt.loaded / evt.total)*100;  
					console.log("onprogress: " + percentComplete + " %");
			 	}
            }, false);

            xhr.send(arrayBuffer);

		}



		/**
		 * Function to upload an asset and get the returned {@link DonkyAsset} via the supplied callback
		 * @param {File} file - the file to upload (https://developer.mozilla.org/en-US/docs/Web/API/File)
		 * @param {String} assetType - the assetType [MessageAsset|AccountAvatar]
		 * @param {callback} callback - the callback to return the assetId
		 */
		function uploadAsset(file, assetType, callback){
	        var environment = donkyCore.donkyData.get("environment");
	        var scheme = donkyCore.donkyData.get("scheme");

			var asset = {
				name: file.name,
				mimeType: file.type,
				sizeInBytes: file.size,
			};

        	var	reader = new FileReader();

            reader.addEventListener("load",function(event){		    

				var data = event.target.result;

				_uploadAsset(data, asset, assetType, callback);

            });
            
            reader.readAsArrayBuffer(file);
		}

	
		// donkyAssets
		//====================

		/**
		 * @class DonkyAssets
		 */
		function DonkyAssets() {
            donkyCore.donkyLogging.infoLog("Constructing DonkyAssets");

            var module = {  
                name: "DonkyAssets", 
                version: "2.0.0.0" 
            };

            donkyCore.registerModule(module);	
		}

        /**
         *  @memberof DonkyAssets 
         */
		DonkyAssets.prototype = {
			/**
			 * Function to upload an asset and get the returned {@link DonkyAsset} via the supplied callback
			 * @param {File} file - the file to upload (https://developer.mozilla.org/en-US/docs/Web/API/File)
			 * @param {callback} callback - callback to supply returned {@link DonkyAsset} object
			 */
			uploadMessageAsset: function(file, callback){

	            if (!donkyCore._isFunction(callback)) {
	                throw new Error("callback not supplied");
	            }

				uploadAsset(file, "MessageAsset", callback);
			},
			/**
			 * Function to upload an asset and get the returned {@link DonkyAsset} via the supplied callback
			 * @param {String} dataUrl - the dataUrl
			 * @param {String} name - the name
			 * @param {callback} callback - callback to supply returned {@link DonkyAsset} object
			 */
			uploadMessageAssetFromDataUrl: function(dataUrl, name, callback){

	            if (!donkyCore._isFunction(callback)) {
	                throw new Error("callback not supplied");
	            }

				var data = extractDataFromDataUrl(dataUrl);

				var assetType = getMimeTypeFromDataUrl(dataUrl);

				var arrayBuffer = convertBase64StringToArrayBuffer(data);

				var asset = {
					name: name,
					mimeType: assetType,
					sizeInBytes: arrayBuffer.byteLength,
				};

				_uploadAsset(arrayBuffer, asset, "MessageAsset", callback);
			},

			/**
			 * Function to upload an avatar asset and get the returned {@link DonkyAsset} via the supplied callback
			 * @param {File} file - the file to upload (https://developer.mozilla.org/en-US/docs/Web/API/File)
		     * @param {Callback} callback - callback to supply returned {@link DonkyAsset} object
			 */
			uploadAccountAvatar: function(file, callback){

				var mimeType = "image/png";
            	var	reader = new FileReader();

                reader.addEventListener("load",function(event){		    

                	var dataUrl = createThumbnail(event.target.result, mimeType, 96, 96, function(arrayBuffer){

						var asset = {
							name: "avatar.png",
							mimeType: mimeType
						};

						_uploadAsset(arrayBuffer, asset, "AccountAvatar", callback);
                	});

                });
                
                reader.readAsDataURL(file);
			}
		};

		// "static" instance
		_instance = new DonkyAssets();

		return _instance;
	};

	if (typeof define === 'function' && define.amd) {
		define('donkyAssets', ['donkyCore'], function(donkyCore) {
            return factory(donkyCore);
        });
	}  else {		
		window.donkyAssets = factory(window.donkyCore);
	}

}());
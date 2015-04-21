/*!
 * DonkyData JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 */

/**
 * DonkyData module.
 * @namespace DonkyData
 */
var DonkyData = (function() {
    "use strict";

    // Our "private" instance
    var _instance,
    
    // instance of donkyCore
    donkyCore = null;


    var defaults = { 
        // This is prefixed onto keys
        namespace : "donky.net.core." 
    };

	var _db = {
        /** 
         * Get raw value as string from local storage.
         * @param {String} key - the key
         * @returns (String) - the raw string value
         */
		_get: function(key){
			return localStorage.getItem(defaults.namespace + key);
		},
        /**
         * Get value as object and decrypt if necessary.
         * @param {String} key - the key
         * @returns (Object) - the object value
         */
		get: function(key){
			var obj = null;
			var raw = this._get(key);
			try{                
				obj = JSON.parse(raw);
			}catch(e){
				console.log("caught exception in _db.get(" + key + "): " + e);
			}
			return obj;
		},
        /**
         * Set raw value as string to local storage.
         * @param {String} key - the key
         * @param {String} value - the value
         */
		_set: function(key, value){
			localStorage.setItem(defaults.namespace + key, value);
		},
        /**
         * Set value as object.
         * @param {String} key - the key
         * @param {Object} value - the value
         */
		set: function(key, value){
			try{
				var stringified = JSON.stringify(value);
				this._set(key, stringified);
			}catch(e){
				console.log("caught exception in _db.set(" + key + "): " + e);
			}
		},
        /**
         * Remove a value from local storage.
         * @param {String} key - the key
         */
        remove: function(key) {
            localStorage.removeItem(defaults.namespace + key);
        },
        /**
         * Remove a list of values from local storage.
         * @param {String[]} keys - array of keys to delete
         */
        removeAll: function(keys) {
            donkyCore._each(keys, function(index, key) {
                _instance.remove(key);
            });          
        },
        /**
         * Test function to determine whether local storage is available.
         */
		lsTest : function (){
			var test = 'test';
			try {
				localStorage.setItem(test, test);
				localStorage.removeItem(test);
				return true;
			} catch(e) {
				return false;
			}
		}		
	};

/**
 * Creates DonkyData object.
 * @constructor
 */    
    function DonkyData(options) {

        // If it's being called again, return the singleton instance
        if(typeof _instance != "undefined") return _instance;

		if( !_db.lsTest() ){
			throw new Error("Local storage not available");
		}
		
        if (options === undefined || options === null) {
            throw new Error("no options specified");
        }

        if (options.donkyCore === undefined) {
            throw new Error("donkyCore not specified");
        }

        donkyCore = options.donkyCore;

        // initialize here
        donkyCore._extend(defaults, options);

        // Keep a closured reference to the instance
        _instance = this;
        return _instance;
    };

/**
 *  Returns the current namespace. Used as a prefix to local storage keys. 
 *  @returns {Object} 
 */    
    DonkyData.prototype._getNamespace = function() {
        return defaults.namespace;
    }

/**
 *  Sets the current namespace.
 *  @param {String} namespace - The new namespace to set.
 */    
    DonkyData.prototype._setNamespace = function(namespace) {
        defaults.namespace = namespace;
    }

/**
 *  Returns the Object data associated with the key.
 *  @param {String} key - The name of the data item to get.
 *  @returns {Object} 
 */    
    DonkyData.prototype.get = function(key) {
        return _db.get(key);
    }

/**
 *  Stores the Object data associated with the key - (data is stringified into JSON prior to storage)
 *  @param {String} key - The name of the data item to get.
 *  @param {Object} data - The data to store against the given key.
 */    
    DonkyData.prototype.set = function(key, data) {
        _db.set(key, data);
    }

/**
 *  Returns the Raw String data associated with the key.
 *  @param {String} key - The name of the data item to get.
 *  @returns {String} 
 */    
    DonkyData.prototype.getString = function(key) {
        return _db._get(key);
    }

/**
 *  Stores the String data associated with the key .
 *  @param {String} key - The name of the data item to get.
 *  @param {Object} data - The data to store against the given key (data is stringified into JSON prior to storage).
 */    
    DonkyData.prototype.setString = function(key, data) {
        _db._set(key, data);
    }

/**
 *  Removes the data associated with the key .
 *  @param {String} key - The name of the data item to remove.
 */    
    DonkyData.prototype.remove = function(key) {
        _db.remove(key);
    }

    // Return the constructor
    return DonkyData;
})();

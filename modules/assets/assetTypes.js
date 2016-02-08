/*!
 * DonkyCore JavaScript Library
 *
 * Copyright (C) Donky Networks Ltd. All rights reserved.
 *
 * NOTE: this is a dummy file used to describe the structure of an AssetInfo object for the benefit of JSDoc.
 * It is unnecessary and not used outside of the scope of generating documentation.
 */
 

/**
 * Creates a DonkyAsset object. Contains gettable properties related to the DonkyAsset.
 * @class DonkyAsset
 * @property {String} name - The file name 
 * @property {String} mimeType - The mimeType of the file
 * @property {Number} sizeInBytes - The size of the file in bytes 
 * @property {String} assetId - The assetId of the created asset
 * @returns {DonkyAsset} 
 */
function DonkyAsset(name, mimeType, sizeInBytes, assetId){
	return {
		name: name,
		mimeType: mimeType,
		sizeInBytes: sizeInBytes,
		assetId: assetId
	};	
}


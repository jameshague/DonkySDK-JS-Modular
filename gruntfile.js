/*
	TODO: version number stuff
	css minification
	dev/prod stuff
*/
module.exports = function (grunt) {

	var outputDirectory =  "build/" + (grunt.option('sdkVersion') || 'myVersion') + "/";	
	
	var urlBase = grunt.option('urlBase') || 'https://your.domain/com/donkySdk/';
	
		
	grunt.initConfig({
		min: {
			dist: {
				options: {
					report: 'gzip'
				},
				files: [
					{ 'src': 'modules/core/donkyData.js', 'dest': outputDirectory + 'modules/core/donkyData.min.js' },
					{ 'src': 'modules/core/donkyLogging.js', 'dest': outputDirectory + 'modules/core/donkyLogging.min.js' },
					{ 'src': 'modules/core/donkyNetwork.js', 'dest': outputDirectory + 'modules/core/donkyNetwork.min.js' },
					{ 'src': 'modules/core/donkyAccount.js', 'dest': outputDirectory + 'modules/core/donkyAccount.min.js' },
					{ 'src': 'modules/core/donkyCore.js', 'dest': outputDirectory + 'modules/core/donkyCore.min.js' },
					{ 'src': 'modules/automation/donkyAutomation.js', 'dest': outputDirectory + 'modules/automation/donkyAutomation.min.js' },
					{ 'src': 'modules/coreAnalytics/donkyCoreAnalytics.js', 'dest': outputDirectory + 'modules/coreAnalytics/donkyCoreAnalytics.min.js' },
					{ 'src': 'modules/messaging/common/logic/donkyAudio.js', 'dest': outputDirectory + 'modules/messaging/common/logic/donkyAudio.min.js' },
					{ 'src': 'modules/messaging/common/logic/donkyMessagingCommon.js', 'dest': outputDirectory + 'modules/messaging/common/logic/donkyMessagingCommon.min.js' },
					{ 'src': 'modules/messaging/simplePush/logic/donkyPushLogic.js', 'dest': outputDirectory + 'modules/messaging/simplePush/logic/donkyPushLogic.min.js' },
					{ 'src': 'modules/messaging/common/ui/donkyUICommon.js', 'dest': outputDirectory + 'modules/messaging/common/ui/donkyUICommon.min.js' },
					{ 'src': 'modules/messaging/simplePush/ui/donkyPushUI.js', 'dest': outputDirectory + 'modules/messaging/simplePush/ui/donkyPushUI.min.js' },
					{ 'src': 'modules/messaging/rich/logic/donkyRichLogic.js', 'dest': outputDirectory + 'modules/messaging/rich/logic/donkyRichLogic.min.js' },
					{ 'src': 'modules/messaging/rich/ui/donkyRichPopupUI.js', 'dest': outputDirectory + 'modules/messaging/rich/ui/donkyRichPopupUI.min.js' },
					{ 'src': 'modules/messaging/common/ui/donkyInboxContainerUI.js', 'dest': outputDirectory + 'modules/messaging/common/ui/donkyInboxContainerUI.min.js' },
					{ 'src': 'modules/messaging/rich/ui/donkyRichInboxUI.js', 'dest': outputDirectory + 'modules/messaging/rich/ui/donkyRichInboxUI.min.js' },
					{ 'src': 'modules/messaging/chat/ui/donkyChatInboxUI.js', 'dest': outputDirectory + 'modules/messaging/chat/ui/donkyChatInboxUI.min.js' }
				]
			}
		},
		'cssmin': {
			'dist': {
				'options': {
					'report': true
				},
				'files': [{
					expand: true,
					cwd: 'css/',
					'src': ['*.css'],
					'dest': outputDirectory + "css",
					ext: '.css'
				}]
			}
		},
		'concat': {
			options: {
				separator: ';'
			},
			dist: {
				src: [ 
					outputDirectory + 'modules/core/donkyData.min.js', 
					outputDirectory + 'modules/core/donkyAccount.min.js', 
					outputDirectory + 'modules/core/donkyLogging.min.js', 
					outputDirectory + 'modules/core/donkyNetwork.min.js', 
					outputDirectory + 'modules/core/donkyCore.min.js'
					],
				dest: outputDirectory +'/modules/core/donkyCoreBundle.min.js'
			}
		},
		copy: {
			main: {
				files: [
					{ expand: true, src: ['modules/**'], dest: outputDirectory },
					{ expand: true, src: ['dependencies/*'], dest: outputDirectory, filter: 'isFile' },
					{ expand: true, src: ['images/*'], dest: outputDirectory, filter: 'isFile' },
					{ expand: true, src: ['templates/*'], dest: outputDirectory, filter: 'isFile' },
					{ expand: true, src: ['audio/*'], dest: outputDirectory, filter: 'isFile' }
				],
			},
			css: {
				files: [
					{ expand: true, src: ['css/*'], dest: outputDirectory, filter: 'isFile' }
				],				
			}		},
		jsdoc: {
			dist: {
				src: [
					'modules/core/*.js',
					'modules/automation/*.js',
					'modules/coreAnalytics/*.js',
					'modules/messaging/common/logic/*.js',
					'modules/messaging/common/ui/*.js',
					'modules/messaging/rich/logic/*.js',
					'modules/messaging/rich/ui/*.js',
					'modules/messaging/simplePush/logic/*.js',
					'modules/messaging/simplePush/ui/*.js'
				],
				options: {
					destination: outputDirectory + '/JSdoc',
				}
			}
		},
		replace: {
			installDir: {
				src: [outputDirectory + 'modules/*.js', outputDirectory + 'modules/core/*.js'],             // source files array (supports minimatch)
				overwrite: true,             // destination directory or file
				replacements: [{
					from: '"../"',                   // string replacement
					to: '"' + urlBase + (grunt.option('sdkVersion') || 'latest-modular') +  '/"'
				}]
			},
			
		},
		jshint: {
		  // define the files to lint
		  files: [
			'modules/core/donkyData.js',
			'modules/core/donkyLogging.js',
			'modules/core/donkyNetwork.js',
			'modules/core/donkyCore.js',
			'modules/core/donkySharedTypes.js',
			'modules/automation/donkyAutomation.js',
			'modules/coreAnalytics/donkyCoreAnalytics.js',
			'modules/messaging/common/logic/donkyAudio.js',
			'modules/messaging/common/logic/donkyMessagingCommon.js',
			'modules/messaging/simplePush/logic/donkyPushLogic.js',
			'modules/messaging/common/ui/donkyUICommon.js',
			'modules/messaging/simplePush/ui/pushMessageType.js',
			'modules/messaging/simplePush/ui/donkyPushUI.js',
			'modules/messaging/rich/logic/richMessageType.js',
			'modules/messaging/rich/logic/donkyRichLogic.js',
			'modules/messaging/rich/ui/donkyRichPopupUI.js',
			'modules/messaging/common/ui/donkyInboxContainerUI.js',
			'modules/messaging/rich/ui/donkyRichInboxUI.js',
			'modules/messaging/chat/ui/donkyChatInboxUI.js'			  
		 ],
		  // configure JSHint (documented at http://www.jshint.com/docs/)
		  options: {
		      // more options here if you want to override JSHint defaults
		    globals: {
		      jQuery: true,
		      console: true,
		      module: true
		    }
		  }
		}
	});

	grunt.loadNpmTasks('grunt-yui-compressor');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	

	// the default task can be run just by typing "grunt" on the command line
	grunt.registerTask('default', [
		'jshint',
		'min',
		'concat',
		'cssmin',		
		// Don't copy the css as we are minifying this with cssmin above
		'copy:main',
		'jsdoc',
		'replace'
		
	]);
	
};
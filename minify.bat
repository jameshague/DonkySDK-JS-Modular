rem minify donky core components
java -jar yuicompressor-2.4.8.jar modules/core/donkyAccount.js  -v -o modules/core/donkyAccount.min.js
java -jar yuicompressor-2.4.8.jar modules/core/donkyCore.js  -v -o modules/core/donkyCore.min.js
java -jar yuicompressor-2.4.8.jar modules/core/donkyData.js  -v -o modules/core/donkyData.min.js
java -jar yuicompressor-2.4.8.jar modules/core/donkyLogging.js  -v -o modules/core/donkyLogging.min.js
java -jar yuicompressor-2.4.8.jar modules/core/donkyNetwork.js  -v -o modules/core/donkyNetwork.min.js

rem generate a bundle for donkyCore 
del modules\core\donkyCoreBundle.min.js

type modules\core\donkyData.min.js >> modules\core\donkyCoreBundle.min.js
echo. >> modules\core\donkyCoreBundle.min.js
type modules\core\donkyAccount.min.js >> modules\core\donkyCoreBundle.min.js
echo. >> modules\core\donkyCoreBundle.min.js
type modules\core\donkyLogging.min.js >> modules\core\donkyCoreBundle.min.js
echo. >> modules\core\donkyCoreBundle.min.js
type modules\core\donkyNetwork.min.js >> modules\core\donkyCoreBundle.min.js
echo. >> modules\core\donkyCoreBundle.min.js
type modules\core\donkyCore.min.js >> modules\core\donkyCoreBundle.min.js

rem minify additional components (logic & ui)
java -jar yuicompressor-2.4.8.jar modules/messaging/simplePush/logic/donkyPushLogic.js  -v -o modules/messaging/simplePush/logic/donkyPushLogic.min.js

java -jar yuicompressor-2.4.8.jar modules/coreAnalytics/donkyCoreAnalytics.js  -v -o modules/coreAnalytics/donkyCoreAnalytics.min.js
java -jar yuicompressor-2.4.8.jar modules/automation/donkyAutomation.js  -v -o modules/automation/donkyAutomation.min.js

java -jar yuicompressor-2.4.8.jar modules/messaging/common/logic/donkyMessagingCommon.js  -v -o modules/messaging/common/logic/donkyMessagingCommon.min.js

java -jar yuicompressor-2.4.8.jar modules/messaging/common/ui/donkyUICommon.js  -v -o modules/messaging/common/ui/donkyUICommon.min.js
java -jar yuicompressor-2.4.8.jar modules/messaging/simplePush/ui/donkyPushUI.js  -v -o modules/messaging/simplePush/ui/donkyPushUI.min.js

java -jar yuicompressor-2.4.8.jar modules/messaging/rich/logic/donkyRichLogic.js  -v -o modules/messaging/rich/logic/donkyRichLogic.min.js
java -jar yuicompressor-2.4.8.jar modules/messaging/rich/ui/donkyRichPopupUI.js  -v -o modules/messaging/rich/ui/donkyRichPopupUI.min.js




let inspectedTab = {};
let devtools_port;
const piezCurrentStateOptions = {
	'piez-im-simple':
	{
		'browserActionText': 'IM',
		'localStorageState': 'piez-im-simple'
	},
	'piez-im-advanced':
	{
		'browserActionText': 'IM+',
		'localStorageState': 'piez-im-advanced'
	},
	'piez-a2':
	{
		'browserActionText': 'PP',
		'localStorageState': 'piez-a2'
	},
	'piez-ro-simple':
	{
		'browserActionText': 'RO',
		'localStorageState': 'piez-ro-simple'
	},
	'piez-ro-advanced':
	{
		'browserActionText': 'RO+',
		'localStorageState': 'piez-ro-advanced'
	},
	'piez-3pm':
	{
		'browserActionText': 'SM',
		'localStorageState': 'piez-3pm'
	},
	'piez-off': {
		'browserActionText': 'Off',
		'localStorageState': 'piez-off'
	}
};
let piezCurrentStateCached = '';
let piezCurrentOptionsCached = [];

const beforeSendCallback = function (details) {
	if (details.url.indexOf('http') != -1) {
		if (piezCurrentStateCached == 'piez-a2') {
			details.requestHeaders.push({ name: 'pragma', value: 'x-akamai-a2-trace' });
			details.requestHeaders.push({ name: 'x-akamai-rua-debug', value: 'on' });
		} else {
			details.requestHeaders.push({ name: 'x-im-piez', value: 'on' });
			details.requestHeaders.push({ name: 'pragma', value: 'akamai-x-ro-trace' });
			details.requestHeaders.push({ name: 'x-akamai-ro-piez', value: 'on' });
			details.requestHeaders.push({ name: 'x-akamai-a2-disable', value: 'on' });
		}
		if (piezCurrentOptionsCached.includes('save-data')) {
			details.requestHeaders.push({ name: 'Save-Data', value: 'on' });
		}
	}
	return { requestHeaders: details.requestHeaders };
};

//get the URL that the tab is navigating to
chrome.webNavigation.onBeforeNavigate.addListener(function beforeNavigate(details) {
	if (details.tabId === inspectedTab.id && details.frameId === 0) {
		inspectedTab.url = details.url;
	}
});

//get the actual url to use if there's a redirect for the base page
chrome.webRequest.onBeforeRedirect.addListener(function getNewUrl(redirect) {
	var urlMatch = new RegExp('(' + inspectedTab.url + '|' + inspectedTab.url + '/)', 'i');
	if (redirect.tabId === inspectedTab.id && redirect.frameId === 0 && urlMatch.test(redirect.url)) {
		var newLocation = redirect.responseHeaders.find(function (header) {
			return /location/i.test(header.name);
		});
		if (newLocation !== undefined) {
			inspectedTab.url = newLocation.value;
		}
	}
}, { urls: ["<all_urls>"] }, ['responseHeaders']);

chrome.runtime.onConnect.addListener(function (port) {
	devtools_port = port;
	port.onMessage.addListener(function onMessageListener(message) {
		switch (message.type) {
			case "inspectedTab":
				inspectedTab.id = message.tab;
				break;
			case "a2PageLoad":
				chrome.webNavigation.onCompleted.addListener(function pageComplete(details) {
					if (details.tabId === inspectedTab.id && details.frameId === 0) {
						try {
							port.postMessage({ type: 'a2PageLoaded' });
						}
						finally {
							chrome.webNavigation.onCompleted.removeListener(pageComplete);
						}
					}
				});
				break;
			default:
				console.log('Unexpected message from devtools. ', message);
		}
	});
	port.onDisconnect.addListener(function () { //stop keeping track since our devtools closed
		devtools_port = undefined;
		inspectedTab = {};
	});
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	switch (request.type) {
		case "piez-off":
		case "piez-im-simple":
		case "piez-im-advanced":
		case "piez-a2":
		case "piez-ro-simple":
		case "piez-ro-advanced":
		case "piez-3pm":
		  console.log("Setting PiezCurrentState: " + request.type);
		  setPiezCurrentState(request.type);
		  break;
		case "piez-options":
		  console.log("Setting PiezCurrentState: " + request.options);
		  setPiezCurrentSettings(request.options);
		  break;
		default:
		  console.log('Unexpected extension request. ', request);
	}
	return false;
});

const setPiezCurrentState = function(state) {
 	if (state == 'piez-off') {
		chrome.storage.local.set({ "piezCurrentState": state }, function () {
			piezCurrentStateCached = state;
			chrome.action.setBadgeText({ "text": piezCurrentStateOptions[state]["browserActionText"] });
			chrome.action.setBadgeBackgroundColor({ "color": [255, 0, 0, 255] });
			chrome.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: [1],
			  });
		});
	} else {
		chrome.storage.local.set({ "piezCurrentState": state }, function () {
			piezCurrentStateCached = state;
			chrome.action.setBadgeText({ "text": piezCurrentStateOptions[state]["browserActionText"] });
			chrome.action.setBadgeBackgroundColor({ "color": [0, 255, 0, 255] });

			piezRequestHeaders = [];

			if (piezCurrentStateCached == 'piez-a2') {
				piezRequestHeaders.push({ header: 'pragma', operation: 'set', value: 'x-akamai-a2-trace' });
				piezRequestHeaders.push({ header: 'x-akamai-rua-debug', operation: 'set', value: 'on' });
			} else {
				piezRequestHeaders.push({ header: 'x-im-piez', operation: 'set', value: 'on' });
				piezRequestHeaders.push({ header: 'pragma', operation: 'set', value: 'akamai-x-ro-trace' });
				piezRequestHeaders.push({ header: 'x-akamai-ro-piez', operation: 'set', value: 'on' });
				piezRequestHeaders.push({ header: 'x-akamai-a2-disable', operation: 'set', value: 'on' })
			}
			if (piezCurrentOptionsCached.includes('save-data')) {
				piezRequestHeaders.push({ header: 'Save-Data', operation: 'set', value: 'on' });
			}

			chrome.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: [1],
				addRules: [{
					id: 1,
					priority: 1,
					action: {
						type: 'modifyHeaders',
						requestHeaders: piezRequestHeaders
					},
					condition: { urlFilter: '*', resourceTypes: ['main_frame', 'image', 'font', 'script', 'stylesheet'] }
				}]
				});


		});
	}
};

const setPiezCurrentSettings = function(options) {
	chrome.storage.local.set({ "piezCurrentOptions": options }, function () {
		piezCurrentOptionsCached = options;
	});
};

chrome.runtime.onInstalled.addListener(function () {
	initPiezStorageState();
});

chrome.runtime.onStartup.addListener(function () {
	initPiezStorageState();
});

const initPiezStorageState = function () {
	chrome.storage.local.get("piezCurrentState", function (result) {
		if (result["piezCurrentState"] == undefined) {
			setPiezCurrentState('piez-im-simple');
		} else {
			const key = result["piezCurrentState"];
			if (piezCurrentStateOptions[key] == undefined) {
				setPiezCurrentState('piez-im-simple');
			} else {
				console.log("Setting state to: " + key);
				setPiezCurrentState(key);
			}
		}
	});
}
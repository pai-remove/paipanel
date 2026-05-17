const _wp_IGNORE_PATTERNS = [
	'Frame was removed',
	'No tab with id',
	'Cannot access',
	'Could not establish connection',
	'The message port closed',
	'Receiving end does not exist',
];

const _wp_isExpected = (msg) =>
	_wp_IGNORE_PATTERNS.some(p => msg && msg.includes(p));

const _wp_log = (level, ctx, msg, err) => {
	if (err && _wp_isExpected(err.message || String(err))) return;
	const tag = `[WP:bg:${ctx}]`;
	const detail = err ? ` — ${err.message || err}` : '';
	if (level === 'error') console.error(tag, msg + detail);
	else if (level === 'warn')  console.warn(tag,  msg + detail);
	else                        console.debug(tag, msg + detail);
};

chrome.runtime.onInstalled.addListener(() => {
	console.log('[WP:bg] Extension installed — v' + chrome.runtime.getManifest().version);
});

const _wp_injectableUrl = (url) => {
	if (!url) return false;
	if (url.startsWith('chrome://')) return false;
	if (url.startsWith('chrome-extension://')) return false;
	if (url.startsWith('kiwi://')) return false;
	if (url.startsWith('devtools://')) return false;
	if (url.startsWith('about:')) return false;
	if (url.startsWith('edge://')) return false;
	return true;
};

async function _wp_injectAndToggle(tabId) {
	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['injector.js'],
			world: 'MAIN',
			injectImmediately: true
		});
		_wp_log('debug', 'inject', `injector.js → tab ${tabId}`);
	} catch (e) {
		_wp_log('warn', 'inject', `injector.js failed on tab ${tabId}`, e);
	}

	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['adblocker.js'],
			world: 'MAIN',
			injectImmediately: true
		});
		_wp_log('debug', 'inject', `adblocker.js → tab ${tabId}`);
	} catch (e) {
		_wp_log('warn', 'inject', `adblocker.js failed on tab ${tabId}`, e);
	}

	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['content.js'],
			injectImmediately: true
		});
		_wp_log('debug', 'inject', `content.js → tab ${tabId}`);
	} catch (e) {
		_wp_log('error', 'inject', `content.js failed on tab ${tabId}`, e);
		return;
	}

	await new Promise(r => setTimeout(r, 150));

	try {
		await chrome.tabs.sendMessage(tabId, { action: 'togglePanel' });
	} catch (e) {
		_wp_log('warn', 'toggle', `togglePanel message failed on tab ${tabId}`, e);
	}
}

chrome.action.onClicked.addListener(async (tab) => {
	if (!_wp_injectableUrl(tab.url)) {
		_wp_log('debug', 'action', `Skipped non-injectable URL: ${tab.url}`);
		return;
	}

	try {
		await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
	} catch (e) {
		_wp_log('debug', 'action', `No listener on tab ${tab.id}, injecting`, e);
		await _wp_injectAndToggle(tab.id);
	}
});

const _wp_dataKeyMap = {
	cache: 'cache',
	cookies: 'cookies',
	history: 'history',
	localStorage: 'localStorage',
	indexedDB: 'indexedDB',
	serviceWorkers: 'serviceWorkers',
	cacheStorage: 'cacheStorage',
	fileSystems: 'fileSystems',
	formData: 'formData',
	passwords: 'passwords',
	downloads: 'downloads',
	pluginData: 'pluginData',
	serverBoundCertificates: 'serverBoundCertificates',
	webSQL: 'webSQL',
	appcache: 'appcache'
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'getCookies') {
		chrome.cookies.getAll({ url: request.url }, (cookies) => {
			sendResponse({ cookies: cookies || [] });
		});
		return true;
	}

	if (request.action === 'clearBrowsingData') {
		const raw = request.dataToRemove || {};
		const dataToRemove = {};
		Object.keys(raw).forEach(k => {
			if (_wp_dataKeyMap[k] && raw[k]) dataToRemove[_wp_dataKeyMap[k]] = true;
		});
		if (!Object.keys(dataToRemove).length) {
			sendResponse({ error: 'No valid data types selected' });
			return true;
		}
		chrome.browsingData.remove({ since: 0 }, dataToRemove, () => {
			if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
			else sendResponse({ ok: true });
		});
		return true;
	}
});

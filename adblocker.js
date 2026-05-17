(function() {
	if (window.__wpAdBlockerActive) return;
	window.__wpAdBlockerActive = true;

	const _host = location.hostname;
	const _href = location.href;
	let _wp_dnrRules = [];
	let _wp_compiledRules = [];

	const _wp_cosmeticRules = [
		'#ad, #ads, #ad-container, #ad-wrapper, #ad-banner, #ad-slot',
		'.ad, .ads, .ad-container, .ad-wrapper, .ad-banner, .adsbygoogle',
		'.advertisement, .advertisement-container, .advertise',
		'[class*="advert"], [id*="advert"], [class*="sponsor"], [id*="sponsor"]',
		'[class*="ad-unit"], [id*="ad-unit"], [class*="ad_unit"], [id*="ad_unit"]',
		'[class*="AdContainer"], [class*="AdWrapper"], [class*="AdSlot"]',
		'iframe[src*="doubleclick.net"], iframe[src*="googlesyndication.com"]',
		'iframe[src*="amazon-adsystem.com"], iframe[src*="adnxs.com"]',
		'ins.adsbygoogle',
		'div[data-ad-client], div[data-ad-slot]',
		'[class*="outbrain"], [id*="outbrain"]',
		'[class*="taboola"], [id*="taboola"]',
		'[class*="mgid"], [id*="mgid"]',
		'[class*="pubmatic"], [id*="pubmatic"]',
		'[class*="criteo"], [id*="criteo"]',
		'div[id^="google_ads_"], div[id^="div-gpt-ad"]',
		'div[id^="dfp-ad-"], div[class^="dfp-ad-"]',
		'.widget-area .textwidget > a > img',
		'[data-google-query-id]',
		'amp-ad, amp-sticky-ad',
	];

	const _wp_domainCosmeticRules = {
		'youtube.com': [
			'.ytd-display-ad-renderer',
			'ytd-promoted-sparkles-web-renderer',
			'ytd-promoted-video-renderer',
			'ytd-search-pyv-renderer',
			'#masthead-ad',
			'.ytd-banner-promo-renderer',
			'ytd-statement-banner-renderer',
			'#player-ads',
		],
		'facebook.com': [
			'[data-pagelet="RightRail"]',
			'[data-pagelet="Stories"]',
		],
		'reddit.com': [
			'.promotedlink',
			'[data-promoted="true"]',
			'.promoted-icon',
		],
		'twitter.com': [
			'[data-testid="placementTracking"]',
		],
		'x.com': [
			'[data-testid="placementTracking"]',
		],
		'twitch.tv': [
			'.top-nav__prime',
			'.premium-mini-prime',
		],
	};

	function _wp_injectCosmeticCSS(selectors, id) {
		if (!selectors || !selectors.length) return;
		const styleId = '_wp_cosmetic_' + (id || 'generic');
		if (document.getElementById(styleId)) return;
		const css = selectors.join(', ') + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = css;
		try {
			(document.head || document.documentElement).appendChild(style);
		} catch (_) {}
	}

	function _wp_applyCosmetics() {
		_wp_injectCosmeticCSS(_wp_cosmeticRules, 'generic');
		for (const [domain, rules] of Object.entries(_wp_domainCosmeticRules)) {
			if (_host === domain || _host.endsWith('.' + domain)) {
				_wp_injectCosmeticCSS(rules, domain.replace('.', '_'));
			}
		}
	}

	_wp_applyCosmetics();

	new MutationObserver((muts) => {
		const hasNew = muts.some(m => m.addedNodes.length > 0);
		if (hasNew) _wp_applyCosmetics();
	}).observe(document.documentElement, {
		childList: true,
		subtree: true
	});

	const _wp_config = {
		blockTrackers: window.__wpAdblockConfig?.blockTrackers ?? false,
		blockTrackersAndAnnoyances: window.__wpAdblockConfig?.blockTrackersAndAnnoyances ?? false,
		useCache: window.__wpAdblockConfig?.useCache ?? true,
		cacheDir: window.__wpAdblockConfig?.cacheDir ?? null,
		interceptResolutionPriority: window.__wpAdblockConfig?.interceptResolutionPriority ?? 0,
		rulesUrl: null
	};

	function _wp_parseUrlFilter(filter) {
		if (!filter) return null;

		let pattern = filter;
		let isRegex = false;
		let isDomain = false;
		let isStartsWith = false;
		let isEndsWith = false;

		if (filter.startsWith('||')) {
			isDomain = true;
			pattern = filter.slice(2);
			const domainEnd = pattern.indexOf('^');
			if (domainEnd !== -1) {
				pattern = pattern.slice(0, domainEnd);
			}
		} else if (filter.startsWith('|')) {
			isStartsWith = true;
			pattern = filter.slice(1);
		}

		if (filter.endsWith('|')) {
			isEndsWith = true;
			pattern = pattern.slice(0, -1);
		}

		if (filter.includes('*')) {
			isRegex = true;
			pattern = pattern.replace(/\*/g, '.*');
		}

		return {
			pattern,
			isRegex,
			isDomain,
			isStartsWith,
			isEndsWith,
			contains: !isStartsWith && !isEndsWith && !isDomain,
			original: filter
		};
	}

	function _wp_compileDnrRules() {
		const compiled = [];
		for (const rule of _wp_dnrRules) {
			if (!rule.condition || !rule.condition.urlFilter) continue;

			const parsed = _wp_parseUrlFilter(rule.condition.urlFilter);
			if (!parsed) continue;

			let regex;
			try {
				if (parsed.isRegex) {
					regex = new RegExp(parsed.pattern, 'i');
				} else if (parsed.isDomain) {
					regex = new RegExp('(^|\\.)' + parsed.pattern.replace(/\./g, '\\.') + '$', 'i');
				} else if (parsed.isStartsWith && parsed.isEndsWith) {
					regex = new RegExp('^' + parsed.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
				} else if (parsed.isStartsWith) {
					regex = new RegExp('^' + parsed.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
				} else if (parsed.isEndsWith) {
					regex = new RegExp(parsed.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
				} else {
					regex = new RegExp(parsed.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
				}
			} catch (e) {
				continue;
			}

			compiled.push({
				id: rule.id,
				priority: rule.priority || 1,
				action: rule.action,
				regex: regex,
				resourceTypes: rule.condition.resourceTypes || ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other'],
				compiled: parsed
			});
		}
		return compiled.sort((a, b) => b.priority - a.priority);
	}

	function _wp_getResourceType(initiatorType, url) {
		if (!initiatorType) return 'other';
		const lower = initiatorType.toLowerCase();
		if (['img', 'image'].includes(lower)) return 'image';
		if (['script', 'js'].includes(lower)) return 'script';
		if (['css', 'stylesheet'].includes(lower)) return 'stylesheet';
		if (['xmlhttprequest', 'xhr'].includes(lower)) return 'xmlhttprequest';
		if (['media', 'video', 'audio'].includes(lower)) return 'media';
		if (['font'].includes(lower)) return 'font';
		if (['websocket', 'ws'].includes(lower)) return 'websocket';
		if (['fetch'].includes(lower)) return 'xmlhttprequest';
		if (url && (url.startsWith('ws://') || url.startsWith('wss://'))) return 'websocket';
		if (['ping', 'beacon'].includes(lower)) return 'ping';
		if (['csp_report'].includes(lower)) return 'csp_report';
		if (['object', 'embed'].includes(lower)) return 'object';
		if (['subdocument', 'iframe', 'frame'].includes(lower)) return 'sub_frame';
		if (['maindocument', 'document'].includes(lower)) return 'main_frame';
		return 'other';
	}

	function _wp_matchDnrRule(url, resourceType) {
		const lowerUrl = url.toLowerCase();
		const type = resourceType.toLowerCase();

		for (const rule of _wp_compiledRules) {
			if (!rule.resourceTypes.includes(type) && !rule.resourceTypes.includes('other')) {
				continue;
			}

			if (rule.compiled.isDomain) {
				try {
					const urlObj = new URL(url);
					const hostname = urlObj.hostname.toLowerCase();
					if (rule.regex.test(hostname)) {
						return rule;
					}
				} catch (e) {
					if (rule.regex.test(lowerUrl)) {
						return rule;
					}
				}
			} else {
				if (rule.regex.test(lowerUrl)) {
					return rule;
				}
			}
		}

		return null;
	}

	const _wp_requestCache = new Map();
	const _wp_cacheMaxSize = 1000;

	function _wp_shouldBlock(url, resourceType) {
		if (!url) return {
			blocked: false
		};

		const type = resourceType || 'other';
		const cacheKey = `${type}:${url}`;

		if (_wp_config.useCache && _wp_requestCache.has(cacheKey)) {
			return _wp_requestCache.get(cacheKey);
		}

		const matchedRule = _wp_matchDnrRule(url, type);

		let result;
		if (matchedRule && matchedRule.action && matchedRule.action.type === 'block') {
			result = {
				blocked: true,
				reason: 'dnr_rule',
				ruleId: matchedRule.id,
				resourceTypes: matchedRule.resourceTypes
			};
		} else {
			result = {
				blocked: false
			};
		}

		if (_wp_config.useCache) {
			if (_wp_requestCache.size >= _wp_cacheMaxSize) {
				const firstKey = _wp_requestCache.keys().next().value;
				_wp_requestCache.delete(firstKey);
			}
			_wp_requestCache.set(cacheKey, result);
		}

		return result;
	}

	const _wp_origFetch = window.__wpOrigFetch || window.fetch;
	window.__wpOrigFetch = _wp_origFetch;

	async function _wp_adFetch(...args) {
		const input = args[0];
		const init = args[1] || {};

		let url;
		if (typeof input === 'string') url = input;
		else if (input instanceof Request) url = input.url;
		else if (input instanceof URL) url = input.href;
		else url = String(input);

		const resourceType = _wp_getResourceType('fetch', url);
		const decision = _wp_shouldBlock(url, resourceType);

		if (decision.blocked) {
			return new Response('', {
				status: 200,
				statusText: 'OK (blocked by WP AdBlocker DNR:' + decision.ruleId + ')'
			});
		}

		return _wp_origFetch.apply(this, args);
	}

	if (!window.__wpInterceptorActive) {
		window.fetch = _wp_adFetch;
	} else {
		const _existingFetch = window.fetch;
		window.fetch = async function(...args) {
			const input = args[0];
			let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input instanceof URL ? input.href : String(input));
			const resourceType = _wp_getResourceType('fetch', url);
			const decision = _wp_shouldBlock(url, resourceType);

			if (decision.blocked) {
				return new Response('', {
					status: 200,
					statusText: 'OK (blocked by WP AdBlocker DNR:' + decision.ruleId + ')'
				});
			}
			return _existingFetch.apply(this, args);
		};
	}

	const _wp_origXHROpen = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function(method, url) {
		this._wpUrl = url ? url.toString() : '';
		this._wpMethod = method;
		return _wp_origXHROpen.apply(this, arguments);
	};

	const _wp_origXHRSend = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function(body) {
		const resourceType = _wp_getResourceType('xmlhttprequest', this._wpUrl);
		const decision = _wp_shouldBlock(this._wpUrl, resourceType);

		if (decision.blocked) {
			Object.defineProperty(this, 'readyState', {
				get: () => 4,
				configurable: true
			});
			Object.defineProperty(this, 'status', {
				get: () => 200,
				configurable: true
			});
			Object.defineProperty(this, 'statusText', {
				get: () => 'OK (blocked DNR:' + decision.ruleId + ')',
				configurable: true
			});
			Object.defineProperty(this, 'response', {
				get: () => '',
				configurable: true
			});
			Object.defineProperty(this, 'responseText', {
				get: () => '',
				configurable: true
			});

			setTimeout(() => {
				try {
					this.onreadystatechange && this.onreadystatechange();
				} catch (_) {}
				try {
					this.dispatchEvent(new Event('load'));
					this.dispatchEvent(new Event('loadend'));
				} catch (_) {}
			}, 0);

			return;
		}

		return _wp_origXHRSend.apply(this, arguments);
	};

	if (window.WebSocket) {
		const _origWebSocket = window.WebSocket;
		window.WebSocket = function(url, protocols) {
			const resourceType = _wp_getResourceType('websocket', url);
			const decision = _wp_shouldBlock(url, resourceType);

			if (decision.blocked) {
				const fakeWS = {
					url: url,
					readyState: 0,
					binaryType: 'blob',
					extensions: '',
					protocol: '',
					onopen: null,
					onmessage: null,
					onerror: null,
					onclose: null,
					send: () => {},
					close: () => {},
					addEventListener: () => {},
					removeEventListener: () => {},
					dispatchEvent: () => true,
					CONNECTING: 0,
					OPEN: 1,
					CLOSING: 2,
					CLOSED: 3
				};

				setTimeout(() => {
					fakeWS.readyState = 3;
					if (fakeWS.onclose) fakeWS.onclose({
						code: 1000,
						reason: 'Blocked DNR:' + decision.ruleId
					});
				}, 0);

				return fakeWS;
			}
			return new _origWebSocket(url, protocols);
		};
		window.WebSocket.prototype = _origWebSocket.prototype;
		Object.setPrototypeOf(window.WebSocket, _origWebSocket);
		Object.defineProperty(window.WebSocket, 'CONNECTING', {
			value: 0
		});
		Object.defineProperty(window.WebSocket, 'OPEN', {
			value: 1
		});
		Object.defineProperty(window.WebSocket, 'CLOSING', {
			value: 2
		});
		Object.defineProperty(window.WebSocket, 'CLOSED', {
			value: 3
		});
	}

	if (navigator.sendBeacon) {
		const _origSendBeacon = navigator.sendBeacon;
		navigator.sendBeacon = function(url, data) {
			const decision = _wp_shouldBlock(url, 'ping');
			if (decision.blocked) return true;
			return _origSendBeacon.call(this, url, data);
		};
	}

	if (window.EventSource) {
		const _origEventSource = window.EventSource;
		window.EventSource = function(url, options) {
			const decision = _wp_shouldBlock(url, 'other');
			if (decision.blocked) {
				const fakeES = {
					url: url,
					withCredentials: false,
					readyState: 0,
					onopen: null,
					onmessage: null,
					onerror: null,
					close: () => {},
					addEventListener: () => {},
					removeEventListener: () => {},
					dispatchEvent: () => true,
					CONNECTING: 0,
					OPEN: 1,
					CLOSED: 2
				};
				setTimeout(() => {
					fakeES.readyState = 2;
					if (fakeES.onerror) fakeES.onerror(new Event('error'));
				}, 0);
				return fakeES;
			}
			return new _origEventSource(url, options);
		};
	}

	if (window.importScripts) {
		const _origImportScripts = window.importScripts;
		window.importScripts = function(...urls) {
			const filtered = urls.filter(url => {
				const decision = _wp_shouldBlock(url, 'script');
				return !decision.blocked;
			});
			if (filtered.length === 0) return;
			return _origImportScripts.apply(this, filtered);
		};
	}

	const _wp_scriptlets = {
		'set-constant': (prop, val) => {
			try {
				const parts = prop.split('.');
				let obj = window;
				for (let i = 0; i < parts.length - 1; i++) {
					if (!obj[parts[i]]) obj[parts[i]] = {};
					obj = obj[parts[i]];
				}
				const last = parts[parts.length - 1];
				const resolved = val === 'true' ? true : val === 'false' ? false : val === 'null' ? null : val === 'undefined' ? undefined : val === 'noopFunc' ? () => {} : isNaN(val) ? val : Number(val);
				Object.defineProperty(obj, last, {
					get: () => resolved,
					set: () => {},
					configurable: false
				});
			} catch (_) {}
		},

		'prevent-localStorage-setItem': (key) => {
			try {
				const orig = Storage.prototype.setItem;
				Storage.prototype.setItem = function(k, v) {
					if (k && k.includes(key)) return;
					return orig.call(this, k, v);
				};
			} catch (_) {}
		},

		'prevent-addEventListener': (eventType) => {
			try {
				const orig = EventTarget.prototype.addEventListener;
				EventTarget.prototype.addEventListener = function(type, fn, opts) {
					if (type === eventType) return;
					return orig.call(this, type, fn, opts);
				};
			} catch (_) {}
		},

		'abort-on-property-write': (prop) => {
			try {
				const parts = prop.split('.');
				let obj = window;
				for (let i = 0; i < parts.length - 1; i++) {
					if (!obj[parts[i]]) obj[parts[i]] = {};
					obj = obj[parts[i]];
				}
				const last = parts[parts.length - 1];
				Object.defineProperty(obj, last, {
					set: () => {
						throw new ReferenceError('Aborted: ' + prop);
					},
					get: () => undefined,
					configurable: false
				});
			} catch (_) {}
		},

		'abort-on-property-read': (prop) => {
			try {
				const parts = prop.split('.');
				let obj = window;
				for (let i = 0; i < parts.length - 1; i++) {
					if (!obj[parts[i]]) return;
					obj = obj[parts[i]];
				}
				const last = parts[parts.length - 1];
				Object.defineProperty(obj, last, {
					get: () => {
						throw new ReferenceError('Aborted read: ' + prop);
					},
					configurable: false
				});
			} catch (_) {}
		},

		'noopFunc': (prop) => {
			try {
				const parts = prop.split('.');
				let obj = window;
				for (let i = 0; i < parts.length - 1; i++) {
					if (!obj[parts[i]]) obj[parts[i]] = {};
					obj = obj[parts[i]];
				}
				const last = parts[parts.length - 1];
				Object.defineProperty(obj, last, {
					get: () => () => {},
					configurable: true
				});
			} catch (_) {}
		},

		'json-prune': (removePaths) => {
			try {
				const paths = removePaths.split(' ');
				const origParse = JSON.parse;
				JSON.parse = function(text) {
					const obj = origParse(text);
					if (obj && typeof obj === 'object') {
						paths.forEach(path => {
							const parts = path.split('.');
							let o = obj;
							for (let i = 0; i < parts.length - 1; i++) {
								if (!o || typeof o !== 'object') return;
								o = o[parts[i]];
							}
							if (o && typeof o === 'object') delete o[parts[parts.length - 1]];
						});
					}
					return obj;
				};
			} catch (_) {}
		},

		'prevent-window-open': () => {
			try {
				const orig = window.open;
				window.open = function(url, ...args) {
					if (!url || _wp_shouldBlock(url.toString()).blocked) return null;
					return orig.call(window, url, ...args);
				};
			} catch (_) {}
		},

		'prevent-fetch': () => {
			try {
				const orig = window.fetch;
				window.fetch = function(...args) {
					const input = args[0];
					const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
					const decision = _wp_shouldBlock(url, 'xmlhttprequest');
					if (decision.blocked) {
						return Promise.reject(new TypeError('Failed to fetch'));
					}
					return orig.apply(this, args);
				};
			} catch (_) {}
		},

		'prevent-xhr': () => {
			try {
				const origOpen = XMLHttpRequest.prototype.open;
				XMLHttpRequest.prototype.open = function(method, url) {
					const decision = _wp_shouldBlock(url, 'xmlhttprequest');
					if (decision.blocked) {
						this._wpBlocked = true;
					}
					return origOpen.apply(this, arguments);
				};
			} catch (_) {}
		},

		'nowebrtc': () => {
			try {
				delete window.RTCPeerConnection;
				delete window.webkitRTCPeerConnection;
				delete window.mozRTCPeerConnection;
				delete window.RTCSessionDescription;
				delete window.RTCIceCandidate;
			} catch (_) {}
		},

		'prevent-bab': () => {
			try {
				const noop = () => {};
				window.blockAdBlock = noop;
				window.BlockAdBlock = noop;
				window.fuckAdBlock = noop;
				window.FuckAdBlock = noop;
				window.detectAdBlock = noop;
				window.canRunAds = noop;
				window.isAdBlockActive = false;
				window.adblockEnabled = false;
			} catch (_) {}
		},

		'prevent-setTimeout': (pattern) => {
			try {
				const orig = window.setTimeout;
				const regex = new RegExp(pattern, 'i');
				window.setTimeout = function(fn, delay, ...args) {
					if (typeof fn === 'string' && regex.test(fn)) return;
					if (typeof fn === 'function' && fn.toString && regex.test(fn.toString())) return;
					return orig.call(this, fn, delay, ...args);
				};
			} catch (_) {}
		},

		'prevent-setInterval': (pattern) => {
			try {
				const orig = window.setInterval;
				const regex = new RegExp(pattern, 'i');
				window.setInterval = function(fn, delay, ...args) {
					if (typeof fn === 'string' && regex.test(fn)) return;
					if (typeof fn === 'function' && fn.toString && regex.test(fn.toString())) return;
					return orig.call(this, fn, delay, ...args);
				};
			} catch (_) {}
		},

		'prevent-eval': () => {
			try {
				window.eval = function() {
					return undefined;
				};
			} catch (_) {}
		},

		'prevent-function-constructor': () => {
			try {
				const orig = window.Function;
				window.Function = function(...args) {
					const body = args[args.length - 1];
					if (typeof body === 'string' && /ad|ads|advert|banner|sponsor/i.test(body)) {
						return function() {};
					}
					return orig.apply(this, args);
				};
			} catch (_) {}
		},

		'prevent-image-src': (pattern) => {
			try {
				const orig = Object.getOwnPropertyDescriptor(Image.prototype, 'src');
				if (!orig) return;
				const regex = new RegExp(pattern, 'i');
				Object.defineProperty(Image.prototype, 'src', {
					set: function(url) {
						if (regex.test(url)) return;
						return orig.set.call(this, url);
					},
					get: orig.get,
					configurable: true
				});
			} catch (_) {}
		},

		'prevent-script-src': (pattern) => {
			try {
				const orig = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
				if (!orig) return;
				const regex = new RegExp(pattern, 'i');
				Object.defineProperty(HTMLScriptElement.prototype, 'src', {
					set: function(url) {
						if (regex.test(url)) return;
						return orig.set.call(this, url);
					},
					get: orig.get,
					configurable: true
				});
			} catch (_) {}
		},

		'prevent-iframe-src': (pattern) => {
			try {
				const orig = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
				if (!orig) return;
				const regex = new RegExp(pattern, 'i');
				Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
					set: function(url) {
						if (regex.test(url)) return;
						return orig.set.call(this, url);
					},
					get: orig.get,
					configurable: true
				});
			} catch (_) {}
		},

		'remove-cookie': (name) => {
			try {
				const remove = () => {
					document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
					document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname;
					document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
				};
				remove();
				setInterval(remove, 1000);
			} catch (_) {}
		},

		'remove-localStorage-item': (key) => {
			try {
				localStorage.removeItem(key);
				const orig = Storage.prototype.setItem;
				Storage.prototype.setItem = function(k, v) {
					if (k === key) return;
					return orig.call(this, k, v);
				};
			} catch (_) {}
		},

		'remove-sessionStorage-item': (key) => {
			try {
				sessionStorage.removeItem(key);
				const orig = Storage.prototype.setItem;
				Storage.prototype.setItem = function(k, v) {
					if (k === key) return;
					return orig.call(this, k, v);
				};
			} catch (_) {}
		},

		'log': (message) => {
			console.log('[WP AdBlocker]', message);
		},

		'debug': (data) => {
			console.log('[WP AdBlocker Debug]', data);
		},
	};

	const _wp_domainScriptlets = {
		'youtube.com': [
			['set-constant', 'ytInitialPlayerResponse.adPlacements', 'undefined'],
			['set-constant', 'ytInitialPlayerResponse.playerAds', 'undefined'],
			['abort-on-property-write', 'ytInitialPlayerResponse.adSlots'],
			['json-prune', 'adPlacements playerAds'],
		],
		'reddit.com': [
			['prevent-window-open'],
		],
		'facebook.com': [
			['prevent-fetch'],
			['prevent-xhr'],
		],
		'twitter.com': [
			['prevent-fetch', 'ads-api.twitter.com'],
			['prevent-xhr', 'ads-api.twitter.com'],
		],
		'x.com': [
			['prevent-fetch', 'ads-api.twitter.com'],
			['prevent-xhr', 'ads-api.twitter.com'],
		],
		'*': [
			['prevent-window-open'],
			['abort-on-property-write', 'adblock'],
			['abort-on-property-write', 'AdBlock'],
			['set-constant', 'adblockDetected', 'false'],
			['set-constant', 'blockAdBlock', 'noopFunc'],
			['set-constant', 'fuckAdBlock', 'noopFunc'],
			['prevent-bab'],
		]
	};

	function _wp_runScriptlets() {
		const universal = _wp_domainScriptlets['*'] || [];
		universal.forEach(([name, ...args]) => {
			if (_wp_scriptlets[name]) {
				try {
					_wp_scriptlets[name](...args);
				} catch (_) {}
			}
		});

		for (const [domain, rules] of Object.entries(_wp_domainScriptlets)) {
			if (domain === '*') continue;
			if (_host === domain || _host.endsWith('.' + domain)) {
				rules.forEach(([name, ...args]) => {
					if (_wp_scriptlets[name]) {
						try {
							_wp_scriptlets[name](...args);
						} catch (_) {}
					}
				});
			}
		}
	}

	_wp_runScriptlets();

	const _wp_removeSelectors = [
		'script[src*="googlesyndication"]',
		'script[src*="doubleclick"]',
		'script[src*="googletagmanager"]',
		'script[src*="amazon-adsystem"]',
		'script[src*="adnxs.com"]',
		'script[src*="outbrain"]',
		'script[src*="taboola"]',
		'script[src*="criteo"]',
		'script[src*="hotjar"]',
		'script[src*="clarity.ms"]',
		'script[src*="c.clarity.ms"]',
		'script[src*="/cl/s/"]',
		'link[href*="googlesyndication"]',
		'img[src*="doubleclick"]',
		'img[src*="googlesyndication"]',
	];

	function _wp_removeElements() {
		_wp_removeSelectors.forEach(sel => {
			try {
				document.querySelectorAll(sel).forEach(el => el.remove());
			} catch (_) {}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', _wp_removeElements);
	} else {
		_wp_removeElements();
	}

	const _wp_removalObserver = new MutationObserver((muts) => {
		if (muts.some(m => m.addedNodes.length)) _wp_removeElements();
	});
	_wp_removalObserver.observe(document.documentElement, {
		childList: true,
		subtree: true
	});

	async function _wp_loadRules() {
		if (window.__wpBlockRules && window.__wpBlockRules.length > 0) {
			_wp_dnrRules = window.__wpBlockRules;
			_wp_compiledRules = _wp_compileDnrRules();
			console.log('[WP AdBlocker] Loaded', _wp_dnrRules.length, 'embedded rules');
		} else {
			console.warn('[WP AdBlocker] No embedded rules found');
			_wp_dnrRules = [];
			_wp_compiledRules = [];
		}
	}

	_wp_loadRules();

	window.__wpAdBlocker = {
		version: '1039300',
		isBlocked: (url, type) => _wp_shouldBlock(url, type),
		addRule: (rule) => {
			_wp_dnrRules.push(rule);
			_wp_compiledRules = _wp_compileDnrRules();
		},
		addDomain: (domain) => {
			_wp_dnrRules.push({
				id: Date.now(),
				priority: 1,
				action: {
					type: 'block'
				},
				condition: {
					urlFilter: '||' + domain + '^',
					resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
				}
			});
			_wp_compiledRules = _wp_compileDnrRules();
		},
		addTrackerDomain: (domain) => {
			_wp_dnrRules.push({
				id: Date.now(),
				priority: 1,
				action: {
					type: 'block'
				},
				condition: {
					urlFilter: '||' + domain + '^',
					resourceTypes: ['script', 'xmlhttprequest', 'ping', 'other']
				}
			});
			_wp_compiledRules = _wp_compileDnrRules();
		},
		addPattern: (pattern) => {
			_wp_dnrRules.push({
				id: Date.now(),
				priority: 1,
				action: {
					type: 'block'
				},
				condition: {
					urlFilter: pattern,
					resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
				}
			});
			_wp_compiledRules = _wp_compileDnrRules();
		},
		addSelector: (sel) => {
			_wp_cosmeticRules.push(sel);
			_wp_applyCosmetics();
		},
		addScriptlet: (name, fn) => {
			_wp_scriptlets[name] = fn;
		},
		setConfig: (cfg) => {
			Object.assign(_wp_config, cfg);
		},
		getConfig: () => ({
			..._wp_config
		}),
		getStats: () => ({
			dnrRules: _wp_dnrRules.length,
			compiledRules: _wp_compiledRules.length,
			cosmeticRules: _wp_cosmeticRules.length,
			scriptlets: Object.keys(_wp_scriptlets).length,
			cacheSize: _wp_requestCache.size,
		}),
		clearCache: () => {
			_wp_requestCache.clear();
		},
		refreshRules: () => {
			_wp_compileDnrRules();
		},
		reloadRules: async () => {
			await _wp_loadRules();
		},
		exportRules: () => JSON.stringify(_wp_dnrRules, null, 2),
		importRules: (json) => {
			try {
				const rules = JSON.parse(json);
				_wp_dnrRules.push(...rules);
				_wp_compileDnrRules();
				return true;
			} catch (e) {
				return false;
			}
		}
	};

})();
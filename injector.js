(function() {
	const _wp_noop = () => {};

	const _wp_def = (obj, prop, value) => {
		try {
			Object.defineProperty(obj, prop, {
				get: typeof value === 'function' ? value : () => value,
				configurable: true,
				enumerable: true
			});
		} catch (_) {}
	};

	_wp_def(navigator, 'webdriver', false);
	try {
		delete navigator.__proto__.webdriver;
	} catch (_) {}

	const _wp_cdcKeys = [
		'cdc_adoQpoasnfa76pfcZLmcfl_',
		'cdc_adoQpoasnfa76pfcZLmcfl_Array',
		'cdc_adoQpoasnfa76pfcZLmcfl_Promise',
		'cdc_adoQpoasnfa76pfcZLmcfl_Symbol',
		'cdc_adoQpoasnfa76pfcZLmcfl_JSON',
		'$chrome_asyncScriptInfo',
		'$cdc_asdjflasutopfhvcZLmcfl_'
	];
	_wp_cdcKeys.forEach(k => {
		try {
			delete window[k];
		} catch (_) {}
		try {
			_wp_def(window, k, undefined);
		} catch (_) {}
	});

	const _wp_mimeTypes = [{
			type: 'application/pdf',
			suffixes: 'pdf',
			description: 'Portable Document Format'
		},
		{
			type: 'application/x-google-chrome-pdf',
			suffixes: 'pdf',
			description: 'Portable Document Format'
		},
		{
			type: 'application/x-nacl',
			suffixes: '',
			description: 'Native Client Executable'
		},
		{
			type: 'application/x-pnacl',
			suffixes: '',
			description: 'Portable Native Client Executable'
		},
	];
	const _wp_pluginsDef = [{
			name: 'Chrome PDF Plugin',
			filename: 'internal-pdf-viewer',
			description: 'Portable Document Format',
			mimes: [0, 1]
		},
		{
			name: 'Chrome PDF Viewer',
			filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
			description: '',
			mimes: [0]
		},
		{
			name: 'Native Client',
			filename: 'internal-nacl-plugin',
			description: '',
			mimes: [2, 3]
		},
	];
	const _wp_fakePlugins = _wp_pluginsDef.map(p => {
		const plugin = Object.create(Plugin.prototype);
		_wp_def(plugin, 'name', p.name);
		_wp_def(plugin, 'filename', p.filename);
		_wp_def(plugin, 'description', p.description);
		_wp_def(plugin, 'length', p.mimes.length);
		p.mimes.forEach((mi, i) => {
			const m = _wp_mimeTypes[mi];
			const mime = Object.create(MimeType.prototype);
			_wp_def(mime, 'type', m.type);
			_wp_def(mime, 'suffixes', m.suffixes);
			_wp_def(mime, 'description', m.description);
			_wp_def(mime, 'enabledPlugin', plugin);
			_wp_def(plugin, i, mime);
			_wp_def(plugin, m.type, mime);
		});
		return plugin;
	});
	const _wp_pluginArray = Object.create(PluginArray.prototype);
	_wp_pluginsDef.forEach((_, i) => _wp_def(_wp_pluginArray, i, _wp_fakePlugins[i]));
	_wp_def(_wp_pluginArray, 'length', _wp_fakePlugins.length);
	_wp_pluginArray.item = i => _wp_fakePlugins[i] || null;
	_wp_pluginArray.namedItem = name => _wp_fakePlugins.find(p => p.name === name) || null;
	_wp_pluginArray.refresh = _wp_noop;
	_wp_pluginArray.toString = () => '[object PluginArray]';
	_wp_pluginArray[Symbol.toStringTag] = 'PluginArray';
	_wp_def(navigator, 'plugins', _wp_pluginArray);

	const _wp_mimeTypeArray = Object.create(MimeTypeArray.prototype);
	_wp_mimeTypes.forEach((m, i) => {
		const mime = Object.create(MimeType.prototype);
		_wp_def(mime, 'type', m.type);
		_wp_def(mime, 'suffixes', m.suffixes);
		_wp_def(mime, 'description', m.description);
		_wp_def(_wp_mimeTypeArray, i, mime);
		_wp_def(_wp_mimeTypeArray, m.type, mime);
	});
	_wp_def(_wp_mimeTypeArray, 'length', _wp_mimeTypes.length);
	_wp_mimeTypeArray.toString = () => '[object MimeTypeArray]';
	_wp_mimeTypeArray[Symbol.toStringTag] = 'MimeTypeArray';
	_wp_def(navigator, 'mimeTypes', _wp_mimeTypeArray);

	_wp_def(navigator, 'languages', ['en-US', 'en']);
	_wp_def(navigator, 'language', 'en-US');
	_wp_def(navigator, 'hardwareConcurrency', 8);
	try {
		_wp_def(navigator, 'deviceMemory', 8);
	} catch (_) {}

	try {
		if (navigator.getBattery) {
			navigator.getBattery = () => Promise.resolve({
				charging: true,
				chargingTime: 0,
				dischargingTime: Infinity,
				level: 1,
				addEventListener: _wp_noop,
				removeEventListener: _wp_noop,
				dispatchEvent: () => true
			});
		}
	} catch (_) {}

	try {
		if (navigator.connection) {
			_wp_def(navigator.connection, 'rtt', 100);
			_wp_def(navigator.connection, 'downlink', 10);
			_wp_def(navigator.connection, 'effectiveType', '4g');
			_wp_def(navigator.connection, 'saveData', false);
		}
	} catch (_) {}

	if (!window.chrome) Object.defineProperty(window, 'chrome', {
		value: {},
		configurable: true,
		writable: true
	});
	window.chrome.runtime = Object.assign(window.chrome.runtime || {}, {
		id: undefined,
		connect: _wp_noop,
		sendMessage: _wp_noop,
		onMessage: {
			addListener: _wp_noop,
			removeListener: _wp_noop,
			hasListener: () => false
		},
		onConnect: {
			addListener: _wp_noop,
			removeListener: _wp_noop,
			hasListener: () => false
		},
		onInstalled: {
			addListener: _wp_noop
		},
		OnInstalledReason: {
			CHROME_UPDATE: 'chrome_update',
			INSTALL: 'install',
			SHARED_MODULE_UPDATE: 'shared_module_update',
			UPDATE: 'update'
		},
		OnRestartRequiredReason: {
			APP_UPDATE: 'app_update',
			OS_UPDATE: 'os_update',
			PERIODIC: 'periodic'
		},
		PlatformArch: {
			ARM: 'arm',
			ARM64: 'arm64',
			MIPS: 'mips',
			MIPS64: 'mips64',
			X86_32: 'x86-32',
			X86_64: 'x86-64'
		},
		PlatformNaclArch: {
			ARM: 'arm',
			MIPS: 'mips',
			MIPS64: 'mips64',
			MIPS64EL: 'mips64el',
			MIPSEL: 'mipsel',
			X86_32: 'x86-32',
			X86_64: 'x86-64'
		},
		PlatformOs: {
			ANDROID: 'android',
			CROS: 'cros',
			LINUX: 'linux',
			MAC: 'mac',
			OPENBSD: 'openbsd',
			WIN: 'win'
		},
		RequestUpdateCheckStatus: {
			NO_UPDATE: 'no_update',
			THROTTLED: 'throttled',
			UPDATE_AVAILABLE: 'update_available'
		}
	});
	if (!window.chrome.app) {
		window.chrome.app = {
			isInstalled: false,
			InstallState: {
				DISABLED: 'disabled',
				INSTALLED: 'installed',
				NOT_INSTALLED: 'not_installed'
			},
			RunningState: {
				CANNOT_RUN: 'cannot_run',
				READY_TO_RUN: 'ready_to_run',
				RUNNING: 'running'
			},
			getDetails: _wp_noop,
			getIsInstalled: _wp_noop,
			installState: _wp_noop
		};
	}
	if (!window.chrome.csi) window.chrome.csi = () => ({
		startE: Date.now(),
		onloadT: Date.now(),
		pageT: Date.now(),
		tran: 15
	});
	if (!window.chrome.loadTimes) window.chrome.loadTimes = () => ({
		requestTime: Date.now() / 1000,
		startLoadTime: Date.now() / 1000,
		commitLoadTime: Date.now() / 1000,
		finishDocumentLoadTime: Date.now() / 1000,
		finishLoadTime: Date.now() / 1000,
		firstPaintTime: Date.now() / 1000,
		firstPaintAfterLoadTime: 0,
		navigationType: 'Other',
		wasFetchedViaSpdy: true,
		wasNpnNegotiated: true,
		npnNegotiatedProtocol: 'h2',
		wasAlternateProtocolAvailable: false,
		connectionInfo: 'h2'
	});

	const _wp_origPermQuery = window.Permissions && window.Permissions.prototype.query;
	if (_wp_origPermQuery) {
		window.Permissions.prototype.query = function(params) {
			const _prompt = ['geolocation', 'notifications', 'push', 'midi', 'camera', 'microphone', 'speaker', 'device-info', 'background-fetch', 'background-sync', 'bluetooth', 'persistent-storage', 'ambient-light-sensor', 'accelerometer', 'gyroscope', 'magnetometer', 'clipboard-read', 'clipboard-write', 'payment-handler', 'idle-detection', 'periodic-background-sync', 'screen-wake-lock', 'nfc', 'display-capture', 'storage-access'];
			if (_prompt.includes(params.name)) return Promise.resolve({
				state: 'prompt',
				onchange: null
			});
			return _wp_origPermQuery.call(this, params);
		};
	}

	try {
		if (typeof Notification !== 'undefined') {
			Object.defineProperty(Notification, 'permission', {
				get: () => 'default',
				configurable: true
			});
		}
	} catch (_) {}

	const _wp_patchWindow = (win) => {
		try {
			if (!win || win.__wpPatched) return;
			win.__wpPatched = true;
			const navDef = (prop, val) => {
				try {
					Object.defineProperty(win.navigator, prop, {
						get: typeof val === 'function' ? val : () => val,
						configurable: true
					});
				} catch (_) {}
			};
			navDef('webdriver', false);
			navDef('languages', ['en-US', 'en']);
			navDef('language', 'en-US');
			navDef('hardwareConcurrency', 8);
			try {
				delete win.navigator.__proto__.webdriver;
			} catch (_) {}
			_wp_cdcKeys.forEach(k => {
				try {
					delete win[k];
				} catch (_) {}
			});
		} catch (_) {}
	};

	const _wp_origContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
	if (_wp_origContentWindow) {
		Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
			get: function() {
				const win = _wp_origContentWindow.get.call(this);
				try {
					_wp_patchWindow(win);
				} catch (_) {}
				return win;
			},
			configurable: true,
			enumerable: true
		});
	}

	const _wp_patchAllIframes = (root) => {
		try {
			(root || document).querySelectorAll('iframe').forEach(f => {
				try {
					const w = f.contentWindow;
					if (w) _wp_patchWindow(w);
				} catch (_) {}
			});
		} catch (_) {}
	};
	new MutationObserver(() => _wp_patchAllIframes()).observe(document.documentElement, {
		childList: true,
		subtree: true
	});

	const _wp_glPatch = (ctx) => {
		const orig = ctx.prototype.getParameter;
		ctx.prototype.getParameter = function(param) {
			if (param === 37445) return 'Intel Inc.';
			if (param === 37446) return 'Intel Iris OpenGL Engine';
			return orig.call(this, param);
		};
	};
	try {
		_wp_glPatch(WebGLRenderingContext);
	} catch (_) {}
	try {
		_wp_glPatch(WebGL2RenderingContext);
	} catch (_) {}

	const _wp_origToDataURL = HTMLCanvasElement.prototype.toDataURL;
	HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
		const ctx = this.getContext('2d');
		if (ctx) {
			try {
				const imgData = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
				for (let i = 0; i < imgData.data.length; i += 400) imgData.data[i] ^= 1;
				ctx.putImageData(imgData, 0, 0);
			} catch (_) {}
		}
		return _wp_origToDataURL.call(this, type, quality);
	};
	const _wp_origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
	CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
		const data = _wp_origGetImageData.call(this, x, y, w, h);
		for (let i = 0; i < data.data.length; i += 400) data.data[i] ^= 1;
		return data;
	};

	try {
		const _wp_origGetChannelData = AudioBuffer.prototype.getChannelData;
		AudioBuffer.prototype.getChannelData = function() {
			const arr = _wp_origGetChannelData.apply(this, arguments);
			for (let i = 0; i < arr.length; i += 500) arr[i] += Math.random() * 0.0000001;
			return arr;
		};
		const _wp_origCopyFrom = AudioBuffer.prototype.copyFromChannel;
		if (_wp_origCopyFrom) {
			AudioBuffer.prototype.copyFromChannel = function(dest) {
				_wp_origCopyFrom.apply(this, arguments);
				for (let i = 0; i < dest.length; i += 500) dest[i] += Math.random() * 0.0000001;
			};
		}
	} catch (_) {}

	try {
		_wp_def(window, 'outerWidth', () => window.innerWidth);
	} catch (_) {}
	try {
		_wp_def(window, 'outerHeight', () => window.innerHeight + 85);
	} catch (_) {}
	try {
		_wp_def(screen, 'availWidth', () => window.screen.width);
	} catch (_) {}
	try {
		_wp_def(screen, 'availHeight', () => window.screen.height - 40);
	} catch (_) {}

	try {
		if (window.performance && performance.memory) {
			Object.defineProperty(performance, 'memory', {
				get: () => ({
					jsHeapSizeLimit: 2190000000,
					totalJSHeapSize: 50000000,
					usedJSHeapSize: 24100000
				}),
				configurable: true
			});
		}
	} catch (_) {}

	const _wp_origFnToString = Function.prototype.toString;
	const _wp_patchedFns = new WeakSet();
	Function.prototype.toString = function() {
		if (_wp_patchedFns.has(this)) return `function ${this.name || ''}() { [native code] }`;
		return _wp_origFnToString.call(this);
	};
	[
		WebGLRenderingContext.prototype.getParameter,
		HTMLCanvasElement.prototype.toDataURL,
		CanvasRenderingContext2D.prototype.getImageData,
		navigator.getBattery,
		window.Permissions && window.Permissions.prototype.query
	].forEach(fn => {
		try {
			if (fn) _wp_patchedFns.add(fn);
		} catch (_) {}
	});

	const _wp_origHasOwn = Object.prototype.hasOwnProperty;
	const _wp_hiddenProps = new Set([
		'__wpScript', '__wpNet', '__wpOrigFetch', 'webPanelInitialized', '__stealthFetch',
		'__wpInterceptorActive', '__wpScriptObserverActive', '__cfInterceptorActive',
		'__cfInterceptorData', '__cfInterceptorClear', '__cfInterceptorStatus',
		'__wpPatched', '__wpInterceptorActive'
	]);
	const _wp_origGetOwnPropDesc = Object.getOwnPropertyDescriptor;
	Object.getOwnPropertyDescriptor = function(obj, prop) {
		if (obj === window && _wp_hiddenProps.has(prop)) return undefined;
		return _wp_origGetOwnPropDesc.call(this, obj, prop);
	};

	Object.prototype.hasOwnProperty = function(prop) {
		if (this === window && _wp_hiddenProps.has(prop)) return false;
		return _wp_origHasOwn.call(this, prop);
	};

	try {
		const _wp_origWorker = window.Worker;
		const _wp_workerPatch = `
(function(){
	var _def=function(o,p,v){try{Object.defineProperty(o,p,{get:typeof v==='function'?v:function(){return v;},configurable:true});}catch(e){}};
	if(typeof navigator!=='undefined'){
		_def(navigator,'webdriver',false);
		_def(navigator,'languages',['en-US','en']);
		_def(navigator,'language','en-US');
		_def(navigator,'hardwareConcurrency',8);
	}
	['cdc_adoQpoasnfa76pfcZLmcfl_','cdc_adoQpoasnfa76pfcZLmcfl_Array','cdc_adoQpoasnfa76pfcZLmcfl_Promise','cdc_adoQpoasnfa76pfcZLmcfl_Symbol'].forEach(function(k){try{delete self[k];}catch(e){}});
})();
`;
		window.Worker = function(url, opts) {
			if (typeof url === 'string') {
				try {
					const blob = new Blob([_wp_workerPatch + '\n'], {
						type: 'application/javascript'
					});
					const patchUrl = URL.createObjectURL(blob);
					const importScript = `importScripts(${JSON.stringify(patchUrl)});importScripts(${JSON.stringify(url)});`;
					const wrapped = new Blob([importScript], {
						type: 'application/javascript'
					});
					return new _wp_origWorker(URL.createObjectURL(wrapped), opts);
				} catch (_) {
					return new _wp_origWorker(url, opts);
				}
			}
			return new _wp_origWorker(url, opts);
		};
		window.Worker.prototype = _wp_origWorker.prototype;
	} catch (_) {}
})();

(function() {
	if (window.__wpInterceptorActive) return;
	window.__wpInterceptorActive = true;

	function postLog(entry) {
		try {
			window.postMessage({
				__wpNet: entry
			}, "*");
		} catch (e) {
			console.warn('Failed to post network log:', e);
		}
	}

	// Deduplication: same method+url within 500ms → tag entry instead of flooding log
	const _wp_dedupeMap = new Map();
	function _wp_tagDedupe(entry) {
		const key = `${entry.method || 'GET'}:${entry.url}`;
		const now  = entry.timestamp || performance.now();
		const prev = _wp_dedupeMap.get(key);
		if (prev && (now - prev.lastTime) < 500) {
			entry.dedupeOf    = prev.lastId;
			entry.dedupeIndex = ++prev.count;
			prev.lastTime = now;
			prev.lastId   = entry.id;
		} else {
			_wp_dedupeMap.set(key, { lastId: entry.id, count: 1, lastTime: now });
		}
	}

	const getSize = (obj) => {
		try {
			if (obj instanceof Blob) return obj.size;
			if (obj instanceof ArrayBuffer) return obj.byteLength;
			if (obj instanceof FormData) {
				let size = 0;
				for (let [key, value] of obj.entries()) {
					size += key.length;
					if (value instanceof Blob) size += value.size;
					else size += String(value).length;
				}
				return size;
			}
			if (typeof obj === 'string') return obj.length;
			if (obj && typeof obj === 'object') return JSON.stringify(obj).length;
			return 0;
		} catch (e) {
			return 0;
		}
	};

	const safeStringify = (obj, maxDepth = 10, currentDepth = 0) => {
		if (currentDepth > maxDepth) return '[Max Depth Reached]';
		try {
			if (obj === null) return 'null';
			if (obj === undefined) return 'undefined';
			if (obj instanceof Blob) return `[Blob: ${obj.type}, ${obj.size} bytes]`;
			if (obj instanceof File) return `[File: ${obj.name}, ${obj.type}, ${obj.size} bytes]`;
			if (obj instanceof ArrayBuffer) return `[ArrayBuffer: ${obj.byteLength} bytes]`;
			if (obj instanceof FormData) {
				const result = {};
				for (let [key, value] of obj.entries()) {
					if (value instanceof File) result[key] = `[File: ${value.name}, ${value.type}, ${value.size} bytes]`;
					else if (value instanceof Blob) result[key] = `[Blob: ${value.type}, ${value.size} bytes]`;
					else result[key] = value;
				}
				return result;
			}
			if (obj instanceof Headers) {
				const result = {};
				obj.forEach((v, k) => result[k] = v);
				return result;
			}
			if (obj instanceof URLSearchParams) {
				const result = {};
				obj.forEach((v, k) => result[k] = v);
				return result;
			}
			// Multipart/form-data as raw string — parse boundary sections into key:value map
			if (typeof obj === 'string' && obj.indexOf('Content-Disposition: form-data') !== -1) {
				try {
					const boundaryMatch = obj.match(/^--([^\r\n]+)/);
					if (boundaryMatch) {
						const boundary = boundaryMatch[1].trimEnd();
						const parts = obj.split('--' + boundary);
						const result = {};
						for (const part of parts) {
							if (!part || part.trim() === '--' || part.trim() === '') continue;
							const dispMatch = part.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
							if (!dispMatch) continue;
							const [, fieldName, fileName] = dispMatch;
							const ctMatch = part.match(/Content-Type: ([^\r\n]+)/i);
							const bodyMatch = part.match(/\r?\n\r?\n([\s\S]*?)\r?\n?$/);
							if (fileName) {
								result[fieldName] = `[File: ${fileName}, ${ctMatch?.[1] || 'application/octet-stream'}]`;
							} else {
								result[fieldName] = bodyMatch ? bodyMatch[1] : '';
							}
						}
						return result;
					}
				} catch (_) {}
			}
			if (obj && typeof obj === 'object') {
				const seen = new Set();
				return JSON.stringify(obj, (key, value) => {
					if (typeof value === 'object' && value !== null) {
						if (seen.has(value)) return '[Circular]';
						seen.add(value);
					}
					if (value instanceof Blob) return `[Blob: ${value.type}, ${value.size} bytes]`;
					if (value instanceof File) return `[File: ${value.name}, ${value.type}, ${value.size} bytes]`;
					if (value instanceof ArrayBuffer) return `[ArrayBuffer: ${value.byteLength} bytes]`;
					if (value instanceof Function) return '[Function]';
					return value;
				});
			}
			return String(obj);
		} catch (e) {
			return `[Stringify Error: ${e.message}]`;
		}
	};

	const getTiming = () => {
		try {
			const perf = performance.getEntriesByType('navigation')[0];
			if (perf) {
				return {
					dnsLookup: perf.domainLookupEnd - perf.domainLookupStart,
					tcpConnection: perf.connectEnd - perf.connectStart,
					requestTime: perf.responseStart - perf.requestStart,
					responseTime: perf.responseEnd - perf.responseStart,
					domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
					loadComplete: perf.loadEventEnd - perf.loadEventStart
				};
			}
		} catch (e) {}
		return {};
	};

	// ── AbortSignal.any polyfill ─────────────────────────────────────────────
	// Native AbortSignal.any (Chrome 116+, Firefox 124+) combines N signals so
	// that the first abort wins.  The polyfill below covers older environments:
	//   • checks each signal for pre-existing aborted state before wiring
	//   • propagates abort reason (not just the boolean flag)
	//   • cleans up all listeners once the combined signal fires
	//   • uses { once: true } so listeners self-remove and cannot double-fire
	const _wp_combineSignals = (signals) => {
		// If any signal is already aborted, return a pre-aborted signal immediately.
		for (const s of signals) {
			if (s && s.aborted) {
				return typeof AbortSignal.abort === 'function'
					? AbortSignal.abort(s.reason)
					: (() => { const c = new AbortController(); c.abort(s.reason); return c.signal; })();
			}
		}

		const ctrl = new AbortController();
		const listeners = [];

		for (const s of signals) {
			if (!s || typeof s.addEventListener !== 'function') continue;
			const handler = () => {
				if (!ctrl.signal.aborted) ctrl.abort(s.reason);
			};
			s.addEventListener('abort', handler, { once: true });
			listeners.push([s, handler]);
		}

		// When the combined signal aborts, detach all individual listeners to
		// prevent memory leaks in long-lived pages.
		ctrl.signal.addEventListener('abort', () => {
			for (const [s, fn] of listeners) {
				try { s.removeEventListener('abort', fn); } catch (_) {}
			}
			listeners.length = 0;
		}, { once: true });

		return ctrl.signal;
	};

	// Prefer native, fall back to polyfill.
	const _wp_anySignal = typeof AbortSignal.any === 'function'
		? (sigs) => AbortSignal.any(sigs)
		: _wp_combineSignals;
	// ────────────────────────────────────────────────────────────────────────

	const _fetch = window.fetch;
	window.fetch = async function(...args) {
		const startTime = performance.now();
		const input = args[0];
		const init = args[1] || {};

		let url, method, headers = {},
			body = null,
			requestId = Math.random().toString(36).substr(2, 16);

		if (typeof input === "string") url = input;
		else if (input instanceof Request) {
			url = input.url;
			method = input.method;
			if (input.headers) input.headers.forEach((v, k) => headers[k] = v);
			body = input.body;
		} else if (input instanceof URL) url = input.href;
		else url = String(input);

		method = method || init?.method || "GET";

		if (init?.headers) {
			if (init.headers instanceof Headers) init.headers.forEach((v, k) => headers[k] = v);
			else if (typeof init.headers === "object") Object.assign(headers, init.headers);
		}

		if (init?.body) body = init.body;

		const params = {};
		try {
			const u = new URL(url, location.href);
			u.searchParams.forEach((v, k) => params[k] = v);
			url = u.href.split('?')[0];
		} catch (_) {}

		const entry = {
			id: requestId,
			type: "fetch",
			url: url,
			method: method,
			headers: headers,
			body: body ? safeStringify(body) : null,
			bodySize: getSize(body),
			params: params,
			timestamp: startTime,
			timestampISO: new Date().toISOString()
		};

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);
			let signal = controller.signal;

			if (init?.signal) {
				signal = _wp_anySignal([init.signal, controller.signal]);
			}

			const response = await _fetch.apply(this, [input, {
				...init,
				signal: signal
			}]);

			clearTimeout(timeoutId);

			const cloned = response.clone();
			const endTime = performance.now();

			entry.responseStatus = response.status;
			entry.responseStatusText = response.statusText;
			entry.responseHeaders = {};
			response.headers.forEach((v, k) => entry.responseHeaders[k] = v);
			entry.responseTimestamp = endTime;
			entry.responseTimestampISO = new Date().toISOString();
			entry.duration = endTime - startTime;
			entry.timing = getTiming();

			if (response.redirected) {
				entry.redirectUrl = response.url;
				entry.redirectCount = response.url !== url ? 1 : 0;
			}

			const contentType = response.headers.get("content-type") || "";
			try {
				if (contentType.includes("application/json")) {
					entry.responseBody = await cloned.json();
					entry.responseBodySize = JSON.stringify(entry.responseBody).length;
				} else if (contentType.includes("text/")) {
					entry.responseBody = await cloned.text();
					entry.responseBodySize = entry.responseBody.length;
				} else if (contentType.includes("application/octet-stream")) {
					const blob = await cloned.blob();
					entry.responseBody = `[Binary: ${blob.size} bytes, Type: ${blob.type}]`;
					entry.responseBodySize = blob.size;
				} else if (contentType.includes("image/")) {
					const blob = await cloned.blob();
					entry.responseBody = `[Image: ${blob.size} bytes, Type: ${blob.type}]`;
					entry.responseBodySize = blob.size;
				} else if (contentType.includes("video/") || contentType.includes("audio/")) {
					const blob = await cloned.blob();
					entry.responseBody = `[Media: ${blob.size} bytes, Type: ${blob.type}]`;
					entry.responseBodySize = blob.size;
				} else {
					const text = await cloned.text();
					entry.responseBody = text;
					entry.responseBodySize = text.length;
				}
			} catch (e) {
				entry.responseBody = `[Failed to read: ${e.message}]`;
				entry.responseError = e.message;
			}

			_wp_tagDedupe(entry);
			postLog(entry);
			return response;

		} catch (error) {
			const endTime = performance.now();
			entry.responseStatus = error.name === 'AbortError' ? 408 : 0;
			entry.responseStatusText = error.name === 'AbortError' ? 'Request Timeout' : `Error: ${error.message}`;
			entry.responseTimestamp = endTime;
			entry.duration = endTime - startTime;
			entry.error = error.message;
			entry.errorStack = error.stack;
			postLog(entry);
			throw error;
		}
	};

	const _open = XMLHttpRequest.prototype.open;
	const _send = XMLHttpRequest.prototype.send;
	const _setHeader = XMLHttpRequest.prototype.setRequestHeader;
	const _abort = XMLHttpRequest.prototype.abort;

	XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
		this._wpLog = {
			id: Math.random().toString(36).substr(2, 16),
			type: "xhr",
			method: method,
			url: url?.toString() || "unknown",
			headers: {},
			body: null,
			bodySize: 0,
			params: {},
			timestamp: performance.now(),
			timestampISO: new Date().toISOString(),
			async: async !== false,
			user: user || null,
			pass: pass ? '[REDACTED]' : null
		};

		try {
			const u = new URL(this._wpLog.url, location.href);
			u.searchParams.forEach((v, k) => this._wpLog.params[k] = v);
			this._wpLog.url = u.href.split('?')[0];
		} catch (_) {}

		return _open.apply(this, arguments);
	};

	XMLHttpRequest.prototype.setRequestHeader = function(k, v) {
		if (this._wpLog) this._wpLog.headers[k] = v;
		return _setHeader.apply(this, arguments);
	};

	XMLHttpRequest.prototype.abort = function() {
		if (this._wpLog && !this._wpLog.aborted) {
			this._wpLog.aborted = true;
			this._wpLog.abortTimestamp = performance.now();
			postLog(this._wpLog);
		}
		return _abort.apply(this, arguments);
	};

	XMLHttpRequest.prototype.send = function(body) {
		if (this._wpLog) {
			this._wpLog.body = body ? safeStringify(body) : null;
			this._wpLog.bodySize = getSize(body);

			const self = this;
			const startTime = performance.now();

			const origChange = this.onreadystatechange;
			this.onreadystatechange = function() {
				if (self.readyState === 4 && self._wpLog && !self._wpLog._sent && !self._wpLog.aborted) {
					self._wpLog._sent = true;
					const endTime = performance.now();

					self._wpLog.responseStatus = self.status;
					self._wpLog.responseStatusText = self.statusText;
					self._wpLog.responseHeaders = {};
					self._wpLog.responseTimestamp = endTime;
					self._wpLog.duration = endTime - startTime;

					const hStr = self.getAllResponseHeaders();
					if (hStr) {
						hStr.split("\r\n").forEach(line => {
							const idx = line.indexOf(": ");
							if (idx > -1) {
								const key = line.slice(0, idx);
								const value = line.slice(idx + 2);
								self._wpLog.responseHeaders[key] = value;
							}
						});
					}

					try {
						if (self.responseType === '' || self.responseType === 'text') {
							self._wpLog.responseBody = self.responseText;
							self._wpLog.responseBodySize = self.responseText?.length || 0;
						} else if (self.responseType === 'json') {
							self._wpLog.responseBody = self.response;
							self._wpLog.responseBodySize = JSON.stringify(self.response).length;
						} else if (self.responseType === 'arraybuffer') {
							self._wpLog.responseBody = `[ArrayBuffer: ${self.response?.byteLength || 0} bytes]`;
							self._wpLog.responseBodySize = self.response?.byteLength || 0;
						} else if (self.responseType === 'blob') {
							self._wpLog.responseBody = `[Blob: ${self.response?.size || 0} bytes, Type: ${self.response?.type || 'unknown'}]`;
							self._wpLog.responseBodySize = self.response?.size || 0;
						} else if (self.responseType === 'document') {
							self._wpLog.responseBody = `[Document: ${self.response?.documentElement?.nodeName || 'unknown'}]`;
							self._wpLog.responseBodySize = self.response?.documentElement?.outerHTML?.length || 0;
						} else {
							self._wpLog.responseBody = self.responseText?.substring(0, 1000) || '';
							self._wpLog.responseBodySize = self.responseText?.length || 0;
						}
					} catch (e) {
						self._wpLog.responseBody = `[Failed: ${e.message}]`;
						self._wpLog.responseError = e.message;
					}

					_wp_tagDedupe(self._wpLog);
					postLog(self._wpLog);
				}
				if (origChange) origChange.apply(this, arguments);
			};

			this.addEventListener('loadend', function() {
				if (this._wpLog && !this._wpLog._sent && !this._wpLog.aborted && this.readyState === 4) {
					this.onreadystatechange.call(this);
				}
			});
		}
		return _send.apply(this, arguments);
	};

	const _WebSocket = window.WebSocket;
	window.WebSocket = function(url, protocols) {
		const wsId = Math.random().toString(36).substr(2, 16);
		const startTime = performance.now();

		let ws;
		if (protocols) ws = new _WebSocket(url, protocols);
		else ws = new _WebSocket(url);

		const entry = {
			id: wsId,
			type: "websocket",
			url: url,
			protocols: protocols || [],
			timestamp: startTime,
			timestampISO: new Date().toISOString(),
			messages: [],
			state: ws.readyState,
			readyState: ws.readyState
		};

		const originalSend = ws.send;
		ws.send = function(data) {
			const msgEntry = {
				id: Math.random().toString(36).substr(2, 8),
				type: 'websocket_message',
				direction: 'send',
				data: safeStringify(data),
				dataType: data instanceof Blob ? 'blob' : data instanceof ArrayBuffer ? 'arraybuffer' : 'string',
				dataSize: getSize(data),
				timestamp: performance.now()
			};
			entry.messages.push(msgEntry);
			postLog({
				...entry,
				lastMessage: msgEntry,
				messageCount: entry.messages.length
			});
			return originalSend.call(this, data);
		};

		const originalAddEventListener = ws.addEventListener;
		ws.addEventListener = function(type, listener, options) {
			if (type === 'message') {
				const wrappedListener = function(event) {
					const msgEntry = {
						id: Math.random().toString(36).substr(2, 8),
						type: 'websocket_message',
						direction: 'receive',
						data: safeStringify(event.data),
						dataType: event.data instanceof Blob ? 'blob' : event.data instanceof ArrayBuffer ? 'arraybuffer' : 'string',
						dataSize: getSize(event.data),
						timestamp: performance.now()
					};
					entry.messages.push(msgEntry);
					postLog({
						...entry,
						lastMessage: msgEntry,
						messageCount: entry.messages.length
					});
					listener.call(this, event);
				};
				return originalAddEventListener.call(this, type, wrappedListener, options);
			}
			return originalAddEventListener.apply(this, arguments);
		};

		ws.addEventListener('open', () => {
			entry.state = ws.readyState;
			entry.readyState = ws.readyState;
			entry.openTimestamp = performance.now();
			entry.duration = entry.openTimestamp - startTime;
			postLog(entry);
		});

		ws.addEventListener('close', (event) => {
			entry.state = ws.readyState;
			entry.readyState = ws.readyState;
			entry.closeTimestamp = performance.now();
			entry.closeCode = event.code;
			entry.closeReason = event.reason;
			entry.wasClean = event.wasClean;
			entry.totalDuration = entry.closeTimestamp - startTime;
			postLog(entry);
		});

		ws.addEventListener('error', (error) => {
			entry.error = error.message || 'WebSocket error';
			entry.errorTimestamp = performance.now();
			postLog(entry);
		});

		return ws;
	};

	window.WebSocket.prototype = _WebSocket.prototype;

	const _EventSource = window.EventSource;
	window.EventSource = function(url, eventSourceInitDict) {
		const esId = Math.random().toString(36).substr(2, 16);
		const startTime = performance.now();

		const es = new _EventSource(url, eventSourceInitDict);

		const entry = {
			id: esId,
			type: "eventsource",
			url: url,
			withCredentials: eventSourceInitDict?.withCredentials || false,
			timestamp: startTime,
			timestampISO: new Date().toISOString(),
			events: [],
			state: es.readyState,
			readyState: es.readyState
		};

		es._wpEntry = entry;

		const originalAddEventListener = es.addEventListener;
		es.addEventListener = function(type, listener, options) {
			if (type !== 'open' && type !== 'error') {
				const wrappedListener = function(event) {
					const eventEntry = {
						id: Math.random().toString(36).substr(2, 8),
						type: 'eventsource_event',
						eventType: type,
						data: event.data,
						lastEventId: event.lastEventId,
						origin: event.origin,
						timestamp: performance.now()
					};
					entry.events.push(eventEntry);
					postLog({
						...entry,
						lastEvent: eventEntry,
						eventCount: entry.events.length
					});
					listener.call(this, event);
				};
				return originalAddEventListener.call(this, type, wrappedListener, options);
			}
			return originalAddEventListener.apply(this, arguments);
		};

		const originalOnMessageDescriptor = Object.getOwnPropertyDescriptor(EventSource.prototype, 'onmessage');
		if (originalOnMessageDescriptor) {
			Object.defineProperty(es, 'onmessage', {
				get: function() {
					return originalOnMessageDescriptor.get.call(this);
				},
				set: function(handler) {
					const wrappedHandler = (event) => {
						const eventEntry = {
							id: Math.random().toString(36).substr(2, 8),
							type: 'eventsource_event',
							eventType: 'message',
							data: event.data,
							lastEventId: event.lastEventId,
							origin: event.origin,
							timestamp: performance.now()
						};
						entry.events.push(eventEntry);
						postLog({
							...entry,
							lastEvent: eventEntry,
							eventCount: entry.events.length
						});
						if (typeof handler === 'function') handler(event);
					};
					originalOnMessageDescriptor.set.call(this, wrappedHandler);
				},
				configurable: true
			});
		}

		const updateState = () => {
			entry.state = es.readyState;
			entry.readyState = es.readyState;
			if (es.readyState === 1 && !entry.openTimestamp) {
				entry.openTimestamp = performance.now();
				entry.duration = entry.openTimestamp - startTime;
			} else if (es.readyState === 2 && !entry.closeTimestamp) {
				entry.closeTimestamp = performance.now();
				entry.totalDuration = entry.closeTimestamp - startTime;
			}
			postLog(entry);
		};

		es.addEventListener('open', () => updateState());
		es.addEventListener('error', (error) => {
			entry.error = error.message || 'EventSource error';
			entry.errorTimestamp = performance.now();
			updateState();
		});

		return es;
	};

	window.EventSource.prototype = _EventSource.prototype;

	const _sendBeacon = navigator.sendBeacon;
	navigator.sendBeacon = function(url, data) {
		const entry = {
			id: Math.random().toString(36).substr(2, 16),
			type: "beacon",
			url: url,
			data: safeStringify(data),
			dataType: data instanceof Blob ? 'blob' : data instanceof FormData ? 'formdata' : typeof data,
			dataSize: getSize(data),
			timestamp: performance.now(),
			timestampISO: new Date().toISOString()
		};

		const result = _sendBeacon.call(this, url, data);
		entry.success = result;
		postLog(entry);

		return result;
	};

	const _RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
	if (_RTCPeerConnection) {
		window.RTCPeerConnection = function(configuration) {
			const pcId = Math.random().toString(36).substr(2, 16);
			const startTime = performance.now();

			const pc = new _RTCPeerConnection(configuration);

			const entry = {
				id: pcId,
				type: "webrtc",
				configuration: configuration,
				timestamp: startTime,
				timestampISO: new Date().toISOString(),
				iceCandidates: [],
				streams: [],
				dataChannels: []
			};

			const originalCreateDataChannel = pc.createDataChannel;
			pc.createDataChannel = function(label, options) {
				const dcId = Math.random().toString(36).substr(2, 8);
				const dc = originalCreateDataChannel.call(this, label, options);

				const dcEntry = {
					id: dcId,
					label: label,
					options: options,
					timestamp: performance.now()
				};
				entry.dataChannels.push(dcEntry);

				const originalSend = dc.send;
				dc.send = function(data) {
					const msgEntry = {
						id: Math.random().toString(36).substr(2, 8),
						type: 'datachannel_message',
						direction: 'send',
						data: safeStringify(data),
						timestamp: performance.now()
					};
					postLog({
						...entry,
						lastDataChannelMessage: msgEntry
					});
					return originalSend.call(this, data);
				};

				dc.addEventListener('message', (event) => {
					const msgEntry = {
						id: Math.random().toString(36).substr(2, 8),
						type: 'datachannel_message',
						direction: 'receive',
						data: safeStringify(event.data),
						timestamp: performance.now()
					};
					postLog({
						...entry,
						lastDataChannelMessage: msgEntry
					});
				});

				postLog({
					...entry,
					dataChannelCreated: dcEntry
				});
				return dc;
			};

			pc.addEventListener('icecandidate', (event) => {
				if (event.candidate) {
					const iceEntry = {
						id: Math.random().toString(36).substr(2, 8),
						candidate: event.candidate.candidate,
						sdpMid: event.candidate.sdpMid,
						sdpMLineIndex: event.candidate.sdpMLineIndex,
						timestamp: performance.now()
					};
					entry.iceCandidates.push(iceEntry);
					postLog({
						...entry,
						lastIceCandidate: iceEntry
					});
				}
			});

			pc.addEventListener('connectionstatechange', () => {
				entry.connectionState = pc.connectionState;
				entry.connectionStateTimestamp = performance.now();
				postLog(entry);
			});

			pc.addEventListener('track', (event) => {
				const trackEntry = {
					id: Math.random().toString(36).substr(2, 8),
					kind: event.track.kind,
					enabled: event.track.enabled,
					readyState: event.track.readyState,
					timestamp: performance.now()
				};
				entry.streams.push(trackEntry);
				postLog({
					...entry,
					lastTrack: trackEntry
				});
			});

			return pc;
		};

		window.RTCPeerConnection.prototype = _RTCPeerConnection.prototype;
	}

	if (window.caches) {
		const _cacheOpen = window.caches.open;
		window.caches.open = async function(cacheName) {
			const cache = await _cacheOpen.call(this, cacheName);
			const cacheId = Math.random().toString(36).substr(2, 16);

			const entry = {
				id: cacheId,
				type: "cache_open",
				cacheName: cacheName,
				timestamp: performance.now(),
				operations: []
			};

			const methods = ['put', 'add', 'addAll', 'delete', 'keys', 'match', 'matchAll'];
			methods.forEach(method => {
				const original = cache[method];
				if (original) {
					cache[method] = async function(...args) {
						const opEntry = {
							id: Math.random().toString(36).substr(2, 8),
							operation: method,
							arguments: safeStringify(args),
							timestamp: performance.now()
						};
						entry.operations.push(opEntry);
						postLog({
							...entry,
							lastOperation: opEntry
						});

						try {
							const result = await original.apply(this, args);
							opEntry.success = true;
							if (result) opEntry.result = safeStringify(result);
							return result;
						} catch (error) {
							opEntry.success = false;
							opEntry.error = error.message;
							throw error;
						} finally {
							postLog({
								...entry,
								lastOperation: opEntry
							});
						}
					};
				}
			});

			postLog(entry);
			return cache;
		};
	}

	const _navigatorServiceWorker = navigator.serviceWorker;
	if (_navigatorServiceWorker) {
		const _register = _navigatorServiceWorker.register;
		navigator.serviceWorker.register = async function(scriptURL, options) {
			const entry = {
				id: Math.random().toString(36).substr(2, 16),
				type: "service_worker_register",
				scriptURL: scriptURL,
				options: options,
				timestamp: performance.now(),
				timestampISO: new Date().toISOString()
			};

			try {
				const registration = await _register.call(this, scriptURL, options);
				entry.success = true;
				entry.scope = registration.scope;
				entry.active = !!registration.active;
				entry.waiting = !!registration.waiting;
				entry.installing = !!registration.installing;
				postLog(entry);
				return registration;
			} catch (error) {
				entry.success = false;
				entry.error = error.message;
				postLog(entry);
				throw error;
			}
		};
	}

	const _performanceMark = performance.mark;
	const _performanceMeasure = performance.measure;
	const _performanceGetEntries = performance.getEntries;

	if (_performanceMark) {
		performance.mark = function(name, options) {
			const entry = {
				id: Math.random().toString(36).substr(2, 16),
				type: "performance_mark",
				name: name,
				options: options,
				timestamp: performance.now(),
				timestampISO: new Date().toISOString()
			};
			postLog(entry);
			return _performanceMark.call(this, name, options);
		};
	}

	if (_performanceMeasure) {
		performance.measure = function(name, startMark, endMark) {
			const entry = {
				id: Math.random().toString(36).substr(2, 16),
				type: "performance_measure",
				name: name,
				startMark: startMark,
				endMark: endMark,
				timestamp: performance.now(),
				timestampISO: new Date().toISOString()
			};
			postLog(entry);
			return _performanceMeasure.call(this, name, startMark, endMark);
		};
	}

	if (_performanceGetEntries) {
		performance.getEntries = function() {
			const entries = _performanceGetEntries.call(this);
			postLog({
				type: "performance_getEntries",
				count: entries.length,
				timestamp: performance.now()
			});
			return entries;
		};
	}

	const _performanceObserver = window.PerformanceObserver;
	if (_performanceObserver) {
		window.PerformanceObserver = function(callback) {
			const wrappedCallback = (list, observer) => {
				const entries = list.getEntries();
				entries.forEach(entry => {
					if (entry.entryType === 'resource') {
						postLog({
							type: "resource_timing",
							name: entry.name,
							initiatorType: entry.initiatorType,
							duration: entry.duration,
							transferSize: entry.transferSize,
							encodedBodySize: entry.encodedBodySize,
							decodedBodySize: entry.decodedBodySize,
							nextHopProtocol: entry.nextHopProtocol,
							timestamp: entry.startTime,
							timestampISO: new Date(entry.startTime).toISOString()
						});
					}
				});
				callback(list, observer);
			};
			return new _performanceObserver(wrappedCallback);
		};
		window.PerformanceObserver.prototype = _performanceObserver.prototype;
	}

	const originalScriptSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
	if (originalScriptSrcDescriptor) {
		Object.defineProperty(HTMLScriptElement.prototype, 'src', {
			get: function() {
				return originalScriptSrcDescriptor.get.call(this);
			},
			set: function(value) {
				postLog({
					type: "script_load",
					src: value,
					async: this.async,
					defer: this.defer,
					timestamp: performance.now()
				});
				return originalScriptSrcDescriptor.set.call(this, value);
			},
			configurable: true
		});
	}

	const originalCreateElement = document.createElement;
	document.createElement = function(tagName, options) {
		const element = originalCreateElement.call(document, tagName, options);
		return element;
	};

	const originalAppendChild = Node.prototype.appendChild;
	Node.prototype.appendChild = function(child) {
		if (child.tagName === 'LINK' && child.rel === 'stylesheet') {
			postLog({
				type: "stylesheet_load",
				href: child.href,
				timestamp: performance.now()
			});
		}
		return originalAppendChild.call(this, child);
	};

	const originalFormSubmit = HTMLFormElement.prototype.submit;

	HTMLFormElement.prototype.submit = function() {
		const formData = new FormData(this);
		const entry = {
			id: Math.random().toString(36).substr(2, 16),
			type: "form_submit",
			action: this.action,
			method: this.method,
			enctype: this.enctype,
			data: safeStringify(formData),
			timestamp: performance.now(),
			timestampISO: new Date().toISOString()
		};
		postLog(entry);
		return originalFormSubmit.call(this);
	};

	const originalIframeSrc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
	if (originalIframeSrc) {
		Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
			get: function() {
				return originalIframeSrc.get.call(this);
			},
			set: function(value) {
				postLog({
					type: "iframe_load",
					src: value,
					timestamp: performance.now()
				});
				return originalIframeSrc.set.call(this, value);
			},
			configurable: true
		});
	}

	const _locationAssign = location.assign;
	const _locationReplace = location.replace;
	const _locationReload = location.reload;

	location.assign = function(url) {
		postLog({
			type: "navigation_assign",
			url: url,
			timestamp: performance.now()
		});
		return _locationAssign.call(this, url);
	};

	location.replace = function(url) {
		postLog({
			type: "navigation_replace",
			url: url,
			timestamp: performance.now()
		});
		return _locationReplace.call(this, url);
	};

	location.reload = function(forceReload) {
		postLog({
			type: "navigation_reload",
			forceReload: forceReload,
			timestamp: performance.now()
		});
		return _locationReload.call(this, forceReload);
	};

	const _localStorageSetItem = localStorage.setItem;
	const _localStorageGetItem = localStorage.getItem;
	const _localStorageRemoveItem = localStorage.removeItem;
	const _localStorageClear = localStorage.clear;

	localStorage.setItem = function(key, value) {
		postLog({
			type: "localStorage_set",
			key: key,
			value: value?.length > 100 ? value.substring(0, 100) + '...' : value,
			timestamp: performance.now()
		});
		return _localStorageSetItem.call(this, key, value);
	};

	localStorage.getItem = function(key) {
		const value = _localStorageGetItem.call(this, key);
		postLog({
			type: "localStorage_get",
			key: key,
			value: value?.length > 100 ? value.substring(0, 100) + '...' : value,
			timestamp: performance.now()
		});
		return value;
	};

	localStorage.removeItem = function(key) {
		postLog({
			type: "localStorage_remove",
			key: key,
			timestamp: performance.now()
		});
		return _localStorageRemoveItem.call(this, key);
	};

	localStorage.clear = function() {
		postLog({
			type: "localStorage_clear",
			timestamp: performance.now()
		});
		return _localStorageClear.call(this);
	};

	const _sessionStorageSetItem = sessionStorage.setItem;
	sessionStorage.setItem = function(key, value) {
		postLog({
			type: "sessionStorage_set",
			key: key,
			value: value?.length > 100 ? value.substring(0, 100) + '...' : value,
			timestamp: performance.now()
		});
		return _sessionStorageSetItem.call(this, key, value);
	};

	const _indexedDBOpen = indexedDB.open;
	indexedDB.open = function(name, version) {
		postLog({
			type: "indexeddb_open",
			name: name,
			version: version,
			timestamp: performance.now()
		});
		return _indexedDBOpen.call(this, name, version);
	};

	const _requestAnimationFrame = window.requestAnimationFrame;
	let rafCount = 0;
	window.requestAnimationFrame = function(callback) {
		rafCount++;
		if (rafCount % 100 === 0) {
			postLog({
				type: "raf_monitor",
				count: rafCount,
				timestamp: performance.now()
			});
		}
		return _requestAnimationFrame.call(this, callback);
	};
})();

(function() {
	if (window.__wpScriptObserverActive) return;
	window.__wpScriptObserverActive = true;

	function emitScript(el) {
		if (!el || el.tagName !== "SCRIPT") return;
		window.postMessage({
			__wpScript: {
				src: el.src || null,
				type: el.type || null,
				async: el.async || false,
				defer: el.defer || false,
				crossOrigin: el.crossOrigin || null,
				integrity: el.integrity || null,
				inline: !el.src ? (el.textContent || "").trim().slice(0, 200) : null,
				timestamp: Date.now()
			}
		}, "*");
	}

	document.querySelectorAll("script").forEach(emitScript);

	const observer = new MutationObserver(mutations => {
		mutations.forEach(m => {
			m.addedNodes.forEach(node => {
				if (node.nodeType !== 1) return;
				if (node.tagName === "SCRIPT") emitScript(node);
				node.querySelectorAll && node.querySelectorAll("script").forEach(emitScript);
			});
		});
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true
	});
})();

(function() {
	if (window.__cfInterceptorActive) return;
	window.__cfInterceptorActive = true;

	if (!window.__cfRequests) window.__cfRequests = [];
	const cfRequests = window.__cfRequests;

	const XHRProto = XMLHttpRequest.prototype;
	const originalOpen = XHRProto.open;
	const originalSend = XHRProto.send;
	const originalSetHeader = XHRProto.setRequestHeader;

	XHRProto.open = function(method, url, async, user, pass) {
		this._cfData = {
			method,
			url,
			startTime: Date.now(),
			requestHeaders: {},
			responseType: this.responseType
		};
		return originalOpen.apply(this, arguments);
	};

	XHRProto.setRequestHeader = function(header, value) {
		if (this._cfData) this._cfData.requestHeaders[header] = value;
		return originalSetHeader.apply(this, arguments);
	};

	XHRProto.send = function(body) {
		if (this._cfData) this._cfData.requestBody = body;
		this.addEventListener('loadend', function() {
			if (this._cfData && this._cfData.url && !this._wpLog) {
				const url = this._cfData.url;
				let responseBody = '';
				try {
					if (this.responseType === '' || this.responseType === 'text') responseBody = this.responseText || '';
					else if (this.responseType === 'json') responseBody = JSON.stringify(this.response);
					else responseBody = '[Binary response]';
				} catch (e) {
					responseBody = '[Error reading response]';
				}
				if (url.includes('cloudflare') || url.includes('turnstile') || url.includes('cdn-cgi') || responseBody.includes('_cf_chl_opt')) {
					this._cfData.status = this.status;
					this._cfData.statusText = this.statusText;
					this._cfData.responseTimestamp = Date.now();
					this._cfData.responseBody = responseBody;
					const headers = this.getAllResponseHeaders();
					const responseHeaders = {};
					headers.split('\r\n').forEach(line => {
						const [key, value] = line.split(': ');
						if (key && value) responseHeaders[key.toLowerCase()] = value;
					});
					this._cfData.responseHeaders = responseHeaders;
					cfRequests.push(this._cfData);
					window.dispatchEvent(new CustomEvent('cfNetworkCapture', {
						detail: {
							url: this._cfData.url,
							type: 'xhr',
							status: this.status,
							timestamp: this._cfData.startTime
						}
					}));
				}
			}
		});
		return originalSend.apply(this, arguments);
	};

	const observeTurnstile = function() {
		if (window.turnstile && !window.turnstile.__cfIntercepted) {
			const origRender = window.turnstile.render;
			window.turnstile.render = function(container, params) {
				if (params && params.sitekey) {
					cfRequests.push({
						type: 'turnstile',
						sitekey: params.sitekey,
						action: params.action,
						execution: params.execution,
						cData: params.cData,
						theme: params.theme,
						timestamp: Date.now()
					});
					window.dispatchEvent(new CustomEvent('cfTurnstileCapture', {
						detail: {
							sitekey: params.sitekey,
							action: params.action,
							timestamp: Date.now()
						}
					}));
				}
				return origRender.call(window.turnstile, container, params);
			};
			window.turnstile.__cfIntercepted = true;
		}
	};

	const extractSitekeys = function() {
		const results = [];
		const html = document.documentElement.innerHTML;
		const patterns = [
			/data-sitekey=["']([0-1][A-Za-z0-9_-]{39,59})["']/gi,
			/challenges\.cloudflare\.com\/turnstile[^"']*sitekey=([0-9A-Za-z_-]{40,60})/gi,
			/turnstile\.render\([^)]*sitekey\s*:\s*["']([0-9A-Za-z_-]{40,60})["']/gi,
			/_cf_chl_opt[^}]*iktV5\s*:\s*['"]([^'"]+)['"]/gi
		];
		for (const pattern of patterns) {
			let match;
			pattern.lastIndex = 0;
			while ((match = pattern.exec(html)) !== null) {
				if (match[1] && !results.find(r => r.sitekey === match[1])) {
					results.push({
						sitekey: match[1],
						source: 'dom',
						timestamp: Date.now()
					});
					cfRequests.push({
						type: 'sitekey',
						sitekey: match[1],
						source: 'dom',
						timestamp: Date.now()
					});
				}
			}
		}
		return results;
	};

	if (window._cf_chl_opt) {
		cfRequests.push({
			type: 'cf_chl_opt',
			data: {
				iktV5: window._cf_chl_opt.iktV5,
				interval: window._cf_chl_opt.interval,
				apiMode: window._cf_chl_opt.apiMode
			},
			timestamp: Date.now()
		});
	}

	const observerCF = new MutationObserver(function(mutations) {
		observeTurnstile();
		mutations.forEach(function(mutation) {
			if (mutation.addedNodes.length) {
				extractSitekeys();
				if (window.turnstile && !window.turnstile.__cfIntercepted) observeTurnstile();
			}
		});
	});
	observerCF.observe(document.documentElement, {
		childList: true,
		subtree: true
	});

	window.__cfInterceptorData = function() {
		return cfRequests;
	};
	window.__cfInterceptorClear = function() {
		cfRequests.length = 0;
		return 'Cleared ' + cfRequests.length;
	};
	window.__cfInterceptorStatus = function() {
		return {
			active: true,
			captured: cfRequests.length,
			timestamp: Date.now()
		};
	};
})();

(function() {
	if (window.__wpConsoleHooked) return;
	window.__wpConsoleHooked = true;

	if (!window.__wpConsoleBuffer) window.__wpConsoleBuffer = [];

	function _post(entry) {
		window.__wpConsoleBuffer.push(entry);
		try {
			window.postMessage({
				__wpConsole: entry
			}, "*");
		} catch (_) {}
	}

	function _parseStack(stackStr, skip) {
		if (!stackStr) return {
			raw: "",
			frames: []
		};
		const lines = stackStr.split("\n").map(l => l.trim()).filter(Boolean);
		const frames = lines.slice(skip).reduce((acc, line) => {

			const cm = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);

			const fm = !cm && line.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
			const m = cm || fm;
			if (!m) return acc;
			const file = (cm ? cm[2] : fm[2]) || "";

			if (file.includes("injector.js") || file.includes("content.js")) return acc;
			acc.push({
				fn: (cm ? cm[1] : fm[1]) || "(anonymous)",
				file: file,
				line: parseInt(cm ? cm[3] : fm[3]),
				col: parseInt(cm ? cm[4] : fm[4]),
				raw: line
			});
			return acc;
		}, []);
		return {
			raw: frames.map(f => f.raw).join("\n"),
			frames
		};
	}

	const _LEVELS = [
		"log", "warn", "error", "info", "debug", "assert",
		"table", "dir", "trace", "group", "groupEnd", "groupCollapsed",
		"time", "timeEnd", "count", "countReset", "clear"
	];

	_LEVELS.forEach(level => {
		const orig = (console[level] || console.log).bind(console);
		console[level] = function(...args) {
			let msg;
			try {
				msg = args.map(a => {
					if (a === null) return "null";
					if (a === undefined) return "undefined";
					if (a instanceof Error) return a.name + ": " + a.message;
					if (typeof a === "object") {
						try {
							return JSON.stringify(a, null, 2);
						} catch (_) {
							return String(a);
						}
					}
					return String(a);
				}).join(" ");
			} catch (_) {
				msg = "[unserializable]";
			}

			const parsed = _parseStack((new Error().stack || ""), 2);

			_post({
				level,
				msg,
				stack: parsed.raw,
				frames: parsed.frames,
				location: parsed.frames[0] || null,
				timestamp: Date.now(),
				source: "console"
			});

			orig.apply(console, args);
		};
	});

	const _prevOnError = window.onerror;
	window.onerror = function(message, src, line, col, error) {
		const parsed = _parseStack(error && error.stack || "", 0);
		_post({
			level: "uncaught_error",
			msg: (error ? error.name + ": " : "") + (message || String(error)),
			stack: parsed.raw,
			frames: parsed.frames,
			location: {
				file: src,
				line: line,
				col: col,
				fn: null
			},
			errorName: error && error.name || "Error",
			timestamp: Date.now(),
			source: "window.onerror"
		});
		if (typeof _prevOnError === "function") return _prevOnError.apply(this, arguments);
		return false;
	};

	window.addEventListener("unhandledrejection", function(ev) {
		const reason = ev.reason;
		let msg = "",
			stack = "",
			frames = [];
		if (reason instanceof Error) {
			msg = reason.name + ": " + reason.message;
			const p = _parseStack(reason.stack || "", 0);
			stack = p.raw;
			frames = p.frames;
		} else {
			try {
				msg = JSON.stringify(reason);
			} catch (_) {
				msg = String(reason);
			}
		}
		_post({
			level: "unhandled_rejection",
			msg,
			stack,
			frames,
			location: frames[0] || null,
			timestamp: Date.now(),
			source: "unhandledrejection"
		});
	}, true);

	window.addEventListener("error", function(ev) {
		const el = ev.target;
		if (!el || !(el instanceof Element)) return;
		
		const tag = (el.tagName || "?").toLowerCase();
		const src = el.src || el.href || el.getAttribute("src") || el.getAttribute("href") || "(no src)";
		_post({
			level: "resource_error",
			msg: "Failed to load <" + tag + ">: " + src,
			stack: "",
			frames: [],
			location: {
				file: src,
				line: null,
				col: null,
				fn: "<" + tag + ">"
			},
			timestamp: Date.now(),
			source: "resource"
		});
	}, true);

	window.addEventListener("message", function(ev) {
		if (!ev.data || !ev.data.__wpDrainConsole) return;
		(window.__wpConsoleBuffer || []).forEach(function(entry) {
			try {
				window.postMessage({
					__wpConsole: Object.assign({}, entry, {
						replayed: true
					})
				}, "*");
			} catch (_) {}
		});
	});
})();

(function() {
	if (window.__clarityBlocked) return;
	window.__clarityBlocked = true;
	const clarityNoop = (...args) => {};
	window.clarity = clarityNoop;
	if (window.clarity && Array.isArray(window.clarity.q)) window.clarity.q = [];
	const isClarityUrl = (url) => url && (url.includes('clarity.ms') || url.includes('clarity.js') || url.includes('copilot.microsoft.com/cl/s/'));
	const origFetch = window.fetch;
	window.fetch = function(...args) {
		const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
		if (isClarityUrl(url)) return Promise.resolve(new Response('', {
			status: 200
		}));
		return origFetch.apply(this, args);
	};
	const origXHROpen = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function(method, url) {
		this._clarityUrl = url;
		return origXHROpen.apply(this, arguments);
	};
	const origXHRSend = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function(body) {
		if (isClarityUrl(this._clarityUrl)) return;
		return origXHRSend.apply(this, arguments);
	};
	document.querySelectorAll('script[src*="clarity"]').forEach(s => s.remove());
	const observer = new MutationObserver(mutations => {
		mutations.forEach(m => {
			m.addedNodes.forEach(node => {
				if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
					const src = node.src || node.getAttribute('src');
					if (isClarityUrl(src)) node.remove();
				}
			});
		});
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true
	});
})();
/**
 * Web Panel by Hann Universe
 * Version : 1.2.5
 * content.js — Chrome Extension content script
 */

(function() {
	'use strict';

	if (window.webPanelInitialized) return;
	window.webPanelInitialized = true;

	const PANEL_ID = "_wp_" + Math.random().toString(36).slice(2, 9);
	const VERSION = "1.2.5";
	let _panelHost = null;

	const networkLog = [];
	const scriptLog = [];
	const consoleLog = [];
	const _seenScripts = new Set();

	const _wp_yield = () => new Promise(r => setTimeout(r, 0));

	window.addEventListener("message", (event) => {
		if (event.source !== window) return;
		if (event.data && event.data.__wpScript) {
			const s = event.data.__wpScript;
			const key = s.src || ("inline::" + s.inline);
			if (!_seenScripts.has(key)) {
				_seenScripts.add(key);
				scriptLog.push(s);
			}
		}
	});

	(function captureModulePreloads() {
		function addPreload(link) {
			if (!link.href || _seenScripts.has(link.href)) return;
			_seenScripts.add(link.href);
			scriptLog.push({
				src: link.href,
				type: 'modulepreload',
				async: false,
				defer: false,
				crossOrigin: link.crossOrigin || null,
				timestamp: Date.now()
			});
		}
		document.querySelectorAll('link[rel="modulepreload"]').forEach(addPreload);
		if (window.MutationObserver) {
			new MutationObserver(muts => {
				muts.forEach(m => {
					m.addedNodes.forEach(node => {
						if (node.tagName === 'LINK' && node.rel === 'modulepreload') {
							addPreload(node);
						}
					});
				});
			}).observe(document.head || document.documentElement, {
				childList: true,
				subtree: true
			});
		}
	})();

	window.addEventListener("message", (event) => {
		if (event.source !== window) return;
		if (event.data && event.data.__wpNet) {
			networkLog.push(event.data.__wpNet);
		}
	});

	(function() {
		const seenTimestamps = new Set();
		let drained = false;

		window.addEventListener("message", (event) => {
			if (event.source !== window) return;
			if (!event.data || !event.data.__wpConsole) return;
			const e = event.data.__wpConsole;
			const key = e.timestamp + "|" + e.level + "|" + (e.msg || "").slice(0, 40);
			if (seenTimestamps.has(key)) return;
			seenTimestamps.add(key);
			consoleLog.push(e);
		});

		setTimeout(() => {
			if (!drained) {
				drained = true;
				try {
					window.postMessage({
						__wpDrainConsole: true
					}, "*");
				} catch (_) {}
			}
		}, 0);
	})();

	const _HTMLPrettifier = (function() {
		'use strict';

		function normalizeOptions(opts) {
			const o = opts || {};
			return {
				indent_size: typeof o.indent_size === 'number' ? o.indent_size : 2,
				indent_char: typeof o.indent_char === 'string' ? o.indent_char : ' ',
				indent_with_tabs: !!o.indent_with_tabs,
				max_preserve_newlines: typeof o.max_preserve_newlines === 'number' ? o.max_preserve_newlines : 0,
				preserve_newlines: !!o.preserve_newlines,
				keep_array_indentation: !!o.keep_array_indentation,
				break_chained_methods: !!o.break_chained_methods,
				indent_scripts: typeof o.indent_scripts === 'string' ? o.indent_scripts : 'normal',
				brace_style: typeof o.brace_style === 'string' ? o.brace_style : 'collapse',
				space_before_conditional: o.space_before_conditional !== false,
				unescape_strings: !!o.unescape_strings,
				jslint_happy: !!o.jslint_happy,
				end_with_newline: !!o.end_with_newline,
				wrap_line_length: typeof o.wrap_line_length === 'number' ? o.wrap_line_length : 0,
				indent_inner_html: o.indent_inner_html !== false,
				comma_first: !!o.comma_first,
				e4x: !!o.e4x,
				indent_empty_lines: !!o.indent_empty_lines,
				extra_liners: Array.isArray(o.extra_liners) ? o.extra_liners : [],
			};
		}

		function makeIndents(size, char, count) {
			const unit = char.repeat(size);
			const lines = ['\n'];
			for (let i = 0; i < 100; i++) lines.push(lines[i] + unit);
			return lines;
		}

		function xmlIndent(html, indentArg) {
			let indentChar;
			if (typeof indentArg === 'number') {
				indentChar = ' '.repeat(Math.max(1, indentArg));
			} else if (typeof indentArg === 'string') {
				indentChar = indentArg;
			} else {
				indentChar = '    ';
			}
			const lines = ['\n'];
			for (let i = 0; i < 100; i++) lines.push(lines[i] + indentChar);

			const parts = html
				.replace(/>\s{0,}</g, '><')
				.replace(/</g, '~::~<')
				.replace(/\s*xmlns:/g, '~::~xmlns:')
				.replace(/\s*xmlns=/g, '~::~xmlns=')
				.split('~::~');

			const n = parts.length;
			let inComment = false;
			let depth = 0;
			let result = '';

			for (let i = 0; i < n; i++) {
				const p = parts[i];
				const p1 = i > 0 ? parts[i - 1] : '';

				if (p.search(/<!/) > -1) {
					result += lines[depth] + p;
					inComment = true;
					if (p.search(/-->/) > -1 || p.search(/\]>/) > -1 || p.search(/!DOCTYPE/) > -1) {
						inComment = false;
					}

				} else if (p.search(/-->/) > -1 || p.search(/\]>/) > -1) {
					result += p;
					inComment = false;

				} else if (/^<\w/.test(p1) && /^<\/\w/.test(p) &&
					/^<[\w:\-.,]+/.test(p1) &&
					/^<\/[\w:\-.,]+/.test(p) &&
					p1.match(/^<([\w:\-.]+)/)[1] === p.match(/^<\/([\w:\-.]+)/)[1].replace('/', '')) {
					result += p;
					if (!inComment) depth--;

				} else if (p.search(/<\w/) > -1 && p.search(/<\//) === -1 && p.search(/\/>/) === -1) {
					result += inComment ? p : lines[depth++] + p;

				} else if (p.search(/<\w/) > -1 && p.search(/<\//) > -1) {
					result += inComment ? p : lines[depth] + p;

				} else if (p.search(/<\//) > -1) {
					result += inComment ? p : lines[--depth] + p;

				} else if (p.search(/\/>/) > -1) {
					result += inComment ? p : lines[depth] + p;

				} else if (p.search(/<\?/) > -1) {
					result += lines[depth] + p;

				} else if (p.search(/xmlns:/) > -1 || p.search(/xmlns=/) > -1) {
					result += lines[depth] + p;

				} else {
					result += p;
				}
			}

			return result[0] === '\n' ? result.slice(1) : result;
		}

		class HTMLBeautifier {
			constructor(options) {
				this._opts = normalizeOptions(options);
				const ic = this._opts.indent_with_tabs ? '\t' : this._opts.indent_char;
				this._indentStr = ic.repeat(this._opts.indent_size);
			}

			beautify(html) {
				if (!html || html.trim().length === 0) return '';

				const preIndented = xmlIndent(html, this._opts.indent_with_tabs ? '\t' : this._indentStr);

				return this._format(preIndented);
			}

			_format(html) {
				const opts = this._opts;
				const ind = this._indentStr;

				const lines = html.split('\n');
				const out = [];
				let depth = 0;

				const VOID_TAGS = new Set([
					'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
					'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr',
				]);
				const RAW_TAGS = new Set(['script', 'style', 'pre', 'textarea', 'code']);

				const openRE = /^<([a-zA-Z][a-zA-Z0-9\-:.]*)[^>]*[^/]>$/;
				const closeRE = /^<\/([a-zA-Z][a-zA-Z0-9\-:.]*)>$/;
				const selfRE = /^<([a-zA-Z][a-zA-Z0-9\-:.]*)[^>]*\/>$/;
				const voidOpenRE = /^<(area|base|br|col|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)(\s[^>]*)?>$/i;
				const commentRE = /^<!--/;
				const commentEndRE = /-->$/;
				const doctypeRE = /^<!DOCTYPE/i;
				const xmlPI = /^<\?/;

				let inRaw = false;
				let rawTag = '';

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i].trim();
					if (!line) {
						if (opts.indent_empty_lines) out.push(ind.repeat(depth));
						else out.push('');
						continue;
					}

					if (inRaw) {
						out.push(ind.repeat(depth + 1) + line);
						if (new RegExp(`^</${rawTag}`, 'i').test(line)) {
							depth--;
							out[out.length - 1] = ind.repeat(depth) + line;
							inRaw = false;
							rawTag = '';
						}
						continue;
					}

					if (doctypeRE.test(line) || xmlPI.test(line)) {
						out.push(ind.repeat(depth) + line);
						continue;
					}
					if (commentRE.test(line)) {
						out.push(ind.repeat(depth) + line);
						continue;
					}

					const closeM = line.match(closeRE);
					if (closeM) {
						depth = Math.max(0, depth - 1);
						out.push(ind.repeat(depth) + line);
						continue;
					}

					if (selfRE.test(line) || voidOpenRE.test(line)) {
						out.push(ind.repeat(depth) + line);
						continue;
					}

					const openM = line.match(openRE);
					if (openM) {
						const tag = openM[1].toLowerCase();
						out.push(ind.repeat(depth) + line);
						if (!VOID_TAGS.has(tag)) {
							if (RAW_TAGS.has(tag)) {
								inRaw = true;
								rawTag = tag;
							}
							depth++;
						}
						continue;
					}

					out.push(ind.repeat(depth) + line);
				}

				let result = out.join('\n');
				result = result.replace(/\n{3,}/g, '\n\n');
				if (opts.end_with_newline) result += '\n';
				return result;
			}
		}

		function prettify(html, options) {
			return new HTMLBeautifier(options).beautify(html);
		}


		return {
			prettify,
			xmlIndent,
			normalizeOptions
		};
	})();

	const _CSSPrettifier = (function() {
		'use strict';

		function normalizeOptions(opts) {
			const o = opts || {};
			return {
				indent_size: typeof o.indent_size === 'number' ? o.indent_size : 2,
				indent_char: typeof o.indent_char === 'string' ? o.indent_char : ' ',
				indent_with_tabs: !!o.indent_with_tabs,
				end_with_newline: !!o.end_with_newline,
				selector_separator_newline: o.selector_separator_newline !== false,
				newline_between_rules: o.newline_between_rules !== false,
			};
		}

		class CSSFormatter {
			constructor(options) {
				this._opts = normalizeOptions(options);
				const ic = this._opts.indent_with_tabs ? '\t' : this._opts.indent_char;
				this._ind = ic.repeat(this._opts.indent_size);
			}

			format(css) {
				if (!css || !css.trim()) return '';
				const opts = this._opts;
				const IND = this._ind;
				let out = '';
				let depth = 0;
				let i = 0;
				const n = css.length;

				const peek = (off) => css[i + (off || 0)] || '';
				const next = () => css[i++] || '';

				const readStr = (q) => {
					let s = next();
					while (i < n) {
						const c = next();
						s += c;
						if (c === '\\' && i < n) {
							s += next();
							continue;
						}
						if (c === q) break;
					}
					return s;
				};
				const readBlockComment = () => {
					let s = next() + next();
					while (i < n) {
						if (peek() === '*' && peek(1) === '/') {
							s += next() + next();
							break;
						}
						s += next();
					}
					return s;
				};
				const readLineComment = () => {
					let s = next() + next();
					while (i < n && peek() !== '\n') s += next();
					return s;
				};

				const readChunk = (stopSet) => {
					let s = '',
						pd = 0;
					while (i < n) {
						const c = peek();
						if (c === '"' || c === "'") {
							s += readStr(c);
							continue;
						}
						if (c === '/' && peek(1) === '*') {
							s += readBlockComment();
							continue;
						}
						if (c === '/' && peek(1) === '/') {
							s += readLineComment();
							continue;
						}
						if (c === '(') {
							pd++;
							s += next();
							continue;
						}
						if (c === ')') {
							pd--;
							s += next();
							continue;
						}
						if (pd === 0 && stopSet.has(c)) break;
						s += next();
					}
					return s;
				};

				const clean = (s) => s.replace(/\s+/g, ' ').trim();

				const fmtSel = (sel) => {
					const parts = [];
					let buf = '',
						pd = 0;
					for (const c of sel) {
						if (c === '(') {
							pd++;
							buf += c;
						} else if (c === ')') {
							pd--;
							buf += c;
						} else if (c === ',' && pd === 0) {
							parts.push(buf.trim());
							buf = '';
						} else buf += c;
					}
					if (buf.trim()) parts.push(buf.trim());
					return opts.selector_separator_newline ? parts.join(',\n' + IND.repeat(depth)) : parts.join(', ');
				};

				const STOP4 = new Set([':', ';', '}', '{']);
				const STOP2 = new Set([';', '}']);
				const STOP3 = new Set(['{', '}', ';']);

				const nlInd = (d) => '\n' + IND.repeat(d);

				while (i < n) {
					while (i < n && /\s/.test(peek())) next();
					if (i >= n) break;

					if (peek() === '/' && peek(1) === '*') {
						out += nlInd(depth) + clean(readBlockComment());
						continue;
					}
					if (peek() === '/' && peek(1) === '/') {
						out += nlInd(depth) + readLineComment().trim();
						continue;
					}

					if (peek() === '@') {
						const rule = readChunk(STOP3).trim();
						if (peek() === ';') {
							next();
							out += nlInd(depth) + rule + ';';
							continue;
						}
						if (peek() === '{') {
							next();
							if (opts.newline_between_rules && depth === 0 && out.trim()) out += '\n';
							out += nlInd(depth) + clean(rule) + ' {';
							depth++;
							continue;
						}
						if (rule) out += nlInd(depth) + rule;
						continue;
					}

					if (peek() === '}') {
						next();
						depth = Math.max(0, depth - 1);
						out += nlInd(depth) + '}';
						if (opts.newline_between_rules && depth === 0) out += '\n';
						continue;
					}

					const chunk = readChunk(STOP4);
					const stop = peek();

					if (stop === '{') {
						next();
						const sel = fmtSel(clean(chunk));
						if (opts.newline_between_rules && depth === 0 && out.trim()) out += '\n';
						out += nlInd(depth) + sel + ' {';
						depth++;
						continue;
					}

					if (stop === ';' || stop === '}' || stop === '') {
						const t = clean(chunk);
						if (t) out += nlInd(depth) + t + (stop === ';' ? ';' : '');
						if (stop === ';') next();
						continue;
					}

					const savedI = i;
					next();
					while (i < n && peek() === ' ') next();

					const c2 = clean(chunk);
					const isSelector = peek() === ':' ||
						/[>~+,\s]/.test(c2) ||
						/\[/.test(c2) || depth === 0;

					if (isSelector) {
						i = savedI;
						const rest = readChunk(STOP3);
						const sel = fmtSel(clean(chunk + rest));
						if (peek() === '{') {
							next();
							if (opts.newline_between_rules && depth === 0 && out.trim()) out += '\n';
							out += nlInd(depth) + sel + ' {';
							depth++;
						} else {
							out += nlInd(depth) + sel;
						}
						continue;
					}

					const prop = c2;
					const val = clean(readChunk(STOP2));
					const semi = peek() === ';' ? ';' : '';
					if (semi) next();
					out += nlInd(depth) + prop + ': ' + val + semi;
				}

				let result = out.replace(/\n{3,}/g, '\n\n').trim();
				if (opts.end_with_newline) result += '\n';
				return result;
			}
		}

		function prettify(css, options) {
			return new CSSFormatter(options).format(css);
		}

		return {
			prettify,
			normalizeOptions
		};
	})();

	const _JSPrettifier = (function() {
		'use strict';

		const TK = {
			START_EXPR: 'TK_START_EXPR',
			END_EXPR: 'TK_END_EXPR',
			START_BLOCK: 'TK_START_BLOCK',
			END_BLOCK: 'TK_END_BLOCK',
			WORD: 'TK_WORD',
			RESERVED: 'TK_RESERVED',
			SEMICOLON: 'TK_SEMICOLON',
			STRING: 'TK_STRING',
			EQUALS: 'TK_EQUALS',
			OPERATOR: 'TK_OPERATOR',
			COMMA: 'TK_COMMA',
			BLOCK_COMMENT: 'TK_BLOCK_COMMENT',
			COMMENT: 'TK_COMMENT',
			DOT: 'TK_DOT',
			UNKNOWN: 'TK_UNKNOWN',
			EOF: 'TK_EOF',
			START: 'TK_START',
		};

		const TOKEN_TYPES = {
			EOF: 0,
			IDENTIFIER: 1,
			KEYWORD: 2,
			STRING: 4,
			NUMERIC: 5,
			REGEXP: 6,
			BOOLEAN: 10,
			NULL: 11,
			UNDEFINED: 12,
			PUNCTUATOR: 13,
			OPERATOR: 14,
			ARROW: 15,
			SPREAD: 16,
			INC_DEC: 18,
			ASSIGN: 19,
			COMMENT: 24,
			BIGINT: 31,
		};

		const MODE = {
			BLOCK: 'BlockStatement',
			STATEMENT: 'Statement',
			OBJECT: 'ObjectLiteral',
			ARRAY: 'ArrayLiteral',
			FOR: 'ForInitializer',
			COND: 'Conditional',
			EXPR: 'Expression',
		};

		const OP_POS = {
			BEFORE: 'before-newline',
			AFTER: 'after-newline',
			PRESERVE: 'preserve-newline',
		};

		const LINE_STARTERS = new Set([
			'continue', 'try', 'throw', 'return', 'var', 'let', 'const', 'if',
			'switch', 'case', 'default', 'for', 'while', 'break', 'function', 'import', 'export',
		]);

		const FLOW_KW = new Set([
			'async', 'break', 'continue', 'return', 'throw', 'yield',
		]);

		const RESERVED_WORDS = new Set([
			'continue', 'try', 'throw', 'return', 'var', 'let', 'const', 'if', 'switch',
			'case', 'default', 'for', 'while', 'break', 'function', 'import', 'export',
			'do', 'in', 'of', 'else', 'get', 'set', 'new', 'catch', 'finally', 'typeof',
			'yield', 'async', 'await', 'from', 'as', 'class', 'extends',
		]);

		const POSITIONABLE_OPS = new Set(
			'>>> === !== &&= ??= ||= << && >= ** != == <= >> || ?? |> < / - + > : & % ? ^ | *'
			.split(' ')
		);

		const RE_NEWLINE = /[\n\r\u2028\u2029]/;
		const RE_LINEBREAK = /\r\n|[\n\r\u2028\u2029]/;
		const RE_ALL_BREAKS = /\r\n|[\n\r\u2028\u2029]/g;

		function normalizeOptions(opts) {
			const o = opts || {};
			const r = {};
			r.indent_size = typeof o.indent_size === 'number' ? o.indent_size : 4;
			r.indent_char = typeof o.indent_char === 'string' ? o.indent_char : ' ';
			r.indent_with_tabs = !!o.indent_with_tabs;
			if (r.indent_with_tabs) {
				r.indent_char = '\t';
				if (r.indent_size === 1) r.indent_size = 4;
			}
			r.eol = typeof o.eol === 'string' ? o.eol : 'auto';
			r.end_with_newline = !!o.end_with_newline;
			r.preserve_newlines = o.preserve_newlines !== false;
			r.max_preserve_newlines = typeof o.max_preserve_newlines === 'number' ? o.max_preserve_newlines : 32786;
			if (!r.preserve_newlines) r.max_preserve_newlines = 0;
			r.wrap_line_length = typeof o.wrap_line_length === 'number' ? o.wrap_line_length : 0;
			r.indent_empty_lines = !!o.indent_empty_lines;
			r.brace_style = typeof o.brace_style === 'string' ? o.brace_style : 'collapse';
			r.brace_preserve_inline = !!o.brace_preserve_inline;
			r.space_in_paren = !!o.space_in_paren;
			r.space_in_empty_paren = !!o.space_in_empty_paren;
			r.jslint_happy = !!o.jslint_happy;
			r.space_after_anon_function = !!o.space_after_anon_function;
			r.space_after_named_function = !!o.space_after_named_function;
			r.keep_array_indentation = !!o.keep_array_indentation;
			r.space_before_conditional = o.space_before_conditional !== false;
			r.unescape_strings = !!o.unescape_strings;
			r.comma_first = !!o.comma_first;
			r.operator_position = typeof o.operator_position === 'string' ? o.operator_position : OP_POS.BEFORE;
			r.break_chained_methods = !!o.break_chained_methods;
			r.unindent_chained_methods = !!o.unindent_chained_methods;
			r.disabled = !!o.disabled;
			if (r.jslint_happy) r.space_after_anon_function = true;
			if (r.brace_style === 'expand-strict') r.brace_style = 'expand';
			if (r.brace_style === 'collapse-preserve-inline') {
				r.brace_style = 'collapse';
				r.brace_preserve_inline = true;
			}
			return r;
		}

		class InputScanner {
			constructor(input) {
				this._input = input || '';
				this._len = this._input.length;
				this._pos = 0;
			}
			restart() {
				this._pos = 0;
			}
			hasNext() {
				return this._pos < this._len;
			}
			back() {
				if (this._pos > 0) this._pos--;
			}
			next() {
				return this.hasNext() ? this._input.charAt(this._pos++) : null;
			}
			peek(offset) {
				const i = this._pos + (offset || 0);
				return (i >= 0 && i < this._len) ? this._input.charAt(i) : null;
			}
			testChar(re, offset) {
				const c = this.peek(offset || 0);
				if (c === null) return false;
				re.lastIndex = 0;
				return re.test(c);
			}
			match(re) {
				re.lastIndex = this._pos;
				const m = re.exec(this._input);
				if (!m || m.index !== this._pos) return null;
				this._pos += m[0].length;
				return m;
			}
			readUntil(re, after) {
				re.lastIndex = this._pos;
				const m = re.exec(this._input);
				const end = m ? (after ? m.index + m[0].length : m.index) : this._len;
				const s = this._input.substring(this._pos, end);
				this._pos = end;
				return s;
			}
			readUntilAfter(re) {
				return this.readUntil(re, true);
			}
		}

		class Token {
			constructor(type, text, newlines, wsBefore) {
				this.type = type;
				this.text = text;
				this.comments_before = null;
				this.newlines = newlines || 0;
				this.whitespace_before = wsBefore || '';
				this.parent = null;
				this.next = null;
				this.previous = null;
				this.opened = null;
				this.closed = null;
				this.directives = null;
			}
		}

		class TokenStream {
			constructor() {
				this._tokens = [];
				this._len = 0;
				this._pos = 0;
			}
			restart() {
				this._pos = 0;
			}
			isEmpty() {
				return this._len === 0;
			}
			hasNext() {
				return this._pos < this._len;
			}
			next() {
				return this.hasNext() ? this._tokens[this._pos++] : null;
			}
			peek(off) {
				const i = this._pos + (off || 0);
				return (i >= 0 && i < this._len) ? this._tokens[i] : null;
			}
			add(tok) {
				this._tokens.push(tok);
				this._len++;
			}
		}

		class WhitespacePattern {
			constructor(input) {
				this._input = input;
				this.newline_count = 0;
				this.whitespace_before_token = '';
				this._match_re = this._mkRe('[\\t \\u00A0\\u1680\\u180e\\u2000-\\u200a\\u202f\\u205f\\u3000\\ufeff\\n\\r\\u2028\\u2029]+');
				this._newline_re = this._mkRe('\\r\\n|[\\n\\r\\u2028\\u2029]');
			}
			_mkRe(src) {
				try {
					return new RegExp(src, 'g');
				} catch (e) {
					return /\s+/g;
				}
			}
			read() {
				this.newline_count = 0;
				this.whitespace_before_token = '';
				this._match_re.lastIndex = this._input._pos;
				const m = this._match_re.exec(this._input._input);
				if (!m || m.index !== this._input._pos) return '';
				this._input._pos += m[0].length;
				const s = m[0];
				if (s === ' ') {
					this.whitespace_before_token = ' ';
					return s;
				}
				const parts = this._split(this._newline_re, s);
				this.newline_count = parts.length - 1;
				this.whitespace_before_token = parts[this.newline_count];
				return s;
			}
			_split(re, str) {
				re.lastIndex = 0;
				const out = [];
				let i = 0,
					m;
				while ((m = re.exec(str))) {
					out.push(str.substring(i, m.index));
					i = m.index + m[0].length;
				}
				out.push(str.substring(i));
				return out;
			}
		}

		class JSTokenizer {
			constructor(input) {
				this._input = new InputScanner(input || '');
				this._ws = new WhitespacePattern(this._input);
				this._htmlOpen = false;
				this._firstToken = true;

				const pRaw = '>>>= ... >>= <<= === >>> !== **= &&= ??= ||= => ^= :: /= << <= == && -= >= >> != -- += ** || ?? ++ %= &= *= |= |> = ! ? > < : / ^ - + * & % ~ |';
				let pStr = '\\?\\.(?!\\d) ' + pRaw.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
				pStr = pStr.replace(/ /g, '|');
				this._punctRe = new RegExp(pStr, 'g');
				this._numRe = /0[xX][0-9a-fA-F_]*n?|0[oO][0-7_]*n?|0[bB][01_]*n?|\d[\d_]*n|(?:\.\d[\d_]*|\d[\d_]*\.?[\d_]*)(?:[eE][+-]?[\d_]+)?/g;
				this._identRe = /[a-zA-Z0-9_$\u0080-\uffff\\]+/g;
			}

			tokenize() {
				this._input.restart();
				const stream = new TokenStream();
				let prev = new Token(TK.START, '');
				let parent = null;
				const stack = [];

				while (prev.type !== TK.EOF) {
					const tok = this._getNext(prev, parent);
					const comments = new TokenStream();
					let t = tok;
					while (this._isComment(t)) {
						comments.add(t);
						t = this._getNext(prev, parent);
					}
					if (!comments.isEmpty()) t.comments_before = comments;
					t.parent = parent;
					if (this._isOpening(t)) {
						stack.push(parent);
						parent = t;
					} else if (parent && this._isClosing(t, parent)) {
						t.opened = parent;
						parent.closed = t;
						parent = stack.pop();
						t.parent = parent;
					}
					t.previous = prev;
					prev.next = t;
					stream.add(t);
					prev = t;
				}
				return stream;
			}

			_isComment(t) {
				return t.type === TK.COMMENT || t.type === TK.BLOCK_COMMENT || t.type === TK.UNKNOWN;
			}
			_isOpening(t) {
				return t.type === TK.START_BLOCK || t.type === TK.START_EXPR;
			}
			_isClosing(t, o) {
				if (t.type !== TK.END_BLOCK && t.type !== TK.END_EXPR) return false;
				if (!o) return false;
				return (t.text === ']' && o.text === '[') ||
					(t.text === ')' && o.text === '(') ||
					(t.text === '}' && (o.text === '{' || o.text === '#{'));
			}

			_create(type, text) {
				return new Token(type, text, this._ws.newline_count, this._ws.whitespace_before_token);
			}

			_getNext(prev, parent) {
				this._ws.read();
				const c = this._input.peek();
				if (c === null) return this._create(TK.EOF, '');
				return this._readNonJS(c) ||
					this._readString(c) ||
					this._readPair(c) ||
					this._readWord(prev) ||
					this._readSingles(c) ||
					this._readComment(c) ||
					this._readRegexp(c, prev) ||
					this._readPunct() ||
					(() => this._create(TK.UNKNOWN, this._input.next()))();
			}

			_readNonJS(c) {
				if (c === '#' && this._firstToken && this._input.peek(1) === '!') {
					let s = this._input.next() + this._input.next();
					s += this._input.readUntilAfter(RE_LINEBREAK);
					this._firstToken = false;
					return this._create(TK.UNKNOWN, s.trim() + '\n');
				}
				if (c === '#') {
					const next = this._input.peek(1);
					if (next && /[a-zA-Z_$]/.test(next)) {
						this._input.next();
						const m = this._input.match(this._identRe);
						this._firstToken = false;
						return this._create(TK.WORD, '#' + (m ? m[0] : ''));
					}
				}
				if (c === '<') {
					const saved = this._input._pos;
					const m = this._input.match(/<!--/g);
					if (m) {
						let s = m[0];
						while (this._input.hasNext() && !this._input.testChar(RE_NEWLINE, 0)) s += this._input.next();
						this._htmlOpen = true;
						return this._create(TK.COMMENT, s);
					}
					this._input._pos = saved;
				}
				if (this._htmlOpen && c === '-') {
					const m = this._input.match(/-->/g);
					if (m) {
						this._htmlOpen = false;
						return this._create(TK.COMMENT, m[0]);
					}
				}
				return null;
			}

			_readString(c) {
				if (c !== '`' && c !== "'" && c !== '"') return null;
				this._firstToken = false;
				const q = this._input.next();
				let s = q + (c === '`' ? this._readRecursive('`', true, '${') : this._readRecursive(c));
				if (this._input.peek() === c) s += this._input.next();
				return this._create(TK.STRING, s.replace(RE_ALL_BREAKS, '\n'));
			}

			_readRecursive(end, allowNl, subst) {
				let re;
				if (end === "'") re = /['\\\n\r\u2028\u2029]/g;
				else if (end === '"') re = /["\\\n\r\u2028\u2029]/g;
				else if (end === '`') re = /[`\\$]/g;
				else re = /[`}\\]/g;

				let s = '';
				const first = this._input.readUntil(re, false);
				s += first;

				while (this._input.hasNext()) {
					let ch = this._input.next();
					if (!ch) break;
					if (ch === end || (!allowNl && RE_NEWLINE.test(ch))) {
						this._input.back();
						break;
					}
					if (ch === '\\' && this._input.hasNext()) {
						if (this._input.peek() === '\r' && this._input.peek(1) === '\n') this._input.next();
						ch += this._input.next();
					} else if (subst === '${' && ch === '$' && this._input.peek() === '{') {
						ch += this._input.next();
						ch += this._readRecursive('}', allowNl, '`');
						if (this._input.hasNext()) ch += this._input.next();
					}
					s += ch;
					s += this._input.readUntil(re, false);
				}
				return s;
			}

			_readPair(_c) {
				return null;
			}

			_readWord(prev) {
				if (!this._input.testChar(/[a-zA-Z_$\u0080-\uffff\\]/, 0)) {
					const nm = this._input.match(this._numRe);
					if (nm) {
						this._firstToken = false;
						return this._create(TK.WORD, nm[0]);
					}
					return null;
				}
				const m = this._input.match(this._identRe);
				if (!m) return null;
				this._firstToken = false;
				const s = m[0].replace(RE_ALL_BREAKS, '\n');
				if (prev.type !== TK.DOT && !(prev.type === TK.RESERVED && (prev.text === 'set' || prev.text === 'get'))) {
					if (RESERVED_WORDS.has(s)) {
						if ((s === 'in' || s === 'of') && (prev.type === TK.WORD || prev.type === TK.STRING)) {
							return this._create(TK.OPERATOR, s);
						}
						return this._create(TK.RESERVED, s);
					}
				}
				return this._create(TK.WORD, s);
			}

			_readSingles(c) {
				let tok = null;
				if (c === '(' || c === '[') tok = this._create(TK.START_EXPR, c);
				else if (c === ')' || c === ']') tok = this._create(TK.END_EXPR, c);
				else if (c === '{') tok = this._create(TK.START_BLOCK, c);
				else if (c === '}') tok = this._create(TK.END_BLOCK, c);
				else if (c === ';') tok = this._create(TK.SEMICOLON, c);
				else if (c === '.' && this._input.testChar(/[^\d.]/, 1)) tok = this._create(TK.DOT, c);
				else if (c === ',') tok = this._create(TK.COMMA, c);
				if (tok) {
					this._firstToken = false;
					this._input.next();
				}
				return tok;
			}

			_readComment(c) {
				if (c !== '/') return null;
				const d = this._input.peek(1);
				if (d === '/') {
					const m = this._input.match(/\/\/.*/g) || {
						'0': '//'
					};
					return this._create(TK.COMMENT, (m[0] || '//').replace(RE_ALL_BREAKS, '\n'));
				}
				if (d === '*') {
					let s = this._input.next() + this._input.next();
					s += this._input.readUntilAfter(/\*\//g);
					s = s.replace(RE_ALL_BREAKS, '\n');
					const tok = this._create(TK.BLOCK_COMMENT, s);
					const reDir = /\/\* beautify( \w+[:][\w-]+)+ \*\//;
					if (reDir.test(s)) {
						const dirs = {};
						const re2 = / (\w+):([\w-]+)/g;
						let dm;
						while ((dm = re2.exec(s))) dirs[dm[1]] = dm[2];
						tok.directives = dirs;
					}
					return tok;
				}
				return null;
			}

			_readRegexp(c, prev) {
				if (c !== '/') return null;
				if (!this._allowRegexp(prev)) return null;
				let s = this._input.next();
				let inClass = false,
					esc = false;
				while (this._input.hasNext()) {
					const ch = this._input.peek();
					if (RE_NEWLINE.test(ch)) break;
					if (esc) {
						esc = false;
						s += this._input.next();
						continue;
					}
					if (ch === '\\') {
						esc = true;
						s += this._input.next();
						continue;
					}
					if (ch === '[') inClass = true;
					else if (ch === ']') inClass = false;
					if (ch === '/' && !inClass) {
						s += this._input.next();
						break;
					}
					s += this._input.next();
				}
				while (this._input.hasNext() && this._input.testChar(/[gimsuy]/, 0)) s += this._input.next();
				return this._create(TK.STRING, s);
			}

			_allowRegexp(prev) {
				return (prev.type === TK.RESERVED && /^(return|case|throw|else|do|typeof|yield)$/.test(prev.text)) ||
					(prev.type === TK.END_EXPR && prev.text === ')' && prev.opened && prev.opened.previous &&
						prev.opened.previous.type === TK.RESERVED && /^(if|while|for)$/.test(prev.opened.previous.text)) || [TK.COMMENT, TK.START_EXPR, TK.START_BLOCK, TK.START, TK.END_BLOCK,
						TK.OPERATOR, TK.EQUALS, TK.EOF, TK.SEMICOLON, TK.COMMA
					].includes(prev.type);
			}

			_readPunct() {
				const m = this._input.match(this._punctRe);
				if (!m || !m[0]) return null;
				this._firstToken = false;
				const s = m[0];
				if (s === '=') return this._create(TK.EQUALS, s);
				if (s === '?.') return this._create(TK.DOT, s);
				return this._create(TK.OPERATOR, s);
			}
		}

		class OutputLine {
			constructor(parent) {
				this._p = parent;
				this._items = [];
				this._ind = -1;
				this._align = 0;
				this._cc = 0;
				this._wpIdx = 0;
				this._wpCC = 0;
				this._wpInd = -1;
				this._wpAl = 0;
			}
			clone_empty() {
				const l = new OutputLine(this._p);
				l.set_indent(this._ind, this._align);
				return l;
			}
			item(i) {
				return i < 0 ? this._items[this._items.length + i] : this._items[i];
			}
			is_empty() {
				return this._items.length === 0;
			}
			last() {
				return this.is_empty() ? null : this._items[this._items.length - 1];
			}
			set_indent(ind, al) {
				if (!this.is_empty()) return;
				this._ind = ind || 0;
				this._align = al || 0;
				this._cc = this._p.get_indent_size(this._ind, this._align);
			}
			push(s) {
				this._items.push(s);
				const n = s.lastIndexOf('\n');
				this._cc = n !== -1 ? s.length - n : this._cc + s.length;
			}
			pop() {
				if (this.is_empty()) return null;
				const s = this._items.pop();
				this._cc -= s.length;
				return s;
			}
			trim() {
				while (this.last() === ' ') {
					this._items.pop();
					this._cc--;
				}
			}
			toString() {
				if (this.is_empty()) return this._p.indent_empty_lines ? this._p.get_indent_string(this._ind) : '';
				return this._p.get_indent_string(this._ind, this._align) + this._items.join('');
			}
			_set_wrap_point() {
				if (!this._p.wrap_line_length) return;
				this._wpIdx = this._items.length;
				this._wpCC = this._cc;
				this._wpInd = this._p.next_line._ind;
				this._wpAl = this._p.next_line._align;
			}
			_should_wrap() {
				return this._wpIdx && this._cc > this._p.wrap_line_length && this._wpCC > this._p.next_line._cc;
			}
			_allow_wrap() {
				if (!this._should_wrap()) return false;
				this._p.add_new_line();
				const t = this._p.current_line;
				t.set_indent(this._wpInd, this._wpAl);
				t._items = this._items.slice(this._wpIdx);
				this._items = this._items.slice(0, this._wpIdx);
				t._cc += this._cc - this._wpCC;
				this._cc = this._wpCC;
				if (t._items[0] === ' ') {
					t._items.splice(0, 1);
					t._cc--;
				}
				return true;
			}
			_remove_indent() {
				if (this._ind > 0) {
					this._ind--;
					this._cc -= this._p.indent_size;
				}
			}
			_remove_wrap_indent() {
				if (this._wpInd > 0) this._wpInd--;
			}
		}

		class Output {
			constructor(opts, base) {
				this.indent_size = opts.indent_size;
				this.indent_char = opts.indent_char;
				this.wrap_line_length = opts.wrap_line_length;
				this.indent_empty_lines = opts.indent_empty_lines;
				this.raw = false;
				this._end_with_newline = opts.end_with_newline;
				this.__lines = [];
				this.__base = base || '';
				this.__baseLen = this.__base.length;
				this.__cache = [''];
				this.previous_line = null;
				this.current_line = null;
				this.next_line = new OutputLine(this);
				this.space_before_token = false;
				this.non_breaking_space = false;
				this.previous_token_wrapped = false;
				this.__add_line();
			}
			__ensure(n) {
				while (n >= this.__cache.length) {
					const i = this.__cache.length;
					let s = '';
					if (this.indent_size && i >= this.indent_size) {
						const t = Math.floor(i / this.indent_size);
						s = new Array(t + 1).join(this.indent_char);
					}
					const r = i % this.indent_size;
					if (r) s += new Array(r + 1).join(' ');
					this.__cache.push(s);
				}
			}
			get_indent_size(ind, al) {
				if (ind < 0) ind = 0;
				return this.__baseLen + ind * this.indent_size + (al || 0);
			}
			get_indent_string(ind, al) {
				al = al || 0;
				let base = this.__base;
				if (ind < 0) {
					ind = 0;
					base = '';
				}
				const n = al + ind * this.indent_size;
				this.__ensure(n);
				return base + this.__cache[n];
			}
			__add_line() {
				this.previous_line = this.current_line;
				this.current_line = this.next_line.clone_empty();
				this.__lines.push(this.current_line);
			}
			get_line_number() {
				return this.__lines.length;
			}
			is_empty() {
				return !this.previous_line && this.current_line.is_empty();
			}
			just_added_newline() {
				return this.current_line.is_empty();
			}
			just_added_blankline() {
				return this.is_empty() || (this.current_line.is_empty() && this.previous_line && this.previous_line.is_empty());
			}
			add_new_line(force) {
				if (this.is_empty() || (!force && this.just_added_newline()) || this.raw) return false;
				this.__add_line();
				return true;
			}
			set_wrap_point() {
				this.current_line._set_wrap_point();
			}
			set_indent(ind, al) {
				this.next_line.set_indent(ind || 0, al || 0);
				if (this.__lines.length > 1) {
					this.current_line.set_indent(ind || 0, al || 0);
					return true;
				}
				this.current_line.set_indent();
				return false;
			}
			add_raw_token(tok) {
				for (let i = 0; i < tok.newlines; i++) this.__add_line();
				this.current_line.set_indent(-1);
				this.current_line.push(tok.whitespace_before);
				this.current_line.push(tok.text);
				this.space_before_token = false;
				this.non_breaking_space = false;
				this.previous_token_wrapped = false;
			}
			add_token(text) {
				this.__space();
				this.current_line.push(text);
				this.space_before_token = false;
				this.non_breaking_space = false;
				this.previous_token_wrapped = this.current_line._allow_wrap();
			}
			__space() {
				if (this.space_before_token && !this.just_added_newline()) {
					if (!this.non_breaking_space) this.set_wrap_point();
					this.current_line.push(' ');
				}
			}
			remove_indent(start) {
				for (let i = start; i < this.__lines.length; i++) this.__lines[i]._remove_indent();
				this.current_line._remove_wrap_indent();
			}
			trim(full) {
				this.current_line.trim();
				while (full && this.__lines.length > 1 && this.current_line.is_empty()) {
					this.__lines.pop();
					this.current_line = this.__lines[this.__lines.length - 1];
					this.current_line.trim();
				}
				this.previous_line = this.__lines.length > 1 ? this.__lines[this.__lines.length - 2] : null;
			}
			get_code(eol) {
				this.trim(true);
				const last = this.current_line.pop();
				if (last) {
					const fixed = last[last.length - 1] === '\n' ? last.replace(/\n+$/, '') : last;
					this.current_line.push(fixed);
				}
				if (this._end_with_newline) this.__add_line();
				let code = this.__lines.join('\n');
				if (eol !== '\n') code = code.replace(/\n/g, eol);
				return code;
			}
		}

		class JSFormatter {
			constructor(options) {
				this._opts = normalizeOptions(options);
				this._output = null;
				this._tokens = null;
				this._llt = '';
				this._flags = null;
				this._prevFlags = null;
				this._fstore = [];
			}

			_mkFlags(parent, mode) {
				let level = 0;
				if (parent) {
					level = parent.indentation_level;
					if (!this._output.just_added_newline() && parent.line_indent_level > level) level = parent.line_indent_level;
				}
				return {
					mode,
					parent,
					last_token: parent ? parent.last_token : new Token(TK.START_BLOCK, ''),
					last_word: parent ? parent.last_word : '',
					declaration_statement: false,
					declaration_assignment: false,
					multiline_frame: false,
					inline_frame: false,
					if_block: false,
					else_block: false,
					class_start_block: false,
					do_block: false,
					do_while: false,
					import_block: false,
					in_case_statement: false,
					in_case: false,
					case_body: false,
					case_block: false,
					indentation_level: level,
					alignment: 0,
					line_indent_level: parent ? parent.line_indent_level : level,
					start_line_index: this._output ? this._output.get_line_number() : 0,
					ternary_depth: 0,
				};
			}
			set_mode(mode) {
				if (this._flags) {
					this._fstore.push(this._flags);
					this._prevFlags = this._flags;
				} else {
					this._prevFlags = this._mkFlags(null, mode);
				}
				this._flags = this._mkFlags(this._prevFlags, mode);
				this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
			}
			restore_mode() {
				if (!this._fstore.length) return;
				this._prevFlags = this._flags;
				this._flags = this._fstore.pop();
				if (this._prevFlags.mode === MODE.STATEMENT) this._trim_indent(this._prevFlags);
				this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
			}
			_trim_indent(flags) {
				if (flags.multiline_frame || flags.mode === MODE.FOR || flags.mode === MODE.COND) return;
				this._output.remove_indent(flags.start_line_index);
			}

			indent() {
				this._flags.indentation_level++;
				this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
			}
			deindent() {
				if (this._flags.indentation_level > 0 && (!this._flags.parent || this._flags.indentation_level > this._flags.parent.indentation_level)) {
					this._flags.indentation_level--;
					this._output.set_indent(this._flags.indentation_level, this._flags.alignment);
				}
			}
			_isFlowKw(tok) {
				return tok && tok.type === TK.RESERVED && FLOW_KW.has(tok.text);
			}

			start_of_object_property() {
				return this._flags.parent && this._flags.parent.mode === MODE.OBJECT &&
					this._flags.mode === MODE.STATEMENT &&
					((this._flags.last_token.text === ':' && this._flags.ternary_depth === 0) ||
						(this._flags.last_token.type === TK.RESERVED && ['get', 'set'].includes(this._flags.last_token.text)));
			}

			start_of_statement(tok) {
				const lt = this._flags.last_token;
				const ok =
					(lt.type === TK.RESERVED && ['var', 'let', 'const'].includes(lt.text) && tok.type === TK.WORD) ||
					lt.text === 'do' ||
					(!(this._flags.parent && this._flags.parent.mode === MODE.OBJECT && this._flags.mode === MODE.STATEMENT) && this._isFlowKw(lt) && !tok.newlines) ||
					(lt.text === 'else' && !(tok.text === 'if' && !tok.comments_before)) ||
					(lt.type === TK.END_EXPR && (this._prevFlags.mode === MODE.FOR || this._prevFlags.mode === MODE.COND)) ||
					(lt.type === TK.WORD && this._flags.mode === MODE.BLOCK && !this._flags.in_case && tok.text !== '--' && tok.text !== '++' && this._llt !== 'function' && tok.type !== TK.WORD && tok.type !== TK.RESERVED) ||
					(this._flags.mode === MODE.OBJECT && (lt.text === ':' && this._flags.ternary_depth === 0 || (lt.type === TK.RESERVED && ['get', 'set'].includes(lt.text))));

				if (!ok) return false;
				this.set_mode(MODE.STATEMENT);
				this.indent();
				this.handle_whitespace_and_comments(tok, true);
				if (!this.start_of_object_property()) this.allow_wrap_or_preserved_newline(tok, ['do', 'for', 'if', 'while'].includes(tok.text));
				return true;
			}

			allow_wrap_or_preserved_newline(tok, force) {
				if (this._output.just_added_newline()) return;
				force = force || false;
				const lInPos = POSITIONABLE_OPS.has(this._flags.last_token.text);
				const tInPos = POSITIONABLE_OPS.has(tok.text);
				if ((lInPos || tInPos) && !([OP_POS.BEFORE, OP_POS.PRESERVE].includes(this._opts.operator_position))) force = false;
				const doWrap = (this._opts.preserve_newlines && tok.newlines) || force;
				if (doWrap) this.print_newline(false, true);
				else if (this._opts.wrap_line_length && !this._isFlowKw(this._flags.last_token)) this._output.set_wrap_point();
			}

			print_newline(force, preserve) {
				if (!preserve) {
					const lt = this._flags.last_token;
					if (lt.text !== ';' && lt.text !== ',' && lt.text !== '=' && (lt.type !== TK.OPERATOR || lt.text === '--' || lt.text === '++')) {
						const peek = this._tokens.peek();
						while (this._flags.mode === MODE.STATEMENT && !(this._flags.if_block && peek && peek.text === 'else') && !this._flags.do_block) this.restore_mode();
					}
				}
				if (this._output.add_new_line(force)) this._flags.multiline_frame = true;
			}

			print_token_line_indentation(tok) {
				if (this._output.just_added_newline()) {
					if (this._opts.keep_array_indentation && tok.newlines && (tok.text === '[' || this._flags.mode === MODE.ARRAY)) {
						this._output.current_line.set_indent(-1);
						this._output.current_line.push(tok.whitespace_before);
						this._output.space_before_token = false;
					} else {
						if (this._output.set_indent(this._flags.indentation_level, this._flags.alignment)) {
							this._flags.line_indent_level = this._flags.indentation_level;
						}
					}
				}
			}

			print_token(tok) {
				if (this._output.raw) {
					this._output.add_raw_token(tok);
					return;
				}
				if (this._opts.comma_first && tok.previous && tok.previous.type === TK.COMMA &&
					this._output.just_added_newline() && this._output.previous_line && this._output.previous_line.last() === ',') {
					const comma = this._output.previous_line.pop();
					if (this._output.previous_line.is_empty()) {
						this._output.previous_line.push(comma);
						this._output.trim(true);
						this._output.current_line.pop();
						this._output.trim();
					}
					this.print_token_line_indentation(tok);
					this._output.add_token(',');
					this._output.space_before_token = true;
				}
				this.print_token_line_indentation(tok);
				this._output.non_breaking_space = true;
				this._output.add_token(tok.text);
				if (this._output.previous_token_wrapped) this._flags.multiline_frame = true;
			}

			handle_whitespace_and_comments(tok, preserve) {
				if (tok.comments_before) {
					tok.comments_before.restart();
					let c = tok.comments_before.next();
					while (c) {
						this.handle_whitespace_and_comments(c, preserve);
						this.handle_token(c, preserve);
						c = tok.comments_before.next();
					}
				}
				const nl = tok.newlines;
				const keepArr = this._opts.keep_array_indentation && this._flags.mode === MODE.ARRAY;
				if (keepArr) {
					for (let i = 0; i < nl; i++) this.print_newline(i > 0, preserve);
				} else if (this._opts.preserve_newlines && nl > 1) {
					const n = Math.min(nl, this._opts.max_preserve_newlines);
					this.print_newline(false, preserve);
					for (let i = 1; i < n; i++) this.print_newline(true, preserve);
				}
			}

			handle_token(tok, preserve) {
				switch (tok.type) {
					case TK.START_EXPR:
						this.handle_start_expr(tok);
						break;
					case TK.END_EXPR:
						this.handle_end_expr(tok);
						break;
					case TK.START_BLOCK:
						this.handle_start_block(tok);
						break;
					case TK.END_BLOCK:
						this.handle_end_block(tok);
						break;
					case TK.WORD:
					case TK.RESERVED:
						this.handle_word(tok);
						break;
					case TK.SEMICOLON:
						this.handle_semicolon(tok);
						break;
					case TK.STRING:
						this.handle_string(tok);
						break;
					case TK.EQUALS:
						this.handle_equals(tok);
						break;
					case TK.OPERATOR:
						this.handle_operator(tok);
						break;
					case TK.COMMA:
						this.handle_comma(tok);
						break;
					case TK.BLOCK_COMMENT:
						this.handle_block_comment(tok, preserve);
						break;
					case TK.COMMENT:
						this.handle_comment(tok, preserve);
						break;
					case TK.DOT:
						this.handle_dot(tok);
						break;
					case TK.EOF:
						this.handle_eof(tok);
						break;
					default:
						this.handle_unknown(tok, preserve);
						break;
				}
			}

			handle_start_expr(tok) {
				if (!this.start_of_statement(tok)) this.handle_whitespace_and_comments(tok);
				let mode = MODE.EXPR;

				if (tok.text === '[') {
					if (this._flags.last_token.type === TK.WORD || this._flags.last_token.text === ')') {
						if (LINE_STARTERS.has(this._flags.last_token.text)) this._output.space_before_token = true;
						this.print_token(tok);
						this.set_mode(mode);
						this.indent();
						if (this._opts.space_in_paren) this._output.space_before_token = true;
						return;
					}
					mode = MODE.ARRAY;
					if (![TK.START_EXPR, TK.END_EXPR, TK.WORD, TK.OPERATOR, TK.DOT].includes(this._flags.last_token.type)) {
						this._output.space_before_token = true;
					}
				} else {
					const lt = this._flags.last_token;
					if (lt.type === TK.RESERVED) {
						if (lt.text === 'for') {
							this._output.space_before_token = this._opts.space_before_conditional;
							mode = MODE.FOR;
						} else if (['if', 'while', 'switch'].includes(lt.text)) {
							this._output.space_before_token = this._opts.space_before_conditional;
							mode = MODE.COND;
						} else if (['await', 'async'].includes(this._flags.last_word)) this._output.space_before_token = true;
						else if (lt.text === 'import' && tok.whitespace_before === '') this._output.space_before_token = false;
						else if (LINE_STARTERS.has(lt.text) || lt.text === 'catch') this._output.space_before_token = true;
					} else if (lt.type === TK.EQUALS || lt.type === TK.OPERATOR) {
						if (!this.start_of_object_property()) this.allow_wrap_or_preserved_newline(tok);
					} else if (lt.type === TK.WORD) {
						this._output.space_before_token = false;
						const p3 = this._tokens.peek(-3);
						if (this._opts.space_after_named_function && p3) {
							const p4 = this._tokens.peek(-4);
							if (['async', 'function'].includes(p3.text) || (p3.text === '*' && p4 && ['async', 'function'].includes(p4.text))) {
								this._output.space_before_token = true;
							} else if (this._flags.mode === MODE.OBJECT) {
								if (['{', ','].includes(p3.text) || (p3.text === '*' && p4 && ['{', ','].includes(p4.text))) {
									this._output.space_before_token = true;
								}
							} else if (this._flags.parent && this._flags.parent.class_start_block) {
								this._output.space_before_token = true;
							}
						}
					} else {
						this.allow_wrap_or_preserved_newline(tok);
					}
					const lw = this._flags.last_word,
						lt2 = this._flags.last_token.text;
					if ((lt.type === TK.RESERVED && ['function', 'typeof'].includes(lw)) ||
						(lt2 === '*' && (['function', 'yield'].includes(this._llt) || (this._flags.mode === MODE.OBJECT && ['{', ','].includes(this._llt))))) {
						this._output.space_before_token = this._opts.space_after_anon_function;
					}
				}

				const lt = this._flags.last_token;
				if (lt.text === ';' || lt.type === TK.START_BLOCK) {
					this.print_newline();
				} else if (lt.type !== TK.END_EXPR && lt.type !== TK.START_EXPR && lt.type !== TK.END_BLOCK && lt.text !== '.' && lt.type !== TK.COMMA) {
					this.allow_wrap_or_preserved_newline(tok, tok.newlines);
				}
				this.print_token(tok);
				this.set_mode(mode);
				if (this._opts.space_in_paren) this._output.space_before_token = true;
				this.indent();
			}

			handle_end_expr(tok) {
				while (this._flags.mode === MODE.STATEMENT) this.restore_mode();
				this.handle_whitespace_and_comments(tok);
				if (this._flags.multiline_frame) {
					this.allow_wrap_or_preserved_newline(tok, tok.text === ']' && this._flags.mode === MODE.ARRAY && !this._opts.keep_array_indentation);
				}
				if (this._opts.space_in_paren) {
					if (this._flags.last_token.type === TK.START_EXPR && !this._opts.space_in_empty_paren) {
						this._output.trim();
						this._output.space_before_token = false;
					} else {
						this._output.space_before_token = true;
					}
				}
				this.deindent();
				this.print_token(tok);
				this.restore_mode();
				this._trim_indent(this._prevFlags);
				if (this._flags.do_while && this._prevFlags.mode === MODE.COND) {
					this._prevFlags.mode = MODE.EXPR;
					this._flags.do_block = false;
					this._flags.do_while = false;
				}
			}

			handle_start_block(tok) {
				this.handle_whitespace_and_comments(tok);
				const next = this._tokens.peek();
				const next2 = this._tokens.peek(1);

				if (this._flags.last_word === 'switch' && this._flags.last_token.type === TK.END_EXPR) {
					this.set_mode(MODE.BLOCK);
					this._flags.in_case_statement = true;
				} else if (this._flags.case_body) {
					this.set_mode(MODE.BLOCK);
				} else if (next2 && (
						([':', ','].includes(next2.text) && [TK.STRING, TK.WORD, TK.RESERVED].includes(next.type)) ||
						(['get', 'set', '...'].includes(next.text) && [TK.WORD, TK.RESERVED].includes(next2.type))
					)) {
					if (['class', 'interface'].includes(this._llt) && ![':', ','].includes(next2.text)) this.set_mode(MODE.BLOCK);
					else this.set_mode(MODE.OBJECT);
				} else if (this._flags.last_token.type !== TK.OPERATOR || this._flags.last_token.text !== '=>') {
					if ([TK.EQUALS, TK.START_EXPR, TK.COMMA, TK.OPERATOR].includes(this._flags.last_token.type) || ['return', 'throw', 'import', 'default'].includes(this._flags.last_token.text)) {
						this.set_mode(MODE.OBJECT);
					} else {
						this.set_mode(MODE.BLOCK);
					}
				} else {
					this.set_mode(MODE.BLOCK);
				}

				if (this._flags.last_token && this._flags.last_token.previous && ['class', 'extends'].includes(this._flags.last_token.previous.text)) {
					this._flags.class_start_block = true;
				}

				const emptyBlock = next && !next.comments_before && next.text === '}';
				const isFuncBlock = emptyBlock && this._flags.last_word === 'function' && this._flags.last_token.type === TK.END_EXPR;

				if (this._opts.brace_preserve_inline) {
					this._flags.inline_frame = true;
					let n = 0,
						t = null;
					do {
						t = this._tokens.peek(n++);
						if (t && t.newlines) {
							this._flags.inline_frame = false;
							break;
						}
					} while (t && t.type !== TK.EOF && !(t.type === TK.END_BLOCK && t.opened === tok));
				}

				const expand = this._opts.brace_style === 'expand' || (this._opts.brace_style === 'none' && tok.newlines);
				if (expand && !this._flags.inline_frame) {
					const lt = this._flags.last_token;
					if (lt.type !== TK.OPERATOR && (isFuncBlock || lt.type === TK.EQUALS ||
							(lt.type === TK.RESERVED && [...FLOW_KW].includes(lt.text) && lt.text !== 'else'))) {
						this._output.space_before_token = true;
					} else {
						this.print_newline(false, true);
					}
				} else {
					if (this._prevFlags.mode === MODE.ARRAY && [TK.START_EXPR, TK.COMMA].includes(this._flags.last_token.type)) {
						if (this._flags.last_token.type !== TK.COMMA && !this._opts.space_in_paren) {
							this._output.space_before_token = true;
						} else if (this._flags.last_token.type === TK.COMMA || (this._flags.last_token.type === TK.START_EXPR && this._flags.inline_frame)) {
							this.allow_wrap_or_preserved_newline(tok);
							this._prevFlags.multiline_frame = this._prevFlags.multiline_frame || this._flags.multiline_frame;
							this._flags.multiline_frame = false;
						}
					}
					if (this._flags.last_token.type !== TK.OPERATOR && this._flags.last_token.type !== TK.START_EXPR) {
						if ([TK.START_BLOCK, TK.SEMICOLON].includes(this._flags.last_token.type) && !this._flags.inline_frame) {
							this.print_newline();
						} else {
							this._output.space_before_token = true;
						}
					}
				}
				this.print_token(tok);
				this.indent();
				if (!emptyBlock && !(this._opts.brace_preserve_inline && this._flags.inline_frame)) this.print_newline();
			}

			handle_end_block(tok) {
				this.handle_whitespace_and_comments(tok);
				while (this._flags.mode === MODE.STATEMENT) this.restore_mode();
				const empty = this._flags.last_token.type === TK.START_BLOCK;
				if (this._flags.inline_frame && !empty) {
					this._output.space_before_token = true;
				} else if (this._opts.brace_style === 'expand') {
					if (!empty) this.print_newline();
				} else if (!empty) {
					if (this._flags.mode === MODE.ARRAY && this._opts.keep_array_indentation) {
						this._opts.keep_array_indentation = false;
						this.print_newline();
						this._opts.keep_array_indentation = true;
					} else {
						this.print_newline();
					}
				}
				this.restore_mode();
				this.print_token(tok);
			}

			handle_word(tok) {
				if (tok.type === TK.RESERVED) {
					if (['set', 'get'].includes(tok.text) && this._flags.mode !== MODE.OBJECT) tok.type = TK.WORD;
					else if (tok.text === 'import' && this._tokens.peek() && ['(', '.'].includes(this._tokens.peek().text)) tok.type = TK.WORD;
					else if (['as', 'from'].includes(tok.text) && !this._flags.import_block) tok.type = TK.WORD;
					else if (this._flags.mode === MODE.OBJECT && this._tokens.peek() && this._tokens.peek().text === ':') tok.type = TK.WORD;
				}

				if (this.start_of_statement(tok)) {
					if (this._flags.last_token.type === TK.RESERVED && ['var', 'let', 'const'].includes(this._flags.last_token.text) && tok.type === TK.WORD) {
						this._flags.declaration_statement = true;
					}
				} else if (!tok.newlines || [MODE.EXPR, MODE.FOR, MODE.COND].includes(this._flags.mode) ||
					(this._flags.last_token.type === TK.OPERATOR && !['--', '++'].includes(this._flags.last_token.text)) ||
					this._flags.last_token.type === TK.EQUALS ||
					(!this._opts.preserve_newlines && this._flags.last_token.type === TK.RESERVED && ['var', 'let', 'const', 'set', 'get'].includes(this._flags.last_token.text))) {
					this.handle_whitespace_and_comments(tok);
				} else {
					this.handle_whitespace_and_comments(tok);
					this.print_newline();
				}

				if (this._flags.do_block && !this._flags.do_while) {
					if (tok.text === 'while') {
						this._output.space_before_token = true;
						this.print_token(tok);
						this._output.space_before_token = true;
						this._flags.do_while = true;
						return;
					}
					this.print_newline();
					this._flags.do_block = false;
				}

				if (this._flags.if_block) {
					if (!this._flags.else_block && tok.text === 'else') {
						this._flags.else_block = true;
					} else {
						while (this._flags.mode === MODE.STATEMENT) this.restore_mode();
						this._flags.if_block = false;
						this._flags.else_block = false;
					}
				}

				if (this._flags.in_case_statement && ['case', 'default'].includes(tok.text)) {
					this.print_newline();
					if (!this._flags.case_block && (this._flags.case_body || this._opts.jslint_happy)) this.deindent();
					this._flags.case_body = false;
					this.print_token(tok);
					this._flags.in_case = true;
					return;
				}

				if ([TK.COMMA, TK.START_EXPR, TK.EQUALS, TK.OPERATOR].includes(this._flags.last_token.type) && !this.start_of_object_property()) {
					this.allow_wrap_or_preserved_newline(tok);
				}

				if (tok.text === 'function') {
					const lt = this._flags.last_token;
					if (!(['}', ';'].includes(lt.text) || (this._output.just_added_newline() && !['(', '[', '{', ':', '=', ','].includes(lt.text) && lt.type !== TK.OPERATOR)) || this._output.just_added_blankline() || tok.comments_before) {
						this.print_newline();
						this.print_newline(true);
					}
					if (lt.type === TK.RESERVED || lt.type === TK.WORD) {
						if (['get', 'set', 'new', 'export'].includes(lt.text) || this._isFlowKw(lt) || (lt.text === 'default' && this._llt === 'export') || lt.text === 'declare') {
							this._output.space_before_token = true;
						} else {
							this.print_newline();
						}
					} else if (lt.type === TK.OPERATOR || lt.text === '=') {
						this._output.space_before_token = true;
					} else if (!this._flags.multiline_frame && [MODE.EXPR, MODE.FOR, MODE.COND, MODE.ARRAY].includes(this._flags.mode)) {} else {
						this.print_newline();
					}
					this.print_token(tok);
					this._flags.last_word = tok.text;
					return;
				}

				let spacing = 'NONE';
				const lt = this._flags.last_token;
				if (lt.type === TK.END_BLOCK) {
					if (this._prevFlags.inline_frame) spacing = 'SPACE';
					else if (!['else', 'catch', 'finally', 'from'].includes(tok.text) || this._opts.brace_style === 'expand' || this._opts.brace_style === 'end-expand' || (this._opts.brace_style === 'none' && tok.newlines)) {
						spacing = 'NEWLINE';
					} else {
						spacing = 'SPACE';
						this._output.space_before_token = true;
					}
				} else if (lt.type === TK.SEMICOLON && this._flags.mode === MODE.BLOCK) spacing = 'NEWLINE';
				else if (lt.type === TK.SEMICOLON && [MODE.EXPR, MODE.FOR, MODE.COND].includes(this._flags.mode)) spacing = 'SPACE';
				else if (lt.type === TK.STRING) spacing = 'NEWLINE';
				else if (lt.type === TK.RESERVED || lt.type === TK.WORD || lt.text === '*') spacing = 'SPACE';
				else if (lt.type === TK.START_BLOCK) spacing = this._flags.inline_frame ? 'SPACE' : 'NEWLINE';
				else if (lt.type === TK.END_EXPR) {
					this._output.space_before_token = true;
					spacing = 'NEWLINE';
				}

				if (LINE_STARTERS.has(tok.text) && lt.text !== ')') {
					spacing = (this._flags.inline_frame || lt.text === 'else' || lt.text === 'export') ? 'SPACE' : 'NEWLINE';
				}

				if (['else', 'catch', 'finally'].includes(tok.text)) {
					if (lt.type !== TK.END_BLOCK || this._prevFlags.mode !== MODE.BLOCK || this._opts.brace_style === 'expand' || this._opts.brace_style === 'end-expand' || (this._opts.brace_style === 'none' && tok.newlines) || this._flags.inline_frame) {
						if (!this._flags.inline_frame) this.print_newline();
					} else {
						this._output.trim(true);
						if (this._output.current_line.last() !== '}') this.print_newline();
						this._output.space_before_token = true;
					}
				} else if (spacing === 'NEWLINE') {
					if (this._isFlowKw(lt) || (lt.text === 'declare' && ['var', 'let', 'const'].includes(tok.text))) {
						this._output.space_before_token = true;
					} else if (lt.type !== TK.END_EXPR) {
						if ((lt.type === TK.START_EXPR && ['var', 'let', 'const'].includes(tok.text)) || lt.text === ':') {
							this._output.space_before_token = true;
						} else if (tok.text === 'if' && tok.previous && tok.previous.text === 'else') {
							this._output.space_before_token = true;
						} else {
							this.print_newline();
						}
					} else if (LINE_STARTERS.has(tok.text) && lt.text !== ')') {
						this.print_newline();
					}
				} else if (this._flags.multiline_frame && this._flags.mode === MODE.ARRAY && lt.text === ',' && this._llt === '}') {
					this.print_newline();
				} else if (spacing === 'SPACE') {
					this._output.space_before_token = true;
				}

				if (tok.previous && [TK.WORD, TK.RESERVED].includes(tok.previous.type)) this._output.space_before_token = true;
				this.print_token(tok);
				this._flags.last_word = tok.text;
				if (tok.type === TK.RESERVED) {
					if (tok.text === 'do') this._flags.do_block = true;
					else if (tok.text === 'if') this._flags.if_block = true;
					else if (tok.text === 'import') this._flags.import_block = true;
					else if (this._flags.import_block && tok.text === 'from') this._flags.import_block = false;
				}
			}

			handle_semicolon(tok) {
				if (this.start_of_statement(tok)) this._output.space_before_token = false;
				else this.handle_whitespace_and_comments(tok);
				const peek = this._tokens.peek();
				while (this._flags.mode === MODE.STATEMENT && !(this._flags.if_block && peek && peek.text === 'else') && !this._flags.do_block) this.restore_mode();
				if (this._flags.import_block) this._flags.import_block = false;
				this.print_token(tok);
			}

			handle_string(tok) {
				const isTempl = tok.text.startsWith('`');
				if (isTempl && tok.newlines === 0 && tok.whitespace_before === '' && tok.previous && (tok.previous.text === ')' || this._flags.last_token.type === TK.WORD)) {} else if (this.start_of_statement(tok) || this._flags.last_token.type === TK.RESERVED || this._flags.last_token.type === TK.WORD || this._flags.inline_frame) {
					this._output.space_before_token = true;
				} else if ([TK.COMMA, TK.START_EXPR, TK.EQUALS, TK.OPERATOR].includes(this._flags.last_token.type)) {
					if (!this.start_of_object_property()) this.allow_wrap_or_preserved_newline(tok);
				} else if (isTempl && this._flags.last_token.type === TK.END_EXPR && tok.previous && [']', ')'].includes(tok.previous.text) && tok.newlines === 0) {
					this._output.space_before_token = true;
				} else {
					this.print_newline();
				}
				this.print_token(tok);
			}

			handle_equals(tok) {
				if (!this.start_of_statement(tok)) this.handle_whitespace_and_comments(tok);
				if (this._flags.declaration_statement) this._flags.declaration_assignment = true;
				this._output.space_before_token = true;
				this.print_token(tok);
				this._output.space_before_token = true;
			}

			handle_comma(tok) {
				this.handle_whitespace_and_comments(tok, true);
				this.print_token(tok);
				this._output.space_before_token = true;
				if (this._flags.declaration_statement) {
					if (this._flags.parent && [MODE.EXPR, MODE.FOR, MODE.COND].includes(this._flags.parent.mode)) this._flags.declaration_assignment = false;
					if (this._flags.declaration_assignment) {
						this._flags.declaration_assignment = false;
						this.print_newline(false, true);
					} else if (this._opts.comma_first) this.allow_wrap_or_preserved_newline(tok);
				} else if (this._flags.mode === MODE.OBJECT || (this._flags.mode === MODE.STATEMENT && this._flags.parent && this._flags.parent.mode === MODE.OBJECT)) {
					if (this._flags.mode === MODE.STATEMENT) this.restore_mode();
					if (!this._flags.inline_frame) this.print_newline();
				} else if (this._opts.comma_first) {
					this.allow_wrap_or_preserved_newline(tok);
				}
			}

			handle_operator(tok) {
				const isGen = tok.text === '*' && (
					(this._flags.last_token.type === TK.RESERVED && ['function', 'yield'].includes(this._flags.last_token.text)) || [TK.START_BLOCK, TK.COMMA, TK.END_BLOCK, TK.SEMICOLON].includes(this._flags.last_token.type)
				);
				const isUnary = ['-', '+'].includes(tok.text) && (
					[TK.START_BLOCK, TK.START_EXPR, TK.EQUALS, TK.OPERATOR].includes(this._flags.last_token.type) ||
					LINE_STARTERS.has(this._flags.last_token.text) ||
					this._flags.last_token.text === ','
				);

				if (!this.start_of_statement(tok)) this.handle_whitespace_and_comments(tok, !isGen);
				if (tok.text === '*' && this._flags.last_token.type === TK.DOT) {
					this.print_token(tok);
					return;
				}
				if (tok.text === '::') {
					this.print_token(tok);
					return;
				}
				if (this._flags.last_token.type === TK.OPERATOR && [OP_POS.BEFORE, OP_POS.PRESERVE].includes(this._opts.operator_position)) this.allow_wrap_or_preserved_newline(tok);

				if (tok.text === ':' && this._flags.in_case) {
					this.print_token(tok);
					this._flags.in_case = false;
					this._flags.case_body = true;
					if (this._tokens.peek() && this._tokens.peek().type !== TK.START_BLOCK) {
						this.indent();
						this.print_newline();
						this._flags.case_block = false;
					} else {
						this._flags.case_block = true;
						this._output.space_before_token = true;
					}
					return;
				}

				let spaceBefore = true,
					spaceAfter = true,
					isTernary = false;
				if (tok.text === ':') {
					if (this._flags.ternary_depth === 0) spaceBefore = false;
					else {
						this._flags.ternary_depth--;
						isTernary = true;
					}
				} else if (tok.text === '?') this._flags.ternary_depth++;

				if (!isUnary && !isGen && this._opts.preserve_newlines && POSITIONABLE_OPS.has(tok.text)) {
					const isColon = tok.text === ':';
					const isTernColon = isColon && isTernary;
					const isNonTernColon = isColon && !isTernary;
					switch (this._opts.operator_position) {
						case OP_POS.BEFORE:
							this._output.space_before_token = !isNonTernColon;
							this.print_token(tok);
							if (!isColon || isTernColon) this.allow_wrap_or_preserved_newline(tok);
							this._output.space_before_token = true;
							return;
						case OP_POS.AFTER:
							this._output.space_before_token = true;
							if (!isColon || isTernColon) {
								const nxt = this._tokens.peek();
								if (nxt && nxt.newlines) this.print_newline(false, true);
								else this.allow_wrap_or_preserved_newline(tok);
							} else {
								this._output.space_before_token = false;
							}
							this.print_token(tok);
							this._output.space_before_token = true;
							return;
						case OP_POS.PRESERVE:
							if (!isNonTernColon) this.allow_wrap_or_preserved_newline(tok);
							spaceBefore = !(this._output.just_added_newline() || isNonTernColon);
							this._output.space_before_token = spaceBefore;
							this.print_token(tok);
							this._output.space_before_token = true;
							return;
					}
				}

				if (isGen) {
					this.allow_wrap_or_preserved_newline(tok);
					spaceBefore = false;
					const nxt = this._tokens.peek();
					spaceAfter = !!(nxt && [TK.WORD, TK.RESERVED].includes(nxt.type));
				} else if (tok.text === '...') {
					this.allow_wrap_or_preserved_newline(tok);
					spaceBefore = this._flags.last_token.type === TK.START_BLOCK;
					spaceAfter = false;
				} else if (['--', '++', '!', '~'].includes(tok.text) || isUnary) {
					if (![TK.COMMA, TK.START_EXPR].includes(this._flags.last_token.type)) this.allow_wrap_or_preserved_newline(tok);
					spaceBefore = false;
					spaceAfter = false;
					if (tok.newlines && ['--', '++', '~'].includes(tok.text)) {
						const isSpec = this._isFlowKw(this._flags.last_token) && tok.newlines;
						if (isSpec && (this._prevFlags.if_block || this._prevFlags.else_block)) this.restore_mode();
						this.print_newline(isSpec, true);
					}
					if (this._flags.last_token.text === ';' && [MODE.EXPR, MODE.FOR, MODE.COND].includes(this._flags.mode)) spaceBefore = true;
					if (this._flags.last_token.type === TK.RESERVED) spaceBefore = true;
					else if (this._flags.last_token.type === TK.END_EXPR) spaceBefore = !(tok.text === '--' || tok.text === '++') && this._flags.last_token.text === ']';
					else if (this._flags.last_token.type === TK.OPERATOR) {
						spaceBefore = ['+', '-'].includes(tok.text) && ['--', '-', '++', '+'].includes(this._flags.last_token.text);
						if (['+', '-'].includes(tok.text) && ['--', '++'].includes(this._flags.last_token.text)) spaceAfter = true;
					}
					if (this._flags.mode === MODE.BLOCK && !this._flags.inline_frame) {
						if (['{', ';'].includes(this._flags.last_token.text)) this.print_newline();
					}
				}
				this._output.space_before_token = this._output.space_before_token || spaceBefore;
				this.print_token(tok);
				this._output.space_before_token = spaceAfter;
			}

			handle_block_comment(tok, preserve) {
				if (this._output.raw) {
					this._output.add_raw_token(tok);
					if (tok.directives && tok.directives.preserve === 'end') this._output.raw = false;
					return;
				}
				if (tok.directives) {
					this.print_newline(false, preserve);
					this.print_token(tok);
					if (tok.directives.preserve === 'start') this._output.raw = true;
					this.print_newline(false, true);
					return;
				}
				if (!RE_NEWLINE.test(tok.text) && !tok.newlines) {
					this._output.space_before_token = true;
					this.print_token(tok);
					this._output.space_before_token = true;
					return;
				}
				const lines = tok.text.replace(RE_ALL_BREAKS, '\n').split('\n');
				const ind = tok.whitespace_before;
				const indLen = ind.length;
				const allStar = lines.slice(1).every(l => l.trim().charAt(0) === '*');
				const allInd = lines.slice(1).every(l => !l || l.indexOf(ind) === 0);

				this.print_newline(false, preserve);
				this.print_token_line_indentation(tok);
				this._output.add_token(lines[0]);
				this.print_newline(false, preserve);
				if (lines.length > 1) {
					if (allStar) this._flags.alignment = 1;
					for (let i = 1; i < lines.length; i++) {
						if (allStar) {
							this.print_token_line_indentation(tok);
							this._output.add_token(lines[i].replace(/^\s+/, ''));
						} else if (allInd && lines[i]) {
							this.print_token_line_indentation(tok);
							this._output.add_token(lines[i].substring(indLen));
						} else {
							this._output.current_line.set_indent(-1);
							this._output.add_token(lines[i]);
						}
						this.print_newline(false, preserve);
					}
					this._flags.alignment = 0;
				}
			}

			handle_comment(tok, preserve) {
				if (tok.newlines) this.print_newline(false, preserve);
				else this._output.trim(true);
				this._output.space_before_token = true;
				this.print_token(tok);
				this.print_newline(false, preserve);
			}

			handle_dot(tok) {
				if (!this.start_of_statement(tok)) this.handle_whitespace_and_comments(tok, true);
				if (this._flags.last_token.text && /^[0-9]+$/.test(this._flags.last_token.text)) this._output.space_before_token = true;
				if (this._isFlowKw(this._flags.last_token)) this._output.space_before_token = false;
				else this.allow_wrap_or_preserved_newline(tok, this._flags.last_token.text === ')' && this._opts.break_chained_methods);
				if (this._opts.unindent_chained_methods && this._output.just_added_newline()) this.deindent();
				this.print_token(tok);
			}

			handle_unknown(tok, preserve) {
				this.print_token(tok);
				if (tok.text[tok.text.length - 1] === '\n') this.print_newline(false, preserve);
			}

			handle_eof(tok) {
				while (this._flags.mode === MODE.STATEMENT) this.restore_mode();
				this.handle_whitespace_and_comments(tok);
			}

			format(src) {
				if (this._opts.disabled) return src;
				const base = (src.match(/^[\t ]*/) || [''])[0];
				this._llt = '';
				this._output = new Output(this._opts, base);
				this._output.raw = false;
				this._fstore = [];
				this.set_mode(MODE.BLOCK);
				const tok = new JSTokenizer(src);
				this._tokens = tok.tokenize();

				let eol = this._opts.eol;
				if (eol === 'auto') {
					eol = '\n';
					if (RE_LINEBREAK.test(src)) {
						const m = src.match(RE_LINEBREAK);
						if (m) eol = m[0];
					}
				}

				let t = this._tokens.next();
				while (t) {
					this.handle_token(t);
					this._llt = this._flags.last_token.text;
					this._flags.last_token = t;
					t = this._tokens.next();
				}
				return this._output.get_code(eol);
			}
		}

		function prettify(js, options) {
			return new JSFormatter(options).format(js);
		}

		return {
			prettify,
			TOKEN_TYPES,
			JSFormatter,
			JSTokenizer,
			normalizeOptions
		};
	})();

	const _PRETTIER_DEFAULTS = {
		htmlIndent: '  ',
		htmlSortAttrs: true,
		cssIndent: '  ',
		cssSortProps: true,
		jsIndent: '  ',
		jsSemi: true,
		jsSingleQuote: false
	};

	function _getPrettierOpts() {
		try {
			const s = localStorage.getItem('_wp_prettier_opts');
			if (s) return Object.assign({}, _PRETTIER_DEFAULTS, JSON.parse(s));
		} catch (_) {}
		return Object.assign({}, _PRETTIER_DEFAULTS);
	}

	function _savePrettierOpts(o) {
		try {
			localStorage.setItem('_wp_prettier_opts', JSON.stringify(o));
		} catch (_) {}
	}

	function createPanel() {
		if (_panelHost) return;

		const shadow_root_host = document.createElement("div");
		const _rnd = "_s" + Math.random().toString(36).slice(2, 8);
		shadow_root_host.setAttribute("data-x", _rnd);
		Object.assign(shadow_root_host.style, {
			all: "unset",
			position: "fixed",
			zIndex: "2147483647",
			top: "0",
			left: "0",
			pointerEvents: "none"
		});
		const shadowRoot = shadow_root_host.attachShadow({
			mode: "closed"
		});
		_panelHost = shadow_root_host;

		const _host = _panelHost;

		const _origGetById = document.getElementById.bind(document);
		const _origQS = document.querySelector.bind(document);
		const _origQSA = document.querySelectorAll.bind(document);
		const _origGetByTag = document.getElementsByTagName.bind(document);
		const _origGetByCls = document.getElementsByClassName.bind(document);
		const _origElemQS = Element.prototype.querySelector;
		const _origElemQSA = Element.prototype.querySelectorAll;

		const _isHost = el => el === _host;

		document.getElementById = function(id) {
			if (id === PANEL_ID) return null;
			return _origGetById(id);
		};
		document.querySelector = function(sel) {
			try {
				if (_host.matches && _host.matches(sel)) return null;
			} catch (_) {}
			const r = _origQS(sel);
			return r === _host ? null : r;
		};
		document.querySelectorAll = function(sel) {
			return Array.from(_origQSA(sel)).filter(el => !_isHost(el));
		};
		document.getElementsByTagName = function(tag) {
			return Array.from(_origGetByTag(tag)).filter(el => !_isHost(el));
		};
		document.getElementsByClassName = function(cls) {
			return Array.from(_origGetByCls(cls)).filter(el => !_isHost(el));
		};
		Element.prototype.querySelector = function(sel) {
			const r = _origElemQS.call(this, sel);
			return r === _host ? null : r;
		};
		Element.prototype.querySelectorAll = function(sel) {
			return Array.from(_origElemQSA.call(this, sel)).filter(el => !_isHost(el));
		};

		const _childNodesDesc = Object.getOwnPropertyDescriptor(Node.prototype, "childNodes");
		const _childrenDesc = Object.getOwnPropertyDescriptor(Element.prototype, "children");
		Object.defineProperty(document.body, "childNodes", {
			get() {
				return Array.from(_childNodesDesc.get.call(this)).filter(n => n !== _host);
			},
			configurable: true
		});
		Object.defineProperty(document.body, "children", {
			get() {
				return Array.from(_childrenDesc.get.call(this)).filter(n => n !== _host);
			},
			configurable: true
		});

		const _origInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
		Object.defineProperty(document.documentElement, "innerHTML", {
			get() {
				const tmp = document.createElement("div");
				tmp.innerHTML = _origInnerHTML.get.call(this);
				tmp.querySelectorAll("*").forEach(el => {
					if (_isHost(el)) el.remove();
				});
				return tmp.innerHTML;
			},
			set(v) {
				_origInnerHTML.set.call(this, v);
			},
			configurable: true
		});

		const _origMO = window.MutationObserver;
		window.MutationObserver = function(cb) {
			const wrapped = function(mutations, obs) {
				const filtered = mutations.map(m => {
					if (m.type !== "childList") return m;
					const added = Array.from(m.addedNodes).filter(n => n !== _host);
					const removed = Array.from(m.removedNodes).filter(n => n !== _host);
					return (added.length || removed.length) ? m : null;
				}).filter(Boolean);
				if (filtered.length) cb(filtered, obs);
			};
			return new _origMO(wrapped);
		};
		window.MutationObserver.prototype = _origMO.prototype;

		const registry = [];

		function registerPlugin(p) {
			registry.push(p);
		}

		registerPlugin({
			id: "cookie",
			label: "Cookie Viewer",
			color: "#1a6e2e",
			async fetchData() {
				const cookies = await new Promise(resolve => {
					chrome.runtime.sendMessage({
						action: "getCookies",
						url: location.href
					}, res => {
						resolve(res?.cookies || []);
					});
				});
				return JSON.stringify({
					meta: {
						timestamp: new Date().toISOString(),
						host: location.hostname,
						totalCookies: cookies.length
					},
					cookies: cookies.map(c => ({
						name: c.name,
						value: c.value,
						httpOnly: c.httpOnly,
						secure: c.secure,
						sameSite: c.sameSite,
						path: c.path,
						domain: c.domain,
						expirationDate: c.expirationDate ?? null
					}))
				}, null, 2);
			},
			async downloadAll() {
				const cookies = await new Promise(resolve => {
					chrome.runtime.sendMessage({
						action: "getCookies",
						url: location.href
					}, res => {
						resolve(res?.cookies || []);
					});
				});
				if (!cookies.length) {
					alert("No cookies to download.");
					return;
				}
				const exportData = {
					exportedAt: new Date().toISOString(),
					panelVersion: VERSION,
					host: location.hostname,
					totalCookies: cookies.length,
					cookies: cookies.map(c => ({
						name: c.name,
						value: c.value,
						httpOnly: c.httpOnly,
						secure: c.secure,
						sameSite: c.sameSite,
						path: c.path,
						domain: c.domain,
						expirationDate: c.expirationDate ?? null
					}))
				};
				try {
					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: "application/json"
					});
					const url = URL.createObjectURL(blob);
					const win = window.open(url, "_blank");
					if (!win) {
						alert("Popup blocked by browser");
						return;
					}
					setTimeout(() => URL.revokeObjectURL(url), 10000);
					return `Opened JSON export (${cookies.length} cookies)`;
				} catch (e) {
					alert("Export failed: " + e.message);
					return "Export failed";
				}
			},

			renderUI(container, makeBtn, textarea) {
				const resultBox = document.createElement("div");
				Object.assign(resultBox.style, {
					flex: "1",
					overflowY: "auto",
					fontFamily: "monospace",
					fontSize: "12px",
					background: "#0d1117",
					color: "#c9d1d9",
					padding: "10px",
					borderRadius: "6px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all"
				});
				resultBox.textContent = "Loading...";
				container.append(resultBox);
				this.fetchData().then(data => {
					resultBox.textContent = data;
					if (textarea) textarea.value = data;
				}).catch(err => {
					resultBox.textContent = "Error: " + err.message;
				});
			},
		});

		registerPlugin({
			id: "web_storage",
			label: "Web Storage",
			color: "#1565c0",

			_readStore(store) {
				const entries = [];
				for (let i = 0; i < store.length; i++) {
					const k = store.key(i);
					const raw = store.getItem(k);
					let parsed = raw;
					let isJSON = false;
					try {
						parsed = JSON.parse(raw);
						isJSON = true;
					} catch (_) {}
					entries.push({
						key: k,
						value: parsed,
						raw,
						isJSON,
						size: raw ? new Blob([raw]).size : 0
					});
				}
				return entries;
			},

			_safeClone(v) {
				try {
					return JSON.parse(JSON.stringify(v, (key, val) => {
						if (typeof val === "bigint") return val.toString() + "n";
						if (val instanceof Blob) return `[Blob ${val.size} bytes, type=${val.type}]`;
						if (val instanceof ArrayBuffer) return `[ArrayBuffer ${val.byteLength} bytes]`;
						if (ArrayBuffer.isView(val)) return `[${val.constructor.name} ${val.byteLength} bytes]`;
						if (val instanceof Date) return val.toISOString();
						if (typeof val === "function") return "[Function]";
						if (val === undefined) return null;
						return val;
					}));
				} catch (e) {
					return `[Unserializable: ${e.message}]`;
				}
			},

			async _readIndexedDB() {
				if (typeof indexedDB?.databases !== "function") {
					return {
						supported: false,
						error: "indexedDB.databases() not available",
						databases: []
					};
				}
				const out = {
					supported: true,
					databases: []
				};
				let dbList = [];
				try {
					dbList = await indexedDB.databases();
				} catch (e) {
					return {
						supported: true,
						error: e.message,
						databases: []
					};
				}

				for (const {
						name,
						version
					}
					of dbList) {
					const dbInfo = {
						name,
						version,
						stores: []
					};
					let db;
					try {
						db = await new Promise((resolve, reject) => {
							const req = indexedDB.open(name);
							req.onsuccess = () => resolve(req.result);
							req.onerror = () => reject(new Error(req.error?.message || "open error"));
							req.onblocked = () => reject(new Error("blocked"));
							req.onupgradeneeded = () => {};
						});
					} catch (e) {
						dbInfo.error = e.message;
						out.databases.push(dbInfo);
						continue;
					}

					const storeNames = Array.from(db.objectStoreNames);
					for (const storeName of storeNames) {
						try {
							const tx = db.transaction(storeName, "readonly");
							const store = tx.objectStore(storeName);
							const count = await new Promise((res, rej) => {
								const r = store.count();
								r.onsuccess = () => res(r.result);
								r.onerror = () => rej(r.error);
							});

							let sample = [];
							if (count > 0) {
								const limit = Math.min(count, 20);
								sample = await new Promise((res, rej) => {
									const r = store.getAll(null, limit);
									r.onsuccess = () => res(r.result);
									r.onerror = () => rej(r.error);
								});
								sample = sample.map(v => this._safeClone(v));
							}

							let keyPath = null;
							try {
								keyPath = store.keyPath;
							} catch (_) {}
							let autoIncrement = false;
							try {
								autoIncrement = store.autoIncrement;
							} catch (_) {}

							dbInfo.stores.push({
								name: storeName,
								keyPath,
								autoIncrement,
								count,
								sampleSize: sample.length,
								sample
							});
						} catch (e) {
							dbInfo.stores.push({
								name: storeName,
								error: e.message
							});
						}
					}

					try {
						db.close();
					} catch (_) {}
					out.databases.push(dbInfo);
				}
				return out;
			},

			async _readCacheStorage() {
				const out = {
					supported: "caches" in window,
					caches: []
				};
				if (!out.supported) return out;
				try {
					const names = await caches.keys();
					for (const name of names) {
						const cache = await caches.open(name);
						const keys = await cache.keys();
						const totalEntries = keys.length;
						let sampledSize = 0;
						let sampledCount = 0;
						const sampleUrls = [];
						const limit = Math.min(keys.length, 50);

						for (let i = 0; i < limit; i++) {
							const req = keys[i];
							sampleUrls.push(req.url);
							try {
								const resp = await cache.match(req);
								if (resp) {
									const blob = await resp.blob();
									sampledSize += blob.size;
									sampledCount++;
								}
							} catch (_) {}
						}

						const avgSize = sampledCount > 0 ? sampledSize / sampledCount : 0;
						out.caches.push({
							name,
							totalEntries,
							sampledEntries: sampledCount,
							sampledSizeBytes: sampledSize,
							estimatedTotalSizeBytes: Math.round(avgSize * totalEntries),
							sampleUrls: sampleUrls.slice(0, 20)
						});
					}
				} catch (e) {
					out.error = e.message;
				}
				return out;
			},

			async _readOPFS() {
				if (!navigator.storage?.getDirectory) {
					return {
						supported: false,
						error: "OPFS not supported",
						root: null
					};
				}
				try {
					const root = await navigator.storage.getDirectory();
					const tree = await this._traverseOPFS(root, "", 0);
					return {
						supported: true,
						root: tree
					};
				} catch (e) {
					return {
						supported: true,
						error: e.message,
						root: null
					};
				}
			},

			async _traverseOPFS(handle, path, depth) {
				if (depth > 8) {
					return {
						name: handle.name || "(dir)",
						kind: "directory",
						path,
						truncated: true
					};
				}
				const node = {
					name: handle.name || (depth === 0 ? "OPFS-Root" : "(dir)"),
					kind: handle.kind,
					path,
					entries: []
				};
				try {
					for await (const [name, child] of handle.entries()) {
						if (child.kind === "directory") {
							node.entries.push(await this._traverseOPFS(child, path + name + "/", depth + 1));
						} else {
							try {
								const file = await child.getFile();
								node.entries.push({
									name,
									kind: "file",
									size: file.size,
									type: file.type || null,
									lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null
								});
							} catch (fileErr) {
								node.entries.push({
									name,
									kind: "file",
									error: fileErr.message
								});
							}
						}
					}
				} catch (e) {
					node.error = e.message;
				}
				return node;
			},

			async _getStorageEstimate() {
				if (!navigator.storage?.estimate) return {
					supported: false
				};
				try {
					const est = await navigator.storage.estimate();
					return {
						supported: true,
						usage: est.usage,
						quota: est.quota,
						percentUsed: est.quota ? ((est.usage / est.quota) * 100).toFixed(3) + "%" : "unknown",
						usageDetails: est.usageDetails || null
					};
				} catch (e) {
					return {
						supported: true,
						error: e.message
					};
				}
			},

			_getMemoryDiagnostics() {
				const indicators = [];
				const mem = performance.memory || null;
				const domNodes = document.querySelectorAll("*").length;
				const scripts = document.scripts.length;
				const stylesheets = document.styleSheets.length;
				const iframes = document.querySelectorAll("iframe").length;
				let windowKeys = -1;
				try {
					windowKeys = Object.keys(window).length;
				} catch (_) {}

				let heap = null;
				if (mem) {
					const usedPct = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
					heap = {
						usedJSHeapSize: mem.usedJSHeapSize,
						totalJSHeapSize: mem.totalJSHeapSize,
						jsHeapSizeLimit: mem.jsHeapSizeLimit,
						usedPercent: usedPct.toFixed(2) + "%"
					};
					if (usedPct > 85) indicators.push(`CRITICAL: JS Heap usage ${usedPct.toFixed(1)}%接近极限`);
					else if (usedPct > 65) indicators.push(`WARNING: JS Heap usage ${usedPct.toFixed(1)}%偏高`);
				}
				if (domNodes > 15000) indicators.push(`WARNING: DOM nodes ${domNodes} (可能导致重排缓慢)`);
				else if (domNodes > 8000) indicators.push(`INFO: DOM nodes ${domNodes}`);
				if (windowKeys > 8000) indicators.push(`WARNING: window对象污染严重 (${windowKeys} keys)`);
				else if (windowKeys > 3000) indicators.push(`INFO: window对象 keys ${windowKeys}`);
				if (scripts > 80) indicators.push(`INFO: Script tags ${scripts}`);
				if (iframes > 10) indicators.push(`INFO: Iframes ${iframes}`);

				return {
					heap,
					dom: {
						totalNodes: domNodes,
						scripts,
						stylesheets,
						iframes
					},
					windowKeys,
					leakIndicators: indicators
				};
			},

			async fetchData() {
				const [idb, cacheStorage, opfs, storageEstimate] = await Promise.all([
					this._readIndexedDB(),
					this._readCacheStorage(),
					this._readOPFS(),
					this._getStorageEstimate()
				]);

				const lsEntries = this._readStore(localStorage);
				const ssEntries = this._readStore(sessionStorage);
				const lsSize = lsEntries.reduce((s, e) => s + e.size, 0);
				const ssSize = ssEntries.reduce((s, e) => s + e.size, 0);
				const memory = this._getMemoryDiagnostics();

				return JSON.stringify({
					meta: {
						timestamp: new Date().toISOString(),
						host: location.hostname,
						url: location.href,
						panelVersion: VERSION,
						storageEstimate,
						memoryDiagnostics: memory
					},
					localStorage: {
						totalEntries: lsEntries.length,
						totalSizeBytes: lsSize,
						totalSizeKB: (lsSize / 1024).toFixed(2),
						entries: lsEntries.map(e => ({
							key: e.key,
							value: e.value,
							sizeBytes: e.size,
							isJSON: e.isJSON
						}))
					},
					sessionStorage: {
						totalEntries: ssEntries.length,
						totalSizeBytes: ssSize,
						totalSizeKB: (ssSize / 1024).toFixed(2),
						entries: ssEntries.map(e => ({
							key: e.key,
							value: e.value,
							sizeBytes: e.size,
							isJSON: e.isJSON
						}))
					},
					indexedDB: idb,
					cacheStorage: cacheStorage,
					originPrivateFileSystem: opfs
				}, null, 2);
			},

			async downloadAll() {
				const data = await this.fetchData();
				const blob = new Blob([data], {
					type: "application/json"
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `web-storage-${location.hostname}-${Date.now()}.json`;
				a.style.display = "none";
				document.body.appendChild(a);
				a.click();
				setTimeout(() => {
					URL.revokeObjectURL(url);
					a.remove();
				}, 5000);
				return `✓ Downloaded full storage + memory diagnostics export`;
			},

			renderUI(container, makeBtn, textarea) {
				const resultBox = document.createElement("div");
				Object.assign(resultBox.style, {
					flex: "1",
					overflowY: "auto",
					fontFamily: "monospace",
					fontSize: "12px",
					background: "#0d1117",
					color: "#c9d1d9",
					padding: "10px",
					borderRadius: "6px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all"
				});
				resultBox.textContent = "Reading all storage layers (localStorage, sessionStorage, IndexedDB, CacheStorage, OPFS) + memory diagnostics…";
				container.append(resultBox);

				this.fetchData().then(data => {
					resultBox.textContent = data;
					if (textarea) textarea.value = data;
				}).catch(err => {
					resultBox.textContent = "Error reading storage: " + (err?.message || err);
					resultBox.style.color = "#f87171";
				});
			}
		});

		registerPlugin({
			id: "sitekey",
			label: "Hook Turnstile",
			color: "#e67e00",
			captured: [],
			hooked: false,
			autoDownloadEnabled: true,

			_getAutoDownloadPref() {
				try {
					const v = localStorage.getItem("_wp_turnstile_autodl");
					if (v === null) return true;
					return v === "1";
				} catch (_) {
					return true;
				}
			},

			_setAutoDownloadPref(val) {
				try {
					localStorage.setItem("_wp_turnstile_autodl", val ? "1" : "0");
				} catch (_) {}
				this.autoDownloadEnabled = val;
			},

			autoDownload(data) {
				if (!this.autoDownloadEnabled) return;
				try {
					const blob = new Blob([JSON.stringify(data, null, 2)], {
						type: "application/json"
					});
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = "turnstile-" + location.hostname + "-" + Date.now() + ".json";
					document.body.appendChild(a);
					a.click();
					setTimeout(() => {
						URL.revokeObjectURL(url);
						a.remove();
					}, 1000);
				} catch (_) {}
			},

			installHook() {
				if (this.hooked) return;
				this.hooked = true;
				this.autoDownloadEnabled = this._getAutoDownloadPref();
				const self = this;

				const scanExisting = () => {
					document.querySelectorAll('.cf-turnstile, [data-sitekey], iframe[src*="turnstile"]').forEach(el => {
						const sitekey = el.getAttribute('data-sitekey') || el.dataset.sitekey ||
							(el.src && el.src.match(/sitekey=([^&]+)/)?.[1]);
						if (!sitekey) return;
						if (!/^[01][A-Za-z0-9_-]{39,59}$/.test(sitekey)) return;
						if (self.captured.find(c => c.sitekey === sitekey)) return;
						self.captured.push({
							type: 'turnstile-dom',
							sitekey,
							action: el.getAttribute('data-action') || el.dataset.action || '',
							theme: el.getAttribute('data-theme') || el.dataset.theme || 'auto',
							time: Date.now(),
							source: 'dom-scan'
						});
						self.autoDownload({
							host: location.hostname,
							url: location.href,
							capturedAt: new Date().toISOString(),
							entries: self.captured
						});
					});
				};

				const hookTurnstile = () => {
					if (window.turnstile && !window.turnstile.__wpHooked) {
						const origRender = window.turnstile.render.bind(window.turnstile);
						window.turnstile.render = function(container, params) {
							if (params?.sitekey) {
								self.captured.push({
									type: 'turnstile-hook',
									sitekey: params.sitekey,
									action: params.action || '',
									callback: typeof params.callback === 'function' ? 'function' : 'none',
									cData: params.cData || null,
									execution: params.execution || null,
									theme: params.theme || 'auto',
									time: Date.now(),
									source: 'turnstile.render()'
								});
								self.autoDownload({
									host: location.hostname,
									url: location.href,
									capturedAt: new Date().toISOString(),
									entries: self.captured
								});
							}
							return origRender(container, params);
						};
						window.turnstile.__wpHooked = true;
					}
				};

				scanExisting();
				hookTurnstile();
				const poll = setInterval(() => {
					scanExisting();
					hookTurnstile();
				}, 200);
				setTimeout(() => clearInterval(poll), 30000);
				if (window.MutationObserver) {
					new MutationObserver(muts => {
						if (muts.some(m => m.addedNodes.length)) scanExisting();
					}).observe(document.body, {
						childList: true,
						subtree: true
					});
				}
			},

			fetchData() {
				this.installHook();
				const out = {
					host: location.hostname,
					url: location.href,
					timestamp: new Date().toISOString(),
					hookActive: this.hooked,
					turnstilePresent: !!window.turnstile,
					autoDownload: this.autoDownloadEnabled,
					totalCaptured: this.captured.length,
					entries: this.captured.map(c => ({
						sitekey: c.sitekey,
						source: c.source,
						action: c.action || null,
						cData: c.cData || null,
						execution: c.execution || null,
						theme: c.theme || null,
						callback: c.callback || null,
						capturedAt: new Date(c.time).toISOString()
					}))
				};
				if (this.captured.length === 0) {
					out.info = "Belum ada sitekey Turnstile yang tertangkap. Hook aktif — sitekey akan muncul otomatis saat turnstile.render() dipanggil atau elemen .cf-turnstile terdeteksi. Coba refresh halaman.";
				}
				return JSON.stringify(out, null, 2);
			},

			renderUI(container, makeBtn, textarea) {
				this.installHook();
				const self = this;

				const resultBox = document.createElement("div");
				Object.assign(resultBox.style, {
					flex: "1",
					overflowY: "auto",
					fontFamily: "monospace",
					fontSize: "12px",
					background: "#0d1117",
					color: "#c9d1d9",
					padding: "10px",
					borderRadius: "6px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all"
				});
				const data = this.fetchData();
				resultBox.textContent = data;
				if (textarea) textarea.value = data;
				container.append(resultBox);
			},

			copyData(textarea) {
				if (!this.captured.length) return;
				return navigator.clipboard?.writeText(this.captured[this.captured.length - 1].sitekey);
			},

			openSettings() {
				/* moved to global Settings */
			},
		});

		registerPlugin({
			id: "script_dependency_viewer",
			label: "Script Dependency Viewer",
			color: "#3498db",

			detectFramework() {
				const scripts = [
					...Array.from(document.querySelectorAll('script[src]')).map(s => s.src),
					...Array.from(document.querySelectorAll('link[rel="modulepreload"]')).map(l => l.href),
					...performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).map(r => r.name),
				];

				if (document.querySelector('[ng-version]'))
					return {
						name: 'Angular',
						version: document.querySelector('[ng-version]').getAttribute('ng-version')
					};

				if (window.__NEXT_DATA__)
					return {
						name: 'Next.js',
						version: window.__NEXT_DATA__.buildId
					};

				if (window.__remixManifest || window.__remixContext)
					return {
						name: 'Remix'
					};

				if (window.__NUXT__ || window.$nuxt)
					return {
						name: 'Nuxt.js'
					};

				if (window.___gatsby)
					return {
						name: 'Gatsby'
					};

				if (window._$HY)
					return {
						name: 'SolidStart'
					};

				if (window.qwikevents || document.querySelector('[q\\:container]'))
					return {
						name: 'Qwik'
					};

				if (window.Ember)
					return {
						name: 'Ember.js',
						version: window.Ember.VERSION
					};

				if (window.Vue)
					return {
						name: 'Vue.js',
						version: window.Vue.version
					};

				if (window.Svelte)
					return {
						name: 'Svelte',
						version: window.Svelte.VERSION
					};

				if (scripts.some(s => s.includes('/_app/immutable/')))
					return {
						name: 'SvelteKit'
					};

				if (scripts.some(s => s.includes('/_astro/')))
					return {
						name: 'Astro'
					};

				if (scripts.some(s => s.includes('/_next/static/')))
					return {
						name: 'Next.js (App Router)'
					};

				if (scripts.some(s => /reactrouter\.dev|react-router@/.test(s)))
					return {
						name: 'React Router'
					};

				if (scripts.some(s => /remix@|remix\.run/.test(s)))
					return {
						name: 'Remix'
					};

				const generator = document.querySelector('meta[name="generator"]')?.content || '';
				if (generator) return {
					name: generator
				};

				if (window.React)
					return {
						name: 'React',
						version: window.React.version
					};

				if (window.angular)
					return {
						name: 'AngularJS',
						version: window.angular.version?.full
					};

				return {
					name: 'Unknown'
				};
			},
			detectBundler() {
				const scripts = [
					...Array.from(document.querySelectorAll('script[src]')).map(s => s.src),
					...Array.from(document.querySelectorAll('link[rel="modulepreload"]')).map(l => l.href),
					...performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).map(r => r.name),
				];

				if (window.__webpack_require__ || window.webpackChunk || scripts.some(s => /webpack|chunk~/.test(s)))
					return 'webpack';

				if (document.querySelectorAll('link[rel="modulepreload"]').length >= 2)
					return 'vite';

				if (window.parcelRequire)
					return 'parcel';

				if (scripts.some(s => /chunk-[A-Z0-9]{8}\.js/.test(s)) && document.querySelector('[ng-version]'))
					return 'esbuild';

				return 'unknown';
			},

			async collectAllJS() {
				const collected = new Map();
				const queue = [];
				const visited = new Set();

				const enqueue = (url, source) => {
					if (url.startsWith('__dynvars__:')) {
						const last = [...collected.values()].pop();
						if (last) last.dynRefs = (last.dynRefs || []).concat(JSON.parse(url.slice(12)));
						return;
					}
					if (url.startsWith('__sourcemap__:')) {
						const smUrl = url.slice(14);
						if (!visited.has('__sm__' + smUrl)) {
							visited.add('__sm__' + smUrl);
							this.fetchContent(smUrl, 'JSON').then(smContent => {
								if (!smContent || smContent.startsWith('[')) return;
								try {
									const sm = JSON.parse(smContent);
									(sm.sources || []).forEach(s => {
										if (s && !s.startsWith('webpack:') && !s.startsWith('node_modules')) {
											const host = [...collected.entries()].find(([, v]) => v.dynRefs || v.fetched);
											if (host) {
												const entry = host[1];
												entry.sourcemapSources = (entry.sourcemapSources || []).concat(s);
											}
										}
									});
								} catch (_) {}
							});
						}
						return;
					}

					try {
						url = new URL(url, location.href).href;
					} catch (_) {
						return;
					}
					if (visited.has(url)) return;
					if (!url.match(/\.(js|mjs)(\?.*)?$/)) return;
					visited.add(url);
					collected.set(url, {
						url,
						source
					});
					queue.push(url);
				};

				document.querySelectorAll('script[src]').forEach(s => enqueue(s.src, 'html-script'));
				document.querySelectorAll('link[rel="modulepreload"]').forEach(l => enqueue(l.href, 'modulepreload'));
				document.querySelectorAll('link[rel="preload"][as="script"]').forEach(l => enqueue(l.href, 'preload'));
				performance.getEntriesByType('resource')
					.filter(r => r.name.match(/\.(js|mjs)(\?.*)?$/))
					.forEach(r => enqueue(r.name, 'network'));
				scriptLog.filter(s => s.src).forEach(s => enqueue(s.src, 'scriptlog'));

				const manifestSeeds = await this.getManifestSeeds();
				manifestSeeds.forEach(url => enqueue(url, 'manifest'));

				let batchNum = 0;
				while (queue.length) {
					const batch = queue.splice(0, 15);
					batchNum++;

					await Promise.all(batch.map(async url => {
						const content = await this.fetchContent(url, 'JS');
						if (!content || content.startsWith('[')) return;

						const entry = collected.get(url);
						if (entry) {
							entry.size = new Blob([content]).size;
							entry.content = content;
							entry.fetched = true;
						}

						const base = url.substring(0, url.lastIndexOf('/') + 1);
						this.extractImportsFromSource(content, base).forEach(u => enqueue(u, 'crawled'));
					}));

					if (batchNum % 3 === 0) await _wp_yield();
				}

				return [...collected.values()];
			},

			extractImportsFromSource(content, base) {
				const urls = new Set();
				const dynVars = [];

				const patterns = [
					/(?:import|from)\s+["'`](\.{0,2}\/[^"'`\s]+\.(?:js|mjs))["'`]/g,
					/import\(["'`](\.{0,2}\/[^"'`\s]+\.(?:js|mjs))["'`]\)/g,
					/import\(["'`](\/[^"'`\s]+\.(?:js|mjs))["'`]\)/g,
					/["'`]((?:\/_app\/immutable|\/assets|\/chunks?|\/static\/chunks?)\/[^"'`\s]+\.js)["'`]/g,
					/["'`](\/_astro\/[^"'`\s]+\.js)["'`]/g,
					/["'`](\/_next\/static\/[^"'`\s]+\.js)["'`]/g,
					/["'`](\/build\/routes\/[^"'`\s]+\.js)["'`]/g,
					/\brequire\(["'`](\.{0,2}\/[^"'`\s]+\.(?:js|mjs))["'`]\)/g,
				];

				for (const pat of patterns) {
					let m;
					pat.lastIndex = 0;
					while ((m = pat.exec(content)) !== null) {
						try {
							urls.add(new URL(m[1], base).href);
						} catch (_) {}
					}
				}

				const wpChunkMap = /\{(\d+:\s*["'][^"']+["'](?:,\s*\d+:\s*["'][^"']+["'])*)\}[^}]*?\.js/g;
				let wm;
				while ((wm = wpChunkMap.exec(content)) !== null) {
					try {
						const obj = JSON.parse('{' + wm[1].replace(/(\d+):/g, '"$1":') + '}');
						for (const chunkName of Object.values(obj)) {
							urls.add(new URL(chunkName + '.js', base).href);
						}
					} catch (_) {}
				}

				const wpRequireE = /__webpack_require__\.e\(["']?([^"')]+)["']?\)/g;
				let re;
				while ((re = wpRequireE.exec(content)) !== null) {
					dynVars.push(`webpack:chunk:${re[1]}`);
				}

				const dynImport = /\bimport\((?!["'`])([^)]+)\)/g;
				let dm;
				while ((dm = dynImport.exec(content)) !== null) {
					const expr = dm[1].trim();
					if (!expr.startsWith('"') && !expr.startsWith("'") && !expr.startsWith('`')) {
						dynVars.push(`dynamic:${expr.slice(0, 60)}`);
					}
				}

				const smMatch = content.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
				if (smMatch) {
					try {
						const smUrl = new URL(smMatch[1], base).href;
						urls.add('__sourcemap__:' + smUrl);
					} catch (_) {}
				}

				if (dynVars.length) {
					urls.add('__dynvars__:' + JSON.stringify(dynVars));
				}

				return [...urls];
			},

			async getManifestSeeds() {
				const urls = [];
				const origin = location.origin;

				const tryJSON = async (url) => {
					const c = await this.fetchContent(url, 'JSON');
					if (!c || c.startsWith('[')) return null;
					try {
						return JSON.parse(c);
					} catch (_) {
						return null;
					}
				};

				for (const path of ['/.vite/manifest.json', '/build/manifest.json']) {
					const data = await tryJSON(origin + path);
					if (data) {
						Object.values(data).forEach(e => {
							if (e.file) urls.push(origin + '/' + e.file);
							(e.imports || []).forEach(i => urls.push(origin + '/' + i));
							(e.dynamicImports || []).forEach(i => urls.push(origin + '/' + i));
						});
						break;
					}
				}

				if (window.__NEXT_DATA__?.buildId) {
					const bid = window.__NEXT_DATA__.buildId;
					const data = await tryJSON(`${origin}/_next/static/${bid}/_buildManifest.js`);
					if (data) {
						Object.values(data.pages || {}).flat()
							.forEach(f => urls.push(`${origin}/_next/${f}`));
					}
				}

				if (window.__remixManifest) {
					const m = window.__remixManifest;
					if (m.entry?.module) urls.push(m.entry.module);
					Object.values(m.routes || {}).forEach(r => {
						if (r.module) urls.push(r.module);
						(r.imports || []).forEach(i => urls.push(i));
					});
				}

				const ngsw = await tryJSON(origin + '/ngsw.json');
				if (ngsw) {
					(ngsw.assetGroups || []).forEach(g =>
						(g.assets?.files || []).filter(f => f.endsWith('.js'))
						.forEach(f => urls.push(origin + f))
					);
				}

				for (const key of Object.keys(window)) {
					if (!key.startsWith('webpack')) continue;
					const arr = window[key];
					if (!Array.isArray(arr)) continue;
					for (const entry of arr) {
						if (!Array.isArray(entry)) continue;
						const mods = entry[1];
						if (mods && typeof mods === 'object') {
							const ids = Object.keys(mods);
							if (ids.length) {
								const wp = window.__webpack_require__;
								const publicPath = (wp && wp.p) ? wp.p : '/';
								ids.filter(id => /\.(js|mjs)$/.test(id)).forEach(id => {
									try {
										urls.push(new URL(id, origin + publicPath).href);
									} catch (_) {}
								});
							}
						}
					}
				}

				try {
					const wp = window.__webpack_require__;
					if (wp && wp.m) {
						const publicPath = wp.p || '/';
						Object.keys(wp.m)
							.filter(id => /\.(js|mjs)$/.test(id))
							.forEach(id => {
								try {
									urls.push(new URL(id, origin + publicPath).href);
								} catch (_) {}
							});
					}
				} catch (_) {}

				try {
					const lc = window.__LOADABLE_LOADED_CHUNKS__;
					if (lc && typeof lc === 'object') {
						Object.keys(lc)
							.filter(k => k.endsWith('.js'))
							.forEach(k => {
								try {
									urls.push(new URL(k, origin + '/').href);
								} catch (_) {}
							});
					}
				} catch (_) {}

				try {
					const astro = window.__astro_component_map__;
					if (astro && typeof astro === 'object') {
						for (const v of Object.values(astro)) {
							if (typeof v === 'string' && v.endsWith('.js')) {
								try {
									urls.push(new URL(v, origin + '/').href);
								} catch (_) {}
							}
						}
					}
				} catch (_) {}

				return urls;
			},

			async fetchData() {
				let out = '';

				const framework = this.detectFramework();
				const bundler = this.detectBundler();

				out += `Framework : ${framework.name}`;
				if (framework.version) out += ` (${framework.version})`;
				out += `\nBundler   : ${bundler}\n`;
				out += `\n=== COLLECTING ALL JS ===\n\n`;

				const allJS = await this.collectAllJS();

				const groups = {
					'html-script': [],
					modulepreload: [],
					preload: [],
					network: [],
					manifest: [],
					scriptlog: [],
					crawled: []
				};

				allJS.forEach(f => {
					if (groups[f.source]) groups[f.source].push(f);
					else groups.crawled.push(f);
				});

				for (const [group, files] of Object.entries(groups)) {
					if (!files.length) continue;
					const totalKB = (files.reduce((a, f) => a + (f.size || 0), 0) / 1024).toFixed(1);
					out += `── ${group.toUpperCase()} (${files.length} files, ${totalKB}KB) ──\n`;
					files.forEach((f, i) => {
						out += `[${String(i + 1).padStart(3, '0')}] ${f.url}`;
						if (f.size) out += `  (${(f.size / 1024).toFixed(1)}KB)`;
						out += '\n';
					});
					out += '\n';
				}

				const totalKB = (allJS.reduce((a, f) => a + (f.size || 0), 0) / 1024).toFixed(1);
				const fetched = allJS.filter(f => f.fetched).length;
				const blocked = allJS.filter(f => !f.fetched).length;

				out += `── TOTAL: ${allJS.length} JS files, ${totalKB}KB ──\n`;
				out += `   Fetched: ${fetched} | Blocked/Failed: ${blocked}\n`;

				return out;
			},

			async downloadAll() {
				const framework = this.detectFramework();
				const bundler = this.detectBundler();

				const allJS = await this.collectAllJS();

				const fetched = allJS.filter(f => f.fetched);
				const blocked = allJS.filter(f => !f.fetched);

				const exportData = {
					exportedAt: new Date().toISOString(),
					host: location.hostname,
					url: location.href,
					userAgent: navigator.userAgent,
					framework: framework.name,
					frameworkVersion: framework.version || null,
					bundler,
					summary: {
						total: allJS.length,
						fetched: fetched.length,
						blocked: blocked.length,
						totalKB: (allJS.reduce((a, f) => a + (f.size || 0), 0) / 1024).toFixed(1),
					},
					scripts: allJS.map(f => ({
						url: f.url,
						source: f.source,
						fetched: !!f.fetched,
						sizeKB: f.size ? (f.size / 1024).toFixed(1) : null,
						content: f.content || null,
					})),
				};

				try {
					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: 'application/json'
					});
					const url = URL.createObjectURL(blob);
					const win = window.open(url, '_blank');
					if (!win) {
						alert('Popup blocked by browser');
						return;
					}
					setTimeout(() => URL.revokeObjectURL(url), 10000);
					return `✓ Exported ${fetched.length}/${allJS.length} JS files (${blocked.length} blocked)`;
				} catch (e) {
					alert('Export failed: ' + e.message);
					return 'Export failed';
				}
			},

			async fetchContent(url, type) {
				const attempts = [];

				try {
					const ctrl = new AbortController();
					const t = setTimeout(() => ctrl.abort(), 5000);
					const res = await fetch(url, {
						signal: ctrl.signal,
						mode: 'cors',
						credentials: 'same-origin',
						cache: 'force-cache'
					});
					clearTimeout(t);
					if (res.ok) return await res.text();
					attempts.push(`fetch:cors → HTTP ${res.status}`);
				} catch (e) {
					const reason = e.name === 'AbortError' ? 'timeout(5s)' :
						(e.name === 'TypeError' ? 'cors-blocked' : (e.name || e.message));
					attempts.push(`fetch:cors → ${reason}`);
				}

				try {
					const r = await this.fetchWithXHR(url);
					if (r !== null) return r;
					attempts.push('xhr → non-200 or empty');
				} catch (e) {
					attempts.push(`xhr → ${e.message || e.name}`);
				}

				try {
					const r = await this.fetchViaSW(url);
					if (r !== null) return r;
					attempts.push('sw → not cached / unsupported');
				} catch (e) {
					attempts.push(`sw → ${e.message || e.name}`);
				}

				try {
					const r = await this.fetchViaCacheAPI(url);
					if (r !== null) return r;
					attempts.push('cache → miss');
				} catch (e) {
					attempts.push(`cache → ${e.message || e.name}`);
				}

				const entries = performance.getEntriesByName(url);
				const summary = `[${type} Blocked — ${attempts.join(' | ')}]`;
				if (entries.length) {
					const e = entries[entries.length - 1];
					const size = e.transferSize != null ? `${e.transferSize}B` : 'size unknown';
					const dur = `${Math.round(e.duration || 0)}ms`;
					return `${summary} [perf: ${size}, ${dur}]`;
				}
				return summary;
			},

			fetchWithXHR(url) {
				return new Promise((resolve, reject) => {
					const xhr = new XMLHttpRequest();
					xhr.timeout = 8000;
					xhr.onreadystatechange = () => {
						if (xhr.readyState === 4) {
							if (xhr.status === 200) resolve(xhr.responseText);
							else if (xhr.status !== 0) resolve(null);
						}
					};
					xhr.onerror = () => reject(new Error('network error'));
					xhr.ontimeout = () => reject(new Error('timeout(8s)'));
					try {
						xhr.open('GET', url, true);
						xhr.setRequestHeader('Accept', '*/*');
						xhr.send();
					} catch (e) {
						reject(e);
					}
				});
			},

			async fetchViaSW(url) {
				if (!('serviceWorker' in navigator)) return null;
				try {
					const testReg = await navigator.serviceWorker.register('data:text/javascript,', {
						scope: './'
					});
					await testReg.unregister();
				} catch (e) {
					return null;
				}
				const swCode = `self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).then(r=>{if(!r||r.status!==200)return r;const c=r.clone();caches.open('wp-sw').then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));});`;
				let swUrl = null,
					reg = null;
				try {
					const blob = new Blob([swCode], {
						type: 'application/javascript'
					});
					swUrl = URL.createObjectURL(blob);
					reg = await navigator.serviceWorker.register(swUrl, {
						scope: './'
					});
					if (reg.installing) await new Promise(res => {
						const c = () => {
							if (reg.installing.state === 'activated') res();
							else setTimeout(c, 100);
						};
						c();
					});
					await fetch(url, {
						cache: 'reload'
					});
					const cache = await caches.open('wp-sw');
					const cached = await cache.match(url);
					let result = null;
					if (cached) result = await cached.text();
					await reg.unregister();
					URL.revokeObjectURL(swUrl);
					await cache.delete(url);
					return result;
				} catch (e) {
					if (reg) try {
						await reg.unregister();
					} catch (_) {}
					if (swUrl) URL.revokeObjectURL(swUrl);
					return null;
				}
			},

			async fetchViaCacheAPI(url) {
				try {
					for (const name of await caches.keys()) {
						const cache = await caches.open(name);
						let match = await cache.match(url);
						if (match) return await match.text();
						const u = new URL(url);
						match = await cache.match(u.origin + u.pathname);
						if (match) return await match.text();
					}
					for (const name of ['static-resources', 'assets', 'js-cache', 'css-cache', 'workbox-precache', 'pwa-cache']) {
						try {
							const c = await caches.open(name);
							const m = await c.match(url);
							if (m) return await m.text();
						} catch (_) {}
					}
				} catch (_) {}
				return null;
			},

			renderUI(container, makeBtn, textarea) {
				const resultBox = document.createElement('div');
				Object.assign(resultBox.style, {
					flex: '1',
					overflowY: 'auto',
					fontFamily: 'monospace',
					fontSize: '12px',
					background: '#0d1117',
					color: '#c9d1d9',
					padding: '10px',
					borderRadius: '6px',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-all'
				});
				resultBox.textContent = 'Loading...';
				container.append(resultBox);
				this.fetchData().then(data => {
					resultBox.textContent = data;
					if (textarea) textarea.value = data;
				}).catch(err => {
					resultBox.textContent = 'Error: ' + err.message;
				});
			},
		});

		registerPlugin({
			id: "network",
			label: "Network Monitor",
			color: "#00695c",

			SETTINGS_KEY: "wp_network_settings",

			async fetchData() {
				let typeFilters = null;
				try {
					const r = localStorage.getItem(this.SETTINGS_KEY);
					if (r) typeFilters = JSON.parse(r).requestTypes || null;
				} catch (_) {}

				function getGroup(t) {
					if (t === "fetch" || t === "xhr") return "fetchxhr";
					if (t === "websocket" || t === "websocket_message") return "websocket";
					if (t === "eventsource" || t === "eventsource_event") return "sse";
					if (t === "beacon") return "beacon";
					if (t === "webrtc") return "webrtc";
					if (t.startsWith("localStorage") || t.startsWith("sessionStorage") || t === "indexeddb_open") return "storage";
					if (t.startsWith("navigation") || t === "form_submit") return "navigation";
					if (["script_load", "stylesheet_load", "iframe_load",
							"service_worker_register", "cache_open"
						].includes(t)) return "resources";
					if (["performance_mark", "performance_measure",
							"resource_timing", "raf_monitor"
						].includes(t)) return "performance";
					return "other";
				}

				const filtered = typeFilters ?
					networkLog.filter(req => typeFilters[getGroup(req.type || "other")] !== false) :
					networkLog;

				if (!networkLog.length)
					return "No network requests captured yet.\n\nNote: Interceptor must be loaded before requests are made.\n\nTry refreshing the page with this panel open, or wait for new requests.";
				if (!filtered.length)
					return `All ${networkLog.length} request(s) filtered out.\n\nAdjust type filters in ⚙ Settings.`;

				const filterNote = filtered.length < networkLog.length ?
					` · ${networkLog.length - filtered.length} hidden by filter` :
					"";
				let out = `=== NETWORK LOG (${filtered.length} shown${filterNote}) ===\n\n'Download' to export all requests\n\n`;
				for (let idx = 0; idx < filtered.length; idx++) {
					out += this._formatRequest(filtered[idx], idx) + "\n";
					if (idx > 0 && idx % 100 === 0) await _wp_yield();
				}
				out += "─".repeat(60);
				return out.trim();
			},

			_formatRequest(req, idx) {
				const time = new Date(req.timestamp || Date.now()).toLocaleTimeString();
				const sep = "─".repeat(60);

				const kv = (label, val, max = 120) => {
					if (val == null || val === "" || val === "null" || val === "undefined") return "";
					const s = typeof val === "object" ? JSON.stringify(val) : String(val);
					return `${label}: ${s.length > max ? s.slice(0, max) + "…" : s}\n`;
				};

				const section = (title, obj) => {
					if (!obj || !Object.keys(obj).length) return "";
					let out = `${title} (${Object.keys(obj).length}):\n`;
					for (const [k, v] of Object.entries(obj)) out += `  ${k}: ${String(v).slice(0, 100)}\n`;
					return out;
				};

				let head = `${sep}\n[${idx + 1}] `;

				switch (req.type) {

					case "fetch":
					case "xhr": {
						const status = req.responseStatus ? ` [${req.responseStatus}]` : " [pending]";
						const dur = req.duration != null ? ` ${Math.round(req.duration)}ms` : "";
						let out = head + `${req.type.toUpperCase()} ${req.method || "GET"}${status}${dur} · ${time}\n`;
						out += kv("URL", req.url);
						out += section("Params", req.params);
						out += section("Req Headers", req.headers);
						out += section("Res Headers", req.responseHeaders);
						if (req.body != null) {
							const b = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
							if (b && b !== "null") out += kv("Req Body", b, 300);
						}
						if (req.responseBody != null) {
							const b = typeof req.responseBody === "string" ? req.responseBody : JSON.stringify(req.responseBody);
							if (b && b !== "null") out += kv("Res Body", b, 300);
						}
						return out;
					}

					case "websocket": {
						const states = {
							0: "CONNECTING",
							1: "OPEN",
							2: "CLOSING",
							3: "CLOSED"
						};
						let out = head + `WS [${states[req.readyState] || "?"}] · ${time}\n`;
						out += kv("URL", req.url);
						out += kv("Protocols", Array.isArray(req.protocols) ? req.protocols.join(", ") : req.protocols);
						out += kv("Messages", req.messages?.length);
						out += kv("Duration", req.totalDuration != null ? Math.round(req.totalDuration) + "ms" : null);
						out += kv("Close Code", req.closeCode);
						out += kv("Close Reason", req.closeReason);
						out += kv("Error", req.error);
						return out;
					}

					case "websocket_message": {
						const dir = (req.lastMessage?.direction || "?").toUpperCase();
						let out = head + `WS MSG [${dir}] · ${time}\n`;
						out += kv("URL", req.url);
						out += kv("Data", req.lastMessage?.data, 300);
						out += kv("Data Type", req.lastMessage?.dataType);
						out += kv("Size", req.lastMessage?.dataSize != null ? req.lastMessage.dataSize + " bytes" : null);
						out += kv("Total Msgs", req.messageCount);
						return out;
					}

					case "eventsource": {
						const states = {
							0: "CONNECTING",
							1: "OPEN",
							2: "CLOSED"
						};
						let out = head + `SSE [${states[req.readyState] || "?"}] · ${time}\n`;
						out += kv("URL", req.url);
						out += kv("With Credentials", req.withCredentials);
						out += kv("Events", req.events?.length);
						out += kv("Error", req.error);
						if (req.lastEvent) {
							out += `Last Event:\n`;
							out += kv("  Type", req.lastEvent.eventType);
							out += kv("  Data", req.lastEvent.data, 200);
							out += kv("  ID", req.lastEvent.lastEventId);
						}
						return out;
					}

					case "eventsource_event": {
						let out = head + `SSE EVENT · ${time}\n`;
						out += kv("URL", req.url);
						out += kv("Event Type", req.lastEvent?.eventType);
						out += kv("Data", req.lastEvent?.data, 200);
						out += kv("Total Events", req.eventCount);
						return out;
					}

					case "beacon": {
						let out = head + `BEACON · ${time}\n`;
						out += kv("URL", req.url);
						out += kv("Data Type", req.dataType);
						out += kv("Size", req.dataSize != null ? req.dataSize + " bytes" : null);
						out += kv("Data", req.data, 200);
						out += kv("Success", req.success);
						return out;
					}

					case "webrtc": {
						let out = head + `WebRTC [${req.connectionState || "new"}] · ${time}\n`;
						out += kv("ICE Candidates", req.iceCandidates?.length);
						out += kv("Data Channels", req.dataChannels?.length);
						out += kv("Tracks", req.streams?.length);
						if (req.lastIceCandidate) out += kv("Last ICE", req.lastIceCandidate.candidate, 100);
						if (req.lastDataChannelMessage) {
							out += `Last DC Msg [${(req.lastDataChannelMessage.direction || "").toUpperCase()}]:\n`;
							out += kv("  Data", req.lastDataChannelMessage.data, 200);
						}
						return out;
					}

					case "localStorage_get":
					case "localStorage_set":
					case "localStorage_remove":
					case "localStorage_clear": {
						const op = req.type.replace("localStorage_", "");
						let out = head + `localStorage.${op}() · ${time}\n`;
						out += kv("Key", req.key);
						out += kv("Value", req.value, 200);
						return out;
					}

					case "sessionStorage_set":
					case "sessionStorage_get":
					case "sessionStorage_remove":
					case "sessionStorage_clear": {
						const op = req.type.replace("sessionStorage_", "");
						let out = head + `sessionStorage.${op}() · ${time}\n`;
						out += kv("Key", req.key);
						out += kv("Value", req.value, 200);
						return out;
					}

					case "indexeddb_open": {
						let out = head + `IndexedDB.open() · ${time}\n`;
						out += kv("Name", req.name);
						out += kv("Version", req.version);
						return out;
					}

					case "form_submit": {
						let out = head + `FORM SUBMIT · ${time}\n`;
						out += kv("Action", req.action);
						out += kv("Method", req.method);
						out += kv("Enctype", req.enctype);
						if (req.data) {
							const d = typeof req.data === "string" ? req.data : JSON.stringify(req.data);
							out += kv("Data", d, 300);
						}
						return out;
					}

					case "navigation_assign":
					case "navigation_replace":
					case "navigation_reload": {
						const op = req.type.replace("navigation_", "");
						let out = head + `location.${op}() · ${time}\n`;
						out += kv("URL", req.url);
						out += kv("Force Reload", req.forceReload);
						return out;
					}

					case "script_load": {
						let out = head + `SCRIPT LOAD · ${time}\n`;
						out += kv("Src", req.src);
						out += kv("Async", req.async);
						out += kv("Defer", req.defer);
						return out;
					}

					case "stylesheet_load":
						return head + `STYLESHEET LOAD · ${time}\n` + kv("Href", req.href);

					case "iframe_load":
						return head + `IFRAME LOAD · ${time}\n` + kv("Src", req.src);

					case "service_worker_register": {
						const ok = req.success ? "✓" : "✗";
						let out = head + `SW REGISTER [${ok}] · ${time}\n`;
						out += kv("Script URL", req.scriptURL);
						out += kv("Scope", req.scope);
						out += kv("Error", req.error);
						return out;
					}

					case "cache_open": {
						let out = head + `CACHE.open() · ${time}\n`;
						out += kv("Cache Name", req.cacheName);
						out += kv("Operations", req.operations?.length);
						if (req.lastOperation) {
							out += `Last Op [${req.lastOperation.operation}]:\n`;
							out += kv("  Success", req.lastOperation.success);
							out += kv("  Error", req.lastOperation.error);
						}
						return out;
					}

					case "performance_mark":
						return head + `PERF MARK · ${time}\n` + kv("Name", req.name);

					case "performance_measure": {
						let out = head + `PERF MEASURE · ${time}\n`;
						out += kv("Name", req.name);
						out += kv("Start", req.startMark);
						out += kv("End", req.endMark);
						return out;
					}

					case "resource_timing": {
						let out = head + `RESOURCE TIMING · ${time}\n`;
						out += kv("Name", req.name);
						out += kv("Initiator", req.initiatorType);
						out += kv("Duration", req.duration != null ? Math.round(req.duration) + "ms" : null);
						out += kv("Transfer Size", req.transferSize != null ? req.transferSize + " bytes" : null);
						out += kv("Protocol", req.nextHopProtocol);
						return out;
					}

					case "raf_monitor":
						return head + `RAF MONITOR · ${time}\n` + kv("Frame Count", req.count);

					default: {
						const skip = new Set(["type", "timestamp", "timestampISO", "id"]);
						let out = head + `${(req.type || "UNKNOWN").toUpperCase()} · ${time}\n`;
						for (const [k, v] of Object.entries(req)) {
							if (skip.has(k) || v == null) continue;
							const s = typeof v === "object" ? JSON.stringify(v) : String(v);
							out += `${k}: ${s.slice(0, 150)}\n`;
						}
						return out;
					}
				}
			},

			async downloadAll() {
				let typeFilters = null;
				try {
					const r = localStorage.getItem(this.SETTINGS_KEY);
					if (r) typeFilters = JSON.parse(r).requestTypes || null;
				} catch (_) {}

				function getGroup(t) {
					if (t === "fetch" || t === "xhr") return "fetchxhr";
					if (t === "websocket" || t === "websocket_message") return "websocket";
					if (t === "eventsource" || t === "eventsource_event") return "sse";
					if (t === "beacon") return "beacon";
					if (t === "webrtc") return "webrtc";
					if (t.startsWith("localStorage") || t.startsWith("sessionStorage") || t === "indexeddb_open") return "storage";
					if (t.startsWith("navigation") || t === "form_submit") return "navigation";
					if (["script_load", "stylesheet_load", "iframe_load", "service_worker_register", "cache_open"].includes(t)) return "resources";
					if (["performance_mark", "performance_measure", "resource_timing", "raf_monitor"].includes(t)) return "performance";
					return "other";
				}

				const filtered = typeFilters ?
					networkLog.filter(req => typeFilters[getGroup(req.type || "other")] !== false) :
					networkLog.slice();

				if (!filtered.length) {
					alert("No requests to export after applying filters.");
					return;
				}

				const total = filtered.length;
				const hidden = networkLog.length - total;

				if (!confirm(`Export ${total} request${total === 1 ? "" : "s"}${hidden ? ` (${hidden} hidden by filter)` : ""}?`)) return;

				const safe = (obj, maxDepth = 10) => {
					try {
						return JSON.parse(JSON.stringify(obj, (k, v) => {
							if (typeof v === 'function') return '[Function]';
							if (v === undefined) return null;
							if (v instanceof Blob) return `[Blob: ${v.size} bytes, ${v.type}]`;
							if (v instanceof File) return `[File: ${v.name}, ${v.size} bytes]`;
							if (v instanceof ArrayBuffer) return `[ArrayBuffer: ${v.byteLength} bytes]`;
							if (v instanceof FormData) return '[FormData]';
							if (v instanceof Headers) return Object.fromEntries(v.entries());
							if (v && typeof v === 'object' && v.constructor?.name === 'Object') return v;
							if (v && typeof v === 'object') return `[${v.constructor?.name}]`;
							return v;
						}));
					} catch (e) {
						return `[Serialization error: ${e.message}]`;
					}
				};

				const exportData = {
					exportedAt: new Date().toISOString(),
					panelVersion: VERSION,
					host: location.hostname,
					totalCaptured: networkLog.length,
					filtered: total,
					hidden,
					filtersApplied: !!typeFilters,
					requests: filtered.map((req, idx) => {
						const common = {
							index: idx + 1,
							type: req.type,
							timestamp: req.timestamp,
							timestampISO: req.timestampISO || new Date(req.timestamp).toISOString()
						};

						switch (req.type) {
							case "fetch":
							case "xhr":
								return {
									...common,
									url: req.url,
										method: req.method,
										params: req.params || {},
										headers: {
											request: req.headers || {},
											response: req.responseHeaders || {}
										},
										body: {
											request: req.body ?? null,
											requestSize: req.bodySize ?? null,
											response: req.responseBody ?? null,
											responseSize: req.responseBodySize ?? null
										},
										response: {
											status: req.responseStatus,
											statusText: req.responseStatusText,
											contentType: req.responseHeaders?.['content-type'] || null,
											redirectUrl: req.redirectUrl,
											redirectCount: req.redirectCount
										},
										timing: {
											startTime: req.timestamp,
											endTime: req.responseTimestamp,
											duration: req.duration,
											breakdown: req.timing || null
										},
										error: req.error || null
								};

							case "websocket":
								return {
									...common,
									url: req.url,
										protocols: req.protocols,
										readyState: req.readyState,
										messages: req.messages?.map(m => ({
											direction: m.direction,
											data: safe(m.data),
											dataType: m.dataType,
											size: m.dataSize,
											timestamp: m.timestamp
										})) || [],
										openTimestamp: req.openTimestamp,
										closeTimestamp: req.closeTimestamp,
										closeCode: req.closeCode,
										closeReason: req.closeReason,
										wasClean: req.wasClean,
										duration: req.duration,
										totalDuration: req.totalDuration,
										error: req.error || null
								};

							case "websocket_message":
								return {
									...common,
									url: req.url,
										direction: req.lastMessage?.direction,
										data: safe(req.lastMessage?.data),
										dataType: req.lastMessage?.dataType,
										size: req.lastMessage?.dataSize,
										messageCount: req.messageCount,
										timestamp: req.lastMessage?.timestamp
								};

							case "eventsource":
								return {
									...common,
									url: req.url,
										withCredentials: req.withCredentials,
										readyState: req.readyState,
										events: req.events?.map(e => ({
											type: e.eventType,
											data: e.data,
											lastEventId: e.lastEventId,
											origin: e.origin,
											timestamp: e.timestamp
										})) || [],
										openTimestamp: req.openTimestamp,
										closeTimestamp: req.closeTimestamp,
										duration: req.duration,
										totalDuration: req.totalDuration,
										error: req.error || null
								};

							case "eventsource_event":
								return {
									...common,
									url: req.url,
										eventType: req.lastEvent?.eventType,
										data: safe(req.lastEvent?.data),
										lastEventId: req.lastEvent?.lastEventId,
										origin: req.lastEvent?.origin,
										eventCount: req.eventCount,
										timestamp: req.lastEvent?.timestamp
								};

							case "beacon":
								return {
									...common,
									url: req.url,
										data: safe(req.data),
										dataType: req.dataType,
										size: req.dataSize,
										success: req.success
								};

							case "webrtc":
								return {
									...common,
									configuration: safe(req.configuration),
										connectionState: req.connectionState,
										iceCandidates: req.iceCandidates?.map(ice => ({
											candidate: ice.candidate,
											sdpMid: ice.sdpMid,
											sdpMLineIndex: ice.sdpMLineIndex,
											timestamp: ice.timestamp
										})) || [],
										streams: req.streams?.map(s => ({
											kind: s.kind,
											enabled: s.enabled,
											readyState: s.readyState,
											timestamp: s.timestamp
										})) || [],
										dataChannels: req.dataChannels?.map(dc => ({
											label: dc.label,
											options: safe(dc.options),
											timestamp: dc.timestamp
										})) || [],
										lastIceCandidate: req.lastIceCandidate ? {
											candidate: req.lastIceCandidate.candidate,
											sdpMid: req.lastIceCandidate.sdpMid,
											sdpMLineIndex: req.lastIceCandidate.sdpMLineIndex,
											timestamp: req.lastIceCandidate.timestamp
										} : null,
										lastDataChannelMessage: req.lastDataChannelMessage ? {
											direction: req.lastDataChannelMessage.direction,
											data: safe(req.lastDataChannelMessage.data),
											timestamp: req.lastDataChannelMessage.timestamp
										} : null,
										lastTrack: req.lastTrack ? {
											kind: req.lastTrack.kind,
											enabled: req.lastTrack.enabled,
											readyState: req.lastTrack.readyState,
											timestamp: req.lastTrack.timestamp
										} : null
								};

							case "localStorage_set":
							case "localStorage_get":
							case "localStorage_remove":
							case "localStorage_clear":
							case "sessionStorage_set":
							case "sessionStorage_get":
							case "sessionStorage_remove":
							case "sessionStorage_clear":
								return {
									...common,
									operation: req.type.replace(/^localStorage_|^sessionStorage_/, ''),
										storage: req.type.startsWith('localStorage') ? 'localStorage' : 'sessionStorage',
										key: req.key,
										value: req.value !== undefined ? (typeof req.value === 'string' ? req.value : safe(req.value)) : null
								};

							case "indexeddb_open":
								return {
									...common,
									name: req.name,
										version: req.version
								};

							case "form_submit":
								return {
									...common,
									action: req.action,
										method: req.method,
										enctype: req.enctype,
										data: safe(req.data)
								};

							case "navigation_assign":
							case "navigation_replace":
							case "navigation_reload":
								return {
									...common,
									operation: req.type.replace('navigation_', ''),
										url: req.url,
										forceReload: req.forceReload
								};

							case "script_load":
								return {
									...common,
									src: req.src,
										async: req.async,
											defer: req.defer,
											crossOrigin: req.crossOrigin,
											integrity: req.integrity,
											inline: req.inline || null
								};

							case "stylesheet_load":
								return {
									...common,
									href: req.href
								};

							case "iframe_load":
								return {
									...common,
									src: req.src
								};

							case "service_worker_register":
								return {
									...common,
									scriptURL: req.scriptURL,
										options: safe(req.options),
										success: req.success,
										scope: req.scope,
										active: req.active,
										waiting: req.waiting,
										installing: req.installing,
										error: req.error
								};

							case "cache_open":
								return {
									...common,
									cacheName: req.cacheName,
										operations: req.operations?.map(op => ({
											operation: op.operation,
											arguments: safe(op.arguments),
											success: op.success,
											result: safe(op.result),
											error: op.error,
											timestamp: op.timestamp
										})) || [],
										lastOperation: req.lastOperation ? {
											operation: req.lastOperation.operation,
											arguments: safe(req.lastOperation.arguments),
											success: req.lastOperation.success,
											result: safe(req.lastOperation.result),
											error: req.lastOperation.error,
											timestamp: req.lastOperation.timestamp
										} : null
								};

							case "performance_mark":
								return {
									...common,
									name: req.name,
										options: safe(req.options)
								};

							case "performance_measure":
								return {
									...common,
									name: req.name,
										startMark: req.startMark,
										endMark: req.endMark
								};

							case "resource_timing":
								return {
									...common,
									name: req.name,
										initiatorType: req.initiatorType,
										duration: req.duration,
										transferSize: req.transferSize,
										encodedBodySize: req.encodedBodySize,
										decodedBodySize: req.decodedBodySize,
										nextHopProtocol: req.nextHopProtocol
								};

							case "raf_monitor":
								return {
									...common,
									frameCount: req.count
								};

							default:
								const exclude = new Set(['type', 'timestamp', 'timestampISO', 'id']);
								const extra = {};
								for (const [k, v] of Object.entries(req)) {
									if (!exclude.has(k) && v !== undefined && v !== null) {
										extra[k] = safe(v);
									}
								}
								return {
									...common,
									...extra
								};
						}
					})
				};

				try {
					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: "application/json"
					});
					const url = URL.createObjectURL(blob);
					const win = window.open(url, "_blank");
					if (!win) {
						alert("Popup blocked by browser");
						return;
					}
					setTimeout(() => URL.revokeObjectURL(url), 10000);
					return `✓ Opened JSON export (${total} requests)`;
				} catch (e) {
					alert("Export failed: " + e.message);
					return "Export failed";
				}
			},

			openSettings() {
				/* moved to global Settings */
			},

			renderUI(container, makeBtn, textarea) {
				const resultBox = document.createElement("div");
				Object.assign(resultBox.style, {
					flex: "1",
					overflowY: "auto",
					fontFamily: "monospace",
					fontSize: "12px",
					background: "#0d1117",
					color: "#c9d1d9",
					padding: "10px",
					borderRadius: "6px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all"
				});
				resultBox.textContent = "Loading...";
				container.append(resultBox);
				this.fetchData().then(data => {
					resultBox.textContent = data;
					if (textarea) textarea.value = data;
				});
			},
		});

		registerPlugin({
			id: "console",
			label: "Console Log",
			color: "#37474f",

			_SETTINGS_KEY: "wp_console_settings",
			_DEFAULTS: {
				levels: {
					log: true,
					warn: true,
					error: true,
					info: true,
					debug: true,
					assert: true,
					trace: true,
					table: true,
					dir: true,
					group: true,
					uncaught_error: true,
					unhandled_rejection: true,
					resource_error: true,
					other: true
				},
				showLocation: true,
				showStack: true,
				maxStack: 5,
				groupSameMsg: false
			},

			_getSettings() {
				try {
					const r = localStorage.getItem(this._SETTINGS_KEY);
					if (r) {
						const p = JSON.parse(r);
						return {
							...this._DEFAULTS,
							...p,
							levels: {
								...this._DEFAULTS.levels,
								...(p.levels || {})
							}
						};
					}
				} catch (_) {}
				return JSON.parse(JSON.stringify(this._DEFAULTS));
			},

			_saveSettings(s) {
				try {
					localStorage.setItem(this._SETTINGS_KEY, JSON.stringify(s));
				} catch (_) {}
			},

			_levelMeta: {
				log: {
					icon: "📝",
					color: "#78909c",
					label: "Log"
				},
				warn: {
					icon: "⚠️",
					color: "#f57f17",
					label: "Warn"
				},
				error: {
					icon: "❌",
					color: "#c62828",
					label: "Error"
				},
				info: {
					icon: "ℹ️",
					color: "#1565c0",
					label: "Info"
				},
				debug: {
					icon: "🐛",
					color: "#2e7d32",
					label: "Debug"
				},
				assert: {
					icon: "✓",
					color: "#6a1b9a",
					label: "Assert"
				},
				trace: {
					icon: "🔍",
					color: "#00695c",
					label: "Trace"
				},
				table: {
					icon: "📊",
					color: "#00838f",
					label: "Table"
				},
				dir: {
					icon: "📁",
					color: "#4527a0",
					label: "Dir"
				},
				group: {
					icon: "▶",
					color: "#37474f",
					label: "Group"
				},
				uncaught_error: {
					icon: "💥",
					color: "#b71c1c",
					label: "Uncaught Error"
				},
				unhandled_rejection: {
					icon: "🔥",
					color: "#bf360c",
					label: "Unhandled Rejection"
				},
				resource_error: {
					icon: "🚫",
					color: "#e65100",
					label: "Resource Error"
				},
				other: {
					icon: "•",
					color: "#455a64",
					label: "Other"
				}
			},

			_filterEntries(settings) {
				return consoleLog.filter(e => {
					const lvl = e.level;
					const knownLevels = new Set(Object.keys(this._DEFAULTS.levels));
					if (lvl === "groupEnd" || lvl === "groupCollapsed") return settings.levels["group"] !== false;
					if (knownLevels.has(lvl)) return settings.levels[lvl] !== false;
					return settings.levels["other"] !== false;
				});
			},

			_formatLocation(loc, source) {
				if (!loc && !source) return "";
				let out = "";
				if (loc && loc.file) {
					let file = loc.file;
					try {
						file = new URL(loc.file).pathname.split("/").slice(-2).join("/");
					} catch (_) {}
					out += file;
					if (loc.line != null) out += ":" + loc.line;
					if (loc.col != null) out += ":" + loc.col;
					if (loc.fn && loc.fn !== "(anonymous)") out = loc.fn + " @ " + out;
				}
				return out;
			},

			fetchData() {
				if (!consoleLog.length)
					return "Belum ada console output.\n\nCatatan: hook aktif sejak document_start — semua error tercatat otomatis.\nJika panel baru dibuka, coba klik ↻ Refresh untuk drain buffer.";

				const settings = this._getSettings();
				const filtered = this._filterEntries(settings);

				if (!filtered.length)
					return `${consoleLog.length} entri tersembunyi oleh filter.\nBuka ⚙ Settings untuk ubah filter level.`;

				const summary = {};
				consoleLog.forEach(e => {
					const k = e.level;
					summary[k] = (summary[k] || 0) + 1;
				});
				const errCount = (summary.error || 0) + (summary.uncaught_error || 0) + (summary.unhandled_rejection || 0);
				const warnCount = summary.warn || 0;
				const resCount = summary.resource_error || 0;

				const filterNote = filtered.length < consoleLog.length ?
					` · ${consoleLog.length - filtered.length} hidden` : "";

				let out = `╔══ CONSOLE LOG — ${filtered.length} shown${filterNote} ══╗\n`;
				out += `  Total: ${consoleLog.length}`;
				if (errCount) out += `  |  🔴 Errors: ${errCount}`;
				if (warnCount) out += `  |  ⚠️  Warns: ${warnCount}`;
				if (resCount) out += `  |  🚫 Resource: ${resCount}`;
				out += "\n";
				const byLevel = Object.entries(summary).map(([k, v]) => `${k}(${v})`).join(" ");
				out += `  By level: ${byLevel}\n`;
				out += `╚${"═".repeat(50)}╝\n\n`;

				filtered.forEach((e, i) => {
					const meta = this._levelMeta[e.level] || this._levelMeta.other;
					const time = new Date(e.timestamp).toLocaleTimeString("id-ID", {
						hour12: false
					});
					const ms = String(e.timestamp).slice(-3);
					const badge = e.replayed ? " [pre-load]" : "";
					const src = e.source && e.source !== "console" ? ` [${e.source}]` : "";

					out += `${"─".repeat(60)}\n`;
					out += `[${i+1}] ${meta.icon} ${meta.label.toUpperCase()}${src}${badge}  ${time}.${ms}\n`;

					if (settings.showLocation) {
						const loc = this._formatLocation(e.location, e.source);
						if (loc) out += `📍 ${loc}\n`;
					}

					e.msg.split("\n").forEach((line, idx) => {
						out += (idx === 0 ? "   " : "   ") + line + "\n";
					});

					if (settings.showStack && e.frames && e.frames.length) {
						const maxF = settings.maxStack || 5;
						out += `   Stack:\n`;
						e.frames.slice(0, maxF).forEach(f => {
							let filePart = f.file || "";
							try {
								filePart = new URL(f.file).pathname.split("/").slice(-2).join("/");
							} catch (_) {}
							const fn = f.fn && f.fn !== "(anonymous)" ? f.fn + " " : "";
							out += `     → ${fn}${filePart}:${f.line}:${f.col}\n`;
						});
						if (e.frames.length > maxF) out += `     … ${e.frames.length - maxF} more frames\n`;
					} else if (settings.showStack && e.stack && !e.frames?.length) {
						out += `   Stack:\n`;
						e.stack.split(" | ").slice(0, settings.maxStack || 5).forEach(s => out += `     → ${s}\n`);
					}

					out += "\n";
				});

				out += `${"─".repeat(60)}\n`;
				out += `Host: ${location.hostname}  |  Captured: ${new Date().toLocaleTimeString()}`;
				return out.trim();
			},

			clear() {
				const n = consoleLog.length;
				consoleLog.length = 0;
				return `Cleared ${n} entries`;
			},

			async downloadAll() {
				if (!consoleLog.length) return "No console log to download.";
				const settings = this._getSettings();
				const data = {
					exportedAt: new Date().toISOString(),
					panelVersion: VERSION,
					host: location.hostname,
					url: location.href,
					userAgent: navigator.userAgent,
					totalCaptured: consoleLog.length,
					summary: (() => {
						const s = {};
						consoleLog.forEach(e => {
							s[e.level] = (s[e.level] || 0) + 1;
						});
						return s;
					})(),
					entries: consoleLog.map((e, i) => ({
						index: i + 1,
						level: e.level,
						message: e.msg,
						location: e.location || null,
						frames: e.frames || [],
						stack: e.stack || null,
						source: e.source || null,
						replayed: e.replayed || false,
						timestamp: e.timestamp,
						time: new Date(e.timestamp).toLocaleString()
					}))
				};
				const blob = new Blob([JSON.stringify(data, null, 2)], {
					type: "application/json"
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "console-" + location.hostname + "-" + Date.now() + ".json";
				document.body.appendChild(a);
				a.click();
				setTimeout(() => {
					URL.revokeObjectURL(url);
					a.remove();
				}, 2000);
				return `✓ Exported ${consoleLog.length} entries`;
			},

			openSettings() {
				/* moved to global Settings */
			},

			renderUI(container, makeBtn, textarea) {
				const resultBox = document.createElement("div");
				Object.assign(resultBox.style, {
					flex: "1",
					overflowY: "auto",
					fontFamily: "monospace",
					fontSize: "12px",
					background: "#0d1117",
					color: "#c9d1d9",
					padding: "10px",
					borderRadius: "6px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all"
				});
				const data = this.fetchData();
				resultBox.textContent = data;
				if (textarea) textarea.value = data;
				container.append(resultBox);
			},
		});

		registerPlugin({
			id: "rendered_html",
			label: "Get Html",
			color: "#e65100",

			_opts: {
				source: "live",
				inlineScripts: true,
				inlineCSS: true,
				inlineImages: false,
				inlineCSSUrls: false,
				stripComments: false,
				prettify: false,
				includeShadowDOM: false,
				addBaseTag: true,
				addMetaTimestamp: true,
				previewLength: 3000,
				downloadFormat: "html"
			},

			_getOpts() {
				try {
					const saved = localStorage.getItem("_wp_gethtml_opts");
					if (saved) return {
						...this._opts,
						...JSON.parse(saved)
					};
				} catch (_) {}
				return {
					...this._opts
				};
			},

			_saveOpts(opts) {
				try {
					localStorage.setItem("_wp_gethtml_opts", JSON.stringify(opts));
				} catch (_) {}
				this._opts = opts;
			},

			async _fetchText(url) {
				const attempts = [];

				try {
					const res = await fetch(url, {
						cache: "force-cache",
						mode: "cors",
						credentials: "same-origin"
					});
					if (res && res.ok) return await res.text();
					attempts.push(`fetch:cors → HTTP ${res ? res.status : 'no response'}`);
				} catch (e) {
					const reason = e.name === 'AbortError' ? 'timeout' :
						(e.name === 'TypeError' ? 'cors-blocked' : (e.name || e.message));
					attempts.push(`fetch:cors → ${reason}`);
				}

				try {
					const r = await new Promise((resolve, reject) => {
						const x = new XMLHttpRequest();
						x.timeout = 8000;
						x.onreadystatechange = () => {
							if (x.readyState === 4) {
								if (x.status === 200) resolve(x.responseText);
								else if (x.status !== 0) resolve(null);
							}
						};
						x.onerror = () => reject(new Error('network error'));
						x.ontimeout = () => reject(new Error('timeout(8s)'));
						x.open("GET", url, true);
						x.send();
					});
					if (r !== null) return r;
					attempts.push('xhr → non-200 or empty');
				} catch (e) {
					attempts.push(`xhr → ${e.message || e.name}`);
				}


				try {
					for (const name of await caches.keys()) {
						const c = await caches.open(name);
						const m = await c.match(url) || await c.match(new URL(url).origin + new URL(url).pathname);
						if (m) return m.text();
					}
					attempts.push('cache → miss');
				} catch (e) {
					attempts.push(`cache → ${e.message || e.name}`);
				}

				console.debug(`[WP:getHTML] _fetchText failed for ${url} — ${attempts.join(' | ')}`);
				return null;
			},

			_stripComments(html) {
				return html.replace(/<!--[\s\S]*?-->/g, "");
			},

			_prettify(html) {
				const o = _getPrettierOpts();
				try {
					return _HTMLPrettifier.prettify(html, {
						indent: o.htmlIndent,
						sortAttributes: o.htmlSortAttrs,
						wrapLineLength: 120
					});
				} catch (e) {
					console.warn("[WP] HTMLPrettifier failed:", e.message);
					return html;
				}
			},

			_getShadowContent(el, depth = 0) {
				if (depth > 10) return "";
				let out = "";

				if (el.tagName === "CANVAS") {
					try {
						const dataUrl = el.toDataURL("image/png");
						out += `\n<!-- canvas[${el.width}x${el.height}] --><img src="${dataUrl}" width="${el.width}" height="${el.height}" data-wp-canvas="true"/>`;
					} catch (_) {
						out += `\n<!-- canvas: tainted/cross-origin, cannot serialize -->`;
					}
				}

				if (el.tagName === "IFRAME") {
					try {
						const idoc = el.contentDocument;
						if (idoc && idoc.documentElement) {
							const snap = idoc.documentElement.outerHTML;
							const src = el.src || "(srcdoc)";
							out += `\n<!-- iframe[src="${src}"] -->\n<wp-iframe-snapshot data-src="${src}"><![CDATA[\n${snap}\n]]></wp-iframe-snapshot>`;
						}
					} catch (_) {
						out += `\n<!-- iframe[src="${el.src}"]: cross-origin, cannot snapshot -->`;
					}
				}

				if (el.shadowRoot) {
					out += `\n<!-- shadow-root[mode=${el.shadowRoot.mode}] depth:${depth} -->\n`;
					for (const child of el.shadowRoot.children) {
						out += this._serializeNodeWithShadow(child, depth + 1);
					}
					out += `\n<!-- /shadow-root depth:${depth} -->`;
				}

				for (const child of el.querySelectorAll("*")) {
					if (child.shadowRoot || child.tagName === "CANVAS" || child.tagName === "IFRAME") {
						out += this._getShadowContent(child, depth + 1);
					}
				}

				return out;
			},

			_serializeNodeWithShadow(node, depth) {
				if (!node) return "";
				if (depth > 10) return "";
				let html = node.outerHTML || "";
				if (node.shadowRoot || node.querySelector && node.querySelector("*")) {
					const nested = this._getShadowContent(node, depth);
					if (nested) {
						const closeTag = `</${node.tagName.toLowerCase()}>`;
						const insertAt = html.lastIndexOf(closeTag);
						if (insertAt !== -1) {
							html = html.slice(0, insertAt) + nested + html.slice(insertAt);
						}
					}
				}
				return html;
			},

			async _build(opts, forDownload) {
				let html = "";

				if (opts.source === "outerHTML") {
					html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
				} else if (opts.source === "innerHTML") {
					html = document.documentElement.innerHTML;
				} else if (opts.source === "serializer") {
					html = "<!DOCTYPE html>\n" + new XMLSerializer().serializeToString(document);
				} else {
					const doc = document.documentElement.cloneNode(true);

					if (opts.inlineScripts) {
						for (const el of doc.querySelectorAll("script[src]")) {
							const src = el.getAttribute("src");
							if (!src) continue;
							try {
								const abs = new URL(src, location.href).href;
								const text = await this._fetchText(abs);
								if (text) {
									const inline = document.createElement("script");
									if (el.type) inline.type = el.type;
									inline.textContent = `/* inlined: ${abs} */\n` + text;
									el.replaceWith(inline);
								} else el.setAttribute("data-wp-fetch-failed", "true");
							} catch (_) {
								el.setAttribute("data-wp-fetch-failed", "true");
							}
						}
					}

					if (opts.inlineCSS) {
						for (const el of doc.querySelectorAll("link[rel='stylesheet']")) {
							const href = el.getAttribute("href");
							if (!href) continue;
							try {
								const abs = new URL(href, location.href).href;
								const text = await this._fetchText(abs);
								if (text) {
									const style = document.createElement("style");
									style.textContent = `/* inlined: ${abs} */\n` + text;
									el.replaceWith(style);
								} else el.setAttribute("data-wp-fetch-failed", "true");
							} catch (_) {
								el.setAttribute("data-wp-fetch-failed", "true");
							}
						}
					}

					if (opts.inlineCSSUrls) {
						for (const el of doc.querySelectorAll("style")) {
							let css = el.textContent;
							for (const match of [...css.matchAll(/url\(['\"]?([^'"\)\s]+)['\"]?\)/g)]) {
								const ref = match[1];
								if (ref.startsWith("data:")) continue;
								try {
									const abs = new URL(ref, location.href).href;
									const resp = await fetch(abs, {
										cache: "force-cache"
									});
									if (resp.ok) {
										const blob = await resp.blob();
										const dataUrl = await new Promise(res => {
											const fr = new FileReader();
											fr.onload = () => res(fr.result);
											fr.readAsDataURL(blob);
										});
										css = css.replaceAll(match[0], `url("${dataUrl}")`);
									}
								} catch (_) {}
							}
							el.textContent = css;
						}
					}

					if (opts.inlineImages) {
						for (const el of doc.querySelectorAll("img[src]")) {
							const src = el.getAttribute("src");
							if (src && !src.startsWith("data:")) {
								try {
									const abs = new URL(src, location.href).href;
									const resp = await fetch(abs, {
										cache: "force-cache"
									});
									if (resp.ok) {
										const blob = await resp.blob();
										const dataUrl = await new Promise(res => {
											const fr = new FileReader();
											fr.onload = () => res(fr.result);
											fr.readAsDataURL(blob);
										});
										el.setAttribute("src", dataUrl);
									}
								} catch (_) {}
							}
						}
					}

					if (opts.addMetaTimestamp) {
						const meta = document.createElement("meta");
						meta.setAttribute("name", "wp-captured-at");
						meta.setAttribute("content", new Date().toISOString());
						const head = doc.querySelector("head");
						if (head) head.prepend(meta);
					}

					if (opts.addBaseTag) {
						const base = document.createElement("base");
						base.href = location.href;
						const head = doc.querySelector("head");
						if (head) head.prepend(base);
					}

					html = "<!DOCTYPE html>\n" + doc.outerHTML;

					if (opts.includeShadowDOM) {
						html += "\n<!-- SHADOW DOM CONTENT -->\n" + this._getShadowContent(document.body);
					}
				}

				if (opts.stripComments) html = this._stripComments(html);
				if (opts.prettify) {
					html = this._prettify(html);
					const _po = _getPrettierOpts();
					html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, css, close) => {
						try {
							return open + '\n' + _CSSPrettifier.prettify(css, {
								indent: _po.cssIndent,
								sortProperties: _po.cssSortProps
							}) + close;
						} catch (_) {
							return m;
						}
					});
					html = html.replace(/(<script(?![^>]*type=["']text\/(?:css|plain)["'])[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, js, close) => {
						if (!js.trim()) return m;
						try {
							return open + '\n' + _JSPrettifier.prettify(js, {
								indent: _po.jsIndent,
								semi: _po.jsSemi,
								singleQuote: _po.jsSingleQuote
							}) + close;
						} catch (_) {
							return m;
						}
					});
				}

				return html;
			},

			async fetchData() {
				const opts = this._getOpts();
				const html = await this._build(opts, false);
				const lines = html.split("\n").length;
				const sizeKB = (new Blob([html]).size / 1024).toFixed(1);
				const preview = html.slice(0, opts.previewLength) + (html.length > opts.previewLength ? "\n\n... [truncated — use Download for full content]" : "");
				return JSON.stringify({
					meta: {
						timestamp: new Date().toISOString(),
						host: location.hostname,
						url: location.href,
						source: opts.source,
						lines,
						sizeKB: parseFloat(sizeKB),
						options: opts
					},
					preview
				}, null, 2);
			},

			async downloadAll() {
				const opts = this._getOpts();
				try {
					const html = await this._build(opts, true);
					const ext = opts.downloadFormat === "txt" ? "txt" : "html";
					const mime = opts.downloadFormat === "txt" ? "text/plain" : "text/html";
					const blob = new Blob([html], {
						type: mime
					});
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = location.hostname.replace(/\./g, "_") + "_" + Date.now() + "." + ext;
					a.style.display = "none";
					document.body.appendChild(a);
					a.click();
					setTimeout(() => {
						URL.revokeObjectURL(url);
						a.remove();
					}, 5000);
					return `✓ Downloaded (${(new Blob([html]).size / 1024).toFixed(1)} KB, ${opts.source} mode)`;
				} catch (e) {
					return "Failed: " + e.message;
				}
			},

			renderUI(container, makeBtn, textarea) {
				const self = this;
				const opts = self._getOpts();

				if (!document.head.querySelector("#wph-css")) {
					const st = document.createElement("style");
					st.id = "wph-css";
					st.textContent = `
						.wph-wrap {
							display: flex; flex-direction: column; flex: 1;
							gap: 8px; overflow: hidden; min-height: 0;
						}
						.wph-pre {
							flex: 1; overflow-y: auto; min-height: 0;
							font: 11.5px/1.65 'Cascadia Code','Fira Code','Consolas',monospace;
							background: #0d1117; color: #c9d1d9;
							padding: 12px 14px; border-radius: 8px;
							border: 1px solid #21262d;
							white-space: pre-wrap; word-break: break-all;
							scrollbar-width: thin; scrollbar-color: #30363d #0d1117;
						}
						.wph-pre::-webkit-scrollbar { width: 5px; }
						.wph-pre::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
						.wph-loading {
							display: flex; align-items: center; justify-content: center;
							gap: 10px; color: #8b949e;
							font: 13px system-ui,-apple-system,sans-serif; padding: 40px 0;
						}
						.wph-spinner {
							width: 15px; height: 15px;
							border: 2px solid #21262d; border-top-color: #e65100;
							border-radius: 50%; animation: wph-spin .65s linear infinite;
						}
						@keyframes wph-spin { to { transform: rotate(360deg); } }

						.wph-ov {
							position: absolute; inset: 0; background: #0e0e0e;
							display: flex; flex-direction: column; z-index: 10;
							font-family: system-ui,-apple-system,sans-serif;
							overflow: hidden;
							animation: wph-slidein .18s cubic-bezier(.22,.68,0,1.2) both;
						}
						@keyframes wph-slidein {
							from { opacity: 0; transform: translateY(6px) scale(.98); }
						}
						.wph-ov-hdr {
							display: flex; justify-content: space-between; align-items: center;
							padding: 13px 18px; background: #161616;
							border-bottom: 1px solid #252525; flex-shrink: 0;
						}
						.wph-ov-title {
							display: flex; align-items: center; gap: 8px;
							font-size: 14px; font-weight: 700; color: #f0f0f0;
						}
						.wph-ov-icon {
							display: inline-flex; align-items: center; justify-content: center;
							width: 26px; height: 26px; background: #1e0d00;
							border: 1px solid #7c2d12; border-radius: 6px;
							font-size: 12px; color: #e65100;
						}
						.wph-ov-close {
							background: transparent; border: none; color: #444;
							font-size: 17px; cursor: pointer; padding: 5px 8px;
							border-radius: 5px; line-height: 1; transition: all .15s;
						}
						.wph-ov-close:hover { color: #ccc; background: #252525; }
						.wph-ov-body {
							flex: 1; overflow-y: auto; padding: 16px 18px;
							display: flex; flex-direction: column; gap: 20px;
							scrollbar-width: thin; scrollbar-color: #2a2a2a #0e0e0e;
						}
						.wph-ov-body::-webkit-scrollbar { width: 5px; }
						.wph-ov-body::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
						.wph-sec { display: flex; flex-direction: column; gap: 7px; }
						.wph-sec-title {
							font-size: 9.5px; font-weight: 700; color: #444;
							text-transform: uppercase; letter-spacing: 1px;
							padding-bottom: 7px; border-bottom: 1px solid #1e1e1e;
						}
						.wph-sel-row {
							display: flex; align-items: center; gap: 10px;
							padding: 8px 12px; background: #161616; border-radius: 7px;
							border: 1px solid #1e1e1e; transition: border-color .15s;
						}
						.wph-sel-row:hover { border-color: #2a2a2a; }
						.wph-sel-lbl { font-size: 12px; color: #aaa; flex: 1; }
						.wph-sel {
							background: #0e0e0e; color: #e8e8e8;
							border: 1px solid #2a2a2a; border-radius: 5px;
							padding: 5px 8px; font-size: 11.5px; cursor: pointer;
							outline: none; transition: border-color .15s;
						}
						.wph-sel:focus { border-color: #e65100; }
						.wph-sel option { background: #161616; }
						.wph-toggle-row {
							display: flex; align-items: center; gap: 12px;
							padding: 9px 12px; background: #161616; border-radius: 8px;
							border: 1px solid #1e1e1e; cursor: pointer; transition: all .15s;
						}
						.wph-toggle-row:hover { background: #1a1a1a; border-color: #2a2a2a; }
						.wph-toggle-text { flex: 1; }
						.wph-toggle-text strong {
							display: block; font-size: 12px; font-weight: 600; color: #e0e0e0;
						}
						.wph-toggle-text span {
							display: block; font-size: 10.5px; color: #555; margin-top: 1px;
						}
						/* CSS toggle switch */
						.wph-sw { position: relative; display: inline-block; width: 32px; height: 17px; flex-shrink: 0; }
						.wph-sw input { opacity: 0; width: 0; height: 0; position: absolute; }
						.wph-track {
							position: absolute; inset: 0; background: #252525;
							border-radius: 17px; border: 1px solid #333; transition: all .2s; cursor: pointer;
						}
						.wph-track::before {
							content: ""; position: absolute;
							width: 11px; height: 11px; left: 2px; top: 2px;
							background: #555; border-radius: 50%; transition: all .2s;
						}
						.wph-sw input:checked ~ .wph-track {
							background: #7c2d12; border-color: #c2410c;
						}
						.wph-sw input:checked ~ .wph-track::before {
							transform: translateX(15px); background: #ea580c;
							box-shadow: 0 0 6px #e65100aa;
						}
						.wph-ov-footer {
							display: flex; gap: 8px; padding: 13px 18px;
							background: #161616; border-top: 1px solid #252525; flex-shrink: 0;
						}
						.wph-fbtn {
							padding: 9px 14px; border: none; border-radius: 7px;
							font-size: 11.5px; font-weight: 600; cursor: pointer;
							transition: all .15s; white-space: nowrap;
						}
						.wph-fbtn-save   { flex: 2; background: #c2410c; color: #fff; }
						.wph-fbtn-save:hover   { background: #ea580c; box-shadow: 0 2px 12px #e6510044; }
						.wph-fbtn-tab    { flex: 1; background: #1e1b4b; color: #a5b4fc; border: 1px solid #312e81; }
						.wph-fbtn-tab:hover    { background: #2e27a0; color: #c7d2fe; }
						.wph-fbtn-cancel { flex: 1; background: #1a1a1a; color: #777; border: 1px solid #2a2a2a; }
						.wph-fbtn-cancel:hover { background: #222; color: #bbb; border-color: #444; }
						.wph-fbtn:disabled { opacity: .5; cursor: not-allowed; }
					`;
					document.head.appendChild(st);
				}

				const wrap = document.createElement("div");
				wrap.className = "wph-wrap";

				const previewBox = document.createElement("div");
				previewBox.className = "wph-pre";
				previewBox.innerHTML = '<div class="wph-loading"><div class="wph-spinner"></div><span>Building HTML…</span></div>';

				wrap.append(previewBox);
				container.append(wrap);

				self._build(opts, false).then(html => {
					const preview = html.slice(0, opts.previewLength) +
						(html.length > opts.previewLength ? "[truncated— download for full content]" : "");
					previewBox.textContent = preview;
					if (textarea) {
						textarea.value = JSON.stringify({
							meta: {
								timestamp: new Date().toISOString(),
								host: location.hostname,
								url: location.href,
								source: opts.source,
								lines: html.split("\n").length,
								sizeKB: parseFloat((new Blob([html]).size / 1024).toFixed(1)),
								options: opts
							},
							preview
						}, null, 2);
					}
				}).catch(err => {
					previewBox.innerHTML = "";
					previewBox.textContent = "⚠ Error: " + err.message;
					previewBox.style.color = "#f87171";
				});
			},
			async copyData(textarea) {
				const opts = this._getOpts();
				const html = await this._build(opts, true);
				return navigator.clipboard?.writeText(html);
			},

			openSettings() {
				/* moved to global Settings */
			},
		});

		registerPlugin({
			id: "env_config",
			label: "Env / Config",
			color: "#00897b",

			fetchData() {
				const result = {};

				const globalKeys = [
					"__NEXT_DATA__", "__NUXT__", "__nuxt__", "__REDUX_STATE__",
					"__INITIAL_STATE__", "__PRELOADED_STATE__", "__APP_STATE__",
					"__STORE__", "__CONFIG__", "__ENV__", "__APP_CONFIG__",
					"APP_CONFIG", "ENV", "__env__", "__appConfig",
					"nuxt", "_nuxt", "__vue_store__",
					"Shopify", "__SHOPIFY_ANALYTICS_PUSHED__",
					"wpApiSettings", "woocommerce_params",
					"__SENTRY_DSN__", "__SENTRY_RELEASE__",
					"ga_config", "_ga", "dataLayer",
					"turnstileConfig", "hcaptchaConfig",
					"__CF_chl_opt", "__CF_chl_f_tk"
				];

				globalKeys.forEach(key => {
					try {
						const val = window[key];
						if (val !== undefined && val !== null) {
							result[key] = typeof val === "object" ? val : String(val);
						}
					} catch (_) {}
				});

				["env", "config", "ENV", "CONFIG", "_config", "settings", "SETTINGS", "appConfig", "siteConfig"].forEach(k => {
					try {
						const v = window[k];
						if (v && typeof v === "object" && !Array.isArray(v)) result["window." + k] = v;
					} catch (_) {}
				});

				const metaSection = {};
				document.querySelectorAll("meta").forEach(m => {
					const name = m.getAttribute("name") || m.getAttribute("property") || m.getAttribute("http-equiv");
					const content = m.getAttribute("content");
					if (!name || !content) return;
					const lname = name.toLowerCase();
					if (lname.includes("key") || lname.includes("token") || lname.includes("api") ||
						lname.includes("env") || lname.includes("config") || lname.includes("version") ||
						lname.includes("build") || lname.includes("site") || lname.includes("app") ||
						lname.includes("analytics") || lname.startsWith("og:")) {
						metaSection[name] = content;
					}
				});
				if (Object.keys(metaSection).length) result["_meta_tags"] = metaSection;

				const scriptConfigs = [];
				document.querySelectorAll("script:not([src])").forEach((s, i) => {
					const txt = (s.textContent || "").trim();
					if (!txt) return;

					const patterns = [
						/(?:window\s*\.\s*[\w$]+\s*=\s*)(\{[\s\S]{10,2000}?\})\s*;/g,
						/(?:var|let|const)\s+(?:config|env|settings|CONFIG|ENV|APP_CONFIG)\s*=\s*(\{[\s\S]{10,2000}?\})\s*;/g
					];
					for (const pat of patterns) {
						pat.lastIndex = 0;
						let m;
						while ((m = pat.exec(txt)) !== null) {
							try {
								const parsed = JSON.parse(m[1]);
								scriptConfigs.push({
									scriptIndex: i,
									data: parsed
								});
							} catch (_) {}
						}
					}
				});
				if (scriptConfigs.length) result["_inline_script_configs"] = scriptConfigs;

				const dataAttrs = {};
				[document.documentElement, document.body].forEach(el => {
					if (!el) return;
					[...el.attributes].forEach(attr => {
						if (attr.name.startsWith("data-")) dataAttrs[attr.name] = attr.value;
					});
				});
				if (Object.keys(dataAttrs).length) result["_root_data_attrs"] = dataAttrs;

				const storageConfig = {};
				[localStorage, sessionStorage].forEach((store, idx) => {
					const label = idx === 0 ? "localStorage" : "sessionStorage";
					try {
						for (let i = 0; i < store.length; i++) {
							const k = store.key(i);
							if (!k) continue;
							const lk = k.toLowerCase();
							if (lk.includes("config") || lk.includes("env") || lk.includes("token") ||
								lk.includes("key") || lk.includes("api") || lk.includes("version") ||
								lk.includes("settings") || lk.includes("user") || lk.includes("auth")) {
								const v = store.getItem(k);
								try {
									storageConfig[label + "." + k] = JSON.parse(v);
								} catch (_) {
									storageConfig[label + "." + k] = v;
								}
							}
						}
					} catch (_) {}
				});
				if (Object.keys(storageConfig).length) result["_storage_config"] = storageConfig;

				const totalKeys = Object.keys(result).length;
				return JSON.stringify({
					_meta: {
						host: location.hostname,
						url: location.href,
						timestamp: new Date().toISOString(),
						totalSections: totalKeys
					},
					...result
				}, null, 2);
			},

			downloadAll() {
				const data = this.fetchData();
				const blob = new Blob([data], {
					type: "application/json"
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "env-config-" + location.hostname + "-" + Date.now() + ".json";
				document.body.appendChild(a);
				a.click();
				setTimeout(() => {
					URL.revokeObjectURL(url);
					a.remove();
				}, 1000);
				return "✓ Downloaded env/config data";
			},


			renderUI(container, makeBtn, textarea) {
				const resultBox = document.createElement("div");
				Object.assign(resultBox.style, {
					flex: "1",
					overflowY: "auto",
					fontFamily: "monospace",
					fontSize: "12px",
					background: "#0d1117",
					color: "#c9d1d9",
					padding: "10px",
					borderRadius: "6px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all"
				});
				const data = this.fetchData();
				resultBox.textContent = data;
				if (textarea) textarea.value = data;
				container.append(resultBox);
			},
		});

		registerPlugin({
			id: "response_headers",
			label: "Response Headers",
			color: "#00838f",

			fetchData() {
				if (!networkLog.length) return "No network requests captured yet.\n\nNote: Interceptor harus dimuat sebelum request dibuat.\nCoba refresh halaman dengan panel sudah terbuka.";
				const requests = networkLog.filter(r => r.responseHeaders && Object.keys(r.responseHeaders).length);
				if (!requests.length) return "No response headers captured yet.";
				const secH = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "x-xss-protection", "cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy"];
				let out = `=== RESPONSE HEADERS (${requests.length} requests) ===\n\n`;
				requests.forEach((req, i) => {
					const dur = req.responseTimestamp && req.timestamp ? ` ${req.responseTimestamp-req.timestamp}ms` : "";
					out += `${"─".repeat(60)}\n[${i+1}] ${req.method} ${req.responseStatus||"?"}${dur} · ${new Date(req.timestamp).toLocaleTimeString()}\nURL: ${req.url}\n\n`;
					const keys = Object.keys(req.responseHeaders).sort();
					const present = secH.filter(h => req.responseHeaders[h]);
					const missing = secH.filter(h => !req.responseHeaders[h]);
					out += `Headers (${keys.length}):\n`;
					keys.forEach(k => out += `  ${k}: ${req.responseHeaders[k]}\n`);
					out += `\nSecurity Check:\n  Present (${present.length}): ${present.length ? present.join(", ") : "none"}\n  Missing (${missing.length}): ${missing.length ? missing.join(", ") : "none"}\n\n`;
				});
				out += `${"─".repeat(60)}`;
				return out.trim();
			},

			async downloadAll() {
				const requests = networkLog.filter(r => r.responseHeaders && Object.keys(r.responseHeaders).length);
				if (!requests.length) {
					alert("No response headers to download.");
					return;
				}
				if (!confirm(`Export response headers from ${requests.length} request${requests.length===1?"":"s"}?`)) return;
				const exportData = {
					exportedAt: new Date().toISOString(),
					panelVersion: VERSION,
					host: location.hostname,
					totalRequests: requests.length,
					requests: requests.map((req, i) => ({
						index: i + 1,
						method: req.method,
						url: req.url,
						status: req.responseStatus || null,
						statusText: req.responseStatusText || null,
						time: new Date(req.timestamp).toLocaleString(),
						timestamp: req.timestamp,
						duration: req.responseTimestamp && req.timestamp ? req.responseTimestamp - req.timestamp : null,
						responseHeaders: req.responseHeaders
					}))
				};
				try {
					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: "application/json"
					});
					const url = URL.createObjectURL(blob);
					const win = window.open(url, "_blank");
					if (!win) {
						alert("Popup blocked by browser");
						return;
					}
					setTimeout(() => URL.revokeObjectURL(url), 10000);
					return `Opened JSON export (${requests.length} requests)`;
				} catch (e) {
					alert("Export failed: " + e.message);
					return "Export failed";
				}
			},


			renderUI(container, makeBtn, textarea) {
				const resultBox = document.createElement("div");
				Object.assign(resultBox.style, {
					flex: "1",
					overflowY: "auto",
					fontFamily: "monospace",
					fontSize: "12px",
					background: "#0d1117",
					color: "#c9d1d9",
					padding: "10px",
					borderRadius: "6px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all"
				});
				const data = this.fetchData();
				resultBox.textContent = data;
				if (textarea) textarea.value = data;
				container.append(resultBox);
			},
		});

		const elementPicker = (function() {
			const _KEY_PROPS = [
				'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
				'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
				'padding', 'margin', 'gap', 'box-sizing',
				'overflow', 'overflow-x', 'overflow-y',
				'border', 'border-radius',
				'outline',
				'flex', 'flex-direction', 'flex-wrap',
				'align-items', 'align-self', 'align-content',
				'justify-content', 'justify-self',
				'grid-template-columns', 'grid-template-rows',
				'grid-column', 'grid-row', 'place-items', 'place-content',
				'background', 'background-color', 'background-image', 'background-size', 'background-position',
				'color', 'opacity', 'visibility',
				'box-shadow', 'filter', 'backdrop-filter',
				'transform', 'transition', 'animation',
				'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
				'text-align', 'text-decoration', 'text-transform', 'text-overflow',
				'letter-spacing', 'word-spacing', 'white-space', 'vertical-align',
				'aspect-ratio', 'object-fit', 'object-position',
				'cursor', 'pointer-events', 'user-select',
				'clip-path', 'scroll-behavior', 'content'
			];

			let _active = false;
			let _highlight = null;
			let _listenerReady = false;
			let _defaultStyleCache = null;
			let _panelTextarea = null;
			let _outputEl = null;

			function _updateOutput(text) {
				if (_outputEl) _outputEl.textContent = text;
				if (_panelTextarea) _panelTextarea.value = text;
			}

			const settings = {
				outputFormat: 'html',
				autoCopy: false,
				showCssVars: true,
				showInfo: true,
			};

			function _getDefaultStyles() {
				if (_defaultStyleCache) return _defaultStyleCache;
				const dummy = document.createElement('div');
				dummy.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
				document.body.appendChild(dummy);
				const cs = window.getComputedStyle(dummy);
				const cache = {};
				for (const prop of _KEY_PROPS) cache[prop] = cs.getPropertyValue(prop).trim();
				document.body.removeChild(dummy);
				_defaultStyleCache = cache;
				return cache;
			}

			function _isMeaningful(prop, val, defaults) {
				const v = val.trim();
				if (!v) return false;
				if (v === (defaults[prop] || '').trim()) return false;
				if (/^(none|normal|auto|initial|0px|0|unset|inherit)$/.test(v)) return false;
				if (v === 'rgba(0, 0, 0, 0)' || v === 'transparent') return false;
				if (['border-top', 'border-right', 'border-bottom', 'border-left'].includes(prop)) return false;
				if (['flex-grow', 'flex-shrink', 'flex-basis'].includes(prop)) return false;
				if (['grid-column', 'grid-row'].includes(prop) && /^auto/.test(v)) return false;
				if (['place-items', 'place-content', 'align-items', 'align-content', 'align-self', 'justify-content', 'justify-self'].includes(prop) && v === 'normal') return false;
				if (prop === 'transform-origin') return false;
				if ((prop === 'transition' || prop === 'animation') && v.startsWith('all 0s')) return false;
				if (prop === 'object-position' && v === '50% 50%') return false;
				if (prop === 'outline' && v.includes('none') && v.includes('0px')) return false;
				if (['background-image', 'background-position', 'background-size', 'background-color'].includes(prop)) return false;
				if (prop === 'text-decoration' && v.includes('none')) return false;
				return true;
			}

			async function _copyText(text) {
				try {
					await navigator.clipboard.writeText(text);
					return true;
				} catch (_) {
					const blob = new Blob([text], {
						type: 'text/plain'
					});
					const url = URL.createObjectURL(blob);
					const win = window.open(url, '_blank');
					if (!win) return false;
					setTimeout(() => URL.revokeObjectURL(url), 10000);
					return false;
				}
			}

			function _getSelector(el) {
				const tag = el.tagName.toLowerCase();
				const id = el.id ? `#${el.id}` : '';
				const cls = el.className && typeof el.className === 'string' ?
					el.className.trim().split(/\s+/).slice(0, 5).map(c => '.' + c.replace(/([:\[\]\/\\!])/g, '\\$1')).join('') : '';
				return `<${tag}${id}${cls}>`;
			}

			function _getCSSVars(styles) {
				const vars = {};
				for (const prop of styles) {
					if (prop.startsWith('--')) {
						const val = styles.getPropertyValue(prop).trim();
						if (val) vars[prop] = val;
					}
				}
				return vars;
			}

			function _getComputedCSS(el) {
				const s = window.getComputedStyle(el);
				let css = '';
				for (let i = 0; i < s.length; i++) {
					const p = s[i];
					const v = s.getPropertyValue(p);
					if (v) css += `${p}:${v};`;
				}
				return css;
			}

			function _buildInlined(el) {
				const clone = el.cloneNode(true);
				const origKids = Array.from(el.querySelectorAll('*'));
				const cloneKids = Array.from(clone.querySelectorAll('*'));
				clone.setAttribute('style', _getComputedCSS(el));
				origKids.forEach((orig, i) => {
					if (cloneKids[i]) cloneKids[i].setAttribute('style', _getComputedCSS(orig));
				});
				return clone.outerHTML;
			}

			function _buildOutput(el) {
				const computed = window.getComputedStyle(el);
				const defaults = _getDefaultStyles();
				const cssVars = _getCSSVars(computed);
				const rect = el.getBoundingClientRect();
				let out = '';
				if (settings.showInfo) {
					out += `Selector : ${_getSelector(el)}\n`;
					out += `Size     : ${Math.round(rect.width)}×${Math.round(rect.height)}px\n`;
					out += `Children : ${el.querySelectorAll('*').length}\n\n`;
				}
				if (settings.outputFormat === 'html') {
					out += _buildInlined(el);
				} else if (settings.outputFormat === 'css_keys') {
					_KEY_PROPS.forEach(prop => {
						const val = computed.getPropertyValue(prop);
						if (_isMeaningful(prop, val, defaults)) out += `${prop}: ${val.trim()};\n`;
					});
					if (settings.showCssVars && Object.keys(cssVars).length) {
						out += '\n/* CSS Variables */\n';
						Object.entries(cssVars).forEach(([p, v]) => out += `${p}: ${v};\n`);
					}
				} else {
					for (let i = 0; i < computed.length; i++) {
						const prop = computed[i];
						const val = computed.getPropertyValue(prop);
						if (val) out += `${prop}: ${val.trim()};\n`;
					}
					if (settings.showCssVars && Object.keys(cssVars).length) {
						out += '\n/* CSS Variables */\n';
						Object.entries(cssVars).forEach(([p, v]) => out += `${p}: ${v};\n`);
					}
				}
				return out;
			}

			function _showHighlight(el) {
				if (!_highlight) {
					_highlight = document.createElement('div');
					Object.assign(_highlight.style, {
						position: 'fixed',
						pointerEvents: 'none',
						zIndex: '2147483646',
						border: '2px solid #7b1fa2',
						background: 'rgba(123,31,162,0.12)',
						boxSizing: 'border-box',
						transition: 'top 0.12s ease-out, left 0.12s ease-out, width 0.12s ease-out, height 0.12s ease-out',
						willChange: 'top, left, width, height',
						borderRadius: '3px',
						boxShadow: '0 0 0 1px rgba(123,31,162,0.3), inset 0 0 8px rgba(123,31,162,0.1)',
						display: 'none'
					});
					document.body.appendChild(_highlight);
				}
				if (el.closest && el.closest('#' + PANEL_ID)) return;
				if (el.id === PANEL_ID) return;
				const r = el.getBoundingClientRect();
				_highlight.style.top = r.top + 'px';
				_highlight.style.left = r.left + 'px';
				_highlight.style.width = r.width + 'px';
				_highlight.style.height = r.height + 'px';
				_highlight.style.display = 'block';
			}

			function _hideHighlight() {
				if (_highlight) _highlight.style.display = 'none';
			}

			async function _loadSettings() {
				try {
					const result = await new Promise(resolve =>
						chrome.storage.local.get('wp_picker_settings', resolve)
					);
					if (result && result.wp_picker_settings) Object.assign(settings, result.wp_picker_settings);
				} catch (_) {}
			}

			async function _saveSettings() {
				try {
					await new Promise(resolve =>
						chrome.storage.local.set({
							wp_picker_settings: {
								...settings
							}
						}, resolve)
					);
				} catch (_) {}
			}

			_loadSettings();

			function _installListeners() {
				if (_listenerReady) return;
				_listenerReady = true;

				document.addEventListener('mouseover', function(e) {
					if (!_active) return;
					if (e.target.closest && e.target.closest('#' + PANEL_ID)) return;
					_showHighlight(e.target);
					_updateOutput(_buildOutput(e.target));
				}, true);

				document.addEventListener('touchmove', function(e) {
					if (!_active || e.touches.length !== 1) return;
					const touch = e.touches[0];
					const el = document.elementFromPoint(touch.clientX, touch.clientY);
					if (!el) return;
					_showHighlight(el);
					_updateOutput(_buildOutput(el));
				}, {
					passive: true,
					capture: true
				});

				document.addEventListener('touchend', function(e) {
					if (!_active || e.changedTouches.length !== 1) return;
					const touch = e.changedTouches[0];
					if (panel) {
						const r = panel.getBoundingClientRect();
						if (touch.clientX >= r.left && touch.clientX <= r.right && touch.clientY >= r.top && touch.clientY <= r.bottom) return;
					}
					const el = document.elementFromPoint(touch.clientX, touch.clientY);
					if (!el) return;
					e.preventDefault();
					_showHighlight(el);
					_updateOutput(_buildOutput(el));
				}, {
					capture: true
				});

				document.addEventListener('click', function(e) {
					if (!_active) return;
					if (panel) {
						const r = panel.getBoundingClientRect();
						if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
					}
					e.preventDefault();
					e.stopPropagation();
					if (settings.autoCopy && _outputEl) _copyText(_outputEl.textContent);
					else if (settings.autoCopy && _panelTextarea) _copyText(_panelTextarea.value);
				}, true);
			}

			return {
				settings,
				activate(textarea, onActivate) {
					_panelTextarea = textarea;
					_outputEl = null;
					_installListeners();
					_active = true;
					if (onActivate) onActivate();
					const msg = '◉ Element Picker active\n\nHover any element to inspect.\nOutput updates live as you move.\nClick to auto-copy (if enabled in Settings).';
					_updateOutput(msg);
				},
				setOutputEl(el) {
					_outputEl = el;
				},
				deactivate() {
					_active = false;
					_outputEl = null;
					_hideHighlight();
				},
				isActive() {
					return _active;
				},
				copyOutput() {
					if (_outputEl && _outputEl.textContent) return _copyText(_outputEl.textContent);
					if (_panelTextarea && _panelTextarea.value) return _copyText(_panelTextarea.value);
				},
				saveSettings: _saveSettings,
				reloadSettings: _loadSettings,
			};
		})();



		function makeBtn(label, bg) {
			const b = document.createElement("button");
			b.textContent = label;
			Object.assign(b.style, {
				flex: "1",
				padding: "8px",
				border: "none",
				cursor: "pointer",
				background: bg || "#444",
				color: "#fff",
				borderRadius: "6px",
				fontFamily: "monospace",
				fontSize: "11px",
				transition: "all 0.2s"
			});
			return b;
		}

		const SNAP_THRESHOLD = 100;
		const FULLSCREEN_RATIO = 0.82;
		let isFullscreen = false,
			savedRect = null;

		const panel = document.createElement("div");
		panel.id = PANEL_ID;
		Object.assign(panel.style, {
			position: "fixed",
			top: "100px",
			left: "50px",
			width: "450px",
			height: "400px",
			minWidth: "280px",
			minHeight: "200px",
			background: "#1e1e1e",
			color: "#fff",
			border: "1px solid #555",
			borderRadius: "12px",
			zIndex: "999999999",
			fontFamily: "monospace",
			boxShadow: "0 5px 20px rgba(0,0,0,0.5)",
			display: "flex",
			flexDirection: "column",
			transition: "none",
			boxSizing: "border-box"
		});

		function enterFullscreen() {
			if (isFullscreen) return;
			isFullscreen = true;
			savedRect = {
				left: panel.style.left,
				top: panel.style.top,
				width: panel.style.width,
				height: panel.style.height
			};
			Object.assign(panel.style, {
				left: "0",
				top: "0",
				width: "100vw",
				height: "100vh",
				borderRadius: "0",
				transition: "none"
			});
			fsBtn.textContent = "⊡";
			fsBtn.title = "Exit Fullscreen";
		}

		function exitFullscreen() {
			if (!isFullscreen) return;
			isFullscreen = false;
			if (savedRect) Object.assign(panel.style, savedRect);
			panel.style.borderRadius = "12px";
			fsBtn.textContent = "⛶";
			fsBtn.title = "Fullscreen";
		}

		const header = document.createElement("div");
		header.textContent = `Web Panel v${VERSION}`;
		Object.assign(header.style, {
			padding: "10px",
			cursor: "move",
			background: "#2a2a2a",
			fontWeight: "bold",
			touchAction: "none",
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			borderRadius: "12px 12px 0 0",
			userSelect: "none"
		});

		const headerBtns = document.createElement("div");
		Object.assign(headerBtns.style, {
			display: "flex",
			gap: "4px",
			alignItems: "center",
			flexShrink: "0"
		});

		const fsBtn = document.createElement("span");
		fsBtn.textContent = "⛶";
		fsBtn.title = "Fullscreen";
		Object.assign(fsBtn.style, {
			cursor: "pointer",
			fontSize: "15px",
			padding: "0 4px",
			opacity: "0.7"
		});
		fsBtn.onmouseover = () => fsBtn.style.opacity = "1";
		fsBtn.onmouseout = () => fsBtn.style.opacity = "0.7";
		fsBtn.onclick = e => {
			e.stopPropagation();
			isFullscreen ? exitFullscreen() : enterFullscreen();
		};

		const minimizeBtn = document.createElement("span");
		minimizeBtn.textContent = "−";
		Object.assign(minimizeBtn.style, {
			cursor: "pointer",
			fontSize: "18px",
			padding: "0 5px",
			flexShrink: "0"
		});

		headerBtns.append(fsBtn, minimizeBtn);
		header.appendChild(headerBtns);

		const resizeHandle = document.createElement("div");
		Object.assign(resizeHandle.style, {
			position: "absolute",
			bottom: "0",
			right: "0",
			width: "22px",
			height: "22px",
			cursor: "nwse-resize",
			zIndex: "2147483647",
			background: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.18) 40%)",
			borderBottomRightRadius: "12px",
			pointerEvents: "all"
		});
		panel.appendChild(resizeHandle);

		const content = document.createElement("div");
		Object.assign(content.style, {
			flex: "1",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden"
		});

		const textarea = document.createElement("textarea");

		const wallpaperArea = document.createElement("div");
		Object.assign(wallpaperArea.style, {
			flex: "1",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
			position: "relative",
			background: "#111"
		});

		const wallpaperImg = document.createElement("img");
		Object.assign(wallpaperImg.style, {
			width: "100%",
			height: "100%",
			objectFit: "cover",
			objectPosition: "center",
			display: "none",
			position: "absolute",
			inset: "0"
		});

		const wallpaperOverlay = document.createElement("div");
		Object.assign(wallpaperOverlay.style, {
			position: "absolute",
			inset: "0",
			background: "rgba(0,0,0,0.35)",
			display: "none"
		});

		const wallpaperLabel = document.createElement("div");
		wallpaperLabel.textContent = "Welcome To Web Panel by Hann Universe\nSelect a data source below:";
		Object.assign(wallpaperLabel.style, {
			color: "#aaa",
			fontSize: "12px",
			fontFamily: "monospace",
			textAlign: "center",
			whiteSpace: "pre-line",
			zIndex: "1",
			padding: "20px",
			textShadow: "0 1px 4px #000"
		});

		wallpaperArea.append(wallpaperImg, wallpaperOverlay, wallpaperLabel);

		(async function loadWallpaper() {
			try {
				const url = chrome.runtime.getURL("config.image.json");
				const res = await fetch(url);
				if (!res.ok) return;
				const cfg = await res.json();
				if (cfg && cfg.wallpaper && cfg.wallpaper.startsWith("data:image/")) {
					wallpaperImg.src = cfg.wallpaper;
					wallpaperImg.style.display = "block";
					wallpaperOverlay.style.display = "block";
					if (cfg.overlay_opacity !== undefined) {
						wallpaperOverlay.style.background = `rgba(0,0,0,${cfg.overlay_opacity})`;
					}
					if (cfg.label_color) {
						wallpaperLabel.style.color = cfg.label_color;
					}
					if (cfg.show_label === false) {
						wallpaperLabel.style.display = "none";
					}
				}
			} catch (_) {}
		})();

		textarea.placeholder = "Welcome To Web Panel by Hann Universe\n\nSelect a data source below:";
		Object.assign(textarea.style, {
			flex: "1",
			background: "#111",
			color: "#0f0",
			border: "none",
			padding: "10px",
			resize: "none",
			fontSize: "12px",
			fontFamily: "monospace",
			display: "none",
			outline: "none"
		});

		const searchContainer = document.createElement("div");
		Object.assign(searchContainer.style, {
			display: "none",
			flexDirection: "column",
			flex: "1",
			overflow: "hidden"
		});

		const searchInputRow = document.createElement("div");
		Object.assign(searchInputRow.style, {
			display: "flex",
			gap: "5px",
			padding: "8px",
			background: "#252525",
			borderBottom: "1px solid #444"
		});

		const searchInput = document.createElement("input");
		searchInput.type = "text";
		searchInput.placeholder = "Search...";
		Object.assign(searchInput.style, {
			flex: "1",
			padding: "8px",
			background: "#111",
			color: "#fff",
			border: "1px solid #444",
			borderRadius: "4px",
			fontFamily: "monospace",
			fontSize: "12px",
			outline: "none"
		});

		const searchExecBtn = makeBtn("Search", "#1565c0");
		searchExecBtn.style.flex = "0 0 60px";
		const caseSensitiveBtn = makeBtn("Aa", "#444");
		caseSensitiveBtn.style.flex = "0 0 35px";
		caseSensitiveBtn.title = "Case sensitive";
		let caseSensitive = false;
		const regexBtn = makeBtn(".*", "#444");
		regexBtn.style.flex = "0 0 35px";
		regexBtn.title = "Use regex";
		let useRegex = false;
		searchInputRow.append(searchInput, searchExecBtn, caseSensitiveBtn, regexBtn);

		const searchResults = document.createElement("div");
		Object.assign(searchResults.style, {
			flex: "1",
			overflow: "auto",
			background: "#111",
			padding: "5px",
			fontSize: "11px"
		});

		const searchStatus = document.createElement("div");
		Object.assign(searchStatus.style, {
			padding: "5px 10px",
			background: "#1e1e1e",
			borderTop: "1px solid #444",
			fontSize: "11px",
			color: "#888"
		});
		searchStatus.textContent = "Ready to search";

		searchContainer.append(searchInputRow, searchResults, searchStatus);
		const renderUIContainer = document.createElement("div");
		Object.assign(renderUIContainer.style, {
			flex: "1",
			display: "none",
			flexDirection: "column",
			overflow: "hidden",
			minHeight: "0"
		});
		content.append(wallpaperArea, textarea, searchContainer, renderUIContainer);

		const mainBtnRow = document.createElement("div");
		Object.assign(mainBtnRow.style, {
			display: "flex",
			gap: "4px",
			padding: "4px",
			background: "#1e1e1e",
			flexWrap: "wrap"
		});
		const actionBtnRow = document.createElement("div");
		Object.assign(actionBtnRow.style, {
			display: "none",
			gap: "4px",
			padding: "4px",
			background: "#1e1e1e"
		});
		const searchBtnRow = document.createElement("div");
		Object.assign(searchBtnRow.style, {
			display: "none",
			gap: "4px",
			padding: "4px",
			background: "#1e1e1e"
		});
		const pickerBtnRow = document.createElement("div");
		Object.assign(pickerBtnRow.style, {
			display: "none",
			gap: "4px",
			padding: "4px",
			background: "#1e1e1e"
		});

		const btnSearchBack = makeBtn("Back", "#444");
		const btnClearSearch = makeBtn("Clear", "#444");
		const btnCopySearch = makeBtn("Copy Results", "#444");
		searchBtnRow.append(btnSearchBack, btnClearSearch, btnCopySearch);

		let currentPlugin = null;

		function showMainButtons() {
			mainBtnRow.style.display = "flex";
			actionBtnRow.style.display = "none";
			searchBtnRow.style.display = "none";
			pickerBtnRow.style.display = "none";
			textarea.style.display = "none";
			renderUIContainer.style.display = "none";
			renderUIContainer.innerHTML = "";
			searchContainer.style.display = "none";
			wallpaperArea.style.display = "flex";
			textarea.value = "";
			currentPlugin = null;
			elementPicker.deactivate();
		}

		function showPickerMode() {
			mainBtnRow.style.display = "none";
			actionBtnRow.style.display = "none";
			searchBtnRow.style.display = "none";
			pickerBtnRow.style.display = "flex";
			searchContainer.style.display = "none";
			wallpaperArea.style.display = "none";
			renderUIContainer.style.display = "flex";
			renderUIContainer.innerHTML = "";
			textarea.style.display = "none";

			const resultBox = document.createElement("div");
			Object.assign(resultBox.style, {
				flex: "1",
				overflowY: "auto",
				fontFamily: "monospace",
				fontSize: "12px",
				background: "#0d1117",
				color: "#c9d1d9",
				padding: "10px",
				borderRadius: "6px",
				whiteSpace: "pre-wrap",
				wordBreak: "break-all"
			});
			resultBox.textContent = "◉ Element Picker active\n\nHover any element to inspect.\nOutput updates live as you move.\nClick to auto-copy (if enabled in Settings).";
			renderUIContainer.appendChild(resultBox);

			renderUIContainer._pickerOutput = resultBox;
			elementPicker.setOutputEl(resultBox);
		}

		function updateActionButtonsForPlugin(plugin) {
			while (actionBtnRow.firstChild) actionBtnRow.removeChild(actionBtnRow.firstChild);
			const bBack = makeBtn("Back", "#444");
			const bRefresh = makeBtn("Refresh", "#444");
			const bCopy = makeBtn("Copy", "#444");
			bBack.onclick = showMainButtons;
			bRefresh.onclick = async () => {
				if (currentPlugin) {
					if (currentPlugin.renderUI) {
						renderUIContainer.innerHTML = "";
						currentPlugin.renderUI(renderUIContainer, makeBtn, textarea);

						if (currentPlugin.fetchData) {
							const out = renderUIContainer._htmlOutput;
							if (out) {
								out.textContent = "Building...";
								try {
									const r = currentPlugin.fetchData();
									out.textContent = r instanceof Promise ? await r : r;
								} catch (e) {
									out.textContent = "Error: " + e.message;
								}
							}
						}
					} else {
						textarea.value = "Loading...";
						try {
							const r = currentPlugin.fetchData();
							textarea.value = r instanceof Promise ? await r : r;
						} catch (e) {
							textarea.value = "Error: " + e.message;
						}
					}
				}
				bRefresh.textContent = "Refreshed ✓";
				setTimeout(() => bRefresh.textContent = "Refresh", 1000);
			};
			bCopy.onclick = async () => {
				if (plugin.copyData) {
					bCopy.textContent = "Copying...";
					await plugin.copyData(textarea);
				} else {
					await navigator.clipboard.writeText(textarea.value);
				}
				bCopy.textContent = "Copied ✓";
				setTimeout(() => bCopy.textContent = "Copy", 1000);
			};
			actionBtnRow.append(bBack, bRefresh, bCopy);
			if (plugin.downloadAll) {
				const bDl = makeBtn("Download", "#2e7d32");
				bDl.onclick = async () => {
					const result = await plugin.downloadAll();
					if (result && currentPlugin?.id === plugin.id) textarea.value += "\n\n" + result;
					bDl.textContent = "Done";
					setTimeout(() => bDl.textContent = "Download", 2000);
				};
				actionBtnRow.appendChild(bDl);
			}

		}

		function showActionButtons() {
			mainBtnRow.style.display = "none";
			actionBtnRow.style.display = "flex";
			searchBtnRow.style.display = "none";
			searchContainer.style.display = "none";
			wallpaperArea.style.display = "none";

			if (currentPlugin && currentPlugin.renderUI) {
				textarea.style.display = "none";
				renderUIContainer.innerHTML = "";
				renderUIContainer.style.display = "flex";
				currentPlugin.renderUI(renderUIContainer, makeBtn, textarea);
			} else {
				renderUIContainer.style.display = "none";
				textarea.style.display = "block";
			}

			if (currentPlugin) updateActionButtonsForPlugin(currentPlugin);
		}

		function showGlobalSearchMode() {
			mainBtnRow.style.display = "none";
			actionBtnRow.style.display = "none";
			searchBtnRow.style.display = "flex";
			pickerBtnRow.style.display = "none";
			textarea.style.display = "none";
			searchContainer.style.display = "flex";
			wallpaperArea.style.display = "none";
			searchResults.style.display = "block";
			currentPlugin = null;
			searchStatus.textContent = "Ready to search";
			searchInput.focus();
		}

		function openSettingsPanel() {
			const existing = panel.querySelector('[data-wp-settings]');
			if (existing) {
				existing.remove();
				return;
			}

			const settingsDiv = document.createElement('div');
			settingsDiv.setAttribute('data-wp-settings', '1');
			Object.assign(settingsDiv.style, {
				position: 'absolute',
				inset: '0',
				background: '#1e1e1e',
				zIndex: '9999',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'monospace',
				fontSize: '12px',
				overflow: 'hidden',
				borderRadius: '12px'
			});

			const sh = document.createElement('div');
			Object.assign(sh.style, {
				padding: '10px 12px',
				background: '#2a2a2a',
				fontWeight: 'bold',
				borderBottom: '1px solid #444',
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				flexShrink: '0'
			});
			const shTitle = document.createElement('span');
			shTitle.textContent = '⚙ Settings';
			const shClose = document.createElement('span');
			shClose.textContent = '✕';
			Object.assign(shClose.style, {
				cursor: 'pointer',
				color: '#888',
				padding: '2px 6px',
				borderRadius: '3px'
			});
			shClose.onmouseover = () => shClose.style.color = '#fff';
			shClose.onmouseout = () => shClose.style.color = '#888';
			shClose.onclick = () => settingsDiv.remove();
			sh.append(shTitle, shClose);

			const sb = document.createElement('div');
			Object.assign(sb.style, {
				flex: '1',
				overflowY: 'auto',
				padding: '12px'
			});

			function mkLabel(text) {
				const el = document.createElement('div');
				el.textContent = text;
				Object.assign(el.style, {
					color: '#888',
					fontSize: '10px',
					marginBottom: '4px',
					marginTop: '12px',
					textTransform: 'uppercase',
					letterSpacing: '0.5px'
				});
				return el;
			}

			function mkToggle(label, key, onChange, getVal, setVal) {
				const row = document.createElement('div');
				Object.assign(row.style, {
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '6px 0',
					borderBottom: '1px solid #2a2a2a'
				});
				const lbl = document.createElement('span');
				lbl.textContent = label;
				Object.assign(lbl.style, {
					color: '#ccc'
				});
				const tog = document.createElement('span');
				const update = () => {
					tog.textContent = getVal() ? 'ON' : 'OFF';
					tog.style.background = getVal() ? '#2e7d32' : '#444';
					tog.style.color = '#fff';
				};
				Object.assign(tog.style, {
					cursor: 'pointer',
					padding: '3px 10px',
					borderRadius: '10px',
					fontSize: '10px',
					fontWeight: 'bold'
				});
				update();
				tog.onclick = () => {
					setVal(!getVal());
					update();
					if (onChange) onChange(getVal());
				};
				row.append(lbl, tog);
				return row;
			}

			function mkSelect(label, key, options, getVal, setVal) {
				const row = document.createElement('div');
				Object.assign(row.style, {
					padding: '6px 0',
					borderBottom: '1px solid #2a2a2a'
				});
				const topRow = document.createElement('div');
				Object.assign(topRow.style, {
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '4px'
				});
				const lbl = document.createElement('span');
				lbl.textContent = label;
				Object.assign(lbl.style, {
					color: '#ccc'
				});
				topRow.appendChild(lbl);
				const btnRow = document.createElement('div');
				Object.assign(btnRow.style, {
					display: 'flex',
					gap: '3px',
					flexWrap: 'wrap'
				});
				options.forEach(opt => {
					const b = document.createElement('button');
					b.textContent = opt.label;
					const updateActive = () => {
						b.style.background = getVal() === opt.value ? '#7b1fa2' : '#333';
						b.style.color = getVal() === opt.value ? '#fff' : '#aaa';
						b.style.border = `1px solid ${getVal() === opt.value ? '#7b1fa2' : '#444'}`;
					};
					Object.assign(b.style, {
						padding: '3px 8px',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
						fontSize: '10px',
						fontFamily: 'monospace'
					});
					updateActive();
					b.onclick = () => {
						setVal(opt.value);
						btnRow.querySelectorAll('button').forEach(x => {
							const o = options.find(oo => oo.label === x.textContent);
							if (o) {
								x.style.background = getVal() === o.value ? '#7b1fa2' : '#333';
								x.style.color = getVal() === o.value ? '#fff' : '#aaa';
								x.style.border = `1px solid ${getVal() === o.value ? '#7b1fa2' : '#444'}`;
							}
						});
						if (opt.onChange) opt.onChange(opt.value);
					};
					btnRow.appendChild(b);
				});
				row.append(topRow, btnRow);
				return row;
			}

			sb.appendChild(mkLabel('Element Picker'));
			const pickerS = elementPicker.settings;
			sb.appendChild(mkSelect('Output Format', 'outputFormat', [{
					label: 'HTML Inlined',
					value: 'html'
				},
				{
					label: 'CSS Key Props',
					value: 'css_keys'
				},
				{
					label: 'CSS Full',
					value: 'css_full'
				},
			], () => pickerS.outputFormat, (v) => {
				pickerS.outputFormat = v;
				elementPicker.saveSettings();
			}));
			sb.appendChild(mkToggle('Show selector & dimensions', 'showInfo', null, () => pickerS.showInfo, (v) => {
				pickerS.showInfo = v;
				elementPicker.saveSettings();
			}));
			sb.appendChild(mkToggle('Show CSS Variables', 'showCssVars', null, () => pickerS.showCssVars, (v) => {
				pickerS.showCssVars = v;
				elementPicker.saveSettings();
			}));
			sb.appendChild(mkToggle('Auto-copy on click', 'autoCopy', null, () => pickerS.autoCopy, (v) => {
				pickerS.autoCopy = v;
				elementPicker.saveSettings();
			}));

			sb.appendChild(mkLabel('Turnstile Hook'));
			const turnstilePlugin = registry.find(p => p.id === 'sitekey');
			if (turnstilePlugin) {
				sb.appendChild(mkToggle('Auto-download sitekey on capture', 'autoDownload', null,
					() => turnstilePlugin._getAutoDownloadPref(),
					(v) => turnstilePlugin._setAutoDownloadPref(v)
				));
			}

			sb.appendChild(mkLabel('Network Monitor'));
			const netPlugin = registry.find(p => p.id === 'network');
			if (netPlugin) {
				const SETTINGS_KEY = "wp_network_settings";
				let netSettings = {
					requestTypes: {}
				};
				try {
					const r = localStorage.getItem(SETTINGS_KEY);
					if (r) netSettings = JSON.parse(r);
				} catch (_) {}
				const typeFields = [{
						key: "fetchxhr",
						label: "XHR / Fetch"
					},
					{
						key: "websocket",
						label: "WebSocket"
					},
					{
						key: "sse",
						label: "SSE"
					},
					{
						key: "beacon",
						label: "Beacon"
					},
					{
						key: "webrtc",
						label: "WebRTC"
					},
					{
						key: "storage",
						label: "Storage"
					},
					{
						key: "navigation",
						label: "Navigation"
					},
					{
						key: "resources",
						label: "Resources"
					},
					{
						key: "performance",
						label: "Performance"
					},
					{
						key: "other",
						label: "Other"
					},
				];
				typeFields.forEach(tf => {
					sb.appendChild(mkToggle(tf.label, tf.key, null,
						() => netSettings.requestTypes?.[tf.key] !== false,
						(v) => {
							if (!netSettings.requestTypes) netSettings.requestTypes = {};
							netSettings.requestTypes[tf.key] = v;
							localStorage.setItem(SETTINGS_KEY, JSON.stringify(netSettings));
						}
					));
				});
			}

			sb.appendChild(mkLabel('Console Log'));
			const consolePlugin = registry.find(p => p.id === 'console');
			if (consolePlugin) {
				const cs = consolePlugin._getSettings();
				const levelFields = [{
						key: "log",
						label: "Log"
					},
					{
						key: "warn",
						label: "Warn"
					},
					{
						key: "error",
						label: "Error"
					},
					{
						key: "uncaught_error",
						label: "Uncaught Error"
					},
					{
						key: "unhandled_rejection",
						label: "Unhandled Rejection"
					},
					{
						key: "resource_error",
						label: "Resource Error"
					},
					{
						key: "info",
						label: "Info"
					},
					{
						key: "debug",
						label: "Debug"
					},
					{
						key: "assert",
						label: "Assert"
					},
					{
						key: "trace",
						label: "Trace"
					},
					{
						key: "table",
						label: "Table"
					},
					{
						key: "dir",
						label: "Dir"
					},
					{
						key: "group",
						label: "Group"
					},
					{
						key: "other",
						label: "Other"
					},
				];
				levelFields.forEach(lf => {
					sb.appendChild(mkToggle(lf.label, lf.key, null,
						() => cs.levels[lf.key] !== false,
						(v) => {
							cs.levels[lf.key] = v;
							consolePlugin._saveSettings(cs);
						}
					));
				});
				sb.appendChild(mkToggle('Show location', 'showLocation', null, () => cs.showLocation, (v) => {
					cs.showLocation = v;
					consolePlugin._saveSettings(cs);
				}));
				sb.appendChild(mkToggle('Show stack trace', 'showStack', null, () => cs.showStack, (v) => {
					cs.showStack = v;
					consolePlugin._saveSettings(cs);
				}));
			}

			sb.appendChild(mkLabel('Get HTML'));
			const htmlPlugin = registry.find(p => p.id === 'rendered_html');
			if (htmlPlugin) {
				const ho = htmlPlugin._getOpts();
				sb.appendChild(mkSelect('Source', 'source', [{
						label: 'Live',
						value: 'live'
					},
					{
						label: 'outerHTML',
						value: 'outerHTML'
					},
					{
						label: 'innerHTML',
						value: 'innerHTML'
					},
					{
						label: 'XMLSerializer',
						value: 'serializer'
					},
				], () => ho.source, (v) => {
					ho.source = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Inline Scripts', 'inlineScripts', null, () => ho.inlineScripts, (v) => {
					ho.inlineScripts = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Inline CSS', 'inlineCSS', null, () => ho.inlineCSS, (v) => {
					ho.inlineCSS = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Inline Images', 'inlineImages', null, () => ho.inlineImages, (v) => {
					ho.inlineImages = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Inline CSS url()', 'inlineCSSUrls', null, () => ho.inlineCSSUrls, (v) => {
					ho.inlineCSSUrls = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Strip Comments', 'stripComments', null, () => ho.stripComments, (v) => {
					ho.stripComments = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Prettify HTML', 'prettify', null, () => ho.prettify, (v) => {
					ho.prettify = v;
					htmlPlugin._saveOpts(ho);
				}));

				sb.appendChild(mkLabel('Prettier Options'));
				{
					const po = _getPrettierOpts();
					sb.appendChild(mkSelect('HTML Indent', '_htmlIndent', [{
							label: '2 Spaces',
							value: '  '
						},
						{
							label: '4 Spaces',
							value: '    '
						},
						{
							label: 'Tab',
							value: '\t'
						}
					], () => po.htmlIndent, (v) => {
						po.htmlIndent = v;
						_savePrettierOpts(po);
					}));
					sb.appendChild(mkToggle('HTML: Sort Attributes', '_htmlSortAttrs', null,
						() => po.htmlSortAttrs, (v) => {
							po.htmlSortAttrs = v;
							_savePrettierOpts(po);
						}));
					sb.appendChild(mkSelect('CSS Indent', '_cssIndent', [{
							label: '2 Spaces',
							value: '  '
						},
						{
							label: '4 Spaces',
							value: '    '
						},
						{
							label: 'Tab',
							value: '\t'
						}
					], () => po.cssIndent, (v) => {
						po.cssIndent = v;
						_savePrettierOpts(po);
					}));
					sb.appendChild(mkToggle('CSS: Sort Properties', '_cssSortProps', null,
						() => po.cssSortProps, (v) => {
							po.cssSortProps = v;
							_savePrettierOpts(po);
						}));
					sb.appendChild(mkSelect('JS Indent', '_jsIndent', [{
							label: '2 Spaces',
							value: '  '
						},
						{
							label: '4 Spaces',
							value: '    '
						},
						{
							label: 'Tab',
							value: '\t'
						}
					], () => po.jsIndent, (v) => {
						po.jsIndent = v;
						_savePrettierOpts(po);
					}));
					sb.appendChild(mkToggle('JS: Semicolons', '_jsSemi', null,
						() => po.jsSemi, (v) => {
							po.jsSemi = v;
							_savePrettierOpts(po);
						}));
					sb.appendChild(mkToggle('JS: Single Quotes', '_jsSingleQuote', null,
						() => po.jsSingleQuote, (v) => {
							po.jsSingleQuote = v;
							_savePrettierOpts(po);
						}));
				}
				sb.appendChild(mkToggle('Include Shadow DOM', 'includeShadowDOM', null, () => ho.includeShadowDOM, (v) => {
					ho.includeShadowDOM = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Add <base> tag', 'addBaseTag', null, () => ho.addBaseTag, (v) => {
					ho.addBaseTag = v;
					htmlPlugin._saveOpts(ho);
				}));
				sb.appendChild(mkToggle('Add timestamp meta', 'addMetaTimestamp', null, () => ho.addMetaTimestamp, (v) => {
					ho.addMetaTimestamp = v;
					htmlPlugin._saveOpts(ho);
				}));
			}

			sb.appendChild(mkLabel('Panel'));
			const versionRow = document.createElement('div');
			Object.assign(versionRow.style, {
				padding: '6px 0',
				borderBottom: '1px solid #2a2a2a',
				display: 'flex',
				justifyContent: 'space-between'
			});
			versionRow.innerHTML = `<span style="color:#ccc">Version</span><span style="color:#888">${VERSION}</span>`;
			sb.appendChild(versionRow);

			const saveRow = document.createElement('div');
			Object.assign(saveRow.style, {
				paddingTop: '12px',
				display: 'flex',
				justifyContent: 'flex-end'
			});
			const saveBtn = document.createElement('button');
			saveBtn.textContent = 'Done';
			Object.assign(saveBtn.style, {
				padding: '6px 16px',
				background: '#7b1fa2',
				color: '#fff',
				border: 'none',
				borderRadius: '6px',
				cursor: 'pointer',
				fontFamily: 'monospace',
				fontSize: '11px'
			});
			saveBtn.onclick = () => settingsDiv.remove();
			saveRow.appendChild(saveBtn);
			sb.appendChild(saveRow);

			settingsDiv.append(sh, sb);
			panel.style.position = 'fixed';
			panel.appendChild(settingsDiv);
		}

		function renderPluginButtons() {
			while (mainBtnRow.firstChild) mainBtnRow.removeChild(mainBtnRow.firstChild);
			registry.forEach(plugin => {
				const btn = makeBtn(plugin.label, plugin.color);
				btn.onclick = async () => {
					currentPlugin = plugin;
					showActionButtons();
					if (plugin.renderUI) {
						const out = renderUIContainer._htmlOutput;
						if (out && plugin.fetchData) {
							out.textContent = "Building...";
							try {
								const r = plugin.fetchData();
								out.textContent = r instanceof Promise ? await r : r;
							} catch (e) {
								out.textContent = "Error: " + e.message;
							}
						}
					} else {
						textarea.value = "Loading...";
						try {
							const r = plugin.fetchData();
							textarea.value = r instanceof Promise ? await r : r;
						} catch (e) {
							textarea.value = "Error: " + e.message;
						}
					}
				};
				mainBtnRow.appendChild(btn);
			});
			const btnSearch = makeBtn("🔍 Search", "#6a1b9a");
			btnSearch.onclick = showGlobalSearchMode;
			mainBtnRow.appendChild(btnSearch);

			const btnPicker = makeBtn("◉ Picker", "#7b1fa2");
			btnPicker.onclick = () => {
				elementPicker.activate(textarea, showPickerMode);
			};
			mainBtnRow.appendChild(btnPicker);

			const btnSettings = document.createElement("button");
			btnSettings.textContent = "⚙";
			btnSettings.title = "Settings";
			Object.assign(btnSettings.style, {
				padding: "8px 10px",
				border: "none",
				cursor: "pointer",
				background: "#333",
				color: "#aaa",
				borderRadius: "6px",
				fontFamily: "monospace",
				fontSize: "13px",
				transition: "all 0.2s",
				flexShrink: "0"
			});
			btnSettings.onmouseover = () => {
				btnSettings.style.background = "#444";
				btnSettings.style.color = "#fff";
			};
			btnSettings.onmouseout = () => {
				btnSettings.style.background = "#333";
				btnSettings.style.color = "#aaa";
			};
			btnSettings.onclick = openSettingsPanel;
			mainBtnRow.appendChild(btnSettings);
		}

		caseSensitiveBtn.onclick = () => {
			caseSensitive = !caseSensitive;
			caseSensitiveBtn.style.background = caseSensitive ? "#1565c0" : "#444";
		};
		regexBtn.onclick = () => {
			useRegex = !useRegex;
			regexBtn.style.background = useRegex ? "#1565c0" : "#444";
		};
		btnClearSearch.onclick = () => {
			searchInput.value = "";
			searchResults.innerHTML = "";
			searchStatus.textContent = "Ready to search";
			searchInput.focus();
		};
		btnCopySearch.onclick = () => {
			const txt = Array.from(searchResults.querySelectorAll("div")).map(d => d.textContent).join("\n");
			if (txt) {
				navigator.clipboard.writeText(txt);
				btnCopySearch.textContent = "Copied ✓";
				setTimeout(() => btnCopySearch.textContent = "Copy Results", 1000);
			}
		};
		btnSearchBack.onclick = () => {
			searchInput.value = "";
			searchResults.innerHTML = "";
			searchStatus.textContent = "Ready to search";
			showMainButtons();
		};

		function parseSearch(query) {
			let q = query;
			const urlFilters = [],
				excludes = [],
				phrases = [];
			const scopeFlags = {
				html: false,
				js: false,
				css: false,
				network: false,
				storage: false,
				all: true
			};
			q = q.replace(/\bscope:(\w+)/g, (_, v) => {
				const s = v.toLowerCase();
				if (["html", "js", "css", "network", "storage"].includes(s)) {
					scopeFlags[s] = true;
					scopeFlags.all = false;
				}
				return "";
			});
			q = q.replace(/\burl:(\S+)/g, (_, v) => {
				urlFilters.push(v);
				return "";
			});
			q = q.replace(/"([^"]+)"/g, (_, v) => {
				phrases.push(v);
				return "";
			});
			q = q.replace(/(?:^|\s)-(\S+)/g, (_, v) => {
				excludes.push(v);
				return " ";
			});
			return {
				keyword: phrases.length ? phrases.join(" ") : q.trim(),
				urlFilters,
				excludes,
				phrases,
				scopeFlags
			};
		}

		async function performGlobalSearch() {
			const query = searchInput.value.trim();
			if (!query) return;
			searchStatus.textContent = "Searching...";
			searchResults.innerHTML = "";
			const parsed = parseSearch(query);
			if (!parsed.keyword) {
				searchStatus.textContent = "No keyword to search.";
				return;
			}

			let searchPattern, excludePatterns;
			try {
				const esc = parsed.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				searchPattern = new RegExp(useRegex ? parsed.keyword : esc, caseSensitive ? "g" : "gi");
			} catch (e) {
				searchStatus.textContent = `Invalid pattern: ${e.message}`;
				return;
			}
			excludePatterns = parsed.excludes.map(ex => {
				try {
					return new RegExp(ex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
				} catch (_) {
					return null;
				}
			}).filter(Boolean);

			const {
				scopeFlags
			} = parsed;
			const resources = [];
			if (scopeFlags.all || scopeFlags.js) document.querySelectorAll("script[src]").forEach(s => resources.push({
				type: "JS",
				url: s.src
			}));
			if (scopeFlags.all || scopeFlags.css) document.querySelectorAll("link[rel='stylesheet']").forEach(s => resources.push({
				type: "CSS",
				url: s.href
			}));
			if (scopeFlags.all || scopeFlags.html) resources.push({
				type: "HTML",
				url: location.href
			});
			if (scopeFlags.all || scopeFlags.js) document.querySelectorAll("script:not([src])").forEach((s, i) => {
				if (s.textContent.trim()) resources.push({
					type: "INLINE-JS",
					url: `inline-script-${i}`,
					content: s.textContent
				});
			});
			if (scopeFlags.all || scopeFlags.css) document.querySelectorAll("style").forEach((s, i) => {
				if (s.textContent.trim()) resources.push({
					type: "INLINE-CSS",
					url: `inline-style-${i}`,
					content: s.textContent
				});
			});
			if (scopeFlags.all || scopeFlags.storage) {
				[localStorage, sessionStorage].forEach((store, idx) => {
					const lbl = idx === 0 ? "localStorage" : "sessionStorage";
					for (let i = 0; i < store.length; i++) {
						const k = store.key(i),
							v = store.getItem(k);
						if (v) resources.push({
							type: "STORAGE",
							url: `${lbl}:${k}`,
							content: v
						});
					}
				});
				const ck = document.cookie;
				if (ck) resources.push({
					type: "STORAGE",
					url: "cookies",
					content: ck
				});
			}

			const networkResources = [];
			if (scopeFlags.all || scopeFlags.network) {
				networkLog.forEach((req, idx) => {
					const lbl = `network[${idx+1}] ${req.method} ${req.url}`;
					let urlStr = req.url || "";
					if (req.params && Object.keys(req.params).length) urlStr += " " + JSON.stringify(req.params);
					networkResources.push({
						type: "NET-URL",
						url: lbl,
						content: urlStr
					});
					if (req.headers && Object.keys(req.headers).length) networkResources.push({
						type: "NET-REQ-HDR",
						url: lbl,
						content: JSON.stringify(req.headers, null, 2)
					});
					if (req.responseHeaders && Object.keys(req.responseHeaders).length) networkResources.push({
						type: "NET-RES-HDR",
						url: lbl,
						content: JSON.stringify(req.responseHeaders, null, 2)
					});
					if (req.body != null) {
						const b = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
						if (b && b !== "null") networkResources.push({
							type: "NET-REQ-BODY",
							url: lbl,
							content: b
						});
					}
					if (req.responseBody != null) {
						const b = typeof req.responseBody === "string" ? req.responseBody : JSON.stringify(req.responseBody);
						if (b && b !== "null") networkResources.push({
							type: "NET-RES-BODY",
							url: lbl,
							content: b
						});
					}
				});
			}

			const allResources = [...resources, ...networkResources];
			let totalMatches = 0,
				searchedCount = 0;
			const results = [];

			for (const res of allResources) {
				try {
					if (parsed.urlFilters.length && !parsed.urlFilters.some(f => res.url.toLowerCase().includes(f.toLowerCase()))) {
						searchedCount++;
						continue;
					}
					let text = res.content;
					if (!text) {
						const r = await fetch(res.url);
						text = await r.text();
					}
					const lines = text.split("\n"),
						fileMatches = [];
					lines.forEach((line, idx) => {
						searchPattern.lastIndex = 0;
						const m = searchPattern.exec(line);
						if (!m) return;
						if (excludePatterns.some(p => p.test(line))) return;
						const pad = 100,
							start = Math.max(0, m.index - pad),
							end = Math.min(line.length, m.index + m[0].length + pad);
						fileMatches.push({
							line: idx + 1,
							text: (start > 0 ? "…" : "") + line.substring(start, end) + (end < line.length ? "…" : "")
						});
						totalMatches++;
					});
					if (fileMatches.length) results.push({
						...res,
						matches: fileMatches
					});
					searchedCount++;
					searchStatus.textContent = `Searching... ${searchedCount}/${allResources.length} sources`;
				} catch (_) {
					searchedCount++;
				}
			}
			renderSearchResults(results, totalMatches, searchedCount, parsed);
		}

		function escapeRegExp(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}

		function highlightText(text, query, useRegex, caseSensitive) {
			const container = document.createDocumentFragment();
			const flags = caseSensitive ? 'g' : 'gi';
			let pattern;
			try {
				pattern = new RegExp(useRegex ? `(${query})` : `(${escapeRegExp(query)})`, flags);
			} catch (e) {
				const parts = text.split(query);
				parts.forEach((part, i) => {
					if (i > 0) {
						const mark = document.createElement('mark');
						mark.textContent = query;
						mark.style.cssText = 'background:#f9a825;color:#000;padding:0 2px;border-radius:2px;font-weight:bold;outline:1.5px solid #f57f17;';
						container.appendChild(mark);
					}
					container.appendChild(document.createTextNode(part));
				});
				return container;
			}

			const parts = text.split(pattern);
			parts.forEach((part, i) => {
				if (i % 2 === 1) {
					const mark = document.createElement('mark');
					mark.textContent = part;
					mark.style.cssText = 'background:#f9a825;color:#000;padding:0 2px;border-radius:2px;font-weight:bold;outline:1.5px solid #f57f17;';
					container.appendChild(mark);
				} else {
					container.appendChild(document.createTextNode(part));
				}
			});
			return container;
		}

		function renderSearchResults(results, totalMatches, searchedCount, parsed) {
			const container = searchResults;
			container.innerHTML = "";
			if (!results.length) {
				container.innerHTML = `<div style="color:#888;padding:40px;text-align:center;"><div style="font-size:48px;margin-bottom:15px;">🔍</div><div style="font-size:14px;margin-bottom:8px;">No matches found</div></div>`;
				searchStatus.textContent = `Searched ${searchedCount} files · No results`;
				return;
			}
			const hasFilters = parsed.urlFilters.length || parsed.excludes.length || parsed.phrases.length;
			if (hasFilters) {
				const fd = document.createElement('div');
				fd.style.cssText = "margin-bottom:12px;padding:8px;background:#1a237e;border-radius:6px;font-size:11px;";
				let html = `<div style="color:#7986cb;margin-bottom:6px;font-weight:bold;">Active Filters:</div><div style="display:flex;flex-wrap:wrap;gap:6px;">`;
				parsed.phrases.forEach(q => html += `<span style="background:#283593;color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;">"${escapeHtml(q)}"</span>`);
				parsed.urlFilters.forEach(u => html += `<span style="background:#0d47a1;color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;">url:${escapeHtml(u)}</span>`);
				parsed.excludes.forEach(e => html += `<span style="background:#b71c1c;color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;">-${escapeHtml(e)}</span>`);
				fd.innerHTML = html + `</div>`;
				container.appendChild(fd);
			}

			results.forEach(result => {
				const fileDiv = document.createElement("div");
				Object.assign(fileDiv.style, {
					marginBottom: "12px",
					border: "1px solid #2a2a2a",
					borderRadius: "6px",
					overflow: "hidden",
					background: "#161616"
				});
				const hdr = document.createElement("div");
				Object.assign(hdr.style, {
					background: "#212121",
					padding: "6px 10px",
					display: "flex",
					flexDirection: "column",
					gap: "4px",
					borderBottom: "1px solid #333"
				});
				const hdrTop = document.createElement("div");
				Object.assign(hdrTop.style, {
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center"
				});
				const typeBadge = document.createElement("span");
				typeBadge.textContent = result.type;
				Object.assign(typeBadge.style, {
					fontSize: "9px",
					fontWeight: "bold",
					padding: "2px 7px",
					borderRadius: "3px",
					letterSpacing: "0.8px",
					textTransform: "uppercase",
					background: result.type.includes("CSS") ? "#0d47a1" : result.type.includes("JS") ? "#bf360c" : "#1b5e20",
					color: "#fff"
				});
				const matchCount = document.createElement("span");
				matchCount.textContent = result.matches.length + " match" + (result.matches.length > 1 ? "es" : "");
				Object.assign(matchCount.style, {
					fontSize: "10px",
					color: "#f9a825",
					fontWeight: "bold"
				});
				hdrTop.append(typeBadge, matchCount);
				const isInline = result.url.startsWith("inline");
				const urlEl = document.createElement("a");
				urlEl.textContent = result.url;
				urlEl.href = isInline ? "#" : result.url;
				if (!isInline) urlEl.target = "_blank";
				Object.assign(urlEl.style, {
					fontSize: "10px",
					color: "#64b5f6",
					textDecoration: "none",
					wordBreak: "break-all",
					fontFamily: "monospace",
					lineHeight: "1.4"
				});
				urlEl.onmouseover = () => {
					urlEl.style.textDecoration = "underline";
					urlEl.style.color = "#90caf9";
				};
				urlEl.onmouseout = () => {
					urlEl.style.textDecoration = "none";
					urlEl.style.color = "#64b5f6";
				};
				hdr.append(hdrTop, urlEl);
				const matchesDiv = document.createElement("div");
				result.matches.forEach(match => {
					const ml = document.createElement("div");
					Object.assign(ml.style, {
						padding: "4px 0",
						borderTop: "1px solid #1a1a1a",
						fontFamily: "monospace",
						fontSize: "11px",
						color: "#ccc",
						cursor: "pointer",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
						lineHeight: "1.6",
						display: "flex",
						alignItems: "flex-start"
					});
					const lineNum = document.createElement("span");
					lineNum.textContent = match.line;
					Object.assign(lineNum.style, {
						color: "#555",
						minWidth: "36px",
						textAlign: "right",
						paddingRight: "10px",
						userSelect: "none",
						flexShrink: "0",
						borderRight: "1px solid #2a2a2a",
						marginRight: "10px"
					});
					const codeEl = document.createElement("span");
					Object.assign(codeEl.style, {
						flex: "1",
						paddingRight: "8px"
					});

					codeEl.appendChild(highlightText(match.text, parsed.keyword, useRegex, caseSensitive));
					ml.append(lineNum, codeEl);
					ml.onmouseover = () => ml.style.background = "#1c2333";
					ml.onmouseout = () => ml.style.background = "transparent";
					ml.onclick = () => {
						navigator.clipboard.writeText(match.text);
						ml.style.background = "#1b3a1b";
						setTimeout(() => ml.style.background = "transparent", 700);
					};
					matchesDiv.appendChild(ml);
				});
				fileDiv.append(hdr, matchesDiv);
				container.appendChild(fileDiv);
			});
			const fc = parsed.urlFilters.length + parsed.excludes.length + parsed.phrases.length;
			searchStatus.textContent = `Found ${totalMatches} matches in ${results.length} files (searched ${searchedCount} files)${fc>0?` · ${fc} filter${fc>1?'s':''}`:''}`;
		}

		function escapeHtml(str) {
			if (!str) return '';
			return str.replace(/[&<>]/g, function(m) {
				if (m === '&') return '&amp;';
				if (m === '<') return '&lt;';
				if (m === '>') return '&gt;';
				return m;
			});
		}

		searchExecBtn.onclick = performGlobalSearch;
		searchInput.onkeydown = e => {
			if (e.key === "Enter") performGlobalSearch();
		};
		searchInput.onfocus = () => {
			if (!searchInput.value) searchStatus.innerHTML = `<div style="font-size:10px;line-height:1.4;"><span style="color:#f9a825;font-weight:bold;">Operators:</span><span style="color:#aaa;"> "exact phrase" &nbsp;·&nbsp; url:path &nbsp;·&nbsp; -exclude</span></div>`;
		};
		searchInput.onblur = () => {
			if (!searchInput.value) searchStatus.textContent = "Ready to search";
		};

		panel.append(header, content, mainBtnRow, actionBtnRow, searchBtnRow, pickerBtnRow);

		(function setupPickerBtnRow() {
			const bPickerBack = makeBtn("← Back", "#444");
			const bPickerCopy = makeBtn("Copy Output", "#444");
			const bPickerSettings = makeBtn("⚙ Settings", "#333");
			bPickerBack.onclick = () => {
				elementPicker.deactivate();
				showMainButtons();
			};
			bPickerCopy.onclick = async () => {
				await elementPicker.copyOutput();
				bPickerCopy.textContent = "Copied ✓";
				setTimeout(() => bPickerCopy.textContent = "Copy Output", 1200);
			};
			bPickerSettings.onclick = openSettingsPanel;
			pickerBtnRow.append(bPickerBack, bPickerCopy, bPickerSettings);
		})();

		document.body.appendChild(panel);
		renderPluginButtons();

		let isDrag = false,
			offsetX = 0,
			offsetY = 0;
		let isResize = false,
			rsX = 0,
			rsY = 0,
			rsW = 0,
			rsH = 0;

		function snapCheck() {
			if (isFullscreen) return;
			const r = panel.getBoundingClientRect();
			const vw = window.innerWidth,
				vh = window.innerHeight;
			if (r.width > vw * FULLSCREEN_RATIO || r.height > vh * FULLSCREEN_RATIO) {
				enterFullscreen();
				return;
			}
			if (r.left < SNAP_THRESHOLD) panel.style.left = "8px";
			else if (vw - r.right < SNAP_THRESHOLD) panel.style.left = (vw - r.width - 8) + "px";
			if (r.top < SNAP_THRESHOLD) panel.style.top = "8px";
			else if (vh - r.bottom < SNAP_THRESHOLD) panel.style.top = (vh - r.height - 8) + "px";
		}

		function startDrag(e) {
			if (e.target === minimizeBtn || e.target === fsBtn || headerBtns.contains(e.target)) return;
			if (isFullscreen) return;
			isDrag = true;
			const x = e.touches ? e.touches[0].clientX : e.clientX;
			const y = e.touches ? e.touches[0].clientY : e.clientY;
			offsetX = x - panel.offsetLeft;
			offsetY = y - panel.offsetTop;
			e.preventDefault();
		}

		function moveDrag(e) {
			if (!isDrag) return;
			e.preventDefault();
			const x = e.touches ? e.touches[0].clientX : e.clientX;
			const y = e.touches ? e.touches[0].clientY : e.clientY;
			panel.style.left = (x - offsetX) + "px";
			panel.style.top = (y - offsetY) + "px";
		}

		function endDrag() {
			if (!isDrag) return;
			isDrag = false;
			snapCheck();
		}

		function startResize(e) {
			if (isFullscreen) return;
			isResize = true;
			rsX = e.clientX;
			rsY = e.clientY;
			rsW = panel.offsetWidth;
			rsH = panel.offsetHeight;
			document.body.style.userSelect = "none";
			document.body.style.cursor = "nwse-resize";
			e.preventDefault();
			e.stopPropagation();
		}

		function moveResize(e) {
			if (!isResize) return;
			e.preventDefault();
			panel.style.width = Math.max(280, rsW + (e.clientX - rsX)) + "px";
			panel.style.height = Math.max(200, rsH + (e.clientY - rsY)) + "px";
		}

		function endResize() {
			if (!isResize) return;
			isResize = false;
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
			snapCheck();
		}

		header.addEventListener("mousedown", startDrag);
		document.addEventListener("mousemove", e => {
			moveDrag(e);
			moveResize(e);
		});
		document.addEventListener("mouseup", () => {
			endDrag();
			endResize();
		});
		header.addEventListener("touchstart", startDrag, {
			passive: false
		});
		document.addEventListener("touchmove", moveDrag, {
			passive: false
		});
		document.addEventListener("touchend", endDrag);
		resizeHandle.addEventListener("mousedown", startResize);
		resizeHandle.addEventListener("touchstart", e => {
			if (isFullscreen) return;
			const t = e.touches[0];
			isResize = true;
			rsX = t.clientX;
			rsY = t.clientY;
			rsW = panel.offsetWidth;
			rsH = panel.offsetHeight;
			e.preventDefault();
			e.stopPropagation();
		}, {
			passive: false
		});
		document.addEventListener("touchmove", e => {
			if (!isResize) return;
			const t = e.touches[0];
			e.preventDefault();
			panel.style.width = Math.max(280, rsW + (t.clientX - rsX)) + "px";
			panel.style.height = Math.max(200, rsH + (t.clientY - rsY)) + "px";
		}, {
			passive: false
		});
		document.addEventListener("touchend", () => {
			if (!isResize) return;
			isResize = false;
			snapCheck();
		});

		let minimized = false,
			prevHeight = panel.style.height;

		function toggleMin() {
			if (isFullscreen) {
				exitFullscreen();
				return;
			}
			if (!currentPlugin) wallpaperArea.style.display = "flex";
			if (!minimized) {
				prevHeight = panel.style.height;
				panel.style.height = "40px";
				content.style.display = "none";
				mainBtnRow.style.display = actionBtnRow.style.display = searchBtnRow.style.display = "none";
				minimized = true;
				minimizeBtn.textContent = "+";
				resizeHandle.style.display = "none";
			} else {
				panel.style.height = prevHeight;
				content.style.display = "flex";
				if (!currentPlugin) mainBtnRow.style.display = "flex";
				else {
					actionBtnRow.style.display = "flex";
					textarea.style.display = "block";
				}
				minimized = false;
				minimizeBtn.textContent = "−";
				resizeHandle.style.display = "flex";
			}
		}
		minimizeBtn.onclick = toggleMin;
		header.addEventListener("dblclick", toggleMin);
		let lastTap = 0;
		header.addEventListener("touchend", () => {
			const now = Date.now();
			if (now - lastTap < 300) toggleMin();
			lastTap = now;
		});
	}

	function togglePanel() {
		if (_panelHost) {
			_panelHost.remove();
			_panelHost = null;
			const _origGetById = Document.prototype.getElementById;
			document.getElementById = _origGetById.bind(document);
			document.querySelector = Document.prototype.querySelector.bind(document);
		} else {
			createPanel();
		}
	}

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action === "togglePanel") {
			togglePanel();
			sendResponse({
				success: true
			});
		}
	});

})();
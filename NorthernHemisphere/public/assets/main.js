!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.northernHemisphere=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){


//
// Generated on Tue Dec 16 2014 12:13:47 GMT+0100 (CET) by Charlie Robbins, Paolo Fragomeni & the Contributors (Using Codesurgeon).
// Version 1.2.6
//

(function (exports) {

/*
 * browser.js: Browser specific functionality for director.
 *
 * (C) 2011, Charlie Robbins, Paolo Fragomeni, & the Contributors.
 * MIT LICENSE
 *
 */

var dloc = document.location;

function dlocHashEmpty() {
  // Non-IE browsers return '' when the address bar shows '#'; Director's logic
  // assumes both mean empty.
  return dloc.hash === '' || dloc.hash === '#';
}

var listener = {
  mode: 'modern',
  hash: dloc.hash,
  history: false,

  check: function () {
    var h = dloc.hash;
    if (h != this.hash) {
      this.hash = h;
      this.onHashChanged();
    }
  },

  fire: function () {
    if (this.mode === 'modern') {
      this.history === true ? window.onpopstate() : window.onhashchange();
    }
    else {
      this.onHashChanged();
    }
  },

  init: function (fn, history) {
    var self = this;
    this.history = history;

    if (!Router.listeners) {
      Router.listeners = [];
    }

    function onchange(onChangeEvent) {
      for (var i = 0, l = Router.listeners.length; i < l; i++) {
        Router.listeners[i](onChangeEvent);
      }
    }

    //note IE8 is being counted as 'modern' because it has the hashchange event
    if ('onhashchange' in window && (document.documentMode === undefined
      || document.documentMode > 7)) {
      // At least for now HTML5 history is available for 'modern' browsers only
      if (this.history === true) {
        // There is an old bug in Chrome that causes onpopstate to fire even
        // upon initial page load. Since the handler is run manually in init(),
        // this would cause Chrome to run it twise. Currently the only
        // workaround seems to be to set the handler after the initial page load
        // http://code.google.com/p/chromium/issues/detail?id=63040
        setTimeout(function() {
          window.onpopstate = onchange;
        }, 500);
      }
      else {
        window.onhashchange = onchange;
      }
      this.mode = 'modern';
    }
    else {
      //
      // IE support, based on a concept by Erik Arvidson ...
      //
      var frame = document.createElement('iframe');
      frame.id = 'state-frame';
      frame.style.display = 'none';
      document.body.appendChild(frame);
      this.writeFrame('');

      if ('onpropertychange' in document && 'attachEvent' in document) {
        document.attachEvent('onpropertychange', function () {
          if (event.propertyName === 'location') {
            self.check();
          }
        });
      }

      window.setInterval(function () { self.check(); }, 50);

      this.onHashChanged = onchange;
      this.mode = 'legacy';
    }

    Router.listeners.push(fn);

    return this.mode;
  },

  destroy: function (fn) {
    if (!Router || !Router.listeners) {
      return;
    }

    var listeners = Router.listeners;

    for (var i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1);
      }
    }
  },

  setHash: function (s) {
    // Mozilla always adds an entry to the history
    if (this.mode === 'legacy') {
      this.writeFrame(s);
    }

    if (this.history === true) {
      window.history.pushState({}, document.title, s);
      // Fire an onpopstate event manually since pushing does not obviously
      // trigger the pop event.
      this.fire();
    } else {
      dloc.hash = (s[0] === '/') ? s : '/' + s;
    }
    return this;
  },

  writeFrame: function (s) {
    // IE support...
    var f = document.getElementById('state-frame');
    var d = f.contentDocument || f.contentWindow.document;
    d.open();
    d.write("<script>_hash = '" + s + "'; onload = parent.listener.syncHash;<script>");
    d.close();
  },

  syncHash: function () {
    // IE support...
    var s = this._hash;
    if (s != dloc.hash) {
      dloc.hash = s;
    }
    return this;
  },

  onHashChanged: function () {}
};

var Router = exports.Router = function (routes) {
  if (!(this instanceof Router)) return new Router(routes);

  this.params   = {};
  this.routes   = {};
  this.methods  = ['on', 'once', 'after', 'before'];
  this.scope    = [];
  this._methods = {};

  this._insert = this.insert;
  this.insert = this.insertEx;

  this.historySupport = (window.history != null ? window.history.pushState : null) != null

  this.configure();
  this.mount(routes || {});
};

Router.prototype.init = function (r) {
  var self = this
    , routeTo;
  this.handler = function(onChangeEvent) {
    var newURL = onChangeEvent && onChangeEvent.newURL || window.location.hash;
    var url = self.history === true ? self.getPath() : newURL.replace(/.*#/, '');
    self.dispatch('on', url.charAt(0) === '/' ? url : '/' + url);
  };

  listener.init(this.handler, this.history);

  if (this.history === false) {
    if (dlocHashEmpty() && r) {
      dloc.hash = r;
    } else if (!dlocHashEmpty()) {
      self.dispatch('on', '/' + dloc.hash.replace(/^(#\/|#|\/)/, ''));
    }
  }
  else {
    if (this.convert_hash_in_init) {
      // Use hash as route
      routeTo = dlocHashEmpty() && r ? r : !dlocHashEmpty() ? dloc.hash.replace(/^#/, '') : null;
      if (routeTo) {
        window.history.replaceState({}, document.title, routeTo);
      }
    }
    else {
      // Use canonical url
      routeTo = this.getPath();
    }

    // Router has been initialized, but due to the chrome bug it will not
    // yet actually route HTML5 history state changes. Thus, decide if should route.
    if (routeTo || this.run_in_init === true) {
      this.handler();
    }
  }

  return this;
};

Router.prototype.explode = function () {
  var v = this.history === true ? this.getPath() : dloc.hash;
  if (v.charAt(1) === '/') { v=v.slice(1) }
  return v.slice(1, v.length).split("/");
};

Router.prototype.setRoute = function (i, v, val) {
  var url = this.explode();

  if (typeof i === 'number' && typeof v === 'string') {
    url[i] = v;
  }
  else if (typeof val === 'string') {
    url.splice(i, v, s);
  }
  else {
    url = [i];
  }

  listener.setHash(url.join('/'));
  return url;
};

//
// ### function insertEx(method, path, route, parent)
// #### @method {string} Method to insert the specific `route`.
// #### @path {Array} Parsed path to insert the `route` at.
// #### @route {Array|function} Route handlers to insert.
// #### @parent {Object} **Optional** Parent "routes" to insert into.
// insert a callback that will only occur once per the matched route.
//
Router.prototype.insertEx = function(method, path, route, parent) {
  if (method === "once") {
    method = "on";
    route = function(route) {
      var once = false;
      return function() {
        if (once) return;
        once = true;
        return route.apply(this, arguments);
      };
    }(route);
  }
  return this._insert(method, path, route, parent);
};

Router.prototype.getRoute = function (v) {
  var ret = v;

  if (typeof v === "number") {
    ret = this.explode()[v];
  }
  else if (typeof v === "string"){
    var h = this.explode();
    ret = h.indexOf(v);
  }
  else {
    ret = this.explode();
  }

  return ret;
};

Router.prototype.destroy = function () {
  listener.destroy(this.handler);
  return this;
};

Router.prototype.getPath = function () {
  var path = window.location.pathname;
  if (path.substr(0, 1) !== '/') {
    path = '/' + path;
  }
  return path;
};
function _every(arr, iterator) {
  for (var i = 0; i < arr.length; i += 1) {
    if (iterator(arr[i], i, arr) === false) {
      return;
    }
  }
}

function _flatten(arr) {
  var flat = [];
  for (var i = 0, n = arr.length; i < n; i++) {
    flat = flat.concat(arr[i]);
  }
  return flat;
}

function _asyncEverySeries(arr, iterator, callback) {
  if (!arr.length) {
    return callback();
  }
  var completed = 0;
  (function iterate() {
    iterator(arr[completed], function(err) {
      if (err || err === false) {
        callback(err);
        callback = function() {};
      } else {
        completed += 1;
        if (completed === arr.length) {
          callback();
        } else {
          iterate();
        }
      }
    });
  })();
}

function paramifyString(str, params, mod) {
  mod = str;
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      mod = params[param](str);
      if (mod !== str) {
        break;
      }
    }
  }
  return mod === str ? "([._a-zA-Z0-9-%()]+)" : mod;
}

function regifyString(str, params) {
  var matches, last = 0, out = "";
  while (matches = str.substr(last).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/)) {
    last = matches.index + matches[0].length;
    matches[0] = matches[0].replace(/^\*/, "([_.()!\\ %@&a-zA-Z0-9-]+)");
    out += str.substr(0, matches.index) + matches[0];
  }
  str = out += str.substr(last);
  var captures = str.match(/:([^\/]+)/ig), capture, length;
  if (captures) {
    length = captures.length;
    for (var i = 0; i < length; i++) {
      capture = captures[i];
      if (capture.slice(0, 2) === "::") {
        str = capture.slice(1);
      } else {
        str = str.replace(capture, paramifyString(capture, params));
      }
    }
  }
  return str;
}

function terminator(routes, delimiter, start, stop) {
  var last = 0, left = 0, right = 0, start = (start || "(").toString(), stop = (stop || ")").toString(), i;
  for (i = 0; i < routes.length; i++) {
    var chunk = routes[i];
    if (chunk.indexOf(start, last) > chunk.indexOf(stop, last) || ~chunk.indexOf(start, last) && !~chunk.indexOf(stop, last) || !~chunk.indexOf(start, last) && ~chunk.indexOf(stop, last)) {
      left = chunk.indexOf(start, last);
      right = chunk.indexOf(stop, last);
      if (~left && !~right || !~left && ~right) {
        var tmp = routes.slice(0, (i || 1) + 1).join(delimiter);
        routes = [ tmp ].concat(routes.slice((i || 1) + 1));
      }
      last = (right > left ? right : left) + 1;
      i = 0;
    } else {
      last = 0;
    }
  }
  return routes;
}

var QUERY_SEPARATOR = /\?.*/;

Router.prototype.configure = function(options) {
  options = options || {};
  for (var i = 0; i < this.methods.length; i++) {
    this._methods[this.methods[i]] = true;
  }
  this.recurse = options.recurse || this.recurse || false;
  this.async = options.async || false;
  this.delimiter = options.delimiter || "/";
  this.strict = typeof options.strict === "undefined" ? true : options.strict;
  this.notfound = options.notfound;
  this.resource = options.resource;
  this.history = options.html5history && this.historySupport || false;
  this.run_in_init = this.history === true && options.run_handler_in_init !== false;
  this.convert_hash_in_init = this.history === true && options.convert_hash_in_init !== false;
  this.every = {
    after: options.after || null,
    before: options.before || null,
    on: options.on || null
  };
  return this;
};

Router.prototype.param = function(token, matcher) {
  if (token[0] !== ":") {
    token = ":" + token;
  }
  var compiled = new RegExp(token, "g");
  this.params[token] = function(str) {
    return str.replace(compiled, matcher.source || matcher);
  };
  return this;
};

Router.prototype.on = Router.prototype.route = function(method, path, route) {
  var self = this;
  if (!route && typeof path == "function") {
    route = path;
    path = method;
    method = "on";
  }
  if (Array.isArray(path)) {
    return path.forEach(function(p) {
      self.on(method, p, route);
    });
  }
  if (path.source) {
    path = path.source.replace(/\\\//ig, "/");
  }
  if (Array.isArray(method)) {
    return method.forEach(function(m) {
      self.on(m.toLowerCase(), path, route);
    });
  }
  path = path.split(new RegExp(this.delimiter));
  path = terminator(path, this.delimiter);
  this.insert(method, this.scope.concat(path), route);
};

Router.prototype.path = function(path, routesFn) {
  var self = this, length = this.scope.length;
  if (path.source) {
    path = path.source.replace(/\\\//ig, "/");
  }
  path = path.split(new RegExp(this.delimiter));
  path = terminator(path, this.delimiter);
  this.scope = this.scope.concat(path);
  routesFn.call(this, this);
  this.scope.splice(length, path.length);
};

Router.prototype.dispatch = function(method, path, callback) {
  var self = this, fns = this.traverse(method, path.replace(QUERY_SEPARATOR, ""), this.routes, ""), invoked = this._invoked, after;
  this._invoked = true;
  if (!fns || fns.length === 0) {
    this.last = [];
    if (typeof this.notfound === "function") {
      this.invoke([ this.notfound ], {
        method: method,
        path: path
      }, callback);
    }
    return false;
  }
  if (this.recurse === "forward") {
    fns = fns.reverse();
  }
  function updateAndInvoke() {
    self.last = fns.after;
    self.invoke(self.runlist(fns), self, callback);
  }
  after = this.every && this.every.after ? [ this.every.after ].concat(this.last) : [ this.last ];
  if (after && after.length > 0 && invoked) {
    if (this.async) {
      this.invoke(after, this, updateAndInvoke);
    } else {
      this.invoke(after, this);
      updateAndInvoke();
    }
    return true;
  }
  updateAndInvoke();
  return true;
};

Router.prototype.invoke = function(fns, thisArg, callback) {
  var self = this;
  var apply;
  if (this.async) {
    apply = function(fn, next) {
      if (Array.isArray(fn)) {
        return _asyncEverySeries(fn, apply, next);
      } else if (typeof fn == "function") {
        fn.apply(thisArg, (fns.captures || []).concat(next));
      }
    };
    _asyncEverySeries(fns, apply, function() {
      if (callback) {
        callback.apply(thisArg, arguments);
      }
    });
  } else {
    apply = function(fn) {
      if (Array.isArray(fn)) {
        return _every(fn, apply);
      } else if (typeof fn === "function") {
        return fn.apply(thisArg, fns.captures || []);
      } else if (typeof fn === "string" && self.resource) {
        self.resource[fn].apply(thisArg, fns.captures || []);
      }
    };
    _every(fns, apply);
  }
};

Router.prototype.traverse = function(method, path, routes, regexp, filter) {
  var fns = [], current, exact, match, next, that;
  function filterRoutes(routes) {
    if (!filter) {
      return routes;
    }
    function deepCopy(source) {
      var result = [];
      for (var i = 0; i < source.length; i++) {
        result[i] = Array.isArray(source[i]) ? deepCopy(source[i]) : source[i];
      }
      return result;
    }
    function applyFilter(fns) {
      for (var i = fns.length - 1; i >= 0; i--) {
        if (Array.isArray(fns[i])) {
          applyFilter(fns[i]);
          if (fns[i].length === 0) {
            fns.splice(i, 1);
          }
        } else {
          if (!filter(fns[i])) {
            fns.splice(i, 1);
          }
        }
      }
    }
    var newRoutes = deepCopy(routes);
    newRoutes.matched = routes.matched;
    newRoutes.captures = routes.captures;
    newRoutes.after = routes.after.filter(filter);
    applyFilter(newRoutes);
    return newRoutes;
  }
  if (path === this.delimiter && routes[method]) {
    next = [ [ routes.before, routes[method] ].filter(Boolean) ];
    next.after = [ routes.after ].filter(Boolean);
    next.matched = true;
    next.captures = [];
    return filterRoutes(next);
  }
  for (var r in routes) {
    if (routes.hasOwnProperty(r) && (!this._methods[r] || this._methods[r] && typeof routes[r] === "object" && !Array.isArray(routes[r]))) {
      current = exact = regexp + this.delimiter + r;
      if (!this.strict) {
        exact += "[" + this.delimiter + "]?";
      }
      match = path.match(new RegExp("^" + exact));
      if (!match) {
        continue;
      }
      if (match[0] && match[0] == path && routes[r][method]) {
        next = [ [ routes[r].before, routes[r][method] ].filter(Boolean) ];
        next.after = [ routes[r].after ].filter(Boolean);
        next.matched = true;
        next.captures = match.slice(1);
        if (this.recurse && routes === this.routes) {
          next.push([ routes.before, routes.on ].filter(Boolean));
          next.after = next.after.concat([ routes.after ].filter(Boolean));
        }
        return filterRoutes(next);
      }
      next = this.traverse(method, path, routes[r], current);
      if (next.matched) {
        if (next.length > 0) {
          fns = fns.concat(next);
        }
        if (this.recurse) {
          fns.push([ routes[r].before, routes[r].on ].filter(Boolean));
          next.after = next.after.concat([ routes[r].after ].filter(Boolean));
          if (routes === this.routes) {
            fns.push([ routes["before"], routes["on"] ].filter(Boolean));
            next.after = next.after.concat([ routes["after"] ].filter(Boolean));
          }
        }
        fns.matched = true;
        fns.captures = next.captures;
        fns.after = next.after;
        return filterRoutes(fns);
      }
    }
  }
  return false;
};

Router.prototype.insert = function(method, path, route, parent) {
  var methodType, parentType, isArray, nested, part;
  path = path.filter(function(p) {
    return p && p.length > 0;
  });
  parent = parent || this.routes;
  part = path.shift();
  if (/\:|\*/.test(part) && !/\\d|\\w/.test(part)) {
    part = regifyString(part, this.params);
  }
  if (path.length > 0) {
    parent[part] = parent[part] || {};
    return this.insert(method, path, route, parent[part]);
  }
  if (!part && !path.length && parent === this.routes) {
    methodType = typeof parent[method];
    switch (methodType) {
     case "function":
      parent[method] = [ parent[method], route ];
      return;
     case "object":
      parent[method].push(route);
      return;
     case "undefined":
      parent[method] = route;
      return;
    }
    return;
  }
  parentType = typeof parent[part];
  isArray = Array.isArray(parent[part]);
  if (parent[part] && !isArray && parentType == "object") {
    methodType = typeof parent[part][method];
    switch (methodType) {
     case "function":
      parent[part][method] = [ parent[part][method], route ];
      return;
     case "object":
      parent[part][method].push(route);
      return;
     case "undefined":
      parent[part][method] = route;
      return;
    }
  } else if (parentType == "undefined") {
    nested = {};
    nested[method] = route;
    parent[part] = nested;
    return;
  }
  throw new Error("Invalid route context: " + parentType);
};



Router.prototype.extend = function(methods) {
  var self = this, len = methods.length, i;
  function extend(method) {
    self._methods[method] = true;
    self[method] = function() {
      var extra = arguments.length === 1 ? [ method, "" ] : [ method ];
      self.on.apply(self, extra.concat(Array.prototype.slice.call(arguments)));
    };
  }
  for (i = 0; i < len; i++) {
    extend(methods[i]);
  }
};

Router.prototype.runlist = function(fns) {
  var runlist = this.every && this.every.before ? [ this.every.before ].concat(_flatten(fns)) : _flatten(fns);
  if (this.every && this.every.on) {
    runlist.push(this.every.on);
  }
  runlist.captures = fns.captures;
  runlist.source = fns.source;
  return runlist;
};

Router.prototype.mount = function(routes, path) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
    return;
  }
  var self = this;
  path = path || [];
  if (!Array.isArray(path)) {
    path = path.split(self.delimiter);
  }
  function insertOrMount(route, local) {
    var rename = route, parts = route.split(self.delimiter), routeType = typeof routes[route], isRoute = parts[0] === "" || !self._methods[parts[0]], event = isRoute ? "on" : rename;
    if (isRoute) {
      rename = rename.slice((rename.match(new RegExp("^" + self.delimiter)) || [ "" ])[0].length);
      parts.shift();
    }
    if (isRoute && routeType === "object" && !Array.isArray(routes[route])) {
      local = local.concat(parts);
      self.mount(routes[route], local);
      return;
    }
    if (isRoute) {
      local = local.concat(rename.split(self.delimiter));
      local = terminator(local, self.delimiter);
    }
    self.insert(event, local, routes[route]);
  }
  for (var route in routes) {
    if (routes.hasOwnProperty(route)) {
      insertOrMount(route, path.slice(0));
    }
  }
};



}(typeof exports === "object" ? exports : window));
},{}],2:[function(_dereq_,module,exports){
/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()

}('domready', function () {

  var fns = [], listener
    , doc = document
    , hack = doc.documentElement.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener)
    loaded = 1
    while (listener = fns.shift()) listener()
  })

  return function (fn) {
    loaded ? setTimeout(fn, 0) : fns.push(fn)
  }

});

},{}],3:[function(_dereq_,module,exports){
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//	http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//	http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

exports.qrcode = function() {

	//---------------------------------------------------------------------
	// qrcode
	//---------------------------------------------------------------------

	/**
	 * qrcode
	 * @param typeNumber 1 to 10
	 * @param errorCorrectLevel 'L','M','Q','H'
	 */
	var qrcode = function(typeNumber, errorCorrectLevel) {

		var PAD0 = 0xEC;
		var PAD1 = 0x11;

		var _typeNumber = typeNumber;
		var _errorCorrectLevel = QRErrorCorrectLevel[errorCorrectLevel];
		var _modules = null;
		var _moduleCount = 0;
		var _dataCache = null;
		var _dataList = new Array();

		var _this = {};

		var makeImpl = function(test, maskPattern) {

			_moduleCount = _typeNumber * 4 + 17;
			_modules = function(moduleCount) {
				var modules = new Array(moduleCount);
				for (var row = 0; row < moduleCount; row += 1) {
					modules[row] = new Array(moduleCount);
					for (var col = 0; col < moduleCount; col += 1) {
						modules[row][col] = null;
					}
				}
				return modules;
			}(_moduleCount);

			setupPositionProbePattern(0, 0);
			setupPositionProbePattern(_moduleCount - 7, 0);
			setupPositionProbePattern(0, _moduleCount - 7);
			setupPositionAdjustPattern();
			setupTimingPattern();
			setupTypeInfo(test, maskPattern);

			if (_typeNumber >= 7) {
				setupTypeNumber(test);
			}

			if (_dataCache == null) {
				_dataCache = createData(_typeNumber, _errorCorrectLevel, _dataList);
			}

			mapData(_dataCache, maskPattern);
		};

		var setupPositionProbePattern = function(row, col) {

			for (var r = -1; r <= 7; r += 1) {

				if (row + r <= -1 || _moduleCount <= row + r) continue;

				for (var c = -1; c <= 7; c += 1) {

					if (col + c <= -1 || _moduleCount <= col + c) continue;

					if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
							|| (0 <= c && c <= 6 && (r == 0 || r == 6) )
							|| (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
						_modules[row + r][col + c] = true;
					} else {
						_modules[row + r][col + c] = false;
					}
				}
			}
		};

		var getBestMaskPattern = function() {

			var minLostPoint = 0;
			var pattern = 0;

			for (var i = 0; i < 8; i += 1) {

				makeImpl(true, i);

				var lostPoint = QRUtil.getLostPoint(_this);

				if (i == 0 || minLostPoint > lostPoint) {
					minLostPoint = lostPoint;
					pattern = i;
				}
			}

			return pattern;
		};

		var setupTimingPattern = function() {

			for (var r = 8; r < _moduleCount - 8; r += 1) {
				if (_modules[r][6] != null) {
					continue;
				}
				_modules[r][6] = (r % 2 == 0);
			}

			for (var c = 8; c < _moduleCount - 8; c += 1) {
				if (_modules[6][c] != null) {
					continue;
				}
				_modules[6][c] = (c % 2 == 0);
			}
		};

		var setupPositionAdjustPattern = function() {

			var pos = QRUtil.getPatternPosition(_typeNumber);

			for (var i = 0; i < pos.length; i += 1) {

				for (var j = 0; j < pos.length; j += 1) {

					var row = pos[i];
					var col = pos[j];

					if (_modules[row][col] != null) {
						continue;
					}

					for (var r = -2; r <= 2; r += 1) {

						for (var c = -2; c <= 2; c += 1) {

							if (r == -2 || r == 2 || c == -2 || c == 2
									|| (r == 0 && c == 0) ) {
								_modules[row + r][col + c] = true;
							} else {
								_modules[row + r][col + c] = false;
							}
						}
					}
				}
			}
		};

		var setupTypeNumber = function(test) {

			var bits = QRUtil.getBCHTypeNumber(_typeNumber);

			for (var i = 0; i < 18; i += 1) {
				var mod = (!test && ( (bits >> i) & 1) == 1);
				_modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
			}

			for (var i = 0; i < 18; i += 1) {
				var mod = (!test && ( (bits >> i) & 1) == 1);
				_modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
			}
		};

		var setupTypeInfo = function(test, maskPattern) {

			var data = (_errorCorrectLevel << 3) | maskPattern;
			var bits = QRUtil.getBCHTypeInfo(data);

			// vertical
			for (var i = 0; i < 15; i += 1) {

				var mod = (!test && ( (bits >> i) & 1) == 1);

				if (i < 6) {
					_modules[i][8] = mod;
				} else if (i < 8) {
					_modules[i + 1][8] = mod;
				} else {
					_modules[_moduleCount - 15 + i][8] = mod;
				}
			}

			// horizontal
			for (var i = 0; i < 15; i += 1) {

				var mod = (!test && ( (bits >> i) & 1) == 1);

				if (i < 8) {
					_modules[8][_moduleCount - i - 1] = mod;
				} else if (i < 9) {
					_modules[8][15 - i - 1 + 1] = mod;
				} else {
					_modules[8][15 - i - 1] = mod;
				}
			}

			// fixed module
			_modules[_moduleCount - 8][8] = (!test);
		};

		var mapData = function(data, maskPattern) {

			var inc = -1;
			var row = _moduleCount - 1;
			var bitIndex = 7;
			var byteIndex = 0;
			var maskFunc = QRUtil.getMaskFunction(maskPattern);

			for (var col = _moduleCount - 1; col > 0; col -= 2) {

				if (col == 6) col -= 1;

				while (true) {

					for (var c = 0; c < 2; c += 1) {

						if (_modules[row][col - c] == null) {

							var dark = false;

							if (byteIndex < data.length) {
								dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
							}

							var mask = maskFunc(row, col - c);

							if (mask) {
								dark = !dark;
							}

							_modules[row][col - c] = dark;
							bitIndex -= 1;

							if (bitIndex == -1) {
								byteIndex += 1;
								bitIndex = 7;
							}
						}
					}

					row += inc;

					if (row < 0 || _moduleCount <= row) {
						row -= inc;
						inc = -inc;
						break;
					}
				}
			}
		};

		var createBytes = function(buffer, rsBlocks) {

			var offset = 0;

			var maxDcCount = 0;
			var maxEcCount = 0;

			var dcdata = new Array(rsBlocks.length);
			var ecdata = new Array(rsBlocks.length);

			for (var r = 0; r < rsBlocks.length; r += 1) {

				var dcCount = rsBlocks[r].dataCount;
				var ecCount = rsBlocks[r].totalCount - dcCount;

				maxDcCount = Math.max(maxDcCount, dcCount);
				maxEcCount = Math.max(maxEcCount, ecCount);

				dcdata[r] = new Array(dcCount);

				for (var i = 0; i < dcdata[r].length; i += 1) {
					dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
				}
				offset += dcCount;

				var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
				var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

				var modPoly = rawPoly.mod(rsPoly);
				ecdata[r] = new Array(rsPoly.getLength() - 1);
				for (var i = 0; i < ecdata[r].length; i += 1) {
					var modIndex = i + modPoly.getLength() - ecdata[r].length;
					ecdata[r][i] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
				}
			}

			var totalCodeCount = 0;
			for (var i = 0; i < rsBlocks.length; i += 1) {
				totalCodeCount += rsBlocks[i].totalCount;
			}

			var data = new Array(totalCodeCount);
			var index = 0;

			for (var i = 0; i < maxDcCount; i += 1) {
				for (var r = 0; r < rsBlocks.length; r += 1) {
					if (i < dcdata[r].length) {
						data[index] = dcdata[r][i];
						index += 1;
					}
				}
			}

			for (var i = 0; i < maxEcCount; i += 1) {
				for (var r = 0; r < rsBlocks.length; r += 1) {
					if (i < ecdata[r].length) {
						data[index] = ecdata[r][i];
						index += 1;
					}
				}
			}

			return data;
		};

		var createData = function(typeNumber, errorCorrectLevel, dataList) {

			var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);

			var buffer = qrBitBuffer();

			for (var i = 0; i < dataList.length; i += 1) {
				var data = dataList[i];
				buffer.put(data.getMode(), 4);
				buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
				data.write(buffer);
			}

			// calc num max data.
			var totalDataCount = 0;
			for (var i = 0; i < rsBlocks.length; i += 1) {
				totalDataCount += rsBlocks[i].dataCount;
			}

			if (buffer.getLengthInBits() > totalDataCount * 8) {
				throw new Error('code length overflow. ('
					+ buffer.getLengthInBits()
					+ '>'
					+ totalDataCount * 8
					+ ')');
			}

			// end code
			if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
				buffer.put(0, 4);
			}

			// padding
			while (buffer.getLengthInBits() % 8 != 0) {
				buffer.putBit(false);
			}

			// padding
			while (true) {

				if (buffer.getLengthInBits() >= totalDataCount * 8) {
					break;
				}
				buffer.put(PAD0, 8);

				if (buffer.getLengthInBits() >= totalDataCount * 8) {
					break;
				}
				buffer.put(PAD1, 8);
			}

			return createBytes(buffer, rsBlocks);
		};

		_this.addData = function(data) {
			var newData = qr8BitByte(data);
			_dataList.push(newData);
			_dataCache = null;
		};

		_this.isDark = function(row, col) {
			if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
				throw new Error(row + ',' + col);
			}
			return _modules[row][col];
		};

		_this.getModuleCount = function() {
			return _moduleCount;
		};

		_this.make = function() {
			makeImpl(false, getBestMaskPattern() );
		};

		_this.createTableTag = function(cellSize, margin) {

			cellSize = cellSize || 2;
			margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

			var qrHtml = '';

			qrHtml += '<table style="';
			qrHtml += ' border-width: 0px; border-style: none;';
			qrHtml += ' border-collapse: collapse;';
			qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
			qrHtml += '">';
			qrHtml += '<tbody>';

			for (var r = 0; r < _this.getModuleCount(); r += 1) {

				qrHtml += '<tr>';

				for (var c = 0; c < _this.getModuleCount(); c += 1) {
					qrHtml += '<td style="';
					qrHtml += ' border-width: 0px; border-style: none;';
					qrHtml += ' border-collapse: collapse;';
					qrHtml += ' padding: 0px; margin: 0px;';
					qrHtml += ' width: ' + cellSize + 'px;';
					qrHtml += ' height: ' + cellSize + 'px;';
					qrHtml += ' background-color: ';
					qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
					qrHtml += ';';
					qrHtml += '"/>';
				}

				qrHtml += '</tr>';
			}

			qrHtml += '</tbody>';
			qrHtml += '</table>';

			return qrHtml;
		};

		_this.createImgTag = function(cellSize, margin) {

			cellSize = cellSize || 2;
			margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

			var size = _this.getModuleCount() * cellSize + margin * 2;
			var min = margin;
			var max = size - margin;

			return createImgTag(size, size, function(x, y) {
				if (min <= x && x < max && min <= y && y < max) {
					var c = Math.floor( (x - min) / cellSize);
					var r = Math.floor( (y - min) / cellSize);
					return _this.isDark(r, c)? 0 : 1;
				} else {
					return 1;
				}
			} );
		};

		return _this;
	};

	//---------------------------------------------------------------------
	// qrcode.stringToBytes
	//---------------------------------------------------------------------

	qrcode.stringToBytes = function(s) {
		var bytes = new Array();
		for (var i = 0; i < s.length; i += 1) {
			var c = s.charCodeAt(i);
			bytes.push(c & 0xff);
		}
		return bytes;
	};

	//---------------------------------------------------------------------
	// qrcode.createStringToBytes
	//---------------------------------------------------------------------

	/**
	 * @param unicodeData base64 string of byte array.
	 * [16bit Unicode],[16bit Bytes], ...
	 * @param numChars
	 */
	qrcode.createStringToBytes = function(unicodeData, numChars) {

		// create conversion map.

		var unicodeMap = function() {

			var bin = base64DecodeInputStream(unicodeData);
			var read = function() {
				var b = bin.read();
				if (b == -1) throw new Error();
				return b;
			};

			var count = 0;
			var unicodeMap = {};
			while (true) {
				var b0 = bin.read();
				if (b0 == -1) break;
				var b1 = read();
				var b2 = read();
				var b3 = read();
				var k = String.fromCharCode( (b0 << 8) | b1);
				var v = (b2 << 8) | b3;
				unicodeMap[k] = v;
				count += 1;
			}
			if (count != numChars) {
				throw new Error(count + ' != ' + numChars);
			}

			return unicodeMap;
		}();

		var unknownChar = '?'.charCodeAt(0);

		return function(s) {
			var bytes = new Array();
			for (var i = 0; i < s.length; i += 1) {
				var c = s.charCodeAt(i);
				if (c < 128) {
					bytes.push(c);
				} else {
					var b = unicodeMap[s.charAt(i)];
					if (typeof b == 'number') {
						if ( (b & 0xff) == b) {
							// 1byte
							bytes.push(b);
						} else {
							// 2bytes
							bytes.push(b >>> 8);
							bytes.push(b & 0xff);
						}
					} else {
						bytes.push(unknownChar);
					}
				}
			}
			return bytes;
		};
	};

	//---------------------------------------------------------------------
	// QRMode
	//---------------------------------------------------------------------

	var QRMode = {
		MODE_NUMBER :		1 << 0,
		MODE_ALPHA_NUM : 	1 << 1,
		MODE_8BIT_BYTE : 	1 << 2,
		MODE_KANJI :		1 << 3
	};

	//---------------------------------------------------------------------
	// QRErrorCorrectLevel
	//---------------------------------------------------------------------

	var QRErrorCorrectLevel = {
		L : 1,
		M : 0,
		Q : 3,
		H : 2
	};

	//---------------------------------------------------------------------
	// QRMaskPattern
	//---------------------------------------------------------------------

	var QRMaskPattern = {
		PATTERN000 : 0,
		PATTERN001 : 1,
		PATTERN010 : 2,
		PATTERN011 : 3,
		PATTERN100 : 4,
		PATTERN101 : 5,
		PATTERN110 : 6,
		PATTERN111 : 7
	};

	//---------------------------------------------------------------------
	// QRUtil
	//---------------------------------------------------------------------

	var QRUtil = function() {

		var PATTERN_POSITION_TABLE = [
			[],
			[6, 18],
			[6, 22],
			[6, 26],
			[6, 30],
			[6, 34],
			[6, 22, 38],
			[6, 24, 42],
			[6, 26, 46],
			[6, 28, 50],
			[6, 30, 54],
			[6, 32, 58],
			[6, 34, 62],
			[6, 26, 46, 66],
			[6, 26, 48, 70],
			[6, 26, 50, 74],
			[6, 30, 54, 78],
			[6, 30, 56, 82],
			[6, 30, 58, 86],
			[6, 34, 62, 90],
			[6, 28, 50, 72, 94],
			[6, 26, 50, 74, 98],
			[6, 30, 54, 78, 102],
			[6, 28, 54, 80, 106],
			[6, 32, 58, 84, 110],
			[6, 30, 58, 86, 114],
			[6, 34, 62, 90, 118],
			[6, 26, 50, 74, 98, 122],
			[6, 30, 54, 78, 102, 126],
			[6, 26, 52, 78, 104, 130],
			[6, 30, 56, 82, 108, 134],
			[6, 34, 60, 86, 112, 138],
			[6, 30, 58, 86, 114, 142],
			[6, 34, 62, 90, 118, 146],
			[6, 30, 54, 78, 102, 126, 150],
			[6, 24, 50, 76, 102, 128, 154],
			[6, 28, 54, 80, 106, 132, 158],
			[6, 32, 58, 84, 110, 136, 162],
			[6, 26, 54, 82, 110, 138, 166],
			[6, 30, 58, 86, 114, 142, 170]
		];
		var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
		var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
		var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

		var _this = {};

		var getBCHDigit = function(data) {
			var digit = 0;
			while (data != 0) {
				digit += 1;
				data >>>= 1;
			}
			return digit;
		};

		_this.getBCHTypeInfo = function(data) {
			var d = data << 10;
			while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
				d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
			}
			return ( (data << 10) | d) ^ G15_MASK;
		};

		_this.getBCHTypeNumber = function(data) {
			var d = data << 12;
			while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
				d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
			}
			return (data << 12) | d;
		};

		_this.getPatternPosition = function(typeNumber) {
			return PATTERN_POSITION_TABLE[typeNumber - 1];
		};

		_this.getMaskFunction = function(maskPattern) {

			switch (maskPattern) {

			case QRMaskPattern.PATTERN000 :
				return function(i, j) { return (i + j) % 2 == 0; };
			case QRMaskPattern.PATTERN001 :
				return function(i, j) { return i % 2 == 0; };
			case QRMaskPattern.PATTERN010 :
				return function(i, j) { return j % 3 == 0; };
			case QRMaskPattern.PATTERN011 :
				return function(i, j) { return (i + j) % 3 == 0; };
			case QRMaskPattern.PATTERN100 :
				return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
			case QRMaskPattern.PATTERN101 :
				return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
			case QRMaskPattern.PATTERN110 :
				return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
			case QRMaskPattern.PATTERN111 :
				return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

			default :
				throw new Error('bad maskPattern:' + maskPattern);
			}
		};

		_this.getErrorCorrectPolynomial = function(errorCorrectLength) {
			var a = qrPolynomial([1], 0);
			for (var i = 0; i < errorCorrectLength; i += 1) {
				a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
			}
			return a;
		};

		_this.getLengthInBits = function(mode, type) {

			if (1 <= type && type < 10) {

				// 1 - 9

				switch(mode) {
				case QRMode.MODE_NUMBER 	: return 10;
				case QRMode.MODE_ALPHA_NUM 	: return 9;
				case QRMode.MODE_8BIT_BYTE	: return 8;
				case QRMode.MODE_KANJI		: return 8;
				default :
					throw new Error('mode:' + mode);
				}

			} else if (type < 27) {

				// 10 - 26

				switch(mode) {
				case QRMode.MODE_NUMBER 	: return 12;
				case QRMode.MODE_ALPHA_NUM 	: return 11;
				case QRMode.MODE_8BIT_BYTE	: return 16;
				case QRMode.MODE_KANJI		: return 10;
				default :
					throw new Error('mode:' + mode);
				}

			} else if (type < 41) {

				// 27 - 40

				switch(mode) {
				case QRMode.MODE_NUMBER 	: return 14;
				case QRMode.MODE_ALPHA_NUM	: return 13;
				case QRMode.MODE_8BIT_BYTE	: return 16;
				case QRMode.MODE_KANJI		: return 12;
				default :
					throw new Error('mode:' + mode);
				}

			} else {
				throw new Error('type:' + type);
			}
		};

		_this.getLostPoint = function(qrcode) {

			var moduleCount = qrcode.getModuleCount();

			var lostPoint = 0;

			// LEVEL1

			for (var row = 0; row < moduleCount; row += 1) {
				for (var col = 0; col < moduleCount; col += 1) {

					var sameCount = 0;
					var dark = qrcode.isDark(row, col);

					for (var r = -1; r <= 1; r += 1) {

						if (row + r < 0 || moduleCount <= row + r) {
							continue;
						}

						for (var c = -1; c <= 1; c += 1) {

							if (col + c < 0 || moduleCount <= col + c) {
								continue;
							}

							if (r == 0 && c == 0) {
								continue;
							}

							if (dark == qrcode.isDark(row + r, col + c) ) {
								sameCount += 1;
							}
						}
					}

					if (sameCount > 5) {
						lostPoint += (3 + sameCount - 5);
					}
				}
			};

			// LEVEL2

			for (var row = 0; row < moduleCount - 1; row += 1) {
				for (var col = 0; col < moduleCount - 1; col += 1) {
					var count = 0;
					if (qrcode.isDark(row, col) ) count += 1;
					if (qrcode.isDark(row + 1, col) ) count += 1;
					if (qrcode.isDark(row, col + 1) ) count += 1;
					if (qrcode.isDark(row + 1, col + 1) ) count += 1;
					if (count == 0 || count == 4) {
						lostPoint += 3;
					}
				}
			}

			// LEVEL3

			for (var row = 0; row < moduleCount; row += 1) {
				for (var col = 0; col < moduleCount - 6; col += 1) {
					if (qrcode.isDark(row, col)
							&& !qrcode.isDark(row, col + 1)
							&&  qrcode.isDark(row, col + 2)
							&&  qrcode.isDark(row, col + 3)
							&&  qrcode.isDark(row, col + 4)
							&& !qrcode.isDark(row, col + 5)
							&&  qrcode.isDark(row, col + 6) ) {
						lostPoint += 40;
					}
				}
			}

			for (var col = 0; col < moduleCount; col += 1) {
				for (var row = 0; row < moduleCount - 6; row += 1) {
					if (qrcode.isDark(row, col)
							&& !qrcode.isDark(row + 1, col)
							&&  qrcode.isDark(row + 2, col)
							&&  qrcode.isDark(row + 3, col)
							&&  qrcode.isDark(row + 4, col)
							&& !qrcode.isDark(row + 5, col)
							&&  qrcode.isDark(row + 6, col) ) {
						lostPoint += 40;
					}
				}
			}

			// LEVEL4

			var darkCount = 0;

			for (var col = 0; col < moduleCount; col += 1) {
				for (var row = 0; row < moduleCount; row += 1) {
					if (qrcode.isDark(row, col) ) {
						darkCount += 1;
					}
				}
			}

			var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
			lostPoint += ratio * 10;

			return lostPoint;
		};

		return _this;
	}();

	//---------------------------------------------------------------------
	// QRMath
	//---------------------------------------------------------------------

	var QRMath = function() {

		var EXP_TABLE = new Array(256);
		var LOG_TABLE = new Array(256);

		// initialize tables
		for (var i = 0; i < 8; i += 1) {
			EXP_TABLE[i] = 1 << i;
		}
		for (var i = 8; i < 256; i += 1) {
			EXP_TABLE[i] = EXP_TABLE[i - 4]
				^ EXP_TABLE[i - 5]
				^ EXP_TABLE[i - 6]
				^ EXP_TABLE[i - 8];
		}
		for (var i = 0; i < 255; i += 1) {
			LOG_TABLE[EXP_TABLE[i] ] = i;
		}

		var _this = {};

		_this.glog = function(n) {

			if (n < 1) {
				throw new Error('glog(' + n + ')');
			}

			return LOG_TABLE[n];
		};

		_this.gexp = function(n) {

			while (n < 0) {
				n += 255;
			}

			while (n >= 256) {
				n -= 255;
			}

			return EXP_TABLE[n];
		};

		return _this;
	}();

	//---------------------------------------------------------------------
	// qrPolynomial
	//---------------------------------------------------------------------

	function qrPolynomial(num, shift) {

		if (typeof num.length == 'undefined') {
			throw new Error(num.length + '/' + shift);
		}

		var _num = function() {
			var offset = 0;
			while (offset < num.length && num[offset] == 0) {
				offset += 1;
			}
			var _num = new Array(num.length - offset + shift);
			for (var i = 0; i < num.length - offset; i += 1) {
				_num[i] = num[i + offset];
			}
			return _num;
		}();

		var _this = {};

		_this.get = function(index) {
			return _num[index];
		};

		_this.getLength = function() {
			return _num.length;
		};

		_this.multiply = function(e) {

			var num = new Array(_this.getLength() + e.getLength() - 1);

			for (var i = 0; i < _this.getLength(); i += 1) {
				for (var j = 0; j < e.getLength(); j += 1) {
					num[i + j] ^= QRMath.gexp(QRMath.glog(_this.get(i) ) + QRMath.glog(e.get(j) ) );
				}
			}

			return qrPolynomial(num, 0);
		};

		_this.mod = function(e) {

			if (_this.getLength() - e.getLength() < 0) {
				return _this;
			}

			var ratio = QRMath.glog(_this.get(0) ) - QRMath.glog(e.get(0) );

			var num = new Array(_this.getLength() );
			for (var i = 0; i < _this.getLength(); i += 1) {
				num[i] = _this.get(i);
			}

			for (var i = 0; i < e.getLength(); i += 1) {
				num[i] ^= QRMath.gexp(QRMath.glog(e.get(i) ) + ratio);
			}

			// recursive call
			return qrPolynomial(num, 0).mod(e);
		};

		return _this;
	};

	//---------------------------------------------------------------------
	// QRRSBlock
	//---------------------------------------------------------------------

	var QRRSBlock = function() {

		var RS_BLOCK_TABLE = [

			// L
			// M
			// Q
			// H

			// 1
			[1, 26, 19],
			[1, 26, 16],
			[1, 26, 13],
			[1, 26, 9],

			// 2
			[1, 44, 34],
			[1, 44, 28],
			[1, 44, 22],
			[1, 44, 16],

			// 3
			[1, 70, 55],
			[1, 70, 44],
			[2, 35, 17],
			[2, 35, 13],

			// 4
			[1, 100, 80],
			[2, 50, 32],
			[2, 50, 24],
			[4, 25, 9],

			// 5
			[1, 134, 108],
			[2, 67, 43],
			[2, 33, 15, 2, 34, 16],
			[2, 33, 11, 2, 34, 12],

			// 6
			[2, 86, 68],
			[4, 43, 27],
			[4, 43, 19],
			[4, 43, 15],

			// 7
			[2, 98, 78],
			[4, 49, 31],
			[2, 32, 14, 4, 33, 15],
			[4, 39, 13, 1, 40, 14],

			// 8
			[2, 121, 97],
			[2, 60, 38, 2, 61, 39],
			[4, 40, 18, 2, 41, 19],
			[4, 40, 14, 2, 41, 15],

			// 9
			[2, 146, 116],
			[3, 58, 36, 2, 59, 37],
			[4, 36, 16, 4, 37, 17],
			[4, 36, 12, 4, 37, 13],

			// 10
			[2, 86, 68, 2, 87, 69],
			[4, 69, 43, 1, 70, 44],
			[6, 43, 19, 2, 44, 20],
			[6, 43, 15, 2, 44, 16]
		];

		var qrRSBlock = function(totalCount, dataCount) {
			var _this = {};
			_this.totalCount = totalCount;
			_this.dataCount = dataCount;
			return _this;
		};

		var _this = {};

		var getRsBlockTable = function(typeNumber, errorCorrectLevel) {

			switch(errorCorrectLevel) {
			case QRErrorCorrectLevel.L :
				return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
			case QRErrorCorrectLevel.M :
				return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
			case QRErrorCorrectLevel.Q :
				return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
			case QRErrorCorrectLevel.H :
				return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
			default :
				return undefined;
			}
		};

		_this.getRSBlocks = function(typeNumber, errorCorrectLevel) {

			var rsBlock = getRsBlockTable(typeNumber, errorCorrectLevel);

			if (typeof rsBlock == 'undefined') {
				throw new Error('bad rs block @ typeNumber:' + typeNumber +
						'/errorCorrectLevel:' + errorCorrectLevel);
			}

			var length = rsBlock.length / 3;

			var list = new Array();

			for (var i = 0; i < length; i += 1) {

				var count = rsBlock[i * 3 + 0];
				var totalCount = rsBlock[i * 3 + 1];
				var dataCount = rsBlock[i * 3 + 2];

				for (var j = 0; j < count; j += 1) {
					list.push(qrRSBlock(totalCount, dataCount) );
				}
			}

			return list;
		};

		return _this;
	}();

	//---------------------------------------------------------------------
	// qrBitBuffer
	//---------------------------------------------------------------------

	var qrBitBuffer = function() {

		var _buffer = new Array();
		var _length = 0;

		var _this = {};

		_this.getBuffer = function() {
			return _buffer;
		};

		_this.get = function(index) {
			var bufIndex = Math.floor(index / 8);
			return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
		};

		_this.put = function(num, length) {
			for (var i = 0; i < length; i += 1) {
				_this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
			}
		};

		_this.getLengthInBits = function() {
			return _length;
		};

		_this.putBit = function(bit) {

			var bufIndex = Math.floor(_length / 8);
			if (_buffer.length <= bufIndex) {
				_buffer.push(0);
			}

			if (bit) {
				_buffer[bufIndex] |= (0x80 >>> (_length % 8) );
			}

			_length += 1;
		};

		return _this;
	};

	//---------------------------------------------------------------------
	// qr8BitByte
	//---------------------------------------------------------------------

	var qr8BitByte = function(data) {

		var _mode = QRMode.MODE_8BIT_BYTE;
		var _data = data;
		var _bytes = qrcode.stringToBytes(data);

		var _this = {};

		_this.getMode = function() {
			return _mode;
		};

		_this.getLength = function(buffer) {
			return _bytes.length;
		};

		_this.write = function(buffer) {
			for (var i = 0; i < _bytes.length; i += 1) {
				buffer.put(_bytes[i], 8);
			}
		};

		return _this;
	};

	//=====================================================================
	// GIF Support etc.
	//

	//---------------------------------------------------------------------
	// byteArrayOutputStream
	//---------------------------------------------------------------------

	var byteArrayOutputStream = function() {

		var _bytes = new Array();

		var _this = {};

		_this.writeByte = function(b) {
			_bytes.push(b & 0xff);
		};

		_this.writeShort = function(i) {
			_this.writeByte(i);
			_this.writeByte(i >>> 8);
		};

		_this.writeBytes = function(b, off, len) {
			off = off || 0;
			len = len || b.length;
			for (var i = 0; i < len; i += 1) {
				_this.writeByte(b[i + off]);
			}
		};

		_this.writeString = function(s) {
			for (var i = 0; i < s.length; i += 1) {
				_this.writeByte(s.charCodeAt(i) );
			}
		};

		_this.toByteArray = function() {
			return _bytes;
		};

		_this.toString = function() {
			var s = '';
			s += '[';
			for (var i = 0; i < _bytes.length; i += 1) {
				if (i > 0) {
					s += ',';
				}
				s += _bytes[i];
			}
			s += ']';
			return s;
		};

		return _this;
	};

	//---------------------------------------------------------------------
	// base64EncodeOutputStream
	//---------------------------------------------------------------------

	var base64EncodeOutputStream = function() {

		var _buffer = 0;
		var _buflen = 0;
		var _length = 0;
		var _base64 = '';

		var _this = {};

		var writeEncoded = function(b) {
			_base64 += String.fromCharCode(encode(b & 0x3f) );
		};

		var encode = function(n) {
			if (n < 0) {
				// error.
			} else if (n < 26) {
				return 0x41 + n;
			} else if (n < 52) {
				return 0x61 + (n - 26);
			} else if (n < 62) {
				return 0x30 + (n - 52);
			} else if (n == 62) {
				return 0x2b;
			} else if (n == 63) {
				return 0x2f;
			}
			throw new Error('n:' + n);
		};

		_this.writeByte = function(n) {

			_buffer = (_buffer << 8) | (n & 0xff);
			_buflen += 8;
			_length += 1;

			while (_buflen >= 6) {
				writeEncoded(_buffer >>> (_buflen - 6) );
				_buflen -= 6;
			}
		};

		_this.flush = function() {

			if (_buflen > 0) {
				writeEncoded(_buffer << (6 - _buflen) );
				_buffer = 0;
				_buflen = 0;
			}

			if (_length % 3 != 0) {
				// padding
				var padlen = 3 - _length % 3;
				for (var i = 0; i < padlen; i += 1) {
					_base64 += '=';
				}
			}
		};

		_this.toString = function() {
			return _base64;
		};

		return _this;
	};

	//---------------------------------------------------------------------
	// base64DecodeInputStream
	//---------------------------------------------------------------------

	var base64DecodeInputStream = function(str) {

		var _str = str;
		var _pos = 0;
		var _buffer = 0;
		var _buflen = 0;

		var _this = {};

		_this.read = function() {

			while (_buflen < 8) {

				if (_pos >= _str.length) {
					if (_buflen == 0) {
						return -1;
					}
					throw new Error('unexpected end of file./' + _buflen);
				}

				var c = _str.charAt(_pos);
				_pos += 1;

				if (c == '=') {
					_buflen = 0;
					return -1;
				} else if (c.match(/^\s$/) ) {
					// ignore if whitespace.
					continue;
				}

				_buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
				_buflen += 6;
			}

			var n = (_buffer >>> (_buflen - 8) ) & 0xff;
			_buflen -= 8;
			return n;
		};

		var decode = function(c) {
			if (0x41 <= c && c <= 0x5a) {
				return c - 0x41;
			} else if (0x61 <= c && c <= 0x7a) {
				return c - 0x61 + 26;
			} else if (0x30 <= c && c <= 0x39) {
				return c - 0x30 + 52;
			} else if (c == 0x2b) {
				return 62;
			} else if (c == 0x2f) {
				return 63;
			} else {
				throw new Error('c:' + c);
			}
		};

		return _this;
	};

	//---------------------------------------------------------------------
	// gifImage (B/W)
	//---------------------------------------------------------------------

	var gifImage = function(width, height) {

		var _width = width;
		var _height = height;
		var _data = new Array(width * height);

		var _this = {};

		_this.setPixel = function(x, y, pixel) {
			_data[y * _width + x] = pixel;
		};

		_this.write = function(out) {

			//---------------------------------
			// GIF Signature

			out.writeString('GIF87a');

			//---------------------------------
			// Screen Descriptor

			out.writeShort(_width);
			out.writeShort(_height);

			out.writeByte(0x80); // 2bit
			out.writeByte(0);
			out.writeByte(0);

			//---------------------------------
			// Global Color Map

			// black
			out.writeByte(0x00);
			out.writeByte(0x00);
			out.writeByte(0x00);

			// white
			out.writeByte(0xff);
			out.writeByte(0xff);
			out.writeByte(0xff);

			//---------------------------------
			// Image Descriptor

			out.writeString(',');
			out.writeShort(0);
			out.writeShort(0);
			out.writeShort(_width);
			out.writeShort(_height);
			out.writeByte(0);

			//---------------------------------
			// Local Color Map

			//---------------------------------
			// Raster Data

			var lzwMinCodeSize = 2;
			var raster = getLZWRaster(lzwMinCodeSize);

			out.writeByte(lzwMinCodeSize);

			var offset = 0;

			while (raster.length - offset > 255) {
				out.writeByte(255);
				out.writeBytes(raster, offset, 255);
				offset += 255;
			}

			out.writeByte(raster.length - offset);
			out.writeBytes(raster, offset, raster.length - offset);
			out.writeByte(0x00);

			//---------------------------------
			// GIF Terminator
			out.writeString(';');
		};

		var bitOutputStream = function(out) {

			var _out = out;
			var _bitLength = 0;
			var _bitBuffer = 0;

			var _this = {};

			_this.write = function(data, length) {

				if ( (data >>> length) != 0) {
					throw new Error('length over');
				}

				while (_bitLength + length >= 8) {
					_out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
					length -= (8 - _bitLength);
					data >>>= (8 - _bitLength);
					_bitBuffer = 0;
					_bitLength = 0;
				}

				_bitBuffer = (data << _bitLength) | _bitBuffer;
				_bitLength = _bitLength + length;
			};

			_this.flush = function() {
				if (_bitLength > 0) {
					_out.writeByte(_bitBuffer);
				}
			};

			return _this;
		};

		var getLZWRaster = function(lzwMinCodeSize) {

			var clearCode = 1 << lzwMinCodeSize;
			var endCode = (1 << lzwMinCodeSize) + 1;
			var bitLength = lzwMinCodeSize + 1;

			// Setup LZWTable
			var table = lzwTable();

			for (var i = 0; i < clearCode; i += 1) {
				table.add(String.fromCharCode(i) );
			}
			table.add(String.fromCharCode(clearCode) );
			table.add(String.fromCharCode(endCode) );

			var byteOut = byteArrayOutputStream();
			var bitOut = bitOutputStream(byteOut);

			// clear code
			bitOut.write(clearCode, bitLength);

			var dataIndex = 0;

			var s = String.fromCharCode(_data[dataIndex]);
			dataIndex += 1;

			while (dataIndex < _data.length) {

				var c = String.fromCharCode(_data[dataIndex]);
				dataIndex += 1;

				if (table.contains(s + c) ) {

					s = s + c;

				} else {

					bitOut.write(table.indexOf(s), bitLength);

					if (table.size() < 0xfff) {

						if (table.size() == (1 << bitLength) ) {
							bitLength += 1;
						}

						table.add(s + c);
					}

					s = c;
				}
			}

			bitOut.write(table.indexOf(s), bitLength);

			// end code
			bitOut.write(endCode, bitLength);

			bitOut.flush();

			return byteOut.toByteArray();
		};

		var lzwTable = function() {

			var _map = {};
			var _size = 0;

			var _this = {};

			_this.add = function(key) {
				if (_this.contains(key) ) {
					throw new Error('dup key:' + key);
				}
				_map[key] = _size;
				_size += 1;
			};

			_this.size = function() {
				return _size;
			};

			_this.indexOf = function(key) {
				return _map[key];
			};

			_this.contains = function(key) {
				return typeof _map[key] != 'undefined';
			};

			return _this;
		};

		return _this;
	};

	var createImgTag = function(width, height, getPixel, alt) {

		var gif = gifImage(width, height);
		for (var y = 0; y < height; y += 1) {
			for (var x = 0; x < width; x += 1) {
				gif.setPixel(x, y, getPixel(x, y) );
			}
		}

		var b = byteArrayOutputStream();
		gif.write(b);

		var base64 = base64EncodeOutputStream();
		var bytes = b.toByteArray();
		for (var i = 0; i < bytes.length; i += 1) {
			base64.writeByte(bytes[i]);
		}
		base64.flush();

		var img = '';
		img += '<img';
		img += '\u0020src="';
		img += 'data:image/gif;base64,';
		img += base64;
		img += '"';
		img += '\u0020width="';
		img += width;
		img += '"';
		img += '\u0020height="';
		img += height;
		img += '"';
		if (alt) {
			img += '\u0020alt="';
			img += alt;
			img += '"';
		}
		img += '/>';

		return img;
	};

	//---------------------------------------------------------------------
	// returns qrcode function.

	return qrcode;
}();

},{}],4:[function(_dereq_,module,exports){
module.exports = (function ($) {
    "use strict";
    function getJsonWithPromise(url) {

        return $.getJSON(url);
    }

    function get(path) {
        return $.get(path);
    }

    function postWithPromise(url, data) {
        return $.post(url, data);
    }

    function post(path, data, success, error) {
        $.ajax({
            url: path,
            type: 'POST',
            data: data,
            success: success,
            error: error
        });
    }

    function put(path, data, success, error) {
        $.ajax(
            {
                url: path,
                type: 'PUT',
                data: data,
                success: success,
                error: error
            });
    }

    function putWithPromise(path, data) {
        return $.ajax({
            url: path,
            type: 'PUT',
            data: data,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });
    }

    function remove(path) {
        return $.ajax({
            url: path,
            type: 'DELETE'
        });
    }

    return {
        getJsonWithPromise: getJsonWithPromise,
        get: get,
        postWithPromise: postWithPromise,
        post: post,
        putWithPromise: putWithPromise,
        put: put,
        remove: remove
    };
})(jQuery);


},{}],5:[function(_dereq_,module,exports){
var director = _dereq_('director'),
    viewEngine = _dereq_('../infrastructure/view_engine');

var routes = {
    "/weixin/join/activity/:open_id/:activity_id": function (openId, activityId) {
        viewEngine.bindView("/join-activity", {
            openId: openId,
            activityId: activityId
        });
    }
};

module.exports = {

    configure: function () {
        var router = new director.Router(routes);

        router.init();
        return router;
    }
};
},{"../infrastructure/view_engine":6,"director":1}],6:[function(_dereq_,module,exports){
var viewResolver = _dereq_('./view_resolver'),
    viewModelResolver = _dereq_('./view_model_resolver');

function doBind(ViewModel, view, data) {
    'use strict';
    $(function () {
        ko.postbox.reset();
        var sfView = document.getElementById('sf-view');
        $(sfView).html(view);
        ko.cleanNode(sfView);
        ko.applyBindings(new ViewModel(data), sfView);
    });
}

function viewResolverComplete(routeName, view, data) {
    var viewModel = viewModelResolver.resolveViewModel(routeName);
    doBind(viewModel, view, data);
}

module.exports = {
    bindView: function (routeName, data) {

        return viewResolver.resolveView(routeName)
            .done(function (view) {
                viewResolverComplete(routeName, view, data);
            });
    }
};

},{"./view_model_resolver":7,"./view_resolver":8}],7:[function(_dereq_,module,exports){
//TODO Require this in the future

//var StaffingProxyViewModel = require('../view_models/staffing_proxy_view_model');
//var OpportunityDetailsModel = require('../view_models/opportunity_view_model');
//var OpportunityRoleViewModel = require('../view_models/opportunity_role_view_model');

//var viewModels = {
//    "/role": StaffingProxyViewModel,
//    "/opportunity-details": OpportunityDetailsModel,
//    "/opportunity-staffing": OpportunityRoleViewModel
//};
//
//module.exports = {
//    resolveViewModel: function (routeName) {
//        return viewModels[routeName];
//    }
//};
},{}],8:[function(_dereq_,module,exports){
var ajaxWrapper = _dereq_('../ajax_wrapper');

module.exports = (function () {
    'use strict';
    var viewBase = "/views/partials",
        viewBaseExtension = ".html",
        viewCache = {};

    return {
        resolveView: function (routeName) {
            var deferred = $.Deferred();

            if (viewCache.hasOwnProperty(routeName)) {
                var cachedView = viewCache[routeName];
                deferred.resolve($.parseHTML(cachedView));
            }
            else {
                ajaxWrapper.get(viewBase + routeName.toLowerCase() + viewBaseExtension)
                    .done(function (viewAsString) {
                        viewCache[routeName] = viewAsString;
                        deferred.resolve($.parseHTML(viewAsString));
                    })
                    .fail(function () {
                        deferred.reject('View not found at route');
                    });
            }
            return deferred.promise();
        }
    };
})();
},{"../ajax_wrapper":4}],9:[function(_dereq_,module,exports){
var domReady = _dereq_('domready'),
    routeConfig = _dereq_('./config/routes'),
    router;

module.exports.homePageViewModelFactory = _dereq_("./view_models/home_page_view_model_factory");
module.exports.activityPageViewModelFactory = _dereq_("./view_models/activity_page_view_model_factory");
module.exports.joinActivityPageViewModelFactory = _dereq_("./view_models/join_activity_page_view_model_factory");
module.exports.databaseUpdateViewModelFactory = _dereq_("./view_models/database_update_view_model_factory");

domReady(function () {
    router = routeConfig.configure();
    module.exports.router = router;
});


},{"./config/routes":5,"./view_models/activity_page_view_model_factory":13,"./view_models/database_update_view_model_factory":16,"./view_models/home_page_view_model_factory":17,"./view_models/join_activity_page_view_model_factory":19,"domready":2}],10:[function(_dereq_,module,exports){
var ajax = _dereq_('../ajax_wrapper');

module.exports = {

    getAllActivities: function () {
        var deferred = $.Deferred();

        ajax.getJsonWithPromise('/weixin/get/all/activities')
            .done(function (activities) {
                deferred.resolve(activities);
            });
        return deferred.promise();
    }
};
},{"../ajax_wrapper":4}],11:[function(_dereq_,module,exports){
var ajax = _dereq_('../ajax_wrapper');

module.exports = {

    getUserActivityStatus: function (openId, activityId) {
        var deferred = $.Deferred();

        var params = 'ihakula_request=ihakula_northern_hemisphere'
            + '&open_id=' + openId
            + '&activity_id=' + activityId;
        ajax.getJsonWithPromise('/weixin/get/user/activity/status?' + params)
            .done(function (userActivityInfo) {
                deferred.resolve(userActivityInfo);
            });
        return deferred.promise();
    },

    drawPrize: function (openId, activityId) {
        var deferred = $.Deferred();

        var params = openId + '/' + activityId +  '?ihakula_request=ihakula_northern_hemisphere';
        ajax.getJsonWithPromise('/weixin/user/draw/prize/' + params)
            .done(function (userActivityInfo) {
                deferred.resolve(userActivityInfo);
            });
        return deferred.promise();
    }
};
},{"../ajax_wrapper":4}],12:[function(_dereq_,module,exports){
var ajax = _dereq_('../ajax_wrapper');

module.exports = {

    getAllSaleRecords: function () {
        var deferred = $.Deferred();

        ajax.getJsonWithPromise('/sale/records')
            .done(function (records) {
                deferred.resolve(records);
            });
        return deferred.promise();
    }
};
},{"../ajax_wrapper":4}],13:[function(_dereq_,module,exports){
var ActivityPageViewModel = _dereq_('./activitypage_view_model');

module.exports = {
    applyToPage: function() {
        var sfView = document.getElementById('sf-view');
        ko.applyBindings(new ActivityPageViewModel(), sfView);
    }
};
},{"./activitypage_view_model":14}],14:[function(_dereq_,module,exports){
var sales_service = _dereq_('../services/activity_service.js');

module.exports = (function () {
    'use strict';
    var self;

    function HomepageViewModel() {
        self = this;
        self.usersIdArr = null;
        self.usersDetailDic = null;
        self.usersSaleDic = null;
        self.accountFieldArr = null;
        self.accountFieldDetailArr = null;
        self.activities = ko.observableArray([]);
        self.userFinacial = ko.observableArray([]);
        self.isLoading = ko.observable(true);

        self.initialise();

        self.cacheCaches = function(data){
            self.usersIdArr = data["users"].split(",");
            self.usersDetailDic = data["users_detail_info"];
            self.usersSaleDic = data["users_sale_records"];
            self.accountFieldArr = data["account_field"];
            self.accountFieldDetailArr = data["account_field_detail"];
        };

        self.caculateRecords = function(){
            var allRecords = [];
            var totalEarn = 0.0;
            var totalCost = 0.0;
            var userCostAndEarn = [];
            _.each(self.usersIdArr, function(userId){
                var userEarn = 0.0;
                var userCost = 0.0;
                var userName = self.usersDetailDic[userId]['user_nickname'];
                var personRecords = self.usersSaleDic[userId];
                _.each(personRecords, function (record) {
                    var item = getFieldByFieldID(record.field_id)[0];
                    var itemDetail = getFieldDetailByFieldDetailId(record.field_detail_id)[0];
                    var startSign = item.type ? '(+) ' : '(-) ';
                    var text = startSign;
                    if (item.type) {
                        userEarn += record.money;
                    } else {
                        userCost += record.money;
                    }
                    text += item.field + ':' + itemDetail.name + ' ' + record.money + '(CNY); ' + record.description;
                    allRecords.push({
                        'text': text,
                        'date': record.date,
                        'money': startSign + record.money,
                        'user': userName
                    });
                });
                userCostAndEarn.push({
                    'text': userName,
                    'totalCost': userCost,
                    'totalEarn': userEarn,
                    'revenue': (userEarn - userCost).toFixed(2)
                });
                totalCost += userCost;
                totalEarn += userEarn;
            });

            self.userFinacial([{
                'text': '合计',
                'totalCost': totalCost,
                'totalEarn': totalEarn,
                'revenue': (totalEarn - totalCost).toFixed(2)
            }].concat(userCostAndEarn));

            var sortedRecords = _.chain(allRecords)
                .sortBy(function (record) {
                    return record.date;
                })
                .reverse()
                .value();
            self.saleRecords(sortedRecords);
        };

        function getFieldByFieldID (fieldId){
            return _.filter(self.accountFieldArr, function(field){
                return field["ID"] === fieldId;
            });
        };

        function getFieldDetailByFieldDetailId (detailId){
            return _.filter(self.accountFieldDetailArr, function(field){
                return field["ID"] === detailId;
            });
        };
    };

    HomepageViewModel.prototype.initialise = function () {
        return sales_service.getAllActivities()
            .done(function (data) {
                console.log(data);
                self.cacheCaches(data);
                self.caculateRecords();
                self.isLoading(false);
            });
    };

    return HomepageViewModel;
})();
},{"../services/activity_service.js":10}],15:[function(_dereq_,module,exports){
var sales_service = _dereq_('../services/sales_service.js');

module.exports = (function () {
    'use strict';
    var self;

    function DatabaseUpdateViewModel() {
        self = this;
        self.usersIdArr = null;
        self.usersDetailDic = null;
        self.usersSaleDic = null;
        self.accountFieldArr = null;
        self.accountFieldDetailArr = null;
        self.saleRecords = ko.observableArray([]);
        self.userFinacial = ko.observableArray([]);
        self.isLoading = ko.observable(true);

        self.initialise();

        self.cacheCaches = function(data){
            self.usersIdArr = data["users"].split(",");
            self.usersDetailDic = data["users_detail_info"];
            self.usersSaleDic = data["users_sale_records"];
            self.accountFieldArr = data["account_field"];
            self.accountFieldDetailArr = data["account_field_detail"];
        };

        self.caculateRecords = function(){
            var allRecords = [];
            var totalEarn = 0.0;
            var totalCost = 0.0;
            var userCostAndEarn = [];
            _.each(self.usersIdArr, function(userId){
                var userEarn = 0.0;
                var userCost = 0.0;
                var userName = self.usersDetailDic[userId]['user_nickname'];
                var personRecords = self.usersSaleDic[userId];
                _.each(personRecords, function (record) {
                    var item = getFieldByFieldID(record.field_id)[0];
                    var itemDetail = getFieldDetailByFieldDetailId(record.field_detail_id)[0];
                    var startSign = item.type ? '(+) ' : '(-) ';
                    var text = startSign;
                    if (item.type) {
                        userEarn += record.money;
                    } else {
                        userCost += record.money;
                    }
                    text += item.field + ':' + itemDetail.name + ' ' + record.money + '(CNY); ' + record.description;
                    allRecords.push({
                        'text': text,
                        'date': record.date,
                        'money': startSign + record.money,
                        'user': userName
                    });
                });
                userCostAndEarn.push({
                    'text': userName,
                    'totalCost': userCost,
                    'totalEarn': userEarn,
                    'revenue': (userEarn - userCost).toFixed(2)
                });
                totalCost += userCost;
                totalEarn += userEarn;
            });

            self.userFinacial([{
                'text': '合计',
                'totalCost': totalCost,
                'totalEarn': totalEarn,
                'revenue': (totalEarn - totalCost).toFixed(2)
            }].concat(userCostAndEarn));

            var sortedRecords = _.chain(allRecords)
                .sortBy(function (record) {
                    return record.date;
                })
                .reverse()
                .value();
            self.saleRecords(sortedRecords);
        };

        function getFieldByFieldID (fieldId){
            return _.filter(self.accountFieldArr, function(field){
                return field["ID"] === fieldId;
            });
        };

        function getFieldDetailByFieldDetailId (detailId){
            return _.filter(self.accountFieldDetailArr, function(field){
                return field["ID"] === detailId;
            });
        };
    };

    DatabaseUpdateViewModel.prototype.initialise = function () {
        return sales_service.getAllSaleRecords()
            .done(function (data) {
                console.log(data);
                self.cacheCaches(data);
                self.caculateRecords();
                self.isLoading(false);
            });
    };

    return DatabaseUpdateViewModel;
})();
},{"../services/sales_service.js":12}],16:[function(_dereq_,module,exports){
var DatabaseViewModel = _dereq_('./database_update_view_model');

module.exports = {
    applyToPage: function() {
        var sfView = document.getElementById('sf-view');
        ko.applyBindings(new DatabaseViewModel(), sfView);
    }
};
},{"./database_update_view_model":15}],17:[function(_dereq_,module,exports){
var HomePageViewModel = _dereq_('./homepage_view_model');

module.exports = {
    applyToPage: function() {
        var sfView = document.getElementById('sf-view');
        ko.applyBindings(new HomePageViewModel(), sfView);
    }
};
},{"./homepage_view_model":18}],18:[function(_dereq_,module,exports){
var sales_service = _dereq_('../services/sales_service.js');

module.exports = (function () {
    'use strict';
    var self;

    function HomepageViewModel() {
        self = this;
        self.usersIdArr = null;
        self.usersDetailDic = null;
        self.usersSaleDic = null;
        self.accountFieldArr = null;
        self.accountFieldDetailArr = null;
        self.saleRecords = ko.observableArray([]);
        self.userFinacial = ko.observableArray([]);
        self.isLoading = ko.observable(true);

        self.initialise();

        self.cacheCaches = function(data){
            self.usersIdArr = data["users"].split(",");
            self.usersDetailDic = data["users_detail_info"];
            self.usersSaleDic = data["users_sale_records"];
            self.accountFieldArr = data["account_field"];
            self.accountFieldDetailArr = data["account_field_detail"];
        };

        self.caculateRecords = function(){
            var allRecords = [];
            var totalEarn = 0.0;
            var totalCost = 0.0;
            var userCostAndEarn = [];
            _.each(self.usersIdArr, function(userId){
                var userEarn = 0.0;
                var userCost = 0.0;
                var userName = self.usersDetailDic[userId]['user_nickname'];
                var personRecords = self.usersSaleDic[userId];
                _.each(personRecords, function (record) {
                    var item = getFieldByFieldID(record.field_id)[0];
                    var itemDetail = getFieldDetailByFieldDetailId(record.field_detail_id)[0];
                    var startSign = item.type ? '(+) ' : '(-) ';
                    var text = startSign;
                    if (item.type) {
                        userEarn += record.money;
                    } else {
                        userCost += record.money;
                    }
                    text += item.field + ':' + itemDetail.name + ' ' + record.money + '(CNY); ' + record.description;
                    allRecords.push({
                        'text': text,
                        'date': record.date,
                        'money': startSign + record.money,
                        'user': userName
                    });
                });
                userCostAndEarn.push({
                    'text': userName,
                    'totalCost': userCost,
                    'totalEarn': userEarn,
                    'revenue': (userEarn - userCost).toFixed(2)
                });
                totalCost += userCost;
                totalEarn += userEarn;
            });

            self.userFinacial([{
                'text': '合计',
                'totalCost': totalCost,
                'totalEarn': totalEarn,
                'revenue': (totalEarn - totalCost).toFixed(2)
            }].concat(userCostAndEarn));

            var sortedRecords = _.chain(allRecords)
                .sortBy(function (record) {
                    return record.date;
                })
                .reverse()
                .value();
            self.saleRecords(sortedRecords);
        };

        function getFieldByFieldID (fieldId){
            return _.filter(self.accountFieldArr, function(field){
                return field["ID"] === fieldId;
            });
        };

        function getFieldDetailByFieldDetailId (detailId){
            return _.filter(self.accountFieldDetailArr, function(field){
                return field["ID"] === detailId;
            });
        };
    };

    HomepageViewModel.prototype.initialise = function () {
        return sales_service.getAllSaleRecords()
            .done(function (data) {
                console.log(data);
                self.cacheCaches(data);
                self.caculateRecords();
                self.isLoading(false);
            });
    };

    return HomepageViewModel;
})();
},{"../services/sales_service.js":12}],19:[function(_dereq_,module,exports){
var JoinActivityPageViewModel = _dereq_('./joinactivitypage_view_model');

module.exports = {
    applyToPage: function(openId, activityId) {
        var sfView = document.getElementById('sf-view');
        var mainPage = document.getElementById('main-page');
        mainPage.innerHTML = sfView.innerHTML;
        ko.applyBindings(new JoinActivityPageViewModel(openId, activityId), mainPage);
    }
};
},{"./joinactivitypage_view_model":20}],20:[function(_dereq_,module,exports){
var sales_service = _dereq_('../services/join_activity_service.js');
var qrCode = _dereq_('qrcode-npm');

module.exports = (function () {
    'use strict';
    var self;

    function JoinactivitypageViewModel(openId, activityId) {

        self = this;
        self.openId = openId;
        self.activityId = activityId;

        this.ACTIVITY_IS_GOING = 600;
        this.ACTIVITY_NOT_FOUND = 601;
        this.ACTIVITY_IS_OVER = 602;
        this.ACTIVITY_NOT_START = 603;
        this.ACTIVITY_HAS_JOINED = 604;
        this.ACTIVITY_CREATE_SUCC = 900;

        self.shakeEvent = new Shake({threshold: 15});
        self.userActivity = {};
        self.prize = {};

        self.messageType = ko.observable();
        self.messageContent = ko.observable();
        self.couponId = ko.observable();
        self.prizeName = ko.observable();
        self.joinedTime = ko.observable();
        self.endDate = ko.observable();

        self.isLoading = ko.observable(true);
        self.isFirstTime = ko.observable(false);
        self.hasJoined = ko.observable(false);
        self.wonCoupon = ko.observable(false);
        self.showMessage = ko.observable(false);

        self.initialise();
    };

    JoinactivitypageViewModel.prototype.dispatcherWonPrize = function(){
        var self = this;
        self.isLoading(false);

        var status = self.prize.status;
        switch(status){
            case self.ACTIVITY_HAS_JOINED:
                self.showHasJoinedMessage();
                break;
            case self.ACTIVITY_CREATE_SUCC:
                self.wonPrize();
                break;
            default:

        }
    };

    JoinactivitypageViewModel.prototype.dispatcher = function(){
        var self = this;
        self.isLoading(false);

        var status = self.userActivity.status;
        switch(status){
            case self.ACTIVITY_IS_GOING:
                if(self.userActivity.go_shake == 'yes'){
                    self.showShake();
                }
                break;
            case self.ACTIVITY_NOT_FOUND:
                self.showNotFound();
                break;
            case self.ACTIVITY_IS_OVER:
                self.showActivityIsOver();
                break;
            case self.ACTIVITY_NOT_START:
                self.showActivityIsNotStartYet();
                break;
            case self.ACTIVITY_HAS_JOINED:
                self.showHasJoinedMessage();
                break;
            case self.ACTIVITY_CREATE_SUCC:
                self.wonPrize();
                break;
            default:

        }
    };

    JoinactivitypageViewModel.prototype.restore = function(){
        var self = this;
        self.isFirstTime(false);
        self.hasJoined(false);
        self.wonCoupon(false);
        self.showMessage(false);
    };

    JoinactivitypageViewModel.prototype.wonPrize = function(){
        var self = this;
        self.restore();
        self.wonCoupon(true);
        self.prizeName(self.prize.name);
        self.couponId(self.prize.code);
        self.endDate(self.prize.end_date);

        self.drawQRCode(self.prize.code);
    };

    JoinactivitypageViewModel.prototype.drawQRCode = function(code){
        var qr = qrCode.qrcode(10, 'H');
        qr.addData(code);
        qr.make();

        var imgTag = qr.createImgTag();
        document.getElementById("qrcode").innerHTML = imgTag;
    };

    JoinactivitypageViewModel.prototype.showShake = function(){
        console.log('showShake');
        var self = this;
        self.restore();
        self.isFirstTime(true);
        self.startShakeSubscriber();

        $("#shakeButton").bind("click",function(){
            self.shakeEventDidOccur();
        });
    };

    JoinactivitypageViewModel.prototype.shakeEventDidOccur = function(){
        var self = this;
        var audio = document.getElementById("shake-sound-male");
        if (audio.paused) {
            audio.play();
        } else {
            audio.currentTime = 0;
        }
        self.stopShakeSubscriber();

        self.drawForAPrice();
    };

    JoinactivitypageViewModel.prototype.startShakeSubscriber =  function(){
        var self = this;
        self.shakeEvent.start();
        window.addEventListener('shake', self.shakeEventDidOccur.bind(self), false);
    };

    JoinactivitypageViewModel.prototype.stopShakeSubscriber =  function(){
        var self = this;
        self.shakeEvent.stop();
        window.removeEventListener('shake', self.shakeEventDidOccur, false);
    };

    JoinactivitypageViewModel.prototype.showHasJoinedMessage = function(){
        var self = this;
        self.restore();
        self.hasJoined(true);
        self.prizeName(self.userActivity.coupon.name);
        self.couponId(self.userActivity.coupon.code);
        self.joinedTime(self.userActivity.coupon.start_date.replace('T', ' '));
    };

    JoinactivitypageViewModel.prototype.showUserMessage = function(type, content){
        var self = this;
        self.restore();
        self.showMessage(true);
        self.messageType(type);
        self.messageContent(content);
    };

    JoinactivitypageViewModel.prototype.showActivityIsNotStartYet = function(){
        var self = this;
        self.showUserMessage(
            "活动序号为：" + self.activityId + " 的活动还没有开始",
            "请回复数字：1 查询当前活动"
        );
    };

    JoinactivitypageViewModel.prototype.showActivityIsOver = function(){
        var self = this;
        self.showUserMessage(
            "活动序号为：" + self.activityId + " 的活动已经结束",
            "请回复数字：1 查询当前活动"
        );
    };

    JoinactivitypageViewModel.prototype.showNotFound = function(){
        var self = this;
        self.showUserMessage(
            "活动序号为：" + self.activityId + " 的活动不存在",
            "请回复数字：1 查询当前活动"
        );
    };

    JoinactivitypageViewModel.prototype.initialise = function () {
        if(self.openId == 'ihakula_create_coupon') {
            self.isLoading(false);
            var couponInfo = self.activityId.split(':');
            self.prize = {
                name: couponInfo[0],
                code: couponInfo[1],
                end_date: couponInfo[2],
                start_date: couponInfo[3]
            };
            self.wonPrize();
        } else {
            self.isLoading(true);
            return sales_service.getUserActivityStatus(self.openId, self.activityId)
                .done(function (data) {
                    self.userActivity = data;
                    self.dispatcher();
                });
        }
    };

    JoinactivitypageViewModel.prototype.drawForAPrice = function(){
        self.isLoading(true);
        return sales_service.drawPrize(self.openId, self.activityId)
            .done(function (data) {
                self.prize = data;
                self.dispatcherWonPrize();
            });
    };

    return JoinactivitypageViewModel;
})();
},{"../services/join_activity_service.js":11,"qrcode-npm":3}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9DTnd3c3VuL1dvcmtzcGFjZS9pSGFrdWxhL3dvcmtzcGFjZS9SdWJ5L05vcnRoZXJuSGVtaXNwaGVyZS9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL25vZGVfbW9kdWxlcy9kaXJlY3Rvci9idWlsZC9kaXJlY3Rvci5qcyIsIi9Vc2Vycy9DTnd3c3VuL1dvcmtzcGFjZS9pSGFrdWxhL3dvcmtzcGFjZS9SdWJ5L05vcnRoZXJuSGVtaXNwaGVyZS9ub2RlX21vZHVsZXMvZG9tcmVhZHkvcmVhZHkuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvbm9kZV9tb2R1bGVzL3FyY29kZS1ucG0vcXJjb2RlLmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL3B1YmxpYy9qYXZhc2NyaXB0cy9hamF4X3dyYXBwZXIuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL2NvbmZpZy9yb3V0ZXMuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL2luZnJhc3RydWN0dXJlL3ZpZXdfZW5naW5lLmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL3B1YmxpYy9qYXZhc2NyaXB0cy9pbmZyYXN0cnVjdHVyZS92aWV3X21vZGVsX3Jlc29sdmVyLmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL3B1YmxpYy9qYXZhc2NyaXB0cy9pbmZyYXN0cnVjdHVyZS92aWV3X3Jlc29sdmVyLmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL3B1YmxpYy9qYXZhc2NyaXB0cy9tYWluLmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL3B1YmxpYy9qYXZhc2NyaXB0cy9zZXJ2aWNlcy9hY3Rpdml0eV9zZXJ2aWNlLmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL3B1YmxpYy9qYXZhc2NyaXB0cy9zZXJ2aWNlcy9qb2luX2FjdGl2aXR5X3NlcnZpY2UuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL3NlcnZpY2VzL3NhbGVzX3NlcnZpY2UuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL3ZpZXdfbW9kZWxzL2FjdGl2aXR5X3BhZ2Vfdmlld19tb2RlbF9mYWN0b3J5LmpzIiwiL1VzZXJzL0NOd3dzdW4vV29ya3NwYWNlL2lIYWt1bGEvd29ya3NwYWNlL1J1YnkvTm9ydGhlcm5IZW1pc3BoZXJlL3B1YmxpYy9qYXZhc2NyaXB0cy92aWV3X21vZGVscy9hY3Rpdml0eXBhZ2Vfdmlld19tb2RlbC5qcyIsIi9Vc2Vycy9DTnd3c3VuL1dvcmtzcGFjZS9pSGFrdWxhL3dvcmtzcGFjZS9SdWJ5L05vcnRoZXJuSGVtaXNwaGVyZS9wdWJsaWMvamF2YXNjcmlwdHMvdmlld19tb2RlbHMvZGF0YWJhc2VfdXBkYXRlX3ZpZXdfbW9kZWwuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL3ZpZXdfbW9kZWxzL2RhdGFiYXNlX3VwZGF0ZV92aWV3X21vZGVsX2ZhY3RvcnkuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL3ZpZXdfbW9kZWxzL2hvbWVfcGFnZV92aWV3X21vZGVsX2ZhY3RvcnkuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL3ZpZXdfbW9kZWxzL2hvbWVwYWdlX3ZpZXdfbW9kZWwuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL3ZpZXdfbW9kZWxzL2pvaW5fYWN0aXZpdHlfcGFnZV92aWV3X21vZGVsX2ZhY3RvcnkuanMiLCIvVXNlcnMvQ053d3N1bi9Xb3Jrc3BhY2UvaUhha3VsYS93b3Jrc3BhY2UvUnVieS9Ob3J0aGVybkhlbWlzcGhlcmUvcHVibGljL2phdmFzY3JpcHRzL3ZpZXdfbW9kZWxzL2pvaW5hY3Rpdml0eXBhZ2Vfdmlld19tb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcHRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xtREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuXG4vL1xuLy8gR2VuZXJhdGVkIG9uIFR1ZSBEZWMgMTYgMjAxNCAxMjoxMzo0NyBHTVQrMDEwMCAoQ0VUKSBieSBDaGFybGllIFJvYmJpbnMsIFBhb2xvIEZyYWdvbWVuaSAmIHRoZSBDb250cmlidXRvcnMgKFVzaW5nIENvZGVzdXJnZW9uKS5cbi8vIFZlcnNpb24gMS4yLjZcbi8vXG5cbihmdW5jdGlvbiAoZXhwb3J0cykge1xuXG4vKlxuICogYnJvd3Nlci5qczogQnJvd3NlciBzcGVjaWZpYyBmdW5jdGlvbmFsaXR5IGZvciBkaXJlY3Rvci5cbiAqXG4gKiAoQykgMjAxMSwgQ2hhcmxpZSBSb2JiaW5zLCBQYW9sbyBGcmFnb21lbmksICYgdGhlIENvbnRyaWJ1dG9ycy5cbiAqIE1JVCBMSUNFTlNFXG4gKlxuICovXG5cbnZhciBkbG9jID0gZG9jdW1lbnQubG9jYXRpb247XG5cbmZ1bmN0aW9uIGRsb2NIYXNoRW1wdHkoKSB7XG4gIC8vIE5vbi1JRSBicm93c2VycyByZXR1cm4gJycgd2hlbiB0aGUgYWRkcmVzcyBiYXIgc2hvd3MgJyMnOyBEaXJlY3RvcidzIGxvZ2ljXG4gIC8vIGFzc3VtZXMgYm90aCBtZWFuIGVtcHR5LlxuICByZXR1cm4gZGxvYy5oYXNoID09PSAnJyB8fCBkbG9jLmhhc2ggPT09ICcjJztcbn1cblxudmFyIGxpc3RlbmVyID0ge1xuICBtb2RlOiAnbW9kZXJuJyxcbiAgaGFzaDogZGxvYy5oYXNoLFxuICBoaXN0b3J5OiBmYWxzZSxcblxuICBjaGVjazogZnVuY3Rpb24gKCkge1xuICAgIHZhciBoID0gZGxvYy5oYXNoO1xuICAgIGlmIChoICE9IHRoaXMuaGFzaCkge1xuICAgICAgdGhpcy5oYXNoID0gaDtcbiAgICAgIHRoaXMub25IYXNoQ2hhbmdlZCgpO1xuICAgIH1cbiAgfSxcblxuICBmaXJlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMubW9kZSA9PT0gJ21vZGVybicpIHtcbiAgICAgIHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSA/IHdpbmRvdy5vbnBvcHN0YXRlKCkgOiB3aW5kb3cub25oYXNoY2hhbmdlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5vbkhhc2hDaGFuZ2VkKCk7XG4gICAgfVxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uIChmbiwgaGlzdG9yeSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmhpc3RvcnkgPSBoaXN0b3J5O1xuXG4gICAgaWYgKCFSb3V0ZXIubGlzdGVuZXJzKSB7XG4gICAgICBSb3V0ZXIubGlzdGVuZXJzID0gW107XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25jaGFuZ2Uob25DaGFuZ2VFdmVudCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBSb3V0ZXIubGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBSb3V0ZXIubGlzdGVuZXJzW2ldKG9uQ2hhbmdlRXZlbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vbm90ZSBJRTggaXMgYmVpbmcgY291bnRlZCBhcyAnbW9kZXJuJyBiZWNhdXNlIGl0IGhhcyB0aGUgaGFzaGNoYW5nZSBldmVudFxuICAgIGlmICgnb25oYXNoY2hhbmdlJyBpbiB3aW5kb3cgJiYgKGRvY3VtZW50LmRvY3VtZW50TW9kZSA9PT0gdW5kZWZpbmVkXG4gICAgICB8fCBkb2N1bWVudC5kb2N1bWVudE1vZGUgPiA3KSkge1xuICAgICAgLy8gQXQgbGVhc3QgZm9yIG5vdyBIVE1MNSBoaXN0b3J5IGlzIGF2YWlsYWJsZSBmb3IgJ21vZGVybicgYnJvd3NlcnMgb25seVxuICAgICAgaWYgKHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBUaGVyZSBpcyBhbiBvbGQgYnVnIGluIENocm9tZSB0aGF0IGNhdXNlcyBvbnBvcHN0YXRlIHRvIGZpcmUgZXZlblxuICAgICAgICAvLyB1cG9uIGluaXRpYWwgcGFnZSBsb2FkLiBTaW5jZSB0aGUgaGFuZGxlciBpcyBydW4gbWFudWFsbHkgaW4gaW5pdCgpLFxuICAgICAgICAvLyB0aGlzIHdvdWxkIGNhdXNlIENocm9tZSB0byBydW4gaXQgdHdpc2UuIEN1cnJlbnRseSB0aGUgb25seVxuICAgICAgICAvLyB3b3JrYXJvdW5kIHNlZW1zIHRvIGJlIHRvIHNldCB0aGUgaGFuZGxlciBhZnRlciB0aGUgaW5pdGlhbCBwYWdlIGxvYWRcbiAgICAgICAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9NjMwNDBcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB3aW5kb3cub25wb3BzdGF0ZSA9IG9uY2hhbmdlO1xuICAgICAgICB9LCA1MDApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHdpbmRvdy5vbmhhc2hjaGFuZ2UgPSBvbmNoYW5nZTtcbiAgICAgIH1cbiAgICAgIHRoaXMubW9kZSA9ICdtb2Rlcm4nO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vXG4gICAgICAvLyBJRSBzdXBwb3J0LCBiYXNlZCBvbiBhIGNvbmNlcHQgYnkgRXJpayBBcnZpZHNvbiAuLi5cbiAgICAgIC8vXG4gICAgICB2YXIgZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgIGZyYW1lLmlkID0gJ3N0YXRlLWZyYW1lJztcbiAgICAgIGZyYW1lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGZyYW1lKTtcbiAgICAgIHRoaXMud3JpdGVGcmFtZSgnJyk7XG5cbiAgICAgIGlmICgnb25wcm9wZXJ0eWNoYW5nZScgaW4gZG9jdW1lbnQgJiYgJ2F0dGFjaEV2ZW50JyBpbiBkb2N1bWVudCkge1xuICAgICAgICBkb2N1bWVudC5hdHRhY2hFdmVudCgnb25wcm9wZXJ0eWNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoZXZlbnQucHJvcGVydHlOYW1lID09PSAnbG9jYXRpb24nKSB7XG4gICAgICAgICAgICBzZWxmLmNoZWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHsgc2VsZi5jaGVjaygpOyB9LCA1MCk7XG5cbiAgICAgIHRoaXMub25IYXNoQ2hhbmdlZCA9IG9uY2hhbmdlO1xuICAgICAgdGhpcy5tb2RlID0gJ2xlZ2FjeSc7XG4gICAgfVxuXG4gICAgUm91dGVyLmxpc3RlbmVycy5wdXNoKGZuKTtcblxuICAgIHJldHVybiB0aGlzLm1vZGU7XG4gIH0sXG5cbiAgZGVzdHJveTogZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKCFSb3V0ZXIgfHwgIVJvdXRlci5saXN0ZW5lcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gUm91dGVyLmxpc3RlbmVycztcblxuICAgIGZvciAodmFyIGkgPSBsaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0gPT09IGZuKSB7XG4gICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNldEhhc2g6IGZ1bmN0aW9uIChzKSB7XG4gICAgLy8gTW96aWxsYSBhbHdheXMgYWRkcyBhbiBlbnRyeSB0byB0aGUgaGlzdG9yeVxuICAgIGlmICh0aGlzLm1vZGUgPT09ICdsZWdhY3knKSB7XG4gICAgICB0aGlzLndyaXRlRnJhbWUocyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSkge1xuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgcyk7XG4gICAgICAvLyBGaXJlIGFuIG9ucG9wc3RhdGUgZXZlbnQgbWFudWFsbHkgc2luY2UgcHVzaGluZyBkb2VzIG5vdCBvYnZpb3VzbHlcbiAgICAgIC8vIHRyaWdnZXIgdGhlIHBvcCBldmVudC5cbiAgICAgIHRoaXMuZmlyZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkbG9jLmhhc2ggPSAoc1swXSA9PT0gJy8nKSA/IHMgOiAnLycgKyBzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICB3cml0ZUZyYW1lOiBmdW5jdGlvbiAocykge1xuICAgIC8vIElFIHN1cHBvcnQuLi5cbiAgICB2YXIgZiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdGF0ZS1mcmFtZScpO1xuICAgIHZhciBkID0gZi5jb250ZW50RG9jdW1lbnQgfHwgZi5jb250ZW50V2luZG93LmRvY3VtZW50O1xuICAgIGQub3BlbigpO1xuICAgIGQud3JpdGUoXCI8c2NyaXB0Pl9oYXNoID0gJ1wiICsgcyArIFwiJzsgb25sb2FkID0gcGFyZW50Lmxpc3RlbmVyLnN5bmNIYXNoOzxzY3JpcHQ+XCIpO1xuICAgIGQuY2xvc2UoKTtcbiAgfSxcblxuICBzeW5jSGFzaDogZnVuY3Rpb24gKCkge1xuICAgIC8vIElFIHN1cHBvcnQuLi5cbiAgICB2YXIgcyA9IHRoaXMuX2hhc2g7XG4gICAgaWYgKHMgIT0gZGxvYy5oYXNoKSB7XG4gICAgICBkbG9jLmhhc2ggPSBzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBvbkhhc2hDaGFuZ2VkOiBmdW5jdGlvbiAoKSB7fVxufTtcblxudmFyIFJvdXRlciA9IGV4cG9ydHMuUm91dGVyID0gZnVuY3Rpb24gKHJvdXRlcykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUm91dGVyKSkgcmV0dXJuIG5ldyBSb3V0ZXIocm91dGVzKTtcblxuICB0aGlzLnBhcmFtcyAgID0ge307XG4gIHRoaXMucm91dGVzICAgPSB7fTtcbiAgdGhpcy5tZXRob2RzICA9IFsnb24nLCAnb25jZScsICdhZnRlcicsICdiZWZvcmUnXTtcbiAgdGhpcy5zY29wZSAgICA9IFtdO1xuICB0aGlzLl9tZXRob2RzID0ge307XG5cbiAgdGhpcy5faW5zZXJ0ID0gdGhpcy5pbnNlcnQ7XG4gIHRoaXMuaW5zZXJ0ID0gdGhpcy5pbnNlcnRFeDtcblxuICB0aGlzLmhpc3RvcnlTdXBwb3J0ID0gKHdpbmRvdy5oaXN0b3J5ICE9IG51bGwgPyB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUgOiBudWxsKSAhPSBudWxsXG5cbiAgdGhpcy5jb25maWd1cmUoKTtcbiAgdGhpcy5tb3VudChyb3V0ZXMgfHwge30pO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKHIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCByb3V0ZVRvO1xuICB0aGlzLmhhbmRsZXIgPSBmdW5jdGlvbihvbkNoYW5nZUV2ZW50KSB7XG4gICAgdmFyIG5ld1VSTCA9IG9uQ2hhbmdlRXZlbnQgJiYgb25DaGFuZ2VFdmVudC5uZXdVUkwgfHwgd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgdmFyIHVybCA9IHNlbGYuaGlzdG9yeSA9PT0gdHJ1ZSA/IHNlbGYuZ2V0UGF0aCgpIDogbmV3VVJMLnJlcGxhY2UoLy4qIy8sICcnKTtcbiAgICBzZWxmLmRpc3BhdGNoKCdvbicsIHVybC5jaGFyQXQoMCkgPT09ICcvJyA/IHVybCA6ICcvJyArIHVybCk7XG4gIH07XG5cbiAgbGlzdGVuZXIuaW5pdCh0aGlzLmhhbmRsZXIsIHRoaXMuaGlzdG9yeSk7XG5cbiAgaWYgKHRoaXMuaGlzdG9yeSA9PT0gZmFsc2UpIHtcbiAgICBpZiAoZGxvY0hhc2hFbXB0eSgpICYmIHIpIHtcbiAgICAgIGRsb2MuaGFzaCA9IHI7XG4gICAgfSBlbHNlIGlmICghZGxvY0hhc2hFbXB0eSgpKSB7XG4gICAgICBzZWxmLmRpc3BhdGNoKCdvbicsICcvJyArIGRsb2MuaGFzaC5yZXBsYWNlKC9eKCNcXC98I3xcXC8pLywgJycpKTtcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMuY29udmVydF9oYXNoX2luX2luaXQpIHtcbiAgICAgIC8vIFVzZSBoYXNoIGFzIHJvdXRlXG4gICAgICByb3V0ZVRvID0gZGxvY0hhc2hFbXB0eSgpICYmIHIgPyByIDogIWRsb2NIYXNoRW1wdHkoKSA/IGRsb2MuaGFzaC5yZXBsYWNlKC9eIy8sICcnKSA6IG51bGw7XG4gICAgICBpZiAocm91dGVUbykge1xuICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCByb3V0ZVRvKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBVc2UgY2Fub25pY2FsIHVybFxuICAgICAgcm91dGVUbyA9IHRoaXMuZ2V0UGF0aCgpO1xuICAgIH1cblxuICAgIC8vIFJvdXRlciBoYXMgYmVlbiBpbml0aWFsaXplZCwgYnV0IGR1ZSB0byB0aGUgY2hyb21lIGJ1ZyBpdCB3aWxsIG5vdFxuICAgIC8vIHlldCBhY3R1YWxseSByb3V0ZSBIVE1MNSBoaXN0b3J5IHN0YXRlIGNoYW5nZXMuIFRodXMsIGRlY2lkZSBpZiBzaG91bGQgcm91dGUuXG4gICAgaWYgKHJvdXRlVG8gfHwgdGhpcy5ydW5faW5faW5pdCA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5oYW5kbGVyKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmV4cGxvZGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2ID0gdGhpcy5oaXN0b3J5ID09PSB0cnVlID8gdGhpcy5nZXRQYXRoKCkgOiBkbG9jLmhhc2g7XG4gIGlmICh2LmNoYXJBdCgxKSA9PT0gJy8nKSB7IHY9di5zbGljZSgxKSB9XG4gIHJldHVybiB2LnNsaWNlKDEsIHYubGVuZ3RoKS5zcGxpdChcIi9cIik7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnNldFJvdXRlID0gZnVuY3Rpb24gKGksIHYsIHZhbCkge1xuICB2YXIgdXJsID0gdGhpcy5leHBsb2RlKCk7XG5cbiAgaWYgKHR5cGVvZiBpID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgdiA9PT0gJ3N0cmluZycpIHtcbiAgICB1cmxbaV0gPSB2O1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdXJsLnNwbGljZShpLCB2LCBzKTtcbiAgfVxuICBlbHNlIHtcbiAgICB1cmwgPSBbaV07XG4gIH1cblxuICBsaXN0ZW5lci5zZXRIYXNoKHVybC5qb2luKCcvJykpO1xuICByZXR1cm4gdXJsO1xufTtcblxuLy9cbi8vICMjIyBmdW5jdGlvbiBpbnNlcnRFeChtZXRob2QsIHBhdGgsIHJvdXRlLCBwYXJlbnQpXG4vLyAjIyMjIEBtZXRob2Qge3N0cmluZ30gTWV0aG9kIHRvIGluc2VydCB0aGUgc3BlY2lmaWMgYHJvdXRlYC5cbi8vICMjIyMgQHBhdGgge0FycmF5fSBQYXJzZWQgcGF0aCB0byBpbnNlcnQgdGhlIGByb3V0ZWAgYXQuXG4vLyAjIyMjIEByb3V0ZSB7QXJyYXl8ZnVuY3Rpb259IFJvdXRlIGhhbmRsZXJzIHRvIGluc2VydC5cbi8vICMjIyMgQHBhcmVudCB7T2JqZWN0fSAqKk9wdGlvbmFsKiogUGFyZW50IFwicm91dGVzXCIgdG8gaW5zZXJ0IGludG8uXG4vLyBpbnNlcnQgYSBjYWxsYmFjayB0aGF0IHdpbGwgb25seSBvY2N1ciBvbmNlIHBlciB0aGUgbWF0Y2hlZCByb3V0ZS5cbi8vXG5Sb3V0ZXIucHJvdG90eXBlLmluc2VydEV4ID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCByb3V0ZSwgcGFyZW50KSB7XG4gIGlmIChtZXRob2QgPT09IFwib25jZVwiKSB7XG4gICAgbWV0aG9kID0gXCJvblwiO1xuICAgIHJvdXRlID0gZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgIHZhciBvbmNlID0gZmFsc2U7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChvbmNlKSByZXR1cm47XG4gICAgICAgIG9uY2UgPSB0cnVlO1xuICAgICAgICByZXR1cm4gcm91dGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfShyb3V0ZSk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2luc2VydChtZXRob2QsIHBhdGgsIHJvdXRlLCBwYXJlbnQpO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5nZXRSb3V0ZSA9IGZ1bmN0aW9uICh2KSB7XG4gIHZhciByZXQgPSB2O1xuXG4gIGlmICh0eXBlb2YgdiA9PT0gXCJudW1iZXJcIikge1xuICAgIHJldCA9IHRoaXMuZXhwbG9kZSgpW3ZdO1xuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKXtcbiAgICB2YXIgaCA9IHRoaXMuZXhwbG9kZSgpO1xuICAgIHJldCA9IGguaW5kZXhPZih2KTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXQgPSB0aGlzLmV4cGxvZGUoKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIGxpc3RlbmVyLmRlc3Ryb3kodGhpcy5oYW5kbGVyKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmdldFBhdGggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXRoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xuICBpZiAocGF0aC5zdWJzdHIoMCwgMSkgIT09ICcvJykge1xuICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICB9XG4gIHJldHVybiBwYXRoO1xufTtcbmZ1bmN0aW9uIF9ldmVyeShhcnIsIGl0ZXJhdG9yKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKGl0ZXJhdG9yKGFycltpXSwgaSwgYXJyKSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gX2ZsYXR0ZW4oYXJyKSB7XG4gIHZhciBmbGF0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBuID0gYXJyLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgIGZsYXQgPSBmbGF0LmNvbmNhdChhcnJbaV0pO1xuICB9XG4gIHJldHVybiBmbGF0O1xufVxuXG5mdW5jdGlvbiBfYXN5bmNFdmVyeVNlcmllcyhhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgfVxuICB2YXIgY29tcGxldGVkID0gMDtcbiAgKGZ1bmN0aW9uIGl0ZXJhdGUoKSB7XG4gICAgaXRlcmF0b3IoYXJyW2NvbXBsZXRlZF0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVyciB8fCBlcnIgPT09IGZhbHNlKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICBpZiAoY29tcGxldGVkID09PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSkoKTtcbn1cblxuZnVuY3Rpb24gcGFyYW1pZnlTdHJpbmcoc3RyLCBwYXJhbXMsIG1vZCkge1xuICBtb2QgPSBzdHI7XG4gIGZvciAodmFyIHBhcmFtIGluIHBhcmFtcykge1xuICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkocGFyYW0pKSB7XG4gICAgICBtb2QgPSBwYXJhbXNbcGFyYW1dKHN0cik7XG4gICAgICBpZiAobW9kICE9PSBzdHIpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtb2QgPT09IHN0ciA/IFwiKFsuX2EtekEtWjAtOS0lKCldKylcIiA6IG1vZDtcbn1cblxuZnVuY3Rpb24gcmVnaWZ5U3RyaW5nKHN0ciwgcGFyYW1zKSB7XG4gIHZhciBtYXRjaGVzLCBsYXN0ID0gMCwgb3V0ID0gXCJcIjtcbiAgd2hpbGUgKG1hdGNoZXMgPSBzdHIuc3Vic3RyKGxhc3QpLm1hdGNoKC9bXlxcd1xcZFxcLSAlQCZdKlxcKlteXFx3XFxkXFwtICVAJl0qLykpIHtcbiAgICBsYXN0ID0gbWF0Y2hlcy5pbmRleCArIG1hdGNoZXNbMF0ubGVuZ3RoO1xuICAgIG1hdGNoZXNbMF0gPSBtYXRjaGVzWzBdLnJlcGxhY2UoL15cXCovLCBcIihbXy4oKSFcXFxcICVAJmEtekEtWjAtOS1dKylcIik7XG4gICAgb3V0ICs9IHN0ci5zdWJzdHIoMCwgbWF0Y2hlcy5pbmRleCkgKyBtYXRjaGVzWzBdO1xuICB9XG4gIHN0ciA9IG91dCArPSBzdHIuc3Vic3RyKGxhc3QpO1xuICB2YXIgY2FwdHVyZXMgPSBzdHIubWF0Y2goLzooW15cXC9dKykvaWcpLCBjYXB0dXJlLCBsZW5ndGg7XG4gIGlmIChjYXB0dXJlcykge1xuICAgIGxlbmd0aCA9IGNhcHR1cmVzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBjYXB0dXJlID0gY2FwdHVyZXNbaV07XG4gICAgICBpZiAoY2FwdHVyZS5zbGljZSgwLCAyKSA9PT0gXCI6OlwiKSB7XG4gICAgICAgIHN0ciA9IGNhcHR1cmUuc2xpY2UoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShjYXB0dXJlLCBwYXJhbWlmeVN0cmluZyhjYXB0dXJlLCBwYXJhbXMpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gdGVybWluYXRvcihyb3V0ZXMsIGRlbGltaXRlciwgc3RhcnQsIHN0b3ApIHtcbiAgdmFyIGxhc3QgPSAwLCBsZWZ0ID0gMCwgcmlnaHQgPSAwLCBzdGFydCA9IChzdGFydCB8fCBcIihcIikudG9TdHJpbmcoKSwgc3RvcCA9IChzdG9wIHx8IFwiKVwiKS50b1N0cmluZygpLCBpO1xuICBmb3IgKGkgPSAwOyBpIDwgcm91dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGNodW5rID0gcm91dGVzW2ldO1xuICAgIGlmIChjaHVuay5pbmRleE9mKHN0YXJ0LCBsYXN0KSA+IGNodW5rLmluZGV4T2Yoc3RvcCwgbGFzdCkgfHwgfmNodW5rLmluZGV4T2Yoc3RhcnQsIGxhc3QpICYmICF+Y2h1bmsuaW5kZXhPZihzdG9wLCBsYXN0KSB8fCAhfmNodW5rLmluZGV4T2Yoc3RhcnQsIGxhc3QpICYmIH5jaHVuay5pbmRleE9mKHN0b3AsIGxhc3QpKSB7XG4gICAgICBsZWZ0ID0gY2h1bmsuaW5kZXhPZihzdGFydCwgbGFzdCk7XG4gICAgICByaWdodCA9IGNodW5rLmluZGV4T2Yoc3RvcCwgbGFzdCk7XG4gICAgICBpZiAofmxlZnQgJiYgIX5yaWdodCB8fCAhfmxlZnQgJiYgfnJpZ2h0KSB7XG4gICAgICAgIHZhciB0bXAgPSByb3V0ZXMuc2xpY2UoMCwgKGkgfHwgMSkgKyAxKS5qb2luKGRlbGltaXRlcik7XG4gICAgICAgIHJvdXRlcyA9IFsgdG1wIF0uY29uY2F0KHJvdXRlcy5zbGljZSgoaSB8fCAxKSArIDEpKTtcbiAgICAgIH1cbiAgICAgIGxhc3QgPSAocmlnaHQgPiBsZWZ0ID8gcmlnaHQgOiBsZWZ0KSArIDE7XG4gICAgICBpID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGFzdCA9IDA7XG4gICAgfVxuICB9XG4gIHJldHVybiByb3V0ZXM7XG59XG5cbnZhciBRVUVSWV9TRVBBUkFUT1IgPSAvXFw/LiovO1xuXG5Sb3V0ZXIucHJvdG90eXBlLmNvbmZpZ3VyZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5fbWV0aG9kc1t0aGlzLm1ldGhvZHNbaV1dID0gdHJ1ZTtcbiAgfVxuICB0aGlzLnJlY3Vyc2UgPSBvcHRpb25zLnJlY3Vyc2UgfHwgdGhpcy5yZWN1cnNlIHx8IGZhbHNlO1xuICB0aGlzLmFzeW5jID0gb3B0aW9ucy5hc3luYyB8fCBmYWxzZTtcbiAgdGhpcy5kZWxpbWl0ZXIgPSBvcHRpb25zLmRlbGltaXRlciB8fCBcIi9cIjtcbiAgdGhpcy5zdHJpY3QgPSB0eXBlb2Ygb3B0aW9ucy5zdHJpY3QgPT09IFwidW5kZWZpbmVkXCIgPyB0cnVlIDogb3B0aW9ucy5zdHJpY3Q7XG4gIHRoaXMubm90Zm91bmQgPSBvcHRpb25zLm5vdGZvdW5kO1xuICB0aGlzLnJlc291cmNlID0gb3B0aW9ucy5yZXNvdXJjZTtcbiAgdGhpcy5oaXN0b3J5ID0gb3B0aW9ucy5odG1sNWhpc3RvcnkgJiYgdGhpcy5oaXN0b3J5U3VwcG9ydCB8fCBmYWxzZTtcbiAgdGhpcy5ydW5faW5faW5pdCA9IHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSAmJiBvcHRpb25zLnJ1bl9oYW5kbGVyX2luX2luaXQgIT09IGZhbHNlO1xuICB0aGlzLmNvbnZlcnRfaGFzaF9pbl9pbml0ID0gdGhpcy5oaXN0b3J5ID09PSB0cnVlICYmIG9wdGlvbnMuY29udmVydF9oYXNoX2luX2luaXQgIT09IGZhbHNlO1xuICB0aGlzLmV2ZXJ5ID0ge1xuICAgIGFmdGVyOiBvcHRpb25zLmFmdGVyIHx8IG51bGwsXG4gICAgYmVmb3JlOiBvcHRpb25zLmJlZm9yZSB8fCBudWxsLFxuICAgIG9uOiBvcHRpb25zLm9uIHx8IG51bGxcbiAgfTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnBhcmFtID0gZnVuY3Rpb24odG9rZW4sIG1hdGNoZXIpIHtcbiAgaWYgKHRva2VuWzBdICE9PSBcIjpcIikge1xuICAgIHRva2VuID0gXCI6XCIgKyB0b2tlbjtcbiAgfVxuICB2YXIgY29tcGlsZWQgPSBuZXcgUmVnRXhwKHRva2VuLCBcImdcIik7XG4gIHRoaXMucGFyYW1zW3Rva2VuXSA9IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZShjb21waWxlZCwgbWF0Y2hlci5zb3VyY2UgfHwgbWF0Y2hlcik7XG4gIH07XG4gIHJldHVybiB0aGlzO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5vbiA9IFJvdXRlci5wcm90b3R5cGUucm91dGUgPSBmdW5jdGlvbihtZXRob2QsIHBhdGgsIHJvdXRlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCFyb3V0ZSAmJiB0eXBlb2YgcGF0aCA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByb3V0ZSA9IHBhdGg7XG4gICAgcGF0aCA9IG1ldGhvZDtcbiAgICBtZXRob2QgPSBcIm9uXCI7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICByZXR1cm4gcGF0aC5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICAgIHNlbGYub24obWV0aG9kLCBwLCByb3V0ZSk7XG4gICAgfSk7XG4gIH1cbiAgaWYgKHBhdGguc291cmNlKSB7XG4gICAgcGF0aCA9IHBhdGguc291cmNlLnJlcGxhY2UoL1xcXFxcXC8vaWcsIFwiL1wiKTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShtZXRob2QpKSB7XG4gICAgcmV0dXJuIG1ldGhvZC5mb3JFYWNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgIHNlbGYub24obS50b0xvd2VyQ2FzZSgpLCBwYXRoLCByb3V0ZSk7XG4gICAgfSk7XG4gIH1cbiAgcGF0aCA9IHBhdGguc3BsaXQobmV3IFJlZ0V4cCh0aGlzLmRlbGltaXRlcikpO1xuICBwYXRoID0gdGVybWluYXRvcihwYXRoLCB0aGlzLmRlbGltaXRlcik7XG4gIHRoaXMuaW5zZXJ0KG1ldGhvZCwgdGhpcy5zY29wZS5jb25jYXQocGF0aCksIHJvdXRlKTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUucGF0aCA9IGZ1bmN0aW9uKHBhdGgsIHJvdXRlc0ZuKSB7XG4gIHZhciBzZWxmID0gdGhpcywgbGVuZ3RoID0gdGhpcy5zY29wZS5sZW5ndGg7XG4gIGlmIChwYXRoLnNvdXJjZSkge1xuICAgIHBhdGggPSBwYXRoLnNvdXJjZS5yZXBsYWNlKC9cXFxcXFwvL2lnLCBcIi9cIik7XG4gIH1cbiAgcGF0aCA9IHBhdGguc3BsaXQobmV3IFJlZ0V4cCh0aGlzLmRlbGltaXRlcikpO1xuICBwYXRoID0gdGVybWluYXRvcihwYXRoLCB0aGlzLmRlbGltaXRlcik7XG4gIHRoaXMuc2NvcGUgPSB0aGlzLnNjb3BlLmNvbmNhdChwYXRoKTtcbiAgcm91dGVzRm4uY2FsbCh0aGlzLCB0aGlzKTtcbiAgdGhpcy5zY29wZS5zcGxpY2UobGVuZ3RoLCBwYXRoLmxlbmd0aCk7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXMsIGZucyA9IHRoaXMudHJhdmVyc2UobWV0aG9kLCBwYXRoLnJlcGxhY2UoUVVFUllfU0VQQVJBVE9SLCBcIlwiKSwgdGhpcy5yb3V0ZXMsIFwiXCIpLCBpbnZva2VkID0gdGhpcy5faW52b2tlZCwgYWZ0ZXI7XG4gIHRoaXMuX2ludm9rZWQgPSB0cnVlO1xuICBpZiAoIWZucyB8fCBmbnMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhpcy5sYXN0ID0gW107XG4gICAgaWYgKHR5cGVvZiB0aGlzLm5vdGZvdW5kID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMuaW52b2tlKFsgdGhpcy5ub3Rmb3VuZCBdLCB7XG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LCBjYWxsYmFjayk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodGhpcy5yZWN1cnNlID09PSBcImZvcndhcmRcIikge1xuICAgIGZucyA9IGZucy5yZXZlcnNlKCk7XG4gIH1cbiAgZnVuY3Rpb24gdXBkYXRlQW5kSW52b2tlKCkge1xuICAgIHNlbGYubGFzdCA9IGZucy5hZnRlcjtcbiAgICBzZWxmLmludm9rZShzZWxmLnJ1bmxpc3QoZm5zKSwgc2VsZiwgY2FsbGJhY2spO1xuICB9XG4gIGFmdGVyID0gdGhpcy5ldmVyeSAmJiB0aGlzLmV2ZXJ5LmFmdGVyID8gWyB0aGlzLmV2ZXJ5LmFmdGVyIF0uY29uY2F0KHRoaXMubGFzdCkgOiBbIHRoaXMubGFzdCBdO1xuICBpZiAoYWZ0ZXIgJiYgYWZ0ZXIubGVuZ3RoID4gMCAmJiBpbnZva2VkKSB7XG4gICAgaWYgKHRoaXMuYXN5bmMpIHtcbiAgICAgIHRoaXMuaW52b2tlKGFmdGVyLCB0aGlzLCB1cGRhdGVBbmRJbnZva2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmludm9rZShhZnRlciwgdGhpcyk7XG4gICAgICB1cGRhdGVBbmRJbnZva2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdXBkYXRlQW5kSW52b2tlKCk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbihmbnMsIHRoaXNBcmcsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGFwcGx5O1xuICBpZiAodGhpcy5hc3luYykge1xuICAgIGFwcGx5ID0gZnVuY3Rpb24oZm4sIG5leHQpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGZuKSkge1xuICAgICAgICByZXR1cm4gX2FzeW5jRXZlcnlTZXJpZXMoZm4sIGFwcGx5LCBuZXh0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZuID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBmbi5hcHBseSh0aGlzQXJnLCAoZm5zLmNhcHR1cmVzIHx8IFtdKS5jb25jYXQobmV4dCkpO1xuICAgICAgfVxuICAgIH07XG4gICAgX2FzeW5jRXZlcnlTZXJpZXMoZm5zLCBhcHBseSwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkodGhpc0FyZywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBhcHBseSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShmbikpIHtcbiAgICAgICAgcmV0dXJuIF9ldmVyeShmbiwgYXBwbHkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpc0FyZywgZm5zLmNhcHR1cmVzIHx8IFtdKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZuID09PSBcInN0cmluZ1wiICYmIHNlbGYucmVzb3VyY2UpIHtcbiAgICAgICAgc2VsZi5yZXNvdXJjZVtmbl0uYXBwbHkodGhpc0FyZywgZm5zLmNhcHR1cmVzIHx8IFtdKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIF9ldmVyeShmbnMsIGFwcGx5KTtcbiAgfVxufTtcblxuUm91dGVyLnByb3RvdHlwZS50cmF2ZXJzZSA9IGZ1bmN0aW9uKG1ldGhvZCwgcGF0aCwgcm91dGVzLCByZWdleHAsIGZpbHRlcikge1xuICB2YXIgZm5zID0gW10sIGN1cnJlbnQsIGV4YWN0LCBtYXRjaCwgbmV4dCwgdGhhdDtcbiAgZnVuY3Rpb24gZmlsdGVyUm91dGVzKHJvdXRlcykge1xuICAgIGlmICghZmlsdGVyKSB7XG4gICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkZWVwQ29weShzb3VyY2UpIHtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IEFycmF5LmlzQXJyYXkoc291cmNlW2ldKSA/IGRlZXBDb3B5KHNvdXJjZVtpXSkgOiBzb3VyY2VbaV07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBhcHBseUZpbHRlcihmbnMpIHtcbiAgICAgIGZvciAodmFyIGkgPSBmbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZm5zW2ldKSkge1xuICAgICAgICAgIGFwcGx5RmlsdGVyKGZuc1tpXSk7XG4gICAgICAgICAgaWYgKGZuc1tpXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghZmlsdGVyKGZuc1tpXSkpIHtcbiAgICAgICAgICAgIGZucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBuZXdSb3V0ZXMgPSBkZWVwQ29weShyb3V0ZXMpO1xuICAgIG5ld1JvdXRlcy5tYXRjaGVkID0gcm91dGVzLm1hdGNoZWQ7XG4gICAgbmV3Um91dGVzLmNhcHR1cmVzID0gcm91dGVzLmNhcHR1cmVzO1xuICAgIG5ld1JvdXRlcy5hZnRlciA9IHJvdXRlcy5hZnRlci5maWx0ZXIoZmlsdGVyKTtcbiAgICBhcHBseUZpbHRlcihuZXdSb3V0ZXMpO1xuICAgIHJldHVybiBuZXdSb3V0ZXM7XG4gIH1cbiAgaWYgKHBhdGggPT09IHRoaXMuZGVsaW1pdGVyICYmIHJvdXRlc1ttZXRob2RdKSB7XG4gICAgbmV4dCA9IFsgWyByb3V0ZXMuYmVmb3JlLCByb3V0ZXNbbWV0aG9kXSBdLmZpbHRlcihCb29sZWFuKSBdO1xuICAgIG5leHQuYWZ0ZXIgPSBbIHJvdXRlcy5hZnRlciBdLmZpbHRlcihCb29sZWFuKTtcbiAgICBuZXh0Lm1hdGNoZWQgPSB0cnVlO1xuICAgIG5leHQuY2FwdHVyZXMgPSBbXTtcbiAgICByZXR1cm4gZmlsdGVyUm91dGVzKG5leHQpO1xuICB9XG4gIGZvciAodmFyIHIgaW4gcm91dGVzKSB7XG4gICAgaWYgKHJvdXRlcy5oYXNPd25Qcm9wZXJ0eShyKSAmJiAoIXRoaXMuX21ldGhvZHNbcl0gfHwgdGhpcy5fbWV0aG9kc1tyXSAmJiB0eXBlb2Ygcm91dGVzW3JdID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHJvdXRlc1tyXSkpKSB7XG4gICAgICBjdXJyZW50ID0gZXhhY3QgPSByZWdleHAgKyB0aGlzLmRlbGltaXRlciArIHI7XG4gICAgICBpZiAoIXRoaXMuc3RyaWN0KSB7XG4gICAgICAgIGV4YWN0ICs9IFwiW1wiICsgdGhpcy5kZWxpbWl0ZXIgKyBcIl0/XCI7XG4gICAgICB9XG4gICAgICBtYXRjaCA9IHBhdGgubWF0Y2gobmV3IFJlZ0V4cChcIl5cIiArIGV4YWN0KSk7XG4gICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG1hdGNoWzBdICYmIG1hdGNoWzBdID09IHBhdGggJiYgcm91dGVzW3JdW21ldGhvZF0pIHtcbiAgICAgICAgbmV4dCA9IFsgWyByb3V0ZXNbcl0uYmVmb3JlLCByb3V0ZXNbcl1bbWV0aG9kXSBdLmZpbHRlcihCb29sZWFuKSBdO1xuICAgICAgICBuZXh0LmFmdGVyID0gWyByb3V0ZXNbcl0uYWZ0ZXIgXS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgIG5leHQubWF0Y2hlZCA9IHRydWU7XG4gICAgICAgIG5leHQuY2FwdHVyZXMgPSBtYXRjaC5zbGljZSgxKTtcbiAgICAgICAgaWYgKHRoaXMucmVjdXJzZSAmJiByb3V0ZXMgPT09IHRoaXMucm91dGVzKSB7XG4gICAgICAgICAgbmV4dC5wdXNoKFsgcm91dGVzLmJlZm9yZSwgcm91dGVzLm9uIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICBuZXh0LmFmdGVyID0gbmV4dC5hZnRlci5jb25jYXQoWyByb3V0ZXMuYWZ0ZXIgXS5maWx0ZXIoQm9vbGVhbikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJSb3V0ZXMobmV4dCk7XG4gICAgICB9XG4gICAgICBuZXh0ID0gdGhpcy50cmF2ZXJzZShtZXRob2QsIHBhdGgsIHJvdXRlc1tyXSwgY3VycmVudCk7XG4gICAgICBpZiAobmV4dC5tYXRjaGVkKSB7XG4gICAgICAgIGlmIChuZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmbnMgPSBmbnMuY29uY2F0KG5leHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnJlY3Vyc2UpIHtcbiAgICAgICAgICBmbnMucHVzaChbIHJvdXRlc1tyXS5iZWZvcmUsIHJvdXRlc1tyXS5vbiBdLmZpbHRlcihCb29sZWFuKSk7XG4gICAgICAgICAgbmV4dC5hZnRlciA9IG5leHQuYWZ0ZXIuY29uY2F0KFsgcm91dGVzW3JdLmFmdGVyIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICBpZiAocm91dGVzID09PSB0aGlzLnJvdXRlcykge1xuICAgICAgICAgICAgZm5zLnB1c2goWyByb3V0ZXNbXCJiZWZvcmVcIl0sIHJvdXRlc1tcIm9uXCJdIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICAgIG5leHQuYWZ0ZXIgPSBuZXh0LmFmdGVyLmNvbmNhdChbIHJvdXRlc1tcImFmdGVyXCJdIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm5zLm1hdGNoZWQgPSB0cnVlO1xuICAgICAgICBmbnMuY2FwdHVyZXMgPSBuZXh0LmNhcHR1cmVzO1xuICAgICAgICBmbnMuYWZ0ZXIgPSBuZXh0LmFmdGVyO1xuICAgICAgICByZXR1cm4gZmlsdGVyUm91dGVzKGZucyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCByb3V0ZSwgcGFyZW50KSB7XG4gIHZhciBtZXRob2RUeXBlLCBwYXJlbnRUeXBlLCBpc0FycmF5LCBuZXN0ZWQsIHBhcnQ7XG4gIHBhdGggPSBwYXRoLmZpbHRlcihmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuIHAgJiYgcC5sZW5ndGggPiAwO1xuICB9KTtcbiAgcGFyZW50ID0gcGFyZW50IHx8IHRoaXMucm91dGVzO1xuICBwYXJ0ID0gcGF0aC5zaGlmdCgpO1xuICBpZiAoL1xcOnxcXCovLnRlc3QocGFydCkgJiYgIS9cXFxcZHxcXFxcdy8udGVzdChwYXJ0KSkge1xuICAgIHBhcnQgPSByZWdpZnlTdHJpbmcocGFydCwgdGhpcy5wYXJhbXMpO1xuICB9XG4gIGlmIChwYXRoLmxlbmd0aCA+IDApIHtcbiAgICBwYXJlbnRbcGFydF0gPSBwYXJlbnRbcGFydF0gfHwge307XG4gICAgcmV0dXJuIHRoaXMuaW5zZXJ0KG1ldGhvZCwgcGF0aCwgcm91dGUsIHBhcmVudFtwYXJ0XSk7XG4gIH1cbiAgaWYgKCFwYXJ0ICYmICFwYXRoLmxlbmd0aCAmJiBwYXJlbnQgPT09IHRoaXMucm91dGVzKSB7XG4gICAgbWV0aG9kVHlwZSA9IHR5cGVvZiBwYXJlbnRbbWV0aG9kXTtcbiAgICBzd2l0Y2ggKG1ldGhvZFR5cGUpIHtcbiAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICBwYXJlbnRbbWV0aG9kXSA9IFsgcGFyZW50W21ldGhvZF0sIHJvdXRlIF07XG4gICAgICByZXR1cm47XG4gICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgIHBhcmVudFttZXRob2RdLnB1c2gocm91dGUpO1xuICAgICAgcmV0dXJuO1xuICAgICBjYXNlIFwidW5kZWZpbmVkXCI6XG4gICAgICBwYXJlbnRbbWV0aG9kXSA9IHJvdXRlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgcGFyZW50VHlwZSA9IHR5cGVvZiBwYXJlbnRbcGFydF07XG4gIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KHBhcmVudFtwYXJ0XSk7XG4gIGlmIChwYXJlbnRbcGFydF0gJiYgIWlzQXJyYXkgJiYgcGFyZW50VHlwZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgbWV0aG9kVHlwZSA9IHR5cGVvZiBwYXJlbnRbcGFydF1bbWV0aG9kXTtcbiAgICBzd2l0Y2ggKG1ldGhvZFR5cGUpIHtcbiAgICAgY2FzZSBcImZ1bmN0aW9uXCI6XG4gICAgICBwYXJlbnRbcGFydF1bbWV0aG9kXSA9IFsgcGFyZW50W3BhcnRdW21ldGhvZF0sIHJvdXRlIF07XG4gICAgICByZXR1cm47XG4gICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgIHBhcmVudFtwYXJ0XVttZXRob2RdLnB1c2gocm91dGUpO1xuICAgICAgcmV0dXJuO1xuICAgICBjYXNlIFwidW5kZWZpbmVkXCI6XG4gICAgICBwYXJlbnRbcGFydF1bbWV0aG9kXSA9IHJvdXRlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwYXJlbnRUeXBlID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBuZXN0ZWQgPSB7fTtcbiAgICBuZXN0ZWRbbWV0aG9kXSA9IHJvdXRlO1xuICAgIHBhcmVudFtwYXJ0XSA9IG5lc3RlZDtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCByb3V0ZSBjb250ZXh0OiBcIiArIHBhcmVudFR5cGUpO1xufTtcblxuXG5cblJvdXRlci5wcm90b3R5cGUuZXh0ZW5kID0gZnVuY3Rpb24obWV0aG9kcykge1xuICB2YXIgc2VsZiA9IHRoaXMsIGxlbiA9IG1ldGhvZHMubGVuZ3RoLCBpO1xuICBmdW5jdGlvbiBleHRlbmQobWV0aG9kKSB7XG4gICAgc2VsZi5fbWV0aG9kc1ttZXRob2RdID0gdHJ1ZTtcbiAgICBzZWxmW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBleHRyYSA9IGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBbIG1ldGhvZCwgXCJcIiBdIDogWyBtZXRob2QgXTtcbiAgICAgIHNlbGYub24uYXBwbHkoc2VsZiwgZXh0cmEuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICB9XG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGV4dGVuZChtZXRob2RzW2ldKTtcbiAgfVxufTtcblxuUm91dGVyLnByb3RvdHlwZS5ydW5saXN0ID0gZnVuY3Rpb24oZm5zKSB7XG4gIHZhciBydW5saXN0ID0gdGhpcy5ldmVyeSAmJiB0aGlzLmV2ZXJ5LmJlZm9yZSA/IFsgdGhpcy5ldmVyeS5iZWZvcmUgXS5jb25jYXQoX2ZsYXR0ZW4oZm5zKSkgOiBfZmxhdHRlbihmbnMpO1xuICBpZiAodGhpcy5ldmVyeSAmJiB0aGlzLmV2ZXJ5Lm9uKSB7XG4gICAgcnVubGlzdC5wdXNoKHRoaXMuZXZlcnkub24pO1xuICB9XG4gIHJ1bmxpc3QuY2FwdHVyZXMgPSBmbnMuY2FwdHVyZXM7XG4gIHJ1bmxpc3Quc291cmNlID0gZm5zLnNvdXJjZTtcbiAgcmV0dXJuIHJ1bmxpc3Q7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24ocm91dGVzLCBwYXRoKSB7XG4gIGlmICghcm91dGVzIHx8IHR5cGVvZiByb3V0ZXMgIT09IFwib2JqZWN0XCIgfHwgQXJyYXkuaXNBcnJheShyb3V0ZXMpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcGF0aCA9IHBhdGggfHwgW107XG4gIGlmICghQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgIHBhdGggPSBwYXRoLnNwbGl0KHNlbGYuZGVsaW1pdGVyKTtcbiAgfVxuICBmdW5jdGlvbiBpbnNlcnRPck1vdW50KHJvdXRlLCBsb2NhbCkge1xuICAgIHZhciByZW5hbWUgPSByb3V0ZSwgcGFydHMgPSByb3V0ZS5zcGxpdChzZWxmLmRlbGltaXRlciksIHJvdXRlVHlwZSA9IHR5cGVvZiByb3V0ZXNbcm91dGVdLCBpc1JvdXRlID0gcGFydHNbMF0gPT09IFwiXCIgfHwgIXNlbGYuX21ldGhvZHNbcGFydHNbMF1dLCBldmVudCA9IGlzUm91dGUgPyBcIm9uXCIgOiByZW5hbWU7XG4gICAgaWYgKGlzUm91dGUpIHtcbiAgICAgIHJlbmFtZSA9IHJlbmFtZS5zbGljZSgocmVuYW1lLm1hdGNoKG5ldyBSZWdFeHAoXCJeXCIgKyBzZWxmLmRlbGltaXRlcikpIHx8IFsgXCJcIiBdKVswXS5sZW5ndGgpO1xuICAgICAgcGFydHMuc2hpZnQoKTtcbiAgICB9XG4gICAgaWYgKGlzUm91dGUgJiYgcm91dGVUeXBlID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHJvdXRlc1tyb3V0ZV0pKSB7XG4gICAgICBsb2NhbCA9IGxvY2FsLmNvbmNhdChwYXJ0cyk7XG4gICAgICBzZWxmLm1vdW50KHJvdXRlc1tyb3V0ZV0sIGxvY2FsKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzUm91dGUpIHtcbiAgICAgIGxvY2FsID0gbG9jYWwuY29uY2F0KHJlbmFtZS5zcGxpdChzZWxmLmRlbGltaXRlcikpO1xuICAgICAgbG9jYWwgPSB0ZXJtaW5hdG9yKGxvY2FsLCBzZWxmLmRlbGltaXRlcik7XG4gICAgfVxuICAgIHNlbGYuaW5zZXJ0KGV2ZW50LCBsb2NhbCwgcm91dGVzW3JvdXRlXSk7XG4gIH1cbiAgZm9yICh2YXIgcm91dGUgaW4gcm91dGVzKSB7XG4gICAgaWYgKHJvdXRlcy5oYXNPd25Qcm9wZXJ0eShyb3V0ZSkpIHtcbiAgICAgIGluc2VydE9yTW91bnQocm91dGUsIHBhdGguc2xpY2UoMCkpO1xuICAgIH1cbiAgfVxufTtcblxuXG5cbn0odHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIgPyBleHBvcnRzIDogd2luZG93KSk7IiwiLyohXG4gICogZG9tcmVhZHkgKGMpIER1c3RpbiBEaWF6IDIwMTQgLSBMaWNlbnNlIE1JVFxuICAqL1xuIWZ1bmN0aW9uIChuYW1lLCBkZWZpbml0aW9uKSB7XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpXG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JykgZGVmaW5lKGRlZmluaXRpb24pXG4gIGVsc2UgdGhpc1tuYW1lXSA9IGRlZmluaXRpb24oKVxuXG59KCdkb21yZWFkeScsIGZ1bmN0aW9uICgpIHtcblxuICB2YXIgZm5zID0gW10sIGxpc3RlbmVyXG4gICAgLCBkb2MgPSBkb2N1bWVudFxuICAgICwgaGFjayA9IGRvYy5kb2N1bWVudEVsZW1lbnQuZG9TY3JvbGxcbiAgICAsIGRvbUNvbnRlbnRMb2FkZWQgPSAnRE9NQ29udGVudExvYWRlZCdcbiAgICAsIGxvYWRlZCA9IChoYWNrID8gL15sb2FkZWR8XmMvIDogL15sb2FkZWR8Xml8XmMvKS50ZXN0KGRvYy5yZWFkeVN0YXRlKVxuXG5cbiAgaWYgKCFsb2FkZWQpXG4gIGRvYy5hZGRFdmVudExpc3RlbmVyKGRvbUNvbnRlbnRMb2FkZWQsIGxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuICAgIGRvYy5yZW1vdmVFdmVudExpc3RlbmVyKGRvbUNvbnRlbnRMb2FkZWQsIGxpc3RlbmVyKVxuICAgIGxvYWRlZCA9IDFcbiAgICB3aGlsZSAobGlzdGVuZXIgPSBmbnMuc2hpZnQoKSkgbGlzdGVuZXIoKVxuICB9KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICBsb2FkZWQgPyBzZXRUaW1lb3V0KGZuLCAwKSA6IGZucy5wdXNoKGZuKVxuICB9XG5cbn0pO1xuIiwiLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBRUiBDb2RlIEdlbmVyYXRvciBmb3IgSmF2YVNjcmlwdFxuLy9cbi8vIENvcHlyaWdodCAoYykgMjAwOSBLYXp1aGlrbyBBcmFzZVxuLy9cbi8vIFVSTDogaHR0cDovL3d3dy5kLXByb2plY3QuY29tL1xuLy9cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZTpcbi8vXHRodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuLy9cbi8vIFRoZSB3b3JkICdRUiBDb2RlJyBpcyByZWdpc3RlcmVkIHRyYWRlbWFyayBvZlxuLy8gREVOU08gV0FWRSBJTkNPUlBPUkFURURcbi8vXHRodHRwOi8vd3d3LmRlbnNvLXdhdmUuY29tL3FyY29kZS9mYXFwYXRlbnQtZS5odG1sXG4vL1xuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0cy5xcmNvZGUgPSBmdW5jdGlvbigpIHtcblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBxcmNvZGVcblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvKipcblx0ICogcXJjb2RlXG5cdCAqIEBwYXJhbSB0eXBlTnVtYmVyIDEgdG8gMTBcblx0ICogQHBhcmFtIGVycm9yQ29ycmVjdExldmVsICdMJywnTScsJ1EnLCdIJ1xuXHQgKi9cblx0dmFyIHFyY29kZSA9IGZ1bmN0aW9uKHR5cGVOdW1iZXIsIGVycm9yQ29ycmVjdExldmVsKSB7XG5cblx0XHR2YXIgUEFEMCA9IDB4RUM7XG5cdFx0dmFyIFBBRDEgPSAweDExO1xuXG5cdFx0dmFyIF90eXBlTnVtYmVyID0gdHlwZU51bWJlcjtcblx0XHR2YXIgX2Vycm9yQ29ycmVjdExldmVsID0gUVJFcnJvckNvcnJlY3RMZXZlbFtlcnJvckNvcnJlY3RMZXZlbF07XG5cdFx0dmFyIF9tb2R1bGVzID0gbnVsbDtcblx0XHR2YXIgX21vZHVsZUNvdW50ID0gMDtcblx0XHR2YXIgX2RhdGFDYWNoZSA9IG51bGw7XG5cdFx0dmFyIF9kYXRhTGlzdCA9IG5ldyBBcnJheSgpO1xuXG5cdFx0dmFyIF90aGlzID0ge307XG5cblx0XHR2YXIgbWFrZUltcGwgPSBmdW5jdGlvbih0ZXN0LCBtYXNrUGF0dGVybikge1xuXG5cdFx0XHRfbW9kdWxlQ291bnQgPSBfdHlwZU51bWJlciAqIDQgKyAxNztcblx0XHRcdF9tb2R1bGVzID0gZnVuY3Rpb24obW9kdWxlQ291bnQpIHtcblx0XHRcdFx0dmFyIG1vZHVsZXMgPSBuZXcgQXJyYXkobW9kdWxlQ291bnQpO1xuXHRcdFx0XHRmb3IgKHZhciByb3cgPSAwOyByb3cgPCBtb2R1bGVDb3VudDsgcm93ICs9IDEpIHtcblx0XHRcdFx0XHRtb2R1bGVzW3Jvd10gPSBuZXcgQXJyYXkobW9kdWxlQ291bnQpO1xuXHRcdFx0XHRcdGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1vZHVsZUNvdW50OyBjb2wgKz0gMSkge1xuXHRcdFx0XHRcdFx0bW9kdWxlc1tyb3ddW2NvbF0gPSBudWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbW9kdWxlcztcblx0XHRcdH0oX21vZHVsZUNvdW50KTtcblxuXHRcdFx0c2V0dXBQb3NpdGlvblByb2JlUGF0dGVybigwLCAwKTtcblx0XHRcdHNldHVwUG9zaXRpb25Qcm9iZVBhdHRlcm4oX21vZHVsZUNvdW50IC0gNywgMCk7XG5cdFx0XHRzZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKDAsIF9tb2R1bGVDb3VudCAtIDcpO1xuXHRcdFx0c2V0dXBQb3NpdGlvbkFkanVzdFBhdHRlcm4oKTtcblx0XHRcdHNldHVwVGltaW5nUGF0dGVybigpO1xuXHRcdFx0c2V0dXBUeXBlSW5mbyh0ZXN0LCBtYXNrUGF0dGVybik7XG5cblx0XHRcdGlmIChfdHlwZU51bWJlciA+PSA3KSB7XG5cdFx0XHRcdHNldHVwVHlwZU51bWJlcih0ZXN0KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKF9kYXRhQ2FjaGUgPT0gbnVsbCkge1xuXHRcdFx0XHRfZGF0YUNhY2hlID0gY3JlYXRlRGF0YShfdHlwZU51bWJlciwgX2Vycm9yQ29ycmVjdExldmVsLCBfZGF0YUxpc3QpO1xuXHRcdFx0fVxuXG5cdFx0XHRtYXBEYXRhKF9kYXRhQ2FjaGUsIG1hc2tQYXR0ZXJuKTtcblx0XHR9O1xuXG5cdFx0dmFyIHNldHVwUG9zaXRpb25Qcm9iZVBhdHRlcm4gPSBmdW5jdGlvbihyb3csIGNvbCkge1xuXG5cdFx0XHRmb3IgKHZhciByID0gLTE7IHIgPD0gNzsgciArPSAxKSB7XG5cblx0XHRcdFx0aWYgKHJvdyArIHIgPD0gLTEgfHwgX21vZHVsZUNvdW50IDw9IHJvdyArIHIpIGNvbnRpbnVlO1xuXG5cdFx0XHRcdGZvciAodmFyIGMgPSAtMTsgYyA8PSA3OyBjICs9IDEpIHtcblxuXHRcdFx0XHRcdGlmIChjb2wgKyBjIDw9IC0xIHx8IF9tb2R1bGVDb3VudCA8PSBjb2wgKyBjKSBjb250aW51ZTtcblxuXHRcdFx0XHRcdGlmICggKDAgPD0gciAmJiByIDw9IDYgJiYgKGMgPT0gMCB8fCBjID09IDYpIClcblx0XHRcdFx0XHRcdFx0fHwgKDAgPD0gYyAmJiBjIDw9IDYgJiYgKHIgPT0gMCB8fCByID09IDYpIClcblx0XHRcdFx0XHRcdFx0fHwgKDIgPD0gciAmJiByIDw9IDQgJiYgMiA8PSBjICYmIGMgPD0gNCkgKSB7XG5cdFx0XHRcdFx0XHRfbW9kdWxlc1tyb3cgKyByXVtjb2wgKyBjXSA9IHRydWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdF9tb2R1bGVzW3JvdyArIHJdW2NvbCArIGNdID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciBnZXRCZXN0TWFza1BhdHRlcm4gPSBmdW5jdGlvbigpIHtcblxuXHRcdFx0dmFyIG1pbkxvc3RQb2ludCA9IDA7XG5cdFx0XHR2YXIgcGF0dGVybiA9IDA7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgODsgaSArPSAxKSB7XG5cblx0XHRcdFx0bWFrZUltcGwodHJ1ZSwgaSk7XG5cblx0XHRcdFx0dmFyIGxvc3RQb2ludCA9IFFSVXRpbC5nZXRMb3N0UG9pbnQoX3RoaXMpO1xuXG5cdFx0XHRcdGlmIChpID09IDAgfHwgbWluTG9zdFBvaW50ID4gbG9zdFBvaW50KSB7XG5cdFx0XHRcdFx0bWluTG9zdFBvaW50ID0gbG9zdFBvaW50O1xuXHRcdFx0XHRcdHBhdHRlcm4gPSBpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBwYXR0ZXJuO1xuXHRcdH07XG5cblx0XHR2YXIgc2V0dXBUaW1pbmdQYXR0ZXJuID0gZnVuY3Rpb24oKSB7XG5cblx0XHRcdGZvciAodmFyIHIgPSA4OyByIDwgX21vZHVsZUNvdW50IC0gODsgciArPSAxKSB7XG5cdFx0XHRcdGlmIChfbW9kdWxlc1tyXVs2XSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0X21vZHVsZXNbcl1bNl0gPSAociAlIDIgPT0gMCk7XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIGMgPSA4OyBjIDwgX21vZHVsZUNvdW50IC0gODsgYyArPSAxKSB7XG5cdFx0XHRcdGlmIChfbW9kdWxlc1s2XVtjXSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0X21vZHVsZXNbNl1bY10gPSAoYyAlIDIgPT0gMCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciBzZXR1cFBvc2l0aW9uQWRqdXN0UGF0dGVybiA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHR2YXIgcG9zID0gUVJVdGlsLmdldFBhdHRlcm5Qb3NpdGlvbihfdHlwZU51bWJlcik7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcG9zLmxlbmd0aDsgaSArPSAxKSB7XG5cblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBwb3MubGVuZ3RoOyBqICs9IDEpIHtcblxuXHRcdFx0XHRcdHZhciByb3cgPSBwb3NbaV07XG5cdFx0XHRcdFx0dmFyIGNvbCA9IHBvc1tqXTtcblxuXHRcdFx0XHRcdGlmIChfbW9kdWxlc1tyb3ddW2NvbF0gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Zm9yICh2YXIgciA9IC0yOyByIDw9IDI7IHIgKz0gMSkge1xuXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBjID0gLTI7IGMgPD0gMjsgYyArPSAxKSB7XG5cblx0XHRcdFx0XHRcdFx0aWYgKHIgPT0gLTIgfHwgciA9PSAyIHx8IGMgPT0gLTIgfHwgYyA9PSAyXG5cdFx0XHRcdFx0XHRcdFx0XHR8fCAociA9PSAwICYmIGMgPT0gMCkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0X21vZHVsZXNbcm93ICsgcl1bY29sICsgY10gPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdF9tb2R1bGVzW3JvdyArIHJdW2NvbCArIGNdID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIHNldHVwVHlwZU51bWJlciA9IGZ1bmN0aW9uKHRlc3QpIHtcblxuXHRcdFx0dmFyIGJpdHMgPSBRUlV0aWwuZ2V0QkNIVHlwZU51bWJlcihfdHlwZU51bWJlcik7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTg7IGkgKz0gMSkge1xuXHRcdFx0XHR2YXIgbW9kID0gKCF0ZXN0ICYmICggKGJpdHMgPj4gaSkgJiAxKSA9PSAxKTtcblx0XHRcdFx0X21vZHVsZXNbTWF0aC5mbG9vcihpIC8gMyldW2kgJSAzICsgX21vZHVsZUNvdW50IC0gOCAtIDNdID0gbW9kO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDE4OyBpICs9IDEpIHtcblx0XHRcdFx0dmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG5cdFx0XHRcdF9tb2R1bGVzW2kgJSAzICsgX21vZHVsZUNvdW50IC0gOCAtIDNdW01hdGguZmxvb3IoaSAvIDMpXSA9IG1vZDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIHNldHVwVHlwZUluZm8gPSBmdW5jdGlvbih0ZXN0LCBtYXNrUGF0dGVybikge1xuXG5cdFx0XHR2YXIgZGF0YSA9IChfZXJyb3JDb3JyZWN0TGV2ZWwgPDwgMykgfCBtYXNrUGF0dGVybjtcblx0XHRcdHZhciBiaXRzID0gUVJVdGlsLmdldEJDSFR5cGVJbmZvKGRhdGEpO1xuXG5cdFx0XHQvLyB2ZXJ0aWNhbFxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAxNTsgaSArPSAxKSB7XG5cblx0XHRcdFx0dmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG5cblx0XHRcdFx0aWYgKGkgPCA2KSB7XG5cdFx0XHRcdFx0X21vZHVsZXNbaV1bOF0gPSBtb2Q7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaSA8IDgpIHtcblx0XHRcdFx0XHRfbW9kdWxlc1tpICsgMV1bOF0gPSBtb2Q7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0X21vZHVsZXNbX21vZHVsZUNvdW50IC0gMTUgKyBpXVs4XSA9IG1vZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBob3Jpem9udGFsXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDE1OyBpICs9IDEpIHtcblxuXHRcdFx0XHR2YXIgbW9kID0gKCF0ZXN0ICYmICggKGJpdHMgPj4gaSkgJiAxKSA9PSAxKTtcblxuXHRcdFx0XHRpZiAoaSA8IDgpIHtcblx0XHRcdFx0XHRfbW9kdWxlc1s4XVtfbW9kdWxlQ291bnQgLSBpIC0gMV0gPSBtb2Q7XG5cdFx0XHRcdH0gZWxzZSBpZiAoaSA8IDkpIHtcblx0XHRcdFx0XHRfbW9kdWxlc1s4XVsxNSAtIGkgLSAxICsgMV0gPSBtb2Q7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0X21vZHVsZXNbOF1bMTUgLSBpIC0gMV0gPSBtb2Q7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZml4ZWQgbW9kdWxlXG5cdFx0XHRfbW9kdWxlc1tfbW9kdWxlQ291bnQgLSA4XVs4XSA9ICghdGVzdCk7XG5cdFx0fTtcblxuXHRcdHZhciBtYXBEYXRhID0gZnVuY3Rpb24oZGF0YSwgbWFza1BhdHRlcm4pIHtcblxuXHRcdFx0dmFyIGluYyA9IC0xO1xuXHRcdFx0dmFyIHJvdyA9IF9tb2R1bGVDb3VudCAtIDE7XG5cdFx0XHR2YXIgYml0SW5kZXggPSA3O1xuXHRcdFx0dmFyIGJ5dGVJbmRleCA9IDA7XG5cdFx0XHR2YXIgbWFza0Z1bmMgPSBRUlV0aWwuZ2V0TWFza0Z1bmN0aW9uKG1hc2tQYXR0ZXJuKTtcblxuXHRcdFx0Zm9yICh2YXIgY29sID0gX21vZHVsZUNvdW50IC0gMTsgY29sID4gMDsgY29sIC09IDIpIHtcblxuXHRcdFx0XHRpZiAoY29sID09IDYpIGNvbCAtPSAxO1xuXG5cdFx0XHRcdHdoaWxlICh0cnVlKSB7XG5cblx0XHRcdFx0XHRmb3IgKHZhciBjID0gMDsgYyA8IDI7IGMgKz0gMSkge1xuXG5cdFx0XHRcdFx0XHRpZiAoX21vZHVsZXNbcm93XVtjb2wgLSBjXSA9PSBudWxsKSB7XG5cblx0XHRcdFx0XHRcdFx0dmFyIGRhcmsgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoYnl0ZUluZGV4IDwgZGF0YS5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0XHRkYXJrID0gKCAoIChkYXRhW2J5dGVJbmRleF0gPj4+IGJpdEluZGV4KSAmIDEpID09IDEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0dmFyIG1hc2sgPSBtYXNrRnVuYyhyb3csIGNvbCAtIGMpO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChtYXNrKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZGFyayA9ICFkYXJrO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0X21vZHVsZXNbcm93XVtjb2wgLSBjXSA9IGRhcms7XG5cdFx0XHRcdFx0XHRcdGJpdEluZGV4IC09IDE7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGJpdEluZGV4ID09IC0xKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ynl0ZUluZGV4ICs9IDE7XG5cdFx0XHRcdFx0XHRcdFx0Yml0SW5kZXggPSA3O1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cm93ICs9IGluYztcblxuXHRcdFx0XHRcdGlmIChyb3cgPCAwIHx8IF9tb2R1bGVDb3VudCA8PSByb3cpIHtcblx0XHRcdFx0XHRcdHJvdyAtPSBpbmM7XG5cdFx0XHRcdFx0XHRpbmMgPSAtaW5jO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZhciBjcmVhdGVCeXRlcyA9IGZ1bmN0aW9uKGJ1ZmZlciwgcnNCbG9ja3MpIHtcblxuXHRcdFx0dmFyIG9mZnNldCA9IDA7XG5cblx0XHRcdHZhciBtYXhEY0NvdW50ID0gMDtcblx0XHRcdHZhciBtYXhFY0NvdW50ID0gMDtcblxuXHRcdFx0dmFyIGRjZGF0YSA9IG5ldyBBcnJheShyc0Jsb2Nrcy5sZW5ndGgpO1xuXHRcdFx0dmFyIGVjZGF0YSA9IG5ldyBBcnJheShyc0Jsb2Nrcy5sZW5ndGgpO1xuXG5cdFx0XHRmb3IgKHZhciByID0gMDsgciA8IHJzQmxvY2tzLmxlbmd0aDsgciArPSAxKSB7XG5cblx0XHRcdFx0dmFyIGRjQ291bnQgPSByc0Jsb2Nrc1tyXS5kYXRhQ291bnQ7XG5cdFx0XHRcdHZhciBlY0NvdW50ID0gcnNCbG9ja3Nbcl0udG90YWxDb3VudCAtIGRjQ291bnQ7XG5cblx0XHRcdFx0bWF4RGNDb3VudCA9IE1hdGgubWF4KG1heERjQ291bnQsIGRjQ291bnQpO1xuXHRcdFx0XHRtYXhFY0NvdW50ID0gTWF0aC5tYXgobWF4RWNDb3VudCwgZWNDb3VudCk7XG5cblx0XHRcdFx0ZGNkYXRhW3JdID0gbmV3IEFycmF5KGRjQ291bnQpO1xuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGNkYXRhW3JdLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRcdFx0ZGNkYXRhW3JdW2ldID0gMHhmZiAmIGJ1ZmZlci5nZXRCdWZmZXIoKVtpICsgb2Zmc2V0XTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvZmZzZXQgKz0gZGNDb3VudDtcblxuXHRcdFx0XHR2YXIgcnNQb2x5ID0gUVJVdGlsLmdldEVycm9yQ29ycmVjdFBvbHlub21pYWwoZWNDb3VudCk7XG5cdFx0XHRcdHZhciByYXdQb2x5ID0gcXJQb2x5bm9taWFsKGRjZGF0YVtyXSwgcnNQb2x5LmdldExlbmd0aCgpIC0gMSk7XG5cblx0XHRcdFx0dmFyIG1vZFBvbHkgPSByYXdQb2x5Lm1vZChyc1BvbHkpO1xuXHRcdFx0XHRlY2RhdGFbcl0gPSBuZXcgQXJyYXkocnNQb2x5LmdldExlbmd0aCgpIC0gMSk7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWNkYXRhW3JdLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRcdFx0dmFyIG1vZEluZGV4ID0gaSArIG1vZFBvbHkuZ2V0TGVuZ3RoKCkgLSBlY2RhdGFbcl0ubGVuZ3RoO1xuXHRcdFx0XHRcdGVjZGF0YVtyXVtpXSA9IChtb2RJbmRleCA+PSAwKT8gbW9kUG9seS5nZXQobW9kSW5kZXgpIDogMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR2YXIgdG90YWxDb2RlQ291bnQgPSAwO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByc0Jsb2Nrcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHR0b3RhbENvZGVDb3VudCArPSByc0Jsb2Nrc1tpXS50b3RhbENvdW50O1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZGF0YSA9IG5ldyBBcnJheSh0b3RhbENvZGVDb3VudCk7XG5cdFx0XHR2YXIgaW5kZXggPSAwO1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1heERjQ291bnQ7IGkgKz0gMSkge1xuXHRcdFx0XHRmb3IgKHZhciByID0gMDsgciA8IHJzQmxvY2tzLmxlbmd0aDsgciArPSAxKSB7XG5cdFx0XHRcdFx0aWYgKGkgPCBkY2RhdGFbcl0ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRkYXRhW2luZGV4XSA9IGRjZGF0YVtyXVtpXTtcblx0XHRcdFx0XHRcdGluZGV4ICs9IDE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4RWNDb3VudDsgaSArPSAxKSB7XG5cdFx0XHRcdGZvciAodmFyIHIgPSAwOyByIDwgcnNCbG9ja3MubGVuZ3RoOyByICs9IDEpIHtcblx0XHRcdFx0XHRpZiAoaSA8IGVjZGF0YVtyXS5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdGRhdGFbaW5kZXhdID0gZWNkYXRhW3JdW2ldO1xuXHRcdFx0XHRcdFx0aW5kZXggKz0gMTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fTtcblxuXHRcdHZhciBjcmVhdGVEYXRhID0gZnVuY3Rpb24odHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwsIGRhdGFMaXN0KSB7XG5cblx0XHRcdHZhciByc0Jsb2NrcyA9IFFSUlNCbG9jay5nZXRSU0Jsb2Nrcyh0eXBlTnVtYmVyLCBlcnJvckNvcnJlY3RMZXZlbCk7XG5cblx0XHRcdHZhciBidWZmZXIgPSBxckJpdEJ1ZmZlcigpO1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRhdGFMaXN0Lmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRcdHZhciBkYXRhID0gZGF0YUxpc3RbaV07XG5cdFx0XHRcdGJ1ZmZlci5wdXQoZGF0YS5nZXRNb2RlKCksIDQpO1xuXHRcdFx0XHRidWZmZXIucHV0KGRhdGEuZ2V0TGVuZ3RoKCksIFFSVXRpbC5nZXRMZW5ndGhJbkJpdHMoZGF0YS5nZXRNb2RlKCksIHR5cGVOdW1iZXIpICk7XG5cdFx0XHRcdGRhdGEud3JpdGUoYnVmZmVyKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2FsYyBudW0gbWF4IGRhdGEuXG5cdFx0XHR2YXIgdG90YWxEYXRhQ291bnQgPSAwO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByc0Jsb2Nrcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHR0b3RhbERhdGFDb3VudCArPSByc0Jsb2Nrc1tpXS5kYXRhQ291bnQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKCkgPiB0b3RhbERhdGFDb3VudCAqIDgpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdjb2RlIGxlbmd0aCBvdmVyZmxvdy4gKCdcblx0XHRcdFx0XHQrIGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKVxuXHRcdFx0XHRcdCsgJz4nXG5cdFx0XHRcdFx0KyB0b3RhbERhdGFDb3VudCAqIDhcblx0XHRcdFx0XHQrICcpJyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGVuZCBjb2RlXG5cdFx0XHRpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpICsgNCA8PSB0b3RhbERhdGFDb3VudCAqIDgpIHtcblx0XHRcdFx0YnVmZmVyLnB1dCgwLCA0KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gcGFkZGluZ1xuXHRcdFx0d2hpbGUgKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSAlIDggIT0gMCkge1xuXHRcdFx0XHRidWZmZXIucHV0Qml0KGZhbHNlKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gcGFkZGluZ1xuXHRcdFx0d2hpbGUgKHRydWUpIHtcblxuXHRcdFx0XHRpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpID49IHRvdGFsRGF0YUNvdW50ICogOCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJ1ZmZlci5wdXQoUEFEMCwgOCk7XG5cblx0XHRcdFx0aWYgKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSA+PSB0b3RhbERhdGFDb3VudCAqIDgpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0XHRidWZmZXIucHV0KFBBRDEsIDgpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gY3JlYXRlQnl0ZXMoYnVmZmVyLCByc0Jsb2Nrcyk7XG5cdFx0fTtcblxuXHRcdF90aGlzLmFkZERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHR2YXIgbmV3RGF0YSA9IHFyOEJpdEJ5dGUoZGF0YSk7XG5cdFx0XHRfZGF0YUxpc3QucHVzaChuZXdEYXRhKTtcblx0XHRcdF9kYXRhQ2FjaGUgPSBudWxsO1xuXHRcdH07XG5cblx0XHRfdGhpcy5pc0RhcmsgPSBmdW5jdGlvbihyb3csIGNvbCkge1xuXHRcdFx0aWYgKHJvdyA8IDAgfHwgX21vZHVsZUNvdW50IDw9IHJvdyB8fCBjb2wgPCAwIHx8IF9tb2R1bGVDb3VudCA8PSBjb2wpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHJvdyArICcsJyArIGNvbCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gX21vZHVsZXNbcm93XVtjb2xdO1xuXHRcdH07XG5cblx0XHRfdGhpcy5nZXRNb2R1bGVDb3VudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIF9tb2R1bGVDb3VudDtcblx0XHR9O1xuXG5cdFx0X3RoaXMubWFrZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0bWFrZUltcGwoZmFsc2UsIGdldEJlc3RNYXNrUGF0dGVybigpICk7XG5cdFx0fTtcblxuXHRcdF90aGlzLmNyZWF0ZVRhYmxlVGFnID0gZnVuY3Rpb24oY2VsbFNpemUsIG1hcmdpbikge1xuXG5cdFx0XHRjZWxsU2l6ZSA9IGNlbGxTaXplIHx8IDI7XG5cdFx0XHRtYXJnaW4gPSAodHlwZW9mIG1hcmdpbiA9PSAndW5kZWZpbmVkJyk/IGNlbGxTaXplICogNCA6IG1hcmdpbjtcblxuXHRcdFx0dmFyIHFySHRtbCA9ICcnO1xuXG5cdFx0XHRxckh0bWwgKz0gJzx0YWJsZSBzdHlsZT1cIic7XG5cdFx0XHRxckh0bWwgKz0gJyBib3JkZXItd2lkdGg6IDBweDsgYm9yZGVyLXN0eWxlOiBub25lOyc7XG5cdFx0XHRxckh0bWwgKz0gJyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyc7XG5cdFx0XHRxckh0bWwgKz0gJyBwYWRkaW5nOiAwcHg7IG1hcmdpbjogJyArIG1hcmdpbiArICdweDsnO1xuXHRcdFx0cXJIdG1sICs9ICdcIj4nO1xuXHRcdFx0cXJIdG1sICs9ICc8dGJvZHk+JztcblxuXHRcdFx0Zm9yICh2YXIgciA9IDA7IHIgPCBfdGhpcy5nZXRNb2R1bGVDb3VudCgpOyByICs9IDEpIHtcblxuXHRcdFx0XHRxckh0bWwgKz0gJzx0cj4nO1xuXG5cdFx0XHRcdGZvciAodmFyIGMgPSAwOyBjIDwgX3RoaXMuZ2V0TW9kdWxlQ291bnQoKTsgYyArPSAxKSB7XG5cdFx0XHRcdFx0cXJIdG1sICs9ICc8dGQgc3R5bGU9XCInO1xuXHRcdFx0XHRcdHFySHRtbCArPSAnIGJvcmRlci13aWR0aDogMHB4OyBib3JkZXItc3R5bGU6IG5vbmU7Jztcblx0XHRcdFx0XHRxckh0bWwgKz0gJyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyc7XG5cdFx0XHRcdFx0cXJIdG1sICs9ICcgcGFkZGluZzogMHB4OyBtYXJnaW46IDBweDsnO1xuXHRcdFx0XHRcdHFySHRtbCArPSAnIHdpZHRoOiAnICsgY2VsbFNpemUgKyAncHg7Jztcblx0XHRcdFx0XHRxckh0bWwgKz0gJyBoZWlnaHQ6ICcgKyBjZWxsU2l6ZSArICdweDsnO1xuXHRcdFx0XHRcdHFySHRtbCArPSAnIGJhY2tncm91bmQtY29sb3I6ICc7XG5cdFx0XHRcdFx0cXJIdG1sICs9IF90aGlzLmlzRGFyayhyLCBjKT8gJyMwMDAwMDAnIDogJyNmZmZmZmYnO1xuXHRcdFx0XHRcdHFySHRtbCArPSAnOyc7XG5cdFx0XHRcdFx0cXJIdG1sICs9ICdcIi8+Jztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHFySHRtbCArPSAnPC90cj4nO1xuXHRcdFx0fVxuXG5cdFx0XHRxckh0bWwgKz0gJzwvdGJvZHk+Jztcblx0XHRcdHFySHRtbCArPSAnPC90YWJsZT4nO1xuXG5cdFx0XHRyZXR1cm4gcXJIdG1sO1xuXHRcdH07XG5cblx0XHRfdGhpcy5jcmVhdGVJbWdUYWcgPSBmdW5jdGlvbihjZWxsU2l6ZSwgbWFyZ2luKSB7XG5cblx0XHRcdGNlbGxTaXplID0gY2VsbFNpemUgfHwgMjtcblx0XHRcdG1hcmdpbiA9ICh0eXBlb2YgbWFyZ2luID09ICd1bmRlZmluZWQnKT8gY2VsbFNpemUgKiA0IDogbWFyZ2luO1xuXG5cdFx0XHR2YXIgc2l6ZSA9IF90aGlzLmdldE1vZHVsZUNvdW50KCkgKiBjZWxsU2l6ZSArIG1hcmdpbiAqIDI7XG5cdFx0XHR2YXIgbWluID0gbWFyZ2luO1xuXHRcdFx0dmFyIG1heCA9IHNpemUgLSBtYXJnaW47XG5cblx0XHRcdHJldHVybiBjcmVhdGVJbWdUYWcoc2l6ZSwgc2l6ZSwgZnVuY3Rpb24oeCwgeSkge1xuXHRcdFx0XHRpZiAobWluIDw9IHggJiYgeCA8IG1heCAmJiBtaW4gPD0geSAmJiB5IDwgbWF4KSB7XG5cdFx0XHRcdFx0dmFyIGMgPSBNYXRoLmZsb29yKCAoeCAtIG1pbikgLyBjZWxsU2l6ZSk7XG5cdFx0XHRcdFx0dmFyIHIgPSBNYXRoLmZsb29yKCAoeSAtIG1pbikgLyBjZWxsU2l6ZSk7XG5cdFx0XHRcdFx0cmV0dXJuIF90aGlzLmlzRGFyayhyLCBjKT8gMCA6IDE7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIF90aGlzO1xuXHR9O1xuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIHFyY29kZS5zdHJpbmdUb0J5dGVzXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0cXJjb2RlLnN0cmluZ1RvQnl0ZXMgPSBmdW5jdGlvbihzKSB7XG5cdFx0dmFyIGJ5dGVzID0gbmV3IEFycmF5KCk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHR2YXIgYyA9IHMuY2hhckNvZGVBdChpKTtcblx0XHRcdGJ5dGVzLnB1c2goYyAmIDB4ZmYpO1xuXHRcdH1cblx0XHRyZXR1cm4gYnl0ZXM7XG5cdH07XG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0Ly8gcXJjb2RlLmNyZWF0ZVN0cmluZ1RvQnl0ZXNcblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvKipcblx0ICogQHBhcmFtIHVuaWNvZGVEYXRhIGJhc2U2NCBzdHJpbmcgb2YgYnl0ZSBhcnJheS5cblx0ICogWzE2Yml0IFVuaWNvZGVdLFsxNmJpdCBCeXRlc10sIC4uLlxuXHQgKiBAcGFyYW0gbnVtQ2hhcnNcblx0ICovXG5cdHFyY29kZS5jcmVhdGVTdHJpbmdUb0J5dGVzID0gZnVuY3Rpb24odW5pY29kZURhdGEsIG51bUNoYXJzKSB7XG5cblx0XHQvLyBjcmVhdGUgY29udmVyc2lvbiBtYXAuXG5cblx0XHR2YXIgdW5pY29kZU1hcCA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHR2YXIgYmluID0gYmFzZTY0RGVjb2RlSW5wdXRTdHJlYW0odW5pY29kZURhdGEpO1xuXHRcdFx0dmFyIHJlYWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGIgPSBiaW4ucmVhZCgpO1xuXHRcdFx0XHRpZiAoYiA9PSAtMSkgdGhyb3cgbmV3IEVycm9yKCk7XG5cdFx0XHRcdHJldHVybiBiO1xuXHRcdFx0fTtcblxuXHRcdFx0dmFyIGNvdW50ID0gMDtcblx0XHRcdHZhciB1bmljb2RlTWFwID0ge307XG5cdFx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0XHR2YXIgYjAgPSBiaW4ucmVhZCgpO1xuXHRcdFx0XHRpZiAoYjAgPT0gLTEpIGJyZWFrO1xuXHRcdFx0XHR2YXIgYjEgPSByZWFkKCk7XG5cdFx0XHRcdHZhciBiMiA9IHJlYWQoKTtcblx0XHRcdFx0dmFyIGIzID0gcmVhZCgpO1xuXHRcdFx0XHR2YXIgayA9IFN0cmluZy5mcm9tQ2hhckNvZGUoIChiMCA8PCA4KSB8IGIxKTtcblx0XHRcdFx0dmFyIHYgPSAoYjIgPDwgOCkgfCBiMztcblx0XHRcdFx0dW5pY29kZU1hcFtrXSA9IHY7XG5cdFx0XHRcdGNvdW50ICs9IDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY291bnQgIT0gbnVtQ2hhcnMpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGNvdW50ICsgJyAhPSAnICsgbnVtQ2hhcnMpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdW5pY29kZU1hcDtcblx0XHR9KCk7XG5cblx0XHR2YXIgdW5rbm93bkNoYXIgPSAnPycuY2hhckNvZGVBdCgwKTtcblxuXHRcdHJldHVybiBmdW5jdGlvbihzKSB7XG5cdFx0XHR2YXIgYnl0ZXMgPSBuZXcgQXJyYXkoKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHR2YXIgYyA9IHMuY2hhckNvZGVBdChpKTtcblx0XHRcdFx0aWYgKGMgPCAxMjgpIHtcblx0XHRcdFx0XHRieXRlcy5wdXNoKGMpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciBiID0gdW5pY29kZU1hcFtzLmNoYXJBdChpKV07XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBiID09ICdudW1iZXInKSB7XG5cdFx0XHRcdFx0XHRpZiAoIChiICYgMHhmZikgPT0gYikge1xuXHRcdFx0XHRcdFx0XHQvLyAxYnl0ZVxuXHRcdFx0XHRcdFx0XHRieXRlcy5wdXNoKGIpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly8gMmJ5dGVzXG5cdFx0XHRcdFx0XHRcdGJ5dGVzLnB1c2goYiA+Pj4gOCk7XG5cdFx0XHRcdFx0XHRcdGJ5dGVzLnB1c2goYiAmIDB4ZmYpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRieXRlcy5wdXNoKHVua25vd25DaGFyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBieXRlcztcblx0XHR9O1xuXHR9O1xuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIFFSTW9kZVxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBRUk1vZGUgPSB7XG5cdFx0TU9ERV9OVU1CRVIgOlx0XHQxIDw8IDAsXG5cdFx0TU9ERV9BTFBIQV9OVU0gOiBcdDEgPDwgMSxcblx0XHRNT0RFXzhCSVRfQllURSA6IFx0MSA8PCAyLFxuXHRcdE1PREVfS0FOSkkgOlx0XHQxIDw8IDNcblx0fTtcblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBRUkVycm9yQ29ycmVjdExldmVsXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIFFSRXJyb3JDb3JyZWN0TGV2ZWwgPSB7XG5cdFx0TCA6IDEsXG5cdFx0TSA6IDAsXG5cdFx0USA6IDMsXG5cdFx0SCA6IDJcblx0fTtcblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBRUk1hc2tQYXR0ZXJuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIFFSTWFza1BhdHRlcm4gPSB7XG5cdFx0UEFUVEVSTjAwMCA6IDAsXG5cdFx0UEFUVEVSTjAwMSA6IDEsXG5cdFx0UEFUVEVSTjAxMCA6IDIsXG5cdFx0UEFUVEVSTjAxMSA6IDMsXG5cdFx0UEFUVEVSTjEwMCA6IDQsXG5cdFx0UEFUVEVSTjEwMSA6IDUsXG5cdFx0UEFUVEVSTjExMCA6IDYsXG5cdFx0UEFUVEVSTjExMSA6IDdcblx0fTtcblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBRUlV0aWxcblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHR2YXIgUVJVdGlsID0gZnVuY3Rpb24oKSB7XG5cblx0XHR2YXIgUEFUVEVSTl9QT1NJVElPTl9UQUJMRSA9IFtcblx0XHRcdFtdLFxuXHRcdFx0WzYsIDE4XSxcblx0XHRcdFs2LCAyMl0sXG5cdFx0XHRbNiwgMjZdLFxuXHRcdFx0WzYsIDMwXSxcblx0XHRcdFs2LCAzNF0sXG5cdFx0XHRbNiwgMjIsIDM4XSxcblx0XHRcdFs2LCAyNCwgNDJdLFxuXHRcdFx0WzYsIDI2LCA0Nl0sXG5cdFx0XHRbNiwgMjgsIDUwXSxcblx0XHRcdFs2LCAzMCwgNTRdLFxuXHRcdFx0WzYsIDMyLCA1OF0sXG5cdFx0XHRbNiwgMzQsIDYyXSxcblx0XHRcdFs2LCAyNiwgNDYsIDY2XSxcblx0XHRcdFs2LCAyNiwgNDgsIDcwXSxcblx0XHRcdFs2LCAyNiwgNTAsIDc0XSxcblx0XHRcdFs2LCAzMCwgNTQsIDc4XSxcblx0XHRcdFs2LCAzMCwgNTYsIDgyXSxcblx0XHRcdFs2LCAzMCwgNTgsIDg2XSxcblx0XHRcdFs2LCAzNCwgNjIsIDkwXSxcblx0XHRcdFs2LCAyOCwgNTAsIDcyLCA5NF0sXG5cdFx0XHRbNiwgMjYsIDUwLCA3NCwgOThdLFxuXHRcdFx0WzYsIDMwLCA1NCwgNzgsIDEwMl0sXG5cdFx0XHRbNiwgMjgsIDU0LCA4MCwgMTA2XSxcblx0XHRcdFs2LCAzMiwgNTgsIDg0LCAxMTBdLFxuXHRcdFx0WzYsIDMwLCA1OCwgODYsIDExNF0sXG5cdFx0XHRbNiwgMzQsIDYyLCA5MCwgMTE4XSxcblx0XHRcdFs2LCAyNiwgNTAsIDc0LCA5OCwgMTIyXSxcblx0XHRcdFs2LCAzMCwgNTQsIDc4LCAxMDIsIDEyNl0sXG5cdFx0XHRbNiwgMjYsIDUyLCA3OCwgMTA0LCAxMzBdLFxuXHRcdFx0WzYsIDMwLCA1NiwgODIsIDEwOCwgMTM0XSxcblx0XHRcdFs2LCAzNCwgNjAsIDg2LCAxMTIsIDEzOF0sXG5cdFx0XHRbNiwgMzAsIDU4LCA4NiwgMTE0LCAxNDJdLFxuXHRcdFx0WzYsIDM0LCA2MiwgOTAsIDExOCwgMTQ2XSxcblx0XHRcdFs2LCAzMCwgNTQsIDc4LCAxMDIsIDEyNiwgMTUwXSxcblx0XHRcdFs2LCAyNCwgNTAsIDc2LCAxMDIsIDEyOCwgMTU0XSxcblx0XHRcdFs2LCAyOCwgNTQsIDgwLCAxMDYsIDEzMiwgMTU4XSxcblx0XHRcdFs2LCAzMiwgNTgsIDg0LCAxMTAsIDEzNiwgMTYyXSxcblx0XHRcdFs2LCAyNiwgNTQsIDgyLCAxMTAsIDEzOCwgMTY2XSxcblx0XHRcdFs2LCAzMCwgNTgsIDg2LCAxMTQsIDE0MiwgMTcwXVxuXHRcdF07XG5cdFx0dmFyIEcxNSA9ICgxIDw8IDEwKSB8ICgxIDw8IDgpIHwgKDEgPDwgNSkgfCAoMSA8PCA0KSB8ICgxIDw8IDIpIHwgKDEgPDwgMSkgfCAoMSA8PCAwKTtcblx0XHR2YXIgRzE4ID0gKDEgPDwgMTIpIHwgKDEgPDwgMTEpIHwgKDEgPDwgMTApIHwgKDEgPDwgOSkgfCAoMSA8PCA4KSB8ICgxIDw8IDUpIHwgKDEgPDwgMikgfCAoMSA8PCAwKTtcblx0XHR2YXIgRzE1X01BU0sgPSAoMSA8PCAxNCkgfCAoMSA8PCAxMikgfCAoMSA8PCAxMCkgfCAoMSA8PCA0KSB8ICgxIDw8IDEpO1xuXG5cdFx0dmFyIF90aGlzID0ge307XG5cblx0XHR2YXIgZ2V0QkNIRGlnaXQgPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHR2YXIgZGlnaXQgPSAwO1xuXHRcdFx0d2hpbGUgKGRhdGEgIT0gMCkge1xuXHRcdFx0XHRkaWdpdCArPSAxO1xuXHRcdFx0XHRkYXRhID4+Pj0gMTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkaWdpdDtcblx0XHR9O1xuXG5cdFx0X3RoaXMuZ2V0QkNIVHlwZUluZm8gPSBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHR2YXIgZCA9IGRhdGEgPDwgMTA7XG5cdFx0XHR3aGlsZSAoZ2V0QkNIRGlnaXQoZCkgLSBnZXRCQ0hEaWdpdChHMTUpID49IDApIHtcblx0XHRcdFx0ZCBePSAoRzE1IDw8IChnZXRCQ0hEaWdpdChkKSAtIGdldEJDSERpZ2l0KEcxNSkgKSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICggKGRhdGEgPDwgMTApIHwgZCkgXiBHMTVfTUFTSztcblx0XHR9O1xuXG5cdFx0X3RoaXMuZ2V0QkNIVHlwZU51bWJlciA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHZhciBkID0gZGF0YSA8PCAxMjtcblx0XHRcdHdoaWxlIChnZXRCQ0hEaWdpdChkKSAtIGdldEJDSERpZ2l0KEcxOCkgPj0gMCkge1xuXHRcdFx0XHRkIF49IChHMTggPDwgKGdldEJDSERpZ2l0KGQpIC0gZ2V0QkNIRGlnaXQoRzE4KSApICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gKGRhdGEgPDwgMTIpIHwgZDtcblx0XHR9O1xuXG5cdFx0X3RoaXMuZ2V0UGF0dGVyblBvc2l0aW9uID0gZnVuY3Rpb24odHlwZU51bWJlcikge1xuXHRcdFx0cmV0dXJuIFBBVFRFUk5fUE9TSVRJT05fVEFCTEVbdHlwZU51bWJlciAtIDFdO1xuXHRcdH07XG5cblx0XHRfdGhpcy5nZXRNYXNrRnVuY3Rpb24gPSBmdW5jdGlvbihtYXNrUGF0dGVybikge1xuXG5cdFx0XHRzd2l0Y2ggKG1hc2tQYXR0ZXJuKSB7XG5cblx0XHRcdGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDAwIDpcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGksIGopIHsgcmV0dXJuIChpICsgaikgJSAyID09IDA7IH07XG5cdFx0XHRjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjAwMSA6XG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbihpLCBqKSB7IHJldHVybiBpICUgMiA9PSAwOyB9O1xuXHRcdFx0Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4wMTAgOlxuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oaSwgaikgeyByZXR1cm4gaiAlIDMgPT0gMDsgfTtcblx0XHRcdGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDExIDpcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGksIGopIHsgcmV0dXJuIChpICsgaikgJSAzID09IDA7IH07XG5cdFx0XHRjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjEwMCA6XG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbihpLCBqKSB7IHJldHVybiAoTWF0aC5mbG9vcihpIC8gMikgKyBNYXRoLmZsb29yKGogLyAzKSApICUgMiA9PSAwOyB9O1xuXHRcdFx0Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMDEgOlxuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oaSwgaikgeyByZXR1cm4gKGkgKiBqKSAlIDIgKyAoaSAqIGopICUgMyA9PSAwOyB9O1xuXHRcdFx0Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMTAgOlxuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oaSwgaikgeyByZXR1cm4gKCAoaSAqIGopICUgMiArIChpICogaikgJSAzKSAlIDIgPT0gMDsgfTtcblx0XHRcdGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMTExIDpcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGksIGopIHsgcmV0dXJuICggKGkgKiBqKSAlIDMgKyAoaSArIGopICUgMikgJSAyID09IDA7IH07XG5cblx0XHRcdGRlZmF1bHQgOlxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2JhZCBtYXNrUGF0dGVybjonICsgbWFza1BhdHRlcm4pO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRfdGhpcy5nZXRFcnJvckNvcnJlY3RQb2x5bm9taWFsID0gZnVuY3Rpb24oZXJyb3JDb3JyZWN0TGVuZ3RoKSB7XG5cdFx0XHR2YXIgYSA9IHFyUG9seW5vbWlhbChbMV0sIDApO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlcnJvckNvcnJlY3RMZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHRhID0gYS5tdWx0aXBseShxclBvbHlub21pYWwoWzEsIFFSTWF0aC5nZXhwKGkpXSwgMCkgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBhO1xuXHRcdH07XG5cblx0XHRfdGhpcy5nZXRMZW5ndGhJbkJpdHMgPSBmdW5jdGlvbihtb2RlLCB0eXBlKSB7XG5cblx0XHRcdGlmICgxIDw9IHR5cGUgJiYgdHlwZSA8IDEwKSB7XG5cblx0XHRcdFx0Ly8gMSAtIDlcblxuXHRcdFx0XHRzd2l0Y2gobW9kZSkge1xuXHRcdFx0XHRjYXNlIFFSTW9kZS5NT0RFX05VTUJFUiBcdDogcmV0dXJuIDEwO1xuXHRcdFx0XHRjYXNlIFFSTW9kZS5NT0RFX0FMUEhBX05VTSBcdDogcmV0dXJuIDk7XG5cdFx0XHRcdGNhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFXHQ6IHJldHVybiA4O1xuXHRcdFx0XHRjYXNlIFFSTW9kZS5NT0RFX0tBTkpJXHRcdDogcmV0dXJuIDg7XG5cdFx0XHRcdGRlZmF1bHQgOlxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignbW9kZTonICsgbW9kZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSBlbHNlIGlmICh0eXBlIDwgMjcpIHtcblxuXHRcdFx0XHQvLyAxMCAtIDI2XG5cblx0XHRcdFx0c3dpdGNoKG1vZGUpIHtcblx0XHRcdFx0Y2FzZSBRUk1vZGUuTU9ERV9OVU1CRVIgXHQ6IHJldHVybiAxMjtcblx0XHRcdFx0Y2FzZSBRUk1vZGUuTU9ERV9BTFBIQV9OVU0gXHQ6IHJldHVybiAxMTtcblx0XHRcdFx0Y2FzZSBRUk1vZGUuTU9ERV84QklUX0JZVEVcdDogcmV0dXJuIDE2O1xuXHRcdFx0XHRjYXNlIFFSTW9kZS5NT0RFX0tBTkpJXHRcdDogcmV0dXJuIDEwO1xuXHRcdFx0XHRkZWZhdWx0IDpcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ21vZGU6JyArIG1vZGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSBpZiAodHlwZSA8IDQxKSB7XG5cblx0XHRcdFx0Ly8gMjcgLSA0MFxuXG5cdFx0XHRcdHN3aXRjaChtb2RlKSB7XG5cdFx0XHRcdGNhc2UgUVJNb2RlLk1PREVfTlVNQkVSIFx0OiByZXR1cm4gMTQ7XG5cdFx0XHRcdGNhc2UgUVJNb2RlLk1PREVfQUxQSEFfTlVNXHQ6IHJldHVybiAxMztcblx0XHRcdFx0Y2FzZSBRUk1vZGUuTU9ERV84QklUX0JZVEVcdDogcmV0dXJuIDE2O1xuXHRcdFx0XHRjYXNlIFFSTW9kZS5NT0RFX0tBTkpJXHRcdDogcmV0dXJuIDEyO1xuXHRcdFx0XHRkZWZhdWx0IDpcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ21vZGU6JyArIG1vZGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcigndHlwZTonICsgdHlwZSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdF90aGlzLmdldExvc3RQb2ludCA9IGZ1bmN0aW9uKHFyY29kZSkge1xuXG5cdFx0XHR2YXIgbW9kdWxlQ291bnQgPSBxcmNvZGUuZ2V0TW9kdWxlQ291bnQoKTtcblxuXHRcdFx0dmFyIGxvc3RQb2ludCA9IDA7XG5cblx0XHRcdC8vIExFVkVMMVxuXG5cdFx0XHRmb3IgKHZhciByb3cgPSAwOyByb3cgPCBtb2R1bGVDb3VudDsgcm93ICs9IDEpIHtcblx0XHRcdFx0Zm9yICh2YXIgY29sID0gMDsgY29sIDwgbW9kdWxlQ291bnQ7IGNvbCArPSAxKSB7XG5cblx0XHRcdFx0XHR2YXIgc2FtZUNvdW50ID0gMDtcblx0XHRcdFx0XHR2YXIgZGFyayA9IHFyY29kZS5pc0Rhcmsocm93LCBjb2wpO1xuXG5cdFx0XHRcdFx0Zm9yICh2YXIgciA9IC0xOyByIDw9IDE7IHIgKz0gMSkge1xuXG5cdFx0XHRcdFx0XHRpZiAocm93ICsgciA8IDAgfHwgbW9kdWxlQ291bnQgPD0gcm93ICsgcikge1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgYyA9IC0xOyBjIDw9IDE7IGMgKz0gMSkge1xuXG5cdFx0XHRcdFx0XHRcdGlmIChjb2wgKyBjIDwgMCB8fCBtb2R1bGVDb3VudCA8PSBjb2wgKyBjKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRpZiAociA9PSAwICYmIGMgPT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0aWYgKGRhcmsgPT0gcXJjb2RlLmlzRGFyayhyb3cgKyByLCBjb2wgKyBjKSApIHtcblx0XHRcdFx0XHRcdFx0XHRzYW1lQ291bnQgKz0gMTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzYW1lQ291bnQgPiA1KSB7XG5cdFx0XHRcdFx0XHRsb3N0UG9pbnQgKz0gKDMgKyBzYW1lQ291bnQgLSA1KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdC8vIExFVkVMMlxuXG5cdFx0XHRmb3IgKHZhciByb3cgPSAwOyByb3cgPCBtb2R1bGVDb3VudCAtIDE7IHJvdyArPSAxKSB7XG5cdFx0XHRcdGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1vZHVsZUNvdW50IC0gMTsgY29sICs9IDEpIHtcblx0XHRcdFx0XHR2YXIgY291bnQgPSAwO1xuXHRcdFx0XHRcdGlmIChxcmNvZGUuaXNEYXJrKHJvdywgY29sKSApIGNvdW50ICs9IDE7XG5cdFx0XHRcdFx0aWYgKHFyY29kZS5pc0Rhcmsocm93ICsgMSwgY29sKSApIGNvdW50ICs9IDE7XG5cdFx0XHRcdFx0aWYgKHFyY29kZS5pc0Rhcmsocm93LCBjb2wgKyAxKSApIGNvdW50ICs9IDE7XG5cdFx0XHRcdFx0aWYgKHFyY29kZS5pc0Rhcmsocm93ICsgMSwgY29sICsgMSkgKSBjb3VudCArPSAxO1xuXHRcdFx0XHRcdGlmIChjb3VudCA9PSAwIHx8IGNvdW50ID09IDQpIHtcblx0XHRcdFx0XHRcdGxvc3RQb2ludCArPSAzO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBMRVZFTDNcblxuXHRcdFx0Zm9yICh2YXIgcm93ID0gMDsgcm93IDwgbW9kdWxlQ291bnQ7IHJvdyArPSAxKSB7XG5cdFx0XHRcdGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1vZHVsZUNvdW50IC0gNjsgY29sICs9IDEpIHtcblx0XHRcdFx0XHRpZiAocXJjb2RlLmlzRGFyayhyb3csIGNvbClcblx0XHRcdFx0XHRcdFx0JiYgIXFyY29kZS5pc0Rhcmsocm93LCBjb2wgKyAxKVxuXHRcdFx0XHRcdFx0XHQmJiAgcXJjb2RlLmlzRGFyayhyb3csIGNvbCArIDIpXG5cdFx0XHRcdFx0XHRcdCYmICBxcmNvZGUuaXNEYXJrKHJvdywgY29sICsgMylcblx0XHRcdFx0XHRcdFx0JiYgIHFyY29kZS5pc0Rhcmsocm93LCBjb2wgKyA0KVxuXHRcdFx0XHRcdFx0XHQmJiAhcXJjb2RlLmlzRGFyayhyb3csIGNvbCArIDUpXG5cdFx0XHRcdFx0XHRcdCYmICBxcmNvZGUuaXNEYXJrKHJvdywgY29sICsgNikgKSB7XG5cdFx0XHRcdFx0XHRsb3N0UG9pbnQgKz0gNDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1vZHVsZUNvdW50OyBjb2wgKz0gMSkge1xuXHRcdFx0XHRmb3IgKHZhciByb3cgPSAwOyByb3cgPCBtb2R1bGVDb3VudCAtIDY7IHJvdyArPSAxKSB7XG5cdFx0XHRcdFx0aWYgKHFyY29kZS5pc0Rhcmsocm93LCBjb2wpXG5cdFx0XHRcdFx0XHRcdCYmICFxcmNvZGUuaXNEYXJrKHJvdyArIDEsIGNvbClcblx0XHRcdFx0XHRcdFx0JiYgIHFyY29kZS5pc0Rhcmsocm93ICsgMiwgY29sKVxuXHRcdFx0XHRcdFx0XHQmJiAgcXJjb2RlLmlzRGFyayhyb3cgKyAzLCBjb2wpXG5cdFx0XHRcdFx0XHRcdCYmICBxcmNvZGUuaXNEYXJrKHJvdyArIDQsIGNvbClcblx0XHRcdFx0XHRcdFx0JiYgIXFyY29kZS5pc0Rhcmsocm93ICsgNSwgY29sKVxuXHRcdFx0XHRcdFx0XHQmJiAgcXJjb2RlLmlzRGFyayhyb3cgKyA2LCBjb2wpICkge1xuXHRcdFx0XHRcdFx0bG9zdFBvaW50ICs9IDQwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBMRVZFTDRcblxuXHRcdFx0dmFyIGRhcmtDb3VudCA9IDA7XG5cblx0XHRcdGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1vZHVsZUNvdW50OyBjb2wgKz0gMSkge1xuXHRcdFx0XHRmb3IgKHZhciByb3cgPSAwOyByb3cgPCBtb2R1bGVDb3VudDsgcm93ICs9IDEpIHtcblx0XHRcdFx0XHRpZiAocXJjb2RlLmlzRGFyayhyb3csIGNvbCkgKSB7XG5cdFx0XHRcdFx0XHRkYXJrQ291bnQgKz0gMTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dmFyIHJhdGlvID0gTWF0aC5hYnMoMTAwICogZGFya0NvdW50IC8gbW9kdWxlQ291bnQgLyBtb2R1bGVDb3VudCAtIDUwKSAvIDU7XG5cdFx0XHRsb3N0UG9pbnQgKz0gcmF0aW8gKiAxMDtcblxuXHRcdFx0cmV0dXJuIGxvc3RQb2ludDtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIF90aGlzO1xuXHR9KCk7XG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0Ly8gUVJNYXRoXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIFFSTWF0aCA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0dmFyIEVYUF9UQUJMRSA9IG5ldyBBcnJheSgyNTYpO1xuXHRcdHZhciBMT0dfVEFCTEUgPSBuZXcgQXJyYXkoMjU2KTtcblxuXHRcdC8vIGluaXRpYWxpemUgdGFibGVzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpICs9IDEpIHtcblx0XHRcdEVYUF9UQUJMRVtpXSA9IDEgPDwgaTtcblx0XHR9XG5cdFx0Zm9yICh2YXIgaSA9IDg7IGkgPCAyNTY7IGkgKz0gMSkge1xuXHRcdFx0RVhQX1RBQkxFW2ldID0gRVhQX1RBQkxFW2kgLSA0XVxuXHRcdFx0XHReIEVYUF9UQUJMRVtpIC0gNV1cblx0XHRcdFx0XiBFWFBfVEFCTEVbaSAtIDZdXG5cdFx0XHRcdF4gRVhQX1RBQkxFW2kgLSA4XTtcblx0XHR9XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyNTU7IGkgKz0gMSkge1xuXHRcdFx0TE9HX1RBQkxFW0VYUF9UQUJMRVtpXSBdID0gaTtcblx0XHR9XG5cblx0XHR2YXIgX3RoaXMgPSB7fTtcblxuXHRcdF90aGlzLmdsb2cgPSBmdW5jdGlvbihuKSB7XG5cblx0XHRcdGlmIChuIDwgMSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2dsb2coJyArIG4gKyAnKScpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gTE9HX1RBQkxFW25dO1xuXHRcdH07XG5cblx0XHRfdGhpcy5nZXhwID0gZnVuY3Rpb24obikge1xuXG5cdFx0XHR3aGlsZSAobiA8IDApIHtcblx0XHRcdFx0biArPSAyNTU7XG5cdFx0XHR9XG5cblx0XHRcdHdoaWxlIChuID49IDI1Nikge1xuXHRcdFx0XHRuIC09IDI1NTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEVYUF9UQUJMRVtuXTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIF90aGlzO1xuXHR9KCk7XG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0Ly8gcXJQb2x5bm9taWFsXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0ZnVuY3Rpb24gcXJQb2x5bm9taWFsKG51bSwgc2hpZnQpIHtcblxuXHRcdGlmICh0eXBlb2YgbnVtLmxlbmd0aCA9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKG51bS5sZW5ndGggKyAnLycgKyBzaGlmdCk7XG5cdFx0fVxuXG5cdFx0dmFyIF9udW0gPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBvZmZzZXQgPSAwO1xuXHRcdFx0d2hpbGUgKG9mZnNldCA8IG51bS5sZW5ndGggJiYgbnVtW29mZnNldF0gPT0gMCkge1xuXHRcdFx0XHRvZmZzZXQgKz0gMTtcblx0XHRcdH1cblx0XHRcdHZhciBfbnVtID0gbmV3IEFycmF5KG51bS5sZW5ndGggLSBvZmZzZXQgKyBzaGlmdCk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG51bS5sZW5ndGggLSBvZmZzZXQ7IGkgKz0gMSkge1xuXHRcdFx0XHRfbnVtW2ldID0gbnVtW2kgKyBvZmZzZXRdO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIF9udW07XG5cdFx0fSgpO1xuXG5cdFx0dmFyIF90aGlzID0ge307XG5cblx0XHRfdGhpcy5nZXQgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0cmV0dXJuIF9udW1baW5kZXhdO1xuXHRcdH07XG5cblx0XHRfdGhpcy5nZXRMZW5ndGggPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBfbnVtLmxlbmd0aDtcblx0XHR9O1xuXG5cdFx0X3RoaXMubXVsdGlwbHkgPSBmdW5jdGlvbihlKSB7XG5cblx0XHRcdHZhciBudW0gPSBuZXcgQXJyYXkoX3RoaXMuZ2V0TGVuZ3RoKCkgKyBlLmdldExlbmd0aCgpIC0gMSk7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgX3RoaXMuZ2V0TGVuZ3RoKCk7IGkgKz0gMSkge1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGUuZ2V0TGVuZ3RoKCk7IGogKz0gMSkge1xuXHRcdFx0XHRcdG51bVtpICsgal0gXj0gUVJNYXRoLmdleHAoUVJNYXRoLmdsb2coX3RoaXMuZ2V0KGkpICkgKyBRUk1hdGguZ2xvZyhlLmdldChqKSApICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHFyUG9seW5vbWlhbChudW0sIDApO1xuXHRcdH07XG5cblx0XHRfdGhpcy5tb2QgPSBmdW5jdGlvbihlKSB7XG5cblx0XHRcdGlmIChfdGhpcy5nZXRMZW5ndGgoKSAtIGUuZ2V0TGVuZ3RoKCkgPCAwKSB7XG5cdFx0XHRcdHJldHVybiBfdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dmFyIHJhdGlvID0gUVJNYXRoLmdsb2coX3RoaXMuZ2V0KDApICkgLSBRUk1hdGguZ2xvZyhlLmdldCgwKSApO1xuXG5cdFx0XHR2YXIgbnVtID0gbmV3IEFycmF5KF90aGlzLmdldExlbmd0aCgpICk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IF90aGlzLmdldExlbmd0aCgpOyBpICs9IDEpIHtcblx0XHRcdFx0bnVtW2ldID0gX3RoaXMuZ2V0KGkpO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGUuZ2V0TGVuZ3RoKCk7IGkgKz0gMSkge1xuXHRcdFx0XHRudW1baV0gXj0gUVJNYXRoLmdleHAoUVJNYXRoLmdsb2coZS5nZXQoaSkgKSArIHJhdGlvKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gcmVjdXJzaXZlIGNhbGxcblx0XHRcdHJldHVybiBxclBvbHlub21pYWwobnVtLCAwKS5tb2QoZSk7XG5cdFx0fTtcblxuXHRcdHJldHVybiBfdGhpcztcblx0fTtcblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBRUlJTQmxvY2tcblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHR2YXIgUVJSU0Jsb2NrID0gZnVuY3Rpb24oKSB7XG5cblx0XHR2YXIgUlNfQkxPQ0tfVEFCTEUgPSBbXG5cblx0XHRcdC8vIExcblx0XHRcdC8vIE1cblx0XHRcdC8vIFFcblx0XHRcdC8vIEhcblxuXHRcdFx0Ly8gMVxuXHRcdFx0WzEsIDI2LCAxOV0sXG5cdFx0XHRbMSwgMjYsIDE2XSxcblx0XHRcdFsxLCAyNiwgMTNdLFxuXHRcdFx0WzEsIDI2LCA5XSxcblxuXHRcdFx0Ly8gMlxuXHRcdFx0WzEsIDQ0LCAzNF0sXG5cdFx0XHRbMSwgNDQsIDI4XSxcblx0XHRcdFsxLCA0NCwgMjJdLFxuXHRcdFx0WzEsIDQ0LCAxNl0sXG5cblx0XHRcdC8vIDNcblx0XHRcdFsxLCA3MCwgNTVdLFxuXHRcdFx0WzEsIDcwLCA0NF0sXG5cdFx0XHRbMiwgMzUsIDE3XSxcblx0XHRcdFsyLCAzNSwgMTNdLFxuXG5cdFx0XHQvLyA0XG5cdFx0XHRbMSwgMTAwLCA4MF0sXG5cdFx0XHRbMiwgNTAsIDMyXSxcblx0XHRcdFsyLCA1MCwgMjRdLFxuXHRcdFx0WzQsIDI1LCA5XSxcblxuXHRcdFx0Ly8gNVxuXHRcdFx0WzEsIDEzNCwgMTA4XSxcblx0XHRcdFsyLCA2NywgNDNdLFxuXHRcdFx0WzIsIDMzLCAxNSwgMiwgMzQsIDE2XSxcblx0XHRcdFsyLCAzMywgMTEsIDIsIDM0LCAxMl0sXG5cblx0XHRcdC8vIDZcblx0XHRcdFsyLCA4NiwgNjhdLFxuXHRcdFx0WzQsIDQzLCAyN10sXG5cdFx0XHRbNCwgNDMsIDE5XSxcblx0XHRcdFs0LCA0MywgMTVdLFxuXG5cdFx0XHQvLyA3XG5cdFx0XHRbMiwgOTgsIDc4XSxcblx0XHRcdFs0LCA0OSwgMzFdLFxuXHRcdFx0WzIsIDMyLCAxNCwgNCwgMzMsIDE1XSxcblx0XHRcdFs0LCAzOSwgMTMsIDEsIDQwLCAxNF0sXG5cblx0XHRcdC8vIDhcblx0XHRcdFsyLCAxMjEsIDk3XSxcblx0XHRcdFsyLCA2MCwgMzgsIDIsIDYxLCAzOV0sXG5cdFx0XHRbNCwgNDAsIDE4LCAyLCA0MSwgMTldLFxuXHRcdFx0WzQsIDQwLCAxNCwgMiwgNDEsIDE1XSxcblxuXHRcdFx0Ly8gOVxuXHRcdFx0WzIsIDE0NiwgMTE2XSxcblx0XHRcdFszLCA1OCwgMzYsIDIsIDU5LCAzN10sXG5cdFx0XHRbNCwgMzYsIDE2LCA0LCAzNywgMTddLFxuXHRcdFx0WzQsIDM2LCAxMiwgNCwgMzcsIDEzXSxcblxuXHRcdFx0Ly8gMTBcblx0XHRcdFsyLCA4NiwgNjgsIDIsIDg3LCA2OV0sXG5cdFx0XHRbNCwgNjksIDQzLCAxLCA3MCwgNDRdLFxuXHRcdFx0WzYsIDQzLCAxOSwgMiwgNDQsIDIwXSxcblx0XHRcdFs2LCA0MywgMTUsIDIsIDQ0LCAxNl1cblx0XHRdO1xuXG5cdFx0dmFyIHFyUlNCbG9jayA9IGZ1bmN0aW9uKHRvdGFsQ291bnQsIGRhdGFDb3VudCkge1xuXHRcdFx0dmFyIF90aGlzID0ge307XG5cdFx0XHRfdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcblx0XHRcdF90aGlzLmRhdGFDb3VudCA9IGRhdGFDb3VudDtcblx0XHRcdHJldHVybiBfdGhpcztcblx0XHR9O1xuXG5cdFx0dmFyIF90aGlzID0ge307XG5cblx0XHR2YXIgZ2V0UnNCbG9ja1RhYmxlID0gZnVuY3Rpb24odHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpIHtcblxuXHRcdFx0c3dpdGNoKGVycm9yQ29ycmVjdExldmVsKSB7XG5cdFx0XHRjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuTCA6XG5cdFx0XHRcdHJldHVybiBSU19CTE9DS19UQUJMRVsodHlwZU51bWJlciAtIDEpICogNCArIDBdO1xuXHRcdFx0Y2FzZSBRUkVycm9yQ29ycmVjdExldmVsLk0gOlxuXHRcdFx0XHRyZXR1cm4gUlNfQkxPQ0tfVEFCTEVbKHR5cGVOdW1iZXIgLSAxKSAqIDQgKyAxXTtcblx0XHRcdGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5RIDpcblx0XHRcdFx0cmV0dXJuIFJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgMl07XG5cdFx0XHRjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuSCA6XG5cdFx0XHRcdHJldHVybiBSU19CTE9DS19UQUJMRVsodHlwZU51bWJlciAtIDEpICogNCArIDNdO1xuXHRcdFx0ZGVmYXVsdCA6XG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdF90aGlzLmdldFJTQmxvY2tzID0gZnVuY3Rpb24odHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpIHtcblxuXHRcdFx0dmFyIHJzQmxvY2sgPSBnZXRSc0Jsb2NrVGFibGUodHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpO1xuXG5cdFx0XHRpZiAodHlwZW9mIHJzQmxvY2sgPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdiYWQgcnMgYmxvY2sgQCB0eXBlTnVtYmVyOicgKyB0eXBlTnVtYmVyICtcblx0XHRcdFx0XHRcdCcvZXJyb3JDb3JyZWN0TGV2ZWw6JyArIGVycm9yQ29ycmVjdExldmVsKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGxlbmd0aCA9IHJzQmxvY2subGVuZ3RoIC8gMztcblxuXHRcdFx0dmFyIGxpc3QgPSBuZXcgQXJyYXkoKTtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuXG5cdFx0XHRcdHZhciBjb3VudCA9IHJzQmxvY2tbaSAqIDMgKyAwXTtcblx0XHRcdFx0dmFyIHRvdGFsQ291bnQgPSByc0Jsb2NrW2kgKiAzICsgMV07XG5cdFx0XHRcdHZhciBkYXRhQ291bnQgPSByc0Jsb2NrW2kgKiAzICsgMl07XG5cblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBjb3VudDsgaiArPSAxKSB7XG5cdFx0XHRcdFx0bGlzdC5wdXNoKHFyUlNCbG9jayh0b3RhbENvdW50LCBkYXRhQ291bnQpICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGxpc3Q7XG5cdFx0fTtcblxuXHRcdHJldHVybiBfdGhpcztcblx0fSgpO1xuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIHFyQml0QnVmZmVyXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIHFyQml0QnVmZmVyID0gZnVuY3Rpb24oKSB7XG5cblx0XHR2YXIgX2J1ZmZlciA9IG5ldyBBcnJheSgpO1xuXHRcdHZhciBfbGVuZ3RoID0gMDtcblxuXHRcdHZhciBfdGhpcyA9IHt9O1xuXG5cdFx0X3RoaXMuZ2V0QnVmZmVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gX2J1ZmZlcjtcblx0XHR9O1xuXG5cdFx0X3RoaXMuZ2V0ID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdHZhciBidWZJbmRleCA9IE1hdGguZmxvb3IoaW5kZXggLyA4KTtcblx0XHRcdHJldHVybiAoIChfYnVmZmVyW2J1ZkluZGV4XSA+Pj4gKDcgLSBpbmRleCAlIDgpICkgJiAxKSA9PSAxO1xuXHRcdH07XG5cblx0XHRfdGhpcy5wdXQgPSBmdW5jdGlvbihudW0sIGxlbmd0aCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHRfdGhpcy5wdXRCaXQoICggKG51bSA+Pj4gKGxlbmd0aCAtIGkgLSAxKSApICYgMSkgPT0gMSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdF90aGlzLmdldExlbmd0aEluQml0cyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIF9sZW5ndGg7XG5cdFx0fTtcblxuXHRcdF90aGlzLnB1dEJpdCA9IGZ1bmN0aW9uKGJpdCkge1xuXG5cdFx0XHR2YXIgYnVmSW5kZXggPSBNYXRoLmZsb29yKF9sZW5ndGggLyA4KTtcblx0XHRcdGlmIChfYnVmZmVyLmxlbmd0aCA8PSBidWZJbmRleCkge1xuXHRcdFx0XHRfYnVmZmVyLnB1c2goMCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChiaXQpIHtcblx0XHRcdFx0X2J1ZmZlcltidWZJbmRleF0gfD0gKDB4ODAgPj4+IChfbGVuZ3RoICUgOCkgKTtcblx0XHRcdH1cblxuXHRcdFx0X2xlbmd0aCArPSAxO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gX3RoaXM7XG5cdH07XG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0Ly8gcXI4Qml0Qnl0ZVxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBxcjhCaXRCeXRlID0gZnVuY3Rpb24oZGF0YSkge1xuXG5cdFx0dmFyIF9tb2RlID0gUVJNb2RlLk1PREVfOEJJVF9CWVRFO1xuXHRcdHZhciBfZGF0YSA9IGRhdGE7XG5cdFx0dmFyIF9ieXRlcyA9IHFyY29kZS5zdHJpbmdUb0J5dGVzKGRhdGEpO1xuXG5cdFx0dmFyIF90aGlzID0ge307XG5cblx0XHRfdGhpcy5nZXRNb2RlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gX21vZGU7XG5cdFx0fTtcblxuXHRcdF90aGlzLmdldExlbmd0aCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0cmV0dXJuIF9ieXRlcy5sZW5ndGg7XG5cdFx0fTtcblxuXHRcdF90aGlzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IF9ieXRlcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHRidWZmZXIucHV0KF9ieXRlc1tpXSwgOCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHJldHVybiBfdGhpcztcblx0fTtcblxuXHQvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHQvLyBHSUYgU3VwcG9ydCBldGMuXG5cdC8vXG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0Ly8gYnl0ZUFycmF5T3V0cHV0U3RyZWFtXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIGJ5dGVBcnJheU91dHB1dFN0cmVhbSA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0dmFyIF9ieXRlcyA9IG5ldyBBcnJheSgpO1xuXG5cdFx0dmFyIF90aGlzID0ge307XG5cblx0XHRfdGhpcy53cml0ZUJ5dGUgPSBmdW5jdGlvbihiKSB7XG5cdFx0XHRfYnl0ZXMucHVzaChiICYgMHhmZik7XG5cdFx0fTtcblxuXHRcdF90aGlzLndyaXRlU2hvcnQgPSBmdW5jdGlvbihpKSB7XG5cdFx0XHRfdGhpcy53cml0ZUJ5dGUoaSk7XG5cdFx0XHRfdGhpcy53cml0ZUJ5dGUoaSA+Pj4gOCk7XG5cdFx0fTtcblxuXHRcdF90aGlzLndyaXRlQnl0ZXMgPSBmdW5jdGlvbihiLCBvZmYsIGxlbikge1xuXHRcdFx0b2ZmID0gb2ZmIHx8IDA7XG5cdFx0XHRsZW4gPSBsZW4gfHwgYi5sZW5ndGg7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAxKSB7XG5cdFx0XHRcdF90aGlzLndyaXRlQnl0ZShiW2kgKyBvZmZdKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0X3RoaXMud3JpdGVTdHJpbmcgPSBmdW5jdGlvbihzKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdFx0X3RoaXMud3JpdGVCeXRlKHMuY2hhckNvZGVBdChpKSApO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRfdGhpcy50b0J5dGVBcnJheSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIF9ieXRlcztcblx0XHR9O1xuXG5cdFx0X3RoaXMudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzID0gJyc7XG5cdFx0XHRzICs9ICdbJztcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgX2J5dGVzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRcdGlmIChpID4gMCkge1xuXHRcdFx0XHRcdHMgKz0gJywnO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHMgKz0gX2J5dGVzW2ldO1xuXHRcdFx0fVxuXHRcdFx0cyArPSAnXSc7XG5cdFx0XHRyZXR1cm4gcztcblx0XHR9O1xuXG5cdFx0cmV0dXJuIF90aGlzO1xuXHR9O1xuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIGJhc2U2NEVuY29kZU91dHB1dFN0cmVhbVxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdHZhciBiYXNlNjRFbmNvZGVPdXRwdXRTdHJlYW0gPSBmdW5jdGlvbigpIHtcblxuXHRcdHZhciBfYnVmZmVyID0gMDtcblx0XHR2YXIgX2J1ZmxlbiA9IDA7XG5cdFx0dmFyIF9sZW5ndGggPSAwO1xuXHRcdHZhciBfYmFzZTY0ID0gJyc7XG5cblx0XHR2YXIgX3RoaXMgPSB7fTtcblxuXHRcdHZhciB3cml0ZUVuY29kZWQgPSBmdW5jdGlvbihiKSB7XG5cdFx0XHRfYmFzZTY0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZW5jb2RlKGIgJiAweDNmKSApO1xuXHRcdH07XG5cblx0XHR2YXIgZW5jb2RlID0gZnVuY3Rpb24obikge1xuXHRcdFx0aWYgKG4gPCAwKSB7XG5cdFx0XHRcdC8vIGVycm9yLlxuXHRcdFx0fSBlbHNlIGlmIChuIDwgMjYpIHtcblx0XHRcdFx0cmV0dXJuIDB4NDEgKyBuO1xuXHRcdFx0fSBlbHNlIGlmIChuIDwgNTIpIHtcblx0XHRcdFx0cmV0dXJuIDB4NjEgKyAobiAtIDI2KTtcblx0XHRcdH0gZWxzZSBpZiAobiA8IDYyKSB7XG5cdFx0XHRcdHJldHVybiAweDMwICsgKG4gLSA1Mik7XG5cdFx0XHR9IGVsc2UgaWYgKG4gPT0gNjIpIHtcblx0XHRcdFx0cmV0dXJuIDB4MmI7XG5cdFx0XHR9IGVsc2UgaWYgKG4gPT0gNjMpIHtcblx0XHRcdFx0cmV0dXJuIDB4MmY7XG5cdFx0XHR9XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ246JyArIG4pO1xuXHRcdH07XG5cblx0XHRfdGhpcy53cml0ZUJ5dGUgPSBmdW5jdGlvbihuKSB7XG5cblx0XHRcdF9idWZmZXIgPSAoX2J1ZmZlciA8PCA4KSB8IChuICYgMHhmZik7XG5cdFx0XHRfYnVmbGVuICs9IDg7XG5cdFx0XHRfbGVuZ3RoICs9IDE7XG5cblx0XHRcdHdoaWxlIChfYnVmbGVuID49IDYpIHtcblx0XHRcdFx0d3JpdGVFbmNvZGVkKF9idWZmZXIgPj4+IChfYnVmbGVuIC0gNikgKTtcblx0XHRcdFx0X2J1ZmxlbiAtPSA2O1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRfdGhpcy5mbHVzaCA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRpZiAoX2J1ZmxlbiA+IDApIHtcblx0XHRcdFx0d3JpdGVFbmNvZGVkKF9idWZmZXIgPDwgKDYgLSBfYnVmbGVuKSApO1xuXHRcdFx0XHRfYnVmZmVyID0gMDtcblx0XHRcdFx0X2J1ZmxlbiA9IDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfbGVuZ3RoICUgMyAhPSAwKSB7XG5cdFx0XHRcdC8vIHBhZGRpbmdcblx0XHRcdFx0dmFyIHBhZGxlbiA9IDMgLSBfbGVuZ3RoICUgMztcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBwYWRsZW47IGkgKz0gMSkge1xuXHRcdFx0XHRcdF9iYXNlNjQgKz0gJz0nO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdF90aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gX2Jhc2U2NDtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIF90aGlzO1xuXHR9O1xuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIGJhc2U2NERlY29kZUlucHV0U3RyZWFtXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIGJhc2U2NERlY29kZUlucHV0U3RyZWFtID0gZnVuY3Rpb24oc3RyKSB7XG5cblx0XHR2YXIgX3N0ciA9IHN0cjtcblx0XHR2YXIgX3BvcyA9IDA7XG5cdFx0dmFyIF9idWZmZXIgPSAwO1xuXHRcdHZhciBfYnVmbGVuID0gMDtcblxuXHRcdHZhciBfdGhpcyA9IHt9O1xuXG5cdFx0X3RoaXMucmVhZCA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHR3aGlsZSAoX2J1ZmxlbiA8IDgpIHtcblxuXHRcdFx0XHRpZiAoX3BvcyA+PSBfc3RyLmxlbmd0aCkge1xuXHRcdFx0XHRcdGlmIChfYnVmbGVuID09IDApIHtcblx0XHRcdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkIGVuZCBvZiBmaWxlLi8nICsgX2J1Zmxlbik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgYyA9IF9zdHIuY2hhckF0KF9wb3MpO1xuXHRcdFx0XHRfcG9zICs9IDE7XG5cblx0XHRcdFx0aWYgKGMgPT0gJz0nKSB7XG5cdFx0XHRcdFx0X2J1ZmxlbiA9IDA7XG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGMubWF0Y2goL15cXHMkLykgKSB7XG5cdFx0XHRcdFx0Ly8gaWdub3JlIGlmIHdoaXRlc3BhY2UuXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRfYnVmZmVyID0gKF9idWZmZXIgPDwgNikgfCBkZWNvZGUoYy5jaGFyQ29kZUF0KDApICk7XG5cdFx0XHRcdF9idWZsZW4gKz0gNjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIG4gPSAoX2J1ZmZlciA+Pj4gKF9idWZsZW4gLSA4KSApICYgMHhmZjtcblx0XHRcdF9idWZsZW4gLT0gODtcblx0XHRcdHJldHVybiBuO1xuXHRcdH07XG5cblx0XHR2YXIgZGVjb2RlID0gZnVuY3Rpb24oYykge1xuXHRcdFx0aWYgKDB4NDEgPD0gYyAmJiBjIDw9IDB4NWEpIHtcblx0XHRcdFx0cmV0dXJuIGMgLSAweDQxO1xuXHRcdFx0fSBlbHNlIGlmICgweDYxIDw9IGMgJiYgYyA8PSAweDdhKSB7XG5cdFx0XHRcdHJldHVybiBjIC0gMHg2MSArIDI2O1xuXHRcdFx0fSBlbHNlIGlmICgweDMwIDw9IGMgJiYgYyA8PSAweDM5KSB7XG5cdFx0XHRcdHJldHVybiBjIC0gMHgzMCArIDUyO1xuXHRcdFx0fSBlbHNlIGlmIChjID09IDB4MmIpIHtcblx0XHRcdFx0cmV0dXJuIDYyO1xuXHRcdFx0fSBlbHNlIGlmIChjID09IDB4MmYpIHtcblx0XHRcdFx0cmV0dXJuIDYzO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdjOicgKyBjKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cmV0dXJuIF90aGlzO1xuXHR9O1xuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIGdpZkltYWdlIChCL1cpXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0dmFyIGdpZkltYWdlID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCkge1xuXG5cdFx0dmFyIF93aWR0aCA9IHdpZHRoO1xuXHRcdHZhciBfaGVpZ2h0ID0gaGVpZ2h0O1xuXHRcdHZhciBfZGF0YSA9IG5ldyBBcnJheSh3aWR0aCAqIGhlaWdodCk7XG5cblx0XHR2YXIgX3RoaXMgPSB7fTtcblxuXHRcdF90aGlzLnNldFBpeGVsID0gZnVuY3Rpb24oeCwgeSwgcGl4ZWwpIHtcblx0XHRcdF9kYXRhW3kgKiBfd2lkdGggKyB4XSA9IHBpeGVsO1xuXHRcdH07XG5cblx0XHRfdGhpcy53cml0ZSA9IGZ1bmN0aW9uKG91dCkge1xuXG5cdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFx0Ly8gR0lGIFNpZ25hdHVyZVxuXG5cdFx0XHRvdXQud3JpdGVTdHJpbmcoJ0dJRjg3YScpO1xuXG5cdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFx0Ly8gU2NyZWVuIERlc2NyaXB0b3JcblxuXHRcdFx0b3V0LndyaXRlU2hvcnQoX3dpZHRoKTtcblx0XHRcdG91dC53cml0ZVNob3J0KF9oZWlnaHQpO1xuXG5cdFx0XHRvdXQud3JpdGVCeXRlKDB4ODApOyAvLyAyYml0XG5cdFx0XHRvdXQud3JpdGVCeXRlKDApO1xuXHRcdFx0b3V0LndyaXRlQnl0ZSgwKTtcblxuXHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdC8vIEdsb2JhbCBDb2xvciBNYXBcblxuXHRcdFx0Ly8gYmxhY2tcblx0XHRcdG91dC53cml0ZUJ5dGUoMHgwMCk7XG5cdFx0XHRvdXQud3JpdGVCeXRlKDB4MDApO1xuXHRcdFx0b3V0LndyaXRlQnl0ZSgweDAwKTtcblxuXHRcdFx0Ly8gd2hpdGVcblx0XHRcdG91dC53cml0ZUJ5dGUoMHhmZik7XG5cdFx0XHRvdXQud3JpdGVCeXRlKDB4ZmYpO1xuXHRcdFx0b3V0LndyaXRlQnl0ZSgweGZmKTtcblxuXHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdC8vIEltYWdlIERlc2NyaXB0b3JcblxuXHRcdFx0b3V0LndyaXRlU3RyaW5nKCcsJyk7XG5cdFx0XHRvdXQud3JpdGVTaG9ydCgwKTtcblx0XHRcdG91dC53cml0ZVNob3J0KDApO1xuXHRcdFx0b3V0LndyaXRlU2hvcnQoX3dpZHRoKTtcblx0XHRcdG91dC53cml0ZVNob3J0KF9oZWlnaHQpO1xuXHRcdFx0b3V0LndyaXRlQnl0ZSgwKTtcblxuXHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdC8vIExvY2FsIENvbG9yIE1hcFxuXG5cdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFx0Ly8gUmFzdGVyIERhdGFcblxuXHRcdFx0dmFyIGx6d01pbkNvZGVTaXplID0gMjtcblx0XHRcdHZhciByYXN0ZXIgPSBnZXRMWldSYXN0ZXIobHp3TWluQ29kZVNpemUpO1xuXG5cdFx0XHRvdXQud3JpdGVCeXRlKGx6d01pbkNvZGVTaXplKTtcblxuXHRcdFx0dmFyIG9mZnNldCA9IDA7XG5cblx0XHRcdHdoaWxlIChyYXN0ZXIubGVuZ3RoIC0gb2Zmc2V0ID4gMjU1KSB7XG5cdFx0XHRcdG91dC53cml0ZUJ5dGUoMjU1KTtcblx0XHRcdFx0b3V0LndyaXRlQnl0ZXMocmFzdGVyLCBvZmZzZXQsIDI1NSk7XG5cdFx0XHRcdG9mZnNldCArPSAyNTU7XG5cdFx0XHR9XG5cblx0XHRcdG91dC53cml0ZUJ5dGUocmFzdGVyLmxlbmd0aCAtIG9mZnNldCk7XG5cdFx0XHRvdXQud3JpdGVCeXRlcyhyYXN0ZXIsIG9mZnNldCwgcmFzdGVyLmxlbmd0aCAtIG9mZnNldCk7XG5cdFx0XHRvdXQud3JpdGVCeXRlKDB4MDApO1xuXG5cdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFx0Ly8gR0lGIFRlcm1pbmF0b3Jcblx0XHRcdG91dC53cml0ZVN0cmluZygnOycpO1xuXHRcdH07XG5cblx0XHR2YXIgYml0T3V0cHV0U3RyZWFtID0gZnVuY3Rpb24ob3V0KSB7XG5cblx0XHRcdHZhciBfb3V0ID0gb3V0O1xuXHRcdFx0dmFyIF9iaXRMZW5ndGggPSAwO1xuXHRcdFx0dmFyIF9iaXRCdWZmZXIgPSAwO1xuXG5cdFx0XHR2YXIgX3RoaXMgPSB7fTtcblxuXHRcdFx0X3RoaXMud3JpdGUgPSBmdW5jdGlvbihkYXRhLCBsZW5ndGgpIHtcblxuXHRcdFx0XHRpZiAoIChkYXRhID4+PiBsZW5ndGgpICE9IDApIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2xlbmd0aCBvdmVyJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3aGlsZSAoX2JpdExlbmd0aCArIGxlbmd0aCA+PSA4KSB7XG5cdFx0XHRcdFx0X291dC53cml0ZUJ5dGUoMHhmZiAmICggKGRhdGEgPDwgX2JpdExlbmd0aCkgfCBfYml0QnVmZmVyKSApO1xuXHRcdFx0XHRcdGxlbmd0aCAtPSAoOCAtIF9iaXRMZW5ndGgpO1xuXHRcdFx0XHRcdGRhdGEgPj4+PSAoOCAtIF9iaXRMZW5ndGgpO1xuXHRcdFx0XHRcdF9iaXRCdWZmZXIgPSAwO1xuXHRcdFx0XHRcdF9iaXRMZW5ndGggPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0X2JpdEJ1ZmZlciA9IChkYXRhIDw8IF9iaXRMZW5ndGgpIHwgX2JpdEJ1ZmZlcjtcblx0XHRcdFx0X2JpdExlbmd0aCA9IF9iaXRMZW5ndGggKyBsZW5ndGg7XG5cdFx0XHR9O1xuXG5cdFx0XHRfdGhpcy5mbHVzaCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoX2JpdExlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRfb3V0LndyaXRlQnl0ZShfYml0QnVmZmVyKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIF90aGlzO1xuXHRcdH07XG5cblx0XHR2YXIgZ2V0TFpXUmFzdGVyID0gZnVuY3Rpb24obHp3TWluQ29kZVNpemUpIHtcblxuXHRcdFx0dmFyIGNsZWFyQ29kZSA9IDEgPDwgbHp3TWluQ29kZVNpemU7XG5cdFx0XHR2YXIgZW5kQ29kZSA9ICgxIDw8IGx6d01pbkNvZGVTaXplKSArIDE7XG5cdFx0XHR2YXIgYml0TGVuZ3RoID0gbHp3TWluQ29kZVNpemUgKyAxO1xuXG5cdFx0XHQvLyBTZXR1cCBMWldUYWJsZVxuXHRcdFx0dmFyIHRhYmxlID0gbHp3VGFibGUoKTtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjbGVhckNvZGU7IGkgKz0gMSkge1xuXHRcdFx0XHR0YWJsZS5hZGQoU3RyaW5nLmZyb21DaGFyQ29kZShpKSApO1xuXHRcdFx0fVxuXHRcdFx0dGFibGUuYWRkKFN0cmluZy5mcm9tQ2hhckNvZGUoY2xlYXJDb2RlKSApO1xuXHRcdFx0dGFibGUuYWRkKFN0cmluZy5mcm9tQ2hhckNvZGUoZW5kQ29kZSkgKTtcblxuXHRcdFx0dmFyIGJ5dGVPdXQgPSBieXRlQXJyYXlPdXRwdXRTdHJlYW0oKTtcblx0XHRcdHZhciBiaXRPdXQgPSBiaXRPdXRwdXRTdHJlYW0oYnl0ZU91dCk7XG5cblx0XHRcdC8vIGNsZWFyIGNvZGVcblx0XHRcdGJpdE91dC53cml0ZShjbGVhckNvZGUsIGJpdExlbmd0aCk7XG5cblx0XHRcdHZhciBkYXRhSW5kZXggPSAwO1xuXG5cdFx0XHR2YXIgcyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoX2RhdGFbZGF0YUluZGV4XSk7XG5cdFx0XHRkYXRhSW5kZXggKz0gMTtcblxuXHRcdFx0d2hpbGUgKGRhdGFJbmRleCA8IF9kYXRhLmxlbmd0aCkge1xuXG5cdFx0XHRcdHZhciBjID0gU3RyaW5nLmZyb21DaGFyQ29kZShfZGF0YVtkYXRhSW5kZXhdKTtcblx0XHRcdFx0ZGF0YUluZGV4ICs9IDE7XG5cblx0XHRcdFx0aWYgKHRhYmxlLmNvbnRhaW5zKHMgKyBjKSApIHtcblxuXHRcdFx0XHRcdHMgPSBzICsgYztcblxuXHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0Yml0T3V0LndyaXRlKHRhYmxlLmluZGV4T2YocyksIGJpdExlbmd0aCk7XG5cblx0XHRcdFx0XHRpZiAodGFibGUuc2l6ZSgpIDwgMHhmZmYpIHtcblxuXHRcdFx0XHRcdFx0aWYgKHRhYmxlLnNpemUoKSA9PSAoMSA8PCBiaXRMZW5ndGgpICkge1xuXHRcdFx0XHRcdFx0XHRiaXRMZW5ndGggKz0gMTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dGFibGUuYWRkKHMgKyBjKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzID0gYztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRiaXRPdXQud3JpdGUodGFibGUuaW5kZXhPZihzKSwgYml0TGVuZ3RoKTtcblxuXHRcdFx0Ly8gZW5kIGNvZGVcblx0XHRcdGJpdE91dC53cml0ZShlbmRDb2RlLCBiaXRMZW5ndGgpO1xuXG5cdFx0XHRiaXRPdXQuZmx1c2goKTtcblxuXHRcdFx0cmV0dXJuIGJ5dGVPdXQudG9CeXRlQXJyYXkoKTtcblx0XHR9O1xuXG5cdFx0dmFyIGx6d1RhYmxlID0gZnVuY3Rpb24oKSB7XG5cblx0XHRcdHZhciBfbWFwID0ge307XG5cdFx0XHR2YXIgX3NpemUgPSAwO1xuXG5cdFx0XHR2YXIgX3RoaXMgPSB7fTtcblxuXHRcdFx0X3RoaXMuYWRkID0gZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdGlmIChfdGhpcy5jb250YWlucyhrZXkpICkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignZHVwIGtleTonICsga2V5KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRfbWFwW2tleV0gPSBfc2l6ZTtcblx0XHRcdFx0X3NpemUgKz0gMTtcblx0XHRcdH07XG5cblx0XHRcdF90aGlzLnNpemUgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIF9zaXplO1xuXHRcdFx0fTtcblxuXHRcdFx0X3RoaXMuaW5kZXhPZiA9IGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gX21hcFtrZXldO1xuXHRcdFx0fTtcblxuXHRcdFx0X3RoaXMuY29udGFpbnMgPSBmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIHR5cGVvZiBfbWFwW2tleV0gIT0gJ3VuZGVmaW5lZCc7XG5cdFx0XHR9O1xuXG5cdFx0XHRyZXR1cm4gX3RoaXM7XG5cdFx0fTtcblxuXHRcdHJldHVybiBfdGhpcztcblx0fTtcblxuXHR2YXIgY3JlYXRlSW1nVGFnID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCwgZ2V0UGl4ZWwsIGFsdCkge1xuXG5cdFx0dmFyIGdpZiA9IGdpZkltYWdlKHdpZHRoLCBoZWlnaHQpO1xuXHRcdGZvciAodmFyIHkgPSAwOyB5IDwgaGVpZ2h0OyB5ICs9IDEpIHtcblx0XHRcdGZvciAodmFyIHggPSAwOyB4IDwgd2lkdGg7IHggKz0gMSkge1xuXHRcdFx0XHRnaWYuc2V0UGl4ZWwoeCwgeSwgZ2V0UGl4ZWwoeCwgeSkgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgYiA9IGJ5dGVBcnJheU91dHB1dFN0cmVhbSgpO1xuXHRcdGdpZi53cml0ZShiKTtcblxuXHRcdHZhciBiYXNlNjQgPSBiYXNlNjRFbmNvZGVPdXRwdXRTdHJlYW0oKTtcblx0XHR2YXIgYnl0ZXMgPSBiLnRvQnl0ZUFycmF5KCk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0YmFzZTY0LndyaXRlQnl0ZShieXRlc1tpXSk7XG5cdFx0fVxuXHRcdGJhc2U2NC5mbHVzaCgpO1xuXG5cdFx0dmFyIGltZyA9ICcnO1xuXHRcdGltZyArPSAnPGltZyc7XG5cdFx0aW1nICs9ICdcXHUwMDIwc3JjPVwiJztcblx0XHRpbWcgKz0gJ2RhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCwnO1xuXHRcdGltZyArPSBiYXNlNjQ7XG5cdFx0aW1nICs9ICdcIic7XG5cdFx0aW1nICs9ICdcXHUwMDIwd2lkdGg9XCInO1xuXHRcdGltZyArPSB3aWR0aDtcblx0XHRpbWcgKz0gJ1wiJztcblx0XHRpbWcgKz0gJ1xcdTAwMjBoZWlnaHQ9XCInO1xuXHRcdGltZyArPSBoZWlnaHQ7XG5cdFx0aW1nICs9ICdcIic7XG5cdFx0aWYgKGFsdCkge1xuXHRcdFx0aW1nICs9ICdcXHUwMDIwYWx0PVwiJztcblx0XHRcdGltZyArPSBhbHQ7XG5cdFx0XHRpbWcgKz0gJ1wiJztcblx0XHR9XG5cdFx0aW1nICs9ICcvPic7XG5cblx0XHRyZXR1cm4gaW1nO1xuXHR9O1xuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIHJldHVybnMgcXJjb2RlIGZ1bmN0aW9uLlxuXG5cdHJldHVybiBxcmNvZGU7XG59KCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoJCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGZ1bmN0aW9uIGdldEpzb25XaXRoUHJvbWlzZSh1cmwpIHtcblxuICAgICAgICByZXR1cm4gJC5nZXRKU09OKHVybCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0KHBhdGgpIHtcbiAgICAgICAgcmV0dXJuICQuZ2V0KHBhdGgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvc3RXaXRoUHJvbWlzZSh1cmwsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICQucG9zdCh1cmwsIGRhdGEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvc3QocGF0aCwgZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogcGF0aCxcbiAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzOiBzdWNjZXNzLFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHB1dChwYXRoLCBkYXRhLCBzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICAkLmFqYXgoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdXJsOiBwYXRoLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdQVVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2VzcyxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3JcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHB1dFdpdGhQcm9taXNlKHBhdGgsIGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IHBhdGgsXG4gICAgICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnLFxuICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmUocGF0aCkge1xuICAgICAgICByZXR1cm4gJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogcGF0aCxcbiAgICAgICAgICAgIHR5cGU6ICdERUxFVEUnXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldEpzb25XaXRoUHJvbWlzZTogZ2V0SnNvbldpdGhQcm9taXNlLFxuICAgICAgICBnZXQ6IGdldCxcbiAgICAgICAgcG9zdFdpdGhQcm9taXNlOiBwb3N0V2l0aFByb21pc2UsXG4gICAgICAgIHBvc3Q6IHBvc3QsXG4gICAgICAgIHB1dFdpdGhQcm9taXNlOiBwdXRXaXRoUHJvbWlzZSxcbiAgICAgICAgcHV0OiBwdXQsXG4gICAgICAgIHJlbW92ZTogcmVtb3ZlXG4gICAgfTtcbn0pKGpRdWVyeSk7XG5cbiIsInZhciBkaXJlY3RvciA9IHJlcXVpcmUoJ2RpcmVjdG9yJyksXG4gICAgdmlld0VuZ2luZSA9IHJlcXVpcmUoJy4uL2luZnJhc3RydWN0dXJlL3ZpZXdfZW5naW5lJyk7XG5cbnZhciByb3V0ZXMgPSB7XG4gICAgXCIvd2VpeGluL2pvaW4vYWN0aXZpdHkvOm9wZW5faWQvOmFjdGl2aXR5X2lkXCI6IGZ1bmN0aW9uIChvcGVuSWQsIGFjdGl2aXR5SWQpIHtcbiAgICAgICAgdmlld0VuZ2luZS5iaW5kVmlldyhcIi9qb2luLWFjdGl2aXR5XCIsIHtcbiAgICAgICAgICAgIG9wZW5JZDogb3BlbklkLFxuICAgICAgICAgICAgYWN0aXZpdHlJZDogYWN0aXZpdHlJZFxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGNvbmZpZ3VyZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcm91dGVyID0gbmV3IGRpcmVjdG9yLlJvdXRlcihyb3V0ZXMpO1xuXG4gICAgICAgIHJvdXRlci5pbml0KCk7XG4gICAgICAgIHJldHVybiByb3V0ZXI7XG4gICAgfVxufTsiLCJ2YXIgdmlld1Jlc29sdmVyID0gcmVxdWlyZSgnLi92aWV3X3Jlc29sdmVyJyksXG4gICAgdmlld01vZGVsUmVzb2x2ZXIgPSByZXF1aXJlKCcuL3ZpZXdfbW9kZWxfcmVzb2x2ZXInKTtcblxuZnVuY3Rpb24gZG9CaW5kKFZpZXdNb2RlbCwgdmlldywgZGF0YSkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAga28ucG9zdGJveC5yZXNldCgpO1xuICAgICAgICB2YXIgc2ZWaWV3ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NmLXZpZXcnKTtcbiAgICAgICAgJChzZlZpZXcpLmh0bWwodmlldyk7XG4gICAgICAgIGtvLmNsZWFuTm9kZShzZlZpZXcpO1xuICAgICAgICBrby5hcHBseUJpbmRpbmdzKG5ldyBWaWV3TW9kZWwoZGF0YSksIHNmVmlldyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHZpZXdSZXNvbHZlckNvbXBsZXRlKHJvdXRlTmFtZSwgdmlldywgZGF0YSkge1xuICAgIHZhciB2aWV3TW9kZWwgPSB2aWV3TW9kZWxSZXNvbHZlci5yZXNvbHZlVmlld01vZGVsKHJvdXRlTmFtZSk7XG4gICAgZG9CaW5kKHZpZXdNb2RlbCwgdmlldywgZGF0YSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGJpbmRWaWV3OiBmdW5jdGlvbiAocm91dGVOYW1lLCBkYXRhKSB7XG5cbiAgICAgICAgcmV0dXJuIHZpZXdSZXNvbHZlci5yZXNvbHZlVmlldyhyb3V0ZU5hbWUpXG4gICAgICAgICAgICAuZG9uZShmdW5jdGlvbiAodmlldykge1xuICAgICAgICAgICAgICAgIHZpZXdSZXNvbHZlckNvbXBsZXRlKHJvdXRlTmFtZSwgdmlldywgZGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG59O1xuIiwiLy9UT0RPIFJlcXVpcmUgdGhpcyBpbiB0aGUgZnV0dXJlXG5cbi8vdmFyIFN0YWZmaW5nUHJveHlWaWV3TW9kZWwgPSByZXF1aXJlKCcuLi92aWV3X21vZGVscy9zdGFmZmluZ19wcm94eV92aWV3X21vZGVsJyk7XG4vL3ZhciBPcHBvcnR1bml0eURldGFpbHNNb2RlbCA9IHJlcXVpcmUoJy4uL3ZpZXdfbW9kZWxzL29wcG9ydHVuaXR5X3ZpZXdfbW9kZWwnKTtcbi8vdmFyIE9wcG9ydHVuaXR5Um9sZVZpZXdNb2RlbCA9IHJlcXVpcmUoJy4uL3ZpZXdfbW9kZWxzL29wcG9ydHVuaXR5X3JvbGVfdmlld19tb2RlbCcpO1xuXG4vL3ZhciB2aWV3TW9kZWxzID0ge1xuLy8gICAgXCIvcm9sZVwiOiBTdGFmZmluZ1Byb3h5Vmlld01vZGVsLFxuLy8gICAgXCIvb3Bwb3J0dW5pdHktZGV0YWlsc1wiOiBPcHBvcnR1bml0eURldGFpbHNNb2RlbCxcbi8vICAgIFwiL29wcG9ydHVuaXR5LXN0YWZmaW5nXCI6IE9wcG9ydHVuaXR5Um9sZVZpZXdNb2RlbFxuLy99O1xuLy9cbi8vbW9kdWxlLmV4cG9ydHMgPSB7XG4vLyAgICByZXNvbHZlVmlld01vZGVsOiBmdW5jdGlvbiAocm91dGVOYW1lKSB7XG4vLyAgICAgICAgcmV0dXJuIHZpZXdNb2RlbHNbcm91dGVOYW1lXTtcbi8vICAgIH1cbi8vfTsiLCJ2YXIgYWpheFdyYXBwZXIgPSByZXF1aXJlKCcuLi9hamF4X3dyYXBwZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgdmlld0Jhc2UgPSBcIi92aWV3cy9wYXJ0aWFsc1wiLFxuICAgICAgICB2aWV3QmFzZUV4dGVuc2lvbiA9IFwiLmh0bWxcIixcbiAgICAgICAgdmlld0NhY2hlID0ge307XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXNvbHZlVmlldzogZnVuY3Rpb24gKHJvdXRlTmFtZSkge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICAgICAgICBpZiAodmlld0NhY2hlLmhhc093blByb3BlcnR5KHJvdXRlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVkVmlldyA9IHZpZXdDYWNoZVtyb3V0ZU5hbWVdO1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJC5wYXJzZUhUTUwoY2FjaGVkVmlldykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYWpheFdyYXBwZXIuZ2V0KHZpZXdCYXNlICsgcm91dGVOYW1lLnRvTG93ZXJDYXNlKCkgKyB2aWV3QmFzZUV4dGVuc2lvbilcbiAgICAgICAgICAgICAgICAgICAgLmRvbmUoZnVuY3Rpb24gKHZpZXdBc1N0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlld0NhY2hlW3JvdXRlTmFtZV0gPSB2aWV3QXNTdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCQucGFyc2VIVE1MKHZpZXdBc1N0cmluZykpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuZmFpbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoJ1ZpZXcgbm90IGZvdW5kIGF0IHJvdXRlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgICAgICAgfVxuICAgIH07XG59KSgpOyIsInZhciBkb21SZWFkeSA9IHJlcXVpcmUoJ2RvbXJlYWR5JyksXG4gICAgcm91dGVDb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy9yb3V0ZXMnKSxcbiAgICByb3V0ZXI7XG5cbm1vZHVsZS5leHBvcnRzLmhvbWVQYWdlVmlld01vZGVsRmFjdG9yeSA9IHJlcXVpcmUoXCIuL3ZpZXdfbW9kZWxzL2hvbWVfcGFnZV92aWV3X21vZGVsX2ZhY3RvcnlcIik7XG5tb2R1bGUuZXhwb3J0cy5hY3Rpdml0eVBhZ2VWaWV3TW9kZWxGYWN0b3J5ID0gcmVxdWlyZShcIi4vdmlld19tb2RlbHMvYWN0aXZpdHlfcGFnZV92aWV3X21vZGVsX2ZhY3RvcnlcIik7XG5tb2R1bGUuZXhwb3J0cy5qb2luQWN0aXZpdHlQYWdlVmlld01vZGVsRmFjdG9yeSA9IHJlcXVpcmUoXCIuL3ZpZXdfbW9kZWxzL2pvaW5fYWN0aXZpdHlfcGFnZV92aWV3X21vZGVsX2ZhY3RvcnlcIik7XG5tb2R1bGUuZXhwb3J0cy5kYXRhYmFzZVVwZGF0ZVZpZXdNb2RlbEZhY3RvcnkgPSByZXF1aXJlKFwiLi92aWV3X21vZGVscy9kYXRhYmFzZV91cGRhdGVfdmlld19tb2RlbF9mYWN0b3J5XCIpO1xuXG5kb21SZWFkeShmdW5jdGlvbiAoKSB7XG4gICAgcm91dGVyID0gcm91dGVDb25maWcuY29uZmlndXJlKCk7XG4gICAgbW9kdWxlLmV4cG9ydHMucm91dGVyID0gcm91dGVyO1xufSk7XG5cbiIsInZhciBhamF4ID0gcmVxdWlyZSgnLi4vYWpheF93cmFwcGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgZ2V0QWxsQWN0aXZpdGllczogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cbiAgICAgICAgYWpheC5nZXRKc29uV2l0aFByb21pc2UoJy93ZWl4aW4vZ2V0L2FsbC9hY3Rpdml0aWVzJylcbiAgICAgICAgICAgIC5kb25lKGZ1bmN0aW9uIChhY3Rpdml0aWVzKSB7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShhY3Rpdml0aWVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgIH1cbn07IiwidmFyIGFqYXggPSByZXF1aXJlKCcuLi9hamF4X3dyYXBwZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBnZXRVc2VyQWN0aXZpdHlTdGF0dXM6IGZ1bmN0aW9uIChvcGVuSWQsIGFjdGl2aXR5SWQpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICAgIHZhciBwYXJhbXMgPSAnaWhha3VsYV9yZXF1ZXN0PWloYWt1bGFfbm9ydGhlcm5faGVtaXNwaGVyZSdcbiAgICAgICAgICAgICsgJyZvcGVuX2lkPScgKyBvcGVuSWRcbiAgICAgICAgICAgICsgJyZhY3Rpdml0eV9pZD0nICsgYWN0aXZpdHlJZDtcbiAgICAgICAgYWpheC5nZXRKc29uV2l0aFByb21pc2UoJy93ZWl4aW4vZ2V0L3VzZXIvYWN0aXZpdHkvc3RhdHVzPycgKyBwYXJhbXMpXG4gICAgICAgICAgICAuZG9uZShmdW5jdGlvbiAodXNlckFjdGl2aXR5SW5mbykge1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodXNlckFjdGl2aXR5SW5mbyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcbiAgICB9LFxuXG4gICAgZHJhd1ByaXplOiBmdW5jdGlvbiAob3BlbklkLCBhY3Rpdml0eUlkKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9ICQuRGVmZXJyZWQoKTtcblxuICAgICAgICB2YXIgcGFyYW1zID0gb3BlbklkICsgJy8nICsgYWN0aXZpdHlJZCArICAnP2loYWt1bGFfcmVxdWVzdD1paGFrdWxhX25vcnRoZXJuX2hlbWlzcGhlcmUnO1xuICAgICAgICBhamF4LmdldEpzb25XaXRoUHJvbWlzZSgnL3dlaXhpbi91c2VyL2RyYXcvcHJpemUvJyArIHBhcmFtcylcbiAgICAgICAgICAgIC5kb25lKGZ1bmN0aW9uICh1c2VyQWN0aXZpdHlJbmZvKSB7XG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh1c2VyQWN0aXZpdHlJbmZvKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuICAgIH1cbn07IiwidmFyIGFqYXggPSByZXF1aXJlKCcuLi9hamF4X3dyYXBwZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBnZXRBbGxTYWxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSAkLkRlZmVycmVkKCk7XG5cbiAgICAgICAgYWpheC5nZXRKc29uV2l0aFByb21pc2UoJy9zYWxlL3JlY29yZHMnKVxuICAgICAgICAgICAgLmRvbmUoZnVuY3Rpb24gKHJlY29yZHMpIHtcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlY29yZHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG4gICAgfVxufTsiLCJ2YXIgQWN0aXZpdHlQYWdlVmlld01vZGVsID0gcmVxdWlyZSgnLi9hY3Rpdml0eXBhZ2Vfdmlld19tb2RlbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhcHBseVRvUGFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZlZpZXcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2YtdmlldycpO1xuICAgICAgICBrby5hcHBseUJpbmRpbmdzKG5ldyBBY3Rpdml0eVBhZ2VWaWV3TW9kZWwoKSwgc2ZWaWV3KTtcbiAgICB9XG59OyIsInZhciBzYWxlc19zZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VydmljZXMvYWN0aXZpdHlfc2VydmljZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBzZWxmO1xuXG4gICAgZnVuY3Rpb24gSG9tZXBhZ2VWaWV3TW9kZWwoKSB7XG4gICAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLnVzZXJzSWRBcnIgPSBudWxsO1xuICAgICAgICBzZWxmLnVzZXJzRGV0YWlsRGljID0gbnVsbDtcbiAgICAgICAgc2VsZi51c2Vyc1NhbGVEaWMgPSBudWxsO1xuICAgICAgICBzZWxmLmFjY291bnRGaWVsZEFyciA9IG51bGw7XG4gICAgICAgIHNlbGYuYWNjb3VudEZpZWxkRGV0YWlsQXJyID0gbnVsbDtcbiAgICAgICAgc2VsZi5hY3Rpdml0aWVzID0ga28ub2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICAgICAgc2VsZi51c2VyRmluYWNpYWwgPSBrby5vYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgICAgICBzZWxmLmlzTG9hZGluZyA9IGtvLm9ic2VydmFibGUodHJ1ZSk7XG5cbiAgICAgICAgc2VsZi5pbml0aWFsaXNlKCk7XG5cbiAgICAgICAgc2VsZi5jYWNoZUNhY2hlcyA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgc2VsZi51c2Vyc0lkQXJyID0gZGF0YVtcInVzZXJzXCJdLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHNlbGYudXNlcnNEZXRhaWxEaWMgPSBkYXRhW1widXNlcnNfZGV0YWlsX2luZm9cIl07XG4gICAgICAgICAgICBzZWxmLnVzZXJzU2FsZURpYyA9IGRhdGFbXCJ1c2Vyc19zYWxlX3JlY29yZHNcIl07XG4gICAgICAgICAgICBzZWxmLmFjY291bnRGaWVsZEFyciA9IGRhdGFbXCJhY2NvdW50X2ZpZWxkXCJdO1xuICAgICAgICAgICAgc2VsZi5hY2NvdW50RmllbGREZXRhaWxBcnIgPSBkYXRhW1wiYWNjb3VudF9maWVsZF9kZXRhaWxcIl07XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5jYWN1bGF0ZVJlY29yZHMgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGFsbFJlY29yZHMgPSBbXTtcbiAgICAgICAgICAgIHZhciB0b3RhbEVhcm4gPSAwLjA7XG4gICAgICAgICAgICB2YXIgdG90YWxDb3N0ID0gMC4wO1xuICAgICAgICAgICAgdmFyIHVzZXJDb3N0QW5kRWFybiA9IFtdO1xuICAgICAgICAgICAgXy5lYWNoKHNlbGYudXNlcnNJZEFyciwgZnVuY3Rpb24odXNlcklkKXtcbiAgICAgICAgICAgICAgICB2YXIgdXNlckVhcm4gPSAwLjA7XG4gICAgICAgICAgICAgICAgdmFyIHVzZXJDb3N0ID0gMC4wO1xuICAgICAgICAgICAgICAgIHZhciB1c2VyTmFtZSA9IHNlbGYudXNlcnNEZXRhaWxEaWNbdXNlcklkXVsndXNlcl9uaWNrbmFtZSddO1xuICAgICAgICAgICAgICAgIHZhciBwZXJzb25SZWNvcmRzID0gc2VsZi51c2Vyc1NhbGVEaWNbdXNlcklkXTtcbiAgICAgICAgICAgICAgICBfLmVhY2gocGVyc29uUmVjb3JkcywgZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGdldEZpZWxkQnlGaWVsZElEKHJlY29yZC5maWVsZF9pZClbMF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBpdGVtRGV0YWlsID0gZ2V0RmllbGREZXRhaWxCeUZpZWxkRGV0YWlsSWQocmVjb3JkLmZpZWxkX2RldGFpbF9pZClbMF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdGFydFNpZ24gPSBpdGVtLnR5cGUgPyAnKCspICcgOiAnKC0pICc7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gc3RhcnRTaWduO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyRWFybiArPSByZWNvcmQubW9uZXk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VyQ29zdCArPSByZWNvcmQubW9uZXk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGV4dCArPSBpdGVtLmZpZWxkICsgJzonICsgaXRlbURldGFpbC5uYW1lICsgJyAnICsgcmVjb3JkLm1vbmV5ICsgJyhDTlkpOyAnICsgcmVjb3JkLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgICAgICAgICBhbGxSZWNvcmRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3RleHQnOiB0ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGUnOiByZWNvcmQuZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdtb25leSc6IHN0YXJ0U2lnbiArIHJlY29yZC5tb25leSxcbiAgICAgICAgICAgICAgICAgICAgICAgICd1c2VyJzogdXNlck5hbWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdXNlckNvc3RBbmRFYXJuLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAndGV4dCc6IHVzZXJOYW1lLFxuICAgICAgICAgICAgICAgICAgICAndG90YWxDb3N0JzogdXNlckNvc3QsXG4gICAgICAgICAgICAgICAgICAgICd0b3RhbEVhcm4nOiB1c2VyRWFybixcbiAgICAgICAgICAgICAgICAgICAgJ3JldmVudWUnOiAodXNlckVhcm4gLSB1c2VyQ29zdCkudG9GaXhlZCgyKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRvdGFsQ29zdCArPSB1c2VyQ29zdDtcbiAgICAgICAgICAgICAgICB0b3RhbEVhcm4gKz0gdXNlckVhcm47XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgc2VsZi51c2VyRmluYWNpYWwoW3tcbiAgICAgICAgICAgICAgICAndGV4dCc6ICflkIjorqEnLFxuICAgICAgICAgICAgICAgICd0b3RhbENvc3QnOiB0b3RhbENvc3QsXG4gICAgICAgICAgICAgICAgJ3RvdGFsRWFybic6IHRvdGFsRWFybixcbiAgICAgICAgICAgICAgICAncmV2ZW51ZSc6ICh0b3RhbEVhcm4gLSB0b3RhbENvc3QpLnRvRml4ZWQoMilcbiAgICAgICAgICAgIH1dLmNvbmNhdCh1c2VyQ29zdEFuZEVhcm4pKTtcblxuICAgICAgICAgICAgdmFyIHNvcnRlZFJlY29yZHMgPSBfLmNoYWluKGFsbFJlY29yZHMpXG4gICAgICAgICAgICAgICAgLnNvcnRCeShmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWNvcmQuZGF0ZTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5yZXZlcnNlKClcbiAgICAgICAgICAgICAgICAudmFsdWUoKTtcbiAgICAgICAgICAgIHNlbGYuc2FsZVJlY29yZHMoc29ydGVkUmVjb3Jkcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RmllbGRCeUZpZWxkSUQgKGZpZWxkSWQpe1xuICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHNlbGYuYWNjb3VudEZpZWxkQXJyLCBmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkW1wiSURcIl0gPT09IGZpZWxkSWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRGaWVsZERldGFpbEJ5RmllbGREZXRhaWxJZCAoZGV0YWlsSWQpe1xuICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHNlbGYuYWNjb3VudEZpZWxkRGV0YWlsQXJyLCBmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkW1wiSURcIl0gPT09IGRldGFpbElkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIEhvbWVwYWdlVmlld01vZGVsLnByb3RvdHlwZS5pbml0aWFsaXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc2FsZXNfc2VydmljZS5nZXRBbGxBY3Rpdml0aWVzKClcbiAgICAgICAgICAgIC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgc2VsZi5jYWNoZUNhY2hlcyhkYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLmNhY3VsYXRlUmVjb3JkcygpO1xuICAgICAgICAgICAgICAgIHNlbGYuaXNMb2FkaW5nKGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gSG9tZXBhZ2VWaWV3TW9kZWw7XG59KSgpOyIsInZhciBzYWxlc19zZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VydmljZXMvc2FsZXNfc2VydmljZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBzZWxmO1xuXG4gICAgZnVuY3Rpb24gRGF0YWJhc2VVcGRhdGVWaWV3TW9kZWwoKSB7XG4gICAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLnVzZXJzSWRBcnIgPSBudWxsO1xuICAgICAgICBzZWxmLnVzZXJzRGV0YWlsRGljID0gbnVsbDtcbiAgICAgICAgc2VsZi51c2Vyc1NhbGVEaWMgPSBudWxsO1xuICAgICAgICBzZWxmLmFjY291bnRGaWVsZEFyciA9IG51bGw7XG4gICAgICAgIHNlbGYuYWNjb3VudEZpZWxkRGV0YWlsQXJyID0gbnVsbDtcbiAgICAgICAgc2VsZi5zYWxlUmVjb3JkcyA9IGtvLm9ic2VydmFibGVBcnJheShbXSk7XG4gICAgICAgIHNlbGYudXNlckZpbmFjaWFsID0ga28ub2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICAgICAgc2VsZi5pc0xvYWRpbmcgPSBrby5vYnNlcnZhYmxlKHRydWUpO1xuXG4gICAgICAgIHNlbGYuaW5pdGlhbGlzZSgpO1xuXG4gICAgICAgIHNlbGYuY2FjaGVDYWNoZXMgPSBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIHNlbGYudXNlcnNJZEFyciA9IGRhdGFbXCJ1c2Vyc1wiXS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICBzZWxmLnVzZXJzRGV0YWlsRGljID0gZGF0YVtcInVzZXJzX2RldGFpbF9pbmZvXCJdO1xuICAgICAgICAgICAgc2VsZi51c2Vyc1NhbGVEaWMgPSBkYXRhW1widXNlcnNfc2FsZV9yZWNvcmRzXCJdO1xuICAgICAgICAgICAgc2VsZi5hY2NvdW50RmllbGRBcnIgPSBkYXRhW1wiYWNjb3VudF9maWVsZFwiXTtcbiAgICAgICAgICAgIHNlbGYuYWNjb3VudEZpZWxkRGV0YWlsQXJyID0gZGF0YVtcImFjY291bnRfZmllbGRfZGV0YWlsXCJdO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuY2FjdWxhdGVSZWNvcmRzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBhbGxSZWNvcmRzID0gW107XG4gICAgICAgICAgICB2YXIgdG90YWxFYXJuID0gMC4wO1xuICAgICAgICAgICAgdmFyIHRvdGFsQ29zdCA9IDAuMDtcbiAgICAgICAgICAgIHZhciB1c2VyQ29zdEFuZEVhcm4gPSBbXTtcbiAgICAgICAgICAgIF8uZWFjaChzZWxmLnVzZXJzSWRBcnIsIGZ1bmN0aW9uKHVzZXJJZCl7XG4gICAgICAgICAgICAgICAgdmFyIHVzZXJFYXJuID0gMC4wO1xuICAgICAgICAgICAgICAgIHZhciB1c2VyQ29zdCA9IDAuMDtcbiAgICAgICAgICAgICAgICB2YXIgdXNlck5hbWUgPSBzZWxmLnVzZXJzRGV0YWlsRGljW3VzZXJJZF1bJ3VzZXJfbmlja25hbWUnXTtcbiAgICAgICAgICAgICAgICB2YXIgcGVyc29uUmVjb3JkcyA9IHNlbGYudXNlcnNTYWxlRGljW3VzZXJJZF07XG4gICAgICAgICAgICAgICAgXy5lYWNoKHBlcnNvblJlY29yZHMsIGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBnZXRGaWVsZEJ5RmllbGRJRChyZWNvcmQuZmllbGRfaWQpWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbURldGFpbCA9IGdldEZpZWxkRGV0YWlsQnlGaWVsZERldGFpbElkKHJlY29yZC5maWVsZF9kZXRhaWxfaWQpWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3RhcnRTaWduID0gaXRlbS50eXBlID8gJygrKSAnIDogJygtKSAnO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IHN0YXJ0U2lnbjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlckVhcm4gKz0gcmVjb3JkLm1vbmV5O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlckNvc3QgKz0gcmVjb3JkLm1vbmV5O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRleHQgKz0gaXRlbS5maWVsZCArICc6JyArIGl0ZW1EZXRhaWwubmFtZSArICcgJyArIHJlY29yZC5tb25leSArICcoQ05ZKTsgJyArIHJlY29yZC5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgYWxsUmVjb3Jkcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICd0ZXh0JzogdGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRlJzogcmVjb3JkLmRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAnbW9uZXknOiBzdGFydFNpZ24gKyByZWNvcmQubW9uZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAndXNlcic6IHVzZXJOYW1lXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHVzZXJDb3N0QW5kRWFybi5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgJ3RleHQnOiB1c2VyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgJ3RvdGFsQ29zdCc6IHVzZXJDb3N0LFxuICAgICAgICAgICAgICAgICAgICAndG90YWxFYXJuJzogdXNlckVhcm4sXG4gICAgICAgICAgICAgICAgICAgICdyZXZlbnVlJzogKHVzZXJFYXJuIC0gdXNlckNvc3QpLnRvRml4ZWQoMilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0b3RhbENvc3QgKz0gdXNlckNvc3Q7XG4gICAgICAgICAgICAgICAgdG90YWxFYXJuICs9IHVzZXJFYXJuO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNlbGYudXNlckZpbmFjaWFsKFt7XG4gICAgICAgICAgICAgICAgJ3RleHQnOiAn5ZCI6K6hJyxcbiAgICAgICAgICAgICAgICAndG90YWxDb3N0JzogdG90YWxDb3N0LFxuICAgICAgICAgICAgICAgICd0b3RhbEVhcm4nOiB0b3RhbEVhcm4sXG4gICAgICAgICAgICAgICAgJ3JldmVudWUnOiAodG90YWxFYXJuIC0gdG90YWxDb3N0KS50b0ZpeGVkKDIpXG4gICAgICAgICAgICB9XS5jb25jYXQodXNlckNvc3RBbmRFYXJuKSk7XG5cbiAgICAgICAgICAgIHZhciBzb3J0ZWRSZWNvcmRzID0gXy5jaGFpbihhbGxSZWNvcmRzKVxuICAgICAgICAgICAgICAgIC5zb3J0QnkoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVjb3JkLmRhdGU7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucmV2ZXJzZSgpXG4gICAgICAgICAgICAgICAgLnZhbHVlKCk7XG4gICAgICAgICAgICBzZWxmLnNhbGVSZWNvcmRzKHNvcnRlZFJlY29yZHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldEZpZWxkQnlGaWVsZElEIChmaWVsZElkKXtcbiAgICAgICAgICAgIHJldHVybiBfLmZpbHRlcihzZWxmLmFjY291bnRGaWVsZEFyciwgZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWVsZFtcIklEXCJdID09PSBmaWVsZElkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RmllbGREZXRhaWxCeUZpZWxkRGV0YWlsSWQgKGRldGFpbElkKXtcbiAgICAgICAgICAgIHJldHVybiBfLmZpbHRlcihzZWxmLmFjY291bnRGaWVsZERldGFpbEFyciwgZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWVsZFtcIklEXCJdID09PSBkZXRhaWxJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBEYXRhYmFzZVVwZGF0ZVZpZXdNb2RlbC5wcm90b3R5cGUuaW5pdGlhbGlzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNhbGVzX3NlcnZpY2UuZ2V0QWxsU2FsZVJlY29yZHMoKVxuICAgICAgICAgICAgLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLmNhY2hlQ2FjaGVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIHNlbGYuY2FjdWxhdGVSZWNvcmRzKCk7XG4gICAgICAgICAgICAgICAgc2VsZi5pc0xvYWRpbmcoZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBEYXRhYmFzZVVwZGF0ZVZpZXdNb2RlbDtcbn0pKCk7IiwidmFyIERhdGFiYXNlVmlld01vZGVsID0gcmVxdWlyZSgnLi9kYXRhYmFzZV91cGRhdGVfdmlld19tb2RlbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhcHBseVRvUGFnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZlZpZXcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2YtdmlldycpO1xuICAgICAgICBrby5hcHBseUJpbmRpbmdzKG5ldyBEYXRhYmFzZVZpZXdNb2RlbCgpLCBzZlZpZXcpO1xuICAgIH1cbn07IiwidmFyIEhvbWVQYWdlVmlld01vZGVsID0gcmVxdWlyZSgnLi9ob21lcGFnZV92aWV3X21vZGVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFwcGx5VG9QYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNmVmlldyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZi12aWV3Jyk7XG4gICAgICAgIGtvLmFwcGx5QmluZGluZ3MobmV3IEhvbWVQYWdlVmlld01vZGVsKCksIHNmVmlldyk7XG4gICAgfVxufTsiLCJ2YXIgc2FsZXNfc2VydmljZSA9IHJlcXVpcmUoJy4uL3NlcnZpY2VzL3NhbGVzX3NlcnZpY2UuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgc2VsZjtcblxuICAgIGZ1bmN0aW9uIEhvbWVwYWdlVmlld01vZGVsKCkge1xuICAgICAgICBzZWxmID0gdGhpcztcbiAgICAgICAgc2VsZi51c2Vyc0lkQXJyID0gbnVsbDtcbiAgICAgICAgc2VsZi51c2Vyc0RldGFpbERpYyA9IG51bGw7XG4gICAgICAgIHNlbGYudXNlcnNTYWxlRGljID0gbnVsbDtcbiAgICAgICAgc2VsZi5hY2NvdW50RmllbGRBcnIgPSBudWxsO1xuICAgICAgICBzZWxmLmFjY291bnRGaWVsZERldGFpbEFyciA9IG51bGw7XG4gICAgICAgIHNlbGYuc2FsZVJlY29yZHMgPSBrby5vYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgICAgICBzZWxmLnVzZXJGaW5hY2lhbCA9IGtvLm9ic2VydmFibGVBcnJheShbXSk7XG4gICAgICAgIHNlbGYuaXNMb2FkaW5nID0ga28ub2JzZXJ2YWJsZSh0cnVlKTtcblxuICAgICAgICBzZWxmLmluaXRpYWxpc2UoKTtcblxuICAgICAgICBzZWxmLmNhY2hlQ2FjaGVzID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBzZWxmLnVzZXJzSWRBcnIgPSBkYXRhW1widXNlcnNcIl0uc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgc2VsZi51c2Vyc0RldGFpbERpYyA9IGRhdGFbXCJ1c2Vyc19kZXRhaWxfaW5mb1wiXTtcbiAgICAgICAgICAgIHNlbGYudXNlcnNTYWxlRGljID0gZGF0YVtcInVzZXJzX3NhbGVfcmVjb3Jkc1wiXTtcbiAgICAgICAgICAgIHNlbGYuYWNjb3VudEZpZWxkQXJyID0gZGF0YVtcImFjY291bnRfZmllbGRcIl07XG4gICAgICAgICAgICBzZWxmLmFjY291bnRGaWVsZERldGFpbEFyciA9IGRhdGFbXCJhY2NvdW50X2ZpZWxkX2RldGFpbFwiXTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLmNhY3VsYXRlUmVjb3JkcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgYWxsUmVjb3JkcyA9IFtdO1xuICAgICAgICAgICAgdmFyIHRvdGFsRWFybiA9IDAuMDtcbiAgICAgICAgICAgIHZhciB0b3RhbENvc3QgPSAwLjA7XG4gICAgICAgICAgICB2YXIgdXNlckNvc3RBbmRFYXJuID0gW107XG4gICAgICAgICAgICBfLmVhY2goc2VsZi51c2Vyc0lkQXJyLCBmdW5jdGlvbih1c2VySWQpe1xuICAgICAgICAgICAgICAgIHZhciB1c2VyRWFybiA9IDAuMDtcbiAgICAgICAgICAgICAgICB2YXIgdXNlckNvc3QgPSAwLjA7XG4gICAgICAgICAgICAgICAgdmFyIHVzZXJOYW1lID0gc2VsZi51c2Vyc0RldGFpbERpY1t1c2VySWRdWyd1c2VyX25pY2tuYW1lJ107XG4gICAgICAgICAgICAgICAgdmFyIHBlcnNvblJlY29yZHMgPSBzZWxmLnVzZXJzU2FsZURpY1t1c2VySWRdO1xuICAgICAgICAgICAgICAgIF8uZWFjaChwZXJzb25SZWNvcmRzLCBmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpdGVtID0gZ2V0RmllbGRCeUZpZWxkSUQocmVjb3JkLmZpZWxkX2lkKVswXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW1EZXRhaWwgPSBnZXRGaWVsZERldGFpbEJ5RmllbGREZXRhaWxJZChyZWNvcmQuZmllbGRfZGV0YWlsX2lkKVswXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0U2lnbiA9IGl0ZW0udHlwZSA/ICcoKykgJyA6ICcoLSkgJztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRleHQgPSBzdGFydFNpZ247XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJFYXJuICs9IHJlY29yZC5tb25leTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJDb3N0ICs9IHJlY29yZC5tb25leTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IGl0ZW0uZmllbGQgKyAnOicgKyBpdGVtRGV0YWlsLm5hbWUgKyAnICcgKyByZWNvcmQubW9uZXkgKyAnKENOWSk7ICcgKyByZWNvcmQuZGVzY3JpcHRpb247XG4gICAgICAgICAgICAgICAgICAgIGFsbFJlY29yZHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAndGV4dCc6IHRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZGF0ZSc6IHJlY29yZC5kYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ21vbmV5Jzogc3RhcnRTaWduICsgcmVjb3JkLm1vbmV5LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3VzZXInOiB1c2VyTmFtZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB1c2VyQ29zdEFuZEVhcm4ucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICd0ZXh0JzogdXNlck5hbWUsXG4gICAgICAgICAgICAgICAgICAgICd0b3RhbENvc3QnOiB1c2VyQ29zdCxcbiAgICAgICAgICAgICAgICAgICAgJ3RvdGFsRWFybic6IHVzZXJFYXJuLFxuICAgICAgICAgICAgICAgICAgICAncmV2ZW51ZSc6ICh1c2VyRWFybiAtIHVzZXJDb3N0KS50b0ZpeGVkKDIpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdG90YWxDb3N0ICs9IHVzZXJDb3N0O1xuICAgICAgICAgICAgICAgIHRvdGFsRWFybiArPSB1c2VyRWFybjtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzZWxmLnVzZXJGaW5hY2lhbChbe1xuICAgICAgICAgICAgICAgICd0ZXh0JzogJ+WQiOiuoScsXG4gICAgICAgICAgICAgICAgJ3RvdGFsQ29zdCc6IHRvdGFsQ29zdCxcbiAgICAgICAgICAgICAgICAndG90YWxFYXJuJzogdG90YWxFYXJuLFxuICAgICAgICAgICAgICAgICdyZXZlbnVlJzogKHRvdGFsRWFybiAtIHRvdGFsQ29zdCkudG9GaXhlZCgyKVxuICAgICAgICAgICAgfV0uY29uY2F0KHVzZXJDb3N0QW5kRWFybikpO1xuXG4gICAgICAgICAgICB2YXIgc29ydGVkUmVjb3JkcyA9IF8uY2hhaW4oYWxsUmVjb3JkcylcbiAgICAgICAgICAgICAgICAuc29ydEJ5KGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlY29yZC5kYXRlO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnJldmVyc2UoKVxuICAgICAgICAgICAgICAgIC52YWx1ZSgpO1xuICAgICAgICAgICAgc2VsZi5zYWxlUmVjb3Jkcyhzb3J0ZWRSZWNvcmRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRGaWVsZEJ5RmllbGRJRCAoZmllbGRJZCl7XG4gICAgICAgICAgICByZXR1cm4gXy5maWx0ZXIoc2VsZi5hY2NvdW50RmllbGRBcnIsIGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmllbGRbXCJJRFwiXSA9PT0gZmllbGRJZDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldEZpZWxkRGV0YWlsQnlGaWVsZERldGFpbElkIChkZXRhaWxJZCl7XG4gICAgICAgICAgICByZXR1cm4gXy5maWx0ZXIoc2VsZi5hY2NvdW50RmllbGREZXRhaWxBcnIsIGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmllbGRbXCJJRFwiXSA9PT0gZGV0YWlsSWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgSG9tZXBhZ2VWaWV3TW9kZWwucHJvdG90eXBlLmluaXRpYWxpc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzYWxlc19zZXJ2aWNlLmdldEFsbFNhbGVSZWNvcmRzKClcbiAgICAgICAgICAgIC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICAgICAgICAgc2VsZi5jYWNoZUNhY2hlcyhkYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLmNhY3VsYXRlUmVjb3JkcygpO1xuICAgICAgICAgICAgICAgIHNlbGYuaXNMb2FkaW5nKGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gSG9tZXBhZ2VWaWV3TW9kZWw7XG59KSgpOyIsInZhciBKb2luQWN0aXZpdHlQYWdlVmlld01vZGVsID0gcmVxdWlyZSgnLi9qb2luYWN0aXZpdHlwYWdlX3ZpZXdfbW9kZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYXBwbHlUb1BhZ2U6IGZ1bmN0aW9uKG9wZW5JZCwgYWN0aXZpdHlJZCkge1xuICAgICAgICB2YXIgc2ZWaWV3ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NmLXZpZXcnKTtcbiAgICAgICAgdmFyIG1haW5QYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tcGFnZScpO1xuICAgICAgICBtYWluUGFnZS5pbm5lckhUTUwgPSBzZlZpZXcuaW5uZXJIVE1MO1xuICAgICAgICBrby5hcHBseUJpbmRpbmdzKG5ldyBKb2luQWN0aXZpdHlQYWdlVmlld01vZGVsKG9wZW5JZCwgYWN0aXZpdHlJZCksIG1haW5QYWdlKTtcbiAgICB9XG59OyIsInZhciBzYWxlc19zZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VydmljZXMvam9pbl9hY3Rpdml0eV9zZXJ2aWNlLmpzJyk7XG52YXIgcXJDb2RlID0gcmVxdWlyZSgncXJjb2RlLW5wbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBzZWxmO1xuXG4gICAgZnVuY3Rpb24gSm9pbmFjdGl2aXR5cGFnZVZpZXdNb2RlbChvcGVuSWQsIGFjdGl2aXR5SWQpIHtcblxuICAgICAgICBzZWxmID0gdGhpcztcbiAgICAgICAgc2VsZi5vcGVuSWQgPSBvcGVuSWQ7XG4gICAgICAgIHNlbGYuYWN0aXZpdHlJZCA9IGFjdGl2aXR5SWQ7XG5cbiAgICAgICAgdGhpcy5BQ1RJVklUWV9JU19HT0lORyA9IDYwMDtcbiAgICAgICAgdGhpcy5BQ1RJVklUWV9OT1RfRk9VTkQgPSA2MDE7XG4gICAgICAgIHRoaXMuQUNUSVZJVFlfSVNfT1ZFUiA9IDYwMjtcbiAgICAgICAgdGhpcy5BQ1RJVklUWV9OT1RfU1RBUlQgPSA2MDM7XG4gICAgICAgIHRoaXMuQUNUSVZJVFlfSEFTX0pPSU5FRCA9IDYwNDtcbiAgICAgICAgdGhpcy5BQ1RJVklUWV9DUkVBVEVfU1VDQyA9IDkwMDtcblxuICAgICAgICBzZWxmLnNoYWtlRXZlbnQgPSBuZXcgU2hha2Uoe3RocmVzaG9sZDogMTV9KTtcbiAgICAgICAgc2VsZi51c2VyQWN0aXZpdHkgPSB7fTtcbiAgICAgICAgc2VsZi5wcml6ZSA9IHt9O1xuXG4gICAgICAgIHNlbGYubWVzc2FnZVR5cGUgPSBrby5vYnNlcnZhYmxlKCk7XG4gICAgICAgIHNlbGYubWVzc2FnZUNvbnRlbnQgPSBrby5vYnNlcnZhYmxlKCk7XG4gICAgICAgIHNlbGYuY291cG9uSWQgPSBrby5vYnNlcnZhYmxlKCk7XG4gICAgICAgIHNlbGYucHJpemVOYW1lID0ga28ub2JzZXJ2YWJsZSgpO1xuICAgICAgICBzZWxmLmpvaW5lZFRpbWUgPSBrby5vYnNlcnZhYmxlKCk7XG4gICAgICAgIHNlbGYuZW5kRGF0ZSA9IGtvLm9ic2VydmFibGUoKTtcblxuICAgICAgICBzZWxmLmlzTG9hZGluZyA9IGtvLm9ic2VydmFibGUodHJ1ZSk7XG4gICAgICAgIHNlbGYuaXNGaXJzdFRpbWUgPSBrby5vYnNlcnZhYmxlKGZhbHNlKTtcbiAgICAgICAgc2VsZi5oYXNKb2luZWQgPSBrby5vYnNlcnZhYmxlKGZhbHNlKTtcbiAgICAgICAgc2VsZi53b25Db3Vwb24gPSBrby5vYnNlcnZhYmxlKGZhbHNlKTtcbiAgICAgICAgc2VsZi5zaG93TWVzc2FnZSA9IGtvLm9ic2VydmFibGUoZmFsc2UpO1xuXG4gICAgICAgIHNlbGYuaW5pdGlhbGlzZSgpO1xuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5kaXNwYXRjaGVyV29uUHJpemUgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHNlbGYuaXNMb2FkaW5nKGZhbHNlKTtcblxuICAgICAgICB2YXIgc3RhdHVzID0gc2VsZi5wcml6ZS5zdGF0dXM7XG4gICAgICAgIHN3aXRjaChzdGF0dXMpe1xuICAgICAgICAgICAgY2FzZSBzZWxmLkFDVElWSVRZX0hBU19KT0lORUQ6XG4gICAgICAgICAgICAgICAgc2VsZi5zaG93SGFzSm9pbmVkTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBzZWxmLkFDVElWSVRZX0NSRUFURV9TVUNDOlxuICAgICAgICAgICAgICAgIHNlbGYud29uUHJpemUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG5cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5kaXNwYXRjaGVyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLmlzTG9hZGluZyhmYWxzZSk7XG5cbiAgICAgICAgdmFyIHN0YXR1cyA9IHNlbGYudXNlckFjdGl2aXR5LnN0YXR1cztcbiAgICAgICAgc3dpdGNoKHN0YXR1cyl7XG4gICAgICAgICAgICBjYXNlIHNlbGYuQUNUSVZJVFlfSVNfR09JTkc6XG4gICAgICAgICAgICAgICAgaWYoc2VsZi51c2VyQWN0aXZpdHkuZ29fc2hha2UgPT0gJ3llcycpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnNob3dTaGFrZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2Ugc2VsZi5BQ1RJVklUWV9OT1RfRk9VTkQ6XG4gICAgICAgICAgICAgICAgc2VsZi5zaG93Tm90Rm91bmQoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2Ugc2VsZi5BQ1RJVklUWV9JU19PVkVSOlxuICAgICAgICAgICAgICAgIHNlbGYuc2hvd0FjdGl2aXR5SXNPdmVyKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIHNlbGYuQUNUSVZJVFlfTk9UX1NUQVJUOlxuICAgICAgICAgICAgICAgIHNlbGYuc2hvd0FjdGl2aXR5SXNOb3RTdGFydFlldCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBzZWxmLkFDVElWSVRZX0hBU19KT0lORUQ6XG4gICAgICAgICAgICAgICAgc2VsZi5zaG93SGFzSm9pbmVkTWVzc2FnZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBzZWxmLkFDVElWSVRZX0NSRUFURV9TVUNDOlxuICAgICAgICAgICAgICAgIHNlbGYud29uUHJpemUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG5cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5yZXN0b3JlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLmlzRmlyc3RUaW1lKGZhbHNlKTtcbiAgICAgICAgc2VsZi5oYXNKb2luZWQoZmFsc2UpO1xuICAgICAgICBzZWxmLndvbkNvdXBvbihmYWxzZSk7XG4gICAgICAgIHNlbGYuc2hvd01lc3NhZ2UoZmFsc2UpO1xuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS53b25Qcml6ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgc2VsZi5yZXN0b3JlKCk7XG4gICAgICAgIHNlbGYud29uQ291cG9uKHRydWUpO1xuICAgICAgICBzZWxmLnByaXplTmFtZShzZWxmLnByaXplLm5hbWUpO1xuICAgICAgICBzZWxmLmNvdXBvbklkKHNlbGYucHJpemUuY29kZSk7XG4gICAgICAgIHNlbGYuZW5kRGF0ZShzZWxmLnByaXplLmVuZF9kYXRlKTtcblxuICAgICAgICBzZWxmLmRyYXdRUkNvZGUoc2VsZi5wcml6ZS5jb2RlKTtcbiAgICB9O1xuXG4gICAgSm9pbmFjdGl2aXR5cGFnZVZpZXdNb2RlbC5wcm90b3R5cGUuZHJhd1FSQ29kZSA9IGZ1bmN0aW9uKGNvZGUpe1xuICAgICAgICB2YXIgcXIgPSBxckNvZGUucXJjb2RlKDEwLCAnSCcpO1xuICAgICAgICBxci5hZGREYXRhKGNvZGUpO1xuICAgICAgICBxci5tYWtlKCk7XG5cbiAgICAgICAgdmFyIGltZ1RhZyA9IHFyLmNyZWF0ZUltZ1RhZygpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInFyY29kZVwiKS5pbm5lckhUTUwgPSBpbWdUYWc7XG4gICAgfTtcblxuICAgIEpvaW5hY3Rpdml0eXBhZ2VWaWV3TW9kZWwucHJvdG90eXBlLnNob3dTaGFrZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzaG93U2hha2UnKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLnJlc3RvcmUoKTtcbiAgICAgICAgc2VsZi5pc0ZpcnN0VGltZSh0cnVlKTtcbiAgICAgICAgc2VsZi5zdGFydFNoYWtlU3Vic2NyaWJlcigpO1xuXG4gICAgICAgICQoXCIjc2hha2VCdXR0b25cIikuYmluZChcImNsaWNrXCIsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuc2hha2VFdmVudERpZE9jY3VyKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5zaGFrZUV2ZW50RGlkT2NjdXIgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBhdWRpbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2hha2Utc291bmQtbWFsZVwiKTtcbiAgICAgICAgaWYgKGF1ZGlvLnBhdXNlZCkge1xuICAgICAgICAgICAgYXVkaW8ucGxheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXVkaW8uY3VycmVudFRpbWUgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYuc3RvcFNoYWtlU3Vic2NyaWJlcigpO1xuXG4gICAgICAgIHNlbGYuZHJhd0ZvckFQcmljZSgpO1xuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5zdGFydFNoYWtlU3Vic2NyaWJlciA9ICBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHNlbGYuc2hha2VFdmVudC5zdGFydCgpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2hha2UnLCBzZWxmLnNoYWtlRXZlbnREaWRPY2N1ci5iaW5kKHNlbGYpLCBmYWxzZSk7XG4gICAgfTtcblxuICAgIEpvaW5hY3Rpdml0eXBhZ2VWaWV3TW9kZWwucHJvdG90eXBlLnN0b3BTaGFrZVN1YnNjcmliZXIgPSAgZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLnNoYWtlRXZlbnQuc3RvcCgpO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2hha2UnLCBzZWxmLnNoYWtlRXZlbnREaWRPY2N1ciwgZmFsc2UpO1xuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5zaG93SGFzSm9pbmVkTWVzc2FnZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgc2VsZi5yZXN0b3JlKCk7XG4gICAgICAgIHNlbGYuaGFzSm9pbmVkKHRydWUpO1xuICAgICAgICBzZWxmLnByaXplTmFtZShzZWxmLnVzZXJBY3Rpdml0eS5jb3Vwb24ubmFtZSk7XG4gICAgICAgIHNlbGYuY291cG9uSWQoc2VsZi51c2VyQWN0aXZpdHkuY291cG9uLmNvZGUpO1xuICAgICAgICBzZWxmLmpvaW5lZFRpbWUoc2VsZi51c2VyQWN0aXZpdHkuY291cG9uLnN0YXJ0X2RhdGUucmVwbGFjZSgnVCcsICcgJykpO1xuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5zaG93VXNlck1lc3NhZ2UgPSBmdW5jdGlvbih0eXBlLCBjb250ZW50KXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLnJlc3RvcmUoKTtcbiAgICAgICAgc2VsZi5zaG93TWVzc2FnZSh0cnVlKTtcbiAgICAgICAgc2VsZi5tZXNzYWdlVHlwZSh0eXBlKTtcbiAgICAgICAgc2VsZi5tZXNzYWdlQ29udGVudChjb250ZW50KTtcbiAgICB9O1xuXG4gICAgSm9pbmFjdGl2aXR5cGFnZVZpZXdNb2RlbC5wcm90b3R5cGUuc2hvd0FjdGl2aXR5SXNOb3RTdGFydFlldCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgc2VsZi5zaG93VXNlck1lc3NhZ2UoXG4gICAgICAgICAgICBcIua0u+WKqOW6j+WPt+S4uu+8mlwiICsgc2VsZi5hY3Rpdml0eUlkICsgXCIg55qE5rS75Yqo6L+Y5rKh5pyJ5byA5aeLXCIsXG4gICAgICAgICAgICBcIuivt+WbnuWkjeaVsOWtl++8mjEg5p+l6K+i5b2T5YmN5rS75YqoXCJcbiAgICAgICAgKTtcbiAgICB9O1xuXG4gICAgSm9pbmFjdGl2aXR5cGFnZVZpZXdNb2RlbC5wcm90b3R5cGUuc2hvd0FjdGl2aXR5SXNPdmVyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBzZWxmLnNob3dVc2VyTWVzc2FnZShcbiAgICAgICAgICAgIFwi5rS75Yqo5bqP5Y+35Li677yaXCIgKyBzZWxmLmFjdGl2aXR5SWQgKyBcIiDnmoTmtLvliqjlt7Lnu4/nu5PmnZ9cIixcbiAgICAgICAgICAgIFwi6K+35Zue5aSN5pWw5a2X77yaMSDmn6Xor6LlvZPliY3mtLvliqhcIlxuICAgICAgICApO1xuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5zaG93Tm90Rm91bmQgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHNlbGYuc2hvd1VzZXJNZXNzYWdlKFxuICAgICAgICAgICAgXCLmtLvliqjluo/lj7fkuLrvvJpcIiArIHNlbGYuYWN0aXZpdHlJZCArIFwiIOeahOa0u+WKqOS4jeWtmOWcqFwiLFxuICAgICAgICAgICAgXCLor7flm57lpI3mlbDlrZfvvJoxIOafpeivouW9k+WJjea0u+WKqFwiXG4gICAgICAgICk7XG4gICAgfTtcblxuICAgIEpvaW5hY3Rpdml0eXBhZ2VWaWV3TW9kZWwucHJvdG90eXBlLmluaXRpYWxpc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKHNlbGYub3BlbklkID09ICdpaGFrdWxhX2NyZWF0ZV9jb3Vwb24nKSB7XG4gICAgICAgICAgICBzZWxmLmlzTG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgICB2YXIgY291cG9uSW5mbyA9IHNlbGYuYWN0aXZpdHlJZC5zcGxpdCgnOicpO1xuICAgICAgICAgICAgc2VsZi5wcml6ZSA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBjb3Vwb25JbmZvWzBdLFxuICAgICAgICAgICAgICAgIGNvZGU6IGNvdXBvbkluZm9bMV0sXG4gICAgICAgICAgICAgICAgZW5kX2RhdGU6IGNvdXBvbkluZm9bMl0sXG4gICAgICAgICAgICAgICAgc3RhcnRfZGF0ZTogY291cG9uSW5mb1szXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNlbGYud29uUHJpemUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGYuaXNMb2FkaW5nKHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuIHNhbGVzX3NlcnZpY2UuZ2V0VXNlckFjdGl2aXR5U3RhdHVzKHNlbGYub3BlbklkLCBzZWxmLmFjdGl2aXR5SWQpXG4gICAgICAgICAgICAgICAgLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi51c2VyQWN0aXZpdHkgPSBkYXRhO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmRpc3BhdGNoZXIoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsLnByb3RvdHlwZS5kcmF3Rm9yQVByaWNlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgc2VsZi5pc0xvYWRpbmcodHJ1ZSk7XG4gICAgICAgIHJldHVybiBzYWxlc19zZXJ2aWNlLmRyYXdQcml6ZShzZWxmLm9wZW5JZCwgc2VsZi5hY3Rpdml0eUlkKVxuICAgICAgICAgICAgLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnByaXplID0gZGF0YTtcbiAgICAgICAgICAgICAgICBzZWxmLmRpc3BhdGNoZXJXb25Qcml6ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBKb2luYWN0aXZpdHlwYWdlVmlld01vZGVsO1xufSkoKTsiXX0=
(9)
});

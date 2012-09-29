/** @license
 *
 * SoundManager 2: JavaScript Sound for the Web
 * ----------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License:
 * http://schillmania.com/projects/soundmanager2/license.txt
 *
 * V2.97a.20120916+DEV
 */

/*global window, SM2_DEFER, sm2Debugger, console, document, navigator, setTimeout, setInterval, clearInterval, Audio */
/*jslint regexp: true, sloppy: true, white: true, nomen: true, plusplus: true */

(function(window) {
var soundManager = null;
function SoundManager(smURL, smID) {
  this.setupOptions = {
    'url': (smURL || null),
    'flashVersion': 8,
    'debugMode': true,
    'debugFlash': false,
    'useConsole': true,
    'consoleOnly': true,
    'waitForWindowLoad': false,
    'bgColor': '#ffffff',
    'useHighPerformance': false,
    'flashPollingInterval': null,
    'html5PollingInterval': null,
    'flashLoadTimeout': 1000,
    'wmode': null,
    'allowScriptAccess': 'always',
    'useFlashBlock': false,
    'useHTML5Audio': true,
    'html5Test': /^(probably|maybe)$/i,
    'preferFlash': true,
    'noSWFCache': false
  };
  this.defaultOptions = {
    'autoLoad': false,
    'autoPlay': false,
    'from': null,
    'loops': 1,
    'onid3': null,
    'onload': null,
    'whileloading': null,
    'onplay': null,
    'onpause': null,
    'onresume': null,
    'whileplaying': null,
    'onposition': null,
    'onstop': null,
    'onfailure': null,
    'onfinish': null,
    'multiShot': true,
    'multiShotEvents': false,
    'position': null,
    'pan': 0,
    'stream': true,
    'to': null,
    'type': null,
    'usePolicyFile': false,
    'volume': 100
  };
  this.flash9Options = {
    'isMovieStar': null,
    'usePeakData': false,
    'useWaveformData': false,
    'useEQData': false,
    'onbufferchange': null,
    'ondataerror': null
  };
  this.movieStarOptions = {
    'bufferTime': 3,
    'serverURL': null,
    'onconnect': null,
    'duration': null
  };
  this.audioFormats = {
    'mp3': {
      'type': ['audio/mpeg; codecs="mp3"', 'audio/mpeg', 'audio/mp3', 'audio/MPA', 'audio/mpa-robust'],
      'required': true
    },
    'mp4': {
      'related': ['aac','m4a','m4b'],
      'type': ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/x-m4a', 'audio/MP4A-LATM', 'audio/mpeg4-generic'],
      'required': false
    },
    'ogg': {
      'type': ['audio/ogg; codecs=vorbis'],
      'required': false
    },
    'wav': {
      'type': ['audio/wav; codecs="1"', 'audio/wav', 'audio/wave', 'audio/x-wav'],
      'required': false
    }
  };
  this.movieID = 'sm2-container';
  this.id = (smID || 'sm2movie');
  this.debugID = 'soundmanager-debug';
  this.debugURLParam = /([#?&])debug=1/i;
  this.versionNumber = 'V2.97a.20120916+DEV';
  this.version = null;
  this.movieURL = null;
  this.altURL = null;
  this.swfLoaded = false;
  this.enabled = false;
  this.oMC = null;
  this.sounds = {};
  this.soundIDs = [];
  this.muted = false;
  this.didFlashBlock = false;
  this.filePattern = null;
  this.filePatterns = {
    'flash8': /\.mp3(\?.*)?$/i,
    'flash9': /\.mp3(\?.*)?$/i
  };
  this.features = {
    'buffering': false,
    'peakData': false,
    'waveformData': false,
    'eqData': false,
    'movieStar': false
  };
  this.sandbox = {
  };
  this.hasHTML5 = (function() {
    try {
      return (typeof Audio !== 'undefined' && typeof (_isOpera && opera.version() < 10 ? new Audio(null) : new Audio()).canPlayType !== 'undefined');
    } catch(e) {
      return false;
    }
  }());
  this.html5 = {
    'usingFlash': null
  };
  this.flash = {};
  this.html5Only = false;
  this.ignoreFlash = false;
  var SMSound,
  sm2 = this, _flash = null, _sm = 'soundManager', _smc = _sm+'::', _h5 = 'HTML5::', _id, _ua = navigator.userAgent, _win = window, _wl = _win.location.href.toString(), _doc = document, _doNothing, _setProperties, _init, _fV, _on_queue = [], _debugOpen = true, _debugTS, _didAppend = false, _appendSuccess = false, _didInit = false, _disabled = false, _windowLoaded = false, _wDS, _wdCount = 0, _initComplete, _mixin, _assign, _extraOptions, _addOnEvent, _processOnEvents, _initUserOnload, _delayWaitForEI, _waitForEI, _setVersionInfo, _handleFocus, _strings, _initMovie, _domContentLoaded, _winOnLoad, _didDCLoaded, _getDocument, _createMovie, _catchError, _setPolling, _initDebug, _debugLevels = ['log', 'info', 'warn', 'error'], _defaultFlashVersion = 8, _disableObject, _failSafely, _normalizeMovieURL, _oRemoved = null, _oRemovedHTML = null, _str, _flashBlockHandler, _getSWFCSS, _swfCSS, _toggleDebug, _loopFix, _policyFix, _complain, _idCheck, _waitingForEI = false, _initPending = false, _startTimer, _stopTimer, _timerExecute, _h5TimerCount = 0, _h5IntervalTimer = null, _parseURL,
  _needsFlash = null, _featureCheck, _html5OK, _html5CanPlay, _html5Ext, _html5Unload, _domContentLoadedIE, _testHTML5, _event, _slice = Array.prototype.slice, _useGlobalHTML5Audio = false, _lastGlobalHTML5URL, _hasFlash, _detectFlash, _badSafariFix, _html5_events, _showSupport,
  _is_iDevice = _ua.match(/(ipad|iphone|ipod)/i), _isIE = _ua.match(/msie/i), _isWebkit = _ua.match(/webkit/i), _isSafari = (_ua.match(/safari/i) && !_ua.match(/chrome/i)), _isOpera = (_ua.match(/opera/i)),
  _mobileHTML5 = (_ua.match(/(mobile|pre\/|xoom)/i) || _is_iDevice),
  _isBadSafari = (!_wl.match(/usehtml5audio/i) && !_wl.match(/sm2\-ignorebadua/i) && _isSafari && !_ua.match(/silk/i) && _ua.match(/OS X 10_6_([3-7])/i)),
  _hasConsole = (typeof console !== 'undefined' && typeof console.log !== 'undefined'), _isFocused = (typeof _doc.hasFocus !== 'undefined'?_doc.hasFocus():null), _tryInitOnFocus = (_isSafari && (typeof _doc.hasFocus === 'undefined' || !_doc.hasFocus())), _okToDisable = !_tryInitOnFocus, _flashMIME = /(mp3|mp4|mpa|m4a|m4b)/i,
  _emptyURL = 'about:blank',
  _overHTTP = (_doc.location?_doc.location.protocol.match(/http/i):null),
  _http = (!_overHTTP ? 'http:/'+'/' : ''),
  _netStreamMimeTypes = /^\s*audio\/(?:x-)?(?:mpeg4|aac|flv|mov|mp4||m4v|m4a|m4b|mp4v|3gp|3g2)\s*(?:$|;)/i,
  _netStreamTypes = ['mpeg4', 'aac', 'flv', 'mov', 'mp4', 'm4v', 'f4v', 'm4a', 'm4b', 'mp4v', '3gp', '3g2'],
  _netStreamPattern = new RegExp('\\.(' + _netStreamTypes.join('|') + ')(\\?.*)?$', 'i');
  this.mimePattern = /^\s*audio\/(?:x-)?(?:mp(?:eg|3))\s*(?:$|;)/i;
  this.useAltURL = !_overHTTP;
  this._global_a = null;
  _swfCSS = {
    'swfBox': 'sm2-object-box',
    'swfDefault': 'movieContainer',
    'swfError': 'swf_error',
    'swfTimedout': 'swf_timedout',
    'swfLoaded': 'swf_loaded',
    'swfUnblocked': 'swf_unblocked',
    'sm2Debug': 'sm2_debug',
    'highPerf': 'high_performance',
    'flashDebug': 'flash_debug'
  };
  if (_mobileHTML5) {
    sm2.useHTML5Audio = true;
    sm2.preferFlash = false;
    if (_is_iDevice) {
      sm2.ignoreFlash = true;
      _useGlobalHTML5Audio = true;
    }
  }
  this.setup = function(options) {
    var noURL = (!sm2.url);
    if (typeof options !== 'undefined' && _didInit && _needsFlash && sm2.ok() && (typeof options.flashVersion !== 'undefined' || typeof options.url !== 'undefined')) {
      _complain(_str('setupLate'));
    }
    _assign(options);
    if (noURL && _didDCLoaded && typeof options.url !== 'undefined') {
      sm2.beginDelayedInit();
    }
    if (!_didDCLoaded && typeof options.url !== 'undefined' && _doc.readyState === 'complete') {
      setTimeout(_domContentLoaded, 1);
    }
    return sm2;
  };
  this.ok = function() {
    return (_needsFlash?(_didInit && !_disabled):(sm2.useHTML5Audio && sm2.hasHTML5));
  };
  this.supported = this.ok;
  this.getMovie = function(smID) {
    return _id(smID) || _doc[smID] || _win[smID];
  };
  this.createSound = function(oOptions, _url) {
    var _cs, _cs_string, options, oSound = null;
    if (!_didInit || !sm2.ok()) {
      _complain(_cs_string);
      return false;
    }
    if (typeof _url !== 'undefined') {
      oOptions = {
        'id': oOptions,
        'url': _url
      };
    }
    options = _mixin(oOptions);
    options.url = _parseURL(options.url);
    if (_idCheck(options.id, true)) {
      return sm2.sounds[options.id];
    }
    function make() {
      options = _loopFix(options);
      sm2.sounds[options.id] = new SMSound(options);
      sm2.soundIDs.push(options.id);
      return sm2.sounds[options.id];
    }
    if (_html5OK(options)) {
      oSound = make();
      oSound._setup_html5(options);
    } else {
      if (_fV > 8) {
        if (options.isMovieStar === null) {
          options.isMovieStar = !!(options.serverURL || (options.type ? options.type.match(_netStreamMimeTypes) : false) || options.url.match(_netStreamPattern));
        }
      }
      options = _policyFix(options, _cs);
      oSound = make();
      if (_fV === 8) {
        _flash._createSound(options.id, options.loops||1, options.usePolicyFile);
      } else {
        _flash._createSound(options.id, options.url, options.usePeakData, options.useWaveformData, options.useEQData, options.isMovieStar, (options.isMovieStar?options.bufferTime:false), options.loops||1, options.serverURL, options.duration||null, options.autoPlay, true, options.autoLoad, options.usePolicyFile);
        if (!options.serverURL) {
          oSound.connected = true;
          if (options.onconnect) {
            options.onconnect.apply(oSound);
          }
        }
      }
      if (!options.serverURL && (options.autoLoad || options.autoPlay)) {
        oSound.load(options);
      }
    }
    if (!options.serverURL && options.autoPlay) {
      oSound.play();
    }
    return oSound;
  };
  this.destroySound = function(sID, _bFromSound) {
    if (!_idCheck(sID)) {
      return false;
    }
    var oS = sm2.sounds[sID], i;
    oS._iO = {};
    oS.stop();
    oS.unload();
    for (i = 0; i < sm2.soundIDs.length; i++) {
      if (sm2.soundIDs[i] === sID) {
        sm2.soundIDs.splice(i, 1);
        break;
      }
    }
    if (!_bFromSound) {
      oS.destruct(true);
    }
    oS = null;
    delete sm2.sounds[sID];
    return true;
  };
  this.load = function(sID, oOptions) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].load(oOptions);
  };
  this.unload = function(sID) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].unload();
  };
  this.onPosition = function(sID, nPosition, oMethod, oScope) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].onposition(nPosition, oMethod, oScope);
  };
  this.onposition = this.onPosition;
  this.clearOnPosition = function(sID, nPosition, oMethod) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].clearOnPosition(nPosition, oMethod);
  };
  this.play = function(sID, oOptions) {
    var result = false;
    if (!_didInit || !sm2.ok()) {
      _complain(_sm+'.play(): ' + _str(!_didInit?'notReady':'notOK'));
      return result;
    }
    if (!_idCheck(sID)) {
      if (!(oOptions instanceof Object)) {
        oOptions = {
          url: oOptions
        };
      }
      if (oOptions && oOptions.url) {
        oOptions.id = sID;
        result = sm2.createSound(oOptions).play();
      }
      return result;
    }
    return sm2.sounds[sID].play(oOptions);
  };
  this.start = this.play;
  this.setPosition = function(sID, nMsecOffset) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setPosition(nMsecOffset);
  };
  this.stop = function(sID) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].stop();
  };
  this.stopAll = function() {
    var oSound;
    for (oSound in sm2.sounds) {
      if (sm2.sounds.hasOwnProperty(oSound)) {
        sm2.sounds[oSound].stop();
      }
    }
  };
  this.pause = function(sID) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].pause();
  };
  this.pauseAll = function() {
    var i;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].pause();
    }
  };
  this.resume = function(sID) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].resume();
  };
  this.resumeAll = function() {
    var i;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].resume();
    }
  };
  this.togglePause = function(sID) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].togglePause();
  };
  this.setPan = function(sID, nPan) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setPan(nPan);
  };
  this.setVolume = function(sID, nVol) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setVolume(nVol);
  };
  this.mute = function(sID) {
    var i = 0;
    if (typeof sID !== 'string') {
      sID = null;
    }
    if (!sID) {
      for (i = sm2.soundIDs.length-1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].mute();
      }
      sm2.muted = true;
    } else {
      if (!_idCheck(sID)) {
        return false;
      }
      return sm2.sounds[sID].mute();
    }
    return true;
  };
  this.muteAll = function() {
    sm2.mute();
  };
  this.unmute = function(sID) {
    var i;
    if (typeof sID !== 'string') {
      sID = null;
    }
    if (!sID) {
      for (i = sm2.soundIDs.length-1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].unmute();
      }
      sm2.muted = false;
    } else {
      if (!_idCheck(sID)) {
        return false;
      }
      return sm2.sounds[sID].unmute();
    }
    return true;
  };
  this.unmuteAll = function() {
    sm2.unmute();
  };
  this.toggleMute = function(sID) {
    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].toggleMute();
  };
  this.getMemoryUse = function() {
    var ram = 0;
    if (_flash && _fV !== 8) {
      ram = parseInt(_flash._getMemoryUse(), 10);
    }
    return ram;
  };
  this.disable = function(bNoDisable) {
    var i;
    if (typeof bNoDisable === 'undefined') {
      bNoDisable = false;
    }
    if (_disabled) {
      return false;
    }
    _disabled = true;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      _disableObject(sm2.sounds[sm2.soundIDs[i]]);
    }
    _initComplete(bNoDisable);
    _event.remove(_win, 'load', _initUserOnload);
    return true;
  };
  this.canPlayMIME = function(sMIME) {
    var result;
    if (sm2.hasHTML5) {
      result = _html5CanPlay({type:sMIME});
    }
    if (!result && _needsFlash) {
      result = (sMIME && sm2.ok() ? !!((_fV > 8 ? sMIME.match(_netStreamMimeTypes) : null) || sMIME.match(sm2.mimePattern)) : null);
    }
    return result;
  };
  this.canPlayURL = function(sURL) {
    var result;
    if (sm2.hasHTML5) {
      result = _html5CanPlay({url: sURL});
    }
    if (!result && _needsFlash) {
      result = (sURL && sm2.ok() ? !!(sURL.match(sm2.filePattern)) : null);
    }
    return result;
  };
  this.canPlayLink = function(oLink) {
    if (typeof oLink.type !== 'undefined' && oLink.type) {
      if (sm2.canPlayMIME(oLink.type)) {
        return true;
      }
    }
    return sm2.canPlayURL(oLink.href);
  };
  this.getSoundById = function(sID, _suppressDebug) {
    if (!sID) {
      throw new Error(_sm+'.getSoundById(): sID is null/undefined');
    }
    var result = sm2.sounds[sID];
    return result;
  };
  this.onready = function(oMethod, oScope) {
    var sType = 'onready',
        result = false;
    if (typeof oMethod === 'function') {
      if (!oScope) {
        oScope = _win;
      }
      _addOnEvent(sType, oMethod, oScope);
      _processOnEvents();
      result = true;
    } else {
      throw _str('needFunction', sType);
    }
    return result;
  };
  this.ontimeout = function(oMethod, oScope) {
    var sType = 'ontimeout',
        result = false;
    if (typeof oMethod === 'function') {
      if (!oScope) {
        oScope = _win;
      }
      _addOnEvent(sType, oMethod, oScope);
      _processOnEvents({type:sType});
      result = true;
    } else {
      throw _str('needFunction', sType);
    }
    return result;
  };
  this._writeDebug = function(sText, sType, _bTimestamp) {
    return true;
  };
  this._wD = this._writeDebug;
  this._debug = function() {
  };
  this.reboot = function() {
    var i, j;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].destruct();
    }
    if (_flash) {
      try {
        if (_isIE) {
          _oRemovedHTML = _flash.innerHTML;
        }
        _oRemoved = _flash.parentNode.removeChild(_flash);
      } catch(e) {
      }
    }
    _oRemovedHTML = _oRemoved = _needsFlash = null;
    sm2.enabled = _didDCLoaded = _didInit = _waitingForEI = _initPending = _didAppend = _appendSuccess = _disabled = sm2.swfLoaded = false;
    sm2.soundIDs = [];
    sm2.sounds = {};
    _flash = null;
    for (i in _on_queue) {
      if (_on_queue.hasOwnProperty(i)) {
        for (j = _on_queue[i].length-1; j >= 0; j--) {
          _on_queue[i][j].fired = false;
        }
      }
    }
    _win.setTimeout(sm2.beginDelayedInit, 20);
  };
  this.getMoviePercent = function() {
    return (_flash && typeof _flash.PercentLoaded !== 'undefined' ? _flash.PercentLoaded() : null);
  };
  this.beginDelayedInit = function() {
    _windowLoaded = true;
    _domContentLoaded();
    setTimeout(function() {
      if (_initPending) {
        return false;
      }
      _createMovie();
      _initMovie();
      _initPending = true;
      return true;
    }, 20);
    _delayWaitForEI();
  };
  this.destruct = function() {
    sm2.disable(true);
  };
  SMSound = function(oOptions) {
    var s = this, _resetProperties, _add_html5_events, _remove_html5_events, _stop_html5_timer, _start_html5_timer, _attachOnPosition, _onplay_called = false, _onPositionItems = [], _onPositionFired = 0, _detachOnPosition, _applyFromTo, _lastURL = null, _lastHTML5State;
    _lastHTML5State = {
      duration: null,
      time: null
    };
    this.id = oOptions.id;
    this.sID = this.id;
    this.url = oOptions.url;
    this.options = _mixin(oOptions);
    this.instanceOptions = this.options;
    this._iO = this.instanceOptions;
    this.pan = this.options.pan;
    this.volume = this.options.volume;
    this.isHTML5 = false;
    this._a = null;
    this.id3 = {};
    this._debug = function() {
    };
    this.load = function(oOptions) {
      var oS = null, _iO;
      if (typeof oOptions !== 'undefined') {
        s._iO = _mixin(oOptions, s.options);
        s.instanceOptions = s._iO;
      } else {
        oOptions = s.options;
        s._iO = oOptions;
        s.instanceOptions = s._iO;
        if (_lastURL && _lastURL !== s.url) {
          s._iO.url = s.url;
          s.url = null;
        }
      }
      if (!s._iO.url) {
        s._iO.url = s.url;
      }
      s._iO.url = _parseURL(s._iO.url);
      if (s._iO.url === s.url && s.readyState !== 0 && s.readyState !== 2) {
        if (s.readyState === 3 && s._iO.onload) {
          s._iO.onload.apply(s, [(!!s.duration)]);
        }
        return s;
      }
      _iO = s._iO;
      s.loaded = false;
      s.readyState = 1;
      s.playState = 0;
      s.id3 = {};
      if (_html5OK(_iO)) {
        oS = s._setup_html5(_iO);
        if (!oS._called_load) {
          s._html5_canplay = false;
          if (s.url !== _iO.url) {
            s._a.src = _iO.url;
            s.setPosition(0);
          }
          s._a.autobuffer = 'auto';
          s._a.preload = 'auto';
          oS._called_load = true;
          if (_iO.autoPlay) {
            s.play();
          }
        } else {
        }
      } else {
        try {
          s.isHTML5 = false;
          s._iO = _policyFix(_loopFix(_iO));
          _iO = s._iO;
          if (_fV === 8) {
            _flash._load(s.id, _iO.url, _iO.stream, _iO.autoPlay, _iO.usePolicyFile);
          } else {
            _flash._load(s.id, _iO.url, !!(_iO.stream), !!(_iO.autoPlay), _iO.loops||1, !!(_iO.autoLoad), _iO.usePolicyFile);
          }
        } catch(e) {
          _catchError({type:'SMSOUND_LOAD_JS_EXCEPTION', fatal:true});
        }
      }
      s.url = _iO.url;
      return s;
    };
    this.unload = function() {
      if (s.readyState !== 0) {
        if (!s.isHTML5) {
          if (_fV === 8) {
            _flash._unload(s.id, _emptyURL);
          } else {
            _flash._unload(s.id);
          }
        } else {
          _stop_html5_timer();
          if (s._a) {
            s._a.pause();
            _html5Unload(s._a, _emptyURL);
            _lastURL = _emptyURL;
          }
        }
        _resetProperties();
      }
      return s;
    };
    this.destruct = function(_bFromSM) {
      if (!s.isHTML5) {
        s._iO.onfailure = null;
        _flash._destroySound(s.id);
      } else {
        _stop_html5_timer();
        if (s._a) {
          s._a.pause();
          _html5Unload(s._a);
          if (!_useGlobalHTML5Audio) {
            _remove_html5_events();
          }
          s._a._s = null;
          s._a = null;
        }
      }
      if (!_bFromSM) {
        sm2.destroySound(s.id, true);
      }
    };
    this.play = function(oOptions, _updatePlayState) {
      var fN, allowMulti, a, onready, startOK = true,
          exit = null;
      _updatePlayState = (typeof _updatePlayState === 'undefined' ? true : _updatePlayState);
      if (!oOptions) {
        oOptions = {};
      }
      if (s.url) {
        s._iO.url = s.url;
      }
      s._iO = _mixin(s._iO, s.options);
      s._iO = _mixin(oOptions, s._iO);
      s._iO.url = _parseURL(s._iO.url);
      s.instanceOptions = s._iO;
      if (s._iO.serverURL && !s.connected) {
        if (!s.getAutoPlay()) {
          s.setAutoPlay(true);
        }
        return s;
      }
      if (_html5OK(s._iO)) {
        s._setup_html5(s._iO);
        _start_html5_timer();
      }
      if (s.playState === 1 && !s.paused) {
        allowMulti = s._iO.multiShot;
        if (!allowMulti) {
          exit = s;
        } else {
        }
      }
      if (exit !== null) {
        return exit;
      }
      if (oOptions.url && oOptions.url !== s.url) {
        s.load(s._iO);
      }
      if (!s.loaded) {
        if (s.readyState === 0) {
          if (!s.isHTML5) {
            s._iO.autoPlay = true;
            s.load(s._iO);
          } else {
            s.load(s._iO);
          }
          s.instanceOptions = s._iO;
        } else if (s.readyState === 2) {
          exit = s;
        } else {
        }
      } else {
      }
      if (exit !== null) {
        return exit;
      }
      if (!s.isHTML5 && _fV === 9 && s.position > 0 && s.position === s.duration) {
        oOptions.position = 0;
      }
      if (s.paused && s.position >= 0 && (!s._iO.serverURL || s.position > 0)) {
        s.resume();
      } else {
        s._iO = _mixin(oOptions, s._iO);
        if (s._iO.from !== null && s._iO.to !== null && s.instanceCount === 0 && s.playState === 0 && !s._iO.serverURL) {
          onready = function() {
            s._iO = _mixin(oOptions, s._iO);
            s.play(s._iO);
          };
          if (s.isHTML5 && !s._html5_canplay) {
            s.load({
              _oncanplay: onready
            });
            exit = false;
          } else if (!s.isHTML5 && !s.loaded && (!s.readyState || s.readyState !== 2)) {
            s.load({
              onload: onready
            });
            exit = false;
          }
          if (exit !== null) {
            return exit;
          }
          s._iO = _applyFromTo();
        }
        if (!s.instanceCount || s._iO.multiShotEvents || (!s.isHTML5 && _fV > 8 && !s.getAutoPlay())) {
          s.instanceCount++;
        }
        if (s._iO.onposition && s.playState === 0) {
          _attachOnPosition(s);
        }
        s.playState = 1;
        s.paused = false;
        s.position = (typeof s._iO.position !== 'undefined' && !isNaN(s._iO.position) ? s._iO.position : 0);
        if (!s.isHTML5) {
          s._iO = _policyFix(_loopFix(s._iO));
        }
        if (s._iO.onplay && _updatePlayState) {
          s._iO.onplay.apply(s);
          _onplay_called = true;
        }
        s.setVolume(s._iO.volume, true);
        s.setPan(s._iO.pan, true);
        if (!s.isHTML5) {
          startOK = _flash._start(s.id, s._iO.loops || 1, (_fV === 9 ? s._iO.position : s._iO.position / 1000), s._iO.multiShot);
          if (_fV === 9 && !startOK) {
            if (s._iO.onplayerror) {
              s._iO.onplayerror.apply(s);
            }
          }
        } else {
          _start_html5_timer();
          a = s._setup_html5();
          s.setPosition(s._iO.position);
          a.play();
        }
      }
      return s;
    };
    this.start = this.play;
    this.stop = function(bAll) {
      var _iO = s._iO, _oP;
      if (s.playState === 1) {
        s._onbufferchange(0);
        s._resetOnPosition(0);
        s.paused = false;
        if (!s.isHTML5) {
          s.playState = 0;
        }
        _detachOnPosition();
        if (_iO.to) {
          s.clearOnPosition(_iO.to);
        }
        if (!s.isHTML5) {
          _flash._stop(s.id, bAll);
          if (_iO.serverURL) {
            s.unload();
          }
        } else {
          if (s._a) {
            _oP = s.position;
            s.setPosition(0);
            s.position = _oP;
            s._a.pause();
            s.playState = 0;
            s._onTimer();
            _stop_html5_timer();
          }
        }
        s.instanceCount = 0;
        s._iO = {};
        if (_iO.onstop) {
          _iO.onstop.apply(s);
        }
      }
      return s;
    };
    this.setAutoPlay = function(autoPlay) {
      s._iO.autoPlay = autoPlay;
      if (!s.isHTML5) {
        _flash._setAutoPlay(s.id, autoPlay);
        if (autoPlay) {
          if (!s.instanceCount && s.readyState === 1) {
            s.instanceCount++;
          }
        }
      }
    };
    this.getAutoPlay = function() {
      return s._iO.autoPlay;
    };
    this.setPosition = function(nMsecOffset) {
      if (typeof nMsecOffset === 'undefined') {
        nMsecOffset = 0;
      }
      var original_pos,
          position, position1K,
          offset = (s.isHTML5 ? Math.max(nMsecOffset, 0) : Math.min(s.duration || s._iO.duration, Math.max(nMsecOffset, 0)));
      original_pos = s.position;
      s.position = offset;
      position1K = s.position/1000;
      s._resetOnPosition(s.position);
      s._iO.position = offset;
      if (!s.isHTML5) {
        position = (_fV === 9 ? s.position : position1K);
        if (s.readyState && s.readyState !== 2) {
          _flash._setPosition(s.id, position, (s.paused || !s.playState), s._iO.multiShot);
        }
      } else if (s._a) {
        if (s._html5_canplay) {
          if (s._a.currentTime !== position1K) {
            try {
              s._a.currentTime = position1K;
              if (s.playState === 0 || s.paused) {
                s._a.pause();
              }
            } catch(e) {
            }
          }
        } else {
        }
      }
      if (s.isHTML5) {
        if (s.paused) {
          s._onTimer(true);
        }
      }
      return s;
    };
    this.pause = function(_bCallFlash) {
      if (s.paused || (s.playState === 0 && s.readyState !== 1)) {
        return s;
      }
      s.paused = true;
      if (!s.isHTML5) {
        if (_bCallFlash || typeof _bCallFlash === 'undefined') {
          _flash._pause(s.id, s._iO.multiShot);
        }
      } else {
        s._setup_html5().pause();
        _stop_html5_timer();
      }
      if (s._iO.onpause) {
        s._iO.onpause.apply(s);
      }
      return s;
    };
    this.resume = function() {
      var _iO = s._iO;
      if (!s.paused) {
        return s;
      }
      s.paused = false;
      s.playState = 1;
      if (!s.isHTML5) {
        if (_iO.isMovieStar && !_iO.serverURL) {
          s.setPosition(s.position);
        }
        _flash._pause(s.id, _iO.multiShot);
      } else {
        s._setup_html5().play();
        _start_html5_timer();
      }
      if (!_onplay_called && _iO.onplay) {
        _iO.onplay.apply(s);
        _onplay_called = true;
      } else if (_iO.onresume) {
        _iO.onresume.apply(s);
      }
      return s;
    };
    this.togglePause = function() {
      if (s.playState === 0) {
        s.play({
          position: (_fV === 9 && !s.isHTML5 ? s.position : s.position / 1000)
        });
        return s;
      }
      if (s.paused) {
        s.resume();
      } else {
        s.pause();
      }
      return s;
    };
    this.setPan = function(nPan, bInstanceOnly) {
      if (typeof nPan === 'undefined') {
        nPan = 0;
      }
      if (typeof bInstanceOnly === 'undefined') {
        bInstanceOnly = false;
      }
      if (!s.isHTML5) {
        _flash._setPan(s.id, nPan);
      }
      s._iO.pan = nPan;
      if (!bInstanceOnly) {
        s.pan = nPan;
        s.options.pan = nPan;
      }
      return s;
    };
    this.setVolume = function(nVol, _bInstanceOnly) {
      if (typeof nVol === 'undefined') {
        nVol = 100;
      }
      if (typeof _bInstanceOnly === 'undefined') {
        _bInstanceOnly = false;
      }
      if (!s.isHTML5) {
        _flash._setVolume(s.id, (sm2.muted && !s.muted) || s.muted?0:nVol);
      } else if (s._a) {
        s._a.volume = Math.max(0, Math.min(1, nVol/100));
      }
      s._iO.volume = nVol;
      if (!_bInstanceOnly) {
        s.volume = nVol;
        s.options.volume = nVol;
      }
      return s;
    };
    this.mute = function() {
      s.muted = true;
      if (!s.isHTML5) {
        _flash._setVolume(s.id, 0);
      } else if (s._a) {
        s._a.muted = true;
      }
      return s;
    };
    this.unmute = function() {
      s.muted = false;
      var hasIO = (typeof s._iO.volume !== 'undefined');
      if (!s.isHTML5) {
        _flash._setVolume(s.id, hasIO?s._iO.volume:s.options.volume);
      } else if (s._a) {
        s._a.muted = false;
      }
      return s;
    };
    this.toggleMute = function() {
      return (s.muted?s.unmute():s.mute());
    };
    this.onPosition = function(nPosition, oMethod, oScope) {
      _onPositionItems.push({
        position: parseInt(nPosition, 10),
        method: oMethod,
        scope: (typeof oScope !== 'undefined' ? oScope : s),
        fired: false
      });
      return s;
    };
    this.onposition = this.onPosition;
    this.clearOnPosition = function(nPosition, oMethod) {
      var i;
      nPosition = parseInt(nPosition, 10);
      if (isNaN(nPosition)) {
        return false;
      }
      for (i=0; i < _onPositionItems.length; i++) {
        if (nPosition === _onPositionItems[i].position) {
          if (!oMethod || (oMethod === _onPositionItems[i].method)) {
            if (_onPositionItems[i].fired) {
              _onPositionFired--;
            }
            _onPositionItems.splice(i, 1);
          }
        }
      }
    };
    this._processOnPosition = function() {
      var i, item, j = _onPositionItems.length;
      if (!j || !s.playState || _onPositionFired >= j) {
        return false;
      }
      for (i=j-1; i >= 0; i--) {
        item = _onPositionItems[i];
        if (!item.fired && s.position >= item.position) {
          item.fired = true;
          _onPositionFired++;
          item.method.apply(item.scope, [item.position]);
        }
      }
      return true;
    };
    this._resetOnPosition = function(nPosition) {
      var i, item, j = _onPositionItems.length;
      if (!j) {
        return false;
      }
      for (i=j-1; i >= 0; i--) {
        item = _onPositionItems[i];
        if (item.fired && nPosition <= item.position) {
          item.fired = false;
          _onPositionFired--;
        }
      }
      return true;
    };
    _applyFromTo = function() {
      var _iO = s._iO,
          f = _iO.from,
          t = _iO.to,
          start, end;
      end = function() {
        s.clearOnPosition(t, end);
        s.stop();
      };
      start = function() {
        if (t !== null && !isNaN(t)) {
          s.onPosition(t, end);
        }
      };
      if (f !== null && !isNaN(f)) {
        _iO.position = f;
        _iO.multiShot = false;
        start();
      }
      return _iO;
    };
    _attachOnPosition = function() {
      var item,
          op = s._iO.onposition;
      if (op) {
        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.onPosition(parseInt(item, 10), op[item]);
          }
        }
      }
    };
    _detachOnPosition = function() {
      var item,
          op = s._iO.onposition;
      if (op) {
        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.clearOnPosition(parseInt(item, 10));
          }
        }
      }
    };
    _start_html5_timer = function() {
      if (s.isHTML5) {
        _startTimer(s);
      }
    };
    _stop_html5_timer = function() {
      if (s.isHTML5) {
        _stopTimer(s);
      }
    };
    _resetProperties = function(retainPosition) {
      if (!retainPosition) {
        _onPositionItems = [];
        _onPositionFired = 0;
      }
      _onplay_called = false;
      s._hasTimer = null;
      s._a = null;
      s._html5_canplay = false;
      s.bytesLoaded = null;
      s.bytesTotal = null;
      s.duration = (s._iO && s._iO.duration ? s._iO.duration : null);
      s.durationEstimate = null;
      s.buffered = [];
      s.eqData = [];
      s.eqData.left = [];
      s.eqData.right = [];
      s.failures = 0;
      s.isBuffering = false;
      s.instanceOptions = {};
      s.instanceCount = 0;
      s.loaded = false;
      s.metadata = {};
      s.readyState = 0;
      s.muted = false;
      s.paused = false;
      s.peakData = {
        left: 0,
        right: 0
      };
      s.waveformData = {
        left: [],
        right: []
      };
      s.playState = 0;
      s.position = null;
      s.id3 = {};
    };
    _resetProperties();
    this._onTimer = function(bForce) {
      var duration, isNew = false, time, x = {};
      if (s._hasTimer || bForce) {
        if (s._a && (bForce || ((s.playState > 0 || s.readyState === 1) && !s.paused))) {
          duration = s._get_html5_duration();
          if (duration !== _lastHTML5State.duration) {
            _lastHTML5State.duration = duration;
            s.duration = duration;
            isNew = true;
          }
          s.durationEstimate = s.duration;
          time = (s._a.currentTime * 1000 || 0);
          if (time !== _lastHTML5State.time) {
            _lastHTML5State.time = time;
            isNew = true;
          }
          if (isNew || bForce) {
            s._whileplaying(time,x,x,x,x);
          }
        }
        return isNew;
      }
    };
    this._get_html5_duration = function() {
      var _iO = s._iO,
          d = (s._a && s._a.duration ? s._a.duration*1000 : (_iO && _iO.duration ? _iO.duration : null)),
          result = (d && !isNaN(d) && d !== Infinity ? d : null);
      return result;
    };
    this._apply_loop = function(a, nLoops) {
      a.loop = (nLoops > 1 ? 'loop' : '');
    };
    this._setup_html5 = function(oOptions) {
      var _iO = _mixin(s._iO, oOptions), d = decodeURI,
          _a = _useGlobalHTML5Audio ? sm2._global_a : s._a,
          _dURL = d(_iO.url),
          sameURL,
          result;
      if (_useGlobalHTML5Audio) {
        if (_dURL === _lastGlobalHTML5URL) {
          sameURL = true;
        }
      } else if (_dURL === _lastURL) {
        sameURL = true;
      }
      if (_a) {
        if (_a._s) {
          if (_useGlobalHTML5Audio) {
            _result = _a;
            if (_a._s && _a._s.playState && !sameURL) {
              _a._s.stop();
            }
          } else if (!_useGlobalHTML5Audio && _dURL === d(_lastURL)) {
            result = _a;
          }
          if (result) {
            s._apply_loop(_a, _iO.loops);
            return result;
          }
        }
        if (!sameURL) {
          _resetProperties(false);
          _a.src = _iO.url;
          s.url = _iO.url;
          _lastURL = _iO.url;
          _lastGlobalHTML5URL = _iO.url;
          _a._called_load = false;
        }
      } else {
        if (_iO.autoLoad || _iO.autoPlay) {
          s._a = new Audio(_iO.url);
        } else {
          s._a = (_isOpera && opera.version() < 10 ? new Audio(null) : new Audio());
        }
        _a = s._a;
        _a._called_load = false;
        if (_useGlobalHTML5Audio) {
          sm2._global_a = _a;
        }
      }
      s.isHTML5 = true;
      s._a = _a;
      _a._s = s;
      _add_html5_events();
      s._apply_loop(_a, _iO.loops);
      if (_iO.autoLoad || _iO.autoPlay) {
        s.load();
      } else {
        _a.autobuffer = false;
        _a.preload = 'auto';
      }
      return _a;
    };
    _add_html5_events = function() {
      if (s._a._added_events) {
        return false;
      }
      var f;
      function add(oEvt, oFn, bCapture) {
        return s._a ? s._a.addEventListener(oEvt, oFn, bCapture||false) : null;
      }
      s._a._added_events = true;
      for (f in _html5_events) {
        if (_html5_events.hasOwnProperty(f)) {
          add(f, _html5_events[f]);
        }
      }
      return true;
    };
    _remove_html5_events = function() {
      var f;
      function remove(oEvt, oFn, bCapture) {
        return (s._a ? s._a.removeEventListener(oEvt, oFn, bCapture||false) : null);
      }
      s._a._added_events = false;
      for (f in _html5_events) {
        if (_html5_events.hasOwnProperty(f)) {
          remove(f, _html5_events[f]);
        }
      }
    };
    this._onload = function(nSuccess) {
      var fN,
          loadOK = (!!(nSuccess) || (!s.isHTML5 && _fV === 8 && s.duration));
      s.loaded = loadOK;
      s.readyState = loadOK?3:2;
      s._onbufferchange(0);
      if (s._iO.onload) {
        s._iO.onload.apply(s, [loadOK]);
      }
      return true;
    };
    this._onbufferchange = function(nIsBuffering) {
      if (s.playState === 0) {
        return false;
      }
      if ((nIsBuffering && s.isBuffering) || (!nIsBuffering && !s.isBuffering)) {
        return false;
      }
      s.isBuffering = (nIsBuffering === 1);
      if (s._iO.onbufferchange) {
        s._iO.onbufferchange.apply(s);
      }
      return true;
    };
    this._onsuspend = function() {
      if (s._iO.onsuspend) {
        s._iO.onsuspend.apply(s);
      }
      return true;
    };
    this._onfailure = function(msg, level, code) {
      s.failures++;
      if (s._iO.onfailure && s.failures === 1) {
        s._iO.onfailure(s, msg, level, code);
      } else {
      }
    };
    this._onfinish = function() {
      var _io_onfinish = s._iO.onfinish;
      s._onbufferchange(0);
      s._resetOnPosition(0);
      if (s.instanceCount) {
        s.instanceCount--;
        if (!s.instanceCount) {
          _detachOnPosition();
          s.playState = 0;
          s.paused = false;
          s.instanceCount = 0;
          s.instanceOptions = {};
          s._iO = {};
          _stop_html5_timer();
          if (s.isHTML5) {
            s.position = 0;
          }
        }
        if (!s.instanceCount || s._iO.multiShotEvents) {
          if (_io_onfinish) {
            _io_onfinish.apply(s);
          }
        }
      }
    };
    this._whileloading = function(nBytesLoaded, nBytesTotal, nDuration, nBufferLength) {
      var _iO = s._iO;
      s.bytesLoaded = nBytesLoaded;
      s.bytesTotal = nBytesTotal;
      s.duration = Math.floor(nDuration);
      s.bufferLength = nBufferLength;
      if (!s.isHTML5 && !_iO.isMovieStar) {
        if (_iO.duration) {
          s.durationEstimate = (s.duration > _iO.duration) ? s.duration : _iO.duration;
        } else {
          s.durationEstimate = parseInt((s.bytesTotal / s.bytesLoaded) * s.duration, 10);
        }
      } else {
        s.durationEstimate = s.duration;
      }
      if (!s.isHTML5) {
        s.buffered = [{
          'start': 0,
          'end': s.duration
        }];
      }
      if ((s.readyState !== 3 || s.isHTML5) && _iO.whileloading) {
        _iO.whileloading.apply(s);
      }
    };
    this._whileplaying = function(nPosition, oPeakData, oWaveformDataLeft, oWaveformDataRight, oEQData) {
      var _iO = s._iO,
          eqLeft;
      if (isNaN(nPosition) || nPosition === null) {
        return false;
      }
      s.position = Math.max(0, nPosition);
      s._processOnPosition();
      if (!s.isHTML5 && _fV > 8) {
        if (_iO.usePeakData && typeof oPeakData !== 'undefined' && oPeakData) {
          s.peakData = {
            left: oPeakData.leftPeak,
            right: oPeakData.rightPeak
          };
        }
        if (_iO.useWaveformData && typeof oWaveformDataLeft !== 'undefined' && oWaveformDataLeft) {
          s.waveformData = {
            left: oWaveformDataLeft.split(','),
            right: oWaveformDataRight.split(',')
          };
        }
        if (_iO.useEQData) {
          if (typeof oEQData !== 'undefined' && oEQData && oEQData.leftEQ) {
            eqLeft = oEQData.leftEQ.split(',');
            s.eqData = eqLeft;
            s.eqData.left = eqLeft;
            if (typeof oEQData.rightEQ !== 'undefined' && oEQData.rightEQ) {
              s.eqData.right = oEQData.rightEQ.split(',');
            }
          }
        }
      }
      if (s.playState === 1) {
        if (!s.isHTML5 && _fV === 8 && !s.position && s.isBuffering) {
          s._onbufferchange(0);
        }
        if (_iO.whileplaying) {
          _iO.whileplaying.apply(s);
        }
      }
      return true;
    };
    this._oncaptiondata = function(oData) {
      s.captiondata = oData;
      if (s._iO.oncaptiondata) {
        s._iO.oncaptiondata.apply(s, [oData]);
      }
	};
    this._onmetadata = function(oMDProps, oMDData) {
      var oData = {}, i, j;
      for (i = 0, j = oMDProps.length; i < j; i++) {
        oData[oMDProps[i]] = oMDData[i];
      }
      s.metadata = oData;
      if (s._iO.onmetadata) {
        s._iO.onmetadata.apply(s);
      }
	};
    this._onid3 = function(oID3Props, oID3Data) {
      var oData = [], i, j;
      for (i = 0, j = oID3Props.length; i < j; i++) {
        oData[oID3Props[i]] = oID3Data[i];
      }
      s.id3 = _mixin(s.id3, oData);
      if (s._iO.onid3) {
        s._iO.onid3.apply(s);
      }
    };
    this._onconnect = function(bSuccess) {
      bSuccess = (bSuccess === 1);
      s.connected = bSuccess;
      if (bSuccess) {
        s.failures = 0;
        if (_idCheck(s.id)) {
          if (s.getAutoPlay()) {
            s.play(undefined, s.getAutoPlay());
          } else if (s._iO.autoLoad) {
            s.load();
          }
        }
        if (s._iO.onconnect) {
          s._iO.onconnect.apply(s, [bSuccess]);
        }
      }
    };
    this._ondataerror = function(sError) {
      if (s.playState > 0) {
        if (s._iO.ondataerror) {
          s._iO.ondataerror.apply(s);
        }
      }
    };
  };
  _getDocument = function() {
    return (_doc.body || _doc._docElement || _doc.getElementsByTagName('div')[0]);
  };
  _id = function(sID) {
    return _doc.getElementById(sID);
  };
  _mixin = function(oMain, oAdd) {
    var o1 = (oMain || {}), o2, o;
    o2 = (typeof oAdd === 'undefined' ? sm2.defaultOptions : oAdd);
    for (o in o2) {
      if (o2.hasOwnProperty(o) && typeof o1[o] === 'undefined') {
        if (typeof o2[o] !== 'object' || o2[o] === null) {
          o1[o] = o2[o];
        } else {
          o1[o] = _mixin(o1[o], o2[o]);
        }
      }
    }
    return o1;
  };
  _extraOptions = {
    'onready': 1,
    'ontimeout': 1,
    'defaultOptions': 1,
    'flash9Options': 1,
    'movieStarOptions': 1
  };
  _assign = function(o, oParent) {
    var i,
        result = true,
        hasParent = (typeof oParent !== 'undefined'),
        setupOptions = sm2.setupOptions,
        extraOptions = _extraOptions;
    for (i in o) {
      if (o.hasOwnProperty(i)) {
        if (typeof o[i] !== 'object' || o[i] === null || o[i] instanceof Array) {
          if (hasParent && typeof extraOptions[oParent] !== 'undefined') {
            sm2[oParent][i] = o[i];
          } else if (typeof setupOptions[i] !== 'undefined') {
            sm2.setupOptions[i] = o[i];
            sm2[i] = o[i];
          } else if (typeof extraOptions[i] === 'undefined') {
            _complain(_str((typeof sm2[i] === 'undefined' ? 'setupUndef' : 'setupError'), i), 2);
            result = false;
          } else {
            if (sm2[i] instanceof Function) {
              sm2[i].apply(sm2, (o[i] instanceof Array? o[i] : [o[i]]));
            } else {
              sm2[i] = o[i];
            }
          }
        } else {
          if (typeof extraOptions[i] === 'undefined') {
            _complain(_str((typeof sm2[i] === 'undefined' ? 'setupUndef' : 'setupError'), i), 2);
            result = false;
          } else {
            return _assign(o[i], i);
          }
        }
      }
    }
    return result;
  };
  function _preferFlashCheck(kind) {
    return (sm2.preferFlash && _hasFlash && !sm2.ignoreFlash && (typeof sm2.flash[kind] !== 'undefined' && sm2.flash[kind]));
  }
  _event = (function() {
    var old = (_win.attachEvent),
    evt = {
      add: (old?'attachEvent':'addEventListener'),
      remove: (old?'detachEvent':'removeEventListener')
    };
    function getArgs(oArgs) {
      var args = _slice.call(oArgs),
          len = args.length;
      if (old) {
        args[1] = 'on' + args[1];
        if (len > 3) {
          args.pop();
        }
      } else if (len === 3) {
        args.push(false);
      }
      return args;
    }
    function apply(args, sType) {
      var element = args.shift(),
          method = [evt[sType]];
      if (old) {
        element[method](args[0], args[1]);
      } else {
        element[method].apply(element, args);
      }
    }
    function add() {
      apply(getArgs(arguments), 'add');
    }
    function remove() {
      apply(getArgs(arguments), 'remove');
    }
    return {
      'add': add,
      'remove': remove
    };
  }());
  function _html5_event(oFn) {
    return function(e) {
      var s = this._s,
          result;
      if (!s || !s._a) {
        result = null;
      } else {
        result = oFn.call(this, e);
      }
      return result;
    };
  }
  _html5_events = {
    abort: _html5_event(function() {
    }),
    canplay: _html5_event(function() {
      var s = this._s,
          position1K;
      if (s._html5_canplay) {
        return true;
      }
      s._html5_canplay = true;
      s._onbufferchange(0);
      position1K = (typeof s._iO.position !== 'undefined' && !isNaN(s._iO.position)?s._iO.position/1000:null);
      if (s.position && this.currentTime !== position1K) {
        try {
          this.currentTime = position1K;
        } catch(ee) {
        }
      }
      if (s._iO._oncanplay) {
        s._iO._oncanplay();
      }
    }),
    canplaythrough: _html5_event(function() {
      var s = this._s;
      if (!s.loaded) {
        s._onbufferchange(0);
        s._whileloading(s.bytesLoaded, s.bytesTotal, s._get_html5_duration());
        s._onload(true);
      }
    }),
    ended: _html5_event(function() {
      var s = this._s;
      s._onfinish();
    }),
    error: _html5_event(function() {
      this._s._onload(false);
    }),
    loadeddata: _html5_event(function() {
      var s = this._s;
      if (!s._loaded && !_isSafari) {
        s.duration = s._get_html5_duration();
      }
    }),
    loadedmetadata: _html5_event(function() {
    }),
    loadstart: _html5_event(function() {
      this._s._onbufferchange(1);
    }),
    play: _html5_event(function() {
      this._s._onbufferchange(0);
    }),
    playing: _html5_event(function() {
      this._s._onbufferchange(0);
    }),
    progress: _html5_event(function(e) {
      var s = this._s,
          i, j, str, buffered = 0,
          isProgress = (e.type === 'progress'),
          ranges = e.target.buffered,
          loaded = (e.loaded||0),
          total = (e.total||1),
          scale = 1000;
      s.buffered = [];
      if (ranges && ranges.length) {
        for (i=0, j=ranges.length; i<j; i++) {
          s.buffered.push({
            'start': ranges.start(i) * scale,
            'end': ranges.end(i) * scale
          });
        }
        buffered = (ranges.end(0) - ranges.start(0)) * scale;
        loaded = buffered/(e.target.duration*scale);
      }
      if (!isNaN(loaded)) {
        s._onbufferchange(0);
        s._whileloading(loaded, total, s._get_html5_duration());
        if (loaded && total && loaded === total) {
          _html5_events.canplaythrough.call(this, e);
        }
      }
    }),
    ratechange: _html5_event(function() {
    }),
    suspend: _html5_event(function(e) {
      var s = this._s;
      _html5_events.progress.call(this, e);
      s._onsuspend();
    }),
    stalled: _html5_event(function() {
    }),
    timeupdate: _html5_event(function() {
      this._s._onTimer();
    }),
    waiting: _html5_event(function() {
      var s = this._s;
      s._onbufferchange(1);
    })
  };
  _html5OK = function(iO) {
    var result;
    if (iO.serverURL || (iO.type && _preferFlashCheck(iO.type))) {
      result = false;
    } else {
      result = ((iO.type ? _html5CanPlay({type:iO.type}) : _html5CanPlay({url:iO.url}) || sm2.html5Only));
    }
    return result;
  };
  _html5Unload = function(oAudio, url) {
    if (oAudio) {
      oAudio.src = url;
    }
  };
  _html5CanPlay = function(o) {
    if (!sm2.useHTML5Audio || !sm2.hasHTML5) {
      return false;
    }
    var url = (o.url || null),
        mime = (o.type || null),
        aF = sm2.audioFormats,
        result,
        offset,
        fileExt,
        item;
    if (mime && typeof sm2.html5[mime] !== 'undefined') {
      return (sm2.html5[mime] && !_preferFlashCheck(mime));
    }
    if (!_html5Ext) {
      _html5Ext = [];
      for (item in aF) {
        if (aF.hasOwnProperty(item)) {
          _html5Ext.push(item);
          if (aF[item].related) {
            _html5Ext = _html5Ext.concat(aF[item].related);
          }
        }
      }
      _html5Ext = new RegExp('\\.('+_html5Ext.join('|')+')(\\?.*)?$','i');
    }
    fileExt = (url ? url.toLowerCase().match(_html5Ext) : null);
    if (!fileExt || !fileExt.length) {
      if (!mime) {
        result = false;
      } else {
        offset = mime.indexOf(';');
        fileExt = (offset !== -1?mime.substr(0,offset):mime).substr(6);
      }
    } else {
      fileExt = fileExt[1];
    }
    if (fileExt && typeof sm2.html5[fileExt] !== 'undefined') {
      result = (sm2.html5[fileExt] && !_preferFlashCheck(fileExt));
    } else {
      mime = 'audio/'+fileExt;
      result = sm2.html5.canPlayType({type:mime});
      sm2.html5[fileExt] = result;
      result = (result && sm2.html5[mime] && !_preferFlashCheck(mime));
    }
    return result;
  };
  _testHTML5 = function() {
    if (!sm2.useHTML5Audio || !sm2.hasHTML5) {
      return false;
    }
    var a = (typeof Audio !== 'undefined' ? (_isOpera && opera.version() < 10 ? new Audio(null) : new Audio()) : null),
        item, lookup, support = {}, aF, i;
    function _cp(m) {
      var canPlay, i, j,
          result = false,
          isOK = false;
      if (!a || typeof a.canPlayType !== 'function') {
        return result;
      }
      if (m instanceof Array) {
        for (i=0, j=m.length; i<j; i++) {
          if (sm2.html5[m[i]] || a.canPlayType(m[i]).match(sm2.html5Test)) {
            isOK = true;
            sm2.html5[m[i]] = true;
            sm2.flash[m[i]] = !!(m[i].match(_flashMIME));
          }
        }
        result = isOK;
      } else {
        canPlay = (a && typeof a.canPlayType === 'function' ? a.canPlayType(m) : false);
        result = !!(canPlay && (canPlay.match(sm2.html5Test)));
      }
      return result;
    }
    aF = sm2.audioFormats;
    for (item in aF) {
      if (aF.hasOwnProperty(item)) {
        lookup = 'audio/' + item;
        support[item] = _cp(aF[item].type);
        support[lookup] = support[item];
        if (item.match(_flashMIME)) {
          sm2.flash[item] = true;
          sm2.flash[lookup] = true;
        } else {
          sm2.flash[item] = false;
          sm2.flash[lookup] = false;
        }
        if (aF[item] && aF[item].related) {
          for (i=aF[item].related.length-1; i >= 0; i--) {
            support['audio/'+aF[item].related[i]] = support[item];
            sm2.html5[aF[item].related[i]] = support[item];
            sm2.flash[aF[item].related[i]] = support[item];
          }
        }
      }
    }
    support.canPlayType = (a?_cp:null);
    sm2.html5 = _mixin(sm2.html5, support);
    return true;
  };
  _strings = {
  };
  _str = function() {
  };
  _loopFix = function(sOpt) {
    if (_fV === 8 && sOpt.loops > 1 && sOpt.stream) {
      sOpt.stream = false;
    }
    return sOpt;
  };
  _policyFix = function(sOpt, sPre) {
    if (sOpt && !sOpt.usePolicyFile && (sOpt.onid3 || sOpt.usePeakData || sOpt.useWaveformData || sOpt.useEQData)) {
      sOpt.usePolicyFile = true;
    }
    return sOpt;
  };
  _complain = function(sMsg) {
  };
  _doNothing = function() {
    return false;
  };
  _disableObject = function(o) {
    var oProp;
    for (oProp in o) {
      if (o.hasOwnProperty(oProp) && typeof o[oProp] === 'function') {
        o[oProp] = _doNothing;
      }
    }
    oProp = null;
  };
  _failSafely = function(bNoDisable) {
    if (typeof bNoDisable === 'undefined') {
      bNoDisable = false;
    }
    if (_disabled || bNoDisable) {
      sm2.disable(bNoDisable);
    }
  };
  _normalizeMovieURL = function(smURL) {
    var urlParams = null, url;
    if (smURL) {
      if (smURL.match(/\.swf(\?.*)?$/i)) {
        urlParams = smURL.substr(smURL.toLowerCase().lastIndexOf('.swf?') + 4);
        if (urlParams) {
          return smURL;
        }
      } else if (smURL.lastIndexOf('/') !== smURL.length - 1) {
        smURL += '/';
      }
    }
    url = (smURL && smURL.lastIndexOf('/') !== - 1 ? smURL.substr(0, smURL.lastIndexOf('/') + 1) : './') + sm2.movieURL;
    if (sm2.noSWFCache) {
      url += ('?ts=' + new Date().getTime());
    }
    return url;
  };
  _setVersionInfo = function() {
    _fV = parseInt(sm2.flashVersion, 10);
    if (_fV !== 8 && _fV !== 9) {
      sm2.flashVersion = _fV = _defaultFlashVersion;
    }
    var isDebug = (sm2.debugMode || sm2.debugFlash?'_debug.swf':'.swf');
    if (sm2.useHTML5Audio && !sm2.html5Only && sm2.audioFormats.mp4.required && _fV < 9) {
      sm2.flashVersion = _fV = 9;
    }
    sm2.version = sm2.versionNumber + (sm2.html5Only?' (HTML5-only mode)':(_fV === 9?' (AS3/Flash 9)':' (AS2/Flash 8)'));
    if (_fV > 8) {
      sm2.defaultOptions = _mixin(sm2.defaultOptions, sm2.flash9Options);
      sm2.features.buffering = true;
      sm2.defaultOptions = _mixin(sm2.defaultOptions, sm2.movieStarOptions);
      sm2.filePatterns.flash9 = new RegExp('\\.(mp3|' + _netStreamTypes.join('|') + ')(\\?.*)?$', 'i');
      sm2.features.movieStar = true;
    } else {
      sm2.features.movieStar = false;
    }
    sm2.filePattern = sm2.filePatterns[(_fV !== 8?'flash9':'flash8')];
    sm2.movieURL = (_fV === 8?'soundmanager2.swf':'soundmanager2_flash9.swf').replace('.swf', isDebug);
    sm2.features.peakData = sm2.features.waveformData = sm2.features.eqData = (_fV > 8);
  };
  _setPolling = function(bPolling, bHighPerformance) {
    if (!_flash) {
      return false;
    }
    _flash._setPolling(bPolling, bHighPerformance);
  };
  _initDebug = function() {
    if (sm2.debugURLParam.test(_wl)) {
      sm2.debugMode = true;
    }
  };
  _idCheck = this.getSoundById;
  _getSWFCSS = function() {
    var css = [];
    if (sm2.debugMode) {
      css.push(_swfCSS.sm2Debug);
    }
    if (sm2.debugFlash) {
      css.push(_swfCSS.flashDebug);
    }
    if (sm2.useHighPerformance) {
      css.push(_swfCSS.highPerf);
    }
    return css.join(' ');
  };
  _flashBlockHandler = function() {
    var name = _str('fbHandler'),
        p = sm2.getMoviePercent(),
        css = _swfCSS,
        error = {type:'FLASHBLOCK'};
    if (sm2.html5Only) {
      return false;
    }
    if (!sm2.ok()) {
      if (_needsFlash) {
        sm2.oMC.className = _getSWFCSS() + ' ' + css.swfDefault + ' ' + (p === null?css.swfTimedout:css.swfError);
      }
      sm2.didFlashBlock = true;
      _processOnEvents({type:'ontimeout', ignoreInit:true, error:error});
      _catchError(error);
    } else {
      if (sm2.oMC) {
        sm2.oMC.className = [_getSWFCSS(), css.swfDefault, css.swfLoaded + (sm2.didFlashBlock?' '+css.swfUnblocked:'')].join(' ');
      }
    }
  };
  _addOnEvent = function(sType, oMethod, oScope) {
    if (typeof _on_queue[sType] === 'undefined') {
      _on_queue[sType] = [];
    }
    _on_queue[sType].push({
      'method': oMethod,
      'scope': (oScope || null),
      'fired': false
    });
  };
  _processOnEvents = function(oOptions) {
    if (!oOptions) {
      oOptions = {
        type: (sm2.ok() ? 'onready' : 'ontimeout')
      };
    }
    if (!_didInit && oOptions && !oOptions.ignoreInit) {
      return false;
    }
    if (oOptions.type === 'ontimeout' && (sm2.ok() || (_disabled && !oOptions.ignoreInit))) {
      return false;
    }
    var status = {
          success: (oOptions && oOptions.ignoreInit?sm2.ok():!_disabled)
        },
        srcQueue = (oOptions && oOptions.type?_on_queue[oOptions.type]||[]:[]),
        queue = [], i, j,
        args = [status],
        canRetry = (_needsFlash && sm2.useFlashBlock && !sm2.ok());
    if (oOptions.error) {
      args[0].error = oOptions.error;
    }
    for (i = 0, j = srcQueue.length; i < j; i++) {
      if (srcQueue[i].fired !== true) {
        queue.push(srcQueue[i]);
      }
    }
    if (queue.length) {
      for (i = 0, j = queue.length; i < j; i++) {
        if (queue[i].scope) {
          queue[i].method.apply(queue[i].scope, args);
        } else {
          queue[i].method.apply(this, args);
        }
        if (!canRetry) {
          queue[i].fired = true;
        }
      }
    }
    return true;
  };
  _initUserOnload = function() {
    _win.setTimeout(function() {
      if (sm2.useFlashBlock) {
        _flashBlockHandler();
      }
      _processOnEvents();
      if (typeof sm2.onload === 'function') {
        sm2.onload.apply(_win);
      }
      if (sm2.waitForWindowLoad) {
        _event.add(_win, 'load', _initUserOnload);
      }
    },1);
  };
  _detectFlash = function() {
    if (typeof _hasFlash !== 'undefined') {
      return _hasFlash;
    }
    var hasPlugin = false, n = navigator, nP = n.plugins, obj, type, types, AX = _win.ActiveXObject;
    if (nP && nP.length) {
      type = 'application/x-shockwave-flash';
      types = n.mimeTypes;
      if (types && types[type] && types[type].enabledPlugin && types[type].enabledPlugin.description) {
        hasPlugin = true;
      }
    } else if (typeof AX !== 'undefined') {
      try {
        obj = new AX('ShockwaveFlash.ShockwaveFlash');
      } catch(e) {
      }
      hasPlugin = (!!obj);
    }
    _hasFlash = hasPlugin;
    return hasPlugin;
  };
  _featureCheck = function() {
    var needsFlash,
        item,
        result = true,
        formats = sm2.audioFormats,
        isSpecial = (_is_iDevice && !!(_ua.match(/os (1|2|3_0|3_1)/i)));
    if (isSpecial) {
      sm2.hasHTML5 = false;
      sm2.html5Only = true;
      if (sm2.oMC) {
        sm2.oMC.style.display = 'none';
      }
      result = false;
    } else {
      if (sm2.useHTML5Audio) {
        if (!sm2.html5 || !sm2.html5.canPlayType) {
          sm2.hasHTML5 = false;
        }
      }
    }
    if (sm2.useHTML5Audio && sm2.hasHTML5) {
      for (item in formats) {
        if (formats.hasOwnProperty(item)) {
          if ((formats[item].required && !sm2.html5.canPlayType(formats[item].type)) || (sm2.preferFlash && (sm2.flash[item] || sm2.flash[formats[item].type]))) {
            needsFlash = true;
          }
        }
      }
    }
    if (sm2.ignoreFlash) {
      needsFlash = false;
    }
    sm2.html5Only = (sm2.hasHTML5 && sm2.useHTML5Audio && !needsFlash);
    return (!sm2.html5Only);
  };
  _parseURL = function(url) {
    var i, j, urlResult = 0, result;
    if (url instanceof Array) {
      for (i=0, j=url.length; i<j; i++) {
        if (url[i] instanceof Object) {
          if (sm2.canPlayMIME(url[i].type)) {
            urlResult = i;
            break;
          }
        } else if (sm2.canPlayURL(url[i])) {
          urlResult = i;
          break;
        }
      }
      if (url[urlResult].url) {
        url[urlResult] = url[urlResult].url;
      }
      result = url[urlResult];
    } else {
      result = url;
    }
    return result;
  };
  _startTimer = function(oSound) {
    if (!oSound._hasTimer) {
      oSound._hasTimer = true;
      if (!_mobileHTML5 && sm2.html5PollingInterval) {
        if (_h5IntervalTimer === null && _h5TimerCount === 0) {
          _h5IntervalTimer = _win.setInterval(_timerExecute, sm2.html5PollingInterval);
        }
        _h5TimerCount++;
      }
    }
  };
  _stopTimer = function(oSound) {
    if (oSound._hasTimer) {
      oSound._hasTimer = false;
      if (!_mobileHTML5 && sm2.html5PollingInterval) {
        _h5TimerCount--;
      }
    }
  };
  _timerExecute = function() {
    var i;
    if (_h5IntervalTimer !== null && !_h5TimerCount) {
      _win.clearInterval(_h5IntervalTimer);
      _h5IntervalTimer = null;
      return false;
    }
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      if (sm2.sounds[sm2.soundIDs[i]].isHTML5 && sm2.sounds[sm2.soundIDs[i]]._hasTimer) {
        sm2.sounds[sm2.soundIDs[i]]._onTimer();
      }
    }
  };
  _catchError = function(options) {
    options = (typeof options !== 'undefined' ? options : {});
    if (typeof sm2.onerror === 'function') {
      sm2.onerror.apply(_win, [{type:(typeof options.type !== 'undefined' ? options.type : null)}]);
    }
    if (typeof options.fatal !== 'undefined' && options.fatal) {
      sm2.disable();
    }
  };
  _badSafariFix = function() {
    if (!_isBadSafari || !_detectFlash()) {
      return false;
    }
    var aF = sm2.audioFormats, i, item;
    for (item in aF) {
      if (aF.hasOwnProperty(item)) {
        if (item === 'mp3' || item === 'mp4') {
          sm2.html5[item] = false;
          if (aF[item] && aF[item].related) {
            for (i = aF[item].related.length-1; i >= 0; i--) {
              sm2.html5[aF[item].related[i]] = false;
            }
          }
        }
      }
    }
  };
  this._setSandboxType = function(sandboxType) {
  };
  this._externalInterfaceOK = function(flashDate, swfVersion) {
    if (sm2.swfLoaded) {
      return false;
    }
    var e, eiTime = new Date().getTime();
    sm2.swfLoaded = true;
    _tryInitOnFocus = false;
    if (_isBadSafari) {
      _badSafariFix();
    }
    setTimeout(_init, _isIE ? 100 : 1);
  };
  _createMovie = function(smID, smURL) {
    if (_didAppend && _appendSuccess) {
      return false;
    }
    function _initMsg() {
    }
    if (sm2.html5Only) {
      _setVersionInfo();
      _initMsg();
      sm2.oMC = _id(sm2.movieID);
      _init();
      _didAppend = true;
      _appendSuccess = true;
      return false;
    }
    var remoteURL = (smURL || sm2.url),
    localURL = (sm2.altURL || remoteURL),
    swfTitle = 'JS/Flash audio component (SoundManager 2)',
    oTarget = _getDocument(),
    extraClass = _getSWFCSS(),
    isRTL = null,
    html = _doc.getElementsByTagName('html')[0],
    oEmbed, oMovie, tmp, movieHTML, oEl, s, x, sClass;
    isRTL = (html && html.dir && html.dir.match(/rtl/i));
    smID = (typeof smID === 'undefined'?sm2.id:smID);
    function param(name, value) {
      return '<param name="'+name+'" value="'+value+'" />';
    }
    _setVersionInfo();
    sm2.url = _normalizeMovieURL(_overHTTP?remoteURL:localURL);
    smURL = sm2.url;
    sm2.wmode = (!sm2.wmode && sm2.useHighPerformance ? 'transparent' : sm2.wmode);
    if (sm2.wmode !== null && (_ua.match(/msie 8/i) || (!_isIE && !sm2.useHighPerformance)) && navigator.platform.match(/win32|win64/i)) {
      sm2.wmode = null;
    }
    oEmbed = {
      'name': smID,
      'id': smID,
      'src': smURL,
      'quality': 'high',
      'allowScriptAccess': sm2.allowScriptAccess,
      'bgcolor': sm2.bgColor,
      'pluginspage': _http+'www.macromedia.com/go/getflashplayer',
      'title': swfTitle,
      'type': 'application/x-shockwave-flash',
      'wmode': sm2.wmode,
      'hasPriority': 'true'
    };
    if (sm2.debugFlash) {
      oEmbed.FlashVars = 'debug=1';
    }
    if (!sm2.wmode) {
      delete oEmbed.wmode;
    }
    if (_isIE) {
      oMovie = _doc.createElement('div');
      movieHTML = [
        '<object id="' + smID + '" data="' + smURL + '" type="' + oEmbed.type + '" title="' + oEmbed.title +'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="' + _http+'download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0">',
        param('movie', smURL),
        param('AllowScriptAccess', sm2.allowScriptAccess),
        param('quality', oEmbed.quality),
        (sm2.wmode? param('wmode', sm2.wmode): ''),
        param('bgcolor', sm2.bgColor),
        param('hasPriority', 'true'),
        (sm2.debugFlash ? param('FlashVars', oEmbed.FlashVars) : ''),
        '</object>'
      ].join('');
    } else {
      oMovie = _doc.createElement('embed');
      for (tmp in oEmbed) {
        if (oEmbed.hasOwnProperty(tmp)) {
          oMovie.setAttribute(tmp, oEmbed[tmp]);
        }
      }
    }
    _initDebug();
    extraClass = _getSWFCSS();
    oTarget = _getDocument();
    if (oTarget) {
      sm2.oMC = (_id(sm2.movieID) || _doc.createElement('div'));
      if (!sm2.oMC.id) {
        sm2.oMC.id = sm2.movieID;
        sm2.oMC.className = _swfCSS.swfDefault + ' ' + extraClass;
        s = null;
        oEl = null;
        if (!sm2.useFlashBlock) {
          if (sm2.useHighPerformance) {
            s = {
              'position': 'fixed',
              'width': '8px',
              'height': '8px',
              'bottom': '0px',
              'left': '0px',
              'overflow': 'hidden'
            };
          } else {
            s = {
              'position': 'absolute',
              'width': '6px',
              'height': '6px',
              'top': '-9999px',
              'left': '-9999px'
            };
            if (isRTL) {
              s.left = Math.abs(parseInt(s.left,10))+'px';
            }
          }
        }
        if (_isWebkit) {
          sm2.oMC.style.zIndex = 10000;
        }
        if (!sm2.debugFlash) {
          for (x in s) {
            if (s.hasOwnProperty(x)) {
              sm2.oMC.style[x] = s[x];
            }
          }
        }
        try {
          if (!_isIE) {
            sm2.oMC.appendChild(oMovie);
          }
          oTarget.appendChild(sm2.oMC);
          if (_isIE) {
            oEl = sm2.oMC.appendChild(_doc.createElement('div'));
            oEl.className = _swfCSS.swfBox;
            oEl.innerHTML = movieHTML;
          }
          _appendSuccess = true;
        } catch(e) {
          throw new Error(_str('domError')+' \n'+e.toString());
        }
      } else {
        sClass = sm2.oMC.className;
        sm2.oMC.className = (sClass?sClass+' ':_swfCSS.swfDefault) + (extraClass?' '+extraClass:'');
        sm2.oMC.appendChild(oMovie);
        if (_isIE) {
          oEl = sm2.oMC.appendChild(_doc.createElement('div'));
          oEl.className = _swfCSS.swfBox;
          oEl.innerHTML = movieHTML;
        }
        _appendSuccess = true;
      }
    }
    _didAppend = true;
    _initMsg();
    return true;
  };
  _initMovie = function() {
    if (sm2.html5Only) {
      _createMovie();
      return false;
    }
    if (_flash) {
      return false;
    }
    if (!sm2.url) {
       return false;
    }
    _flash = sm2.getMovie(sm2.id);
    if (!_flash) {
      if (!_oRemoved) {
        _createMovie(sm2.id, sm2.url);
      } else {
        if (!_isIE) {
          sm2.oMC.appendChild(_oRemoved);
        } else {
          sm2.oMC.innerHTML = _oRemovedHTML;
        }
        _oRemoved = null;
        _didAppend = true;
      }
      _flash = sm2.getMovie(sm2.id);
    }
    if (typeof sm2.oninitmovie === 'function') {
      setTimeout(sm2.oninitmovie, 1);
    }
    return true;
  };
  _delayWaitForEI = function() {
    setTimeout(_waitForEI, 1000);
  };
  _waitForEI = function() {
    var p,
        loadIncomplete = false;
    if (!sm2.url) {
      return false;
    }
    if (_waitingForEI) {
      return false;
    }
    _waitingForEI = true;
    _event.remove(_win, 'load', _delayWaitForEI);
    if (_tryInitOnFocus && !_isFocused) {
      return false;
    }
    if (!_didInit) {
      p = sm2.getMoviePercent();
      if (p > 0 && p < 100) {
        loadIncomplete = true;
      }
    }
    setTimeout(function() {
      p = sm2.getMoviePercent();
      if (loadIncomplete) {
        _waitingForEI = false;
        _win.setTimeout(_delayWaitForEI, 1);
        return false;
      }
      if (!_didInit && _okToDisable) {
        if (p === null) {
          if (sm2.useFlashBlock || sm2.flashLoadTimeout === 0) {
            if (sm2.useFlashBlock) {
              _flashBlockHandler();
            }
          } else {
            _failSafely(true);
          }
        } else {
          if (sm2.flashLoadTimeout === 0) {
          } else {
            _failSafely(true);
          }
        }
      }
    }, sm2.flashLoadTimeout);
  };
  _handleFocus = function() {
    function cleanup() {
      _event.remove(_win, 'focus', _handleFocus);
    }
    if (_isFocused || !_tryInitOnFocus) {
      cleanup();
      return true;
    }
    _okToDisable = true;
    _isFocused = true;
    _waitingForEI = false;
    _delayWaitForEI();
    cleanup();
    return true;
  };
  _showSupport = function() {
  };
  _initComplete = function(bNoDisable) {
    if (_didInit) {
      return false;
    }
    if (sm2.html5Only) {
      _didInit = true;
      _initUserOnload();
      return true;
    }
    var wasTimeout = (sm2.useFlashBlock && sm2.flashLoadTimeout && !sm2.getMoviePercent()),
        result = true,
        error;
    if (!wasTimeout) {
      _didInit = true;
      if (_disabled) {
        error = {type: (!_hasFlash && _needsFlash ? 'NO_FLASH' : 'INIT_TIMEOUT')};
      }
    }
    if (_disabled || bNoDisable) {
      if (sm2.useFlashBlock && sm2.oMC) {
        sm2.oMC.className = _getSWFCSS() + ' ' + (sm2.getMoviePercent() === null?_swfCSS.swfTimedout:_swfCSS.swfError);
      }
      _processOnEvents({type:'ontimeout', error:error, ignoreInit: true});
      _catchError(error);
      result = false;
    } else {
    }
    if (!_disabled) {
      if (sm2.waitForWindowLoad && !_windowLoaded) {
        _event.add(_win, 'load', _initUserOnload);
      } else {
        _initUserOnload();
      }
    }
    return result;
  };
  _setProperties = function() {
    var i,
        o = sm2.setupOptions;
    for (i in o) {
      if (o.hasOwnProperty(i)) {
        if (typeof sm2[i] === 'undefined') {
          sm2[i] = o[i];
        } else if (sm2[i] !== o[i]) {
          sm2.setupOptions[i] = sm2[i];
        }
      }
    }
  };
  _init = function() {
    if (_didInit) {
      return false;
    }
    function _cleanup() {
      _event.remove(_win, 'load', sm2.beginDelayedInit);
    }
    if (sm2.html5Only) {
      if (!_didInit) {
        _cleanup();
        sm2.enabled = true;
        _initComplete();
      }
      return true;
    }
    _initMovie();
    try {
      _flash._externalInterfaceTest(false);
      _setPolling(true, (sm2.flashPollingInterval || (sm2.useHighPerformance ? 10 : 50)));
      if (!sm2.debugMode) {
        _flash._disableDebug();
      }
      sm2.enabled = true;
      if (!sm2.html5Only) {
        _event.add(_win, 'unload', _doNothing);
      }
    } catch(e) {
      _catchError({type:'JS_TO_FLASH_EXCEPTION', fatal:true});
      _failSafely(true);
      _initComplete();
      return false;
    }
    _initComplete();
    _cleanup();
    return true;
  };
  _domContentLoaded = function() {
    if (_didDCLoaded) {
      return false;
    }
    _didDCLoaded = true;
    _setProperties();
    _initDebug();
    if (!_hasFlash && sm2.hasHTML5) {
      sm2.setup({
        'useHTML5Audio': true,
        'preferFlash': false
      });
    }
    _testHTML5();
    sm2.html5.usingFlash = _featureCheck();
    _needsFlash = sm2.html5.usingFlash;
    _showSupport();
    if (!_hasFlash && _needsFlash) {
      sm2.setup({
        'flashLoadTimeout': 1
      });
    }
    if (_doc.removeEventListener) {
      _doc.removeEventListener('DOMContentLoaded', _domContentLoaded, false);
    }
    _initMovie();
    return true;
  };
  _domContentLoadedIE = function() {
    if (_doc.readyState === 'complete') {
      _domContentLoaded();
      _doc.detachEvent('onreadystatechange', _domContentLoadedIE);
    }
    return true;
  };
  _winOnLoad = function() {
    _windowLoaded = true;
    _event.remove(_win, 'load', _winOnLoad);
  };
  _detectFlash();
  _event.add(_win, 'focus', _handleFocus);
  _event.add(_win, 'load', _delayWaitForEI);
  _event.add(_win, 'load', _winOnLoad);
  if (_doc.addEventListener) {
    _doc.addEventListener('DOMContentLoaded', _domContentLoaded, false);
  } else if (_doc.attachEvent) {
    _doc.attachEvent('onreadystatechange', _domContentLoadedIE);
  } else {
    _catchError({type:'NO_DOM2_EVENTS', fatal:true});
  }
}
// SM2_DEFER details: http://www.schillmania.com/projects/soundmanager2/doc/getstarted/#lazy-loading
if (typeof SM2_DEFER === 'undefined' || !SM2_DEFER) {
  soundManager = new SoundManager();
}
window.SoundManager = SoundManager;
window.soundManager = soundManager;
}(window));
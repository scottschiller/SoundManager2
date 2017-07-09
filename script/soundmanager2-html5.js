/** @license
 *
 * SoundManager 2: JavaScript Sound for the Web (HTML5-only version)
 * -----------------------------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License:
 * http://schillmania.com/projects/soundmanager2/license.txt
 *
 * V2.97a.20170601-HTML5+DEV
 */

/**
 * About this file
 * -------------------------------------------------------------------------------------
 * This is the fully-commented source version of the SoundManager 2 API,
 * recommended for use during development and testing.
 *
 * See soundmanager2-html5-nodebug-jsmin.js for an optimized build (~11KB with gzip.)
 * http://schillmania.com/projects/soundmanager2/doc/getstarted/#basic-inclusion
 * Alternately, serve this file with gzip for 75% compression savings (~30KB over HTTP.)
 *
 * You may notice <d> and </d> comments in this source; these are delimiters for
 * debug blocks which are removed in the -nodebug builds, further optimizing code size.
 *
 * Also, as you may note: Whoa, reliable cross-platform/device audio support is hard! ;)
 */

(function SM2(window, _undefined) {

/* global Audio, document, window, navigator, define, module, opera, setTimeout, setInterval, clearTimeout, sm2Debugger */

'use strict';

if (!window || !window.document) {

  // Don't cross the [environment] streams. SM2 expects to be running in a browser, not under node.js etc.
  // Additionally, if a browser somehow manages to fail this test, as Egon said: "It would be bad."

  throw new Error('SoundManager requires a browser with window and document objects.');

}

var soundManager = null;

/**
 * The SoundManager constructor.
 *
 * @constructor
 * @this {SoundManager}
 * @return {SoundManager} The new SoundManager instance
 */

function SoundManager() {

  /**
   * soundManager configuration options list
   * defines top-level configuration properties to be applied to the soundManager instance (eg. soundManager.debugMode)
   * to set these properties, use the setup() method - eg., soundManager.setup({debugMode: true, ignoreMobileRestrictions: true});
   */

  this.setupOptions = {

    debugMode: true,                  // enable debugging output (console.log() with HTML fallback)
    waitForWindowLoad: false,         // force SM2 to wait for window.onload() before trying to call soundManager.onload()
    html5PollingInterval: null,       // msec affecting whileplaying() for HTML5 audio, excluding mobile devices. If null, native HTML5 update events are used.
    forceUseGlobalHTML5Audio: false,  // if true, a single Audio() object is used for all sounds - and only one can play at a time.
    ignoreMobileRestrictions: false,  // if true, SM2 will not apply global HTML5 audio rules to mobile UAs. iOS > 7 and WebViews may allow multiple Audio() instances.
    html5Test: /^(probably|maybe)$/i, // HTML5 Audio() format support test. Use /^probably$/i; if you want to be more conservative.
    idPrefix: 'sound'                 // if an id is not provided to createSound(), this prefix is used for generated IDs - 'sound0', 'sound1' etc.

  };

  this.defaultOptions = {

    /**
     * the default configuration for sound objects made with createSound() and related methods
     * eg., volume, auto-load behaviour and so forth
     */

    autoLoad: false,        // enable automatic loading (otherwise .load() will be called on demand with .play(), the latter being nicer on bandwidth - if you want to .load yourself, you also can)
    autoPlay: false,        // enable playing of file as soon as possible (much faster if "stream" is true)
    from: null,             // position to start playback within a sound (msec), default = beginning
    loops: 1,               // how many times to repeat the sound (position will wrap around to 0, setPosition() will break out of loop when >0)
    onid3: null,            // callback function for "ID3 data is added/available"
    onerror: null,          // callback function for "load failed" (or, playback/network/decode error under HTML5.)
    onload: null,           // callback function for "load finished"
    whileloading: null,     // callback function for "download progress update" (X of Y bytes received)
    onplay: null,           // callback for "play" start
    onpause: null,          // callback for "pause"
    onresume: null,         // callback for "resume" (pause toggle)
    whileplaying: null,     // callback during play (position update)
    onposition: null,       // object containing times and function callbacks for positions of interest
    onstop: null,           // callback for "user stop"
    onfinish: null,         // callback function for "sound finished playing"
    multiShot: true,        // let sounds "restart" or layer on top of each other when played multiple times, rather than one-shot/one at a time
    multiShotEvents: false, // fire multiple sound events (currently onfinish() only) when multiShot is enabled
    position: null,         // offset (milliseconds) to seek to within loaded sound data.
    playbackRate: 1,        // rate at which to play the sound (HTML5-only)
    stream: true,           // allows playing before entire file has loaded (recommended)
    to: null,               // position to end playback within a sound (msec), default = end
    type: null,             // MIME-like hint for file pattern / canPlay() tests, eg. audio/mp3
    volume: 100             // self-explanatory. 0-100, the latter being the max.

  };

  this.audioFormats = {

    /**
     * determines HTML5 support.
     * if no support for a "required" format, SM2 will fail to start.
     */

    mp3: {
      type: ['audio/mpeg; codecs="mp3"', 'audio/mpeg', 'audio/mp3', 'audio/MPA', 'audio/mpa-robust'],
      required: true
    },

    mp4: {
      related: ['aac', 'm4a', 'm4b'], // additional formats under the MP4 container
      type: ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/x-m4a', 'audio/MP4A-LATM', 'audio/mpeg4-generic'],
      required: false
    },

    ogg: {
      type: ['audio/ogg; codecs=vorbis'],
      required: false
    },

    opus: {
      type: ['audio/ogg; codecs=opus', 'audio/opus'],
      required: false
    },

    wav: {
      type: ['audio/wav; codecs="1"', 'audio/wav', 'audio/wave', 'audio/x-wav'],
      required: false
    },

    flac: {
      type: ['audio/flac'],
      required: false
    }

  };

  this.debugURLParam = /([#?&])debug=1/i;

  // dynamic attributes

  this.versionNumber = 'V2.97a.20170601-HTML5+DEV';
  this.version = null;
  this.enabled = false;
  this.sounds = {};
  this.soundIDs = [];
  this.muted = false;
  this.didFlashBlock = false; // legacy
  this.filePattern = new RegExp(''); // legacy

  // support indicators, set at init (mostly legacy flash backcompat stuff)

  this.features = {
    buffering: false,
    peakData: false,
    waveformData: false,
    eqData: false,
    movieStar: false
  };

  /**
   * format support
   * stores canPlayType() results based on audioFormats.
   * eg. { mp3: boolean, mp4: boolean }
   * treat as read-only.
   */

  this.html5 = {
    usingFlash: false // legacy: set if/when flash fallback is needed
  };

  /**
   * a few private internals (OK, a lot. :D)
   */

  var SMSound,
  sm2 = this, globalHTML5Audio = null, sm = 'soundManager', smc = sm + ': ', h5 = 'HTML5::', ua = navigator.userAgent, wl = window.location.href.toString(), doc = document, doNothing, setProperties, init, on_queue = [], debugTS, didInit = false, disabled = false, _wDS, initComplete, mixin, assign, extraOptions, addOnEvent, processOnEvents, initUserOnload, setVersionInfo, strings, domContentLoaded, winOnLoad, didDCLoaded, catchError, debugLevels = ['log', 'info', 'warn', 'error'], disableObject, str, complain, idCheck, startTimer, stopTimer, timerExecute, h5TimerCount = 0, h5IntervalTimer = null, parseURL, messages = [],
  html5OK, html5CanPlay, html5ErrorCodes, html5Ext, html5Unload, domContentLoadedIE, testHTML5, event, slice = Array.prototype.slice, useGlobalHTML5Audio = false, lastGlobalHTML5URL, html5_events, idCounter = 0, didSetup, msecScale = 1000,
  is_iDevice = ua.match(/(ipad|iphone|ipod)/i), isAndroid = ua.match(/android/i),
  isSafari = (ua.match(/safari/i) && !ua.match(/chrome/i)),
  isOpera = (ua.match(/opera/i)),
  mobileHTML5 = (ua.match(/(mobile|pre\/|xoom)/i) || is_iDevice || isAndroid),
  hasConsole = (window.console !== _undefined && console.log !== _undefined),
  emptyURL = 'about:blank', // safe URL to unload, or load nothing from (most HTML5 UAs)
  emptyWAV = 'data:audio/wave;base64,/UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAD//w=='; // tiny WAV for HTML5 unloading
  this.mimePattern = /^\s*audio\/(?:x-)?(?:mp(?:eg|3))\s*(?:$|;)/i; // default mp3 set

  /**
   * HTML5 error codes, per W3C
   * Error code 1, MEDIA_ERR_ABORTED: Client aborted download at user's request.
   * Error code 2, MEDIA_ERR_NETWORK: A network error of some description caused the user agent to stop fetching the media resource, after the resource was established to be usable.
   * Error code 3, MEDIA_ERR_DECODE: An error of some description occurred while decoding the media resource, after the resource was established to be usable.
   * Error code 4, MEDIA_ERR_SRC_NOT_SUPPORTED: Media (audio file) not supported ("not usable.")
   * Reference: https://html.spec.whatwg.org/multipage/embedded-content.html#error-codes
   */
  html5ErrorCodes = [
    null,
    'MEDIA_ERR_ABORTED',
    'MEDIA_ERR_NETWORK',
    'MEDIA_ERR_DECODE',
    'MEDIA_ERR_SRC_NOT_SUPPORTED'
  ];

  /**
   * basic HTML5 Audio() support test
   * try...catch because of IE 9 "not implemented" nonsense
   * https://github.com/Modernizr/Modernizr/issues/224
   */

  this.hasHTML5 = (function() {
    try {
      // new Audio(null) for stupid Opera 9.64 case, which throws not_enough_arguments exception otherwise.
      return (Audio !== _undefined && (isOpera && opera !== _undefined && opera.version() < 10 ? new Audio(null) : new Audio()).canPlayType !== _undefined);
    } catch(e) {
      return false;
    }
  }());

  /**
   * Public SoundManager API
   * -----------------------
   */

  /**
   * Configures top-level soundManager properties.
   *
   * @param {object} options Option parameters, eg. soundManager.setup({debugMode: true, ignoreMobileRestrictions: true});
   * onready and ontimeout are also accepted parameters. call soundManager.setup() to see the full list.
   */

  this.setup = function(options) {

    assign(options);

    if (!useGlobalHTML5Audio) {

      if (mobileHTML5) {

        // force the singleton HTML5 pattern on mobile, by default.
        if (!sm2.setupOptions.ignoreMobileRestrictions || sm2.setupOptions.forceUseGlobalHTML5Audio) {
          messages.push(strings.globalHTML5);
          useGlobalHTML5Audio = true;
        }

      } else if (sm2.setupOptions.forceUseGlobalHTML5Audio) {

        // only apply singleton HTML5 on desktop if forced.
        messages.push(strings.globalHTML5);
        useGlobalHTML5Audio = true;

      }

    }

    if (!didSetup && mobileHTML5) {

      if (sm2.setupOptions.ignoreMobileRestrictions) {

        messages.push(strings.ignoreMobile);

      } else if ((isAndroid && !ua.match(/android\s2\.3/i)) || !isAndroid) {

        /**
         * Android devices tend to work better with a single audio instance, specifically for chained playback of sounds in sequence.
         * Common use case: exiting sound onfinish() -> createSound() -> play()
         * Presuming similar restrictions for other mobile, non-Android, non-iOS devices.
         */

        // <d>
        sm2._wD(strings.globalHTML5);
        // </d>

        useGlobalHTML5Audio = true;

      }

    }

    didSetup = true;

    return sm2;

  };

  this.ok = function() {

    return sm2.hasHTML5;

  };

  this.supported = this.ok; // legacy

  /**
   * Creates a SMSound sound object instance. Can also be overloaded, e.g., createSound('mySound', '/some.mp3');
   *
   * @param {object} oOptions Sound options (at minimum, url parameter is required.)
   * @return {object} SMSound The new SMSound object.
   */

  this.createSound = function(oOptions, _url) {

    var cs, cs_string, options, oSound = null;

    // <d>
    cs = sm + '.createSound(): ';
    cs_string = cs + str(!didInit ? 'notReady' : 'notOK');
    // </d>

    if (!didInit || !sm2.ok()) {
      complain(cs_string);
      return false;
    }

    if (_url !== _undefined) {
      // function overloading in JS! :) ... assume simple createSound(id, url) use case.
      oOptions = {
        id: oOptions,
        url: _url
      };
    }

    // inherit from defaultOptions
    options = mixin(oOptions);

    options.url = parseURL(options.url);

    // generate an id, if needed.
    if (options.id === _undefined) {
      options.id = sm2.setupOptions.idPrefix + (idCounter++);
    }

    // <d>
    if (options.id.toString().charAt(0).match(/^[0-9]$/)) {
      sm2._wD(cs + str('badID', options.id), 2);
    }

    sm2._wD(cs + options.id + (options.url ? ' (' + options.url + ')' : ''), 1);
    // </d>

    if (idCheck(options.id, true)) {
      sm2._wD(cs + options.id + ' exists', 1);
      return sm2.sounds[options.id];
    }

    function make() {

      sm2.sounds[options.id] = new SMSound(options);
      sm2.soundIDs.push(options.id);
      return sm2.sounds[options.id];

    }

    if (html5OK(options)) {

      oSound = make();
      oSound._setup_html5(options);

    } else {

      sm2._wD(options.id + ': No HTML5 support for this sound. Exiting.');
      return make();

    }

    return oSound;

  };

  /**
   * Destroys a SMSound sound object instance.
   *
   * @param {string} sID The ID of the sound to destroy
   */

  this.destroySound = function(sID, _bFromSound) {

    // explicitly destroy a sound before normal page unload, etc.

    if (!idCheck(sID)) return false;

    var oS = sm2.sounds[sID], i;

    oS.stop();

    // Disable all callbacks after stop(), when the sound is being destroyed
    oS._iO = {};

    oS.unload();

    for (i = 0; i < sm2.soundIDs.length; i++) {
      if (sm2.soundIDs[i] === sID) {
        sm2.soundIDs.splice(i, 1);
        break;
      }
    }

    if (!_bFromSound) {
      // ignore if being called from SMSound instance
      oS.destruct(true);
    }

    oS = null;
    delete sm2.sounds[sID];

    return true;

  };

  /**
   * Calls the load() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   */

  this.load = function(sID, oOptions) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].load(oOptions);

  };

  /**
   * Calls the unload() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   */

  this.unload = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].unload();

  };

  /**
   * Calls the onPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod The relevant callback to fire
   * @param {object} oScope Optional: The scope to apply the callback to
   * @return {SMSound} The SMSound object
   */

  this.onPosition = function(sID, nPosition, oMethod, oScope) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].onposition(nPosition, oMethod, oScope);

  };

  // legacy/backwards-compability: lower-case method name
  this.onposition = this.onPosition;

  /**
   * Calls the clearOnPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod Optional: The relevant callback to fire
   * @return {SMSound} The SMSound object
   */

  this.clearOnPosition = function(sID, nPosition, oMethod) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].clearOnPosition(nPosition, oMethod);

  };

  /**
   * Calls the play() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   * @return {SMSound} The SMSound object
   */

  this.play = function(sID, oOptions) {

    var result = null,
        // legacy function-overloading use case: play('mySound', '/path/to/some.mp3');
        overloaded = (oOptions && !(oOptions instanceof Object));

    if (!didInit || !sm2.ok()) {
      complain(sm + '.play(): ' + str(!didInit ? 'notReady' : 'notOK'));
      return false;
    }

    if (!idCheck(sID, overloaded)) {

      // no sound found for the given ID. Bail.
      if (!overloaded) return false;

      if (overloaded) {
        oOptions = {
          url: oOptions
        };
      }

      if (oOptions && oOptions.url) {
        // overloading use case, create+play: .play('someID', {url:'/path/to.mp3'});
        sm2._wD(sm + '.play(): Attempting to create "' + sID + '"', 1);
        oOptions.id = sID;
        result = sm2.createSound(oOptions).play();
      }

    } else if (overloaded) {

      // existing sound object case
      oOptions = {
        url: oOptions
      };

    }

    if (result === null) {
      // default case
      result = sm2.sounds[sID].play(oOptions);
    }

    return result;

  };

  // just for convenience
  this.start = this.play;

  /**
   * Calls the setPlaybackRate() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.setPlaybackRate = function(sID, rate, allowOverride) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setPlaybackRate(rate, allowOverride);

  };

  /**
   * Calls the setPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nMsecOffset Position (milliseconds)
   * @return {SMSound} The SMSound object
   */

  this.setPosition = function(sID, nMsecOffset) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setPosition(nMsecOffset);

  };

  /**
   * Calls the stop() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.stop = function(sID) {

    if (!idCheck(sID)) return false;

    sm2._wD(sm + '.stop(' + sID + ')', 1);

    return sm2.sounds[sID].stop();

  };

  /**
   * Stops all currently-playing sounds.
   */

  this.stopAll = function() {

    var oSound;
    sm2._wD(sm + '.stopAll()', 1);

    for (oSound in sm2.sounds) {
      if (sm2.sounds.hasOwnProperty(oSound)) {
        // apply only to sound objects
        sm2.sounds[oSound].stop();
      }
    }

  };

  /**
   * Calls the pause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.pause = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].pause();

  };

  /**
   * Pauses all currently-playing sounds.
   */

  this.pauseAll = function() {

    var i;
    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].pause();
    }

  };

  /**
   * Calls the resume() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.resume = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].resume();

  };

  /**
   * Resumes all currently-paused sounds.
   */

  this.resumeAll = function() {

    var i;
    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].resume();
    }

  };

  /**
   * Calls the togglePause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.togglePause = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].togglePause();

  };

  /**
   * Calls the setPan() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPan The pan value (-100 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setPan = function(sID, nPan) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setPan(nPan);

  };

  /**
   * Calls the setVolume() method of a SMSound object by ID
   * Overloaded case: pass only volume argument eg., setVolume(50) to apply to all sounds.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nVol The volume value (0 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setVolume = function(sID, nVol) {

    // setVolume(50) function overloading case - apply to all sounds

    var i, j;

    if (sID !== _undefined && !isNaN(sID) && nVol === _undefined) {
      for (i = 0, j = sm2.soundIDs.length; i < j; i++) {
        sm2.sounds[sm2.soundIDs[i]].setVolume(sID);
      }
      return false;
    }

    // setVolume('mySound', 50) case

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setVolume(nVol);

  };

  /**
   * Calls the mute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.mute = function(sID) {

    var i = 0;

    if (sID instanceof String) {
      sID = null;
    }

    if (!sID) {

      sm2._wD(sm + '.mute(): Muting all sounds');
      for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].mute();
      }
      sm2.muted = true;

    } else {

      if (!idCheck(sID)) return false;

      sm2._wD(sm + '.mute(): Muting "' + sID + '"');
      return sm2.sounds[sID].mute();

    }

    return true;

  };

  /**
   * Mutes all sounds.
   */

  this.muteAll = function() {

    sm2.mute();

  };

  /**
   * Calls the unmute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.unmute = function(sID) {

    var i;

    if (sID instanceof String) {
      sID = null;
    }

    if (!sID) {

      sm2._wD(sm + '.unmute(): Unmuting all sounds');
      for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].unmute();
      }
      sm2.muted = false;

    } else {

      if (!idCheck(sID)) return false;

      sm2._wD(sm + '.unmute(): Unmuting "' + sID + '"');

      return sm2.sounds[sID].unmute();

    }

    return true;

  };

  /**
   * Unmutes all sounds.
   */

  this.unmuteAll = function() {

    sm2.unmute();

  };

  /**
   * Calls the toggleMute() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.toggleMute = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].toggleMute();

  };

  /**
   * Undocumented: NOPs soundManager and all SMSound objects.
   */

  this.disable = function() {

    // destroy all functions
    var i;

    // already disabled?
    if (disabled) return false;

    disabled = true;

    _wDS('shutdown', 1);

    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      disableObject(sm2.sounds[sm2.soundIDs[i]]);
    }

    disableObject(sm2);

    // fire "complete", despite fail
    initComplete();

    event.remove(window, 'load', initUserOnload);

    return true;

  };

  /**
   * Determines playability of a MIME type, eg. 'audio/mp3'.
   */

  this.canPlayMIME = function(sMIME) {

    var result;

    if (sm2.hasHTML5) {
      result = html5CanPlay({
        type: sMIME
      });
    }

    return result;

  };

  /**
   * Determines playability of a URL based on audio support.
   *
   * @param {string} sURL The URL to test
   * @return {boolean} URL playability
   */

  this.canPlayURL = function(sURL) {

    var result;

    if (sm2.hasHTML5) {
      result = html5CanPlay({
        url: sURL
      });
    }

    return result;

  };

  /**
   * Determines playability of an HTML DOM &lt;a&gt; object (or similar object literal) based on audio support.
   *
   * @param {object} oLink an HTML DOM &lt;a&gt; object or object literal including href and/or type attributes
   * @return {boolean} URL playability
   */

  this.canPlayLink = function(oLink) {

    if (oLink.type !== _undefined && oLink.type && sm2.canPlayMIME(oLink.type)) return true;

    return sm2.canPlayURL(oLink.href);

  };

  /**
   * Retrieves a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.getSoundById = function(sID, _suppressDebug) {

    if (!sID) return null;

    var result = sm2.sounds[sID];

    // <d>
    if (!result && !_suppressDebug) {
      sm2._wD(sm + '.getSoundById(): Sound "' + sID + '" not found.', 2);
    }
    // </d>

    return result;

  };

  /**
   * Queues a callback for execution when SoundManager has successfully initialized.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.onready = function(oMethod, oScope) {

    var sType = 'onready',
        result = false;

    if (typeof oMethod === 'function') {

      // <d>
      if (didInit) {
        sm2._wD(str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = window;
      }

      addOnEvent(sType, oMethod, oScope);
      processOnEvents();

      result = true;

    } else {

      throw str('needFunction', sType);

    }

    return result;

  };

  /**
   * Queues a callback for execution when SoundManager has failed to initialize.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.ontimeout = function(oMethod, oScope) {

    var sType = 'ontimeout',
        result = false;

    if (typeof oMethod === 'function') {

      // <d>
      if (didInit) {
        sm2._wD(str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = window;
      }

      addOnEvent(sType, oMethod, oScope);
      processOnEvents({ type: sType });

      result = true;

    } else {

      throw str('needFunction', sType);

    }

    return result;

  };

  /**
   * Writes console.log()-style debug output to a console or in-browser element.
   * Applies when debugMode = true
   *
   * @param {string} sText The console message
   * @param {object} nType Optional log level (number), or object. Number case: Log type/style where 0 = 'info', 1 = 'warn', 2 = 'error'. Object case: Object to be dumped.
   */

  this._writeDebug = function(sText, sTypeOrObject) {

    // pseudo-private console.log()-style output

    // <d>
    if (!sm2.setupOptions.debugMode || !hasConsole) return;

    if (sTypeOrObject && typeof sTypeOrObject === 'object') {
      // object passed; dump to console.
      console.log(sText, sTypeOrObject);
    } else if (debugLevels[sTypeOrObject] !== _undefined) {
      console[debugLevels[sTypeOrObject]](sText);
    } else {
      console.log(sText);
    }
    // </d>

  };

  // alias
  this._wD = this._writeDebug;

  /**
   * Provides debug / state information on all SMSound objects.
   */

  this._debug = function() {

    // <d>
    var i, j;
    _wDS('currentObj', 1);

    for (i = 0, j = sm2.soundIDs.length; i < j; i++) {
      sm2.sounds[sm2.soundIDs[i]]._debug();
    }
    // </d>

  };

  /**
   * Restarts and re-initializes the SoundManager instance.
   *
   * @param {boolean} resetEvents Optional: When true, removes all registered onready and ontimeout event callbacks.
   * @param {boolean} excludeInit Options: When true, does not call beginDelayedInit() (which would restart SM2).
   * @return {object} soundManager The soundManager instance.
   */

  this.reboot = function(resetEvents, excludeInit) {

    // reset some (or all) state, and re-init unless otherwise specified.

    // <d>
    if (sm2.soundIDs.length) {
      sm2._wD('Destroying ' + sm2.soundIDs.length + ' SMSound object' + (sm2.soundIDs.length !== 1 ? 's' : '') + '...');
    }
    // </d>

    var i, j, k;

    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].destruct();
    }

    sm2.enabled = didDCLoaded = didInit = disabled = useGlobalHTML5Audio = false;

    sm2.soundIDs = [];
    sm2.sounds = {};

    idCounter = 0;
    didSetup = false;

    if (!resetEvents) {
      // reset callbacks for onready, ontimeout etc. so that they will fire again on re-init
      for (i in on_queue) {
        if (on_queue.hasOwnProperty(i)) {
          for (j = 0, k = on_queue[i].length; j < k; j++) {
            on_queue[i][j].fired = false;
          }
        }
      }
    } else {
      // remove all callbacks entirely
      on_queue = [];
    }

    // <d>
    if (!excludeInit) {
      sm2._wD(sm + ': Rebooting...');
    }
    // </d>

    return sm2;

  };

  this.reset = function() {

    /**
     * Shuts down and restores the SoundManager instance to its original loaded state, without an explicit reboot. All onready/ontimeout handlers are removed.
     * After this call, SM2 may be re-initialized via soundManager.beginDelayedInit().
     * @return {object} soundManager The soundManager instance.
     */

    _wDS('reset');

    return sm2.reboot(true, true);

  };

  /**
   * Additional helper for manually invoking SM2's init process after DOM Ready / window.onload().
   */

  this.beginDelayedInit = function() {

    domContentLoaded();

  };

  /**
   * Destroys the SoundManager instance and all SMSound instances.
   */

  this.destruct = function() {

    sm2._wD(sm + '.destruct()');
    sm2.disable(true);

  };

  /**
   * SMSound() (sound object) constructor
   * ------------------------------------
   *
   * @param {object} oOptions Sound options (id and url are required attributes)
   * @return {SMSound} The new SMSound object
   */

  SMSound = function(oOptions) {

    var s = this, resetProperties, add_html5_events, remove_html5_events, stop_html5_timer, start_html5_timer, attachOnPosition, onplay_called = false, onPositionItems = [], onPositionFired = 0, detachOnPosition, applyFromTo, lastURL = null, lastHTML5State;

    lastHTML5State = {
      // tracks duration + position (time)
      duration: null,
      time: null
    };

    this.id = oOptions.id;

    // legacy
    this.sID = this.id;

    this.url = oOptions.url;
    this.options = mixin(oOptions);

    // per-play-instance-specific options
    this.instanceOptions = this.options;

    // short alias
    this._iO = this.instanceOptions;

    // assign property defaults
    this.volume = this.options.volume;

    // whether or not this object is using HTML5
    this.isHTML5 = false;

    // internal HTML5 Audio() object reference
    this._a = null;

    /**
     * SMSound() public methods
     * ------------------------
     */

    this.id3 = {}; // legacy

    /**
     * Writes SMSound object parameters to debug console
     */

    this._debug = function() {

      // <d>
      sm2._wD(s.id + ': Merged options:', s.options);
      // </d>

    };

    /**
     * Begins loading a sound per its *url*.
     *
     * @param {object} options Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    this.load = function(options) {

      var oSound = null, instanceOptions;

      if (options !== _undefined) {
        s._iO = mixin(options, s.options);
      } else {
        options = s.options;
        s._iO = options;
        if (lastURL && lastURL !== s.url) {
          _wDS('manURL');
          s._iO.url = s.url;
          s.url = null;
        }
      }

      if (!s._iO.url) {
        s._iO.url = s.url;
      }

      s._iO.url = parseURL(s._iO.url);

      // ensure we're in sync
      s.instanceOptions = s._iO;

      // local shortcut
      instanceOptions = s._iO;

      sm2._wD(s.id + ': load (' + instanceOptions.url + ')');

      if (!instanceOptions.url && !s.url) {
        sm2._wD(s.id + ': load(): url is unassigned. Exiting.', 2);
        return s;
      }

      if (instanceOptions.url === s.url && s.readyState !== 0 && s.readyState !== 2) {
        _wDS('onURL', 1);
        // if loaded and an onload() exists, fire immediately.
        if (s.readyState === 3 && instanceOptions.onload) {
          // assume success based on truthy duration.
          instanceOptions.onload.apply(s, [(!!s.duration)]);
        }
        return s;
      }

      // reset a few state properties

      s.loaded = false;
      s.readyState = 1;
      s.playState = 0;

      // TODO: If switching from HTML5 -> flash (or vice versa), stop currently-playing audio.

      if (html5OK(instanceOptions)) {

        oSound = s._setup_html5(instanceOptions);

        if (!oSound._called_load) {

          s._html5_canplay = false;

          // TODO: review called_load / html5_canplay logic

          // if url provided directly to load(), assign it here.

          if (s.url !== instanceOptions.url) {

            sm2._wD(_wDS('manURL') + ': ' + instanceOptions.url);

            s._a.src = instanceOptions.url;

            // TODO: review / re-apply all relevant options (volume, loop, onposition etc.)

            // reset position for new URL
            s.setPosition(0);

          }

          // given explicit load call, try to preload.
          // standard property, values: none / metadata / auto
          // reference: http://msdn.microsoft.com/en-us/library/ie/ff974759%28v=vs.85%29.aspx
          s._a.preload = 'auto';

          s._a._called_load = true;

        } else {

          sm2._wD(s.id + ': Ignoring request to load again');

        }

      } else {

        sm2._wD(s.id + ': No support for this format. Exiting.');
        return s;

      }

      // after all of this, ensure sound url is up to date.
      s.url = instanceOptions.url;

      return s;

    };

    /**
     * Unloads a sound, canceling any open HTTP requests.
     *
     * @return {SMSound} The SMSound object
     */

    this.unload = function() {

      // Most UAs will use an empty URL to unload.

      // already done?
      if (s.readyState === 0) return s;

      sm2._wD(s.id + ': unload()');

      stop_html5_timer();

      if (s._a) {

        s._a.pause();

        // update empty URL, too
        lastURL = html5Unload(s._a);

      }

      // reset load/status flags
      resetProperties();

      return s;

    };

    /**
     * Unloads and destroys a sound.
     */

    this.destruct = function(_bFromSM) {

      sm2._wD(s.id + ': Destruct');

      stop_html5_timer();

      if (s._a) {
        s._a.pause();
        html5Unload(s._a);
        if (!useGlobalHTML5Audio) {
          remove_html5_events();
        }
        // break obvious circular reference
        s._a._s = null;
        s._a = null;
      }

      if (!_bFromSM) {
        // ensure deletion from controller
        sm2.destroySound(s.id, true);
      }

    };

    /**
     * Begins playing a sound.
     *
     * @param {object} options Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    this.play = function(options, _updatePlayState) {

      var fN, allowMulti, a, onready,
          audioClone, onended, oncanplay;

      // <d>
      fN = s.id + ': play(): ';
      // </d>

      // default to true
      _updatePlayState = (_updatePlayState === _undefined ? true : _updatePlayState);

      if (!options) {
        options = {};
      }

      // first, use local URL (if specified)
      if (s.url) {
        s._iO.url = s.url;
      }

      // mix in any options defined at createSound()
      s._iO = mixin(s._iO, s.options);

      // mix in any options specific to this method
      s._iO = mixin(options, s._iO);

      s._iO.url = parseURL(s._iO.url);

      s.instanceOptions = s._iO;

      if (html5OK(s._iO)) {
        s._setup_html5(s._iO);
        start_html5_timer();
      }

      if (s.playState === 1 && !s.paused) {

        allowMulti = s._iO.multiShot;

        if (!allowMulti) {

          sm2._wD(fN + 'Already playing (one-shot)', 1);

          // go back to original position.
          s.setPosition(s._iO.position);

          return s;

        }

        sm2._wD(fN + 'Already playing (multi-shot)', 1);

      }

      // edge case: play() with explicit URL parameter
      if (options.url && options.url !== s.url) {

        // load using merged options
        s.load(s._iO);

      }

      if (!s.loaded) {

        if (s.readyState === 0) {

          sm2._wD(fN + 'Attempting to load');

          // iOS needs this when recycling sounds, loading a new URL on an existing object.
          s.load(s._iO);

          // HTML5 hack - re-set instanceOptions?
          s.instanceOptions = s._iO;

        } else if (s.readyState === 2) {

          sm2._wD(fN + 'Could not load - exiting', 2);

          return s;

        } else {

          sm2._wD(fN + 'Loading - attempting to play...');

        }

      } else {

        // "play()"
        sm2._wD(fN.substr(0, fN.lastIndexOf(':')));

      }

      /**
       * Streams will pause when their buffer is full if they are being loaded.
       * In this case paused is true, but the song hasn't started playing yet.
       * If we just call resume() the onplay() callback will never be called.
       * So only call resume() if the position is > 0.
       * Another reason is because options like volume won't have been applied yet.
       * For normal sounds, just resume.
       */

      if (s.paused && s.position >= 0 && (!s._iO.serverURL || s.position > 0)) {

        // https://gist.github.com/37b17df75cc4d7a90bf6
        sm2._wD(fN + 'Resuming from paused state', 1);
        s.resume();

        return s;

      }

      s._iO = mixin(options, s._iO);

      /**
       * Preload in the event of play() with position under Flash,
       * or from/to parameters and non-RTMP case
       */
      if (((s._iO.from !== null && s._iO.from > 0) || s._iO.to !== null) && s.instanceCount === 0 && s.playState === 0) {

        onready = function() {
          // sound "canplay" or onload()
          // re-apply position/from/to to instance options, and start playback
          s._iO = mixin(options, s._iO);
          s.play(s._iO);
        };

        // HTML5 needs to at least have "canplay" fired before seeking.
        if (s.isHTML5 && !s._html5_canplay) {

          // this hasn't been loaded yet. load it first, and then do this again.
          sm2._wD(fN + 'Beginning load for non-zero offset case');

          s.load({
            // note: custom HTML5-only event added for from/to implementation.
            _oncanplay: onready
          });

        }

        // otherwise, we're ready to go. re-apply local options, and continue
        s._iO = applyFromTo();

      }

      // increment instance counter, where enabled + supported
      if (!s.instanceCount || s._iO.multiShotEvents || (s._iO.multiShot && !useGlobalHTML5Audio)) {
        s.instanceCount++;
      }

      // if first play and onposition parameters exist, apply them now
      if (s._iO.onposition && s.playState === 0) {
        attachOnPosition(s);
      }

      s.playState = 1;
      s.paused = false;
      s.position = (s._iO.position !== _undefined && !isNaN(s._iO.position) ? s._iO.position : 0);

      if (s._iO.onplay && _updatePlayState) {
        s._iO.onplay.apply(s);
        onplay_called = true;
      }

      s.setVolume(s._iO.volume, true);

      if (s._iO.playbackRate !== 1) {
        s.setPlaybackRate(s._iO.playbackRate);
      }

      if (s.instanceCount < 2) {

        // HTML5 single-instance case

        start_html5_timer();

        a = s._setup_html5();

        s.setPosition(s._iO.position);

        a.play();

      } else {

        // HTML5 multi-shot case

        sm2._wD(s.id + ': Cloning Audio() for instance #' + s.instanceCount + '...');

        audioClone = new Audio(s._iO.url);

        onended = function() {
          event.remove(audioClone, 'ended', onended);
          s._onfinish(s);
          // cleanup
          html5Unload(audioClone);
          audioClone = null;
        };

        oncanplay = function() {
          event.remove(audioClone, 'canplay', oncanplay);
          try {
            audioClone.currentTime = s._iO.position / msecScale;
          } catch(err) {
            complain(s.id + ': multiShot play() failed to apply position of ' + (s._iO.position / msecScale));
          }
          audioClone.play();
        };

        event.add(audioClone, 'ended', onended);

        // apply volume to clones, too
        if (s._iO.volume !== _undefined) {
          audioClone.volume = Math.max(0, Math.min(1, s._iO.volume / 100));
        }

        // playing multiple muted sounds? if you do this, you're weird ;) - but let's cover it.
        if (s.muted) {
          audioClone.muted = true;
        }

        if (s._iO.position) {
          // HTML5 audio can't seek before onplay() event has fired.
          // wait for canplay, then seek to position and start playback.
          event.add(audioClone, 'canplay', oncanplay);
        } else {
          // begin playback at currentTime: 0
          audioClone.play();
        }

      }

      return s;

    };

    // just for convenience
    this.start = this.play;

    /**
     * Stops playing a sound
     *
     * @return {SMSound} The SMSound object
     */

    this.stop = function() {

      var instanceOptions = s._iO,
          originalPosition;

      if (s.playState === 1) {

        sm2._wD(s.id + ': stop()');

        s._onbufferchange(0);
        s._resetOnPosition(0);
        s.paused = false;

        // remove onPosition listeners, if any
        detachOnPosition();

        // and "to" position, if set
        if (instanceOptions.to) {
          s.clearOnPosition(instanceOptions.to);
        }

        if (s._a) {

          originalPosition = s.position;

          // act like Flash, though
          s.setPosition(0);

          // hack: reflect old position for onstop() (also like Flash)
          s.position = originalPosition;

          // html5 has no stop()
          // NOTE: pausing means iOS requires interaction to resume.
          s._a.pause();

          s.playState = 0;

          // and update UI
          s._onTimer();

          stop_html5_timer();

        }

        s.instanceCount = 0;
        s._iO = {};

        if (instanceOptions.onstop) {
          instanceOptions.onstop.apply(s);
        }

      }

      return s;

    };

    /**
     * Sets the playback rate of a sound (HTML5-only.)
     *
     * @param {number} playbackRate (+/-)
     * @return {SMSound} The SMSound object
     */

    this.setPlaybackRate = function(playbackRate) {

      // Per Mozilla, limit acceptable values to prevent playback from stopping (unless allowOverride is truthy.)
      // https://developer.mozilla.org/en-US/Apps/Build/Audio_and_video_delivery/WebAudio_playbackRate_explained
      var normalizedRate = Math.max(0.5, Math.min(4, playbackRate));

      // <d>
      if (normalizedRate !== playbackRate) {
        sm2._wD(s.id + ': setPlaybackRate(' + playbackRate + '): limiting rate to ' + normalizedRate, 2);
      }
      // </d>

      try {
        s._iO.playbackRate = normalizedRate;
        s._a.playbackRate = normalizedRate;
      } catch(e) {
        sm2._wD(s.id + ': setPlaybackRate(' + normalizedRate + ') failed: ' + e.message, 2);
      }

      return s;

    };

    /**
     * Sets the position of a sound.
     *
     * @param {number} nMsecOffset Position (milliseconds)
     * @return {SMSound} The SMSound object
     */

    this.setPosition = function(nMsecOffset) {

      if (nMsecOffset === _undefined) {
        nMsecOffset = 0;
      }

      var position1K,
          // Use the duration from the instance options, if we don't have a track duration yet.
          // position >= 0 and <= current available (loaded) duration
          offset = Math.max(nMsecOffset, 0);

      s.position = offset;
      position1K = s.position / msecScale;
      s._resetOnPosition(s.position);
      s._iO.position = offset;

      if (!s._a) return s;

      // Set the position in the canplay handler if the sound is not ready yet
      if (s._html5_canplay) {

        if (s._a.currentTime.toFixed(3) !== position1K.toFixed(3)) {

          /**
           * DOM/JS errors/exceptions to watch out for:
           * if seek is beyond (loaded?) position, "DOM exception 11"
           * "INDEX_SIZE_ERR": DOM exception 1
           */
          sm2._wD(s.id + ': setPosition(' + position1K + ')');

          try {
            s._a.currentTime = position1K;
            if (s.playState === 0 || s.paused) {
              // allow seek without auto-play/resume
              s._a.pause();
            }
          } catch(e) {
            sm2._wD(s.id + ': setPosition(' + position1K + ') failed: ' + e.message, 2);
          }

        }

      } else if (position1K) {

        // warn on non-zero seek attempts
        sm2._wD(s.id + ': setPosition(' + position1K + '): Cannot seek yet, sound not ready', 2);
        return s;

      }

      if (s.paused) {

        // if paused, refresh UI right away by forcing update
        s._onTimer(true);

      }

      return s;

    };

    /**
     * Pauses sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    this.pause = function() {

      if (s.paused || (s.playState === 0 && s.readyState !== 1)) return s;

      sm2._wD(s.id + ': pause()');
      s.paused = true;

      s._setup_html5().pause();
      stop_html5_timer();

      if (s._iO.onpause) {
        s._iO.onpause.apply(s);
      }

      return s;

    };

    /**
     * Resumes sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    /**
     * When auto-loaded streams pause on buffer full they have a playState of 0.
     * We need to make sure that the playState is set to 1 when these streams "resume".
     * When a paused stream is resumed, we need to trigger the onplay() callback if it
     * hasn't been called already. In this case since the sound is being played for the
     * first time, I think it's more appropriate to call onplay() rather than onresume().
     */

    this.resume = function() {

      var instanceOptions = s._iO;

      if (!s.paused) return s;

      sm2._wD(s.id + ': resume()');
      s.paused = false;
      s.playState = 1;

      s._setup_html5().play();
      start_html5_timer();

      if (!onplay_called && instanceOptions.onplay) {

        instanceOptions.onplay.apply(s);
        onplay_called = true;

      } else if (instanceOptions.onresume) {

        instanceOptions.onresume.apply(s);

      }

      return s;

    };

    /**
     * Toggles sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    this.togglePause = function() {

      sm2._wD(s.id + ': togglePause()');

      if (s.playState === 0) {
        s.play({
          position: (s.position / msecScale)
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

    /**
     * Sets the panning (L-R) effect.
     * Note: Not supported via HTML5.
     *
     * @param {number} nPan The pan value (-100 to 100)
     * @return {SMSound} The SMSound object
     */

    this.setPan = function(nPan, bInstanceOnly) {

      if (nPan === _undefined) {
        nPan = 0;
      }

      if (bInstanceOnly === _undefined) {
        bInstanceOnly = false;
      }

      s._iO.pan = nPan;

      if (!bInstanceOnly) {
        s.pan = nPan;
        s.options.pan = nPan;
      }

      return s;

    };

    /**
     * Sets the volume.
     *
     * @param {number} nVol The volume value (0 to 100)
     * @return {SMSound} The SMSound object
     */

    this.setVolume = function(nVol, _bInstanceOnly) {

      /**
       * Note: Setting volume has no effect on iOS "special snowflake" devices.
       * Hardware volume control overrides software, and volume
       * will always return 1 per Apple docs. (iOS 4 + 5.)
       * http://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingSoundtoCanvasAnimations/AddingSoundtoCanvasAnimations.html
       */

      if (nVol === _undefined) {
        nVol = 100;
      }

      if (_bInstanceOnly === _undefined) {
        _bInstanceOnly = false;
      }

      if (s._a) {

        if (sm2.muted && !s.muted) {
          s.muted = true;
          s._a.muted = true;
        }

        // valid range for native HTML5 Audio(): 0-1
        s._a.volume = Math.max(0, Math.min(1, nVol / 100));

      }

      s._iO.volume = nVol;

      if (!_bInstanceOnly) {
        s.volume = nVol;
        s.options.volume = nVol;
      }

      return s;

    };

    /**
     * Mutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.mute = function() {

      s.muted = true;

      if (s._a) {
        s._a.muted = true;
      }

      return s;

    };

    /**
     * Unmutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.unmute = function() {

      s.muted = false;

      if (s._a) {
        s._a.muted = false;
      }

      return s;

    };

    /**
     * Toggles the muted state of a sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.toggleMute = function() {

      return (s.muted ? s.unmute() : s.mute());

    };

    /**
     * Registers a callback to be fired when a sound reaches a given position during playback.
     *
     * @param {number} nPosition The position to watch for
     * @param {function} oMethod The relevant callback to fire
     * @param {object} oScope Optional: The scope to apply the callback to
     * @return {SMSound} The SMSound object
     */

    this.onPosition = function(nPosition, oMethod, oScope) {

      // TODO: basic dupe checking?

      onPositionItems.push({
        position: parseInt(nPosition, 10),
        method: oMethod,
        scope: (oScope !== _undefined ? oScope : s),
        fired: false
      });

      return s;

    };

    // legacy/backwards-compability: lower-case method name
    this.onposition = this.onPosition;

    /**
     * Removes registered callback(s) from a sound, by position and/or callback.
     *
     * @param {number} nPosition The position to clear callback(s) for
     * @param {function} oMethod Optional: Identify one callback to be removed when multiple listeners exist for one position
     * @return {SMSound} The SMSound object
     */

    this.clearOnPosition = function(nPosition, oMethod) {

      var i;

      nPosition = parseInt(nPosition, 10);

      if (isNaN(nPosition)) {
        // safety check
        return;
      }

      for (i = 0; i < onPositionItems.length; i++) {

        if (nPosition === onPositionItems[i].position) {
          // remove this item if no method was specified, or, if the method matches

          if (!oMethod || (oMethod === onPositionItems[i].method)) {

            if (onPositionItems[i].fired) {
              // decrement "fired" counter, too
              onPositionFired--;
            }

            onPositionItems.splice(i, 1);

          }

        }

      }

    };

    this._processOnPosition = function() {

      var i, item, j = onPositionItems.length;

      if (!j || !s.playState || onPositionFired >= j) return false;

      for (i = j - 1; i >= 0; i--) {

        item = onPositionItems[i];

        if (!item.fired && s.position >= item.position) {

          item.fired = true;
          onPositionFired++;
          item.method.apply(item.scope, [item.position]);

          //  reset j -- onPositionItems.length can be changed in the item callback above... occasionally breaking the loop.
          j = onPositionItems.length;

        }

      }

      return true;

    };

    this._resetOnPosition = function(nPosition) {

      // reset "fired" for items interested in this position
      var i, item, j = onPositionItems.length;

      if (!j) return false;

      for (i = j - 1; i >= 0; i--) {

        item = onPositionItems[i];

        if (item.fired && nPosition <= item.position) {
          item.fired = false;
          onPositionFired--;
        }

      }

      return true;

    };

    /**
     * SMSound() private internals
     * --------------------------------
     */

    applyFromTo = function() {

      var instanceOptions = s._iO,
          f = instanceOptions.from,
          t = instanceOptions.to,
          start, end;

      end = function() {

        // end has been reached.
        sm2._wD(s.id + ': "To" time of ' + t + ' reached.');

        // detach listener
        s.clearOnPosition(t, end);

        // stop should clear this, too
        s.stop();

      };

      start = function() {

        sm2._wD(s.id + ': Playing "from" ' + f);

        // add listener for end
        if (t !== null && !isNaN(t)) {
          s.onPosition(t, end);
        }

      };

      if (f !== null && !isNaN(f)) {

        // apply to instance options, guaranteeing correct start position.
        instanceOptions.position = f;

        // multiShot timing can't be tracked, so prevent that.
        instanceOptions.multiShot = false;

        start();

      }

      // return updated instanceOptions including starting position
      return instanceOptions;

    };

    attachOnPosition = function() {

      var item,
          op = s._iO.onposition;

      // attach onposition things, if any, now.

      if (op) {

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.onPosition(parseInt(item, 10), op[item]);
          }
        }

      }

    };

    detachOnPosition = function() {

      var item,
          op = s._iO.onposition;

      // detach any onposition()-style listeners.

      if (op) {

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.clearOnPosition(parseInt(item, 10));
          }
        }

      }

    };

    start_html5_timer = function() {

      startTimer(s);

    };

    stop_html5_timer = function() {

      stopTimer(s);

    };

    resetProperties = function(retainPosition) {

      if (!retainPosition) {
        onPositionItems = [];
        onPositionFired = 0;
      }

      onplay_called = false;

      s._hasTimer = null;
      s._a = null;
      s._html5_canplay = false;
      s.bytesLoaded = null;
      s.bytesTotal = null;
      s.duration = (s._iO && s._iO.duration ? s._iO.duration : null);
      s.durationEstimate = null;
      s.buffered = [];

      s.failures = 0;
      s.isBuffering = false;
      s.instanceOptions = {};
      s.instanceCount = 0;
      s.loaded = false;
      s.metadata = {};

      // 0 = uninitialised, 1 = loading, 2 = failed/error, 3 = loaded/success
      s.readyState = 0;

      s.muted = false;
      s.paused = false;

      // legacy Flash bits: eqData, peakData, waveformData, id3
      s.eqData = [];
      s.eqData.left = [];
      s.eqData.right = [];

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

    resetProperties();

    /**
     * Pseudo-private SMSound internals
     * --------------------------------
     */

    this._onTimer = function(bForce) {

      /**
       * HTML5-only _whileplaying() etc.
       * called from both HTML5 native events, and polling/interval-based timers
       * mimics flash and fires only when time/duration change, so as to be polling-friendly
       */

      var duration, isNew = false, time, x = {};

      if (s._hasTimer || bForce) {

        // TODO: May not need to track readyState (1 = loading)

        if (s._a && (bForce || ((s.playState > 0 || s.readyState === 1) && !s.paused))) {

          duration = s._get_html5_duration();

          if (duration !== lastHTML5State.duration) {

            lastHTML5State.duration = duration;
            s.duration = duration;
            isNew = true;

          }

          // TODO: investigate why this goes wack if not set/re-set each time.
          s.durationEstimate = s.duration;

          time = (s._a.currentTime * msecScale || 0);

          if (time !== lastHTML5State.time) {

            lastHTML5State.time = time;
            isNew = true;

          }

          if (isNew || bForce) {

            s._whileplaying(time, x, x, x, x);

          }

        }

      }

      return isNew;

    };

    this._get_html5_duration = function() {

      var instanceOptions = s._iO,
          // if audio object exists, use its duration - else, instance option duration (if provided - it's a hack, really, and should be retired) OR null
          d = (s._a && s._a.duration ? s._a.duration * msecScale : (instanceOptions && instanceOptions.duration ? instanceOptions.duration : null)),
          result = (d && !isNaN(d) && d !== Infinity ? d : null);

      return result;

    };

    this._apply_loop = function(a, nLoops) {

      /**
       * boolean instead of "loop", for webkit? - spec says string. http://www.w3.org/TR/html-markup/audio.html#audio.attrs.loop
       * note that loop is either off or infinite under HTML5, unlike Flash which allows arbitrary loop counts to be specified.
       */

      // <d>
      if (!a.loop && nLoops > 1) {
        sm2._wD('Note: Native HTML5 looping is infinite.', 1);
      }
      // </d>

      a.loop = (nLoops > 1 ? 'loop' : '');

    };

    this._setup_html5 = function(options) {

      var instanceOptions = mixin(s._iO, options),
          a = useGlobalHTML5Audio ? globalHTML5Audio : s._a,
          dURL = decodeURI(instanceOptions.url),
          sameURL;

      /**
       * "First things first, I, Poppa..." (reset the previous state of the old sound, if playing)
       * Fixes case with devices that can only play one sound at a time
       * Otherwise, other sounds in mid-play will be terminated without warning and in a stuck state
       */

      if (useGlobalHTML5Audio) {

        if (dURL === decodeURI(lastGlobalHTML5URL)) {
          // global HTML5 audio: re-use of URL
          sameURL = true;
        }

      } else if (dURL === decodeURI(lastURL)) {

        // options URL is the same as the "last" URL, and we used (loaded) it
        sameURL = true;

      }

      if (a) {

        if (a._s) {

          if (useGlobalHTML5Audio) {

            if (a._s && a._s.playState && !sameURL) {

              // global HTML5 audio case, and loading a new URL. stop the currently-playing one.
              a._s.stop();

            }

          } else if (!useGlobalHTML5Audio && dURL === decodeURI(lastURL)) {

            // non-global HTML5 reuse case: same url, ignore request
            s._apply_loop(a, instanceOptions.loops);

            return a;

          }

        }

        if (!sameURL) {

          // don't retain onPosition() stuff with new URLs.

          if (lastURL) {
            resetProperties(false);
          }

          // assign new HTML5 URL

          a.src = instanceOptions.url;

          s.url = instanceOptions.url;

          lastURL = instanceOptions.url;

          lastGlobalHTML5URL = instanceOptions.url;

          a._called_load = false;

        }

      } else {

        if (instanceOptions.autoLoad || instanceOptions.autoPlay) {

          s._a = new Audio(instanceOptions.url);
          s._a.load();

        } else {

          // null for stupid Opera 9.64 case
          s._a = (isOpera && opera.version() < 10 ? new Audio(null) : new Audio());

        }

        // assign local reference
        a = s._a;

        a._called_load = false;

        if (useGlobalHTML5Audio) {

          globalHTML5Audio = a;

        }

      }

      s.isHTML5 = true;

      // store a ref on the track
      s._a = a;

      // store a ref on the audio
      a._s = s;

      add_html5_events();

      s._apply_loop(a, instanceOptions.loops);

      if (instanceOptions.autoLoad || instanceOptions.autoPlay) {

        s.load();

      } else {

        // early HTML5 implementation (non-standard)
        a.autobuffer = false;

        // standard ('none' is also an option.)
        a.preload = 'auto';

      }

      return a;

    };

    add_html5_events = function() {

      if (s._a._added_events) return false;

      var f;

      function add(oEvt, oFn, bCapture) {
        return s._a ? s._a.addEventListener(oEvt, oFn, bCapture || false) : null;
      }

      s._a._added_events = true;

      for (f in html5_events) {
        if (html5_events.hasOwnProperty(f)) {
          add(f, html5_events[f]);
        }
      }

      return true;

    };

    remove_html5_events = function() {

      // Remove event listeners

      var f;

      function remove(oEvt, oFn, bCapture) {
        return (s._a ? s._a.removeEventListener(oEvt, oFn, bCapture || false) : null);
      }

      sm2._wD(s.id + ': Removing event listeners');
      s._a._added_events = false;

      for (f in html5_events) {
        if (html5_events.hasOwnProperty(f)) {
          remove(f, html5_events[f]);
        }
      }

    };

    /**
     * Pseudo-private event internals
     * ------------------------------
     */

    this._onload = function(nSuccess) {

      var fN,
          // check for duration to prevent false positives from flash 8 when loading from cache.
          loadOK = !!nSuccess;

      // <d>
      fN = s.id + ': ';
      sm2._wD(fN + (loadOK ? 'onload()' : 'Failed to load / invalid sound?' + (!s.duration ? ' Zero-length duration reported.' : ' -') + ' (' + s.url + ')'), (loadOK ? 1 : 2));
      // </d>

      s.loaded = loadOK;
      s.readyState = (loadOK ? 3 : 2);
      s._onbufferchange(0);

      if (s._iO.onload) {
        s._iO.onload.apply(s, [loadOK]);
      }

      return true;

    };

    this._onerror = function(errorCode, description) {

      // https://html.spec.whatwg.org/multipage/embedded-content.html#error-codes
      if (s._iO.onerror) {
        s._iO.onerror.apply(s, [errorCode, description]);
      }

    };

    this._onbufferchange = function(nIsBuffering) {

      // ignore if not playing
      if (s.playState === 0) return false;

      if ((nIsBuffering && s.isBuffering) || (!nIsBuffering && !s.isBuffering)) return false;

      s.isBuffering = (nIsBuffering === 1);

      if (s._iO.onbufferchange) {
        sm2._wD(s.id + ': Buffer state change: ' + nIsBuffering);
        s._iO.onbufferchange.apply(s, [nIsBuffering]);
      }

      return true;

    };

    /**
     * Playback may have stopped due to buffering, or related reason.
     * This state can be encountered on iOS < 6 when auto-play is blocked.
     */

    this._onsuspend = function() {

      if (s._iO.onsuspend) {
        sm2._wD(s.id + ': Playback suspended');
        s._iO.onsuspend.apply(s);
      }

      return true;

    };

    /**
     * flash 9/movieStar + RTMP-only method, should fire only once at most
     * at this point we just recreate failed sounds rather than trying to reconnect
     */

    this._onfailure = function(msg, level, code) {

      s.failures++;
      sm2._wD(s.id + ': Failure (' + s.failures + '): ' + msg);

      if (s._iO.onfailure && s.failures === 1) {
        s._iO.onfailure(msg, level, code);
      } else {
        sm2._wD(s.id + ': Ignoring failure');
      }

    };

    this._onfinish = function() {

      // store local copy before it gets trashed...
      var io_onfinish = s._iO.onfinish;

      s._onbufferchange(0);
      s._resetOnPosition(0);

      // reset some state items
      if (s.instanceCount) {

        s.instanceCount--;

        if (!s.instanceCount) {

          // remove onPosition listeners, if any
          detachOnPosition();

          // reset instance options
          s.playState = 0;
          s.paused = false;
          s.instanceCount = 0;
          s.instanceOptions = {};
          s._iO = {};
          stop_html5_timer();

          // reset position, too
          s.position = 0;

        }

        if (!s.instanceCount || s._iO.multiShotEvents) {
          // fire onfinish for last, or every instance
          if (io_onfinish) {
            sm2._wD(s.id + ': onfinish()');
            io_onfinish.apply(s);
          }
        }

      }

    };

    this._whileloading = function(nBytesLoaded, nBytesTotal, nDuration, nBufferLength) {

      var instanceOptions = s._iO;

      s.bytesLoaded = nBytesLoaded;
      s.bytesTotal = nBytesTotal;
      s.duration = Math.floor(nDuration);
      s.bufferLength = nBufferLength;
      s.durationEstimate = s.duration;

      // allow whileloading to fire even if "load" fired under HTML5, due to HTTP range/partials
      if (instanceOptions.whileloading) {
        instanceOptions.whileloading.apply(s);
      }

    };

    this._whileplaying = function(nPosition) {

      var instanceOptions = s._iO;

      // Safari HTML5 play() may return small -ve values when starting from position: 0, eg. -50.120396875. Unexpected/invalid per W3, I think. Normalize to 0.
      s.position = Math.max(0, nPosition);

      s._processOnPosition();

      if (s.playState === 1) {

        if (instanceOptions.whileplaying) {
          // flash may call after actual finish
          instanceOptions.whileplaying.apply(s);
        }

      }

      return true;

    };

    // <d>
    this._debug();
    // </d>

  }; // SMSound()

  /**
   * Private SoundManager internals
   * ------------------------------
   */

  mixin = function(oMain, oAdd) {

    // non-destructive merge
    var o1 = (oMain || {}), o2, o;

    // if unspecified, o2 is the default options object
    o2 = (oAdd === _undefined ? sm2.defaultOptions : oAdd);

    for (o in o2) {

      if (o2.hasOwnProperty(o) && o1[o] === _undefined) {

        if (typeof o2[o] !== 'object' || o2[o] === null) {

          // assign directly
          o1[o] = o2[o];

        } else {

          // recurse through o2
          o1[o] = mixin(o1[o], o2[o]);

        }

      }

    }

    return o1;

  };

  // additional soundManager properties that soundManager.setup() will accept

  extraOptions = {
    onready: 1,
    ontimeout: 1,
    defaultOptions: 1
  };

  assign = function(o, oParent) {

    /**
     * recursive assignment of properties, soundManager.setup() helper
     * allows property assignment based on whitelist
     */

    var i,
        result = true,
        hasParent = (oParent !== _undefined),
        setupOptions = sm2.setupOptions,
        bonusOptions = extraOptions;

    // <d>

    // if soundManager.setup() called, show accepted parameters.

    if (o === _undefined) {

      result = [];

      for (i in setupOptions) {

        if (setupOptions.hasOwnProperty(i)) {
          result.push(i);
        }

      }

      for (i in bonusOptions) {

        if (bonusOptions.hasOwnProperty(i)) {

          if (typeof sm2[i] === 'object') {
            result.push(i + ': {...}');
          } else if (sm2[i] instanceof Function) {
            result.push(i + ': function() {...}');
          } else {
            result.push(i);
          }

        }

      }

      sm2._wD(str('setup', result.join(', ')));

      return false;

    }

    // </d>

    for (i in o) {

      if (o.hasOwnProperty(i)) {

        // if not an {object} we want to recurse through...

        if (typeof o[i] !== 'object' || o[i] === null || o[i] instanceof Array || o[i] instanceof RegExp) {

          // check "allowed" options

          if (hasParent && bonusOptions[oParent] !== _undefined) {

            // valid recursive / nested object option, eg., { defaultOptions: { volume: 50 } }
            sm2[oParent][i] = o[i];

          } else if (setupOptions[i] !== _undefined) {

            // special case: assign to setupOptions object, which soundManager property references
            sm2.setupOptions[i] = o[i];

            // assign directly to soundManager, too
            sm2[i] = o[i];

          } else if (bonusOptions[i] === _undefined) {

            // invalid or disallowed parameter. complain.
            complain(str((sm2[i] === _undefined ? 'setupUndef' : 'setupError'), i), 2);

            result = false;

          } else if (sm2[i] instanceof Function) {

            /**
             * valid extraOptions (bonusOptions) parameter.
             * is it a method, like onready/ontimeout? call it.
             * multiple parameters should be in an array, eg. soundManager.setup({onready: [myHandler, myScope]});
             */
            sm2[i].apply(sm2, (o[i] instanceof Array ? o[i] : [o[i]]));

          } else {

            // good old-fashioned direct assignment
            sm2[i] = o[i];

          }

        } else if (bonusOptions[i] === _undefined) {

          // recursion case, eg., { defaultOptions: { ... } }

          // invalid or disallowed parameter. complain.
          complain(str((sm2[i] === _undefined ? 'setupUndef' : 'setupError'), i), 2);

          result = false;

        } else {

          // recurse through object
          return assign(o[i], i);

        }

      }

    }

    return result;

  };

  /**
   * Internal DOM2-level event helpers
   * ---------------------------------
   */

  event = (function() {

    // normalize event methods
    var old = (window.attachEvent),
    evt = {
      add: (old ? 'attachEvent' : 'addEventListener'),
      remove: (old ? 'detachEvent' : 'removeEventListener')
    };

    // normalize "on" event prefix, optional capture argument
    function getArgs(oArgs) {

      var args = slice.call(oArgs),
          len = args.length;

      if (old) {
        // prefix
        args[1] = 'on' + args[1];
        if (len > 3) {
          // no capture
          args.pop();
        }
      } else if (len === 3) {
        args.push(false);
      }

      return args;

    }

    function apply(args, sType) {

      // normalize and call the event method, with the proper arguments
      var element = args.shift(),
          method = [evt[sType]];

      if (old) {
        // old IE can't do apply().
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
      add: add,
      remove: remove
    };

  }());

  /**
   * Internal HTML5 event handling
   * -----------------------------
   */

  function html5_event(oFn) {

    // wrap html5 event handlers so we don't call them on destroyed and/or unloaded sounds

    return function(e) {

      var s = this._s,
          result;

      if (!s || !s._a) {
        // <d>
        if (s && s.id) {
          sm2._wD(s.id + ': Ignoring ' + e.type);
        } else {
          sm2._wD(h5 + 'Ignoring ' + e.type);
        }
        // </d>
        result = null;
      } else {
        result = oFn.call(this, e);
      }

      return result;

    };

  }

  html5_events = {

    // HTML5 event-name-to-handler map

    abort: html5_event(function() {

      if (!this._s) return;
      sm2._wD(this._s.id + ': abort');

    }),

    // enough has loaded to play

    canplay: html5_event(function() {

      var s = this._s,
          position1K;

      if (!s) return;

      if (s._html5_canplay) {
        // this event has already fired. ignore.
        return;
      }

      s._html5_canplay = true;
      sm2._wD(s.id + ': canplay');
      s._onbufferchange(0);

      // position according to instance options
      position1K = (s._iO.position !== _undefined && !isNaN(s._iO.position) ? s._iO.position / msecScale : null);

      // set the position if position was provided before the sound loaded
      if (this.currentTime !== position1K) {
        sm2._wD(s.id + ': canplay: Setting position to ' + position1K);
        try {
          this.currentTime = position1K;
        } catch(ee) {
          sm2._wD(s.id + ': canplay: Setting position of ' + position1K + ' failed: ' + ee.message, 2);
        }
      }

      // hack for HTML5 from/to case
      if (s._iO._oncanplay) {
        s._iO._oncanplay();
      }

    }),

    canplaythrough: html5_event(function() {

      var s = this._s;

      if (!s) return;
      if (!s.loaded) {
        s._onbufferchange(0);
        s._whileloading(s.bytesLoaded, s.bytesTotal, s._get_html5_duration());
        s._onload(true);
      }

    }),

    durationchange: html5_event(function() {

      // durationchange may fire at various times, probably the safest way to capture accurate/final duration.

      var s = this._s,
          duration;

      if (!s) return;

      duration = s._get_html5_duration();

      if (!isNaN(duration) && duration !== s.duration) {

        sm2._wD(this._s.id + ': durationchange (' + duration + ')' + (s.duration ? ', previously ' + s.duration : ''));

        s.durationEstimate = s.duration = duration;

      }

    }),

    ended: html5_event(function() {

      var s = this._s;

      if (!s) return;
      sm2._wD(s.id + ': ended');

      s._onfinish();

    }),

    error: html5_event(function() {

      if (!this._s) return;
      var description = (html5ErrorCodes[this.error.code] || null);
      sm2._wD(this._s.id + ': HTML5 error, code ' + this.error.code + (description ? ' (' + description + ')' : ''));
      this._s._onload(false);
      this._s._onerror(this.error.code, description);

    }),

    loadeddata: html5_event(function() {

      var s = this._s;

      if (!s) return;

      sm2._wD(s.id + ': loadeddata');

      // safari seems to nicely report progress events, eventually totalling 100%
      if (!s._loaded && !isSafari) {
        s.duration = s._get_html5_duration();
      }

    }),

    loadedmetadata: html5_event(function() {

      if (!this._s) return;
      sm2._wD(this._s.id + ': loadedmetadata');

    }),

    loadstart: html5_event(function() {

      if (!this._s) return;
      sm2._wD(this._s.id + ': loadstart');
      // assume buffering at first
      this._s._onbufferchange(1);

    }),

    play: html5_event(function() {

      if (!this._s) return;
      // once play starts, no buffering
      this._s._onbufferchange(0);

    }),

    playing: html5_event(function() {

      if (!this._s) return;
      sm2._wD(this._s.id + ': playing ' + String.fromCharCode(9835));
      // once play starts, no buffering
      this._s._onbufferchange(0);

    }),

    progress: html5_event(function(e) {

      // note: can fire repeatedly after "loaded" event, due to use of HTTP range/partials

      if (!this._s) return;

      var s = this._s,
          i, j, progStr, buffered = 0,
          isProgress = (e.type === 'progress'),
          ranges = e.target.buffered,
          // firefox 3.6 implements e.loaded/total (bytes)
          loaded = (e.loaded || 0),
          total = (e.total || 1);

      // reset the "buffered" (loaded byte ranges) array
      s.buffered = [];

      if (ranges && ranges.length) {

        // if loaded is 0, try TimeRanges implementation as % of load
        // https://developer.mozilla.org/en/DOM/TimeRanges

        // re-build "buffered" array
        // HTML5 returns seconds. SM2 API uses msec for setPosition() etc.
        for (i = 0, j = ranges.length; i < j; i++) {
          s.buffered.push({
            start: ranges.start(i) * msecScale,
            end: ranges.end(i) * msecScale
          });
        }

        // use the last value locally
        buffered = (ranges.end(0) - ranges.start(0)) * msecScale;

        // linear case, buffer sum; does not account for seeking and HTTP partials / byte ranges
        loaded = Math.min(1, buffered / (e.target.duration * msecScale));

        // <d>
        if (isProgress && ranges.length > 1) {
          progStr = [];
          j = ranges.length;
          for (i = 0; i < j; i++) {
            progStr.push((e.target.buffered.start(i) * msecScale) + '-' + (e.target.buffered.end(i) * msecScale));
          }
          sm2._wD(this._s.id + ': progress, timeRanges: ' + progStr.join(', '));
        }

        if (isProgress && !isNaN(loaded)) {
          sm2._wD(this._s.id + ': progress, ' + Math.floor(loaded * 100) + '% loaded');
        }
        // </d>

      }

      if (!isNaN(loaded)) {

        // TODO: prevent calls with duplicate values.
        s._whileloading(loaded, total, s._get_html5_duration());
        if (loaded && total && loaded === total) {
          // in case "onload" doesn't fire (eg. gecko 1.9.2)
          html5_events.canplaythrough.call(this, e);
        }

      }

    }),

    ratechange: html5_event(function() {

      if (!this._s) return;
      sm2._wD(this._s.id + ': ratechange');

    }),

    suspend: html5_event(function(e) {

      // download paused/stopped, may have finished (eg. onload)
      var s = this._s;

      if (!s) return;

      sm2._wD(this._s.id + ': suspend');
      html5_events.progress.call(this, e);
      s._onsuspend();

    }),

    stalled: html5_event(function() {

      if (!this._s) return;
      sm2._wD(this._s.id + ': stalled');

    }),

    timeupdate: html5_event(function() {

      if (!this._s) return;
      this._s._onTimer();

    }),

    waiting: html5_event(function() {

      var s = this._s;

      if (!s) return;

      // see also: seeking
      sm2._wD(this._s.id + ': waiting');

      // playback faster than download rate, etc.
      s._onbufferchange(1);

    })

  };

  html5OK = function(iO) {

    // playability test based on URL or MIME type

    var result;

    if (!iO || (!iO.type && !iO.url)) {

      // nothing to check
      result = false;

    } else {

      // Use type, if specified. Pass data: URIs to HTML5. If HTML5-only mode, no other options, so just give 'er
      result = ((iO.type ? html5CanPlay({ type: iO.type }) : html5CanPlay({ url: iO.url }) || iO.url.match(/data:/i)));

    }

    return result;

  };

  html5Unload = function(oAudio) {

    /**
     * Internal method: Unload media, and cancel any current/pending network requests.
     * Firefox can load an empty URL, which allegedly destroys the decoder and stops the download.
     * https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox#Stopping_the_download_of_media
     * However, Firefox has been seen loading a relative URL from '' and thus requesting the hosting page on unload.
     * Other UA behaviour is unclear, so everyone else gets an about:blank-style URL.
     */

    var url;

    if (oAudio) {

      // Firefox and Chrome accept short WAVe data: URIs. Chome dislikes audio/wav, but accepts audio/wav for data: MIME.
      // Desktop Safari complains / fails on data: URI, so it gets about:blank.
      url = (isSafari ? emptyURL : (sm2.html5.canPlayType('audio/wav') ? emptyWAV : emptyURL));

      oAudio.src = url;

      // reset some state, too
      if (oAudio._called_unload !== _undefined) {
        oAudio._called_load = false;
      }

    }

    if (useGlobalHTML5Audio) {

      // ensure URL state is trashed, also
      lastGlobalHTML5URL = null;

    }

    return url;

  };

  html5CanPlay = function(o) {

    /**
     * Try to find MIME, test and return truthiness
     * o = {
     *  url: '/path/to/an.mp3',
     *  type: 'audio/mp3'
     * }
     */

    if (!sm2.hasHTML5) return false;

    var url = (o.url || null),
        mime = (o.type || null),
        aF = sm2.audioFormats,
        result,
        offset,
        fileExt,
        item;

    // account for known cases like audio/mp3

    if (mime && sm2.html5[mime] !== _undefined) return (sm2.html5[mime]);

    if (!html5Ext) {

      html5Ext = [];

      for (item in aF) {

        if (aF.hasOwnProperty(item)) {

          html5Ext.push(item);

          if (aF[item].related) {
            html5Ext = html5Ext.concat(aF[item].related);
          }

        }

      }

      html5Ext = new RegExp('\\.(' + html5Ext.join('|') + ')(\\?.*)?$', 'i');

    }

    // TODO: Strip URL queries, etc.
    fileExt = (url ? url.toLowerCase().match(html5Ext) : null);

    if (!fileExt || !fileExt.length) {

      if (!mime) {

        result = false;

      } else {

        // audio/mp3 -> mp3, result should be known
        offset = mime.indexOf(';');

        // strip "audio/X; codecs..."
        fileExt = (offset !== -1 ? mime.substr(0, offset) : mime).substr(6);

      }

    } else {

      // match the raw extension name - "mp3", for example
      fileExt = fileExt[1];

    }

    if (fileExt && sm2.html5[fileExt] !== _undefined) {

      // result known
      result = (sm2.html5[fileExt]);

    } else {

      mime = 'audio/' + fileExt;
      result = sm2.html5.canPlayType({ type: mime });

      sm2.html5[fileExt] = result;

      // sm2._wD('canPlayType, found result: ' + result);
      result = (result && sm2.html5[mime]);
    }

    return result;

  };

  testHTML5 = function() {

    /**
     * Internal: Iterates over audioFormats, determining support eg. audio/mp3, audio/mpeg and so on
     * assigns results to html5[] and flash[].
     */

    // double-whammy: Opera 9.64 throws WRONG_ARGUMENTS_ERR if no parameter passed to Audio(), and Webkit + iOS happily tries to load "null" as a URL. :/
    var a = (Audio !== _undefined ? (isOpera && opera.version() < 10 ? new Audio(null) : new Audio()) : null),
        item, lookup, support = {}, aF, i;

    function cp(m) {

      var canPlay, j,
          result = false,
          isOK = false;

      if (!a || typeof a.canPlayType !== 'function') return result;

      if (m instanceof Array) {

        // iterate through all mime types, return any successes

        for (i = 0, j = m.length; i < j; i++) {

          if (sm2.html5[m[i]] || a.canPlayType(m[i]).match(sm2.html5Test)) {

            isOK = true;
            sm2.html5[m[i]] = true;

          }

        }

        result = isOK;

      } else {

        canPlay = (a && typeof a.canPlayType === 'function' ? a.canPlayType(m) : false);
        result = !!(canPlay && (canPlay.match(sm2.html5Test)));

      }

      return result;

    }

    // test all registered formats + codecs

    aF = sm2.audioFormats;

    for (item in aF) {

      if (aF.hasOwnProperty(item)) {

        lookup = 'audio/' + item;

        support[item] = cp(aF[item].type);

        // write back generic type too, eg. audio/mp3
        support[lookup] = support[item];

        // assign result to related formats, too

        if (aF[item] && aF[item].related) {

          for (i = aF[item].related.length - 1; i >= 0; i--) {

            // eg. audio/m4a
            support['audio/' + aF[item].related[i]] = support[item];
            sm2.html5[aF[item].related[i]] = support[item];

          }

        }

      }

    }

    support.canPlayType = (a ? cp : null);
    sm2.html5 = mixin(sm2.html5, support);

    return true;

  };

  strings = {

    // <d>
    notReady: 'Unavailable - wait until onready() has fired.',
    notOK: 'Audio support is not available.',
    needFunction: smc + 'Function object expected for %s',
    badID: 'Sound ID "%s" should be a string, starting with a non-numeric character',
    currentObj: smc + '_debug(): Current sound objects',
    waitOnload: smc + 'Waiting for window.onload()',
    docLoaded: smc + 'Document already loaded',
    onload: smc + 'initComplete(): calling soundManager.onload()',
    onloadOK: sm + '.onload() complete',
    didInit: smc + 'init(): Already called?',
    shutdown: sm + '.disable(): Shutting down',
    queue: smc + 'Queueing %s handler',
    manURL: 'SMSound.load(): Using manually-assigned URL',
    onURL: sm + '.load(): current URL already assigned.',
    gotFocus: smc + 'Got window focus.',
    setup: sm + '.setup(): allowed parameters: %s',
    setupError: sm + '.setup(): "%s" cannot be assigned with this method.',
    setupUndef: sm + '.setup(): Could not find option "%s"',
    setupLate: sm + '.setup(): html5Test property changes will not take effect until reboot().',
    sm2Loaded: 'SoundManager 2: Ready. ' + String.fromCharCode(10003),
    reset: sm + '.reset(): Removing event callbacks',
    mobileUA: 'Mobile UA detected, preferring HTML5 by default.',
    globalHTML5: 'Using singleton HTML5 Audio() pattern for this device.',
    ignoreMobile: 'Ignoring mobile restrictions for this device.'
    // </d>

  };

  str = function() {

    // internal string replace helper.
    // arguments: o [,items to replace]
    // <d>

    var args,
        i, j, o,
        sstr;

    // real array, please
    args = slice.call(arguments);

    // first argument
    o = args.shift();

    sstr = (strings && strings[o] ? strings[o] : '');

    if (sstr && args && args.length) {
      for (i = 0, j = args.length; i < j; i++) {
        sstr = sstr.replace('%s', args[i]);
      }
    }

    return sstr;
    // </d>

  };

  complain = function(sMsg) {

    // <d>
    if (hasConsole && console.warn !== _undefined) {
      console.warn(sMsg);
    } else {
      sm2._wD(sMsg);
    }
    // </d>

  };

  doNothing = function() {

    return false;

  };

  disableObject = function(o) {

    var oProp;

    for (oProp in o) {
      if (o.hasOwnProperty(oProp) && typeof o[oProp] === 'function') {
        o[oProp] = doNothing;
      }
    }

    oProp = null;

  };

  setVersionInfo = function() {

    // short-hand for internal use
    sm2.version = sm2.versionNumber + ' (HTML5-only mode)';

  };

  idCheck = this.getSoundById;

  // <d>
  _wDS = function(o, errorLevel) {

    return (!o ? '' : sm2._wD(str(o), errorLevel));

  };

  debugTS = function(sEventType, bSuccess, sMessage) {

    // troubleshooter debug hooks

    if (window.sm2Debugger !== _undefined) {
      try {
        sm2Debugger.handleEvent(sEventType, bSuccess, sMessage);
      } catch(e) {
        // oh well
        return false;
      }
    }

    return true;

  };
  // </d>

  addOnEvent = function(sType, oMethod, oScope) {

    if (on_queue[sType] === _undefined) {
      on_queue[sType] = [];
    }

    on_queue[sType].push({
      method: oMethod,
      scope: (oScope || null),
      fired: false
    });

  };

  processOnEvents = function(oOptions) {

    // if unspecified, assume OK/error

    if (!oOptions) {
      oOptions = {
        type: (sm2.ok() ? 'onready' : 'ontimeout')
      };
    }

    // not ready yet.
    if (!didInit && oOptions && !oOptions.ignoreInit) return false;

    // invalid case
    if (oOptions.type === 'ontimeout' && (sm2.ok() || (disabled && !oOptions.ignoreInit))) return false;

    var status = {
          success: (oOptions && oOptions.ignoreInit ? sm2.ok() : !disabled)
        },

        // queue specified by type, or none
        srcQueue = (oOptions && oOptions.type ? on_queue[oOptions.type] || [] : []),

        queue = [], i, j,
        args = [status],
        canRetry = !sm2.ok();

    if (oOptions.error) {
      args[0].error = oOptions.error;
    }

    for (i = 0, j = srcQueue.length; i < j; i++) {
      if (srcQueue[i].fired !== true) {
        queue.push(srcQueue[i]);
      }
    }

    if (queue.length) {

      // sm2._wD(sm + ': Firing ' + queue.length + ' ' + oOptions.type + '() item' + (queue.length === 1 ? '' : 's'));
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

  initUserOnload = function() {

    window.setTimeout(function() {

      processOnEvents();

      // call user-defined "onload", scoped to window

      if (typeof sm2.onload === 'function') {
        _wDS('onload', 1);
        sm2.onload.apply(window);
        _wDS('onloadOK', 1);
      }

      if (sm2.waitForWindowLoad) {
        event.add(window, 'load', initUserOnload);
      }

    }, 1);

  };

  parseURL = function(url) {

    /**
     * Internal: Finds and returns the first playable URL (or failing that, the first URL.)
     * @param {string or array} url A single URL string, OR, an array of URL strings or {url:'/path/to/resource', type:'audio/mp3'} objects.
     */

    var i, j, urlResult = 0, result;

    if (url instanceof Array) {

      // find the first good one
      for (i = 0, j = url.length; i < j; i++) {

        if (url[i] instanceof Object) {

          // MIME check
          if (sm2.canPlayMIME(url[i].type)) {
            urlResult = i;
            break;
          }

        } else if (sm2.canPlayURL(url[i])) {

          // URL string check
          urlResult = i;
          break;

        }

      }

      // normalize to string
      if (url[urlResult].url) {
        url[urlResult] = url[urlResult].url;
      }

      result = url[urlResult];

    } else {

      // single URL case
      result = url;

    }

    return result;

  };


  startTimer = function(oSound) {

    /**
     * attach a timer to this sound, and start an interval if needed
     */

    if (!oSound._hasTimer) {

      oSound._hasTimer = true;

      if (!mobileHTML5 && sm2.html5PollingInterval) {

        if (h5IntervalTimer === null && h5TimerCount === 0) {

          h5IntervalTimer = setInterval(timerExecute, sm2.html5PollingInterval);

        }

        h5TimerCount++;

      }

    }

  };

  stopTimer = function(oSound) {

    /**
     * detach a timer
     */

    if (oSound._hasTimer) {

      oSound._hasTimer = false;

      if (!mobileHTML5 && sm2.html5PollingInterval) {

        // interval will stop itself at next execution.

        h5TimerCount--;

      }

    }

  };

  timerExecute = function() {

    /**
     * manual polling for HTML5 progress events, ie., whileplaying()
     * (can achieve greater precision than conservative default HTML5 interval)
     */

    var i;

    if (h5IntervalTimer !== null && !h5TimerCount) {

      // no active timers, stop polling interval.

      clearInterval(h5IntervalTimer);

      h5IntervalTimer = null;

      return;

    }

    // check all HTML5 sounds with timers

    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {

      if (sm2.sounds[sm2.soundIDs[i]].isHTML5 && sm2.sounds[sm2.soundIDs[i]]._hasTimer) {
        sm2.sounds[sm2.soundIDs[i]]._onTimer();
      }

    }

  };

  catchError = function(options) {

    options = (options !== _undefined ? options : {});

    if (typeof sm2.onerror === 'function') {
      sm2.onerror.apply(window, [{
        type: (options.type !== _undefined ? options.type : null)
      }]);
    }

    if (options.fatal !== _undefined && options.fatal) {
      sm2.disable();
    }

  };

  /**
   * Private initialization helpers
   * ------------------------------
   */

  initComplete = function() {

    if (didInit) return false;

    // all good.
    _wDS('sm2Loaded', 1);
    didInit = true;
    initUserOnload();
    debugTS('onload', true);
    return true;

  };

  /**
   * apply top-level setupOptions object as local properties, eg., this.setupOptions.debugMode -> this.debugMode (soundManager.debugMode)
   * this maintains backward compatibility, and allows properties to be defined separately for use by soundManager.setup().
   */

  setProperties = function() {

    var i,
        o = sm2.setupOptions;

    for (i in o) {

      if (o.hasOwnProperty(i)) {

        // assign local property if not already defined

        if (sm2[i] === _undefined) {

          sm2[i] = o[i];

        } else if (sm2[i] !== o[i]) {

          // legacy support: write manually-assigned property (eg., soundManager.url) back to setupOptions to keep things in sync
          sm2.setupOptions[i] = sm2[i];

        }

      }

    }

  };


  init = function() {

    // called after onload()

    if (didInit) {
      _wDS('didInit');
      return false;
    }

    // <d>

    var item, tests = [];

    if (!sm2.hasHTML5) return false;

    for (item in sm2.audioFormats) {
      if (sm2.audioFormats.hasOwnProperty(item)) {
        tests.push(item + ' = ' + sm2.html5[item] + ((!sm2.html5[item] ? ' (' + (sm2.audioFormats[item].required ? 'required, ' : '') : '')));
      }
    }

    sm2._wD('SoundManager 2 HTML5 support: ' + tests.join(', '), 1);

    // </d>

    if (!didInit) {
      // we don't need no steenking flash!
      event.remove(window, 'load', sm2.beginDelayedInit);
      sm2.enabled = true;
      initComplete();
    }

    return true;

  };

  domContentLoaded = function() {

    if (didDCLoaded) return;

    didDCLoaded = true;

    // allow force of debug mode via URL
    // <d>
    if (sm2.debugURLParam.test(wl)) {
      sm2.setupOptions.debugMode = sm2.debugMode = true;
    }
    // </d>

    // assign top-level soundManager properties eg. soundManager.url
    setProperties();

    testHTML5();

    if (doc.removeEventListener) {
      doc.removeEventListener('DOMContentLoaded', domContentLoaded, false);
    }

    // 100% HTML5 mode
    setVersionInfo();
    init();

  };

  domContentLoadedIE = function() {

    if (doc.readyState === 'complete') {
      domContentLoaded();
      doc.detachEvent('onreadystatechange', domContentLoadedIE);
    }

    return true;

  };

  winOnLoad = function() {

    // catch case where DOMContentLoaded has been sent, but we're still in doc.readyState = 'interactive'
    domContentLoaded();

    event.remove(window, 'load', winOnLoad);

  };

  event.add(window, 'load', winOnLoad);

  if (doc.addEventListener) {

    doc.addEventListener('DOMContentLoaded', domContentLoaded, false);

  } else if (doc.attachEvent) {

    doc.attachEvent('onreadystatechange', domContentLoadedIE);

  } else {

    // no add/attachevent support; perhaps a browser from the stone age (IE 5, Netscape 4.7 etc.)
    debugTS('onload', false);
    catchError({
      type: 'NO_DOM2_EVENTS',
      fatal: true
    });

  }

} // SoundManager()

soundManager = new SoundManager();

/**
 * SoundManager public interfaces
 * ------------------------------
 */

if (typeof module === 'object' && module && typeof module.exports === 'object') {

  /**
   * commonJS module
   */

  module.exports.SoundManager = SoundManager;
  module.exports.soundManager = soundManager;

} else if (typeof define === 'function' && define.amd) {

  /**
   * AMD - requireJS
   * basic usage:
   * require(["/path/to/soundmanager2.js"], function(SoundManager) {
   *   SoundManager.getInstance().setup({
   *     onready: function() { ... }
   *   })
   * });
   */

  define(function() {
    /**
     * Retrieve the global instance of SoundManager.
     * If a global instance does not exist it can be created using a callback.
     *
     * @param {Function} smBuilder Optional: Callback used to create a new SoundManager instance
     * @return {SoundManager} The global SoundManager instance
     */
    function getInstance(smBuilder) {
      if (!window.soundManager && smBuilder instanceof Function) {
        var instance = smBuilder(SoundManager);
        if (instance instanceof SoundManager) {
          window.soundManager = instance;
        }
      }
      return window.soundManager;
    }
    return {
      constructor: SoundManager,
      getInstance: getInstance
    };
  });

}

// standard browser case

// constructor
window.SoundManager = SoundManager;

// public API
window.soundManager = soundManager;

}(window));

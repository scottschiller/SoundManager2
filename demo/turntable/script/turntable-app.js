/*jslint vars: true, plusplus: true, white: true, nomen: true */
/*global soundManager, console, document, navigator, turntables, turntablesById, window */

(function(window) {

  /** @license
   * SoundManager 2: "Turntable UI": Demo application
   * Copyright (c) 2015, Scott Schiller. All rights reserved.
   * http://www.schillmania.com/projects/soundmanager2/
   * Code provided under BSD license.
   * http://schillmania.com/projects/soundmanager2/license.txt
   */

  "use strict";

  var turntables;
  var events;
  var utils;
  var sounds;
  var config;
  var state;
  var isMonophonic;
  var localMethods;
  var playSound;

  // Default behaviours.
  config = {

    // if specified, CSS className required for links to be played
    requireCSS: null,

    // CSS className that will prevent links from being played
    excludeCSS: 'turntable-exclude',

    // when a sound finishes, find and play the next one?
    playNext: true,

    // show a record right away? (otherwise, "techniques" slipmat.)
    hasRecordAtStart: false,
  
    // play some background noise when end of record is hit.
    useEndOfRecordNoise: true,

    // samples from a real turntable. add more to taste.
    endOfRecordNoise: [
      'audio/record-noise-1.mp3',
      'audio/record-noise-2.mp3'
    ],

    // for assigning a target (turntable) to play. e.g., <a href="some.mp3" data-turntable="tt-1">some.mp3</a>
    htmlAttribute: 'data-turntable',

    // turntable innards. modify at own risk.
    turntable: {
      tonearm: {
        angleToRecord: 16,   // tonearm angle to outer edge of record
        recordAngleSpan: 26  // outer edge -> inner edge of record
      }
    },

    /**
     * recommendation: don't edit these, use methods on window.turntables[] instead.
     * to control sounds, call methods on turntables[0] etc. which will affect sounds in turn.
     */
    soundOptions: {
      multiShot: false,
      onload: function(ok) {
        if (!ok && !this.duration) {
          // treat as a failure.
          events.sound.error.apply(this, arguments);
        }
      },
      whileplaying: function() {
        events.sound.whileplaying.apply(this, arguments);
      },
      onfinish: function() {
        events.sound.finish.apply(this, arguments);
      }
    }
  
  };

  sounds = {
    endOfRecordNoise: []
  };

  state = {
    endOfRecordNoise: null,
    soundFinished: false,
    lastLink: null
  };

  // devices that likely block auto-play and only allow one sound to be played at a time
  isMonophonic = navigator.userAgent.match(/iphone|ipad|android|tablet|mobile/i);

  function findTheDamnLink(o) {

    // click events may have a nested target element instead of the link. Find the parent <a>.

    // link was clicked.
    if (o && o.nodeName === 'A') {
      return o;
    }

    // nested case.
    if (o && o.parentNode) {
      do {
        o = o.parentNode;
      } while (o && o.nodeName !== 'A' && o.parentNode);
    }

    return o;

  }

  function canPlayLink(a) {

    // can SM2 play the <a>, and does it specifically include or exclude via CSS?
    return (
      a && soundManager.canPlayLink(a)
        && (!config.requireCSS || utils.css.has(a, config.requireCSS))
        && (!config.excludeCSS || !utils.css.has(a, config.excludeCSS))
    );

  }

  function findNextLink(o) {

    // find current link in page, play next in DOM (or first, if no match.)

    var foundCurrent, i, j, links, playableLinks, result, target;

    // check for data- turntable target attribute.
    target = o.getAttribute(config.htmlAttribute);

    links = document.getElementsByTagName('a');

    playableLinks = [];

    for (i=0, j=links.length; i<j; i++) {

      if (canPlayLink(links[i])) {

        // no data- target attribute, OR same target
        if (!target || links[i].getAttribute(config.htmlAttribute) === target) {

          playableLinks.push(links[i]);

          // if last-active link found, take this one and exit.
          if (foundCurrent) {
            result = links[i];
            break;
          }

          // is this the current link?
          if (o === links[i]) {
            foundCurrent = true;
          }

        }

      }

    }

    // no match in DOM, perhaps rewritten via AJAX while playing etc.? Take the first.
    if (!foundCurrent) {
      result = playableLinks[0];
    }

    // if result is current, return null to avoid double-playing.
    if (result === o) {
      result = null;
    }

    return result;

  }

  events = {

    mouse: {

      click: function(e) {
        
        // look for and play links to sounds.

        var target,
            ttID,
            turntable;

        target = findTheDamnLink(e.target);

        if (canPlayLink(target)) {

          // should this play on a particular turntable? (by HTML ID)
          ttID = target.getAttribute('data-turntable');

          // get the proper turntable.
          turntable = turntablesById[ttID] || turntables[0];

          // track this link for later.
          state.lastLink = target;

          playSound(turntable, target.href);

          // artwork URL?
          turntable.methods.setArtwork(target.getAttribute('data-artwork') || '');

          return utils.events.preventDefault(e);

        }

      }

    },
    
    sound: {
  
      whileplaying: function() {

        var progress = (this.position / this.durationEstimate);

        if (progress >= 0 && this._turntable) {
          // base "tonearm over record" angle, plus additional angle to move across the record.
          this._turntable.methods.setTonearmAngle(config.turntable.tonearm.angleToRecord + (config.turntable.tonearm.recordAngleSpan * progress));
        }

      },
  
      error: function() {

        // something failed. 404, decode error, network loss etc.
        // handle as though a sound finished.
        if (window.console && console.warn) {
          console.warn('Turntable failed to load ' + this.url);
        }
        events.sound.finish.apply(this);

      },

      finish: function() {

        var nextLink;

        state.finished = true;

        if (config.playNext) {
          
          nextLink = findNextLink(state.lastLink);

          // click handler again
          if (nextLink) {
            events.mouse.click({
              target: nextLink
            });
          }

        }

        // nothing else to play?
        if (!nextLink && this._turntable) {

          if (config.useEndOfRecordNoise && sounds.endOfRecordNoise.length) {

            // make sure we're at end of record
            this._turntable.methods.setTonearmAngle(config.turntable.tonearm.angleToRecord + config.turntable.tonearm.recordAngleSpan);
            
            // end of record?
            state.endOfRecordNoise = sounds.endOfRecordNoise[parseInt(Math.random() * sounds.endOfRecordNoise.length, 10)];

            state.endOfRecordNoise.play({
              loops: 999
            });
          
          } else {

            // no more to do?
            this._turntable.methods.stop();

          }

        }

      }
  
    }
  
  };

  playSound = function(turntable, url, load_only) {

    var tt,
        sound;

    // if no turntable specified, take the first one.
    tt = (turntable || turntables[0]);

    if (tt.id) {
      // second param: don't complain to console when sound doesn't exist.
      sound = soundManager.getSoundById(tt.id, true);
    }

    // first play?
    if (!sound) {

      sound = soundManager.createSound({
        id: tt.id,
        url: url
      });

    } else {

      // loading a new URL?
      if (sound.url !== url) {
        sound.stop();
      }

    }

    state.finished = false;

    // associate sound events with the given turntable.
    // TODO: handle one sound object per table.
    sound._turntable = turntable;

    config.soundOptions.url = url;

    // stop any previous record noise
    if (state.endOfRecordNoise) {
      state.endOfRecordNoise.stop();
      state.endOfRecordNoise = null;
    }

    // if motor is already on, and the sound hasn't started yet (i.e., turntable motor was already on), start it now.
    if (tt.data.power.motor && !sound.playState && !load_only) {
      sound.play(config.soundOptions);
    }

    // start the turntable, add a slipmat and record if there isn't one already.
    tt.methods.addSlipmat();
    tt.methods.addRecord();

    if (!load_only) {

      tt.methods.powerOn();
      tt.methods.start();

      events.sound.whileplaying.apply(sound);

    }

  };

  function applyDefaults() {

    var i, j;

    if (!isMonophonic && config.useEndOfRecordNoise && config.endOfRecordNoise.length) {
      for (i=0, j=config.endOfRecordNoise.length; i<j; i++) {
        sounds.endOfRecordNoise.push(soundManager.createSound({
          url: config.endOfRecordNoise[i]
        }));
      }
    }

    if (config.hasRecordAtStart) {
      for (i=0, j=turntables.length; i<j; i++) {
        turntables[i].methods.addRecord();
      }
    }

  }

  function assignEvents() {

    // default turntable behaviours
    // TODO: use utils.mixin?

    var i, j;

    turntables.on.start = function(tt) {
      soundManager.play(tt.id, config.soundOptions);
    };

    turntables.on.stop = function(tt) {
      soundManager.pause(tt.id);
      if (state.endOfRecordNoise) {
        state.endOfRecordNoise.stop();
      }
    };

    // tack on localMethods to turntable object
    // TODO: use proper mixin
    // note use of Function.bind (IE 9, Chrome 7, Firefox 4, Opera 11.60, Safari 5.1.4) to correct scope ('this') within handler.
    if (localMethods.load.bind) {
      for (i=0, j=turntables.length; i<j; i++) {
        turntables[i].methods.load = localMethods.load.bind(turntables[i]);
      }
    }

    // a little hackish: global for now
    turntables.config = config;

  }

  // will be mixed into global turntable API. runs within scope of turntable instance.
  localMethods = {
      // convenience method for scripting, i.e., if you want to load a sound (and optionally, with associated artwork URL), without playing it.
      load: function(soundURL, artworkURL) {
        playSound(this, soundURL, true);
        if (artworkURL) {
          this.methods.setArtwork(artworkURL);
        }
      }
  };

  function init() {

    applyDefaults();

    turntables = window.turntables;

    assignEvents();

    // local references
    utils = turntables.utils;

    // watch clicks, load and play MP3s etc. on the turntable UI.
    utils.events.add(document, 'click', events.mouse.click);

  }

  soundManager.onready(init);

}(window));
/*jslint plusplus: true, white: true, nomen: true */
/* global soundManager, document, console, window */

(function(window) {

  /**
   * SoundManager 2: "Bar UI" player
   * http://www.schillmania.com/projects/soundmanager2/
   */

  "use strict";

  var Player,
      players = [],
      // CSS selector that will get us the top-level DOM node for the player UI.
      playerSelector = '.sm2-bar-ui',
      utils;

  soundManager.setup({
    // trade-off: higher UI responsiveness (play/progress bar), but may use more CPU.
    html5PollingInterval: 50,
    flashVersion: 9
  });

  soundManager.onready(function() {

    var nodes,
      i, j;

    nodes = utils.dom.getAll(playerSelector);

    if (nodes && nodes.length) {
      for (i=0, j=nodes.length; i<j; i++) {
        players.push(new Player(nodes[i]));
      }
    }
  
  });

  utils = {

    array: (function() {

      function compare(property) {

        var result;

        return function(a, b) {

          if (a[property] < b[property]) {
            result = -1;
          } else if (a[property] > b[property]) {
            result = 1;
          } else {
            result = 0;
          }
          return result;
        };

      }

      function shuffle(array) {

        // Fisher-Yates shuffle algo

        var i, j, temp;

        for (i = array.length - 1; i > 0; i--) {
          j = Math.floor(Math.random() * (i+1));
          temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }

        return array;

      }

      return {
        compare: compare,
        shuffle: shuffle
      };

    }()),

    css: (function() {

      function hasClass(o, cStr) {

        return (o.className !== undefined ? new RegExp('(^|\\s)' + cStr + '(\\s|$)').test(o.className) : false);

      }

      function addClass(o, cStr) {

        if (!o || !cStr || hasClass(o, cStr)) {
          return false; // safety net
        }
        o.className = (o.className ? o.className + ' ' : '') + cStr;

      }

      function removeClass(o, cStr) {

        if (!o || !cStr || !hasClass(o, cStr)) {
          return false;
        }
        o.className = o.className.replace(new RegExp('( ' + cStr + ')|(' + cStr + ')', 'g'), '');

      }

      function swapClass(o, cStr1, cStr2) {

        var tmpClass = {
          className: o.className
        };

        removeClass(tmpClass, cStr1);
        addClass(tmpClass, cStr2);

        o.className = tmpClass.className;

      }

      function toggleClass(o, cStr) {

        var found,
            method;

        found = hasClass(o, cStr);

        method = (found ? removeClass : addClass);

        method(o, cStr);

        // indicate the new state...
        return !found;

      }

      return {
        has: hasClass,
        add: addClass,
        remove: removeClass,
        swap: swapClass,
        toggle: toggleClass
      };

    }()),

    dom: (function() {

      function getAll(/* parentNode, selector */) {

        var node,
            selector,
            results;

        if (arguments.length === 1) {

          // .selector case
          node = document.documentElement;
          selector = arguments[0];

        } else {

          // node, .selector
          node = arguments[0];
          selector = arguments[1];

        }

        // sorry, IE 7 users; IE 8+ required.
        if (node && node.querySelectorAll) {

          results = node.querySelectorAll(selector);

        }

        return results;

      }

      function get(/* parentNode, selector */) {

        var results = getAll.apply(this, arguments);

        // hackish: if more than one match and no third argument, return the last.
        if (results && results.length) {
          results = results[results.length-1];
        }

        return results;

      }

      return {
        get: get,
        getAll: getAll
      };

    }()),

    position: (function() {

      function getOffX(o) {

        // http://www.xs4all.nl/~ppk/js/findpos.html
        var curleft = 0;

        if (o.offsetParent) {

          while (o.offsetParent) {

            curleft += o.offsetLeft;

            o = o.offsetParent;

          }

        } else if (o.x) {

            curleft += o.x;

        }

        return curleft;

      }

      function getOffY(o) {

        // http://www.xs4all.nl/~ppk/js/findpos.html
        var curtop = 0;

        if (o.offsetParent) {

          while (o.offsetParent) {

            curtop += o.offsetTop;

            o = o.offsetParent;

          }

        } else if (o.y) {

            curtop += o.y;

        }

        return curtop;

      }

      return {
        getOffX: getOffX,
        getOffY: getOffY
      };

    }()),

    style: (function() {

      function get(node, styleProp) {

        // http://www.quirksmode.org/dom/getstyles.html
        var value;

        if (node.currentStyle) {

          value = node.currentStyle[styleProp];

        } else if (window.getComputedStyle) {

          value = document.defaultView.getComputedStyle(node, null).getPropertyValue(styleProp);

        }

        return value;

      }

      return {
        get: get
      };

    }()),

    events: (function() {

      var add, remove, preventDefault;

      add = function(o, evtName, evtHandler) {
        // return an object with a convenient detach method.
        var eventObject = {
          detach: function() {
            return remove(o, evtName, evtHandler);
          }
        };
        if (window.addEventListener) {
          o.addEventListener(evtName, evtHandler, false);
        } else {
          o.attachEvent('on' + evtName, evtHandler);
        }
        return eventObject;
      };

      remove = (window.removeEventListener !== undefined ? function(o, evtName, evtHandler) {
        return o.removeEventListener(evtName, evtHandler, false);
      } : function(o, evtName, evtHandler) {
        return o.detachEvent('on' + evtName, evtHandler);
      });

      preventDefault = function(e) {
        if (e.preventDefault) {
          e.preventDefault();
        } else {
          e.returnValue = false;
          e.cancelBubble = true;
        }
        return false;
      };

      return {
        add: add,
        preventDefault: preventDefault,
        remove: remove
      };

    }()),

    features: (function() {

    	var getAnimationFrame,
    	    localAnimationFrame,
            localFeatures,
            prop,
            styles,
    	    testDiv,
    	    transform;

        testDiv = document.createElement('div');

	    /**
		 * hat tip: paul irish
		 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
		 * https://gist.github.com/838785
		 */

	    localAnimationFrame = (window.requestAnimationFrame
	      || window.webkitRequestAnimationFrame
	      || window.mozRequestAnimationFrame
	      || window.oRequestAnimationFrame
	      || window.msRequestAnimationFrame
	      || null);

	    // apply to window, avoid "illegal invocation" errors in Chrome
	    getAnimationFrame = localAnimationFrame ? function() {
	      return localAnimationFrame.apply(window, arguments);
	    } : null;

	    function has(prop) {

	      // test for feature support
	      var result = testDiv.style[prop];

	      return (result !== undefined ? prop : null);

	    }

	    // note local scope.
	    localFeatures = {

	      transform: {
	        ie: has('-ms-transform'),
	        moz: has('MozTransform'),
	        opera: has('OTransform'),
	        webkit: has('webkitTransform'),
	        w3: has('transform'),
	        prop: null // the normalized property value
	      },

	      rotate: {
	        has3D: false,
	        prop: null
	      },

	      getAnimationFrame: getAnimationFrame

	    };

	    localFeatures.transform.prop = (
	      localFeatures.transform.w3 ||
	      localFeatures.transform.moz ||
	      localFeatures.transform.webkit ||
	      localFeatures.transform.ie ||
	      localFeatures.transform.opera
	    );

	    function attempt(style) {

	      try {
	        testDiv.style[transform] = style;
	      } catch(e) {
	        // that *definitely* didn't work.
	        return false;
	      }
	      // if we can read back the style, it should be cool.
	      return !!testDiv.style[transform];

	    }

	    if (localFeatures.transform.prop) {

	      // try to derive the rotate/3D support.
	      transform = localFeatures.transform.prop;
	      styles = {
	        css_2d: 'rotate(0deg)',
	        css_3d: 'rotate3d(0,0,0,0deg)'
	      };

	      if (attempt(styles.css_3d)) {
	        localFeatures.rotate.has3D = true;
	        prop = 'rotate3d';
	      } else if (attempt(styles.css_2d)) {
	        prop = 'rotate';
	      }

	      localFeatures.rotate.prop = prop;

	    }

	    testDiv = null;

	    return localFeatures;

    }())

  };

  /**
   * player bits
   */

  Player = function(playerNode) {

      var css, dom, extras, playlistController, soundObject, actions, actionData, defaultItem;

	  css = {
	    disabled: 'disabled',
	    selected: 'selected',
	    active: 'active',
	    legacy: 'legacy',
	    noVolume: 'no-volume'
	  };

	  dom = {
	    o: null,
	    playlist: null,
        playlistTarget: null,
        playlistContainer: null,
	    time: null,
	    player: null,
	    progress: null,
	    progressTrack: null,
	    progressBar: null,
	    duration: null,
	    volume: null
	  };

      // prepended to tracks when a sound fails to load/play
      extras = {
      	loadFailedCharacter: '<span title="Failed to load/play." class="load-error">✖</span>'
      };

	  function PlaylistController() {

	    var data;

	    data = {

	      // list of nodes?
	      playlist: [],

	      // shuffledIndex: [],

	      // selection
	      selectedIndex: 0,

	      // shuffleMode: false,

	      loopMode: false,

          timer: null

	    };

	    function getPlaylist() {

	      return data.playlist;

	    }

	    function getItem(offset) {

	      var list,
	          item;

	      // given the current selection (or an offset), return the current item.

	      // if currently null, may be end of list case. bail.
	      if (data.selectedIndex === null) {
	        return offset;
	      }

	      list = getPlaylist();

	      // use offset if provided, otherwise take default selected.
	      offset = (offset !== undefined ? offset : data.selectedIndex);

	      // safety check - limit to between 0 and list length
	      offset = Math.max(0, Math.min(offset, list.length));

	      item = list[offset];

	      return item;

	    }

	    function findOffsetFromItem(item) {

	      // given an <li> item, find it in the playlist array and return the index.
	      var list,
	          i,
	          j,
	          offset;

	      offset = -1;

	      list = getPlaylist();

	      if (list) {

	        for (i=0, j=list.length; i<j; i++) {
	          if (list[i] === item) {
	            offset = i;
	            break;
	          }
	        }

	      }

	      return offset;

	    }

	    function getNext() {

          // don't increment if null.
          if (data.selectedIndex !== null) {
	        data.selectedIndex++;
	      }

          if (data.playlist.length > 1) {

 	        if (data.selectedIndex >= data.playlist.length) {

	          if (data.loopMode) {

                // loop to beginning
	            data.selectedIndex = 0;

	          } else {

                // no change
                data.selectedIndex--;

                // end playback
                // data.selectedIndex = null;

	          }

	        }
	
          } else {

            data.selectedIndex = null;

          }

	      return getItem();

	    }

	    function getPrevious() {

	      data.selectedIndex--;

	      if (data.selectedIndex < 0) {
	        // wrapping around beginning of list? loop or exit.
	        if (data.loopMode) {
	          data.selectedIndex = data.playlist.length - 1;
	        } else {
	          // undo
	          data.selectedIndex++;
	        }
	      }

	      return getItem();

	    }

	    function resetLastSelected() {

	      // remove UI highlight(s) on selected items.
	      var items,
	          i, j;

	      items = utils.dom.getAll(dom.playlist, '.' + css.selected);

	      for (i=0, j=items.length; i<j; i++) {
	        utils.css.remove(items[i], css.selected);
	      }

	    }

	    function select(item) {

	      var offset;

	      // remove last selected, if any
	      resetLastSelected();

	      if (item) {
	        utils.css.add(item, css.selected);
	      }

	      // update selected offset, too.
	      offset = findOffsetFromItem(item);

	      data.selectedIndex = offset;

	    }

/*
	    function selectOffset(offset) {

	      var item;

	      item = getItem(offset);

	      if (item) {
	        select(item);
	      }

	    }

	    function playItem(item) {

	      // given an item (<li> or <a>), find it in the playlist array, select and play it.

	      var list, offset;

	      list = getPlaylist();

	      if (list) {

	        offset = findOffsetFromItem(item);

	        if (offset !== -1) {

	          select(offset);

	        }

	      }

	    }

*/

	    function getURL() {

	      // return URL of currently-selected item
	      var item, url;

	      item = getItem();

      
	      if (item) {
	        url = item.getElementsByTagName('a')[0].href;
	      }

	      return url;

	    }

	    function refreshDOM() {

	      // get / update playlist from DOM

	      if (!dom.playlist) {
	      	if (window.console && console.warn) {
	        	console.warn('refreshDOM(): playlist node not found?');
	        }
	        return false;
	      }

	      data.playlist = dom.playlist.getElementsByTagName('li');

	    }

	    function initDOM() {

		  dom.playlistTarget = utils.dom.get(dom.o, '.sm2-playlist-target');
	      dom.playlistContainer = utils.dom.get(dom.o, '.sm2-playlist-drawer');
	      dom.playlist = utils.dom.get(dom.o, '.sm2-playlist-bd');

	    }

	    function init() {

	      initDOM();

	      refreshDOM();

	    }

	    init();

	    return {
	      data: data,
	      refresh: refreshDOM,
	      getNext: getNext,
	      getPrevious: getPrevious,
	      getItem: getItem,
	      getURL: getURL,
	      select: select
	    };

	  }

	  function getTime(msec, useString) {

	    // convert milliseconds to hh:mm:ss, return as object literal or string

	    var nSec = Math.floor(msec/1000),
	        hh = Math.floor(nSec/3600),
	        min = Math.floor(nSec/60) - Math.floor(hh * 60),
	        sec = Math.floor(nSec -(hh*3600) -(min*60));

	    // if (min === 0 && sec === 0) return null; // return 0:00 as null

	    return (useString ? ((hh ? hh + ':' : '') + (hh && min < 10 ? '0' + min : min) + ':' + ( sec < 10 ? '0' + sec : sec ) ) : { 'min': min, 'sec': sec });

	  }

	  function setTitle(item) {

	    // given a link, update the "now playing" UI.

	    // if this is an <li> with an inner link, grab and use the text from that.
	    var links = item.getElementsByTagName('a');

	    if (links.length) {
	      item = links[0];
	    }

        // remove any failed character sequence, also
	    dom.playlistTarget.innerHTML = '<ul class="sm2-playlist-bd"><li>' + item.innerHTML.replace(extras.loadFailedCharacter, '') + '</li></ul>';

	    if (dom.playlistTarget.getElementsByTagName('li')[0].scrollWidth > dom.playlistTarget.offsetWidth) {
	      // this item can use <marquee>, in fact.
	      dom.playlistTarget.innerHTML = '<ul class="sm2-playlist-bd"><li><marquee>' + item.innerHTML + '</marquee></li></ul>';
	    }

	  }

	  function makeSound(url) {

	    var sound = soundManager.createSound({

	      url: url,

	      whileplaying: function() {
	        var progressMaxLeft = 100,
	            left,
	            width;
	
	        left = Math.min(progressMaxLeft, Math.max(0, (progressMaxLeft * (this.position / this.durationEstimate)))) + '%';
	        width = Math.min(100, Math.max(0, (100 * this.position / this.durationEstimate))) + '%';
	
	        if (this.duration) {

  	          dom.progress.style.left = left;
	          dom.progressBar.style.width = width;
              
	          // TODO: only write changes
	          dom.time.innerHTML = getTime(this.position, true);

	        }

	      },

	      onbufferchange: function(isBuffering) {
	        if (isBuffering) {
	          utils.css.add(dom.o, 'buffering');
	        } else {
	          utils.css.remove(dom.o, 'buffering');
	        }
	      },

	      onplay: function() {
	        utils.css.swap(dom.o, 'paused', 'playing');
	      },

	      onpause: function() {
	        utils.css.swap(dom.o, 'playing', 'paused');
	      },

	      onresume: function() {
	        utils.css.swap(dom.o, 'paused', 'playing');
	      },

	      whileloading: function() {

	        if (!this.isHTML5) {
	          dom.duration.innerHTML = getTime(this.durationEstimate, true);
	        }

	      },

	      onload: function(ok) {

	        if (ok) {

	          dom.duration.innerHTML = getTime(this.duration, true);

	        } else if (this._iO && this._iO.onerror) {

	          this._iO.onerror();

	        }

	      },

	      onerror: function() {

	        // sound failed to load.
	        var item, element, html;

	        item = playlistController.getItem();

	        if (item) {

	          // note error, delay 2 seconds and advance?
	          // playlistTarget.innerHTML = '<ul class="sm2-playlist-bd"><li>' + item.innerHTML + '</li></ul>';

	          if (extras.loadFailedCharacter) {
	            dom.playlistTarget.innerHTML = dom.playlistTarget.innerHTML.replace('<li>' ,'<li>' + extras.loadFailedCharacter + ' ');
	            if (playlistController.data.playlist && playlistController.data.playlist[playlistController.data.selectedIndex]) {
	              element = playlistController.data.playlist[playlistController.data.selectedIndex].getElementsByTagName('a')[0];
	              html = element.innerHTML;
	              if (html.indexOf(extras.loadFailedCharacter) === -1) {
                  	element.innerHTML = extras.loadFailedCharacter + ' ' + html;
                  }
	            }
	          }

	        }

	        // load next, possibly with delay.
            
            if (navigator.userAgent.match(/mobile/i)) {
              // mobile will likely block the next play() call if there is a setTimeout() - so don't use one here.
	          actions.next();
	        } else {
	          if (playlistController.data.timer) {
	          	window.clearTimeout(playlistController.data.timer);
	          }
	          playlistController.data.timer = window.setTimeout(actions.next, 1000);
	        }

	      },

          onstop: function() {

            utils.css.remove(dom.o, 'playing');

          },

	      onfinish: function() {

	        var lastIndex, item;

	        utils.css.remove(dom.o, 'playing');

	        dom.progress.style.left = '0%';

	        lastIndex = playlistController.data.selectedIndex;

	        // next track?
	        item = playlistController.getNext();

            // don't play the same item over and over again, if at end of playlist etc.
	        if (item && playlistController.data.selectedIndex !== lastIndex) {

	          playlistController.select(item);

	          setTitle(item);

	          // play next
	          this.play({
	            url: playlistController.getURL()
	          });

	        }/* else {

	          // explicitly stop?
	          // this.stop();

	        }*/

	      }

	    });

	    return sound;

	  }

      function isRightClick(e) {
        // only pay attention to left clicks. old IE differs where there's no e.which, but e.button is 1 on left click.
        if (e && ((e.which && e.which === 2) || (e.which === undefined && e.button !== 1))) {
          // http://www.quirksmode.org/js/events_properties.html#button
          return true;
        }
      }

	  function handleMouseDown(e) {

	    var links,
	        target;

	    target = e.target || e.srcElement;

        if (isRightClick(e)) {
          return true;
        }

	    // normalize to <a>, if applicable.
	    if (target.nodeName.toLowerCase() !== 'a') {
	      links = target.getElementsByTagName('a');
	      if (links && links.length) {
	        target = target.getElementsByTagName('a')[0];
	      }
	    }

	    if (utils.css.has(target, 'sm2-volume-control')) {

	      // drag case for volume

	      actionData.volume.x = utils.position.getOffX(target);
	      actionData.volume.y = utils.position.getOffY(target);

	      actionData.volume.width = target.offsetWidth;
	      actionData.volume.height = target.offsetHeight;

	      // potentially dangerous: this should, but may not be a percentage-based value.
	      actionData.volume.backgroundSize = parseInt(utils.style.get(target, 'background-size'), 10);

	      // IE gives pixels even if background-size specified as % in CSS. Boourns.
	      if (window.navigator.userAgent.match(/msie|trident/i)) {
	        actionData.volume.backgroundSize = (actionData.volume.backgroundSize / actionData.volume.width) * 100;
	      }

	      utils.events.add(document, 'mousemove', actions.adjustVolume);
	      utils.events.add(document, 'mouseup', actions.releaseVolume);

	      // and apply right away
	      return actions.adjustVolume(e);

	    }

	  }

	  function playLink(link) {

	    // if a link is OK, play it.

	    if (soundManager.canPlayURL(link.href)) {

	      if (!soundObject) {
	        soundObject = makeSound(link.href);
	      }

	      // required to reset pause/play state on iOS so whileplaying() works? odd.
	      soundObject.stop();

	      playlistController.select(link.parentNode);

	      // TODO: ancestor('li')
	      setTitle(link.parentNode);

	      soundObject.play({
	        url: link.href,
	        position: 0
	      });

	    }

	  }

	  function handleClick(e) {

	    var evt,
	        target,
	        offset,
            targetNodeName,
	        methodName,
	        href,
	        handled;

	    evt = (e || window.event);

	    target = evt.target || evt.srcElement;


	    if (target && target.nodeName) {

          targetNodeName = target.nodeName.toLowerCase();

          if (targetNodeName !== 'a') {

            // old IE (IE 8) might return nested elements inside the <a>, eg., <b> etc. Try to find the parent <a>.

           if (target.parentNode) {

              do {
                target = target.parentNode;
                targetNodeName = target.nodeName.toLowerCase();
              } while (targetNodeName !== 'a' && target.parentNode);

              if (!target) {
                // something went wrong. bail.
                return false;
              }

            }

          }

	      if (targetNodeName === 'a') {

	        // yep, it's a link.

	        href = target.href;

	        if (soundManager.canPlayURL(href)) {

              // not excluded
              if (!utils.css.has(target, 'sm2-exclude')) {

	            // find this in the playlist

	            playLink(target);

                handled = true;

              }

	        } else {

	          // is this one of the action buttons, eg., play/pause, volume, etc.?
	          offset = target.href.lastIndexOf('#');

	          if (offset !== -1) {
	            methodName = target.href.substr(offset+1);
	            if (methodName && actions[methodName]) {
                  handled = true;
	              actions[methodName](e);
	            }
	          }

	        }

            // fall-through case

            if (handled) {
	          // prevent browser fall-through
	          return utils.events.preventDefault(evt);
            }

	      }

	    }

	  }

	  function handleMouse(e) {

        var target, barX, barWidth, x, newPosition, sound;

	    target = dom.progressTrack;

	    barX = utils.position.getOffX(target);
	    barWidth = target.offsetWidth;

	    x = (e.clientX - barX);

	    newPosition = (x / barWidth);

	    sound = soundObject;

	    if (sound && sound.duration) {

	      sound.setPosition(sound.duration * newPosition);

	      // a little hackish: ensure UI updates immediately with current position, even if audio is buffering and hasn't moved there yet.
	      sound._iO.whileplaying.apply(sound);

	    }

	    if (e.preventDefault) {
	      e.preventDefault();
	    }

	    return false;

	  }

	  function releaseMouse(e) {

	    utils.events.remove(document, 'mousemove', handleMouse);

	    utils.css.remove(dom.o, 'grabbing');

	    if (e.preventDefault) {
	      e.preventDefault();
	    }

        utils.events.remove(document, 'mouseup', releaseMouse);

	    return false;

	  }

	  function init() {

	    // init DOM?

	    if (!playerNode) {
	      console.warn('init(): No playerNode element?');
	    }

	    dom.o = playerNode;

	    // are we dealing with a crap browser? apply legacy CSS if so.
	    if (window.navigator.userAgent.match(/msie [678]/i)) {
	      utils.css.add(dom.o, css.legacy);
	    }

	    if (window.navigator.userAgent.match(/mobile/i)) {
	      // majority of mobile devices don't let HTML5 audio set volume.
	      utils.css.add(dom.o, css.noVolume);
	    }

	    dom.progress = utils.dom.get(dom.o, '.sm2-progress-ball');

	    dom.progressTrack = utils.dom.get(dom.o, '.sm2-progress-track');

	    dom.progressBar = utils.dom.get(dom.o, '.sm2-progress-bar');

	    dom.volume = utils.dom.get(dom.o, 'a.sm2-volume-control');

	    dom.duration = utils.dom.get(dom.o, '.sm2-inline-duration');

	    dom.time = utils.dom.get(dom.o, '.sm2-inline-time');

	    playlistController = new PlaylistController();

	    defaultItem = playlistController.getItem(0);

	    playlistController.select(defaultItem);

	    setTitle(defaultItem);

	    utils.events.add(dom.o, 'mousedown', handleMouseDown);

	    utils.events.add(dom.o, 'click', handleClick);

	    utils.events.add(dom.progressTrack, 'mousedown', function(e) {

          if (isRightClick(e)) {
            return true;
          }

	      utils.css.add(dom.o, 'grabbing');
	      utils.events.add(document, 'mousemove', handleMouse);
	      utils.events.add(document, 'mouseup', releaseMouse);

	      return handleMouse(e);

	    });

	  }

	  // ---

	  actionData = {

	    volume: {
	      x: 0,
	      y: 0,
	      width: 0,
	      height: 0,
	      backgroundSize: 0
	    }

	  };

	  actions = {

	    play: function(e) {

	      var target,
	          href;

	      target = e.target || e.srcElement;

	      href = target.href;

	      // haaaack - if '#' due to play/pause link, get first link from playlist
	      if (href.indexOf('#') !== -1) {
	        href = dom.playlist.getElementsByTagName('a')[0].href;
	      }

	      if (!soundObject) {
	        soundObject = makeSound(href);
	      }

	      soundObject.togglePause();

	    },

	    next: function(/* e */) {

	      var item, lastIndex;

          // special case: clear "play next" timeout, if one exists.
          if (playlistController.data.timer) {
          	window.clearTimeout(playlistController.data.timer);
          	playlistController.data.timer = null;
          }

          lastIndex = playlistController.data.selectedIndex;

	      item = playlistController.getNext(true);

          // don't play the same item again
	      if (item && playlistController.data.selectedIndex !== lastIndex) {
	        playLink(item.getElementsByTagName('a')[0]);
	      }

	    },

	    prev: function(/* e */) {

	      var item, lastIndex;

          lastIndex = playlistController.data.selectedIndex;

	      item = playlistController.getPrevious();

          // don't play the same item again
	      if (item && playlistController.data.selectedIndex !== lastIndex) {
	        playLink(item.getElementsByTagName('a')[0]);
	      }

	    },

	    shuffle: function(e) {
	      var target = e.target || e.srcElement;
	      if (!utils.css.has(target.parentNode, css.disabled)) {
	        // toggle
	        utils.css.toggle(target.parentNode, css.active);
	        playlistController.data.shuffleMode = !playlistController.data.shuffleMode;
	      }
	    },

	    repeat: function(e) {
	      var target = e.target || e.srcElement;
	      if (!utils.css.has(target, css.disabled)) {
	        utils.css.toggle(target.parentNode, css.active);
	        playlistController.data.loopMode = !playlistController.data.loopMode;
	      }
	    },

	    menu: function(/* e */) {

	      var isOpen;

	      isOpen = utils.css.toggle(dom.o, 'playlist-open');

	      // playlist
	      dom.playlistContainer.style.height = (isOpen ? dom.playlistContainer.scrollHeight : 0) + 'px';

	    },

	    adjustVolume: function(e) {

	      var backgroundSize,
	          backgroundMargin,
	          pixelMargin,
	          target,
	          value,
	          volume;

	      value = 0;

	      target = dom.volume;

	      // based on getStyle() result
	      backgroundSize = actionData.volume.backgroundSize;

	      // figure out spacing around background image based on background size, eg. 60% background size.
	      backgroundSize = 100 - backgroundSize;

	      // 60% wide means 20% margin on each side.
	      backgroundMargin = backgroundSize / 2;

	      // relative position of mouse over element
	      value = Math.max(0, Math.min(1, (e.clientX - actionData.volume.x) / actionData.volume.width));

	      target.style.clip = 'rect(0px, ' + (actionData.volume.width * value) + 'px, ' + actionData.volume.height + 'px, ' + (actionData.volume.width * (backgroundMargin/100)) + 'px)';

	      // determine logical volume, including background margin
	      pixelMargin = ((backgroundMargin/100) * actionData.volume.width);

	      volume = Math.max(0, Math.min(1, ((e.clientX - actionData.volume.x) - pixelMargin) / (actionData.volume.width - (pixelMargin*2))));

	      // set volume
	      if (soundObject) {
	        soundObject.setVolume(volume * 100);
	      }

	      return utils.events.preventDefault(e);

	    },

	    releaseVolume: function(/* e */) {

	      utils.events.remove(document, 'mousemove', actions.adjustVolume);
	      utils.events.remove(document, 'mouseup', actions.releaseVolume);

	    }/*,

	    volume: function(e) {

	      if (e.type === 'mousedown') {

	        utils.events.add(document, 'mousemove', actions.adjustVolume);

	        return utils.events.preventDefault(e);

	      } else if (e.type === 'mouseup') {

	        utils.events.remove(document, 'mousemove', actions.adjustVolume);

	      }

	    }*/

	  };

	  init();

  };

  // ---

  // expose to global
  window.sm2BarPlayers = players;
  window.SM2BarPlayer = Player;

}(window));
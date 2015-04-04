/*jslint plusplus: true, white: true, nomen: true */
/*global soundManager, document, console, window */

(function(window) {

  /** @license
   * SoundManager 2: "Turntable UI": Base and API
   * Copyright (c) 2015, Scott Schiller. All rights reserved.
   * http://www.schillmania.com/projects/soundmanager2/
   * Code provided under BSD license.
   * http://schillmania.com/projects/soundmanager2/license.txt
   */

  "use strict";

  var turntables = [],
      turntablesById = {},
      // CSS selector for top-level DOM node
      turntableSelector = '.turntable',
      tt_prefix = 'tt_',
      idCounter = 0,
      utils;

  /**
   * Slightly hackish: Turntable event callbacks.
   * Override globally by setting turntables.on = {}, or individually by turntables[0].on = {} etc.
   */
  turntables.on = {/*
    stop: function(tt) {
      console.log('turntable stopped', tt);
    },
    start: function(tt) {
      console.log('turntable started', tt);
    },
    powerOn: function(tt) {
      console.log('turntable powerOn', tt);
    },
    powerOff: function(tt) {
      console.log('turntable powerOff', tt);
    }*/
  };

  function Turntable(o, options) {

    var api, css, dom, data, id, methods;

    // DOM ID + SM2 sound reference
    id = (tt_prefix + idCounter);

    idCounter++;

    options = options || {};

    function add(className) {
      utils.css.add(dom.o, className);
    }

    function remove(className) {
      utils.css.remove(dom.o, className);
    }

    function callback(method) {
      if (method) {
        // fire callback, passing current turntable object
        if (api.on && api.on[method]) {
          api.on[method](api);
        } else if (turntables.on[method]) {
          turntables.on[method](api);
        }
      }
    }

    function applyTonearmAngle() {
      if (data.tonearm.angle >= 0) {
        dom.tonearm.style[utils.features.transform.prop] = 'rotate(' + data.tonearm.angle + 'deg)';
      }
    }

    // TODO: use mixin
    if (options.hideLabelWithArtwork === undefined) {
      options.hideLabelWithArtwork = true;
    }

    css = {

      power: {
        turntable: 'power-on',
        motor: 'motor-on'
      },

      turntable: {
        hasArtwork: 'has-artwork',
        hasRecord: 'has-record',
        hasSlipmat: 'has-slipmat',
        hideLabelWithArtwork: 'hide-label-with-artwork'
      }

    };

    data = {

      power: {
        turntable: false,
        motor: false,
        motorVelocity: 0
      },

      tonearm: {
        angle: 0,
        maxAngle: 42,
        minAngle: 0
      },

      record: {
        hasArtwork: false
      }

    };

    methods = {

      start: function() {
        if (data.power.turntable && !data.power.motor) {
          data.power.motor = true;
          add(css.power.motor);
          callback('start');
        }
      },

      stop: function() {
        if (data.power.motor) {
          data.power.motor = false;
          remove(css.power.motor);
          callback('stop');
        }
      },

      toggle: function() {
        if (data.power.motor) {
          methods.stop();
        } else {
          methods.start();
        }
      },

      powerOn: function() {
        if (!data.power.turntable) {
          data.power.turntable = true;
          add(css.power.turntable);
          callback('powerOn');
        }
      },

      powerOff: function() {
        if (data.power.turntable) {
          data.power.turntable = false;
          remove(css.power.turntable);
          callback('powerOff');
        }
        // no power = no motor, too.
        methods.stop();
      },

      powerToggle: function() {
        if (!data.power.turntable) {
          methods.powerOn();
        } else {
          methods.powerOff();
        }
      },

      setTonearmAngle: function(angle) {
        if (!isNaN(angle)) {
          data.tonearm.angle = Math.max(data.tonearm.minAngle, Math.min(data.tonearm.maxAngle, angle));
          if (utils.features.transform.prop) {
            if (utils.features.getAnimationFrame) {
              utils.features.getAnimationFrame(applyTonearmAngle);
            } else {
              applyTonearmAngle();
            }
          }
        }
      },

      addSlipmat: function() {
        add(css.turntable.hasSlipmat);
      },

      removeSlipmat: function() {
        remove(css.turntable.hasSlipmat);
      },

      toggleSlipmat: function() {
        utils.css.toggle(dom.o, css.turntable.hasSlipmat);
      },

      addRecord: function() {
        add(css.turntable.hasRecord);
      },

      removeRecord: function() {
        remove(css.turntable.hasRecord);
      },

      toggleRecord: function() {
        utils.css.toggle(dom.o, css.turntable.hasRecord);
      },

      setArtwork: function(url) {
        if (url) {
          dom.record.style.backgroundImage = 'url(' + url + ')';
          if (!data.record.hasArtwork) {
            add(css.turntable.hasArtwork);
            data.record.hasArtwork = true;
          }
        } else {
          if (data.record.hasArtwork) {
            dom.record.style.backgroundImage = 'none';
            remove(css.turntable.hasArtwork);
            data.record.hasArtwork = false;
          }
        }
        if (options.hideLabelWithArtwork) {
          add(css.turntable.hideLabelWithArtwork);
        } else {
          remove(css.turntable.hideLabelWithArtwork);
        }
      }

    };

    function handleMethod(e) {

      var target, action;

      target = e.target;
      
      if (target) {
        
        action = target.getAttribute('data-method');
        
        if (action && methods[action]) {
          methods[action](e);
        }
      
      }

    }

    function preventDefault(e) {

        if (e.target && e.target.nodeName === 'A') {
          utils.events.preventDefault(e);
          return false;
        }

    }

    function assignEvents() {

      utils.events.add(dom.o, 'mousedown', handleMethod);
      utils.events.add(dom.o, 'click', preventDefault);

    }

    function initDOM() {

      dom = {
        o: o,
        platter: utils.dom.get(o, '.platter'),
        record: utils.dom.get(o, '.record'),
        slipmat: utils.dom.get(o, '.slipmat'),
        tonearm: utils.dom.get(o, '.tonearm')
      };

      // inherit ID
      if (!dom.o.id) {
        dom.o.id = id;
      } else {
        id = dom.o.id;
      }

    }

    function init() {

      initDOM();

      assignEvents();

      // in a moment...
      window.setTimeout(methods.powerToggle, 500);

    }

    init();

    // public interface
    api = {
      id: id,
      // css: css,
      data: data,
      methods: methods,
      on: {} // per-turntable event overrides you can specify; see turntables.on for examples
    };

    return api;

  }

  // common JS helpers

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

      function getAll(param1, param2) {

        var node,
            selector,
            results;

        if (arguments.length === 1) {

          // .selector case
          node = document.documentElement;
          // first param is actually the selector
          selector = param1;

        } else {

          // node, .selector
          node = param1;
          selector = param2;

        }

        // sorry, IE 7 users; IE 8+ required.
        if (node && node.querySelectorAll) {

          results = node.querySelectorAll(selector);

        }

        return results;

      }

      function get(/* parentNode, selector */) {

        var results = getAll.apply(this, arguments);

        // hackish: if an array, return the last item.
        if (results && results.length) {
          return results[results.length-1];
        }

        // handle "not found" case
        return results && results.length === 0 ? null : results;

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

  soundManager.setup({
    // Trade-off: higher UI responsiveness (play/progress bar), but may use more CPU.
    html5PollingInterval: 50,
    flashVersion: 9
  });

  soundManager.onready(function() {

    var nodes, i, j, tt;

    nodes = utils.dom.getAll(turntableSelector);

    if (nodes && nodes.length) {
      for (i=0, j=nodes.length; i<j; i++) {
        tt = new Turntable(nodes[i]);
        turntables.push(tt);
        turntablesById[tt.id] = tt;
      }
    }
  
  });

  window.turntables = turntables;
  window.turntablesById = turntablesById;

  // for external reference by demos, etc.
  window.turntables.utils = utils;

}(window));
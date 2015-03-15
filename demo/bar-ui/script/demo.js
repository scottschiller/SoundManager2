(function() {

  var utils;

  var playerSelector = '.sm2-bar-ui';

  var players = window.sm2BarPlayers;

  var Player = window.SM2BarPlayer;

  // the demo may need flash, we'll set that up here.
  soundManager.setup({
    url: '../../swf/'
  });

  // minimal utils for demo
  utils = {

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

        if (node) {

          results = node.querySelectorAll(selector);

        }

        return results;

      }

      function get() {

        var results = getAll.apply(this, arguments);

        // hackish: if more than one match, return the last.
        if (results && results.length) {
          results = results[results.length-1];
        }

        return results;

      }

      function getFirst() {

        var results = getAll.apply(this, arguments);

        // hackish: if more than one match, return the first.
        if (results && results.length) {
          results = results[0];
        }

        return results;

      }

      return {
        get: get,
        getAll: getAll,
        getFirst: getFirst
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
        }
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

    }())

  };

  soundManager.onready(function() {

      // initialize all players

      var demoData = {
        pageBackgroundPicker: document.getElementById('page-background'),
        playerBackgroundPicker: document.getElementById('player-background'),
        colorPicker: document.getElementById('color-field'),
        opacityPicker: document.getElementById('opacity-field'),
        sizePicker: document.getElementById('size-field'),
        colorOutput: document.getElementById('color-output'),
        backgroundValue: null,
        opacityValue: null,
        sizeValue: null
      };

      // initial values
      demoData.backgroundValue = demoData.colorPicker.value;
      demoData.opacityValue = demoData.opacityPicker.value;
      demoData.sizeValue = demoData.sizePicker.value;

      function hexToRGB(hex) {
        // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb/11508164#11508164
        var bigint = parseInt(hex, 16);
        var r = (bigint >> 16) & 255;
        var g = (bigint >> 8) & 255;
        var b = bigint & 255;
        return [r, g, b];
      }

      function updateColor() {

        var colorValue = demoData.backgroundValue,
            opacityValue = parseInt(demoData.opacityValue, 10);

        if (colorValue.charAt(0) !== '#') {
          colorValue = '#' + colorValue;
        }

        if (opacityValue === 0) {
          colorString = 'transparent';
        } else if (opacityValue < 100) {
          // rgba
          colorString = 'rgba(' + hexToRGB(colorValue.substr(1)).concat([opacityValue/100]).join(', ') + ')';
        } else {
          colorString = demoData.backgroundValue;
        }

        applyToNodes('.sm2-main-controls, .sm2-playlist-drawer', function(node) {
          node.style.backgroundColor = colorString;
        });

        if (opacityValue === 0) {
          demoData.colorOutput.innerHTML = 'background-color: transparent;';
        } else if (opacityValue < 100) {
          demoData.colorOutput.innerHTML = 'background-color: ' + colorValue + '; /* non-RGBA fallback */\n background-color: ' + colorString + ';';
        } else {
          demoData.colorOutput.innerHTML = 'background-color: ' + colorString + ';'
        }

      }

      utils.events.add(demoData.colorPicker, 'change', function(e) {

        var target = e.target || e.srcElement,
            color = target.value;

        if (color) {
          demoData.backgroundValue = color;
        }

        updateColor();

      });

      utils.events.add(demoData.opacityPicker, 'change', function(e) {

        var target = e.target || e.srcElement,
            opacity = target.value;

        if (opacity !== undefined) {
          demoData.opacityValue = opacity;
        }

        updateColor();

      });

      utils.events.add(demoData.sizePicker, 'change', function(e) {

        var target = e.target || e.srcElement,
            size = target.value;

        if (size !== undefined) {
          demoData.sizeValue = size;
        }

        applyToNodes(playerSelector, function(node) {
          node.style.fontSize = size + 'px';
        });

      });

      function changeBackground(e, isPage) {

        var target = e.target || e.srcElement,
            styleTarget = document.documentElement,
            backgroundValue = target.value,
            isTransparent = target.value.match(/transparent/i),
            isDark = target.options[target.selectedIndex].getAttribute('data-dark');

        // apply to <html>, or UI texture
        if (isPage) {

          styleTarget.style.background = backgroundValue;

          if (isDark) {
            document.body.style.color = '#fff';
          } else {
            document.body.style.color = '#000';
          }

        } else {

          applyToNodes('.sm2-inline-texture', function(node) {
            node.style.background = backgroundValue;
          });

          document.getElementById('texture-output').innerHTML = 'background: ' + backgroundValue + ';';

          if (!isTransparent) {

            // ensure texture mode is on
            applyToNodes(playerSelector, function(node) {
              utils.css.add(node, 'textured');
            });

          } else {

            // ensure texture mode is off
            applyToNodes(playerSelector, function(node) {
              utils.css.remove(node, 'textured');
            });

          }

          updateDemoCode();

        }

      }

      utils.events.add(demoData.pageBackgroundPicker, 'change', function(e) {
        changeBackground(e, true);
      });

      utils.events.add(demoData.playerBackgroundPicker, 'change', function(e) {
        changeBackground(e, false);
      });

      function handleOpacityMouseMove() {

        var currentValue = demoData.opacityPicker.value;

        if (currentValue !== demoData.sizeValue) {

          demoData.opacityValue = currentValue;
          updateColor();

        }

      }

      function handleFontMouseMove() {

        var currentValue = demoData.sizePicker.value;

        if (currentValue !== demoData.sizeValue) {

          demoData.sizeValue = currentValue;

          applyToNodes(playerSelector, function(node) {
            node.style.fontSize = currentValue + 'px';
          });

          document.getElementById('fontsize-output').innerHTML = currentValue + 'px;';

        }

      }

      /**
       * Dumb hacks for certain browsers that don't fire onchange() for input type="range" while user is dragging the slider.
       * Also, input type="color".
       * Applies to Firefox Nightly at time of writing (03/2014.)
       */

      utils.events.add(demoData.opacityPicker, 'mousedown', function(e) {

        var moveHandler,
            upHandler;

        // only pay attention to left clicks.
        if (e.button === 0) {

          moveHandler = utils.events.add(document, 'mousemove', handleOpacityMouseMove);

          upHandler = utils.events.add(document, 'mouseup', function(e) {
            moveHandler.detach();
             upHandler.detach();
          });

        }

      });

      utils.events.add(demoData.sizePicker, 'mousedown', function(e) {

        var moveHandler,
            upHandler;

        // only pay attention to left clicks.
        if (e.button === 0) {

          moveHandler = utils.events.add(document, 'mousemove', handleFontMouseMove);

          upHandler = utils.events.add(document, 'mouseup', function(e) {
            moveHandler.detach();
            upHandler.detach();
          });

        }

      });

      utils.events.add(demoData.colorPicker, 'click', function(e) {

        var colorTimer,
            changeHandler;

        // this is dumb: resort to polling until change event fires.

        changeHandler = utils.events.add(demoData.colorPicker, 'change', function(e) {

          // now that the change event has finally fired, cancel the timer.

          if (colorTimer) {
            window.clearInterval(colorTimer);
            colorTimer = null;
          }

          changeHandler.detach();

        });

        // regularly poll, update as applicable
        colorTimer = window.setInterval(function() {

          var color = demoData.colorPicker.value;

          if (demoData.backgroundValue !== color) {
            demoData.backgroundValue = color;
            updateColor();
          }

        }, 50);

        moveHandler = utils.events.add(document, 'mousemove', handleFontMouseMove);

        upHandler = utils.events.add(document, 'mouseup', function(e) {
          moveHandler.detach();
          upHandler.detach();
        });

      });

      function applyToNodes(selector, method) {
        var i, j, nodes = utils.dom.getAll((selector || playerSelector));
        for (i=0, j=nodes.length; i<j; i++) {
          method(nodes[i]);
        }
      }

      function updateDemoCode() {

        var className = utils.dom.getFirst(playerSelector).className;

        // remove dynamic state bits from the live demo
        className = className.replace(/[ ]playing|[ ]paused|[ ]buffering/ig, '');

        document.getElementById('player-code-example').innerHTML = className;

      }

      utils.events.add(document.getElementById('fullwidth'), 'click', function(e) {
        applyToNodes(null, function(node) {
          utils.css.toggle(node, 'full-width');
          updateDemoCode();
        });
      });

      utils.events.add(document.getElementById('textured'), 'click', function(e) {
        applyToNodes(null, function(node) {
          utils.css.toggle(node, 'textured');
          updateDemoCode();
        });
      });

      utils.events.add(document.getElementById('dark'), 'click', function(e) {
        applyToNodes(null, function(node) {
          utils.css.toggle(node, 'dark-text');
          updateDemoCode();
        });
      });

      utils.events.add(document.getElementById('flat'), 'click', function(e) {
        applyToNodes(null, function(node) {
          utils.css.toggle(node, 'flat');
          updateDemoCode();
        });
      });

      utils.events.add(document.getElementById('playlist-open'), 'click', function(e) {
        var i, j;
        for (i=0, j=players.length; i<j; i++) {
          players[i].actions.menu();
        }
        updateDemoCode();
      });

  });

}());
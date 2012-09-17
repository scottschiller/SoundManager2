/**
 * Cassette Tape UI Prototype (09/2012)
 * ALPHA build / experimental state, unsupported; use at own risk
 * Requires CSS3 border-radius + <canvas> support
 * --------------------------------------------------
 * http://www.schillmania.com/projects/soundmanager2/
 */

(function(window) {

var caughtError = false;

var CanvasImage = function(canvas, image) {

  /**
   * https://github.com/ceramedia/examples/tree/gh-pages/canvas-blur/v5
   * original: http://www.flother.com/blog/2010/image-blur-html5-canvas/
   *
   * Light layer on top of a canvas element to represent an image displayed
   * within. Pass in a canvas element and an Image object and you'll see the
   * image within the canvas element. Use the provided methods (e.g. blur) to
   * manipulate it.
   *
   * @constructor
   * @param {HTMLElement} element HTML canvas element.
   * @param {Image} image Image object.
   */

  var width, height;

  this.image = image;

  width = this.image.width;
  height = this.image.height;

  this.element = canvas || document.createElement('canvas');
  // IE 10 complains if 'auto' is used for style.width|height.

  this.element.style.width = width+'px';
  this.element.style.height = height+'px';
  this.element.width = width;
  this.element.height = height;
  this.context = this.element.getContext('2d');
  this.context.drawImage(this.image, 0, 0);

};

CanvasImage.prototype = {
  /**
   * Runs a blur filter over the image.
   * @param {int} strength Strength of the blur.
   */
  blur: function (strength) {
    this.context.globalAlpha = 0.5; // Higher alpha made it more smooth
    // Add blur layers by strength to x and y
    // 2 made it a bit faster without noticeable quality loss
    for (var y = -strength; y <= strength; y += 2) {
      for (var x = -strength; x <= strength; x += 2) {
        // Apply layers
        this.context.drawImage(this.element, x, y);
        // Add an extra layer, prevents it from rendering lines
        // on top of the images (does makes it slower though)
        if (x>=0 && y>=0) {
          this.context.drawImage(this.element, -(x-1), -(y-1));
        }
      }
    }
    this.context.globalAlpha = 1.0;
  }
};

function imageMask(imageSrc, maskSrc, canvasWidth, canvasHeight, useRepeat, oncomplete) {

  /**
   * quick-and-dirty "load an image and apply a mask to it" function
   * parameters:
   * @imageSrc {URL} string Source image URL
   * @maskSrc {URL} string Mask image URL
   * @oncomplete {Function} function Callback with data: URI of masked image result
   */

  var images = [
    new Image(),
    new Image()
  ];

  // CORS option?
  // images[0].crossOrigin = 'anonymous';
  // images[1].crossOrigin = 'anonymous';

  var canvas = [
    document.createElement('canvas'),
    document.createElement('canvas')
  ];

  var loadCount = 0;

  var loadTarget = images.length;

  function applyMask() {

    // draw and mask image

    var srcWidth = canvasWidth;
    var srcHeight = canvasHeight;

    var targetWidth = canvasWidth;
    var targetHeight = canvasHeight;

    var ctx;

    var repeatPattern;

    canvas[0].width = srcWidth;
    canvas[0].height = srcHeight;

    canvas[1].width = targetWidth;
    canvas[1].height = targetHeight;

    ctx = [
      canvas[0].getContext('2d'),
      canvas[1].getContext('2d')
    ];

    if (!useRepeat) {

      // simple 1:1 case

      ctx[0].drawImage(images[0], 0, 0);

    } else {

      // tile the image across the canvas

      repeatPattern = ctx[0].createPattern(images[0], 'repeat');

      ctx[0].fillStyle = repeatPattern;

      ctx[0].fillRect(0, 0, targetWidth, targetHeight);

      ctx[0].fillStyle = '';

    }

    // draw mask on target canvas

    ctx[1].drawImage(images[1], 0, 0);

    // apply the mask

    ctx[0].globalCompositeOperation = 'destination-in';

    ctx[0].drawImage(canvas[1], 0, 0);

    ctx[0].globalCompositeOperation = null;

    // the resulting masked image

    return canvas[0];

  }

  function imageLoaded() {

    // load handler

    this.onload = this.onerror = null;

    loadCount++;

    if (loadCount >= loadTarget) {

      // apply the mask, providing the resulting data URI to the handler
      // TODO: Don't use data URL, just modify canvas directly; likely much faster.

      try {

        oncomplete(applyMask().toDataURL('image/png'));

      } catch(e) {

        // may fail with DOM exception 18 under Chrome when offline eg., file:// instead of over HTTP.

        if (typeof console !== 'undefined' && typeof console.warn !== 'undefined') {
          console.warn('Unable to apply image mask, likely a security exception from offline (file://) use.', e);
          if (!caughtError && typeof console.info !== 'undefined') {
            console.info('Using static skin image as a workaround.');
          }
        }

        // hack: try applying the body skin instead, without masking. HTML-based screw elements will overlay the skin, but, eh. this is an edge case anyway.

        if (!caughtError) {

          oncomplete('image/ma-r90-body-skin.png');
          caughtError = true;

        } else {

          oncomplete();

        }

      }

      // cleanup?
      canvas = null;
      images = null;

    }

  }

  function init() {

    // preload source / target images

    images[0].onload = images[0].onerror = imageLoaded;
    images[1].onload = images[1].onerror = imageLoaded;

    images[0].src = imageSrc;
    images[1].src = maskSrc;

    // TODO: check .complete (cached) case?

  }

  init();

}

function TapeUI(oOptions) {

  var css = {

    playing: 'playing',
    stopped: 'stopped',
    ready: 'ready',
    dropin: 'dropin'

  };

  var data = {

    progress: 0

  };

  var controlHandler;

  var sound;

  var dom = {};

  var spoolWidth = 91;

  var borderMaxWidth = 76;

  var reelBoxWidth = 234;

  var tapeWidth = 480;
  var tapeHeight = parseInt(tapeWidth/1.6, 10);

  var blurCanvas;

  var maskCanvas;
  var maskCanvasLoaded;
  var maskContext;
  var maskImage;
  var maskVisible;

  var context;

  function getBackgroundURL(node) {

    var url;
    var cssprop = 'backgroundImage';

    if (node.currentStyle) {

      // IE
      url = node.currentStyle[cssprop];

    } else if (document.defaultView && document.defaultView.getComputedStyle) {

      // Firefox
      url = document.defaultView.getComputedStyle(node, '')[cssprop];

    } else {

      // inline style?
      url = node.style[cssprop];

    }

    // HACK: strip url() and/or quotes from string

    url = url.replace('url(', '').replace(')', '');

    url = url.replace(/\'/g, '').replace(/\"/g, '');

    return url;

  }

  function maskedImageReady(node, uri) {

    // callback with data: URI of masked image

    if (node && uri) {
      node.style.backgroundImage = uri;
    }

  }

  function createMaskedImage(node) {

    // get background image (or if <img>, src?) and data-mask-image attributes

    var imageSrc = getBackgroundURL(node),
        elementWidth = node.offsetWidth,
        elementHeight = node.offsetHeight,
        useRepeat = !!node.getAttribute('data-image-repeat'),
        maskSrc = node.getAttribute('data-mask-url');

    return imageMask(imageSrc, maskSrc, elementWidth, elementHeight, useRepeat, function(maskURI) {
      var uri = (maskURI ? 'url(' + maskURI + ')' : null);
      maskedImageReady(node, uri);
    });

  }

  // canvas stuffs

  function scaleWidth(w) {
    return (w * tapeWidth);
  }

  function scaleHeight(h) {
    return (h * tapeHeight);
  }

  function initMask(callback) {

    if (!dom.node.className.match(/cutout/i)) {
      return false;
    }

    // draw our tape cut-outs

    maskCanvas = document.createElement('canvas');

    maskImage = new Image();

    // Ensure same dimensions
    maskCanvas.width = tapeWidth;
    maskCanvas.height = tapeHeight;

/*
    maskContext = maskCanvas.getContext('2d');

    var spoolBoxRadius = 134;

    var spoolCoords = [
      // left
      tapeWidth * 0.29,
      tapeHeight * 0.45,
      // right
      tapeWidth * 0.71,
      tapeHeight * 0.45
    ];

    // filled shape color
    maskContext.fillStyle = "black";

    maskContext.arc(spoolCoords[0], spoolCoords[1], spoolBoxRadius, 0, 4 * Math.PI);

    maskContext.arc(spoolCoords[2], spoolCoords[3], spoolBoxRadius, 0, 4 * Math.PI);

    maskContext.fill();
*/

    maskImage.onload = function() {
      var ctx = maskCanvas.getContext('2d');
      ctx.drawImage(this, 0, 0);
      this.onload = null;
      maskCanvasLoaded = true;
      callback();
    };

    // load the mask to apply
    maskImage.src = 'image/ma-r90-mask.png';

  }

  function createBlurImage(callback) {

    var url = getBackgroundURL(document.getElementsByTagName('html')[0]);

    var image = new Image();

    // CORS option?
    // image.crossOrigin = 'anonymous';

    image.onload = image.onerror = function() {

      // in error state, w/h will be empty.

      if (this.width || this.height) {

        // make + blur

        var canvasImage = new CanvasImage(dom.blurNode, this);

        // var uri = canvasImage.element.toDataURL('image/png');

        // + assign to DOM

        dom.blurNode.style.backgroundImage = '';

        canvasImage.blur(2);

      }

      this.onload = this.onerror = null;

      if (callback) {
        callback();
      }

    }

    image.src = url;

  }

  function center() {

    // given screen x/y, position at center.

    // don't center unless draggable.
    if (!dragHandler.data.dragTarget.node) {
      return false;
    }

    var screenX = window.innerWidth,
        screenX2 = parseInt(screenX/2, 10),
        screenY = window.innerHeight,
        screenY2 = parseInt(screenY/2, 10),
        x, y,
        node = dom.node,
        blurNode = dom.blurNode;

    if (node) {
      x = parseInt(screenX2 - (tapeWidth/2), 10);
      y = parseInt(screenY2 - (tapeHeight/2), 10);
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      if (blurNode) {
        blurNode.style.marginLeft = -x + 'px';
        blurNode.style.marginTop = -y + 'px';
      }
    }
 
  }

  var readyCompleteTimer = null;

  function readyComplete(loader) {

    utils.css.add(dom.node, css.ready);
    utils.css.add(dom.node, css.dropin);

    if (readyCompleteTimer) {
      window.clearTimeout(readyCompleteTimer);
    }

    readyCompleteTimer = window.setTimeout(function() {
      utils.css.remove(dom.node, css.dropin);
      // demo hack: remove the loader, too
      /*
      if (loader) {
        document.body.removeChild(loader);
        loader = null;
      }
      */
    }, 1000);

  }

  function ready() {

    // demo hack: hide the loading element, if present
    var loader = document.getElementById('tape-loader'),
        wrapper = document.getElementById('demo-header-wrapper');

    if (loader) {
      utils.css.remove(loader, 'visible');
      utils.css.add(loader, 'hidden');
      if (wrapper) {
        utils.css.add(wrapper, 'visible');
      }
    }

    // trigger animations after slight yield (depending on loader element)
    window.setTimeout(function() {
      // reposition
      center();
      readyComplete(loader);
    }, loader ? 300 : 1);

  }

  function init() {

    var i, j;

    sound = oOptions.sound;

    dom = {
      node: oOptions.node,
      canvas: oOptions.node.querySelectorAll('.connecting-tape'),
      reels: oOptions.node.querySelectorAll('div.reel'),
      spokes: oOptions.node.querySelectorAll('div.spokes'),
      label: oOptions.node.querySelectorAll('div.label'),
      maskImages: oOptions.node.querySelectorAll('.image-mask'),
      blurNode: oOptions.node.querySelectorAll('.blur-image')
    }

    if (dom.canvas && dom.canvas.length) {
      dom.canvas = dom.canvas[0];
      initMask(function() {
        // force redraw
        setProgress(0, true);
      });
    } else {
      dom.canvas = null;
    }

    // images needing masking?
    if (dom.maskImages) {
      for (i=0, j=dom.maskImages.length; i<j; i++) {
        createMaskedImage(dom.maskImages[i]);
      }
    }

    // blur image?
    if (dom.blurNode && dom.blurNode.length) {
      dom.blurNode = dom.blurNode[0];
      createBlurImage(ready);
    } else {
      dom.blurNode = null;
      ready();
    }

    // controls
    controlHandler = new ControlHandler(dom, sound);

  }

  var reelStatus = [{
    borderWidth: null
  }, {
    borderWidth: null
  }];

  function setReelSize(reelCount, reel, size) {

    // return value: was an update applied?
    var newFrame = 0;

    // limit to between 0 and 1
    size = Math.min(1, Math.max(0, size));

    var borderWidth = Math.floor(borderMaxWidth*size);

    var margin;

    if (reelStatus[reelCount].borderWidth !== borderWidth) {

      reelStatus[reelCount].borderWidth = borderWidth;

      reel.style.borderWidth = borderWidth + 'px';

      margin = -(Math.floor(spoolWidth/2) + borderWidth) + 'px';

      reel.style.marginLeft = margin;

      reel.style.marginTop = margin;

      newFrame = 1;

    }

    return newFrame;

  }

  function deg2rad(degrees) {

    return (Math.PI/180)*degrees;

  }

  var tapeCache = {
    leftReel: {
      left: null
    },
    rightReel: {
      left: null
    }
  };

  function drawConnectingTape(canvas, progress, forceUpdate) {

    // draw a line of tape between the two reels, at angles relative to the amount of tape on each reel.

    var leftReelRadius = borderMaxWidth - (borderMaxWidth * progress);

    var rightReelRadius = (borderMaxWidth * progress);

    var bottomTapeOffset = scaleHeight(0.998);

    var leftReel = {
      left: Math.floor(scaleWidth(0.29) - (spoolWidth/2) - leftReelRadius) + 4,
      top: scaleHeight(0.42)
    };

    var guideRadius = 16;

    var rightReel = {
      left: Math.floor(scaleWidth(0.71) + (spoolWidth/2) + rightReelRadius) - 3,
      top: scaleHeight(0.42)
    };

    var leftGuide = {
      left: scaleWidth(0.11) - guideRadius,
      top: bottomTapeOffset - guideRadius*2
    };

    var rightGuide = {
      left: scaleWidth(0.89) - guideRadius,
      top: bottomTapeOffset
    };

    var bottomLeftPoint = {
      from: [leftGuide.left, leftGuide.top],
      to: [leftReel.left, leftReel.top]
    };

    var bottomRightPoint = {
      from: [rightGuide.left, rightGuide.top],
      to: [rightReel.left, rightReel.top]
    };

    var bottomMidPoint = {
      left: tapeWidth * 0.5,
      top: bottomTapeOffset
    };

    if (!forceUpdate && tapeCache.leftReel.left === leftReel.left && tapeCache.rightReel.left === rightReel.left) {
      // no change since last time.
      return false;
    }

    // otherwise, update everything.
    tapeCache.leftReel.left = leftReel.left;
    tapeCache.rightReel.left = rightReel.left;

    var context = canvas.getContext('2d');

    canvas.width = tapeWidth;
    canvas.height = tapeHeight;

    // context.lineWidth = 1;

    context.beginPath();

    // move to bottom middle
    context.moveTo(bottomMidPoint.left, bottomMidPoint.top);

    // -> left guide
    context.lineTo(bottomLeftPoint.from[0] + guideRadius, bottomLeftPoint.from[1] + guideRadius*2);

    // arc
    context.arc(bottomLeftPoint.from[0] + guideRadius, bottomLeftPoint.from[1] + guideRadius, guideRadius, deg2rad(90), deg2rad(180), false);

    // -> left reel
    context.lineTo(leftReel.left, leftReel.top);

    context.lineWidth = 0.5;

    // move to bottom middle
    context.moveTo(bottomMidPoint.left, bottomMidPoint.top);

    // -> right guide
    context.lineTo(bottomRightPoint.from[0] + guideRadius, bottomRightPoint.from[1]);

    // right side
    context.arc(bottomRightPoint.from[0] + guideRadius, bottomRightPoint.from[1] - guideRadius, guideRadius, deg2rad(90), deg2rad(0), true); // -30 on last for curve effect

    // -> right reel
    context.lineTo(rightReel.left, rightReel.top);

    context.lineWidth = 1;

    context.stroke();

    // apply the mask (only the circular areas around the tape)

    if (maskCanvas) {

      // set composite operation

      context.globalCompositeOperation = 'destination-out';

      context.drawImage(maskCanvas, 0, 0);

      context.globalCompositeOperation = null;

      // visibility check

      if (maskCanvasLoaded && !maskVisible) {

        maskVisible = true;

        canvas.style.visibility = 'visible';

      }

    }

  }

  function setReelSpeed(reel, speed) {

    // base speed plus a given amount based on speed (multiplier?)

  }

  function applyProgress(progress) {

    var newFrames = 0;

    setReelSpeed(dom.reels[0], progress);
    newFrames += setReelSize(0, dom.reels[0], 1-progress);
    newFrames += setReelSize(1, dom.reels[1], progress);

    return newFrames;

  }

  function setProgress(progress, forceUpdate) {

    var newFrames = 0;

    forceUpdate = forceUpdate || false;

    data.progress = progress;

    newFrames = applyProgress(progress);

    if ((newFrames || forceUpdate) && dom.canvas) {

      drawConnectingTape(dom.canvas, progress, forceUpdate);

    }

  }

  function start() {

    utils.css.remove(dom.node, css.stopped);
    utils.css.add(dom.node, css.playing);

  }

  function stop() {

    utils.css.remove(dom.node, css.playing);
    utils.css.add(dom.node, css.stopped);

  }

  return {

    refreshBlurImage: function(callback) {
      utils.css.remove(dom.node, css.dropin);
      utils.css.remove(dom.node, css.ready);
      return createBlurImage(function() {
        utils.css.add(dom.node, css.dropin);
        utils.css.add(dom.node, css.ready);
        readyComplete();
        if (callback) {
          callback(this);
        }
      });
    },
    dom: dom,
    init: init,
    setProgress: setProgress,
    start: start,
    stop: stop
    
  };

}

var tapeUIs = [];

function resetTapeUIs() {

  for (var i=tapeUIs.length; i--;) {
    tapeUIs[i].setProgress(0);
  }

}

var ignoreNextClick = false;

var dragHandler = (function() {

  var css,
      data,
      dom,
      events;

  function findPos(obj) {
    var curleft = curtop = 0;
    if (obj.offsetParent) {
      do {
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
      } while (obj = obj.offsetParent);
    }
    return [curleft, curtop];
  }

  css = {
    dragActive: 'dragging',
    dropActive: 'dropping'
  };

  data = {
    dragTarget: {
      node: null,
      blurNode: null,
      blurNodeContainer: null,
      x: null,
      y: null,
      lastX: null,
      lastY: null
    },
    mousedown: {
      x: null,
      y: null
    },
    drag: {
      xOffset: null,
      yOffset: null
    },
    background: {
      xOffset: -151,
      yOffset: -119
    }
  };

  events = {
    mousedown: function(e) {
      var target = data.dragTarget.node,
          clickTarget = e.target;
      if (!data.dragTarget.node) {
        return true;
      }
      // additional safety check
      if (clickTarget && clickTarget.tagName == 'INPUT') {
        ignoreNextClick = true;
        return true;
      }
      ignoreNextClick = false;
      var xy = findPos(target);
      data.dragTarget.x = xy[0];
      data.dragTarget.y = xy[1];
      data.mousedown.x = e.clientX;
      data.mousedown.y = e.clientY;
      data.drag.xOffset = data.mousedown.x - data.dragTarget.x;
      data.drag.yOffset = data.mousedown.y - data.dragTarget.y;
      utils.events.add(document, 'mousemove', events.mousemove);
      utils.events.add(document, 'mouseup', events.mouseup);
      e.preventDefault();
      return false;
    },
    mousemove: function(e) {
      var x, y,
          node = data.dragTarget.node,
          blurNode = data.dragTarget.blurNode;
      if (node) {
        x = (e.clientX - data.drag.xOffset);
        y = (e.clientY - data.drag.yOffset);
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        if (blurNode) {
          blurNode.style.marginLeft = -x + 'px';
          blurNode.style.marginTop = -y + 'px';
        }
        if (!ignoreNextClick) {
          ignoreNextClick = true;
          utils.css.add(data.dragTarget.node, css.dragActive);
        }
      }
    },
    mouseup: function(e) {
      utils.css.remove(data.dragTarget.node, css.dragActive);
      if (ignoreNextClick) {
        // remove drag work
        utils.css.add(data.dragTarget.node, css.dropActive);
        window.setTimeout(function() {
          utils.css.remove(data.dragTarget.node, css.dropActive);
        }, 500);
      }
      utils.events.remove(document, 'mousemove', events.mousemove);
      utils.events.remove(document, 'mouseup', events.mouseup);
      e.preventDefault();
      return false;
    }
    
  };

  function updateLastXY() {
    var target = data.dragTarget.node;
    var xy = findPos(target);
    data.dragTarget.lastX = xy[0];
    data.dragTarget.lastY = xy[1];
  }

  function addEvents() {
    if (data.dragTarget && data.dragTarget.node) {
      utils.events.add(data.dragTarget.node, 'mousedown', events.mousedown);
    }
  }

  function init() {
    data.dragTarget.node = document.querySelector('.tape.draggable');
    data.dragTarget.blurNode = document.querySelector('.tape.draggable .blur-image');
    addEvents();
  }

  return {
    data: data,
    init: init
  }

}());

var utils = (function() {

  var addEventHandler = (typeof window.addEventListener !== 'undefined' ? function(o, evtName, evtHandler) {
    return o.addEventListener(evtName,evtHandler,false);
  } : function(o, evtName, evtHandler) {
    o.attachEvent('on'+evtName,evtHandler);
  });

  var removeEventHandler = (typeof window.removeEventListener !== 'undefined' ? function(o, evtName, evtHandler) {
    return o.removeEventListener(evtName,evtHandler,false);
  } : function(o, evtName, evtHandler) {
    return o.detachEvent('on'+evtName,evtHandler);
  });

  var classContains = function(o,cStr) {
    return (typeof(o.className)!=='undefined'?o.className.match(new RegExp('(\s|^)'+cStr+'(\s|$)')):false);
  };

  var addClass = function(o,cStr) {
    if (!o || !cStr || classContains(o,cStr)) {
      return false;
    }
    o.className = (o.className?o.className+' ':'')+cStr;
  };

  var removeClass = function(o,cStr) {
    if (!o || !cStr || classContains(o,cStr)) {
      return false;
    }
    o.className = o.className.replace(new RegExp('( '+cStr+')|('+cStr+')','g'),'');
  };

/*
  var isChildOfNode = function(o,sNodeName) {
    if (!o || !o.parentNode) {
      return false;
    }
    sNodeName = sNodeName.toLowerCase();
    do {
      o = o.parentNode;
    } while (o && o.parentNode && o.nodeName.toLowerCase() !== sNodeName);
    return (o.nodeName.toLowerCase() === sNodeName ? o : null);
  };
*/

  return {
    css: {
      has: classContains,
      add: addClass,
      remove: removeClass
    },
/*
    dom: {
      isChildOfNode: this.isChildOfNode
    },
*/
    events: {
      add: addEventHandler,
      remove: removeEventHandler
    }
  }

}());

function ControlHandler(tapeUIDOM, soundObject) {

  var soundObject;

  var css, dom, events, eventMap, soundOK;

  // percentage to jump with each click of the rewind / fast-forward buttons
  var rewind_ffwd_offset = 0.033;

  dom = {
    oControls: null,
    play: null,
    rew: null,
    ffwd: null,
    stop: null
  };

  events = {
    mousedown: function(e) {
      // need <a>
      var target = e.target,
          className = e.target.className;
      if (soundOK && typeof eventMap[className] !== 'undefined') {
        eventMap[className](e);
        return events.stopEvent(e);
      }
    },
    stopEvent: function(e) {
      e.preventDefault();
      return false;
    },
    click: function(e) {
      // simple/dumb: just toggle the playstate of the tape.
      if (ignoreNextClick) {
        ignoreNextClick = false;
        return events.stopEvent(e);
      }
      var target = e.target,
          className = e.target.className;
      if (typeof eventMap[className] == 'undefined') {
        soundObject.togglePause();
      } else {
        return events.mousedown(e);
      }
    }
  };

  eventMap = {
    'play': function(e) {
      soundObject.play();
    },
    'rew': function() {
      // rewind
      var newPosition = Math.max(0, soundObject.position - soundObject.duration * rewind_ffwd_offset);
      if (soundObject.duration) {
        soundObject.setPosition(newPosition);
        // if not playing, force update?
        tapeUIs[0].setProgress(newPosition/soundObject.duration);
      }
    },
    'ffwd': function() {
      // fast-forward
      var newPosition;
      if (soundObject.duration) {
        newPosition = Math.min(soundObject.duration, soundObject.position + soundObject.duration * rewind_ffwd_offset);
        soundObject.setPosition(newPosition);
      }
    },
    'stop': function() {
      // equivalent to digital pause
      soundObject.pause();
    }
  };

  function addEvents() {
    utils.events.add(dom.o, 'mousedown', events.mousedown);
    utils.events.add(tapeUIDOM.node, 'click', events.click);
  }

  function init() {
    soundOK = soundManager.ok();
    dom.o = tapeUIDOM.node.querySelector('.controls');
    dom.play = dom.o.querySelector('.play');
    dom.rewind = dom.o.querySelector('.rew');
    dom.ffwd = dom.o.querySelector('.ffwd');
    dom.stop = dom.o.querySelector('.stop');
    addEvents();
  }

  init();

}

function init() {

  var hasCanvas = (typeof document.createElement('canvas').getContext !== 'undefined');

  if (!hasCanvas) {
    // assume a crap browser (e.g., IE 8.)
    return false;
  }

  var tapes,
      i, s;

  dragHandler.init();

  function genericStart() {
    for (var i=tapeUIs.length; i--;) {
      tapeUIs[i].start();
    }
  }

  function genericStop() {
    for (var i=tapeUIs.length; i--;) {
      tapeUIs[i].stop();
    }
  }

  if (soundManager.ok()) {

    s = soundManager.createSound({
      id: 'tapeSound',
      url: 'http://freshly-ground.com/data/audio/sm2/Chill With Schill (Summer 2012 Session Excerpt).mp3',
      multiShot: false,
      whileplaying: function() {
        for (var i=tapeUIs.length; i--;) {
          // console.log(this.position, this.durationEstimate);
          tapeUIs[i].setProgress(this.position/this.durationEstimate);
        }
      },
      onplay: genericStart,
      onfinish: genericStop,
      onpause: genericStop,
      onresume: genericStart
    });

  }

  tapes = document.querySelectorAll('div.tape');

  for (i=tapes.length; i--;) {
    tapeUIs.push(new TapeUI({
      node: tapes[i],
      sound: s
    }));
    tapeUIs[tapeUIs.length-1].init();
  }

  resetTapeUIs();

}

function delayInit() {

  var loader = document.getElementById('tape-loader');

  if (loader) {
    loader.className = 'visible';
  }

  window.setTimeout(function() {
    init();
  }, 20);
}

soundManager.setup({
  url: '../../swf/',
  flashVersion: 9,
  useHighPerformance: true,
  preferFlash: false,
  html5PollingInterval: 50,
  onready: delayInit,
  ontimeout: delayInit
});

// interface
window.tapeUIs = tapeUIs;

}(window));
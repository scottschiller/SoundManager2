/*

  SoundManager 2 Demo: 360-degree / "donut player"
  ------------------------------------------------

  http://schillmania.com/projects/soundmanager2/

  * Beta-ish warning: Subject to flux. *

  An inline player with a circular UI.
  Based on the original SM2 inline player.
  Inspired by Apple's preview feature in the
  iTunes music store (iPhone), among others.

  Requires SoundManager 2 Javascript API.
  Also uses Bernie's Better Animation Class (BSD):
  http://www.berniecode.com/writing/animator.html

*/

function ThreeSixtyPlayer() {
  var self = this;
  var pl = this;
  var sm = soundManager; // soundManager instance
  var isIE = (navigator.userAgent.match(/msie/i));
  var isOpera = (navigator.userAgent.match(/opera/i));
  var isSafari = (navigator.userAgent.match(/safari/i));
  var isChrome = (navigator.userAgent.match(/chrome/i));
  var isFirefox = (navigator.userAgent.match(/firefox/i));
  this.excludeClass = '360-exclude'; // CSS class for ignoring MP3 links

  this.links = [];
  this.sounds = [];
  this.soundsByURL = [];
  this.indexByURL = [];
  this.lastSound = null;
  this.soundCount = 0;
  this.oUITemplate = null;
  this.oUIImageMap = null;
  this.vuMeter = null;

  this.config = {

    playNext: false,   // stop after one sound, or play through list until end
    autoPlay: false,   // start playing the first sound right away
    loadRingColor: '#ccc', // how much has loaded
    playRingColor: '#000', // how much has played
    backgroundRingColor: '#eee', // color shown underneath load + play ("not yet loaded" color)

    // optional segment/annotation (metadata) stuff..
    segmentRingColor: 'rgba(255,255,255,0.33)', // metadata/annotation (segment) colors
    segmentRingColorAlt: 'rgba(0,0,0,0.1)',
    loadRingColorMetadata: '#ddd', // "annotations" load color
    playRingColorMetadata: 'rgba(96,160,224,0.99)', // how much has played when metadata is present
    playRingColorMetadata: 'rgba(128,192,256,0.9)', // how much has played when metadata is present

    circleDiameter: null, // set dynamically according to values from CSS
    circleRadius: null,
    imageRoot: '', // image path to prepend for transparent .GIF - eg. /images/
    animDuration: 500,
    animTransition: Animator.tx.bouncy, // http://www.berniecode.com/writing/animator.html
    showHMSTime: false, // hours:minutes:seconds vs. seconds-only
    scaleFont: false,  // also set the font size (if possible) while animating the circle

    // optional: spectrum or EQ graph in canvas (not supported in IE, too slow via ExCanvas)
    useWaveformData: false,
    waveformDataColor: '#0099ff',
    waveformDataDownsample: 3, // use only one in X (of a set of 256 values) - 1 means all 256
    waveformDataOutside: false,
    waveformDataConstrain: false, // if true, +ve values only - keep within inside circle
    waveformDataLineRatio: 0.64,

    // "spectrum frequency" option
    useEQData: false,
    eqDataColor: '#339933',
    eqDataDownsample: 4, // use only one in X (of 256 values)
    eqDataOutside: true,
    eqDataLineRatio: 0.54,

    // enable "amplifier" (canvas pulses like a speaker) effect
    usePeakData: true,
    peakDataColor: '#ff33ff',
    peakDataOutside: true,
    peakDataLineRatio: 0.5,

    useAmplifier: true, // "pulse" like a speaker

    fontSizeMax: null, // set according to CSS

	useFavIcon: false // Experimental (also requires usePeakData: true).. Try to draw a "VU Meter" in the favicon area, if browser supports it (Firefox + Opera as of 2009)

  }

  this.css = {
    // CSS class names appended to link during various states
    sDefault: 'sm2_link', // default state
    sBuffering: 'sm2_buffering',
    sPlaying: 'sm2_playing',
    sPaused: 'sm2_paused'
  }

  this.addEventHandler = function(o,evtName,evtHandler) {
    typeof(attachEvent)=='undefined'?o.addEventListener(evtName,evtHandler,false):o.attachEvent('on'+evtName,evtHandler);
  }

  this.removeEventHandler = function(o,evtName,evtHandler) {
    typeof(attachEvent)=='undefined'?o.removeEventListener(evtName,evtHandler,false):o.detachEvent('on'+evtName,evtHandler);
  }

  this.hasClass = function(o,cStr) {
	return (typeof(o.className)!='undefined'?o.className.match(new RegExp('(\\s|^)'+cStr+'(\\s|$)')):false);
  }

  this.addClass = function(o,cStr) {
    if (!o || !cStr || self.hasClass(o,cStr)) return false;
    o.className = (o.className?o.className+' ':'')+cStr;
  }

  this.removeClass = function(o,cStr) {
    if (!o || !cStr || !self.hasClass(o,cStr)) return false;
    o.className = o.className.replace(new RegExp('( '+cStr+')|('+cStr+')','g'),'');
  }

  this.getElementsByClassName = function(className,tagNames,oParent) {
    var doc = (oParent||document);
    var matches = [];
    var i,j;
    var nodes = [];
    if (typeof tagNames != 'undefined' && typeof tagNames != 'string') {
      for (i=tagNames.length; i--;) {
        if (!nodes || !nodes[tagNames[i]]) {
          nodes[tagNames[i]] = doc.getElementsByTagName(tagNames[i]);
        }
      }
    } else if (tagNames) {
      nodes = doc.getElementsByTagName(tagNames);
    } else {
      nodes = doc.all||doc.getElementsByTagName('*');
    }
    if (typeof(tagNames)!='string') {
      for (i=tagNames.length; i--;) {
        for (j=nodes[tagNames[i]].length; j--;) {
          if (self.hasClass(nodes[tagNames[i]][j],className)) {
            matches.push(nodes[tagNames[i]][j]);
          }
        }
      }
    } else {
      for (i=0; i<nodes.length; i++) {
        if (self.hasClass(nodes[i],className)) {
          matches.push(nodes[i]);
        }
      }
    }
    return matches;
  }

  this.getParentByNodeName = function(oChild,sParentNodeName) {
    if (!oChild || !sParentNodeName) return false;
    sParentNodeName = sParentNodeName.toLowerCase();
    while (oChild.parentNode && sParentNodeName != oChild.parentNode.nodeName.toLowerCase()) {
      oChild = oChild.parentNode;
    }
    return (oChild.parentNode && sParentNodeName == oChild.parentNode.nodeName.toLowerCase()?oChild.parentNode:null);
  }

  this.getParentByClassName = function(oChild,sParentClassName) {
    if (!oChild || !sParentClassName) return false;
    while (oChild.parentNode && !self.hasClass(oChild.parentNode,sParentClassName)) {
      oChild = oChild.parentNode;
    }
    return (oChild.parentNode && self.hasClass(oChild.parentNode,sParentClassName)?oChild.parentNode:null);
  }

  this.getSoundByURL = function(sURL) {
    return (typeof self.soundsByURL[sURL] != 'undefined'?self.soundsByURL[sURL]:null);
  }

  this.isChildOfNode = function(o,sNodeName) {
    if (!o || !o.parentNode) {
      return false;
    }
    sNodeName = sNodeName.toLowerCase();
    do {
      o = o.parentNode;
    } while (o && o.parentNode && o.nodeName.toLowerCase() != sNodeName);
    return (o && o.nodeName.toLowerCase() == sNodeName?o:null);
  }

  this.isChildOfClass = function(oChild,oClass) {
    if (!oChild || !oClass) return false;
    while (oChild.parentNode && !self.hasClass(oChild,oClass)) {
      oChild = self.findParent(oChild);
    }
    return (self.hasClass(oChild,oClass));
  }

  this.findParent = function(o) {
    if (!o || !o.parentNode) return false;
    o = o.parentNode;
    if (o.nodeType == 2) {
      while (o && o.parentNode && o.parentNode.nodeType == 2) {
        o = o.parentNode;
      }
    }
    return o;
  }

  this.getStyle = function(o,sProp) {
	// http://www.quirksmode.org/dom/getstyles.html
	try {
	  if (o.currentStyle) {
	    return o.currentStyle[sProp];
      } else if (window.getComputedStyle) {
	    return document.defaultView.getComputedStyle(o,null).getPropertyValue(sProp);
	  }
	} catch(e) {
	  // oh well	
	}
	return null;
  }

  this.findXY = function(obj) {
    var curleft = 0;
    var curtop = 0;
    do {
	  curleft += obj.offsetLeft;
	  curtop += obj.offsetTop;
	} while (obj = obj.offsetParent);
    return [curleft,curtop];
  }

  this.getMouseXY = function(e) {
    // http://www.quirksmode.org/js/events_properties.html
    e = e?e:event;
    if (e.pageX || e.pageY) {
	  return [e.pageX,e.pageY];
    } else if (e.clientX || e.clientY) {
	  return [e.clientX+self.getScrollLeft(),e.clientY+self.getScrollTop()];
    }
  }

  this.getScrollLeft = function() {
    return (document.body.scrollLeft+document.documentElement.scrollLeft);
  }

  this.getScrollTop = function() {
    return (document.body.scrollTop+document.documentElement.scrollTop);
  }

  this.events = {

    // handlers for sound events as they're started/stopped/played

    play: function() {
      pl.removeClass(this._360data.oUIBox,this._360data.className);
      this._360data.className = pl.css.sPlaying;
      pl.addClass(this._360data.oUIBox,this._360data.className);
	  self.fanOut(this);
    },

    stop: function() {
      pl.removeClass(this._360data.oUIBox,this._360data.className);
      this._360data.className = '';
	  self.fanIn(this);
    },

    pause: function() {
      pl.removeClass(this._360data.oUIBox,this._360data.className);
      this._360data.className = pl.css.sPaused;
      pl.addClass(this._360data.oUIBox,this._360data.className);
    },

    resume: function() {
      pl.removeClass(this._360data.oUIBox,this._360data.className);
      this._360data.className = pl.css.sPlaying;
      pl.addClass(this._360data.oUIBox,this._360data.className);      
    },

    finish: function() {
      pl.removeClass(this._360data.oUIBox,this._360data.className);
      this._360data.className = '';
      // self.clearCanvas(this._360data.oCanvas);
      this._360data.didFinish = true; // so fan draws full circle
	  self.fanIn(this);
      if (pl.config.playNext) {
        var nextLink = (pl.indexByURL[this._360data.oLink.href]+1);
        if (nextLink<pl.links.length) {
          pl.handleClick({'target':pl.links[nextLink]});
        }
      }
    },

	whileloading: function() {
      if (this.paused) {
        self.updatePlaying.apply(this);
      }
	},
	
	whileplaying: function() {
      self.updatePlaying.apply(this);
      this._360data.fps++;
	},

     bufferchange: function() {
       if (this.isBuffering) {
         pl.addClass(this._360data.oUIBox,pl.css.sBuffering);
       } else {
         pl.removeClass(this._360data.oUIBox,pl.css.sBuffering);
       }
     }

  }

  this.stopEvent = function(e) {
   if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof event != 'undefined' && typeof event.returnValue != 'undefined') {
      event.returnValue = false;
    }
    return false;
  }

  this.getTheDamnLink = (isIE)?function(e) {
    // I really didn't want to have to do this.
    return (e && e.target?e.target:window.event.srcElement);
  }:function(e) {
    return e.target;
  }

  this.handleClick = function(e) {
    // a sound link was clicked
    if (e.button > 1) {
	  // only catch left-clicks
	  return true;
    }
    var o = self.getTheDamnLink(e);
    if (o.nodeName.toLowerCase() != 'a') {
      o = self.isChildOfNode(o,'a');
      if (!o) return true;
    }
    if (!self.isChildOfClass(o,'ui360')) {
	  // not a link we're interested in
	  return true;
    }
    var sURL = o.getAttribute('href');
    if (!o.href || !sm.canPlayURL(o.href) || self.hasClass(o,self.excludeClass)) {
      return true; // pass-thru for non-MP3/non-links
    }
    sm._writeDebug('handleClick()');
    var soundURL = (o.href);
    var thisSound = self.getSoundByURL(soundURL);
    if (thisSound) {
      // already exists
      if (thisSound == self.lastSound) {
        // and was playing (or paused)
        thisSound.togglePause();
      } else {
        // different sound
        thisSound.togglePause(); // start playing current
        sm._writeDebug('sound different than last sound: '+self.lastSound.sID);
        if (self.lastSound) {
		  self.stopSound(self.lastSound);
		}
      }
    } else {
	  // append some dom shiz
	
      // create sound
      thisSound = sm.createSound({
       id:'ui360Sound'+(self.soundCount++),
       url:soundURL,
       onplay:self.events.play,
       onstop:self.events.stop,
       onpause:self.events.pause,
       onresume:self.events.resume,
       onfinish:self.events.finish,
       onbufferchange:self.events.bufferchange,
	   whileloading:self.events.whileloading,
	   whileplaying:self.events.whileplaying
      });
      var oContainer = o.parentNode;
      // tack on some custom data

      thisSound._360data = {
	    oUI360: self.getParentByClassName(o,'ui360'), // the (whole) entire container
        oLink: o, // DOM node for reference within SM2 object event handlers
        className: self.css.sPlaying,
        oUIBox: self.getElementsByClassName('sm2-360ui','div',oContainer)[0],
        oCanvas: self.getElementsByClassName('sm2-canvas','canvas',oContainer)[0],
        oButton: self.getElementsByClassName('sm2-360btn','img',oContainer)[0],
        oTiming: self.getElementsByClassName('sm2-timing','div',oContainer)[0],
        oCover: self.getElementsByClassName('sm2-cover','div',oContainer)[0],
        lastTime: null,
        didFinish: null,
        pauseCount:0,
        radius:0,
        amplifier: (self.config.usePeakData?0.9:1), // TODO: x1 if not being used, else use dynamic "how much to amplify by" value
		radiusMax: self.config.circleDiameter*0.175, // circle radius
		width:0,
		widthMax: self.config.circleDiameter*0.4, // width of the outer ring
		lastValues: {
		  bytesLoaded: 0,
		  bytesTotal: 0,
		  position: 0,
		  durationEstimate: 0
		}, // used to track "last good known" values before sound finish/reset for anim
		animating: false,
		oAnim: new Animator({
		  duration: self.config.animDuration,
		  transition:self.config.animTransition,
		  onComplete: function() {
			// var thisSound = this;
			// thisSound._360data.didFinish = false; // reset full circle
  		  }
		}),
		oAnimProgress: function(nProgress) {
		  var thisSound = this;
		  thisSound._360data.radius = parseInt(thisSound._360data.radiusMax*thisSound._360data.amplifier*nProgress);
		  thisSound._360data.width = parseInt(thisSound._360data.widthMax*thisSound._360data.amplifier*nProgress);
          if (self.config.scaleFont && self.config.fontSizeMax != null) {
		    thisSound._360data.oTiming.style.fontSize = parseInt(Math.max(1,self.config.fontSizeMax*nProgress))+'px';
		    thisSound._360data.oTiming.style.opacity = nProgress;
		  }
		  if (thisSound.paused || thisSound.playState == 0 || thisSound._360data.lastValues.bytesLoaded == 0 || thisSound._360data.lastValues.position == 0) {
            self.updatePlaying.apply(thisSound);
          }
		},
		fps: 0
      };

      // "Metadata" (annotations)
      if (typeof self.Metadata != 'undefined' && self.getElementsByClassName('metadata','div',thisSound._360data.oUI360).length) {
        thisSound._360data.metadata = new self.Metadata(thisSound,self);
      }

	  // set the cover width/height to match the canvas
	  thisSound._360data.oCover.style.width = self.config.circleDiameter+'px';
	  thisSound._360data.oCover.style.height = self.config.circleDiameter+'px';

	  // minimize ze font
	  if (self.config.scaleFont && self.config.fontSizeMax != null) {
	    thisSound._360data.oTiming.style.fontSize = '1px';
	  }

	  // set up ze animation
	  thisSound._360data.oAnim.addSubject(thisSound._360data.oAnimProgress,thisSound);

	  // animate the radius out nice
	  self.refreshCoords(thisSound);

	  self.updatePlaying.apply(thisSound);

      self.soundsByURL[soundURL] = thisSound;
      self.sounds.push(thisSound);
      if (self.lastSound) {
	    self.stopSound(self.lastSound);
	  }
      thisSound.play();
    }

    self.lastSound = thisSound; // reference for next call

    if (typeof e != 'undefined' && typeof e.preventDefault != 'undefined') {
      e.preventDefault();
    } else if (typeof event != 'undefined') {
      event.returnValue = false;
    }
    return false;
  }

  this.fanOut = function(oSound) {
	 var thisSound = oSound;
	 if (thisSound._360data.animating == 1) {
	   return false;	
	 }
	 thisSound._360data.animating = 0;
	 soundManager._writeDebug('fanOut: '+thisSound.sID+': '+thisSound._360data.oLink.href);
	 thisSound._360data.oAnim.seekTo(1); // play to end
	 window.setTimeout(function() {
	   // oncomplete hack
	   thisSound._360data.animating = 0;
	 },self.config.animDuration+20);
  }

  this.fanIn = function(oSound) {
	 var thisSound = oSound;
	 if (thisSound._360data.animating == -1) {
	   return false;	
	 }
	 thisSound._360data.animating = -1;
	 soundManager._writeDebug('fanIn: '+thisSound.sID+': '+thisSound._360data.oLink.href);
	// massive hack
	 thisSound._360data.oAnim.seekTo(0); // play to end
	window.setTimeout(function() {
	 // reset full 360 fill after animation has completed (oncomplete hack)
	  thisSound._360data.didFinish = false;
	  thisSound._360data.animating = 0;
	  self.resetLastValues(thisSound);
	},self.config.animDuration+20);

  }

  this.resetLastValues = function(oSound) {
    var oData = oSound._360data;
    oData.lastValues.position = 0;
    // oData.lastValues.bytesLoaded = 0; // will likely be cached, if file is small
    // oData.lastValues.bytesTotal = 0;
    // oData.lastValues.durationEstimate = 0;
  }

  this.refreshCoords = function(thisSound) {
    thisSound._360data.canvasXY = self.findXY(thisSound._360data.oCanvas);
    // thisSound._360data.canvasMid = [Math.floor(thisSound._360data.oCanvas.offsetWidth/2), Math.floor(thisSound._360data.oCanvas.offsetHeight/2)]; // doesn't work in IE, w/h are wrong
    thisSound._360data.canvasMid = [self.config.circleRadius,self.config.circleRadius];
    thisSound._360data.canvasMidXY = [thisSound._360data.canvasXY[0]+thisSound._360data.canvasMid[0], thisSound._360data.canvasXY[1]+thisSound._360data.canvasMid[1]];
  }

  this.stopSound = function(oSound) {
	soundManager._writeDebug('stopSound: '+oSound.sID);
    soundManager.stop(oSound.sID);
    soundManager.unload(oSound.sID);
  }

  this.buttonClick = function(e) {
    var o = e?(e.target?e.target:e.srcElement):event.srcElement;
    self.handleClick({target:self.getParentByClassName(o,'sm2-360ui').nextSibling}); // link next to the nodes we inserted
    return false;
  }

  this.buttonMouseDown = function(e) {
	// user might decide to drag from here
	// watch for mouse move
	document.onmousemove = function(e) {
	  // should be boundary-checked, really (eg. move 3px first?)
	  self.mouseDown(e);
	}
	self.stopEvent(e);
	return false;
  }

  this.mouseDown = function(e) { 
    if (!self.lastSound) {
	  self.stopEvent(e);
      return false;	
    }
    var thisSound = self.lastSound;
    // just in case, update coordinates (maybe the element moved since last time.)
    self.refreshCoords(thisSound);
    var oData = self.lastSound._360data;
    self.addClass(oData.oUIBox,'sm2_dragging');
    oData.pauseCount = (self.lastSound.paused?1:0);
    // self.lastSound.pause();
    self.mmh(e?e:event);
    document.onmousemove = self.mmh;
    document.onmouseup = self.mouseUp;
    self.stopEvent(e);
    return false;
  }

  this.mouseUp = function(e) {
    var oData = self.lastSound._360data;
    self.removeClass(oData.oUIBox,'sm2_dragging');
    if (oData.pauseCount == 0) {
      self.lastSound.resume();
    }
    document.onmousemove = null;
    document.onmouseup = null;
  }

  var fullCircle = 360;

  this.mmh = function(e) {
	if (typeof e == 'undefined') {
	  var e = event;
	}
    var oSound = self.lastSound;
    var coords = self.getMouseXY(e);
    var x = coords[0];
 	var y = coords[1];
    var deltaX = x-oSound._360data.canvasMidXY[0];
    var deltaY = y-oSound._360data.canvasMidXY[1];
    var angle = Math.floor(fullCircle-(self.rad2deg(Math.atan2(deltaX,deltaY))+180));
    oSound.setPosition(oSound.durationEstimate*(angle/fullCircle));
    self.stopEvent(e);
    return false;
  }

  // assignMouseDown();

  this.drawSolidArc = function(oCanvas, color, radius, width, radians, startAngle, noClear) {

    // thank you, http://www.snipersystems.co.nz/community/polarclock/tutorial.html

    var x = radius;
    var y = radius;

    var canvas = oCanvas;

    if (canvas.getContext){
      // use getContext to use the canvas for drawing
      var ctx = canvas.getContext('2d');
    }

    // var startAngle = 0;
    var oCanvas = ctx;

    if (!noClear) {
      self.clearCanvas(canvas);
    }
    // ctx.restore();

    if (color) {
	  ctx.fillStyle = color;
    } else {
	  // ctx.fillStyle = 'black';
    }

    oCanvas.beginPath();

    if (isNaN(radians)) {
	  radians = 0;
	}

    var innerRadius = radius-width;
	var doesntLikeZero = (isOpera || isSafari); // safari 4 doesn't actually seem to mind.

    if (!doesntLikeZero || (doesntLikeZero && radius > 0)) {
      oCanvas.arc(0, 0, radius, startAngle, radians, false);
      var endPoint = self.getArcEndpointCoords(innerRadius, radians);
      oCanvas.lineTo(endPoint.x, endPoint.y);
      oCanvas.arc(0, 0, innerRadius, radians, startAngle, true);
      oCanvas.closePath();
      oCanvas.fill();
    }

  }

  this.getArcEndpointCoords = function(radius, radians) {
    return {
      x: radius * Math.cos(radians), 
      y: radius * Math.sin(radians)
    };
  }


this.deg2rad = function(nDeg) {
  return (nDeg * Math.PI/180);
}

this.rad2deg = function(nRad) {
  return (nRad * 180/Math.PI);
}

this.getTime = function(nMSec,bAsString) {
  // convert milliseconds to mm:ss, return as object literal or string
  var nSec = Math.floor(nMSec/1000);
  var min = Math.floor(nSec/60);
  var sec = nSec-(min*60);
  // if (min == 0 && sec == 0) return null; // return 0:00 as null
  return (bAsString?(min+':'+(sec<10?'0'+sec:sec)):{'min':min,'sec':sec});
}

this.clearCanvas = function(oCanvas) {
    var canvas = oCanvas;
    var ctx = null;
    if (canvas.getContext){
      // use getContext to use the canvas for drawing
      ctx = canvas.getContext('2d');
    }
    var width = canvas.offsetWidth;
    var height = canvas.offsetHeight;
    ctx.clearRect(-(width/2), -(height/2), width, height);
}


var fullCircle = (isOpera||isChrome?359.9:360); // I dunno what Opera doesn't like about this.

this.updatePlaying = function() {
  if (this.bytesLoaded) {
    this._360data.lastValues.bytesLoaded = this.bytesLoaded;
    this._360data.lastValues.bytesTotal = this.bytesTotal;
  }
  if (this.position) {
    this._360data.lastValues.position = this.position;	
  }
  if (this.durationEstimate) {
    this._360data.lastValues.durationEstimate = this.durationEstimate;
  }	

  self.drawSolidArc(this._360data.oCanvas,self.config.backgroundRingColor,this._360data.width,this._360data.radius,self.deg2rad(fullCircle),false);

  self.drawSolidArc(this._360data.oCanvas,(this._360data.metadata?self.config.loadRingColorMetadata:self.config.loadRingColor),this._360data.width,this._360data.radius,self.deg2rad(fullCircle*(this._360data.lastValues.bytesLoaded/this._360data.lastValues.bytesTotal)),0,true);

  if (this._360data.lastValues.position != 0) {
    // don't draw if 0 (full black circle in Opera)
    self.drawSolidArc(this._360data.oCanvas,(this._360data.metadata?self.config.playRingColorMetadata:self.config.playRingColor),this._360data.width,this._360data.radius,self.deg2rad((this._360data.didFinish==1?fullCircle:fullCircle*(this._360data.lastValues.position/this._360data.lastValues.durationEstimate))),0,true);
  }

  // metadata goes here
  if (this._360data.metadata) {
    this._360data.metadata.events.whileplaying();
  }

  var timeNow = (self.config.showHMSTime?self.getTime(this.position,true):parseInt(this.position/1000));

  if (timeNow != this._360data.lastTime) {
    this._360data.lastTime = timeNow;
    this._360data.oTiming.innerHTML = timeNow;
  }

  // draw spectrum, if applicable
  if (!isIE) { // IE can render maybe 3 or 4 FPS when including the wave/EQ, so don't bother.
    self.updateWaveform(this);
    // self.updateWaveformOld(this);
  }

  if (self.config.useFavIcon && self.vuMeter) {
    self.vuMeter.updateVU(this);
  }

}

  this.updateWaveform = function(oSound) {

    if ((!self.config.useWaveformData && !self.config.useEQData) || (!sm.features.waveformData && !sm.features.eqData)) {
      // feature not enabled..
      return false;
    }

    if (!oSound.waveformData.left.length && !oSound.eqData.length && !oSound.peakData.left) {
      // no data (or errored out/paused/unavailable?)
      return false;
    }

	 /* use for testing the data */
	 /*
	  for (i=0; i<256; i++) {
	    oSound.eqData[i] = 1-(i/256);
	  }
	 */

    var oCanvas = oSound._360data.oCanvas.getContext('2d');
    var offX = 0;
    var offY = parseInt(self.config.circleDiameter/2);
    var scale = offY/2; // Y axis (+/- this distance from 0)
    var lineWidth = Math.floor(self.config.circleDiameter-(self.config.circleDiameter*0.175)/(self.config.circleDiameter/255)); // width for each line
    lineWidth = 1;
    var lineHeight = 1;
    var thisY = 0;
    var offset = offY;

    if (self.config.useWaveformData) {
      // raw waveform
	  var downSample = self.config.waveformDataDownsample; // only sample X in 256 (greater number = less sample points)
	  downSample = Math.max(1,downSample); // make sure it's at least 1
	  var dataLength = 256;
	  var sampleCount = (dataLength/downSample);
	  var startAngle = 0;
	  var endAngle = 0;
	  var waveData = null;
	  var innerRadius = (self.config.waveformDataOutside?1:(self.config.waveformDataConstrain?0.5:0.565));
	  var scale = (self.config.waveformDataOutside?0.7:0.75);
	  var perItemAngle = self.deg2rad((360/sampleCount)*self.config.waveformDataLineRatio); // 0.85 = clean pixel lines at 150? // self.deg2rad(360*(Math.max(1,downSample-1))/sampleCount);
	  for (var i=0; i<dataLength; i+=downSample) {
	    startAngle = self.deg2rad(360*(i/(sampleCount)*1/downSample)); // +0.67 - counter for spacing
	    endAngle = startAngle+perItemAngle;
	    waveData = oSound.waveformData.left[i];
	    if (waveData<0 && self.config.waveformDataConstrain) {
		  waveData = Math.abs(waveData);
	    }
	    self.drawSolidArc(oSound._360data.oCanvas,self.config.waveformDataColor,oSound._360data.width*innerRadius,oSound._360data.radius*scale*1.25*waveData,endAngle,startAngle,true);
	  }
	}
	
	if (self.config.useEQData) {
	  // EQ spectrum
	  var downSample = self.config.eqDataDownsample; // only sample N in 256
      var yDiff = 0;
	  downSample = Math.max(1,downSample); // make sure it's at least 1
	  var eqSamples = 192; // drop the last 25% of the spectrum (>16500 Hz), most stuff won't actually use it.
	  var sampleCount = (eqSamples/downSample);
	  var innerRadius = (self.config.eqDataOutside?1:0.565);
	  var direction = (self.config.eqDataOutside?-1:1);
	  var scale = (self.config.eqDataOutside?0.5:0.75);
	  var startAngle = 0;
	  var endAngle = 0;
	  var perItemAngle = self.deg2rad((360/sampleCount)*self.config.eqDataLineRatio); // self.deg2rad(360/(sampleCount+1));
	  var playedAngle = self.deg2rad((oSound._360data.didFinish==1?360:360*(oSound._360data.lastValues.position/oSound._360data.lastValues.durationEstimate)));
	  var j=0;
	  var iAvg = 0;
      for (var i=0; i<eqSamples; i+=downSample) {
	    startAngle = self.deg2rad(360*(i/eqSamples));
	    endAngle = startAngle+perItemAngle;
   	    self.drawSolidArc(oSound._360data.oCanvas,(endAngle>playedAngle?self.config.eqDataColor:self.config.playRingColor),oSound._360data.width*innerRadius,oSound._360data.radius*scale*(oSound.eqData.left[i]*direction),endAngle,startAngle,true);

      }
    }

    if (self.config.usePeakData) {
      if (!oSound._360data.animating) {
        var nPeak = (oSound.peakData.left||oSound.peakData.right);
		// GIANT HACK: use EQ spectrum data for bass frequencies
		var eqSamples = 3;
		for (var i=0; i<eqSamples; i++) {
		  nPeak = (nPeak||oSound.eqData[i]);
		}
        oSound._360data.amplifier = (self.config.useAmplifier?(0.9+(nPeak*0.1)):1);
        oSound._360data.radiusMax = self.config.circleDiameter*0.175*oSound._360data.amplifier;
        oSound._360data.widthMax = self.config.circleDiameter*0.4*oSound._360data.amplifier;
        oSound._360data.radius = parseInt(oSound._360data.radiusMax*oSound._360data.amplifier);
        oSound._360data.width = parseInt(oSound._360data.widthMax*oSound._360data.amplifier);
      }
    }

  }

  this.updateWaveformOld = function(oSound) {

    if ((!self.config.useWaveformData && !self.config.useEQData && !self.config.usePeakData) || (!sm.features.waveformData && !sm.features.eqData && !sm.features.peakData)) {
      // feature not enabled..
      return false;
    }

    if (!oSound.waveformData.left.length && !oSound.eqData.length && !oSound.peakData.left.length) {
      // no data (or errored out/paused/unavailable?)
      return false;
    }

    var oCanvas = oSound._360data.oCanvas.getContext('2d');
    var offX = 0;
    var offY = parseInt(self.config.circleDiameter*2/3);
    var scale = offY*1/3; // Y axis (+/- this distance from 0)
    var downSample = 1;
    downSample = Math.max(1,downSample);
    var j = oSound.waveformData.left.length;
    var lineWidth = Math.max(1,((j*1/downSample)/self.config.circleDiameter));
    var lineHeight = scale*2.5;
    var thisY = 0;
    var offset = offY;
	var rotateDeg = -90;
    oCanvas.rotate(self.deg2rad(rotateDeg*-1)); // compensate for arc starting at EAST // http://stackoverflow.com/questions/319267/tutorial-for-html-canvass-arc-function
    oCanvas.translate(-self.config.circleRadius,-self.config.circleRadius);

    if (self.config.useWaveformData) {
	  for (var i=0; i<j; i+=downSample) {
	    thisY = offY+(oSound.waveformData.left[i]*scale);
	    oCanvas.fillRect((i/j*(self.config.circleDiameter-lineWidth)+1),thisY,lineWidth,lineHeight);
	  }
	} else {
	  // EQ spectrum
      var offset = 9;
      var yDiff = 0;
      for (var i=0; i<128; i+=4) {
	    yDiff = oSound.eqData[i]*scale;
	    oCanvas.fillRect(i/128*(self.config.circleDiameter-4),self.config.circleDiameter-yDiff,lineWidth*3,yDiff);
      }
    }

    // finished drawing..
    oCanvas.translate(self.config.circleRadius,self.config.circleRadius);
    oCanvas.rotate(self.deg2rad(rotateDeg)); // compensate for arc starting at EAST

  }

  this.callbackCount = 0;
  this.peakDataHistory = [];

  this.getUIHTML = function() {
	return [
	 '<canvas class="sm2-canvas" width="'+self.config.circleDiameter+'" height="'+self.config.circleDiameter+'"></canvas>',
	 ' <img src="'+self.config.imageRoot+'empty.gif" class="sm2-360btn sm2-360btn-default" style="border:none" />', // note use of imageMap, edit or remove if you use a different-size image.
	 ' <div class="sm2-timing'+(navigator.userAgent.match(/safari/i)?' alignTweak':'')+'"></div>', // + Ever-so-slight Safari horizontal alignment tweak
	 ' <div class="sm2-cover"></div>'
	];
  }

  this.init = function() {
    sm._writeDebug('threeSixtyPlayer.init()');
    var oItems = self.getElementsByClassName('ui360','div');
    var oLinks = [];

    for (var i=0,j=oItems.length; i<j; i++) {
	  oLinks.push(oItems[i].getElementsByTagName('a')[0]);
    }
    // grab all links, look for .mp3
    var foundItems = 0;
    var oCanvas = null;
    var oCanvasCTX = null;
    var oCover = null;

	self.oUITemplate = document.createElement('div');
	self.oUITemplate.className = 'sm2-360ui';
	
	// fake a 360 UI so we can get some numbers from CSS, etc.

	var oFakeUI = document.createElement('div');
	oFakeUI.className = 'ui360';

	var oFakeUIBox = oFakeUI.appendChild(self.oUITemplate.cloneNode(true));
	oFakeUI.style.position = 'absolute';
	oFakeUI.style.left = '-9999px';
	var uiHTML = self.getUIHTML();

    oFakeUIBox.innerHTML = uiHTML[1]+uiHTML[2]+uiHTML[3];
    delete uiHTML;

	var oTemp = document.body.appendChild(oFakeUI);

	self.config.circleDiameter = parseInt(oFakeUIBox.offsetWidth);
	self.config.circleRadius = parseInt(self.config.circleDiameter/2);
	var oTiming = self.getElementsByClassName('sm2-timing','div',oTemp)[0];
	self.config.fontSizeMax = parseInt(self.getStyle(oTiming,'font-size'));
	if (isNaN(self.config.fontSizeMax)) {
	  // getStyle() etc. didn't work.
	  self.config.fontSizeMax = null;
	}
	// soundManager._writeDebug('diameter, font size: '+self.config.circleDiameter+','+self.config.fontSizeMax);

	oFakeUI.parentNode.removeChild(oFakeUI);
	delete oFakeUI;
	delete oFakeUIBox;
	delete oTemp;

	// canvas needs inline width and height, doesn't quite work otherwise
	self.oUITemplate.innerHTML = self.getUIHTML().join('');

    for (i=0,j=oLinks.length; i<j; i++) {
      if (sm.canPlayURL(oLinks[i].href) && !self.hasClass(oLinks[i],self.excludeClass)) {
        self.addClass(oLinks[i],self.css.sDefault); // add default CSS decoration
        self.links[foundItems] = (oLinks[i]);
        self.indexByURL[oLinks[i].href] = foundItems; // hack for indexing
        foundItems++;
		// add canvas shiz
		var oUI = oLinks[i].parentNode.insertBefore(self.oUITemplate.cloneNode(true),oLinks[i]);

        if (isIE && typeof G_vmlCanvasManager != 'undefined') { // IE only
          var o = oLinks[i].parentNode;
          var o2 = document.createElement('canvas');
          o2.className = 'sm2-canvas';
          var oID = 'sm2_canvas_'+parseInt(Math.random()*1048576);
          o2.id = oID;
		  o2.width = self.config.circleDiameter;
		  o2.height = self.config.circleDiameter;
          oUI.appendChild(o2);
          G_vmlCanvasManager.initElement(o2); // Apply ExCanvas compatibility magic
          oCanvas = document.getElementById(oID);
        } else { 
          // add a handler for the button
          oCanvas = oLinks[i].parentNode.getElementsByTagName('canvas')[0];
        }
        oCover = self.getElementsByClassName('sm2-cover','div',oLinks[i].parentNode)[0];
        var oBtn = oLinks[i].parentNode.getElementsByTagName('img')[0];
		var oBtn = oLinks[i].parentNode.getElementsByTagName('img')[0]
        self.addEventHandler(oBtn,'click',self.buttonClick);
		self.addEventHandler(oCover,'mousedown',self.mouseDown);
	    oCanvasCTX = oCanvas.getContext('2d');
        oCanvasCTX.translate(self.config.circleRadius,self.config.circleRadius);
        oCanvasCTX.rotate(self.deg2rad(-90)); // compensate for arc starting at EAST // http://stackoverflow.com/questions/319267/tutorial-for-html-canvass-arc-function
      }
    }
    if (foundItems>0) {
      self.addEventHandler(document,'click',self.handleClick);
	  if (self.config.autoPlay) {
	    self.handleClick({target:self.links[0],preventDefault:function(){}});
	  }
    }
    sm._writeDebug('threeSixtyPlayer.init(): Found '+foundItems+' relevant items.');

	if (self.config.useFavIcon && typeof this.VUMeter != 'undefined') {
		this.vuMeter = new this.VUMeter(this);
	}

  }

}

// Optional: VU Meter component

ThreeSixtyPlayer.prototype.VUMeter = function(oParent) {

  var self = oParent;
  var me = this;
  this.vuMeterData = [];
  this.vuDataCanvas = null;
  var _head = document.getElementsByTagName('head')[0];
  var isOpera = (navigator.userAgent.match(/opera/i));
  var isFirefox = (navigator.userAgent.match(/firefox/i));

  this.setPageIcon = function(sDataURL) {

	if (!self.config.useFavIcon || !self.config.usePeakData || !sDataURL) {
		return false;
	}

    var link = document.getElementById('sm2-favicon');
    if (link) {
	  _head.removeChild(link);
	  link = null;
    }
    if (!link) {
	  link = document.createElement('link');
	  link.id = 'sm2-favicon';
	  link.rel = 'shortcut icon';
	  link.type = 'image/png';
	  link.href = sDataURL;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }

  this.resetPageIcon = function() {
	if (!self.config.useFavIcon) {
		return false;
	}
    var link = document.getElementById('favicon');
    if (link) {
	  link.href = '/favicon.ico';
    }
  }

  this.updateVU = function(oSound) {
    if (soundManager.flashVersion >= 9 && self.config.useFavIcon && self.config.usePeakData) {
      me.setPageIcon(me.vuMeterData[parseInt(16*oSound.peakData.left)][parseInt(16*oSound.peakData.right)]);
	}
  }

  this.createVUData = function() {
    var i=0;
    var j=0;
	var canvas = me.vuDataCanvas.getContext('2d');
	var vuGrad = canvas.createLinearGradient(0, 16, 0, 0);
	vuGrad.addColorStop(0,'rgb(0,192,0)');
	vuGrad.addColorStop(0.30,'rgb(0,255,0)');
	vuGrad.addColorStop(0.625,'rgb(255,255,0)');
	vuGrad.addColorStop(0.85,'rgb(255,0,0)');
	var bgGrad = canvas.createLinearGradient(0, 16, 0, 0);
	var outline = 'rgba(0,0,0,0.2)';
	bgGrad.addColorStop(0,outline);
	bgGrad.addColorStop(1,'rgba(0,0,0,0.5)');
    for (i=0; i<16; i++) {
      me.vuMeterData[i] = [];
    }
    for (var i=0; i<16; i++) {
      for (j=0; j<16; j++) {
	    // reset/erase canvas
		me.vuDataCanvas.setAttribute('width',16);
		me.vuDataCanvas.setAttribute('height',16);
		// draw new stuffs
	    canvas.fillStyle = bgGrad;
 		canvas.fillRect(0,0,7,15);
 		canvas.fillRect(8,0,7,15);
		/*
		// shadow
		canvas.fillStyle = 'rgba(0,0,0,0.1)';
	    canvas.fillRect(1,15-i,7,17-(17-i));
	    canvas.fillRect(9,15-j,7,17-(17-j));
		*/
        canvas.fillStyle = vuGrad;
        canvas.fillRect(0,15-i,7,16-(16-i));
        canvas.fillRect(8,15-j,7,16-(16-j));
		// and now, clear out some bits.
		canvas.clearRect(0,3,16,1);
		canvas.clearRect(0,7,16,1);
		canvas.clearRect(0,11,16,1);
        me.vuMeterData[i][j] = me.vuDataCanvas.toDataURL('image/png');
		// for debugging VU images
		/*
		var o = document.createElement('img');
		o.style.marginRight = '5px'; 
		o.src = vuMeterData[i][j];
		document.documentElement.appendChild(o);
		*/
      }
    }
  };

  this.testCanvas = function(noOpaque) {
    // canvas + toDataURL();
    var c = document.createElement('canvas');
	var ctx = null;
    if (!c || typeof c.getContext == 'undefined') {
	  return null;
    }
    ctx = c.getContext('2d');
	if (!ctx || typeof c.toDataURL != 'function') {
		return null;
	}
	// just in case..
	try {
		var ok = c.toDataURL('image/png');
	} catch(e) {
	  // no canvas or no toDataURL()
	  return null;	
	}
	// assume we're all good.
	return c;
  }

  this.init = function() {
	  if (self.config.useFavIcon) {
		me.vuDataCanvas = me.testCanvas(true);
		if (me.vuDataCanvas && (isFirefox || isOpera)) {
	      // these browsers support dynamically-updating the favicon
		  me.createVUData();
		} else {
		  // browser doesn't support doing this
		  self.config.useFavIcon = false;
		}
	  }
  }

  this.init();

}

// completely optional: Metadata/annotations/segments code

ThreeSixtyPlayer.prototype.Metadata = function(oSound, oParent) {
  soundManager._wD('Metadata()');
  var me = this;
  var oBox = oSound._360data.oUI360;
  var o = oBox.getElementsByTagName('ul')[0];
  var oItems = o.getElementsByTagName('li');
  var isFirefox = (navigator.userAgent.match(/firefox/i));
  this.lastWPExec = 0;
  this.refreshInterval = 250;

  var isAlt = false;

  this.events = {
    whileplaying: function() {
	  var width = oSound._360data.width;
	  var radius = oSound._360data.radius;
	  var fullDuration = (oSound.durationEstimate||(me.totalTime*1000));
	  var isAlt = null;
	  for (var i=0,j=me.data.length; i<j; i++) {
	    isAlt = (i%2==0);
	    oParent.drawSolidArc(oSound._360data.oCanvas,(isAlt?oParent.config.segmentRingColorAlt:oParent.config.segmentRingColor),isAlt?width:width, isAlt?radius/2:radius/2, oParent.deg2rad(360*(me.data[i].endTimeMS/fullDuration)), oParent.deg2rad(360*((me.data[i].startTimeMS||1)/fullDuration)), true);
	  }
      var d = new Date();
      if (d-me.lastWPExec>me.refreshInterval) {
        me.refresh();
        me.lastWPExec = d;
      }
    }	
  }

  this.refresh = function() {
    // Display info as appropriate
    var index = null;
    var now = oSound.position;
    var metadata = oSound._360data.metadata.data;
    for (var i=0, j=metadata.length; i<j; i++) {
      if (now >= metadata[i].startTimeMS && now <= metadata[i].endTimeMS) {
        index = i;
        break;
      }
    }
    if (index != metadata.currentItem && index < metadata.length) {
      // update
      oSound._360data.oLink.innerHTML = metadata.mainTitle+' <span class="metadata"><span class="sm2_divider"> | </span><span class="sm2_metadata">'+metadata[index].title+'</span></span>';
      // self.setPageTitle(metadata[index].title+' | '+metadata.mainTitle);
      metadata.currentItem = index;
    }
  }

  this.totalTime = 0;

  this.strToTime = function(sTime) {
    var segments = sTime.split(':');
    var seconds = 0;
    for (var i=segments.length; i--;) {
      seconds += parseInt(segments[i])*Math.pow(60,segments.length-1-i,10); // hours, minutes
    }
    return seconds;
  }

  this.data = [];
  this.data.givenDuration = null;
  this.data.currentItem = null;
  this.data.mainTitle = oSound._360data.oLink.innerHTML;
  for (var i=0; i<oItems.length; i++) {
    this.data[i] = {
      o: null,
      title: oItems[i].getElementsByTagName('p')[0].innerHTML,
      startTime: oItems[i].getElementsByTagName('span')[0].innerHTML,
      startSeconds: me.strToTime(oItems[i].getElementsByTagName('span')[0].innerHTML.replace(/[()]/g,'')),
      duration: 0,
      durationMS: null,
      startTimeMS: null,
      endTimeMS: null,
      oNote: null
    }
  }
  var oDuration = oParent.getElementsByClassName('duration','div',oBox);
  this.data.givenDuration = (oDuration.length?me.strToTime(oDuration[0].innerHTML)*1000:0);
  for (i=0; i<this.data.length; i++) {
    this.data[i].duration = parseInt(this.data[i+1]?this.data[i+1].startSeconds:(me.data.givenDuration?me.data.givenDuration:oSound.durationEstimate)/1000)-this.data[i].startSeconds;
    this.data[i].startTimeMS = this.data[i].startSeconds*1000;
    this.data[i].durationMS = this.data[i].duration*1000;
    this.data[i].endTimeMS = this.data[i].startTimeMS+this.data[i].durationMS;
    this.totalTime += this.data[i].duration;
  }
}

var threeSixtyPlayer = null;

soundManager.debugMode = (window.location.href.match(/debug=1/i)); // disable or enable debug output
soundManager.consoleOnly = true;
soundManager.flashVersion = 9;
soundManager.useHighPerformance = true;
soundManager.useFlashBlock = true;

// soundManager.useFastPolling = true; // for more aggressive, faster UI updates (higher CPU use)

if (soundManager.debugMode) {
  var t = window.setInterval(function(){
	if (threeSixtyPlayer && threeSixtyPlayer.lastSound && threeSixtyPlayer.lastSound._360data.fps) {
	  soundManager._writeDebug('fps: ~'+threeSixtyPlayer.lastSound._360data.fps);
	  threeSixtyPlayer.lastSound._360data.fps = 0;
	}
  },1000);
}

threeSixtyPlayer = new ThreeSixtyPlayer();

if (threeSixtyPlayer.config.useWaveformData) {
  soundManager.flash9Options.useWaveformData = true;
}
if (threeSixtyPlayer.config.useEQData) {
  soundManager.flash9Options.useEQData = true;
}
if (threeSixtyPlayer.config.usePeakData) {
  soundManager.flash9Options.usePeakData = true;
}

soundManager.onready(function(){
  if (soundManager.supported()) {
    // soundManager.createSound() etc. may now be called
    threeSixtyPlayer.init();
  }
});
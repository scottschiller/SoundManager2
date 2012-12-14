/**
 * SoundManager 2 Demo: "Page as playlist" UI
 * ----------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * An example of a Muxtape.com-style UI, where an
 * unordered list of MP3 links becomes a playlist
 *
 * Flash 9 "MovieStar" edition supports MPEG4
 * audio as well.
 *
 * Requires SoundManager 2 Javascript API.
 */

/*jslint white: false, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: false, bitwise: true, newcap: true, immed: true */
/*global soundManager, window, document, navigator, setTimeout, attachEvent, Metadata, PP_CONFIG */

var pagePlayer = null;

function PagePlayer() {

  var self = this,
      pl = this,
      sm = soundManager, // soundManager instance
      _event,
      vuDataCanvas = null,
      controlTemplate = null,
      _head = document.getElementsByTagName('head')[0],
      spectrumContainer = null,
      // sniffing for favicon stuff, IE workarounds and touchy-feely devices
      ua = navigator.userAgent,
      supportsFavicon = (ua.match(/(opera|firefox)/i)),
      isTouchDevice = (ua.match(/ipad|ipod|iphone/i)),
      cleanup;

  // configuration options
  // note that if Flash 9 is required, you must set soundManager.flashVersion = 9 in your script before this point.

  this.config = {
    usePeakData: false,     // [Flash 9 only]: show peak data
    useWaveformData: false, // [Flash 9 only]: enable sound spectrum (raw waveform data) - WARNING: CPU-INTENSIVE: may set CPUs on fire.
    useEQData: false,       // [Flash 9 only]: enable sound EQ (frequency spectrum data) - WARNING: Also CPU-intensive.
    fillGraph: false,       // [Flash 9 only]: draw full lines instead of only top (peak) spectrum points
    allowRightClick: true,  // let users right-click MP3 links ("save as...", etc.) or discourage (can't prevent.)
    useThrottling: true,    // try to rate-limit potentially-expensive calls (eg. dragging position around)
    autoStart: false,       // begin playing first sound when page loads
    playNext: true,         // stop after one sound, or play through list until end
    updatePageTitle: true,  // change the page title while playing sounds
    emptyTime: '-:--',      // null/undefined timer values (before data is available)
    useFavIcon: false       // try to show peakData in address bar (Firefox + Opera) - may be too CPU heavy
  };

  this.css = {              // CSS class names appended to link during various states
    sDefault: 'sm2_link',   // default state
    sLoading: 'sm2_loading',
    sPlaying: 'sm2_playing',
    sPaused: 'sm2_paused'
  };

  this.sounds = [];
  this.soundsByObject = [];
  this.lastSound = null;
  this.soundCount = 0;
  this.strings = [];
  this.dragActive = false;
  this.dragExec = new Date();
  this.dragTimer = null;
  this.pageTitle = document.title;
  this.lastWPExec = new Date();
  this.lastWLExec = new Date();
  this.vuMeterData = [];
  this.oControls = null;

  this._mergeObjects = function(oMain,oAdd) {
    // non-destructive merge
    var o1 = {}, o2, i, o; // clone o1
    for (i in oMain) {
      if (oMain.hasOwnProperty(i)) {
        o1[i] = oMain[i];
      }
    }
    o2 = (typeof oAdd === 'undefined'?{}:oAdd);
    for (o in o2) {
      if (typeof o1[o] === 'undefined') {
        o1[o] = o2[o];
      }
    }
    return o1;
  };

  _event = (function() {

    var old = (window.attachEvent && !window.addEventListener),
    _slice = Array.prototype.slice,
    evt = {
      add: (old?'attachEvent':'addEventListener'),
      remove: (old?'detachEvent':'removeEventListener')
    };

    function getArgs(oArgs) {
      var args = _slice.call(oArgs), len = args.length;
      if (old) {
        args[1] = 'on' + args[1]; // prefix
        if (len > 3) {
          args.pop(); // no capture
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

  // event + DOM utilities

  this.hasClass = function(o, cStr) {
    return (typeof(o.className)!=='undefined'?new RegExp('(^|\\s)'+cStr+'(\\s|$)').test(o.className):false);
  };

  this.addClass = function(o, cStr) {
    if (!o || !cStr || self.hasClass(o,cStr)) {
      return false; // safety net
    }
    o.className = (o.className?o.className+' ':'')+cStr;
  };

  this.removeClass = function(o, cStr) {
    if (!o || !cStr || !self.hasClass(o,cStr)) {
      return false;
    }
    o.className = o.className.replace(new RegExp('( '+cStr+')|('+cStr+')','g'),'');
  };

  this.select = function(className, oParent) {
    var result = self.getByClassName(className, 'div', oParent||null);
    return (result ? result[0] : null);
  };

  this.getByClassName = (document.querySelectorAll ? function(className, tagNames, oParent) { // tagNames: string or ['div', 'p'] etc.

    var pattern = ('.'+className), qs;
    if (tagNames) {
      tagNames = tagNames.split(' ');
    }
    qs = (tagNames.length > 1 ? tagNames.join(pattern+', ') : tagNames[0]+pattern);
    return (oParent?oParent:document).querySelectorAll(qs);

  } : function(className, tagNames, oParent) {

    var node = (oParent?oParent:document), matches = [], i, j, nodes = [];
    if (tagNames) {
      tagNames = tagNames.split(' ');
    }
    if (tagNames instanceof Array) {
      for (i=tagNames.length; i--;) {
        if (!nodes || !nodes[tagNames[i]]) {
          nodes[tagNames[i]] = node.getElementsByTagName(tagNames[i]);
        }
      }
      for (i=tagNames.length; i--;) {
        for (j=nodes[tagNames[i]].length; j--;) {
          if (self.hasClass(nodes[tagNames[i]][j], className)) {
            matches.push(nodes[tagNames[i]][j]);
          }
        }
      }
    } else {
      nodes = node.all||node.getElementsByTagName('*');
      for (i=0, j=nodes.length; i<j; i++) {
        if (self.hasClass(nodes[i],className)) {
          matches.push(nodes[i]);
        }
      }
    }
    return matches;

  });
  
  this.isChildOfClass = function(oChild, oClass) {
    if (!oChild || !oClass) {
      return false;
    }
    while (oChild.parentNode && !self.hasClass(oChild,oClass)) {
      oChild = oChild.parentNode;
    }
    return (self.hasClass(oChild,oClass));
  };

  this.getParentByNodeName = function(oChild, sParentNodeName) {
    if (!oChild || !sParentNodeName) {
      return false;
    }
    sParentNodeName = sParentNodeName.toLowerCase();
    while (oChild.parentNode && sParentNodeName !== oChild.parentNode.nodeName.toLowerCase()) {
      oChild = oChild.parentNode;
    }
    return (oChild.parentNode && sParentNodeName === oChild.parentNode.nodeName.toLowerCase()?oChild.parentNode:null);
  };

  this.getOffX = function(o) {
    // http://www.xs4all.nl/~ppk/js/findpos.html
    var curleft = 0;
    if (o.offsetParent) {
      while (o.offsetParent) {
        curleft += o.offsetLeft;
        o = o.offsetParent;
      }
    }
    else if (o.x) {
      curleft += o.x;
    }
    return curleft;
  };

  this.getTime = function(nMSec, bAsString) {
    // convert milliseconds to mm:ss, return as object literal or string
    var nSec = Math.floor(nMSec/1000),
        min = Math.floor(nSec/60),
        sec = nSec-(min*60);
    // if (min === 0 && sec === 0) return null; // return 0:00 as null
    return (bAsString?(min+':'+(sec<10?'0'+sec:sec)):{'min':min,'sec':sec});
  };

  this.getSoundByObject = function(o) {
    return (typeof self.soundsByObject[o.id] !== 'undefined'?self.soundsByObject[o.id]:null);
  };

  this.getPreviousItem = function(o) {
    // given <li> playlist item, find previous <li> and then <a>
    if (o.previousElementSibling) {
      o = o.previousElementSibling;
    } else {
      o = o.previousSibling; // move from original node..
      while (o && o.previousSibling && o.previousSibling.nodeType !== 1) {
        o = o.previousSibling;
      }
    }
    if (o.nodeName.toLowerCase() !== 'li') {
      return null;
    } else {
      return o.getElementsByTagName('a')[0];
    }
  };

  this.playPrevious = function(oSound) {
    if (!oSound) {
      oSound = self.lastSound;
    }
    if (!oSound) {
      return false;
    }
    var previousItem = self.getPreviousItem(oSound._data.oLI);
    if (previousItem) {
      pl.handleClick({target:previousItem}); // fake a click event - aren't we sneaky. ;)
    }
    return previousItem;
  };

  this.getNextItem = function(o) {
    // given <li> playlist item, find next <li> and then <a>
    if (o.nextElementSibling) {
      o = o.nextElementSibling;
    } else {
      o = o.nextSibling; // move from original node..
      while (o && o.nextSibling && o.nextSibling.nodeType !== 1) {
        o = o.nextSibling;
      }
    }
    if (o.nodeName.toLowerCase() !== 'li') {
      return null;
    } else {
      return o.getElementsByTagName('a')[0];
    }
  };

  this.playNext = function(oSound) {
    if (!oSound) {
      oSound = self.lastSound;
    }
    if (!oSound) {
      return false;
    }
    var nextItem = self.getNextItem(oSound._data.oLI);
    if (nextItem) {
      pl.handleClick({target:nextItem}); // fake a click event - aren't we sneaky. ;)
    }
    return nextItem;
  };

  this.setPageTitle = function(sTitle) {
    if (!self.config.updatePageTitle) {
      return false;
    }
    try {
      document.title = (sTitle?sTitle+' - ':'')+self.pageTitle;
    } catch(e) {
      // oh well
      self.setPageTitle = function() {
        return false;
      };
    }
  };

  this.events = {

    // handlers for sound events as they're started/stopped/played

    play: function() {
      pl.removeClass(this._data.oLI,this._data.className);
      this._data.className = pl.css.sPlaying;
      pl.addClass(this._data.oLI,this._data.className);
      self.setPageTitle(this._data.originalTitle);
    },

    stop: function() {
      pl.removeClass(this._data.oLI,this._data.className);
      this._data.className = '';
      this._data.oPosition.style.width = '0px';
      self.setPageTitle();
      self.resetPageIcon();
    },

    pause: function() {
      if (pl.dragActive) {
        return false;
      }
      pl.removeClass(this._data.oLI,this._data.className);
      this._data.className = pl.css.sPaused;
      pl.addClass(this._data.oLI,this._data.className);
      self.setPageTitle();
      self.resetPageIcon();
    },

    resume: function() {
      if (pl.dragActive) {
        return false;
      }
      pl.removeClass(this._data.oLI,this._data.className);
      this._data.className = pl.css.sPlaying;
      pl.addClass(this._data.oLI,this._data.className);
    },

    finish: function() {
      pl.removeClass(this._data.oLI,this._data.className);
      this._data.className = '';
      this._data.oPosition.style.width = '0px';
      // play next if applicable
      if (self.config.playNext) {
        pl.playNext(this);
      } else {
        self.setPageTitle();
        self.resetPageIcon();
      }
    },

    whileloading: function() {
      function doWork() {
        this._data.oLoading.style.width = (((this.bytesLoaded/this.bytesTotal)*100)+'%'); // theoretically, this should work.
        if (!this._data.didRefresh && this._data.metadata) {
          this._data.didRefresh = true;
          this._data.metadata.refresh();
        }
      }
      if (!pl.config.useThrottling) {
        doWork.apply(this);
      } else {
        var d = new Date();
        if (d && d-self.lastWLExec > 50 || this.bytesLoaded === this.bytesTotal) {
          doWork.apply(this);
          self.lastWLExec = d;
        }
      }

    },

    onload: function() {
      if (!this.loaded) {
        var oTemp = this._data.oLI.getElementsByTagName('a')[0],
            oString = oTemp.innerHTML,
            oThis = this;
        oTemp.innerHTML = oString+' <span style="font-size:0.5em"> | Load failed, d\'oh! '+(sm.sandbox.noRemote?' Possible cause: Flash sandbox is denying remote URL access.':(sm.sandbox.noLocal?'Flash denying local filesystem access':'404?'))+'</span>';
        setTimeout(function(){
          oTemp.innerHTML = oString;
          // pl.events.finish.apply(oThis); // load next
        },5000);
      } else {
        if (this._data.metadata) {
          this._data.metadata.refresh();
        }
      }
    },

    whileplaying: function() {
      var d = null;
      if (pl.dragActive || !pl.config.useThrottling) {
        self.updateTime.apply(this);
        if (sm.flashVersion >= 9) {
          if (pl.config.usePeakData && this.instanceOptions.usePeakData) {
            self.updatePeaks.apply(this);
          }
          if (pl.config.useWaveformData && this.instanceOptions.useWaveformData || pl.config.useEQData && this.instanceOptions.useEQData) {
            self.updateGraph.apply(this);
          }
        }
        if (this._data.metadata) {
          d = new Date();
          if (d && d-self.lastWPExec>500) {
            this._data.metadata.refreshMetadata(this);
            self.lastWPExec = d;
          }
        }
        this._data.oPosition.style.width = (((this.position/self.getDurationEstimate(this))*100)+'%');
      } else {
        d = new Date();
        if (d-self.lastWPExec>30) {
          self.updateTime.apply(this);
          if (sm.flashVersion >= 9) {
            if (pl.config.usePeakData && this.instanceOptions.usePeakData) {
              self.updatePeaks.apply(this);
            }
            if (pl.config.useWaveformData && this.instanceOptions.useWaveformData || pl.config.useEQData && this.instanceOptions.useEQData) {
              self.updateGraph.apply(this);
            }
          }
          if (this._data.metadata) {
            this._data.metadata.refreshMetadata(this);
          }
          this._data.oPosition.style.width = (((this.position/self.getDurationEstimate(this))*100)+'%');
          self.lastWPExec = d;
        }
      }
    }

  }; // events{}

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
  };

  this.resetPageIcon = function() {
    if (!self.config.useFavIcon) {
      return false;
    }
    var link = document.getElementById('favicon');
    if (link) {
      link.href = '/favicon.ico';
    }
  };

  this.updatePeaks = function() {
    var o = this._data.oPeak,
        oSpan = o.getElementsByTagName('span');
    oSpan[0].style.marginTop = (13-(Math.floor(15*this.peakData.left))+'px');
    oSpan[1].style.marginTop = (13-(Math.floor(15*this.peakData.right))+'px');
    if (sm.flashVersion > 8 && self.config.useFavIcon && self.config.usePeakData) {
      self.setPageIcon(self.vuMeterData[parseInt(16*this.peakData.left,10)][parseInt(16*this.peakData.right,10)]);
    }
  };
  
  this.updateGraph = function() {
    if (pl.config.flashVersion < 9 || (!pl.config.useWaveformData && !pl.config.useEQData)) {
      return false;
    }
    var sbC = this._data.oGraph.getElementsByTagName('div'),
        scale, i, offset;
    if (pl.config.useWaveformData) {
      // raw waveform
      scale = 8; // Y axis (+/- this distance from 0)
      for (i=255; i--;) {
        sbC[255-i].style.marginTop = (1+scale+Math.ceil(this.waveformData.left[i]*-scale))+'px';
      }
    } else {
      // eq spectrum
      offset = 9;
      for (i=255; i--;) {
        sbC[255-i].style.marginTop = ((offset*2)-1+Math.ceil(this.eqData[i]*-offset))+'px';
      }
    }
  };
  
  this.resetGraph = function() {
    if (!pl.config.useEQData || pl.config.flashVersion<9) {
      return false;
    }
    var sbC = this._data.oGraph.getElementsByTagName('div'),
        scale = (!pl.config.useEQData?'9px':'17px'),
        nHeight = (!pl.config.fillGraph?'1px':'32px'),
        i;
    for (i=255; i--;) {
      sbC[255-i].style.marginTop = scale; // EQ scale
      sbC[255-i].style.height = nHeight;
    }
  };
  
  this.updateTime = function() {
    var str = self.strings.timing.replace('%s1',self.getTime(this.position,true));
    str = str.replace('%s2',self.getTime(self.getDurationEstimate(this),true));
    this._data.oTiming.innerHTML = str;
  };

  this.getTheDamnTarget = function(e) {
    return (e.target||(window.event?window.event.srcElement:null));
  };
  
  this.withinStatusBar = function(o) {
    return (self.isChildOfClass(o,'playlist')) && (self.isChildOfClass(o,'controls'));
  };

  this.handleClick = function(e) {

    // a sound (or something) was clicked - determine what and handle appropriately

    if (e.button === 2) {
      if (!pl.config.allowRightClick) {
        pl.stopEvent(e);
      }
      return pl.config.allowRightClick; // ignore right-clicks
    }
    var o = self.getTheDamnTarget(e),
        sURL, soundURL, thisSound, oControls, oLI, str;
    if (!o) {
      return true;
    }
    if (self.dragActive) {
      self.stopDrag(); // to be safe
    }
    if (self.withinStatusBar(o)) {
      // self.handleStatusClick(e);
      return false;
    }
    if (o.nodeName.toLowerCase() !== 'a') {
      o = self.getParentByNodeName(o,'a');
    }
    if (!o) {
      // not a link
      return true;
    }

    // OK, we're dealing with a link

    sURL = o.getAttribute('href');

    if (!o.href || (!sm.canPlayLink(o) && !self.hasClass(o,'playable')) || self.hasClass(o,'exclude')) {

      // do nothing, don't return anything.
      return true;

    } else {

      // we have something we're interested in.

      // find and init parent UL, if need be
      self.initUL(self.getParentByNodeName(o, 'ul'));

      // and decorate the link too, if needed
      self.initItem(o);

      soundURL = o.href;
      thisSound = self.getSoundByObject(o);

      if (thisSound) {

        // sound already exists
        self.setPageTitle(thisSound._data.originalTitle);
        if (thisSound === self.lastSound) {
          // ..and was playing (or paused) and isn't in an error state
          if (thisSound.readyState !== 2) {
            if (thisSound.playState !== 1) {
              // not yet playing
              thisSound.play();
            } else {
              thisSound.togglePause();
            }
          } else {
            sm._writeDebug('Warning: sound failed to load (security restrictions, 404 or bad format)',2);
          }
        } else {
          // ..different sound
          if (self.lastSound) {
            self.stopSound(self.lastSound);
          }
          if (spectrumContainer) {
            thisSound._data.oTimingBox.appendChild(spectrumContainer);
          }
          thisSound.togglePause(); // start playing current
        }

      } else {

        // create sound
        thisSound = sm.createSound({
          id:o.id,
          url:decodeURI(soundURL),
          onplay:self.events.play,
          onstop:self.events.stop,
          onpause:self.events.pause,
          onresume:self.events.resume,
          onfinish:self.events.finish,
          type:(o.type||null),
          whileloading:self.events.whileloading,
          whileplaying:self.events.whileplaying,
          onmetadata:self.events.metadata,
          onload:self.events.onload
        });

        // append control template
        oControls = self.oControls.cloneNode(true);
        oLI = o.parentNode;
        oLI.appendChild(oControls);
        if (spectrumContainer) {
          oLI.appendChild(spectrumContainer);
        }
        self.soundsByObject[o.id] = thisSound;

        // tack on some custom data
        thisSound._data = {
          oLink: o, // DOM reference within SM2 object event handlers
          oLI: oLI,
          oControls: self.select('controls',oLI),
          oStatus: self.select('statusbar',oLI),
          oLoading: self.select('loading',oLI),
          oPosition: self.select('position',oLI),
          oTimingBox: self.select('timing',oLI),
          oTiming: self.select('timing',oLI).getElementsByTagName('div')[0],
          oPeak: self.select('peak',oLI),
          oGraph: self.select('spectrum-box',oLI),
          className: self.css.sPlaying,
          originalTitle: o.innerHTML,
          metadata: null
        };

        if (spectrumContainer) {
          thisSound._data.oTimingBox.appendChild(spectrumContainer);
        }

        // "Metadata"
        if (thisSound._data.oLI.getElementsByTagName('ul').length) {
          thisSound._data.metadata = new Metadata(thisSound);
        }

        // set initial timer stuff (before loading)
        str = self.strings.timing.replace('%s1',self.config.emptyTime);
        str = str.replace('%s2',self.config.emptyTime);
        thisSound._data.oTiming.innerHTML = str;
        self.sounds.push(thisSound);
        if (self.lastSound) {
          self.stopSound(self.lastSound);
        }
        self.resetGraph.apply(thisSound);
        thisSound.play();

      }

      self.lastSound = thisSound; // reference for next call
      return self.stopEvent(e);

    }

  };
  
  this.handleMouseDown = function(e) {
    // a sound link was clicked
    if (isTouchDevice && e.touches) {
      e = e.touches[0];
    }
    if (e.button === 2) {
      if (!pl.config.allowRightClick) {
        pl.stopEvent(e);
      }
      return pl.config.allowRightClick; // ignore right-clicks
    }
    var o = self.getTheDamnTarget(e);
    if (!o) {
      return true;
    }
    if (!self.withinStatusBar(o)) {
      return true;
    }
    self.dragActive = true;
    self.lastSound.pause();
    self.setPosition(e);
    if (!isTouchDevice) {
      _event.add(document,'mousemove',self.handleMouseMove);
    } else {
      _event.add(document,'touchmove',self.handleMouseMove);
    }
    self.addClass(self.lastSound._data.oControls,'dragging');
    return self.stopEvent(e);
  };
  
  this.handleMouseMove = function(e) {
    if (isTouchDevice && e.touches) {
      e = e.touches[0];
    }
    // set position accordingly
    if (self.dragActive) {
      if (self.config.useThrottling) {
        // be nice to CPU/externalInterface
        var d = new Date();
        if (d-self.dragExec>20) {
          self.setPosition(e);
        } else {
          window.clearTimeout(self.dragTimer);
          self.dragTimer = window.setTimeout(function(){self.setPosition(e);},20);
        }
        self.dragExec = d;
      } else {
        // oh the hell with it
        self.setPosition(e);
      }
    } else {
      self.stopDrag();
    }
    e.stopPropagation = true;
    return false;
  };
  
  this.stopDrag = function(e) {
    if (self.dragActive) {
      self.removeClass(self.lastSound._data.oControls,'dragging');
      if (!isTouchDevice) {
        _event.remove(document,'mousemove',self.handleMouseMove);
      } else {
        _event.remove(document,'touchmove',self.handleMouseMove);
      }
      if (!pl.hasClass(self.lastSound._data.oLI,self.css.sPaused)) {
        self.lastSound.resume();
      }
      self.dragActive = false;
      return self.stopEvent(e);
    }
  };
  
  this.handleStatusClick = function(e) {
    self.setPosition(e);
    if (!pl.hasClass(self.lastSound._data.oLI,self.css.sPaused)) {
      self.resume();
    }
    return self.stopEvent(e);
  };
  
  this.stopEvent = function(e) {
    if (typeof e !== 'undefined') {
      if (typeof e.preventDefault !== 'undefined') {
        e.preventDefault();
      } else {
        e.stopPropagation = true;
        e.returnValue = false;
      }
    }
    return false;
  };
 
  this.setPosition = function(e) {
    // called from slider control
    var oThis = self.getTheDamnTarget(e),
        x, oControl, oSound, nMsecOffset;
    if (!oThis) {
      return true;
    }
    oControl = oThis;
    while (!self.hasClass(oControl,'controls') && oControl.parentNode) {
      oControl = oControl.parentNode;
    }
    oSound = self.lastSound;
    x = parseInt(e.clientX,10);
    // play sound at this position
    nMsecOffset = Math.floor((x-self.getOffX(oControl)-4)/(oControl.offsetWidth)*self.getDurationEstimate(oSound));
    if (!isNaN(nMsecOffset)) {
      nMsecOffset = Math.min(nMsecOffset,oSound.duration);
    }
    if (!isNaN(nMsecOffset)) {
      oSound.setPosition(nMsecOffset);
    }
  };

  this.stopSound = function(oSound) {
    sm._writeDebug('stopping sound: '+oSound.id);
    sm.stop(oSound.id);
    if (!isTouchDevice) { // iOS 4.2+ security blocks onfinish() -> playNext() if we set a .src in-between(?)
      sm.unload(oSound.id);
    }
  };

  this.getDurationEstimate = function(oSound) {
    if (oSound.instanceOptions.isMovieStar) {
      return (oSound.duration);
    } else {
      return (!oSound._data.metadata || !oSound._data.metadata.data.givenDuration ? (oSound.durationEstimate||0) : oSound._data.metadata.data.givenDuration);
    }
  };

  this.createVUData = function() {

    var i=0, j=0,
      canvas = vuDataCanvas.getContext('2d'),
      vuGrad = canvas.createLinearGradient(0, 16, 0, 0),
      bgGrad, outline;

    vuGrad.addColorStop(0,'rgb(0,192,0)');
    vuGrad.addColorStop(0.30,'rgb(0,255,0)');
    vuGrad.addColorStop(0.625,'rgb(255,255,0)');
    vuGrad.addColorStop(0.85,'rgb(255,0,0)');
    bgGrad = canvas.createLinearGradient(0, 16, 0, 0);
    outline = 'rgba(0,0,0,0.2)';
    bgGrad.addColorStop(0,outline);
    bgGrad.addColorStop(1,'rgba(0,0,0,0.5)');
    for (i=0; i<16; i++) {
      self.vuMeterData[i] = [];
    }
    for (i=0; i<16; i++) {
      for (j=0; j<16; j++) {
        // reset/erase canvas
        vuDataCanvas.setAttribute('width',16);
        vuDataCanvas.setAttribute('height',16);
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
        self.vuMeterData[i][j] = vuDataCanvas.toDataURL('image/png');
        // for debugging VU images
        /*
        var o = document.createElement('img');
        o.style.marginRight = '5px'; 
        o.src = self.vuMeterData[i][j];
        document.documentElement.appendChild(o);
        */
      }
    }

  };

  this.testCanvas = function() {
    // canvas + toDataURL();
    var c = document.createElement('canvas'),
        ctx = null, ok;
    if (!c || typeof c.getContext === 'undefined') {
      return null;
    }
    ctx = c.getContext('2d');
    if (!ctx || typeof c.toDataURL !== 'function') {
        return null;
    }
    // just in case..
    try {
        ok = c.toDataURL('image/png');
    } catch(e) {
      // no canvas or no toDataURL()
      return null;
    }
    // assume we're all good.
    return c;
  };

  this.initItem = function(oNode) {
    if (!oNode.id) {
      oNode.id = 'pagePlayerMP3Sound'+(self.soundCount++);
    }
    self.addClass(oNode,self.css.sDefault); // add default CSS decoration
  };

  this.initUL = function(oULNode) {
    // set up graph box stuffs
    if (sm.flashVersion >= 9) {
        self.addClass(oULNode,self.cssBase);
    }
  };

  this.init = function(oConfig) {

    if (oConfig) {
      // allow overriding via arguments object
      sm._writeDebug('pagePlayer.init(): Using custom configuration');
      this.config = this._mergeObjects(oConfig,this.config);
    } else {
      sm._writeDebug('pagePlayer.init(): Using default configuration');
    }

    var i, spectrumBox, sbC, oF, oClone, oTiming;

    // apply externally-defined override, if applicable
    this.cssBase = []; // optional features added to ul.playlist

    // apply some items to SM2
    sm.useFlashBlock = true;

    if (sm.flashVersion >= 9) {

      sm.defaultOptions.usePeakData = this.config.usePeakData;
      sm.defaultOptions.useWaveformData = this.config.useWaveformData;
      sm.defaultOptions.useEQData = this.config.useEQData;

      if (this.config.usePeakData) {
        this.cssBase.push('use-peak');
      }

      if (this.config.useWaveformData || this.config.useEQData) {
        this.cssBase.push('use-spectrum');
      }

      this.cssBase = this.cssBase.join(' ');

      if (this.config.useFavIcon) {
        vuDataCanvas = self.testCanvas();
        if (vuDataCanvas && supportsFavicon) {
          // these browsers support dynamically-updating the favicon
          self.createVUData();
        } else {
          // browser doesn't support doing this
          this.config.useFavIcon = false;
        }
      }

    } else if (this.config.usePeakData || this.config.useWaveformData || this.config.useEQData) {

      sm._writeDebug('Page player: Note: soundManager.flashVersion = 9 is required for peak/waveform/EQ features.');

    }

    controlTemplate = document.createElement('div');

     controlTemplate.innerHTML = [

      // control markup inserted dynamically after each page player link
      // if you want to change the UI layout, this is the place to do it.

      '  <div class="controls">',
      '   <div class="statusbar">',
      '    <div class="loading"></div>',
      '    <div class="position"></div>',
      '   </div>',
      '  </div>',

      '  <div class="timing">',
      '   <div id="sm2_timing" class="timing-data">',
      '    <span class="sm2_position">%s1</span> / <span class="sm2_total">%s2</span>',
      '   </div>',
      '  </div>',

      '  <div class="peak">',
      '   <div class="peak-box"><span class="l"></span><span class="r"></span></div>',
      '  </div>',

      ' <div class="spectrum-container">',
      '  <div class="spectrum-box">',
      '   <div class="spectrum"></div>',
      '  </div>',
      ' </div>'

    ].join('\n');

    if (sm.flashVersion >= 9) {

      // create the spectrum box ish
      spectrumContainer = self.select('spectrum-container',controlTemplate);

      // take out of template, too
      spectrumContainer = controlTemplate.removeChild(spectrumContainer);

      spectrumBox = self.select('spectrum-box',spectrumContainer);

      sbC = spectrumBox.getElementsByTagName('div')[0];
      oF = document.createDocumentFragment();
      oClone = null;
      for (i=256; i--;) {
        oClone = sbC.cloneNode(false);
        oClone.style.left = (i)+'px';
        oF.appendChild(oClone);
      }
      spectrumBox.removeChild(sbC);
      spectrumBox.appendChild(oF);

    } else {

      // flash 8-only, take out the spectrum container and peak elements
      controlTemplate.removeChild(self.select('spectrum-container',controlTemplate));
      controlTemplate.removeChild(self.select('peak',controlTemplate));

    }

    self.oControls = controlTemplate.cloneNode(true);

    oTiming = self.select('timing-data',controlTemplate);
    self.strings.timing = oTiming.innerHTML;
    oTiming.innerHTML = '';
    oTiming.id = '';

    function doEvents(action) { // action: add / remove

      _event[action](document,'click',self.handleClick);

      if (!isTouchDevice) {
        _event[action](document,'mousedown',self.handleMouseDown);
        _event[action](document,'mouseup',self.stopDrag);
      } else {
        _event[action](document,'touchstart',self.handleMouseDown);
        _event[action](document,'touchend',self.stopDrag);
      }

      _event[action](window, 'unload', cleanup);

    }

    cleanup = function() {
      doEvents('remove');
    };

    doEvents('add');

    sm._writeDebug('pagePlayer.init(): Ready',1);

    if (self.config.autoStart) {
      // grab the first ul.playlist link
      pl.handleClick({target:pl.getByClassName('playlist', 'ul')[0].getElementsByTagName('a')[0]});
    }

  };

}

soundManager.useFlashBlock = true;

soundManager.onready(function() {
  pagePlayer = new PagePlayer();
  pagePlayer.init(typeof PP_CONFIG !== 'undefined' ? PP_CONFIG : null);
});
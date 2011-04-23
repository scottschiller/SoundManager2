/* SoundManager 2 - project home utility JS */

function _id(sID) {
  return document.getElementById(sID);
}

getSoundByURL = function(sURL) {
    return (typeof self.soundsByURL[sURL] != 'undefined'?self.soundsByURL[sURL]:null);
}

function init() {
  var o = document.getElementById('main');
  var el = o.getElementsByTagName('dt');
  for (var i=el.length; i--;) {
    if ((i+1)%2==0) {
  	  utils.addClass(el[i],'alt');
    }
  }
  var el = o.getElementsByTagName('dl');
  for (var i=el.length; i--;) {
    if ((i+1)%2==0) {
  	  utils.addClass(el[i],'alt');
    }
  }
}

function Utils() {
  var self = this;

  this.hasClass = function(o,cStr) {
	return (typeof(o.className)!='undefined'?new RegExp('(^|\\s)'+cStr+'(\\s|$)').test(o.className):false);
  }

  this.addClass = function(o,cStr) {
    if (!o || !cStr) return false; // safety net
    if (self.hasClass(o,cStr)) return false;
    o.className = (o.className?o.className+' ':'')+cStr;
  }

  this.removeClass = function(o,cStr) {
    if (!o || !cStr) return false; // safety net
    if (!self.hasClass(o,cStr)) return false;
    o.className = o.className.replace(new RegExp('( '+cStr+')|('+cStr+')','g'),'');
  }

  this.toggleClass = function(o,cStr) {
    var m = (self.hasClass(o,cStr)?self.removeClass:self.addClass);
    m(o,cStr);
  }

  this.getElementsByClassName = function(className,tagNames,oParent) {
    var doc = (oParent||document);
    var matches = [];
    var i,j;
    var nodes = [];
    if (typeof(tagNames)!='undefined' && typeof(tagNames)!='string') {
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
            matches[matches.length] = nodes[tagNames[i]][j];
          }
        }
      }
    } else {
      for (i=0; i<nodes.length; i++) {
        if (self.hasClass(nodes[i],className)) {
          matches[matches.length] = nodes[i];
        }
      }
    }
    return matches;
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

  this.getOffY = function(o) {
    // http://www.xs4all.nl/~ppk/js/findpos.html
    var curtop = 0;
    if (o.offsetParent) {
      while (o.offsetParent) {
        curtop += o.offsetTop;
        o = o.offsetParent;
      }
    }
    else if (o.y) curtop += o.y;
    return curtop;
  }

  this.isChildOfClass = function(oChild,oClass) {
    if (!oChild || !oClass) return false;
    while (oChild.parentNode && !self.hasClass(oChild,oClass)) {
      oChild = self.findParent(oChild);
    }
    return (self.hasClass(oChild,oClass));
  }

  this.getParentByClassName = function(oChild,sParentClassName) {
    if (!oChild || !sParentClassName) return false;
    sParentClassName = sParentClassName.toLowerCase();
    while (oChild.parentNode && !self.hasClass(oChild.parentNode,sParentClassName)) {
      oChild = self.findParent(oChild);
    }
    return (oChild.parentNode && self.hasClass(oChild.parentNode,sParentClassName)?oChild.parentNode:null);
  }

}

var utils = new Utils();

var lastSelected = null;

function resetFilter(o) {
  // reset everything
  var oParent = null;
  _id('filter-box').style.display = 'none';
  utils.removeClass(_id('main'),'filtered');
  var blocks = utils.getElementsByClassName('f-block',['div','dl'],_id('main'));
  for (var i=blocks.length; i--;) {
    blocks[i].style.display = 'block';
    oParent = utils.getParentByClassName(blocks[i],'columnar',_id('main'));
    if (oParent) oParent.style.display = 'block';
  }
  if (lastSelected) utils.removeClass(lastSelected,'active');
  if (o) lastSelected = o;
  return false;
}

function setFilter(e,sFilterPrefix) {
  var o = e?e.target||e.srcElement:event.srcElement;
  utils.addClass(_id('main'),'filtered');
  var oName = o.nodeName.toLowerCase();
  if (oName == 'a') {
	var parent = utils.findParent(o);
	if (parent && parent.nodeName.toLowerCase() == 'li') {
		// normalize to LI instead.
		o = parent;
		oName = o.nodeName.toLowerCase();
	}
  }
  var sClass = '';
  var blocks = utils.getElementsByClassName('f-block',['div','dl'],_id('main'));
  var oParents = utils.getElementsByClassName('columnar','div',_id('main'));
  var oParent = null;
  var matchingParents = [];
  if (oName != 'li' || o.className == 'ignore') {
    return true;
  }
  var isClear = (lastSelected && lastSelected == o && utils.hasClass(lastSelected,'active'));
  if (oName == 'li' && isClear) {
    return resetFilter();
  }
  if (oName == 'li') {
    // from shortcuts/filter menu
    var innerText = (o.getElementsByTagName('a').length?o.getElementsByTagName('a')[0].innerHTML:o.innerHTML); // get inner text (minus link, if one is there)
    sClass = sFilterPrefix+innerText.substr(0,innerText.indexOf('()')!=-1?innerText.indexOf('()'):999).toLowerCase().replace(/\s+/i,'-');
    var last = sClass.substr(sClass.length-1);
    if (last == '-' || last == ' ') {
      sClass = sClass.substr(0,sClass.length-1); // IE innerHTML trailing whitespace hack (?)
    }
    for (var i=blocks.length; i--;) {
      oParent = utils.getParentByClassName(blocks[i],'columnar',_id('main'));
      if (utils.hasClass(blocks[i],sClass)) {
        blocks[i].style.display = 'block';
        if (oParent) {
          matchingParents.push(oParent);
        }
      } else {
        blocks[i].style.display = 'none';
      }
    }
    for (i=oParents.length; i--;) {
      oParents[i].style.display = 'none';
    }
    for (i=matchingParents.length; i--;) {
      matchingParents[i].style.display = 'block';
    }
    _id('search-results').innerHTML = '<h3><span class="option"><a href="#" title="Restore full content" onclick="resetFilter();return false" style="text-decoration:none"> clear filter </a></span>Content filter: '+(sFilterPrefix=='f-'?'soundManager.':(sFilterPrefix=='s-'?'[SMSound object].':''))+'<b style="font-weight:bold">'+o.innerHTML+'</b></h3>';
    _id('search-results').style.display = 'block';
    _id('filter-box').style.display = 'block';
    if (isClear) {
      _id('filter-box').style.paddingBottom = '0px';
      _id('filter-box').style.display = 'none';
    } else {
      _id('filter-box').style.paddingBottom = '0px';
      if (!navigator.userAgent.match(/msie/i)) {
        _id('filter-box').style.paddingBottom = Math.max(0,(document.documentElement.scrollTop || window.scrollY)-utils.getOffY(_id('filter-box'))-parseInt(_id('filter-box').offsetHeight)-20)+'px';
      }
      _id('filter-box').style.display = 'block';
      // if ((!document.documentElement.scrollTop && !window.scrollY)) _id('filter-box').style.display = 'none';
    }
    if (lastSelected) {
      if (lastSelected == o) {
        utils.toggleClass(lastSelected,'active');
      } else {
        utils.removeClass(lastSelected,'active');
        utils.addClass(o,'active');
      }
    } else {
      utils.addClass(o,'active');
    }
    lastSelected = o;
    // cancel bubble, too?
    return false;
  }
}

function getLiveData() {
  getDynamicData();
  // reinvigorate.net is a handy (and free!) stats tracking service thingy. you should check it out.
  var is_live = (document.domain && document.domain.match(/schillmania.com/i) && typeof re_ != 'undefined');
  loadScript('http://include.reinvigorate.net/re_.js');
  setTimeout(function(){
    if (typeof re_ != 'undefined') re_(is_live?'f6795-v062d0xv4u':'u8v2l-jvr8058c6n');
  },3000);
}

function getDynamicData() {
  // Attempt to fetch data from schillmania.com: "Get Satisfaction" topics, version updates etc.
  loadScript('http://www.schillmania.com/services/soundmanager2/info/?version='+soundManager.versionNumber+'&rnd='+parseInt(Math.random()*1048576));
}

function loadScript(sURL,onLoad) {
  var loadScriptHandler = function() {
    var rs = this.readyState;
    if (rs == 'loaded' || rs == 'complete') {
      this.onreadystatechange = null;
      this.onload = null;
      window.setTimeout(onLoad,20);
	}
  }
  function scriptOnload() {
    this.onreadystatechange = null;
    this.onload = null;
    window.setTimeout(onLoad,20);
  }
  var oS = document.createElement('script');
  oS.type = 'text/javascript';
  if (onLoad) {
    oS.onreadystatechange = loadScriptHandler;
    oS.onload = scriptOnload;
  }
  oS.src = sURL;
  document.getElementsByTagName('head')[0].appendChild(oS);
}

function doAltShortcuts() {
  var o = _id('shortcuts-list');
  if (!o) {
    return false;	
  }
  var oParents = [];
  var oLIs = o.getElementsByTagName('li');
  var isIgnore = null;
  var offset = 0;
  for (var i=0; i<oLIs.length; i++) {
	isIgnore = utils.hasClass(oLIs[i],'ignore');
	if (isIgnore) {
	  offset = 0;
	}
	offset++;
    if ((offset)%2 == 0 && !isIgnore) {
	  utils.addClass(oLIs[i],'alt');
	}
  }
}

function fixLinks() {
  if (document.location.protocol.match(/http/i)) {
    return false;
  }
  // presumably offline - add index.html to local links, so offline browsing is seamless
  var l = document.getElementsByTagName('a');
  var s = null;
  var tmp = null;
  for (var i=l.length; i--;) {
    s = l[i].href.toString();
    if (!s.match(/http/i) && !utils.hasClass(l[i],'norewrite') && (s.match(/doc/i) || s.match(/demo/i) || s.match(/../))) {
      // yep, local.
      tmp = Math.max(s.lastIndexOf('?'),-1);
      tmp = Math.max(s.lastIndexOf('#'),tmp);
      tmp = Math.max(s.lastIndexOf('/')+1,tmp);
       // console.log(s+' '+s.lastIndexOf('?')+', '+s.lastIndexOf('#')+', '+s.lastIndexOf('/')+' = '+tmp);
      if (tmp == -1) {
        tmp = s.length;
      }
      if (!s.match(/\.html/i)) {
        l[i].setAttribute('href',s.substr(0,tmp)+'index.html'+s.substr(tmp));
      }
    }
  }
}

function ie6Sucks() {
  // no :hover, generally-broken layout etc.
  if (!navigator.userAgent.match(/msie 6/i)) {
    return false;	
  }
  var o = _id('nav').getElementsByTagName('li')[1];
  var oA = o.getElementsByTagName('a')[0];
  var oUL = o.getElementsByTagName('ul')[0];
  oA.onclick = function() {
  	oUL.style.display = 'block';
    setTimeout(function(){
      document.onclick = function() {
	    oUL.style.display = 'none';
	    document.onclick = null;
	  }
    },20);
	return false;
  }
}

function doVersion() {
  var o = _id('version');
  if (!o) {
    return false;
  }
  o.innerHTML = soundManager.versionNumber;
}

function doChristmasLights() {
  if ((document.domain.match(/schillmania.com/i) && new Date().getMonth() == 11) || window.location.toString().match(/christmas/i)) {
    loadScript('http://yui.yahooapis.com/combo?2.6.0/build/yahoo-dom-event/yahoo-dom-event.js&2.6.0/build/animation/animation-min.js',function(){
      loadScript('demo/christmas-lights/christmaslights-home.js',function(){
        if (typeof smashInit != 'undefined') {
          setTimeout(smashInit,20);
        }
      });
    });
  }
}

// ---------- home JS ------------

if (window.is_home) {

	// by default, enable native audio (with all its potential caveats.)
	soundManager.useHTML5Audio = true;

	// URL overrides for demo/testing..
	if (document.location.href.match(/sm2-usehtml5audio=1/i)) {
	  soundManager.useHTML5Audio = true; // w00t.
	} else if (document.location.href.match(/sm2-usehtml5audio=0/i)) {
	  soundManager.useHTML5Audio = false;
	}

	soundManager.useFlashBlock = true;
	soundManager.useHighPerformance = true;
	soundManager.useFastPolling = true;
	soundManager.bgColor = '#ffffff';
	soundManager.debugMode = false;
	soundManager.url = 'swf/';
	soundManager.wmode = 'transparent'; // hide initial flash of white on everything except firefox/win32

	var PP_CONFIG = {
	  autoStart: false,      // begin playing first sound when page loads
	  playNext: true,        // stop after one sound, or play through list until end
	  useThrottling: false,  // try to rate-limit potentially-expensive calls (eg. dragging position around)</span>
	  usePeakData: true,     // [Flash 9 only] whether or not to show peak data (left/right channel values) - nor noticable on CPU
	  useWaveformData: false, // [Flash 9 only] show raw waveform data - WARNING: LIKELY VERY CPU-HEAVY
	  useEQData: false,      // [Flash 9 only] show EQ (frequency spectrum) data
	  useFavIcon: false,     // try to apply peakData to address bar (Firefox + Opera) - performance note: appears to make Firefox 3 do some temporary, heavy disk access/swapping/garbage collection at first(?) - may be too heavy on CPU
	  useMovieStar: true     // Flash 9.0r115+ only: Support for a subset of MPEG4 formats.
	}

	threeSixtyPlayer.config = {

	  playNext: false,
	  autoPlay: false,
	  allowMultiple: true,
	  loadRingColor: '#ccc',
	  playRingColor: '#000',
	  backgroundRingColor: '#eee',
	  circleDiameter: 256,
	  circleRadius: 128,
	  animDuration: 500,
	  animTransition: Animator.tx.bouncy,
	  showHMSTime: true,

	  useWaveformData: true,
	  waveformDataColor: '#0099ff',
	  waveformDataDownsample: 2,
	  waveformDataOutside: false,
	  waveformDataConstrain: false,
	  waveformDataLineRatio: 0.73,

	  useEQData: true,
	  eqDataColor: '#339933',
	  eqDataDownsample: 2,
	  eqDataOutside: true,
	  eqDataLineRatio: 0.69,

	  usePeakData: true,
	  peakDataColor: '#ff33ff',
	  peakDataOutside: true,
	  peakDataLineRatio: 0.5,

	  useAmplifier: true

	}

	if (navigator.platform.match(/win32/i) && navigator.userAgent.match(/firefox/i)) {
	  // extra-special homepage case (you should never see this), prevent out-of-view SWF load failure WITH high performance AND flashblock AND SWF in a placed element
	  soundManager.useHighPerformance = false;
	}

	soundManager.useFastPolling = true;

	function checkBadSafari() {
	  var _ua = navigator.userAgent;
	  if (!document.location.href.match(/sm2-usehtml5audio/i) && !window.location.toString().match(/sm2\-ignorebadua/i) && _ua.match(/safari/i) && !_ua.match(/chrome/i) && _ua.match(/OS X 10_6_([3-9])/i)) { // Safari 4 and 5 occasionally fail to load/play HTML5 audio on Snow Leopard due to bug(s) in QuickTime X and/or other underlying frameworks. :/ Known Apple "radar" bug. https://bugs.webkit.org/show_bug.cgi?id=32159
	    var complaint = document.createElement('li');
	    complaint.innerHTML = '<b>Note</b>: Partial HTML5 in effect. Using Flash for MP3/MP4 formats (if available) for this browser/OS due to HTML5 audio load/play failures in Safari 4 + 5 on Snow Leopard 10.6.3+ (maybe fixed in 10.7 "Lion"?), caused by bugs in QuickTime X and/or underlying frameworks. See <a href="https://bugs.webkit.org/show_bug.cgi?id=32159#c9">bugs.webkit.org #32519</a>. (Safari on Leopard + Windows, and iPad OK, however.)<p style="margin:0.5em 0px 0.5em 0px">Try <a href="?sm2-ignorebadua&sm2-usehtml5audio=1">HTML5 anyway?</a> (some MP3 playback may intermittently fail.)';
	    _id('html5-audio-notes').appendChild(complaint);
	  }
	}

	soundManager.onready(function() {

	  _id('sm2-support').style.display = 'none';
	  _id('sm2-support-warning').style.display = 'none';

	  if (soundManager.didFlashBlock) {
	    soundManager.createSound({
	      id: 'success',
	      url: 'demo/_mp3/mouseover.mp3'
	    }).play();
	  }

	  doChristmasLights();

	  // if using HTML5, show some additional format support info
	  // written while watching The Big Lebowski for the Nth time. Donny, you're out of your element!
	  var s = soundManager;

	  if (s.useHTML5Audio && s.hasHTML5) {
	    var li = document.createElement('li');
	    li.className = 'html5support';
	    var items = [];
	    var needsFlash = false;
	    for (item in s.audioFormats) {
	      if (s.audioFormats.hasOwnProperty(item)) {
	        needsFlash = (soundManager.filePattern.test('.' + item));
	        items.push('<span class="' + (s.html5[item] ? 'true' : 'false') + (!s.html5[item] && needsFlash ? ' partial' : '') + '" title="' + (s.html5[item] ? 'Native HTML5 support found' : 'No HTML5 support found' + (needsFlash ? ', using Flash fallback' : ', no Flash support either')) + '">' + (s.html5[item] ? '&lt;' : '') + item + (s.html5[item] ? '&gt;' : '') + '</span>');
	      }
	    }

	    li.innerHTML = 'This browser\'s <em class="true">&lt;HTML5&gt;</em> vs. <em class="partial">Flash</em> support (best guess):<p style="margin:0.5em 0px 0.5em 0px">' + items.join('') + (!soundManager._use_maybe ? '&nbsp; (Try <a href="#sm2-useHTML5Maybe=1" onclick="window.location.href=this.href;window.location.reload()" title="Try using probably|maybe for HTML5 Audio().canPlayType(), more buggy but may get HTML5 support on Chrome/OS X and other browsers.">less-strict HTML5 checking</a>?)' : '&nbsp; (allowing <b>"maybe"</b> for <code>canPlayType()</code>, less-strict HTML5 audio support tests)' + '</p>');
	    _id('html5-audio-notes').appendChild(li);
	    _id('without-html5').style.display = 'inline';

	  } else {

	    _id('without-html5').style.display = 'none';

	  }

	  checkBadSafari();

	  // check inline player / HTML 5 bits
	  var items = _id('muxtape-html5').getElementsByTagName('a');
	  for (var i = 0, j = items.length; i < j; i++) {
	    if (!soundManager.canPlayLink(items[i])) {
	      items[i].className += ' not-supported';
	      items[i].title += '. \n\nNOTE: '+(soundManager.useHTML5Audio?'Format apparently not supported by this browser.':'SoundManager 2\'s HTML5 feature is not currently enabled. (Try turning it on, see +html5 link.)');
	    }
	  }

	});

	soundManager.ontimeout(function() {

	  // failed to load

	  if (navigator.userAgent.match(/msie 6/i)) {
	    // we don't care.
	    return false;
	  }

	  var o = _id('sm2-support');
	  var o2 = _id('sm2-support-warning');
	  var smLoadFailWarning = '<div style="margin:0.5em;margin-top:-0.25em"><h3>Oh snap!</h3><p>' + (soundManager.hasHTML5 ? 'The flash portion of ' : '') + 'SoundManager 2 was unable to start. ' + (soundManager.useHTML5Audio ? (soundManager.hasHTML5 ? '</p><p>Partial HTML5 Audio() is present, but flash is needed for MP3 and/or MP4 support.' : '<br>(No HTML5 Audio() support found, either.)') : '') + '<br>All links to audio will degrade gracefully.</p><p id="flashblocker">If you have a flash blocker, try allowing the SWF to run - it should be visible above.</p><p id="flash-offline">' + (!soundManager._overHTTP ? '<b>Viewing offline</b>? You may need to change a Flash security setting.' : 'Other possible causes: Missing .SWF, or no Flash?') + ' Not to worry, as guided help is provided.</p><p><a href="doc/getstarted/index.html#troubleshooting" class="feature-hot" style="display:inline-block;margin-left:0px">Troubleshooting</a></p></div>';
	  var hatesFlash = (navigator.userAgent.match(/(ipad|iphone)/i));
	  o.innerHTML = smLoadFailWarning;
	  o2.innerHTML = '<p style="margin:0px">SoundManager 2 could not start. <a href="#inline-demos">See below</a> for details.</p>';
	  if (hatesFlash || soundManager.getMoviePercent()) {
	    // movie loaded at least somewhat, so don't show flashblock things
	    _id('flashblocker').style.display = 'none';
	    if (hatesFlash) {
	      // none of that here.
	      _id('flash-offline').style.display = 'none';
	    }
	  }
	  o.style.marginBottom = '1.5em';
	  o.style.display = 'block';
	  o2.style.display = 'inline-block';
	});

}

// side note: If it's not december but you want to smash things, try #christmas=1 in the homepage URL.

// --------- /home JS ------------

function startStuff() {
  if (navigator.userAgent.match(/safari/i)) {
    document.getElementsByTagName('html')[0].className = 'isSafari';
  }
  doVersion();
  ie6Sucks();
  fixLinks();
  getLiveData();
  doAltShortcuts();
}

if (document.addEventListener) {
  document.addEventListener("DOMContentLoaded", startStuff, false);
} else {
  window.onload = startStuff;
}
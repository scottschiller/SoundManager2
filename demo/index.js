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

var smLoadFailWarning = '<div style="margin:0.5em;margin-top:-0.25em"><h3>Oh snap!</h3><p>SoundManager 2 was unable to start.</p><p id="flashblocker">If you have a flash blocker, try allowing the above SWF to run.</p><p>'+(!soundManager._overHTTP?'Viewing offline? You may need to change a Flash security setting.':'Other possible causes: Missing .SWF, or no Flash?')+' Not to worry, as guided help is provided.</p><p><a href="doc/getstarted/index.html#troubleshooting" class="feature-hot">Troubleshooting</a></p></div>';

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
// SoundManager 2 start-up troubleshooting tool

// FlashDetect, by Carl Yestrau
// http://www.featureblend.com/license.txt
var FlashDetect=new function(){var self=this;self.installed=false;self.raw="";self.major=-1;self.minor=-1;self.revision=-1;self.revisionStr="";var activeXDetectRules=[{"name":"ShockwaveFlash.ShockwaveFlash.7","version":function(obj){return getActiveXVersion(obj);}},{"name":"ShockwaveFlash.ShockwaveFlash.6","version":function(obj){var version="6,0,21";try{obj.AllowScriptAccess="always";version=getActiveXVersion(obj);}catch(err){}
return version;}},{"name":"ShockwaveFlash.ShockwaveFlash","version":function(obj){return getActiveXVersion(obj);}}];var getActiveXVersion=function(activeXObj){var version=-1;try{version=activeXObj.GetVariable("$version");}catch(err){}
return version;};var getActiveXObject=function(name){var obj=-1;try{obj=new ActiveXObject(name);}catch(err){}
return obj;};var parseActiveXVersion=function(str){var versionArray=str.split(",");return{"raw":str,"major":parseInt(versionArray[0].split(" ")[1],10),"minor":parseInt(versionArray[1],10),"revision":parseInt(versionArray[2],10),"revisionStr":versionArray[2]};};var parseStandardVersion=function(str){var descParts=str.split(/ +/);var majorMinor=descParts[2].split(/\./);var revisionStr=descParts[3];return{"raw":str,"major":parseInt(majorMinor[0],10),"minor":parseInt(majorMinor[1],10),"revisionStr":revisionStr,"revision":parseRevisionStrToInt(revisionStr)};};var parseRevisionStrToInt=function(str){return parseInt(str.replace(/[a-zA-Z]/g,""),10)||self.revision;};self.majorAtLeast=function(version){return self.major>=version;};self.FlashDetect=function(){if(navigator.plugins&&navigator.plugins.length>0){var type='application/x-shockwave-flash';var mimeTypes=navigator.mimeTypes;if(mimeTypes&&mimeTypes[type]&&mimeTypes[type].enabledPlugin&&mimeTypes[type].enabledPlugin.description){var version=mimeTypes[type].enabledPlugin.description;var versionObj=parseStandardVersion(version);self.raw=versionObj.raw;self.major=versionObj.major;self.minor=versionObj.minor;self.revisionStr=versionObj.revisionStr;self.revision=versionObj.revision;self.installed=true;}}else if(navigator.appVersion.indexOf("Mac")==-1&&window.execScript){var version=-1;for(var i=0;i<activeXDetectRules.length&&version==-1;i++){var obj=getActiveXObject(activeXDetectRules[i].name);if(typeof obj=="object"){self.installed=true;version=activeXDetectRules[i].version(obj);if(version!=-1){var versionObj=parseActiveXVersion(version);self.raw=versionObj.raw;self.major=versionObj.major;self.minor=versionObj.minor;self.revision=versionObj.revision;self.revisionStr=versionObj.revisionStr;}}}}}();};FlashDetect.release="1.0.3";

// flash version URL switch (for this demo page)
var winLoc = window.location.toString();
if (winLoc.match(/flash9/i)) {
  soundManager.setup({
    flashVersion: 9,
    preferFlash: true
  });
  if (winLoc.match(/highperformance/i)) {
    soundManager.setup({
      useHighPerformance: true
    });
  }
} else if (winLoc.match(/flash8/i)) {
  soundManager.setup({
    flashVersion: 8,
    preferFlash: true
  });
}

var sm2Debugger = null;

function SM2Debugger() {

  var elementIDs = ['flashtojs','jstoflash','onload','soundtest','swf','hasflash'];
  var elements = {};
  var self = this;

  this.getXHR = function() {
    var xhr = null;
    if (typeof window.XMLHttpRequest != 'undefined') {
      try {
        xhr = new XMLHttpRequest();
      } catch(e) {
        // d'oh
      }
    }
    if (!xhr) {
      try {
        xhr = new ActiveXObject('Msxml2.XMLHTTP');
      } catch(e) {
        try {
  	      xhr = new ActiveXObject('Microsoft.XMLHTTP');
        } catch(E) {
         xhr = null;
        }
  	  }
    }
    return xhr;
  }

  this.testURL = function(sURL,fOnComplete) {
    var xhr = self.getXHR();
    var msg = '<a href="'+soundManager.url+'" title="This should be a valid .SWF URL, not a 404 etc.">'+soundManager.url+'</a>';
    if (soundManager.getMoviePercent() == 100) {
	// SWF may have already loaded
	fOnComplete(true,msg);
    } else {
      try {
	  xhr.open("HEAD",sURL,true);
    	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
		if (xhr.status == '200') {
		  fOnComplete(true,msg);
		} else if (xhr.status == '404') {
		  fOnComplete(false,msg);
		} else {
		  // some other response
		  fOnComplete('unknown',(xhr.status != '0'?'HTTP response: '+xhr.status+', ':'')+msg); // safari returns 0 when offline
		}
	  }
	}
	xhr.send(null);

      } catch(e) {
	  // fail (cross-domain, or no XHR) unless offline
	  fOnComplete('unknown',msg);
	  return false;
      }
    }
  }

  this.handleEvent = function(sEventType,bSuccess,sMessage) {
	var o = elements[sEventType];
	if (o) {
	  o.className = (bSuccess == true?'pass':(bSuccess != false?bSuccess:'fail')); // true = pass, className as argument, or false == fail
	  if (sMessage) {
	    var oSpan = o.getElementsByTagName('span')[4];
	    if (oSpan) {
	      oSpan.innerHTML = (oSpan.innerHTML +' <span class="msg">'+sMessage+'</msg>');
	    } else {
	      o.title = sMessage;
	    }
	  }
	  // associated events
	  if (sEventType == 'onload') {
	    if (bSuccess) {
	      self.doSoundTest();
	    } else {
	      self.testURL(soundManager.url,function(bSuccess,sMessage) {
		if (typeof sMessage == 'undefined') {
		  sMessage = null;
		}
		self.handleEvent('swf',bSuccess,sMessage);
	      });
	    }
	  } else if (sEventType == 'swf') {
            if (bSuccess == false) {
              // don't show flashtojs at all if SWF failed to load
              self.handleEvent('flashtojs','default'); // reset to N/A status
            }
	  } else if (sEventType == 'flashtojs') {
            if (bSuccess != true) {
	      // online or offline help messages
	      if (soundManager._overHTTP) {
		document.getElementById('d-flashtojs-offline').style.display = 'none';
	      } else {
		document.getElementById('d-flashtojs-online').style.display = 'none';
              }
	    }
	  }
	} else {
	  soundManager._writeDebug('SM2 debugger warning: Undefined event type "'+sEventType+'"',1);
	}
  }

  this.doSoundTest = function() {
    var foo = soundManager.createSound({
	  id: 'sm2TestSound',
	  url: ('http://www.schillmania.com/projects/soundmanager2/demo/_mp3/mouseover.mp3')
    });
    if (!soundManager._disabled) {
      foo.play();
	  // looks to be OK..
	  if (!soundManager._disabled) {
		// still OK..
	    self.handleEvent('soundtest',true);
	  } else {
	    self.handleEvent('soundtest',false,': Failed after play()');	
	  }
    } else {
	  self.handleEvent('soundtest',false,': Failed after createSound()');
    }
  }

  this.init = function() {
	// map event elements to DOM nodes - eg. elements.flashtojs = document.getElementById('d-flashtojs');
    for (var i=elementIDs.length; i--;) {
	  elements[elementIDs[i]] = document.getElementById('d-'+elementIDs[i]);
    }
    self.doFlashTest();
  }

  this.doFlashTest = function() {
    var fd = FlashDetect;
    var hasFlash = fd.installed;
    var fv = soundManager.setupOptions.flashVersion;
    var isSupported = (hasFlash && fd.major >= fv);
    var flashVersion = fd.major+'.'+fd.minor+'.'+fd.revisionStr;
    var flashInfo = ' version '+(!isSupported?'unsupported ('+flashVersion+', SWF version '+fv+')':flashVersion);
    document.getElementById('d-flashversion').innerHTML = 'soundManager.flashVersion = '+fv+';';
    if (hasFlash) {
      self.handleEvent('hasflash',isSupported,hasFlash?flashInfo:null);
    } else {
      self.handleEvent('hasflash','default',hasFlash?flashInfo:null);
    }
  }

  soundManager.setup({
    debugFlash: true // try to get flash debug output, as well
  });

  this.init();

}

function sm2DebugInit() {
  sm2Debugger = new SM2Debugger();
}
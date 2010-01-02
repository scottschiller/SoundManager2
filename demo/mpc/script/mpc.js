// demo-specific code - not needed for general use

// refer to bottom for initialisation and soundManager tie-ins, however!

var MPC = function() {
  var self = this;
  this.idPrefix = 'btn-'; // HTML ID prefix
  this.statusWidth = 6;
  this.progressWidth = 256;
  this.keys = {'1':0,'2':1,'3':2,'4':3,'q':4,'w':5,'e':6,'r':7,'a':8,'s':9,'d':10,'f':11,'z':12,'x':13,'c':14,'v':15}
  this.isSafari = (navigator.userAgent.toString().toLowerCase().indexOf('safari')+1);

  // scope within these event handler methods: "this" = SMSound() object instance (see SMSound() in soundmanager.js for reference) 

  this.showProgress = function() {
    // sound is loading, update bytes received using this.bytesLoaded / this.bytesTotal
    if (self._getButton(this.sID).className != 'loading') self._getButton(this.sID).className = 'loading'; // a bit inefficient here..
    self._showStatus(this.sID,this.bytesLoaded,this.bytesTotal);
  }

  this.onid3 = function() {
    soundManager._writeDebug('mpc.onid3()');
    var oName = null;
    for (var oName in this.id3) {
      soundManager._writeDebug(oName+': '+this.id3[oName]) // write out name/value ID3 pairs (eg. "artist: Beck")
    }
  }

  this.onload = function() {
    var sID = this.sID;
    self._getButton(this.sID).className = '';
    self._getButton(this.sID).title = ('Sound ID: '+this.sID+' ('+this.url+')');
  }

  this.onfinish = function() {
    self._getButton(this.sID).className = '';
    self._reset(this.sID);
  }

  this.onplay = function() {
    self._getButton(this.sID).className = 'active';
    if (self.isSafari) self._getButton(this.sID).style.clip = 'rect(0px 0px 0px 0px)';
  }

  this.whileplaying = function() {
    self._showStatus(this.sID,this.position,this.duration);
  }

  this._keyHandler = function(e) {
    var oEvt = e?e:event;
    var sChar = String.fromCharCode(oEvt.keyCode).toLowerCase();
    if (typeof self.keys[sChar] != 'undefined') soundManager.play('s'+self.keys[sChar]);
  }

  this._showStatus = function(sID,n1,n2) {
    var o = self._getButton(sID).getElementsByTagName('div')[0];
    var offX = (n2>0?(-self.progressWidth+parseInt((n1/n2)*o.offsetWidth)):-self.progressWidth);
    if (self.isSafari) o.style.clip = 'rect(0px '+parseInt((n1/n2)*o.offsetWidth)+'px auto 0px)'; // because safari appears to suck, refuses not to tile background images..
    o.style.backgroundPosition = offX+'px 0px';
  }

  this._getButton = function(sID) {
    return document.getElementById(self.idPrefix+sID);
  }

  this._reset = function(sID) {
    var id = sID;
    self._showStatus(sID,1,1);
    setTimeout(function(){self._showStatus(sID,0,0);},200);
  }

  this.init = function() {
    document.onkeydown = self._keyHandler;
  }

}

var mpc = new MPC();

soundManager.flashVersion = (window.location.toString().match(/#flash8/i)?8:9);
if (soundManager.flashVersion != 8) {
  soundManager.useHighPerformance = true;
  soundManager.useFastPolling = true;
}
soundManager.url = '../../swf/'; // path to load SWF from (overriding default)
soundManager.debugMode = false;
soundManager.consoleOnly = false;

soundManager.onready(function() {

  // This is the "onload" equivalent which is called when SoundManager has been initialised (sounds can be created, etc.)

  mpc.init();

  // set up some default options / event handlers - so all sounds created are given these handlers

  soundManager.defaultOptions.autoLoad = true;
  soundManager.defaultOptions.whileloading = mpc.showProgress;
  soundManager.defaultOptions.onid3 = mpc.onid3;
  soundManager.defaultOptions.onload = mpc.onload;
  soundManager.defaultOptions.onplay = mpc.onplay;
  soundManager.defaultOptions.whileplaying = mpc.whileplaying;
  soundManager.defaultOptions.onfinish = mpc.onfinish;

  // get drumkit sounds from XML file (as opposed to using createSound)

  soundManager.loadFromXML('acoustic-drumkit.xml');

  /*

   You can also create sounds using Javascript methods, instead of XML.
   Options can also be set on a per-file basis, with specific option overrides.
   (Options not specified here will inherit defaults as defined in soundManager.defaultOptions.)

   eg.

   soundManager.createSound({
    id: 'mySound',
    url: '/path/to/some.mp3',
    stream: true,
    autoPlay: true,
    multiShot: false,
    whileloading: function() { alert('sound '+this.sID+': '+this.bytesLoaded+' of '+this.bytesTotal+' bytes loaded.'); } // event handler: "this" is scoped to SMSound() object instance for easy access to methods/properties
   });

   - OR -

   If you just want a sound with all default options, you can also specify just the required id and URL as string parameters:

   soundManager.createSound('mySound','/path/to/some.mp3');

  */
});

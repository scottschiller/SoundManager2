/**
 * SoundManager 2: MPC (Drum Machine) demo
 */

var MPC = function() {
  var self = this;
  this.idPrefix = 'btn-'; // HTML ID prefix
  this.statusWidth = 6;
  this.progressWidth = 256;
  this.keys = {'1':0,'2':1,'3':2,'4':3,'q':4,'w':5,'e':6,'r':7,'a':8,'s':9,'d':10,'f':11,'z':12,'x':13,'c':14,'v':15}

  // scope within these event handler methods: "this" = SMSound() object instance (see SMSound() in soundmanager.js for reference) 

  this.showProgress = function() {
    // sound is loading, update bytes received using this.bytesLoaded / this.bytesTotal
    if (self._getButton(this.id).className != 'loading') self._getButton(this.id).className = 'loading'; // a bit inefficient here..
    self._showStatus(this.id,this.bytesLoaded,this.bytesTotal);
  }

  this.onload = function() {
    var sID = this.id;
    self._getButton(this.id).className = '';
    self._getButton(this.id).title = ('Sound ID: '+this.id+' ('+this.url+')');
  }

  this.onfinish = function() {
    self._getButton(this.id).className = '';
    self._reset(this.id);
  }

  this.onplay = function() {
    self._getButton(this.id).className = 'active';
  }

  this.whileplaying = function() {
    self._showStatus(this.id,this.position,this.duration);
  }

  this._keyHandler = function(e) {
    var oEvt = e?e:event;
    var sChar = String.fromCharCode(oEvt.keyCode).toLowerCase();
    if (typeof self.keys[sChar] != 'undefined') soundManager.play('s'+self.keys[sChar]);
  }

  this._showStatus = function(sID,n1,n2) {
    var o = self._getButton(sID).getElementsByTagName('div')[0];
    var offX = (n2>0?(-self.progressWidth+parseInt((n1/n2)*o.offsetWidth)):-self.progressWidth);
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
}

soundManager.setup({
  url: '../../swf/', // path to load SWF from (overriding default)
  bgColor: '#333333',
  wmode: 'transparent',
  debugMode: false,
  preferFlash: false,
  html5PollingInterval: 50,
  ignoreMobileRestrictions: true,
  onready: function() {

    soundManager.setup({
      defaultOptions: {
        autoLoad: true,
        multiShot: true,
        whileloading: mpc.showProgress,
        onid3: mpc.onid3,
        onload: mpc.onload,
        onplay: mpc.onplay,
        whileplaying: mpc.whileplaying,
        onfinish: mpc.onfinish
      }
    });

    // This is the "onload" equivalent which is called when SoundManager has been initialised (sounds can be created, etc.)
    mpc.init();

    if (!soundManager.html5.needsFlash) {
      document.getElementById('isHTML5').style.display = 'inline';
    }

    var soundURLs = 'AMB_BD_1,AMB_FTM2,AMB_HHCL,AMB_HHOP,AMB_HHPD,AMB_HTM,AMB_LTM2,AMB_MTM,AMB_RIM1,AMB_SN13,AMB_SN_5,CHINA_1,CRASH_1,CRASH_5,CRASH_6,RIDE_1'.split(',');
    for (var i=0; i<soundURLs.length; i++) {
      soundManager.createSound({
        id: 's'+i,
        url: 'audio/'+soundURLs[i]+'.mp3'
      });
    }

    /**
     * createSound options can also be set on a per-file basis, with specific option overrides.
     * (Options not specified here will inherit defaults as defined in soundManager.defaultOptions.)
     *
     * eg.
     *
     * soundManager.createSound({
     *  id: 'mySound',
     *  url: '/path/to/some.mp3',
     *  stream: true,
     *  autoPlay: true,
     *  multiShot: false,
     *  whileloading: function() { alert('sound '+this.id+': '+this.bytesLoaded+' of '+this.bytesTotal+' bytes loaded.'); } // event handler: "this" is scoped to SMSound() object instance for easy access to methods/properties
     * });
     *
     * - OR -
     *
     * If you just want a sound with all default options, you can also specify just the required id and URL as string parameters:
     *
     * soundManager.createSound('mySound','/path/to/some.mp3');
     */
  }
});


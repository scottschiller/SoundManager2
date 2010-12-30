/*

  FlashBlock handler for SoundManager 2
  -------------------------------------------------------------------
  Attempt to handle and gracefully recover from flashblock conditions
  Requires SoundManger v2.95a.20090717+

  http://schillmania.com/projects/soundmanager2/

*/
soundManager._flashBlock = new function() {

 var _s = this;
 this.name = 'soundManager._flashblock';
 this.didTimeout = false; // did initial attempt fail?
 this.timer = null; // for setTimeout call

 this.startTimer = function(nMsec) {
  // soundManager._wD(_s.name+'_.starttimer()');
  _s.timer = window.setTimeout(_s.checkFlashStatus,nMsec);
 };

 this.stopTimer = function() {
  // soundManager._wD(_s.name+'.stoptimer()');
  if (_s.timer) {
    window.clearTimeout(_s.timer);
    _s.timer = null;
  }
 };

 this.checkFlashStatus = function() {
  // soundManager._wD(_s.name+'.checkflashstatus()');
  var _sm = soundManager;
  var oMC = _sm.oMC; // DIV (default: #sm2-container) for .SWF
  var oStatus = document.getElementById('sm2-status'); // demo-only

  if (!_sm.ok()) {
    // make the movie more visible, so user can fix
    oMC.className = 'swf-timedout';
    _s.didTimeout = true;
    var msg = 'No flash response, applying .swf-timedout CSS..';
    _sm._wD(_s.name+': '+msg);
    if (oStatus) {
      oStatus.innerHTML = '<span style="color:#996633">'+msg+'</span>';
    }
  } else {
    // SM2 loaded OK
    // move the movie container to its proper place
    oMC.className = 'swf-loaded';
    if (!_s.didTimeout) {
	  // SM2 didn't previously fail, no blocker active
	  var msg = 'SM2 loaded OK (before timeout), fast unblock or no blocker.';
	  _sm._writeDebug(_s.name+'.checkFlashStatus: '+msg,1);
	  if (oStatus) {
            oStatus.innerHTML = '<span style="color:green">'+msg+'</span>';
	  }
    } else {
      var msg = 'SM2 recovered after block (or timeout), loaded OK.';
      _sm._wD(_s.name+': '+msg);
      if (oStatus) {
        oStatus.innerHTML = '<span style="color:#996633">'+msg+'</span>';
      }
    }
    // stop timer, if applicable
    _s.stopTimer();
    return false;
  }
 };

  soundManager.flashLoadTimeout = 0; // wait forever for flash to load - we'll set our own timeout via oninitmovie()

  soundManager.oninitmovie = function() {
    // when SWF is written (or ready to start), wait and make SWF visible (time-out case)
    soundManager._flashBlock.startTimer(750);
  };

  soundManager.onready(function() {
    // SM2 has now initialized, either no blocking OR blocked movie was allowed/whitelisted
    var fb = soundManager._flashBlock;
    // Yay! recovered OK.
    fb.checkFlashStatus();
  });

  soundManager.ontimeout(function() {
    // Blocking was passed (or no blocking), but then something *else* went wrong.
    // stop timer, if applicable
    fb.stopTimer();
  });

}();

// Christmas Light Smashfest
// Adapted from XLSF 2007 as originally used on http://schillmania.com/?theme=2007&christmas=1

var Y = {
 // shortcuts
 A: YAHOO.util.Anim,
 D: YAHOO.util.Dom,
 E: YAHOO.util.Event,
 UE: YAHOO.util.Easing,
 CA: YAHOO.util.ColorAnim,
 BG: YAHOO.util.BgPosAnim
}

function XLSF(oTarget,urlBase,lightClass) {
  var writeDebug = soundManager._wD;
  writeDebug('XLSF()');
  var IS_MOON_COMPUTER = false;
  var isIE = navigator.userAgent.match(/msie/i);
  var self = this;
  var xlsf = self;
  var animDuration = 1;
  this.oFrag = document.createDocumentFragment();
  this.oTarget = (oTarget?oTarget:document.documentElement);
  this.oExplosionBox = document.createElement('div');
  this.oExplosionBox.className = 'xlsf-fragment-box';
  this.oExplosionFrag = document.createElement('div');
  this.oExplosionFrag.className = 'xlsf-fragment';
  this.lights = [];
  this.lightClasses = {
    pico: 32,
    tiny: 50,
    small: 64,
    medium: 72,
    large: 96	
  }
  this.urlBase = (typeof urlBase == 'undefined' || !urlBase?'demo/christmas-lights/':urlBase);

  if (window.innerWidth || window.innerHeight) {
    var screenX = window.innerWidth; // -(!isIE?24:2);
    var screenY = window.innerHeight;
  } else {
    var screenX = (document.documentElement.clientWidth||document.body.clientWidth||document.body.scrollWidth); // -(!isIE?8:0);
    var screenY = (document.documentElement.clientHeight||document.body.clientHeight||document.body.scrollHeight);
  }

  this.lightClass = (screenX>1280?'small':'pico'); // kind of light to show (32px to 96px square)

  if (typeof lightClass != 'undefined') {
	// hack: override
    this.lightClass = lightClass;	
  }

  if (window.location.href.match(/size=/i)) {
    this.lightClass = window.location.href.substr(window.location.href.indexOf('size=')+5);
  }

  this.lightXY = this.lightClasses[this.lightClass]; // shortcut to w/h

  this.lightGroups = {
    left: [],
    top: [],
    right: [],
    bottom: []
  }
  this.lightSmashCounter = 0;
  this.lightIndex = 0;
  this.lightInterval = 250;
  this.timer = null;
  this.bgBaseX = 0;
  this.bgBaseY = 0;
  this.soundIDs = 0;
  this.soundPan = {
    panValue: 75,
    left: 0,
    mid: 481,
    right: 962
  }

  this.cover = document.createElement('div');
  this.cover.className = 'xlsf-cover';
  document.documentElement.appendChild(this.cover);

  this.initSounds = function() {
	for (var i=0; i<6; i++) {
	  soundManager.createSound({
	    id: 'smash'+i,
	    url: xlsf.urlBase+'sound/glass'+i+'.mp3',
	    autoLoad: true,
	    multiShot: true,
		volume:50
	  });
	}
    self.initSounds = function() {} // safety net
  }

  this.appendLights = function() {
	writeDebug('xlsf.appendLights()');
    self.oTarget.appendChild(self.oFrag);
    self.oFrag = document.createDocumentFragment();
  }

  function ExplosionFragment(nType,sClass,x,y,vX,vY) {
    var self = this;
    this.o = xlsf.oExplosionFrag.cloneNode(true);
    this.nType = nType;
    this.sClass = sClass;
    this.x = x;
    this.y = y;
    this.w = 50;
    this.h = 50;
    this.bgBaseX = 0;
    this.bgBaseY = this.h*this.nType;
    this.vX = vX*(1.5+Math.random());
    this.vY = vY*(1.5+Math.random());
    this.oA = null;
    this.oA2 = null;
    this.burstPhase = 3; // starting background offset point
    this.burstPhases = 4; // 1+offset (ignore large size)
    this.o.style.backgroundPosition = ((this.w*-this.burstPhase)+'px '+(this.h*-nType)+'px');

    // boundary checks
    if (self.sClass == 'left') {
      this.vX = Math.abs(this.vX);
    } else if (self.sClass == 'right') {
      this.vX = Math.abs(this.vX)*-1;
    }

    this.burstTween = function() {
      // determine frame to show
      var phase = 1+Math.floor((this.currentFrame/this.totalFrames)*self.burstPhases);
      if (phase != self.burstPhase) {
        self.burstPhase = phase;
        self.o.style.backgroundPosition = ((self.w*-self.burstPhase)+'px '+(self.h*-nType)+'px');
      }
    }

    this.burst = function() {
      self.oA = new Y.A(self.o,{marginLeft:{to:(self.vX*8)},marginTop:{to:(self.vY*8)}},animDuration,Y.UE.easeOutStrong);
      self.oA.onTween.subscribe(self.burstTween);
      // self.oA.onComplete.subscribe(self.hide);
      self.oA.animate();
    }

    this.hide = function() {
      if (!isIE) self.o.style.opacity = 0;
    }

    this.reset = function() {
      self.o.style.left = '0px';
      self.o.style.top = '0px';
      self.o.style.marginLeft = '0px';
      self.o.style.marginTop = '0px';
      if (!isIE) self.o.style.opacity = 1;
    }

    this.animate = function() {
      self.reset();
      self.burst();
    }

  }

  function Explosion(nType,sClass,x,y) {
    var oParent = this;
    var self = this;
    this.o = null;
    this.nType = nType;
    this.sClass = sClass;
    this.x = x;
    this.y = y;
    this.boxVX = 0;
    this.boxVY = 0;
    this.o = xlsf.oExplosionBox.cloneNode(true);
    this.o.style.left = x+'px';
    this.o.style.top = y+'px';
    // this.oFrag = document.createDocumentFragment();
    this.fragments = [];

    var mX = x;
    var mY = y;

    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,-5,-5));
    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,0,-5));
    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,5,-5));

    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,-5,0));
    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,0,0));
    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,5,0));

    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,5,-5));
    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,5,0));
    this.fragments.push(new ExplosionFragment(nType,sClass,mX,mY,5,5));

    this.init = function() {
      for (var i=self.fragments.length; i--;) {
        self.o.appendChild(self.fragments[i].o);
      }
      // xlsf.oTarget.appendChild(self.o);
      // self.oFrag = document.createDocumentFragment();
      if (!IS_MOON_COMPUTER) {
        // faster rendering, particles get cropped
        xlsf.oFrag.appendChild(self.o);
      } else {
        // slower rendering, can overlay body
        // $('header').appendChild(self.o); 
        // (document.documentElement?document.documentElement:document.body).appendChild(o);
        xlsf.oFrag.appendChild(self.o);
      }
    }

    this.reset = function() {
      // clean-up
      // self.o.parentNode.removeChild(self.o);
      self.o.style.display = 'none';
      self.o.style.marginLeft = '0px';
      self.o.style.marginTop = '0px';
      self.o.style.left = self.x+'px';
      self.o.style.top = self.y+'px';
      if (!isIE) self.o.style.opacity = 1;
      for (var i=self.fragments.length; i--;) {
        self.fragments[i].reset();
      }
    }

    this.trigger = function(boxVX,boxVY) {
      self.o.style.display = 'block';
      self.boxVX = boxVX;
      self.boxVY = boxVY;
      // boundary checks
      if (self.sClass == 'right') {
        self.boxVX = Math.abs(self.boxVX)*-1;
      } else if (self.sClass == 'left') {
        self.boxVX = Math.abs(self.boxVX);
      }
      for (var i=self.fragments.length; i--;) {
        self.fragments[i].animate();
      }
      if (!isIE && (IS_MOON_COMPUTER)) {
        var oAExplode = new Y.A(self.o,{marginLeft:{to:100*self.boxVX},marginTop:{to:150*self.boxVY},opacity:{to:0.01}},animDuration,Y.UE.easeInStrong);
      } else {
        // even IE 7 sucks w/alpha-transparent PNG + CSS opacity. Boo urns.
        var oAExplode = new Y.A(self.o,{marginLeft:{to:100*self.boxVX},marginTop:{to:150*self.boxVY}},animDuration,Y.UE.easeInStrong);
      }
      oAExplode.onComplete.subscribe(self.reset);
      oAExplode.animate();
      // setTimeout(self.reset,animDuration*1000*1.5);
    }

    this.init();

    // this.trigger(); // boooom!

  }

  function Light(sSizeClass,sClass,nType,x,y) {
    var self = this;
    this.o = document.createElement('div');
    this.sClass = sClass;
    this.sSizeClass = sSizeClass;
    this.nType = (nType||0);
    this.useY = (sClass == 'left' || sClass == 'right');
    this.state = null;
    this.broken = 0;
    this.w = xlsf.lightClasses[sSizeClass];
    this.h = xlsf.lightClasses[sSizeClass];
    this.x = x;
    this.y = y;
    this.bg = xlsf.urlBase+'image/bulbs-'+this.w+'x'+this.h+'-'+this.sClass+'.png';
    this.o.style.width = this.w+'px';
    this.o.style.height = this.h+'px';
    this.o.style.background = 'url('+this.bg+') no-repeat 0px 0px';
    this.bgBaseX = (self.useY?-self.w*this.nType:0);
    this.bgBaseY = (!self.useY?-self.h*this.nType:0);
    this.glassType = parseInt(Math.random()*6);
    this.oExplosion = null;
    this.soundID = 'smash'+this.glassType;
    var panValue = xlsf.soundPan.panValue; // eg. +/- 80%
    this.pan = parseInt(this.x<=xlsf.soundPan.mid?-panValue+((this.x/xlsf.soundPan.mid)*panValue):(this.x-xlsf.soundPan.mid)/(xlsf.soundPan.right-xlsf.soundPan.mid)*panValue);

    this.initSound = function() {
    }

    this.setBGPos = function(x,y) {
      self.o.style.backgroundPosition = ((self.bgBaseX+x)+'px '+(self.bgBaseY+y)+'px');
    }

    this.setLight = function(bOn) {
      if (self.broken || self.state == bOn) return false;
      if (!self.w || !self.h) self.getDimensions();
      self.state = bOn;
      if (self.useY) {
        self.setBGPos(0,-this.h*(bOn?0:1));
      } else {
        self.setBGPos(-this.w*(bOn?0:1),0);
      }
    }

    this.getDimensions = function() {
      self.w = self.o.offsetWidth;
      self.h = self.o.offsetHeight;
      self.bgBaseX = (self.useY?-self.w*self.nType:0);
      self.bgBaseY = (!self.useY?-self.h*self.nType:0);
    }

    this.on = function() {
      self.setLight(1);
    }

    this.off = function() {
      self.setLight(0);
    }

    this.flickr = function() {
      self.setLight(Math.random()>=0.5?1:0);
    }

    this.toggle = function() {
      self.setLight(!self.state?1:0);
    }

    this.explode = function(e) {
      // self.oExplosion = new Explosion(self.nType,self.sClass,self.x,self.y);
      self.oExplosion.trigger(0,1); // boooom!
    }

    this.smash = function(e) {
      if (self.broken) return false;
      self.broken = true;
      if (soundManager && soundManager._didInit && !soundManager._disabled) {
        soundManager.play(self.soundID,{pan:self.pan});
        // soundManager.sounds[self.soundID].play({pan:self.pan});
        // if (self.bonusSound != null) window.setTimeout(self.smashBonus,1000);
      }
      self.explode(e);
      var rndFrame = 2; // +parseInt(Math.random()*3);
      if (self.useY) {
        self.setBGPos(0,self.h*-rndFrame);
      } else {
        self.setBGPos(self.w*-rndFrame,0);
      }
      xlsf.lightSmashCounter++;
    }

    this.smashBonus = function() {
      // soundManager.play(self.bonusSounds[self.bonusSound],urlBase+'sound/'+self.bonusSounds[self.bonusSound]+'.mp3');
    }

    this.reset = function() {
      if (!self.broken) return false;
      self.broken = false;
      self.state = null;
      xlsf.lightSmashCounter--;
      self.flickr();
    }

    this.init = function() {
      self.o.className = 'xlsf-light '+this.sizeClass+' '+this.sClass;
      self.o.style.left = self.x+'px';
      self.o.style.top = self.y+'px';
      self.o.style.width = self.w+'px';
      self.o.style.height = self.h+'px';
      self.o.onmouseover = self.smash;
      self.o.onclick = self.smash;
      self.flickr();
      xlsf.oFrag.appendChild(self.o);
      self.oExplosion = new Explosion(self.nType,self.sClass,self.x,self.y);
    }

    this.init();
    
  } // Light()

  this.createLight = function(sClass,nType,x,y) {
    var oLight = new Light(self.lightClass,sClass,nType,x,y);
    self.lightGroups[sClass].push(oLight);
    self.lights.push(oLight);
    return oLight;
  }

  this.rotateLights = function() {
    self.lights[self.lightIndex==self.lights.length?self.lights.length-1:self.lightIndex].off();
    self.lightIndex++;
    if (self.lightIndex == self.lights.length) {
      self.lightIndex = 0;
    }
    self.lights[self.lightIndex].on();
  }

  this.randomLights = function() {
    self.lights[parseInt(Math.random()*self.lights.length)].toggle();
  }

  
  this.destroyLights = function() {
    self.startSequence(self.destroyLight,20);    
  }

  this.destroyLight = function() {
    var groupSize = 2; // # to smash at a time
    if (self.lightSmashCounter<self.lights.length) {
      var limit = Math.min(self.lightSmashCounter+groupSize,self.lights.length);
      for (var i=self.lightSmashCounter; i<limit; i++) {
        self.lights[self.lightSmashCounter].smash();
      }
    } else {
      self.stopSequence();
    }

  }

  this.uberSmash = function() {
    // make everything explode - including your CPU.
    self.stopSequence();
/*
    for (var i=0; i<self.lights.length; i++) {
	  if (!self.lights[i].broken) {
		setTimeout(self.lights[i].smash,parseInt(Math.random()*1000));
	  }
    }
*/

    function getRandomLight() {
	  return parseInt(Math.random()*self.lights.length);
    }

    function smashItUp() {
	  var smashed = 0;
	  var rnd = getRandomLight();
	  if (self.lights[rnd].broken) {
	    for (var i=self.lights.length; i--;) {
		  if (self.lights[i].broken) {
		    smashed++;
		  }
		}
		if (smashed < self.lights.length-1) {
		  // missed - do it again
		  smashItUp();
		} else {
		  // all are done
		  window.clearInterval(t);
		}
 	  } else {
	    // we've got a live one
		self.lights[rnd].smash();
		// do some more, too
		for (var j=parseInt(Math.random()*8); j--;) {
		  self.lights[getRandomLight()].smash();
		}
	  }
    }
    var t = window.setInterval(smashItUp,20);
  }

  this.smashGroup = function(oGroup) {
    for (var i=oGroup.length; i--;) {
      oGroup[i].smash();
    }
  }

  this.startSequence = function(fSequence,nInterval) {
    if (self.timer) self.stopSequence();
    self.timer = window.setInterval(fSequence,(typeof nInterval != 'undefined'?nInterval:self.lightInterval));
  }

  this.stopSequence = function() {
    if (self.timer) {
      window.clearInterval(self.timer);
      self.timer = null;
    }
  }

  var i=0;
  var j=0;

  $('lights').style.display = 'block';

  // start lights to the right of <h1>
  var offset = parseInt(document.getElementsByTagName('h1')[0].offsetWidth)+16;

  var jMax = Math.floor((screenX-offset-16)/self.lightXY);
  var iMax = Math.floor((screenY-offset-16)/self.lightXY);

  for (j=0; j<jMax; j++) {
   this.createLight('top',j%3,offset+j*self.lightXY,0);
   // this.createLight('bottom',j%3,offset+j*self.lightXY,screenY-offset-offset+1);
  }

  if (typeof isFun != 'undefined') {
    for (i=0; i<iMax; i++) {
      this.createLight('left',i%3,0,offset+i*self.lightXY);
      // this.createLight('right',i%3,screenX-offset-offset,offset+i*self.lightXY);
    }
  }

  this.appendLights();

  this.startSequence(self.randomLights);

  // setTimeout(this.destroyLights,10000);
  // setTimeout(this.uberSmash,10000);
  
} // --- XLSF2007()

var xlsf = null;

function smashInit(urlBase,lightClass) {
  xlsf = new XLSF(document.getElementById('lights'),urlBase,lightClass);
  xlsf.initSounds();
  // document.getElementById('loading').style.display = 'none';
}

/*
soundManager.flashVersion = 9;
soundManager.debugMode = false;
// soundManager._disabled = true;

soundManager.onload = function() {
  setTimeout(smashInit,500);
}

soundManager.onerror = function() {
  setTimeout(smashInit,500);
}
*/
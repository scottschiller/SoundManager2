/**
 * Christmas Light Smashfest
 *
 * Adapted from XLSF 2007 as originally used on http://schillmania.com/?theme=2007&christmas=1
 * Requires YUI3 library - http://yuilibrary.com/projects/yui3/
 */

(function() {

  var YUI_SEED_URL = 'http://yui.yahooapis.com/3.8.0/build/yui/yui-min.js';

  function initChristmasLights() {

    YUI().use('anim', function(Y) {

      function XLSF(oTarget) {
        var writeDebug = soundManager._wD;
        writeDebug('XLSF()');
        var IS_MOON_COMPUTER = false;
        var isIE = navigator.userAgent.match(/msie/i);
        var isTouchDevice = navigator.userAgent.match(/ipad|ipod|iphone|android/i);
        var self = this;
        var xlsf = self;
        var useAngle = window.location.href.match(/angle/i);
        var useFollow = window.location.toString().match(/follow/i);
        var classBase = 'xlsf-light' + (useAngle ? ' xlsf-angled' : '');
        var animDuration = 1;
        var lastMouseX = 0;
        var lastMouseY = 0;
        var mmhTimer = null;
        var activeLights = [];
        var testDiv = document.createElement('div');
        var offset = 0;
        var transforms = {
          ie: (typeof testDiv.style['-ms-transform'] !== 'undefined' ? '-ms-transform' : null),
          moz: (typeof testDiv.style.MozTransform !== 'undefined' ? 'MozTransform' : null),
          opera: (typeof testDiv.style['OTransform'] !== 'undefined' ? 'OTransform' : null),
          webkit: (typeof testDiv.style.webkitTransform !== 'undefined' ? 'webkitTransform' : null),
          prop: null
        }
        transforms.prop = (transforms.moz || transforms.webkit || transforms.ie || transforms.opera);
        this.oFrag = document.createDocumentFragment();
        this.oExplosionTarget = document.getElementById('explosion-box');
        if (!this.oExplosionTarget) {
          this.oExplosionTarget = document.createElement('div');
          this.oExplosionTarget.id = 'explosion-box';
          document.body.appendChild(this.oExplosionTarget);
        }
        this.oTarget = (oTarget ? oTarget : document.documentElement);
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

        this.lightClass = (window.XLSF_LIGHT_CLASS || 'tiny'); // kind of light to show (32px to 96px square)
        if (window.location.href.match(/size=/i)) {
          this.lightClass = window.location.href.substr(window.location.href.indexOf('size=') + 5);
          if (this.lightClass.indexOf('#') !== -1) {
            this.lightClass = this.lightClass.substr(0, this.lightClass.indexOf('#'));
          }
        }

        this.lightXY = this.lightClasses[this.lightClass]; // shortcut to w/h

        function rnd(n) {
          return parseInt(Math.random() * n);
        }

        function plusMinus(n) {
          return (parseInt(rnd(2), 10) === 1 ? n * -1 : n);
        }

        this.lightGroups = {
          left: [],
          top: [],
          right: [],
          bottom: []
        }
        this.lightSmashCounter = 0;
        this.lightIndex = 0;
        this.lightInterval = 500;
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

        this.initSounds = function() {
          if (!soundManager.supported()) {
            return false;
          }
          for (var i = 0; i < 6; i++) {
            soundManager.createSound({
              id: 'smash' + i,
              url: (window.XLSF_URL_BASE || '') + 'sound/glass' + i + '.mp3',
              autoLoad: true,
              multiShot: true,
              volume: 25
            });
          }
          self.initSounds = function() {} // safety net
        }

        this.appendLights = function() {
          writeDebug('xlsf.appendLights()');
          self.oTarget.appendChild(self.oFrag);
          // self.oFrag = document.createDocumentFragment();
        }

        function ExplosionFragment(nType, sClass, x, y, vX, vY) {
          var self = this;
          this.o = xlsf.oExplosionFrag.cloneNode(true);
          this.nType = nType;
          this.sClass = sClass;
          this.x = x;
          this.y = y;
          this.w = 50;
          this.h = 50;
          this.bgBaseX = 0;
          this.bgBaseY = this.h * this.nType;
          this.vX = vX * (1.5 + Math.random());
          this.vY = vY * (1.5 + Math.random());
          this.oA = null;
          this.oA2 = null;
          this.burstPhase = 1; // starting background offset point
          this.burstPhases = 4; // 1+offset (ignore large size)
          this.animDuration = 1; // how long the animations run for
          this.o.style.backgroundPosition = ((this.w * -this.burstPhase) + 'px ' + (this.h * -nType) + 'px');

          // boundary checks
          if (self.sClass == 'left') {
            this.vX = Math.abs(this.vX);
          } else if (self.sClass == 'right') {
            this.vX = Math.abs(this.vX) * -1;
          }

          this.burstTween = function() {
            // determine frame to show based on animation's progress vs. its total time (and don't allow overflow, in the event animation runs long.)
            var phase = 1 + (Math.floor(Math.min(self.animDuration, (this.get('elapsedTime') / 1000)) * self.burstPhases));
            if (phase != self.burstPhase) {
              self.burstPhase = phase;
              self.o.style.backgroundPosition = ((self.w * -self.burstPhase) + 'px ' + (self.h * -nType) + 'px');
            }
          }


          this.burst = function() {
            self.oA = new Y.Anim({
              node: Y.one(self.o),
              to: {
                marginLeft: (self.vX * (5 + Math.random() * 10)),
                marginTop: (self.vY * (5 + Math.random() * 10))
              },
              duration: animDuration,
              easing: Y.Easing.easeOutStrong
            });
            self.oA.on('tween', self.burstTween);
            self.oA.on('end', self.hide);
            self.oA.run();
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

        function Explosion(nType, sClass, x, y) {
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
          this.o.style.left = x + 'px';
          this.o.style.top = y + 'px';
          // this.oFrag = document.createDocumentFragment();
          this.fragments = [];

          var mX = x;
          var mY = y;
          var type = typeMap[nType + sClass];
          var scale = 5 + Math.random() * 10;
          var shift = 2;

          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, -rnd(scale), -rnd(scale)));
          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, plusMinus(rnd(shift)), -rnd(scale)));
          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, rnd(scale), -rnd(scale)));

          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, -rnd(scale), plusMinus(rnd(shift))));
          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, plusMinus(rnd(shift)), plusMinus(rnd(shift))));
          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, rnd(scale), plusMinus(rnd(shift))));

          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, rnd(scale), -rnd(scale)));
          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, rnd(scale), plusMinus(rnd(shift))));
          this.fragments.push(new ExplosionFragment(type, sClass, mX, mY, rnd(scale), rnd(scale)));

          this.init = function() {
            for (var i = self.fragments.length; i--;) {
              self.o.appendChild(self.fragments[i].o);
            }
            if (!IS_MOON_COMPUTER) {
              // faster rendering, particles get cropped
              xlsf.oExplosionTarget.appendChild(self.o);
            } else {
              // slower rendering, can overlay body
              xlsf.oExplosionTarget.appendChild(self.o);
            }
          }

          this.reset = function() {
            // clean-up
            // self.o.parentNode.removeChild(self.o);
            self.o.style.display = 'none';
            self.o.style.marginLeft = '0px';
            self.o.style.marginTop = '0px';
            self.o.style.left = self.x + 'px';
            self.o.style.top = self.y + 'px';
            if (!isIE) self.o.style.opacity = 1;
            for (var i = self.fragments.length; i--;) {
              self.fragments[i].reset();
            }
          }

          this.trigger = function(boxVX, boxVY) {
            self.o.style.display = 'block';
            self.boxVX = boxVX;
            self.boxVY = boxVY;
            // boundary checks
            if (self.sClass == 'right') {
              self.boxVX = Math.abs(self.boxVX) * -1;
            } else if (self.sClass == 'left') {
              self.boxVX = Math.abs(self.boxVX);
            }
            for (var i = self.fragments.length; i--;) {
              self.fragments[i].animate();
            }
            if (!isIE && (IS_MOON_COMPUTER)) {
              var oAExplode = new Y.Anim({
                node: Y.one(o),
                to: {
                  marginLeft: 100 * self.boxVX,
                  marginTop: 150 * self.boxVY,
                  opacity: 0.01
                },
                duration: animDuration,
                easing: Y.Easing.easeInStrong
              });
            } else {
              // even IE 7 sucks w/alpha-transparent PNG + CSS opacity. Boourns.
              var oAExplode = new Y.Anim({
                node: Y.one(self.o),
                to: {
                  marginLeft: 100 * self.boxVX,
                  marginTop: 150 * self.boxVY
                },
                duration: animDuration,
                easing: Y.Easing.easeInStrong
              });
            }
            oAExplode.on('end', self.reset);
            oAExplode.run();
            // setTimeout(self.reset,animDuration*1000*1.5);
          }

          this.init();

        }

        function Light(sSizeClass, sClass, nType, x, y, row, col) {
          var self = this;
          this.o = document.createElement('div');
          this.sClass = sClass;
          this.sSizeClass = sSizeClass;
          this.nType = (nType || 0);
          this.useY = (sClass == 'left' || sClass == 'right');
          this.state = null;
          this.broken = 0;
          this.w = xlsf.lightClasses[sSizeClass];
          this.h = xlsf.lightClasses[sSizeClass];
          this.x = x;
          this.y = y;
          this.row = row;
          this.col = col;
          this.bg = (window.XLSF_URL_BASE || '') + 'image/bulbs-' + this.w + 'x' + this.h + '-' + this.sClass + '.png';
          this.o.style.width = this.w + 'px';
          this.o.style.height = this.h + 'px';
          this.o.style.background = 'url(' + this.bg + ') no-repeat 0px 0px';
          this.bgBaseX = (self.useY ? -self.w * this.nType : 0);
          this.bgBaseY = (!self.useY ? -self.h * this.nType : 0);
          this.glassType = parseInt(Math.random() * 6);
          // this.bonusSounds = ['griffin-laugh','bblaff','bblaff2'];
          // this.bonusSound = null;
          this.oExplosion = null;
          this.soundID = 'smash' + this.glassType;
          var panValue = xlsf.soundPan.panValue; // eg. +/- 80%
          this.pan = parseInt(this.x <= xlsf.soundPan.mid ? -panValue + ((this.x / xlsf.soundPan.mid) * panValue) : (this.x - xlsf.soundPan.mid) / (xlsf.soundPan.right - xlsf.soundPan.mid) * panValue);

          this.setBGPos = function(x, y) {
            self.o.style.backgroundPosition = ((self.bgBaseX + x) + 'px ' + (self.bgBaseY + y) + 'px');
          }

          this.setLight = function(bOn) {
            if (self.broken || self.state == bOn) return false;
            if (!self.w || !self.h) self.getDimensions();
            self.state = bOn;
            if (self.useY) {
              self.setBGPos(0, -this.h * (bOn ? 0 : 1));
            } else {
              self.setBGPos(-this.w * (bOn ? 0 : 1), 0);
            }
          }

          this.getDimensions = function() {
            self.w = self.o.offsetWidth;
            self.h = self.o.offsetHeight;
            self.bgBaseX = (self.useY ? -self.w * self.nType : 0);
            self.bgBaseY = (!self.useY ? -self.h * self.nType : 0);
          }

          this.on = function() {
            self.setLight(1);
          }

          this.off = function() {
            self.setLight(0);
          }

          this.flickr = function() {
            self.setLight(Math.random() >= 0.5 ? 1 : 0);
          }

          this.toggle = function() {
            self.setLight(!self.state ? 1 : 0);
          }

          this.explode = function(e) {
            self.oExplosion.trigger(0, 1); // boooom!
          }

          this.smash = function(e) {
            if (self.broken) return false;
            self.broken = true;
            if (soundManager && soundManager.supported()) {
              soundManager.play(self.soundID, {
                pan: self.pan
              });
              // soundManager.sounds[self.soundID].play({pan:self.pan});
              // if (self.bonusSound != null) window.setTimeout(self.smashBonus,1000);
            }
            self.explode(e);
            var rndFrame = 2; // +parseInt(Math.random()*3);
            if (self.useY) {
              self.setBGPos(0, self.h * -rndFrame);
            } else {
              self.setBGPos(self.w * -rndFrame, 0);
            }
            if (!useFollow && !useAngle && transforms.prop) {
              self.o.style[transforms.prop] = 'rotate(' + Math.random() * plusMinus(20) + 'deg)';
            }
            xlsf.lightSmashCounter++;
            for (var i = activeLights.length; i--;) {
              // find this in the active array, and take it out
              if (activeLights[i] === self) {
                activeLights.splice(i, 1);
                break;
              }
            }
            // xlsf.doNukeCheck();
            // window.setTimeout(self.reset,3000); // respawn
          }

          this.smashBonus = function() {
            // soundManager.play(self.bonusSounds[self.bonusSound],urlBase+'sound/'+self.bonusSounds[self.bonusSound]+'.mp3');
          }

          this.reset = function() {
            if (!self.broken) return false;
            self.broken = false;
            self.state = null;
            xlsf.lightSmashCounter--;
            // self.oExplosion.reset(); // may not be necessary
            self.flickr();
          }

          this.init = function() {
            self.o.className = classBase + ' ' + this.sizeClass + ' ' + this.sClass;
            self.o.style.left = self.x + 'px';
            self.o.style.top = self.y + 'px';
            self.o.style.width = self.w + 'px';
            self.o.style.height = self.h + 'px';
            self.flickr();
            xlsf.oFrag.appendChild(self.o);
            self.oExplosion = new Explosion(self.nType, self.sClass, self.x, self.y);
          }

          this.init();

        } // Light()
        this.createLight = function(sClass, nType, x, y, row, col) {
          var oLight = new Light(self.lightClass, sClass, nType, x, y, row, col);
          activeLights.push(oLight);
          self.lightGroups[sClass].push(oLight);
          self.lights.push(oLight);
          return oLight;
        }

        this.rotateLights = function() {
          self.lights[self.lightIndex == self.lights.length ? self.lights.length - 1 : self.lightIndex].off();
          self.lightIndex++;
          if (self.lightIndex == self.lights.length) {
            self.lightIndex = 0;
          }
          self.lights[self.lightIndex].on();
        }

        this.randomLights = function() {
          self.lights[parseInt(Math.random() * self.lights.length)].toggle();
        }

        this.destroyLights = function() {
          // reset counter
          self.lightSmashCounter = 0;
          self.startSequence(Math.random() > 0.75 ? self.destroyLight : self.destroyRandom, 33);
        }

        this.destroyRandom = function() {
          for (var i = 2; i--;) {
            if (activeLights.length) {
              activeLights[parseInt(Math.random() * activeLights.length)].smash();
            }
          }
        }

        this.destroyLight = function() {
          var groupSize = 2; // # to smash at a time
          if (self.lightSmashCounter < self.lights.length) {
            var limit = Math.min(self.lightSmashCounter + groupSize, self.lights.length);
            var reverseLimit = Math.max(0, self.lights.length - self.lightSmashCounter - groupSize);
            for (var i = self.lightSmashCounter; i < limit; i++) {
              if (self.lights[self.lightSmashCounter]) {
                self.lights[self.lightSmashCounter].smash();
              }
              self.lights[self.lights.length - self.lightSmashCounter].smash();
            }
          } else {
            self.stopSequence();
          }
        }

        this.uberSmash = function() {
          // make everything explode - including your CPU.
          self.stopSequence();
          var ebCN = Y.D.getElementsByClassName;
          /*
	    window.setTimeout(function(){self.smashGroup(self.lightGroups.left)},500);
	    window.setTimeout(function(){self.smashGroup(self.lightGroups.right)},2000);
	    window.setTimeout(function(){self.smashGroup(self.lightGroups.bottom)},4000);
	    window.setTimeout(function(){self.smashGroup(self.lightGroups.top)},6000);   
	  */
          window.setTimeout(function() {
            self.smashGroup(self.lightGroups.bottom)
          }, 500);
          window.setTimeout(function() {
            self.smashGroup(self.lightGroups.top)
          }, 3500);

        }

        this.smashGroup = function(oGroup) {
          for (var i = oGroup.length; i--;) {
            oGroup[i].smash();
          }
        }

        this.startSequence = function(fSequence, nInterval) {
          if (self.timer) self.stopSequence();
          self.timer = window.setInterval(fSequence, (typeof nInterval != 'undefined' ? nInterval : self.lightInterval));
        }

        this.stopSequence = function() {
          if (self.timer) {
            window.clearInterval(self.timer);
            self.timer = null;
          }
        }

        var typeMaps = {
          'tiny': {
            '0bottom': 0,
            '0top': 3,
            '1bottom': 1,
            '1top': 2,
            '2bottom': 2,
            '2top': 1,
            '3bottom': 3,
            '3top': 0
          },
          'other': {
            '0bottom': 3,
            '0top': 3,
            '1bottom': 2,
            '1top': 2,
            '2bottom': 1,
            '2top': 1,
            '3bottom': 0,
            '3top': 0
          }
        }

        var typeMap = typeMaps[(this.lightClass === 'tiny' ? 'tiny' : 'other')];

        var i = 0;

        /*
	  for (i=0; i<6; i++) {
	    this.createLight('left',parseInt(Math.random()*4),-2,50+i*(self.lightXY*0.7));
	    this.createLight('right',parseInt(Math.random()*4),962,50+i*(self.lightXY*0.7));
	  }

	  for (i=0; i<27; i++) {
	    this.createLight('top',parseInt(Math.random()*4),20+i*(self.lightXY*0.7),23);
	    this.createLight('bottom',parseInt(Math.random()*4),20+i*(self.lightXY*0.7),253);
	  }
        */

        var j = 0;

        if (window.innerWidth || window.innerHeight) {
          var screenX = window.innerWidth; // -(!isIE?24:2);
          var screenY = window.innerHeight;
        } else {
          var screenX = (document.documentElement.clientWidth || document.body.clientWidth || document.body.scrollWidth); // -(!isIE?8:0);
          var screenY = (document.documentElement.clientHeight || document.body.clientHeight || document.body.scrollHeight);
        }

        // hack for SM2 homepage
        if (document.body && document.body.className && document.body.className.match(/home/i)) {

          _id('lights').style.display = 'block';

          // start lights to the right of <h1>
          // offset = parseInt(document.getElementsByTagName('h1')[0].offsetWidth)+16;
          var jMax = Math.floor((screenX - offset - 16) / self.lightXY);
          var iMax = Math.floor((screenY - offset - 16) / self.lightXY);

          for (j = 0; j < jMax; j++) {
            this.createLight('top', j % 3, offset + j * self.lightXY, 0);
            // this.createLight('bottom',j%3,offset+j*self.lightXY,screenY-offset-offset+1);
          }

          if (typeof isFun != 'undefined') {
            for (i = 0; i < iMax; i++) {
              this.createLight('left', i % 3, 0, offset + i * self.lightXY);
              // this.createLight('right',i%3,screenX-offset-offset,offset+i*self.lightXY);
            }
          }


        } else {

          var jMax = Math.floor((screenX) / self.lightXY);
          var iMax = Math.floor((screenY - 12) / self.lightXY);

          for (i = 0; i < iMax; i++) {
            for (j = 0; j < jMax; j++) {
              this.createLight((i + 1) % 2 == 0 ? 'bottom' : 'top', i % 4, j * self.lightXY, i * self.lightXY, j, i);
            }
          }

        }

        /*
	  var bsCounter = 0;
	  for (i=0; i<8; i++) {
	    // plant a few random seeds.. er, sounds.
	    self.lights[parseInt(Math.random()*self.lights.length)].bonusSound = bsCounter++;
	    if (bsCounter>2) bsCounter = 0; // hack - loop through sounds
	  }
        */

        this.appendLights();

        function followMouseMove(e) {
          if (!self.lights.length) {
            return false;
          }
          var x = lastMouseX;
          var y = lastMouseY;
          var x2 = null;
          var y2 = null;
          var angle = 0;
          var light = null;
          for (var i = self.lights.length; i--;) {
            light = self.lights[i];
            if (light && !light.broken) {
              x2 = light.x;
              y2 = light.y;
              angle = Math.atan2((y - y2), (x - x2)) * (180 / Math.PI);
              if (light.col % 2 === 0) {
                angle += (270 * 180 / Math.PI);
              }
              if (transforms.prop) {
                light.o.style[transforms.prop] = 'rotate(' + angle + 'deg)';
              }
            }
          }
          mmhTimer = null;
        }

        function mouseOrTouchMove(e) {
          // coordinate -> row/col check, smashy smash
          var x, y, lightIndex;
          if (e.targetTouches) {
            if (e.targetTouches.length === 1) {
              x = e.targetTouches[0].clientX - offset;
              y = e.targetTouches[0].clientY;
            }
          } else {
            x = e.clientX - offset;
            y = e.clientY;
          }
          if (x < 0) {
            // ignore off-screen values.
            return;
          }
          lightCol = Math.floor((x / (self.lightClasses[self.lightClass] * jMax) * jMax)), lightRow = Math.floor((y / (self.lightClasses[self.lightClass] * iMax) * iMax))
          lightIndex = (jMax * lightRow) + lightCol;
          if (self.lights[lightIndex]) {
            self.lights[lightIndex].smash();
          }
          if (useFollow) {
            lastMouseX = x;
            lastMouseY = y;
            if (!mmhTimer) {
              mmhTimer = window.setTimeout(followMouseMove, 33); // try to be nice and throttle this call, which may be expensive
            }
          }
        }

        if (isTouchDevice) {

          document.addEventListener('touchstart', function(e) {

            // ignore pinch-to-zoom, links and so forth.

            if (e.touches && e.touches.length === 1 && e.target && e.target.nodeName !== 'A') {

              document.addEventListener('touchmove', mouseOrTouchMove, false);
              document.addEventListener('touchend', function(e) {
                document.removeEventListener('touchMove', mouseOrTouchMove);
              });

              mouseOrTouchMove(e); // initial touch might be a smashy one, too
              e.preventDefault();
              return false;

            }

          }, false);

        } else {

          // generic event handler

          if (document.addEventListener) {
            document.addEventListener('mousemove', mouseOrTouchMove, false);
          } else if (document.attachEvent) {
            document.attachEvent('onmousemove', mouseOrTouchMove);
          }

        }

        this.startSequence(self.randomLights);

      } // --- XLSF2007()

      var xlsf = null;

      function smashInit() {
        var loading = document.getElementById('loading');
        xlsf = new XLSF(document.getElementById('lights'));
        window.xlsf = xlsf; // expose to global
        xlsf.initSounds();
        if (loading) {
          loading.style.display = 'none';
        }
      }

      window.smashInit = smashInit;

      soundManager.setup({
        url: '../../swf/',
        // preferFlash: true,
        flashVersion: 9,
        useHighPerformance: true,
        wmode: 'transparent',
        debugMode: false,
        onready: smashInit,
        ontimeout: smashInit
      });

    });

  }

  (function() {

    // script loader helper for YUI library
    // http://yui.yahooapis.com/3.4.1/build/yui/yui-min.js

    function loadScript(sURL, onLoad) {
      try {
        var loadScriptHandler = function() {
          var rs = this.readyState;
          if (rs == 'loaded' || rs == 'complete') {
            this.onreadystatechange = null;
            this.onload = null;
            if (onLoad) {
              window.setTimeout(onLoad, 20);
            }
          }
        }
        function scriptOnload() {
          this.onreadystatechange = null;
          this.onload = null;
          window.setTimeout(onLoad, 20);
        }
        var oS = document.createElement('script');
        oS.type = 'text/javascript';
        oS.setAttribute('async', true);
        if (onLoad) {
          oS.onreadystatechange = loadScriptHandler;
          oS.onload = scriptOnload;
        }
        oS.src = sURL;
        document.getElementsByTagName('head')[0].appendChild(oS);
      } catch (e) {
        // oh well
      }
    }

    if (typeof window.YUI === 'undefined') {

      loadScript(YUI_SEED_URL, function() {

        initChristmasLights();

      });

    }

  }());

}());
/*
   Ancient fireworks slider control code (2005)
   Kinda/sorta refactored for SM2 360 demo
   http://schillmania.com/projects/fireworks/
   --------------------------------------------
   Not required for your use!
*/

function Animator2() {
  var self = this;
  this.tweens = [];
  this.tweens['default'] = [1,2,3,4,5,6,7,8,9,10,9,8,7,6,5,4,3,2,1];
  this.tweens['blast'] = [12,12,11,10,10,9,8,7,6,5,4,3,2,1];
  this.tweens['fade'] = [10,10,10,10,10,10,10,10,10,10];
  this.queue = [];
  this.queue.IDs = [];
  this.active = false;
  this.timer = null;

  this.createTween = function(start,end,type) {
    // return array of tween coordinate data (start->end)
    type = type||'default';
    var tween = [start];
    var tmp = start;
    var diff = end-start;
    var x = self.tweens[type].length;
    for (var i=0; i<x; i++) {
      tmp += diff*self.tweens[type][i]*0.01;
      tween[i] = new Object();
      tween[i].data = tmp;
      tween[i].event = null;
    }
    return tween;
  }

  this.enqueue = function(o,fMethod,fOnComplete) {
    // add object and associated methods to animation queue
    // writeDebug('animator.enqueue()');
    if (!fMethod) {
      // writeDebug('animator.enqueue(): missing fMethod');
    }
    if (typeof(self.queue.IDs[o.oID])=='undefined') {
      // writeDebug('animator.enqueue(): added '+o.oID);
      var i = self.queue.length;
      self.queue.IDs[o.oID] = i;
      self.queue[i] = o;
    } else {
      // writeDebug('animator.enqueue(): '+o.oID+' already queued');
      var i = self.queue.IDs[o.oID]; // retrieve queue index
      self.queue[i].active = true;
      self.queue[i].frame = 0;
    }
    o.active = true; // flag for animation
    self.queue[i]._method = fMethod;
    self.queue[i]._oncomplete = fOnComplete?fOnComplete:null;
  }

  this.animate = function() {
    var active = 0;
    for (var i=self.queue.length; i--;) {
      if (self.queue[i].active) {
        self.queue[i]._method();
        active++;
      }
    }
    if (active==0 && self.timer) {
      // all animations finished
      self.stop();
    } else {
      // writeDebug(active+' active');
    }
  }

  this.start = function() {
    if (self.timer || self.active) {
      // writeDebug('animator.start(): already active');
      return false;
    }
    // writeDebug('animator.start()'); // report only if started
    self.active = true;
    self.timer = setInterval(self.animate,mc.intervalRate);
  }

  this.stop = function() {
    // writeDebug('animator.stop()',true);
    clearInterval(self.timer);
    self.timer = null;
    self.active = false;
    self.queue = [];
    self.queue.IDs = [];
  }

}

function MainController() {
  var self = this;
  this.intervalRate = 20; // rate (ms) to run animation at, general best default = 20
  this.DEBUG = true; // debug mode disabled by default
  this.oFW = null;
  this.isIE = (navigator.appVersion.indexOf('MSIE')+1);
  this.isOpera = (navigator.userAgent.toLowerCase().indexOf('opera')+1);
  if (this.isOpera) this.isIE = false; // no impersonation allowed here!
  this.animator = null;
  this.gOID = 0; // global object ID counter (for animation queue)
  this.particleTypes = 6;
  this.particleXY = 10;
  this.tweenFade = [100,90,80,70,60,50,40,30,20,10,0];
  this.isSafari = (navigator.appVersion.toLowerCase().indexOf('safari')+1?1:0);
  this.canvasX = null;
  this.canvasY = null;
  this.screenY = null; // screen area (not entire page)
  self.scrollY = null;

  self.getWindowCoords = function() {
    self.canvasX = (document.documentElement.clientWidth||document.body.clientWidth||document.body.scrollWidth);
    self.canvasY = (document.documentElement.clientHeight||document.body.clientHeight||document.body.scrollHeight);
    self.screenY = self.canvasY;
    self.scrollY = parseInt(window.scrollY||document.documentElement.scrollTop||document.body.scrollTop);
    self.canvasY += self.scrollY;
  }

  this.getWindowCoordsAlt = function() {
    self.canvasX = window.innerWidth;
    self.canvasY = window.innerHeight;
    self.screenY = self.canvasY;
    self.scrollY = parseInt(window.scrollY||document.documentElement.scrollTop||document.body.scrollTop);
    self.canvasY += self.scrollY;
  }

  this.getPanX = function(x) {
    x = parseInt(x);
    var pos = x/self.canvasX;
    if (pos<0.4) {
      pos *= -1;
    } else if (pos >= 0.4 && pos <= 0.6) {
      pos = 0.5;
    }
    pos = parseInt(pos*100);
    // writeDebug('getPanX('+x+'): '+pos+'%');
    return pos;
  }

  this.isEmpty = function(o) {
    // needs further hacking
    return (typeof(o)=='undefined'||(o==null&&o!=0)||(o==''&&o!=0)||o=='null');
  }

  this.init = function() {
//    self.oFW = document.getElementById('fw');
//    self.oFP = document.getElementById('fp');
//    if (typeof(enableDebugMode)!='undefined' && (self.DEBUG||window.location.toString().toLowerCase().indexOf('debug')>=0)) enableDebugMode();
    self.getWindowCoords();
    self.animator = new Animator2();
  }

  this.destructor = function() {
/*
    for (var i=self.fireworks.length; i--;) {
      self.fireworks[i] = null;
    }
    self.fireworks = null;
    if (soundManager) {
      soundManager.destructor();
      soundManager = null;
    }
*/
  }

  if (this.isSafari || this.isOpera) this.getWindowCoords = this.getWindowCoordsAlt;

}


function Controller(o) {
  var self = this;
  this.o = o;
  this.controls = [];
  this.cb = [];
  this.options = [];
  this.functionExample = document.getElementById('function-example');
  this.fbIE = null;

  this.randomize = function() {
    for (var i=1; i<self.controls.length; i++) {
      setTimeout(self.controls[i].randomize,20+(20*i+1));
    }
  }

  this.cbClick = function(nIndex) {
    document.getElementById('controls').getElementsByTagName('dl')[nIndex].className = 'col'+(this.checked==false||this.checked==''?' disabled':'');
    self.updateExample();
	self.updateExampleCode();
  }

  this.updateExample = function() {
	if (threeSixtyPlayer) {
	  var val = self.controls[0].value;
	  threeSixtyPlayer.config.circleDiameter = self.controls[0].value;

	  threeSixtyPlayer.config.circleRadius = self.controls[0].value/2;
	  // update some stuff

	  // set the cover width/height to match the canvas
	  if (threeSixtyPlayer.lastSound) {
		// always set cover to max area?
		// threeSixtyPlayer.lastSound._data.oCover.style.width = 250+'px';
		// threeSixtyPlayer.lastSound._data.oCover.style.height = 250+'px';
		// threeSixtyPlayer.lastSound._data.oCover.style.width = threeSixtyPlayer.config.circleDiameter+'px';
		// threeSixtyPlayer.lastSound._data.oCover.style.height = threeSixtyPlayer.config.circleDiameter+'px';
	    threeSixtyPlayer.refreshCoords(threeSixtyPlayer.lastSound);
	  }
	
	  threeSixtyPlayer.config.waveformDataLineRatio = (self.controls[1].value/100)*2;

	  threeSixtyPlayer.config.waveformDataDownsample = (self.controls[2].value);

	  threeSixtyPlayer.config.eqDataLineRatio = parseInt((self.controls[3].value/100)*3*1000)/1000;
	
	  threeSixtyPlayer.config.eqDataDownsample = (self.controls[4].value);

	  threeSixtyPlayer.config.scaleArcWidth = (self.controls[5].value/100);
	
	  threeSixtyPlayer.config.useEQData = (document.getElementById('disabled-1').checked?true:false);
	
	  // radio buttons

          threeSixtyPlayer.config.useWaveformData=(document.getElementById('use-waveform').checked?true:false);
	
	  threeSixtyPlayer.config.waveformDataOutside = document.getElementById('waveform-inside').checked?false:true;
	
          threeSixtyPlayer.config.eqDataOutside = document.getElementById('eq-inside').checked?false:true;

          threeSixtyPlayer.config.useAmplifier = (document.getElementById('use-amplifier').checked?true:false);
	
	  // threeSixtyPlayer.refreshCoords();
	}

        if (threeSixtyPlayer.lastSound) {

          threeSixtyPlayer.lastSound._360data.circleDiameter = self.controls[0].value;

   	  threeSixtyPlayer.lastSound._360data.circleRadius = self.controls[0].value/2;

	  threeSixtyPlayer.lastSound._360data.waveformDataLineRatio = (self.controls[1].value/100)*2;

	  threeSixtyPlayer.lastSound._360data.waveformDataDownsample = (self.controls[2].value);

	  threeSixtyPlayer.lastSound._360data.eqDataLineRatio = parseInt((self.controls[3].value/100)*3*1000)/1000;
	
	  threeSixtyPlayer.lastSound._360data.eqDataDownsample = (self.controls[4].value);
	
	  threeSixtyPlayer.lastSound._360data.useEQData = (document.getElementById('disabled-1').checked?true:false);
	
	  // radio buttons

          threeSixtyPlayer.lastSound._360data.useWaveformData=(document.getElementById('use-waveform').checked?true:false);
	
	  threeSixtyPlayer.lastSound._360data.waveformDataOutside = document.getElementById('waveform-inside').checked?false:true;
	
          threeSixtyPlayer.lastSound._360data.eqDataOutside = document.getElementById('eq-inside').checked?false:true;

          threeSixtyPlayer.lastSound._360data.useAmplifier = (document.getElementById('use-amplifier').checked?true:false);

        }

  }

  this.updateExampleCode = function() {
    // set innerHTML
document.getElementById('config-code').innerHTML = "\
// 360player.js, config section\n\
\n\
this.config = {\n\
\n\
  playNext: <span>"+threeSixtyPlayer.config.playNext+"</span>,\n\
  autoPlay: <span>"+threeSixtyPlayer.config.autoPlay+"</span>,\n\
  allowMultiple: <span>"+threeSixtyPlayer.config.allowMultiple+"</span>,\n\
  loadRingColor: <span>'"+threeSixtyPlayer.config.loadRingColor+"'</span>,\n\
  playRingColor: <span>'"+threeSixtyPlayer.config.playRingColor+"'</span>,\n\
  backgroundRingColor: <span>'"+threeSixtyPlayer.config.backgroundRingColor+"'</span>,\n\
  circleDiameter: <span>"+threeSixtyPlayer.config.circleDiameter+"</span>,\n\
  circleRadius: <span>"+threeSixtyPlayer.config.circleRadius+"</span>,\n\
  animDuration: <span>"+threeSixtyPlayer.config.animDuration+"</span>,\n\
  animTransition: <span>Animator.tx.bouncy</span>,\n\
  showHMSTime: <span>"+threeSixtyPlayer.config.showHMSTime+"</span>,\n\
\n\
  useWaveformData: <span>"+threeSixtyPlayer.config.useWaveformData+"</span>,\n\
  waveformDataColor: <span>'"+threeSixtyPlayer.config.waveformDataColor+"'</span>,\n\
  waveformDataDownsample: <span>"+threeSixtyPlayer.config.waveformDataDownsample+"</span>,\n\
  waveformDataOutside: <span>"+threeSixtyPlayer.config.waveformDataOutside+"</span>,\n\
  waveformDataConstrain: <span>false</span>,\n\
  waveformDataLineRatio: <span>"+threeSixtyPlayer.config.waveformDataLineRatio+"</span>,\n\
\n\
  useEQData: <span>"+threeSixtyPlayer.config.useEQData+"</span>,\n\
  eqDataColor: <span>'"+threeSixtyPlayer.config.eqDataColor+"'</span>,\n\
  eqDataDownsample: <span>"+threeSixtyPlayer.config.eqDataDownsample+"</span>,\n\
  eqDataOutside: <span>"+threeSixtyPlayer.config.eqDataOutside+"</span>,\n\
  eqDataLineRatio: <span>"+threeSixtyPlayer.config.eqDataLineRatio+"</span>,\n\
\n\
  usePeakData: <span>"+threeSixtyPlayer.config.usePeakData+"</span>,\n\
  peakDataColor: <span>'"+threeSixtyPlayer.config.peakDataColor+"'</span>,\n\
  peakDataOutside: <span>"+threeSixtyPlayer.config.peakDataOutside+"</span>,\n\
  peakDataLineRatio: <span>"+threeSixtyPlayer.config.peakDataLineRatio+"</span>,\n\
\n\
  useAmplifier: <span>"+threeSixtyPlayer.config.useAmplifier+"</span>\n\
\n\
}";
document.getElementById('config-code').style.display = 'block'; // weird Fx fix
  }

  this.createCustomFirework = function() {
  }

  this.destructor = function() {
    for (var i=self.controls.length; i--;) {
      self.controls[i].destructor();
    }
    for (i=self.cb.length; i--;) {
      self.cb.onclick = null;
      self.cb[i] = null;
    }
    for (i=self.options.length; i--;) {
      self.options[i] = null;
    }
    if (navigator.userAgent.match(/msie/i)) {
      self.fbIE.onmouseover = null;
      self.fbIE.onmouseout = null;
      self.fbIE = null;
    }
    self.cb = null;
    self.options = null;
    self.controls = null;
    self.functionExample = null;
    self.o = null;
  }

  var items = parseInt(this.o.length/3);
  for (var i=0; i<items; i++) {
    this.controls[this.controls.length] = new Slider(this.o[(3*i)+2].getElementsByTagName('div')[1],this.o[(3*i)+1],this.o[(3*i)+2].getElementsByTagName('div')[0]);
  }
  this.cb = [document.getElementById('disabled-0'),document.getElementById('disabled-1')];
/*
  for (i=this.cb.length; i--;) {
    this.cb[i]._index = i;
    this.cb[i].onclick = this.cbClick;
  }
*/
  this.options = [];
/*
  this.cb[1].checked = false;
  this.options = [document.getElementById('opt-random0'),document.getElementById('opt-random1')];
  this.options[0].checked = false;
  this.options[1].checked = true;
  if (navigator.userAgent.match(/msie/i)) {
    this.fbIE = document.getElementById('fireButton');
    this.fbIE.onmouseover = function() {this.className='hover';}
    this.fbIE.onmouseout = function() {this.className='';}
  }
*/

  setTimeout(function(){
    // default values for controls
	var values = [
	  256,
	  65,
	  40,
	  72,
	  48,
	  100
	];
	for (var i=0; i<values.length; i++) {
	  self.controls[i].setValue(values[i]); // defaults
	}
  },1);
}

function Slider(o,oV,oB) {
  var self = this;
  this.o = o;
  this.oV = oV;
  this.oB = oB;
  this.scale = parseInt(oV.innerHTML.toString().substr(2));
  this.oID = 'sc'+(gOID++);
  this.offX = 0;
  this.x = 0;
  this.xMin = 0-10;
  this.xMax = self.o.parentNode.offsetWidth-10;
  this.value = 0;
  this.timer = null;
  this._className = this.o.className;
  this.tween = [];
  this.frame = 0;

  this.over = function() {
    this.className = self._className+' hover';
    event.cancelBubble=true;
    return false;
  }

  this.out = function() {
    this.className = self._className;
    event.cancelBubble=true;
    return false;
  }

  this.down = function(e) {
    var e = e?e:event;
    self.offX = e.clientX-self.o.offsetLeft;
    addEvent(document,'mousemove',self.move);
    addEvent(document,'mouseup',self.up);
    return false;
  }

  this.barClick = function(e) {
    var e=e?e:event;
    self.slide(self.x,e.clientX-self.o.parentNode.parentNode.offsetLeft-self.o.offsetWidth);
  }

  this.move = function(e) {
    var e=e?e:event;
    var x = e.clientX-self.offX;
    if (x>self.xMax) {
      x = self.xMax;
    } else if (x<self.xMin) {
      x = self.xMin;
    }
    if (x != self.x) {
      self.moveTo(x);
      self.doUpdate();
      controller.updateExample();
      controller.updateExampleCode();
    }
    e.stopPropgation?e.stopPropagation():e.cancelBubble=true;
    return false;
  }

  this.up = function(e) {
    removeEvent(document,'mousemove',self.move);
    removeEvent(document,'mouseup',self.up);
    // controller.updateExample();
    controller.updateExampleCode();
  }

  this.slide = function(x0,x1) {
    self.tween = mc.animator.createTween(x0,x1);
    mc.animator.enqueue(self,self.animate,function(){
	  controller.updateExample()
      controller.updateExampleCode();
    });
    mc.animator.start();
  }

  this.moveTo = function(x) {
    self.x = x;
    self.o.style.marginLeft = x+'px';
  }

  this.animate = function() {
    self.moveTo(self.tween[self.frame].data);
    self.doUpdate(50);
    controller.updateExample();
    if (self.frame++>=self.tween.length-1) {
      self.active = false;
      self.frame = 0;
      if (self._oncomplete) self._oncomplete();
//      self.doUpdate();
      return false;
    }
    self.doUpdate();
    return true;
  }

  this.doUpdate = function(t) {
    // if (!self.timer) self.timer = setTimeout(self.update,t||20);
    self.update();
  }

  this.update = function() {
    self.timer = null;
    self.value = 1+parseInt(self.x/self.xMax*(self.scale-1));
    if (self.value<1) self.value = 1;
    // if (self.oV.innerHTML != self.value) self.oV.innerHTML = self.value;
    // self.oV.innerHTML = self.value;
  }

  this.setValue = function(x) {
	self.slide(self.x,Math.min(self.xMax,x));
  }

  this.randomize = function() {
    self.slide(self.x,parseInt(Math.random()*self.xMax));
  }

  this.destructor = function() {
    self.o.onmouseover = null;
    self.o.onmouseout = null;
    self.o.onmousedown = null;
    self.o = null;
    self.oV = null;
    self.oB.onclick = null;
    self.oB = null;
  }

  if (soundManager.isIE) {
    // IE is lame, no :hover
    this.o.onmouseover = this.over;
    this.o.onmouseout = this.out;
  }

  this.o.onmousedown = this.down;
  this.oB.onclick = this.barClick;
  self.update();

}

var gOID = 0;

function demoInit() {
  controller = new Controller(document.getElementById('controls').getElementsByTagName('dd'));
}

function demoDestuctor() {
  controller.destructor();
  controller = null;
}

var controller = null;

var mc = new MainController();
// create null objects if APIs not present

function createCP(oInput,oHandler) {
    var Event = YAHOO.util.Event;

    cpHandler = oHandler;
    if (picker != null) {
	  // picker.showcontrols(true);
	  var c = oInput.value.substr(1);
	  picker.setValue(hex2decArray([c.substr(0,2),c.substr(2,2),c.substr(4,2)]),true); // be silent 
      return false;
    }

    Event.onDOMReady(function() {
            picker = new YAHOO.widget.ColorPicker("cp-container", {
                    showhsvcontrols: true,
                    showhexcontrols: true,
					images: {
						PICKER_THUMB: "../_image/picker_thumb.png",
						HUE_THUMB: "../_image/hue_thumb.png"
    				}
                });

//	picker.showcontrols(false);
			//a listener for logging RGB color changes;
			//this will only be visible if logger is enabled:
			var onRgbChange = function(o) {
				/*o is an object
					{ newValue: (array of R, G, B values),
					  prevValue: (array of R, G, B values),
					  type: "rgbChange"
					 }
				*/
				cpHandler(o.newValue);
				controller.updateExampleCode();
			}

			//subscribe to the rgbChange event;
			picker.on("rgbChange", onRgbChange);

			//use setValue to reset the value to white:
			Event.on("reset", "click", function(e) {
				picker.setValue([255, 255, 255], false); //false here means that rgbChange
													     //wil fire; true would silence it
			});

			//use the "get" method to get the current value
			//of one of the Color Picker's properties; in 
			//this case, we'll get the hex value and write it
			//to the log:
			Event.on("gethex", "click", function(e) {
				console.log("Current hex value: " + picker.get("hex"));
			});

    });
}

var picker = null;

cpHandler = function() {
}


	// hex -> dec / dec -> hex
	// http://www.southwest.com.au/~jfuller/binary/converter.htm

	function dec2hex(cval) {
	  if (cval > 255) cval = 255;
	  var hexascii = "0123456789ABCDEF";
	  var cval0 = Math.floor(cval/16);
	  var cval1 = cval-(cval0*16);
	  var c1 = hexascii.charAt(cval0);
	  var c2 = hexascii.charAt(cval1);
	  return (c1+c2);
	}

	function hex2dec(cval) {
	  cval = cval.toUpperCase();
	  var tval = 0;
	  var hexascii = "0123456789ABCDEF";
	  var mychar, ch;
	  for (var c=0; c<cval.length; c++) {
	    mychar = cval.charAt(c);
	    for (ch=0; ch<16; ch++) {
	      if (mychar == hexascii.charAt(ch)) {
	        tval += ch;
		if (c<cval.length-1) tval *= 16;
	      }
	    }
	  }
	  return tval;
	}

	function hex2decArray(hArray) {
	  var result = [];
	  for (var i=0,j=hArray.length; i<j; i++) {
	    result[i] = hex2dec(hArray[i]);
	  }
	  return result;
	}

	function dec2hexArray(dArray) {
	  var result = [];
	  for (var i=0,j=dArray.length; i<j; i++) {
	    result[i] = dec2hex(dArray[i]);
	  }
	  return result;
	}


/*


threeSixtyPlayer.config.waveformDataColor = '#'+dec2hexArray([self.controls[5].value,self.controls[6].value,self.controls[7].value]).join('');

threeSixtyPlayer.config.eqDataColor = '#'+dec2hexArray([self.controls[8].value,self.controls[9].value,self.controls[10].value]).join('');

threeSixtyPlayer.config.loadRingColor = '#'+dec2hexArray([self.controls[11].value,self.controls[12].value,self.controls[13].value]).join('');

threeSixtyPlayer.config.playRingColor = '#'+dec2hexArray([self.controls[14].value,self.controls[15].value,self.controls[16].value]).join('');

threeSixtyPlayer.config.waveformDataLineRatio = (self.controls[1].value/100)*2;

threeSixtyPlayer.config.waveformDataDownsample = (self.controls[2].value);

threeSixtyPlayer.config.eqDataLineRatio = (self.controls[3].value/100)*3;

threeSixtyPlayer.config.eqDataDownsample = (self.controls[4].value);

*/

function _id(sID) {
  return document.getElementById(sID);
}

function setWaveformColor(sColor) {
  var value = '#'+(dec2hexArray(sColor).join(''));
  threeSixtyPlayer.config.waveformDataColor = value;
  _id('waveform-color').value = value;
}

function setEQColor(sColor) {
  var value = '#'+dec2hexArray(sColor).join('');
  _id('eq-color').value = value;
  threeSixtyPlayer.config.eqDataColor = value;
}

function setLoadedRingColor(sColor) {
  var value = '#'+dec2hexArray(sColor).join('');
  _id('loaded-ring-color').value = value;
  threeSixtyPlayer.config.loadRingColor = value;  
}

function setProgressRingColor(sColor) {
  var value = '#'+dec2hexArray(sColor).join('');
  _id('progress-ring-color').value = value;
  threeSixtyPlayer.config.playRingColor = value;
}

function setBackgroundRingColor(sColor) {
  var value = '#'+dec2hexArray(sColor).join('');
  _id('bg-ring-color').value = value;
  threeSixtyPlayer.config.backgroundRingColor = value;
}

function addEvent(o,evtName,evtHandler) {
  typeof window.addEventListener !== 'undefined' ? o.addEventListener(evtName,evtHandler,false) : o.attachEvent('on'+evtName,evtHandler);
}

function removeEvent(o,evtName,evtHandler) {
  typeof window.removeEventListener !== 'undefined' ? o.removeEventListener(evtName,evtHandler,false) : o.detachEvent('on'+evtName,evtHandler);
}

if (window.location.toString().match(/#customize/i)) {
	addEvent(window,'resize',mc.getWindowCoords);
	addEvent(window,'scroll',mc.getWindowCoords);
	addEvent(window,'load',mc.init);
	addEvent(window,'load',demoInit);
}

if (window.location.toString().match(/hifi/i)) {
	soundManager.onready(function(){
		document.getElementById('hifi').style.display = 'none';

		threeSixtyPlayer.config = {

		  playNext: false,
		  autoPlay: false,
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
		  waveformDataDownsample: 1,
		  waveformDataOutside: true,
		  waveformDataConstrain: false,
		  waveformDataLineRatio: 0.56,

		  useEQData: true,
		  eqDataColor: '#339933',
		  eqDataDownsample: 1,
		  eqDataOutside: true,
		  eqDataLineRatio: 0.72,

		  usePeakData: true,
		  peakDataColor: '#ff33ff',
		  peakDataOutside: true,
		  peakDataLineRatio: 0.5,
                  scaleArcWidth: 1,  // thickness factor of playback progress ring
		  useAmplifier: true

		}

	});
}
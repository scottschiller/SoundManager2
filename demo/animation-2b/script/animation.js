soundManager.setup({
  preferFlash: true,
  flashVersion: 9,
  url: '../../swf/',
  useHighPerformance: true,
  wmode: 'transparent',
  debugMode: false
});

var points = [];
var o = null;
var lastX = 0;
var lastY = 0;
var threshhold = 4;
var threshMax = 32;
var noise = null;
var screenX = 0;

function doPaint(e) {
  var x = (e||event).clientX;
  var y = (e||event).clientY;
  var diff = Math.max(Math.abs(x-lastX),Math.abs(y-lastY));
  if (diff>threshhold) {
    lastX = x;
    lastY = y;
    points.push(new Point(x,y,Math.min(diff/(32),3)));
  }
  return false;
}

function stopPaint() {
  document.onmousemove = null;
  document.onmouseup = null;
  // soundManager.play('up');
}

function startPaint(e) {
  // soundManager.play('down');
  document.onmousemove = doPaint;
  document.onmouseup = stopPaint;
  lastX = (e||event).clientX;
  lastY = (e||event).clientY;
  screenX = (window.innerWidth?window.innerWidth:document.documentElement.clientWidth||document.body.clientWidth);
  e?e.stopPropagation():event.returnValue = false;
  return false;
}

function initPoints() {
  o = document.createElement('img');
  o.src = 'image/point.png';
  o.className = 'point';
  document.onmousedown = startPaint;
  document.onmouseup = stopPaint;
}

function Point(x,y,scale) {
  var self = this;
  this.data = {
    x: x,
    y: y,
    scale: scale,
    scalePX: parseInt(32*scale)
  }
  this.o = o.cloneNode(false);
  this.o.style.left = (x-(this.data.scalePX/2))+'px';
  this.o.style.top = (y-(this.data.scalePX/2))+'px';
  this.o.style.width = this.o.style.height = this.data.scalePX+'px';
  var screenX2 = parseInt(screenX/2);
  noise.play({volume:parseInt(Math.min(1,scale/3)*100),pan:(x<screenX2?(screenX2-x)/screenX2*-100:(x-screenX2)/screenX2*100)});
  document.body.appendChild(this.o);
}

soundManager.onready(function() {
  noise = soundManager.createSound({
    id:'noise',
    url:'../animation/audio/fingerplop.mp3',
    multiShot: true,
    autoLoad: true
  });
  soundManager.createSound({
    id:'down',
    url:'../_mp3/click-low.mp3',
    multiShot: true,
    autoLoad: true
  });
  soundManager.createSound({
    id:'up',
    url:'../_mp3/click-high.mp3',
    multiShot: true,
    autoLoad: true
  });
  initPoints();
});

soundManager.onerror = function() {
  alert('d\'oh, something didn\'t work - SM2 failed to start.');
}
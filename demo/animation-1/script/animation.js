var balls = [];
var canvasX = 0;
var canvasY = 0;
var timer = null;
var m_lastX = 0;
var m_lastY = 0;
var M_SPACE = 24;
var B_VMIN = 5;
var B_VMAX = 5;
var B_WIDTH = 13;
var B_HEIGHT = 13;
var useMouse = null;
var ballSound = null;
var ballPopSound = null;

function rnd(n) {
  return Math.random()*n;
}

function rndI(n) {
  return parseInt(rnd(n));
}

function createBall(oParent) {
  oParent.appendChild(balls[0].cloneNode(true));
  initBall(balls[balls.length-1],balls.length);
}

function createBallAtMouse(e) {
  e = e?e:event;
  createBall(document.getElementById('ball-container'));
  with (balls[balls.length-1]) {
    _x = e.clientX;
    _y = e.clientY;
    if (useMouse.checked != false) {
      _vX = (m_lastX-e.clientX)*-0.7;
      _vY = (m_lastY-e.clientY)*-0.7;
    } else {
      _vX = 0;
      _vY = 0;
    }
  }
  moveBall(balls[balls.length-1]);
}

function initBall(oBall,i) {
  oBall._id = 'ball'+i;
  oBall._active = true;
  oBall._x = rnd(canvasX);
  oBall._y = rnd(canvasY);
  oBall._vX = B_VMIN+rnd(B_VMAX)*(Math.random()>0.5?1:-1);
  oBall._vY = B_VMIN+rnd(B_VMAX);
  oBall.style.display = 'block';
}

function moveBall(oBall) {
  oBall._x += oBall._vX;
  oBall._y += (oBall._vY++); // gravity!
  var bounce = false;
  if ((oBall._vX>0 && oBall._x+oBall._vX+B_WIDTH>canvasX) || (oBall._vX<0 && oBall._x+oBall._vX<0)) {
    oBall._vX *= -1;
    bounce = true;
  }
  if ((oBall._vY>0 && oBall._y+oBall._vY+B_HEIGHT>canvasY) || (oBall._vY<0 && oBall._y+oBall._vY<0)) {
    // bounce on Y axis - with resistance on both axes
    if (oBall._vY>0) oBall._y = canvasY-B_HEIGHT; // bounce exactly from bottom
    oBall._vY *= -(oBall._vY>1?0.6:1);
    bounce = true;
    if (Math.abs(oBall._vX)>0.5) {
      oBall._vX *= 0.85;
    } else {
      oBall._vX = 0;
    }
    if (Math.abs(oBall._vY)<=3 && Math.abs(oBall._vX==0)) {
      oBall._active = false;
	  bounce = false;
	  ballPopSound.play();
      oBall.style.display = 'none';
    }
  }
  oBall.style.left = oBall._x+'px';
  oBall.style.top = oBall._y+'px';
  if (bounce) ballSound.play({pan:getPan(oBall._x,canvasX)});
}

function getPan(x,canvasX) {
  var pos = x/canvasX;
  var pan = null;
  if (pos<=0.4) {
    pan = Math.floor(-100+(pos/0.4*100));
  } else if (pos>0.4 && pos<=0.5) {
    pan = 0;
  } else {
    pan = Math.floor(pos*100);
  }
  return pan;
}

function animateStuff() {
  for (var i=balls.length; i--;) {
    if (balls[i]._active) moveBall(balls[i]);
  }
}

function startAnimation() {
  if (!timer) timer = setInterval(animateStuff,20);
  document.getElementById('b-start').disabled = true;
  document.getElementById('b-stop').disabled = false;
}

function stopAnimation() {
  if (!timer) return false;
  clearInterval(timer);
  timer = null;
  document.getElementById('b-start').disabled = false;
  document.getElementById('b-stop').disabled = true;
}

function mouseDown(e) {
  e = e?e:event;
  m_lastX = e.clientX;
  m_lastY = e.clientY;
  document.onmousemove = mouseMove;
  document.onmouseup = mouseUp;
  return false;
}

function mouseMove(e) {
  e = e?e:event;
  if (Math.abs(e.clientX-m_lastX)>M_SPACE || Math.abs(e.clientY-m_lastY)>M_SPACE) {
    createBallAtMouse(e);
    m_lastX = e.clientX;
    m_lastY = e.clientY;
  }
  return false;
}

function mouseUp() {
  document.onmousemove = null;
  document.onmouseup = null;
}

function init() {
  ballSound = soundManager.createSound({
   id: 'ballSound',
   url: '../animation/audio/fingerplop.mp3',
   volume: 50,
   multiShot: true,
   autoLoad: true
  });
  ballPopSound = soundManager.createSound({
   id: 'ballPopSound',
   url: '../animation/audio/fingerplop2.mp3',
   volume: 50,
   multiShot: true,
   autoLoad: true
  });
  balls = document.getElementById('ball-container').getElementsByTagName('img');
  for (var i=balls.length; i--;) {
    initBall(balls[i],i);
  }
  useMouse = document.getElementById('useMouse');
  useMouse.checked = true;
  getWindowCoords();
  startAnimation();
  document.onmousedown = mouseDown;
}

// I know this is kinda broken in Opera.
getWindowCoords = (navigator.userAgent.toLowerCase().indexOf('opera')>0||navigator.appVersion.toLowerCase().indexOf('safari')!=-1)?function() {
  canvasX = window.innerWidth;
  canvasY = window.innerHeight;
}:function() {
  canvasX = document.documentElement.clientWidth||document.body.clientWidth||document.body.scrollWidth;
  canvasY = document.documentElement.clientHeight||document.body.clientHeight||document.body.scrollHeight;
}

window.onresize = getWindowCoords;

soundManager.setup({
  preferFlash: true,
  flashVersion: 9,
  url: '../../swf/',
  useHighPerformance: true,
  debugMode: false, // disable debug mode
  onready: function() {
    // soundManager is ready to use (create sounds and so on)
    init();
  }
});

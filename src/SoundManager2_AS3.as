/*
   SoundManager 2: Javascript Sound for the Web
   ----------------------------------------------
   http://schillmania.com/projects/soundmanager2/

   Copyright (c) 2007, Scott Schiller. All rights reserved.
   Code licensed under the BSD License:
   http://www.schillmania.com/projects/soundmanager2/license.txt

   Flash 9 / ActionScript 3 version
*/

package {

  import flash.display.Sprite;
  import flash.display.StageAlign;
  import flash.display.StageDisplayState;
  import flash.display.StageScaleMode;
  import flash.events.Event;
  import flash.events.FullScreenEvent;
  import flash.events.IOErrorEvent;
  import flash.events.MouseEvent;
  import flash.events.SecurityErrorEvent;
  import flash.events.AsyncErrorEvent;
  import flash.events.NetStatusEvent;
  import flash.events.TimerEvent;
  import flash.external.ExternalInterface; // woo
  import flash.geom.Rectangle;
  import flash.media.Sound;
  import flash.media.SoundChannel;
  import flash.media.SoundMixer;
  import flash.net.URLLoader;
  import flash.net.URLRequest;
  import flash.system.Security;
  import flash.system.System;
  import flash.text.TextField;
  import flash.text.TextFormat;
  import flash.text.TextFieldAutoSize;
  import flash.ui.ContextMenu;
  import flash.ui.ContextMenuItem;
  import flash.utils.setInterval;
  import flash.utils.clearInterval;
  import flash.utils.Dictionary;
  import flash.utils.Timer;
  import flash.xml.XMLDocument;
  import flash.xml.XMLNode;

  public class SoundManager2_AS3 extends Sprite {

    public var version:String = "V2.96a.20100624";
    public var version_as:String = "(AS3/Flash 9)";

    /*
    *  Cross-domain security options
    *  HTML on foo.com loading .swf hosted on bar.com? Define your "HTML domain" here to allow JS+Flash communication to work.
    *  // allow_xdomain_scripting = true;
    *  // xdomain = "foo.com";
    *  For all domains (possible security risk?), use xdomain = "*"; which ends up as System.security.allowDomain("*");
    *  When loading from HTTPS, use System.security.allowInsecureDomain();
    *  See http://livedocs.adobe.com/flash/9.0/ActionScriptLangRefV3/flash/system/Security.html#allowDomain()
    */
    public var allow_xdomain_scripting:Boolean = false;
    public var xdomain:String = "*";

    // externalInterface references (for Javascript callbacks)
    public var baseJSController:String = "soundManager";
    public var baseJSObject:String = baseJSController + ".sounds";

    // internal objects
    public var sounds:Array = []; // indexed string array
    public var soundObjects: Dictionary = new Dictionary(); // associative Sound() object Dictionary type
    public var timerInterval: uint = 50;
    public var timerIntervalHighPerformance: uint = 10; // ~30fps (in Safari on OSX, anyway..)
    public var timer: Timer = null;
    public var pollingEnabled: Boolean = false; // polling (timer) flag - disabled by default, enabled by JS->Flash call
    public var debugEnabled: Boolean = true; // Flash debug output enabled by default, disabled by JS call
    public var flashDebugEnabled: Boolean = false; // Flash internal debug output (write to visible SWF in browser)
    public var loaded: Boolean = false;
    public var isFullScreen: Boolean = false;
    public var currentObject: SoundManager2_SMSound_AS3 = null;
    public var paramList:Object = null;
    public var messages:Array = [];
    public var textField: TextField = null;
    public var textStyle: TextFormat = new TextFormat();
    public var didSandboxMessage: Boolean = false;
    public var caughtFatal: Boolean = false;

    public function SoundManager2_AS3() {

      if (allow_xdomain_scripting && xdomain) {
        Security.allowDomain(xdomain);
        version_as += ' - cross-domain enabled';
      }

      this.setDefaultStageScale();

      this.paramList = this.root.loaderInfo.parameters;

      // <d>
      if (this.paramList['debug'] == 1) {
        this.flashDebugEnabled = true;
      }

      if (this.flashDebugEnabled) {
        var canvas: Sprite = new Sprite();
        canvas.graphics.drawRect(0, 0, stage.stageWidth, stage.stageHeight);
        addChild(canvas);
      }
      // </d>

      flashDebug('SM2 SWF ' + version + ' ' + version_as);

      // context menu item with version info

      var sm2Menu:ContextMenu = new ContextMenu();
      var sm2MenuItem:ContextMenuItem = new ContextMenuItem('SoundManager ' + version + ' ' + version_as);
      sm2MenuItem.enabled = false;
      sm2Menu.customItems.push(sm2MenuItem);
      contextMenu = sm2Menu;

      if (ExternalInterface.available) {
        flashDebug('ExternalInterface available');
        try {
          flashDebug('Adding ExternalInterface callbacks...');
          ExternalInterface.addCallback('_load', _load);
          ExternalInterface.addCallback('_unload', _unload);
          ExternalInterface.addCallback('_stop', _stop);
          ExternalInterface.addCallback('_start', _start);
          ExternalInterface.addCallback('_pause', _pause);
          ExternalInterface.addCallback('_setPosition', _setPosition);
          ExternalInterface.addCallback('_setPan', _setPan);
          ExternalInterface.addCallback('_setVolume', _setVolume);
          ExternalInterface.addCallback('_setPolling', _setPolling);
          ExternalInterface.addCallback('_externalInterfaceTest', _externalInterfaceTest);
          ExternalInterface.addCallback('_disableDebug', _disableDebug);
          ExternalInterface.addCallback('_getMemoryUse', _getMemoryUse);
          ExternalInterface.addCallback('_loadFromXML', _loadFromXML);
          ExternalInterface.addCallback('_createSound', _createSound);
          ExternalInterface.addCallback('_destroySound', _destroySound);
          ExternalInterface.addCallback('_setAutoPlay', _setAutoPlay);
        } catch(e: Error) {
          flashDebug('Fatal: ExternalInterface error: ' + e.toString());
        }
      } else {
        flashDebug('Fatal: ExternalInterface (Flash &lt;-&gt; JS) not available');
      };

      // call after delay, to be safe (ensure callbacks are registered by the time JS is called below)
      var timer: Timer = new Timer(20, 0);
      timer.addEventListener(TimerEvent.TIMER, function () : void {
        timer.reset();
        _externalInterfaceTest(true);
        // timer.reset();
        // flashDebug('Init OK');
      });
      timer.start();
      // delayed, see above
      // _externalInterfaceTest(true);
      this.stage.addEventListener(MouseEvent.DOUBLE_CLICK, toggleFullScreen);
      this.stage.doubleClickEnabled = true;
      this.stage.addEventListener(FullScreenEvent.FULL_SCREEN, fullscreenHandler);

    } // SoundManager2()

    public function flashDebug (txt:String) : void {
      // <d>
      messages.push(txt);
      if (this.flashDebugEnabled) {
        var didCreate: Boolean = false;
        textStyle.font = 'Arial';
        textStyle.size = 12;
        // 320x240 if no stage dimensions (happens in IE, apparently 0 before stage resize event fires.)
       var w:Number = this.stage.width?this.stage.width:320;
       var h:Number = this.stage.height?this.stage.height:240;
        if (textField == null) {
          didCreate = true;
          textField = new TextField();
          textField.autoSize = TextFieldAutoSize.LEFT;
          textField.x = 0;
          textField.y = 0;
          textField.multiline = true;
          textField.textColor = 0;
          textField.wordWrap = true;
        }
        textField.htmlText = messages.join('\n');
        textField.setTextFormat(textStyle);
        textField.width = w;
        textField.height = h;
        if (didCreate) {
          this.addChild(textField);
        }
      }
      // </d>
    }

    public function _setAutoPlay(sID:String, autoPlay:Boolean) : void {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (s) {
        s.setAutoPlay(autoPlay);
      }
    }

    public function fullscreenHandler(e: FullScreenEvent) : void {
      writeDebug('fullscreenHandler(): ' + e.toString());
      if (e.fullScreen == true) {
        this.isFullScreen = true;
      } else {
        // user left full-screen
        this.isFullScreen = false;
      }
      ExternalInterface.call(baseJSController + "['_onfullscreenchange']", e.fullScreen == true ? 1 : 0);
    }

    public function toggleFullScreen(e: MouseEvent) : void {
      writeDebug('SoundManager2_AS3.toggleFullScreen()');
      if (this.currentObject && this.currentObject.useVideo) {
        if (this.currentObject.videoWidth == 0) {
          writeDebug('toggleFullScreen(): video width is 0 (metadata missing/not loaded yet?) Trying stage width/height');
          this.currentObject.videoWidth = this.stage.width;
          this.currentObject.videoHeight = this.stage.height;
        }
        try {
          stage.scaleMode = StageScaleMode.NO_SCALE;
          stage.align = StageAlign.TOP_LEFT;
          stage.fullScreenSourceRect = new Rectangle(0, 0, this.currentObject.videoWidth, this.currentObject.videoHeight);
          stage.displayState = StageDisplayState.FULL_SCREEN;
        } catch(e: Error) {
          // write debug message?
          writeDebug('Unable to switch to full-screen. ' + e.toString());
        }
      } else {
        writeDebug('toggleFullScreen(): No active video to show?');
      }
    }

    public function setDefaultStageScale() : void {
      stage.scaleMode = StageScaleMode.NO_SCALE;
      stage.align = StageAlign.TOP_LEFT;
    }

    // methods
    // -----------------------------------
    public function _exitFullScreen() : void {
      try {
        stage.displayState = StageDisplayState.NORMAL;
        this.setDefaultStageScale();
        this.isFullScreen = false;
        ExternalInterface.call(baseJSController + "._onfullscreenchange", 0);
      } catch(e: Error) {
        // oh well
        writeDebug('exitFullScreen error: ' + e.toString());
      }
    }

    public function writeDebug (s:String, bTimestamp: Boolean = false) : Boolean {
      if (!debugEnabled) return false;
      // <d>
      ExternalInterface.call(baseJSController + "['_writeDebug']", "(Flash): " + s, null, bTimestamp);
      // </d>
      return true;

    }

    public function _externalInterfaceTest(isFirstCall: Boolean) : Boolean {
      var sandboxType:String = flash.system.Security['sandboxType'];
      if (!didSandboxMessage && sandboxType != 'localTrusted' && sandboxType != 'remote') {
        didSandboxMessage = true;
        flashDebug('<br><b>Fatal: Security sandbox error: Got "' + sandboxType + '", expected "remote" or "localTrusted".<br>Additional security permissions need to be granted.<br>See <a href="http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html">flash security settings panel</a> for non-HTTP, eg., file:// use.</b><br>http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html');
      }
      try {
        if (isFirstCall == true) {
          flashDebug('Testing Flash -&gt; JS...');
          var d: Date = new Date();
          ExternalInterface.call(baseJSController + "._externalInterfaceOK", d.getTime());
          flashDebug('Flash -&gt; JS OK');
        } else {
          writeDebug('SM2 SWF ' + version + ' ' + version_as);
          flashDebug('JS -> Flash OK');
          ExternalInterface.call(baseJSController + "._setSandboxType", sandboxType);
          writeDebug('JS to/from Flash OK');
        }
      } catch(e: Error) {
        flashDebug('Fatal: Flash &lt;-&gt; JS error: ' + e.toString());
        writeDebug('_externalInterfaceTest: Error: ' + e.toString());
        if (!caughtFatal) {
          caughtFatal = true;
        }
        return false;
      }
      return true; // to verify that a call from JS to here, works. (eg. JS receives "true", thus OK.)
    }

    public function _disableDebug() : void {
      // prevent future debug calls from Flash going to client (maybe improve performance)
      writeDebug('_disableDebug()');
      debugEnabled = false;
    }

    public function checkLoadProgress(e: Event) : void {
      try {
        var oSound:Object = e.target;
        var bL: int = oSound.bytesLoaded;
        var bT: int = oSound.bytesTotal || oSound.totalBytes;
        var nD: int = oSound.length || oSound.duration || 0;
        var sMethod:String = baseJSObject + "['" + oSound.sID + "']._whileloading";
        ExternalInterface.call(sMethod, bL, bT, nD);
        if (bL && bT && bL != oSound.lastValues.bytes) {
          oSound.lastValues.bytes = bL;
          ExternalInterface.call(sMethod, bL, bT, nD);
        }
      } catch(e: Error) {
        writeDebug('checkLoadProgress(): ' + e.toString());
      }
    }

    public function checkProgress() : void {
      var bL: int = 0;
      var bT: int = 0;
      var nD: int = 0;
      var nP: int = 0;
      var lP:Number = 0;
      var rP:Number = 0;
      var isBuffering:Object = null;
      var oSound: SoundManager2_SMSound_AS3 = null;
      var oSoundChannel: flash.media.SoundChannel = null;
      var sMethod:String = null;
      var newPeakData: Boolean = false;
      var newWaveformData: Boolean = false;
      var newEQData: Boolean = false;
      var areSoundsInaccessible: Boolean = SoundMixer.areSoundsInaccessible();
      var isPlaying: Boolean = true; // special case for NetStream when ending
      for (var i: int = 0, j: int = sounds.length; i < j; i++) {
        oSound = soundObjects[sounds[i]];
        sMethod = baseJSObject + "['" + sounds[i] + "']._whileloading";

        if (!oSound || !oSound.useEvents || oSound.failed || !oSound.connected) {
          // various cases for ignoring
          continue; // if sounds are destructed within event handlers while this loop is running, may be null
        }

        var hasNew:Boolean = false;
        var hasNewLoaded:Boolean = false;

        if (oSound.useNetstream) {

          // video stream
          bL = oSound.ns.bytesLoaded;
          bT = oSound.ns.bytesTotal || oSound.totalBytes;
          nD = int(oSound.duration || 0); // can sometimes be null with short MP3s? Wack.
          nP = oSound.ns.time * 1000;
          if (nP != oSound.lastValues.position) {
            oSound.lastValues.position = nP;
            hasNew = true;
          }
          if (nD > oSound.lastValues.duration) {
            oSound.lastValues.duration = nD;
            hasNew = true;
          }
          if (bL > oSound.lastValues.bytesLoaded) {
            oSound.lastValues.bytesLoaded = bL;
            hasNew = true;
          }
          if (bT > oSound.lastValues.bytes) {
            oSound.lastValues.bytes = bT;
            hasNew = true;
          }
          if (oSound.loaded != true && nD > 0 && bL == bT) {
            // non-MP3 has loaded
            // writeDebug('ns: time/duration, bytesloaded/total: '+nP+'/'+nD+', '+bL+'/'+bT);
            oSound.loaded = true;
            try {
              ExternalInterface.call(sMethod, bL, bT, nD); // _whileloading()
              ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", oSound.duration > 0 ? 1 : 0);
            } catch(e: Error) {
              writeDebug('_whileLoading/_onload error: ' + e.toString());
            }
          } else if (oSound.loaded != true && hasNew) {
            // writeDebug('whileloading() loaded/total/duration: '+bL+', '+bT+', '+nD);
            ExternalInterface.call(sMethod, bL, bT, nD); // _whileloading()
          } else if (!oSound.loaded && bL == 0 && bT && oSound.ns.bufferLength != oSound.lastValues.bufferLength) {
            // TODO: Verify if this merge is correct with above logic.
            // KJV For our RTMP streams bytesLoaded is always 0!
            // writeDebug('updating position with bufferLength ' + oSound.ns.bufferLength);
            oSound.lastValues.bufferLength = oSound.ns.bufferLength;
            ExternalInterface.call(sMethod, bL, bT, nD, oSound.ns.bufferLength);
          }

        } else {

          // MP3 sound
          oSoundChannel = oSound.soundChannel;
          bL = oSound.bytesLoaded;
          bT = oSound.bytesTotal;
          nD = int(oSound.length || 0); // can sometimes be null with short MP3s? Wack.
          isBuffering = oSound.isBuffering;

          if (oSoundChannel) {
            nP = (oSoundChannel.position || 0);
            if (oSound.lastValues.loops > 1 && nP > oSound.length) {
              // round down to nearest loop
              var playedLoops:Number = Math.floor(nP/oSound.length);
              nP = nP - (oSound.length*playedLoops);
            }
            if (oSound.usePeakData) {
              lP = int((oSoundChannel.leftPeak) * 1000) / 1000;
              rP = int((oSoundChannel.rightPeak) * 1000) / 1000;
            } else {
              lP = 0;
              rP = 0;
            }
          } else {
            // stopped, not loaded or feature not used
            nP = 0;
          }

          if (nP != oSound.lastValues.position) {
            oSound.lastValues.position = nP;
            hasNew = true;
          }

          if (nD > oSound.lastValues.duration) { // original sound duration * number of sound loops
            oSound.lastValues.duration = nD;
            hasNew = true;
          }
          if (bL > oSound.lastValues.bytesLoaded) {
            oSound.lastValues.bytesLoaded = bL;
            hasNew = true;
          }
          if (bT > oSound.lastValues.bytes) {
            oSound.lastValues.bytes = bT;
            hasNew = true;
            hasNewLoaded = true;
          }

          // loading progress
          if (hasNewLoaded) {
            oSound.lastValues.bytes = bL;
            ExternalInterface.call(sMethod, bL, bT, nD);
          }
        }
        // peak data
        if (oSoundChannel && oSound.usePeakData) {
          if (lP != oSound.lastValues.leftPeak) {
            oSound.lastValues.leftPeak = lP;
            newPeakData = true;
          }
          if (rP != oSound.lastValues.rightPeak) {
            oSound.lastValues.rightPeak = rP;
            newPeakData = true;
          }
        }

        var newDataError:Boolean = false;
        var dataErrors:Array = [];

        // raw waveform + EQ spectrum data
        if (oSoundChannel || oSound.useNetstream) {
          if (oSound.useWaveformData) {
            if (areSoundsInaccessible == false) {
              try {
                oSound.getWaveformData();
              } catch(e: Error) {
                // this shouldn't happen, but does seem to fire from time to time.
                writeDebug('getWaveformData() warning: ' + e.toString());
              }
            } else if (oSound.handledDataError != true && oSound.ignoreDataError != true) {
              try {
                oSound.getWaveformData();
              } catch(e: Error) {
                writeDebug('getWaveformData() (waveform data) '+e.toString());
                // oSound.useWaveformData = false;
                newDataError = true;
                dataErrors.push(e.toString());
                oSound.handledDataError = true;
              }
            }
          }
          if (oSound.useEQData) {
            if (areSoundsInaccessible == false) {
              try {
                oSound.getEQData();
              } catch(e: Error) {
                writeDebug('getEQData() warning: ' + e.toString());
                newDataError = true;
                dataErrors.push(e.toString());
                oSound.handledDataError = true;
              }
            } else if (oSound.handledDataError != true && oSound.ignoreDataError != true) {
              try {
                oSound.getEQData();
              } catch(e: Error) {
                // writeDebug('computeSpectrum() (EQ data) '+e.toString());
                // oSound.useEQData = false;
                newDataError = true;
                dataErrors.push(e.toString());
                oSound.handledDataError = true;
              }
            }
          }
          if (oSound.waveformDataArray != oSound.lastValues.waveformDataArray) {
            oSound.lastValues.waveformDataArray = oSound.waveformDataArray;
            newWaveformData = true;
          }
          if (oSound.eqDataArray != oSound.lastValues.eqDataArray) {
            oSound.lastValues.eqDataArray = oSound.eqDataArray;
            newEQData = true;
          }
        }

        if (newDataError) {
            sMethod = baseJSObject + "['" + sounds[i] + "']._ondataerror";
            var errors:String = dataErrors.join('<br>\n');
            ExternalInterface.call(sMethod, 'data unavailable: ' + errors);
        }

        // special case: Netstream may try to fire whileplaying() after finishing. check that stop hasn't fired.
        isPlaying = (!oSound.useNetstream || (oSound.useNetstream && oSound.lastNetStatus != "NetStream.Play.Stop")); // don't update if stream has ended

        if (typeof nP != 'undefined' && hasNew && isPlaying) { // and IF VIDEO, is still playing?

          // oSound.lastValues.position = nP;
          sMethod = baseJSObject + "['" + sounds[i] + "']._whileplaying";
          var waveDataLeft:String = (newWaveformData ? oSound.waveformDataArray.slice(0, 256).join(',') : null);
          var waveDataRight:String = (newWaveformData ? oSound.waveformDataArray.slice(256).join(',') : null);
          var eqDataLeft:String = (newEQData ? oSound.eqDataArray.slice(0, 256).join(',') : null);
          var eqDataRight:String = (newEQData ? oSound.eqDataArray.slice(256).join(',') : null);
          ExternalInterface.call(sMethod, nP, (newPeakData ? {
            leftPeak: lP,
            rightPeak: rP
          } : null), waveDataLeft, waveDataRight, (newEQData ? {
            leftEQ: eqDataLeft,
            rightEQ: eqDataRight
          } : null));
          // if position changed, check for near-end
          if (oSound.didJustBeforeFinish != true && oSound.loaded == true && oSound.justBeforeFinishOffset > 0 && nD - nP <= oSound.justBeforeFinishOffset) {
            // fully-loaded, near end and haven't done this yet..
            sMethod = baseJSObject + "['" + sounds[i] + "']._onjustbeforefinish";
            ExternalInterface.call(sMethod, (nD - nP));
            oSound.didJustBeforeFinish = true;
          }
        }

        // check isBuffering
        if (!oSound.useNetstream && oSound.isBuffering != oSound.lastValues.isBuffering) {
          // property has changed
          oSound.lastValues.isBuffering = oSound.isBuffering;
          sMethod = baseJSObject + "['" + sounds[i] + "']._onbufferchange";
          ExternalInterface.call(sMethod, oSound.isBuffering ? 1 : 0);
        }

      }

    }

    public function onLoadError(oSound:Object) : void {
      // something went wrong. 404, bad format etc.
      ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", 0);
    }

    public function onLoad(e: Event) : void {
      checkProgress(); // ensure progress stats are up-to-date
      var oSound:Object = e.target;
      if (!oSound.useNetstream) { // FLV must also have metadata
        oSound.loaded = true;
        // force duration update (doesn't seem to be always accurate)
        ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._whileloading", oSound.bytesLoaded, oSound.bytesTotal, oSound.length || oSound.duration);
        // TODO: Determine if loaded or failed - bSuccess?
        // ExternalInterface.call(baseJSObject+"['"+oSound.sID+"']._onload",bSuccess?1:0);
        ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", 1);
      }
    }

    public function onID3(e: Event) : void {

      // --- NOTE: BUGGY (Flash 8 only? Haven't really checked 9 + 10.) ---
      // TODO: Investigate holes in ID3 parsing - for some reason, Album will be populated with Date if empty and date is provided. (?)
      // ID3V1 seem to parse OK, but "holes" / blanks in ID3V2 data seem to get messed up (eg. missing album gets filled with date.)
      // iTunes issues: onID3 was not called with a test MP3 encoded with iTunes 7.01, and what appeared to be valid ID3V2 data.
      // May be related to thumbnails for album art included in MP3 file by iTunes. See http://mabblog.com/blog/?p=33
      try {
        var oSound:Object = e.target;

        var id3Data:Array = [];
        var id3Props:Array = [];
        for (var prop:String in oSound.id3) {
          id3Props.push(prop);
          id3Data.push(oSound.id3[prop]);
          // writeDebug('id3['+prop+']: '+oSound.id3[prop]);
        }
        ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onid3", id3Props, id3Data);
        // unhook own event handler, prevent second call (can fire twice as data is received - ID3V2 at beginning, ID3V1 at end.)
        // Therefore if ID3V2 data is received, ID3V1 is ignored.
        // soundObjects[oSound.sID].onID3 = null;
      } catch(e: Error) {
        writeDebug('onID3(): Unable to get ID3 info for ' + oSound.sID + '.');
      }
      oSound.removeEventListener(Event.ID3, onID3);
    }

    public function registerOnComplete(sID:String) : void {
      var oSound: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (oSound && oSound.soundChannel) {
        oSound.soundChannel.addEventListener(Event.SOUND_COMPLETE, function () : void {
          if (oSound) {
            oSound.didJustBeforeFinish = false; // reset
            checkProgress();
            try {
              oSound.ignoreDataError = true; // workaround: avoid data error handling for this manual step..
              oSound.start(0, 1); // go back to 0
              oSound.soundChannel.stop();
            } catch(e: Error) {
              writeDebug('Could not set position on ' + sID + ': ' + e.toString());
            }
            oSound.ignoreDataError = false; // ..and reset
            oSound.handledDataError = false; // reset this flag
          }
          // checkProgress();
          ExternalInterface.call(baseJSObject + "['" + sID + "']._onfinish");
        });
      }
    }

    public function doSecurityError(oSound: SoundManager2_SMSound_AS3, e: SecurityErrorEvent) : void {
      writeDebug('securityError: ' + e.text);
      // when this happens, you don't have security rights on the server containing the FLV file
      // a crossdomain.xml file would fix the problem easily
    }

    public function doIOError(oSound: SoundManager2_SMSound_AS3, e: IOErrorEvent) : void {
      // writeDebug('ioError: '+e.text);
      // call checkProgress()?
      ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", 0); // call onload, assume it failed.
      // there was a connection drop, a loss of internet connection, or something else wrong. 404 error too.
    }

    public function doAsyncError(oSound: SoundManager2_SMSound_AS3, e: AsyncErrorEvent) : void {
      writeDebug('asyncError: ' + e.text);
      // this is more related to streaming server from my experience, but you never know
    }

    public function doNetStatus(oSound: SoundManager2_SMSound_AS3, e: NetStatusEvent) : void {
      // this will eventually let us know what is going on.. is the stream loading, empty, full, stopped?
      oSound.lastNetStatus = e.info.code;

      if (e.info.code != "NetStream.Buffer.Full" && e.info.code != "NetStream.Buffer.Empty" && e.info.code != "NetStream.Seek.Notify") {
        writeDebug('netStatusEvent: ' + e.info.code);
      }

      // When streaming, Stop is called when buffering stops, not when the stream is actually finished.
      // @see http://www.actionscript.org/forums/archive/index.php3/t-159194.html

      if (e.info.code == "NetStream.Play.Stop") { // && !oSound.didFinish && oSound.loaded == true && nD == nP
        writeDebug('NetStream.Play.Stop');
        // if (!oSound.useNetstream) {
        // finished playing
        // oSound.didFinish = true; // will be reset via JS callback
        oSound.didJustBeforeFinish = false; // reset
        writeDebug('calling onfinish for a sound');
        // reset the sound? Move back to position 0?
        checkProgress();
        ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onfinish");
        // and exit full-screen mode, too?
        stage.displayState = StageDisplayState.NORMAL;
      } else if (e.info.code == "NetStream.Play.FileStructureInvalid" || e.info.code == "NetStream.Play.FileStructureInvalid" || e.info.code == "NetStream.Play.StreamNotFound") {
        writeDebug('NetStream load error: '+e.info.code);
        this.onLoadError(oSound);
      } else if (e.info.code == "NetStream.Play.Start" || e.info.code == "NetStream.Buffer.Empty" || e.info.code == "NetStream.Buffer.Full") {

        // RTMP case..
        // We wait for the buffer to fill up before pausing the just-loaded song because only if the
        // buffer is full will the song continue to buffer until the user hits play.
        if (oSound.serverUrl && e.info.code == "NetStream.Buffer.Full" && oSound.pauseOnBufferFull) {
          oSound.ns.pause();
          oSound.paused = true;
          oSound.pauseOnBufferFull = false;

          // Call pause in JS.  This will call back to us to pause again, but
          // that should be harmless.
          writeDebug('Pausing song because buffer is now full.');
          ExternalInterface.call(baseJSObject + "['" + oSound.sID + "'].pause", false);
        }

        // Increase the size of the buffer
        if (e.info.code == "NetStream.Buffer.Full") {
          if (oSound.ns.bufferTime == oSound.bufferTime) {
            oSound.ns.bufferTime = 15;
            writeDebug('increasing buffer to 15 secs');
          }/* else if (oSound.ns.bufferTime == 15) {
                      oSound.ns.bufferTime = 30;
                      writeDebug('increasing buffer to 30 secs');
          }*/
        }

        var isNetstreamBuffering: Boolean = (e.info.code == "NetStream.Buffer.Empty" || e.info.code == "NetStream.Play.Start");
        // assume buffering when we start playing, eg. initial load.
        if (isNetstreamBuffering != oSound.lastValues.isBuffering) {
          oSound.lastValues.isBuffering = isNetstreamBuffering;
          ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onbufferchange", oSound.lastValues.isBuffering ? 1 : 0);
        }

        // We can detect the end of the stream when Play.Stop is called followed by Buffer.Empty.
        // However, if you pause and let the whole song buffer, Buffer.Flush is called followed by
        // Buffer.Empty, so handle that case too.
        if (e.info.code == "NetStream.Buffer.Empty" && (oSound.lastNetStatus == 'NetStream.Play.Stop' || oSound.lastNetStatus == 'NetStream.Buffer.Flush')) {
          //writeDebug('Buffer empty and last net status was Play.Stop or Buffer.Flush.  This must be the end!');
          oSound.didJustBeforeFinish = false; // reset
          oSound.finished = true;
          writeDebug('calling onfinish for sound '+oSound.sID);
          checkProgress();
          ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onfinish");
        } else if (e.info.code == "NetStream.Buffer.Empty" && oSound.ns.bufferTime != oSound.bufferTime) {
          oSound.ns.bufferTime = oSound.bufferTime;
          writeDebug('setting buffer to '+oSound.ns.bufferTime+' secs');
        }

      // Recover from failures
      } else if (e.info.code == "NetConnection.Connect.Closed"
          || e.info.code == "NetStream.Failed"
          || e.info.code == "NetStream.Play.FileStructureInvalid"
          || e.info.code == "NetStream.Play.StreamNotFound") {
        if (oSound.failed) {
          writeDebug('doNetStatus: ignoring, already reported failure.');
        } else {
          oSound.failed = true;
          ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onfailure");
        }
      }
      oSound.lastNetStatus = e.info.code;

    }

    public function addNetstreamEvents(oSound: SoundManager2_SMSound_AS3) : void {
      oSound.ns.addEventListener(AsyncErrorEvent.ASYNC_ERROR, function (e: AsyncErrorEvent) : void {
        doAsyncError(oSound, e)
      });
      oSound.ns.addEventListener(NetStatusEvent.NET_STATUS, function (e: NetStatusEvent) : void {
        doNetStatus(oSound, e)
      });
      oSound.ns.addEventListener(IOErrorEvent.IO_ERROR, function (e: IOErrorEvent) : void {
        doIOError(oSound, e)
      });
    }

    public function removeNetstreamEvents(oSound: SoundManager2_SMSound_AS3) : void {
      // for the record, I'm sure this is completely wrong. ;)
      oSound.ns.removeEventListener(AsyncErrorEvent.ASYNC_ERROR, function (e: AsyncErrorEvent) : void {
        doAsyncError(oSound, e)
      });
      oSound.ns.removeEventListener(NetStatusEvent.NET_STATUS, function (e: NetStatusEvent) : void {
        doNetStatus(oSound, e)
      });
      oSound.ns.removeEventListener(IOErrorEvent.IO_ERROR, function (e: IOErrorEvent) : void {
        doIOError(oSound, e)
      });
    }

    public function _setPosition(sID:String, nSecOffset:Number, isPaused: Boolean) : void {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      // writeDebug('_setPosition()');

      // don't allow seek past loaded duration. (Will stop + fail.)
      if (s.useVideo && nSecOffset > s.duration*1000) {
        writeDebug('setPosition: Cannot seek past current duration of '+s.duration+', using this value');
        nSecOffset = s.duration*1000;
      }

      // stop current channel, start new one.
      if (s.lastValues) {
        s.lastValues.position = nSecOffset; // s.soundChannel.position;
      }
      if (s.useNetstream) {
        // Minimize the buffer so playback starts ASAP
        s.ns.bufferTime = s.bufferTime;
        writeDebug('setPosition: setting buffer to '+s.ns.bufferTime+' secs');

        nSecOffset = nSecOffset > 0 ? nSecOffset / 1000 : 0;
        // writeDebug('setPosition: ' + nSecOffset/(!s.useVideo?1000:1));
        writeDebug('setPosition: ' + nSecOffset);
        s.ns.seek(nSecOffset);
        checkProgress(); // force UI update
      } else {
        if (s.soundChannel) {
          s.soundChannel.stop();
        }
        writeDebug('setPosition: ' + nSecOffset); // +', '+(s.lastValues.loops?s.lastValues.loops:1));
        if (s.lastValues.loops > 1 && nSecOffset != 0) {
          writeDebug('Warning: Looping functionality being disabled due to Flash limitation.');
          s.lastValues.loops = 1;
        }
        try {
          s.start(nSecOffset, s.lastValues.loops || 1); // start playing at new position
        } catch(e: Error) {
          writeDebug('Warning: Could not set position on ' + sID + ': ' + e.toString());
        }
        checkProgress(); // force UI update
        try {
          registerOnComplete(sID);
        } catch(e: Error) {
          writeDebug('_setPosition(): Could not register onComplete');
        }
        if (isPaused && s.soundChannel) {
          // writeDebug('_setPosition: stopping (paused) sound');
          // writeDebug('last position: '+s.lastValues.position+' vs '+s.soundChannel.position);
          s.soundChannel.stop();
        }
      }
    }

    public function _load(sID:String, sURL:String, bStream: Boolean, bAutoPlay: Boolean, nLoops:Number) : void {
      // writeDebug('_load()');
      if (typeof bAutoPlay == 'undefined') bAutoPlay = false;
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      var didRecreate: Boolean = false;
      if (s.didLoad == true) {
        // need to recreate sound
        didRecreate = true;
        writeDebug('recreating sound ' + sID + ' in order to load ' + sURL);
        var ns:Object = new Object();
        ns.sID = s.sID;
        ns.loops = nLoops||1;
        ns.justBeforeFinishOffset = s.justBeforeFinishOffset;
        ns.usePeakData = s.usePeakData;
        ns.useWaveformData = s.useWaveformData;
        ns.useEQData = s.useEQData;
        ns.useNetstream = s.useNetstream;
        ns.useVideo = s.useVideo;
        ns.bufferTime = s.bufferTime;
        ns.serverUrl = s.serverUrl;
        ns.duration = s.duration;
        ns.totalBytes = s.totalBytes;
        ns.useEvents = true;
        _destroySound(s.sID);
        _createSound(ns.sID, sURL, ns.justBeforeFinishOffset, ns.usePeakData, ns.useWaveformData, ns.useEQData, ns.useNetstream, ns.useVideo, ns.bufferTime, ns.loops, ns.serverUrl, ns.duration, ns.totalBytes, bAutoPlay, ns.useEvents);
        s = soundObjects[sID];
        // writeDebug('Sound object replaced');
      }
      checkProgress();

      if (!s.didLoad) {
        try {
          s.addEventListener(Event.ID3, onID3);
          s.addEventListener(Event.COMPLETE, onLoad);
        } catch(e: Error) {
          writeDebug('_load(): could not assign ID3/complete event handlers');
        }
      }

      // s.addEventListener(ProgressEvent.PROGRESS, checkLoadProgress); // May be called often, potential CPU drain
      // s.addEventListener(Event.FINISH, onFinish);
      // s.loaded = true; // TODO: Investigate - Flash 9 non-FLV bug??
      // s.didLoad = true; // TODO: Investigate - bug?
      // if (didRecreate || s.sURL != sURL) {
      // don't try to load if same request already made
      s.sURL = sURL;

      if (s.useNetstream) {
        try {
          // s.ns.close();
          s.useEvents = true;
          if (s.ns) {
            this.addNetstreamEvents(s);
            ExternalInterface.call(baseJSObject + "['" + s.sID + "']._whileloading", s.ns.bytesLoaded, s.ns.bytesTotal || s.totalBytes, int(s.duration || 0));
            s.ns.play(sURL);
            if (!bAutoPlay) {
              s.ns.pause();
            }
          } else {
            writeDebug('_load(): Note: No netStream found.'+(!s.connected?' (Not connected yet.)':''));
          }
        } catch(e: Error) {
          writeDebug('_load(): error: ' + e.toString());
        }
      } else {
        try {
          s.addEventListener(IOErrorEvent.IO_ERROR, function (e: IOErrorEvent) : void {
            doIOError(s, e)
          });
          s.loadSound(sURL, bStream);
        } catch(e: Error) {
          // oh well
          writeDebug('_load: Error loading ' + sURL + '. Flash error detail: ' + e.toString());
        }
      }

      s.didJustBeforeFinish = false;
    }

    public function _unload(sID:String) : void {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      var sURL:String = s.sURL; // save existing sound URL for object recreation
      try {
        removeEventListener(Event.ID3, onID3);
        removeEventListener(Event.COMPLETE, onLoad);
      } catch(e: Error) {
        writeDebug('_unload() warn: Could not remove ID3/complete events');
      }
      s.paused = false;
      if (s.soundChannel) {
        s.soundChannel.stop();
      }
      try {
        if (s.didLoad && !s.loaded && !s.useNetstream) {
          s.close(); // close stream only if still loading?
        }
      } catch(e: Error) {
        // stream may already have closed if sound loaded, etc.
        writeDebug(sID + '._unload(): Note: Unable to close stream: ' + e.toString());
        // oh well
      }
      // destroy and recreate Flash sound object, try to reclaim memory
      // writeDebug('sound._unload(): recreating sound '+sID+' to free memory');
      if (s.useNetstream) {
        // writeDebug('_unload(): closing netStream stuff');
        try {
          this.removeNetstreamEvents(s);
          s.ns.close();
          s.nc.close();
          // s.nc = null;
          // s.ns = null;
        } catch(e: Error) {
          // oh well
          writeDebug('_unload(): caught exception during netConnection/netStream close');
        }
        if (s.useVideo) {
          writeDebug('_unload(): clearing video');
          s.oVideo.clear();
          // s.oVideo = null;
        }
      }
      var ns:Object = new Object();
      ns.sID = s.sID;
      ns.loops = s.loops;
      ns.justBeforeFinishOffset = s.justBeforeFinishOffset;
      ns.usePeakData = s.usePeakData;
      ns.useWaveformData = s.useWaveformData;
      ns.useEQData = s.useEQData;
      ns.useNetstream = s.useNetstream;
      ns.useVideo = s.useVideo;
      ns.bufferTime = s.bufferTime;
      ns.serverUrl = s.serverUrl;
      ns.duration = s.duration;
      ns.totalBytes = s.totalBytes;
      ns.autoPlay = s.autoPlay;
      _destroySound(s.sID);
      _createSound(ns.sID, sURL, ns.justBeforeFinishOffset, ns.usePeakData, ns.useWaveformData, ns.useEQData, ns.useNetstream, ns.useVideo, ns.bufferTime, ns.loops, ns.serverUrl, ns.duration, ns.totalBytes, ns.autoPlay, false); // false: don't allow events just yet
      soundObjects[sID].connected = true; // fake it?
      writeDebug(s.sID + '.unload(): ok');
    }

    public function _createSound(sID:String, sURL:String, justBeforeFinishOffset: int, usePeakData: Boolean, useWaveformData: Boolean, useEQData: Boolean, useNetstream: Boolean, useVideo: Boolean, bufferTime:Number, loops:Number, serverUrl:String, duration:Number, totalBytes:Number, autoPlay:Boolean, useEvents:Boolean) : void {
      soundObjects[sID] = new SoundManager2_SMSound_AS3(this, sID, sURL, usePeakData, useWaveformData, useEQData, useNetstream, useVideo, bufferTime, serverUrl, duration, totalBytes, autoPlay, useEvents);
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      this.currentObject = s;
      // s.setVolume(100);
      s.didJustBeforeFinish = false;
      s.sID = sID;
      s.sURL = sURL;
      s.paused = false;
      s.loaded = false;
      s.justBeforeFinishOffset = justBeforeFinishOffset || 0;
      s.lastValues = {
        bytes: 0,
        position: 0,
        loops: loops||1,
        leftPeak: 0,
        rightPeak: 0,
        bufferLength: 0
      };
      if (! (sID in sounds)) sounds.push(sID);
      // sounds.push(sID);
    }

    public function _destroySound(sID:String) : void {
      // for the power of garbage collection! .. er, Greyskull!
      var s: SoundManager2_SMSound_AS3 = (soundObjects[sID] || null);
      if (!s) return void;
      // try to unload the sound
      for (var i: int = 0, j: int = sounds.length; i < j; i++) {
        if (sounds[i] == s) {
          sounds.splice(i, 1);
          continue;
        }
      }
      if (s.soundChannel) {
        s.soundChannel.stop();
      }
      this.stage.removeEventListener(Event.RESIZE, s.resizeHandler);
      // if is a movie, remove that as well.
      if (s.useNetstream) {
        // s.nc.client = null;
        try {
          this.removeNetstreamEvents(s);
          // s.nc.removeEventListener(NetStatusEvent.NET_STATUS, s.doNetStatus);
        } catch(e: Error) {
          writeDebug('_destroySound(): Events already removed from netStream/netConnection?');
        }
        if (s.useVideo) {
          try {
            this.removeChild(s.oVideo);
          } catch(e: Error) {
            writeDebug('_destoySound(): could not remove video?');
          }
        }
        if (s.didLoad) {
          // TODO: figure out if stream is still open first, can't close an already-closed stream.
          try {
            s.ns.close();
            s.nc.close();
          } catch(e: Error) {
            // oh well
            writeDebug('_destroySound(): caught exception: '+e.toString());
          }
        }
      } else if (s.didLoad) {
        // non-netstream case
        try {
          s.close(); // close stream only if still loading?
        } catch(e: Error) {
          // oh well
        }
      }
      s = null;
      soundObjects[sID] = null;
      delete soundObjects[sID];
    }

    public function _stop(sID:String, bStopAll: Boolean) : void {
      // stop this particular instance (or "all", based on parameter)
      if (bStopAll) {
        SoundMixer.stopAll();
      } else {
        var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
        if (!s) return void;
        if (s.useNetstream && s.ns) {
          s.ns.pause();
          if (s.oVideo) {
            s.oVideo.visible = false;
          }
        } else if (s.soundChannel) {
          s.soundChannel.stop();
        }
        s.paused = false;
        s.didJustBeforeFinish = false;
      }
    }

    public function _start(sID:String, nLoops: int, nMsecOffset: int) : void {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      writeDebug('start: ' + nMsecOffset+(nLoops?', loops: '+nLoops:''));
      s.lastValues.paused = false; // reset pause if applicable
      s.lastValues.loops = (nLoops || 1);
      s.lastValues.position = nMsecOffset;
      s.handledDataError = false; // reset this flag
      try {
        s.start(nMsecOffset, nLoops);
      } catch(e: Error) {
        writeDebug('Could not start ' + sID + ': ' + e.toString());
      }
      try {
        registerOnComplete(sID);
      } catch(e: Error) {
        writeDebug('_start(): registerOnComplete failed');
      }
    }

    public function _pause(sID:String) : void {
      // writeDebug('_pause()');
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      // writeDebug('s.paused: '+s.paused);
      if (!s.paused) {
        // reference current position, stop sound
        s.paused = true;
        // writeDebug('_pause(): position: '+s.lastValues.position);
        if (s.useNetstream) {
          if (s.ns) {
            s.lastValues.position = s.ns.time;
            s.ns.pause();
          }
        } else {
          if (s.soundChannel) {
            s.lastValues.position = s.soundChannel.position;
            s.soundChannel.stop();
          }
        }
      } else {
        // resume playing from last position
        // writeDebug('resuming - playing at '+s.lastValues.position+', '+s.lastValues.loops+' times');
        s.paused = false;
        if (s.useNetstream) {
          s.ns.resume();
        } else {
          s.start(s.lastValues.position, s.lastValues.loops);
        }
        try {
          registerOnComplete(sID);
        } catch(e: Error) {
          writeDebug('_pause(): registerOnComplete() failed');
        }
      }
    }

    public function _setPan(sID:String, nPan:Number) : void {
      soundObjects[sID].setPan(nPan);
    }

    public function _setVolume(sID:String, nVol:Number) : void {
      // writeDebug('_setVolume: '+nVol);
      soundObjects[sID].setVolume(nVol);
    }

    public function _setPolling(bPolling: Boolean = false, bUseHighPerformanceTimer: Boolean = false) : void {
      pollingEnabled = bPolling;
      if (timer == null && pollingEnabled) {
        var nTimerInterval: uint = (bUseHighPerformanceTimer ? timerIntervalHighPerformance : timerInterval);
        writeDebug('Enabling polling, ' + nTimerInterval + ' ms interval');
        timer = new Timer(nTimerInterval, 0);
        timer.addEventListener(TimerEvent.TIMER, function () : void {
          checkProgress();
        }); // direct reference eg. checkProgress doesn't work? .. odd.
        timer.start();
      } else if (timer && !pollingEnabled) {
        writeDebug('Disabling polling');
        // flash.utils.clearInterval(timer);
        timer.reset();
      }
    }

    public function _getMemoryUse() : String {
      return System.totalMemory.toString();
    }

    // XML handler stuff
    public function _loadFromXML(sURL:String) : void {
      var loader: URLLoader = new URLLoader();
      loader.addEventListener(Event.COMPLETE, parseXML);
      writeDebug('Attempting to load XML: ' + sURL);
      try {
        loader.load(new URLRequest(sURL));
      } catch(e: Error) {
        writeDebug('Error loading XML: ' + e.toString());
      }
    }

    public function parseXML(e: Event) : void {
      try {
        var oXML: XMLDocument = new XMLDocument();
        oXML.ignoreWhite = true;
        oXML.parseXML(e.target.data);
        var xmlRoot: XMLNode = oXML.firstChild;
        var xmlAttr:Object = xmlRoot.attributes;
        var oOptions:Object = {};
        var i: int = 0;
        var j: int = 0;
        for (i = 0, j = xmlRoot.childNodes.length; i < j; i++) {
          xmlAttr = xmlRoot.childNodes[i].attributes;
          oOptions = {
            id: xmlAttr.id,
            url: xmlRoot.attributes.baseHref + xmlAttr.href,
            stream: xmlAttr.stream
          }
          ExternalInterface.call(baseJSController + ".createSound", oOptions);
        }
      } catch(e: Error) {
        writeDebug('Error parsing XML: ' + e.toString());
      }
    }

    // -----------------------------------
    // end methods
  }

  // package
}
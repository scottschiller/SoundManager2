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

  import flash.system.*;
  import flash.events.*;
  import flash.display.Sprite;
  import flash.display.StageAlign;
  import flash.display.StageDisplayState;
  import flash.display.StageScaleMode;
  import flash.geom.Rectangle;
  import flash.media.Sound;
  import flash.media.SoundChannel;
  import flash.media.SoundMixer;
  import flash.utils.setInterval;
  import flash.utils.clearInterval;
  import flash.utils.Dictionary;
  import flash.utils.Timer;
  import flash.net.URLLoader;
  import flash.net.URLRequest;
  import flash.text.TextField;
  import flash.text.TextFormat;
  import flash.text.TextFieldAutoSize;
  import flash.xml.*;
  import flash.external.ExternalInterface; // woo
  public class SoundManager2_AS3 extends Sprite {

    public var version:String = "V2.95b.20100323";
    public var version_as:String = "(AS3/Flash 9)";

    // Cross-domain security exception stuffs
    // HTML on foo.com loading .swf hosted on bar.com? Define your "HTML domain" here to allow JS+Flash communication to work.
    // See http://livedocs.adobe.com/flash/9.0/ActionScriptLangRefV3/flash/system/Security.html#allowDomain()
    // Security.allowDomain("foo.com");

    // externalInterface references (for Javascript callbacks)
    public var baseJSController:String = "soundManager";
    public var baseJSObject:String = baseJSController + ".sounds";

    // internal objects
    public var sounds:Array = []; // indexed string array
    public var soundObjects: Dictionary = new Dictionary(); // associative Sound() object Dictionary type
    public var timerInterval: uint = 20;
    public var timerIntervalHighPerformance: uint = 1; // make callbacks as fast as possible
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

      this.setDefaultStageScale();

      this.paramList = this.root.loaderInfo.parameters;
      if (this.paramList['debug'] == 1) {
        this.flashDebugEnabled = true;
      }

      if (this.flashDebugEnabled) {
        var canvas: Sprite = new Sprite();
        canvas.graphics.drawRect(0, 0, stage.stageWidth, stage.stageHeight);
        addChild(canvas);
      }

      flashDebug('SM2 SWF V' + version + ' ' + version_as);

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
    public function flashDebug(txt:String) : void {
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
        writeDebug('toggleFullScreen(): No active video to show?')
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

    public function writeDebug(s:String, bTimestamp: Boolean = false) : Boolean {
      if (!debugEnabled) return false;
      ExternalInterface.call(baseJSController + "['_writeDebug']", "(Flash): " + s, null, bTimestamp);
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
          writeDebug('SM2 SWF V' + version + ' ' + version_as);
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
        var bT: int = oSound.bytesTotal;
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
        if (!oSound) continue; // if sounds are destructed within event handlers while this loop is running, may be null
        if (oSound.useNetstream) {
          bL = oSound.ns.bytesLoaded;
          bT = oSound.ns.bytesTotal;
          nD = int(oSound.duration || 0); // can sometimes be null with short MP3s? Wack.
          nP = oSound.ns.time * 1000;
          if (oSound.loaded != true && nD > 0 && bL == bT) {
            // non-MP3 has loaded
            // writeDebug('ns: time/duration/bytesloaded,total: '+(oSound.ns.time*1000)+', '+oSound.duration+', '+oSound.ns.bytesLoaded+'/'+oSound.ns.bytesTotal);
            oSound.loaded = true;
            try {
              ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._whileloading", oSound.ns.bytesLoaded, oSound.ns.bytesTotal, nD);
              ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", oSound.duration > 0 ? 1 : 0);
            } catch(e: Error) {
              writeDebug('_whileLoading/_onload error: ' + e.toString());
            }
          } else if (!oSound.loaded && bL && bT && bL != oSound.lastValues.bytes) {
            oSound.lastValues.bytes = bL;
            ExternalInterface.call(sMethod, bL, bT, nD);
          }
        } else {
          oSoundChannel = oSound.soundChannel;
          bL = oSound.bytesLoaded;
          bT = oSound.bytesTotal;
          nD = int(oSound.length || 0); // can sometimes be null with short MP3s? Wack.
          isBuffering = oSound.isBuffering;
          // writeDebug('loaded/total/duration: '+bL+', '+bT+', '+nD);
          if (oSoundChannel) {
            nP = (oSoundChannel.position || 0);
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
          // loading progress
          if (bL && bT && bL != oSound.lastValues.bytes) {
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
                sMethod = baseJSObject + "['" + sounds[i] + "']._ondataerror";
                ExternalInterface.call(sMethod, 'Spectrum data: ' + e.toString());
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
              }
            } else if (oSound.handledDataError != true && oSound.ignoreDataError != true) {
              try {
                oSound.getEQData();
              } catch(e: Error) {
                // writeDebug('computeSpectrum() (EQ data) '+e.toString());
                // oSound.useEQData = false;
                sMethod = baseJSObject + "['" + sounds[i] + "']._ondataerror";
                ExternalInterface.call(sMethod, 'EQ Data: ' + e.toString());
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

        // special case: Netstream may try to fire whileplaying() after finishing. check that stop hasn't fired.
        isPlaying = (!oSound.useNetstream || (oSound.useNetstream && oSound.lastNetStatus != "NetStream.Play.Stop")); // don't update if stream has ended
        if (typeof nP != 'undefined' && nP != oSound.lastValues.position && isPlaying) { // and IF VIDEO, is still playing?
          oSound.lastValues.position = nP;
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

      if (e.info.code == "NetStream.Play.Stop") { // && !oSound.didFinish && oSound.loaded == true && nD == nP
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
        this.onLoadError(oSound);
      } else if (e.info.code == "NetStream.Play.Start" || e.info.code == "NetStream.Buffer.Empty" || e.info.code == "NetStream.Buffer.Full") {
        var isNetstreamBuffering: Boolean = (e.info.code == "NetStream.Buffer.Empty" || e.info.code == "NetStream.Play.Start");
        // assume buffering when we start playing, eg. initial load.
        if (isNetstreamBuffering != oSound.lastValues.isBuffering) {
          oSound.lastValues.isBuffering = isNetstreamBuffering;
          ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onbufferchange", oSound.lastValues.isBuffering ? 1 : 0);
        }
      }

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
      oSound.nc.addEventListener(NetStatusEvent.NET_STATUS, oSound.doNetStatus);
    }

    public function removeNetstreamEvents(oSound: SoundManager2_SMSound_AS3) : void {
      oSound.ns.removeEventListener(AsyncErrorEvent.ASYNC_ERROR, function (e: AsyncErrorEvent) : void {
        doAsyncError(oSound, e)
      });
      oSound.ns.removeEventListener(NetStatusEvent.NET_STATUS, function (e: NetStatusEvent) : void {
        doNetStatus(oSound, e)
      });
      oSound.ns.removeEventListener(IOErrorEvent.IO_ERROR, function (e: IOErrorEvent) : void {
        doIOError(oSound, e)
      });
      oSound.nc.removeEventListener(NetStatusEvent.NET_STATUS, oSound.doNetStatus);
    }

    public function _setPosition(sID:String, nSecOffset:Number, isPaused: Boolean) : void {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      // writeDebug('_setPosition()');
      // stop current channel, start new one.
      if (s.lastValues) {
        s.lastValues.position = nSecOffset; // s.soundChannel.position;
      }
      if (s.useNetstream) {
        writeDebug('setPosition: ' + nSecOffset / 1000);
        s.ns.seek(nSecOffset > 0 ? nSecOffset / 1000 : 0);
        checkProgress(); // force UI update
      } else {
        if (s.soundChannel) {
          s.soundChannel.stop();
        }
        writeDebug('setPosition: ' + nSecOffset); // +', '+(s.lastValues.nLoops?s.lastValues.nLoops:1));
        try {
          s.start(nSecOffset, s.lastValues.nLoops || 1); // start playing at new position
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

    public function _load(sID:String, sURL:String, bStream: Boolean, bAutoPlay: Boolean) : void {
      writeDebug('_load()');
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
        ns.justBeforeFinishOffset = s.justBeforeFinishOffset;
        ns.usePeakData = s.usePeakData;
        ns.useWaveformData = s.useWaveformData;
        ns.useEQData = s.useEQData;
        ns.useNetstream = s.useNetstream;
        ns.useVideo = s.useVideo;
        ns.bufferTime = s.bufferTime;
        _destroySound(s.sID);
        _createSound(ns.sID, sURL, ns.justBeforeFinishOffset, ns.usePeakData, ns.useWaveformData, ns.useEQData, ns.useNetstream, ns.useVideo, ns.bufferTime);
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
          this.addNetstreamEvents(s);
          s.ns.play(sURL);
          if (!bAutoPlay) {
            s.ns.pause();
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
      if (bAutoPlay != true) {
        // s.soundChannel.stop(); // prevent default auto-play behaviour
        // writeDebug('auto-play stopped');
      } else {
        // writeDebug('auto-play allowed');
        // s.start(0,1);
        // registerOnComplete(sID);
      }

    }

    public function _unload(sID:String, sURL:String) : void {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
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
        if (s.didLoad && !s.useNetstream) {
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
      ns.justBeforeFinishOffset = s.justBeforeFinishOffset;
      ns.usePeakData = s.usePeakData;
      ns.useWaveformData = s.useWaveformData;
      ns.useEQData = s.useEQData;
      ns.useNetstream = s.useNetstream;
      ns.useVideo = s.useVideo;
      ns.bufferTime = s.bufferTime;
      _destroySound(s.sID);
      _createSound(ns.sID, sURL, ns.justBeforeFinishOffset, ns.usePeakData, ns.useWaveformData, ns.useEQData, ns.useNetstream, ns.useVideo, ns.bufferTime);
      writeDebug(s.sID + '.unload(): ok');
    }

    public function _createSound(sID:String, sURL:String, justBeforeFinishOffset: int, usePeakData: Boolean, useWaveformData: Boolean, useEQData: Boolean, useNetstream: Boolean, useVideo: Boolean, bufferTime:Number) : void {
      soundObjects[sID] = new SoundManager2_SMSound_AS3(this, sID, sURL, usePeakData, useWaveformData, useEQData, useNetstream, useVideo, bufferTime);
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
        nLoops: 1,
        leftPeak: 0,
        rightPeak: 0
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
          try {
            s.ns.close();
            s.nc.close();
          } catch(e: Error) {
            // oh well
            writeDebug('_destroySound(): error during netConnection/netStream close and null');
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
        // ExternalInterface.call('alert','Flash: need _stop for all sounds');
        // SoundManager2_AS3.display.stage.stop(); // _root.stop();
        // this.soundChannel.stop();
        // soundMixer.stop();
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
      writeDebug('start: ' + nMsecOffset);
      s.lastValues.paused = false; // reset pause if applicable
      s.lastValues.nLoops = (nLoops || 1);
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
          s.lastValues.position = s.ns.time;
          s.ns.pause();
        } else {
          if (s.soundChannel) {
            s.lastValues.position = s.soundChannel.position;
            s.soundChannel.stop();
          }
        }
      } else {
        // resume playing from last position
        // writeDebug('resuming - playing at '+s.lastValues.position+', '+s.lastValues.nLoops+' times');
        s.paused = false;
        if (s.useNetstream) {
          s.ns.resume();
        } else {
          s.start(s.lastValues.position, s.lastValues.nLoops);
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

    public function _getMemoryUse() :String {
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
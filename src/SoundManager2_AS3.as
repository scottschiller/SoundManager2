/**
 * SoundManager 2: Javascript Sound for the Web
 * ----------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code licensed under the BSD License:
 * http://www.schillmania.com/projects/soundmanager2/license.txt
 *
 * Flash 9 / ActionScript 3 version
 */

package {

  import flash.display.Sprite;
  import flash.events.Event;
  import flash.events.IOErrorEvent;
  import flash.events.MouseEvent;
  import flash.events.SecurityErrorEvent;
  import flash.events.AsyncErrorEvent;
  import flash.events.NetStatusEvent;
  import flash.events.TimerEvent;
  import flash.external.ExternalInterface; // woo
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

  public class SoundManager2_AS3 extends Sprite {

    public var version:String = "V2.97a.20150601";
    public var version_as:String = "(AS3/Flash 9)";

    /**
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
    public var timer: Timer = null;
    public var pollingEnabled: Boolean = false; // polling (timer) flag - disabled by default, enabled by JS->Flash call
    public var debugEnabled: Boolean = true; // Flash debug output enabled by default, disabled by JS call
    public var flashDebugEnabled: Boolean = false; // Flash internal debug output (write to visible SWF in browser)
    public var loaded: Boolean = false;
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
      timer.addEventListener(TimerEvent.TIMER, function() : void {
        timer.reset();
        _externalInterfaceTest(true);
        // timer.reset();
        // flashDebug('Init OK');
      });
      timer.start();
      // delayed, see above
      // _externalInterfaceTest(true);
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

    // methods
    // -----------------------------------

    public function writeDebug (s:String, logLevel:Number = 0) : Boolean {
      if (!debugEnabled) {
        return false;
      }
      // <d>
      ExternalInterface.call(baseJSController + "['_writeDebug']", "(Flash): " + s, null, logLevel);
      // </d>
      return true;
    }

    public function _externalInterfaceTest(isFirstCall: Boolean) : Boolean {
      var sandboxType:String = flash.system.Security['sandboxType'];
      if (!didSandboxMessage && sandboxType != 'localTrusted' && sandboxType != 'remote') {
        didSandboxMessage = true;
        flashDebug('<br><b>Fatal: Security sandbox error: Got "' + sandboxType + '", expected "remote" or "localTrusted".<br>Additional security permissions need to be granted.<br>See <a href="http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html">flash security settings panel</a> for non-HTTP, eg., file:// use.</b><br>http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html<br><br>You may also be able to right-click this movie and choose from the menu: <br>"Global Settings" -> "Advanced" tab -> "Trusted Location Settings"<br>');
      }
      try {
        if (isFirstCall == true) {
          flashDebug('Testing Flash -&gt; JS...');
          ExternalInterface.call(baseJSController + "._externalInterfaceOK", version);
          flashDebug('Flash -&gt; JS OK');
          flashDebug('Waiting for JS -&gt; Flash...');
        } else {
          // writeDebug('SM2 SWF ' + version + ' ' + version_as, 1);
          ExternalInterface.call(baseJSController + "._setSandboxType", sandboxType);
          flashDebug('JS -&gt; Flash OK');
        }
      } catch(e: Error) {
        flashDebug('Fatal: Flash &lt;-&gt; JS error: ' + e.toString());
        writeDebug('_externalInterfaceTest: Error: ' + e.toString(), 2);
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

    public function checkSoundProgress(oSound:SoundManager2_SMSound_AS3, forceCheck:Boolean = false, forceEndCheck:Boolean = false) : void {
      var bL: int = 0;
      var bT: int = 0;
      var nD: int = 0;
      var nP: int = 0;
      var bufferLength: int = 0;
      var lP:Number = 0;
      var rP:Number = 0;
      var isBuffering:Object = null;
      var oSoundChannel: flash.media.SoundChannel = null;
      var sMethod:String = null;
      var newPeakData: Boolean = false;
      var newWaveformData: Boolean = false;
      var newEQData: Boolean = false;
      var areSoundsInaccessible: Boolean = SoundMixer.areSoundsInaccessible();
      var isPlaying: Boolean = true; // special case for NetStream when ending
      var hasNew:Boolean = false;
      var hasNewLoaded:Boolean = false;

      if (!oSound || !oSound.useEvents || oSound.failed || !oSound.connected) {
        // edge cases for ignoring: if sounds are destructed within event handlers while checkProgress() is running, may be null
        return;
      }

      sMethod = baseJSObject + "['" + oSound.sID + "']._whileloading";

      if (oSound.useNetstream) {

        // Don't do anything if there is no NetStream object yet
        if (!oSound.ns) {
          return;
        }

        // stream
        bufferLength = oSound.ns.bufferLength;
        bL = oSound.ns.bytesLoaded;
        bT = oSound.ns.bytesTotal;
        nD = int(oSound.duration || 0); // can sometimes be null with short MP3s? Wack.
        nP = oSound.ns.time * 1000;

        if (oSound.paused) {
          // special case: paused netStreams don't update if setPosition() is called while they are paused.
          // instead, return lastValues.position which should reflect setPosition() call.
          // writeDebug('paused case, setting nP of '+nP+' to -1');
          // writeDebug('lastValues: '+oSound.lastValues.position);
          nP = oSound.lastValues.position;
        }

        if (nP >= 0 && nP != oSound.lastValues.position) {
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
        if (bufferLength != oSound.lastValues.bufferLength) {
          oSound.lastValues.bufferLength = bufferLength;
          hasNew = true;
        }

        // Don't set loaded for streams because bytesLoaded and bytesTotal are always 0
        // writeDebug('ns: time/duration, bytesloaded/total: '+nP+'/'+nD+', '+bL+'/'+bT);
        if (oSound.loaded != true && nD > 0 && bL == bT && bL != 0 && bT != 0) {
          // non-MP3 has loaded
          oSound.loaded = true;
          try {
            ExternalInterface.call(sMethod, bL, bT, nD, bufferLength);
            ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", oSound.duration > 0 ? 1 : 0);
          } catch(e: Error) {
            writeDebug('_whileLoading/_onload error: ' + e.toString(), 2);
          }
        } else if (oSound.loaded != true && hasNew) {
          ExternalInterface.call(sMethod, bL, bT, nD, bufferLength);
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

        if (forceEndCheck) {
          // sound finish case: Ensure position is at end (sound duration), as flash 9 does not always correctly match the two.
          if (nP < nD) {
            writeDebug('correcting sound ' + oSound.sID + ' end position ('+nP+') to length: '+ nD, 2);
            nP = nD;
          }
        }

        if (nP != oSound.lastValues.position && nP !== 0 && !oSound.didFinish) { // once "completed", sound is locked via didFinish so no more position-type events fire.
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
      var dataError:String;

      // special case: Netstream may try to fire whileplaying() after finishing. check that stop hasn't fired.
      isPlaying = (oSound.didLoad && !oSound.paused && (!oSound.useNetstream || (oSound.useNetstream && oSound.lastNetStatus != "NetStream.Play.Stop"))); // don't update if stream has ended

      // raw waveform + EQ spectrum data
      if (isPlaying && (oSoundChannel || oSound.useNetstream)) {

        if (oSound.useWaveformData) {
          if (!areSoundsInaccessible && !oSound.handledDataError && !oSound.ignoreDataError) {
            try {
              oSound.getWaveformData();
            } catch(e: Error) {
              if (!oSound.handledDataError) {
                writeDebug('getWaveformData() (waveform data) '+e.toString());
              }
              // oSound.useWaveformData = false;
              newDataError = true;
              dataError = e.toString();
            }
          }
        }

        if (oSound.useEQData) {
          if (!areSoundsInaccessible && !oSound.handledDataError && !oSound.ignoreDataError) {
            try {
              oSound.getEQData();
            } catch(e: Error) {
              if (!oSound.handledDataError) {
                writeDebug('computeSpectrum() (EQ data) '+e.toString());
              }
              // oSound.useEQData = false;
              newDataError = true;
              dataError = e.toString();
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

        if (newDataError && !oSound.handledDataError) {
          sMethod = baseJSObject + "['" + oSound.sID + "']._ondataerror";
          ExternalInterface.call(sMethod, 'data unavailable: ' + dataError);
          oSound.handledDataError = true;
        }

      }

      if (typeof nP != 'undefined' && (hasNew && (oSound.soundChannel || oSound.useNetstream || forceCheck || forceEndCheck))) { // && isPlaying - removed to allow updates while paused, eg. from setPosition() calls. Also be more liberal if we're using netStream.

        // oSound.lastValues.position = nP;
        sMethod = baseJSObject + "['" + oSound.sID + "']._whileplaying";
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
      }

      // check isBuffering
      if (!oSound.useNetstream && oSound.isBuffering != oSound.lastValues.isBuffering) {
        // property has changed
        oSound.lastValues.isBuffering = oSound.isBuffering;
        sMethod = baseJSObject + "['" + oSound.sID + "']._onbufferchange";
        ExternalInterface.call(sMethod, oSound.isBuffering ? 1 : 0);
      }

    }

    public function checkProgress() : void {
      for (var i: int = 0, j: int = sounds.length; i < j; i++) {
        checkSoundProgress(soundObjects[sounds[i]]);
      }
    }

    public function onLoadError(oSound:Object) : void {
      // something went wrong. 404, bad format etc.
      ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", 0);
    }

    public function onLoad(e: Event) : void {
      var oSound:Object = e.target;
      checkSoundProgress(soundObjects[oSound.sID]); // ensure progress stats are up-to-date
      if (!oSound.useNetstream) { // FLV must also have metadata
        oSound.loaded = true;
        // force duration update (doesn't seem to be always accurate)
        ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._whileloading", oSound.bytesLoaded, oSound.bytesTotal, oSound.length || oSound.duration);
        // duration > 0 means a valid sound was loaded.
        ExternalInterface.call(baseJSObject + "['" + oSound.sID + "']._onload", (oSound.length || oSound.duration ? 1 : 0));
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
        oSound.didFinish = false; // reset this flag
        oSound.soundChannel.addEventListener(Event.SOUND_COMPLETE, function() : void {
          if (oSound) {
            // force progress check, catching special end-of-sound case where position may not match duration.
            checkSoundProgress(oSound, true, true);
            try {
              oSound.ignoreDataError = true; // workaround: avoid data error handling for this manual step..
              // oSound.soundChannel.stop();
              oSound.didFinish = true; // "lock" sound, prevent extra whileplaying() position-type updates
              // call onfinish first (with end position)...
              ExternalInterface.call(baseJSObject + "['" + sID + "']._onfinish");
              // then reset sound so it can be played again.
              // oSound.start(0, 1); // go back to 0
            } catch(e: Error) {
              writeDebug('Could not set position on ' + sID + ': ' + e.toString());
            }
            oSound.ignoreDataError = false; // ..and reset
            oSound.handledDataError = false; // reset this flag
          } else {
            // safety net
            ExternalInterface.call(baseJSObject + "['" + sID + "']._onfinish");
          }
        });
      }
    }

    public function doSecurityError(oSound: SoundManager2_SMSound_AS3, e: SecurityErrorEvent) : void {
      writeDebug('securityError: ' + e.text);
      // when this happens, you don't have security rights on the server containing the FLV file
      // a crossdomain.xml file would fix the problem easily
    }

    public function _setPosition(sID:String, nSecOffset:Number, isPaused: Boolean, allowMultiShot: Boolean) : void {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      // writeDebug('_setPosition()');

      // stop current channel, start new one.
      if (s.lastValues) {
        s.lastValues.position = nSecOffset; // s.soundChannel.position;
      }
      if (s.useNetstream) {
        // Minimize the buffer so playback starts ASAP
        s.ns.bufferTime = s.bufferTime;
        writeDebug('setPosition ('+ sID + '): setting buffer to '+s.ns.bufferTime+' secs');

        nSecOffset = nSecOffset > 0 ? nSecOffset / 1000 : 0;
        s.ns.seek(nSecOffset);
        checkSoundProgress(s); // force UI update
      } else {
        if (s.soundChannel) {
          s.soundChannel.stop();
        }
        writeDebug('setPosition ('+ sID + '): ' + nSecOffset); // +', '+(s.lastValues.loops?s.lastValues.loops:1));
        if (s.lastValues.loops > 1 && nSecOffset != 0) {
          writeDebug('Warning: Looping functionality being disabled due to Flash limitation.');
          s.lastValues.loops = 1;
        }
        try {
          s.start(nSecOffset, s.lastValues.loops || 1, allowMultiShot); // start playing at new position
        } catch(e: Error) {
          writeDebug('Warning: Could not set position on ' + sID + ': ' + e.toString());
        }
        checkSoundProgress(s); // force UI update
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

    public function _load(sID:String, sURL:String, bStream: Boolean, bAutoPlay: Boolean, nLoops: Number, bAutoLoad: Boolean, bCheckPolicyFile: Boolean) : void {
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
        ns.usePeakData = s.usePeakData;
        ns.useWaveformData = s.useWaveformData;
        ns.useEQData = s.useEQData;
        ns.useNetstream = s.useNetstream;
        ns.bufferTime = s.bufferTime;
        ns.serverUrl = s.serverUrl;
        ns.duration = s.duration;
        ns.checkPolicyFile = s.checkPolicyFile;
        ns.useEvents = true;
        _destroySound(s.sID);
        _createSound(ns.sID, sURL, ns.usePeakData, ns.useWaveformData, ns.useEQData, ns.useNetstream, ns.bufferTime, ns.loops, ns.serverUrl, ns.duration, bAutoPlay, ns.useEvents, bAutoLoad, ns.checkPolicyFile);
        s = soundObjects[sID];
        // writeDebug('Sound object replaced');
      }
      checkSoundProgress(s);

      if (!s.didLoad) {
        try {
          s.addEventListener(Event.ID3, onID3);
          s.addEventListener(Event.COMPLETE, onLoad);
        } catch(e: Error) {
          writeDebug('_load(): could not assign ID3/complete event handlers');
        }
      }

      // don't try to load if same request already made
      s.sURL = sURL;

      try {
        if (!s.useNetstream) {
          s.addEventListener(IOErrorEvent.IO_ERROR, function(e: IOErrorEvent) : void {
            s.doIOError(e);
          });
        }
        s.loadSound(sURL);
      } catch(e: Error) {
        // oh well
        writeDebug('_load: Error loading ' + sURL + '. Flash error detail: ' + e.toString());
      }

    }

    public function _unload(sID:String) : void {
      var s: SoundManager2_SMSound_AS3 = (soundObjects[sID] || null);
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
          s.removeNetstreamEvents();
          s.ns.close();
          s.nc.close();
          // s.nc = null;
          // s.ns = null;
        } catch(e: Error) {
          // oh well
          writeDebug('_unload(): caught exception during netConnection/netStream close');
        }
      }
      var ns:Object = new Object();
      ns.sID = s.sID;
      ns.loops = s.loops;
      ns.usePeakData = s.usePeakData;
      ns.useWaveformData = s.useWaveformData;
      ns.useEQData = s.useEQData;
      ns.useNetstream = s.useNetstream;
      ns.bufferTime = s.bufferTime;
      ns.serverUrl = s.serverUrl;
      ns.duration = s.duration;
      ns.autoPlay = s.autoPlay;
      ns.autoLoad = s.autoLoad;
      ns.checkPolicyFile = s.checkPolicyFile;
      _destroySound(s.sID);
      _createSound(ns.sID, sURL, ns.usePeakData, ns.useWaveformData, ns.useEQData, ns.useNetstream, ns.bufferTime, ns.loops, ns.serverUrl, ns.duration, ns.autoPlay, false, ns.autoLoad, ns.checkPolicyFile); // false: don't allow events just yet
      soundObjects[sID].connected = true; // fake it?
      writeDebug(s.sID + '.unload(): ok');
    }

    public function _createSound(sID:String, sURL:String, usePeakData: Boolean, useWaveformData: Boolean, useEQData: Boolean, useNetstream: Boolean, bufferTime:Number, loops:Number, serverUrl:String, duration:Number, autoPlay:Boolean, useEvents:Boolean, autoLoad:Boolean, checkPolicyFile:Boolean) : void {
      var s: SoundManager2_SMSound_AS3 = new SoundManager2_SMSound_AS3(this, sID, sURL, usePeakData, useWaveformData, useEQData, useNetstream, bufferTime, serverUrl, duration, autoPlay, useEvents, autoLoad, checkPolicyFile);
      if (!soundObjects[sID]) {
        sounds.push(sID);
      }
      soundObjects[sID] = s;
      this.currentObject = s;
      s.sID = sID;
      s.sURL = sURL;
      s.paused = false;
      s.loaded = false;
      s.checkPolicyFile = checkPolicyFile;
      s.lastValues = {
        bytes: 0,
        duration: 0,
        position: 0,
        loops: loops||1,
        leftPeak: 0,
        rightPeak: 0,
        bufferLength: 0
      };
    }

    public function _destroySound(sID:String) : void {
      // for the power of garbage collection! .. er, Greyskull!
      var s: SoundManager2_SMSound_AS3 = (soundObjects[sID] || null);
      if (!s) return void;
      // try to unload the sound
      for (var i: int = 0, j: int = sounds.length; i < j; i++) {
        if (sounds[i] == sID) {
          sounds.splice(i, 1);
          break;
        }
      }
      if (s.soundChannel) {
        s.soundChannel.stop();
      }
      // if is a movie, remove that as well.
      if (s.useNetstream) {
        // s.nc.client = null;
        try {
          s.removeNetstreamEvents();
          // s.nc.removeEventListener(NetStatusEvent.NET_STATUS, s.doNetStatus);
        } catch(e: Error) {
          writeDebug('_destroySound(): Events already removed from netStream/netConnection?');
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
        } else if (s.soundChannel) {
          s.soundChannel.stop();
        }
        s.paused = false;
      }
    }

    public function _start(sID:String, nLoops: int, nMsecOffset: int, allowMultiShot: Boolean) : Boolean {
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      var result: Boolean;
      if (!s) return true;
      writeDebug('start (' + sID + '): ' + nMsecOffset + (nLoops > 1 ? ', loops: ' + nLoops : ''));
      s.lastValues.paused = false; // reset pause if applicable
      s.lastValues.loops = (nLoops || 1);
      if (!s.useNetstream) {
        s.lastValues.position = nMsecOffset;
      }
      s.handledDataError = false; // reset this flag
      try {
        result = s.start(nMsecOffset, nLoops, allowMultiShot);
      } catch(e: Error) {
        writeDebug('Could not start ' + sID + ': ' + e.toString());
      }
      try {
        registerOnComplete(sID);
      } catch(e: Error) {
        writeDebug('_start(): registerOnComplete failed');
      }
      return result;
    }

    public function _pause(sID:String, allowMultiShot: Boolean) : void {
      // writeDebug('_pause(): ' + sID);
      var s: SoundManager2_SMSound_AS3 = soundObjects[sID];
      if (!s) return void;
      // writeDebug('s.paused: '+s.paused);
      if (!s.paused) {
        // reference current position, stop sound
        s.paused = true;
        // writeDebug('_pause(): position: '+s.lastValues.position);
        if (s.useNetstream) {
          if (s.ns) {
            s.lastValues.position = s.ns.time*1000;
            s.ns.pause();
          } else if (s.autoPlay) {
            s.setAutoPlay(false);
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
          s.start(s.lastValues.position, s.lastValues.loops, allowMultiShot);
        }
        try {
          registerOnComplete(sID);
        } catch(e: Error) {
          writeDebug('_pause(): registerOnComplete() failed');
        }
      }
    }

    public function _setPan(sID:String, nPan:Number) : void {
      if (soundObjects[sID]) {
        soundObjects[sID].setPan(nPan);
      }
    }

    public function _setVolume(sID:String, nVol:Number) : void {
      // writeDebug('_setVolume: '+nVol);
      if (soundObjects[sID]) {
        soundObjects[sID].setVolume(nVol);
      }
    }

    public function _setPolling(bPolling: Boolean = false, nTimerInterval: uint = 50) : void {
      pollingEnabled = bPolling;
      if (timer == null && pollingEnabled) {
        flashDebug('Enabling polling, ' + nTimerInterval + ' ms interval');
        timer = new Timer(nTimerInterval, 0);
        timer.addEventListener(TimerEvent.TIMER, function() : void {
          checkProgress();
        }); // direct reference eg. checkProgress doesn't work? .. odd.
        timer.start();
      } else if (timer && !pollingEnabled) {
        flashDebug('Disabling polling');
        // flash.utils.clearInterval(timer);
        timer.reset();
      }
    }

    public function _getMemoryUse() : String {
      return System.totalMemory.toString();
    }

    // -----------------------------------
    // end methods

  }

  // package

}
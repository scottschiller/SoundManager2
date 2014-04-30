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

  import flash.external.*;
  import flash.events.*;
  import flash.media.Sound;
  import flash.media.SoundChannel;
  import flash.media.SoundLoaderContext;
  import flash.media.SoundTransform;
  import flash.media.SoundMixer;
  import flash.net.URLRequest;
  import flash.utils.ByteArray;
  import flash.utils.getTimer;
  import flash.net.NetConnection;
  import flash.net.NetStream;
  import flash.net.Responder;

  public class SoundManager2_SMSound_AS3 extends Sound {

    public var sm: SoundManager2_AS3 = null;
    // externalInterface references (for Javascript callbacks)
    public var baseJSController: String = "soundManager";
    public var baseJSObject: String = baseJSController + ".sounds";
    public var soundChannel: SoundChannel = new SoundChannel();
    public var urlRequest: URLRequest;
    public var soundLoaderContext: SoundLoaderContext;
    public var waveformData: ByteArray = new ByteArray();
    public var waveformDataArray: Array = [];
    public var eqData: ByteArray = new ByteArray();
    public var eqDataArray: Array = [];
    public var usePeakData: Boolean = false;
    public var useWaveformData: Boolean = false;
    public var useEQData: Boolean = false;
    public var sID: String;
    public var sURL: String;
    public var didFinish: Boolean;
    public var loaded: Boolean;
    public var connected: Boolean;
    public var failed: Boolean;
    public var paused: Boolean;
    public var finished: Boolean;
    public var duration: Number;
    public var handledDataError: Boolean = false;
    public var ignoreDataError: Boolean = false;
    public var autoPlay: Boolean = false;
    public var autoLoad: Boolean = false;
    public var pauseOnBufferFull: Boolean = false; // only applies to RTMP
    public var loops: Number = 1;
    public var lastValues: Object = {
      bytes: 0,
      position: 0,
      duration: 0,
      volume: 100,
      pan: 0,
      loops: 1,
      leftPeak: 0,
      rightPeak: 0,
      waveformDataArray: null,
      eqDataArray: null,
      isBuffering: null,
      bufferLength: 0
    };
    public var didLoad: Boolean = false;
    public var useEvents: Boolean = false;
    public var sound: Sound = new Sound();

    public var cc: Object;
    public var nc: NetConnection;
    public var ns: NetStream = null;
    public var st: SoundTransform;
    public var useNetstream: Boolean;
    public var bufferTime: Number = 3; // previously 0.1
    public var lastNetStatus: String = null;
    public var serverUrl: String = null;

    public var checkPolicyFile:Boolean = false;

    public function SoundManager2_SMSound_AS3(oSoundManager: SoundManager2_AS3, sIDArg: String = null, sURLArg: String = null, usePeakData: Boolean = false, useWaveformData: Boolean = false, useEQData: Boolean = false, useNetstreamArg: Boolean = false, netStreamBufferTime: Number = 1, serverUrl: String = null, duration: Number = 0, autoPlay: Boolean = false, useEvents: Boolean = false, autoLoad: Boolean = false, checkPolicyFile: Boolean = false) {
      this.sm = oSoundManager;
      this.sID = sIDArg;
      this.sURL = sURLArg;
      this.usePeakData = usePeakData;
      this.useWaveformData = useWaveformData;
      this.useEQData = useEQData;
      this.urlRequest = new URLRequest(sURLArg);
      this.didFinish = false;
      this.loaded = false;
      this.connected = false;
      this.failed = false;
      this.finished = false;
      this.soundChannel = null;
      this.lastNetStatus = null;
      this.useNetstream = useNetstreamArg;
      this.serverUrl = serverUrl;
      this.duration = duration;
      this.useEvents = useEvents;
      this.autoLoad = autoLoad;
      if (netStreamBufferTime) {
        this.bufferTime = netStreamBufferTime;
      }
      this.checkPolicyFile = checkPolicyFile;

      writeDebug('SoundManager2_SMSound_AS3: Got duration: '+duration+', autoPlay: '+autoPlay);

      if (this.useNetstream) {
        // Pause on buffer full if auto-loading an RTMP stream
        if (this.serverUrl && this.autoLoad) {
          this.pauseOnBufferFull = true;
        }

        this.cc = new Object();
        this.nc = new NetConnection();

        // Handle FMS bandwidth check callback.
        // @see onBWDone
        // @see http://www.adobe.com/devnet/flashmediaserver/articles/dynamic_stream_switching_04.html
        // @see http://www.johncblandii.com/index.php/2007/12/fms-a-quick-fix-for-missing-onbwdone-onfcsubscribe-etc.html
        this.nc.client = this;

        // TODO: security/IO error handling
        // this.nc.addEventListener(SecurityErrorEvent.SECURITY_ERROR, doSecurityError);
        nc.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);

        if (this.serverUrl != null) {
          writeDebug('SoundManager2_SMSound_AS3: NetConnection: connecting to server ' + this.serverUrl + '...');
        }
        this.nc.connect(serverUrl);
      } else {
        this.connected = true;
      }

    }

    public function rtmpResponder(result:Object):void {
      // callback from Flash Media Server (RTMP) for 'getStreamLength' server-side method - result should be a floating-point.
      // http://help.adobe.com/en_US/FlashMediaServer/3.5_Deving/WS5b3ccc516d4fbf351e63e3d11a0773d117-7ffe.html
      writeDebug('RTMP server getStreamLength() response: ' + result);
      // we now know the duration. type cast to floating-point - this will update JS-land during whileloading() / whileplaying().
      this.duration = Number(result) * 1000;
    }

    public function netStatusHandler(event:NetStatusEvent):void {

      if (this.useEvents) {
        writeDebug('netStatusHandler: '+event.info.code);
      }

      switch (event.info.code) {

        case "NetConnection.Connect.Success":
          try {
            this.ns = new NetStream(this.nc);
            this.ns.checkPolicyFile = this.checkPolicyFile;
            // bufferTime reference: http://livedocs.adobe.com/flash/9.0/ActionScriptLangRefV3/flash/net/NetStream.html#bufferTime
            this.ns.bufferTime = this.bufferTime; // set to 0.1 or higher. 0 is reported to cause playback issues with static files.
            this.st = new SoundTransform();
            this.cc.onMetaData = this.onMetaData;
            this.cc.setCaption = this.captionHandler;
            this.ns.client = this.cc;
            this.ns.receiveAudio(true);
            this.addNetstreamEvents();
            this.connected = true;
            // RTMP-only
            if (this.serverUrl && this.useEvents) {
              var responder:Responder = new Responder(rtmpResponder);
              // call a method on server to get the length of the stream (like onMetaData, but Flash Media Server-specific)
              // Red5 and other RTMP servers appear to provide duration via onMetaData event(s) in the stream.
              // http://help.adobe.com/en_US/FlashMediaServer/3.5_Deving/WS5b3ccc516d4fbf351e63e3d11a0773d117-7ffe.html
              nc.call('getStreamLength', responder, this.sURL);
              writeDebug('NetConnection: connected');
              writeDebug('firing _onconnect for '+this.sID);
              ExternalInterface.call(this.sm.baseJSObject + "['" + this.sID + "']._onconnect", 1);
            }
          } catch(e: Error) {
            this.failed = true;
            writeDebug('netStream error: ' + e.toString());
            ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfailure", 'Connection failed!', event.info.level, event.info.code);
          }
          break;

        case "NetStream.Play.StreamNotFound":
          this.failed = true;
          writeDebug("NetConnection: Stream not found!");
          ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfailure", 'Stream not found!', event.info.level, event.info.code);
          break;

        // This is triggered when the sound loses the connection with the server.
        // In some cases one could just try to reconnect to the server and resume playback.
        // However for streams protected by expiring tokens, I don't think that will work.
        //
        // Flash says that this is not an error code, but a status code...
        // should this call the onFailure handler?
        case "NetConnection.Connect.Closed":
          this.failed = true;
          ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfailure", 'Connection closed!', event.info.level, event.info.code);
          writeDebug("NetConnection: Connection closed!");
          break;

        // Couldn't establish a connection with the server. Attempts to connect to the server
        // can also fail if the permissible number of socket connections on either the client
        // or the server computer is at its limit.  This also happens when the internet
        // connection is lost.
        case "NetConnection.Connect.Failed":
          this.failed = true;
          writeDebug("NetConnection: Connection failed! Lost internet connection? Try again... Description: " + event.info.description);
          ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfailure", 'Connection failed!', event.info.level, event.info.code);
          break;

        // A change has occurred to the network status. This could mean that the network
        // connection is back, or it could mean that it has been lost...just try to resume
        // playback.

        // KJV: Can't use this yet because by the time you get your connection back the
        // song has reached it's maximum retries, so it doesn't retry again.  We need
        // a new _ondisconnect handler.
        //case "NetConnection.Connect.NetworkChange":
        //  this.failed = true;
        //  writeDebug("NetConnection: Network connection status changed");
        //  ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfailure", 'Reconnecting...');
        //  break;

        // Consider everything else a warning...
        default:
          // this.failed = true;
          writeDebug("NetConnection: got unhandled code '" + event.info.code + "'. Description: " + event.info.description);
          ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onwarning", event.info.description, event.info.level, event.info.code);
          break;
      }

    }

    public function writeDebug (s: String, logLevel: Number = 0) : Boolean {
      return this.sm.writeDebug (s,logLevel); // defined in main SM object
    }

    public function onMetaData(infoObject: Object) : void {
      var prop:String;
      if (sm.debugEnabled) {
        var data:String = new String();
        for (prop in infoObject) {
          data += prop+': '+infoObject[prop]+' \n';
        }
        writeDebug('Metadata: '+data);
      }
      this.duration = infoObject.duration * 1000;
      if (!this.loaded) {
        // writeDebug('not loaded yet: '+this.ns.bytesLoaded+', '+this.ns.bytesTotal+', '+infoObject.duration*1000);
        // TODO: investigate loaded/total values
        // ExternalInterface.call(baseJSObject + "['" + this.sID + "']._whileloading", this.ns.bytesLoaded, this.ns.bytesTotal, infoObject.duration*1000);
        ExternalInterface.call(baseJSObject + "['" + this.sID + "']._whileloading", this.bytesLoaded, this.bytesTotal, (this.duration || infoObject.duration))
      }
      var metaData:Array = [];
      var metaDataProps:Array = [];
      for (prop in infoObject) {
        metaData.push(prop);
        metaDataProps.push(infoObject[prop]);
      }
      // pass infoObject to _onmetadata, too
      ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onmetadata", metaData, metaDataProps);
writeDebug('waiting for next call...');
      // this handler may fire multiple times, eg., when a song changes while playing an RTMP stream.
      if (!this.serverUrl) {
        // disconnect for non-RTMP cases, since multiple firings may mess up duration.
        // this.cc.onMetaData = function(infoObject: Object) : void {}
      }
    }

    public function captionHandler(infoObject: Object) : void {

      if (sm.debugEnabled) {
        var data:String = new String();
        for (var prop:* in infoObject) {
          data += prop+': '+infoObject[prop]+' \n';
        }
        writeDebug('Caption: '+data);
      }

      // null this out for the duration of this object's existence.
      // it may be called multiple times.
      // this.cc.setCaption = function(infoObject: Object) : void {}
    
      // writeDebug('Caption\n'+infoObject['dynamicMetadata']);
      // writeDebug('firing _oncaptiondata for '+this.sID);

      ExternalInterface.call(this.sm.baseJSObject + "['" + this.sID + "']._oncaptiondata", infoObject['dynamicMetadata']);

    }

    public function getWaveformData() : void {
      // http://livedocs.adobe.com/flash/9.0/ActionScriptLangRefV3/flash/media/SoundMixer.html#computeSpectrum()
      SoundMixer.computeSpectrum(this.waveformData, false, 0); // sample wave data at 44.1 KHz
      this.waveformDataArray = [];
      for (var i: int = 0, j: int = this.waveformData.length / 4; i < j; i++) { // get all 512 values (256 per channel)
        this.waveformDataArray.push(int(this.waveformData.readFloat() * 1000) / 1000);
      }
    }

    public function getEQData() : void {
      // http://livedocs.adobe.com/flash/9.0/ActionScriptLangRefV3/flash/media/SoundMixer.html#computeSpectrum()
      SoundMixer.computeSpectrum(this.eqData, true, 0); // sample EQ data at 44.1 KHz
      this.eqDataArray = [];
      for (var i: int = 0, j: int = this.eqData.length / 4; i < j; i++) { // get all 512 values (256 per channel)
        this.eqDataArray.push(int(this.eqData.readFloat() * 1000) / 1000);
      }
    }

    public function start(nMsecOffset: int, nLoops: int, allowMultiShot:Boolean) : Boolean {

      this.useEvents = true;

      if (this.useNetstream) {

        writeDebug("SMSound::start nMsecOffset "+ nMsecOffset+ ' nLoops '+nLoops + ' current bufferTime '+this.ns.bufferTime+' current bufferLength '+this.ns.bufferLength+ ' this.lastValues.position '+this.lastValues.position);

        // mark for later Netstream.Play.Stop / sound completion
        this.finished = false;

        this.cc.onMetaData = this.onMetaData;

        // Don't seek if we don't have to because it destroys the buffer
        var set_position:Boolean = this.lastValues.position != null && this.lastValues.position != nMsecOffset;

        if (set_position) {
          // Minimize the buffer so playback starts ASAP
          this.ns.bufferTime = this.bufferTime;
        }

        if (this.paused) {
          writeDebug('start: resuming from paused state');
          this.ns.resume(); // get the sound going again
          if (!this.didLoad) {
            this.didLoad = true;
          }
          this.paused = false;
        } else if (!this.didLoad) {
          writeDebug('start: !didLoad - playing '+this.sURL);
          this.ns.play(this.sURL);
          this.pauseOnBufferFull = false; // SAS: playing behaviour overrides buffering behaviour
          this.didLoad = true;
          this.paused = false;
        } else {
          // previously loaded, perhaps stopped/finished. play again?
          writeDebug('playing again (not paused, didLoad = true)');
          this.pauseOnBufferFull = false;
          this.ns.play(this.sURL);
        }

        // KJV seek after calling play otherwise some streams get a NetStream.Seek.Failed
        // Should only apply to the !didLoad case, but do it for all for simplicity.
        // nMsecOffset is in milliseconds for streams but in seconds for progressive
        // download.
        if (set_position) {
          this.ns.seek(this.serverUrl ? nMsecOffset / 1000 : nMsecOffset);
          this.lastValues.position = nMsecOffset; // https://gist.github.com/1de8a3113cf33d0cff67
        }

        // this.ns.addEventListener(Event.SOUND_COMPLETE, _onfinish);
        this.applyTransform();

      } else {
        // writeDebug('start: seeking to '+nMsecOffset+', '+nLoops+(nLoops==1?' loop':' loops'));
        if (!this.soundChannel || allowMultiShot) {
          this.soundChannel = this.play(nMsecOffset, nLoops);
          this.addEventListener(Event.SOUND_COMPLETE, _onfinish);
          this.applyTransform();
        } else {
          // writeDebug('start: was already playing, no-multishot case. Seeking to '+nMsecOffset+', '+nLoops+(nLoops==1?' loop':' loops'));
          // already playing and no multi-shot allowed, so re-start and set position
          if (this.soundChannel) {
            this.soundChannel.stop();
          }
          this.soundChannel = this.play(nMsecOffset, nLoops); // start playing at new position
          this.addEventListener(Event.SOUND_COMPLETE, _onfinish);
          this.applyTransform();
        }
      }

      // if soundChannel is null (and not a netStream), there is no sound card (or 32-channel ceiling has been hit.)
      // http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/flash/media/Sound.html#play%28%29
      return (!this.useNetstream && this.soundChannel === null ? false : true);

    }

    private function _onfinish() : void {
      this.removeEventListener(Event.SOUND_COMPLETE, _onfinish);
    }

    public function loadSound(sURL: String) : void {
      if (this.useNetstream) {
        this.useEvents = true;
        if (this.didLoad != true) {
          this.ns.play(this.sURL); // load streams by playing them
          if (!this.autoPlay) {
            this.pauseOnBufferFull = true;
          }
          this.paused = false;
        }
        // this.addEventListener(Event.SOUND_COMPLETE, _onfinish);
        this.applyTransform();
      } else {
        try {
          this.didLoad = true;
          this.urlRequest = new URLRequest(sURL);
          this.soundLoaderContext = new SoundLoaderContext(1000, this.checkPolicyFile); // check for policy (crossdomain.xml) file on remote domains - http://livedocs.adobe.com/flash/9.0/ActionScriptLangRefV3/flash/media/SoundLoaderContext.html
          this.load(this.urlRequest, this.soundLoaderContext);
        } catch(e: Error) {
          writeDebug('error during loadSound(): ' + e.toString());
        }
      }
    }

    // Set the value of autoPlay
    public function setAutoPlay(autoPlay: Boolean) : void {
      if (!this.serverUrl) {
        this.autoPlay = autoPlay;
      } else {
        this.autoPlay = autoPlay;
        if (this.autoPlay) {
          this.pauseOnBufferFull = false;
        } else if (!this.autoPlay) {
          this.pauseOnBufferFull = true;
        }
      }
    }

    public function setVolume(nVolume: Number) : void {
      this.lastValues.volume = nVolume / 100;
      this.applyTransform();
    }

    public function setPan(nPan: Number) : void {
      this.lastValues.pan = nPan / 100;
      this.applyTransform();
    }

    public function applyTransform() : void {
      var st: SoundTransform = new SoundTransform(this.lastValues.volume, this.lastValues.pan);
      if (this.useNetstream) {
        if (this.ns) {
          this.ns.soundTransform = st;
        } else {
          // writeDebug('applyTransform(): Note: No active netStream');
        }
      } else if (this.soundChannel) {
        this.soundChannel.soundTransform = st; // new SoundTransform(this.lastValues.volume, this.lastValues.pan);
      }
    }

    // Handle FMS bandwidth check callback.
    // @see http://www.adobe.com/devnet/flashmediaserver/articles/dynamic_stream_switching_04.html
    // @see http://www.johncblandii.com/index.php/2007/12/fms-a-quick-fix-for-missing-onbwdone-onfcsubscribe-etc.html
    public function onBWDone() : void {
      // writeDebug('onBWDone: called and ignored');
    }

    // NetStream client callback. Invoked when the song is complete.
    public function onPlayStatus(info:Object):void {
      writeDebug('onPlayStatus called with '+info);
      switch(info.code) {
        case "NetStream.Play.Complete":
          writeDebug('Song has finished!');
          break;
      }
    }

    public function doIOError(e: IOErrorEvent) : void {
      ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onload", 0); // call onload, assume it failed.
      // there was a connection drop, a loss of internet connection, or something else wrong. 404 error too.
    }

    public function doAsyncError(e: AsyncErrorEvent) : void {
      writeDebug('asyncError: ' + e.text);
    }

    public function doNetStatus(e: NetStatusEvent) : void {

      // Handle failures
      if (e.info.code == "NetStream.Failed"
          || e.info.code == "NetStream.Play.FileStructureInvalid"
          || e.info.code == "NetStream.Play.StreamNotFound") {

        this.lastNetStatus = e.info.code;
        writeDebug('netStatusEvent: ' + e.info.code);
        this.failed = true;
        ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfailure", '', e.info.level, e.info.code);
        return;
      }

      writeDebug('netStatusEvent: ' + e.info.code);  // KJV we like to see all events

      // When streaming, Stop is called when buffering stops, not when the stream is actually finished.
      // @see http://www.actionscript.org/forums/archive/index.php3/t-159194.html
      if (e.info.code == "NetStream.Play.Stop") {

        if (!this.finished && (!this.useNetstream || !this.serverUrl)) {

          // finished playing, and not RTMP
          writeDebug('calling onfinish for a sound');
          // reset the sound? Move back to position 0?
          this.sm.checkProgress();
          this.finished = true; // will be reset via JS callback
          ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfinish");

        }

      } else if (e.info.code == "NetStream.Play.Start" || e.info.code == "NetStream.Buffer.Empty" || e.info.code == "NetStream.Buffer.Full") {

        // RTMP case..
        // We wait for the buffer to fill up before pausing the just-loaded song because only if the
        // buffer is full will the song continue to buffer until the user hits play.
        if (this.serverUrl && e.info.code == "NetStream.Buffer.Full" && this.pauseOnBufferFull) {
          this.ns.pause();
          this.paused = true;
          this.pauseOnBufferFull = false;
          // Call pause in JS.  This will call back to us to pause again, but
          // that should be harmless.
          writeDebug('Pausing on buffer full');
          ExternalInterface.call(baseJSObject + "['" + this.sID + "'].pause", false);
        }

        var isNetstreamBuffering: Boolean = (e.info.code == "NetStream.Buffer.Empty" || e.info.code == "NetStream.Play.Start");
        // assume buffering when we start playing, eg. initial load.
        if (isNetstreamBuffering != this.lastValues.isBuffering) {
          this.lastValues.isBuffering = isNetstreamBuffering;
          ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onbufferchange", this.lastValues.isBuffering ? 1 : 0);
        }

        // We can detect the end of the stream when Play.Stop is called followed by Buffer.Empty.
        // However, if you pause and let the whole song buffer, Buffer.Flush is called followed by
        // Buffer.Empty, so handle that case too.
        //
        // Ignore this event if we are more than 3 seconds from the end of the song.
        if (e.info.code == "NetStream.Buffer.Empty" && (this.lastNetStatus == 'NetStream.Play.Stop' || this.lastNetStatus == 'NetStream.Buffer.Flush')) {
          if (this.duration && (this.ns.time * 1000) < (this.duration - 3000)) {
            writeDebug('Ignoring Buffer.Empty because this is too early to be the end of the stream! (sID: '+this.sID+', time: '+(this.ns.time*1000)+', duration: '+this.duration+')');
          } else if (!this.finished) {
            this.finished = true;
            writeDebug('calling onfinish for sound '+this.sID);
            this.sm.checkProgress();
            ExternalInterface.call(baseJSObject + "['" + this.sID + "']._onfinish");
          }

        } else if (e.info.code == "NetStream.Buffer.Empty") {
          // The buffer is empty.  Start from the smallest buffer again.
          this.ns.bufferTime = this.bufferTime;
        }
      }

      // Remember the last NetStatus event
      this.lastNetStatus = e.info.code;
    }

    // KJV The sound adds some of its own netstatus handlers so we don't need to do it here.
    public function addNetstreamEvents() : void {
      ns.addEventListener(AsyncErrorEvent.ASYNC_ERROR, doAsyncError);
      ns.addEventListener(NetStatusEvent.NET_STATUS, doNetStatus);
      ns.addEventListener(IOErrorEvent.IO_ERROR, doIOError);
    }

    public function removeNetstreamEvents() : void {
      ns.removeEventListener(AsyncErrorEvent.ASYNC_ERROR, doAsyncError);
      ns.removeEventListener(NetStatusEvent.NET_STATUS, doNetStatus);
      ns.addEventListener(NetStatusEvent.NET_STATUS, dummyNetStatusHandler);
      ns.removeEventListener(IOErrorEvent.IO_ERROR, doIOError);
      // KJV Stop listening for NetConnection events on the sound
      nc.removeEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);
    }

    // Prevents possible 'Unhandled NetStatusEvent' condition if a sound is being
    // destroyed and interacted with at the same time.
    public function dummyNetStatusHandler(e: NetStatusEvent) : void {
      // Don't do anything
    }
  }
}
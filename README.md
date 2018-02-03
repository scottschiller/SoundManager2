# SoundManager 2: JavaScript Sound for the Web 🔊

By wrapping and extending HTML5 and Flash Audio APIs, SoundManager 2 brings reliable cross-platform audio to JavaScript.

## HTML5 `Audio()` Support

* 100% Flash-free MP3 + MP4/AAC (and OGG, FLAC, etc.) where supported
* Compatible with Apple iPad (iOS 3.2), iPhone/iOS 4 and newer
* Fallback to Flash for MP3/MP4 support, if needed
* SM2 API is transparent; HTML5/flash switching handled internally
* HTML5 API support approximates Flash 8 API features

## Basic API Features

* Load, stop, play, pause, mute, seek, pan (Flash-only) and volume control of sounds from JavaScript
* Events: `onload`, `whileloading`, `whileplaying`, `onfinish` and more

## Flash-based Features (Legacy Support)

* (Flash 8+): ID3V1 and ID3V2 tag support for MP3s (title, artist, genre etc.)
* RTMP / Flash Media Server streaming support
* MPEG-4 (AAC, HE-AAC, H.264) audio support
* "MultiShot" play (layered / chorusing effects)
* Waveform/frequency spectrum data
* Peak (L/R channel volume) data
* Audio buffering state / event handling

## General Tech Stuff

* Full API Documentation with examples and notes
* `console.log()`-style debug output and troubleshooting tools
* GitHub Issues for discussion/support

## As Heard On The Internets

Some places that do or have used SM2 include SoundCloud, Tidal, Beats, Songza, freesound.org, last.fm, 8tracks, Discogs, and The Hype Machine among others - but most importantly, http://nyan.cat. ;)

## Project Home, Documentation, Live Demos etc.

http://www.schillmania.com/projects/soundmanager2/

## Compiling JS builds (-nodebug, -jsmin) and Flash components, AS2/AS3 to SWF

_(Note: This process is pretty outdated and relies on ancient binaries for the Flash bits. Here be dragons.)_

An Ant build file defines the tasks for compiling JS and SWF components, useful if you make changes to the SM2 source and want to recompile.
Google's Closure Compiler is used for the JS. AS2 compilation is done by MTASC, and AS3 is handled by Adobe's Open Source Flex SDK (mxmlc) compiler.
Refer to `build.xml` for compiler downloads and path definitions.

## Versioning / Development Notes

Releases are versioned by date, e.g., `V2.97a.20170601` and are tagged as such.
The latest official release is always on trunk/master.
Post-release development builds may be available on the appropriate +DEV branch, eg., `V2.97a.20170601+DEV`

## Forks and Pull Requests

Firstly, thank you for wanting to contribute! Bug fixes and tweaks are welcomed, particularly if they follow the general coding style of the project.
If making a pull request, use the project's current +DEV development branch as the merge target instead of "master", if possible; please and thank-you.

## Random Trivia: SoundManager / SoundManager 2 History

The original "SoundManager" implementation was created in 2001 and used JavaScript and Flash 6 (or thereabouts), and was hacked together to get JS-driven sound on a personal portfolio site. It was later used for the "DHTML Arkanoid" project in 2002.

The original inspiration came from the sonify.org "Flashsound" project; they had tutorials and examples on getting Flash to play sounds when an HTML element was hovered on. This was very up my alley at the time. It all started with a cheezy kung-fu demo.

http://sonify.org/flashsound/kungfu/

Flash's `ExternalInterface` API was not introduced until Flash 8, but a limited JS <-> Flash API existed via LiveConnect et al which still let the basics work. The original SoundManager used Flash's `TCallLabel()` methods, exposed to JS, to perform specific actions within "Movie Clips" (essentially, objects).

Movie Clips contained Frames (in the animation sense) which could be given IDs (labels), and could also accept name/value parameters via `SetVariable()`. Thus, it was possible to create a Movie Clip for each sound, which would have a labeled frame for each sound action desired (stop, seek, pause, volume, and pan), e.g., `flashMovie.SetVariable('/MySound:volume, 50);`

http://web.archive.org/web/20020404030916/http://sonify.org:80/flashsound/timeline/actionscript.html

When a sound was created, playing it and setting parameters became a matter of having JS tell Flash to go to a specific frame within a Movie Clip to perform the desired "action" e.g., `flashMovie.TCallLabel('/soundID', 'play');` and then an additional call to set a variable if needed to apply effects like volume, pan and so on.

Internet Explorer on the Mac did not support the JS/Flash API via LiveConnect etc., but Netscape on MacOS was OK.

The original SoundManager project still lives at http://schillmania.com/projects/soundmanager/ and was deprecated in 2007.

SoundManager 2 became a reality when Flash 8 was released, as it introduced `ExternalInterface` which was a more complete JS <-> Flash API that allowed Flash methods to be exposed to JS, and could also accept full parameters. ExternalInterface is quite an interesting little hack, as the Flash movie injects some JS into the browser to make it work. Under the hood, it uses XML as a transport layer for calls. (Recall that in the 2000s, XML was hugely popular - the JSON of its day.)

More here on how SM2 / Flash / EI interaction worked.

http://www.schillmania.com/content/entries/2010/how-soundmanager2-works/

SoundManager 2 was released in 2006 and had a much more feature-rich and better-structured API, particularly at the time, thanks to learnings and feedback from the original SoundManager project. SM2 grew to be relatively popular among sites that used sound, whether as effects or a core part of the site experience. (Most sites used either SM2, or the jQuery-library-friendly jPlayer project.) 

## Why version 2.97?

SoundManager 2 has been at "version" 2.97 for a long time, because 2.97 was arguably the best llama-ass-whipping version of WinAmp. (WinAmp 3 was not as good, and WinAmp 5 was "the best of 2 and 3 combined.") This MP3 player was my favourite Windows app during the 90's, and is missed as there's nothing quite like it on OS X where I spend most of my time these days.

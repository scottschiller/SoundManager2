#!/bin/bash
/Applications/flexsdk/bin/mxmlc -optimize=true -target-player=10.0.0 -use-network=false -o ../swf/soundmanager2_flash10.swf -file-specs "SoundManager2_AS3.as"
sed -e '/^$/d' -e '/DO_NOT_DELETE/b' -e '/flashDebugEnabled/b' -e '/writeDebug/d' -e '/flashDebug/d' SoundManager2_AS3.as > /tmp/SoundManager2_AS3.as
sed -e '/^$/d' -e '/DO_NOT_DELETE/b' -e '/flashDebugEnabled/b' -e '/writeDebug/d' -e '/flashDebug/d' SoundManager2_SMSound_AS3.as > /tmp/SoundManager2_SMSound_AS3.as
/Applications/flexsdk/bin/mxmlc -optimize=true -target-player=10.0.0 -use-network=false -o ../swf/soundmanager2_flash10_nodebug.swf -file-specs "/tmp/SoundManager2_AS3.as"

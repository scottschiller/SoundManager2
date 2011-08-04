@REM this builds the soundmanager 2 SWF from source
@REM using mxmlc from the Adobe open-source Flex SDK

c:\progra~1\flexsdk\bin\mxmlc -debug=true -use-network=false -static-link-runtime-shared-libraries=true -optimize=true -o ../swf/soundmanager2_flash9_debug.swf -file-specs SoundManager2_AS3.as

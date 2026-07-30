@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cl.exe /LD /EHsc /DUNICODE /D_UNICODE /I. /FeSampleHardwareEventCredentialProvider.dll *.cpp Advapi32.lib Ole32.lib User32.lib Shlwapi.lib Credui.lib Secur32.lib /link /DEF:SampleHardwareEventCredentialProvider.def

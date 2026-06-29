@echo off
echo ================================================
echo   Tu IP para acceder desde el celular:
echo ================================================
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    echo   http://%%a:8080
)
echo.
echo Conecta tu celular a la misma red WiFi
echo y abre esa URL en el navegador del celular.
echo.
pause

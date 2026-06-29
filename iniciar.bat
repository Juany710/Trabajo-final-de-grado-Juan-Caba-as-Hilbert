@echo off
title FIXIT - Servidor
echo ================================================
echo   FIXIT - Plataforma de Reparaciones Tecnicas
echo ================================================
echo.
echo Iniciando servidor...
echo Cuando veas "Started FixitApplication" abri en tu celular:
echo   http://192.168.1.11:8080
echo.
echo Para detener el servidor presiona Ctrl+C
echo.

SET JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot
SET MVN=C:\maven\apache-maven-3.9.9\bin\mvn.cmd

cd /d C:\Users\Usuario\OneDrive\Escritorio\juany_tesis
%MVN% spring-boot:run

pause
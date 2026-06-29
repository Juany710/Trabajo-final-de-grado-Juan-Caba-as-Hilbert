@echo off
SET JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
SET MVN=C:\maven\apache-maven-3.9.16\bin\mvn.cmd
SET MAVEN_PROJECTBASEDIR=%~dp0

%MVN% %*

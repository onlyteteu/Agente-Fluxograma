@echo off
cd /d "%~dp0"
title FlowTalk Dev Server
echo Iniciando FlowTalk em modo de desenvolvimento...
echo.
call npm.cmd run dev

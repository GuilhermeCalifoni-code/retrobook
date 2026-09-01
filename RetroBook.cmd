@echo off
chcp 65001 > nul
title RetroBook
cd /d "%~dp0"

where node > nul 2>&1
if errorlevel 1 goto sem_node

node scripts\launch.mjs %*
if errorlevel 1 goto erro
exit /b 0

:sem_node
echo.
echo   Node.js nao encontrado.
echo   Instale a versao 20 ou superior em https://nodejs.org e rode este arquivo de novo.
echo.
pause
exit /b 1

:erro
echo.
echo   Algo deu errado. A mensagem acima explica o que foi.
pause
exit /b 1

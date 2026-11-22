@echo off
setlocal
cd /d "%~dp0src\frontend"
if errorlevel 1 (echo Erreur : impossible d'ouvrir le dossier de l'application.& pause & exit /b 1)
where node >nul 2>nul
if errorlevel 1 (echo Node.js est introuvable. Installez Node.js LTS depuis nodejs.org puis relancez.& pause & exit /b 1)
where npm >nul 2>nul
if errorlevel 1 (echo npm est introuvable. Reinstallez Node.js LTS puis relancez.& pause & exit /b 1)
if not exist node_modules (
  echo Installation initiale des composants. Une connexion Internet est requise.
  call npm install --legacy-peer-deps
  if errorlevel 1 (echo Erreur : l'installation a echoue. Verifiez votre connexion Internet puis relancez.& pause & exit /b 1)
)
echo Compilation de l'application...
call npm run build
if errorlevel 1 (echo Erreur : la compilation a echoue.& pause & exit /b 1)
echo Ouverture de Gestion Resto dans votre navigateur...
start "Gestion Resto" http://127.0.0.1:4173
echo Demarrage du serveur local sur le port 4173. Fermez cette fenetre pour arreter l'application.
call npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
if errorlevel 1 (echo Erreur : le serveur local n'a pas pu demarrer.& pause & exit /b 1)

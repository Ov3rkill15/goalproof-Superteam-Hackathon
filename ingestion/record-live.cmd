@echo off
rem Launcher untuk Task Scheduler: rekam kedua stream TxLINE (scores + odds).
rem Dipakai malam 11->12 Jul untuk match Norway vs England (fixture 18213979, kickoff 04:00 WIB).
cd /d "%~dp0"
start "wc-scores-recorder" cmd /k go run . --mode live --stream scores --record recordings\wc-scores-20260712.jsonl
start "wc-odds-recorder" cmd /k go run . --mode live --stream odds --record recordings\wc-odds-20260712.jsonl

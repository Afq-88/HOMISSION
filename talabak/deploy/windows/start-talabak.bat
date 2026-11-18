@echo off
rem تشغيل «طلبك معنا» على حاسوب Windows في الشركة، مع إعادة تشغيل تلقائية عند أي توقف.
rem المتطلب: Node.js 22 أو أحدث (https://nodejs.org). ضع هذا الملف في أي مكان، فهو يجد المشروع تلقائيًا.
chcp 65001 >nul
cd /d "%~dp0..\.."
set PORT=3000
set DATA_DIR=%CD%\data
set TRUST_PROXY=1
rem عند الوصول عبر رابط HTTPS فقط (Tailscale Funnel) فعّل السطر التالي:
rem set COOKIE_SECURE=1
echo ================================================
echo  طلبك معنا — يعمل على http://localhost:%PORT%
echo  لا تُغلق هذه النافذة. القاعدة في: %DATA_DIR%
echo ================================================
:loop
node --no-warnings server\index.js
echo.
echo توقّف التطبيق. إعادة التشغيل بعد 5 ثوانٍ... (أغلق النافذة للإيقاف)
timeout /t 5 /nobreak >nul
goto loop

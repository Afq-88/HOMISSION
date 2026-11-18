'use strict';
// يولّد رمز QR (SVG) لرابط الاستقبال العام بعد نشره واختباره.
//   npm run qr -- https://your-domain.example --source=qr_booth --out=qr-booth.svg
// لا يُنشأ رمز لرابط الإدارة، ولا تُضاف أي بيانات عميل إلى الرمز.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const base = args.find(a => /^https?:\/\//.test(a));
const opt = n => (args.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1];
if (!base) { console.error('الاستخدام: npm run qr -- https://النطاق [--source=qr_booth|kiosk|promo|web] [--out=ملف.svg]'); process.exit(1); }
const source = opt('source') || 'qr_booth';
if (!['qr_booth', 'kiosk', 'promo', 'web'].includes(source)) { console.error('مصدر غير معروف'); process.exit(1); }
const root = base.replace(/\/+$/, '');
const url = source === 'kiosk' ? root + '/kiosk' : root + '/?s=' + source;
if (/staff|admin/i.test(url)) { console.error('لا يُسمح بإنشاء QR لرابط الإدارة'); process.exit(1); }
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/vendor/qrcode.min.js'), 'utf8') + ';this.qrcode=qrcode;', ctx);
const qr = ctx.qrcode(0, 'M'); qr.addData(url); qr.make();
const out = opt('out') || `qr-${source}.svg`;
fs.writeFileSync(out, qr.createSvgTag({ cellSize: 8, margin: 16, scalable: true }));
console.log(`تم إنشاء ${out}\nالرابط المشفّر: ${url}\nاختبر الرمز بكاميرا هاتف قبل الطباعة.`);

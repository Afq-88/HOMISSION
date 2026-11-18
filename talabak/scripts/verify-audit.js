'use strict';
// يتحقق من سلامة سلسلة سجل العمليات (كشف أي تعديل أو حذف لاحق).
const { verifyAudit, db } = require('../server/db');
const r = verifyAudit();
console.log(r.ok ? `✔ السجل سليم — ${r.checked} سطرًا متسلسلًا (${r.legacy} سطرًا قديمًا بلا تجزئة)` : `✘ تلاعب مكتشف عند السطر ${r.brokenAt}: ${r.reason}`);
db.close(); process.exit(r.ok ? 0 : 2);

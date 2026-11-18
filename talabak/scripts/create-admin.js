'use strict';
// إنشاء مدير نظام (أو إعادة تعيين كلمة مروره) بصورة آمنة، دون كلمات مرور ثابتة في الشيفرة.
// الاستخدام:
//   npm run create-admin -- --username=admin --name="اسم المدير"          (يولّد كلمة مرور قوية ويعرضها مرة واحدة)
//   npm run create-admin -- --username=admin --name="..." --prompt        (يطلب كلمة المرور من لوحة المفاتيح)
const readline = require('readline');
const { db, audit } = require('../server/db');
const U = require('../server/util');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : []; }).filter(x => x.length));
const username = String(args.username || 'admin').toLowerCase();
const display = String(args.name || 'مدير النظام');

function askHidden(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(q)) process.stdout.write(s); };
    rl.question(q, a => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}
(async () => {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) { console.error('اسم المستخدم غير صالح'); process.exit(1); }
  let pw, generated = false;
  if (args.prompt) {
    pw = await askHidden('كلمة المرور (١٠ أحرف على الأقل، حروف وأرقام): ');
    const p = U.passwordProblem(pw); if (p) { console.error(p); process.exit(1); }
    if (pw !== await askHidden('أعد كتابتها: ')) { console.error('غير متطابقتين'); process.exit(1); }
  } else { pw = U.strongPassword(); generated = true; }
  const ex = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (ex) {
    db.prepare("UPDATE users SET pass_hash=?, role='admin', active=1, must_change=? WHERE id=?").run(U.hashPassword(pw), generated ? 1 : 0, ex.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(ex.id);
    audit('سطر الأوامر', 'admin_reset', { username });
    console.log(`تم تحديث كلمة مرور المدير «${username}».`);
  } else {
    db.prepare("INSERT INTO users(username,display_name,role,pass_hash,must_change,created_at) VALUES(?,?, 'admin',?,?,?)").run(username, display, U.hashPassword(pw), generated ? 1 : 0, new Date().toISOString());
    audit('سطر الأوامر', 'admin_create', { username });
    console.log(`تم إنشاء المدير «${username}».`);
  }
  if (generated) console.log(`\nكلمة المرور المؤقتة (تُعرض مرة واحدة، وسيُطلب تغييرها عند أول دخول):\n\n   ${pw}\n`);
  db.close();
})();

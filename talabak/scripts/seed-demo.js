'use strict';
// بيانات وهمية للمراجعة والتدريب فقط. كل الطلبات تُوسَم «تجريبي» فلا تدخل التقارير ويمكن حذفها بعد أرشفتها.
//   npm run seed-demo -- --count=30
const { db } = require('../server/db');
const R = require('../server/requests');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const count = +args.count || 30;
const names = ['أحمد العنزي', 'فاطمة الرشيدي', 'محمد المطيري', 'نورة العجمي', 'يوسف الكندري', 'سارة الصباح', 'خالد الهاجري', 'مريم العتيبي', 'عبدالله الشمري', 'هند الدوسري'];
const samples = {
  subscriptions: () => ({ kind: 'new', duration: '3m', from_area: 'حولي', to_area: 'العاصمة' }),
  charter: () => ({ purpose: 'staff', service_type: 'recurring', passengers: '30', from_place: 'السالمية', destination: 'الشويخ', op_days: ['sun', 'mon'] }),
  ads: () => ({ brand: 'علامة تجريبية', ask: 'quote', activity: 'مطاعم' }),
  towing: () => ({ vehicle_type: 'سيارة صالون', state: 'immobile', location: 'قرب المحطة' }),
  workshop: () => ({ vehicle: 'تويوتا', issue: 'فحص دوري', drivable: 'yes' }),
  other: () => ({ title: 'استفسار عام', description: 'بيانات تجريبية' }),
};
const svcIds = Object.keys(samples), src = ['qr_booth', 'kiosk', 'promo', 'web'];
for (let i = 0; i < count; i++) {
  const service = svcIds[i % svcIds.length];
  R.createRequest({ service, name: names[i % names.length] + ' (تجريبي)', phone_cc: '965', phone: '5550' + String(1000 + i), pref_channel: ['call', 'whatsapp'][i % 2], party_type: 'individual', fields: samples[service]() },
    { source: src[i % src.length], idemKey: 'seed' + Date.now() + '-' + String(i).padStart(6, '0') + 'xxxxxxxx', isTest: true });
}
console.log(`أُضيف ${count} طلبًا تجريبيًا (موسومة «تجريبي»).`);
db.close();

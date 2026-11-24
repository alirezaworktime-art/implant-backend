/* implant-plan API + site — Cloudflare Worker (D1 binding: DB) */
const PW_HASH=__PW_HASH__;
const IMPORT_KEY=__IMPORT_KEY__;
const SENDER=__SENDER__;
const DEFAULT_PRICES = {
  imp:   { bp: { ir: '13500000', ko: '14500000', it: '21000000', sw: '22500000' } }, // پایه ایمپلنت، تعرفه جراحی هر پایه (سوئیسی = نئوپروز)
  crw:   { price: '10500000' },  // فقط روکش، هر واحد (پروتز)
  pon:   { price: '5000000' },   // پونتیک، هر واحد (پروتز)
  gbr:   { price: '2500000' },   // GBR، هر واحد
  vip_cgf: { price: '' },       // جراحی VIP: CGF، هر واحد
  vip_mem: { price: '' },       // جراحی VIP: ممبران و تگ، هر واحد
  sin_o: { price: '5000000' },   // سینوس باز، هر طرف
  sin_c: { price: '2500000' },   // سینوس بسته، هر طرف
  alv:   { price: '4000000' },   // آلوئولوپلاستی، هر ½ فک
  ram:   { price: '8000000' },   // بلاک راموس، هر واحد (جدول: ۸ تا ۱۱ میلیون)
  fgg:   { price: '15000000' },  // FGG، هر ⅓ فک
  tmp:   { price: '1800000' },   // روکش موقت، هر دندان (PMMA و Essix)
  surg_c: { price: '' },        // جراحی نیش نهفته، هر دندان
  surg_w: { price: '' },        // جراحی عقل نهفته، هر دندان
  ext: { price: '' }, aox: { price: '' }, cbct: { price: '' }, anes: { price: '' },
  ovd:   { bp: { ir: '', ko: '', it: '', sw: '' } }
};
const DEFAULT_SETTINGS = {
  recipient: '',
  clinic: 'کلینیک دندانپزشکی شهید رهنمون',
  doctor: 'دکتر سید مجتبی علویکیا · جراح فک و صورت',
  phone: '۰۹۱۲۰۰۰۰۰۰۱ (منتظری)'
};

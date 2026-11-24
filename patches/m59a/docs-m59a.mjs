// adds the m59a line to CLAUDE.md and HANDOFF through work/docs-line.mjs (idempotent). node docs-m59a.mjs
import { execFileSync } from 'node:child_process'; import path from 'node:path';
const D = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const add = (key, text) => console.log(execFileSync(process.execPath, [path.join(D, '..', 'docs-line.mjs'), key, text], { encoding: 'utf8' }));
add('m59a زنده شد', '**2026-11-20 — m58b + m59a زنده شد** (ایران و Cloudflare؛ روی m58a). هیچ فیلدی در سفارش لابراتوار پزشک اجباری نیست (سرور: `order.m58` در labNew مثل m47a). فرم سفارش پزشک = «طرح ۱ — یک نگاه»: خلاصه‌ی بیمار از پرونده + ساخت برای / نوع روکش (۴ گزینه) / رنگ + چارت پایه-پونتیک، همه خودکار از سابقه؛ برگه‌ی کامل زیر «جزئیات بیشتر». `work\\m58b\\SPEC.md`، `work\\m59a\\SPEC.md`، طرح‌ها `work\\m58b\\designs.html`؛ t-m58b (۹)، t-m59a (۱۶) ALL OK. برگشت: `deploy-m58a.sh` + `node cf.mjs put cf-m58a.mjs`.');

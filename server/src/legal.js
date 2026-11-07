// Privacy policy and terms of use, in Russian and English, served as plain pages at /privacy and /terms.
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'lolopepe.app@gmail.com';
const UPDATED = { ru: '7 ноября 2026 г.', en: 'November 7, 2026' };

const OPERATOR = {
  ru: 'Замошникова Ольга Николаевна, плательщик налога на профессиональный доход (самозанятая), ИНН 381115508539',
  en: 'Olga Nikolaevna Zamoshnikova, self-employed (professional income tax payer, Russia), taxpayer ID (INN) 381115508539',
};

const DOCS = {
  privacy: {
    ru: {
      title: 'Политика конфиденциальности',
      body: `
<p>Эта политика объясняет, какие данные собирает приложение и бот «Lolo &amp; Pepe: бюджет на двоих» (далее — «Сервис»), зачем и как вы можете ими управлять. Политика составлена с учётом Федерального закона № 152-ФЗ «О персональных данных» и Общего регламента ЕС по защите данных (GDPR).</p>

<h2>1. Кто обрабатывает данные</h2>
<p>Оператор (контролёр) данных — ${OPERATOR.ru}. Связаться: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>2. Какие данные мы получаем</h2>
<ul>
<li><b>Из Telegram</b> при открытии приложения: ваш идентификатор Telegram, имя, фамилия и имя пользователя (если указаны). Номер телефона мы не получаем.</li>
<li><b>То, что вы вносите сами</b>: траты, доходы, категории, лимиты, личные траты, регулярные платежи, цели копилки, комментарии, реакции, фото чеков, название и валюта бюджета.</li>
<li><b>Уведомления и выписки банка</b>, если вы их присылаете: из текста SMS или пуша мы берём сумму, дату и название магазина и создаём запись. Сам текст не храним — только его контрольную сумму, чтобы не записать одну операцию дважды. Из файла выписки сохраняется список операций; сам файл не хранится.</li>
<li><b>Технические данные</b>: часовой пояс (чтобы напоминания приходили вовремя), настройки уведомлений. Сервер хостинга может кратко хранить журналы запросов с IP-адресом для работы и защиты сервиса. Файлы cookie и рекламные трекеры мы не используем; тема оформления хранится только на вашем устройстве.</li>
</ul>

<h2>3. Зачем</h2>
<ul>
<li>чтобы Сервис работал: вести общий бюджет, считать остатки, показывать записи участникам бюджета;</li>
<li>чтобы присылать уведомления в Telegram, которые вы включили;</li>
<li>чтобы отвечать на обращения и защищать Сервис от злоупотреблений.</li>
</ul>
<p>Мы не продаём данные, не показываем рекламу и не передаём данные для маркетинга.</p>

<h2>4. Основания</h2>
<p>Ваше согласие, которое вы даёте, начиная пользоваться Сервисом, и исполнение пользовательского соглашения (ст. 6 152-ФЗ; ст. 6(1)(a) и 6(1)(b) GDPR). Технические журналы — законный интерес в безопасной работе Сервиса (ст. 6(1)(f) GDPR). Согласие можно отозвать в любой момент, удалив аккаунт.</p>

<h2>5. Кто видит ваши данные</h2>
<ul>
<li><b>Участники вашего бюджета</b> видят записи этого бюджета: общие и личные траты, доходы, копилку, комментарии, а также ваше имя. Приглашайте только тех, кому доверяете.</li>
<li><b>Провайдеры, которые помогают Сервису работать</b>: Render Services, Inc. (хостинг, США), ChiselStrike, Inc. / Turso (база данных, США), Telegram (доставка сообщений бота). Они обрабатывают данные только для работы Сервиса.</li>
<li>Государственные органы — только если этого требует закон.</li>
</ul>

<h2>6. Где хранятся данные</h2>
<p>Серверы и база данных Сервиса находятся за пределами России и ЕС, в том числе в США. Начиная пользоваться Сервисом, вы соглашаетесь на такую трансграничную передачу. Для пользователей из ЕС передача основана на вашем согласии и необходимости для исполнения соглашения (ст. 49(1)(a), (b) GDPR). В США и ряде других стран уровень защиты данных может отличаться от вашей страны.</p>

<h2>7. Сколько храним</h2>
<p>Пока у вас есть аккаунт. После удаления аккаунта данные удаляются сразу, из резервных копий — в течение 30 дней. Если вы были участником общего бюджета, общие траты и вклады в копилку остаются у второго участника, но без вашего имени: вместо него будет «Удалённый аккаунт».</p>

<h2>8. Ваши права</h2>
<ul>
<li>узнать, какие данные о вас хранятся, и получить их копию — в настройках есть «Выгрузить в Excel», остальное пришлём по запросу;</li>
<li>исправить данные — любую запись можно изменить в приложении;</li>
<li>удалить данные — «Настройки → Удалить аккаунт и данные» или письмом на почту выше;</li>
<li>отозвать согласие и возразить против обработки;</li>
<li>пожаловаться в Роскомнадзор или в надзорный орган по защите данных вашей страны ЕС.</li>
</ul>
<p>На запросы отвечаем в течение 10 рабочих дней (для ЕС — не позднее одного месяца).</p>

<h2>9. Защита</h2>
<p>Данные передаются только по зашифрованному соединению (HTTPS). Каждый запрос приложения проверяется по подписи Telegram, поэтому чужой бюджет открыть нельзя. Личная ссылка для автоматической записи SMS работает как пароль — не передавайте её; в настройках её можно сменить.</p>

<h2>10. Возраст</h2>
<p>Сервис предназначен для людей старше 18 лет.</p>

<h2>11. Изменения</h2>
<p>Если политика изменится, мы обновим эту страницу и сообщим о важных изменениях в боте.</p>
`,
    },
    en: {
      title: 'Privacy Policy',
      body: `
<p>This policy explains what data the “Lolo &amp; Pepe” app and bot (the “Service”) collect, why, and how you can control it. It is written to comply with the Russian Federal Law No. 152-FZ “On Personal Data” and the EU General Data Protection Regulation (GDPR).</p>

<h2>1. Who is responsible</h2>
<p>The data operator (controller) is ${OPERATOR.en}. Contact: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>2. What we collect</h2>
<ul>
<li><b>From Telegram</b> when you open the app: your Telegram ID, first and last name and username (if set). We do not receive your phone number.</li>
<li><b>What you enter</b>: expenses, incomes, categories, limits, personal expenses, recurring payments, savings goals, comments, reactions, receipt photos, budget name and currency.</li>
<li><b>Bank notifications and statements</b>, if you send them: from an SMS or push text we take the amount, date and merchant and create a record. We do not keep the text itself — only a checksum so the same operation is not recorded twice. From a statement file we keep the list of operations; the file itself is not stored.</li>
<li><b>Technical data</b>: your time zone (so reminders arrive on time) and notification settings. The hosting provider may briefly keep request logs with IP addresses to run and protect the Service. We use no cookies or advertising trackers; the theme setting stays on your device.</li>
</ul>

<h2>3. Why</h2>
<ul>
<li>to provide the Service: keep a shared budget, calculate balances, show records to budget members;</li>
<li>to send the Telegram notifications you have turned on;</li>
<li>to answer your requests and protect the Service from abuse.</li>
</ul>
<p>We do not sell data, show ads or share data for marketing.</p>

<h2>4. Legal basis</h2>
<p>Your consent, given when you start using the Service, and performance of the Terms of Use (Art. 6 of 152-FZ; Art. 6(1)(a) and 6(1)(b) GDPR). Technical logs rely on our legitimate interest in running the Service securely (Art. 6(1)(f) GDPR). You can withdraw consent at any time by deleting your account.</p>

<h2>5. Who can see your data</h2>
<ul>
<li><b>Members of your budget</b> see that budget’s records: shared and personal expenses, incomes, savings, comments, and your name. Only invite people you trust.</li>
<li><b>Providers that run the Service</b>: Render Services, Inc. (hosting, USA), ChiselStrike, Inc. / Turso (database, USA), Telegram (bot message delivery). They process data only to operate the Service.</li>
<li>Public authorities — only where required by law.</li>
</ul>

<h2>6. Where data is stored</h2>
<p>The Service’s servers and database are located outside Russia and the EU, including in the USA. By using the Service you consent to this international transfer. For EU users the transfer relies on your consent and on necessity for performing the Terms (Art. 49(1)(a), (b) GDPR). Data protection in the USA and other countries may differ from your country.</p>

<h2>7. How long we keep it</h2>
<p>For as long as you have an account. When you delete your account, your data is deleted immediately and from backups within 30 days. If you shared a budget, the shared expenses and savings stay with the other member but without your name — it is replaced with “Deleted account”.</p>

<h2>8. Your rights</h2>
<ul>
<li>access your data and get a copy — use “Export to Excel” in settings, or ask us for the rest;</li>
<li>correct your data — any record can be edited in the app;</li>
<li>erase your data — “Settings → Delete account and data”, or email us;</li>
<li>withdraw consent and object to processing; data portability;</li>
<li>complain to Roskomnadzor or to the data protection authority of your EU country.</li>
</ul>
<p>We answer within 10 working days (for EU users, within one month at the latest).</p>

<h2>9. Security</h2>
<p>Data travels only over encrypted connections (HTTPS). Every request from the app is checked against Telegram’s signature, so nobody can open someone else’s budget. Your personal link for automatic SMS recording works like a password — do not share it; you can reset it in settings.</p>

<h2>10. Age</h2>
<p>The Service is intended for people aged 18 and over.</p>

<h2>11. Changes</h2>
<p>If this policy changes, we will update this page and announce important changes in the bot.</p>
`,
    },
  },
  terms: {
    ru: {
      title: 'Пользовательское соглашение',
      body: `
<p>Соглашение между вами и ${OPERATOR.ru} (далее — «мы») об использовании приложения и бота «Lolo &amp; Pepe: бюджет на двоих» (далее — «Сервис»). Начиная пользоваться Сервисом, вы принимаете это соглашение и <a href="privacy">политику конфиденциальности</a>.</p>

<h2>1. Что это за Сервис</h2>
<p>Сервис помогает вести общий бюджет с другим человеком: записывать траты и доходы, планировать лимиты, копить на общие цели. Сервис работает внутри Telegram.</p>

<h2>2. Кто может пользоваться</h2>
<p>Люди старше 18 лет, у которых есть аккаунт Telegram.</p>

<h2>3. Стоимость</h2>
<p>Сейчас Сервис бесплатный. В будущем могут появиться платные функции. Мы заранее сообщим о них в боте; всё, что уже было бесплатным, не станет платным без предупреждения.</p>

<h2>4. Ваши данные и записи</h2>
<ul>
<li>Записи, которые вы вносите, принадлежат вам. Вы можете выгрузить их в Excel и удалить аккаунт в любой момент.</li>
<li>Участники общего бюджета видят записи друг друга и могут их редактировать; история правок сохраняется.</li>
<li>Приглашая человека в бюджет, вы сами решаете, чем с ним делиться.</li>
</ul>

<h2>5. Это не финансовый совет</h2>
<p>Прогнозы, лимиты, автоматические категории и разбор банковских уведомлений — подсказки, а не финансовая, налоговая или инвестиционная консультация. Автоматический разбор может ошибаться — проверяйте записи.</p>

<h2>6. Чего делать нельзя</h2>
<p>Взламывать Сервис или пытаться получить доступ к чужим данным, перегружать его автоматическими запросами, использовать его для незаконных целей.</p>

<h2>7. Доступность и ответственность</h2>
<p>Мы стараемся, чтобы Сервис работал стабильно, но предоставляем его «как есть» и не гарантируем бесперебойную работу. В пределах, допустимых законом, мы не отвечаем за косвенные убытки от использования Сервиса. Это не ограничивает ваши права потребителя, которые нельзя ограничить по закону вашей страны.</p>

<h2>8. Прекращение</h2>
<p>Вы можете перестать пользоваться Сервисом и удалить аккаунт в любой момент. Мы можем ограничить доступ при нарушении этого соглашения.</p>

<h2>9. Изменения</h2>
<p>Если соглашение изменится, мы обновим эту страницу и сообщим о важных изменениях в боте. Продолжая пользоваться Сервисом после изменений, вы их принимаете.</p>

<h2>10. Право и споры</h2>
<p>Соглашение регулируется законодательством Российской Федерации. Если вы живёте в ЕС, за вами сохраняется защита обязательных норм права вашей страны. Споры сначала стараемся решить перепиской: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`,
    },
    en: {
      title: 'Terms of Use',
      body: `
<p>These terms are an agreement between you and ${OPERATOR.en} (“we”) on the use of the “Lolo &amp; Pepe” app and bot (the “Service”). By using the Service you accept these terms and the <a href="privacy?lang=en">Privacy Policy</a>.</p>

<h2>1. The Service</h2>
<p>The Service helps you keep a shared budget with another person: record expenses and incomes, plan limits and save for shared goals. It runs inside Telegram.</p>

<h2>2. Who can use it</h2>
<p>People aged 18 and over with a Telegram account.</p>

<h2>3. Price</h2>
<p>The Service is currently free. Paid features may appear in the future. We will announce them in the bot in advance; nothing that is already free will become paid without notice.</p>

<h2>4. Your data and records</h2>
<ul>
<li>The records you enter are yours. You can export them to Excel and delete your account at any time.</li>
<li>Members of a shared budget see and can edit each other’s records; the edit history is kept.</li>
<li>When you invite someone to a budget, you decide what to share with them.</li>
</ul>

<h2>5. Not financial advice</h2>
<p>Forecasts, limits, automatic categories and bank notification parsing are hints, not financial, tax or investment advice. Automatic parsing can make mistakes — please check your records.</p>

<h2>6. What is not allowed</h2>
<p>Hacking the Service or trying to access other people’s data, overloading it with automated requests, or using it for unlawful purposes.</p>

<h2>7. Availability and liability</h2>
<p>We work to keep the Service running, but it is provided “as is” without a guarantee of uninterrupted operation. To the extent permitted by law, we are not liable for indirect losses from using the Service. This does not limit consumer rights that cannot be limited under the law of your country.</p>

<h2>8. Termination</h2>
<p>You can stop using the Service and delete your account at any time. We may restrict access if these terms are violated.</p>

<h2>9. Changes</h2>
<p>If these terms change, we will update this page and announce important changes in the bot. By continuing to use the Service after the changes you accept them.</p>

<h2>10. Law and disputes</h2>
<p>These terms are governed by the laws of the Russian Federation. If you live in the EU, you keep the protection of the mandatory laws of your country. We first try to resolve disputes by email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
`,
    },
  },
};

export function legalPage(kind, lang) {
  const l = lang === 'en' ? 'en' : 'ru';
  const doc = DOCS[kind][l];
  const other = l === 'en' ? `<a href="${kind}">Русский</a>` : `<a href="${kind}?lang=en">English</a>`;
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${doc.title} — Lolo &amp; Pepe</title>
<style>
:root{--bg:#f2f1ee;--card:#fff;--ink:#111;--muted:#8a8a8a;--link:#2b7fd0;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0e0e0e;--card:#1b1b1b;--ink:#f1f1f1;--muted:#8a8a8a;--link:#7dbaf5;color-scheme:dark}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:680px;margin:0 auto;padding:28px max(18px,env(safe-area-inset-left)) 60px}
.top{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:var(--muted)}
h1{font-weight:500;font-size:26px;line-height:1.25;margin:18px 0 4px}
h2{font-weight:600;font-size:17px;margin:28px 0 6px}
p,li{font-weight:400}ul{padding-left:20px}li{margin:4px 0}
a{color:var(--link)}.date{color:var(--muted);font-size:14px;margin-bottom:18px}
</style></head><body><main>
<div class="top"><span>🐧 Lolo &amp; Pepe</span>${other}</div>
<h1>${doc.title}</h1><div class="date">${l === 'en' ? 'Effective' : 'Действует с'} ${UPDATED[l]}</div>
${doc.body}
</main></body></html>`;
}

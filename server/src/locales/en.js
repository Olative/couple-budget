// English for the bot and notifications, keyed by the Russian text. {name}-style variables stay as they are.
export default {
  'попробуйте ещё раз': 'please try again',
  'проверьте, что это выписка из банка': 'check that this is a bank statement',
  // Buttons
  'Открыть Lolo & Pepe': 'Open Lolo & Pepe',
  'Открыть приложение': 'Open the app',
  'Открыть бюджет': 'Open the budget',
  'Присоединиться': 'Join',
  'Смотреть итоги': 'See the recap',
  '⚙️ Как настроить автоучёт': '⚙️ How to set up auto-recording',
  '✍️ Ответить': '✍️ Reply',
  '✅ Готово — снова записывать траты': '✅ Done — back to recording expenses',
  'Отменить': 'Undo',
  'Отмена': 'Cancel',
  'Другая категория': 'Another category',
  'Записать {n}': 'Record {n}',

  // /start
  '{name} приглашает вас в общий бюджет Lolo & Pepe 🐧': '{name} invites you to a shared budget in Lolo & Pepe 🐧',
  'Вас пригласили в общий бюджет Lolo & Pepe 🐧': 'You\'ve been invited to a shared budget in Lolo & Pepe 🐧',
  'Нажмите кнопку ниже — и вы сразу окажетесь в нём. Траты, лимиты и копилка станут общими.':
    'Tap the button below and you\'ll be in it right away. Expenses, limits and savings become shared.',
  'Привет, {name}! 🐧': 'Hi, {name}! 🐧',
  'Рады, что вы здесь. Приступим:\n\n1. Создайте общий бюджет\n2. Позовите второго пингвина по ссылке\n3. Добавьте первую трату\n\nОстальное посчитают пингвины.':
    'Glad you\'re here. Let\'s get started:\n\n1. Create a shared budget\n2. Invite the second penguin with a link\n3. Add your first expense\n\nThe penguins will count the rest.',

  // /help
  ['Всё самое важное — в приложении: нажмите кнопку «Открыть» внизу или кнопку под этим сообщением.\n\n' +
  'А траты можно записывать прямо здесь — просто напишите:\n«кофе 250», «такси 300 вчера», «+5000 подработка»\n\n' +
  'Или перешлите SMS/уведомление банка — запишу сама. А выписку из банка (PDF, Excel или CSV) просто пришлите файлом.\n\n' +
  '/start — открыть приложение\n/auto — как настроить автоматический учёт трат и доходов\n/export — выгрузить все траты в Excel\n/support — написать команде: вопрос или идея\n/myid — узнать свой Telegram ID']:
    'Everything important is in the app: tap the «Open» button below or the button under this message.\n\n' +
    'You can also record expenses right here — just write:\n«coffee 250», «taxi 300 yesterday», «+5000 freelance»\n\n' +
    'Or forward a bank SMS/notification — I\'ll record it myself. And a bank statement (PDF, Excel or CSV) — just send it as a file.\n\n' +
    '/start — open the app\n/auto — how to record expenses and income automatically\n/export — export all expenses to Excel\n/support — message the team: a question or an idea\n/myid — find out your Telegram ID',
  'Ваш Telegram ID: {id}': 'Your Telegram ID: {id}',
  'Эта команда только для администратора бота.': 'This command is for the bot admin only.',

  // Support
  '✍️ Напишите, что случилось или что хотите предложить, — передам команде Lolo & Pepe. Ответ придёт сюда же.\n\nПока открыт этот разговор, сообщения не записываются как траты.':
    '✍️ Tell us what happened or what you\'d like to suggest — I\'ll pass it on to the Lolo & Pepe team. The reply will come here.\n\nWhile this conversation is open, messages are not recorded as expenses.',
  'Передала команде ✉️ Ответ придёт сюда. Можно дописать ещё — я всё передам.':
    'Passed on to the team ✉️ The reply will come here. You can add more — I\'ll pass everything on.',
  'Готово 🐧 Теперь сообщения снова записываются как траты. Написать нам — /support.':
    'Done 🐧 Messages are recorded as expenses again. To write to us — /support.',

  // Export
  'Пока нечего выгружать — сначала создайте бюджет в приложении.': 'Nothing to export yet — create a budget in the app first.',
  '📊 Все траты и доходы — {records}. Файл открывается в Excel и Google Таблицах.':
    '📊 All expenses and income — {records}. The file opens in Excel and Google Sheets.',
  'Дата': 'Date',
  'Тип': 'Type',
  'Категория': 'Category',
  'Описание': 'Description',
  'Кто': 'Who',
  'Сумма, {currency}': 'Amount, {currency}',
  'Расход': 'Expense',
  'Расход (личный)': 'Expense (personal)',
  'Доход': 'Income',
  'Зарплата': 'Salary',
  'Подработка': 'Side income',
  'Подарок': 'Gift',
  'Возврат, кешбэк': 'Refund, cashback',
  'Другое': 'Other',

  // Quick add
  '💼 Зарплата': '💼 Salary',
  '💻 Подработка': '💻 Side income',
  '🎁 Подарок': '🎁 Gift',
  '↩️ Возврат, кешбэк': '↩️ Refund, cashback',
  '💰 Другое': '💰 Other',
  '✅ Записано:': '✅ Recorded:',
  '❌ Отменено:': '❌ Undone:',
  'Сначала откройте приложение и создайте бюджет — тогда траты можно будет записывать прямо здесь.':
    'First open the app and create a budget — then you can record expenses right here.',
  'Чтобы записать трату, напишите сумму и на что, например:\n«кофе 250», «такси 300 вчера»\n\nДоход — с плюсом: «+5000 подработка»':
    'To record an expense, write the amount and what it was for, for example:\n«coffee 250», «taxi 300 yesterday»\n\nIncome — with a plus: «+5000 freelance»',

  // Bank notices and statements
  'Сначала откройте приложение и создайте бюджет.': 'First open the app and create a budget.',
  '🏦 Из уведомления банка': '🏦 From a bank notification',
  'Эта операция уже записана 👌': 'This operation is already recorded 👌',
  'Файл слишком большой. Выгрузите выписку за месяц-два.': 'The file is too big. Export a statement for a month or two.',
  'Не получилось прочитать выписку: {error}': 'Couldn\'t read the statement: {error}',
  '📄 Нашла {ops} с {from} по {to}': '📄 Found {ops} from {from} to {to}',
  'Расходы: {n} на {sum}': 'Expenses: {n} totaling {sum}',
  'Доходы: {n} на {sum}': 'Income: {n} totaling {sum}',
  'Запишу в бюджет «{name}». То, что уже есть в бюджете (тот же день и сумма), пропущу.':
    'I\'ll record them in the budget «{name}». Anything already in the budget (same day and amount) will be skipped.',
  'Загрузка отменена.': 'Import cancelled.',
  '⏳ Записываю…': '⏳ Recording…',
  'Эта выписка уже записана.': 'This statement is already recorded.',
  '✅ Записала {added}.': '✅ Recorded {added}.',
  '✅ Записала {added}, пропустила {skipped} — они уже были в бюджете.': '✅ Recorded {added}, skipped {skipped} — they were already in the budget.',
  'Не получилось: {error}': 'That didn\'t work: {error}',
  // Errors thrown by the statement parser and importer
  'Файл слишком большой. Выгрузите выписку за месяц-два': 'The file is too big. Export a statement for a month or two',
  'Пришлите выписку в PDF, Excel (.xlsx) или CSV': 'Send the statement as PDF, Excel (.xlsx) or CSV',
  'Слишком длинная выписка. Выгрузите её за месяц-два': 'The statement is too long. Export it for a month or two',
  'В PDF нет текста — похоже, это скан. Скачайте выписку в банке заново или в CSV/Excel':
    'The PDF has no text — it looks like a scan. Download the statement from your bank again, or as CSV/Excel',
  'Не нашла в PDF операций с датой и суммой. Попробуйте выписку в CSV или Excel':
    'Couldn\'t find operations with a date and amount in the PDF. Try a CSV or Excel statement',
  'Не нашла в файле столбцы с датой и суммой. Это точно выписка из банка?':
    'Couldn\'t find date and amount columns in the file. Is it really a bank statement?',
  'Не нашла в файле столбцы с датой и суммой': 'Couldn\'t find date and amount columns in the file',
  'В файле не нашлось операций': 'No operations found in the file',
  'Загрузка не найдена, отправьте выписку ещё раз': 'Import not found, send the statement again',
  'Вы больше не участник этого бюджета': 'You are no longer a member of this budget',

  // Monthly recap
  'Итоги {month} готовы!\n\nСколько потратили, на что ушло больше всего и что ждёт в новом месяце.':
    'Your {month} recap is ready!\n\nHow much you spent, where most of it went and what\'s ahead in the new month.',

  // Notifications
  '🐧 {name}: новая трата {label}': '🐧 {name}: new expense {label}',
  '{name}: {emoji} на трату {label}': '{name}: {emoji} on the expense {label}',
  '💬 {name} к трате {label}:\n«{text}»': '💬 {name} on the expense {label}:\n«{text}»',
  '🔴 «{name}»: лимит на месяц исчерпан — {spent} из {planned}': '🔴 «{name}»: the monthly limit is used up — {spent} of {planned}',
  '⚠️ «{name}»: потрачено {pct}% лимита — {spent} из {planned}': '⚠️ «{name}»: {pct}% of the limit spent — {spent} of {planned}',
  '🐧 Сегодня ни одной траты? Если что-то покупали — запишите, пока помните.':
    '🐧 No expenses today? If you bought something, record it while you remember.',
  '🐧 Копилка «{name}»: в этом месяце отложено {saved} из {plan}. Осталось {left}':
    '🐧 Savings «{name}»: {saved} of {plan} saved this month. {left} to go',
  '🐧 Копилка «{name}»: в этом месяце ещё ничего не отложено, а план — {plan}':
    '🐧 Savings «{name}»: nothing saved yet this month, and the plan is {plan}',
};

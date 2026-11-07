// English for error messages the server returns in Russian ({ error: '...' }), keyed by the Russian original.
export default {
  // General
  'Не получилось, попробуйте ещё раз': 'Something went wrong, please try again',
  'Слишком много запросов, попробуйте через минуту': 'Too many requests, please try again in a minute',
  'Нет доступа': 'Access denied',
  'Не найдено': 'Not found',
  'Откройте приложение из Telegram': 'Open the app from Telegram',
  'Нужно войти заново': 'Please sign in again',
  'Пользователь не найден': 'User not found',
  'Файл слишком большой': 'The file is too big',

  // Budgets and members
  'Бюджет не найден': 'Budget not found',
  'Приглашение не найдено. Попросите прислать новую ссылку': 'Invitation not found. Ask for a new link',
  'В этом бюджете уже двое участников': 'This budget already has two members',
  'Доля от 0 до 100%': 'The share must be from 0 to 100%',

  // Expenses, income, categories
  'Трата не найдена': 'Expense not found',
  'Введите сумму больше нуля': 'Enter an amount greater than zero',
  'Сумма должна быть больше нуля': 'The amount must be greater than zero',
  'Выберите категорию': 'Choose a category',
  'Нет такой категории': 'No such category',
  'Введите название категории': 'Enter a category name',
  'В категории есть траты': 'This category has expenses',
  'Можно удалять только свои траты': 'You can only delete your own expenses',
  'Можно менять только свои доходы': 'You can only edit your own income',
  'Можно удалять только свои доходы': 'You can only delete your own income',

  // Savings
  'Введите название и сумму цели': 'Enter the goal name and amount',

  // Comments, receipts, messages
  'Напишите комментарий': 'Write a comment',
  'Можно удалять только свои комментарии': 'You can only delete your own comments',
  'Нужна картинка': 'An image is needed',
  'Фото слишком большое': 'The photo is too big',
  'Напишите сообщение': 'Write a message',

  // Export and bank statements
  'Не получилось отправить файл. Напишите боту /start и попробуйте ещё раз': 'Couldn\'t send the file. Send /start to the bot and try again',
  'Нет файла': 'No file',
  'Не получилось прочитать файл. Проверьте, что это выписка из банка': 'Couldn\'t read the file. Check that it\'s a bank statement',
  'Не получилось записать операции, попробуйте ещё раз': 'Couldn\'t record the operations, please try again',
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

  // Admin panel
  'Ссылка устарела или вход не из аккаунта администратора. Отправьте боту /admin ещё раз':
    'The link has expired or this isn\'t the admin account. Send /admin to the bot again',
  'Пользователь остановил бота — сообщение не доставить': 'The user stopped the bot — the message can\'t be delivered',
  'Напишите текст поста': 'Write the post text',
  'С фото или видео текст должен быть не длиннее 1024 символов': 'With a photo or video, the text must be at most 1024 characters',
  'Текст длиннее 4096 символов': 'The text is longer than 4096 characters',
  'Сначала отправьте пост себе на проверку': 'First send the post to yourself to check it',
  'Бот не запущен': 'The bot is not running',
};

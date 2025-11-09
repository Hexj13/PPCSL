'use client';

import { useState } from 'react';

type Language = 'mk' | 'en';

const privacy = {
  mk: {
    title: 'Политика за приватност',
    lastUpdated: 'Последна ажурирање: ',
    languageToggle: 'Префрли јазик',
    dictionary: {
      title: 'Речник на поими',
      terms: [
        {
          term: 'Лични податоци',
          definition:
            'Сите информации кои се однесуваат на идентификувано или идентификувано природно лице, вклучувајќи име, адреса, телефон, е-пошта, IP адреса и други идентификациони податоци.',
        },
        {
          term: 'Обработка на податоци',
          definition:
            'Секое дејство или збир дејства извршени врз лични податоци, вклучувајќи собирање, снимање, организирање, структурирање, складирање, адаптирање или изменување, извлекување, консултирање, употреба, откривање со пренос, дистрибуција или на друг начин правење достапни, усогласување или комбинирање, ограничување, бришење или уништување.',
        },
        {
          term: 'Контролер на податоци',
          definition:
            'Лице или правно лице кое самостојно или заедно со други одлучува за целите и начините на обработка на лични податоци.',
        },
        {
          term: 'Обработувач на податоци',
          definition:
            'Лице или правно лице кое обработува лични податоци во име на контролерот на податоци.',
        },
        {
          term: 'Согласност',
          definition:
            'Слободна, специфична, информирана и недвосмислена изјава на намера од страна на субјектот на податоци со која тој, со изјава или со јасно потврдувачко дејство, прифаќа обработка на лични податоци кои се однесуваат на него.',
        },
        {
          term: 'Cookies',
          definition:
            'Мали текст датотеки кои се чуваат на вашиот уред кога посетувате веб-сајт и кои овозможуваат веб-сајтот да ги запомни вашите преференци и активности.',
        },
      ],
    },
    toc: {
      title: 'Содржина',
      items: [
        { id: '1', title: '1. Вовед' },
        { id: '2', title: '2. Контролер на податоци' },
        { id: '3', title: '3. Какви податоци собираме' },
        { id: '4', title: '4. Како ги користиме податоците' },
        { id: '5', title: '5. Правна основа за обработка' },
        { id: '6', title: '6. Спречување и заштита на податоци' },
        { id: '7', title: '7. Споделување на податоци' },
        { id: '8', title: '8. Период на чување на податоци' },
        { id: '9', title: '9. Вашите права' },
        { id: '10', title: '10. Cookies и слични технологии' },
        { id: '11', title: '11. Безбедност на податоци' },
        { id: '12', title: '12. Меѓународен трансфер на податоци' },
        { id: '13', title: '13. Изменување на политиката' },
        { id: '14', title: '14. Контакт информации' },
      ],
    },
    sections: [
      {
        id: '1',
        title: '1. Вовед',
        content: [
          'Kupito ("ние", "наш", "нас") е некомерцијална платформа посветена на заштитата на вашата приватност и личните податоци. Оваа Политика за приватност објаснува како собираме, користиме, складираме и штитиме вашите лични податоци кога користите нашата платформа за објавување и прегледување на огласи за продажба на автомобили (www.kupito.mk) ("Платформата").',
          'Kupito е некомерцијална организација и не генерира приход од користењето на Платформата. Сите услуги се обезбедени бесплатно за корисниците. Платформата функционира како посредник помеѓу продавачите и купачите без да учествува во финансиските трансакции или да наплатува комисија.',
          'Со користење на Платформата, вие се согласувате со собирањето и употребата на вашите податоци како што е опишано во оваа Политика за приватност. Ако не се согласувате со оваа политика, ве молиме да не ја користите Платформата.',
          'Оваа Политика за приватност е составен дел од нашите Услови за користење и се применува на сите корисници на Платформата, вклучувајќи ги посетителите, регистрираните корисници и корисниците кои објавуваат огласи.',
        ],
      },
      {
        id: '2',
        title: '2. Контролер на податоци',
        content: [
          'Контролерот на податоци за обработката на вашите лични податоци е:',
          'Kupito (некомерцијална организација)',
          'Е-пошта: support@kupito.mk',
          'Платформа: www.kupito.mk',
          'Kupito е некомерцијална организација која работи на удалена основа и не води бизнис активност. Платформата е бесплатна за сите корисници и не генерира приход.',
          'За сите прашања или барања во врска со обработката на вашите лични податоци, ве молиме контактирајте не на наведената е-пошта адреса. По отворањето на правно лице во Република Северна Македонија (ако ќе биде неопходно во иднина), оваа информација ќе биде ажурирана со целосни контакт детали.',
        ],
      },
      {
        id: '3',
        title: '3. Какви податоци собираме',
        content: [
          'Собираме различни видови на лични податоци за да обезбедиме и подобриме нашите услуги:',
          '3.1. Податоци за регистрација и профил:',
          '• Име и презиме (за физички лица)',
          '• Име на компанија (за правни лица)',
          '• Е-пошта адреса',
          '• Телефонски број',
          '• Лозинка (хеширана со bcrypt, никогаш не се чува во видлив облик)',
          '• Тип на корисник (физичко лице / правно лице)',
          '3.2. Податоци за огласи:',
          '• Информации за автомобилот (марка, модел, година, цена, опис, фотографии)',
          '• Локација (град)',
          '• Други технички детали за возилото',
          '3.3. Податоци за комуникација:',
          '• Преференци за контакт преку месенџери (Viber, WhatsApp, Telegram)',
          '• Преференци за е-пошта известувања',
          '• Историја на комуникации (ако е релевантно)',
          '3.4. Технички податоци:',
          '• IP адреса',
          '• Тип на прелистувач и верзија',
          '• Оперативен систем',
          '• Време на пристап и активности на Платформата',
          '• Cookies и слични технологии',
          '3.5. Други податоци:',
          '• Информации за верификација на телефон (СМС код)',
          '• Информации за верификација на е-пошта',
          '• Статус на верификација (верификуван телефон/е-пошта)',
        ],
      },
      {
        id: '4',
        title: '4. Како ги користиме податоците',
        content: [
          'Ги користиме вашите лични податоци за следните цели:',
          '4.1. Обезбедување на услуги:',
          '• Креирање и управување со вашиот профил',
          '• Овозможување објавување и управување со огласи',
          '• Обезбедување комуникација помеѓу продавачи и купачи',
          '• Верификација на вашиот телефон и е-пошта',
          '• Обезбедување безбедност и спречување на злоупотреба',
          '4.2. Подобрување на услугите:',
          '• Анализирање на употребата на Платформата',
          '• Развој на нови функции и подобрување на постоечките',
          '• Персонализација на вашето искуство',
          '4.3. Комуникација:',
          '• Испраќање на е-пошта известувања (само ако сте експлицитно ги овозможиле)',
          '• Одговор на вашите прашања и барања',
          '• Известување за важни промени на Платформата или нашите политики',
          '4.4. Правни и безбедносни цели:',
          '• Спротивставување на неправомерни активности',
          '• Соработка со правоохранителните органи во согласност со законот',
          '• Заштита на правата и безбедноста на корисниците',
          '• Спротивставување на измами и злоупотреба',
        ],
      },
      {
        id: '5',
        title: '5. Правна основа за обработка',
        content: [
          'Обработуваме вашите лични податоци врз основа на следните правни основи:',
          '5.1. Извршување на договор:',
          '• Обработка на податоци неопходни за обезбедување на услугите на Платформата, вклучувајќи регистрација, објавување на огласи и комуникација помеѓу корисниците.',
          '5.2. Согласност:',
          '• Обработка на податоци за е-пошта известувања и маркетинг активности (само ако сте експлицитно дале согласност).',
          '5.3. Правна обврска:',
          '• Обработка на податоци потребни за исполнување на правни обврски, вклучувајќи соработка со правоохранителните органи и заштита на правата на корисниците.',
          '5.4. Легитимен интерес:',
          '• Обработка на податоци за безбедност и спречување на злоупотреба',
          '• Анализа и подобрување на услугите',
          '• Заштита на правата и интересите на Kupito и нејзините корисници',
        ],
      },
      {
        id: '6',
        title: '6. Спречување и заштита на податоци',
        content: [
          'Kupito применува различни технички и организациски мерки за заштита на вашите лични податоци:',
          '6.1. Криптографска заштита:',
          '• Лозинките се хешираат со bcrypt и никогаш не се чуваат во видлив облик',
          '• Комуникацијата со Платформата е заштитена со HTTPS',
          '• Податоците се шифрирани при пренос',
          '6.2. Безбедносни мерки:',
          '• Ограничување на пристап до податоци само на овластени лица',
          '• Редовни безбедносни проверки и ажурирања',
          '• Заштита од неовластен пристап, измами и злоупотреба',
          '• Ограничување на бројот на обиди за верификација (40 неуспешни обиди = блокирање на IP за 1 час)',
          '• Валидација на прикачените датотеки со проверка на магични бајти (magic bytes) за спречување на злонамерни датотеки',
          '• Санитизација на HTML содржина за заштита од XSS напади',
          '• Валидација на метаподатоци на слики (ширина, висина) и ограничување на максимални димензии',
          '6.3. Организациски мерки:',
          '• Обучување на персоналот за заштита на податоци',
          '• Строги политики за пристап до податоци',
          '• Редовни ревизии на безбедносните практики',
        ],
      },
      {
        id: '7',
        title: '7. Споделување на податоци',
        content: [
          'Kupito не продава вашите лични податоци на трети лица. Може да ги споделиме вашите податоци само во следните случаи:',
          '7.1. Со ваша согласност:',
          '• Кога експлицитно давате согласност за споделување на податоци',
          '7.2. Со правоохранителни органи:',
          '• Кога е потребно по закон или по законски валидно барање',
          '• За спречување на незаконски активности',
          '• За заштита на правата и безбедноста на корисниците',
          '7.3. Со обработувачи на податоци и трети страни:',
          'Kupito користи следните услуги од трети страни кои можат да пристапат до вашите податоци:',
          '• Google Analytics: За анализирање на употребата на Платформата и подобрување на услугите. Google Analytics собира анонимни статистички податоци за посетите. За повеќе информации, видете ја Политиката за приватност на Google: https://policies.google.com/privacy',
          '• Messagio: За испраќање на СМС пораки за верификација на телефонски број. Messagio пристапува само до телефонскиот број потребен за испраќање на СМС. За повеќе информации, видете ја Политиката за приватност на Messagio.',
          '• Twilio: За испраќање на СМС пораки за верификација на телефонски број. Twilio пристапува само до телефонскиот број потребен за испраќање на СМС. За повеќе информации, видете ја Политиката за приватност на Twilio: https://www.twilio.com/legal/privacy',
          '• Sentry: За мониторинг на грешки и логови за подобрување на стабилноста на Платформата. Sentry може да пристапи до технички податоци како IP адреса, тип на прелистувач и информации за грешки. За повеќе информации, видете ја Политиката за приватност на Sentry: https://sentry.io/privacy/',
          '• Хостинг провајдери: За складирање и обработка на податоци на сервери лоцирани во Република Северна Македонија',
          'Сите овие партнери се обврзани да ги заштитат вашите податоци и да ги користат само за наведените цели во согласност со нивните политики за приватност и договорите за обработка на податоци.',
          '7.4. При трансфер на бизнис:',
          '• Во случај на спојување, стекнување или продажба на дел од бизнисот, податоците може да се пренесат како дел од трансакцијата',
          '7.5. Публични информации:',
          '• Информациите објавени во вашите огласи (име, телефон, локација) се јавно достапни на Платформата',
          '• Овие информации се видливи за сите посетители на Платформата',
        ],
      },
      {
        id: '8',
        title: '8. Период на чување на податоци',
        content: [
          'Ги чуваме вашите лични податоци само онолку колку е потребно за целите наведени во оваа Политика за приватност:',
          '8.1. Активни корисници:',
          '• Податоците се чуваат додека вашиот профил е активен',
          '• Можете да ги ажурирате или избришете вашите податоци во секое време',
          '8.2. По прекин на профилот:',
          '• По барање за бришење на профилот, вашите лични податоци (име, е-пошта, телефон, профил информации) веднаш се бришат од базата на податоци',
          '• Вашите огласи остануваат на Платформата, но сите ваши лични податоци и контакт информации се отстранети од огласите',
          '• Огласите се прикажуваат без контакт информации и лични податоци на корисникот',
          '• Некои податоци може да се задржат подолго ако е потребно за:',
          '  - Исполнување на правни обврски',
          '  - Разрешување на спорови',
          '  - Спречување на измами и злоупотреба',
          '8.3. Огласи:',
          '• Огласите се чуваат додека се активни или додека корисникот не ги избрише',
          '• По бришење на профилот, огласите остануваат но без контакт информации',
          '• Затворените или избришаните огласи се чуваат во архива до 1 година за цели на безбедност и правни цели',
          '8.4. Логови и технички податоци:',
          '• Логовите и техничките податоци се чуваат до 12 месеци',
          '• Податоците во Sentry се чуваат според нивната политика за зачувување',
          '8.5. Резервни копии (бэкапи) на базата на податоци:',
          '• Правиме редовни резервни копии на базата на податоци за цели на безбедност и заштита на податоци',
          '• Резервните копии содржат копија од сите податоци во базата на податоци, вклучувајќи ги и личните податоци',
          '• Резервните копии се чуваат до 30 дена, по што автоматски се бришат',
          '• Резервните копии се заштитени со шифрирање и се чуваат на безбедни сервери',
          '• Во случај на барање за бришење на лични податоци, резервните копии ќе бидат ажурирани при следното создавање на резервна копија',
        ],
      },
      {
        id: '9',
        title: '9. Вашите права',
        content: [
          'Како субјект на податоци, имате следните права во согласност со Законот за заштита на личните податоци на Република Северна Македонија и GDPR:',
          '9.1. Право на пристап:',
          '• Можете да побарате копија од вашите лични податоци кои ги обработуваме',
          '9.2. Право на исправка:',
          '• Можете да побарате исправка на неточни или нецелосни податоци',
          '• Можете да ги ажурирате вашите податоци преку вашиот профил',
          '9.3. Право на бришење ("право да се заборави"):',
          '• Можете да побарате бришење на вашите лични податоци, освен ако постои правна основа за нивно задржување',
          '9.4. Право на ограничување на обработката:',
          '• Можете да побарате ограничување на обработката на вашите податоци во одредени случаи',
          '9.5. Право на преносивост на податоци:',
          '• Можете да побарате пренос на вашите податоци во структуриран, вообичаен и машински читлив формат',
          '9.6. Право на приговор:',
          '• Можете да се приговорите на обработката на вашите податоци врз основа на легитимен интерес',
          '9.7. Право на повлекување на согласност:',
          '• Можете да ја повлечете вашата согласност за обработка на податоци во секое време (за маркетинг и е-пошта известувања)',
          '9.8. Право на поднесување жалба:',
          '• Можете да поднесете жалба до Агенцијата за заштита на личните податоци на Република Северна Македонија ако сметате дека вашите права се нарушени',
          'За да ги остварите вашите права, ве молиме контактирајте не на support@kupito.mk. Ќе одговориме на вашето барање во рок од 30 дена.',
        ],
      },
      {
        id: '10',
        title: '10. Cookies и слични технологии',
        content: [
          'Kupito користи cookies и слични технологии за подобрување на вашето искуство на Платформата:',
          '10.1. Видови cookies и технологии кои ги користиме:',
          '• Неопходни cookies: Овие cookies се неопходни за функционирање на Платформата и не можат да се оневозможат',
          '• Функционални cookies: Овие cookies овозможуваат подобрено функционирање и персонализација',
          '• Аналитички cookies: Google Analytics користи cookies за анализирање на употребата на Платформата. Овие cookies ни помагаат да разбереме како корисниците ја користат Платформата',
          '10.2. Локално складирање (localStorage):',
          '• Користиме localStorage за зачувување на вашиот автентификациски токен (access token)',
          '• Користиме localStorage за зачувување на refresh токен за автоматично обновување на сесијата',
          '• Користиме localStorage за зачувување на вашите избрани огласи (favorites)',
          '• Користиме localStorage за зачувување на други преференци и нагодувања',
          '10.3. Сесиско складирање (sessionStorage):',
          '• Користиме sessionStorage за временско зачувување на податоци за време на вашата сесија',
          '10.4. Управување со cookies и локално складирање:',
          '• Можете да управувате со cookies преку нагодувањата на вашиот прелистувач',
          '• Можете да го исчистите localStorage преку нагодувањата на вашиот прелистувач',
          '• Имајте предвид дека оневозможувањето на одредени cookies или бришење на localStorage може да влијае на функционалноста на Платформата и може да бара повторна најава',
          '10.5. Google Analytics:',
          '• Google Analytics користи cookies за собирање на анонимни статистички податоци',
          '• Можете да се откажете од Google Analytics преку Google Analytics Opt-out Browser Add-on: https://tools.google.com/dlpage/gaoptout',
        ],
      },
      {
        id: '11',
        title: '11. Безбедност на податоци',
        content: [
          'Kupito применува индустриски стандарди за заштита на вашите лични податоци:',
          '11.1. Технички мерки:',
          '• Шифрирање на податоци при пренос (HTTPS/TLS)',
          '• Безбедно складирање на податоци на заштитени сервери',
          '• Редовни безбедносни ажурирања и патчи',
          '• Заштита од неовластен пристап и напади',
          '• Редовни резервни копии на базата на податоци за заштита од загуба на податоци',
          '• Валидација на прикачените датотеки со проверка на магични бајти (magic bytes) за спречување на злонамерни датотеки',
          '• Санитизација на HTML содржина во описите на огласите за заштита од XSS напади',
          '• Валидација на метаподатоци на слики и ограничување на максимални димензии (10000x10000 пиксели)',
          '11.2. Организациски мерки:',
          '• Ограничен пристап до податоци само на овластени лица',
          '• Редовни обуки за безбедност на персоналот',
          '• Строги политики за пристап и автентификација',
          '• Редовни ревизии и мониторинг на безбедноста',
          '• Никој од вработените не може да пристапи до вашите лозинки - лозинките се хеширани и не се чуваат во видлив облик',
          '• Никој од вработените никогаш нема да побара од вас да го споделите вашиот лозинка - ако некој побара ваша лозинка, тоа е измама',
          '11.3. Инциденти со безбедност:',
          '• Во случај на инцидент со безбедност, ќе ве известиме во согласност со законските обврски',
          '• Ќе преземаме соодветни мерки за минимизирање на ризикот и заштита на вашите податоци',
        ],
      },
      {
        id: '12',
        title: '12. Меѓународен трансфер на податоци',
        content: [
          'Вашите лични податоци се обработуваат и чуваат на сервери лоцирани во Република Северна Македонија.',
          'Некои од нашите партнери од трети страни (Google Analytics, Sentry, Twilio, Messagio) можат да обработуваат податоци на сервери лоцирани надвор од Република Северна Македонија. Овие партнери се обврзани да ги заштитат вашите податоци во согласност со нивните политики за приватност и соодветните договори за обработка на податоци.',
          'Google Analytics може да обработува податоци на сервери во САД. Google е сертификуван под Privacy Shield и се обврзува да ги заштити вашите податоци во согласност со GDPR.',
          'Sentry може да обработува податоци на сервери во САД и Европа. Sentry е во согласност со GDPR и применува соодветни заштитни мерки.',
          'Twilio и Messagio обработуваат податоци за испраќање на СМС пораки. Овие податоци се обработуваат во согласност со нивните политики за приватност.',
          'Ако во иднина треба да ги пренесеме вашите податоци надвор од Република Северна Македонија, ќе обезбедиме соодветни заштитни мерки во согласност со GDPR и важечките закони.',
          'Сите трансфери на податоци ќе се вршат во согласност со важечките закони за заштита на податоци и со соодветни договорни клаузули за заштита на податоци.',
        ],
      },
      {
        id: '13',
        title: '13. Изменување на политиката',
        content: [
          'Kupito резервира право да ја измени оваа Политика за приватност во секое време. Изменетите политики ќе бидат објавени на Платформата со датум на последна ажурирање.',
          'Продолжувањето на користењето на Платформата по објавувањето на изменетите политики се смета за прифаќање на новите политики.',
          'Препорачано е редовно да се проверува оваа Политика за приватност за какви било промени.',
          'За важни промени, ќе ве известиме преку е-пошта или преку објава на Платформата.',
        ],
      },
      {
        id: '14',
        title: '14. Контакт информации',
        content: [
          'Ако имате прашања, забелешки или барања во врска со оваа Политика за приватност или обработката на вашите лични податоци, ве молиме контактирајте не на:',
          'Е-пошта: support@kupito.mk',
          'Платформа: www.kupito.mk',
          'Ќе одговориме на вашето барање во најкраток можен рок, најдоцна во рок од 30 дена од приемот на вашето барање.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: ',
    languageToggle: 'Switch language',
    dictionary: {
      title: 'Glossary of Terms',
      terms: [
        {
          term: 'Personal Data',
          definition:
            'All information relating to an identified or identifiable natural person, including name, address, phone, email, IP address, and other identifying data.',
        },
        {
          term: 'Data Processing',
          definition:
            'Any operation or set of operations performed on personal data, including collection, recording, organization, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, distribution or otherwise making available, alignment or combination, restriction, erasure or destruction.',
        },
        {
          term: 'Data Controller',
          definition:
            'A natural or legal person who, alone or jointly with others, determines the purposes and means of processing personal data.',
        },
        {
          term: 'Data Processor',
          definition:
            'A natural or legal person who processes personal data on behalf of the data controller.',
        },
        {
          term: 'Consent',
          definition:
            "A freely given, specific, informed and unambiguous indication of the data subject's wishes by which he or she, by a statement or by a clear affirmative action, signifies agreement to the processing of personal data relating to him or her.",
        },
        {
          term: 'Cookies',
          definition:
            'Small text files stored on your device when you visit a website that allow the website to remember your preferences and activities.',
        },
      ],
    },
    toc: {
      title: 'Table of Contents',
      items: [
        { id: '1', title: '1. Introduction' },
        { id: '2', title: '2. Data Controller' },
        { id: '3', title: '3. What Data We Collect' },
        { id: '4', title: '4. How We Use Data' },
        { id: '5', title: '5. Legal Basis for Processing' },
        { id: '6', title: '6. Data Prevention and Protection' },
        { id: '7', title: '7. Data Sharing' },
        { id: '8', title: '8. Data Retention Period' },
        { id: '9', title: '9. Your Rights' },
        { id: '10', title: '10. Cookies and Similar Technologies' },
        { id: '11', title: '11. Data Security' },
        { id: '12', title: '12. International Data Transfer' },
        { id: '13', title: '13. Policy Changes' },
        { id: '14', title: '14. Contact Information' },
      ],
    },
    sections: [
      {
        id: '1',
        title: '1. Introduction',
        content: [
          'Kupito ("we", "our", "us") is a non-commercial platform committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, store, and protect your personal data when you use our platform for posting and viewing listings for the sale of vehicles (www.kupito.mk) ("Platform").',
          'Kupito is a non-commercial organization and does not generate revenue from the use of the Platform. All services are provided free of charge to users. The Platform operates as an intermediary between sellers and buyers without participating in financial transactions or charging commissions.',
          'By using the Platform, you agree to the collection and use of your data as described in this Privacy Policy. If you do not agree with this policy, please do not use the Platform.',
          'This Privacy Policy is an integral part of our Terms and Conditions and applies to all users of the Platform, including visitors, registered users, and users who post listings.',
        ],
      },
      {
        id: '2',
        title: '2. Data Controller',
        content: [
          'The data controller for the processing of your personal data is:',
          'Kupito (non-commercial organization)',
          'Email: support@kupito.mk',
          'Platform: www.kupito.mk',
          'Kupito is a non-commercial organization that operates on a remote basis and does not conduct business activities. The Platform is free for all users and does not generate revenue.',
          'For any questions or requests regarding the processing of your personal data, please contact us at the email address provided above. Upon establishment of a legal entity in the Republic of North Macedonia (if necessary in the future), this information will be updated with complete contact details.',
        ],
      },
      {
        id: '3',
        title: '3. What Data We Collect',
        content: [
          'We collect various types of personal data to provide and improve our services:',
          '3.1. Registration and Profile Data:',
          '• First and last name (for individuals)',
          '• Company name (for legal entities)',
          '• Email address',
          '• Phone number',
          '• Password (hashed with bcrypt, never stored in plain text)',
          '• User type (individual / legal entity)',
          '3.2. Listing Data:',
          '• Vehicle information (brand, model, year, price, description, photographs)',
          '• Location (city)',
          '• Other technical details about the vehicle',
          '3.3. Communication Data:',
          '• Messenger contact preferences (Viber, WhatsApp, Telegram)',
          '• Email notification preferences',
          '• Communication history (if relevant)',
          '3.4. Technical Data:',
          '• IP address',
          '• Browser type and version',
          '• Operating system',
          '• Access time and Platform activities',
          '• Cookies and similar technologies',
          '3.5. Other Data:',
          '• Phone verification information (SMS code)',
          '• Email verification information',
          '• Verification status (verified phone/email)',
        ],
      },
      {
        id: '4',
        title: '4. How We Use Data',
        content: [
          'We use your personal data for the following purposes:',
          '4.1. Service Provision:',
          '• Creating and managing your profile',
          '• Enabling posting and management of listings',
          '• Facilitating communication between sellers and buyers',
          '• Verifying your phone and email',
          '• Providing security and preventing abuse',
          '4.2. Service Improvement:',
          '• Analyzing Platform usage',
          '• Developing new features and improving existing ones',
          '• Personalizing your experience',
          '4.3. Communication:',
          '• Sending email notifications (only if you have explicitly enabled them)',
          '• Responding to your questions and requests',
          '• Notifying about important changes to the Platform or our policies',
          '4.4. Legal and Security Purposes:',
          '• Combating unlawful activities',
          '• Cooperating with law enforcement agencies in accordance with the law',
          '• Protecting user rights and security',
          '• Combating fraud and abuse',
        ],
      },
      {
        id: '5',
        title: '5. Legal Basis for Processing',
        content: [
          'We process your personal data based on the following legal bases:',
          '5.1. Contract Performance:',
          '• Processing data necessary for providing Platform services, including registration, posting listings, and communication between users.',
          '5.2. Consent:',
          '• Processing data for email notifications and marketing activities (only if you have explicitly given consent).',
          '5.3. Legal Obligation:',
          '• Processing data necessary for fulfilling legal obligations, including cooperation with law enforcement agencies and protection of user rights.',
          '5.4. Legitimate Interest:',
          '• Processing data for security and abuse prevention',
          '• Analysis and service improvement',
          "• Protection of Kupito's and its users' rights and interests",
        ],
      },
      {
        id: '6',
        title: '6. Data Prevention and Protection',
        content: [
          'Kupito implements various technical and organizational measures to protect your personal data:',
          '6.1. Cryptographic Protection:',
          '• Passwords are hashed with bcrypt and never stored in plain text',
          '• Communication with the Platform is secured with HTTPS',
          '• Data is encrypted during transmission',
          '6.2. Security Measures:',
          '• Limiting data access to authorized personnel only',
          '• Regular security checks and updates',
          '• Protection against unauthorized access, fraud, and abuse',
          '• Limiting the number of verification attempts (40 failed attempts = IP block for 1 hour)',
          '• File upload validation with magic byte checking to prevent malicious files',
          '• HTML content sanitization to protect against XSS attacks',
          '• Image metadata validation (width, height) and maximum dimension limits',
          '6.3. Organizational Measures:',
          '• Staff training on data protection',
          '• Strict data access policies',
          '• Regular reviews of security practices',
        ],
      },
      {
        id: '7',
        title: '7. Data Sharing',
        content: [
          'Kupito does not sell your personal data to third parties. We may share your data only in the following cases:',
          '7.1. With Your Consent:',
          '• When you explicitly consent to data sharing',
          '7.2. With Law Enforcement:',
          '• When required by law or legally valid request',
          '• For preventing illegal activities',
          '• For protecting user rights and security',
          '7.3. With Data Processors and Third Parties:',
          'Kupito uses the following third-party services that may access your data:',
          "• Google Analytics: For analyzing Platform usage and improving services. Google Analytics collects anonymous statistical data about visits. For more information, see Google's Privacy Policy: https://policies.google.com/privacy",
          "• Messagio: For sending SMS messages for phone number verification. Messagio only accesses the phone number needed to send SMS. For more information, see Messagio's Privacy Policy.",
          "• Twilio: For sending SMS messages for phone number verification. Twilio only accesses the phone number needed to send SMS. For more information, see Twilio's Privacy Policy: https://www.twilio.com/legal/privacy",
          "• Sentry: For monitoring errors and logs to improve Platform stability. Sentry may access technical data such as IP address, browser type, and error information. For more information, see Sentry's Privacy Policy: https://sentry.io/privacy/",
          '• Hosting Providers: For storing and processing data on servers located in the Republic of North Macedonia',
          'All these partners are obligated to protect your data and use it only for stated purposes in accordance with their privacy policies and data processing agreements.',
          '7.4. Business Transfer:',
          '• In case of merger, acquisition, or sale of part of the business, data may be transferred as part of the transaction',
          '7.5. Public Information:',
          '• Information published in your listings (name, phone, location) is publicly available on the Platform',
          '• This information is visible to all Platform visitors',
        ],
      },
      {
        id: '8',
        title: '8. Data Retention Period',
        content: [
          'We retain your personal data only as long as necessary for the purposes stated in this Privacy Policy:',
          '8.1. Active Users:',
          '• Data is retained while your profile is active',
          '• You can update or delete your data at any time',
          '8.2. After Account Termination:',
          '• Upon account deletion request, your personal data (name, email, phone, profile information) is immediately deleted from the database',
          '• Your listings remain on the Platform, but all your personal data and contact information are removed from the listings',
          '• Listings are displayed without contact information and user personal data',
          '• Some data may be retained longer if necessary for:',
          '  - Fulfilling legal obligations',
          '  - Resolving disputes',
          '  - Preventing fraud and abuse',
          '8.3. Listings:',
          '• Listings are retained while active or until the user deletes them',
          '• After account deletion, listings remain but without contact information',
          '• Closed or deleted listings are retained in archive for up to 1 year for security and legal purposes',
          '8.4. Logs and Technical Data:',
          '• Logs and technical data are retained for up to 12 months',
          '• Data in Sentry is retained according to their retention policy',
          '8.5. Database Backups:',
          '• We perform regular database backups for security and data protection purposes',
          '• Backups contain a copy of all data in the database, including personal data',
          '• Backups are retained for up to 30 days, after which they are automatically deleted',
          '• Backups are protected with encryption and stored on secure servers',
          '• In case of a request for deletion of personal data, backups will be updated during the next backup creation',
        ],
      },
      {
        id: '9',
        title: '9. Your Rights',
        content: [
          'As a data subject, you have the following rights in accordance with the Personal Data Protection Law of the Republic of North Macedonia and GDPR:',
          '9.1. Right of Access:',
          '• You can request a copy of your personal data that we process',
          '9.2. Right to Rectification:',
          '• You can request correction of inaccurate or incomplete data',
          '• You can update your data through your profile',
          '9.3. Right to Erasure ("Right to be Forgotten"):',
          '• You can request deletion of your personal data, unless there is a legal basis for retention',
          '9.4. Right to Restriction of Processing:',
          '• You can request restriction of processing of your data in certain cases',
          '9.5. Right to Data Portability:',
          '• You can request transfer of your data in a structured, commonly used, and machine-readable format',
          '9.6. Right to Object:',
          '• You can object to processing of your data based on legitimate interest',
          '9.7. Right to Withdraw Consent:',
          '• You can withdraw your consent for data processing at any time (for marketing and email notifications)',
          '9.8. Right to Lodge a Complaint:',
          '• You can lodge a complaint with the Personal Data Protection Agency of the Republic of North Macedonia if you believe your rights have been violated',
          'To exercise your rights, please contact us at support@kupito.mk. We will respond to your request within 30 days.',
        ],
      },
      {
        id: '10',
        title: '10. Cookies and Similar Technologies',
        content: [
          'Kupito uses cookies and similar technologies to improve your experience on the Platform:',
          '10.1. Types of Cookies and Technologies We Use:',
          '• Essential cookies: These cookies are necessary for Platform functionality and cannot be disabled',
          '• Functional cookies: These cookies enable enhanced functionality and personalization',
          '• Analytical cookies: Google Analytics uses cookies to analyze Platform usage. These cookies help us understand how users use the Platform',
          '10.2. Local Storage (localStorage):',
          '• We use localStorage to store your authentication token (access token)',
          '• We use localStorage to store refresh token for automatic session renewal',
          '• We use localStorage to store your favorite listings',
          '• We use localStorage to store other preferences and settings',
          '10.3. Session Storage (sessionStorage):',
          '• We use sessionStorage for temporary data storage during your session',
          '10.4. Cookie and Local Storage Management:',
          '• You can manage cookies through your browser settings',
          '• You can clear localStorage through your browser settings',
          '• Please note that disabling certain cookies or clearing localStorage may affect Platform functionality and may require re-login',
          '10.5. Google Analytics:',
          '• Google Analytics uses cookies to collect anonymous statistical data',
          '• You can opt out of Google Analytics via the Google Analytics Opt-out Browser Add-on: https://tools.google.com/dlpage/gaoptout',
        ],
      },
      {
        id: '11',
        title: '11. Data Security',
        content: [
          'Kupito implements industry standards to protect your personal data:',
          '11.1. Technical Measures:',
          '• Data encryption during transmission (HTTPS/TLS)',
          '• Secure data storage on protected servers',
          '• Regular security updates and patches',
          '• Protection against unauthorized access and attacks',
          '• Regular database backups to protect against data loss',
          '• File upload validation with magic byte checking to prevent malicious files',
          '• HTML content sanitization in listing descriptions to protect against XSS attacks',
          '• Image metadata validation and maximum dimension limits (10000x10000 pixels)',
          '11.2. Organizational Measures:',
          '• Limited data access to authorized personnel only',
          '• Regular security training for staff',
          '• Strict access and authentication policies',
          '• Regular security audits and monitoring',
          '• No employee can access your passwords - passwords are hashed and never stored in plain text',
          '• No employee will ever ask you to share your password - if someone asks for your password, it is a scam',
          '11.3. Security Incidents:',
          '• In case of a security incident, we will notify you in accordance with legal obligations',
          '• We will take appropriate measures to minimize risk and protect your data',
        ],
      },
      {
        id: '12',
        title: '12. International Data Transfer',
        content: [
          'Your personal data is processed and stored on servers located in the Republic of North Macedonia.',
          'Some of our third-party partners (Google Analytics, Sentry, Twilio, Messagio) may process data on servers located outside the Republic of North Macedonia. These partners are obligated to protect your data in accordance with their privacy policies and appropriate data processing agreements.',
          'Google Analytics may process data on servers in the USA. Google is certified under Privacy Shield and commits to protecting your data in accordance with GDPR.',
          'Sentry may process data on servers in the USA and Europe. Sentry is GDPR compliant and implements appropriate safeguards.',
          'Twilio and Messagio process data for sending SMS messages. This data is processed in accordance with their privacy policies.',
          'If in the future we need to transfer your data outside the Republic of North Macedonia, we will ensure appropriate safeguards in accordance with GDPR and applicable laws.',
          'All data transfers will be conducted in accordance with applicable data protection laws and with appropriate contractual clauses for data protection.',
        ],
      },
      {
        id: '13',
        title: '13. Policy Changes',
        content: [
          'Kupito reserves the right to modify this Privacy Policy at any time. Modified policies will be published on the Platform with a last updated date.',
          'Continued use of the Platform after publication of modified policies is considered acceptance of the new policies.',
          'It is recommended to regularly check this Privacy Policy for any changes.',
          'For important changes, we will notify you via email or through a Platform announcement.',
        ],
      },
      {
        id: '14',
        title: '14. Contact Information',
        content: [
          'If you have questions, comments, or requests regarding this Privacy Policy or the processing of your personal data, please contact us at:',
          'Email: support@kupito.mk',
          'Platform: www.kupito.mk',
          'We will respond to your request as soon as possible, no later than 30 days from receipt of your request.',
        ],
      },
    ],
  },
};

export default function PrivacyPage() {
  const [language, setLanguage] = useState<Language>('mk');
  const currentPrivacy = privacy[language];
  const currentDate = new Date().toLocaleDateString(language === 'mk' ? 'mk-MK' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          {currentPrivacy.title}
        </h1>
        <button
          onClick={() => setLanguage(language === 'mk' ? 'en' : 'mk')}
          className="px-4 py-2 bg-bg-light border-2 border-primary-500/30 rounded-lg hover:bg-bg-light/80 hover:border-primary-500 transition-all duration-200 text-white font-medium"
        >
          {language === 'mk' ? 'EN' : 'MK'}
        </button>
      </div>

      <p className="text-gray-400 mb-8 text-sm">
        {currentPrivacy.lastUpdated}
        {currentDate}
      </p>

      <div className="surface mb-8">
        <h2 className="text-2xl font-bold mb-4">{currentPrivacy.dictionary.title}</h2>
        <div className="space-y-4">
          {currentPrivacy.dictionary.terms.map((item, index) => (
            <div key={index} className="border-b border-primary-500/10 pb-4 last:border-b-0">
              <h3 className="font-semibold text-primary-300 mb-1">{item.term}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{item.definition}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface mb-8">
        <h2 className="text-2xl font-bold mb-4">{currentPrivacy.toc.title}</h2>
        <nav className="space-y-2">
          {currentPrivacy.toc.items.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="block w-full text-left px-4 py-2 text-gray-300 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all duration-200"
            >
              {item.title}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-8">
        {currentPrivacy.sections.map((section) => (
          <section key={section.id} id={section.id} className="surface scroll-mt-20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{section.title}</h2>
            <div className="space-y-4">
              {section.content.map((paragraph, index) => (
                <p key={index} className="text-gray-300 leading-relaxed text-base md:text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-primary-500/20 text-center text-gray-400 text-sm">
        <p>
          {language === 'mk'
            ? 'Ако имате прашања, ве молиме контактирајте не.'
            : 'If you have any questions, please contact us.'}
        </p>
      </div>
    </div>
  );
}

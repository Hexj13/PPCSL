'use client';

import { useState } from 'react';

type Language = 'mk' | 'en';

const terms = {
  mk: {
    title: 'Услови за користење',
    lastUpdated: 'Последна ажурирање: ',
    languageToggle: 'Префрли јазик',
    dictionary: {
      title: 'Речник на поими',
      terms: [
        {
          term: 'Платформа',
          definition:
            'Веб-сајтот и апликацијата Kupito која овозможува објавување и прегледување на огласи за продажба на автомобили.',
        },
        {
          term: 'Корисник',
          definition:
            'Лице кое користи Платформата, вклучувајќи ги регистрираните корисници и посетителите.',
        },
        {
          term: 'Регистриран корисник',
          definition: 'Корисник кој создал профил на Платформата со валидна е-пошта и лозинка.',
        },
        {
          term: 'Оглас',
          definition: 'Публикација на Платформата која содржи информации за автомобил на продажба.',
        },
        {
          term: 'Автомобил',
          definition: 'Моторно возило кое е предмет на продажба и кое е објавено на Платформата.',
        },
        {
          term: 'Продавач',
          definition:
            'Лице или правно лице кое објавува оглас за продажба на автомобил на Платформата.',
        },
        {
          term: 'Купач',
          definition: 'Лице кое е заинтересирано за купување на автомобил објавен на Платформата.',
        },
        {
          term: 'Трансакција',
          definition: 'Процес на купување/продавање на автомобил меѓу Продавачот и Купачот.',
        },
        {
          term: 'Лични податоци',
          definition:
            'Сите информации кои се однесуваат на идентификувано или идентификувано природно лице.',
        },
        {
          term: 'Правила за користење',
          definition: 'Оваа документ и сите поврзани политики и правила на Платформата.',
        },
      ],
    },
    toc: {
      title: 'Содржина',
      items: [
        { id: '1', title: '1. Прифаќање на условите' },
        { id: '2', title: '2. Опис на услугата' },
        { id: '3', title: '3. Регистрација и сметка' },
        { id: '4', title: '4. Правила за објавување' },
        { id: '5', title: '5. Одговорност на корисниците' },
        { id: '6', title: '6. Интелектуална сопственост' },
        { id: '7', title: '7. Заштита на лични податоци' },
        { id: '8', title: '8. Плаќања и комисија' },
        { id: '9', title: '9. Одговорност и одрекување' },
        { id: '10', title: '10. Прекин на услугата' },
        { id: '11', title: '11. Изменување на условите' },
        { id: '12', title: '12. Разрешување спорови' },
        { id: '13', title: '13. Разни одредби' },
        { id: '14', title: '14. Контакт информации' },
      ],
    },
    sections: [
      {
        id: '1',
        title: '1. Прифаќање на условите',
        content: [
          'Со пристапување и користење на Платформата Kupito, вие се согласувате да се придржувате и да бидете обврзани со овие Услови за користење ("Услови"). Ако не се согласувате со овие Услови, ве молиме да не ја користите Платформата.',
          'Овие Услови се применуваат на сите корисници на Платформата, вклучувајќи ги посетителите, регистрираните корисници и корисниците кои објавуваат огласи.',
          'Со регистрација на сметка или користење на Платформата, вие потврдувате дека сте на возраст од најмалку 18 години и имате правна способност да склучите законски обврзувачки договори.',
        ],
      },
      {
        id: '2',
        title: '2. Опис на услугата',
        content: [
          'Kupito е платформа за објавување и прегледување на огласи за продажба на автомобили во Северна Македонија. Платформата овозможува на корисниците да:',
          '• Објавуваат огласи за продажба на автомобили',
          '• Прегледуваат и пребаруваат огласи за автомобили',
          '• Контактираат со продавачи преку информациите обезбедени на огласот',
          '• Креираат профили и управуваат со своите огласи',
          'Kupito делува само како посредник помеѓу продавачите и купачите. Платформата не учествува во вистинските трансакции меѓу корисниците и не гарантира ниту еден аспект на продажбата или автомобилот кој се продава.',
        ],
      },
      {
        id: '3',
        title: '3. Регистрација и сметка',
        content: [
          'За да објавите оглас, мора да создадете профил на Платформата. При регистрацијата, се согласувате да:',
          '• Обезбедите точни, целосни и ажурирани информации',
          '• Одржувате безбедност на вашата лозинка',
          '• Одговорно управувате со вашата сметка и сите активности на вашата сметка',
          '• Веднаш да не известите Kupito за секое неовластено користење на вашата сметка',
          '• Потврдите го вашиот телефон со СМС код за време на регистрацијата',
          'Секој корисник може да има само една активна сметка. Забрането е да се користи сметката на друг корисник или да се овозможи друг корисник да ја користи вашата сметка.',
          'За заштита од злоупотреба, Платформата применува ограничувања на бројот на обиди за верификација на СМС код. По 40 неуспешни обиди, IP адресата ќе биде блокирана за 1 час.',
          'Kupito резервира право да суспендира или затвори сметка која ги крши овие Услови или се користи на несоодветен начин.',
        ],
      },
      {
        id: '4',
        title: '4. Правила за објавување',
        content: [
          'При објавување на оглас на Платформата, се согласувате да:',
          '• Објавите само точни и целосни информации за автомобилот',
          '• Не објавувате лажни, измамнички или вводливи информации',
          '• Не објавувате огласи за автомобили кои не постојат, не се во ваша сопственост или не сте овластени да ги продавате',
          '• Користите само фотографии кои вистински прикажуваат автомобилот што се продава',
          '• Не објавувате дупликатни огласи за ист автомобил',
          '• Не објавувате содржина која е незаконска, навредлива, клеветничка, сексуално експлицитна, насилничка или на друг начин неприкладна',
          '• Почитувате интелектуална сопственост на други',
          'Kupito резервира право да отстрани секој оглас кој ги крши овие правила без претходно известување.',
        ],
      },
      {
        id: '5',
        title: '5. Одговорност на корисниците',
        content: [
          'Корисниците се единствено одговорни за:',
          '• Точноста и комплетноста на информациите обезбедени во нивните огласи',
          '• Комуникацијата и договорите меѓу продавачите и купачите',
          '• Сите аспекти на трансакциите, вклучувајќи ги проверката на возилото, испораката и плаќањето',
          '• Проверката на идентитетот и кредибилитетот на другите корисници',
          'Kupito не е одговорна за:',
          '• Квалитетот, безбедноста или законскоста на автомобилите објавени на Платформата',
          '• Способноста на корисниците да завршат трансакција',
          '• Точноста на информациите обезбедени од страна на корисниците',
          '• Какви било жалби, штети или загуби резултат од користење на Платформата или трансакција',
        ],
      },
      {
        id: '6',
        title: '6. Интелектуална сопственост',
        content: [
          'Сите права на интелектуална сопственост во врска со Платформата, вклучувајќи ги дизајнот, графиките, текстот, софтверот и другата содржина, се сопственост на Kupito или нејзините лиценци.',
          'Корисниците го задржуваат правото на интелектуална сопственост на содржината што ја објавуваат, но со објавување на Платформата, вие доделувате на Kupito неисклучива, светска, бесплатна лиценца за користење, репродуцирање, модифицирање и прикажување на таа содржина во врска со работењето на Платформата.',
          'Забрането е да се копира, репродуцира или дистрибуира содржина од Платформата без пишана дозвола од Kupito.',
        ],
      },
      {
        id: '7',
        title: '7. Заштита на лични податоци',
        content: [
          'Kupito собира и обработува лични податоци во согласност со својата Политика за приватност, која е составен дел од овие Услови.',
          'Со користење на Платформата, се согласувате со собирањето, обработката и користењето на вашите лични податоци како што е опишано во Политиката за приватност.',
          'Kupito ги заштитува личните податоци на корисниците во согласност со Законот за заштита на личните податоци на Република Северна Македонија и Општиот регулаторен уредба за заштита на податоците (GDPR).',
        ],
      },
      {
        id: '8',
        title: '8. Плаќања и комисија',
        content: [
          'Во моментов, користењето на основните функции на Платформата е бесплатно.',
          'Kupito резервира право да воведи платени услуги или комисија во иднина. Во тој случај, корисниците ќе бидат унапред известени за какви било промени во политиката за плаќања.',
          'Сите трансакции меѓу продавачите и купачите се одвиваат директно помеѓу нив. Kupito не учествува во плаќањата и не е одговорна за какви било финансиски трансакции.',
        ],
      },
      {
        id: '9',
        title: '9. Одговорност и одрекување',
        content: [
          'Платформата се обезбедува "како што е" и "како што е достапна" без гаранции од каква било врста, изразени или имплицирани.',
          'Kupito не гарантира дека:',
          '• Платформата ќе работи непрекинато или без грешки',
          '• Грешките ќе бидат поправени',
          '• Платформата е без вируси или други штетни компоненти',
          '• Информациите обезбедени од корисниците се точни или сигурни',
          'Kupito не носи одговорност за какви било директни, индиректни, случајни, посебни или посредни штети резултат од користење или невозможност за користење на Платформата.',
        ],
      },
      {
        id: '10',
        title: '10. Прекин на услугата',
        content: [
          'Kupito резервира право да прекине или суспендира пристап до Платформата за секој корисник кој ги крши овие Услови, без претходно известување.',
          'Корисниците можат да го прекинат својот профил во секое време со контактирање на поддршката на Kupito.',
          'По прекин на сметката, сите податоци поврзани со сметката може да се избришат во согласност со Политиката за приватност.',
        ],
      },
      {
        id: '11',
        title: '11. Изменување на условите',
        content: [
          'Kupito резервира право да ги измени овие Услови во секое време. Изменетите Услови ќе бидат објавени на Платформата со датум на последна ажурирање.',
          'Продолжувањето на користењето на Платформата по објавувањето на изменетите Услови се смета за прифаќање на новите Услови.',
          'Препорачано е редовно да се проверуваат овие Услови за какви било промени.',
        ],
      },
      {
        id: '12',
        title: '12. Разрешување спорови',
        content: [
          'Овие Услови се регулирани и толкувани во согласност со законите на Република Северна Македонија.',
          'Секој спор што произлегува од или е поврзан со овие Услови или користењето на Платформата ќе биде решен со арбитража во согласност со правилата на Арбитражниот суд при Економскиот комори на Северна Македонија.',
          'Корисниците се согласуваат да се обидат да го решат спорот директно со Kupito пред да започнат арбитражна постапка.',
        ],
      },
      {
        id: '13',
        title: '13. Разни одредби',
        content: [
          'Ако некој дел од овие Услови е пронајден како неважечки или неисполнлив, остатокот од Условите ќе остане во сила.',
          'Неисполнувањето на Kupito да примени некое право или одредба од овие Услови не претставува откажување од тоа право.',
          'Овие Услови претставуваат целосен договор меѓу вас и Kupito во врска со користењето на Платформата.',
        ],
      },
      {
        id: '14',
        title: '14. Контакт информации',
        content: [
          'За какви било прашања или забелешки во врска со овие Услови, ве молиме контактирајте не на:',
          'Е-пошта: support@kupito.mk',
          'Платформа: www.kupito.mk',
        ],
      },
    ],
  },
  en: {
    title: 'Terms and Conditions',
    lastUpdated: 'Last updated: ',
    languageToggle: 'Switch language',
    dictionary: {
      title: 'Glossary of Terms',
      terms: [
        {
          term: 'Platform',
          definition:
            'The Kupito website and application that enables posting and viewing of listings for the sale of vehicles.',
        },
        {
          term: 'User',
          definition: 'Any person using the Platform, including registered users and visitors.',
        },
        {
          term: 'Registered User',
          definition:
            'A user who has created a profile on the Platform with a valid email address and password.',
        },
        {
          term: 'Listing',
          definition:
            'A publication on the Platform containing information about a vehicle for sale.',
        },
        {
          term: 'Vehicle',
          definition:
            'A motor vehicle that is the subject of sale and is published on the Platform.',
        },
        {
          term: 'Seller',
          definition:
            'A natural or legal person who posts a listing for the sale of a vehicle on the Platform.',
        },
        {
          term: 'Buyer',
          definition: 'A person interested in purchasing a vehicle listed on the Platform.',
        },
        {
          term: 'Transaction',
          definition: 'The process of buying/selling a vehicle between the Seller and the Buyer.',
        },
        {
          term: 'Personal Data',
          definition: 'All information relating to an identified or identifiable natural person.',
        },
        {
          term: 'Terms of Use',
          definition: 'This document and all related policies and rules of the Platform.',
        },
      ],
    },
    toc: {
      title: 'Table of Contents',
      items: [
        { id: '1', title: '1. Acceptance of Terms' },
        { id: '2', title: '2. Service Description' },
        { id: '3', title: '3. Registration and Account' },
        { id: '4', title: '4. Posting Rules' },
        { id: '5', title: '5. User Responsibilities' },
        { id: '6', title: '6. Intellectual Property' },
        { id: '7', title: '7. Data Protection' },
        { id: '8', title: '8. Payments and Fees' },
        { id: '9', title: '9. Liability and Disclaimer' },
        { id: '10', title: '10. Service Termination' },
        { id: '11', title: '11. Modification of Terms' },
        { id: '12', title: '12. Dispute Resolution' },
        { id: '13', title: '13. Miscellaneous Provisions' },
        { id: '14', title: '14. Contact Information' },
      ],
    },
    sections: [
      {
        id: '1',
        title: '1. Acceptance of Terms',
        content: [
          'By accessing and using the Kupito Platform, you agree to comply with and be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the Platform.',
          'These Terms apply to all users of the Platform, including visitors, registered users, and users who post listings.',
          'By registering an account or using the Platform, you represent that you are at least 18 years old and have the legal capacity to enter into legally binding contracts.',
        ],
      },
      {
        id: '2',
        title: '2. Service Description',
        content: [
          'Kupito is a platform for posting and viewing listings for the sale of vehicles in North Macedonia. The Platform enables users to:',
          '• Post listings for the sale of vehicles',
          '• Browse and search for vehicle listings',
          '• Contact sellers through the information provided in the listing',
          '• Create profiles and manage their listings',
          'Kupito acts solely as an intermediary between sellers and buyers. The Platform does not participate in actual transactions between users and does not guarantee any aspect of the sale or the vehicle being sold.',
        ],
      },
      {
        id: '3',
        title: '3. Registration and Account',
        content: [
          'To post a listing, you must create a profile on the Platform. When registering, you agree to:',
          '• Provide accurate, complete, and updated information',
          '• Maintain the security of your password',
          '• Take responsibility for managing your account and all activities on your account',
          '• Immediately notify Kupito of any unauthorized use of your account',
          '• Verify your phone number with SMS code during registration',
          "Each user may have only one active account. It is prohibited to use another user's account or to allow another user to use your account.",
          'To protect against abuse, the Platform applies limitations on the number of SMS code verification attempts. After 40 failed attempts, the IP address will be blocked for 1 hour.',
          'Kupito reserves the right to suspend or close an account that violates these Terms or is used in an inappropriate manner.',
        ],
      },
      {
        id: '4',
        title: '4. Posting Rules',
        content: [
          'When posting a listing on the Platform, you agree to:',
          '• Post only accurate and complete information about the vehicle',
          '• Not post false, fraudulent, or misleading information',
          '• Not post listings for vehicles that do not exist, are not owned by you, or you are not authorized to sell',
          '• Use only photographs that accurately depict the vehicle being sold',
          '• Not post duplicate listings for the same vehicle',
          '• Not post content that is illegal, offensive, defamatory, sexually explicit, violent, or otherwise inappropriate',
          '• Respect the intellectual property of others',
          'Kupito reserves the right to remove any listing that violates these rules without prior notice.',
        ],
      },
      {
        id: '5',
        title: '5. User Responsibilities',
        content: [
          'Users are solely responsible for:',
          '• The accuracy and completeness of information provided in their listings',
          '• Communication and agreements between sellers and buyers',
          '• All aspects of transactions, including vehicle inspection, delivery, and payment',
          '• Verifying the identity and credibility of other users',
          'Kupito is not responsible for:',
          '• The quality, safety, or legality of vehicles listed on the Platform',
          "• Users' ability to complete a transaction",
          '• The accuracy of information provided by users',
          '• Any complaints, damages, or losses resulting from the use of the Platform or a transaction',
        ],
      },
      {
        id: '6',
        title: '6. Intellectual Property',
        content: [
          'All intellectual property rights in relation to the Platform, including the design, graphics, text, software, and other content, are the property of Kupito or its licensors.',
          'Users retain intellectual property rights to the content they post, but by posting on the Platform, you grant Kupito a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display that content in connection with the operation of the Platform.',
          'It is prohibited to copy, reproduce, or distribute content from the Platform without written permission from Kupito.',
        ],
      },
      {
        id: '7',
        title: '7. Data Protection',
        content: [
          'Kupito collects and processes personal data in accordance with its Privacy Policy, which is an integral part of these Terms.',
          'By using the Platform, you agree to the collection, processing, and use of your personal data as described in the Privacy Policy.',
          "Kupito protects users' personal data in accordance with the Personal Data Protection Law of the Republic of North Macedonia and the General Data Protection Regulation (GDPR).",
        ],
      },
      {
        id: '8',
        title: '8. Payments and Fees',
        content: [
          'Currently, the use of basic Platform features is free.',
          'Kupito reserves the right to introduce paid services or fees in the future. In such case, users will be notified in advance of any changes to the payment policy.',
          'All transactions between sellers and buyers occur directly between them. Kupito does not participate in payments and is not responsible for any financial transactions.',
        ],
      },
      {
        id: '9',
        title: '9. Liability and Disclaimer',
        content: [
          'The Platform is provided "as is" and "as available" without warranties of any kind, express or implied.',
          'Kupito does not guarantee that:',
          '• The Platform will operate continuously or without errors',
          '• Errors will be corrected',
          '• The Platform is free from viruses or other harmful components',
          '• Information provided by users is accurate or secure',
          'Kupito is not liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the Platform.',
        ],
      },
      {
        id: '10',
        title: '10. Service Termination',
        content: [
          'Kupito reserves the right to terminate or suspend access to the Platform for any user who violates these Terms, without prior notice.',
          'Users may terminate their profile at any time by contacting Kupito support.',
          'Upon account termination, all data associated with the account may be deleted in accordance with the Privacy Policy.',
        ],
      },
      {
        id: '11',
        title: '11. Modification of Terms',
        content: [
          'Kupito reserves the right to modify these Terms at any time. Modified Terms will be published on the Platform with a last updated date.',
          'Continued use of the Platform after the publication of modified Terms is considered acceptance of the new Terms.',
          'It is recommended to regularly check these Terms for any changes.',
        ],
      },
      {
        id: '12',
        title: '12. Dispute Resolution',
        content: [
          'These Terms are governed by and interpreted in accordance with the laws of the Republic of North Macedonia.',
          'Any dispute arising from or relating to these Terms or the use of the Platform will be resolved by arbitration in accordance with the rules of the Arbitration Court at the Economic Chamber of North Macedonia.',
          'Users agree to attempt to resolve the dispute directly with Kupito before initiating arbitration proceedings.',
        ],
      },
      {
        id: '13',
        title: '13. Miscellaneous Provisions',
        content: [
          'If any part of these Terms is found to be invalid or unenforceable, the remainder of the Terms will remain in effect.',
          "Kupito's failure to enforce any right or provision of these Terms does not constitute a waiver of that right.",
          'These Terms constitute the entire agreement between you and Kupito regarding the use of the Platform.',
        ],
      },
      {
        id: '14',
        title: '14. Contact Information',
        content: [
          'For any questions or comments regarding these Terms, please contact us at:',
          'Email: support@kupito.mk',
          'Platform: www.kupito.mk',
        ],
      },
    ],
  },
};

export default function TermsPage() {
  const [language, setLanguage] = useState<Language>('mk');
  const currentTerms = terms[language];
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
          {currentTerms.title}
        </h1>
        <button
          onClick={() => setLanguage(language === 'mk' ? 'en' : 'mk')}
          className="px-4 py-2 bg-bg-light border-2 border-primary-500/30 rounded-lg hover:bg-bg-light/80 hover:border-primary-500 transition-all duration-200 text-white font-medium"
        >
          {language === 'mk' ? 'EN' : 'MK'}
        </button>
      </div>

      <p className="text-gray-400 mb-8 text-sm">
        {currentTerms.lastUpdated}
        {currentDate}
      </p>

      <div className="bg-bg-light rounded-xl p-6 md:p-8 mb-8 border border-primary-500/20">
        <h2 className="text-2xl font-bold mb-4 text-primary-400">
          {currentTerms.dictionary.title}
        </h2>
        <div className="space-y-4">
          {currentTerms.dictionary.terms.map((item, index) => (
            <div key={index} className="border-b border-primary-500/10 pb-4 last:border-b-0">
              <h3 className="font-semibold text-primary-300 mb-1">{item.term}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{item.definition}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-bg-light rounded-xl p-6 md:p-8 mb-8 border border-primary-500/20">
        <h2 className="text-2xl font-bold mb-4 text-primary-400">{currentTerms.toc.title}</h2>
        <nav className="space-y-2">
          {currentTerms.toc.items.map((item) => (
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
        {currentTerms.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="bg-bg-light rounded-xl p-6 md:p-8 border border-primary-500/20 scroll-mt-20"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-primary-400">
              {section.title}
            </h2>
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

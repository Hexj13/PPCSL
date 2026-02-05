export type FAQItem = {
  id: string;
  question: string;
  answer: string | string[];
};

export type FAQScenario = {
  id: string;
  title: string;
  steps: string[];
};

export type FAQConfig = {
  items: FAQItem[];
  scenarios: FAQScenario[];
};

export type FAQConfigWithLanguages = {
  ro?: FAQConfig;
  ru?: FAQConfig;
  en?: FAQConfig;
};

const faqConfig: FAQConfigWithLanguages = {
  ro: {
    items: [
      {
        id: "1",
        question: "Ce este Kupito?",
        answer:
          "Kupito este o platformă gratuită, necomercială pentru publicarea și vizualizarea anunțurilor de vânzare de autoturisme în Moldova. Platforma permite utilizatorilor să publice anunțuri de vânzare de autoturisme gratuit și să caute anunțuri existente.",
      },
      {
        id: "2",
        question: "Este gratuit să folosesc Kupito?",
        answer:
          "Da, Kupito este o platformă complet gratuită. Nu percepem comisioane, taxe sau orice alte plăți pentru publicarea anunțurilor, vizualizarea anunțurilor sau utilizarea oricăror funcții.",
      },
      {
        id: "3",
        question: "Cum mă pot înregistra?",
        answer: [
          "Pentru a vă înregistra pe Kupito:",
          '1. Faceți clic pe butonul "Înregistrare" din colțul din dreapta sus',
          "2. Selectați dacă sunteți persoană fizică sau juridică",
          "3. Completați formularul: telefon (obligatoriu), parolă (obligatoriu), mesajere (opțional: Viber, WhatsApp, Telegram). Pentru persoana juridică — și denumirea companiei (obligatoriu)",
          "4. Acceptați termenii și condițiile și trimiteți formularul",
          "5. Confirmați telefonul cu codul SMS pe care îl veți primi",
          '6. Pe pasul următor puteți completa numele, prenumele, emailul (opțional) sau să săriți și să le completați mai târziu în "Profil"',
          "7. Dacă ați introdus emailul, confirmați-l cu linkul pe care îl veți primi",
          "După înregistrarea cu succes, puteți începe să publicați anunțuri.",
        ],
      },
      {
        id: "4",
        question: "Cum public un anunț de vânzare pentru un autoturism?",
        answer: [
          "Pentru a publica un anunț de vânzare pentru un autoturism:",
          "1. Conectați-vă la profilul dvs.",
          '2. Faceți clic pe "Adaugă anunț" din meniul de sus (sau mergeți la "Anunțurile mele" și faceți clic pe "Creează anunț")',
          "3. Completați toate informațiile necesare despre autoturism:",
          "   - Marca și modelul",
          "   - Anul de fabricație",
          "   - Prețul",
          "   - Orașul",
          "   - Detalii tehnice (putere, tip de tracțiune, tip de caroserie, etc.)",
          "   - Descrierea autoturismului",
          "   - Fotografii (minimum 2, maximum 20)",
          '4. Selectați statusul anunțului (implicit este "Publicat", dar puteți selecta "Pauzat temporar")',
          '5. Faceți clic pe "Creează anunț"',
          "Anunțul va fi creat cu statusul selectat. Puteți să îl editați în orice moment.",
        ],
      },
      {
        id: "5",
        question: "Cum public (publicizez) anunțul meu?",
        answer: [
          "La crearea unui anunț, puteți selecta statusul:",
          '• "Publicat" - anunțul va fi imediat activ și vizibil pentru toți vizitatorii',
          '• "Pauzat temporar" - anunțul nu va fi vizibil în rezultatele căutării',
          'Dacă anunțul este pauzat temporar și doriți să îl publicați din nou, mergeți la "Anunțurile mele", găsiți anunțul pauzat temporar și faceți clic pe butonul "Publică".',
        ],
      },
      {
        id: "6",
        question: "Cum păzez temporar anunțul meu?",
        answer: [
          "Dacă doriți să păzeți temporar anunțul dvs. (de exemplu, dacă autoturismul este temporar indisponibil):",
          "1. Conectați-vă la profilul dvs.",
          '2. Mergeți la "Anunțurile mele"',
          "3. Găsiți anunțul activ pe care doriți să îl păzeți",
          '4. Faceți clic pe butonul "Pauzează temporar"',
          "Anunțurile pauzate temporar nu sunt vizibile în rezultatele căutării, dar le puteți publica din nou când doriți.",
        ],
      },
      {
        id: "7",
        question: "Cum închid anunțul meu?",
        answer: [
          "Dacă doriți să închideți anunțul dvs. (de exemplu, dacă autoturismul a fost vândut):",
          "1. Conectați-vă la profilul dvs.",
          '2. Mergeți la "Anunțurile mele"',
          "3. Găsiți anunțul pe care doriți să îl închideți",
          '4. Faceți clic pe butonul "Închide"',
          "Anunțul va fi imediat închis. Anunțurile închise nu pot fi editate sau publicate din nou. Anunțul va rămâne vizibil pe platformă, dar va fi marcat ca închis.",
        ],
      },
      {
        id: "8",
        question: "Pot edita anunțul meu după publicare?",
        answer:
          'Da, puteți edita anunțurile dvs. cât timp sunt active sau pauzate temporar. Anunțurile închise nu pot fi editate. Pentru a edita un anunț, mergeți la "Anunțurile mele", găsiți anunțul și faceți clic pe "Editează".',
      },
      {
        id: "9",
        question: "Câte anunțuri pot avea simultan?",
        answer:
          "Puteți avea maximum 100 de anunțuri active simultan. Anunțurile pauzate temporar nu sunt numărate în această limită. Anunțurile sunt închise automat după 5 luni de la ultima actualizare.",
      },
      {
        id: "10",
        question: "Câte fotografii pot adăuga la un anunț?",
        answer:
          "Puteți adăuga minimum 2 și maximum 20 de fotografii la fiecare anunț. Recomandăm să adăugați cât mai multe fotografii din diferite unghiuri pentru o prezentare mai bună a autoturismului.",
      },
      {
        id: "11",
        question: "Cum pot contacta vânzătorul?",
        answer:
          "Când găsiți un anunț care vă interesează, puteți contacta vânzătorul prin numărul de telefon sau prin mesageriile (Viber, WhatsApp, Telegram) care sunt afișate pe anunț.",
      },
      {
        id: "12",
        question: "Kupito participă la tranzacții?",
        answer:
          "Nu, Kupito acționează doar ca intermediar între vânzători și cumpărători. Platforma nu participă la tranzacțiile reale, nu percepe comisioane și nu garantează niciun aspect al vânzării sau al autoturismului. Toate tranzacțiile se desfășoară direct între vânzător și cumpărător.",
      },
      {
        id: "13",
        question: "Ce trebuie să fac dacă găsesc un anunț fals sau fraudulos?",
        answer:
          "Dacă găsiți un anunț pe care îl considerați fals sau fraudulos, vă rugăm să ne contactați imediat la support@kupito.club cu detalii despre anunț. Vom examina cazul și vom lua măsuri corespunzătoare.",
      },
      {
        id: "14",
        question: "Cum îmi schimb numărul de telefon?",
        answer: [
          "Pentru a vă schimba numărul de telefon:",
          "1. Conectați-vă la profilul dvs.",
          '2. Mergeți la "Profil"',
          '3. Faceți clic pe "Schimbă telefon"',
          "4. Introduceți noul număr de telefon",
          "5. Confirmați noul număr cu codul SMS pe care îl veți primi",
          "Noul număr de telefon trebuie să fie unic și verificat.",
        ],
      },
      {
        id: "15",
        question: "Cum îmi șterg profilul?",
        answer:
          "Pentru a vă șterge profilul, vă rugăm să ne contactați la support@kupito.club. După ștergerea profilului, toate datele dvs. personale vor fi șterse, iar anunțurile dvs. vor rămâne pe platformă, dar fără informații de contact.",
      },
      {
        id: "16",
        question: "Pot publica un anunț fără înregistrare?",
        answer:
          "Nu, pentru a publica un anunț trebuie să vă înregistrați și să creați un profil pe platformă. Acest lucru este necesar pentru securitate și pentru a putea gestiona anunțurile dvs.",
      },
      {
        id: "17",
        question: "Ce înseamnă statusul anunțului?",
        answer: [
          "Anunțurile pot avea trei statusuri:",
          "• Activ (Active) - anunțul este publicat și vizibil pentru toți vizitatorii",
          "• Pauzat temporar (Paused) - anunțul este pauzat temporar, nu este vizibil în rezultatele căutării",
          "• Închis (Closed) - anunțul este închis, nu poate fi editat sau publicat din nou",
        ],
      },
      {
        id: "18",
        question: "Cum caut anunțuri?",
        answer: [
          "Pentru a căuta anunțuri pe Kupito:",
          "1. Folosiți câmpul de căutare de pe pagina principală",
          "2. Puteți filtra după:",
          "   - Marca și modelul",
          "   - Orașul",
          "   - Prețul (de la - până la)",
          "   - Anul de fabricație",
          "   - Tipul de tracțiune",
          "   - Tipul de caroserie",
          "   - Starea (avariat/neavariat)",
          "3. Puteți sorta rezultatele după preț, data publicării, etc.",
          "4. Faceți clic pe un anunț pentru a vedea mai multe detalii",
        ],
      },
      {
        id: "19",
        question: "Cum salvez filtrele de căutare?",
        answer: [
          "Pentru a salva filtrele dvs. de căutare:",
          "1. Conectați-vă la profilul dvs.",
          "2. Setați filtrele pe care doriți să le salvați (marcă, model, preț, oraș, etc.)",
          '3. Faceți clic pe butonul "Adaugă la favorite" (cu iconița de inimă)',
          "4. Introduceți un nume pentru filtru (maximum 100 de caractere)",
          '5. Faceți clic pe "Salvează"',
          'Puteți salva maximum 20 de filtre. Filtrele salvate le puteți vedea, edita și șterge pe pagina "Favorite" → fila "Filtre". Pe fila "Filtre" veți vedea un contor cu numărul de filtre salvate.',
        ],
      },
      {
        id: "20",
        question: "Cum compar autoturisme?",
        answer: [
          "Pentru a compara autoturisme pe Kupito:",
          "1. Mergeți la pagina anunțului pentru autoturismul pe care doriți să îl comparați",
          '2. Faceți clic pe butonul "Compară" (cu iconița de cântar) sub butonul "Adaugă la favorite"',
          "3. Puteți adăuga până la 3 autoturisme pentru comparație",
          '4. Când adăugați un autoturism în comparație, butonul va deveni "Deja în comparație" și va fi dezactivat',
          '5. Faceți clic pe "Comparație" din meniul de sus pentru a vedea toate autoturismele adăugate',
          "6. Pe pagina de comparație veți vedea un tabel detaliat cu toate specificațiile tehnice, caracteristicile și prețurile",
          "7. Puteți elimina un autoturism din comparație făcând clic pe iconița de ștergere",
          '8. Puteți șterge toate autoturismele din comparație cu butonul "Șterge"',
          "Dacă nu sunteți conectat, puteți adăuga autoturisme în comparație, dar veți fi redirecționat către pagina de conectare. După conectare, autoturismele vor fi adăugate automat în comparație.",
          "Datele de comparație sunt stocate local și sunt șterse la deconectare.",
        ],
      },
      {
        id: "21",
        question: "Cum filtrez anunțurile mele după status?",
        answer: [
          'Pe pagina "Anunțurile mele" puteți filtra anunțurile dvs. după status:',
          "1. Conectați-vă la profilul dvs.",
          '2. Mergeți la "Anunțurile mele"',
          '3. Deasupra listei de anunțuri veți vedea filtrele: "Toate", "Active", "Pauzate temporar", "Închise"',
          '4. Fiecare filtru (cu excepția "Toate") are un contor care arată câte anunțuri aveți cu acel status',
          "5. Faceți clic pe filtru pentru a vedea doar anunțurile cu statusul selectat",
          "Filtrul activ este marcat cu un fundal verde.",
        ],
      },
      {
        id: "22",
        question: "Ce este tabla de anunțuri a vânzătorului?",
        answer: [
          "Tabla de anunțuri este o pagină publică pe care fiecare vânzător o are. Pe această pagină sunt afișate toate anunțurile active ale vânzătorului.",
          "Cum puteți deschide tabla unui vânzător:",
          "• Pe pagina unui anunț: în blocul de contact al vânzătorului, dacă vânzătorul are mai mult de un anunț activ, apăsați pe „Vezi toate anunțurile vânzătorului”. Linkul se deschide într-o filă nouă.",
          "• Dacă sunteți vânzător: în „Anunțurile mele” apăsați pe „Tabla mea de anunțuri” pentru a deschide propria pagină.",
          "Puteți partaja linkul către tabla dvs. în mesagerii sau rețele sociale, ca să afișați toate anunțurile într-un singur loc.",
        ],
      },
      {
        id: "23",
        question: "Există o aplicație mobilă pentru Kupito?",
        answer: [
          "Kupito este o Progressive Web App (PWA), ceea ce înseamnă că o puteți instala pe telefonul dvs. ca aplicație mobilă:",
          '• Pentru Android: Faceți clic pe butonul "Aplicație mobilă" din subsol și urmați instrucțiunile',
          '• Pentru iOS: Faceți clic pe butonul "Aplicație mobilă" din subsol și urmați instrucțiunile pentru adăugarea pe ecranul de start',
          "• Aplicația instalată funcționează offline și oferă acces mai rapid la platformă",
          "• Aplicația se actualizează automat când există o nouă versiune",
          "• Nu este necesar să o descărcați din App Store sau Google Play - instalarea este direct de pe site-ul web",
        ],
      },
    ],
    scenarios: [
      {
        id: "scenario-1",
        title: "Scenariul 1: Publicarea unui anunț nou",
        steps: [
          "Înregistrați-vă sau conectați-vă la profilul dvs.",
          'Faceți clic pe "Adaugă anunț" din meniul de sus (sau mergeți la "Anunțurile mele" și faceți clic pe "Creează anunț")',
          "Completați toate informațiile necesare despre autoturism",
          "Adăugați fotografii (minimum 2, maximum 20)",
          'Selectați statusul anunțului (implicit este "Publicat")',
          'Faceți clic pe "Creează anunț"',
          "Anunțul dvs. va fi creat cu statusul selectat",
        ],
      },
      {
        id: "scenario-2",
        title: "Scenariul 2: Închiderea unui anunț după vânzare",
        steps: [
          "Conectați-vă la profilul dvs.",
          'Mergeți la "Anunțurile mele"',
          "Găsiți anunțul pentru autoturismul pe care l-ați vândut",
          'Faceți clic pe butonul "Închide"',
          "Anunțul va fi imediat închis și nu poate fi editat sau publicat din nou",
        ],
      },
      {
        id: "scenario-3",
        title: "Scenariul 3: Pauzare temporară și republicare",
        steps: [
          "Conectați-vă la profilul dvs.",
          'Mergeți la "Anunțurile mele"',
          "Găsiți anunțul activ pe care doriți să îl păzeți temporar",
          'Faceți clic pe "Pauzează temporar"',
          "Anunțul nu mai este vizibil în rezultatele căutării",
          'Când doriți să îl publicați din nou, găsiți anunțul pauzat temporar și faceți clic pe "Publică"',
          "Anunțul este din nou activ și vizibil",
        ],
      },
      {
        id: "scenario-4",
        title: "Scenariul 4: Editarea unui anunț activ",
        steps: [
          "Conectați-vă la profilul dvs.",
          'Mergeți la "Anunțurile mele"',
          "Găsiți anunțul activ pe care doriți să îl editați",
          'Faceți clic pe "Editează"',
          "Faceți modificările necesare (preț, descriere, fotografii, etc.)",
          'Faceți clic pe "Salvează"',
          "Modificările sunt aplicate anunțului",
        ],
      },
    ],
  },
  ru: {
    items: [
      {
        id: "1",
        question: "Что такое Kupito?",
        answer:
          "Kupito - это бесплатная некоммерческая платформа для размещения и просмотра объявлений о продаже автомобилей в Молдове. Платформа позволяет пользователям бесплатно размещать объявления о продаже автомобилей и искать существующие объявления.",
      },
      {
        id: "2",
        question: "Бесплатно ли использовать Kupito?",
        answer:
          "Да, Kupito полностью бесплатная платформа. Мы не взимаем комиссию, сборы или какие-либо платежи за размещение объявлений, просмотр объявлений или использование каких-либо функций.",
      },
      {
        id: "3",
        question: "Как зарегистрироваться?",
        answer: [
          "Для регистрации на Kupito:",
          '1. Нажмите на кнопку "Регистрация" в правом верхнем углу',
          "2. Выберите тип: физическое или юридическое лицо",
          "3. Заполните форму: телефон (обязательно), пароль (обязательно), при желании — мессенджеры (Viber, WhatsApp, Telegram). Для юрлица также название компании (обязательно)",
          "4. Примите условия использования и отправьте форму",
          "5. Подтвердите телефон с помощью SMS-кода, который придёт на указанный номер",
          "6. На следующем шаге можно указать имя, фамилию, email (по желанию) или пропустить и заполнить позже в «Профиле»",
          "7. Если указали email — подтвердите его по ссылке из письма",
          "После успешной регистрации вы можете размещать объявления.",
        ],
      },
      {
        id: "4",
        question: "Как разместить объявление о продаже автомобиля?",
        answer: [
          "Чтобы разместить объявление о продаже автомобиля:",
          "1. Войдите в свой профиль",
          '2. Нажмите на "Добавить объявление" в верхнем меню (или перейдите в "Мои объявления" и нажмите "Создать объявление")',
          "3. Заполните всю необходимую информацию об автомобиле:",
          "   - Марка и модель",
          "   - Год выпуска",
          "   - Цена",
          "   - Город",
          "   - Технические детали (мощность, тип привода, тип кузова и т.д.)",
          "   - Описание автомобиля",
          "   - Фотографии (минимум 2, максимум 20)",
          '4. Выберите статус объявления (по умолчанию "Опубликовано", но вы можете выбрать "Временно приостановлено")',
          '5. Нажмите на "Создать объявление"',
          "Объявление будет создано с выбранным статусом. Вы можете редактировать его в любое время.",
        ],
      },
      {
        id: "5",
        question: "Как опубликовать мое объявление?",
        answer: [
          "При создании объявления вы можете выбрать статус:",
          '• "Опубликовано" - объявление сразу будет активным и видимым для всех посетителей',
          '• "Временно приостановлено" - объявление не будет видно в результатах поиска',
          'Если объявление временно приостановлено и вы хотите опубликовать его снова, перейдите в "Мои объявления", найдите временно приостановленное объявление и нажмите кнопку "Опубликовать".',
        ],
      },
      {
        id: "6",
        question: "Как временно приостановить мое объявление?",
        answer: [
          "Если вы хотите временно приостановить ваше объявление (например, если автомобиль временно недоступен):",
          "1. Войдите в свой профиль",
          '2. Перейдите в "Мои объявления"',
          "3. Найдите активное объявление, которое хотите приостановить",
          '4. Нажмите на кнопку "Временно приостановить"',
          "Временно приостановленные объявления не видны в результатах поиска, но вы можете опубликовать их снова, когда захотите.",
        ],
      },
      {
        id: "7",
        question: "Как закрыть мое объявление?",
        answer: [
          "Если вы хотите закрыть ваше объявление (например, если автомобиль продан):",
          "1. Войдите в свой профиль",
          '2. Перейдите в "Мои объявления"',
          "3. Найдите объявление, которое хотите закрыть",
          '4. Нажмите на кнопку "Закрыть"',
          "Объявление будет немедленно закрыто. Закрытые объявления нельзя редактировать или публиковать снова. Объявление останется видимым на платформе, но будет помечено как закрытое.",
        ],
      },
      {
        id: "8",
        question: "Могу ли я редактировать мое объявление после публикации?",
        answer:
          'Да, вы можете редактировать ваши объявления, пока они активны или временно приостановлены. Закрытые объявления нельзя редактировать. Чтобы отредактировать объявление, перейдите в "Мои объявления", найдите объявление и нажмите "Редактировать".',
      },
      {
        id: "9",
        question: "Сколько объявлений я могу иметь одновременно?",
        answer:
          "Вы можете иметь максимум 100 активных объявлений одновременно. Временно приостановленные объявления не учитываются в этом лимите. Объявления автоматически закрываются через 5 месяцев после последнего обновления.",
      },
      {
        id: "10",
        question: "Сколько фотографий я могу добавить к объявлению?",
        answer:
          "Вы можете добавить минимум 2 и максимум 20 фотографий к каждому объявлению. Рекомендуем добавить как можно больше фотографий с разных ракурсов для лучшей презентации автомобиля.",
      },
      {
        id: "11",
        question: "Как связаться с продавцом?",
        answer:
          "Когда вы найдете объявление, которое вас интересует, вы можете связаться с продавцом по телефону или через мессенджеры (Viber, WhatsApp, Telegram), которые указаны в объявлении.",
      },
      {
        id: "12",
        question: "Участвует ли Kupito в сделках?",
        answer:
          "Нет, Kupito действует только как посредник между продавцами и покупателями. Платформа не участвует в реальных сделках, не взимает комиссию и не гарантирует никаких аспектов продажи или автомобиля. Все сделки происходят напрямую между продавцом и покупателем.",
      },
      {
        id: "13",
        question:
          "Что делать, если я найду поддельное или мошенническое объявление?",
        answer:
          "Если вы найдете объявление, которое считаете поддельным или мошенническим, пожалуйста, немедленно свяжитесь с нами по адресу support@kupito.club с деталями об объявлении. Мы рассмотрим случай и примем соответствующие меры.",
      },
      {
        id: "14",
        question: "Как изменить мой номер телефона?",
        answer: [
          "Чтобы изменить номер телефона:",
          "1. Войдите в свой профиль",
          '2. Перейдите в "Профиль"',
          '3. Нажмите на "Изменить телефон"',
          "4. Введите новый номер телефона",
          "5. Подтвердите новый номер с помощью SMS-кода, который вы получите",
          "Новый номер телефона должен быть уникальным и подтвержденным.",
        ],
      },
      {
        id: "15",
        question: "Как удалить мой профиль?",
        answer:
          "Чтобы удалить ваш профиль, пожалуйста, свяжитесь с нами по адресу support@kupito.club. После удаления профиля все ваши личные данные будут удалены, а ваши объявления останутся на платформе, но без контактной информации.",
      },
      {
        id: "16",
        question: "Могу ли я разместить объявление без регистрации?",
        answer:
          "Нет, для размещения объявления необходимо зарегистрироваться и создать профиль на платформе. Это необходимо для безопасности и для управления вашими объявлениями.",
      },
      {
        id: "17",
        question: "Что означает статус объявления?",
        answer: [
          "Объявления могут иметь три статуса:",
          "• Активное (Active) - объявление опубликовано и видно всем посетителям",
          "• Временно приостановлено (Paused) - объявление временно приостановлено, не видно в результатах поиска",
          "• Закрыто (Closed) - объявление закрыто, нельзя редактировать или публиковать снова",
        ],
      },
      {
        id: "18",
        question: "Как искать объявления?",
        answer: [
          "Чтобы искать объявления на Kupito:",
          "1. Используйте поле поиска на главной странице",
          "2. Вы можете фильтровать по:",
          "   - Марке и модели",
          "   - Городу",
          "   - Цене (от - до)",
          "   - Году выпуска",
          "   - Типу привода",
          "   - Типу кузова",
          "   - Состоянию (поврежден/неповрежден)",
          "3. Вы можете сортировать результаты по цене, дате публикации и т.д.",
          "4. Нажмите на объявление, чтобы увидеть больше деталей",
        ],
      },
      {
        id: "19",
        question: "Как сохранить фильтры поиска?",
        answer: [
          "Чтобы сохранить ваши фильтры поиска:",
          "1. Войдите в свой профиль",
          "2. Установите фильтры, которые хотите сохранить (марка, модель, цена, город и т.д.)",
          '3. Нажмите на кнопку "Добавить в избранное" (с иконкой сердца)',
          "4. Введите имя для фильтра (максимум 100 символов)",
          '5. Нажмите на "Сохранить"',
          'Вы можете сохранить максимум 20 фильтров. Сохраненные фильтры вы можете просматривать, редактировать и удалять на странице "Избранное" → вкладка "Фильтры". На вкладке "Фильтры" вы увидите счетчик с количеством сохраненных фильтров.',
        ],
      },
      {
        id: "20",
        question: "Как сравнивать автомобили?",
        answer: [
          "Чтобы сравнивать автомобили на Kupito:",
          "1. Перейдите на страницу объявления автомобиля, который хотите сравнить",
          '2. Нажмите на кнопку "Сравнить" (с иконкой весов) под кнопкой "Добавить в избранное"',
          "3. Вы можете добавить до 3 автомобилей для сравнения",
          '4. Когда вы добавите автомобиль в сравнение, кнопка станет "Уже в сравнении" и будет отключена',
          '5. Нажмите на "Сравнение" в верхнем меню, чтобы увидеть все добавленные автомобили',
          "6. На странице сравнения вы увидите подробную таблицу со всеми техническими характеристиками, особенностями и ценами",
          "7. Вы можете удалить автомобиль из сравнения, нажав на иконку удаления",
          '8. Вы можете очистить все автомобили из сравнения кнопкой "Очистить"',
          "Если вы не вошли в систему, вы можете добавить автомобили в сравнение, но будете перенаправлены на страницу входа. После входа автомобили будут автоматически добавлены в сравнение.",
          "Данные сравнения хранятся локально и удаляются при выходе.",
        ],
      },
      {
        id: "21",
        question: "Как фильтровать мои объявления по статусу?",
        answer: [
          'На странице "Мои объявления" вы можете фильтровать ваши объявления по статусу:',
          "1. Войдите в свой профиль",
          '2. Перейдите в "Мои объявления"',
          '3. Над списком объявлений вы увидите фильтры: "Все", "Активные", "Временно приостановленные", "Закрытые"',
          '4. Каждый фильтр (кроме "Все") имеет счетчик, который показывает, сколько объявлений у вас с этим статусом',
          "5. Нажмите на фильтр, чтобы увидеть только объявления с выбранным статусом",
          "Активный фильтр отмечен зеленым фоном.",
        ],
      },
      {
        id: "22",
        question: "Что такое доска объявлений продавца?",
        answer: [
          "Доска объявлений — это публичная страница каждого продавца. На ней отображаются все активные объявления этого продавца.",
          "Как открыть доску продавца:",
          "• На странице объявления: в блоке контактов продавца, если у продавца больше одного активного объявления, нажмите «Посмотреть все объявления продавца». Ссылка откроется в новой вкладке.",
          "• Если вы продавец: в «Мои объявления» нажмите «Моя доска объявлений», чтобы открыть свою страницу.",
          "Ссылку на свою доску можно отправить в мессенджеры или соцсети, чтобы показать все объявления в одном месте.",
        ],
      },
      {
        id: "23",
        question: "Существует ли мобильное приложение для Kupito?",
        answer: [
          "Kupito - это Progressive Web App (PWA), что означает, что вы можете установить его на свой телефон как мобильное приложение:",
          '• Для Android: Нажмите на кнопку "Мобильное приложение" в футере и следуйте инструкциям',
          '• Для iOS: Нажмите на кнопку "Мобильное приложение" в футере и следуйте инструкциям по добавлению на главный экран',
          "• Установленное приложение работает офлайн и обеспечивает более быстрый доступ к платформе",
          "• Приложение автоматически обновляется при наличии новой версии",
          "• Не нужно загружать его из App Store или Google Play - установка происходит прямо с веб-сайта",
        ],
      },
    ],
    scenarios: [
      {
        id: "scenario-1",
        title: "Сценарий 1: Публикация нового объявления",
        steps: [
          "Зарегистрируйтесь или войдите в свой профиль",
          'Нажмите на "Добавить объявление" в верхнем меню (или перейдите в "Мои объявления" и нажмите "Создать объявление")',
          "Заполните всю необходимую информацию об автомобиле",
          "Добавьте фотографии (минимум 2, максимум 20)",
          'Выберите статус объявления (по умолчанию "Опубликовано")',
          'Нажмите на "Создать объявление"',
          "Ваше объявление будет создано с выбранным статусом",
        ],
      },
      {
        id: "scenario-2",
        title: "Сценарий 2: Закрытие объявления после продажи",
        steps: [
          "Войдите в свой профиль",
          'Перейдите в "Мои объявления"',
          "Найдите объявление автомобиля, который вы продали",
          'Нажмите на кнопку "Закрыть"',
          "Объявление будет немедленно закрыто и не может быть отредактировано или опубликовано снова",
        ],
      },
      {
        id: "scenario-3",
        title: "Сценарий 3: Временная приостановка и повторная публикация",
        steps: [
          "Войдите в свой профиль",
          'Перейдите в "Мои объявления"',
          "Найдите активное объявление, которое хотите временно приостановить",
          'Нажмите на "Временно приостановить"',
          "Объявление больше не видно в результатах поиска",
          'Когда захотите опубликовать его снова, найдите временно приостановленное объявление и нажмите "Опубликовать"',
          "Объявление снова активно и видно",
        ],
      },
      {
        id: "scenario-4",
        title: "Сценарий 4: Редактирование активного объявления",
        steps: [
          "Войдите в свой профиль",
          'Перейдите в "Мои объявления"',
          "Найдите активное объявление, которое хотите отредактировать",
          'Нажмите на "Редактировать"',
          "Внесите необходимые изменения (цена, описание, фотографии и т.д.)",
          'Нажмите на "Сохранить"',
          "Изменения применены к объявлению",
        ],
      },
    ],
  },
};

export default faqConfig;

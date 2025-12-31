export type Locale = 'mk';

export interface Translations {
  footer: {
    copyright: string;
    tagline: string;
    faq: string;
    terms: string;
    privacy: string;
    cookieSettings: string;
  };
  header: {
    addListing: string;
    addListingShort: string;
    myListings: string;
    myListingsShort: string;
    favorites: string;
    compare: string;
    admin: string;
    logout: string;
    logoutShort: string;
    createListing: string;
    createListingShort: string;
    login: string;
    loginShort: string;
    register: string;
  };
  home: {
    title: string;
    subtitle: string;
    subtitleBold: string;
    subtitle2: string;
    subtitle3: string;
  };
  listingsPage: {
    title: string;
    description: string;
  };
  common: {
    loading: string;
    error: string;
    success: string;
    save: string;
    cancel: string;
    loginRequired: string;
    delete: string;
    edit: string;
    close: string;
    yes: string;
    no: string;
    search: string;
    filter: string;
    reset: string;
    apply: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    confirm: string;
    continue: string;
    selectSorting: string;
    scrollToFilters: string;
    scrollBack: string;
    acceptCookies: string;
    closeCookies: string;
    copyId: string;
    editListing: string;
    changePhone: string;
    deleteAccount: string;
    removeFromComparison: string;
    bold: string;
    italic: string;
    underline: string;
    list: string;
    small: string;
    normal: string;
    large: string;
    saving: string;
    goToHome: string;
  };
  login: {
    title: string;
    emailOrPhone: string;
    password: string;
    emailOrPhoneRequired: string;
    emailOrPhoneInvalid: string;
    passwordRequired: string;
    forgotPassword: string;
    noAccount: string;
    register: string;
    registerLink: string;
    loggingIn: string;
    loginButton: string;
    passwordPlaceholder: string;
    filterSavedSuccess: string;
    filterSaveError: string;
    filterLimitError: string;
  };
  register: {
    title: string;
    userType: string;
    individual: string;
    business: string;
    phone: string;
    phoneHint: string;
    phoneRequired: string;
    phoneInvalid: string;
    phoneMustStartWithPlus: string;
    phoneLength: string;
    phoneDigitsOnly: string;
    phoneFormat: string;
    countryCodeLength: string;
    numberLength: string;
    messengers: string;
    optional: string;
    email: string;
    emailRequired: string;
    emailInvalid: string;
    password: string;
    passwordPlaceholder: string;
    passwordRequired: string;
    passwordMinLength: string;
    passwordUppercase: string;
    passwordLowercase: string;
    passwordSpecial: string;
    passwordRuleMinLength: string;
    passwordRuleUppercase: string;
    passwordRuleLowercase: string;
    passwordRuleSpecial: string;
    firstName: string;
    firstNameRequired: string;
    firstNameMinLength: string;
    firstNameMaxLength: string;
    firstNameInvalid: string;
    lastName: string;
    lastNameMinLength: string;
    lastNameMaxLength: string;
    companyName: string;
    companyNameRequired: string;
    companyNameMinLength: string;
    companyNameMaxLength: string;
    termsRequired: string;
    termsAccept: string;
    termsLink: string;
    emailNotifications: string;
    registering: string;
    registerButton: string;
    phoneExists: string;
    serviceUnavailable: string;
    invalidPhoneFormat: string;
    serverError: string;
    phoneCheckError: string;
    networkError: string;
    phoneServiceUnavailable: string;
    dataPreparationError: string;
    alreadyHaveAccount: string;
  };
  resetPassword: {
    title: string;
    phoneNumber: string;
    phoneRequired: string;
    phoneInvalid: string;
    sending: string;
    sendCode: string;
    backToLogin: string;
    codeSent: string;
    sendError: string;
    codeSentTo: string;
    enterCode: string;
    codeRequired: string;
    codeDigitsOnly: string;
    codeInvalid: string;
    codeVerified: string;
    maxAttemptsReached: string;
    maxAttemptsReachedWithMinutes: string;
    maxAttempts: string;
    invalidCodeWithAttempts: string;
    verifying: string;
    verify: string;
    blocked: string;
    resendCode: string;
    codeResent: string;
    newPassword: string;
    confirmPassword: string;
    confirmPasswordRequired: string;
    passwordsMismatch: string;
    passwordResetSuccess: string;
    ipBlocked: string;
    resetButton: string;
  };
  smsVerification: {
    title: string;
    codeSentTo: string;
    enterCode: string;
    codeRequired: string;
    codeDigitsOnly: string;
    codeInvalid: string;
    enterFullCode: string;
    sendSmsError: string;
    maxAttemptsReached: string;
    ipBlocked: string;
    verifying: string;
    verify: string;
    resendCode: string;
  };
  saveFilter: {
    editTitle: string;
    saveTitle: string;
    name: string;
    nameRequired: string;
    nameMaxLength: string;
    saving: string;
    save: string;
    filterUpdated: string;
    filterSaved: string;
    updateError: string;
    saveError: string;
  };
  userListings: {
    title: string;
    loading: string;
    noActiveListings: string;
    noListings: string;
    user: string;
    engine: string;
    fuel: string;
    mileage: string;
    transmission: string;
    driveType: string;
    bodyType: string;
    city: string;
    active: string;
    paused: string;
    closed: string;
    loadingTimeout: string;
  };
  listings: {
    defaultTitle: string;
    imageAlt: string;
    imageAltWithTotal: string;
    notFoundTitle: string;
    notFoundDescription: string;
    addToFavorites: string;
    removeFromFavorites: string;
    addToFavoritesError: string;
    removeFromFavoritesError: string;
    photoUploaded: string;
    photoUploadError: string;
    createError: string;
    updateError: string;
    createSuccess: string;
    updateSuccess: string;
    loadError: string;
    selectModel: string;
    addPhotos: string;
    pausedStatus: string;
    notFound: string;
    publishedStatus: string;
    publishAction: string;
    pauseAction: string;
    published: string;
    paused: string;
    closed: string;
    statusUpdateError: string;
    refreshDateLimit: string;
    datesUpdated: string;
    refreshDate: string;
    refreshing: string;
    refreshDateWithTime: string;
    all: string;
    active: string;
    noListingsYet: string;
    noListingsWithStatus: string;
    loadMore: string;
    noMoreListings: string;
    selectBrand: string;
    selectCity: string;
    descriptionPlaceholder: string;
    yearTitle: string;
    vinPlaceholder: string;
    vinTitle: string;
    vinHint: string;
    engineDisplacementTitle: string;
    horsepowerTitle: string;
    mileageTitle: string;
    registrationExpiresTitle: string;
    priceTitle: string;
    moveUp: string;
    moveDown: string;
    deleteImage: string;
    brandRequired: string;
    modelRequired: string;
    yearRequired: string;
    yearMustBePositive: string;
    yearMinError: string;
    yearMaxError: string;
    engineRequired: string;
    mileageRequired: string;
    fuelRequired: string;
    transmissionRequired: string;
    bodyTypeRequired: string;
    driveTypeRequired: string;
    priceRequired: string;
    cityRequired: string;
    imagesMinError: string;
    vinLengthError: string;
    vinInvalidChars: string;
    conditionRequired: string;
    registrationTypeRequired: string;
    horsepowerRequired: string;
    registrationDateRequired: string;
    registrationDateInvalid: string;
    brandAndModelRequired: string;
    yearRangeErrorForm: string;
    imageFormatError: string;
    imageSizeError: string;
    imageEmptyError: string;
    imageMaxCountError: string;
    noAccessToListing: string;
    cannotEditClosedListing: string;
    loadListingError: string;
    status: string;
    id: string;
    liters: string;
    km: string;
    new: string;
    urgent: string;
  };
  notFound: {
    title: string;
    heading: string;
    description: string;
    backToHome: string;
    imageAlt: string;
  };
  error: {
    heading: string;
    description: string;
    description2: string;
    tryAgain: string;
    backToHome: string;
  };
  favorites: {
    title: string;
    home: string;
    listings: string;
    filters: string;
    empty: string;
  };
  myListings: {
    title: string;
    home: string;
    createListing: string;
    refreshDate: string;
    refreshing: string;
    refreshDateWithTime: string;
    all: string;
    active: string;
    noListingsYet: string;
    noListingsWithStatus: string;
    loadMore: string;
    noMoreListings: string;
    published: string;
    pausedMessage: string;
    closedMessage: string;
    statusUpdateError: string;
    refreshDateLimit: string;
    datesUpdated: string;
  };
  listingDetail: {
    home: string;
    addToFavorites: string;
    removeFromFavorites: string;
    yourListing: string;
    cannotAddOwnListing: string;
    compare: string;
    alreadyInComparison: string;
    cannotCompareMore: string;
    addedToComparison: string;
    removedFromComparison: string;
    alreadyInComparisonError: string;
    closed: string;
    new: string;
    urgent: string;
    characteristics: string;
    brand: string;
    model: string;
    year: string;
    vin: string;
    copyVin: string;
    copied: string;
    copyError: string;
    engine: string;
    horsepower: string;
    fuel: string;
    transmission: string;
    driveType: string;
    mileage: string;
    bodyType: string;
    color: string;
    doors: string;
    condition: string;
    registrationType: string;
    registration: string;
    registered: string;
    notRegistered: string;
    registeredUntil: string;
    description: string;
    previousListings: string;
    vehicleHistory: string;
    historyHint: string;
    vinNotProvided: string;
    vinNotProvidedDescription: string;
    title: string;
    closedAt: string;
    open: string;
    noPreviousListings: string;
    contactInfo: string;
    sellerType: string;
    individual: string;
    business: string;
    company: string;
    name: string;
    city: string;
    email: string;
    copyEmail: string;
    phone: string;
    copyPhone: string;
    availableMessengers: string;
    allListingsFromSeller: string;
    unavailableForClosed: string;
    views: string;
    updated: string;
    willClose: string;
    imageAlt: string;
    imageAltOf: string;
    openFullSize: string;
  };
  searchFilters: {
    popular: string;
    selectBrands: string;
    selectModels: string;
    selectTransmission: string;
    selectCities: string;
    selectFuel: string;
    selectDriveType: string;
    selectBodyType: string;
    selectColor: string;
    selectDoors: string;
    selectCondition: string;
    selectRegistrationType: string;
    allBrands: string;
    allModels: string;
    allCities: string;
    allCurrencies: string;
    all: string;
    registered: string;
    notRegistered: string;
    registrationTypeOptions: {
      Local: string;
      Foreign: string;
      Cleared: string;
    };
    yearFromTitle: string;
    yearToTitle: string;
    priceFromTitle: string;
    priceToTitle: string;
    mileageFromTitle: string;
    mileageToTitle: string;
    engineDisplacementFromTitle: string;
    engineDisplacementToTitle: string;
    horsepowerFromTitle: string;
    horsepowerToTitle: string;
    showAdvanced: string;
    hideAdvanced: string;
    other: string;
    yearRangeError: string;
    priceRangeError: string;
    yearFromGreaterThanTo: string;
    priceFromGreaterThanTo: string;
    mileageFromGreaterThanTo: string;
    engineFromGreaterThanTo: string;
    horsepowerFromGreaterThanTo: string;
    mileageRangeError: string;
    engineRangeError: string;
    horsepowerRangeError: string;
    basicCriteria: string;
    brand: string;
    model: string;
    transmission: string;
    city: string;
    yearFrom: string;
    yearTo: string;
    currency: string;
    priceFrom: string;
    priceTo: string;
    additionalCriteria: string;
    fuel: string;
    driveType: string;
    mileageFrom: string;
    mileageTo: string;
    engineFrom: string;
    engineTo: string;
    horsepowerFrom: string;
    horsepowerTo: string;
    bodyType: string;
    color: string;
    doors: string;
    condition: string;
    registrationType: string;
    registration: string;
    urgent: string;
    new: string;
    search: string;
    reset: string;
    addToFavorites: string;
    login: string;
  };
  profile: {
    title: string;
    contactInfo: string;
    phone: string;
    emailAndNotifications: string;
    email: string;
    emailPlaceholder: string;
    emailCannotBeChanged: string;
    receiveEmailNotifications: string;
    enterEmailForNotifications: string;
    companyInfo: string;
    companyName: string;
    companyNamePlaceholder: string;
    personalData: string;
    firstName: string;
    firstNamePlaceholder: string;
    lastName: string;
    lastNamePlaceholder: string;
    saving: string;
    saveChanges: string;
    dangerZone: string;
    dangerZoneDescription: string;
    deleteAccount: string;
    deleteWarning: string;
    deleteWarningDescription: string;
    deleteWarningPoint1: string;
    deleteWarningPoint2: string;
    deleteWarningPoint3: string;
    deleteWarningPoint4: string;
    deleteConfirm: string;
    deleting: string;
    invalidEmail: string;
    fixEmail: string;
    noChanges: string;
    updateSuccess: string;
    deleteSuccess: string;
  };
  admin: {
    title: string;
    listingsTabLabel: string;
    usersTabLabel: string;
    searchPlaceholder: string;
    listingsTab: {
      loadError: string;
      statusUpdateSuccess: string;
      statusUpdateError: string;
      copySuccess: string;
      copyError: string;
      searchByIdPlaceholder: string;
      searchByCreatorPlaceholder: string;
      searchByCreator: string;
      searchById: string;
      all: string;
      active: string;
      paused: string;
      closed: string;
      totalListings: string;
      noListings: string;
      loadMore: string;
      noMoreListings: string;
      loading: string;
      deletedUser: string;
    };
    usersTab: {
      loadError: string;
      userStatusUpdateSuccess: string;
      statusUpdateError: string;
      copySuccess: string;
      copyError: string;
      listingsLoadError: string;
      allRoles: string;
      individual: string;
      business: string;
      admin: string;
      loadMore: string;
      loading: string;
      deletedUser: string;
      user: string;
      active: string;
      inactive: string;
      activate: string;
      deactivate: string;
      totalUsers: string;
      noUsers: string;
      noMoreUsers: string;
      viewListings: string;
    };
  };
  savedFiltersList: {
    edit: string;
    delete: string;
    deleteSuccess: string;
    deleteError: string;
  };
  vehicleSpecs: {
    brandModel: string;
    year: string;
    engine: string;
    mileage: string;
    fuel: string;
    transmission: string;
    bodyType: string;
    bodyTypeShort: string;
    color: string;
    doors: string;
  };
  statusBadge: {
    status: string;
    active: string;
    paused: string;
    closed: string;
  };
  compare: {
    title: string;
    loadError: string;
    removedFromComparison: string;
    noVehicles: string;
    addVehiclesHint: string;
    browseListings: string;
    clearAll: string;
    allRemoved: string;
    parameter: string;
    titleColumn: string;
    brand: string;
    model: string;
    year: string;
    mileage: string;
    engine: string;
    horsepower: string;
    fuel: string;
    transmission: string;
    driveType: string;
    bodyType: string;
    color: string;
    doors: string;
    condition: string;
    registrationType: string;
    registration: string;
    registered: string;
    notRegistered: string;
    price: string;
    notAvailable: string;
  };
  vehicleOptions: {
    fuel: {
      Petrol: string;
      Diesel: string;
      Electric: string;
      Hybrid: string;
      LPG: string;
    };
    transmission: {
      Manual: string;
      Automatic: string;
      CVT: string;
    };
    driveType: {
      FWD: string;
      RWD: string;
      AWD: string;
    };
    bodyType: {
      Sedan: string;
      Hatchback: string;
      Wagon: string;
      SUV: string;
      Coupe: string;
      Convertible: string;
      Van: string;
      Pickup: string;
      Minivan: string;
      Truck: string;
    };
    doors: {
      '2': string;
      '3': string;
      '4': string;
      '5': string;
    };
    doorsLabel: string;
  };
  breadcrumbs: {
    home: string;
  };
  cookieSettings: {
    loading: string;
    title: string;
    description: string;
    preferencesSaved: string;
    necessary: {
      title: string;
      description: string;
    };
    status: string;
    active: string;
    inactive: string;
    analytical: {
      title: string;
      description: string;
    };
    googleAnalytics: {
      title: string;
      description: string;
    };
    googleTagManager: {
      title: string;
      description: string;
    };
    yourChoice: {
      title: string;
    };
    acceptAnalytical: string;
    denyAnalytical: string;
    moreInfo: {
      title: string;
      description: string;
    };
    privacyPolicy: string;
    preferencesSavedMessage: string;
  };
  faq: {
    title: string;
    userScenarios: {
      title: string;
      description: string;
    };
    contact: {
      description: string;
      email: string;
    };
  };
  verifyEmail: {
    title: string;
    pleaseWait: string;
    success: {
      title: string;
      description: string;
      redirecting: string;
      seconds: string;
    };
  };
  verifyPhone: {
    title: string;
    codeSentTo: string;
    enterCode: string;
    loadDataError: string;
    missingLoginValue: string;
    registrationSuccessButLoginFailed: string;
    phoneNotAvailable: string;
  };
  metadata: {
    login: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    register: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    resetPassword: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    listing: {
      notFoundTitle: string;
      notFoundDescription: string;
      defaultDescription: string;
      keywords: {
        cars: string;
        buyCar: string;
        carsForSale: string;
        northMacedonia: string;
      };
    };
  };
}

import { loadSiteConfigSync } from './site-config';

const STORAGE_KEY = 'kupito-locale';

let mkTranslations: Translations | null = null;

function loadMkTranslations(): Translations {
  if (mkTranslations) {
    return mkTranslations;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const translations = require('./locales/mk.json');
    mkTranslations = translations as unknown as Translations;
    return mkTranslations;
  } catch (error) {
    console.warn('Translations file not found, using empty translations. This is expected in core repository.');
    return {} as unknown as Translations;
  }
}

export function getDefaultLocale(): Locale {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  try {
    const siteConfig = loadSiteConfigSync(country);
    return siteConfig.locale.split('_')[0] as Locale;
  } catch (error) {
    return 'mk';
  }
}

export function getStoredLocale(): Locale {
  return getDefaultLocale();
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, locale);
}

export function loadTranslations(locale?: Locale): Translations {
  if (!locale) {
    locale = getDefaultLocale();
  }

  return loadMkTranslations();
}

export function getServerTranslations(locale?: Locale): Translations {
  if (!locale) {
    locale = getDefaultLocale();
  }
  return loadTranslations(locale);
}

export async function loadTranslationsAsync(locale: Locale): Promise<Translations> {
  return loadTranslations(locale);
}

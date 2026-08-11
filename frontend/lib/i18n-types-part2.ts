type MetadataPage = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogAlt: string;
};

export interface TranslationsPart2 {
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
      NotCleared: string;
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
    yearRangeSummary: string;
    fromToRangeSummary: string;
    currency: string;
    priceFrom: string;
    priceTo: string;
    additionalCriteria: string;
    fuel: string;
    fuelType: string;
    drive: string;
    driveType: string;
    mileageFrom: string;
    mileageTo: string;
    engineFrom: string;
    engineTo: string;
    horsepowerFrom: string;
    horsepowerTo: string;
    body: string;
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
    smartSelection: string;
    smartSelectionFilterLimitError: string;
    login: string;
    year: string;
    price: string;
    mileage: string;
    from: string;
    to: string;
    tiresCategory: string;
    horsepower: string;
    engine: string;
  };
  profile: {
    title: string;
    contactInfo: string;
    phone: string;
    phoneChangeBoardUrlNoticeBefore: string;
    phoneChangeBoardUrlNoticeAfter: string;
    phoneChangeBoardUrlHintAria: string;
    availableMessengers: string;
    additionalPhone: string;
    additionalPhonePlaceholder: string;
    emailAndNotifications: string;
    email: string;
    emailPlaceholder: string;
    emailCannotBeChanged: string;
    emailNotificationTypes: string;
    receiveListingRefreshReminders: string;
    receiveWeeklyViewsDigest: string;
    receiveSystemAndSecurityNotifications: string;
    receiveEmailNotifications: string;
    companyInfo: string;
    companyName: string;
    companyNamePlaceholder: string;
    companyWebsiteUrl: string;
    companyWebsiteUrlPlaceholder: string;
    invalidCompanyWebsiteUrl: string;
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
    pageTitle: string;
    title: string;
    vehiclesSectionTitle: string;
    tiresSectionTitle: string;
    loadError: string;
    removedFromComparison: string;
    removedWrongCategoryFromCompare: string;
    noVehicles: string;
    addVehiclesHint: string;
    browseListings: string;
    noTires: string;
    addTiresHint: string;
    browseTireListings: string;
    clearAll: string;
    allRemoved: string;
    parameter: string;
    photo: string;
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
    tireBrand: string;
    tireModel: string;
    tireVehicleType: string;
    tireSize: string;
    tireSeason: string;
    tireCondition: string;
    tireQuantity: string;
    tireLoadIndex: string;
    tireSpeedIndex: string;
    tireStudded: string;
    tireRunFlat: string;
    tireReinforcedXl: string;
    tireSpareDonut: string;
    tireTubeless: string;
    tireAcoustic: string;
  };
  vehicleOptions: {
    fuel: {
      Petrol: string;
      Diesel: string;
      Electric: string;
      Hybrid: string;
      MHEV: string;
      PHEV: string;
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
    cookieTable: {
      title: string;
      intro: string;
      headers: {
        name: string;
        type: string;
        purpose: string;
        duration: string;
        provider: string;
      };
      rows: {
        ga: {
          name: string;
          type: string;
          purpose: string;
          duration: string;
          provider: string;
        };
        gid: {
          name: string;
          type: string;
          purpose: string;
          duration: string;
          provider: string;
        };
        consentCookie: {
          name: string;
          type: string;
          purpose: string;
          duration: string;
          provider: string;
        };
        localeCookie: {
          name: string;
          type: string;
          purpose: string;
          duration: string;
          provider: string;
        };
        gtm: {
          name: string;
          type: string;
          purpose: string;
          duration: string;
          provider: string;
        };
        authLocalStorage: {
          name: string;
          type: string;
          purpose: string;
          duration: string;
          provider: string;
        };
      };
    };
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
  partners: {
    title: string;
    intro: string;
    howToBecome: {
      title: string;
      items: string[];
    };
    benefits: {
      title: string;
      items: string[];
    };
    whoCan: {
      title: string;
      items: string[];
    };
    howToLeave: {
      title: string;
      items: string[];
    };
    obligations: {
      title: string;
      items: string[];
    };
    contactCta: string;
  };
  investors: {
    title: string;
    intro: string;
    about: { title: string; paragraphs: string[] };
    done: { title: string; items: string[] };
    product: { title: string; lead: string; items: string[] };
    businessModel: { title: string; lead: string; items: string[] };
    vision: { title: string; paragraphs: string[] };
    strategy: { title: string; items: string[] };
    scaling: { title: string; lead: string; items: string[] };
    whyNow: { title: string; items: string[] };
    offer: { title: string; lead: string; items: string[]; footer: string };
    contactCta: string;
  };
  contacts: {
    title: string;
    intro: string;
    email: string;
    telegram: string;
    whatsapp: string;
    whatsappValue: string;
    copyTitle: string;
    openInNewTab: string;
    openEmail: string;
  };
  modelCatalog: {
    title: string;
    description: string;
    empty: string;
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
    site: {
      defaultTitle: string;
      defaultDescription: string;
      homePageDescription: string;
      homePageDescriptionWithBrand: string;
      homePageDescriptionWithBrandModel: string;
      tiresDefaultTitle: string;
      tiresHomePageDescription: string;
      tiresHomePageDescriptionWithBrand: string;
      tiresHomePageDescriptionWithBrandModel: string;
      organizationDescription: string;
      homeTitleTemplate: string;
      homeBrandTitleTemplate: string;
      categoryTitle: { car: string; truck: string; moto: string; tire: string };
      keywords: string[];
    };
    faq: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    partners: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    investors: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    contacts: MetadataPage;
    terms: MetadataPage;
    privacy: MetadataPage;
    cookieSettings: MetadataPage;
    login: MetadataPage;
    register: MetadataPage;
    sign: MetadataPage;
    resetPassword: MetadataPage;
    brandLanding: {
      title: string;
      titleWithPrice: string;
      description: string;
      h1: string;
      intro: string;
      ogAlt: string;
    };
    brandModelLanding: {
      title: string;
      titleWithPrice: string;
      description: string;
      h1: string;
      ogAlt: string;
    };
    listing: {
      notFoundTitle: string;
      notFoundDescription: string;
      defaultDescription: string;
      titlePrefix: string;
      powerUnit: string;
      inCity: string;
      yearFormat: string;
      pricePrefix: string;
      siteSuffix: string;
      ogAltVehicle: string;
      ogAltTire: string;
      keywords: { cars: string; buyCar: string; carsForSale: string; moldova: string };
    };
  };
}

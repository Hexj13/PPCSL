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
    login: string;
    year: string;
    price: string;
    mileage: string;
    from: string;
    to: string;
    horsepower: string;
    engine: string;
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
    title: string;
    loadError: string;
    removedFromComparison: string;
    noVehicles: string;
    addVehiclesHint: string;
    browseListings: string;
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
    site: {
      defaultTitle: string;
      defaultDescription: string;
      homePageDescription: string;
      homePageDescriptionWithBrand: string;
      homePageDescriptionWithBrandModel: string;
      organizationDescription: string;
      keywords: string[];
    };
    faq: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    terms: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    privacy: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
    cookieSettings: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogAlt: string;
    };
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
        moldova: string;
      };
    };
  };
}

export const AUTH_LOCATORS = {
  page: 'auth-page',
  loginTab: 'auth-tab-login',
  registerTab: 'auth-tab-register',
  loginPanel: 'auth-panel-login',
  registerPanel: 'auth-panel-register',
  loginForm: 'auth-login-form',
  loginInput: 'auth-login-input',
  loginPasswordInput: 'auth-login-password-input',
  loginSubmit: 'auth-login-submit',
  registerForm: 'auth-register-form',
  registerTypeIndividual: 'auth-register-type-individual',
  registerTypeBusiness: 'auth-register-type-business',
  registerCompanyNameInput: 'auth-register-company-name-input',
  registerPhoneInput: 'auth-register-phone-input',
  registerPasswordInput: 'auth-register-password-input',
  registerTermsInput: 'auth-register-terms-input',
  registerTermsToggle: 'auth-register-terms-toggle',
  registerSubmit: 'auth-register-submit',
} as const;

export const VERIFY_PHONE_LOCATORS = {
  page: 'verify-phone-page',
  form: 'verify-phone-form',
  codeInputPrefix: 'verify-phone-code-input-',
  firstCodeInput: 'verify-phone-code-input-0',
  backButton: 'verify-phone-back',
  submitButton: 'verify-phone-submit',
} as const;

export const SEARCH_LOCATORS = {
  form: 'search-filters-form',
  vehicleTypeCar: 'search-vehicle-type-car',
  vehicleTypeTruck: 'search-vehicle-type-truck',
  vehicleTypeMoto: 'search-vehicle-type-moto',
  listingCategoryTire: 'search-listing-category-tire',
  resultsGrid: 'listings-results-grid',
  emptyState: 'listings-empty-state',
} as const;

export const LISTING_LOCATORS = {
  cardLinkPrefix: 'listing-card-link-',
  detailPage: 'listing-detail-page',
  detailGallery: 'listing-detail-gallery',
  detailBreadcrumbs: 'listing-detail-breadcrumbs',
  detailHeader: 'listing-detail-header',
  detailActions: 'listing-detail-actions',
  detailCharacteristics: 'listing-detail-characteristics',
  detailEquipment: 'listing-detail-equipment',
  detailConditionRegistration: 'listing-detail-condition-registration',
  detailDescription: 'listing-detail-description',
  detailSeller: 'listing-detail-seller',
  detailInfo: 'listing-detail-info',
  detailCopyLinkButton: 'listing-detail-copy-link',
} as const;

export const LISTING_CREATE_LOCATORS = {
  page: 'listing-create-page',
  form: 'listing-create-form-vehicle',
  submitButton: 'listing-create-submit',
  editSubmitButton: 'listing-edit-submit',
  brandSelect: 'listing-create-brand-select',
  modelSelect: 'listing-create-model-select',
  yearSelect: 'listing-create-year-select',
  fuelSelect: 'listing-create-fuel-select',
  transmissionSelect: 'listing-create-transmission-select',
  driveTypeSelect: 'listing-create-drive-type-select',
  bodyTypeSelect: 'listing-create-body-type-select',
  conditionSelect: 'listing-create-condition-select',
  registrationTypeSelect: 'listing-create-registration-type-select',
  citySelect: 'listing-create-city-select',
  engineDisplacementInput: 'listing-form-engine-displacement',
  horsepowerInput: 'listing-form-horsepower',
  powerKwInput: 'listing-form-power-kw',
  mileageInput: 'listing-form-mileage',
  priceInput: 'listing-form-price',
  vinInput: 'listing-create-vin-input',
  currencySelect: 'listing-create-currency-select',
  negotiableCheckbox: 'listing-form-negotiable',
  availableInCreditCheckbox: 'listing-form-available-in-credit',
  downPaymentInput: 'listing-form-down-payment',
  urgentCheckbox: 'listing-form-urgent',
  isNewCheckbox: 'listing-form-is-new',
  descriptionTabRo: 'listing-form-description-tab-ro',
  descriptionEditor: 'listing-form-description-editor',
  photosInput: 'listing-form-photos-input',
  photosTrigger: 'listing-form-photos-trigger',
  photosCount: 'listing-form-photos-count',
  photosGrid: 'photos-grid',
} as const;

export const MY_LISTINGS_LOCATORS = {
  page: 'my-listings-page',
  cardPrefix: 'my-listings-card-',
  cardLinkPrefix: 'my-listings-card-link-',
  editLinkPrefix: 'my-listings-edit-link-',
} as const;

export const HEADER_LOCATORS = {
  userMoreToggle: 'header-user-more-toggle',
  userMoreMenu: 'header-user-more-menu',
  userLogout: 'header-user-logout',
  mobileLogout: 'header-mobile-logout',
} as const;

export const COMPLETE_PROFILE_LOCATORS = {
  page: 'complete-profile-page',
  form: 'complete-profile-form',
  firstNameInput: 'complete-profile-first-name-input',
  lastNameInput: 'complete-profile-last-name-input',
  emailInput: 'complete-profile-email-input',
  companyWebsiteInput: 'complete-profile-company-website-input',
  additionalPhoneInput: 'complete-profile-additional-phone-input',
  skipButton: 'complete-profile-skip',
  saveButton: 'complete-profile-save',
} as const;

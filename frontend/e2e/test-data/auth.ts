export type RegisterUserType = 'Individual' | 'Business';

export type RegisterProfileData = {
  companyName: string;
  firstName: string;
  lastName: string;
  websiteUrl: string;
};

export function createRegisterProfileData(): RegisterProfileData {
  const uniqueSuffix = `${Date.now()}`;
  return {
    companyName: `Kupito Test Company ${uniqueSuffix}`,
    firstName: 'Ivan',
    lastName: 'Petrov',
    websiteUrl: 'https://example.com',
  };
}

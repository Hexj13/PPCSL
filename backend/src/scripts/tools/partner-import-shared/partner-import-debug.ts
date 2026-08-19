export function isPartnerImportDebugEnabled(siteSpecificDebug?: boolean): boolean {
  return (
    process.env.PPCSL_IMPORT_DEBUG === '1' ||
    process.env.KUPITO_IMPORT_DEBUG === '1' ||
    process.env.CIPAUTO_DEBUG === '1' ||
    Boolean(siteSpecificDebug)
  );
}

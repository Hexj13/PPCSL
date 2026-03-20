export function buildListingUrlFromTemplate(template: string, id: string): string {
  return template.replace(/\{\{\s*id\s*\}\}/gi, id);
}

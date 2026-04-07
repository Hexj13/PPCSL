const brand = {
  primary: '#40916B',
  textPrimary: '#1B1B1B',
  textSecondary: '#4A4A4A',
  bgPage: '#F5F5F5',
  bgFooter: '#F4F4F4',
  divider: '#DADADA',
  white: '#ffffff',
} as const;

const fontStack = '"Inter",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

const emailInterFontLink =
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">';

const emailCtaClass = 'kupito-email-cta';

const emailCtaHeadStyles = `<style type="text/css">
a.${emailCtaClass},a.${emailCtaClass}:hover,a.${emailCtaClass}:visited,a.${emailCtaClass}:active{text-decoration:none!important;}
a.${emailCtaClass} u{text-decoration:none!important;}
a.${emailCtaClass} span,a.${emailCtaClass} font{text-decoration:none!important;}
</style>`;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeSiteBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export type EmailLayoutOptions = {
  siteBaseUrl: string;
  documentTitle: string;
  heading: string;
  preheader?: string;
  bodyHtml: string;
  supportEmail: string;
};

export function buildEmailLayout(options: EmailLayoutOptions): string {
  const base = normalizeSiteBaseUrl(options.siteBaseUrl);
  const logoUrl = `${base}/logo.png`;
  const safeHeading = escapeHtml(options.heading);
  const safeDocTitle = escapeHtml(options.documentTitle);
  const safeSupport = escapeHtml(options.supportEmail);
  const hostLabel = escapeHtml(base.replace(/^https?:\/\//, ''));
  const pre = options.preheader ? escapeHtml(options.preheader) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>${safeDocTitle}</title>
${emailInterFontLink}
${emailCtaHeadStyles}
</head>
<body style="margin:0;padding:0;background:${brand.bgPage};">
${pre ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${brand.bgPage};">
<tr>
<td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${brand.white};border-radius:8px;overflow:hidden;border:1px solid ${brand.divider};">
<tr>
<td style="background:${brand.primary};padding:24px 20px;text-align:center;">
<a href="${escapeHtml(base)}" style="text-decoration:none;">
<img src="${escapeHtml(logoUrl)}" width="110" alt="Kupito" style="display:block;margin:0 auto;border:0;height:auto;max-width:110px;">
</a>
</td>
</tr>
<tr>
<td style="padding:28px 24px;font-family:${fontStack};color:${brand.textPrimary};line-height:1.5;font-size:16px;">
<h1 style="margin:0 0 20px;font-size:22px;font-weight:600;font-family:${fontStack};color:${brand.textPrimary};line-height:1.3;">${safeHeading}</h1>
${options.bodyHtml}
</td>
</tr>
<tr>
<td style="padding:20px 24px;border-top:1px solid ${brand.divider};background:${brand.bgFooter};font-size:13px;color:${brand.textSecondary};font-family:${fontStack};line-height:1.5;">
<p style="margin:0 0 8px;"><a href="mailto:${safeSupport}" style="color:${brand.primary};font-weight:600;text-decoration:none;">${safeSupport}</a></p>
<p style="margin:0;"><a href="${escapeHtml(base)}" style="color:${brand.primary};text-decoration:none;font-weight:600;">${hostLabel}</a></p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function emailTextParagraph(textHtml: string): string {
  return `<p style="margin:0 0 16px;color:${brand.textSecondary};font-size:16px;line-height:1.6;">${textHtml}</p>`;
}

export function emailPlainParagraph(text: string): string {
  return emailTextParagraph(escapeHtml(text));
}

export function emailCtaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const ctaText = `<font color="${brand.white}" style="text-decoration:none !important;"><span style="display:inline-block;color:${brand.white} !important;-webkit-text-fill-color:${brand.white};text-decoration:none !important;text-decoration-line:none !important;font-weight:600;border-bottom:0 none transparent;">${safeLabel}</span></font>`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:8px auto 24px;">
<tr>
<td bgcolor="${brand.primary}" style="border-radius:8px;background:${brand.primary};">
<a class="${emailCtaClass}" href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:${fontStack};font-size:16px;font-weight:600;color:${brand.white} !important;-webkit-text-fill-color:${brand.white};text-decoration:none !important;text-decoration-line:none !important;mso-text-underline:none;border-bottom:0 none transparent;border-radius:8px;">${ctaText}</a>
</td>
</tr>
</table>`;
}

export function emailRawLink(href: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;word-break:break-all;"><a href="${escapeHtml(href)}" style="color:${brand.primary};">${escapeHtml(href)}</a></p>`;
}

export function emailDigestListingCard(params: {
  index: number;
  title: string;
  status: string;
  views: number;
  statusLabel: string;
  viewsLabel: string;
}): string {
  const title = escapeHtml(params.title);
  const status = escapeHtml(params.status);
  const statusLabel = escapeHtml(params.statusLabel);
  const viewsLabel = escapeHtml(params.viewsLabel);
  const n = params.index + 1;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:12px;border:1px solid ${brand.divider};border-radius:8px;overflow:hidden;">
<tr>
<td style="padding:16px;font-family:${fontStack};">
<p style="margin:0 0 8px;font-weight:600;color:${brand.textPrimary};font-size:16px;">${n}. ${title}</p>
<p style="margin:0;font-size:14px;color:${brand.textSecondary};">${statusLabel}: ${status}<span style="color:${brand.divider};"> · </span>${viewsLabel}: ${params.views}</p>
</td>
</tr>
</table>`;
}

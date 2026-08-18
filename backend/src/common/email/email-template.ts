import mjml2html from 'mjml';

const brand = {
  primary: '#40916B',
  textPrimary: '#1B1B1B',
  textSecondary: '#4A4A4A',
  bgPage: '#F5F5F5',
  bgFooter: '#F4F4F4',
  divider: '#DADADA',
  white: '#ffffff',
} as const;

const fontStack = 'Arial, Helvetica, sans-serif';

function compileMjml(mjml: string): string {
  const result = mjml2html(mjml, {
    minify: false,
    validationLevel: 'soft',
  });
  return result.html;
}

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
  signatureLine?: string;
  /** Brand name for logo alt and footer; defaults to site hostname. */
  siteName?: string;
  copyrightLine?: string;
  /** Public path or absolute URL for the header logo. Defaults to `{siteBaseUrl}/logo.png`. */
  logoSrc?: string;
  logoWidthPx?: number;
};

export function buildEmailLayout(options: EmailLayoutOptions): string {
  const base = normalizeSiteBaseUrl(options.siteBaseUrl);
  const rawLogo = options.logoSrc?.trim();
  const logoUrl = rawLogo
    ? /^https?:\/\//i.test(rawLogo)
      ? rawLogo
      : `${base}${rawLogo.startsWith('/') ? rawLogo : `/${rawLogo}`}`
    : `${base}/logo.png`;
  const logoWidth = Number.isFinite(options.logoWidthPx) ? Number(options.logoWidthPx) : 110;
  const safeHeading = escapeHtml(options.heading);
  const safeDocTitle = escapeHtml(options.documentTitle);
  const safeSupport = escapeHtml(options.supportEmail);
  const hostLabel = escapeHtml(base.replace(/^https?:\/\//, ''));
  const brandLabel = escapeHtml(options.siteName?.trim() || base.replace(/^https?:\/\//, ''));
  const pre = options.preheader ? escapeHtml(options.preheader) : '';
  const signatureLine = options.signatureLine ? escapeHtml(options.signatureLine) : '';
  const copyrightLine = options.copyrightLine ? escapeHtml(options.copyrightLine) : '';

  const signatureBlock = signatureLine
    ? `<mj-text font-size="13px" line-height="20px" color="${brand.textSecondary}" padding="0 0 12px 0">${signatureLine}</mj-text>`
    : '';
  const copyrightBlock = copyrightLine
    ? `<mj-text font-size="12px" line-height="18px" color="${brand.textSecondary}" padding="8px 0 0 0">${copyrightLine}</mj-text>`
    : '';
  const mjml = `<mjml>
  <mj-head>
    <mj-title>${safeDocTitle}</mj-title>
    <mj-attributes>
      <mj-all font-family="${fontStack}" />
      <mj-text color="${brand.textSecondary}" font-size="16px" line-height="24px" />
      <mj-button background-color="${brand.primary}" color="${brand.white}" font-size="16px" font-weight="700" border-radius="8px" />
    </mj-attributes>
    <mj-style inline="inline">
      .kupito-raw-link a { color: ${brand.primary} !important; word-break: break-all; }
      .kupito-card-title { color: ${brand.textPrimary}; font-size: 16px; font-weight: 700; line-height: 24px; }
      .kupito-card-status { color: ${brand.textSecondary}; font-size: 14px; line-height: 20px; }
    </mj-style>
    ${pre ? `<mj-preview>${pre}</mj-preview>` : ''}
  </mj-head>
  <mj-body background-color="${brand.bgPage}">
    <mj-section background-color="${brand.primary}" border-top-left-radius="8px" border-top-right-radius="8px" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" border-top="1px solid ${brand.divider}" padding="24px 20px">
      <mj-column>
        <mj-image href="${escapeHtml(base)}" src="${escapeHtml(logoUrl)}" width="${logoWidth}px" alt="${brandLabel}" padding="0" />
      </mj-column>
    </mj-section>
    <mj-section background-color="${brand.white}" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" padding="28px 24px 4px 24px">
      <mj-column>
        <mj-text color="${brand.textPrimary}" font-size="22px" font-weight="700" line-height="30px" padding="0 0 20px 0">${safeHeading}</mj-text>
      </mj-column>
    </mj-section>
    ${options.bodyHtml}
    <mj-section background-color="${brand.bgFooter}" border-bottom-left-radius="8px" border-bottom-right-radius="8px" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" border-bottom="1px solid ${brand.divider}" padding="20px 24px">
      <mj-column>
        <mj-text font-size="15px" font-weight="700" line-height="20px" color="${brand.textPrimary}" padding="0 0 4px 0">${brandLabel}</mj-text>
        ${signatureBlock}
        <mj-text font-size="13px" line-height="20px" color="${brand.textSecondary}" padding="0 0 8px 0"><a href="mailto:${safeSupport}" style="color:${brand.primary};font-weight:700;text-decoration:none;">${safeSupport}</a></mj-text>
        <mj-text font-size="13px" line-height="20px" color="${brand.textSecondary}" padding="0"><a href="${escapeHtml(base)}" style="color:${brand.primary};font-weight:700;text-decoration:none;">${hostLabel}</a></mj-text>
        ${copyrightBlock}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  return compileMjml(mjml);
}

export function emailTextParagraph(textHtml: string): string {
  return `<mj-section background-color="${brand.white}" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" padding="0 24px 16px 24px">
    <mj-column>
      <mj-text padding="0">${textHtml}</mj-text>
    </mj-column>
  </mj-section>`;
}

export function emailPlainParagraph(text: string): string {
  return emailTextParagraph(escapeHtml(text));
}

export function emailCtaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<mj-section background-color="${brand.white}" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" padding="8px 24px 24px 24px">
    <mj-column>
      <mj-button href="${safeHref}" align="center" padding="0" inner-padding="14px 28px">${safeLabel}</mj-button>
    </mj-column>
  </mj-section>`;
}

export function emailRawLink(href: string): string {
  const safeHref = escapeHtml(href);
  return `<mj-section background-color="${brand.white}" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" padding="0 24px 16px 24px">
    <mj-column>
      <mj-text css-class="kupito-raw-link" font-size="14px" line-height="20px" padding="0"><a href="${safeHref}" style="color:${brand.primary};">${safeHref}</a></mj-text>
    </mj-column>
  </mj-section>`;
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
  return `<mj-section background-color="${brand.white}" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" padding="0 24px 12px 24px">
    <mj-column>
      <mj-text css-class="kupito-card-title" padding="16px 16px 8px 16px" border-top="1px solid ${brand.divider}" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}">${n}. ${title}</mj-text>
      <mj-text css-class="kupito-card-status" padding="0 16px 16px 16px" border-left="1px solid ${brand.divider}" border-right="1px solid ${brand.divider}" border-bottom="1px solid ${brand.divider}">${statusLabel}: ${status} · ${viewsLabel}: ${params.views}</mj-text>
    </mj-column>
  </mj-section>`;
}

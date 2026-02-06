export type LegalDictionaryTerm = {
  term: string;
  definition: string;
};

export type LegalTocItem = {
  id: string;
  title: string;
};

export type LegalSection = {
  id: string;
  title: string;
  content: string[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  languageToggle: string;
  dictionary: {
    title: string;
    terms: LegalDictionaryTerm[];
  };
  toc: {
    title: string;
    items: LegalTocItem[];
  };
  sections: LegalSection[];
  footerContact?: string;
};

export type LegalConfig = {
  terms: Record<string, LegalDocument>;
  privacy: Record<string, LegalDocument>;
};

export function loadLegalConfigSync(country: string): LegalConfig | null {
  try {
    const module = require(`../config/legal`);
    return (module?.default || null) as LegalConfig | null;
  } catch {
    console.warn(
      `Legal config file not found for ${country}, using built-in legal pages. This is expected in core repository.`
    );
    return null;
  }
}

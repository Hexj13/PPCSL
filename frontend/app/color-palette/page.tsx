import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadThemeSync } from '@/lib/theme';

export const dynamic = 'force-dynamic';

const isColorPaletteEnabled =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_COLOR_PALETTE === 'true';

export async function generateMetadata(): Promise<Metadata> {
  if (!isColorPaletteEnabled) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: 'Color Palette - Design Reference',
    description: 'Color palette reference for designers',
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

function ColorSwatch({
  name,
  value,
  className = '',
}: {
  name: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <div
        className="h-32 w-full min-w-0 rounded-lg border-2 border-primary-500/20 shadow-lg relative overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
      </div>
      <div className="mt-3 min-w-0 overflow-hidden p-2 rounded-lg border border-primary-500/20 bg-bg-secondary">
        <div className="truncate font-semibold text-sm text-text-primary mb-1" title={name}>
          {name}
        </div>
        <div className="truncate text-xs font-mono font-medium text-primary-500" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

function ColorGroup({
  title,
  colors,
  className = '',
}: {
  title: string;
  colors: Record<string, string> | { [key: number]: string };
  className?: string;
}) {
  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-6">
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-4 [&>div]:min-w-0">
        {Object.entries(colors).map(([key, value]) => (
          <ColorSwatch key={key} name={key} value={value} />
        ))}
      </div>
    </div>
  );
}

export default function ColorPalettePage() {
  if (!isColorPaletteEnabled) {
    notFound();
  }

  const country = process.env.NEXT_PUBLIC_COUNTRY || 'md';
  const theme = loadThemeSync(country);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 card p-6 md:p-8">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-3">
            Color Palette
          </h1>
          <p className="text-text-secondary text-lg">Current project color palette</p>
        </div>

        <ColorGroup title="Primary Colors" colors={theme.primary} />
        <ColorGroup title="Dark/Gray Colors" colors={theme.dark} />
        <ColorGroup title="Background Colors" colors={theme.bg} />
        <ColorGroup title="Text Colors" colors={theme.text} />
        <ColorGroup title="Semantic Colors" colors={theme.semantic} />
        <ColorGroup
          title="Accent Colors"
          colors={{
            accent: theme.accent,
            accentSecondary: theme.accentSecondary,
            newBadge: theme.newBadge,
            divider: theme.divider,
          }}
        />
        {theme.pwa && <ColorGroup title="PWA Colors" colors={theme.pwa} />}

        <div className="mt-12 card p-6 md:p-8">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-6">
            Color Usage Reference
          </h3>

          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Primary Colors Usage</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <span className="font-semibold text-text-primary">primary-500, primary-600:</span>{' '}
                  Main buttons, links, accents, gradients
                </li>
                <li>
                  <span className="font-semibold text-text-primary">primary-400:</span> Secondary
                  text, icons, hover states
                </li>
                <li>
                  <span className="font-semibold text-text-primary">primary-300:</span> Light
                  accents, borders
                </li>
                <li>
                  <span className="font-semibold text-text-primary">primary-700, primary-800:</span>{' '}
                  Dark buttons, gradients
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">
                Background Colors Usage
              </h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <span className="font-semibold text-text-primary">bg-dark:</span> Main page
                  background, cards, modals
                </li>
                <li>
                  <span className="font-semibold text-text-primary">bg-light:</span> Secondary
                  cards, buttons, hover states
                </li>
                <li>
                  <span className="font-semibold text-text-primary">bg-darker:</span> Darker cards,
                  listing cards background
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Semantic Colors Usage</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <span className="font-semibold text-text-primary">success:</span> Success
                  messages, positive indicators
                </li>
                <li>
                  <span className="font-semibold text-text-primary">error:</span> Error messages,
                  validation errors
                </li>
                <li>
                  <span className="font-semibold text-text-primary">warning:</span> Warning
                  messages, caution indicators
                </li>
                <li>
                  <span className="font-semibold text-text-primary">info:</span> Information
                  messages, tooltips
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Components</h4>
              <div className="space-y-2 text-sm text-text-secondary">
                <div>
                  <span className="font-semibold text-text-primary">Buttons:</span> primary-500/600
                  (primary), bg-light + primary-500 border (secondary)
                </div>
                <div>
                  <span className="font-semibold text-text-primary">ListingCard:</span> bg-darker
                  (card), bg-light (badges), primary-400/500 (text, borders)
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Modal:</span> bg-dark
                  (background), primary-500/600 (title gradient)
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Forms:</span> bg-light (inputs),
                  primary-500 (focus states, borders)
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Header/Footer:</span> bg-dark,
                  primary-500 (links, accents)
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Pages</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-text-secondary">
                <div>
                  <span className="font-semibold text-text-primary">Home (/):</span> bg-dark,
                  primary-500/600 gradients
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Listings (/listings):</span>{' '}
                  bg-dark, bg-darker (cards), primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">
                    Listing Detail (/listings/[id]):
                  </span>{' '}
                  bg-dark, bg-light, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">
                    New Listing (/listings/new):
                  </span>{' '}
                  bg-dark, bg-light (forms), primary-500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Login (/login):</span> bg-dark,
                  primary-500/600
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Register (/register):</span>{' '}
                  bg-dark, primary-500/600
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Profile (/profile):</span>{' '}
                  bg-dark, bg-light, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">
                    My Listings (/my-listings):
                  </span>{' '}
                  bg-dark, bg-darker, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Favorites (/favorites):</span>{' '}
                  bg-dark, bg-darker, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Terms (/terms):</span> bg-dark,
                  primary-500/600 (title), primary-300 (sections)
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Privacy (/privacy):</span>{' '}
                  bg-dark, primary-500/600
                </div>
                <div>
                  <span className="font-semibold text-text-primary">FAQ (/faq):</span> bg-dark,
                  primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">
                    Verify Email (/verify-email):
                  </span>{' '}
                  bg-dark, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">
                    Verify Phone (/verify-phone):
                  </span>{' '}
                  bg-dark, bg-light (inputs), primary-500
                </div>
                <div>
                  <span className="font-semibold text-text-primary">Admin (/admin):</span> bg-dark,
                  primary-500/600
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 card p-6 md:p-8">
          <h3 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-4">
            JSON Export
          </h3>
          <pre className="text-xs text-text-primary overflow-x-auto bg-bg-darker p-4 rounded-lg border border-primary-500/20 font-mono">
            {JSON.stringify(theme, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

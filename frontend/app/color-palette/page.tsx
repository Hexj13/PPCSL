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
  const isLight = (() => {
    const hex = value.replace('#', '');
    const normalizedHex =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => char + char)
            .join('')
        : hex;
    const r = parseInt(normalizedHex.slice(0, 2), 16);
    const g = parseInt(normalizedHex.slice(2, 4), 16);
    const b = parseInt(normalizedHex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  })();

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className="w-full h-24 rounded-lg border-2 border-gray-700 shadow-lg"
        style={{ backgroundColor: value }}
      />
      <div className="mt-2">
        <div className="font-semibold text-sm text-gray-300">{name}</div>
        <div className={`text-xs font-mono ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
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
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-4">
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

  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const theme = loadThemeSync(country);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Color Palette</h1>
          <p className="text-gray-400">Текущая палитра цветов проекта</p>
        </div>

        <ColorGroup title="Primary Colors" colors={theme.primary} />
        <ColorGroup title="Dark/Gray Colors" colors={theme.dark} />
        <ColorGroup title="Background Colors" colors={theme.bg} />
        <ColorGroup title="Semantic Colors" colors={theme.semantic} />

        <div className="mt-12 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-2xl font-bold text-white mb-6">Color Usage Reference</h3>

          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Primary Colors Usage</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <span className="font-semibold text-white">primary-500, primary-600:</span> Main
                  buttons, links, accents, gradients
                </li>
                <li>
                  <span className="font-semibold text-white">primary-400:</span> Secondary text,
                  icons, hover states
                </li>
                <li>
                  <span className="font-semibold text-white">primary-300:</span> Light accents,
                  borders
                </li>
                <li>
                  <span className="font-semibold text-white">primary-700, primary-800:</span> Dark
                  buttons, gradients
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">
                Background Colors Usage
              </h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <span className="font-semibold text-white">bg-dark:</span> Main page background,
                  cards, modals
                </li>
                <li>
                  <span className="font-semibold text-white">bg-light:</span> Secondary cards,
                  buttons, hover states
                </li>
                <li>
                  <span className="font-semibold text-white">bg-darker:</span> Darker cards, listing
                  cards background
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Semantic Colors Usage</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <span className="font-semibold text-white">success:</span> Success messages,
                  positive indicators
                </li>
                <li>
                  <span className="font-semibold text-white">error:</span> Error messages,
                  validation errors
                </li>
                <li>
                  <span className="font-semibold text-white">warning:</span> Warning messages,
                  caution indicators
                </li>
                <li>
                  <span className="font-semibold text-white">info:</span> Information messages,
                  tooltips
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Components</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>
                  <span className="font-semibold text-white">Buttons:</span> primary-500/600
                  (primary), bg-light + primary-500 border (secondary)
                </div>
                <div>
                  <span className="font-semibold text-white">ListingCard:</span> bg-darker (card),
                  bg-light (badges), primary-400/500 (text, borders)
                </div>
                <div>
                  <span className="font-semibold text-white">Modal:</span> bg-dark (background),
                  primary-500/600 (title gradient)
                </div>
                <div>
                  <span className="font-semibold text-white">Forms:</span> bg-light (inputs),
                  primary-500 (focus states, borders)
                </div>
                <div>
                  <span className="font-semibold text-white">Header/Footer:</span> bg-dark,
                  primary-500 (links, accents)
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-primary-400 mb-3">Pages</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
                <div>
                  <span className="font-semibold text-white">Home (/):</span> bg-dark,
                  primary-500/600 gradients
                </div>
                <div>
                  <span className="font-semibold text-white">Listings (/listings):</span> bg-dark,
                  bg-darker (cards), primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-white">Listing Detail (/listings/[id]):</span>{' '}
                  bg-dark, bg-light, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-white">New Listing (/listings/new):</span>{' '}
                  bg-dark, bg-light (forms), primary-500
                </div>
                <div>
                  <span className="font-semibold text-white">Login (/login):</span> bg-dark,
                  primary-500/600
                </div>
                <div>
                  <span className="font-semibold text-white">Register (/register):</span> bg-dark,
                  primary-500/600
                </div>
                <div>
                  <span className="font-semibold text-white">Profile (/profile):</span> bg-dark,
                  bg-light, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-white">My Listings (/my-listings):</span>{' '}
                  bg-dark, bg-darker, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-white">Favorites (/favorites):</span> bg-dark,
                  bg-darker, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-white">Terms (/terms):</span> bg-dark,
                  primary-500/600 (title), primary-300 (sections)
                </div>
                <div>
                  <span className="font-semibold text-white">Privacy (/privacy):</span> bg-dark,
                  primary-500/600
                </div>
                <div>
                  <span className="font-semibold text-white">FAQ (/faq):</span> bg-dark,
                  primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-white">Verify Email (/verify-email):</span>{' '}
                  bg-dark, primary-400/500
                </div>
                <div>
                  <span className="font-semibold text-white">Verify Phone (/verify-phone):</span>{' '}
                  bg-dark, bg-light (inputs), primary-500
                </div>
                <div>
                  <span className="font-semibold text-white">Admin (/admin):</span> bg-dark,
                  primary-500/600
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">JSON Export</h3>
          <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-900 p-4 rounded border border-gray-700 rounded-lg">
            {JSON.stringify(theme, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge, Button, Card, Heading, Input, Select, Spinner, Textarea, Typography } from '@/ui';

const isProduction = process.env.NODE_ENV === 'production';

const sections = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'inputs', label: 'Input Fields' },
  { id: 'textarea', label: 'Textarea' },
  { id: 'select', label: 'Select' },
  { id: 'cards', label: 'Cards' },
  { id: 'badges', label: 'Badges' },
  { id: 'typography', label: 'Typography' },
  { id: 'spinner', label: 'Loading Spinner' },
  { id: 'tokens', label: 'Design Tokens' },
];

const PRIMARY_COLORS = [
  { shade: 50, color: '#f0fdf4' },
  { shade: 100, color: '#dcfce7' },
  { shade: 200, color: '#bbf7d0' },
  { shade: 300, color: '#86efac' },
  { shade: 400, color: '#4ade80' },
  { shade: 500, color: '#00ff88' },
  { shade: 600, color: '#00d084' },
  { shade: 700, color: '#16a34a' },
  { shade: 800, color: '#15803d' },
  { shade: 900, color: '#14532d' },
];

function DesignSystemNotFound() {
  return (
    <div className="min-h-screen bg-linear-to-br from-bg-dark to-bg-darker flex items-center justify-center px-4">
      <div className="text-center max-w-2xl w-full">
        <div className="mb-8">
          <h1 className="text-9xl md:text-[12rem] font-extrabold bg-linear-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Страницата не е пронајдена
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            За жал, страницата која ја барате не постои или е преместена.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="btn-primary px-8 py-3 text-lg font-semibold inline-flex items-center gap-2"
          >
            <span>Кон почетна</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </Link>
          <Link href="/listings" className="btn-outline px-8 py-3 text-lg font-semibold">
            Прегледај објави
          </Link>
        </div>
      </div>
    </div>
  );
}

function DesignTokensSection() {
  return (
    <section id="tokens" className="space-y-6 scroll-mt-20">
      <Heading level={2}>Design Tokens</Heading>
      <div className="card p-6">
        <div className="space-y-6">
          <div>
            <Typography variant="small" className="mb-3 text-gray-400">
              Primary Colors
            </Typography>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
              {PRIMARY_COLORS.map(({ shade, color }) => (
                <div key={shade} className="text-center">
                  <div
                    className="h-16 rounded-lg mb-2 border border-primary-500/20"
                    style={{ backgroundColor: color }}
                  />
                  <Typography variant="caption" className="text-xs">
                    {shade}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Typography variant="small" className="mb-3 text-gray-400">
              Background Colors
            </Typography>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="h-16 rounded-lg mb-2 bg-bg-base border border-primary-500/20" />
                <Typography variant="caption">bg-dark</Typography>
              </div>
              <div className="text-center">
                <div className="h-16 rounded-lg mb-2 bg-bg-secondary border border-primary-500/20" />
                <Typography variant="caption">bg-light</Typography>
              </div>
              <div className="text-center">
                <div className="h-16 rounded-lg mb-2 bg-bg-darker border border-primary-500/20" />
                <Typography variant="caption">bg-darker</Typography>
              </div>
            </div>
          </div>
          <div>
            <Typography variant="small" className="mb-3 text-gray-400">
              Semantic Colors
            </Typography>
            <div className="flex flex-wrap gap-4">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DesignSystemPage() {
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  if (isProduction) return <DesignSystemNotFound />;

  return (
    <div className="min-h-screen bg-linear-to-br from-bg-dark to-bg-darker">
      <div className="sticky top-0 z-50 bg-bg-base/95 backdrop-blur-xs border-b border-primary-500/20">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-extrabold bg-linear-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent"
            >
              Kupito
            </Link>
            <nav className="hidden md:flex gap-4">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-gray-300 hover:text-primary-500 transition-colors text-sm"
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <Link href="/" className="btn-outline px-3 py-1.5 text-sm">
              Back to App
            </Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12 space-y-16 max-w-7xl">
        <div className="text-center mb-12">
          <Heading level={1} gradient className="mb-4">
            Kupito Design System
          </Heading>
          <Typography variant="body" className="text-gray-300">
            Interactive documentation for all UI components
          </Typography>
        </div>

        <section id="buttons" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Buttons</Heading>
          <div className="card p-6">
            <div className="space-y-6">
              <div>
                <Typography variant="small" className="mb-3 text-gray-400">
                  Variants
                </Typography>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="yellow">Yellow</Button>
                  <Button variant="green-dark">Green Dark</Button>
                </div>
              </div>
              <div>
                <Typography variant="small" className="mb-3 text-gray-400">
                  Sizes
                </Typography>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="primary" size="sm">
                    Small
                  </Button>
                  <Button variant="primary" size="md">
                    Medium
                  </Button>
                  <Button variant="primary" size="lg">
                    Large
                  </Button>
                </div>
              </div>
              <div>
                <Typography variant="small" className="mb-3 text-gray-400">
                  States
                </Typography>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Normal</Button>
                  <Button variant="primary" disabled>
                    Disabled
                  </Button>
                  <Button variant="primary" fullWidth>
                    Full Width
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="inputs" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Input Fields</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-6 space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="example@email.com"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  helperText="Minimum 8 characters"
                />
                <Input label="Error Example" error="This field is required" />
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <Typography variant="small" className="text-gray-400 mb-4">
                  Code Example
                </Typography>
                <pre className="bg-bg-darker p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-gray-300">{`<Input
  label="Email"
  type="email"
  placeholder="example@email.com"
  error={errors.email}
  helperText="Enter a valid email"
/>`}</code>
                </pre>
              </div>
            </Card>
          </div>
        </section>

        <section id="textarea" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Textarea</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <Textarea
                  label="Description"
                  placeholder="Enter description..."
                  rows={4}
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  helperText="Maximum 500 characters"
                />
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <Typography variant="small" className="text-gray-400 mb-4">
                  Code Example
                </Typography>
                <pre className="bg-bg-darker p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-gray-300">{`<Textarea
  label="Description"
  placeholder="Enter description..."
  rows={4}
  helperText="Maximum 500 characters"
/>`}</code>
                </pre>
              </div>
            </Card>
          </div>
        </section>

        <section id="select" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Select</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <Select
                  label="City"
                  options={[
                    { value: '', label: 'Select a city' },
                    { value: 'skopje', label: 'Skopje' },
                    { value: 'bitola', label: 'Bitola' },
                    { value: 'ohrid', label: 'Ohrid' },
                    { value: 'tetovo', label: 'Tetovo' },
                  ]}
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                />
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <Typography variant="small" className="text-gray-400 mb-4">
                  Code Example
                </Typography>
                <pre className="bg-bg-darker p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-gray-300">{`<Select
  label="City"
  options={[
    { value: 'skopje', label: 'Skopje' },
    { value: 'bitola', label: 'Bitola' },
  ]}
/>`}</code>
                </pre>
              </div>
            </Card>
          </div>
        </section>

        <section id="cards" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Cards</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card hover>
              <div className="p-6">
                <Heading level={3} className="mb-2">
                  Card with Hover
                </Heading>
                <Typography variant="body">This card has a hover effect enabled.</Typography>
              </div>
            </Card>
            <Card>
              <div className="p-6">
                <Heading level={3} className="mb-2">
                  Regular Card
                </Heading>
                <Typography variant="body">This is a regular card without hover effect.</Typography>
              </div>
            </Card>
            <Card hover>
              <div className="p-6">
                <Heading level={3} className="mb-2">
                  Another Card
                </Heading>
                <Typography variant="body">Multiple cards in a grid layout.</Typography>
              </div>
            </Card>
          </div>
        </section>

        <section id="badges" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Badges</Heading>
          <div className="card p-6">
            <div className="space-y-6">
              <div>
                <Typography variant="small" className="mb-3 text-gray-400">
                  Variants
                </Typography>
                <div className="flex flex-wrap gap-4">
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="neutral">Neutral</Badge>
                </div>
              </div>
              <div>
                <Typography variant="small" className="mb-3 text-gray-400">
                  Sizes
                </Typography>
                <div className="flex flex-wrap gap-4 items-center">
                  <Badge variant="success" size="sm">
                    Small
                  </Badge>
                  <Badge variant="success" size="md">
                    Medium
                  </Badge>
                  <Badge variant="success" size="lg">
                    Large
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="typography" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Typography</Heading>
          <div className="card p-6 space-y-6">
            <div>
              <Typography variant="small" className="mb-3 text-gray-400">
                Headings
              </Typography>
              <div className="space-y-3">
                <Heading level={1}>Heading 1</Heading>
                <Heading level={2}>Heading 2</Heading>
                <Heading level={3}>Heading 3</Heading>
                <Heading level={4}>Heading 4</Heading>
                <Heading level={1} gradient>
                  Heading 1 with Gradient
                </Heading>
              </div>
            </div>
            <div>
              <Typography variant="small" className="mb-3 text-gray-400">
                Text Variants
              </Typography>
              <div className="space-y-2">
                <Typography variant="body">
                  Body text - Regular paragraph text for content
                </Typography>
                <Typography variant="small">Small text - For secondary information</Typography>
                <Typography variant="caption">Caption text - For labels and metadata</Typography>
              </div>
            </div>
          </div>
        </section>

        <section id="spinner" className="space-y-6 scroll-mt-20">
          <Heading level={2}>Loading Spinner</Heading>
          <div className="card p-6">
            <div className="space-y-8">
              <div>
                <Typography variant="small" className="mb-3 text-gray-400">
                  Sizes
                </Typography>
                <div className="flex flex-wrap gap-8 items-center">
                  <div className="text-center">
                    <Spinner size="sm" />
                    <Typography variant="caption" className="mt-2 block">
                      Small
                    </Typography>
                  </div>
                  <div className="text-center">
                    <Spinner size="md" />
                    <Typography variant="caption" className="mt-2 block">
                      Medium
                    </Typography>
                  </div>
                  <div className="text-center">
                    <Spinner size="lg" />
                    <Typography variant="caption" className="mt-2 block">
                      Large
                    </Typography>
                  </div>
                </div>
              </div>
              <div>
                <Typography variant="small" className="mb-3 text-gray-400">
                  With Text
                </Typography>
                <div className="flex flex-wrap gap-8">
                  <Spinner size="md" text="Loading..." />
                </div>
              </div>
            </div>
          </div>
        </section>

        <DesignTokensSection />
      </div>
    </div>
  );
}

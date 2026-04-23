import { CopyButton } from '@/components/common/CopyButton';
import type { User } from '@/lib/api';
import { formatPhoneForDisplay } from '@/lib/phone';

type TFn = (key: string) => string;

function ContactsFullNameRow({ user, t }: { user: User; t: TFn }) {
  if (user.type !== 'Individual') {
    return null;
  }
  const fullName = `${user.firstName?.trim() || ''} ${user.lastName?.trim() || ''}`.trim() || '—';
  return (
    <div>
      <span className="text-primary-900">{t('admin.usersTab.contactsFullName')}:</span>{' '}
      <span>{fullName}</span>
    </div>
  );
}

function ContactsEmailRow({ user, t }: { user: User; t: TFn }) {
  const email = user.email?.trim() || '';
  return (
    <div>
      <span className="text-primary-900">{t('admin.usersTab.contactsEmail')}:</span>{' '}
      <span className="inline-flex items-center gap-2">
        <span>{email || '—'}</span>
        {email ? <CopyButton text={email} label={t('admin.usersTab.contactsEmail')} /> : null}
      </span>
    </div>
  );
}

function ContactsEmailVerifiedRow({ user, t }: { user: User; t: TFn }) {
  const email = user.email?.trim();
  const verifiedLabel = email
    ? user.emailVerified === true
      ? t('common.yes')
      : t('common.no')
    : '—';
  return (
    <div>
      <span className="text-primary-900">{t('admin.usersTab.contactsEmailVerified')}:</span>{' '}
      <span>{verifiedLabel}</span>
    </div>
  );
}

function ContactsMainPhoneRow({ user, t }: { user: User; t: TFn }) {
  if (user.type !== 'Business') {
    return null;
  }
  const phone = user.phone?.trim() || '';
  const phoneDisplay = phone ? formatPhoneForDisplay(phone) : '';
  return (
    <div>
      <span className="text-primary-900">{t('admin.usersTab.contactsMainPhone')}:</span>{' '}
      <span className="inline-flex items-center gap-2">
        <span>{phoneDisplay || '—'}</span>
        {phone ? (
          <CopyButton text={phoneDisplay} label={t('admin.usersTab.contactsMainPhone')} />
        ) : null}
      </span>
    </div>
  );
}

function ContactsAdditionalPhoneRow({ user, t }: { user: User; t: TFn }) {
  if (user.type !== 'Business') {
    return null;
  }
  const phone = user.additionalPhone?.trim() || '';
  const phoneDisplay = phone ? formatPhoneForDisplay(phone) : '';
  return (
    <div>
      <span className="text-primary-900">{t('admin.usersTab.contactsAdditionalPhone')}:</span>{' '}
      <span className="inline-flex items-center gap-2">
        <span>{phoneDisplay || '—'}</span>
        {phone ? (
          <CopyButton text={phoneDisplay} label={t('admin.usersTab.contactsAdditionalPhone')} />
        ) : null}
      </span>
    </div>
  );
}

export function UsersTabContactsModalFields({ user, t }: { user: User; t: TFn }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <ContactsFullNameRow user={user} t={t} />
      <ContactsEmailRow user={user} t={t} />
      <ContactsEmailVerifiedRow user={user} t={t} />
      <ContactsMainPhoneRow user={user} t={t} />
      <ContactsAdditionalPhoneRow user={user} t={t} />
    </div>
  );
}

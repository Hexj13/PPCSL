import { Modal } from '@/components/modals/Modal';
import type { User } from '@/lib/api';

import { UsersTabContactsModalFields } from './UsersTabContactsModalFields';

type UsersTabContactsModalProps = {
  contactsUser: User | null;
  onClose: () => void;
  t: (key: string) => string;
};

export function UsersTabContactsModal({ contactsUser, onClose, t }: UsersTabContactsModalProps) {
  return (
    <Modal
      isOpen={contactsUser !== null}
      onClose={onClose}
      title={t('admin.usersTab.contactsModalTitle')}
      size="small"
    >
      <div className="space-y-3 text-sm text-text-secondary">
        {contactsUser ? <UsersTabContactsModalFields user={contactsUser} t={t} /> : null}
      </div>
    </Modal>
  );
}

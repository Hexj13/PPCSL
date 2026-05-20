import type { ListingEquipmentDisplay } from '@/lib/options';

function ListingPageEquipmentColumnLists({
  left,
  right,
  t,
}: {
  left: string[];
  right: string[];
  t: (k: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
      <ul
        className="list-disc list-outside pl-5 space-y-1"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {left.map((key) => (
          <li key={key} className="ml-0">
            {t(`vehicleOptions.equipment.${key}`)}
          </li>
        ))}
      </ul>
      <ul
        className="list-disc list-outside pl-5 space-y-1"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {right.map((key) => (
          <li key={key} className="ml-0">
            {t(`vehicleOptions.equipment.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ListingPageEquipmentSection({
  equipmentDisplay,
  t,
}: {
  equipmentDisplay: ListingEquipmentDisplay;
  t: (k: string) => string;
}) {
  if (equipmentDisplay.mode === 'flat') {
    if (equipmentDisplay.left.length === 0 && equipmentDisplay.right.length === 0) return null;
    return (
      <div className="surface overflow-hidden">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
          {t('listingDetail.equipment')}
        </h2>
        <ListingPageEquipmentColumnLists
          left={equipmentDisplay.left}
          right={equipmentDisplay.right}
          t={t}
        />
      </div>
    );
  }

  if (equipmentDisplay.groups.length === 0) return null;

  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.equipment')}
      </h2>
      <div className="space-y-6">
        {equipmentDisplay.groups.map(({ category, left, right }) => (
          <div key={category} data-testid={`listing-detail-equipment-${category}`}>
            <h3 className="text-sm font-semibold mb-3 text-primary-700">
              {t(`vehicleOptions.equipmentCategories.${category}`)}
            </h3>
            <ListingPageEquipmentColumnLists left={left} right={right} t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

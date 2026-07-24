import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { maxSearchBrandSelections, maxSearchModelSelections } from '../../../common/constants';

import { SearchListingsDto } from './search-listings.dto';

function fakeUuid(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

describe('SearchListingsDto', () => {
  it(`rejects brand_ids array longer than ${maxSearchBrandSelections}`, () => {
    const dto = plainToInstance(SearchListingsDto, {
      brand_ids: Array.from({ length: maxSearchBrandSelections + 1 }, (_, index) =>
        fakeUuid(index),
      ),
    });

    const errors = validateSync(dto);
    const brandIdsError = errors.find((error) => error.property === 'brand_ids');

    expect(brandIdsError?.constraints).toBeDefined();
    expect(Object.values(brandIdsError?.constraints ?? {})).toContain(
      `errors.searchBrandIdsLimit|${maxSearchBrandSelections}`,
    );
  });

  it(`rejects model_ids array longer than ${maxSearchModelSelections}`, () => {
    const dto = plainToInstance(SearchListingsDto, {
      model_ids: Array.from({ length: maxSearchModelSelections + 1 }, (_, index) =>
        fakeUuid(index),
      ),
    });

    const errors = validateSync(dto);
    const modelIdsError = errors.find((error) => error.property === 'model_ids');

    expect(modelIdsError?.constraints).toBeDefined();
    expect(Object.values(modelIdsError?.constraints ?? {})).toContain(
      `errors.searchModelIdsLimit|${maxSearchModelSelections}`,
    );
  });
});

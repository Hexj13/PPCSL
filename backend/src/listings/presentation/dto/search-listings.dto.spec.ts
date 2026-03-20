import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { SearchListingsDto } from './search-listings.dto';

describe('SearchListingsDto', () => {
  it('rejects brand_ids array longer than 20', () => {
    const dto = plainToInstance(SearchListingsDto, {
      brand_ids: Array.from({ length: 21 }, (_, index) => `${index}`),
    });

    const errors = validateSync(dto);
    const brandIdsError = errors.find((error) => error.property === 'brand_ids');

    expect(brandIdsError?.constraints).toBeDefined();
    expect(Object.values(brandIdsError?.constraints ?? {})).toContain(
      'errors.searchBrandIdsLimit|20',
    );
  });

  it('rejects model_ids array longer than 20', () => {
    const dto = plainToInstance(SearchListingsDto, {
      model_ids: Array.from({ length: 21 }, (_, index) => `${index}`),
    });

    const errors = validateSync(dto);
    const modelIdsError = errors.find((error) => error.property === 'model_ids');

    expect(modelIdsError?.constraints).toBeDefined();
    expect(Object.values(modelIdsError?.constraints ?? {})).toContain(
      'errors.searchModelIdsLimit|20',
    );
  });
});

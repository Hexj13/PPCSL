import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { extractListingIdFromRouteParam } from '../../application/utils/listing-url-slug.utils';

@Injectable()
export class ParseListingIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const id = extractListingIdFromRouteParam(value);
    if (!id) {
      throw new BadRequestException('errors.invalidListingId');
    }
    return id;
  }
}

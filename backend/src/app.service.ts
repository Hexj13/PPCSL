import { Injectable } from '@nestjs/common';

import { formatApiHello } from './common/platform-name';

@Injectable()
export class AppService {
  getHello(): string {
    return formatApiHello();
  }
}

import { PartialType } from '@nestjs/swagger';

import { CreateTireBrandDto } from './create-tire-brand.dto';

export class UpdateTireBrandDto extends PartialType(CreateTireBrandDto) {}

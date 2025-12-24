import { MigrationInterface, QueryRunner } from 'typeorm';

const COLOR_MAPPING: Record<string, string> = {
  Црна: 'black',
  Бела: 'white',
  Сива: 'gray',
  Сребрена: 'silver',
  Сина: 'blue',
  Црвена: 'red',
  Зелена: 'green',
  Жолта: 'yellow',
  Кафена: 'brown',
  Портокалова: 'orange',
  Розова: 'pink',
  Виолетова: 'violet',
  Бежова: 'beige',
  Златна: 'gold',
  Бронзена: 'bronze',
  Темносина: 'dark_blue',
  Светлосина: 'light_blue',
  Темносива: 'dark_gray',
  Светлосива: 'light_gray',
  'Металик црна': 'metallic_black',
  'Металик бела': 'metallic_white',
  'Металик сива': 'metallic_gray',
  'Металик сребрена': 'metallic_silver',
  'Металик сина': 'metallic_blue',
  'Металик црвена': 'metallic_red',
  Перла: 'pearl',
  'Металик перла': 'metallic_pearl',
  'Матирана црна': 'matte_black',
  'Матирана сива': 'matte_gray',
  'Матирана сина': 'matte_blue',
};

export class ConvertColorsToEnglishKeys1777000000000 implements MigrationInterface {
  name = 'ConvertColorsToEnglishKeys1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [mkColor, enKey] of Object.entries(COLOR_MAPPING)) {
      const escapedMkColor = mkColor.replace(/'/g, "''");
      const escapedEnKey = enKey.replace(/'/g, "''");
      await queryRunner.query(
        `UPDATE "vehicles" SET "color" = '${escapedEnKey}' WHERE "color" = '${escapedMkColor}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [mkColor, enKey] of Object.entries(COLOR_MAPPING)) {
      const escapedMkColor = mkColor.replace(/'/g, "''");
      const escapedEnKey = enKey.replace(/'/g, "''");
      await queryRunner.query(
        `UPDATE "vehicles" SET "color" = '${escapedMkColor}' WHERE "color" = '${escapedEnKey}'`,
      );
    }
  }
}

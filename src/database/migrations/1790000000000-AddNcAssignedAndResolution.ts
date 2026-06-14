import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNcAssignedAndResolution1790000000000 implements MigrationInterface {
  name = 'AddNcAssignedAndResolution1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "non_conformities" ADD "assigned_to" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformities" ADD "resolution" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "non_conformities" DROP COLUMN "resolution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "non_conformities" DROP COLUMN "assigned_to"`,
    );
  }
}

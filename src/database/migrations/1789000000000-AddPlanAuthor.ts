import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanAuthor1789000000000 implements MigrationInterface {
  name = 'AddPlanAuthor1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" ADD "author" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "author"`);
  }
}

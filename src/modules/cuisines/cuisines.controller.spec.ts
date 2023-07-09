import { Test, TestingModule } from '@nestjs/testing';
import { CuisinesController } from './cuisines.controller';
import { CuisinesService } from './cuisines.service';

describe('CuisinesController', () => {
  let controller: CuisinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuisinesController],
      providers: [CuisinesService],
    }).compile();

    controller = module.get<CuisinesController>(CuisinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

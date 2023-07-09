import { Test, TestingModule } from '@nestjs/testing';
import { CuisinesService } from './cuisines.service';

describe('CuisinesService', () => {
  let service: CuisinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CuisinesService],
    }).compile();

    service = module.get<CuisinesService>(CuisinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

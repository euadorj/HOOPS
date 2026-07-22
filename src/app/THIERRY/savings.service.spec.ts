import { TestBed } from '@angular/core/testing';

import { Savings } from './savings.service';

describe('Savings', () => {
  let service: Savings;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Savings);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

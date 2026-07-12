import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BENEDICTREWARDSPage } from './benedict-rewards.page';

describe('BENEDICTREWARDSPage', () => {
  let component: BENEDICTREWARDSPage;
  let fixture: ComponentFixture<BENEDICTREWARDSPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BENEDICTREWARDSPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

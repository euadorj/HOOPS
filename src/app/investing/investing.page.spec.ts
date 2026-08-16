import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvestingPage } from './investing.page';

describe('InvestingPage', () => {
  let component: InvestingPage;
  let fixture: ComponentFixture<InvestingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InvestingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

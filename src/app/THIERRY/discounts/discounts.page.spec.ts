import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiscountsPage } from './discounts.page';

describe('DiscountsPage', () => {
  let component: DiscountsPage;
  let fixture: ComponentFixture<DiscountsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DiscountsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

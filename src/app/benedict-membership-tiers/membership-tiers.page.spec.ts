import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MembershipTiersPage } from './membership-tiers.page';

describe('MembershipTiersPage', () => {
  let component: MembershipTiersPage;
  let fixture: ComponentFixture<MembershipTiersPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MembershipTiersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

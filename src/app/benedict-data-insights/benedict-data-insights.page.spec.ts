import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BENEDICTDATAINSIGHTSPage } from './benedict-data-insights.page';

describe('BENEDICTDATAINSIGHTSPage', () => {
  let component: BENEDICTDATAINSIGHTSPage;
  let fixture: ComponentFixture<BENEDICTDATAINSIGHTSPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BENEDICTDATAINSIGHTSPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

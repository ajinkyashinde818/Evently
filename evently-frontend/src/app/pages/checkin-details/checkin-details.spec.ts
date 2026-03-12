import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinDetails } from './checkin-details';

describe('CheckinDetails', () => {
  let component: CheckinDetails;
  let fixture: ComponentFixture<CheckinDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckinDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

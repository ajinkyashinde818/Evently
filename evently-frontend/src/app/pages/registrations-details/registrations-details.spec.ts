import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrationsDetails } from './registrations-details';

describe('RegistrationsDetails', () => {
  let component: RegistrationsDetails;
  let fixture: ComponentFixture<RegistrationsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationsDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistrationsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventRegister } from './event-register';

describe('EventRegister', () => {
  let component: EventRegister;
  let fixture: ComponentFixture<EventRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventRegister]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventRegister);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventMedia } from './event-media';

describe('EventMedia', () => {
  let component: EventMedia;
  let fixture: ComponentFixture<EventMedia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventMedia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventMedia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

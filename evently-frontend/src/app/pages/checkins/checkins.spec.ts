import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Checkins } from './checkins';

describe('Checkins', () => {
  let component: Checkins;
  let fixture: ComponentFixture<Checkins>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Checkins]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Checkins);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

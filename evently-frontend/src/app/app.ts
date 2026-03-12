import { RouterOutlet } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from './services/event';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  events: any[] = [];
  memories: any[] = [];
  selectedEventId: number | null = null;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents() {
    this.eventService.getAllEvents().subscribe((data: any) => {
      this.events = data;
      console.log("Events:", data);
    });
  }

  selectEvent(eventId: number) {
    this.selectedEventId = eventId;

    this.eventService.getMemories(eventId).subscribe((data: any) => {
      this.memories = data;
      console.log("Memories:", data);
    });
  }
}

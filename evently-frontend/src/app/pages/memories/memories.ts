import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-memories',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './memories.html',
  styleUrls: ['./memories.css']
})
export class Memories implements OnInit {

  events: any[] = [];
  filteredEvents: any[] = [];
  searchTerm: string = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.http.get<any[]>("http://localhost:5000/api/events")
      .subscribe({
        next:(data)=>{
          this.events = data.map(event => ({
            id: event.id,
            title: event.title,
            location: event.city,
            status: event.status?.toLowerCase() || "upcoming"
          }));
          this.filteredEvents = this.events;
        },
        error:(err)=>{
          console.error("Failed to load events", err);
        }
      });
  }

  filterEvents() {
    if (!this.searchTerm) {
      this.filteredEvents = this.events;
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredEvents = this.events.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.status.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower)
      );
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.filteredEvents = this.events;
  }

  openImages(eventId: number) {
    this.router.navigate(['/memories/images', eventId]);
  }

  trackByEvent(index: number, event: any) {
    return event.id;
  }

}
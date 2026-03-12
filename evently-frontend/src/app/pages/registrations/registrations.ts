import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-registrations',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './registrations.html',
  styleUrls: ['./registrations.css']
})
export class Registrations implements OnInit {

  events: any[] = [];
  filteredEvents: any[] = [];
  searchTerm: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents() {
    this.http.get<any[]>("http://localhost:5000/api/events/all")
      .subscribe({
        next: (data) => {
          this.events = data
            .filter(event => event.status !== 'deleted') // Filter out deleted events
            .map(event => ({
              id: event.id,
              title: event.title,
              date: new Date(event.start_date).toLocaleDateString(),
              status: event.status,
              registrations: event.registrations_count
            }));
          this.filteredEvents = this.events;
        },
        error: (err) => {
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
        event.status.toLowerCase().includes(searchLower)
      );
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.filteredEvents = this.events;
  }

}
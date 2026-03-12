import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkins',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './checkins.html',
  styleUrls: ['./checkins.css']
})
export class Checkins implements OnInit {

  events: any[] = [];
  filteredEvents: any[] = [];
  searchTerm: string = '';

  constructor(private http: HttpClient){}

  ngOnInit(){
    this.http.get<any[]>("http://localhost:5000/api/events")
    .subscribe({
      next:(data)=>{
        this.events = data.map(e => ({
          id:e.id,
          title:e.title,
          date:new Date(e.start_date).toDateString(),
          status:e.status
        }));
        this.filteredEvents = this.events;
      },
      error:(err)=>{
        console.error("Failed to load events",err);
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
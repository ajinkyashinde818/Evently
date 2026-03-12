import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Event {

  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getAllEvents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/events/all`);
  }

  getMemories(eventId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/events/memory/${eventId}`);
  }
}

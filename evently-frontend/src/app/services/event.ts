import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  private apiUrl = 'http://localhost:5000/api/events';

  constructor(private http: HttpClient) { }

  getAllEvents(): Observable<any[]> {   // ✅ FIXED
    return this.http.get<any[]>(`${this.apiUrl}/all`);
  }

  getMemories(eventId: number): Observable<any[]> {   // ✅ FIXED
    return this.http.get<any[]>(`${this.apiUrl}/memory/${eventId}`);
  }
}

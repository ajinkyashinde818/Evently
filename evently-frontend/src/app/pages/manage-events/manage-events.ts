import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PopupService } from '../../shared/popup/popup.service';

@Component({
  selector: 'app-manage-events',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './manage-events.html',
  styleUrls: ['./manage-events.css'] // changed styleUrl to styleUrls
})
export class ManageEvents implements OnInit {

  events:any[] = [];
  filteredEvents:any[] = [];
  registrations:any[] = []; // Store registrations for all events

  searchText:string = '';
  selectedStatus:string = 'all';

  constructor(
    private router:Router,
    private http:HttpClient,
    private popupService: PopupService
  ){}

  ngOnInit(){
    this.loadEvents();
  }

  // ================= LOAD EVENTS =================
  loadEvents(){

    this.http.get<any[]>("http://localhost:5000/api/events/all")
    .subscribe({

      next:(data)=>{

        this.events = data.map(event => ({

          id:event.id,

          title:event.title,

          location:event.city,

          date:event.start_date,

          limit:event.registration_limit,

          status:event.status

        }));

        // Load registrations for all events
        this.loadRegistrations();

        this.applyFilters();

      },

      error:(err)=>{
        console.error("Failed to load events",err);
      }

    });

  }

  // ================= LOAD REGISTRATIONS =================
  loadRegistrations(){

    this.http.get<any[]>("http://localhost:5000/api/registrations/")
    .subscribe({

      next:(data)=>{

        this.registrations = data;

        // Update events with actual registration counts
        this.updateEventRegistrations();

      },

      error:(err)=>{

        console.error("Failed to load registrations",err);

      }

    });

  }

  // ================= UPDATE EVENT REGISTRATIONS =================
  updateEventRegistrations(){

    this.events.forEach(event => {

      const eventRegistrations = this.registrations.filter(reg => reg.event_id === event.id);

      event.registered = eventRegistrations.length;

      event.registeredUsers = eventRegistrations;

    });

    this.applyFilters();

  }

  // ================= SEARCH + FILTER =================
  applyFilters(){

    this.filteredEvents = this.events.filter(event=>{

      const matchesSearch =

      event.title
      .toLowerCase()
      .includes(this.searchText.toLowerCase())

      ||

      event.location
      .toLowerCase()
      .includes(this.searchText.toLowerCase());


      const matchesStatus =

      this.selectedStatus === 'all'

      ||

      event.status === this.selectedStatus;


      return matchesSearch && matchesStatus;

    });

  }


  // ================= DELETE EVENT =================
  deleteEvent(event: any) {
    this.popupService.confirm("Delete this event and generate report?").then((confirmed) => {
      if (confirmed) {
        this.http.delete(
          `http://localhost:5000/api/events/delete/${event.id}`,
          { responseType: 'blob' }
        ).subscribe({
          next: (response: Blob) => {
            /* DOWNLOAD REPORT */
            const url = window.URL.createObjectURL(response);
            const a = document.createElement("a");
            a.href = url;
            a.download = event.title + "-report.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            /* REMOVE EVENT FROM UI */
            this.events = this.events.filter(e => e.id !== event.id);
            this.applyFilters();
            this.popupService.success("Event deleted successfully");
          },
          error: (err) => {
            console.error(err);
            this.popupService.error("Delete failed");
          }
        });
      }
    });
  }

  // ================= END EVENT =================
  endEvent(id: number) {
    this.popupService.confirm("End this event? This will generate and send certificates to all registered participants.").then((confirmed) => {
      if (confirmed) {
        this.http.put(
          "http://localhost:5000/api/events/end/" + id,
          {}
        )
        .subscribe({
          next: () => {
            this.popupService.success("Event marked as completed and certificates sent to all registered participants!");
            this.loadEvents();
          },
          error: (err) => {
            console.error("End event failed", err);
          }
        });
      }
    });
  }


  // ================= MANAGE MEDIA =================
  manageMedia(id:number){

    this.router.navigate(
      ['/event-media', id]
    );

  }


  // ================= BANNER METHODS =================

  getBannerUrl(bannerImage: string): string {
    if (!bannerImage) return '';
    const encodedFileName = encodeURIComponent(bannerImage);
    return `http://localhost:5000/uploads/banners/${encodedFileName}`;
  }

  onBannerImageError(event: any): void {
    console.log('Banner image failed to load for event:', event);
  }

  // ================= EDIT EVENT =================
  editEvent(id:number){

    this.router.navigate(
      ['/create-event'],
      {queryParams:{id:id}}
    );

  }


  // ================= CREATE EVENT =================
  goToCreateEvent(){

    this.router.navigate(['/create-event']);

  }

}
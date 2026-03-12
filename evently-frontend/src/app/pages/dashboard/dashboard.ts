import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit {

  userName:string='';

  totalEvents:number=0;
  upcomingEvents:number=0;
  completedEvents:number=0;
  totalParticipants:number=0;

  events:any[]=[];
  filteredEvents:any[]=[];

  eventSearch:string='';

  todayRegistrations:any[]=[];

  trendData:any[]=[];
  analyticsData:any[]=[];

  trendChart:any;
  analyticsChart:any;

  // Modal properties
  showModal: boolean = false;
  selectedEvent: any = null;
  bannerLoaded: boolean = false;

  constructor(
    private http:HttpClient,
    private router:Router
  ){}

  ngOnInit(){

    const user = localStorage.getItem("user");

    if(user){
      const parsedUser = JSON.parse(user);
      this.userName = parsedUser.name;
    }

    this.loadDashboard();

  }

  ngAfterViewInit(){}


  /* LOAD DASHBOARD DATA */

  loadDashboard(){

    this.http.get<any>("http://localhost:5000/api/dashboard")
    .subscribe(data=>{

      this.totalEvents=data.totalEvents;
      this.upcomingEvents=data.upcomingEvents;
      this.completedEvents=data.completedEvents;
      this.totalParticipants=data.participants;

      // Map 'draft' status to 'upcoming' for backward compatibility
      this.events=data.events.map((event: any) => ({
        ...event,
        status: event.status === 'draft' ? 'upcoming' : event.status
      }));
      this.filteredEvents=this.events;

      this.todayRegistrations=data.todayRegistrations;

      this.trendData=data.trend;
      this.analyticsData=data.analytics;

      setTimeout(()=>{

        this.createTrendChart();
        this.createAnalyticsChart();

      },200);

    });

  }


  /* SEARCH EVENTS */

  filterEvents(){

    if(!this.eventSearch){

      this.filteredEvents=this.events;
      return;

    }

    const text=this.eventSearch.toLowerCase();

    this.filteredEvents=this.events.filter(event=>

      event.title.toLowerCase().includes(text) ||
      event.city.toLowerCase().includes(text)

    );

  }


  /* CHARTS */

  createTrendChart(){

    const labels=this.trendData.map((x:any)=>x.date);
    const values=this.trendData.map((x:any)=>x.count);

    if(this.trendChart){
      this.trendChart.destroy();
    }

    this.trendChart=new Chart("trendChart",{

      type:"line",

      data:{
        labels:labels,
        datasets:[{
          data:values,
          borderColor:"#8b7355",
          backgroundColor:"rgba(217,207,194,0.5)",
          fill:true,
          tension:0.4
        }]
      },

      options:{
        responsive:true,
        plugins:{
          legend:{ display:false }
        }
      }

    });

  }


  createAnalyticsChart(){

    const labels=this.analyticsData.map((x:any)=>x.status);
    const values=this.analyticsData.map((x:any)=>x.count);

    if(this.analyticsChart){
      this.analyticsChart.destroy();
    }

    this.analyticsChart=new Chart("analyticsChart",{

      type:"doughnut",

      data:{
        labels:labels,
        datasets:[{
          data:values,
          backgroundColor:[
            "#8b7355",
            "#cdbfa8",
            "#e6dfd3"
          ]
        }]
      },

      options:{
        responsive:true,
        plugins:{
          legend:{ position:"bottom" }
        }
      }

    });

  }


  /* NAVIGATION */

  goToCreateEvent(){
    this.router.navigate(['/create-event']);
  }

  openRegistrationLink(eventId:string){

    const link=`http://localhost:4200/register/${eventId}`;

    window.open(link,'_blank');

  }

  /* EVENT DETAILS MODAL */

  showEventDetails(event: any): void {
    // Map 'draft' status to 'upcoming' for backward compatibility
    event.status = event.status === 'draft' ? 'upcoming' : event.status;
    
    this.selectedEvent = event;
    this.bannerLoaded = false;
    console.log('Opening event details:', event);
    console.log('Banner image:', event.banner_image);
    
    // Fetch complete event data to ensure banner is loaded
    this.http.get<any>(`http://localhost:5000/api/events/${event.id}`)
      .subscribe({
        next: (fullEventData) => {
          console.log('Full event data fetched:', fullEventData);
          // Map 'draft' status to 'upcoming' for backward compatibility
          fullEventData.status = fullEventData.status === 'draft' ? 'upcoming' : fullEventData.status;
          this.selectedEvent = fullEventData;
          console.log('Banner URL:', this.getBannerUrl(fullEventData.banner_image));
        },
        error: (err) => {
          console.error('Failed to fetch full event data:', err);
          // Use the event data we already have as fallback
          console.log('Banner URL (fallback):', this.getBannerUrl(event.banner_image));
        }
      });
    
    // Reset banner loaded state after a short delay
    setTimeout(() => {
      if (!this.bannerLoaded) {
        console.log('Banner taking too long to load, might be an issue');
      }
    }, 5000);
    
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedEvent = null;
    this.bannerLoaded = false;
    
    // Refresh dashboard data to pick up any changes from editing
    this.loadDashboard();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString;
    }
  }

  getBannerUrl(bannerImage: string): string {
    if (!bannerImage) return '';
    // Use the main uploads directory where images are actually stored
    return `http://localhost:5000/uploads/${bannerImage}`;
  }

  onImageLoad(): void {
    console.log('Banner loaded successfully');
    this.bannerLoaded = true;
  }

  onImageError(): void {
    console.log('Event banner image failed to load');
    console.log('Failed URL:', this.getBannerUrl(this.selectedEvent?.banner_image));
    console.log('Banner filename:', this.selectedEvent?.banner_image);
    
    // Try to construct alternative URLs
    if (this.selectedEvent?.banner_image) {
      const bannerUrl = `http://localhost:5000/uploads/banners/${this.selectedEvent.banner_image}`;
      const uploadUrl = `http://localhost:5000/uploads/${this.selectedEvent.banner_image}`;
      console.log('Trying banners URL:', bannerUrl);
      console.log('Trying uploads URL:', uploadUrl);
      
      // Try to set the src directly to alternative URL
      const imgElement = document.querySelector('.event-banner') as HTMLImageElement;
      if (imgElement) {
        imgElement.src = bannerUrl;
      }
    }
    
    this.bannerLoaded = false;
  }

}
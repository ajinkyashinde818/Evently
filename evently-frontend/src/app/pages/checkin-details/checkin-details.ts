import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-checkin-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './checkin-details.html',
  styleUrls: ['./checkin-details.css']
})
export class CheckinDetails implements OnInit, OnDestroy {

  eventId:number = 0;
  eventTitle:string = '';

  attendees:any[] = [];
  filteredAttendees:any[] = [];

  searchText:string = '';

  checkedInCount = 0;

  currentTime:string = '';
  currentDate:string = '';

  lastCheckinName:string = '-';
  lastCheckinTime:string = '-';

  timerInterval:any;

  scanner!: Html5Qrcode;
  showScanner=false;
  scanning=false;

  selectedAttendee:any;

  constructor(
    private route:ActivatedRoute,
    private http:HttpClient
  ){}

  /* ================= INIT ================= */

  ngOnInit(){

    this.route.paramMap.subscribe(params=>{

      this.eventId = Number(params.get('id'));

      this.loadEvent();
      this.loadAttendees();
      this.startTimer();

    });

  }

  ngOnDestroy(){

    clearInterval(this.timerInterval);

    if(this.scanner){
      this.scanner.stop().catch(()=>{});
    }

  }

  /* ================= LOAD EVENT ================= */

  loadEvent(){

    this.http.get<any>("http://localhost:5000/api/events/event/"+this.eventId)
    .subscribe({

      next:(event)=>{
        this.eventTitle = event.title;
      },

      error:(err)=>{
        console.error("Failed to load event",err);
      }

    });

  }

  /* ================= LOAD ATTENDEES ================= */

  loadAttendees(){

    this.http.get<any[]>("http://localhost:5000/api/registrations/event/" + this.eventId)
    .subscribe({

      next:(data)=>{

        this.attendees = data.map(user => ({

          id: user.id,
          name: user.name,
          email: user.email,
          ticketId: user.ticket_id,
          status: user.checked_in ? "Checked In" : "Pending"

        }));

        this.filteredAttendees = [...this.attendees];

        this.updateCounts();

      },

      error:(err)=>{
        console.error("Failed to load registrations", err);
      }

    });

  }

  /* ================= TIMER ================= */

  startTimer(){

    this.timerInterval = setInterval(()=>{

      const now = new Date();

      this.currentTime = now.toLocaleTimeString();
      this.currentDate = now.toDateString();

    },1000);

  }

  /* ================= SEARCH ================= */

  applySearch(){

    const text = this.searchText.toLowerCase();

    this.filteredAttendees = this.attendees.filter(a =>

      a.name.toLowerCase().includes(text) ||
      a.email.toLowerCase().includes(text)

    );

  }

  /* ================= OPEN SCANNER ================= */

  openScanner(attendee:any){

    this.selectedAttendee = attendee;

    this.showScanner = true;

    setTimeout(()=>{
      this.startScanner();
    },200);

  }

  /* ================= CLOSE SCANNER ================= */

  closeScanner(){

    this.showScanner = false;
    this.scanning = false;

    if(this.scanner){

      this.scanner.stop()
      .then(()=>{
        this.scanner.clear();
      })
      .catch(()=>{});

    }

  }

  /* ================= START QR SCANNER ================= */

  async startScanner(){

    try{

      const qrContainer = document.getElementById("qr-reader");

      if(qrContainer){
        qrContainer.innerHTML = "";
      }

      this.scanner = new Html5Qrcode("qr-reader");

      this.scanning = true;

      await this.scanner.start(

        { facingMode: "environment" },

        {
          fps: 10,
          qrbox: 250
        },

        (decodedText)=>{

          if(!this.scanning) return;

          this.scanning = false;

          this.handleScan(decodedText);

        },

        (error)=>{}

      );

    }
    catch(err){
      console.error("Scanner error:",err);
    }

  }

  /* ================= HANDLE QR ================= */

  handleScan(decodedText:string){

    let ticketId:string="";

    try{

      const data = JSON.parse(decodedText);

      ticketId = data.ticketId;

    }
    catch{

      ticketId = decodedText;

    }

    if(!ticketId){

        alert("Invalid QR code");

      this.resetScanner();

      return;

    }

    this.http.put<any>(
      "http://localhost:5000/api/registrations/checkin/" + ticketId,
      {}
    )
    .subscribe({

      next:(res)=>{

        alert("Check-in successful");

        this.lastCheckinName = this.selectedAttendee.name;
        this.lastCheckinTime = new Date().toLocaleTimeString();

        this.loadAttendees();

        this.resetScanner();

      },

      error:()=>{

        alert("Invalid ticket");

        this.resetScanner();

      }

    });

  }

  /* ================= RESET SCANNER ================= */

  async resetScanner(){

    this.showScanner = false;
    this.scanning = false;

    if(this.scanner){

      await this.scanner.stop().catch(()=>{});

      this.scanner.clear();

    }

  }

  /* ================= COUNTS ================= */

  updateCounts(){

    this.checkedInCount =
      this.attendees.filter(a => a.status==="Checked In").length;

  }

  getProgress():number{

    if(this.attendees.length===0) return 0;

    return (this.checkedInCount / this.attendees.length)*100;

  }

  getStatusClass(status:string){

    return status.toLowerCase().replace(" ","-");

  }

}
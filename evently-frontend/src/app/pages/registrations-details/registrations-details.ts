import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
selector: 'app-registrations-details',
standalone: true,
imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
templateUrl: './registrations-details.html',
styleUrl: './registrations-details.css'
})
export class RegistrationsDetails implements OnInit {

eventId:number = 0;
eventTitle:string = '';

attendees:any[] = [];
filteredAttendees:any[] = [];

searchText:string = '';

showForm=false;

formData:any={
name:'',
email:'',
phone:''
}

generatedTicket:string='';
qrCodeImage:string='';

constructor(
private route:ActivatedRoute,
private http:HttpClient
){}

ngOnInit(){

this.route.paramMap.subscribe(params=>{

this.eventId = Number(params.get('id'));

this.loadEvent();
this.loadAttendees();

});

}

/* ================= LOAD EVENT ================= */

loadEvent(){

this.http.get<any>("http://localhost:5000/api/events/"+this.eventId)
.subscribe({

next:(data)=>{
this.eventTitle = data.title;
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
phone: user.phone,
ticketId: user.ticket_id,
status: user.checked_in ? "Checked In" : "Pending"

}));

this.applyFilters();

}

});

}

/* ================= SEARCH ================= */

applyFilters(){

if(!this.searchText){

this.filteredAttendees = this.attendees;
return;

}

const text = this.searchText.toLowerCase();

this.filteredAttendees = this.attendees.filter(user=>

user.name.toLowerCase().includes(text) ||
user.email.toLowerCase().includes(text)

);

}

/* ================= OPEN REGISTRATION ================= */

openRegistration(){
this.showForm=true;
}

/* ================= REGISTER USER ================= */

async registerUser(){

const payload = {
eventId:this.eventId,
name:this.formData.name,
email:this.formData.email,
phone:this.formData.phone
}

this.http.post<any>("http://localhost:5000/api/registrations",payload)
.subscribe({

next: async(res)=>{

alert("Registration Successful");

this.generatedTicket = res.ticketId;

const qrData = JSON.stringify({
ticketId:this.generatedTicket,
event:this.eventTitle,
name:this.formData.name,
email:this.formData.email,
phone:this.formData.phone
});

this.qrCodeImage = await QRCode.toDataURL(qrData);

this.loadAttendees();

}

});

}

/* ================= ADMIN DOWNLOAD USER TICKET ================= */

async downloadUserTicket(user:any){

this.generatedTicket = user.ticketId;

this.formData.name = user.name;
this.formData.email = user.email;
this.formData.phone = user.phone;

const qrData = JSON.stringify({
ticketId:user.ticketId,
event:this.eventTitle,
name:user.name,
email:user.email,
phone:user.phone
});

this.qrCodeImage = await QRCode.toDataURL(qrData);

setTimeout(async ()=>{

const element = document.getElementById("ticket");

if(!element){
alert("Ticket not found");
return;
}

const canvas = await html2canvas(element,{scale:3});

const imgData = canvas.toDataURL("image/png");

const pdf = new jsPDF("p","mm","a4");

const imgWidth = 190;
const imgHeight = canvas.height * imgWidth / canvas.width;

pdf.addImage(imgData,"PNG",10,10,imgWidth,imgHeight);

pdf.save(user.name+"-ticket.pdf");

},300);

}

/* ================= DOWNLOAD PREVIEW TICKET ================= */

async downloadTicket(){

const element = document.getElementById("ticket");

if(!element){
alert("Ticket not found");
return;
}

const canvas = await html2canvas(element,{
scale:3
});

const imgData = canvas.toDataURL("image/png");

const pdf = new jsPDF("p","mm","a4");

const imgWidth = 190;
const imgHeight = canvas.height * imgWidth / canvas.width;

pdf.addImage(imgData,"PNG",10,10,imgWidth,imgHeight);

pdf.save("event-ticket.pdf");

}

/* ================= STATUS COLOR ================= */

getStatusClass(status:string){

if(status === "Checked In"){
return "checked-in";
}

if(status === "Pending"){
return "pending";
}

return "";

}

}
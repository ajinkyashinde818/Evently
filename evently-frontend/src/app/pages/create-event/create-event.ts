import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { PopupService } from '../../shared/popup/popup.service';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create-event.html',
  styleUrl: './create-event.css'
})
export class CreateEvent implements OnInit {

  bannerError:string='';
  submitted=false;
  bannerFile:any;
  eventId:any=null;

  eventData:any={
    title:'',
    description:'',
    category:'',
    type:'',
    organizer:'',
    email:'',
    venue:'',
    city:'',
    address:'',
    mapLink:'',
    startDate:'',
    endDate:'',
    limit:'',
    deadline:''
  };

  constructor(
    private http:HttpClient,
    private route:ActivatedRoute,
    private popupService: PopupService
  ){}

  ngOnInit(){

    this.eventId=this.route.snapshot.queryParams['id'];

    if(this.eventId){

      this.http.get<any>("http://localhost:5000/api/events/"+this.eventId)
      .subscribe({

        next:(data)=>{

          this.eventData={
            title:data.title,
            description:data.description,
            category:data.category,
            type:data.type,
            organizer:data.organizer,
            email:data.email,
            venue:data.venue,
            city:data.city,
            address:data.address,
            mapLink:data.maplink,
            startDate:data.start_date,
            endDate:data.end_date,
            limit:data.registration_limit,
            deadline:data.registration_deadline
          };

        },

        error:(err)=>{
          console.error("Failed to load event",err);
        }

      });

    }

  }


  onFileChange(event:any){
    this.bannerFile=event.target.files[0];
  }


  publishEvent(form:NgForm,status:string){

    this.submitted=true;

    if(form.invalid){
      this.popupService.warning("Please fill all required fields");
      return;
    }

    const formData=new FormData();

    /* Map fields correctly to backend */

    formData.append("title",this.eventData.title);
    formData.append("description",this.eventData.description);
    formData.append("category",this.eventData.category);
    formData.append("type",this.eventData.type);
    formData.append("organizer",this.eventData.organizer);
    formData.append("email",this.eventData.email);
    formData.append("venue",this.eventData.venue);
    formData.append("city",this.eventData.city);
    formData.append("address",this.eventData.address);
    formData.append("maplink",this.eventData.mapLink);

    formData.append("start_date",this.eventData.startDate);
    formData.append("end_date",this.eventData.endDate);
    formData.append("registration_limit",this.eventData.limit);
    formData.append("registration_deadline",this.eventData.deadline);

    formData.append("status",status);

    if(this.bannerFile){
      formData.append("banner",this.bannerFile);
    }


    /* ================= CREATE EVENT ================= */

    if(!this.eventId){

      this.http.post("http://localhost:5000/api/events/create",formData)
      .subscribe({

        next:()=>{

          this.popupService.success("Event created successfully");

          form.resetForm();
          this.submitted=false;

        },

        error:(err:any)=>{

          console.error(err);
          this.popupService.error("Failed to create event");

        }

      });

    }

    /* ================= UPDATE EVENT ================= */

    else{

      this.http.put("http://localhost:5000/api/events/update/"+this.eventId,formData)
      .subscribe({

        next:()=>{

          this.popupService.success("Event updated successfully");

        },

        error:(err:any)=>{

          console.error(err);
          this.popupService.error("Failed to update event");

        }

      });

    }

  }

}

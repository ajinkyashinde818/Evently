import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
selector:'app-event-media',
standalone:true,
imports:[CommonModule, HttpClientModule],
templateUrl:'./event-media.html',
styleUrl:'./event-media.css'
})
export class EventMedia implements OnInit{

eventId!:number;

/* Selected Files */
selectedImages:any[] = [];
uploadMessage:string = '';
uploadSuccess:boolean = false;

constructor(
private route:ActivatedRoute,
private http:HttpClient
){}

ngOnInit(){

this.eventId = Number(
this.route.snapshot.paramMap.get('id')
);

}


/* ================= SELECT IMAGES ================= */

onImagesSelected(event:any){

console.log('Image selection triggered');
const files = event.target.files;
console.log('Files selected:', files.length);

this.selectedImages = [];

for(let file of files){

file.preview = URL.createObjectURL(file);
this.selectedImages.push(file);
console.log('Added file:', file.name);

}

console.log('Total selected images:', this.selectedImages.length);

}


/* ================= UPLOAD IMAGES ================= */

uploadImages(){

console.log('Upload button clicked!');
console.log('Selected images:', this.selectedImages.length);

if(!this.selectedImages.length){
alert("Please select images first");
return;
}

console.log('Starting upload...');

const formData = new FormData();

for(let file of this.selectedImages){
console.log('Adding file:', file.name);
formData.append("images",file);
}

console.log('Sending request to:', `http://localhost:5000/api/memories/upload-images/${this.eventId}`);

this.http.post(
"http://localhost:5000/api/memories/upload-images/"+this.eventId,
formData
).subscribe({

next:(response)=>{

console.log('Upload successful:', response);
// Clear selected images immediately
this.selectedImages = [];
// Show success message instantly
this.uploadSuccess = true;
this.uploadMessage = 'Upload successfully! Check mails.';
// Hide message after 3 seconds
setTimeout(() => {
  this.uploadSuccess = false;
  this.uploadMessage = '';
}, 3000);

},

error:(err)=>{

console.error('Upload failed:', err);
alert("Failed to upload images: " + (err.error?.error || 'Unknown error'));

}

});

}

}
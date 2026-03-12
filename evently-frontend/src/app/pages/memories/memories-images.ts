import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-memories-images',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './memories-images.html',
  styleUrl: './memories-images.css'
})
export class MemoriesImages implements OnInit {

  eventId!: number;
  filteredImages: any[] = [];
  loading: boolean = true;

  /* 🔹 Lightbox preview */
  previewImage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadImages();
  }

  /* ================= LOAD IMAGES ================= */

  loadImages() {

    console.log('Loading images for event ID:', this.eventId);

    this.http.get<any[]>(
      "http://localhost:5000/api/memories/images/" + this.eventId
    )
    .subscribe({

      next:(data)=>{

        console.log('Raw image data:', data);

        this.filteredImages = data.map(img => ({
          url: "http://localhost:5000/uploads/" + img.file_name,
          fileName: img.file_name
        }));

        console.log('Processed images:', this.filteredImages);

        this.loading = false;

      },

      error:(err)=>{
        console.error("Failed to load images", err);
        this.loading = false;
      }

    });

  }

  /* ================= OPEN PREVIEW ================= */

  openPreview(imageUrl: string) {
    this.previewImage = imageUrl;
  }

  /* ================= CLOSE PREVIEW ================= */

  closePreview() {
    this.previewImage = null;
  }

  /* ================= IMAGE ERROR HANDLING ================= */

  onImageError(event: any) {
    console.error('Image failed to load:', event);
  }

  onImageLoad(event: any) {
    console.log('Image loaded successfully:', event);
  }

  onPreviewError(event: any) {
    console.error('Preview image failed to load:', event);
  }

}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-memories-certificates',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './memoriesCertificates.html',
  styleUrl: './memoriesCertificates.css'
})
export class MemoriesCertificates implements OnInit {

  eventId!: number;

  filteredCertificates: any[] = [];

  loading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {

    this.eventId = Number(
      this.route.snapshot.paramMap.get('id')
    );

    this.loadCertificates();

  }


  /* ================= LOAD CERTIFICATES ================= */

  loadCertificates() {

    this.loading = true;

    this.http.get<any[]>(
      "http://localhost:5000/api/memories/certificates/" + this.eventId
    )
    .subscribe({

      next: (data) => {

        this.filteredCertificates = data.map(cert => ({

          name: cert.file_name,

          url:
            "http://localhost:5000/uploads/certificates/" +
            cert.file_name

        }));

        this.loading = false;

      },

      error: (err) => {

        console.error("Failed to load certificates", err);

        this.loading = false;

      }

    });

  }


  /* ================= VIEW CERTIFICATE ================= */

  viewCertificate(cert: any) {

    window.open(cert.url, "_blank");

  }


  /* ================= DOWNLOAD CERTIFICATE ================= */

  downloadCertificate(cert: any) {

    const link = document.createElement("a");

    link.href = cert.url;

    link.download = cert.name;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  }

}
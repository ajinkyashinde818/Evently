import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { PopupService } from '../../shared/popup/popup.service';

@Component({
  selector: 'app-event-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './event-register.html',
  styleUrls: ['./event-register.css']
})
export class EventRegister implements OnInit {

  eventId: string = '';

  eventName: string = '';
  eventDate: string = '';
  eventLocation: string = '';
  eventStatus: string = '';

  generatedTicket: any = null
  qrCodeImage: any = null

  name: string = '';
  email: string = '';
  phone: string = '';
  agreeTerms: boolean = false;

  loading: boolean = false;

  // Validation errors
  nameError: string = '';
  emailError: string = '';
  phoneError: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private popupService: PopupService
  ) { }

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('eventId')!;

    this.http.get<any>(`http://localhost:5000/api/events/${this.eventId}`)
      .subscribe({
        next: (event) => {
          this.eventName = event.title;
          this.eventDate = this.formatDate(event.start_date);
          this.eventLocation = event.venue;
          this.eventStatus = event.status;
          
          // Check if event is deleted
          if (event.status === 'deleted') {
            this.popupService.error('This event has been deleted and is no longer available for registration.');
            this.router.navigate(['/registrations']);
            return;
          }
        },
        error: () => {
          this.popupService.error("Unable to load event");
          this.router.navigate(['/registrations']);
        }
      });
  }

  /* VALIDATION METHODS */

  validateName(): void {
    if (!this.name.trim()) {
      this.nameError = 'Full name is required';
    } else if (this.name.trim().length < 2) {
      this.nameError = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(this.name)) {
      this.nameError = 'Name can only contain letters and spaces';
    } else {
      this.nameError = '';
    }
  }

  validateEmail(): void {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.email.trim()) {
      this.emailError = 'Email address is required';
    } else if (!emailRegex.test(this.email)) {
      this.emailError = 'Please enter a valid email address';
    } else {
      this.emailError = '';
    }
  }

  validatePhone(): void {
    const phoneRegex = /^[+]?[\d\s\-()]{10,}$/;
    if (!this.phone.trim()) {
      this.phoneError = 'Phone number is required';
    } else if (!phoneRegex.test(this.phone.replace(/\s/g, ''))) {
      this.phoneError = 'Please enter a valid phone number';
    } else {
      this.phoneError = '';
    }
  }

  /* DATE FORMATTING */

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

  /* LOAD EVENT DETAILS */

  loadEventDetails() {
    this.http.get<any>(
      `http://localhost:5000/api/events/${this.eventId}`
    ).subscribe({
      next: (event) => {
        this.eventName = event.title;
        this.eventDate = this.formatDate(event.start_date);
        this.eventLocation = event.venue;
      },
      error: (err) => {
        console.error("Event load error", err);
        this.popupService.error("Unable to load event");
      }
    });
  }

  /* REGISTER USER */

  registerUser(): void {
    // Check if event is deleted before proceeding
    if (this.eventStatus === 'deleted') {
      this.popupService.error('This event has been deleted and is no longer available for registration.');
      this.router.navigate(['/registrations']);
      return;
    }

    // Clear previous errors
    this.nameError = '';
    this.emailError = '';
    this.phoneError = '';

    // Validate all fields
    this.validateName();
    this.validateEmail();
    this.validatePhone();

    // Check if there are any validation errors
    if (this.nameError || this.emailError || this.phoneError) {
      return;
    }

    if (!this.agreeTerms) {
      this.popupService.warning('Please agree to terms and conditions');
      return;
    }

    this.loading = true;

    const formData = {
      name: this.name,
      email: this.email,
      phone: this.phone
    };

    this.http.post<any>(
      `http://localhost:5000/api/registrations/${this.eventId}`,
      formData
    ).subscribe({
      next: (res) => {
        this.loading = false;

        // Show success message
        this.showSuccessMessage();

        // Redirect after a short delay
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        console.error('Registration error', err);

        // Show more specific error messages
        if (err.status === 409) {
          this.popupService.warning('You have already registered for this event');
        } else if (err.status === 400) {
          this.popupService.error('Invalid registration data. Please check your information');
        } else if (err.status === 404) {
          this.popupService.error('This event is no longer available for registration');
          this.router.navigate(['/registrations']);
        } else {
          this.popupService.error('Registration failed. Please try again later');
        }
      }
    });
  }

  showSuccessMessage() {
    this.popupService.success("Registration successful! Ticket sent to email");
  }
}
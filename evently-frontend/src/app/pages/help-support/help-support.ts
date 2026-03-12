import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-help-support',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './help-support.html',
  styleUrl: './help-support.css'
})
export class HelpSupport {

  searchText: string = '';

  ticket = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  constructor(private http: HttpClient) {}

  /* ================= FAQs ================= */

  faqs = [
    {
      category: 'Getting Started',
      open: true,
      questions: [
        {
          q: 'How do I create my first event?',
          a: 'Navigate to the Create Event page from your dashboard. Fill event details and publish.'
        },
        {
          q: 'What information is required to create an event?',
          a: 'Event title, start date, end date, venue, and registration limit.'
        }
      ]
    },

    {
      category: 'Managing Registrations',
      open: false,
      questions: [
        {
          q: 'How can I view registrations?',
          a: 'Go to the registrations page and select your event.'
        }
      ]
    },

    {
      category: 'Check-ins',
      open: false,
      questions: [
        {
          q: 'How does QR check-in work?',
          a: 'Scan attendee QR ticket to verify and mark attendance.'
        }
      ]
    }
  ];

  /* ================= Toggle FAQ ================= */

  toggleFAQ(faq: any) {
    faq.open = !faq.open;
  }

  /* ================= Search FAQs ================= */

  get filteredFAQs() {

    if (!this.searchText.trim()) return this.faqs;

    const text = this.searchText.toLowerCase();

    return this.faqs
      .map(faq => ({
        ...faq,
        questions: faq.questions.filter((q: any) =>
          q.q.toLowerCase().includes(text) ||
          q.a.toLowerCase().includes(text)
        )
      }))
      .filter(faq => faq.questions.length > 0);
  }

  /* ================= Submit Ticket ================= */

  submitTicket() {

    this.http.post(
      "http://localhost:5000/api/support/ticket",
      this.ticket
    )
    .subscribe({

      next: () => {

        alert("Support ticket submitted successfully");

        this.ticket = {
          name: '',
          email: '',
          subject: '',
          message: ''
        };

      },

      error: () => {
        alert("Failed to send support ticket");
      }

    });

  }

}
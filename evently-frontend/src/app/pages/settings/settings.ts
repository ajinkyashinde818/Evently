import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {

  darkMode = false;
  notifications = true;
  emails = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    /* ✅ Load saved theme */
    const savedTheme = localStorage.getItem('darkMode');
    this.darkMode = savedTheme === 'true';
    this.applyTheme();

    /* ✅ Load saved preferences */
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications !== null) {
      this.notifications = savedNotifications === 'true';
    }

    const savedEmails = localStorage.getItem('emails');
    if (savedEmails !== null) {
      this.emails = savedEmails === 'true';
    }
  }

  /* ✅ Theme Toggle */
  toggleTheme() {
    localStorage.setItem('darkMode', String(this.darkMode));
    this.applyTheme();
  }

  applyTheme() {
    if (this.darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  /* ✅ Logout → Go to Login */
  logout() {
    /* Keep UX preferences but clear auth */
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  /* ✅ Persist notification preferences */
  onNotificationsChange() {
    localStorage.setItem('notifications', String(this.notifications));
  }

  onEmailsChange() {
    localStorage.setItem('emails', String(this.emails));
  }

  /* ✅ Account navigation stubs */
  editProfile() {
    // Navigate to dashboard for now – replace with profile page when available
    this.router.navigate(['/dashboard']);
  }

  changePassword() {
    // Redirect to login so user can use any “Forgot password” flow
    this.router.navigate(['/login']);
  }

  /* ✅ Help Button */
  openHelp() {
    this.router.navigate(['/help-support']);
  }

  /* ✅ Contact Support */
  contactSupport() {
    this.router.navigate(['/help-support']);
  }
}

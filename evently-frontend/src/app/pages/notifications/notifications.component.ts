import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class NotificationsComponent implements OnInit {

  notifications: any[] = [];
  filteredNotifications: any[] = [];
  selectedFilter: string = 'all';
  searchQuery: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    // Mock notifications data - replace with actual API call
    this.notifications = [
      {
        id: 1,
        type: 'success',
        title: 'Event Registration Successful',
        message: 'You have successfully registered for "Tech Conference 2024"',
        time: '2 hours ago',
        read: false,
        icon: '✓'
      },
      {
        id: 2,
        type: 'info',
        title: 'New Event Available',
        message: 'Check out the new "AI Workshop" event starting next week',
        time: '5 hours ago',
        read: false,
        icon: 'i'
      },
      {
        id: 3,
        type: 'warning',
        title: 'Event Deadline Approaching',
        message: 'Registration for "Web Development Summit" closes in 2 days',
        time: '1 day ago',
        read: true,
        icon: '!'
      },
      {
        id: 4,
        type: 'error',
        title: 'Registration Failed',
        message: 'Unable to complete registration for "Data Science Conference"',
        time: '2 days ago',
        read: true,
        icon: '✕'
      },
      {
        id: 5,
        type: 'success',
        title: 'Certificate Generated',
        message: 'Your certificate for "JavaScript Masterclass" is ready',
        time: '3 days ago',
        read: true,
        icon: '✓'
      }
    ];

    this.filteredNotifications = [...this.notifications];
  }

  filterNotifications(filter: string) {
    this.selectedFilter = filter;
    this.applyFilters();
  }

  searchNotifications() {
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.notifications];

    // Apply type filter
    if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(n => n.type === this.selectedFilter);
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    this.filteredNotifications = filtered;
  }

  markAsRead(notification: any) {
    notification.read = true;
    // Update backend here
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.filteredNotifications.forEach(n => n.read = true);
    // Update backend here
  }

  deleteNotification(notification: any, event: Event) {
    event.stopPropagation();
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.applyFilters();
    }
    // Update backend here
  }

  clearAllNotifications() {
    this.notifications = [];
    this.filteredNotifications = [];
    // Update backend here
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '!';
      case 'info': return 'i';
      default: return 'i';
    }
  }

  getNotificationTypeClass(type: string): string {
    return `notification-${type}`;
  }
}

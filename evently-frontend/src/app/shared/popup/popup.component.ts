import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupService } from './popup.service';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (show) {
      <div class="popup-overlay" (click)="closeOnOverlay($event)">
        <div class="popup-backdrop"></div>
        <div class="popup-container" [ngClass]="type">
          <div class="popup-header">
            <div class="popup-icon" [ngClass]="type + '-icon'">
              @if (type === 'success') {
                <div class="icon-checkmark">✓</div>
              }
              @if (type === 'error') {
                <div class="icon-cross">✕</div>
              }
              @if (type === 'warning') {
                <div class="icon-warning">!</div>
              }
              @if (type === 'info') {
                <div class="icon-info">i</div>
              }
              @if (type === 'confirm') {
                <div class="icon-confirm">?</div>
              }
            </div>
            <div class="popup-title-section">
              <h3>{{ getTitle() }}</h3>
              <button class="close-btn" (click)="close()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="popup-body">
            <div class="message-content">
              <p>{{ message }}</p>
            </div>
          </div>
          <div class="popup-footer">
            @if (type === 'confirm') {
              <button class="popup-btn cancel-btn" (click)="cancel()">
                <span>Cancel</span>
              </button>
              <button class="popup-btn confirm-btn" (click)="confirm()">
                <span>Confirm</span>
              </button>
            } @else {
              <button class="popup-btn single-btn" (click)="close()">
                <span>OK</span>
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./popup.component.css']
})
export class PopupComponent {
  show = false;
  message = '';
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm' = 'info';
  private isConfirmMode = false;

  constructor(private popupService: PopupService) {
    // Register this component with the service
    setTimeout(() => {
      this.popupService.registerPopup(this);
    }, 0);
  }

  showPopup(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    this.message = message;
    this.type = type;
    this.isConfirmMode = false;
    this.show = true;
    
    // Auto-close after 4 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        this.close();
      }, 4000);
    }
  }

  showConfirmPopup(message: string) {
    this.message = message;
    this.type = 'confirm';
    this.isConfirmMode = true;
    this.show = true;
  }

  close() {
    this.show = false;
    if (this.isConfirmMode) {
      this.popupService.handleConfirmResponse(false);
    }
  }

  confirm() {
    this.show = false;
    this.popupService.handleConfirmResponse(true);
  }

  cancel() {
    this.show = false;
    this.popupService.handleConfirmResponse(false);
  }

  closeOnOverlay(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  getTitle(): string {
    switch (this.type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      case 'confirm':
        return 'Confirm Action';
      default:
        return 'Message';
    }
  }
}

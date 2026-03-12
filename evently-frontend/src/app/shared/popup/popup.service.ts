import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  private popupComponent: any = null;
  private resolvePromise: ((value: boolean) => void) | null = null;

  registerPopup(popupComponent: any) {
    this.popupComponent = popupComponent;
  }

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (this.popupComponent) {
      this.popupComponent.showPopup(message, type);
    } else {
      // Fallback to alert if popup component is not registered
      console.warn('Popup component not registered, using fallback alert');
      alert(message);
    }
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.popupComponent) {
        this.resolvePromise = resolve;
        this.popupComponent.showConfirmPopup(message);
      } else {
        // Fallback to native confirm if popup component is not registered
        console.warn('Popup component not registered, using fallback confirm');
        resolve(confirm(message));
      }
    });
  }

  handleConfirmResponse(confirmed: boolean) {
    if (this.resolvePromise) {
      this.resolvePromise(confirmed);
      this.resolvePromise = null;
    }
  }
}

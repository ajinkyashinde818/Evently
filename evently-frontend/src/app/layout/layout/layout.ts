import { Component } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';
import { RouterOutlet } from '@angular/router';
import { PopupComponent } from '../../shared/popup/popup.component';
import { PopupService } from '../../shared/popup/popup.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [Sidebar, Topbar, RouterOutlet, PopupComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  constructor(private popupService: PopupService) {}

  ngOnInit() {
    // Register popup component with service
    setTimeout(() => {
      const popupElement = document.querySelector('app-popup') as any;
      if (popupElement && popupElement.showPopup) {
        this.popupService.registerPopup(popupElement);
      }
    }, 0);
  }
}

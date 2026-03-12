import { Routes } from '@angular/router';

import { Login } from './auth/login/login';
import { Signup } from './auth/signup/signup';

import { Layout } from './layout/layout/layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { CreateEvent } from './pages/create-event/create-event';
import { ManageEvents } from './pages/manage-events/manage-events';
import { Memories } from './pages/memories/memories';
import { Settings } from './pages/settings/settings';

import { Registrations } from './pages/registrations/registrations';
import { RegistrationsDetails } from './pages/registrations-details/registrations-details';

/* ✅ Check-ins */
import { Checkins } from './pages/checkins/checkins';
import { CheckinDetails } from './pages/checkin-details/checkin-details';

/* ✅ Memories Sub Pages */
import { MemoriesImages } from './pages/memories/memories-images';
import { MemoriesCertificates } from './pages/memories/memoriesCertificates';

/* ✅ Event Media Upload Page */
import { EventMedia } from './pages/event-media/event-media';

/* ✅ Help / Support */
import { HelpSupport } from './pages/help-support/help-support';


export const routes: Routes = [

  /* ===== Default Landing ===== */
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },

  /* ✅ Welcome Page (Lazy Loaded Standalone) */
  {
    path: 'welcome',
    loadComponent: () =>
      import('./pages/welcome/welcome').then(m => m.Welcome)
  },

  /* ===== Auth Pages ===== */
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  {
  path: 'register/:eventId',
  loadComponent: () =>
    import('./pages/event-register/event-register').then(m => m.EventRegister)
},

  /* ===== Layout Wrapper ===== */
  {
    path: '',
    component: Layout,
    children: [

      /* Main Pages */
      { path: 'dashboard', component: Dashboard },
      { path: 'create-event', component: CreateEvent },
      { path: 'manage-events', component: ManageEvents },

      /* ⭐ Media Upload Page */
      { path: 'event-media/:id', component: EventMedia },

      { path: 'memories', component: Memories },
      { path: 'registrations', component: Registrations },

      /* Registrations Details */
      { path: 'registrations/:id', component: RegistrationsDetails },

      /* Check-ins */
      { path: 'checkins', component: Checkins },
      { path: 'checkins/:id', component: CheckinDetails },

      /* Memories Child Routes */
      { path: 'memories/images/:id', component: MemoriesImages },
      { path: 'memories/certificates/:id', component: MemoriesCertificates },

      /* Help / Support */
      { path: 'help-support', component: HelpSupport },

      /* Settings */
      { path: 'settings', component: Settings },

      /* Layout Default */
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  /* ===== Wildcard Fallback ===== */
  { path: '**', redirectTo: 'login' }

];
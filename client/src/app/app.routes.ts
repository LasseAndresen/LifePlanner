import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Schedulist - Access Your Workspace',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
    data: {
      title: 'Schedulist - Access Your Workspace',
      description: 'Access Schedulist and manage your life scheduling workstation.'
    }
  },
  {
    path: 'privacy',
    title: 'Schedulist - Privacy Policy',
    loadComponent: () => import('./features/legal/privacy-policy').then(m => m.PrivacyPolicyComponent),
    data: {
      title: 'Schedulist - Privacy Policy',
      description: 'Read the Schedulist privacy policy to understand how we secure your task, calendar, and account details.'
    }
  },
  {
    path: 'terms',
    title: 'Schedulist - Terms of Service',
    loadComponent: () => import('./features/legal/terms-of-service').then(m => m.TermsOfServiceComponent),
    data: {
      title: 'Schedulist - Terms of Service',
      description: 'Read Schedulist terms of service to understand usage rules and conditions.'
    }
  },
  {
    path: '',
    title: 'Schedulist - Modular Scheduling Workstation',
    canActivate: [authGuard],
    loadComponent: () => import('./features/planner/planner.component').then(m => m.PlannerComponent),
    data: {
      title: 'Schedulist - Modular Scheduling Workstation',
      description: 'Schedulist is a modular life scheduling workstation that bridges the gap between checklists and calendar timelines.'
    }
  },
  {
    path: '**',
    title: 'Schedulist - Page Not Found',
    loadComponent: () => import('./features/error/not-found').then(m => m.NotFoundComponent),
    data: {
      title: 'Schedulist - Page Not Found',
      description: 'The page you are looking for does not exist on Schedulist.'
    }
  }
];

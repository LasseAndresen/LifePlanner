import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'LifePlanner - Access Your Workspace',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    title: 'LifePlanner - Premium Life Management System',
    canActivate: [authGuard],
    loadComponent: () => import('./features/planner/planner.component').then(m => m.PlannerComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/planner/planner.component').then(m => m.PlannerComponent)
  }
];

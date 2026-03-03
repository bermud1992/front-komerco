import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppView = 'operativo' | 'table' | 'csv' | 'prediction';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private viewSubject = new BehaviorSubject<AppView>('operativo');
  view$ = this.viewSubject.asObservable();

  navigateTo(view: AppView): void {
    this.viewSubject.next(view);
  }

  get currentView(): AppView {
    return this.viewSubject.value;
  }
}

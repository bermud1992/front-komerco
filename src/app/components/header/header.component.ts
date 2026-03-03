import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NavigationService, AppView } from '../../services/navigation.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  navTabs = [
    { label: 'Operativo',           icon: 'dashboard',         key: 'operativo'  as AppView },
    { label: 'Inventario',          icon: 'inventory_2',       key: 'table'      as AppView },
    { label: 'Catálogo CSV',        icon: 'insert_drive_file', key: 'csv'        as AppView },
    { label: 'Análisis Predictivo', icon: 'analytics',         key: 'prediction' as AppView },
  ];

  activeTab = this.navTabs[0];

  private navSub!: Subscription;

  constructor(
    private authService: AuthService,
    private navService: NavigationService
  ) {}

  ngOnInit(): void {
    this.navSub = this.navService.view$.subscribe(view => {
      const found = this.navTabs.find(t => t.key === view);
      if (found) this.activeTab = found;
    });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onLogout(): void {
    this.authService.logout();
  }

  getUsername(): string {
    return this.authService.getUsername();
  }

  selectTab(tab: { label: string; icon: string; key: AppView }): void {
    this.navService.navigateTo(tab.key);
  }
}

import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedUICommonLayoutModule } from '@sysmo-cloud/shared/ui-common-layout';
import { ShellFeaturePainelNotificacaoModule } from '@sysmo-cloud/shell-feature-notificacao';
import { ShellFeatureChatbotModule } from '@sysmo-cloud/shell/feature-chatbot';
import { FeatureMenuLateralModule } from '@sysmo-cloud/shell/feature-menu-lateral';
import { ShellFeatureToolbarModule } from '@sysmo-cloud/shell/feature-toolbar';
import { DashboardFrameComponent } from '../components/dashboard-frame.component';
import { InicioRoutingModule } from './inicio-routing.module';
import { InicioComponent } from './inicio.component';

@NgModule({
  imports: [
    CommonModule,
    InicioRoutingModule,
    FeatureMenuLateralModule,
    NzMessageModule,
    SharedUICommonLayoutModule,
    ShellFeatureToolbarModule,
    NzSkeletonModule,
    ShellFeatureChatbotModule,
    DashboardFrameComponent,
    ShellFeaturePainelNotificacaoModule
  ],
  declarations: [InicioComponent]
})
export class InicioModule {}

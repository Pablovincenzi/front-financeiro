import { NZ_CONFIG } from 'ng-zorro-antd/core/config';
import { NZ_I18N, pt_BR } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import ptBr from '@angular/common/locales/pt';
import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import {
  DefaultRequestInterceptor,
  ErrorInterceptor,
  JwtInterceptor,
  ResetFacade
} from '@sysmo-cloud/shared/data-access';
import { CustomRouteReuseStrategy } from '@sysmo-cloud/shared/util-route';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app.routing.module';
import { appInitializerFactory } from './core/factories/app-intializer.factory';

registerLocaleData(ptBr);

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, BrowserAnimationsModule, AppRoutingModule, HttpClientModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: CustomRouteReuseStrategy },
    { provide: NZ_I18N, useValue: pt_BR },
    { provide: LOCALE_ID, useValue: 'pt' },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: DefaultRequestInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [HttpClient, ResetFacade],
      multi: true
    },
    {
      provide: NZ_CONFIG,
      useValue: {
        message: { nzMaxStack: 1 }
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

import Blowfish from 'es6-sladex-blowfish';
import { NzMessageService } from 'ng-zorro-antd/message';
import { fromEvent } from 'rxjs';
import { NgIf } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  AutenticacaoFacade,
  ConfiguracaoDashboardFacade,
  ResetFacade
} from '@sysmo-cloud/shared/data-access';
import { JWTHelper } from '@sysmo-cloud/shared/util-jwt-helper';
import { StorageKeys } from '@sysmo-cloud/shared/util-storage-keys';
import { SecretConstants } from '../static/constants/secrets.constants';

@Component({
  selector: 'sysmo-cloud-dashboard-frame',
  standalone: true,
  imports: [NgIf],
  template: `
    <iframe
      frameborder="0"
      [src]="safeUrl"
      *ngIf="this.graficosReset.length && this.graficosUsuario.length"
    ></iframe>
  `,
  styleUrls: ['./dashboard-frame.component.scss']
})
export class DashboardFrameComponent implements OnInit {
  URL_DASHBOARD = 'https://akashidashboard.sysmo.cloud';

  safeUrl: SafeResourceUrl = '';

  graficosReset: Array<string> =
    this.configuracaoDashboardFacade.configuracaoDashboard.graficosReset;
  graficosUsuario: Array<string> =
    this.configuracaoDashboardFacade.configuracaoDashboard.graficosUsuario;

  constructor(
    private sanitizer: DomSanitizer,
    private resetFacade: ResetFacade,
    private configuracaoDashboardFacade: ConfiguracaoDashboardFacade,
    private autenticacaoFacade: AutenticacaoFacade,
    private router: Router,
    private destroyRef: DestroyRef,
    private message: NzMessageService
  ) {}

  ngOnInit() {
    this.inscreverObservableIframe();

    const ofuscatedKey = atob(SecretConstants.BLOWFISH_KEY);
    const bytes = ofuscatedKey.split(',').map(Number);
    const key = String.fromCharCode(...bytes);

    const params = new HttpParams({
      fromObject: {
        user: JWTHelper.codigoUsuario,
        reset: Blowfish.encrypt(this.resetFacade.chaveReset, key) as string,
        broadcast: 'd3210b95b6ebfc1204f0df98114498b1',
        tokenakashi: JWTHelper.token ?? '',
        urlakashi: sessionStorage.getItem(StorageKeys.URL_SYSMO_CLOUD) ?? '',
        configuracaodashboard: JSON.stringify(
          this.configuracaoDashboardFacade.configuracaoDashboard
        )
      }
    });

    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `${this.URL_DASHBOARD}/?${params}`
    );
  }

  inscreverObservableIframe() {
    fromEvent<MessageEvent>(window, 'message')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (
          event.origin === this.URL_DASHBOARD &&
          event.data?.tokenJwtExpirado &&
          this.autenticacaoFacade.usuarioEstaLogado
        ) {
          this.autenticacaoFacade.logout(false);
          this.router.navigate(['/login'], { queryParams: { fromUrl: this.router.url } });

          this.message.error('Sua sessão expirou. Por favor, faça login novamente.');
        }
      });
  }
}

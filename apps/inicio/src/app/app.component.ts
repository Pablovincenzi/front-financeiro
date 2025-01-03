import { distinctUntilChanged, filter } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AutenticacaoFacade } from '@sysmo-cloud/shared/data-access';
import { RotasConstant } from './static/constants/rotas.constant';

@Component({
  selector: 'sysmo-cloud-root',
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  isLoggedIn$ = this.autenticacaoFacade.isUserLoggedIn$;

  fromUrl = '';

  constructor(
    private autenticacaoFacade: AutenticacaoFacade,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.activatedRoute.queryParams.pipe().subscribe(params => (this.fromUrl = params?.fromUrl));

    this.isLoggedIn$
      .pipe(
        distinctUntilChanged(),
        filter(logado => !!logado)
      )
      .subscribe(() => {
        let url = '';

        if (this.fromUrl) {
          url = this.fromUrl;
        } else {
          const hash = location.hash;

          if (hash && hash.startsWith('#/')) {
            url = hash.replace('#/', '');
          }
        }

        this.router.navigate([RotasConstant.INICIO], { state: { fromUrl: url } });
      });
  }
}

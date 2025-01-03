import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { NgModule, inject } from '@angular/core';
import { RouterModule, RouterStateSnapshot, Routes } from '@angular/router';
import { AutenticacaoFacade } from '@sysmo-cloud/shared/data-access';
import { environment } from '../environments/environment';
import { RotasConstant } from './static/constants/rotas.constant';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: RotasConstant.INICIO
  },
  {
    path: RotasConstant.INICIO,
    canActivate: [
      (_: NzSafeAny, state: RouterStateSnapshot) =>
        inject(AutenticacaoFacade).podeNavegarParaRotaAutenticado(state.url)
    ],
    loadChildren: () => import('./module/inicio.module').then(m => m.InicioModule)
  },
  {
    path: RotasConstant.LOGIN,
    canActivate: [() => inject(AutenticacaoFacade).podeNavegarParaRotaDeLogin()],
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: environment.production
          ? `https://${location.hostname}/login/remoteEntry.js`
          : 'http://localhost:4201/remoteEntry.js',
        exposedModule: './Module'
      }).then(m => m.LoginModule)
  },
  {
    path: RotasConstant.RECUPERAR_SENHA,
    redirectTo: RotasConstant.LOGIN
  },
  {
    path: '**',
    redirectTo: RotasConstant.INICIO
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      initialNavigation: 'enabledBlocking',
      canceledNavigationResolution: 'computed'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}

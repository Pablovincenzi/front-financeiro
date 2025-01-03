import { MountConfig } from 'cypress/angular';
import { ptBR } from 'date-fns/locale';
import { NZ_DATE_LOCALE, NZ_I18N, pt_BR } from 'ng-zorro-antd/i18n';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { CommonModule, registerLocaleData } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import ptBr from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { UsuarioEmpresasDTO, UsuarioLogadoDTO } from '@sysmo-cloud/shared/data-access-usuario';
import { SharedUICommonLayoutModule } from '@sysmo-cloud/shared/ui-common-layout';
import { NotificacaoDTO } from '@sysmo-cloud/shell-data-access-notificacao';
import { ShellFeaturePainelNotificacaoModule } from '@sysmo-cloud/shell-feature-notificacao';
import { MenuTemplatePermissaoDTO } from '@sysmo-cloud/shell/data-access-menu';
import { ShellFeatureChatbotModule } from '@sysmo-cloud/shell/feature-chatbot';
import { FeatureMenuLateralModule } from '@sysmo-cloud/shell/feature-menu-lateral';
import { ShellFeatureToolbarModule } from '@sysmo-cloud/shell/feature-toolbar';
import { DashboardFrameComponent } from '../components/dashboard-frame.component';
import { InicioRoutingModule } from './inicio-routing.module';
import { InicioComponent } from './inicio.component';

registerLocaleData(ptBr);

const requestsIniciais = () => {
  const usuarioLogado: UsuarioLogadoDTO = {
    id: 9,
    nomeUsuario: 'Teste Akashi',
    email: 'testeakashi@sysmo.com.br',
    telefone: '',
    flagAdministrador: true,
    foto: ''
  };

  cy.intercept('GET', '/gt-access/ms-access/usuario/adquirirUsuarioLogado', usuarioLogado).as(
    'requestAdquirirUsuarioLogado'
  );

  cy.intercept('GET', '/gt-access/ms-access/menu/listar', [] as Array<MenuTemplatePermissaoDTO>).as(
    'requestMenuListar'
  );

  const usuarioEmpresas: UsuarioEmpresasDTO = {
    flagAcessoTodasEmpresas: false,
    empresas: [
      {
        id: 1,
        nome: 'Empresa Matriz',
        principal: true
      },
      {
        id: 2,
        nome: 'Empresa Filial',
        principal: false
      }
    ]
  };

  cy.intercept(
    'GET',
    '/gt-access/ms-access/usuario/adquirirEmpresasUsuarioLogado',
    usuarioEmpresas
  ).as('requestAdquirirEmpresasUsuarioLogado');

  cy.intercept('GET', '/gt-access/ms-access/dashboard/adquirirConfiguracao?codigoUsuario=9', []).as(
    'requestAdquirirConfiguracao'
  );
};

const requestsNotificacoes = () => {
  const notificacoes: Array<NotificacaoDTO> = [
    {
      id: 1,
      codigosDestinatarios: [9],
      informacoes: {
        descricao: 'Notificação 1',
        percentual: 50,
        flagNotificacaoLida: true
      }
    },
    {
      id: 2,
      codigosDestinatarios: [9],
      informacoes: {
        descricao: 'Notificação 2',
        percentual: 100,
        flagNotificacaoLida: false
      }
    }
  ];

  cy.intercept('GET', '/gt-notificacao/ms-notificacao/notificacao/listar', notificacoes).as(
    'requestListarNotificacoes'
  );
};

const findBadge = (index: number) => {
  return cy.getCy('item-notificacao').eq(index).findCy('badge-item-notificacao');
};

describe(InicioComponent.name, () => {
  const config: MountConfig<InicioComponent> = {
    imports: [
      HttpClientModule,
      BrowserAnimationsModule,
      RouterTestingModule,
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
    declarations: [InicioComponent],
    providers: [
      { provide: NZ_I18N, useValue: pt_BR },
      { provide: NZ_DATE_LOCALE, useValue: ptBR },
      { provide: LOCALE_ID, useValue: 'pt' }
    ]
  };

  beforeEach(() => {
    cy.window().then(win =>
      win.sessionStorage.setItem(
        'token',
        'eyJraWQiOiIwOWY5NWE1OTk0ZDdhYWEzMGI2OWMwODE4MzliODQxYyIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJpc3MiOiIyMGM5N2U4MzI5ZWU0NDI0YjE0NmQzMjM1OGEzZTU4ZSIsInN1YiI6IjktZGVzZW52b2x2aW1lbnRvNkBzeXNtby5jb20uYnIiLCJpYXQiOjE3MjAwNzAzODIsImV4cCI6MTcyMDE1Njc4MiwiZW1wcmVzYXMiOiIwIiwiY29kaWdvVXN1YXJpbyI6OSwiZ3JvdXBzIjpbInVzZXItZGVzZW52b2x2aW1lbnRvIl0sImp0aSI6IjhiY2I5ZTBiLWU4M2UtNDZhMy05ODIwLWZhNzc2ZGZjNzIyMSJ9.1tGSBodq3NvpAlHqnsKKXGmzLYs9Wr9l2o77mP7ZBKo5-G_exvp0AdhI5CF9SOezwNPsoD8J5fciEynQ0x8YbbBduemaRjooiVWB06mlTbJaV86_Y2nVASuXytR-xXfGJc5mn4GZq2Qze6oD2_4DduxMafvEGexOZf_2CmRo4pDW5zXnYuakmwXh1BE3kastlGLGsNmxuKx0-2VnJiVJyn7f_ydJLgkPexT8ziJ3O5uV0YEiWt9vnVq4treFmVL6zfq1r_TGcJKL5OqyqtwGDlkSHEuinM3FHoU3F5ia17utvg9tAlt7ikzKAaajRE9sHpqdKtYrHpEFg2oDa8-6eQ'
      )
    );

    requestsIniciais();

    requestsNotificacoes();

    cy.mount(InicioComponent, config);

    cy.wait([
      '@requestAdquirirUsuarioLogado',
      '@requestMenuListar',
      '@requestAdquirirEmpresasUsuarioLogado',
      '@requestAdquirirConfiguracao',
      '@requestListarNotificacoes'
    ]);
  });

  it('Deve mostrar o numero um nas notificações', () => {
    cy.getCy('badge-notificacao').should('contain.text', '1');
  });

  it('Deve abrir as notificações, mostrar duas notificações e somente uma não lida', () => {
    cy.getCy('dropdown-perfil').trigger('mouseenter');

    cy.contains('Notificações').click({ force: true });

    cy.getCy('item-notificacao').should('have.length', 2);

    findBadge(0).should('not.exist');

    findBadge(1).should('exist');
  });
});

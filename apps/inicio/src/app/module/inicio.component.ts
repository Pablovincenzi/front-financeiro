import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Route, Router } from '@angular/router';
import {
  AutenticacaoFacade,
  ConfiguracaoDashboardFacade,
  DashboardFacade,
  EmpresaFacade,
  SessaoFacade
} from '@sysmo-cloud/shared/data-access';
import {
  EmpresaLogadaDTO,
  EmpresaUsuarioDTO,
  UsuarioFacade
} from '@sysmo-cloud/shared/data-access-usuario';
import { StorageKeys } from '@sysmo-cloud/shared/util-storage-keys';
import {
  MenuFacade,
  MenuTemplatePermissaoDTO,
  ModuleFederationDTO
} from '@sysmo-cloud/shell/data-access-menu';
import { environment } from '../../environments/environment';
import { RotasConstant } from '../static/constants/rotas.constant';

interface InformacoesMenu {
  subMenu: ModuleFederationDTO;
  codigoMenu: number;
  favorito: boolean;
}

@Component({
  selector: 'sysmo-cloud-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss']
})
export class InicioComponent implements OnInit {
  menus: Array<MenuTemplatePermissaoDTO> = [];
  empresas: Array<EmpresaUsuarioDTO> = [];

  requesting = false;

  private menusFlat: Array<MenuTemplatePermissaoDTO> = [];
  private readonly ID_MENU_ATALHOS = -1;
  private readonly ID_MENU_FAVORITOS = -2;
  private readonly ID_MENU_RECENTES = -3;

  fromUrl = '';

  chatbotAberto = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private menuFacade: MenuFacade,
    private usuarioFacade: UsuarioFacade,
    private empresaFacade: EmpresaFacade,
    private message: NzMessageService,
    private destroyRef: DestroyRef,
    private configuracaoDashboardFacade: ConfiguracaoDashboardFacade,
    private sessaoFacade: SessaoFacade,
    private autenticacaoFacade: AutenticacaoFacade,
    private dashboardFacade: DashboardFacade
  ) {
    // ! Necessário ficar no construtor pois o state somente pode ser acessível nele
    const fromUrl: string | undefined = this.router.getCurrentNavigation()?.extras?.state?.fromUrl;

    if (fromUrl) {
      this.fromUrl = fromUrl;
    }
  }

  ngOnInit() {
    this.requesting = true;

    forkJoin([
      this.menuFacade.listar(),
      this.requestAdquirirEmpresasUsuario(),
      this.dashboardFacade.adquirirConfiguracao()
    ])
      .pipe(finalize(() => (this.requesting = false)))
      .subscribe({
        next: ([menus, empresas, configuracaoDashboard]) => {
          menus.unshift({ descricao: 'Visão geral', icone: 'bx-home' });

          this.menus = menus;
          this.empresas = empresas;

          this.configuracaoDashboardFacade.atualizarConfiguracao(configuracaoDashboard);

          this.menusFlat = this.mapearMenusFlat(menus.filter(menu => menu?.id && menu?.id >= 0));

          this.definirCodigosMenusFavoritosIniciais();

          this.ouvirNovosMenusRecentes();

          this.ouvirNovosMenusFavoritos();

          this.carregarRotas(menus);
        },
        error: erro => this.message.error(erro)
      });
  }

  private requestAdquirirEmpresasUsuario(): Observable<EmpresaUsuarioDTO[]> {
    return this.usuarioFacade.adquirirEmpresasUsuarioLogado().pipe(
      switchMap(({ empresas }) => {
        const empresaPrincipal = empresas.find(({ principal }) => principal)?.id;

        if (empresaPrincipal) {
          sessionStorage.setItem(StorageKeys.EMPRESA_LOGADA, `${empresaPrincipal}`);

          this.empresaFacade.emitirEventoAlterouEmpresa();

          return of(empresas);
        }

        return this.usuarioFacade.registrarEmpresa(new EmpresaLogadaDTO(empresas[0]?.id)).pipe(
          map(() => {
            empresas[0].principal = true;

            return empresas;
          })
        );
      })
    );
  }

  private ouvirNovosMenusRecentes() {
    this.menuFacade.novoMenuRecente$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(codigoNovoMenuRecente =>
        this.atualizarArrayComNovoMenu(this.ID_MENU_RECENTES, codigoNovoMenuRecente)
      );
  }

  private ouvirNovosMenusFavoritos() {
    this.menuFacade.editouMenuFavorito$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(codigoNovoMenuFavorito =>
        this.atualizarArrayComNovoMenu(this.ID_MENU_FAVORITOS, codigoNovoMenuFavorito)
      );
  }

  private atualizarArrayComNovoMenu(codigoMenuRaiz: number, codigoNovoMenu: number) {
    const menuRaiz = this.adquirirMenuRaiz(codigoMenuRaiz);

    if (menuRaiz?.subMenus && menuRaiz.subMenus.find(menu => menu?.id === codigoNovoMenu)) {
      menuRaiz.subMenus = menuRaiz.subMenus.filter(menu => menu?.id !== codigoNovoMenu);

      if (codigoMenuRaiz === this.ID_MENU_FAVORITOS) {
        return;
      }
    }

    const novoSubMenu = this.menusFlat.find(menu => menu?.id === codigoNovoMenu);

    if (novoSubMenu?.id) {
      menuRaiz?.subMenus?.unshift(novoSubMenu);
    }
  }

  private definirCodigosMenusFavoritosIniciais() {
    this.menuFacade.setMenusFavoritos(
      this.adquirirSubmenusFavoritos()?.map(menu => menu?.id) ?? []
    );
  }

  private mapearMenusFlat(menus: Array<MenuTemplatePermissaoDTO>): Array<MenuTemplatePermissaoDTO> {
    let flat: Array<MenuTemplatePermissaoDTO> = [];

    menus.forEach(menu => {
      if (menu.subMenus?.length) {
        flat = [...flat, ...this.mapearMenusFlat(menu.subMenus)];
      }

      flat.push(menu);
    });

    return flat;
  }

  private adquirirMenuRaiz(codigoMenu: number) {
    return this.menus
      .find(menu => menu.id === this.ID_MENU_ATALHOS)
      ?.subMenus?.find(submenu => submenu.id === codigoMenu);
  }

  private adquirirSubmenusFavoritos() {
    return this.adquirirMenuRaiz(this.ID_MENU_FAVORITOS)?.subMenus;
  }

  voltarAoInicio() {
    this.sessaoFacade
      .validarToken()
      .pipe(
        switchMap(tokenValido => {
          if (!tokenValido) {
            this.autenticacaoFacade.logout(false);
            this.router.navigate(['/login'], { queryParams: { fromUrl: this.router.url } });

            return of(null);
          }

          return this.dashboardFacade.adquirirConfiguracao();
        })
      )
      .subscribe({
        next: configuracaoDashboard => {
          if (!configuracaoDashboard) {
            return;
          }

          this.configuracaoDashboardFacade.atualizarConfiguracao(configuracaoDashboard);

          this.router.navigate([RotasConstant.INICIO]);
        },
        error: erro => this.message.error(erro)
      });
  }

  private carregarRotas(menus: Array<MenuTemplatePermissaoDTO>) {
    const informacoes = this.buscarSubmenusRecursivo(menus);

    const rotas: Array<Route> = environment.production
      ? this.montarRotasProducao(informacoes)
      : this.rotasDesenvolvimento(informacoes);

    this.route.routeConfig?.children?.push(...rotas);

    const url = this.fromUrl;

    if (url && url !== RotasConstant.INICIO) {
      setTimeout(() => {
        const queryParams = this.extrairQueryParams(url);

        if (queryParams) {
          const urlSemQueryParams = url.substring(0, url.indexOf('?'));

          this.router.navigate([urlSemQueryParams], { queryParams });
        } else {
          this.router.navigate([url]);
        }
      }, 200);
    }
  }

  private extrairQueryParams(url: string): Params | undefined {
    const possuiQueryParam = url.includes('?');
    const queryString = url.split('?')[1];

    if (!possuiQueryParam || !queryString) {
      return undefined;
    }

    const queryParams: Params = {};

    queryString.split('&').forEach(param => {
      const keyValue = param.split('=');
      queryParams[keyValue[0]] = decodeURIComponent(keyValue[1]);
    });

    return queryParams;
  }

  private buscarSubmenusRecursivo(
    menusPrincipais: Array<MenuTemplatePermissaoDTO>
  ): Array<InformacoesMenu> {
    const array: Array<InformacoesMenu> = [];

    const funcao = (menus: Array<MenuTemplatePermissaoDTO>) => {
      menus.forEach(menu => {
        if (menu.config && menu.id) {
          array.push({
            subMenu: menu.config,
            codigoMenu: menu.id,
            favorito: menu.flagFavorito ?? false
          });
        } else if (menu.subMenus) {
          funcao(menu.subMenus);
        }
      });
    };

    funcao(menusPrincipais);

    return array;
  }

  private montarRotasProducao(informacoes: Array<InformacoesMenu>): Array<Route> {
    return informacoes.map<Route>(({ subMenu, codigoMenu }) => {
      return {
        path: subMenu.routePath,
        data: { breadcrumb: subMenu.displayName, codigoMenu },
        loadChildren: () =>
          loadRemoteModule({
            type: 'module',
            remoteEntry: subMenu.remoteEntry,
            exposedModule: `./${subMenu.exposedModule}`
          }).then(m => m[subMenu.ngModuleName])
      };
    });
  }

  private rotasDesenvolvimento(informacoes: Array<InformacoesMenu>): Array<Route> {
    const mapMenuPorRota = new Map<string, InformacoesMenu>();
    informacoes.forEach(informacao => mapMenuPorRota.set(informacao.subMenu.routePath, informacao));

    const rotas: Array<Route> = [
      {
        path: 'grupo-pessoa',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4203', 'GrupoPessoa')
      },
      {
        path: 'empresa',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4204', 'Empresa')
      },
      {
        path: 'pessoa',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4205', 'Pessoa')
      },
      {
        path: 'usuario',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4206', 'Usuario')
      },
      {
        path: 'perfil-usuario',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4207', 'PerfilUsuario')
      },
      {
        path: 'marca',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4208', 'Marca')
      },
      {
        path: 'unidade',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4209', 'Unidade')
      },
      {
        path: 'parametro',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4210', 'Parametro')
      },
      {
        path: 'estrutura-mercadologica',
        loadChildren: () =>
          this.loadMicrofrontend('http://localhost:4211', 'EstruturaMercadologica')
      },
      {
        path: 'produto',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4214', 'Produto')
      },
      {
        path: 'ncm',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4215', 'Ncm')
      },
      {
        path: 'produto-empresa',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4216', 'ProdutoEmpresa')
      },
      {
        path: 'operacao-estoque',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4217', 'OperacaoEstoque')
      },
      {
        path: 'kit-produto',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4218', 'KitProduto')
      },
      {
        path: 'condicao-pagamento',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4219', 'CondicaoPagamento')
      },
      {
        path: 'forma-pagamento',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4220', 'FormaPagamento')
      },
      {
        path: 'tipo-limite',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4222', 'TipoLimite')
      },
      {
        path: 'cartao-limite',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4223', 'CartaoLimite')
      },
      {
        path: 'conta-financeira',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4225', 'ContaFinanceira')
      },
      {
        path: 'codigo-referencia',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4227', 'CodigoReferencia')
      },
      {
        path: 'nota-entrada',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4228', 'NotaEntrada')
      },
      {
        path: 'persona',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4229', 'Persona')
      },
      {
        path: 'administradora',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4230', 'Administradora')
      },
      {
        path: 'promocao',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4231', 'Promocao')
      },
      {
        path: 'conciliacao-nfe',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4232', 'ConciliacaoNfe')
      },
      {
        path: 'documento-tesouraria',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4233', 'DocumentoTesouraria')
      },
      {
        path: 'contagem-fisica',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4234', 'ContagemFisica')
      },
      {
        path: 'analise-estoque',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4235', 'AnaliseEstoque')
      },
      {
        path: 'nota-saida',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4236', 'NotaSaida')
      },
      {
        path: 'manutencao-preco',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4237', 'ManutencaoPreco')
      },
      {
        path: 'movimento-financeiro-pdv',
        loadChildren: () =>
          this.loadMicrofrontend('http://localhost:4238', 'MovimentoFinanceiroPDV')
      },
      {
        path: 'familia-preco',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4239', 'FamiliaPreco')
      },
      {
        path: 'campanha-cashback',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4240', 'CampanhaCashback')
      },
      {
        path: 'relatorio-preco-etiqueta',
        loadChildren: () =>
          this.loadMicrofrontend('http://localhost:4241', 'RelatorioPrecoEtiqueta')
      },
      {
        path: 'sincronizacao-pdv',
        loadChildren: () => this.loadMicrofrontend('http://localhost:4242', 'SincronizacaoPDV')
      },
      {
        path: 'relatorio-conferencia-sped',
        loadChildren: () =>
          this.loadMicrofrontend('http://localhost:4244', 'RelatorioConferenciaSped')
      }
    ];

    rotas.forEach(rota => {
      if (!rota.path) {
        return;
      }

      const informacao = mapMenuPorRota.get(rota.path);

      if (informacao) {
        rota.data = {
          breadcrumb: informacao.subMenu.displayName,
          codigoMenu: informacao.codigoMenu
        };
      }
    });

    return rotas;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private loadMicrofrontend(url: string, nomeModulo: string): Promise<any> {
    return loadRemoteModule({
      type: 'module',
      remoteEntry: `${url}/remoteEntry.js`,
      exposedModule: './Module'
    }).then(m => m[`${nomeModulo}Module`]);
  }
}

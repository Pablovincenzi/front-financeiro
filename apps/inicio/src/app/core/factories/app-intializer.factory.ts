import Blowfish from 'es6-sladex-blowfish';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ResetFacade } from '@sysmo-cloud/shared/data-access';
import { StorageKeys, possuiTokensNoStorage } from '@sysmo-cloud/shared/util-storage-keys';
import { environment } from '../../../environments/environment';
import { SecretConstants } from '../../static/constants/secrets.constants';

interface ValorStringDTO {
  valor: string;
}

interface ConfiguracaoCloudDTO {
  PREFIXO: string;
  URL_SYSMO_CLOUD: string;
  URL_MS_RESET: string;
  CHAVE_RESET: string;
}

export function appInitializerFactory(
  httpClient: HttpClient,
  resetFacade: ResetFacade
): () => Observable<unknown> {
  const ofuscatedKey = atob(SecretConstants.BLOWFISH_KEY);

  if (!ofuscatedKey.includes(',')) {
    return () => of();
  }

  if (!environment.production && possuiTokensNoStorage()) {
    return () => of();
  }

  const bytes = ofuscatedKey.split(',').map(Number);

  const key = String.fromCharCode(...bytes);

  const objetoBody = {
    codigoProjeto: 18,
    chaveIdentificacao: {
      chave: 'DOMINIO',
      valor: environment.production ? location.hostname : 'franquias.sysmo.cloud'
    },
    chavesRetorno: ['PREFIXO', 'URL_SYSMO_CLOUD', 'URL_MS_RESET', 'CHAVE_RESET']
  };

  const encrypted = Blowfish.encrypt(JSON.stringify(objetoBody), key);

  const headers = new HttpHeaders()
    .set('Authorization', 'Basic NlJYNTRFOlhvcjlRWFROMU5KMWpteUF2ag==')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const urlBroadcast = 'https://sysmo-cloud-reset-central-dwwjpi5rga-uc.a.run.app/ms-reset';

  return () =>
    httpClient
      .post<ValorStringDTO>(`${urlBroadcast}/clienteService/adquirirConfiguracao`, encrypted, {
        headers
      })
      .pipe(
        map(retorno => JSON.parse(Blowfish.decrypt(retorno.valor, key) as string)),
        tap((configuracao: ConfiguracaoCloudDTO) => {
          sessionStorage.setItem(StorageKeys.CLIENT_ID, configuracao.PREFIXO);
          sessionStorage.setItem(StorageKeys.URL_SYSMO_CLOUD, configuracao.URL_SYSMO_CLOUD);

          resetFacade.atualizarChaveReset(configuracao.CHAVE_RESET);
          resetFacade.atualizarUrlReset(configuracao.URL_MS_RESET);
        })
      );
}

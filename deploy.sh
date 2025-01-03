#!/bin/bash

DIST_FOLDER="dist/apps"

# Caminho do bucket no Google Cloud Storage
BUCKET_PATH="gs://sysmo-cloud-franquias-hom"

# Itera sobre cada pasta dentro de dist
for DIRETORIO in "$DIST_FOLDER"/*; do
    # Nome do microfrontend é o nome da pasta
    microfrontend=$(basename "$DIRETORIO")

    if [ "$microfrontend" = "shell" ]; then
      # Verifica se existe o arquivo index.html no diretório raiz
      google-cloud-sdk/bin/gsutil -q stat "$BUCKET_PATH/index.html"

      # Se o arquivo index.html existir, exclui todos os arquivos do microfrontend shell da raiz
      if [ $? != 1 ]; then
        google-cloud-sdk/bin/gsutil -m rm "$BUCKET_PATH/*.js"
        google-cloud-sdk/bin/gsutil -m rm "$BUCKET_PATH/*.html"
        google-cloud-sdk/bin/gsutil -m rm "$BUCKET_PATH/*.ico"
        google-cloud-sdk/bin/gsutil -m rm "$BUCKET_PATH/*.css"
        google-cloud-sdk/bin/gsutil -m rm -r "$BUCKET_PATH/assets"
      fi

      # Faz o upload do microfrontend shell para a raiz
      google-cloud-sdk/bin/gsutil -m cp -r "$DIRETORIO/*" $BUCKET_PATH
      # Obs.: Necessário excluir os arquivos e depois fazer o copy ao invés do rsync
      # pois o rsync apaga as pastas dos microfrontends que não foram afetados
    else
        # Faz o upload dos demais microfrontends para subdiretórios específicos
        google-cloud-sdk/bin/gsutil -m rsync -r -d "$DIRETORIO" "$BUCKET_PATH/$microfrontend/" &
    fi
done

# Aguarda todos os uploads paralelos terminarem antes de prosseguir
wait
echo "Todos os deploys foram concluídos."

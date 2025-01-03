#!/bin/bash

# Lista para armazenar os resultados dos testes
test_results=()

# Define variáveis padrões
NX_BASE=""
NX_HEAD=""

# Processa argumentos
for arg in "$@"; do
  case $arg in
    --NX_BASE=*)
      NX_BASE="${arg#*=}"
      shift
      ;;
    --NX_HEAD=*)
      NX_HEAD="${arg#*=}"
      shift
      ;;
    *)
      PARAMS+=("$arg")
      shift
      ;;
  esac
done

npx nx affected --base=$NX_BASE --head=$NX_HEAD -t e2e --browser=chrome --parallel 1 --reporter "../../node_modules/mochawesome" --reporter-options reportDir="cypress/report-e2e",overwrite=false,html=false,json=true --exclude='tag:scope:shell,tag:scope:nota-entrada'

exitCode=$?
test_results+=("$exitCode")

# Se nos parâmetros recebidos possuir o nota-entrada-e2e, executa os testes e2e da nota de entrada separado, pois precisa startar a manutenção de preço
if [[ " ${PARAMS[*]} " == *" nota-entrada-e2e "* ]]; then
  npx start-server-and-test 'npx nx serve manutencao-preco 1> /dev/null 2>&1' http-get://localhost:4237 "npx nx run nota-entrada-e2e:e2e --browser=chrome --parallel=false --reporter '../../node_modules/mochawesome' --reporter-options reportDir='cypress/report-e2e',overwrite=false,html=false,json=true"

  exitCode=$?
  test_results+=("$exitCode")
fi

# Remove a pasta de relatórios antigos
rm -rf report-e2e

# Cria a pasta de relatórios
mkdir report-e2e

# Copia os screenshots dos testes e2e para a pasta de relatórios
find . -type d -name "screenshots" | while read dir; do find "$dir" -type f -name "*.png" -exec cp {} report-e2e/ \; ; done

# Somente gera relatório se existem arquivos no diretório report-e2e
if [ "$(find report-e2e -type f -print -quit)" ]; then
  # Agrupa os JSONs gerados pelos testes e2e
  npx mochawesome-merge "**/cypress/report-e2e/*.json" > report-e2e/relatorio-e2e.json

  #Gera o relatório de testes e2e
  npx marge report-e2e/relatorio-e2e.json --reportDir report-e2e --inline --charts
fi

# Verifica se há algum erro na lista
for result in "${test_results[@]}"; do
  if [ $result -ne 0 ]; then
    exit 1
  fi
done

exit 0

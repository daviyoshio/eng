# Inglês em Fases

Aplicativo estático para estudar 3.000 palavras em inglês em dez fases de 300 palavras.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório, mantendo as pastas `assets` e `data`.
3. No GitHub, abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main`, a pasta `/ (root)` e clique em **Save**.

Não é necessário instalar dependências nem executar comandos. O arquivo inicial é `index.html`.

## Como funciona

- 10 fases com 300 palavras cada;
- treino de português para inglês;
- fila de atenção com tag para palavras erradas;
- remoção automática da fila quando a palavra é reaprendida sem dica;
- opção de marcar ou retirar qualquer palavra da fila manualmente;
- pronúncia com a voz do próprio navegador;
- meta diária ajustável, inicialmente configurada para 215 palavras;
- progresso, sequência e XP salvos em `localStorage`;
- exportação e importação de backup;
- busca nas 3.000 palavras.

O progresso fica vinculado ao navegador e ao endereço publicado. Limpar os dados do site pode apagar o histórico; use a função de backup.

## Fontes dos dados

- Ordem de frequência baseada no pacote `subtlex-word-frequencies`, derivado do corpus SUBTLEXus e distribuído sob licença ISC.
- Traduções derivadas do dicionário English–Portuguese do projeto FreeDict, distribuído sob GPL v2 ou posterior, com ajustes pontuais para português brasileiro contemporâneo.

Os arquivos de atribuição e licença estão em `NOTICE.md` e na pasta `licenses`.

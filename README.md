# 🏠 Orçamentos da Reforma

Sistema simples (sem servidor, sem instalação) para **cadastrar, editar e administrar orçamentos** de uma reforma, feito a partir da planilha *"Reforma Vision Penha – Painel de Orçamentos"*. Funciona no computador e no celular, e pode ser hospedado de graça no **GitHub Pages**.

## O que ele faz

| Aba | Para quê |
|---|---|
| **📊 Painel** | Parâmetros (área, orçamento disponível), total contratado/escolhido/considerado, saldo, % comprometido, custo por m², cenário mais barato/mais caro, alertas de validade, distribuição por categoria. Tudo calculado sozinho. |
| **🧾 Orçamentos** | Cadastrar, editar, duplicar, excluir (com “desfazer”), buscar, filtrar (categoria, status, validade) e ordenar. Troca rápida de status direto na lista. |
| **💳 Financeiro** | Registrar pagamentos feitos, ver o quanto já foi pago e quanto falta, e o **fluxo de caixa mensal** previsto das parcelas. |
| **🗂️ Categorias** | Criar/renomear categorias e definir um valor *previsto* por categoria (avisa quando passa). |
| **📌 Pontos de atenção** | Lista de pendências (ex.: “confirmar instalação de gás”), com vínculo opcional a um orçamento e marcação de concluído. |
| **⚙️ Configurações** | Seu nome, tema claro/escuro, sincronização entre vocês dois, backup/importação (JSON), exportação para Excel (CSV) e impressão/PDF. |

Informações guardadas em **cada orçamento**: código, categoria, fornecedor, descrição/especificação, opção/variante, quantidade, valor unitário, valor total (calculado), valor à vista e economia, nº de parcelas sem juros, valor da parcela, entrada, forma de pagamento, data do orçamento, validade (com alerta), 1ª parcela, prazo de entrega/execução, garantia, incluso, **não incluso**, contato, links/arquivos, observações internas, avaliação (1–5 ★), quem cotou, status (*Em cotação / Escolhido / Contratado / Descartado*), pagamentos realizados e quem alterou por último.

Regra de cálculo (igual à planilha): **valor considerado = total sem juros dos itens com status *Escolhido* ou *Contratado***. Ao escolher um item em uma categoria que já tem outro escolhido, o sistema pergunta se quer trocar a escolha.

Os dados da sua planilha já vêm carregados (10 orçamentos, 15 categorias, 5 pontos de atenção).

---

## 1) Publicar no GitHub Pages (5 minutos)

1. Crie uma conta em <https://github.com> (se ainda não tiver) e clique em **New repository**.
2. Dê um nome (ex.: `orcamentos-reforma`). Pode ser **Public** (no plano gratuito, o GitHub Pages exige repositório público) ou **Private** se você tiver plano pago.
3. Envie **todos os arquivos desta pasta** para o repositório (botão *Add file → Upload files*, arraste tudo — inclusive as pastas `css` e `js` e o arquivo `.nojekyll` — e clique em *Commit changes*).
   Ou, pelo terminal:
   ```bash
   git init
   git add .
   git commit -m "Sistema de orçamentos"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/orcamentos-reforma.git
   git push -u origin main
   ```
4. No repositório vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main** e pasta **/ (root)**, e salve.
5. Em ~1 minuto o site fica em `https://SEU-USUARIO.github.io/orcamentos-reforma/`. Mande o link para sua esposa. 🎉

> ⚠️ **Privacidade:** repositório público significa que o *código* é público, mas **os seus dados NÃO ficam no GitHub** — ficam no navegador de vocês (e, se ligarem a sincronização, no seu banco Firebase). Os orçamentos que já vêm de exemplo estão no arquivo `js/data.js`; se não quiser que apareçam publicamente, **apague os dados de exemplo** antes de publicar (veja a última seção) ou use um repositório privado.

## 2) Usar os dois no mesmo orçamento (sincronização)

Por padrão cada aparelho guarda os dados **só no próprio navegador**. Para você e sua esposa verem/editarem a mesma lista, ligue a sincronização (gratuita), que usa o Firebase Realtime Database:

1. Acesse <https://console.firebase.google.com>, entre com sua conta Google e crie um projeto (pode desativar o Google Analytics).
2. No menu: **Build → Realtime Database → Create Database**. Escolha a região e **comece em modo bloqueado** (*locked mode*).
3. Na aba **Rules**, cole as regras abaixo e clique em **Publish**:
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false,
       "salas": {
         "$sala": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
   Com elas ninguém consegue listar as “salas”; só acessa quem souber o **código da sala**.
4. Na aba **Data**, copie o endereço do banco (algo como `https://seu-projeto-default-rtdb.firebaseio.com`).
5. No sistema, abra **⚙️ Configurações → Sincronização**, cole o endereço, invente um **código de sala** difícil de adivinhar (mín. 8 caracteres, ex.: `reforma-penha-k7q2x9`) e clique em **Salvar e sincronizar**.
6. No celular/computador da sua esposa, abra o mesmo link e preencha **o mesmo endereço e o mesmo código**.

Pronto: alterações aparecem nos dois aparelhos em até ~20 segundos (e na hora ao salvar). Se os dois editarem ao mesmo tempo, vale a alteração mais recente **de cada item** (não se perde o resto). Exclusões também sincronizam.

> O código da sala funciona como uma senha. Não compartilhe o link do banco + código com mais ninguém.

## 3) Backup

Em **⚙️ Configurações** use **Backup completo (.json)** de vez em quando. Para reimportar, use **Importar backup**. O **CSV** abre no Excel/Google Planilhas.

## 4) Começar do zero (sem os dados de exemplo)

Em **⚙️ Configurações → Dados → Apagar tudo e começar do zero**. Se for publicar em repositório público e não quiser os dados de exemplo no código, apague também a seção `orcamentos` e `notas` da função `seed()` em `js/data.js`.

## Estrutura dos arquivos

```
index.html            página única
css/style.css         estilos (claro/escuro, responsivo, impressão)
js/data.js            dados iniciais da planilha + cálculos
js/store.js           armazenamento local + sincronização Firebase (REST)
js/ui.js              núcleo da interface
js/views-main.js      painel, lista, formulário e detalhe
js/views-extra.js     financeiro, categorias, pontos de atenção, configurações
js/app.js             eventos e inicialização
manifest.webmanifest  permite “Adicionar à tela inicial” no celular
.nojekyll             evita processamento do Jekyll no GitHub Pages
```

Não há dependências nem build: é só HTML, CSS e JavaScript. Para testar localmente, abra `index.html` no navegador (ou rode `python3 -m http.server` na pasta).

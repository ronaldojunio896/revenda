# Ronaldo Tecnologia

Site institucional estático para GitHub Pages com domínio personalizado `ronaldotecnologia.com.br`.

## Estrutura

- `index.html`: página principal.
- `servicos.html`, `torge.html`, `implantacao.html`, `sobre.html`, `contato.html`: páginas internas.
- `assets/css/style.css`: identidade visual e responsividade.
- `assets/js/main.js`: menu mobile, animações e formulário para WhatsApp.
- `rt-console.html`: console estático privado para editar conteúdo, imagens, SEO e publicar no GitHub.
- `assets/css/rt-console.css` e `assets/js/rt-console.js`: interface e lógica do console administrativo.
- `assets/images/`: logos, favicon PNG e imagens otimizadas.
- `CNAME`: domínio personalizado do GitHub Pages.
- `sitemap.xml`, `robots.txt`, `site.webmanifest`: SEO e metadados.

## Publicação

Suba os arquivos na branch configurada no GitHub Pages. O arquivo `CNAME` deve permanecer na raiz para manter o domínio personalizado.

## Painel admin

Acesse o console privado, informe a chave de acesso e depois um token do GitHub com permissão de leitura e escrita em Contents para o repositório `ronaldojunio896/revenda`. O token não fica salvo no código do site e o repositório/branch de publicação não são editáveis pelo navegador.

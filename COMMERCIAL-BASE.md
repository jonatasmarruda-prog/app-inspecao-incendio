# SST Premium — Base Comercial

Esta branch é uma cópia comercial derivada do snapshot estável do sistema SST em 09/09/2026.

## Regra crítica

- NÃO alterar a branch `main` para desenvolver a versão comercial.
- NÃO reutilizar o Firebase da TBM em clientes comerciais.
- NÃO publicar esta branch para clientes enquanto um Firebase comercial próprio não estiver configurado.

## Objetivo do produto

Uma única plataforma SST capaz de atender várias empresas, cada uma com seus próprios usuários, dados, contatos, relatórios e identidade visual.

## Estrutura planejada

### Empresa
- empresaId
- razão social
- nome fantasia
- CNPJ
- endereço
- telefone
- e-mail
- logo
- responsável SST
- registro profissional

### Usuários
Cada usuário deve possuir:
- userId
- empresaId
- nome
- e-mail
- perfil
- ativo

Perfis previstos:
- administrador
- técnico_sst
- supervisor
- consulta

### Contatos corporativos
- contatoId
- empresaId
- nome
- e-mail
- categoria (SST, RH, Engenharia, Manutenção, Diretoria etc.)

### Relatórios
Todo relatório deve possuir, no mínimo:
- empresaId
- criadoPor
- criadoEm
- atualizadoPor
- atualizadoEm
- tipo
- id original do relatório

## Segurança multiempresa

As regras do Firestore comercial devem obrigatoriamente restringir leitura e escrita ao `empresaId` do usuário autenticado. Não confiar apenas em filtros de interface.

## Estado atual desta branch

- Snapshot funcional do sistema original preservado.
- `commercial-mode.js` criado.
- Primeiro cadastro/configuração da empresa preparado.
- Identidade genérica `SST Premium` aplicada pela camada comercial.
- Estrutura local inicial de empresa, usuários e contatos preparada.
- Escrita/leitura em nuvem comercial bloqueada até configurar um Firebase comercial separado.

## Próximos passos para tornar vendável

1. Criar projeto Firebase exclusivo do SST Premium comercial.
2. Ativar Firebase Authentication.
3. Criar coleções multiempresa (`empresas`, `usuarios`, `contatos`, `relatorios`).
4. Aplicar regras Firestore por `empresaId`.
5. Criar login e convite de usuários.
6. Migrar todos os módulos para salvar `empresaId` e `userId`.
7. Aplicar dados/logo da empresa nos PDFs.
8. Criar configurações de e-mails corporativos.
9. Criar plano/licença e status de assinatura, se desejado.
10. Publicar em projeto Vercel separado da versão TBM.

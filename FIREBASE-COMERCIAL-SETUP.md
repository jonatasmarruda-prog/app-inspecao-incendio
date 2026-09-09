# Firebase comercial — SST Premium

## Estado

A base comercial NÃO deve usar o Firebase da TBM.

O arquivo `.firebaserc` está propositalmente apontando para um projeto inexistente (`sst-premium-configure-seu-projeto`) para impedir deploy acidental no projeto antigo.

## Projeto recomendado

Nome: `SST Premium Comercial`
ID sugerido: `sst-premium-comercial`

> O ID real depende de disponibilidade no Firebase/Google Cloud.

## Serviços a ativar

1. Firebase Authentication
   - E-mail/senha
2. Cloud Firestore
   - modo produção
3. Firebase Storage
4. Cloud Functions (necessário para provisionamento administrativo seguro)

## Coleções

### empresas/{empresaId}
- empresaId
- razaoSocial
- nomeFantasia
- cnpj
- endereco
- telefone
- email
- logo
- responsavelSST
- registroProfissional
- ativo
- criadoEm
- atualizadoEm

### usuarios/{uid}
- uid
- empresaId
- nome
- email
- perfil
- ativo
- criadoEm

Perfis:
- administrador
- tecnico_sst
- supervisor
- consulta

### contatos/{contatoId}
- empresaId
- nome
- email
- categoria
- ativo

### relatorios/{relatorioId}
- empresaId
- criadoPor
- criadoEm
- atualizadoPor
- atualizadoEm
- tipo
- demais dados do relatório

### licencas/{empresaId}
- empresaId
- plano
- status
- limiteUsuarios
- validade

## Provisionamento inicial

A primeira empresa e o primeiro administrador NÃO devem ser criados diretamente pelo navegador com regras abertas.

Fluxo recomendado:

1. usuário cria conta no Firebase Authentication;
2. backend/Cloud Function valida o cadastro;
3. backend cria `empresas/{empresaId}`;
4. backend cria `usuarios/{uid}` como `administrador`;
5. a partir daí, as regras do Firestore limitam cada usuário ao próprio `empresaId`.

## Arquivos preparados nesta branch

- `firestore.rules` — isolamento por empresa
- `storage.rules` — isolamento de arquivos por empresa
- `firebase.json` — aponta para as regras comerciais
- `firebase-config.example.js` — modelo sem credenciais reais
- `.firebaserc` — bloqueio contra deploy acidental na TBM

## Quando o projeto Firebase real existir

1. substituir o placeholder de `.firebaserc` pelo ID real;
2. preencher uma cópia privada da configuração Firebase;
3. nunca commitar segredos administrativos/service-account;
4. ativar a integração comercial no aplicativo;
5. testar com pelo menos duas empresas diferentes antes de liberar vendas.

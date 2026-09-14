# Manual da versão operacional

## Acesso

Entre com a conta fornecida pela administração. A navegação fica na lateral; em telas menores, use **Menu**. **Alterar senha** e **Sair** ficam no fim do menu. Alterar a senha exige a atual, valida uma senha forte e invalida outras sessões.

O administrador usa **Administrar usuários** para criar, desativar e atribuir grupos. Não compartilhe contas entre profissionais: a autoria dos registros depende da conta individual. Quando um colaborador sai, desative sua conta em vez de apagá-la, preservando a auditoria.

## Alunos, oficinas e frequência

Os fluxos existentes permanecem documentados no [README](./README.md). Novos alunos entram em espera; a ativação exige edição com motivo. Somente alunos ativos são matriculados e o limite de vagas é validado no banco durante a transação. Matrículas ativas precisam ser canceladas antes da inativação do aluno.

Na frequência, todas as marcações precisam ser preenchidas. Correções exigem motivo e preservam o histórico. O educador só acessa turmas vinculadas à sua conta.

## Atendimentos

1. Abra **Atendimentos → Registrar atendimento**, ou a seção **Atendimentos do aluno** na ficha.
2. Selecione o aluno, a data, o tipo, o nível de sigilo e descreva o atendimento. Encaminhamento é opcional.
3. Salve. O autor é a conta conectada; não pode ser escolhido nem alterado pelo formulário.
4. Abra **Ver registro** para consultar o relato e as versões anteriores.
5. O autor pode usar **Corrigir ou cancelar**, informando um motivo. Um registro cancelado fica preservado e não recebe mais edições.

| Sigilo | Quem pode ler |
| --- | --- |
| Equipe autorizada | Contas com permissão de consulta de atendimentos |
| Equipe técnica | Autor e contas com permissão específica de leitura restrita |
| Somente o autor | Apenas a conta que criou o atendimento |

O padrão é **Somente o autor**. Ser administrador não permite ler os relatos confidenciais de outro autor. Nomes, conteúdo, revisões e contagens desses registros não aparecem para contas sem acesso. Educadores não recebem acesso ao módulo. O termo interno `publico` significa equipe autorizada, nunca publicação na internet.

Aluno, autor e sigilo ficam fixos após a criação. Se foram informados incorretamente, cancele o registro e crie outro. Isso impede que uma edição exponha versões anteriores a novos perfis. Os administradores do servidor e do banco têm acesso técnico à infraestrutura e precisam de controle organizacional próprio.

## Doações

1. Abra **Doações → Registrar doação**.
2. Informe data, tipo e descrição. O nome do doador é opcional.
3. Para dinheiro, preencha o valor em reais. Para bens, preencha quantidade e unidade (kg, unidades, caixas etc.).
4. Correções ou cancelamentos exigem motivo. Todas as versões ficam disponíveis no registro.

O sistema não mistura valores monetários com quantidades e não soma unidades diferentes. O módulo registra entradas recebidas; não realiza pagamentos, conciliação bancária ou emissão fiscal.

## Visão geral e relatórios

Selecione um período de até 366 dias e clique em **Atualizar indicadores**. A ocupação das turmas e a situação dos alunos refletem o momento da consulta. Frequência, atendimentos e doações usam as datas selecionadas.

O filtro de educador afeta oficinas e frequência. O relatório mostra os atendimentos que a conta pode consultar; portanto, totais de atendimentos podem diferir entre usuários. Registros cancelados não entram nesses totais.

**Exportar CSV** baixa o consolidado para uma planilha. A exportação não contém relatos, documentos, nomes de alunos nem dados familiares. Campos de texto são protegidos contra execução de fórmulas ao abrir a planilha.

O alerta de faltas mostra até 100 alunos ativos com três ou mais faltas no período. Não significa faltas consecutivas, evasão confirmada ou diagnóstico. Inclui faltas justificadas e pode agregar mais de uma turma.

## Perfis padrão dos módulos novos

| Perfil | Atendimentos | Doações | Indicadores |
| --- | --- | --- | --- |
| Secretaria | Consulta os públicos e os próprios; registra/corrige os próprios | Consulta, registra, corrige/cancela | Consulta e exporta |
| Equipe técnica | Consulta públicos, restritos e os próprios; registra/corrige os próprios | Consulta, registra, corrige/cancela | Consulta e exporta |
| Coordenação | Consulta públicos | Consulta | Consulta e exporta |
| Educador | Sem acesso | Sem acesso | Sem acesso |
| Administrador | Acesso aos públicos e restritos; confidenciais apenas se autor | Gestão completa | Consulta e exporta |

O comando `configurar_perfis` adiciona as permissões padrão sem apagar permissões personalizadas existentes. A administração deve revisar concessões manuais; elas podem ampliar o acesso de um grupo.

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest.mock import patch
from django.contrib.auth.models import User, Group
from django.core.management import call_command
from django.db import connections, transaction, IntegrityError
from django.test import TestCase, TransactionTestCase, Client, skipUnlessDBFeature
from django.utils import timezone
from alunos.models import Aluno
from oficinas.models import Oficina, Matricula
from .models import Chamada, Presenca, RevisaoChamada, ResponsavelTurma, HistoricoAcesso


def oficina(nome='Esporte'):
    return Oficina.objects.create(nome=nome, turma='A', tipo='Esporte', educador='Professor',
        unidade='Sede', dias_semana=[0,2], inicio='09:00', fim='10:00', limite_vagas=20)


def inscricao(o, nome='Aluno', inicio=-5, cancelamento=None):
    aluno = Aluno.objects.create(nome=nome, data_nascimento='2014-05-12',responsavel='Responsável',
        parentesco='Mãe', telefone='61999991234',status='ativo')
    m = Matricula.objects.create(oficina=o,aluno=aluno)
    Matricula.objects.filter(pk=m.pk).update(criado_em=timezone.now()+timedelta(days=inicio),
        cancelado_em=timezone.now()+timedelta(days=cancelamento) if cancelamento is not None else None,
        ativa=cancelamento is None)
    m.refresh_from_db()
    return m


class FrequenciaTests(TestCase):
    def setUp(self):
        self.user=User.objects.create_superuser('admin',password='local-test-only-848')
        self.client.force_login(self.user,backend='django.contrib.auth.backends.ModelBackend')
        self.o=oficina()
        self.m=inscricao(self.o)
        self.dia=timezone.localdate()
        self.base=f'/api/frequencia/turmas/{self.o.pk}/'
        self.path=self.base+f'chamada/?data={self.dia}'

    def payload(self,presente=True,versao=0,motivo=''):
        return {'versao':versao,'motivo':motivo,'registros':[{'matricula_id':str(self.m.pk),'presente':presente,'justificativa':''}]}

    def post(self,data=None):
        return self.client.post(self.path,data or self.payload(),content_type='application/json')

    def test_chamada_persistente_resumo_e_historico(self):
        draft=self.client.get(self.path).json()
        self.assertIsNone(draft['registros'][0]['presente'])
        response=self.post()
        self.assertEqual(response.status_code,201,response.content)
        self.assertEqual(response.json()['versao'],1)
        self.assertEqual(response.json()['historico'][0]['autor'],'admin')
        self.assertEqual(Presenca.objects.count(),1)
        history=self.client.get(self.base+'historico/').json()
        self.assertEqual(history['items'][0]['presentes'],1)
        summary=self.client.get(f'/api/alunos/{self.m.aluno_id}/').json()['frequencia']
        self.assertEqual(summary['total'],1)
        self.assertEqual(summary['presentes'],1)
        self.assertEqual(self.client.delete(self.path).status_code,405)

    def test_duplicidade_nao_sobrescreve_chamada(self):
        self.post()
        self.assertEqual(self.post(self.payload(False)).status_code,409)
        self.assertEqual(Chamada.objects.count(),1)
        self.assertTrue(Presenca.objects.get().presente)

    def test_correcao_exige_motivo_e_registra_valor_anterior(self):
        self.post()
        data=self.payload(False,1,'')
        self.assertEqual(self.client.put(self.path,data,content_type='application/json').status_code,400)
        data['motivo']='Correção da chamada'
        data['registros'][0]['justificativa']='Consulta médica informada pela família'
        response=self.client.put(self.path,data,content_type='application/json')
        self.assertEqual(response.status_code,200,response.content)
        change=response.json()['historico'][0]['alteracoes'][0]
        self.assertTrue(change['antes']['presente'])
        self.assertFalse(change['depois']['presente'])
        self.assertEqual(RevisaoChamada.objects.count(),2)
        summary=self.client.get(f'/api/alunos/{self.m.aluno_id}/').json()['frequencia']
        self.assertEqual(summary['faltas'],1)

    def test_edicao_desatualizada_e_sem_mudancas(self):
        self.post()
        self.assertEqual(self.client.put(self.path,self.payload(False,0,'Correção'),content_type='application/json').status_code,409)
        self.assertEqual(self.client.put(self.path,self.payload(True,1,'Nada mudou'),content_type='application/json').status_code,400)
        self.assertEqual(RevisaoChamada.objects.count(),1)

    def test_validacao_das_marcacoes_e_lista_completa(self):
        for row in [dict(presente=None),dict(presente='false'),dict(justificativa='x'*501),
                    dict(presente=True,justificativa='Incompatível'),dict(matricula_id=123)]:
            data=self.payload();data['registros'][0].update(row)
            with self.subTest(row=row):self.assertEqual(self.post(data).status_code,400)
        data=self.payload();data['registros'].append(data['registros'][0].copy())
        self.assertEqual(self.post(data).status_code,400)
        data=self.payload();data['registros']=[]
        self.assertEqual(self.post(data).status_code,400)
        other=inscricao(oficina('Outra'),'Outro')
        data=self.payload();data['registros'][0]['matricula_id']=str(other.pk)
        self.assertEqual(self.post(data).status_code,409)
        inscricao(self.o,'Novo aluno')
        self.assertEqual(self.post().status_code,409)
        self.assertEqual(Chamada.objects.count(),0)

    def test_datas_invalidas_futuras_e_turma_vazia(self):
        for dia in ['2026-02-30','20260912','',str(self.dia+timedelta(days=1))]:
            self.assertEqual(self.client.get(self.base+'chamada/?data='+dia).status_code,400)
        response=self.client.get(self.base+f'chamada/?data={self.dia-timedelta(days=20)}')
        self.assertEqual(response.json()['registros'],[])
        Oficina.objects.filter(pk=self.o.pk).update(ativa=False)
        self.assertEqual(self.post().status_code,409)

    def test_matriculas_validas_na_data_e_cancelamento_inclusivo(self):
        inscricao(self.o,'Cancelado ontem',cancelamento=-1)
        hoje=inscricao(self.o,'Cancelado hoje',cancelamento=0)
        inscricao(self.o,'Ainda não matriculado',inicio=1)
        data=self.client.get(self.path).json()
        self.assertEqual({r['matricula_id'] for r in data['registros']},{str(self.m.pk),str(hoje.pk)})
        passado=self.client.get(self.base+f'chamada/?data={self.dia-timedelta(days=2)}').json()
        self.assertEqual(len(passado['registros']),3)

    def test_dia_local_da_matricula(self):
        from datetime import datetime, timezone as dt_timezone
        # 01:00 UTC pertence ao dia anterior em São Paulo.
        Matricula.objects.filter(pk=self.m.pk).update(criado_em=datetime(2020,1,2,1,0,tzinfo=dt_timezone.utc))
        registros=self.client.get(self.base+'chamada/?data=2020-01-01').json()['registros']
        self.assertEqual(len(registros),1)

    def test_rematricula_no_mesmo_dia_nao_duplica_aluno(self):
        Matricula.objects.filter(pk=self.m.pk).update(ativa=False,cancelado_em=timezone.now())
        nova=Matricula.objects.create(oficina=self.o,aluno=self.m.aluno)
        registros=self.client.get(self.path).json()['registros']
        self.assertEqual(len(registros),1)
        self.assertEqual(registros[0]['matricula_id'],str(nova.pk))

    def test_lista_salva_preservada_apos_cancelamento_e_novas_matriculas(self):
        self.post()
        self.client.post(f'/api/oficinas/{self.o.pk}/matriculas/{self.m.pk}/cancelar/',{'motivo':'Encerramento'},content_type='application/json')
        inscricao(self.o,'Aluno posterior')
        Aluno.objects.filter(pk=self.m.aluno_id).update(nome='Nome atualizado',status='inativo')
        Oficina.objects.filter(pk=self.o.pk).update(ativa=False)
        ficha=self.client.get(self.path).json()
        self.assertEqual(len(ficha['registros']),1)
        self.assertEqual(ficha['registros'][0]['nome'],'Aluno')
        self.assertEqual(self.client.put(self.path,self.payload(False,1,'Correção histórica'),content_type='application/json').status_code,200)
        self.assertEqual(Presenca.objects.count(),1)

    def test_educador_so_acessa_turmas_vinculadas(self):
        call_command('configurar_perfis',verbosity=0)
        educator=User.objects.create_user('educador')
        educator.groups.add(Group.objects.get(name='Educador'))
        self.client.force_login(educator,backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(self.client.get('/api/frequencia/turmas/').json()['total'],0)
        self.assertEqual(self.client.get(self.path).status_code,404)
        self.assertEqual(self.post().status_code,404)
        ResponsavelTurma.objects.create(oficina=self.o,usuario=educator)
        self.assertEqual(self.client.get('/api/frequencia/turmas/').json()['total'],1)
        self.assertEqual(self.post().status_code,201)
        item=self.client.get('/api/frequencia/turmas/').json()['items'][0]
        self.assertEqual(item['educador'],self.o.educador)
        self.assertEqual(item['alunos'],Matricula.objects.filter(oficina=self.o,ativa=True).count())
        self.assertEqual(item['chamada_hoje'],Chamada.objects.filter(oficina=self.o,data=timezone.localdate()).exists())
        self.assertEqual(item['aula_hoje'],timezone.localdate().weekday() in self.o.dias_semana)
        self.assertEqual(self.client.get('/api/alunos/').status_code,403)
        self.assertEqual(self.client.get('/api/oficinas/').status_code,403)
        self.assertEqual(self.client.get(self.base+'responsaveis/').status_code,403)
        ResponsavelTurma.objects.all().delete()
        self.assertEqual(self.client.get(self.base+'historico/').status_code,404)
        self.assertEqual(self.client.put(self.path,self.payload(False,1,'Tentativa'),content_type='application/json').status_code,404)

    def test_gestao_de_vinculos_rejeita_conta_invalida_e_conflito(self):
        call_command('configurar_perfis',verbosity=0)
        educator=User.objects.create_user('educador')
        educator.groups.add(Group.objects.get(name='Educador'))
        url=self.base+'responsaveis/'
        data={'usuarios':[educator.pk],'anteriores':[]}
        self.assertEqual(self.client.put(url,data,content_type='application/json').status_code,200)
        self.assertEqual(HistoricoAcesso.objects.get().depois,[educator.pk])
        self.assertEqual(self.client.put(url,data,content_type='application/json').status_code,409)
        self.assertEqual(self.client.put(url,{'usuarios':[self.user.pk],'anteriores':[educator.pk]},content_type='application/json').status_code,400)
        educator.is_active=False;educator.save()
        self.assertFalse(self.client.get(url).json()['opcoes'][0]['disponivel'])
        self.assertEqual(self.client.put(url,{'usuarios':[],'anteriores':[educator.pk]},content_type='application/json').status_code,200)
        self.assertEqual(ResponsavelTurma.objects.count(),0)

    def test_perfil_de_consulta_csrf_e_anonimo(self):
        call_command('configurar_perfis',verbosity=0)
        user=User.objects.create_user('tecnico');user.groups.add(Group.objects.get(name='Equipe técnica'))
        self.client.force_login(user,backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(self.client.get(self.path).status_code,200)
        self.assertEqual(self.post().status_code,403)
        self.client.logout()
        self.assertEqual(self.client.get(self.path).status_code,401)
        client=Client(enforce_csrf_checks=True);client.force_login(self.user,backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(client.post(self.path,self.payload(),content_type='application/json').status_code,403)

    def test_falha_na_auditoria_reverte_chamada_e_presencas(self):
        with patch('frequencia.views.RevisaoChamada.objects.create',side_effect=RuntimeError('Falha de auditoria')):
            with self.assertRaises(RuntimeError):self.post()
        self.assertEqual(Chamada.objects.count(),0)
        self.assertEqual(Presenca.objects.count(),0)
        self.post()
        with patch('frequencia.views.RevisaoChamada.objects.create',side_effect=RuntimeError('Falha de auditoria')):
            with self.assertRaises(RuntimeError):self.client.put(self.path,self.payload(False,1,'Correção'),content_type='application/json')
        self.assertEqual(Chamada.objects.get().versao,1)
        self.assertTrue(Presenca.objects.get().presente)

    def test_restricoes_de_unicidade_no_banco(self):
        self.post();chamada=Chamada.objects.get()
        with self.assertRaises(IntegrityError), transaction.atomic():Chamada.objects.create(oficina=self.o,data=self.dia)
        with self.assertRaises(IntegrityError), transaction.atomic():Presenca.objects.create(chamada=chamada,matricula=self.m,nome_aluno='Aluno',presente=False)


@skipUnlessDBFeature('has_select_for_update')
class ConcorrenciaFrequenciaTests(TransactionTestCase):
    def setUp(self):
        self.user=User.objects.create_superuser('admin',password='local-only-848')
        self.o=oficina();self.m=inscricao(self.o)
        self.path=f'/api/frequencia/turmas/{self.o.pk}/chamada/?data={timezone.localdate()}'

    def disputar(self,method,version):
        barrier=Barrier(2)
        def worker(i):
            connections.close_all()
            try:
                client=Client();client.force_login(User.objects.get(pk=self.user.pk),backend='django.contrib.auth.backends.ModelBackend')
                barrier.wait(timeout=15)
                data={'versao':version,'motivo':f'Correção {i}','registros':[{'matricula_id':str(self.m.pk),'presente':False,'justificativa':f'Justificativa {i}'}]}
                return getattr(client,method)(self.path,data,content_type='application/json').status_code
            finally:connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:return sorted(pool.map(worker,[1,2]))

    def test_duas_chamadas_simultaneas(self):
        self.assertEqual(self.disputar('post',0),[201,409])
        self.assertEqual(Chamada.objects.count(),1)
        self.assertEqual(Presenca.objects.count(),1)

    def test_duas_correcoes_simultaneas(self):
        c=Chamada.objects.create(oficina=self.o,data=timezone.localdate())
        Presenca.objects.create(chamada=c,matricula=self.m,nome_aluno='Aluno',presente=True)
        self.assertEqual(self.disputar('put',1),[200,409])
        self.assertEqual(Chamada.objects.get().versao,2)

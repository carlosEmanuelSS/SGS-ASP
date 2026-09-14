from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
from django.contrib.auth.models import User, Group
from django.core.management import call_command
from django.db import connections, transaction, IntegrityError
from django.test import TestCase, TransactionTestCase, Client, skipUnlessDBFeature
from alunos.forms import AlunoForm
from alunos.models import Aluno
from .models import Oficina, Matricula, EventoOficina


def aluno(nome='Aluno Ativo', status='ativo'):
    return Aluno.objects.create(nome=nome, data_nascimento='2014-05-12', responsavel='Responsável',
        parentesco='Mãe', telefone='61999991234', status=status)


def dados_oficina(**changes):
    return {'nome':'Futebol', 'turma':'Turma A', 'tipo':'Esporte', 'educador':'Educador de Teste',
        'unidade':'Sede', 'dias_semana':[0,2], 'inicio':'09:00', 'fim':'10:00',
        'limite_vagas':1, 'descricao':'', 'ativa':True, **changes}


class IntegracaoTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser('admin', password='teste-local-nao-real')
        self.client.force_login(self.user, backend='django.contrib.auth.backends.ModelBackend')
        self.aluno = aluno()
        self.oficina = self.client.post('/api/oficinas/', dados_oficina(), content_type='application/json').json()
        self.path = f"/api/oficinas/{self.oficina['id']}/"

    def matricular(self, a=None, path=None):
        return self.client.post((path or self.path)+'matriculas/', {'aluno_id': str((a or self.aluno).pk)}, content_type='application/json')

    def test_fluxo_integrado_e_preservacao_do_historico(self):
        response = self.matricular()
        self.assertEqual(response.status_code, 201, response.content)
        mid = response.json()['id']
        self.assertEqual(self.client.get(self.path).json()['disponiveis'], 0)
        detail = self.client.get(f'/api/alunos/{self.aluno.pk}/').json()
        self.assertEqual(detail['matriculas'][0]['oficina'], 'Futebol')
        response = self.client.post(self.path+f'matriculas/{mid}/cancelar/', {'motivo':'Mudança de horário'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(self.path).json()['disponiveis'], 1)
        self.assertEqual(self.matricular().status_code, 201)
        self.assertEqual(Matricula.objects.count(), 2)
        self.assertEqual(Matricula.objects.filter(ativa=True).count(), 1)
        self.assertEqual(EventoOficina.objects.count(), 4)
        self.assertEqual(self.client.delete(self.path).status_code, 405)

    def test_alunos_na_espera_e_inativos_nao_podem_matricular(self):
        for status in ['lista_espera', 'inativo']:
            with self.subTest(status=status):
                self.assertEqual(self.matricular(aluno(status=status)).status_code, 409)
        self.assertEqual(Matricula.objects.count(), 0)

    def test_lotacao_e_matricula_duplicada(self):
        self.assertEqual(self.matricular().status_code, 201)
        self.assertEqual(self.matricular().status_code, 409)
        self.assertEqual(self.matricular(aluno('Outro aluno')).status_code, 409)
        self.assertEqual(Matricula.objects.count(), 1)

    def test_oficina_inativa_nao_recebe_matricula(self):
        Oficina.objects.update(ativa=False)
        self.assertEqual(self.matricular().status_code, 409)

    def test_nao_inativar_aluno_com_vinculos_ativos(self):
        mid = self.matricular().json()['id']
        self.aluno.refresh_from_db()
        payload = {key: getattr(self.aluno,key) for key in AlunoForm.Meta.fields}
        payload['data_nascimento'] = str(self.aluno.data_nascimento)
        payload.update(status='inativo', motivo='Encerramento', versao=1)
        path = f'/api/alunos/{self.aluno.pk}/'
        self.assertEqual(self.client.put(path,payload,content_type='application/json').status_code,409)
        self.aluno.refresh_from_db()
        self.assertEqual(self.aluno.status,'ativo')
        self.client.post(self.path+f'matriculas/{mid}/cancelar/',{'motivo':'Encerramento'},content_type='application/json')
        self.assertEqual(self.client.put(path,payload,content_type='application/json').status_code,200)
        self.assertFalse(self.client.get(path).json()['matriculas'][0]['ativa'])

    def test_capacidade_nao_pode_diminuir_abaixo_dos_vinculos(self):
        Oficina.objects.update(limite_vagas=2)
        self.matricular()
        self.matricular(aluno('Outro'))
        versao = Oficina.objects.get().versao
        for change in [dict(limite_vagas=1),dict(ativa=False,motivo='Fechamento')]:
            payload = {**dados_oficina(limite_vagas=2), 'versao':versao, **change}
            response = self.client.put(self.path,payload,content_type='application/json')
            self.assertEqual(response.status_code,409,response.content)
        self.assertEqual(Oficina.objects.get().limite_vagas,2)
        self.assertTrue(Oficina.objects.get().ativa)

    def test_validacao_campos_e_turma_duplicada(self):
        for change in [dict(nome=''),dict(limite_vagas=0),dict(limite_vagas=True),dict(limite_vagas=1001),
                       dict(dias_semana=[]),dict(dias_semana=[7]),dict(dias_semana=[True]),
                       dict(inicio='11:00',fim='10:00'),dict(ativa='false'),dict(nome=['Inválido'])]:
            with self.subTest(change=change):
                response = self.client.post('/api/oficinas/',dados_oficina(turma='B',**change),content_type='application/json')
                self.assertEqual(response.status_code,400,response.content)
        self.assertEqual(self.client.post('/api/oficinas/',dados_oficina(),content_type='application/json').status_code,400)
        self.assertEqual(Oficina.objects.count(),1)

    def test_edicao_concorrente_e_motivo_situacao(self):
        data = dados_oficina(versao=1,limite_vagas=3)
        self.assertEqual(self.client.put(self.path,data,content_type='application/json').status_code,200)
        self.assertEqual(self.client.put(self.path,data,content_type='application/json').status_code,409)
        self.assertEqual(self.client.put(self.path,dados_oficina(versao=2,ativa=False),content_type='application/json').status_code,400)
        self.assertEqual(self.client.put(self.path,dados_oficina(versao=2,ativa=False,motivo='Pausa'),content_type='application/json').status_code,200)

    def test_busca_candidatos_exclui_matriculados_e_dados_familiares(self):
        self.matricular()
        aluno('Aluno Espera',status='lista_espera')
        aluno('Aluno Inativo',status='inativo')
        alvo = aluno('Aluno Elegível')
        result = self.client.get(self.path+'candidatos/').json()
        self.assertEqual(result['total'],1)
        self.assertEqual(result['items'][0]['id'],str(alvo.pk))
        self.assertEqual(set(result['items'][0]),{'id','nome','data_nascimento'})
        self.assertEqual(self.client.get(self.path+'candidatos/?q=inexistente').json()['total'],0)

    def test_busca_paginacao_oficinas(self):
        for i in range(20):
            Oficina.objects.create(**dados_oficina(turma=f'B{i}'))
        response = self.client.get('/api/oficinas/?page=2').json()
        self.assertEqual(response['total'],21)
        self.assertEqual(len(response['items']),1)
        self.assertEqual(self.client.get('/api/oficinas/?q=inexistente').json()['total'],0)

    def test_cancelamento_exige_motivo_e_turma_correta(self):
        mid = self.matricular().json()['id']
        path = self.path+f'matriculas/{mid}/cancelar/'
        self.assertEqual(self.client.post(path,{'motivo':''},content_type='application/json').status_code,400)
        other = Oficina.objects.create(**dados_oficina(turma='Outra'))
        self.assertEqual(self.client.post(f'/api/oficinas/{other.pk}/matriculas/{mid}/cancelar/',{'motivo':'Teste'},content_type='application/json').status_code,404)
        self.assertEqual(self.client.post(path,{'motivo':'Teste'},content_type='application/json').status_code,200)
        self.assertEqual(self.client.post(path,{'motivo':'Teste'},content_type='application/json').status_code,409)

    def test_perfis_e_csrf(self):
        call_command('configurar_perfis', verbosity=0)
        self.client.logout()
        self.assertEqual(self.client.get(self.path).status_code,401)
        for perfil, read, create in [('Educador',403,403),('Equipe técnica',200,403),('Secretaria',200,201),('Coordenação',200,201)]:
            user = User.objects.create_user(perfil)
            user.groups.add(Group.objects.get(name=perfil))
            self.client.force_login(user,backend='django.contrib.auth.backends.ModelBackend')
            self.assertEqual(self.client.get(self.path).status_code,read)
            self.assertEqual(self.client.post('/api/oficinas/',dados_oficina(turma=perfil),content_type='application/json').status_code,create)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user,backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(client.post(self.path+'matriculas/',{'aluno_id':str(self.aluno.pk)},content_type='application/json').status_code,403)

    def test_restricao_unica_no_banco_e_rollback_da_auditoria(self):
        with patch('oficinas.views.EventoOficina.objects.create',side_effect=RuntimeError('Falha simulada de auditoria')):
            with self.assertRaises(RuntimeError):
                self.matricular()
        self.assertEqual(Matricula.objects.count(),0)
        self.assertEqual(Oficina.objects.get().versao,1)
        self.matricular()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Matricula.objects.create(oficina_id=self.oficina['id'],aluno=self.aluno)


@skipUnlessDBFeature('has_select_for_update')
class ConcorrenciaPostgreSQLTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_superuser('admin',password='teste-local-nao-real')
        self.oficina = Oficina.objects.create(**dados_oficina())
        self.a = aluno('Aluno A')
        self.b = aluno('Aluno B')

    def disputar(self, ids):
        barrier = Barrier(2)
        def worker(pk):
            connections.close_all()
            try:
                client = Client()
                client.force_login(User.objects.get(pk=self.user.pk),backend='django.contrib.auth.backends.ModelBackend')
                barrier.wait(timeout=15)
                return client.post(f'/api/oficinas/{self.oficina.pk}/matriculas/',{'aluno_id':str(pk)},content_type='application/json').status_code
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as executor:
            return sorted(executor.map(worker, ids))

    def test_duas_pessoas_disputam_a_ultima_vaga(self):
        self.assertEqual(self.disputar([self.a.pk,self.b.pk]),[201,409])
        self.assertEqual(Matricula.objects.filter(ativa=True).count(),1)

    def test_matricula_duplicada_simultanea(self):
        self.assertEqual(self.disputar([self.a.pk,self.a.pk]),[201,409])
        self.assertEqual(Matricula.objects.filter(ativa=True).count(),1)

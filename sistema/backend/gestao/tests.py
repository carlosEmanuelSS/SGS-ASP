from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import Client, TestCase
from django.utils import timezone
from alunos.models import Aluno
from oficinas.models import Oficina, Matricula
from frequencia.models import Chamada, Presenca
from .models import Atendimento, Doacao, RevisaoAtendimento, RevisaoDoacao

User = get_user_model()


class GestaoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('configurar_perfis', verbosity=0)
        cls.tecnico = User.objects.create_user('tecnico', password='Senha-Teste-Extensa-765!')
        cls.outro = User.objects.create_user('outro', password='Senha-Teste-Extensa-765!')
        cls.secretaria = User.objects.create_user('secretaria')
        cls.coordenacao = User.objects.create_user('coordenacao')
        cls.educador = User.objects.create_user('educador')
        cls.admin = User.objects.create_superuser('admin')
        for user, grupo in [(cls.tecnico, 'Equipe técnica'), (cls.outro, 'Equipe técnica'),
                            (cls.secretaria, 'Secretaria'), (cls.coordenacao, 'Coordenação'), (cls.educador, 'Educador')]:
            user.groups.add(Group.objects.get(name=grupo))
        cls.aluno = Aluno.objects.create(nome='Aluno de teste', data_nascimento='2010-01-01',
            responsavel='Responsável', parentesco='Mãe', telefone='61999999999', status='ativo')

    def setUp(self):
        self.entrar(self.tecnico)

    def entrar(self, user):
        self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

    def payload(self, **kwargs):
        return {'aluno': str(self.aluno.pk), 'data': timezone.localdate().isoformat(), 'tipo': 'social',
                'nivel': 'confidencial', 'descricao': 'Relato confidencial de teste',
                'encaminhamento': 'Encaminhamento de teste', **kwargs}

    def post(self, **kwargs):
        return self.client.post('/api/atendimentos/', self.payload(**kwargs), content_type='application/json')

    def editar(self, obj, **kwargs):
        payload = self.payload(versao=obj.versao, motivo='Correção justificada', **kwargs)
        return self.client.put(f'/api/atendimentos/{obj.pk}/', payload, content_type='application/json')

    def test_criacao_historico_e_persistencia(self):
        response = self.post()
        self.assertEqual(response.status_code, 201, response.content)
        obj = Atendimento.objects.get()
        self.assertEqual(obj.autor, self.tecnico)
        self.assertEqual(obj.revisoes.count(), 1)
        self.client.logout()
        self.entrar(self.tecnico)
        response = self.client.get(f'/api/atendimentos/{obj.pk}/')
        self.assertEqual(response.json()['descricao'], 'Relato confidencial de teste')
        self.assertEqual(response.json()['revisoes'][0]['dados']['descricao'], 'Relato confidencial de teste')
        listagem = self.client.get('/api/atendimentos/').json()
        self.assertNotIn('descricao', listagem['items'][0])
        self.assertNotIn('encaminhamento', listagem['items'][0])

    def test_confidencial_invisivel_inclusive_para_admin(self):
        self.post()
        obj = Atendimento.objects.get()
        for user in [self.outro, self.secretaria, self.coordenacao, self.admin]:
            self.entrar(user)
            self.assertEqual(self.client.get('/api/atendimentos/').json()['total'], 0)
            self.assertEqual(self.client.get(f'/api/atendimentos/{obj.pk}/').status_code, 404)
            self.assertEqual(self.editar(obj).status_code, 404 if user != self.coordenacao else 403)
            report = self.client.get('/api/relatorios/').json()
            self.assertEqual(report['atendimentos'], [])

    def test_restrito_so_equipe_tecnica_e_publico_equipes_autorizadas(self):
        self.post(nivel='restrito')
        obj = Atendimento.objects.get()
        self.entrar(self.outro)
        self.assertEqual(self.client.get(f'/api/atendimentos/{obj.pk}/').status_code, 200)
        self.assertEqual(self.editar(obj, nivel='restrito').status_code, 403)
        for user in [self.secretaria, self.coordenacao]:
            self.entrar(user)
            self.assertEqual(self.client.get(f'/api/atendimentos/{obj.pk}/').status_code, 404)
        self.entrar(self.secretaria)
        self.assertEqual(self.post(nivel='restrito').status_code, 403)
        self.assertEqual(self.post(nivel='publico').status_code, 201)
        self.entrar(self.coordenacao)
        self.assertEqual(self.client.get('/api/atendimentos/').json()['total'], 1)

    def test_nao_aceita_autor_forjado_nivel_invalido_e_campos_invalidos(self):
        for extra in [{'autor': self.outro.pk}, {'nivel': 'qualquer'}, {'data': '2026-99-99'},
                      {'data': (timezone.localdate()+timedelta(days=1)).isoformat()}, {'data': '2000-01-01'},
                      {'descricao': ''}, {'descricao': 'x'*10001}, {'descricao': {'html': 'x'}}, {'aluno': 'inexistente'}]:
            with self.subTest(extra=extra):
                self.assertEqual(self.post(**extra).status_code, 400)
        self.assertFalse(Atendimento.objects.exists())

    def test_correcao_conflito_e_sigilo_imutavel(self):
        self.post()
        obj = Atendimento.objects.get()
        self.assertEqual(self.editar(obj, descricao='Texto corrigido').status_code, 200)
        self.assertEqual(self.editar(obj).status_code, 409)
        obj.refresh_from_db()
        self.assertEqual(obj.versao, 2)
        self.assertEqual(obj.revisoes.count(), 2)
        self.assertEqual(self.editar(obj, nivel='publico').status_code, 400)
        self.assertEqual(obj.revisoes.last().dados['descricao'], 'Relato confidencial de teste')

    def test_cancelamento_nao_apaga_e_bloqueia_alteracoes(self):
        self.post()
        obj = Atendimento.objects.get()
        self.assertEqual(self.editar(obj, cancelado=True).status_code, 200)
        obj.refresh_from_db()
        self.assertTrue(obj.cancelado)
        self.assertEqual(self.editar(obj).status_code, 409)
        self.assertEqual(self.client.delete(f'/api/atendimentos/{obj.pk}/').status_code, 405)
        self.assertEqual(self.client.get('/api/atendimentos/?status=cancelado').json()['total'], 1)
        self.assertEqual(self.client.get('/api/relatorios/').json()['atendimentos'], [])

    def test_falha_na_auditoria_reverte_criacao_e_edicao(self):
        with patch('gestao.views.RevisaoAtendimento.objects.create', side_effect=RuntimeError):
            with self.assertRaises(RuntimeError):
                self.post()
        self.assertFalse(Atendimento.objects.exists())
        self.post()
        obj = Atendimento.objects.get()
        with patch('gestao.views.RevisaoAtendimento.objects.create', side_effect=RuntimeError):
            with self.assertRaises(RuntimeError):
                self.editar(obj, descricao='Nunca persistir')
        obj.refresh_from_db()
        self.assertEqual(obj.versao, 1)
        self.assertEqual(obj.descricao, 'Relato confidencial de teste')

    def test_permissoes_anonimo_educador_e_csrf(self):
        for path in ['/api/atendimentos/', '/api/doacoes/', '/api/relatorios/']:
            self.client.logout()
            self.assertEqual(self.client.get(path).status_code, 401)
            self.entrar(self.educador)
            self.assertEqual(self.client.get(path).status_code, 403)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.tecnico, backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(client.post('/api/atendimentos/', self.payload(), content_type='application/json').status_code, 403)

    def doacao(self, **kwargs):
        return self.client.post('/api/doacoes/', {'data': timezone.localdate().isoformat(), 'tipo': 'dinheiro',
            'doador': 'Doador teste', 'descricao': 'Contribuição recebida', 'valor': '125.50',
            'quantidade': None, 'unidade': '', **kwargs}, content_type='application/json')

    def test_doacao_dinheiro_e_bens_com_historico(self):
        self.assertEqual(self.doacao().status_code, 201)
        self.assertEqual(self.doacao(tipo='alimentos', valor=None, quantidade='12.50', unidade='kg').status_code, 201)
        self.assertEqual(Doacao.objects.count(), 2)
        self.assertEqual(RevisaoDoacao.objects.count(), 2)
        self.assertEqual(Doacao.objects.get(tipo='dinheiro').valor, Decimal('125.50'))
        report = self.client.get('/api/relatorios/').json()['doacoes']
        self.assertEqual(report['total'], 2)
        self.assertEqual(report['valor'], '125.50')

    def test_doacao_valores_invalidos_e_nao_mistura_unidades(self):
        for extra in [{'valor': '0'}, {'valor': '-1'}, {'valor': 'NaN'}, {'valor': '12.345'},
                      {'valor': 100}, {'tipo': 'alimentos'}, {'quantidade': '2', 'unidade': 'kg'},
                      {'tipo': 'alimentos', 'valor': None, 'quantidade': '2', 'unidade': ''},
                      {'valor': '100000000000000'}]:
            with self.subTest(extra=extra):
                self.assertEqual(self.doacao(**extra).status_code, 400)
        self.assertFalse(Doacao.objects.exists())

    def test_doacao_correcao_cancelamento_e_conflito(self):
        r = self.doacao().json()
        url = f"/api/doacoes/{r['id']}/"
        body = {key: r[key] for key in ['data', 'tipo', 'doador', 'descricao', 'valor', 'quantidade', 'unidade', 'versao']}
        body.update(motivo='Correção', valor='150.00')
        self.assertEqual(self.client.put(url, body, content_type='application/json').status_code, 200)
        self.assertEqual(self.client.put(url, body, content_type='application/json').status_code, 409)
        body.update(versao=2, cancelado=True)
        self.assertEqual(self.client.put(url, body, content_type='application/json').status_code, 200)
        self.assertEqual(self.client.put(url, body, content_type='application/json').status_code, 409)
        self.assertEqual(self.client.delete(url).status_code, 405)
        self.assertEqual(self.client.get('/api/relatorios/').json()['doacoes']['total'], 0)

    def test_relatorios_reais_periodo_filtros_e_csv_seguro(self):
        oficina = Oficina.objects.create(nome='=HYPERLINK("bad")', turma='A', tipo='Cultura',
            educador='Professor A', unidade='Unidade A', dias_semana=[1], inicio='08:00', fim='09:00', limite_vagas=10)
        matricula = Matricula.objects.create(oficina=oficina, aluno=self.aluno)
        for i in range(3):
            chamada = Chamada.objects.create(oficina=oficina, data=timezone.localdate()-timedelta(days=i))
            Presenca.objects.create(chamada=chamada, matricula=matricula, nome_aluno=self.aluno.nome, presente=False)
        qs = '?inicio='+str(timezone.localdate()-timedelta(days=10))+'&fim='+str(timezone.localdate())
        r = self.client.get('/api/relatorios/'+qs).json()
        self.assertEqual(r['frequencia'], {'total': 3, 'presentes': 0, 'faltas': 3, 'percentual': 0.0})
        self.assertEqual(r['ocupacao'][0]['ocupadas'], 1)
        self.assertEqual(r['alertas'][0]['faltas'], 3)
        self.assertEqual(sum(r['faixas'].values()), 1)
        self.assertEqual(self.client.get('/api/relatorios/'+qs+'&educador=Outro').json()['frequencia']['total'], 0)
        csv = self.client.get('/api/relatorios/'+qs+'&formato=csv')
        self.assertIn('attachment', csv['Content-Disposition'])
        self.assertIn("'=HYPERLINK", csv.content.decode())
        self.assertNotIn(self.aluno.nome, csv.content.decode())
        self.assertIn('no-store', csv['Cache-Control'])
        for query in ['?inicio=2020-01-01&fim=2025-01-01', '?inicio=abc', '?formato=html', '?oficina=abc']:
            self.assertEqual(self.client.get('/api/relatorios/'+query).status_code, 400)

    def test_busca_paginacao_e_filtro_por_aluno_sem_vazamento(self):
        for i in range(21):
            self.post(descricao=f'Registro {i}')
        self.assertEqual(len(self.client.get('/api/atendimentos/').json()['items']), 20)
        self.assertEqual(len(self.client.get('/api/atendimentos/?page=2').json()['items']), 1)
        self.assertEqual(self.client.get('/api/atendimentos/?q=inexistente').json()['total'], 0)
        self.assertEqual(self.client.get('/api/atendimentos/?aluno='+str(self.aluno.pk)).json()['total'], 21)
        self.entrar(self.outro)
        self.assertEqual(self.client.get('/api/atendimentos/?aluno='+str(self.aluno.pk)).json()['total'], 0)

    def test_restricoes_no_banco(self):
        self.post()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Atendimento.objects.filter().update(nivel='invalido')
        with self.assertRaises(IntegrityError), transaction.atomic():
            Doacao.objects.create(autor=self.tecnico, data=timezone.localdate(), tipo='dinheiro', descricao='Teste', valor=0)

    def test_senha_forte_csrf_e_invalida_sessoes_anteriores(self):
        other = Client()
        other.force_login(self.tecnico, backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(self.client.post('/api/senha/', {'atual':'Senha-Teste-Extensa-765!','nova':'curta'}, content_type='application/json').status_code,400)
        self.assertEqual(self.client.post('/api/senha/', {'atual':'Senha-Teste-Extensa-765!','nova':'Nova-Senha-Segura-891!'}, content_type='application/json').status_code,200)
        self.assertIsNotNone(self.client.get('/api/session/').json()['user'])
        self.assertIsNone(other.get('/api/session/').json()['user'])
        self.tecnico.refresh_from_db()
        self.assertTrue(self.tecnico.check_password('Nova-Senha-Segura-891!'))
        self.assertNotEqual(self.tecnico.password, 'Nova-Senha-Segura-891!')

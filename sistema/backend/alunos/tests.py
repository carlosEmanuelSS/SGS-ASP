from datetime import date, timedelta
from django.contrib.auth.models import User, Permission
from django.test import TestCase, Client
from .models import Aluno, Historico


class CadastroTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('secretaria', password='teste-seguro-nao-real')
        self.user.user_permissions.set(Permission.objects.filter(content_type__app_label='alunos', codename__in=['view_aluno', 'add_aluno', 'change_aluno']))
        self.client.force_login(self.user, backend='django.contrib.auth.backends.ModelBackend')
        self.payload = {'nome': 'Aluno de Teste', 'data_nascimento': '2014-04-10', 'cpf': '529.982.247-25',
            'matricula_escolar': '', 'responsavel': 'Responsável de Teste', 'parentesco': 'Mãe',
            'telefone': '(61) 99999-1234', 'renda_familiar': '1500.50', 'programas_sociais': True, 'observacoes': ''}

    def create(self, **changes):
        return self.client.post('/api/alunos/', {**self.payload, **changes}, content_type='application/json')

    def test_cadastro_persistente_normalizado_e_auditado(self):
        response = self.create()
        self.assertEqual(response.status_code, 201, response.content)
        aluno = Aluno.objects.get()
        self.assertEqual(aluno.cpf, '52998224725')
        self.assertEqual(aluno.telefone, '61999991234')
        self.assertEqual(aluno.status, 'lista_espera')
        self.assertEqual(aluno.historico.get().usuario, self.user)
        other = Client()
        other.force_login(self.user, backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(other.get('/api/alunos/').json()['total'], 1)

    def test_validacoes_no_servidor(self):
        for change in [{'nome': '  '}, {'responsavel': ''}, {'telefone': '123'}, {'cpf': '11111111111'},
                       {'data_nascimento': str(date.today() + timedelta(days=1))}, {'data_nascimento': '2024-02-30'},
                       {'renda_familiar': '-1'}, {'status': 'ativo'}, {'programas_sociais': 'false'},
                       {'cpf': 'abc'}, {'telefone': 'aa61999991234'}, {'nome': ['Aluno']}]:
            with self.subTest(change=change):
                self.assertEqual(self.create(**change).status_code, 400)
        self.assertEqual(Aluno.objects.count(), 0)
        self.assertEqual(Historico.objects.count(), 0)

    def test_cpf_unico_e_opcional(self):
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.create(cpf='52998224725').status_code, 400)
        self.assertEqual(self.create(cpf='').status_code, 201)
        self.assertEqual(self.create(cpf=None).status_code, 201)

    def test_edicao_situacoes_e_conflito(self):
        aluno = self.create().json()
        path = f"/api/alunos/{aluno['id']}/"
        edit = {**self.payload, 'status': 'ativo', 'motivo': 'Vaga confirmada', 'versao': 1}
        response = self.client.put(path, edit, content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['versao'], 2)
        self.assertEqual(self.client.put(path, edit, content_type='application/json').status_code, 409)
        self.assertEqual(Historico.objects.count(), 2)
        edit.update(status='inativo', motivo='Encerramento solicitado', versao=2)
        self.assertEqual(self.client.put(path, edit, content_type='application/json').status_code, 200)
        self.assertEqual(Aluno.objects.get().status, 'inativo')
        detail = self.client.get(path).json()
        self.assertEqual(len(detail['historico']), 3)
        self.assertEqual(detail['historico'][0]['situacao_anterior'], 'ativo')
        self.assertEqual(self.client.delete(path).status_code, 405)
        self.assertEqual(Aluno.objects.count(), 1)

    def test_motivo_obrigatorio_e_sem_campos_desconhecidos(self):
        aluno = self.create().json()
        path = f"/api/alunos/{aluno['id']}/"
        self.assertEqual(self.client.put(path, {**self.payload, 'status': 'ativo', 'versao': 1}, content_type='application/json').status_code, 400)
        self.assertEqual(self.create(admin=True).status_code, 400)

    def test_busca_filtros_e_paginacao(self):
        self.create()
        for query in ['Aluno', 'Responsável', '529.982.247-25']:
            self.assertEqual(self.client.get('/api/alunos/', {'q': query}).json()['total'], 1)
        self.assertEqual(self.client.get('/api/alunos/?status=ativo').json()['total'], 0)
        self.assertEqual(self.client.get('/api/alunos/?status=errado').status_code, 400)
        for i in range(21):
            self.create(nome=f'Aluno {i:02d}', cpf=None)
        response = self.client.get('/api/alunos/?page=2').json()
        self.assertEqual(response['total'], 22)
        self.assertEqual(len(response['items']), 2)

    def test_acesso_por_perfil(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/alunos/').status_code, 401)
        educator = User.objects.create_user('educador')
        self.client.force_login(educator, backend='django.contrib.auth.backends.ModelBackend')
        self.assertEqual(self.client.get('/api/alunos/').status_code, 403)
        self.assertEqual(self.create().status_code, 403)
        educator.user_permissions.add(Permission.objects.get(content_type__app_label='alunos', codename='view_aluno'))
        self.assertEqual(self.client.get('/api/alunos/').status_code, 200)
        self.assertEqual(self.create().status_code, 403)

    def test_login_csrf_logout(self):
        client = Client(enforce_csrf_checks=True)
        credentials = {'username': 'secretaria', 'password': 'teste-seguro-nao-real'}
        self.assertEqual(client.post('/api/login/', credentials, content_type='application/json').status_code, 403)
        token = client.get('/api/session/').json()['csrf']
        response = client.post('/api/login/', credentials, content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.content)
        token = response.json()['csrf']
        self.assertTrue(response.cookies['sessionid']['httponly'])
        self.assertEqual(client.post('/api/alunos/', self.payload, content_type='application/json').status_code, 403)
        self.assertEqual(client.post('/api/alunos/', self.payload, content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code, 201)
        self.assertEqual(client.post('/api/logout/', {}, content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.get('/api/alunos/').status_code, 401)

    def test_bloqueio_de_tentativas_de_login(self):
        client = Client()
        for _ in range(5):
            response = client.post('/api/login/', {'username': 'secretaria', 'password': 'errada'}, content_type='application/json')
        self.assertEqual(response.status_code, 429)
        response = client.post('/api/login/', {'username': 'secretaria', 'password': 'teste-seguro-nao-real'}, content_type='application/json')
        self.assertEqual(response.status_code, 429)

    def test_payload_invalido_e_recurso_inexistente(self):
        self.assertEqual(self.client.post('/api/alunos/', '[1]', content_type='application/json').status_code, 400)
        self.assertEqual(self.client.post('/api/alunos/', '{', content_type='application/json').status_code, 400)
        self.assertEqual(self.client.get('/api/alunos/00000000-0000-0000-0000-000000000000/').status_code, 404)

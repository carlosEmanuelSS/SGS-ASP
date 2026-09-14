import uuid
from django.conf import settings
from django.db import models


class Aluno(models.Model):
    STATUS = [('lista_espera', 'Lista de espera'), ('ativo', 'Ativo'), ('inativo', 'Inativo')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=160, db_index=True)
    data_nascimento = models.DateField()
    cpf = models.CharField(max_length=11, unique=True, null=True, blank=True)
    matricula_escolar = models.CharField(max_length=80, blank=True)
    responsavel = models.CharField(max_length=160)
    parentesco = models.CharField(max_length=60)
    telefone = models.CharField(max_length=11)
    renda_familiar = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    programas_sociais = models.BooleanField(default=False)
    observacoes = models.TextField(max_length=2000, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='lista_espera', db_index=True)
    versao = models.PositiveIntegerField(default=1)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome', 'id']
        constraints = [models.CheckConstraint(condition=models.Q(status__in=['lista_espera', 'ativo', 'inativo']), name='aluno_status_valido')]


class Historico(models.Model):
    aluno = models.ForeignKey(Aluno, on_delete=models.PROTECT, related_name='historico')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    acao = models.CharField(max_length=30)
    campos = models.JSONField(default=list)
    motivo = models.CharField(max_length=300, blank=True)
    situacao_anterior = models.CharField(max_length=20, blank=True)
    situacao_nova = models.CharField(max_length=20)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em', '-id']

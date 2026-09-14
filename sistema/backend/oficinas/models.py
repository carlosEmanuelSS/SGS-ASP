import uuid
from django.conf import settings
from django.db import models


class Oficina(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=120)
    turma = models.CharField(max_length=80)
    tipo = models.CharField(max_length=60)
    educador = models.CharField(max_length=160)
    unidade = models.CharField(max_length=120)
    dias_semana = models.JSONField(default=list)
    inicio = models.TimeField()
    fim = models.TimeField()
    limite_vagas = models.PositiveIntegerField()
    descricao = models.TextField(max_length=2000, blank=True)
    ativa = models.BooleanField(default=True)
    versao = models.PositiveIntegerField(default=1)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome', 'turma', 'id']
        constraints = [
            models.CheckConstraint(condition=models.Q(limite_vagas__gte=1, limite_vagas__lte=1000), name='oficina_limite_valido'),
            models.CheckConstraint(condition=models.Q(fim__gt=models.F('inicio')), name='oficina_horario_valido'),
            models.UniqueConstraint(fields=['nome', 'turma', 'unidade'], name='oficina_turma_unica'),
        ]


class Matricula(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    oficina = models.ForeignKey(Oficina, on_delete=models.PROTECT, related_name='matriculas')
    aluno = models.ForeignKey('alunos.Aluno', on_delete=models.PROTECT, related_name='matriculas')
    ativa = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    cancelado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-criado_em', 'id']
        constraints = [models.UniqueConstraint(fields=['oficina', 'aluno'], condition=models.Q(ativa=True), name='matricula_ativa_unica')]


class EventoOficina(models.Model):
    oficina = models.ForeignKey(Oficina, on_delete=models.PROTECT, related_name='historico')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    matricula = models.ForeignKey(Matricula, on_delete=models.PROTECT, null=True, blank=True)
    acao = models.CharField(max_length=30)
    motivo = models.CharField(max_length=300, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em', '-id']
